use std::sync::Arc;
use tauri::Manager;

mod commands;
mod downloader;
mod installer;
mod models;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            // Initialize storage
            let storage = Arc::new(storage::Storage::new(data_dir.clone()));
            app.manage(storage.clone());

            // Initialize download manager
            let libs_dir = data_dir.join("libs");
            let manager = downloader::DownloadManager::new(libs_dir);
            app.manage(Arc::new(manager));

            // Store Arc<Storage> separately for commands that need it
            app.manage(storage);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_downloads,
            commands::pause_download,
            commands::resume_download,
            commands::cancel_download,
            commands::get_settings,
            commands::update_settings,
            commands::select_directory,
            commands::reveal_in_finder,
            commands::get_history,
            commands::clear_history,
            commands::delete_history_entry,
            commands::redownload_from_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
