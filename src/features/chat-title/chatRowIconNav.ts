/**
 * Title: Handing Steam's ring to the + and the delete icon on the chat's name row
 *
 * Purpose: The + and the delete icon (plan 87 F5) sit at the two ends of the chat's name row in Decky's
 * title bar, outside bonsAI's own box, so every way onto them is Steam's own transfer (a nav node's
 * `TakeFocus`), never a plain `focus()` (AGENTS.md, "The Steam Deck focus graph"). Each icon registers its
 * nav node here while it is drawn (under "chat-name-new" and "chat-name-delete" in the shared registry), and
 * the name's Left and Right, B on an icon and the delete box's return all go through the functions below.
 *
 * It also holds the one note a box needs to find its way back: after the delete icon's "Delete chat?" box
 * closes, the ring goes back to the delete icon when the person pressed Cancel or B (nothing changed) and to
 * the chat's name when they pressed Delete (the chat the icon was for is gone). Closing a Decky box rebuilds
 * the tab behind it, so that note is kept here, outside every component, and the transfer re-finds the icon
 * by its registry id each time it runs, so an icon drawn again in between is still reached.
 *
 * Used for: ChatRowIcons.tsx (registers, remembers its element), ChatTitleView.tsx (the name's Left and Right),
 * useChatRowActions.ts (the delete box's return).
 *
 * Does not: Decide when the ring moves; callers do. Does not draw anything.
 */
import { registerNavFocus, takeNavFocus, unregisterNavFocus, type NavFocusId, type NavRefHolder } from "../../utils/navFocusRegistry";
import { catchArrowLandingAfterReturn, returnRingToChatName } from "./chatNameNav";

export type ChatIconKind = "new" | "delete";

const IDS: Record<ChatIconKind, NavFocusId> = { new: "chat-name-new", delete: "chat-name-delete" };

const elements: Record<ChatIconKind, HTMLElement | null> = { new: null, delete: null };

/** Where the ring goes when the delete box closes: kept outside React because the close rebuilds the tab. */
let afterDeleteBox: "delete-icon" | "name" = "name";

/** An icon mounting: its nav node holder. */
export function registerChatIconNav(kind: ChatIconKind, holder: NavRefHolder): void {
  registerNavFocus(IDS[kind], holder);
}

/** An icon going away; only clears what this same holder registered. */
export function unregisterChatIconNav(kind: ChatIconKind, holder: NavRefHolder): void {
  unregisterNavFocus(IDS[kind], holder);
}

/** The icon's element, from its ref callback (null on unmount). */
export function rememberChatIconElement(kind: ChatIconKind, el: HTMLElement | null): void {
  elements[kind] = el;
}

/** The icon's element, for a box opened from it to name as the place to give the ring back to. */
export function chatIconElement(kind: ChatIconKind): HTMLElement | null {
  return elements[kind];
}

/** Steam's ring onto an icon. False when it is not drawn or Steam declined. */
export function takeChatIconFocus(kind: ChatIconKind): boolean {
  return takeNavFocus(IDS[kind]);
}

/** Says where the ring goes when the delete box closes: the delete icon (Cancel, B) or the name (Delete). */
export function noteDeleteBoxReturn(to: "delete-icon" | "name"): void {
  afterDeleteBox = to;
}

/**
 * The delete box's return (registered with the box-return registry as the owner's transfer): Steam's
 * transfer onto the delete icon or the name, as noted. For about a second after it, a landing on Decky's
 * back arrow (where Steam put the ring as the box closed on the Deck) is taken back to the same stop. When
 * the delete icon cannot be reached, the name has it.
 */
export function returnRingAfterDeleteBox(): boolean {
  if (afterDeleteBox === "delete-icon" && takeChatIconFocus("delete")) {
    catchArrowLandingAfterReturn(IDS.delete);
    return true;
  }
  return returnRingToChatName();
}

/** Test-only reset. */
export function resetChatRowIconNav(): void {
  elements.new = null;
  elements.delete = null;
  afterDeleteBox = "name";
}
