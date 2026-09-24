/**
 * Title: Read aloud, stopped by a new Ask
 * Purpose: Own the one Read aloud / Stop instance the whole chat transcript shares, and stop
 * whatever is speaking the moment a new Ask begins.
 * Used for: MainTabChatTranscript.tsx (plan 42 step 3a).
 * Solves: Watching `isAsking` here, rather than wherever an Ask happens to start, catches every
 * path that begins one — the Ask button, a follow-up chip, "Ask again" — since they all flip this
 * same prop true, and stopping is idempotent when nothing is speaking.
 * Does not: Decide which turn is currently speaking or build the label a row shows — the
 * transcript still does both, from the `readAloud` object this hands back.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useEffect, useRef } from "react";
import { useReadAloud } from "./useReadAloud";

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useReadAloudAutoStop(isAsking: boolean): ReturnType<typeof useReadAloud> {
  const readAloud = useReadAloud();
  const wasAskingRef = useRef(false);
  useEffect(() => {
    if (isAsking && !wasAskingRef.current) {
      readAloud.stop();
    }
    wasAskingRef.current = isAsking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAsking]);

  return readAloud;
}
