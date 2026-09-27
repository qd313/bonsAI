/**
 * Title: Lighter drawing while a game runs
 * Purpose: One place that decides how much less the panel draws while an answer arrives with a
 * game running, and the switch the Deck uses to compare with and without it.
 * Used for: the Ask hook (the pace the answer's text moves at), the Main tab (the scramble, and a
 * class on its column that holds the small animations still and drops the blur).
 * Solves: The panel's frame rate while an answer arrives with a game running. With nothing
 * running it draws about 57 frames a second (plan 69); with Deep Rock Galactic: Survivor running
 * it drew 10 to 20 (plan 70, 2026-09-26). The game, the model and the panel share one chip, and
 * every frame the panel changes in is a frame the Deck has to redraw -- so while a game runs the
 * panel changes in fewer frames. Nothing changes with nothing running.
 * Does not: Find out which game runs -- it is handed the same context the "Context:" line under
 * the question box reads (Steam's running app, kept in step by useOllamaGameContextSync and the
 * Ask's own status polls).
 *
 * The Deck's switch, for measuring: in the Quick Access page's console,
 *   window.__bonsaiGameLoad = { off: true }     -- never lighter, even with a game running
 *   window.__bonsaiGameLoad = { force: true }   -- lighter even with nothing running
 *   window.__bonsaiGameLoad = { scramble: false } -- leave one part out (beat, scramble, steady, blur)
 *   delete window.__bonsaiGameLoad              -- back to normal
 * It is read on every render, so set it before asking; an answer already arriving picks it up
 * at its next step.
 */
import type { OllamaContextUi } from "../types/bonsaiUi";
import { STREAM_BEAT_MS } from "./streamBeat";

/** The whole feature's off switch: false keeps the panel drawing the same with or without a game. */
const LIGHTER_WHILE_A_GAME_RUNS = true;

/**
 * Milliseconds between the answer's visible steps while a game runs: about 4.5 a second, half the
 * usual pace. Measured with nothing running (plan 69), this pace alone took the panel from about
 * 55 frames a second to about 60 -- the one change that is known to help, and it helps more when
 * each redraw costs more.
 */
export const GAME_RUNNING_BEAT_MS = 220;

/** Which parts of the lighter drawing are on. */
export type LighterParts = {
  /** The answer's text moves on GAME_RUNNING_BEAT_MS instead of STREAM_BEAT_MS. */
  beat: boolean;
  /** The scramble animation is skipped: the text arrives plain. */
  scramble: boolean;
  /** Blinking cursors, the thinking spinner and the question box's breathing hold still. */
  steady: boolean;
  /** Panels drop their frosted-glass blur. */
  blur: boolean;
};

const PART_NAMES = ["beat", "scramble", "steady", "blur"] as const;

/** Whether the context names a running game, the way the "Context:" footnote decides it. */
export function gameIsRunning(ctx: OllamaContextUi | null | undefined): boolean {
  return Boolean(ctx && ctx.app_context === "active" && ctx.app_id);
}

function readDeckSwitch(): Record<string, unknown> | null {
  try {
    const raw = (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad;
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Which parts are on, given whether a game runs. Only a real `true`/`false` in the switch counts. */
export function lighterWhileGameRuns(gameRunning: boolean): LighterParts {
  const sw = readDeckSwitch();
  const on = sw?.off === true ? false : sw?.force === true ? true : LIGHTER_WHILE_A_GAME_RUNS && gameRunning;
  const parts = { beat: on, scramble: on, steady: on, blur: on };
  if (on && sw) {
    for (const name of PART_NAMES) {
      if (sw[name] === false) parts[name] = false;
    }
  }
  return parts;
}

/** Milliseconds between the streaming answer's visible steps. */
export function streamBeatMsFor(gameRunning: boolean): number {
  return lighterWhileGameRuns(gameRunning).beat ? GAME_RUNNING_BEAT_MS : STREAM_BEAT_MS;
}
