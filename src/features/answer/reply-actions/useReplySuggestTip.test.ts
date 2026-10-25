/**
 * Title: The "Suggest as a tip" button's state (plan 100, lane J)
 * Purpose: Pin what the hook holds for the line under the button: a press says "saving" at once and calls the
 *          plugin with the question, the answer's text as Copy would give it (a still-hidden spoiler is not in
 *          it), the game and a kind; a good answer becomes "saved" with the file name and the link; a refusal or a
 *          failed call becomes the words a person can read; a second press while saving or after saving sends
 *          nothing; a refusal can be tried again; the state outlives the panel closing and opening, and a new
 *          answer starts over, even when the old answer's call answers late.
 * Used for: useReplySuggestTip.ts.
 * Does not: Draw anything or walk the D-pad (buildReplyActionsElement.suggestTip.test.tsx does), or call the real
 *           plugin method (a stand-in records each call).
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  resetRememberedReplySuggestTipForTests,
  suggestTipLine,
  useReplySuggestTip,
  type SuggestTipFn,
  type SuggestTipRequest,
} from "./useReplySuggestTip";
import { SPOILER_HIDDEN_COPY_PLACEHOLDER } from "./answerCopyText";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the mantis lords",
  originalQuestion: "How do I beat the Mantis Lords?",
  answer: "Stay near the middle and dash through the first lunge.",
};
const OTHER: LastExchangeSnapshot = { question: "where is the map", answer: "Cornifer sells it in Dirtmouth." };
const SAVED = { ok: true, file: "hollow-knight-20261025-153012.json", issueUrl: "https://github.com/qd313/bonsAI/issues/new?title=Suggested%20tip%3A%20x" } as const;

function setup(suggest: SuggestTipFn, exchange: LastExchangeSnapshot | null = REPLY) {
  const view = renderHook(
    (p: { exchange: LastExchangeSnapshot | null }) =>
      useReplySuggestTip({ lastExchange: p.exchange, appId: "367520", appName: "Hollow Knight", suggest }),
    { initialProps: { exchange } },
  );
  const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
  return { view, state: () => view.result.current.state, press: () => act(() => view.result.current.onSuggest()), settle };
}

describe("Suggest as a tip", () => {
  beforeEach(() => resetRememberedReplySuggestTipForTests());

  it("starts idle with nothing to say", () => {
    const h = setup(async () => SAVED);
    expect(h.state()).toEqual({ phase: "idle" });
    expect(suggestTipLine(h.state())).toBeNull();
  });

  it("a press says saving at once and sends the question, the answer, the game and a kind", async () => {
    const calls: SuggestTipRequest[] = [];
    const h = setup(async (req) => (calls.push(req), SAVED));
    h.press();
    expect(h.state()).toEqual({ phase: "saving" });
    await h.settle();
    expect(calls).toEqual([
      {
        question: "How do I beat the Mantis Lords?",
        answer: "Stay near the middle and dash through the first lunge.",
        appId: "367520",
        appName: "Hollow Knight",
        kind: "mechanic",
      },
    ]);
  });

  it("a good answer becomes saved, and the line names the file and the link", async () => {
    const h = setup(async () => SAVED);
    h.press();
    await h.settle();
    expect(h.state()).toEqual({ phase: "saved", file: SAVED.file, issueUrl: SAVED.issueUrl });
    expect(suggestTipLine(h.state())).toBe(`Saved ${SAVED.file}. To send it in: ${SAVED.issueUrl}`);
  });

  it("a refusal shows the back end's words, which name the Permissions tab", async () => {
    const words = "Filesystem writes are disabled. Enable them in the Permissions tab.";
    const h = setup(async () => ({ ok: false, error: words }));
    h.press();
    await h.settle();
    expect(h.state()).toEqual({ phase: "refused", error: words });
    expect(suggestTipLine(h.state())).toBe(words);
    expect(suggestTipLine(h.state())).toContain("Permissions tab");
  });

  it("a call that throws or never answers becomes a readable line, and a refusal can be tried again", async () => {
    let n = 0;
    const calls: number[] = [];
    const h = setup(async () => {
      calls.push(++n);
      if (n === 1) throw new Error("RPC timeout after 15000ms");
      return SAVED;
    });
    h.press();
    await h.settle();
    expect(h.state()).toEqual({ phase: "refused", error: "Could not save the tip: RPC timeout after 15000ms" });
    h.press();
    await h.settle();
    expect(calls).toEqual([1, 2]);
    expect(h.state().phase).toBe("saved");
  });

  it("a second press while saving, or after saving, sends nothing more", async () => {
    let release: (v: typeof SAVED) => void = () => {};
    const calls: number[] = [];
    const h = setup(
      () => (calls.push(1), new Promise((r) => (release = r as (v: typeof SAVED) => void))),
    );
    h.press();
    h.press();
    expect(calls).toHaveLength(1);
    await act(async () => release(SAVED));
    h.press();
    expect(calls).toHaveLength(1);
    expect(h.state().phase).toBe("saved");
  });

  it("the answer goes in as Copy would give it: a still-hidden spoiler is not sent", async () => {
    const calls: SuggestTipRequest[] = [];
    const secret = "The reactor core explodes in act three.";
    const h = setup(async (req) => (calls.push(req), SAVED), {
      ...REPLY,
      answer: ["Here is the plan.", "", "```bonsai-spoiler", secret, "```"].join("\n"),
    });
    h.press();
    await h.settle();
    expect(calls[0]!.answer).not.toContain("reactor core");
    expect(calls[0]!.answer).toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
  });

  it("an answer with no text sends nothing and says so", async () => {
    const calls: SuggestTipRequest[] = [];
    const h = setup(async (req) => (calls.push(req), SAVED), { question: "hi", answer: "   " });
    h.press();
    await h.settle();
    expect(calls).toEqual([]);
    expect(h.state()).toEqual({ phase: "refused", error: "There is no answer text to suggest." });
  });

  it("the line is still there after the panel closes and opens, and a new answer starts over", async () => {
    const h = setup(async () => SAVED);
    h.press();
    await h.settle();
    h.view.unmount();
    const again = setup(async () => SAVED);
    expect(again.state().phase).toBe("saved");
    again.view.rerender({ exchange: OTHER });
    expect(again.state()).toEqual({ phase: "idle" });
  });

  it("a late answer for the old reply never draws on the new one", async () => {
    let release: (v: typeof SAVED) => void = () => {};
    const h = setup(() => new Promise((r) => (release = r as (v: typeof SAVED) => void)));
    h.press();
    h.view.rerender({ exchange: OTHER });
    await act(async () => release(SAVED));
    expect(h.state()).toEqual({ phase: "idle" });
    h.view.rerender({ exchange: REPLY });
    expect(h.state().phase).toBe("saved");
  });
});
