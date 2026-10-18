/**
 * Title: Hand the ring on when the control holding it removes itself
 *
 * Purpose: Some presses take away the very control they were made on: Helpful turns into the words
 * "Saved on this Deck", and the troubleshooting hint's Dismiss removes the whole hint. Steam then
 * has nothing holding the ring, and the next press starts from nowhere. This waits for the pressed
 * control to be gone and, if nothing else has picked the ring up meanwhile, runs the caller's
 * hand-over (which must use Steam's own transfer to leave its container).
 *
 * Used for: buildReplyActionsElement.tsx (Helpful) and chatTranscriptNavHelpers.ts (the hint's
 * Dismiss).
 *
 * Solves: plan70-F4-THUMBS-UP.json (3 of 3) and plan70-L5-PERMS-CLEAN-06.json: the ring left on
 * nothing after each press.
 *
 * Does not: Decide where the ring goes -- the caller's `handOver` does -- or do anything when the
 * ring was not on the pressed control (a touch press), or when the control stays mounted.
 */
import { elementHasGamepadFocus, getUiDocument, uiGamepadFocusElement } from "./uiDocument";

/** How often, and how many times, to check that the pressed control has been replaced. */
const GONE_CHECK_MS = 50;
const GONE_CHECKS = 10;

/**
 * Call right around the press: `press` is the caller's own action (the state change that removes
 * `pressed`). Checks straight after it, then every 50 ms for up to half a second.
 */
export function pressThenHandRingOn(
  pressed: HTMLElement | null | undefined,
  press: () => void,
  handOver: () => void,
): void {
  const hadRing = Boolean(pressed) && elementHasGamepadFocus(pressed);
  press();
  if (!pressed || !hadRing) return;
  let checks = 0;
  const settle = () => {
    if (pressed.isConnected) {
      if (++checks < GONE_CHECKS) window.setTimeout(settle, GONE_CHECK_MS);
      return;
    }
    const owner = uiGamepadFocusElement();
    if (owner && owner.isConnected && owner !== getUiDocument().body) return;
    handOver();
  };
  window.setTimeout(settle, 0);
}
