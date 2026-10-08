/**
 * Title: Save one finished answer to the desktop debug note
 *
 * Purpose: Appends one finished answer to the desktop debug note and remembers it was saved.
 *
 * Used for: the Ask hook (useBonsaiAskOrchestration), in builds with "desktop debug note autosave"
 * and "filesystem write" both on.
 *
 * Solves: the answer counts as saved only when the back end reports success, so a failed write is
 * tried again the next time that answer is painted.
 *
 * Does not: decide whether to save. The caller checks the two switches and whether the answer was
 * already saved.
 */
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../utils/deckyCall";
import { markResponseAutosaved } from "../utils/desktopChatAutosave";
import type { AppendDesktopChatEventPayload, AppendDesktopNoteResult } from "../types/backgroundAsk";

export function saveReplyToDesktopNote(rid: number, answer: string, question: string): void {
  void callDeckyWithTimeout<[AppendDesktopChatEventPayload], AppendDesktopNoteResult>(
    "append_desktop_chat_event",
    [{ event: "response", response_text: answer, question }],
    DECKY_RPC_TIMEOUT_MS,
  )
    .then((result) => {
      if (result.success) markResponseAutosaved(rid);
    })
    .catch(() => {});
}
