import { settings, setSettings } from "../stores/settingsStore.ts";
import { themeMode, setThemeMode } from "../stores/themeStore.ts";
import type { ThemeMode } from "../lib/types.ts";
import * as tauri from "../lib/tauri.ts";

const themeOptions: { id: ThemeMode; label: string; icon: string }[] = [
  { id: "dark", label: "ダーク", icon: "🌙" },
  { id: "light", label: "ライト", icon: "☀" },
  { id: "system", label: "システム", icon: "🖥" },
];

const videoQualities = [
  { value: "best", label: "最高品質 (4K)" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
];

const audioQualities = [
  { value: "320", label: "320 kbps" },
  { value: "256", label: "256 kbps" },
  { value: "192", label: "192 kbps" },
  { value: "128", label: "128 kbps" },
];

export function SettingsView() {
  /** Save current settings to backend */
  async function saveSettings() {
    try {
      await tauri.updateSettings({ ...settings });
    } catch {
      // Backend not ready
    }
  }

  async function handleSelectDir() {
    try {
      const dir = await tauri.selectDirectory();
      if (dir) {
        setSettings("outputDir", dir);
        await saveSettings();
      }
    } catch {
      // Backend not ready
    }
  }

  function handleThemeChange(mode: ThemeMode) {
    setThemeMode(mode);
    setSettings("theme", mode);
    saveSettings();
  }

  function handleVideoQuality(value: string) {
    setSettings("videoQuality", value);
    saveSettings();
  }

  function handleAudioQuality(value: string) {
    setSettings("audioQuality", value);
    saveSettings();
  }

  return (
    <>
      <h1 style={{ "font-size": "20px", "font-weight": "700" }}>設定</h1>

      {/* Save Location */}
      <section style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
        <label
          style={{
            "font-size": "13px",
            "font-weight": "600",
            color: "var(--text-secondary)",
            "letter-spacing": "1px",
          }}
        >
          保存先
        </label>
        <div style={{ display: "flex", gap: "10px", "align-items": "center" }}>
          <div
            class="glass-input"
            style={{
              flex: 1,
              display: "flex",
              "align-items": "center",
              gap: "8px",
              padding: "10px 12px",
            }}
          >
            <span style={{ "font-size": "16px" }}>📁</span>
            <span
              class="mono"
              style={{ "font-size": "12px", color: "var(--text-primary)" }}
            >
              {settings.outputDir}
            </span>
          </div>
          <button
            class="neu-btn"
            onClick={handleSelectDir}
            style={{
              padding: "10px 14px",
              color: "var(--text-primary)",
              "font-size": "12px",
              "font-weight": "500",
            }}
          >
            変更
          </button>
        </div>
      </section>

      {/* Quality */}
      <section style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
        <label
          style={{
            "font-size": "13px",
            "font-weight": "600",
            color: "var(--text-secondary)",
            "letter-spacing": "1px",
          }}
        >
          画質・音質
        </label>

        <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
          <span
            style={{
              width: "100px",
              "font-size": "13px",
              "font-weight": "500",
            }}
          >
            映像品質
          </span>
          <select
            class="neu-select"
            value={settings.videoQuality}
            onChange={(e) => handleVideoQuality(e.currentTarget.value)}
            style={{
              width: "200px",
              padding: "8px 12px",
              color: "var(--text-primary)",
              "font-family": "'UDEV Gothic', monospace",
              "font-size": "12px",
              "font-weight": "500",
              cursor: "pointer",
              appearance: "none",
            }}
          >
            {videoQualities.map((q) => (
              <option value={q.value}>{q.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
          <span
            style={{
              width: "100px",
              "font-size": "13px",
              "font-weight": "500",
            }}
          >
            音声品質
          </span>
          <select
            class="neu-select"
            value={settings.audioQuality}
            onChange={(e) => handleAudioQuality(e.currentTarget.value)}
            style={{
              width: "200px",
              padding: "8px 12px",
              color: "var(--text-primary)",
              "font-family": "'UDEV Gothic', monospace",
              "font-size": "12px",
              "font-weight": "500",
              cursor: "pointer",
              appearance: "none",
            }}
          >
            {audioQualities.map((q) => (
              <option value={q.value}>{q.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Theme */}
      <section style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
        <label
          style={{
            "font-size": "13px",
            "font-weight": "600",
            color: "var(--text-secondary)",
            "letter-spacing": "1px",
          }}
        >
          テーマ
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          {themeOptions.map((opt) => (
            <button
              class={themeMode() === opt.id ? "btn-primary" : "neu-btn"}
              onClick={() => handleThemeChange(opt.id)}
              style={{
                display: "flex",
                "align-items": "center",
                gap: "6px",
                padding: "8px 16px",
                "font-size": "12px",
                "font-weight": themeMode() === opt.id ? "600" : "500",
                color:
                  themeMode() === opt.id
                    ? "var(--text-on-accent)"
                    : "var(--text-secondary)",
              }}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
