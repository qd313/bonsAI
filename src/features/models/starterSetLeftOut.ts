/**
 * Title: What the person left out of the starter set on the first-time setup
 *
 * Purpose: The first-time setup's checklist (plan 105, lane D3) lets a person untick the note-search model, and
 * the speech models with the voice engine. That choice is kept in a small note in this device's browser storage,
 * so the places that offer the starter set again later (the Ollama tab's box on a Deck with no models, and
 * "Install the starter set" in the AI models box) leave out the same pieces and say so, instead of quietly putting
 * back what was unticked. Each left-out piece is offered again by its own feature: the knowledge base offers the
 * note-search model, Voice input its two downloads.
 *
 * Used for: first-run/FirstRunWhereAiRunsModal.tsx (writes it when OK is pressed), localOllamaStarterSet.tsx and
 * useLocalOllamaSetupFlow.tsx (the boxes and the run read it), PullModelsStarterSetChip.tsx (counts only the
 * pieces not left out).
 *
 * Solves: Keeping the later offers in step with the first screen without a saved setting. The note is a
 * per-device convenience like the download-sites-seen list: Clear all data and a wipe remove it, and a lost or
 * broken note reads as "nothing left out", which can only make a later box list every piece again, with its
 * site and size, before anything downloads. It can never make anything download without a press.
 *
 * Does not: Download, start or stop anything, or reach the back end. The back end keeps the running setup's own
 * list in its start call and its reload note (starter_left_out.py), which is what a reload reads.
 */

/** A piece the first-time setup lets a person leave out (the back end accepts exactly these words). */
export type StarterLeftOut = "note_search" | "voice";

/** The pieces that can be left out, in the order the screen and the back end use. */
const STARTER_LEFT_OUT_PIECES: readonly StarterLeftOut[] = ["note_search", "voice"];

/** The note's key; the "bonsai" start is what Clear all data and a wipe match. */
export const STARTER_LEFT_OUT_STORAGE_KEY = "bonsai:starter-set-left-out";

/** Only the known words, in a fixed order, each once. */
function onlyLeftOutPieces(raw: unknown): StarterLeftOut[] {
  if (!Array.isArray(raw)) return [];
  return STARTER_LEFT_OUT_PIECES.filter((p) => raw.includes(p));
}

/** What the person left out on the first-time setup; nothing when there is no note or it cannot be read. */
export function readStarterLeftOut(): StarterLeftOut[] {
  try {
    const raw = window.localStorage.getItem(STARTER_LEFT_OUT_STORAGE_KEY);
    return raw ? onlyLeftOutPieces(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** Kept when the first-time setup's OK is pressed; an empty choice removes the note. */
export function rememberStarterLeftOut(leftOut: readonly StarterLeftOut[]): void {
  try {
    const clean = onlyLeftOutPieces([...leftOut]);
    if (clean.length) window.localStorage.setItem(STARTER_LEFT_OUT_STORAGE_KEY, JSON.stringify(clean));
    else window.localStorage.removeItem(STARTER_LEFT_OUT_STORAGE_KEY);
  } catch {
    /* storage unavailable: a later box lists every piece again before anything downloads */
  }
}

const LEFT_OUT_WORDS: Record<StarterLeftOut, { what: string; offer: string }> = {
  note_search: { what: "the note-search model", offer: "The knowledge base offers it when you use it." },
  voice: { what: "the speech models and the voice engine", offer: "Voice input offers them the first time you use it." },
};

/** The line a starter box shows under its words when something was left out; empty when nothing was. */
export function starterLeftOutLine(leftOut: readonly StarterLeftOut[]): string {
  const pieces = onlyLeftOutPieces([...leftOut]);
  if (!pieces.length) return "";
  const what = pieces.map((p) => LEFT_OUT_WORDS[p].what).join(", ");
  return `Left out, as you chose at first setup: ${what}. ${pieces.map((p) => LEFT_OUT_WORDS[p].offer).join(" ")}`;
}
