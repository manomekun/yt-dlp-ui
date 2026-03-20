import { For, Show } from "solid-js";
import { downloadState, clearCompletedItems } from "../stores/downloadStore.ts";
import { DownloadItemCard } from "./DownloadItem.tsx";

interface DownloadListProps {
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}

export function DownloadList(props: DownloadListProps) {
  const activeCount = () =>
    downloadState.items.filter(
      (i) => i.status === "downloading" || i.status === "pending",
    ).length;

  const completedCount = () =>
    downloadState.items.filter((i) => i.status === "completed").length;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
        "overflow-y": "auto",
      }}
    >
      <Show when={downloadState.items.length > 0}>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              "font-size": "11px",
              "font-weight": "600",
              color: "var(--text-tertiary)",
              "letter-spacing": "2px",
            }}
          >
            ダウンロード中
          </span>
          <Show when={activeCount() > 0}>
            <span
              class="mono"
              style={{
                background: "var(--accent)",
                color: "var(--text-on-accent)",
                "font-size": "10px",
                "font-weight": "700",
                width: "20px",
                height: "20px",
                "border-radius": "10px",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
              }}
            >
              {activeCount()}
            </span>
          </Show>
          <div style={{ flex: 1 }} />
          <Show when={completedCount() > 0}>
            <button
              class="neu-btn"
              title="完了済みをクリア"
              onClick={() => clearCompletedItems()}
              style={{
                padding: "4px 10px",
                "font-size": "11px",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              完了済みをクリア
            </button>
          </Show>
        </div>
      </Show>

      <For each={downloadState.items}>
        {(item) => (
          <DownloadItemCard
            item={item}
            onPause={props.onPause}
            onResume={props.onResume}
            onCancel={props.onCancel}
          />
        )}
      </For>
    </div>
  );
}
