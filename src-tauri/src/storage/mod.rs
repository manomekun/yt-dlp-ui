use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::{HistoryEntry, Settings};

pub struct Storage {
    data_dir: PathBuf,
    settings: Mutex<Settings>,
    history: Mutex<Vec<HistoryEntry>>,
}

impl Storage {
    pub fn new(data_dir: PathBuf) -> Self {
        fs::create_dir_all(&data_dir).ok();

        let settings = Self::load_json::<Settings>(&data_dir.join("settings.json"))
            .unwrap_or_default();
        let history = Self::load_json::<Vec<HistoryEntry>>(&data_dir.join("history.json"))
            .unwrap_or_default();

        log::info!("Storage initialized at: {}", data_dir.display());

        Self {
            data_dir,
            settings: Mutex::new(settings),
            history: Mutex::new(history),
        }
    }

    // --- Settings ---

    pub fn get_settings(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }

    pub fn update_settings(&self, settings: Settings) -> Result<(), String> {
        let path = self.data_dir.join("settings.json");
        Self::save_json(&path, &settings)?;
        *self.settings.lock().unwrap() = settings;
        Ok(())
    }

    // --- History ---

    pub fn get_history(&self) -> Vec<HistoryEntry> {
        self.history.lock().unwrap().clone()
    }

    pub fn add_history_entry(&self, entry: HistoryEntry) -> Result<(), String> {
        let mut history = self.history.lock().unwrap();
        history.insert(0, entry);
        let path = self.data_dir.join("history.json");
        Self::save_json(&path, &*history)
    }

    pub fn delete_history_entry(&self, id: &str) -> Result<(), String> {
        let mut history = self.history.lock().unwrap();
        history.retain(|e| e.id != id);
        let path = self.data_dir.join("history.json");
        Self::save_json(&path, &*history)
    }

    pub fn clear_history(&self) -> Result<(), String> {
        let mut history = self.history.lock().unwrap();
        history.clear();
        let path = self.data_dir.join("history.json");
        Self::save_json(&path, &*history)
    }

    pub fn find_history_entry(&self, id: &str) -> Option<HistoryEntry> {
        self.history.lock().unwrap().iter().find(|e| e.id == id).cloned()
    }

    // --- JSON helpers ---

    fn load_json<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Option<T> {
        let content = fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    }

    fn save_json<T: serde::Serialize>(path: &PathBuf, data: &T) -> Result<(), String> {
        let json = serde_json::to_string_pretty(data)
            .map_err(|e| format!("Failed to serialize: {e}"))?;
        fs::write(path, json)
            .map_err(|e| format!("Failed to write {}: {e}", path.display()))
    }
}
