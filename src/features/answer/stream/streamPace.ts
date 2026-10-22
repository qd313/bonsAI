/**
 * Title: Stream pace, Deck or PC
 *
 * Purpose: The three numbers that set how a streaming answer feels -- how many scrambled letters
 * trail behind the writing, how fast those letters settle, and how fast the text grows to catch up
 * with what the model has sent -- in two sets: the Deck's own, and a tighter one for when the AI
 * runs on a PC (the maintainer's ask, 2026-10-17: keep the decode look, shorter tail, faster
 * scramble, quicker growth). A PC answers faster than the Deck, so the long tail and the slow
 * settle made the writing lag behind what had already arrived.
 *
 * Used for: streamScrambleMath.ts (tail length, settle speed) and useSmoothStreamReveal.ts (how
 * long a backlog takes to drain). The one line that says where the AI runs is in
 * useOllamaConnectionState.ts, which calls setAiRunsOnPc whenever the "AI runs on the Deck"
 * setting is read or changed.
 *
 * Solves: Gives both files one place to ask "which pace?" so they cannot disagree, and gives the
 * Deck one switch to compare the two paces inside a single answer.
 *
 * Does not: Read settings or the clock, schedule anything, or touch the DOM. It does not change the
 * answer's beat (streamBeat.ts), which is the frame-rate floor.
 *
 * The Deck's switch, for measuring (set in the console of the Quick Access page or of Steam's
 * hidden main page, SharedJSContext -- both are read):
 *   window.__bonsaiStreamPace = { pc: true }    -- the PC pace, wherever the AI runs
 *   window.__bonsaiStreamPace = { pc: false }   -- the Deck's own pace, even with the AI on a PC
 *   delete window.__bonsaiStreamPace            -- back to following the setting
 * It is read on every beat, so flipping it every 2.5 s alternates the two paces inside one answer.
 */
import { getUiDocument } from "../../../shared/dpad/uiDocument";

export type StreamPace = {
  /** Letters kept scrambled at the end of the writing (the "tail" style). */
  tailLetters: number;
  /** How many times faster than the decode chips the scrambled letters settle (all styles). */
  settleSpeedUp: number;
  /** Seconds the reveal spends draining whatever text has arrived. */
  drainSeconds: number;
};

/** The Deck's own pace: today's numbers, which must not change. */
export const DECK_STREAM_PACE: StreamPace = { tailLetters: 10, settleSpeedUp: 1, drainSeconds: 0.18 };

/** The pace when the AI runs on a PC: half the tail, one and a half times the settle speed, a third quicker drain. */
export const PC_STREAM_PACE: StreamPace = { tailLetters: 5, settleSpeedUp: 1.5, drainSeconds: 0.12 };

let aiRunsOnPc = false;

/** Called with the "AI runs on the Deck" setting turned around: true when the AI is on a PC. */
export function setAiRunsOnPc(onPc: boolean): void {
  aiRunsOnPc = onPc;
}

type SwitchWindow = Window & { __bonsaiStreamPace?: unknown };

/** The switch's `pc` value from the page the code runs in, else from the page the panel draws into. */
function readSwitch(): boolean | null {
  try {
    const own = (window as SwitchWindow).__bonsaiStreamPace;
    const raw = own ?? (getUiDocument().defaultView as SwitchWindow | null)?.__bonsaiStreamPace;
    const pc = raw && typeof raw === "object" ? (raw as { pc?: unknown }).pc : undefined;
    return typeof pc === "boolean" ? pc : null;
  } catch {
    return null;
  }
}

/** The pace to use right now: the switch if the Deck set it, else by where the AI runs. */
export function streamPace(): StreamPace {
  return (readSwitch() ?? aiRunsOnPc) ? PC_STREAM_PACE : DECK_STREAM_PACE;
}
