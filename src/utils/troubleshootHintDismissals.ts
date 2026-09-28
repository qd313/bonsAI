/**
 * Title: Which chats have dismissed the troubleshooting hint
 * Purpose: Remember a press of Dismiss on the "Troubleshooting Ask detected" hint per chat, so it
 *          survives the panel being rebuilt and does not carry over to a different chat.
 * Used for: MainTabChatTranscript.tsx's troubleshooting hint.
 * Solves: The dismissal was component state: every Quick Access close and reopen rebuilds the
 *         panel and brought the hint back (docs/test-evidence/plan70-L6-AFTER-DISMISS.json), and
 *         one press hid it in every chat.
 * Does not: Write anything to disk or into a chat's saved file, so older saved chats load exactly
 *           as before. Module scope outlives a panel rebuild, like KnowledgeBaseSection's
 *           in-flight markers; a plugin reload or a Steam restart forgets it, which is fine for a
 *           hint.
 */

/** Stands in for a chat with no saved slot yet (a brand-new, unsaved chat). */
const NO_CHAT_KEY = "__no_chat__";

const dismissedChats = new Set<string>();

function keyFor(chatSlotId: string | null | undefined): string {
  const id = (chatSlotId ?? "").trim();
  return id || NO_CHAT_KEY;
}

export function isTroubleshootHintDismissed(chatSlotId: string | null | undefined): boolean {
  return dismissedChats.has(keyFor(chatSlotId));
}

export function dismissTroubleshootHint(chatSlotId: string | null | undefined): void {
  dismissedChats.add(keyFor(chatSlotId));
}

/** Test seam: forget every dismissal between tests. */
export function resetTroubleshootHintDismissalsForTests(): void {
  dismissedChats.clear();
}
