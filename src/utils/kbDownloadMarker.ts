/**
 * Title: Whether a library download is running, shared by every copy of the library section
 *
 * Purpose: A library download outlives the section that started it: closing a Decky box rebuilds the
 * Ollama tab, so the copy on screen is often not the copy that pressed the button. This holds, at
 * module level, when the last download started (so a copy that mounts afterwards resumes polling)
 * and tells every mounted copy when a download starts or ends (so a copy that mounted BEFORE it
 * began hears too). That second half is plan 76 lane 2 round 3: with internet downloads off, the
 * download notice saves the permission first and says yes only then, after the rebuild; the copy on
 * screen had read "Not installed" and never heard, and showed it for about a minute
 * (docs/test-evidence/plan76-P76-KB-BOX-RING-RETURN.json).
 *
 * Used for: KnowledgeBaseSection.tsx.
 */
const RESUME_WINDOW_MS = 10 * 60 * 1000;

let startedAtMs: number | null = null;
const listeners = new Set<(running: boolean) => void>();

/** Record that a download started (a time) or ended (null), and tell every listening copy. */
export function setKbDownloadMarker(at: number | null): void {
  startedAtMs = at;
  listeners.forEach((listener) => listener(at != null));
}

/** True when a download started recently enough that a freshly mounted copy should follow it. */
export function kbDownloadLikelyInFlight(): boolean {
  return startedAtMs != null && Date.now() - startedAtMs < RESUME_WINDOW_MS;
}

/** Listen for downloads starting (true) and ending (false). Returns the way to stop listening. */
export function addKbDownloadListener(listener: (running: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam. */
export function resetKbDownloadMarkerForTests(): void {
  startedAtMs = null;
  listeners.clear();
}
