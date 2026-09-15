/**
 * Title: Reply rating and follow-up chips
 *
 * Purpose: Pin what happens after a reply arrives — rating it, and the chips that reword the
 *          question for you.
 * Used for: The block lifted out of the Ask hook on 2026-09-15, which had no test of its own
 *           before the move: nothing in the whole suite mentioned either behaviour.
 * Solves: The two rules a person would notice if they broke — a chip fills the box and does NOT
 *         send, and a new reply clears the previous rating — plus the quiet one behind them, that
 *         a chip leaves behind the parent question and answer for the next Ask to pick up.
 */
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { call, toaster } from "@decky/api";

import { useReplyFeedbackChips } from "./useReplyFeedbackChips";
import type { ReplyMicroActionId } from "../data/replyMicroActions";
import type { LastExchangeSnapshot, ReplyFollowUpPending } from "../types/backgroundAsk";
import {
  dispatchFakeRpc,
  getRpcCallLog,
  resetFakeDeckyRpc,
  setRpcHandler,
} from "../test-harness/fakeDeckyRpc";

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the bone hydra",
  answer: "Keep moving and punish the heads one at a time.",
  model: "gemma4:e2b-it-qat",
  askMode: "strategy",
};

/** One place that renders the hook and drives it, so no test repeats the act() wrapper. */
function setup() {
  const setUnifiedInput = vi.fn();
  const pendingReplyFollowUpRef: { current: ReplyFollowUpPending | null } = { current: null };
  const view = renderHook(
    (props: { lastExchange: LastExchangeSnapshot | null }) =>
      useReplyFeedbackChips({
        lastExchange: props.lastExchange,
        lastRequestId: 42,
        setUnifiedInput,
        askMode: "speed",
        pendingReplyFollowUpRef,
      }),
    { initialProps: { lastExchange: REPLY as LastExchangeSnapshot | null } }
  );
  return {
    view,
    setUnifiedInput,
    pendingReplyFollowUpRef,
    state: () => view.result.current,
    rate: (rating: "up" | "down") => act(async () => { await view.result.current.onReplyFeedback(rating); }),
    tapChip: (id: ReplyMicroActionId) => act(async () => { await view.result.current.onReplyMicroAction(id); }),
    showReply: (next: LastExchangeSnapshot | null) => act(() => { view.rerender({ lastExchange: next }); }),
    clearAll: () => act(() => { view.result.current.resetReplyFeedback(); }),
  };
}

/** Make every feedback save fail, for the two "it went wrong" rows. */
function breakSaving(): void {
  setRpcHandler("save_ask_feedback", () => {
    throw new Error("disk full");
  });
}

const toastTitles = () =>
  vi.mocked(toaster.toast).mock.calls.map((c) => (c[0] as { title: string }).title);

describe("useReplyFeedbackChips", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
    vi.mocked(toaster.toast).mockClear();
  });

  describe("rating a reply", () => {
    it("remembers which way you rated it and tells you it was saved", async () => {
      const t = setup();
      await t.rate("up");
      expect(t.state().liveReplyFeedbackRating).toBe("up");
      const saved = getRpcCallLog().filter((c) => c.method === "save_ask_feedback");
      expect(saved).toHaveLength(1);
      expect(saved[0].args[0]).toBe("up");
      expect(saved[0].args[1]).toBe(42);
      expect(vi.mocked(toaster.toast)).toHaveBeenCalled();
    });

    it("says so when saving failed instead of looking like it worked", async () => {
      breakSaving();
      const t = setup();
      await t.rate("down");
      expect(toastTitles()).toContain("Feedback not saved");
    });

    it("clears the rating when a different reply arrives", async () => {
      const t = setup();
      await t.rate("up");
      expect(t.state().liveReplyFeedbackRating).toBe("up");

      t.showReply({ ...REPLY, question: "something else", answer: "new" });
      expect(t.state().liveReplyFeedbackRating).toBeNull();
      expect(t.state().liveReplyChipUsed).toBe(false);
    });
  });

  describe("the follow-up chips", () => {
    it("fills the Ask box with the reworded question and does not send it", async () => {
      const t = setup();
      await t.tapChip("too_long");
      expect(t.setUnifiedInput).toHaveBeenCalledTimes(1);
      const written = t.setUnifiedInput.mock.calls[0][0] as string;
      expect(written).toContain(REPLY.question);
      expect(written).not.toBe(REPLY.question);
      expect(t.state().liveReplyChipUsed).toBe(true);
      // Nothing was asked: the only call is the feedback save.
      expect(getRpcCallLog().map((c) => c.method)).toEqual(["save_ask_feedback"]);
    });

    it("leaves the parent question and answer behind for the next Ask", async () => {
      const t = setup();
      await t.tapChip("bad_information");
      expect(t.pendingReplyFollowUpRef.current).toMatchObject({
        chipId: "bad_information",
        parentQuestion: REPLY.question,
        parentAnswer: REPLY.answer,
        preferredModel: REPLY.model,
        askMode: "strategy",
      });
    });

    it("falls back to the mode you are in when the reply does not record one", async () => {
      const t = setup();
      t.showReply({ question: "q", answer: "a" });
      await t.tapChip("too_short");
      expect(t.pendingReplyFollowUpRef.current?.askMode).toBe("speed");
    });

    it("does nothing at all when there is no reply yet", async () => {
      const t = setup();
      t.showReply(null);
      await t.tapChip("too_long");
      expect(t.setUnifiedInput).not.toHaveBeenCalled();
      expect(t.pendingReplyFollowUpRef.current).toBeNull();
      expect(getRpcCallLog()).toHaveLength(0);
    });

    it("reports a chip whose save failed, without a popup", async () => {
      breakSaving();
      const t = setup();
      await t.tapChip("too_long");
      expect(t.state().liveReplyChipError).toBeTruthy();
      expect(toastTitles()).not.toContain("Prompt updated — edit and send when ready");
    });
  });

  it("clearing puts all three back to nothing at once", async () => {
    const t = setup();
    await t.rate("down");
    await t.tapChip("too_long");
    expect(t.state().liveReplyChipUsed).toBe(true);

    t.clearAll();
    expect(t.state().liveReplyFeedbackRating).toBeNull();
    expect(t.state().liveReplyChipUsed).toBe(false);
    expect(t.state().liveReplyChipError).toBeNull();
  });
});
