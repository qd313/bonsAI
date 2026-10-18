/**
 * Title: Wiping the plugin's own browser storage
 *
 * Purpose: The browser the plugin runs in has its own small, private storage the plugin uses for
 * odds and ends that do not belong in the saved settings file — things like "already warned about
 * this once" flags. When the player chooses to clear all plugin data, or replays the first-run
 * disclaimer, every one of those browser-storage entries needs to go too. This file is what removes
 * all of them in one pass.
 *
 * Used for: the Settings tab's clear-plugin-data action, and the flow that lets the player see the
 * first-run disclaimer again.
 *
 * Solves: gives one place that wipes every browser-storage entry the plugin has ever written, instead
 * of each feature that adds a new entry also having to remember to add its own clean-up.
 *
 * Does not: clear anything saved by the back end — the settings file on disk, or any downloaded
 * Ollama model — see the separate clear_plugin_data call to the back end for that. This file only
 * touches the browser's own storage.
 *
 * Gotcha: every key this plugin writes starts with the word "bonsai", but not all of them spell it
 * the same way after that — most use "bonsai:", three knowledge-base "already warned you" flags use
 * "bonsai_" instead. A wipe that only matched "bonsai:" left those three behind, so after clearing
 * all data the plugin still believed it had already warned about a knowledge-base problem and stayed
 * quiet when it should have spoken up. Found 2026-09-05. Matching the bare word "bonsai" at the start
 * of a key, regardless of what follows it, catches both spellings and cleans up old keys already
 * written with either one.
 */
const BONSAI_STORAGE_PREFIX = "bonsai";

/** Remove all plugin keys from localStorage and sessionStorage (bonsai:* and bonsai_*). */
export function clearBonsaiBrowserStorage(): void {
  try {
    const lsKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(BONSAI_STORAGE_PREFIX)) lsKeys.push(key);
    }
    for (const key of lsKeys) window.localStorage.removeItem(key);

    const ssKeys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(BONSAI_STORAGE_PREFIX)) ssKeys.push(key);
    }
    for (const key of ssKeys) window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
