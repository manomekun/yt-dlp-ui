import { DownloadInput } from "./DownloadInput.tsx";
import { DownloadList } from "./DownloadList.tsx";
import * as tauri from "../lib/tauri.ts";
import type { OutputFormat } from "../lib/types.ts";

export function DownloadView() {
  function handleStartDownload(urls: string[], format: OutputFormat) {
    tauri.startDownloads(urls, format);
  }

  function handlePause(id: string) {
    tauri.pauseDownload(id);
  }

  function handleResume(id: string) {
    tauri.resumeDownload(id);
  }

  function handleCancel(id: string) {
    tauri.cancelDownload(id);
  }

  return (
    <>
      <h1
        style={{
          "font-size": "20px",
          "font-weight": "700",
        }}
      >
        ダウンロード
      </h1>
      <DownloadInput onStartDownload={handleStartDownload} />
      <DownloadList
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
      />
    </>
  );
}
