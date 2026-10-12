/**
 * Title: Keep the ring where a jump put it, until the person presses something
 *
 * Purpose: A jump from the Search tab draws a whole tab in one go and then asks Steam to put its ring on one
 * row. The Deck showed (plan 92, row P90-SEARCH-JUMP-BACK) that the ring can end on another row anyway: after
 * A on a match the chat opened with the question on screen, but the ring sat on the "Today · 3" day line two
 * rows above it, 1.5 seconds later, because Steam's transfer reaches a row it has only just been given before
 * the row can take it. This looks again a few times as the tab settles and, while the ring is not on the row it
 * was meant for, asks Steam for it again.
 *
 * Used for: useEarlierTurnsPill.ts (the jump's question), and any later jump that lands a ring on a fresh row.
 *
 * Solves: "On the row" is asked of the row itself (does it hold the ring), not of the chat as a whole, so a ring
 * that landed on a neighbour is put right. The first look after the transfer is at 150 ms, then 450, 1000 and 2000.
 *
 * Does not: Steal the ring back after the person acts. Any button press heard at the panel's document, or the
 * tab going away, ends the looking at once; so does the ring being on the row. Never retries on a timer after
 * the last look.
 */
import { getUiDocument } from "../../utils/uiDocument";

/** When to look, in milliseconds after the first transfer. */
export const SETTLE_CHECKS_MS = [150, 450, 1000, 2000];

export type SettleRingArgs = {
  /** Steam's transfer onto the row; called again at a look where the ring is not on it. */
  take: () => void;
  /** Whether the row holds the ring now. */
  onTarget: () => boolean;
  /** False once the screen that asked has gone. */
  alive: () => boolean;
};

/**
 * In: the transfer, the question "is the ring on the row", and whether the asker is still there.
 * Out: nothing; schedules the looks. The first transfer is the caller's own, made before this is called.
 * Can go wrong: nothing; a look with no panel document, or after a press, does nothing.
 */
export function settleRing({ take, onTarget, alive }: SettleRingArgs): void {
  const doc = getUiDocument();
  let pressed = false;
  const heard = () => {
    pressed = true;
  };
  doc.addEventListener("vgp_onbuttondown", heard, true);
  doc.addEventListener("keydown", heard, true);
  const stop = () => {
    doc.removeEventListener("vgp_onbuttondown", heard, true);
    doc.removeEventListener("keydown", heard, true);
  };
  SETTLE_CHECKS_MS.forEach((ms, i) =>
    window.setTimeout(() => {
      const last = i === SETTLE_CHECKS_MS.length - 1;
      if (alive() && !pressed && !onTarget()) take();
      if (last || !alive() || pressed) stop();
    }, ms),
  );
}
