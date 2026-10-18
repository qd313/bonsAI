/**
 * Title: The live turn and its saved twin stay one element
 *
 * Purpose: When an answer finishes, the chat reloads and the turn that was "live" comes back as the
 * newest saved turn. They used to be two different elements in two different places of the
 * transcript, so the reload threw away everything the live turn had drawn -- the answer, its
 * sections, the ring Steam had on one of them -- and drew it all again from scratch, which is the
 * flicker and the jump the maintainer reported on 2026-10-13. This file gives the saved twin the
 * live turn's own React key, so React keeps the very same elements.
 *
 * Used for: MainTabChatTranscript.tsx, for the key of every turn's row and for the pieces inside it
 * (`turnPiece`), so the live branch and the saved branch line up piece by piece.
 *
 * Solves: The archive step rebuilding the turn (plan 93, lane O3; lessons, section 3: a component
 * that changes what kind of element it returns rebuilds everything inside it).
 *
 * Does not: Decide when a turn is live or saved (the transcript does), or move focus.
 *
 * How it works: every live turn gets a key of its own, "live-slot-N". On the commit where the live
 * turn stops showing, the newest saved turn -- if it was not there when the live turn started, in
 * the same chat -- is its twin and inherits "live-slot-N" for as long as it is drawn; the next
 * live turn gets "live-slot-N+1". Refs are only read while rendering and only written once the
 * commit is in, so a render React throws away changes nothing.
 */
import React, { useLayoutEffect, useRef } from "react";

export type LiveTurnTwin = {
  /** The React key of the live turn's row. */
  liveSlotKey: string;
  /** The React key of a saved turn's row: its id, or the live key it inherited. */
  slotKeyFor: (turnId: string) => string;
  /** The saved turn that took over from the live turn on THIS commit, else null. */
  twinNow: string | null;
};

export function useLiveTurnTwin(
  showLiveTurn: boolean,
  archivedIds: readonly string[],
  chatId: string | null
): LiveTurnTwin {
  const counterRef = useRef(1);
  const inheritedRef = useRef(new Map<string, string>());
  const wasLiveRef = useRef(showLiveTurn);
  const beforeLiveRef = useRef({ ids: new Set(archivedIds), chatId });

  const liveSlotKey = `live-slot-${counterRef.current}`;
  const newest = archivedIds[archivedIds.length - 1];
  const twinNow =
    wasLiveRef.current &&
    !showLiveTurn &&
    newest !== undefined &&
    !inheritedRef.current.has(newest) &&
    !beforeLiveRef.current.ids.has(newest) &&
    beforeLiveRef.current.chatId === chatId
      ? newest
      : null;

  useLayoutEffect(() => {
    if (twinNow) {
      inheritedRef.current.set(twinNow, liveSlotKey);
      counterRef.current += 1;
    }
    wasLiveRef.current = showLiveTurn;
    if (!showLiveTurn) beforeLiveRef.current = { ids: new Set(archivedIds), chatId };
  });

  return {
    liveSlotKey,
    slotKeyFor: (turnId) => inheritedRef.current.get(turnId) ?? (turnId === twinNow ? liveSlotKey : turnId),
    twinNow,
  };
}

/**
 * One named piece of a turn's row. Every piece of the live branch and the saved branch carries a
 * fixed name, so React matches them by name and not by position: the answer bubble, the question
 * and the rating row stay the same elements when the live turn becomes its saved twin, even though
 * the two branches draw a few different pieces around them. Nothing (null, false) stays nothing.
 */
export function turnPiece(name: string, node: React.ReactNode): React.ReactNode {
  if (node === null || node === undefined || node === false) return null;
  if (React.isValidElement(node)) return React.cloneElement(node, { key: name });
  return React.createElement(React.Fragment, { key: name }, node);
}
