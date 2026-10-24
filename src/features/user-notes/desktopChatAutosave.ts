/**
 * Title: Which finished answers already got saved to the desktop note file
 *
 * Purpose: When the "auto-save chat notes to desktop" setting is on, every finished AI answer gets
 * appended to a note file on the player's own computer. This file remembers which answers have
 * already been saved that way during the current session, so the same answer is never appended
 * twice.
 *
 * Used for: the main tab's desktop note flow, while the auto-save setting is turned on.
 *
 * Solves: without this, a reply that briefly re-renders after it was already saved could trigger a
 * second save of the exact same answer.
 *
 * Does not: write the note file itself — the back end's own save call and the "write files"
 * permission own that. This file only keeps track of which answers already went through it.
 */
const AUTO_SAVED_RESPONSE_IDS_KEY = "bonsai:auto-desktop-chat-response-ids";

function loadAutosavedResponseIds(): number[] {
  try {
    const raw = sessionStorage.getItem(AUTO_SAVED_RESPONSE_IDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  } catch {
    return [];
  }
}

export function markResponseAutosaved(requestId: number): void {
  try {
    const ids = loadAutosavedResponseIds();
    if (ids.includes(requestId)) return;
    ids.push(requestId);
    while (ids.length > 120) ids.shift();
    sessionStorage.setItem(AUTO_SAVED_RESPONSE_IDS_KEY, JSON.stringify(ids));
  } catch {}
}

export function hasResponseAutosaved(requestId: number): boolean {
  return loadAutosavedResponseIds().includes(requestId);
}
