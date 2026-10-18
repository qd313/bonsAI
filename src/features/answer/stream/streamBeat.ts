/**
 * Title: The streaming answer's beat
 * Purpose: One pace for everything that changes on screen while an answer streams in: the reveal
 * moves the text on, and the scramble reshuffles its symbols, once per beat -- together.
 * Used for: useSmoothStreamReveal (the text) and the stream scramble (its symbols and its timer).
 * Solves: The panel's frame rate while an answer streams. Measured on the Deck, 2026-09-25, with
 * the model writing on the graphics chip: the panel drew about 20 frames a second while the text
 * moved on every frame; with the text moving 9 times a second it drew about 55 (scramble off), and
 * with 4.5 times a second about 60. The thinking box, which changes 6 or 7 times a second, never
 * cost a frame. A change that lands in its own frame costs a redraw, so the text and the symbols
 * move on the same beat, in the same frame.
 * Does not: Schedule anything itself; each user keeps its own timer.
 */

/** Milliseconds between the streaming answer's visible changes: about 9 a second. */
export const STREAM_BEAT_MS = 110;
