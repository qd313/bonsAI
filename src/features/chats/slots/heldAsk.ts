/**
 * Title: The question held while the "pick a chat to delete" list is open
 *
 * Purpose: With ten chats saved and none open, pressing Ask opens the list that asks which chat to drop
 * (useAskAtChatLimit.tsx). The question cannot wait in a React hook: closing a Decky box rebuilds the
 * plugin's screen, so the hook that held it may be gone by the time the new chat exists. This file keeps
 * the question in module memory, and sends it once, to whichever screen is alive, after the boxes have
 * closed and a chat has really been made.
 *
 * Used for: useAskAtChatLimit.tsx (the only caller).
 *
 * Solves: A question that vanished with the old screen, or was sent twice (once by the screen that is
 * going away and once by the screen that replaced it).
 *
 * Does not: Open any box, make or delete any chat, or decide whether the list is needed. Nothing is sent
 * when the person pressed Cancel or B, when the delete did not go through, or when the new chat was not
 * made: the question then stays in the question box, untouched.
 *
 * Gotchas: "Made" and "closed" are two separate facts and both must be true. The send waits a short while
 * after the last box closes so a rebuilt screen is already up, and it also waits for the screen to know
 * which chat is open (it must be the new one, or the ask would try to make an eleventh chat). A held
 * question that nobody could send within a few seconds is dropped rather than sent minutes later.
 */

export type HeldAskOptions = { threadQuestionDisplay?: string };

/** The live screen's way to send a question, and whether it already knows which chat is open. */
type LiveAsk = {
  ask: (question: string, opts?: HeldAskOptions) => unknown;
  ready: () => boolean;
};

type Held = {
  question: string;
  opts?: HeldAskOptions;
  made: boolean;
  /** When the last box closed with a chat made; null until then. */
  settledAt: number | null;
};

/** How long after the last box closes the question is sent (a rebuilt screen is up by then). */
const HELD_ASK_SETTLE_MS = 200;
/** How often a not-yet-ready screen is asked again. */
const RETRY_MS = 100;
/** A question that could not be sent this long after the boxes closed is dropped. */
const GIVE_UP_MS = 5000;

let held: Held | null = null;
let live: LiveAsk | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function trySend(): void {
  clearTimer();
  if (!held || held.settledAt === null) return;
  if (Date.now() - held.settledAt > GIVE_UP_MS) {
    held = null;
    return;
  }
  if (!live || !live.ready()) {
    timer = setTimeout(trySend, RETRY_MS);
    return;
  }
  const { question, opts } = held;
  const target = live;
  held = null;
  void target.ask(question, opts);
}

/** A question is now waiting on the list. A second one replaces it. */
export function holdAsk(question: string, opts?: HeldAskOptions): void {
  clearTimer();
  held = { question, opts, made: false, settledAt: null };
}

/** The chat was made after the delete went through. */
export function noteHeldAskChatMade(): void {
  if (held) held.made = true;
}

/** A box closed (the list, or the Delete chat? box and the list under it). Sends or drops the question. */
export function noteHeldAskBoxClosed(): void {
  if (!held) return;
  clearTimer();
  timer = setTimeout(() => {
    timer = null;
    if (!held) return;
    if (!held.made) {
      held = null;
      return;
    }
    held.settledAt = Date.now();
    trySend();
  }, HELD_ASK_SETTLE_MS);
}

/**
 * The screen that is alive says how to send a question. A rebuilt screen calls this again on mount and the
 * newest one wins. Returns the call that takes it back (only if it is still the registered one).
 */
export function registerLiveAsk(next: LiveAsk): () => void {
  live = next;
  if (held?.settledAt != null) trySend();
  return () => {
    if (live === next) live = null;
  };
}

/** Test-only reset. */
export function resetHeldAsk(): void {
  clearTimer();
  held = null;
  live = null;
}
