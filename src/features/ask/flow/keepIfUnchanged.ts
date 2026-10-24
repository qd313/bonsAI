/**
 * Title: Keep the value already on screen when a poll brings the same thing again
 *
 * Purpose: While a question is being answered, the Ask code asks the back end for news every
 * 150 ms and copies what comes back into React state. Some of it arrives as a fresh object each
 * time even when nothing in it changed -- the game the question is about, the model's thinking
 * record once it has stopped changing, the notes the search attached. React compares state by
 * identity, so a fresh object re-renders the whole plugin screen even though nothing on it moves.
 * Passing the update through this keeps the previous object whenever the new one says the same
 * thing, and then React skips the render.
 *
 * Used for: the pending-poll branch of useBonsaiAskOrchestration.ts.
 *
 * Solves: Measured on the Deck 2026-09-24 with a game running: each of those renders took 85 to
 * 100 ms of the Steam page's own time, and the panel dropped to 10-30 frames a second while the
 * question was answered. Renders that change nothing on screen are the cheapest ones to remove.
 *
 * Does not: Deep-compare anything large or cyclic. It compares the JSON of small, plain values
 * (a few short fields, a list of three notes); anything that cannot be written as JSON counts as
 * changed, which only costs the render this exists to save.
 */
export function keepIfUnchanged<T>(prev: T, next: T): T {
  if (Object.is(prev, next)) return prev;
  try {
    return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
  } catch {
    return next;
  }
}
