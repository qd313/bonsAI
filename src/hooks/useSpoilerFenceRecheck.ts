/**
 * Title: Re-render when a spoiler fence opens or closes
 * Purpose: Plan 58 phase 1 — force the chat transcript to re-render whenever a spoiler fence
 * opens or closes anywhere, so a "From the notes" block's own read of whether any fence is open
 * is never stale.
 * Used for: MainTabChatTranscript.tsx, which reads whether any spoiler fence is open (by way of
 * `kbNotesBlockedBySpoiler`) while deciding whether to show a turn's KB notes block.
 * Solves: The open-fence count lives in MainTabBonsaiAiMarkdownChunk.tsx, several components
 * away, and changing it does not by itself cause the transcript to re-render — this subscription
 * is what does, by bumping a throwaway counter the caller never reads.
 * Does not: Read or report the count itself, or decide whether any fence is currently open — the
 * caller asks whether any fence is open directly (`anySpoilerFenceOpen`, a different file), this
 * only makes sure it asks again.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useEffect, useState } from "react";
import { subscribeToSpoilerFenceOpenChange } from "../components/MainTabBonsaiAiMarkdownChunk";

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useSpoilerFenceRecheck(): void {
  const [, forceSpoilerOpenRecheck] = useState(0);
  useEffect(
    () => subscribeToSpoilerFenceOpenChange(() => forceSpoilerOpenRecheck((n) => n + 1)),
    []
  );
}
