/**
 * Title: Saving a good answer as a proposed tip, from the screen
 *
 * Purpose: The one call the "Suggest as a tip" button makes: it sends the question, the answer, the game and a kind of
 * note, and says what the back end answered: the file it saved and the link to send it in, or the words of a refusal
 * (with "Save files to Desktop" off they name the Permissions tab).
 *
 * Used for: useReplySuggestTip.ts, the state behind the button under a finished answer (plan 100, lane J).
 *
 * Solves: Keeps the call name and the answer shape of the back end's `suggest_rag_corpus_tip` in one file, and turns a
 * failed or malformed call into a plain "not ok" with a line to show, so no screen has to catch an error.
 *
 * Does not: Check the permission or write the file (the back end does, and is the only guard), or decide what the line
 * says on success (useReplySuggestTip.ts does).
 */
import { callDeckyWithTimeout, formatDeckyRpcError } from "../../shared/deckyCall";
/** What a press sends: the player's question, the answer as Copy gives it, the game, and the kind of note. */
export type SuggestTipRequest = {
  question: string;
  answer: string;
  appId: string;
  appName: string;
  kind: string;
};

/** What the plugin answers: the file's name and the link, or the words to show. */
export type SuggestTipResult =
  | { ok: true; file: string; issueUrl: string }
  | { ok: false; error: string };

type SuggestTipRpc = { ok?: boolean; file?: string; issue_url?: string; error?: string };

const FALLBACK_WORDS = "Could not save the tip.";

/**
 * In: the question, the answer as Copy gives it, the game's id and name, and a kind.
 * Out: the saved file's name and the link, or `ok: false` with the words to show.
 * Can go wrong: nothing throws; a timeout or a failed call comes back as `ok: false` with the reason in the words.
 */
export async function suggestRagCorpusTip(req: SuggestTipRequest): Promise<SuggestTipResult> {
  try {
    const res = await callDeckyWithTimeout<[string, string, string, string, string], SuggestTipRpc>(
      "suggest_rag_corpus_tip",
      [req.question, req.answer, req.appId, req.appName, req.kind],
    );
    if (res?.ok === true && typeof res.file === "string" && res.file && typeof res.issue_url === "string" && res.issue_url) {
      return { ok: true, file: res.file, issueUrl: res.issue_url };
    }
    return { ok: false, error: typeof res?.error === "string" && res.error.trim() ? res.error : FALLBACK_WORDS };
  } catch (e) {
    return { ok: false, error: `${FALLBACK_WORDS.slice(0, -1)}: ${formatDeckyRpcError(e)}` };
  }
}
