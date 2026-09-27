/**
 * Title: Reaching the "Save chat to Desktop" row from the suggestion chips
 *
 * Purpose: The chips' Up hands the ring to the Save chat row first, since it sits right above them
 * -- but only while a person can see it. Over a running game (plan70-R-R3-try2.json, 3 times) Up
 * put the ring on the row while it sat behind the bottom dock, 0% visible and then 33%, a ring
 * nobody can see. A row behind the dock is skipped, and Up goes on to the next row up.
 *
 * Used for: SaveChatToDesktopRow.tsx (registers its row) and the chips' Up
 * (features/preset-carousel/presetRowFocusNav.tsx).
 *
 * Does not: Explain why the row can sit behind the dock with the pane scrolled as far as it goes
 * over a game -- that is still owed a measurement on the Deck. Does not move the ring with a plain
 * focus(): the hop is Steam's own transfer onto the row's registered nav node.
 */
import { findScrollablePanel, readableBottomOf } from "./chatPanelScroll";
import { takeNavFocus } from "./navFocusRegistry";

let saveChatRowEl: HTMLElement | null = null;

/** The row's own element, from its ref; null when it unmounts. */
export function registerSaveChatRowEl(el: HTMLElement | null): void {
  saveChatRowEl = el;
}

/** True when the whole row sits inside its pane and above the dock. */
function saveChatRowInView(el: HTMLElement): boolean {
  const pane = findScrollablePanel(el);
  if (!pane) return true;
  const rect = el.getBoundingClientRect();
  return rect.top >= pane.getBoundingClientRect().top - 1 && rect.bottom <= readableBottomOf(pane) + 1;
}

/** Steam's transfer onto the Save chat row, when it is on screen and not behind the dock. */
export function focusSaveChatRowIfInView(): boolean {
  const el = saveChatRowEl;
  if (!el?.isConnected || !saveChatRowInView(el)) return false;
  return takeNavFocus("save-chat-desktop");
}
