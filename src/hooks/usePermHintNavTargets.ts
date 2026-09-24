/**
 * Title: Nav targets for the chat's two permission-hint rows
 * Purpose: Register the troubleshooting Ask hint's and the vac-check deny action's own wrapping
 * Focusables as Steam nav targets, for the lifetime of the transcript component.
 * Used for: MainTabChatTranscript.tsx — see `focusChatPermissionHintRow`'s own comment
 * (chatTranscriptNavHelpers.ts) for why this replaced a registered button handle and
 * `focusDeckOwner`.
 * Solves: Registered for the lifetime of the component rather than only while a row is actually
 * rendered: `takeNavFocus` already treats an unpopulated or stale holder as "not available"
 * (navFocusRegistry.ts), which is exactly the state a conditionally-unmounted row leaves behind,
 * so there is nothing to additionally guard here.
 * Does not: Draw either row, or decide when one is shown — the transcript still does both.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../utils/navFocusRegistry";

export interface PermHintNavTargets {
  troubleshootHintNavRef: MutableRefObject<NavRefHolder["current"]>;
  vacDenyRowNavRef: MutableRefObject<NavRefHolder["current"]>;
}

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function usePermHintNavTargets(): PermHintNavTargets {
  const troubleshootHintNavRef = useRef<NavRefHolder["current"]>(null);
  const vacDenyRowNavRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("chat-perm-hint-troubleshoot", troubleshootHintNavRef);
    return () => unregisterNavFocus("chat-perm-hint-troubleshoot", troubleshootHintNavRef);
  }, []);
  useEffect(() => {
    registerNavFocus("chat-perm-hint-deny", vacDenyRowNavRef);
    return () => unregisterNavFocus("chat-perm-hint-deny", vacDenyRowNavRef);
  }, []);

  return { troubleshootHintNavRef, vacDenyRowNavRef };
}
