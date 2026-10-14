/**
 * Title: Telling the library section on screen that the library was removed or installed
 *
 * Purpose: Removing or downloading the library takes seconds, and the box that starts it closing rebuilds the
 * Ollama tab before it finishes. The copy of the section that pressed the button is then gone, and what it does
 * with the answer (move "Use local knowledge base", read the status again) reaches nothing on screen. On the
 * Deck the switch read "on" after Remove and "off" after Download, although the back end had saved the other
 * way each time (docs/test-evidence/plan93-P90-SEARCH-KB.json, plan93-P93-K1-KB-SWITCH.json, -try2.json).
 * This holds a note at module level: a copy that is mounted hears the change at once, and a copy that mounts
 * later hears it the moment it mounts, for ten minutes after.
 *
 * The switch is not read from the section but from the settings hook above the tab, which the box rebuilds
 * too; the rebuilt hook is filled from the note taken as the box opened (bonsaiSessionSurvival.ts), which
 * still holds the old switch. So an announcement also corrects that note.
 *
 * Used for: KnowledgeBaseSection.tsx, which announces after Remove, and after a status read that shows a
 * download it started has finished, and listens while mounted.
 *
 * Solves: The switch disagreeing with the saved setting after the library is removed or put back.
 *
 * Does not: Delete, download or save anything; the back end already writes the setting (off on remove, on
 * when an install lands). This only tells the screen.
 */
import { patchPendingSessionSettingsSnapshot } from "./bonsaiSessionSurvival";

const HEARD_WINDOW_MS = 10 * 60 * 1000;

/** What changed: gone (switch off, nothing installed) or in place (the saved switch is on, at this place and version). */
export type KbLibraryChange = { installed: false } | { installed: true; path: string; version: string };

const listeners = new Set<(change: KbLibraryChange) => void>();
/** The latest change nobody heard, and when; null once a copy has heard it. */
let unheard: { change: KbLibraryChange; atMs: number } | null = null;
/** When a download this screen started began; a finished one is announced once, and only after this. */
let installExpectedSinceMs: number | null = null;

/** The library changed: tell every mounted copy, or keep the note for the next copy to mount. */
export function announceKbLibraryChange(change: KbLibraryChange): void {
  installExpectedSinceMs = null;
  patchPendingSessionSettingsSnapshot(
    change.installed
      ? { useLocalKnowledgeBase: true, ragCorpusPath: change.path, ragCorpusVersion: change.version }
      : { useLocalKnowledgeBase: false, ragCorpusPath: "", ragCorpusVersion: "" },
  );
  if (listeners.size === 0) {
    unheard = { change, atMs: Date.now() };
    return;
  }
  unheard = null;
  listeners.forEach((listener) => listener(change));
}

/** A download (or an Update) was started: its end is announced the first time a status read shows it landed. */
export function expectKbInstall(): void {
  installExpectedSinceMs = Date.now();
}

/** The part of a status read that says whether an install landed and the saved switch is on. */
export type KbStatusForSwitch = {
  installed?: boolean;
  phase?: string;
  corpus_path?: string;
  corpus_version?: string;
  use_local_knowledge_base?: boolean;
};

/**
 * Called with every status read. When a download was started, and this read shows the library in place, no
 * longer running, with the saved switch on (the back end saves it before it reports the download done), that
 * is the end of the download: announce it once. A read that shows anything else changes nothing.
 */
export function noteKbStatusRead(st: KbStatusForSwitch | null | undefined): void {
  if (installExpectedSinceMs == null || !st) return;
  if (Date.now() - installExpectedSinceMs > HEARD_WINDOW_MS) {
    installExpectedSinceMs = null;
    return;
  }
  if (st.installed !== true || st.phase === "running" || st.use_local_knowledge_base !== true) return;
  announceKbLibraryChange({ installed: true, path: st.corpus_path ?? "", version: st.corpus_version ?? "" });
}

/** Listen for a change. One nobody heard yet is handed over right away. Returns the way to stop listening. */
export function addKbLibraryListener(listener: (change: KbLibraryChange) => void): () => void {
  listeners.add(listener);
  if (unheard != null) {
    const { change, atMs } = unheard;
    unheard = null;
    if (Date.now() - atMs < HEARD_WINDOW_MS) listener(change);
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam. */
export function resetKbLibrarySignalForTests(): void {
  listeners.clear();
  unheard = null;
  installExpectedSinceMs = null;
}
