import { For, Show, createSignal, onMount } from "solid-js";
import { historyState, setHistoryEntries, removeHistoryEntry } from "../stores/historyStore.ts";
import * as tauri from "../lib/tauri.ts";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(0))} ${sizes[i]}`;
}

export function HistoryView() {
  const [search, setSearch] = createSignal("");

  onMount(async () => {
    try {
      const entries = await tauri.getHistory();
      setHistoryEntries(entries);
    } catch {
      // Backend not ready yet
    }
  });

  const filteredEntries = () => {
    const q = search().toLowerCase();
    if (!q) return historyState.entries;
    return historyState.entries.filter((e) =>
      e.title.toLowerCase().includes(q),
    );
  };

  async function handleDelete(id: string) {
    try {
      await tauri.deleteHistoryEntry(id);
      removeHistoryEntry(id);
    } catch {
      removeHistoryEntry(id);
    }
  }

  async function handleClearAll() {
    try {
      await tauri.clearHistory();
      setHistoryEntries([]);
    } catch {
      setHistoryEntries([]);
    }
  }

  async function handleRedownload(id: string) {
    try {
      await tauri.redownloadFromHistory(id);
    } catch {
      // Backend not ready yet
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
        }}
      >
        <h1 style={{ "font-size": "20px", "font-weight": "700" }}>
          ダウンロード履歴
        </h1>
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <Show when={historyState.entries.length > 0}>
            <button
              class="neu-btn"
              title="履歴を全件クリア"
              onClick={handleClearAll}
              style={{
                padding: "6px 12px",
                "font-size": "11px",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              全件クリア
            </button>
          </Show>
          <div
            class="glass-input"
            style={{
              display: "flex",
              "align-items": "center",
              gap: "8px",
              width: "200px",
              height: "32px",
              padding: "0 10px",
            }}
          >
          <span style={{ color: "var(--text-muted)", "font-size": "14px" }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="検索..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              "font-size": "12px",
              width: "100%",
            }}
          />
        </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          "flex-direction": "column",
          gap: "6px",
          "overflow-y": "auto",
        }}
      >
        <Show when={filteredEntries().length === 0}>
          <div
            style={{
              flex: 1,
              display: "flex",
              "flex-direction": "column",
              "align-items": "center",
              "justify-content": "center",
              gap: "8px",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ "font-size": "32px" }}>📭</span>
            <span class="mono" style={{ "font-size": "13px" }}>
              {search() ? "検索結果がありません" : "履歴がありません"}
            </span>
          </div>
        </Show>

        <For each={filteredEntries()}>
          {(entry) => (
            <div
              class="glass-card"
              style={{
                display: "flex",
                "align-items": "center",
                gap: "12px",
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  width: "88px",
                  height: "50px",
                  "border-radius": "6px",
                  background: entry.thumbnail
                    ? `url(${entry.thumbnail}) center/cover`
                    : "#374151",
                  "flex-shrink": "0",
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  "flex-direction": "column",
                  gap: "4px",
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
                  {entry.title}
                </span>
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "6px",
                  }}
                >
                  <span
                    class="mono"
                    style={{
                      "font-size": "10px",
                      "font-weight": "600",
                      color: entry.format === "mp3" ? "#F59E0B" : "var(--accent)",
                      background: entry.format === "mp3" ? "rgba(245,158,11,0.12)" : "rgba(14,165,233,0.12)",
                      padding: "2px 6px",
                      "border-radius": "4px",
                    }}
                  >
                    {entry.format === "mp3" ? "🎵 MP3" : "🎬 MP4"}
                  </span>
                  <span
                    class="mono"
                    style={{
                      "font-size": "11px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {entry.downloadedAt} · {formatFileSize(entry.fileSize)}
                  </span>
                </div>
                <span
                  class="mono"
                  style={{
                    "font-size": "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  {entry.filePath}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", "flex-shrink": "0" }}>
                <button
                  class="neu-btn"
                  title="再ダウンロード"
                  onClick={() => handleRedownload(entry.id)}
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                    color: "var(--text-secondary)",
                    "font-size": "16px",
                  }}
                >
                  ⟳
                </button>
                <button
                  class="neu-btn"
                  title="履歴から削除"
                  onClick={() => handleDelete(entry.id)}
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                    color: "var(--text-muted)",
                    "font-size": "16px",
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </>
  );
}
