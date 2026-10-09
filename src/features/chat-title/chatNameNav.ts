/**
 * Title: Handing Steam's ring to the chat's name in Decky's bar
 *
 * Purpose: The chat's name sits in Decky's title bar, outside bonsAI's own box, so moving Steam's ring
 * onto it from inside bonsAI (closing the chats menu, a box closing) crosses from one container into
 * another. That needs Steam's own transfer onto the name's nav node, never a plain `focus()`
 * (AGENTS.md, "The Steam Deck focus graph"). The name registers its nav node through here while it is
 * drawn (under the shared registry's "chat-name" id), and `takeChatNameFocus` is the one way in.
 *
 * Used for: ChatTitleView.tsx (registers), ChatsMenu.tsx (returns the ring to the name, and names it
 * as the place a box opened from the menu gives the ring back to).
 *
 * Solves: The name's nav node lives in the shared registry (navFocusRegistry.ts), so the chat's own
 * helpers can hand the ring to it by id without importing this file. And the box return (`returnRingToChatName`): measured on the Deck 2026-10-08,
 * Rename chat then B in the rename box left the ring on Decky's back arrow beside the name, where one A
 * closes bonsAI. The box return used a plain `focus()` onto the name, which does not move Steam's ring;
 * it is Steam's transfer now, and for a short while after it a landing on the arrow is taken back.
 *
 * Does not: Decide when the ring goes to the name; callers do. Does not watch the arrow outside the
 * short window after a box return, so a person who walks Left onto it on purpose is left there.
 */
import { registerNavFocus, takeNavFocus, unregisterNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { elementHasGamepadFocus } from "../../utils/uiDocument";
import { deckyBackArrow } from "./deckyTitleParts";

/** How often, and for how many checks, a landing on Decky's back arrow is looked for after a box return. */
const ARROW_CATCH_POLL_MS = 100;
const ARROW_CATCH_CHECKS = 12;
/** A take that does not stick may be repeated this often in one window. */
const ARROW_CATCH_MAX_TAKES = 3;

let nameEl: HTMLElement | null = null;
let arrowCatch: ReturnType<typeof setTimeout> | null = null;

/** The name row mounting: its nav node holder. */
export function registerChatNameNav(holder: NavRefHolder): void {
  registerNavFocus("chat-name", holder);
}

/** The name row going away; only clears what this same holder registered. */
export function unregisterChatNameNav(holder: NavRefHolder): void {
  unregisterNavFocus("chat-name", holder);
}

/** The name's element, from its ref callback (null on unmount). */
export function rememberChatNameElement(el: HTMLElement | null): void {
  nameEl = el;
}

/** Steam's ring onto the chat's name. False when the name is not drawn or Steam declined. */
export function takeChatNameFocus(): boolean {
  return takeNavFocus("chat-name");
}

/** Whether Steam's ring sits on the name right now. */
export function chatNameHasRing(): boolean {
  return elementHasGamepadFocus(nameEl);
}

/** The name's element, for a box opened from the chats menu to give the ring back to (modalReturnFocusRegistry.ts). */
export function chatNameElement(): HTMLElement | null {
  return nameEl;
}

/**
 * For about a second after a box return, a landing on Decky's back arrow goes back to the name: Steam
 * places the ring itself as a box closes, and on the Deck it chose the arrow. Each call starts the window
 * again.
 */
function catchArrowLandingAfterReturn(): void {
  if (arrowCatch) clearTimeout(arrowCatch);
  let checksLeft = ARROW_CATCH_CHECKS;
  let takes = 0;
  const check = () => {
    arrowCatch = null;
    if (checksLeft-- <= 0) return;
    const arrow = deckyBackArrow();
    if (arrow && takes < ARROW_CATCH_MAX_TAKES && elementHasGamepadFocus(arrow) && takeChatNameFocus()) takes += 1;
    arrowCatch = setTimeout(check, ARROW_CATCH_POLL_MS);
  };
  arrowCatch = setTimeout(check, ARROW_CATCH_POLL_MS);
}

/**
 * The box return onto the name (modalReturnFocusRegistry.ts calls it when a box opened from the chats menu
 * closes): Steam's transfer, then the short catch above. True when Steam took the transfer; the registry
 * checks that the ring really is on the name.
 */
export function returnRingToChatName(): boolean {
  const took = takeChatNameFocus();
  catchArrowLandingAfterReturn();
  return took;
}

/** Test-only reset. */
export function resetChatNameNav(): void {
  nameEl = null;
  if (arrowCatch) clearTimeout(arrowCatch);
  arrowCatch = null;
}
