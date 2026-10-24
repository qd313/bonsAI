/**
 * Title: LB and RB from the floating Open all button
 *
 * Purpose: Lets the folded tabs' floating button switch tabs on LB and RB, as they do from everywhere else.
 *
 * Used for: FoldAllButton (its onButtonDown), TabIndicatorBar (registers the stepping).
 *
 * Solves: The button is drawn in a dock beside Steam's scroll pane, outside Steam's own Tabs container (see
 * TabHelpStrip), so Steam never sees a shoulder press while the ring is on it: with the ring there, LB did
 * nothing (Deck, 2026-10-12, plan92-P92-FOLD-SWITCH, Settings and Ollama). The tab bar is outside the container
 * too and switches tabs itself (tabBarNav.ts); this is the same, asked of the bar's own stepping through a
 * registration, so the dock needs to know neither the tab list nor the shell.
 *
 * Does not: Know which tabs there are or which one is showing; the bar that registers does.
 */
import { isBumperLeftDeckEvent, isBumperRightDeckEvent } from "./focusNavigation";

/** Switch to the tab one place before (-1) or after (1) the one showing, wrapping at the ends. */
export type ShoulderStep = (direction: -1 | 1) => void;

let step: ShoulderStep | null = null;

/** The tab bar says how a shoulder press steps; returns the call that withdraws it (a newer one is left alone). */
export function registerShoulderSwitch(fn: ShoulderStep): () => void {
  step = fn;
  return () => {
    if (step === fn) step = null;
  };
}

/** A button press on the dock: LB or RB steps the tab and the press is claimed; anything else, or no bar, is not. */
export function shoulderSwitchFromPress(press: unknown): boolean {
  if (!step) return false;
  if (isBumperLeftDeckEvent(press)) {
    step(-1);
    return true;
  }
  if (isBumperRightDeckEvent(press)) {
    step(1);
    return true;
  }
  return false;
}

/** Test seam. */
export function resetShoulderSwitchForTests(): void {
  step = null;
}
