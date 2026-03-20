export type DownloadStatus =
  | "pending"
  | "downloading"
  | "paused"
  | "completed"
  | "error";

export type OutputFormat = "mp4" | "mp3";

export type ThemeMode = "dark" | "light" | "system";

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  status: DownloadStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  format: OutputFormat;
  error?: string;
  filePath?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  filePath: string;
  format: OutputFormat;
  fileSize: number;
  downloadedAt: string;
}

export interface Settings {
  outputDir: string;
  videoQuality: string;
  audioQuality: string;
  theme: ThemeMode;
  defaultFormat: OutputFormat;
}
