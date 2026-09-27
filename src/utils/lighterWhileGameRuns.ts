/**
 * Title: Lighter drawing while a game runs
 * Purpose: One place that decides how much less the panel does while an answer arrives with a
 * game running, and the switch the Deck uses to compare with and without it.
 * Used for: the Ask hook (how often it asks for new text, and whether the text is smoothed between
 * those asks), the Main tab (the scramble, and a class on its column that holds the small
 * animations still).
 * Solves: The panel's frame rate while an answer arrives with a game running. Measured on the
 * Deck, 2026-09-27, Deep Rock Galactic: Survivor running: about 11 frames a second while the
 * answer's text arrived and about 35 while the model only thought, against 60 and 59 with nothing
 * running; the processor sat at 96-98% the whole answer, and the scramble made no difference. The
 * gap between thinking and answering is the panel's own work for each step of new text: each is a
 * redraw of the whole plugin in React, a new layout of the growing answer, and the scroll follow
 * and size watchers measuring it. Today there are about 16 such steps a second (a status check
 * every 150 ms, plus 9 smoothing steps). While a game runs this cuts them to 4: a status check
 * every 250 ms, and each one's text shown as it lands, with no smoothing steps in between.
 * Nothing changes with nothing running.
 * Does not: Find out which game runs -- it is handed the same context the "Context:" line under
 * the question box reads (Steam's running app, kept in step by useOllamaGameContextSync and the
 * Ask's own status polls).
 *
 * The Deck's switch, for measuring: in the console of either the Quick Access page (where the
 * panel draws) or Steam's hidden main page, SharedJSContext (where the plugin's code runs),
 *   window.__bonsaiGameLoad = { off: true }       -- never lighter, even with a game running
 *   window.__bonsaiGameLoad = { force: true }     -- lighter even with nothing running
 *   window.__bonsaiGameLoad = { scramble: false } -- leave one part out (pace, scramble, steady)
 *   window.__bonsaiGameLoad = { pollMs: 400 }     -- try another status-check pace (50-2000 ms)
 *   delete window.__bonsaiGameLoad                -- back to normal
 * It is read on every render and every status check, so an answer already arriving picks it up.
 */
import type { OllamaContextUi } from "../types/bonsaiUi";
import { getUiDocument } from "./uiDocument";

/** The whole feature's off switch: false keeps the panel drawing the same with or without a game. */
const LIGHTER_WHILE_A_GAME_RUNS = true;

/**
 * Milliseconds between status checks while an answer arrives with a game running: 4 a second
 * instead of about 7, and each check's text is shown as it lands, so the answer moves in about
 * 4 steps a second of a few words each. Plan 69 measured, with nothing running, that the panel's
 * frame rate rises as the steps get fewer: 9 a second gave 53-57 frames, 4.5 gave 59.5.
 */
export const GAME_RUNNING_POLL_MS = 250;

/** The range the Deck's `pollMs` may set. */
const POLL_MS_MIN = 50;
const POLL_MS_MAX = 2000;

/** Which parts of the lighter drawing are on. */
export type LighterParts = {
  /** Status checks every GAME_RUNNING_POLL_MS, each one's text shown as it lands (no smoothing). */
  pace: boolean;
  /** The scramble animation is skipped: the text arrives plain. */
  scramble: boolean;
  /** Blinking cursors, the spinners and the question box's breathing hold still. */
  steady: boolean;
};

const PART_NAMES = ["pace", "scramble", "steady"] as const;

/** Whether the context names a running game, the way the "Context:" footnote decides it. */
export function gameIsRunning(ctx: OllamaContextUi | null | undefined): boolean {
  return Boolean(ctx && ctx.app_context === "active" && ctx.app_id);
}

type SwitchWindow = Window & { __bonsaiGameLoad?: unknown };

/**
 * The switch from the page the code runs in, else from the page the panel draws into. Both,
 * because on the Deck the first is Steam's hidden main page and a person measuring naturally sets
 * it in the second (plan 70: set there, it changed nothing).
 */
function readDeckSwitch(): Record<string, unknown> | null {
  try {
    const own = (window as SwitchWindow).__bonsaiGameLoad;
    const raw = own ?? (getUiDocument().defaultView as SwitchWindow | null)?.__bonsaiGameLoad;
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Which parts are on, given whether a game runs. Only a real `true`/`false` in the switch counts. */
export function lighterWhileGameRuns(gameRunning: boolean): LighterParts {
  const sw = readDeckSwitch();
  const on = sw?.off === true ? false : sw?.force === true ? true : LIGHTER_WHILE_A_GAME_RUNS && gameRunning;
  const parts = { pace: on, scramble: on, steady: on };
  if (on && sw) {
    for (const name of PART_NAMES) {
      if (sw[name] === false) parts[name] = false;
    }
  }
  return parts;
}

/** Milliseconds between status checks while text streams: `usualMs`, or the lighter pace. */
export function streamPollMsFor(gameRunning: boolean, usualMs: number): number {
  if (!lighterWhileGameRuns(gameRunning).pace) return usualMs;
  const asked = readDeckSwitch()?.pollMs;
  if (typeof asked === "number" && Number.isFinite(asked)) {
    return Math.min(POLL_MS_MAX, Math.max(POLL_MS_MIN, Math.round(asked)));
  }
  return GAME_RUNNING_POLL_MS;
}

/** Whether the answer's text is smoothed between status checks (useSmoothStreamReveal). */
export function smoothRevealFor(gameRunning: boolean): boolean {
  return !lighterWhileGameRuns(gameRunning).pace;
}
