/**
 * Title: Handing Steam's ring to the chat's name in Decky's bar
 *
 * Purpose: The chat's name sits in Decky's title bar, outside bonsAI's own box, so moving Steam's ring
 * onto it from inside bonsAI (closing the chats menu, a box closing) crosses from one container into
 * another. That needs Steam's own transfer onto the name's nav node, never a plain `focus()`
 * (AGENTS.md, "The Steam Deck focus graph"). The name registers its nav node here while it is drawn,
 * and `takeChatNameFocus` is the one way in.
 *
 * Used for: ChatTitleView.tsx (registers), ChatsMenu.tsx (returns the ring to the name, and names it
 * as the place a box opened from the menu gives the ring back to).
 *
 * Solves: A local holder rather than a new id in navFocusRegistry.ts, whose list of ids belongs to
 * another file; the transfer itself is the same call (`takeHolderFocus`, the same window check
 * `takeNavFocus` makes).
 *
 * Does not: Decide when the ring goes to the name; callers do.
 */
import { takeHolderFocus } from "../../utils/chatTranscriptNavHelpers";
import type { NavRefHolder } from "../../utils/navFocusRegistry";
import { elementHasGamepadFocus } from "../../utils/uiDocument";

let nameNav: NavRefHolder | null = null;
let nameEl: HTMLElement | null = null;

/** The name row mounting: its nav node holder and its element. */
export function registerChatNameNav(holder: NavRefHolder): void {
  nameNav = holder;
}

/** The name row going away; only clears what this same holder registered. */
export function unregisterChatNameNav(holder: NavRefHolder): void {
  if (nameNav === holder) nameNav = null;
}

/** The name's element, from its ref callback (null on unmount). */
export function rememberChatNameElement(el: HTMLElement | null): void {
  nameEl = el;
}

/** Steam's ring onto the chat's name. False when the name is not drawn or Steam declined. */
export function takeChatNameFocus(): boolean {
  return nameNav ? takeHolderFocus(nameNav) : false;
}

/** Whether Steam's ring sits on the name right now. */
export function chatNameHasRing(): boolean {
  return elementHasGamepadFocus(nameEl);
}

/** The name's element, for a box opened from the chats menu to give the ring back to (modalReturnFocusRegistry.ts). */
export function chatNameElement(): HTMLElement | null {
  return nameEl;
}

/** Test-only reset. */
export function resetChatNameNav(): void {
  nameNav = null;
  nameEl = null;
}
