import { createStore } from "solid-js/store";
import type { Settings } from "../lib/types.ts";

const defaultSettings: Settings = {
  outputDir: "~/Downloads/videos",
  videoQuality: "best",
  audioQuality: "320",
  theme: "dark",
  defaultFormat: "mp4",
};

const [settings, setSettings] = createStore<Settings>({ ...defaultSettings });

export { settings, setSettings, defaultSettings };
