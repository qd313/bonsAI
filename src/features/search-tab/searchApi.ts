/**
 * Title: Asking the back end for what the Search tab searches
 *
 * Purpose: The calls the Search tab makes: the questions asked in every saved chat. They go through the
 * same deadline wrapper as every other call and come back as plain lists, with a failed call reading as
 * "nothing found" rather than an error the tab has to handle.
 *
 * Used for: useSearchIndex.ts and this file's own test.
 *
 * Solves: Keeps the call names and the answer shapes (contract C6, plan 92) in one file.
 *
 * Does not: Search or sort anything; searchModel.ts does that.
 */
import { callDeckyWithTimeout } from "../../utils/deckyCall";
import type { SearchChat } from "./searchTypes";

type ChatQuestionsRpc = { ok?: boolean; chats?: SearchChat[] };

/** Every saved chat with the questions the person typed in it; [] when the call fails. */
export async function listChatSlotQuestions(): Promise<SearchChat[]> {
  try {
    const res = await callDeckyWithTimeout<[], ChatQuestionsRpc>("list_chat_slot_questions", []);
    return res?.ok === true && Array.isArray(res.chats) ? res.chats : [];
  } catch {
    return [];
  }
}
