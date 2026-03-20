use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use tauri::{AppHandle, Emitter};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;
use yt_dlp::Youtube;

use crate::models::HistoryEntry;
use crate::storage::Storage;

use super::task::DownloadStatus;

#[derive(Clone, serde::Serialize)]
struct MetadataEvent {
    id: String,
    title: String,
    thumbnail: String,
    format: String,
}

#[derive(Clone, serde::Serialize)]
struct ProgressEvent {
    id: String,
    progress: f64,
    downloaded_bytes: u64,
    total_bytes: u64,
}

#[derive(Clone, serde::Serialize)]
struct StatusEvent {
    id: String,
    status: DownloadStatus,
    error: Option<String>,
    file_path: Option<String>,
}

/// Info about a running download process
struct ProcessInfo {
    pid: u32,
    output_dir: PathBuf,
    filename: String,
}

pub struct DownloadManager {
    libs_dir: PathBuf,
    binaries_installed: Arc<Mutex<bool>>,
    /// Map of download ID -> process info for active downloads
    processes: Arc<Mutex<HashMap<String, ProcessInfo>>>,
}

impl DownloadManager {
    pub fn new(libs_dir: PathBuf) -> Self {
        Self {
            libs_dir,
            binaries_installed: Arc::new(Mutex::new(false)),
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    async fn ensure_binaries(&self) -> Result<(), String> {
        let mut installed = self.binaries_installed.lock().await;
        if *installed {
            return Ok(());
        }

        let yt_dlp_path = self.libs_dir.join("yt-dlp");
        let ffmpeg_path = self.libs_dir.join("ffmpeg");

        if !yt_dlp_path.exists() || !ffmpeg_path.exists() {
            log::info!("Installing binaries to {:?}", self.libs_dir);
            std::fs::create_dir_all(&self.libs_dir)
                .map_err(|e| format!("Failed to create libs dir: {e}"))?;

            Youtube::install_binaries(self.libs_dir.clone())
                .await
                .map_err(|e| format!("Failed to install binaries: {e}"))?;

            log::info!("Binaries installed successfully");
        }

        *installed = true;
        Ok(())
    }

    pub async fn start_downloads(
        &self,
        urls: Vec<String>,
        format: String,
        app: AppHandle,
        storage: Arc<Storage>,
    ) {
        if let Err(e) = self.ensure_binaries().await {
            log::error!("Failed to install binaries: {}", e);
            return;
        }

        let libs_dir = self.libs_dir.clone();

        for url in urls {
            let id = uuid::Uuid::new_v4().to_string();
            let app = app.clone();
            let storage = storage.clone();
            let format = format.clone();
            let libs_dir = libs_dir.clone();
            let processes = self.processes.clone();

            // Emit placeholder immediately
            app.emit(
                "download-metadata",
                MetadataEvent {
                    id: id.clone(),
                    title: url.clone(),
                    thumbnail: String::new(),
                    format: format.clone(),
                },
            )
            .ok();

            Self::emit_status(&app, &id, DownloadStatus::Pending, None, None);

            tokio::spawn(async move {
                Self::run_download(id, url, format, libs_dir, app, storage, processes).await;
            });
        }
    }

    /// Send signal to process and its children (process group)
    #[cfg(unix)]
    fn send_signal(pid: u32, signal: nix::sys::signal::Signal) -> Result<(), String> {
        use nix::sys::signal::kill;
        use nix::unistd::Pid;
        // Send to process group (negative PID) to catch child processes (ffmpeg etc.)
        let pgid = Pid::from_raw(-(pid as i32));
        match kill(pgid, signal) {
            Ok(()) => Ok(()),
            Err(_) => {
                // Fallback: send to process directly
                kill(Pid::from_raw(pid as i32), signal)
                    .map_err(|e| format!("Failed to send signal: {e}"))
            }
        }
    }

    /// Pause a download by sending SIGSTOP to the child process group
    pub async fn pause_download(&self, id: &str, app: &AppHandle) -> Result<(), String> {
        let processes = self.processes.lock().await;
        let info = processes.get(id);

        if info.is_none() {
            log::warn!("Pause requested but process not found for: {}", id);
            return Err("ダウンロード準備中です。少し待ってから再試行してください".into());
        }
        let info = info.unwrap();

        #[cfg(unix)]
        Self::send_signal(info.pid, nix::sys::signal::Signal::SIGSTOP)?;

        #[cfg(windows)]
        {
            // Windows doesn't support SIGSTOP; pause is not supported
            log::warn!("Pause is not fully supported on Windows");
        }

        Self::emit_status(app, id, DownloadStatus::Paused, None, None);
        log::info!("Paused download: {} (pid: {})", id, info.pid);
        Ok(())
    }

    /// Resume a paused download by sending SIGCONT
    pub async fn resume_download(&self, id: &str, app: &AppHandle) -> Result<(), String> {
        let processes = self.processes.lock().await;
        let info = processes
            .get(id)
            .ok_or_else(|| "Download not found".to_string())?;

        #[cfg(unix)]
        Self::send_signal(info.pid, nix::sys::signal::Signal::SIGCONT)?;

        Self::emit_status(app, id, DownloadStatus::Downloading, None, None);
        log::info!("Resumed download: {} (pid: {})", id, info.pid);
        Ok(())
    }

    /// Cancel a download by killing the child process and cleaning up partial files
    pub async fn cancel_download(&self, id: &str, app: &AppHandle) -> Result<(), String> {
        let info = {
            let mut processes = self.processes.lock().await;
            processes.remove(id)
        };

        if let Some(info) = info {
            #[cfg(unix)]
            {
                let _ = Self::send_signal(info.pid, nix::sys::signal::Signal::SIGCONT);
                let _ = Self::send_signal(info.pid, nix::sys::signal::Signal::SIGKILL);
            }

            #[cfg(windows)]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/T", "/PID", &info.pid.to_string()])
                    .spawn();
            }

            Self::cleanup_partial_files(&info.output_dir, &info.filename);
            log::info!("Cancelled download: {} (pid: {})", id, info.pid);
        }

        Self::emit_status(app, id, DownloadStatus::Error, Some("中断されました".into()), None);
        Ok(())
    }

    /// Remove partial/temp files left by yt-dlp
    fn cleanup_partial_files(output_dir: &PathBuf, filename: &str) {
        // yt-dlp creates .part files and temp video_/audio_ files
        let base = filename.trim_end_matches(".mp4").trim_end_matches(".mp3");
        if let Ok(entries) = std::fs::read_dir(output_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.contains(base) && (name.ends_with(".part") || name.starts_with("video_") || name.starts_with("audio_")) {
                    log::info!("Cleaning up: {}", name);
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
        // Also remove the main file if it exists (incomplete)
        let main_file = output_dir.join(filename);
        if main_file.exists() {
            let _ = std::fs::remove_file(main_file);
        }
    }

    async fn run_download(
        id: String,
        url: String,
        format: String,
        libs_dir: PathBuf,
        app: AppHandle,
        storage: Arc<Storage>,
        processes: Arc<Mutex<HashMap<String, ProcessInfo>>>,
    ) {
        let output_dir = PathBuf::from(&storage.get_settings().output_dir);
        std::fs::create_dir_all(&output_dir).ok();

        let yt_dlp_path = libs_dir.join("yt-dlp");
        let ffmpeg_path = libs_dir.join("ffmpeg");

        // Step 1: Fetch metadata
        Self::emit_status(&app, &id, DownloadStatus::Downloading, None, None);

        let meta_output = Command::new(&yt_dlp_path)
            .args(["--dump-json", "--no-download", &url])
            .output()
            .await;

        let (title, thumbnail) = match meta_output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let json: serde_json::Value =
                    serde_json::from_str(&stdout).unwrap_or_default();
                let title = json["title"].as_str().unwrap_or("Unknown").to_string();
                let thumbnail = json["thumbnail"].as_str().unwrap_or("").to_string();
                (title, thumbnail)
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Self::emit_status(&app, &id, DownloadStatus::Error, Some(format!("メタデータ取得失敗: {stderr}")), None);
                return;
            }
            Err(e) => {
                Self::emit_status(&app, &id, DownloadStatus::Error, Some(format!("yt-dlp実行失敗: {e}")), None);
                return;
            }
        };

        // Update UI with real metadata
        app.emit("download-metadata", MetadataEvent { id: id.clone(), title: title.clone(), thumbnail: thumbnail.clone(), format: format.clone() }).ok();

        // Step 2: Download
        let safe_title: String = title
            .chars()
            .map(|c: char| {
                if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' }
            })
            .collect();
        let ext = if format == "mp3" { "mp3" } else { "mp4" };
        let filename = format!("{safe_title}.{ext}");
        let output_path = output_dir.join(&filename);
        let output_template = output_path.to_string_lossy().to_string();

        // Check if file already exists
        if output_path.exists() {
            let confirmed = app
                .dialog()
                .message(format!("「{}」は既にダウンロード済みです。上書きしますか？", filename))
                .title("上書き確認")
                .kind(MessageDialogKind::Warning)
                .buttons(MessageDialogButtons::OkCancelCustom("上書き".into(), "スキップ".into()))
                .blocking_show();

            if !confirmed {
                Self::emit_status(
                    &app,
                    &id,
                    DownloadStatus::Error,
                    Some("スキップされました".into()),
                    None,
                );
                return;
            }
            // Remove existing file before download
            let _ = std::fs::remove_file(&output_path);
        }

        let mut cmd = Command::new(&yt_dlp_path);
        cmd.args([
            "--newline", "--progress",
            "--ffmpeg-location", &ffmpeg_path.to_string_lossy(),
            "-o", &output_template,
        ]);

        // Apply quality settings
        let current_settings = storage.get_settings();

        if format == "mp3" {
            let audio_quality = &current_settings.audio_quality;
            cmd.args(["-x", "--audio-format", "mp3", "--audio-quality", audio_quality]);
        } else {
            let format_filter = match current_settings.video_quality.as_str() {
                "1080" => "bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[height<=1080]",
                "720" => "bestvideo[height<=720][vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[height<=720]",
                "480" => "bestvideo[height<=480][vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[height<=480]",
                _ => "bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[vcodec^=avc1]/best",
            };
            cmd.args(["-f", format_filter, "--merge-output-format", "mp4"]);
        }

        cmd.arg(&url);
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        // Create new process group so we can SIGSTOP/SIGKILL the whole group
        #[cfg(unix)]
        {
            #[allow(unused_imports)]
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                Self::emit_status(&app, &id, DownloadStatus::Error, Some(format!("yt-dlp起動失敗: {e}")), None);
                return;
            }
        };

        // Register the process for pause/resume/cancel
        if let Some(pid) = child.id() {
            processes.lock().await.insert(
                id.clone(),
                ProcessInfo {
                    pid,
                    output_dir: output_dir.clone(),
                    filename: filename.clone(),
                },
            );
        }

        // Parse progress from stdout and stderr
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let app_p1 = app.clone();
        let id_p1 = id.clone();
        let stdout_task = tokio::spawn(async move {
            if let Some(out) = stdout {
                let reader = BufReader::new(out);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    if let Some((progress, downloaded, total)) = parse_progress_line(&line) {
                        app_p1.emit("download-progress", ProgressEvent { id: id_p1.clone(), progress, downloaded_bytes: downloaded, total_bytes: total }).ok();
                    }
                }
            }
        });

        let app_p2 = app.clone();
        let id_p2 = id.clone();
        let stderr_task = tokio::spawn(async move {
            if let Some(err) = stderr {
                let reader = BufReader::new(err);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    log::debug!("yt-dlp: {}", line);
                    if let Some((progress, downloaded, total)) = parse_progress_line(&line) {
                        app_p2.emit("download-progress", ProgressEvent { id: id_p2.clone(), progress, downloaded_bytes: downloaded, total_bytes: total }).ok();
                    }
                }
            }
        });

        let status = child.wait().await;
        let _ = tokio::join!(stdout_task, stderr_task);

        // Remove from process map
        processes.lock().await.remove(&id);

        // Check if this was cancelled (process map already removed in cancel_download)
        match status {
            Ok(exit) if exit.success() => {
                let file_path = if output_path.exists() {
                    output_path.to_string_lossy().into_owned()
                } else {
                    find_downloaded_file(&output_dir, &safe_title, ext)
                        .unwrap_or_else(|| output_path.to_string_lossy().into_owned())
                };

                let file_size = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);

                app.emit("download-progress", ProgressEvent { id: id.clone(), progress: 100.0, downloaded_bytes: file_size, total_bytes: file_size }).ok();
                Self::emit_status(&app, &id, DownloadStatus::Completed, None, Some(file_path.clone()));

                let entry = HistoryEntry {
                    id: id.clone(), url, title, thumbnail, file_path, format, file_size,
                    downloaded_at: chrono::Local::now().format("%Y-%m-%d %H:%M").to_string(),
                };
                storage.add_history_entry(entry).ok();
                log::info!("Download completed: {}", filename);
            }
            Ok(exit) => {
                // Non-zero exit could be from SIGKILL (cancel) - check if already handled
                let code = exit.code().unwrap_or(-1);
                if code == 137 || code == -1 {
                    // Killed by signal - likely cancelled, status already emitted
                    log::info!("Download process killed: {} (code: {})", id, code);
                } else {
                    Self::emit_status(&app, &id, DownloadStatus::Error, Some(format!("yt-dlp exited with code: {}", exit)), None);
                }
            }
            Err(e) => {
                Self::emit_status(&app, &id, DownloadStatus::Error, Some(format!("プロセス待機失敗: {e}")), None);
            }
        }
    }

    fn emit_status(app: &AppHandle, id: &str, status: DownloadStatus, error: Option<String>, file_path: Option<String>) {
        app.emit("download-status-changed", StatusEvent { id: id.to_string(), status, error, file_path }).ok();
    }
}

fn parse_progress_line(line: &str) -> Option<(f64, u64, u64)> {
    if !line.contains("[download]") || !line.contains('%') {
        return None;
    }
    let pct_str = line.split_whitespace().find(|s| s.ends_with('%'))?;
    let progress: f64 = pct_str.trim_end_matches('%').parse().ok()?;
    let total = line.split("of").nth(1).and_then(|s| {
        let part = s.split_whitespace().next()?;
        parse_size(part.trim_matches('~'))
    }).unwrap_or(0);
    let downloaded = if total > 0 { (total as f64 * progress / 100.0) as u64 } else { 0 };
    Some((progress, downloaded, total))
}

fn parse_size(s: &str) -> Option<u64> {
    let s = s.trim();
    if s.ends_with("GiB") {
        let n: f64 = s.trim_end_matches("GiB").parse().ok()?;
        Some((n * 1024.0 * 1024.0 * 1024.0) as u64)
    } else if s.ends_with("MiB") {
        let n: f64 = s.trim_end_matches("MiB").parse().ok()?;
        Some((n * 1024.0 * 1024.0) as u64)
    } else if s.ends_with("KiB") {
        let n: f64 = s.trim_end_matches("KiB").parse().ok()?;
        Some((n * 1024.0) as u64)
    } else if s.ends_with('B') {
        let n: f64 = s.trim_end_matches('B').parse().ok()?;
        Some(n as u64)
    } else {
        None
    }
}

fn find_downloaded_file(dir: &PathBuf, title_prefix: &str, ext: &str) -> Option<String> {
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(title_prefix) && name.ends_with(ext) {
            return Some(entry.path().to_string_lossy().into_owned());
        }
    }
    None
}
