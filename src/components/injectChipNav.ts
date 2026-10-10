/**
 * Title: Where the ring goes to reach the AI's own suggestion chip
 *
 * Purpose: After an answer the row above the question box can carry one extra chip below the
 * suggestion chips: a suggestion the AI itself put forward (orange ring). Like the help chip, it
 * sits in a focus container of its own (`InjectChipRoot` in MainTabPresetRow.tsx), and the ring can
 * only be carried into a container by Steam's own transfer. This file keeps the handle to that
 * container and does the transfer, the same way `takeNavFocus` does for the registered containers.
 *
 * Used for: MainTabPresetRow.tsx (registers the container; the row's Down exits ask for it) and
 * useMainTabAskBarFocus.ts (Up from the question box asks for it first).
 *
 * Solves: Up from the box went past this chip to the suggestion chips, and Down from the chips went
 * past it to the box, so it could only be tapped. Kept here, not in navFocusRegistry.ts, because
 * that file's list of ids is shared and another change was editing it at the same time.
 *
 * Does not: move the ring by any other means. When there is no chip, or Steam declines, it answers
 * false and the caller goes on to the next stop as before.
 */
import { refocusPanelWindowIfLost, type NavRefHolder } from "../utils/navFocusRegistry";

let holder: NavRefHolder | null = null;

export function registerInjectChipNav(next: NavRefHolder): void {
  holder = next;
}

/** Only if this holder is still the registered one, for the reason written on `unregisterNavFocus`. */
export function unregisterInjectChipNav(prev: NavRefHolder): void {
  if (holder === prev) holder = null;
}

/** Hand Steam's ring to the AI's suggestion chip. False when it is not on screen or Steam declines. */
export function takeInjectChipFocus(): boolean {
  const node = holder?.current;
  if (!node || typeof node.TakeFocus !== "function") return false;
  refocusPanelWindowIfLost();
  try {
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}
