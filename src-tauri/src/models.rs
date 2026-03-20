use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub output_dir: String,
    pub video_quality: String,
    pub audio_quality: String,
    pub theme: String,
    pub default_format: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            output_dir: default_download_dir(),
            video_quality: "best".into(),
            audio_quality: "320".into(),
            theme: "dark".into(),
            default_format: "mp4".into(),
        }
    }
}

fn default_download_dir() -> String {
    dirs::download_dir()
        .map(|p| p.join("videos").to_string_lossy().into_owned())
        .unwrap_or_else(|| "~/Downloads/videos".into())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub url: String,
    pub title: String,
    pub thumbnail: String,
    pub file_path: String,
    pub format: String,
    pub file_size: u64,
    pub downloaded_at: String,
}
