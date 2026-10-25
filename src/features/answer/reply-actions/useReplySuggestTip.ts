/**
 * Title: What the "Suggest as a tip" button holds for the answer on screen
 *
 * Purpose: Holds where the button is for the newest answer (not pressed, saving, saved with the file name and the
 * link, or refused with words) and makes the call that writes the file (plan 100, lane J). The line under the
 * button is drawn from what this returns; `suggestTipLine()` turns the state into that line.
 *
 * Used for: MainTabChatTranscript.tsx, which hands what this returns to the reply row
 * (buildReplyActionsElement.tsx draws it through suggestTipRow.tsx).
 *
 * Solves: The line has to outlive a redraw and the panel closing and opening, and a press has to be sent once. The
 * transcript already has the answer, so no value needs threading down from the Ask hook.
 *
 * Does not: Draw anything, check the Desktop permission (the plugin method does, and its refusal comes back as
 * words), or write the file (the back end does). It sends the answer as Copy would give it, so a spoiler still
 * hidden on screen is not in the file.
 *
 * Caution: Remembered outside the hook per answer, as the rating and the note marks are: the panel remounts every
 * time Steam's side panel closes and opens again, and a line kept only in hook state came back as "not pressed".
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";
import { formatDeckyRpcError } from "../../../shared/deckyCall";
import { buildAnswerCopyText } from "./answerCopyText";

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

/** The plugin call, handed in so a test can stand in for it. */
export type SuggestTipFn = (req: SuggestTipRequest) => Promise<SuggestTipResult>;

export type SuggestTipState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved"; file: string; issueUrl: string }
  | { phase: "refused"; error: string };

const SUGGEST_START: SuggestTipState = { phase: "idle" };

/** What the reply row needs: where the button is, and what a press does. */
export type ReplySuggestTipView = { state: SuggestTipState; onSuggest: () => void };

export type UseReplySuggestTipArgs = {
  /** The answer on screen. A new one starts the line over. */
  lastExchange: LastExchangeSnapshot | null;
  /** The game the answer was asked against, when there is one. */
  appId?: string | null;
  appName?: string | null;
  /** The plugin call. */
  suggest: SuggestTipFn;
};

const REMEMBERED_LIMIT = 64;
const remembered = new Map<string, SuggestTipState>();

function answerKey(exchange: LastExchangeSnapshot | null): string | null {
  if (!exchange?.answer?.trim()) return null;
  return JSON.stringify([(exchange.originalQuestion || exchange.question).trim(), exchange.answer.trim()]);
}

function recall(key: string | null): SuggestTipState {
  return (key && remembered.get(key)) || SUGGEST_START;
}

function remember(key: string | null, state: SuggestTipState): void {
  if (!key) return;
  remembered.delete(key);
  remembered.set(key, state);
  while (remembered.size > REMEMBERED_LIMIT) {
    const oldest = remembered.keys().next().value;
    if (oldest === undefined) break;
    remembered.delete(oldest);
  }
}

/** Tests only: forget every remembered line. */
export function resetRememberedReplySuggestTipForTests(): void {
  remembered.clear();
}

/** The one line under the button, or null while there is nothing to say. */
export function suggestTipLine(state: SuggestTipState): string | null {
  if (state.phase === "saved") return `Saved ${state.file}. To send it in: ${state.issueUrl}`;
  if (state.phase === "refused") return state.error;
  return null;
}

/**
 * In: the answer on screen, its game, and the plugin call.
 * Out: where the button is, and what a press does.
 * Can go wrong: a refusal, a failed call or a timeout becomes a `refused` line with words (a press again tries again);
 * nothing throws into a press. A press while saving, or after saving, sends nothing.
 */
export function useReplySuggestTip(a: UseReplySuggestTipArgs): ReplySuggestTipView {
  const { lastExchange, suggest } = a;
  const replyKey = answerKey(lastExchange);
  const [state, setState] = useState<SuggestTipState>(() => recall(replyKey));
  /* The answer on screen and its line, for a call that answers after the person has moved on. */
  const replyKeyNow = useRef(replyKey);
  replyKeyNow.current = replyKey;
  const stateNow = useRef(state);

  useEffect(() => {
    const kept = recall(replyKey);
    stateNow.current = kept;
    setState(kept);
  }, [replyKey]);

  /* Remembered for the answer it belongs to; drawn only while that answer is still the one on screen. */
  const show = useCallback((key: string | null, next: SuggestTipState) => {
    remember(key, next);
    if (key !== replyKeyNow.current) return;
    stateNow.current = next;
    setState(next);
  }, []);

  const onSuggest = useCallback(() => {
    const was = stateNow.current;
    if (was.phase === "saving" || was.phase === "saved") return;
    const key = replyKey;
    const exchange = lastExchange;
    const question = (exchange?.originalQuestion || exchange?.question || "").trim();
    const answer = exchange
      ? buildAnswerCopyText({
          body: exchange.answer,
          askQuestion: question,
          appId: a.appId ?? null,
          appName: a.appName || exchange.appName || null,
          askedEntity: exchange.askedEntity ?? null,
          spoilerConsentEffective: exchange.spoilerConsentEffective === true,
        }).trim()
      : "";
    if (!answer) {
      show(key, { phase: "refused", error: "There is no answer text to suggest." });
      return;
    }
    show(key, { phase: "saving" });
    const request: SuggestTipRequest = {
      question,
      answer,
      appId: (a.appId ?? "").trim(),
      appName: (a.appName || exchange?.appName || "").trim(),
      kind: "mechanic",
    };
    suggest(request).then(
      (res) =>
        show(
          key,
          res.ok
            ? { phase: "saved", file: res.file, issueUrl: res.issueUrl }
            : { phase: "refused", error: res.error },
        ),
      (e: unknown) => show(key, { phase: "refused", error: `Could not save the tip: ${formatDeckyRpcError(e)}` }),
    );
  }, [a.appId, a.appName, lastExchange, replyKey, show, suggest]);

  return { state, onSuggest };
}
