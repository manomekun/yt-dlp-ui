use std::path::PathBuf;
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;

/// Download yt-dlp and ffmpeg binaries to the specified directory.
pub async fn install_binaries(libs_dir: PathBuf) -> Result<(), String> {
    std::fs::create_dir_all(&libs_dir)
        .map_err(|e| format!("Failed to create libs dir: {e}"))?;

    let yt_dlp_path = yt_dlp_binary_path(&libs_dir);
    let ffmpeg_path = ffmpeg_binary_path(&libs_dir);

    let mut handles = Vec::new();

    if !yt_dlp_path.exists() {
        let path = yt_dlp_path.clone();
        handles.push(tokio::spawn(async move {
            install_yt_dlp(&path).await
        }));
    }

    if !ffmpeg_path.exists() {
        let path = ffmpeg_path.clone();
        let dir = libs_dir.clone();
        handles.push(tokio::spawn(async move {
            install_ffmpeg(&path, &dir).await
        }));
    }

    for handle in handles {
        handle.await.map_err(|e| format!("Task failed: {e}"))??;
    }

    Ok(())
}

pub fn yt_dlp_binary_path(libs_dir: &PathBuf) -> PathBuf {
    if cfg!(target_os = "windows") {
        libs_dir.join("yt-dlp.exe")
    } else {
        libs_dir.join("yt-dlp")
    }
}

pub fn ffmpeg_binary_path(libs_dir: &PathBuf) -> PathBuf {
    if cfg!(target_os = "windows") {
        libs_dir.join("ffmpeg.exe")
    } else {
        libs_dir.join("ffmpeg")
    }
}

async fn install_yt_dlp(dest: &PathBuf) -> Result<(), String> {
    let url = yt_dlp_download_url();
    log::info!("Downloading yt-dlp from: {}", url);
    download_file(&url, dest).await?;

    #[cfg(unix)]
    set_executable(dest)?;

    log::info!("yt-dlp installed: {:?}", dest);
    Ok(())
}

async fn install_ffmpeg(dest: &PathBuf, libs_dir: &PathBuf) -> Result<(), String> {
    let url = ffmpeg_download_url();
    log::info!("Downloading ffmpeg from: {}", url);

    if url.ends_with(".zip") {
        let zip_path = libs_dir.join("ffmpeg-download.zip");
        download_file(&url, &zip_path).await?;
        extract_ffmpeg_from_zip(&zip_path, dest)?;
        let _ = std::fs::remove_file(&zip_path);
    } else if url.ends_with(".tar.xz") || url.ends_with(".tar.gz") {
        // For Linux, download and extract
        let archive_path = libs_dir.join("ffmpeg-download.tar.xz");
        download_file(&url, &archive_path).await?;
        extract_ffmpeg_from_tar(&archive_path, dest)?;
        let _ = std::fs::remove_file(&archive_path);
    } else {
        download_file(&url, dest).await?;
    }

    #[cfg(unix)]
    set_executable(dest)?;

    log::info!("ffmpeg installed: {:?}", dest);
    Ok(())
}

fn yt_dlp_download_url() -> String {
    let base = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
    if cfg!(target_os = "windows") {
        format!("{base}/yt-dlp.exe")
    } else if cfg!(target_os = "macos") {
        format!("{base}/yt-dlp_macos")
    } else {
        format!("{base}/yt-dlp_linux")
    }
}

fn ffmpeg_download_url() -> String {
    if cfg!(target_os = "windows") {
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip".into()
    } else if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "https://www.osxexperts.net/ffmpeg7arm.zip".into()
        } else {
            "https://www.osxexperts.net/ffmpeg7intel.zip".into()
        }
    } else {
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz".into()
    }
}

async fn download_file(url: &str, dest: &PathBuf) -> Result<(), String> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Download request failed: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Download HTTP error: {e}"))?;

    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("Failed to create file: {e}"))?;

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Download stream error: {e}"))?;
        file.write_all(&bytes)
            .await
            .map_err(|e| format!("Failed to write: {e}"))?;
    }

    file.flush().await.map_err(|e| format!("Failed to flush: {e}"))?;
    Ok(())
}

fn extract_ffmpeg_from_zip(zip_path: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let file = std::fs::File::open(zip_path)
        .map_err(|e| format!("Failed to open zip: {e}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip: {e}"))?;

    let ffmpeg_name = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {e}"))?;

        let name = entry.name().to_string();
        if name.ends_with(ffmpeg_name) && !name.contains("ffprobe") && !name.contains("ffplay") {
            let mut out = std::fs::File::create(dest)
                .map_err(|e| format!("Failed to create ffmpeg: {e}"))?;
            std::io::copy(&mut entry, &mut out)
                .map_err(|e| format!("Failed to extract ffmpeg: {e}"))?;
            return Ok(());
        }
    }

    Err("ffmpeg binary not found in zip".into())
}

fn extract_ffmpeg_from_tar(archive_path: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    // Use system tar to extract
    let output = std::process::Command::new("tar")
        .args(["--list", "-f"])
        .arg(archive_path)
        .output()
        .map_err(|e| format!("Failed to list tar: {e}"))?;

    let listing = String::from_utf8_lossy(&output.stdout);
    let ffmpeg_entry = listing
        .lines()
        .find(|l| l.ends_with("/ffmpeg") && !l.contains("ffprobe") && !l.contains("ffplay"))
        .ok_or("ffmpeg not found in archive")?
        .to_string();

    let parent = dest.parent().unwrap();
    let status = std::process::Command::new("tar")
        .args(["xf"])
        .arg(archive_path)
        .args(["--strip-components", &ffmpeg_entry.matches('/').count().to_string()])
        .arg(&ffmpeg_entry)
        .args(["-C"])
        .arg(parent)
        .status()
        .map_err(|e| format!("Failed to extract tar: {e}"))?;

    if !status.success() {
        return Err("tar extraction failed".into());
    }

    Ok(())
}

#[cfg(unix)]
fn set_executable(path: &PathBuf) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let perms = std::fs::Permissions::from_mode(0o755);
    std::fs::set_permissions(path, perms)
        .map_err(|e| format!("Failed to set executable: {e}"))
}
