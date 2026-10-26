/**
 * Title: The transcript hands each finished answer its "Suggest as a tip" button (plan 100, lane J)
 * Purpose: Pin the wiring the reply-row tests cannot see: in the real transcript the button is drawn under the
 *          newest finished answer, on a saved turn and on the answer that just finished, and under no older turn;
 *          A on it makes the real plugin call with the question, the answer and the game the transcript knows
 *          (id and name from the Ollama context), and the one line under the button reads "Saved <file>. To send
 *          it in: <link>". With nothing to suggest (no answer at all) there is no button.
 * Used for: MainTabChatTranscript.tsx, useReplySuggestTip.ts, buildReplyActionsElement.tsx.
 * Does not: Walk the D-pad (buildReplyActionsElement.suggestTipWalk.test.tsx does) or reach the back end (the
 *           plugin call is the harness's stand-in).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import { getRpcCallLog } from "../../../test-harness/fakeDeckyRpc";
import { resetRememberedReplySuggestTipForTests } from "../reply-actions/useReplySuggestTip";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const QUESTION = "how do i beat the mantis lords";
const ANSWER = "Stay near the middle and dash through the first lunge, then heal after the second wave.";
const GAME = { app_context: "active", app_id: "367520", app_name: "Hollow Knight" };

function baseProps(over: Record<string, unknown>): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: GAME,
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadDisplayQuestion: "",
    lastExchange: { question: QUESTION, answer: ANSWER },
    lastRequestId: 5,
    liveReplyFeedbackRating: null,
    onReplyFeedback: () => {},
    onReplyMicroAction: () => {},
    ...over,
  } as unknown as MainTabChatTranscriptProps;
}

const turn = (id: string): AskThreadCollapsedTurn => ({
  id,
  question: QUESTION,
  answer: ANSWER,
  transparency: { route: "ollama", success: true, context_chips: [], overflow_skips: [], kb_attached_notes: [] },
});

const BUTTON = "[aria-label='Suggest as a tip']";
const suggestCalls = () => getRpcCallLog().filter((c) => c.method === "suggest_rag_corpus_tip");

beforeEach(() => resetRememberedReplySuggestTipForTests());

describe("the button under the newest finished answer", () => {
  it("is drawn on a saved turn, and A sends the question, the answer and the game and draws the saved line", async () => {
    const before = suggestCalls().length;
    const t = turn("t1");
    const c = render(<MainTabChatTranscript {...baseProps({ askThreadCollapsed: [t], expandedTurnKey: t.id })} />).container;
    const button = c.querySelector<HTMLElement>(BUTTON);
    expect(button).not.toBeNull();
    await act(async () => fireEvent.click(button!));
    const sent = suggestCalls().slice(before).map((x) => x.args);
    expect(sent).toEqual([[QUESTION, ANSWER, "367520", "Hollow Knight", "mechanic"]]);
    expect(c.querySelector(".bonsai-chat-suggest-tip-line")?.textContent).toMatch(/^Saved .+\.json\. To send it in: https:\/\/github\.com\/qd313\/bonsAI\/issues\/new\?title=/);
  });

  it("is drawn on the answer that just finished (the live turn)", () => {
    const c = render(
      <MainTabChatTranscript
        {...baseProps({ askThreadCollapsed: [], expandedTurnKey: "live", askThreadDisplayQuestion: QUESTION, ollamaResponse: ANSWER })}
      />,
    ).container;
    expect(c.querySelectorAll(BUTTON)).toHaveLength(1);
  });

  it("is drawn once, under the newest turn and not under an older one", () => {
    const c = render(
      <MainTabChatTranscript {...baseProps({ askThreadCollapsed: [turn("t1"), turn("t2")], expandedTurnKey: "t2" })} />,
    ).container;
    expect(c.querySelectorAll(BUTTON)).toHaveLength(1);
  });

  it("is not drawn when there is no answer to suggest", () => {
    const c = render(
      <MainTabChatTranscript {...baseProps({ askThreadCollapsed: [], expandedTurnKey: "live", lastExchange: null })} />,
    ).container;
    expect(c.querySelector(BUTTON)).toBeNull();
  });
});
