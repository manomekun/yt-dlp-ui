import { createStore } from "solid-js/store";
import type { DownloadItem, OutputFormat } from "../lib/types.ts";

interface DownloadState {
  items: DownloadItem[];
  selectedFormat: OutputFormat;
}

const [downloadState, setDownloadState] = createStore<DownloadState>({
  items: [],
  selectedFormat: "mp4",
});

function addDownloadItem(item: DownloadItem) {
  setDownloadState("items", (items) => [item, ...items]);
}

function updateDownloadItem(id: string, updates: Partial<DownloadItem>) {
  setDownloadState("items", (item) => item.id === id, updates);
}

function removeDownloadItem(id: string) {
  setDownloadState("items", (items) => items.filter((item) => item.id !== id));
}

function clearCompletedItems() {
  setDownloadState("items", (items) =>
    items.filter((item) => item.status !== "completed"),
  );
}

function setSelectedFormat(format: OutputFormat) {
  setDownloadState("selectedFormat", format);
}

export {
  downloadState,
  addDownloadItem,
  updateDownloadItem,
  removeDownloadItem,
  clearCompletedItems,
  setSelectedFormat,
};
