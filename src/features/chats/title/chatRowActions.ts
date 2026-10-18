/**
 * Title: What the + and the delete icon on the chat's name row do
 *
 * Purpose: The + and the delete icon (plan 87 F5) are drawn in Decky's title bar, a separate React tree
 * with no shared context, but what they do belongs to the Main tab: new chat, and the "Delete chat?" box
 * for the open chat. The Main tab hands those two calls in here while it is drawn (useChatRowActions.ts),
 * and the icons read them when pressed. The same arrangement as chatTitleStore.ts, kept as a file of its
 * own so the store (and the Main tab's chat-switch actions) stay as they were.
 *
 * Used for: ChatRowIcons.tsx (reads), useChatRowActions.ts (writes).
 *
 * Does not: Make a chat or open a box itself; those are the Main tab's own calls. Does not move the ring.
 *
 * Gotchas: A write carries an owner (one per Main tab copy), and a clear only clears when the owner still
 * matches: two copies of the Main tab can briefly both be alive, and the old copy's clean-up must not wipe
 * what the new copy just wrote (the same rule as chatTitleStore.ts and navFocusRegistry.ts).
 */

export type ChatRowActions = {
  /** The + : start a new chat, the way the chats menu's New chat does. */
  newChat: () => void;
  /** The delete icon: open the "Delete chat?" box for the open chat. */
  deleteChat: () => void;
};

let actions: ChatRowActions | null = null;
let owner: object | null = null;

/** The Main tab, while drawn. */
export function registerChatRowActions(who: object, next: ChatRowActions): void {
  owner = who;
  actions = next;
}

/** The Main tab going away; clears only if it is still the copy that wrote them. */
export function clearChatRowActions(who: object): void {
  if (owner !== who) return;
  owner = null;
  actions = null;
}

/** The two calls, or null while the Main tab is not drawn (a press then does nothing). */
export function getChatRowActions(): ChatRowActions | null {
  return actions;
}

/** Test-only reset. */
export function resetChatRowActions(): void {
  owner = null;
  actions = null;
}
