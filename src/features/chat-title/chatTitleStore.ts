/**
 * Title: What the chat's name in Decky's bar knows about the open chat
 *
 * Purpose: A small shared memory, kept outside React, that lets the chat's name in Decky's title
 * bar read and change the open chat. Decky draws that name (the plugin's `titleView`) outside
 * bonsAI's own box, in a separate React tree with no shared context, so it cannot be handed props
 * by the Main tab. Instead the Main tab writes here what the name row needs (the open chat's name,
 * its place among the saved chats, whether it is a new chat not saved yet, the unread and
 * still-writing marks, whether an answer is being written, and the actions: previous chat, next
 * chat, the ring onto the chat's first stop), the plugin root writes which tab is showing and the
 * character's lit accent colour, and the name row reads all of it. Whether the chats menu is open
 * lives here too, because both sides need it: the name opens it, the Main tab draws it.
 *
 * Used for: the chat's name in Decky's bar (it reads), the Main tab (it writes the chat) and the
 * plugin root (it writes the tab and the lit colour), plan 84 step 5.
 *
 * Solves: Either side can mount first, and either can go away on its own. A name row that mounts
 * before the Main tab shows the plain wordmark until the chat arrives; a Main tab that goes away
 * takes its chat and actions with it, and the name row falls back to the wordmark.
 *
 * Does not: Load, switch, rename or delete a chat itself. The actions it holds are the Main tab's
 * own, handed in; this file only keeps them where the name row can reach them. Does not move
 * Steam's ring either.
 *
 * Gotchas:
 * - A publish carries an owner (any object, one per Main tab copy). Clearing only clears when the
 *   owner still matches, the same rule navFocusRegistry.ts keeps for nav nodes: two copies of the
 *   Main tab can briefly both be alive (a panel reopen, a remount), and the old copy's clean-up
 *   must not wipe what the new copy just wrote.
 * - Every change makes a new state object, and a publish that changes nothing makes none, so a
 *   reader through `useSyncExternalStore` redraws only when something it shows really changed. The
 *   Main tab redraws on every streamed word; the name row must not.
 */
import { useSyncExternalStore } from "react";

/** One saved chat, as the chats menu lists it. */
export type ChatTitleChatRow = {
  id: string;
  label: string;
  /** A reply finished while the person was looking at another chat. */
  unread: boolean;
  /** The back end is still writing a reply into this chat. */
  writing: boolean;
  /** When the chat last changed, in seconds since 1970 (the back end's own clock). */
  updatedAt: number;
  /** The chat on screen now. */
  current: boolean;
};

/** What the Main tab says about the open chat. */
export type ChatTitleChat = {
  /** The words in Decky's bar: the open chat's name, or "New chat". */
  name: string;
  /** Where the open chat sits among the saved chats, newest first, from 1; 0 at the new-chat spot. */
  place: number;
  /** How many saved chats there are. */
  count: number;
  /** A new chat nothing has been asked in yet: the small line reads "not saved yet". */
  unsaved: boolean;
  /** An answer is being written right now. */
  answerInFlight: boolean;
  /** Every saved chat, newest first, with its marks. */
  chats: ChatTitleChatRow[];
};

/** What the name row and the plugin root can ask the Main tab to do. */
export type ChatTitleActions = {
  /** LT: the chat before this one in the old row's order (towards the newest, then the new-chat spot). */
  previous: () => void | Promise<void>;
  /** RT: the chat after this one (towards the oldest). */
  next: () => void | Promise<void>;
  /** Steam's ring onto the chat's first stop, or the question box when the chat is empty. */
  takeFirstStop: () => boolean;
};

export type ChatTitleState = {
  /** Which bonsAI tab is showing ("main", "settings", ...), or null before the plugin root says. */
  tab: string | null;
  /** The character's lit accent colour (the tab bar's `--bonsai-ui-tab-lit`), or null for the default. */
  litColor: string | null;
  /** The open chat, while the Main tab is drawn; null otherwise. */
  chat: ChatTitleChat | null;
  /** The Main tab's actions, while it is drawn; null otherwise. */
  actions: ChatTitleActions | null;
  /** The chats menu is open over the answer. */
  menuOpen: boolean;
};

const INITIAL: ChatTitleState = {
  tab: null,
  litColor: null,
  chat: null,
  actions: null,
  menuOpen: false,
};

let state: ChatTitleState = INITIAL;
let owner: object | null = null;
const listeners = new Set<() => void>();

function set(next: ChatTitleState): void {
  if (next === state) return;
  state = next;
  listeners.forEach((listener) => listener());
}

/** For `useSyncExternalStore` and anything else that wants to hear of a change; returns the stop. */
export function subscribeChatTitle(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The state right now. */
export function getChatTitleState(): ChatTitleState {
  return state;
}

function sameRows(a: ChatTitleChatRow[], b: ChatTitleChatRow[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i]!;
    return (
      row.id === other.id &&
      row.label === other.label &&
      row.unread === other.unread &&
      row.writing === other.writing &&
      row.updatedAt === other.updatedAt &&
      row.current === other.current
    );
  });
}

function sameChat(a: ChatTitleChat | null, b: ChatTitleChat | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.place === b.place &&
    a.count === b.count &&
    a.unsaved === b.unsaved &&
    a.answerInFlight === b.answerInFlight &&
    sameRows(a.chats, b.chats)
  );
}

/** The plugin root: which tab is showing. Leaving the Main tab closes the chats menu. */
export function setChatTitleTab(tab: string | null): void {
  if (tab === state.tab) return;
  set({ ...state, tab, menuOpen: tab === "main" ? state.menuOpen : false });
}

/** The plugin root: the character's lit accent colour, so the menu arrow matches the tab bar. */
export function setChatTitleLitColor(litColor: string | null): void {
  if (litColor === state.litColor) return;
  set({ ...state, litColor });
}

/**
 * The Main tab: the open chat and its actions. `who` names the Main tab copy writing, so only that
 * copy's own clean-up can clear it again (see the file header).
 */
export function publishChatTitle(who: object, chat: ChatTitleChat, actions: ChatTitleActions): void {
  const sameOwner = owner === who;
  owner = who;
  if (sameOwner && sameChat(state.chat, chat) && state.actions === actions) return;
  set({ ...state, chat, actions });
}

/** The Main tab going away: forget its chat, its actions and the open menu, if it is still the one that wrote them. */
export function clearChatTitle(who: object): void {
  if (owner !== who) return;
  owner = null;
  set({ ...state, chat: null, actions: null, menuOpen: false });
}

/** Open or close the chats menu. Opens only on the Main tab, with a chat to show. */
export function setChatsMenuOpen(open: boolean): void {
  const next = open && state.tab === "main" && state.chat !== null;
  if (next === state.menuOpen) return;
  set({ ...state, menuOpen: next });
}

/**
 * Down from what sits above the chat: Steam's ring onto the chat's first stop, through the Main tab's own
 * action. False when the Main tab is not drawn (the caller then leaves the press to Steam).
 */
export function takeChatFirstStop(): boolean {
  return state.actions?.takeFirstStop() ?? false;
}

/** The whole state, redrawing whenever any of it changes. For the name row. */
export function useChatTitleState(): ChatTitleState {
  return useSyncExternalStore(subscribeChatTitle, getChatTitleState, getChatTitleState);
}

/** One value picked out of the state, redrawing only when that value changes. For the Main tab. */
export function useChatTitleValue<T>(pick: (s: ChatTitleState) => T): T {
  const read = () => pick(state);
  return useSyncExternalStore(subscribeChatTitle, read, read);
}

/** Test-only reset. */
export function resetChatTitleStore(): void {
  state = INITIAL;
  owner = null;
  listeners.clear();
}
