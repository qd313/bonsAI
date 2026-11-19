/**
 * Title: The toast for a chat change that did not happen
 *
 * Purpose: One place for the words a person sees when the back end refused (or the call threw on) a
 * chat's delete or rename, so the two boxes that ask for them say it the same way.
 *
 * Used for: useChatSlotDeleteConfirm.tsx (Delete chat) and useChatSlotRenameModal.tsx (Rename chat).
 *
 * Solves: Both boxes closed as if all went well, the chat still there or still under its old name, with
 * nothing said. The toast is the only sign that the press did not take.
 *
 * Does not: close a box, retry the change, or decide whether it failed; the caller does that.
 */
import { toaster } from "@decky/api";

const WORDS = {
  delete: { title: "Chat not deleted", body: "The chat could not be deleted. It is still in your list." },
  rename: { title: "Chat not renamed", body: "The chat could not be renamed. It keeps its old name." },
} as const;

/** Tell the person that this chat change did not happen. */
export function toastChatChangeFailed(what: keyof typeof WORDS): void {
  toaster.toast({ ...WORDS[what], duration: 4000 });
}
