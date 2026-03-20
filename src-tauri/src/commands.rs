use std::sync::Arc;

use tauri::State;
use tauri_plugin_dialog::DialogExt;

use crate::downloader::DownloadManager;
use crate::models::{HistoryEntry, Settings};
use crate::storage::Storage;

// --- Download commands ---

#[tauri::command]
pub async fn start_downloads(
    urls: Vec<String>,
    format: String,
    app: tauri::AppHandle,
    manager: State<'_, Arc<DownloadManager>>,
    storage: State<'_, Arc<Storage>>,
) -> Result<(), String> {
    log::info!("Starting downloads: {:?} as {}", urls, format);
    manager
        .start_downloads(urls, format, app, storage.inner().clone())
        .await;
    Ok(())
}

#[tauri::command]
pub async fn pause_download(
    id: String,
    app: tauri::AppHandle,
    manager: State<'_, Arc<DownloadManager>>,
) -> Result<(), String> {
    manager.pause_download(&id, &app).await
}

#[tauri::command]
pub async fn resume_download(
    id: String,
    app: tauri::AppHandle,
    manager: State<'_, Arc<DownloadManager>>,
) -> Result<(), String> {
    manager.resume_download(&id, &app).await
}

#[tauri::command]
pub async fn cancel_download(
    id: String,
    app: tauri::AppHandle,
    manager: State<'_, Arc<DownloadManager>>,
) -> Result<(), String> {
    manager.cancel_download(&id, &app).await
}

// --- Settings commands ---

#[tauri::command]
pub async fn get_settings(storage: State<'_, Arc<Storage>>) -> Result<Settings, String> {
    Ok(storage.get_settings())
}

#[tauri::command]
pub async fn update_settings(
    settings: Settings,
    storage: State<'_, Arc<Storage>>,
) -> Result<(), String> {
    storage.update_settings(settings)
}

#[tauri::command]
pub async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = app.dialog().file().blocking_pick_folder();
    Ok(dir.map(|p| p.to_string()))
}

// --- File commands ---

#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("Failed to reveal in Finder: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| format!("Failed to reveal in Explorer: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new("/")))
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {e}"))?;
    }
    Ok(())
}

// --- History commands ---

#[tauri::command]
pub async fn get_history(storage: State<'_, Arc<Storage>>) -> Result<Vec<HistoryEntry>, String> {
    Ok(storage.get_history())
}

#[tauri::command]
pub async fn clear_history(storage: State<'_, Arc<Storage>>) -> Result<(), String> {
    storage.clear_history()
}

#[tauri::command]
pub async fn delete_history_entry(
    id: String,
    storage: State<'_, Arc<Storage>>,
) -> Result<(), String> {
    storage.delete_history_entry(&id)
}

#[tauri::command]
pub async fn redownload_from_history(
    id: String,
    app: tauri::AppHandle,
    manager: State<'_, Arc<DownloadManager>>,
    storage: State<'_, Arc<Storage>>,
) -> Result<(), String> {
    if let Some(entry) = storage.find_history_entry(&id) {
        log::info!("Redownloading: {} ({})", entry.title, entry.url);
        manager
            .start_downloads(
                vec![entry.url],
                entry.format,
                app,
                storage.inner().clone(),
            )
            .await;
    }
    Ok(())
}
