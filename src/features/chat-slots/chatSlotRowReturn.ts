/**
 * Title: Chat row: remember to come back on Save
 * Purpose: After A on the chat row's Save icon opens the "Save to Desktop note" window and the window
 * closes, the ring comes back on Save instead of Delete.
 * Used for: ChatSlotRow (sets it when A opens the window, takes it on the ring's next arrival).
 * Solves: Closing a Decky window rebuilds the tab behind it, so the row is a new copy with an empty
 * memory (docs/lessons-learned.md, "Closing a Decky popup rebuilds the tab behind it"). A flag kept
 * inside the row was lost and the ring came back on Delete (plan 82, build 880687e4). This one lives
 * outside the component, so it survives the rebuild.
 * Does not: Move any ring; it only answers "was the last thing the row did opening the save window".
 *
 * Gotchas:
 * - Taken once: the first arrival of the ring clears it, so an ordinary entry from the tab bar still
 *   lands on Delete. The row also clears it when the ring leaves by Up or Down, so a window that
 *   never gave the ring back cannot send a later entry to Save.
 */
let returnToSave = false;

/** A on Save just opened the window: the next time the ring comes onto the row, put it on Save. */
export function markChatRowReturnToSave(): void {
  returnToSave = true;
}

/** True once, if the ring is coming back from the save window; the answer is consumed. */
export function takeChatRowReturnToSave(): boolean {
  const was = returnToSave;
  returnToSave = false;
  return was;
}

/** The ring left the row some other way, or a test is starting over. */
export function clearChatRowReturnToSave(): void {
  returnToSave = false;
}
