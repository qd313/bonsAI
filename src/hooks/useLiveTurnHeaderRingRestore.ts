/**
 * Title: Keep the ring on the question row when an answer finishes
 *
 * Purpose: While an answer is written, a person can walk the ring up onto the question above it —
 * its Retry icon or its text. When the answer finishes, the slot reload archives the turn and the
 * whole "live" turn, question row included, is replaced by a new one keyed by the turn's own id.
 * The control holding the ring goes with it. This hook notes which of the two question-row stops
 * held the ring while the live turn showed, and once that element is gone, hands the ring to the
 * same stop on whichever header now shows the turn.
 *
 * Used for: MainTabChatTranscript.tsx, beside its answer-section restore (liveAnswerRingStopRef),
 * which covers the answer's own sections and nothing above them.
 *
 * Solves: docs/test-evidence/plan70-QA-FREE-PLAY-01.json: ring on the live question's Retry while
 * the answer arrived; in 3 of 4 tries nothing held the ring after the finish, and within about 3 s
 * the view slid to the end of the answer (useStreamScrollPin delivers the end when it finds no ring
 * in the transcript), leaving Retry 196-356 px above the pane.
 *
 * Does not: Move a ring that is anywhere else at the finish (Ask, Stop, the chips, an answer
 * section) — like the section restore, it only ever returns the ring to where it already was.
 *
 * The move: Steam's own transfer onto the target header's nav node first (`TakeFocus`), then a
 * plain focus() onto the stop inside that header — the same shape as `focusAnswerChunkAtIndex`,
 * which the Deck proved for the section restore (plan64-STREAM-WALK-REC-01-try4-run2.json).
 *
 * Also, since this hook holds every question row's nav node: while the newest question is closed
 * (an older one open), its row is registered as "newest-closed-question", so the suggestion chips'
 * Up can hand Steam's ring to it (plan 79; `syncNewestClosedRow`).
 */
import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { registerNavFocus, unregisterNavFocus } from "../utils/navFocusRegistry";
import { focusRegisteredReplyStop, getReplyStop } from "../utils/replyStopRegistry";
import { elementHasFocus, getUiDocument, uiGamepadFocusElement } from "../utils/uiDocument";

type HeaderStop = "retry" | "question";
type SteamNavHolder = { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null | undefined };
type HeaderParts = { nav: SteamNavHolder; body: HTMLElement | null; bodyRef: (el: HTMLElement | null) => void };

function focusHeaderStop(parts: HeaderParts | undefined, header: HTMLElement | null, stop: HeaderStop): boolean {
  if (!parts || !header?.isConnected) return false;
  try {
    parts.nav.current?.TakeFocus?.(true);
  } catch {
    /* fall through — the focus + check below decides the outcome */
  }
  const retry = getReplyStop("retry");
  if (stop === "retry" && retry && header.contains(retry) && focusRegisteredReplyStop("retry")) return true;
  /* The question text; a header with no Retry is one stop, the header itself. */
  const target = parts.body?.isConnected ? parts.body : header;
  try {
    target.focus({ preventScroll: true });
  } catch {
    return false;
  }
  return elementHasFocus(target);
}

/** Keep "newest-closed-question" on `holder` (null: nothing), changing the registration only when it changes. */
function syncNewestClosedRow(current: MutableRefObject<SteamNavHolder | null>, holder: SteamNavHolder | null): void {
  if (current.current === holder) return;
  if (current.current) unregisterNavFocus("newest-closed-question", current.current);
  if (holder) registerNavFocus("newest-closed-question", holder);
  current.current = holder;
}

/**
 * `headerEls` is the transcript's own header-element map (keyed by turn id, "live" for the live
 * turn). Returns the per-turn props to hand to buildTurnHeaderElement: its nav node holder and the
 * question-text ref, both stable per turn id.
 */
export function useLiveTurnHeaderRingRestore(
  showLiveTurn: boolean,
  newestArchivedId: string | undefined,
  headerEls: MutableRefObject<Record<string, HTMLElement | null>>,
): (turnId: string) => { headerNavRef: SteamNavHolder; bodyRef: (el: HTMLElement | null) => void } {
  const partsRef = useRef<Record<string, HeaderParts>>({});
  const heldRef = useRef<{ stop: HeaderStop; el: HTMLElement } | null>(null);
  const newestClosedRef = useRef<SteamNavHolder | null>(null);

  /* Read on every commit, like the rest: whether the newest row is closed is on its own element. */
  useLayoutEffect(() => {
    const id = showLiveTurn ? undefined : newestArchivedId;
    const closed = Boolean(id && headerEls.current[id]?.classList.contains("bonsai-chat-turn-row-header--collapsed"));
    syncNewestClosedRow(newestClosedRef, closed && id ? partsRef.current[id]?.nav ?? null : null);
  });
  useLayoutEffect(() => () => syncNewestClosedRow(newestClosedRef, null), []);

  useLayoutEffect(() => {
    const held = heldRef.current;
    if (held && !held.el.isConnected) {
      heldRef.current = null;
      const owner = uiGamepadFocusElement();
      const ringHeldElsewhere = Boolean(owner && owner.isConnected && owner !== getUiDocument().body);
      const targetId = showLiveTurn ? "live" : newestArchivedId;
      if (!ringHeldElsewhere && targetId) {
        focusHeaderStop(partsRef.current[targetId], headerEls.current[targetId] ?? null, held.stop);
      }
    }
    if (!showLiveTurn) return;
    /* Recorded on every commit: Steam moves the ring without telling React, so "where it was on
       the last commit" is the only reading there is (the section restore's same rule). */
    const header = headerEls.current.live;
    const owner = uiGamepadFocusElement();
    if (!header || !owner || !header.contains(owner)) {
      heldRef.current = null;
      return;
    }
    const retry = getReplyStop("retry");
    const onRetry = Boolean(retry && header.contains(retry) && retry.contains(owner));
    heldRef.current = { stop: onRetry ? "retry" : "question", el: owner };
  });

  return (turnId: string) => {
    let parts = partsRef.current[turnId];
    if (!parts) {
      const created: HeaderParts = {
        nav: { current: null },
        body: null,
        bodyRef: (el) => {
          created.body = el;
        },
      };
      parts = partsRef.current[turnId] = created;
    }
    return { headerNavRef: parts.nav, bodyRef: parts.bodyRef };
  };
}
