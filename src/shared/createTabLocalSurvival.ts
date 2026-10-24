/**
 * Title: The building block behind "the screen remembers itself through a popup"
 *
 * Purpose: Several different tabs in this plugin need to survive the same disappearing-and-coming-
 * back trick a popup causes (see bonsaiSessionSurvival.ts for the fullest example, on the main tab).
 * Rather than write that same capture-and-restore logic separately for each tab, this file builds one
 * small helper that does it, and each tab that needs it makes its own copy by calling this with its
 * own state shape.
 *
 * Used for: the main tab's own chat survival (bonsaiSessionSurvival.ts), and the smaller versions used
 * by the Ollama and Settings tabs.
 *
 * Solves: without this, each tab would re-invent its own version of "note what I looked like, then
 * read that note back on the way back in" — and any bug in that logic would need fixing in several
 * places instead of one.
 *
 * Does not: save anything to disk. What it holds only lives in memory for as long as the plugin stays
 * open; sessionStorage and the settings saved to disk are separate, longer-lived storage.
 *
 * How it works: a tab first hands over a function that can read its own current state at any moment
 * (`registerGetter`). Right before a popup is about to make the screen disappear, the tab calls
 * `captureSnapshot`, which runs that function once and keeps the result. When the tab comes back, it
 * calls `consumePending` to read the kept result back — by default that also clears it, so the same
 * note cannot be read twice by accident, though a caller with more than one place trying to restore at
 * once (the main tab uses this — React's Strict Mode can mount a component a second time to help
 * catch bugs, and the second mount needs to see the same note the first one did) can ask to keep the
 * note around a little longer with `consumeClears: false`, and clear it explicitly later with
 * `finalize`.
 */
export type TabLocalSurvivalOptions = {
  /** When false, consume leaves pending until finalize() (modal session survival). Default true. */
  consumeClears?: boolean;
};

export function createTabLocalSurvival<T>(options: TabLocalSurvivalOptions = {}) {
  const consumeClears = options.consumeClears !== false;
  let getter: (() => T) | null = null;
  let pendingLocal: T | null = null;

  return {
    registerGetter(fn: () => T): void {
      getter = fn;
    },
    unregisterGetter(): void {
      getter = null;
    },
    captureSnapshot(): T | null {
      const snap = getter?.() ?? null;
      if (snap) pendingLocal = snap;
      return snap;
    },
    captureDirect(snapshot: T): void {
      pendingLocal = snapshot;
    },
    peekPending(): T | null {
      return pendingLocal;
    },
    consumePending(): T | null {
      const snap = pendingLocal;
      if (consumeClears) pendingLocal = null;
      return snap;
    },
    finalize(): void {
      pendingLocal = null;
    },
    clear(): void {
      pendingLocal = null;
      getter = null;
    },
  };
}
