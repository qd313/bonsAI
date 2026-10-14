/**
 * Title: Telling the library section on screen that the library was removed
 *
 * Purpose: Removing the library takes a few seconds, and the Remove box closing rebuilds the Ollama tab
 * before it finishes. The copy of the section that pressed Remove is then gone, and whatever it does with
 * the answer (turn "Use local knowledge base" off, read the status again) reaches nothing on screen. On the
 * Deck the switch read "on" before and after Remove (docs/test-evidence/plan93-P90-SEARCH-KB.json) although
 * the back end had written it off. This holds a note at module level: a copy that is mounted hears it at
 * once, and a copy that mounts later (the tab was between two copies, or on another tab) hears it the
 * moment it mounts, for ten minutes after.
 *
 * Used for: KnowledgeBaseSection.tsx, which announces after Remove and listens while mounted.
 *
 * Solves: The switch staying on after the library is gone, on the copy of the section a person looks at.
 *
 * Round 2 (docs/test-evidence/plan93-P93-K1-KB-SWITCH.json): telling the section was not enough. The switch is
 * read from the settings hook above the tab, which the box rebuilds too, and the rebuilt hook is filled from the
 * note taken as the box opened (bonsaiSessionSurvival.ts), which still said "on". So the announcement also
 * corrects that note.
 *
 * Does not: Delete anything or save anything; the back end already writes the setting off when it removes
 * the library. This only tells the screen.
 */
import { patchPendingSessionSettingsSnapshot } from "./bonsaiSessionSurvival";

const HEARD_WINDOW_MS = 10 * 60 * 1000;

const listeners = new Set<() => void>();
/** When a removal finished with nobody listening; null once a copy has heard it. */
let unheardSinceMs: number | null = null;

/** The library was removed: tell every mounted copy, or keep the note for the next copy to mount. */
export function announceKbRemoved(): void {
  /*
   * A screen rebuilt by the box is filled from the note taken as the box opened, and that note still says the
   * library is there and the switch is on. Correct it first, so a screen built from it afterwards is right.
   */
  patchPendingSessionSettingsSnapshot({ useLocalKnowledgeBase: false, ragCorpusPath: "", ragCorpusVersion: "" });
  if (listeners.size === 0) {
    unheardSinceMs = Date.now();
    return;
  }
  unheardSinceMs = null;
  listeners.forEach((listener) => listener());
}

/** Listen for a removal. A removal nobody heard yet is handed over right away. Returns the way to stop. */
export function addKbRemovedListener(listener: () => void): () => void {
  listeners.add(listener);
  if (unheardSinceMs != null) {
    const recent = Date.now() - unheardSinceMs < HEARD_WINDOW_MS;
    unheardSinceMs = null;
    if (recent) listener();
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam. */
export function resetKbRemovedSignalForTests(): void {
  listeners.clear();
  unheardSinceMs = null;
}
