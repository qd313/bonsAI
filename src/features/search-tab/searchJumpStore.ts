/**
 * Title: What a jump from the Search tab into a chat remembers
 *
 * Purpose: Holds, outside any screen, everything the jump and the way back need: the word and game that were
 * picked, the match that was pressed, the chat and question it points at, whether the chat has been put on
 * that question yet, whether the "Back to where you were" line should show, the tab the person came to
 * Search from (for B), and where the ring should land when the Search tab is drawn again. Opening a Steam
 * popup or switching tabs throws the tab's screen away and builds it again, and the jump crosses two tabs
 * (Search, then Main) that are never on screen together (lessons-learned.md, § 3: a come-back-here flag kept
 * inside a component does not survive that), so none of this can live in component state.
 *
 * Used for: SearchTab.tsx and useSearchJump.ts (start, return, B), useEarlierTurnsPill.ts (puts the chat on the
 * question), buildEarlierList.tsx and SearchBackLine.tsx (the Back line), useSearchTabPayload.tsx (hands in the
 * tab switch) and useSearchShortcut.ts (Y).
 *
 * Solves: One small module that every side reads. A change tells its readers (subscribeSearchJump), so the
 * Main tab's transcript draws the Back line the moment a jump starts and drops it the moment it ends.
 *
 * Does not: Switch a chat or a tab itself (the callbacks registered here do), move the ring, or persist
 * anything to disk; it lives as long as the plugin does.
 */
import { takeHolderFocus } from "../../utils/chatTranscriptNavHelpers";
import type { NavRefHolder } from "../../utils/navFocusRegistry";
import { writeSearchSaved } from "./searchTabStore";

/** How long a jump waits for its chat to load before it gives up putting the chat on the question. */
const REVEAL_WAIT_MS = 6000;

export type SearchJump = {
  /** The chat the match came from. */
  slotId: string;
  /** The question the match points at (the saved turn's id). */
  turnId: string;
  /** The Search tab's key for the match, so the ring comes back to the same row. */
  matchKey: string;
  /** What was in the find box, and the game that was picked (null: All). */
  word: string;
  game: string | null;
  /** True until the Main tab has put the chat on the question (opened its day, shown enough questions). */
  revealPending: boolean;
  /** When a pending reveal stops being worth waiting for. */
  revealUntil: number;
};

/** Where the ring goes when the Search tab is drawn: its find box (opened by Y), or a match by its key (the way back). */
export type SearchArrival = "find" | { key: string } | null;

type State = {
  jump: SearchJump | null;
  cameFrom: string | null;
  arrival: SearchArrival;
};

const EMPTY: State = { jump: null, cameFrom: null, arrival: null };
let state: State = { ...EMPTY };
const listeners = new Set<() => void>();
let switchTab: ((tabId: string) => void) | null = null;

function set(next: Partial<State>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

/** For `useSyncExternalStore`: tells the reader when the jump started, ended or finished revealing. */
export function subscribeSearchJump(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The live jump, or null. A new object on every change. */
export function getSearchJump(): SearchJump | null {
  return state.jump;
}

/**
 * The shell's tab switch, handed in by the plugin root so that the Back line, B and Y switch tabs exactly the
 * way a press on the tab bar does. Returns the clean-up that takes it away again.
 */
export function registerSearchTabSwitch(fn: (tabId: string) => void): () => void {
  switchTab = fn;
  return () => {
    if (switchTab === fn) switchTab = null;
  };
}

/** A on a chat match: remember it, ask the Main tab to put its chat on the question, and the Back line to show. */
export function startSearchJump(args: { slotId: string; turnId: string; matchKey: string; word: string; game: string | null }): void {
  set({ jump: { ...args, revealPending: true, revealUntil: Date.now() + REVEAL_WAIT_MS }, arrival: null });
}

/** The jump's question, while the chat has not yet been put on it and the wait has not run out. */
export function pendingJumpReveal(): { slotId: string; turnId: string } | null {
  const j = state.jump;
  if (!j || !j.revealPending || Date.now() > j.revealUntil) return null;
  return { slotId: j.slotId, turnId: j.turnId };
}

/** The chat has been put on the question; the Back line stays until the person goes back. */
export function markJumpRevealed(): void {
  if (state.jump?.revealPending) set({ jump: { ...state.jump, revealPending: false } });
}

/** Whether the "Back to where you were" line shows over this chat: a jump is live and its question is in the chat. */
export function backLineShowsFor(turns: ReadonlyArray<{ id: string }>): boolean {
  const j = state.jump;
  return Boolean(j && turns.some((t) => t.id === j.turnId));
}

/**
 * A on the Back line: end the jump, remember the word, game and match for the Search tab to come back to, and
 * switch to it. False when no tab switch is registered (nothing happens, the line stays).
 */
export function backToSearch(): boolean {
  const j = state.jump;
  if (!j || !switchTab) return false;
  writeSearchSaved({ typed: j.word, game: j.game, openNote: null, returnKey: null });
  set({ jump: null, arrival: { key: j.matchKey } });
  switchTab("search");
  return true;
}

/** Y on the Main tab: open the Search tab with the ring on its find box. False when no tab switch is registered. */
export function openSearchTab(): boolean {
  if (!switchTab) return false;
  set({ arrival: "find" });
  switchTab("search");
  return true;
}

/** Where the ring should go now that the Search tab is drawn: a find box, a match, or nothing. Stays until it is cleared, so a tab thrown away before it landed the ring is told again. */
export function peekSearchArrival(): SearchArrival {
  return state.arrival;
}

/** The ring has been put where the arrival said; forget it. */
export function clearSearchArrival(): void {
  if (state.arrival !== null) state = { ...state, arrival: null };
}

/** The tab the person was on before the Search tab, noted by the plugin root each time Search opens. */
export function noteTabBeforeSearch(tabId: string | null): void {
  state = { ...state, cameFrom: tabId };
}

/** B on the Search tab: go back to the tab the person came from (Main when unknown). */
export function leaveSearchTab(): boolean {
  if (!switchTab) return false;
  const to = state.cameFrom && state.cameFrom !== "search" ? state.cameFrom : "main";
  switchTab(to);
  return true;
}


/* --- The Back line's own stop: its Steam nav node, and its element while it is on screen. --- */

/** The Back line's Steam nav node: the "N earlier" line's Up and the tab bar's Down hand the ring to it. */
export const searchBackNav: NavRefHolder = { current: null };

let backLineEl: HTMLElement | null = null;

/** The Back line says it is on screen (and, with `prev`, that its old element is gone). */
export function registerBackLineEl(el: HTMLElement | null, prev?: HTMLElement | null): void {
  if (el) backLineEl = el;
  else if (prev && backLineEl === prev) backLineEl = null;
}

/** Steam's transfer onto the Back line, when it is drawn. False when it is not, and the caller carries on. */
export function takeBackLine(): boolean {
  if (!backLineEl?.isConnected) return false;
  return takeHolderFocus(searchBackNav);
}

/** Back to a fresh store; for the tests. */
export function resetSearchJump(): void {
  state = { ...EMPTY };
  switchTab = null;
  backLineEl = null;
  searchBackNav.current = null;
  listeners.clear();
}
