import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  DownloadItem,
  HistoryEntry,
  OutputFormat,
  Settings,
} from "./types.ts";

// Commands (Frontend → Backend)

export async function startDownloads(
  urls: string[],
  format: OutputFormat,
): Promise<void> {
  await invoke("start_downloads", { urls, format });
}

export async function pauseDownload(id: string): Promise<void> {
  await invoke("pause_download", { id });
}

export async function resumeDownload(id: string): Promise<void> {
  await invoke("resume_download", { id });
}

export async function cancelDownload(id: string): Promise<void> {
  await invoke("cancel_download", { id });
}

export async function getSettings(): Promise<Settings> {
  return await invoke("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  await invoke("update_settings", { settings });
}

export async function selectDirectory(): Promise<string | null> {
  return await invoke("select_directory");
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return await invoke("get_history");
}

export async function clearHistory(): Promise<void> {
  await invoke("clear_history");
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await invoke("delete_history_entry", { id });
}

export async function redownloadFromHistory(id: string): Promise<void> {
  await invoke("redownload_from_history", { id });
}

// Events (Backend → Frontend)

interface DownloadMetadataPayload {
  id: string;
  title: string;
  thumbnail: string;
  format: string;
}

interface DownloadProgressPayload {
  id: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
}

interface DownloadStatusPayload {
  id: string;
  status: DownloadItem["status"];
  error?: string;
  file_path?: string;
}

export function onDownloadMetadata(
  callback: (payload: DownloadMetadataPayload) => void,
): Promise<UnlistenFn> {
  return listen("download-metadata", (event) =>
    callback(event.payload as DownloadMetadataPayload),
  );
}

export function onDownloadProgress(
  callback: (payload: DownloadProgressPayload) => void,
): Promise<UnlistenFn> {
  return listen("download-progress", (event) =>
    callback(event.payload as DownloadProgressPayload),
  );
}

export function onDownloadStatusChanged(
  callback: (payload: DownloadStatusPayload) => void,
): Promise<UnlistenFn> {
  return listen("download-status-changed", (event) =>
    callback(event.payload as DownloadStatusPayload),
  );
}
