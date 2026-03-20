import { createStore } from "solid-js/store";
import type { HistoryEntry } from "../lib/types.ts";

const [historyState, setHistoryState] = createStore<{
  entries: HistoryEntry[];
}>({
  entries: [],
});

function setHistoryEntries(entries: HistoryEntry[]) {
  setHistoryState("entries", entries);
}

function removeHistoryEntry(id: string) {
  setHistoryState("entries", (entries) =>
    entries.filter((entry) => entry.id !== id),
  );
}

export { historyState, setHistoryEntries, removeHistoryEntry };
