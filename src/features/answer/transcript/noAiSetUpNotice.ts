/**
 * Title: The "AI is not set up" answer, as the screen recognises it
 *
 * Purpose: Name the opening words of the answer the back end gives when Ollama is not installed
 * or cannot be reached, and say whether a piece of answer text is that answer.
 *
 * Used for: MainTabChatTranscript.tsx, which shows an "Open the Ollama tab" row under that answer.
 *
 * Solves: A question on a Deck with no Ollama used to be answered with a message about the Model
 * policy tier and no way to the Ollama tab (P96-F1). The answer travels as plain text, so the
 * screen finds it by its opening; tests/test_ollama_ask_service.py reads this file to prove the
 * words match backend/ollama/ollama_routing.py (AI_NOT_SET_UP_MESSAGE_START).
 *
 * Does not: Draw the row (ChatTranscriptHintRows.tsx), or decide what the message says past the
 * opening (the back end does).
 */

export const NO_AI_SET_UP_MESSAGE_START = "The AI is not set up on this Deck yet.";

/* In: the newest answer text. Out: true when it is the "AI is not set up" answer. */
export function isNoAiSetUpAnswer(text: string | null | undefined): boolean {
  return typeof text === "string" && text.trimStart().startsWith(NO_AI_SET_UP_MESSAGE_START);
}
