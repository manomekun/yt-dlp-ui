import { createSignal, createEffect } from "solid-js";
import type { ThemeMode } from "../lib/types.ts";

const [themeMode, setThemeMode] = createSignal<ThemeMode>("dark");

function getResolvedTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

createEffect(() => {
  const resolved = getResolvedTheme(themeMode());
  document.documentElement.setAttribute("data-theme", resolved);
});

// Listen for OS theme changes when in system mode
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (themeMode() === "system") {
        const resolved = getResolvedTheme("system");
        document.documentElement.setAttribute("data-theme", resolved);
      }
    });
}

export { themeMode, setThemeMode };
