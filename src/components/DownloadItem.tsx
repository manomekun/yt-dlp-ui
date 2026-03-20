import { invoke } from "@tauri-apps/api/core";
import type { DownloadItem as DLItem } from "../lib/types.ts";

interface DownloadItemProps {
  item: DLItem;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(0))} ${sizes[i]}`;
}

async function revealInFinder(filePath: string) {
  try {
    await invoke("reveal_in_finder", { path: filePath });
  } catch {
    // Fallback: try shell open on the directory
  }
}

export function DownloadItemCard(props: DownloadItemProps) {
  const isComplete = () => props.item.status === "completed";
  const isError = () => props.item.status === "error";
  const isPaused = () => props.item.status === "paused";
  const isDownloading = () => props.item.status === "downloading";

  const statusText = () => {
    switch (props.item.status) {
      case "pending":
        return "待機中";
      case "downloading":
        return "ダウンロード中";
      case "paused":
        return "一時停止";
      case "completed":
        return "完了";
      case "error":
        return props.item.error ?? "エラー";
    }
  };

  const statusColor = () => {
    if (isComplete()) return "var(--success)";
    if (isError()) return "var(--error)";
    if (isPaused()) return "var(--text-secondary)";
    return "var(--accent)";
  };

  return (
    <div
      class="glass-card"
      style={{
        display: "flex",
        "align-items": "center",
        gap: "14px",
        padding: "14px 18px",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: "96px",
          height: "54px",
          "border-radius": "10px",
          background: props.item.thumbnail
            ? `url(${props.item.thumbnail}) center/cover`
            : "var(--glass-input)",
          border: "1px solid var(--glass-border)",
          "flex-shrink": "0",
        }}
      />

      {/* Info */}
      <div
        style={{
          flex: 1,
          display: "flex",
          "flex-direction": "column",
          gap: "6px",
          "min-width": "0",
        }}
      >
        <span
          style={{
            "font-size": "13px",
            "font-weight": "600",
            "white-space": "nowrap",
            overflow: "hidden",
            "text-overflow": "ellipsis",
          }}
        >
          {props.item.title || props.item.url}
        </span>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
          }}
        >

          <span
            class="mono"
            style={{
              "font-size": "10px",
              "font-weight": "600",
              color: props.item.format === "mp3" ? "#F59E0B" : "var(--accent)",
              background: props.item.format === "mp3" ? "rgba(245,158,11,0.12)" : "rgba(14,165,233,0.12)",
              padding: "2px 6px",
              "border-radius": "4px",
            }}
          >
            {props.item.format === "mp3" ? "🎵 MP3" : "🎬 MP4"}
          </span>
          <span
            class="mono"
            style={{
              "font-size": "11px",
              "font-weight": "500",
              color: statusColor(),
            }}
          >
            {statusText()}
          </span>
          <span
            class="mono"
            style={{
              "font-size": "11px",
              color: "var(--text-secondary)",
            }}
          >
            {formatBytes(props.item.downloadedBytes)}
            {props.item.totalBytes > 0
              ? ` / ${formatBytes(props.item.totalBytes)}`
              : ""}
          </span>
        </div>
        <div class="progress-bar" style={{ height: "4px" }}>
          <div
            class={`progress-fill ${isComplete() ? "complete" : ""}`}
            style={{ width: `${props.item.progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", "flex-shrink": "0" }}>
        {isDownloading() && (
          <button
            class="neu-btn"
            title="一時停止"
            onClick={() => props.onPause(props.item.id)}
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              color: "var(--text-secondary)",
              "font-size": "14px",
            }}
          >
            ⏸
          </button>
        )}
        {isPaused() && (
          <button
            class="neu-btn"
            title="再開"
            onClick={() => props.onResume(props.item.id)}
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              color: "var(--accent)",
              "font-size": "14px",
            }}
          >
            ▶
          </button>
        )}
        {!isComplete() && (
          <button
            class="neu-btn"
            title="中断"
            onClick={() => props.onCancel(props.item.id)}
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              color: "var(--text-muted)",
              "font-size": "14px",
            }}
          >
            ✕
          </button>
        )}
        {isComplete() && props.item.filePath && (
          <button
            class="neu-btn"
            title="Finderで表示"
            onClick={() => revealInFinder(props.item.filePath!)}
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              color: "var(--text-secondary)",
              "font-size": "14px",
            }}
          >
            📂
          </button>
        )}
      </div>
    </div>
  );
}
