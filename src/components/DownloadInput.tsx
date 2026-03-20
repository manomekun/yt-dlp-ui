import { createSignal } from "solid-js";
import { downloadState, setSelectedFormat } from "../stores/downloadStore.ts";
import type { OutputFormat } from "../lib/types.ts";

interface DownloadInputProps {
  onStartDownload: (urls: string[], format: OutputFormat) => void;
}

export function DownloadInput(props: DownloadInputProps) {
  const [urlText, setUrlText] = createSignal("");

  function handleStart() {
    const urls = urlText()
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;
    props.onStartDownload(urls, downloadState.selectedFormat);
    setUrlText("");
  }

  const formatOptions: { id: OutputFormat; label: string; icon: string }[] = [
    { id: "mp4", label: "動画 (MP4)", icon: "🎬" },
    { id: "mp3", label: "音声のみ (MP3)", icon: "🎵" },
  ];

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
      <textarea
        class="glass-input"
        placeholder="URLを入力（複数行で一括入力可能）"
        value={urlText()}
        onInput={(e) => setUrlText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) handleStart();
        }}
        style={{
          width: "100%",
          height: "100px",
          padding: "14px",
          color: "var(--text-primary)",
          "font-family": "'UDEV Gothic', monospace",
          "font-size": "13px",
          resize: "none",
          outline: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          "align-items": "center",
          gap: "12px",
        }}
      >
        {/* Format segment control */}
        <div
          class="neu-select"
          style={{
            display: "flex",
            padding: "3px",
            gap: "2px",
          }}
        >
          {formatOptions.map((opt) => (
            <button
              onClick={() => setSelectedFormat(opt.id)}
              style={{
                display: "flex",
                "align-items": "center",
                gap: "5px",
                padding: "6px 12px",
                border: "none",
                "border-radius": "9px",
                background:
                  downloadState.selectedFormat === opt.id
                    ? "var(--accent)"
                    : "transparent",
                color:
                  downloadState.selectedFormat === opt.id
                    ? "var(--text-on-accent)"
                    : "var(--text-secondary)",
                "font-size": "12px",
                "font-weight":
                  downloadState.selectedFormat === opt.id ? "600" : "400",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ "font-size": "13px" }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button
          class="btn-primary"
          onClick={handleStart}
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            padding: "8px 20px",
            "font-size": "13px",
          }}
        >
          <span>↓</span>
          ダウンロード開始
        </button>
      </div>
    </div>
  );
}
