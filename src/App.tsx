import { createSignal, Match, Switch, onMount, onCleanup } from "solid-js";
import { Layout } from "./components/Layout.tsx";
import { DownloadView } from "./components/DownloadView.tsx";
import { HistoryView } from "./components/HistoryView.tsx";
import { SettingsView } from "./components/SettingsView.tsx";
import {
  addDownloadItem,
  updateDownloadItem,
  removeDownloadItem,
  downloadState,
} from "./stores/downloadStore.ts";
import { setHistoryEntries } from "./stores/historyStore.ts";
import { setSettings } from "./stores/settingsStore.ts";
import { setThemeMode } from "./stores/themeStore.ts";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import * as tauri from "./lib/tauri.ts";

type Page = "download" | "history" | "settings";

async function sendDesktopNotification(videoTitle: string) {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (granted) {
      sendNotification({
        title: "ダウンロード完了",
        body: videoTitle,
      });
    }
  } catch {
    // Notification not available
  }
}

export function App() {
  const [page, setPage] = createSignal<Page>("download");

  onMount(async () => {
    // Load settings
    try {
      const s = await tauri.getSettings();
      setSettings(s);
      setThemeMode(s.theme);
    } catch {
      // Backend not ready yet (dev mode without Tauri)
    }

    // Listen to download events
    const unlistenMeta = await tauri.onDownloadMetadata((payload) => {
      // Create item if it doesn't exist yet (backend generates the ID)
      const exists = downloadState.items.some((i) => i.id === payload.id);
      if (!exists) {
        addDownloadItem({
          id: payload.id,
          url: "",
          title: payload.title,
          thumbnail: payload.thumbnail,
          status: "pending",
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          format: (payload.format === "mp3" ? "mp3" : "mp4") as "mp4" | "mp3",
        });
      } else {
        updateDownloadItem(payload.id, {
          title: payload.title,
          thumbnail: payload.thumbnail,
        });
      }
    });

    const unlistenProgress = await tauri.onDownloadProgress((payload) => {
      // Don't overwrite paused status with downloading
      const item = downloadState.items.find((i) => i.id === payload.id);
      const currentStatus = item?.status;
      updateDownloadItem(payload.id, {
        progress: payload.progress,
        downloadedBytes: payload.downloaded_bytes,
        totalBytes: payload.total_bytes,
        ...(currentStatus !== "paused" && currentStatus !== "completed"
          ? { status: "downloading" as const }
          : {}),
      });
    });

    const unlistenStatus = await tauri.onDownloadStatusChanged((payload) => {
      // Remove cancelled items from the list
      if (
        payload.status === "error" &&
        (payload.error === "中断されました" || payload.error === "スキップされました")
      ) {
        removeDownloadItem(payload.id);
        return;
      }
      updateDownloadItem(payload.id, {
        status: payload.status,
        error: payload.error,
        filePath: payload.file_path,
      });

      // Refresh history and send notification when a download completes
      if (payload.status === "completed") {
        tauri.getHistory().then(setHistoryEntries).catch(() => {});

        // Desktop notification
        const item = downloadState.items.find((i) => i.id === payload.id);
        const title = item?.title || "動画";
        sendDesktopNotification(title);
      }
    });

    onCleanup(() => {
      unlistenMeta();
      unlistenProgress();
      unlistenStatus();
    });
  });

  return (
    <Layout activePage={page()} onNavigate={setPage}>
      <Switch>
        <Match when={page() === "download"}>
          <DownloadView />
        </Match>
        <Match when={page() === "history"}>
          <HistoryView />
        </Match>
        <Match when={page() === "settings"}>
          <SettingsView />
        </Match>
      </Switch>
    </Layout>
  );
}
