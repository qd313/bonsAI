/**
 * Title: The "not enough free memory" answer, as the screen recognises it
 *
 * Purpose: Name the opening words of the warning the back end gives, instead of an answer, when loading
 * the AI on this Deck would leave too little free memory, and say whether a piece of answer text is that
 * warning. Also sends the "Ask anyway" press: one call that arms the back end's one-shot, then the same
 * question goes again through the ordinary Ask.
 *
 * Used for: MainTabChatTranscript.tsx, which shows an "Ask anyway" row under that warning
 * (ChatTranscriptHintRows.tsx draws it).
 *
 * Solves: The warning travels as plain text, like the "AI is not set up" answer, so the screen finds it
 * by its opening; tests/test_ollama_memory_guard.py reads this file to prove the words match
 * backend/ollama/ollama_memory_guard.py (LOW_MEMORY_MESSAGE_START).
 *
 * Does not: Draw the row, decide what the warning says past its opening, or add an argument to the Ask:
 * the one-shot lives in the back end's memory for 60 seconds and the next Ask uses it up.
 */
import { callDeckyWithTimeout } from "../../../shared/deckyCall";

const LOW_MEMORY_MESSAGE_START = "Not enough free memory to start the AI.";

/* In: the newest answer text. Out: true when it is the low-memory warning. */
export function isLowMemoryAnswer(text: string | null | undefined): boolean {
  return typeof text === "string" && text.trimStart().startsWith(LOW_MEMORY_MESSAGE_START);
}

type Reask = (question?: string, opts?: { threadQuestionDisplay?: string }) => void | Promise<void>;

/*
 * In: the Ask function the screen already has, and the question the warning answered.
 * Out: arms the one-shot, then asks the same question again. If arming fails (the call timed out) the
 * question still goes again: it either gets through, or the warning comes back, which is the honest answer.
 */
export async function askAnyway(reask: Reask, question: string, display: string = question): Promise<void> {
  try {
    await callDeckyWithTimeout<[], unknown>("arm_ollama_ask_anyway", []);
  } catch {
    /* the second ask below says what happened */
  }
  await reask(question, { threadQuestionDisplay: display });
}
