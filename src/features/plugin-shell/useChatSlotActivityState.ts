/**
 * Title: Chat slot activity bookkeeping
 *
 * Purpose: The refs and state `Content` owns about the active chat slot and what is
 * generating in it, before `useChatSlots` itself is even called — the active slot pointer, the
 * row's dot language (hollow cyan ring = generating, solid green = finished while the user was
 * elsewhere), and the unread set.
 *
 * Used for: `index.tsx`, as the very first thing `Content` sets up, since
 * `useBonsaiAskOrchestration` and `useChatSlots` both need pieces of this before they exist.
 *
 * Solves: Nothing new — the same refs and state `Content` used to declare inline, moved out
 * because they need nothing from the rest of `Content` to exist (no closure params at all).
 *
 * Does not: Own the chat slots themselves, or decide when a slot is read — `useChatSlots` does
 * both; this only holds the handful of values other hooks need a stable reference to before
 * `useChatSlots` runs.
 */
import { useCallback, useRef, useState } from "react";

import { loadActiveChatSlotId } from "./pluginStorage";
import { peekBonsaiSessionPendingRestore } from "../../utils/bonsaiSessionSurvival";

export type ChatSlotActivityState = {
  activeSlotIdRef: React.MutableRefObject<string | null>;
  generatingSlotId: string | null;
  onGeneratingSlotChange: (slotId: string | null) => void;
  isSlotGenerating: (slotId: string) => boolean;
  unreadSlotIds: ReadonlySet<string>;
  setUnreadSlotIds: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
  reloadSlotTranscriptRef: React.MutableRefObject<(() => Promise<void>) | null>;
  ensureActiveSlotForAskRef: React.MutableRefObject<((question: string) => Promise<string | null>) | null>;
};

/*
 * In: nothing — every starting value here comes from module-level storage reads, not from
 * anything else in Content.
 * Out: the active-slot ref, the generating-slot state and its stable reader, the unread set, and
 * two more refs that `useBonsaiAskOrchestration` and `useChatSlots` fill in once they exist.
 * What can go wrong: `onGeneratingSlotChange` and `isSlotGenerating` must stay `useCallback([])`
 * — a fresh arrow function passed directly used to re-arm an orchestration effect every render
 * into an update loop (see the inline comment on the ref twin below).
 */
export function useChatSlotActivityState(): ChatSlotActivityState {
  /*
   * The modal-survival snapshot first, the stored pointer second.
   *
   * The snapshot only exists when a Decky modal opened; a QAM close/reopen is a plain remount and
   * writes none, so this used to come back null and the whole thread read as empty while the slot
   * on disk still held every turn. The two cannot disagree — both are written from `setActiveSlot`,
   * so a snapshot saying "no slot" comes with storage saying the same — which is what makes the
   * `??` safe rather than a way to resurrect a chat *Clear cache* just detached.
   */
  const activeSlotIdRef = useRef<string | null>(
    peekBonsaiSessionPendingRestore()?.activeSlotId ?? loadActiveChatSlotId(),
  );
  /*
   * Slot activity for the row's dot language: hollow cyan ring = generating, solid green =
   * finished while the user was elsewhere. Session-lived only — the QAM-closed case is already
   * covered by the reply-ready toast, so nothing here needs to persist.
   */
  const [generatingSlotId, setGeneratingSlotId] = useState<string | null>(null);
  /* Ref twin for the never-used-slot sweep (D42): the sweep runs inside stable callbacks and must
     see the CURRENT generating slot, not the one from whichever render created the callback. Both
     writers below are useCallback([]) on purpose — the bare setter used to be passed directly, and
     an inline arrow here re-armed an orchestration effect every render into an update loop. */
  const generatingSlotIdRef = useRef<string | null>(null);
  const onGeneratingSlotChange = useCallback((slotId: string | null) => {
    generatingSlotIdRef.current = slotId;
    setGeneratingSlotId(slotId);
  }, []);
  const isSlotGenerating = useCallback(
    (slotId: string) => generatingSlotIdRef.current === slotId,
    [],
  );
  const [unreadSlotIds, setUnreadSlotIds] = useState<ReadonlySet<string>>(() => new Set<string>());
  const reloadSlotTranscriptRef = useRef<(() => Promise<void>) | null>(null);
  /* Same indirection as the ref above: `useChatSlots` owns this but is declared after the
   * orchestration hook, because it needs that hook's thread setters. */
  const ensureActiveSlotForAskRef = useRef<((question: string) => Promise<string | null>) | null>(null);

  return {
    activeSlotIdRef,
    generatingSlotId,
    onGeneratingSlotChange,
    isSlotGenerating,
    unreadSlotIds,
    setUnreadSlotIds,
    reloadSlotTranscriptRef,
    ensureActiveSlotForAskRef,
  };
}
