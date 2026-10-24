/**
 * Title: The rating hook's "the note was wrong" state (plan 98)
 * Purpose: Pin what the hook holds for the rows kbDemoteRows.tsx draws: a reason marks the note at once and calls
 *          the plugin with the note's id and kind, a refusal puts the reasons back with words a person can read,
 *          Undo calls again with undo set, a failed Undo keeps the mark showing, the state outlives the panel
 *          closing and opening (a remount), and a new reply starts over.
 * Used for: useReplyFeedbackChips.ts, kbDemoteRows.ts's sendDemotes.
 * Does not: Draw anything or walk the D-pad (buildReplyActionsElement.demote.test.tsx does).
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { resetRememberedReplyFeedbackForTests, useReplyFeedbackChips } from "./useReplyFeedbackChips";
import type { DemotableNote, DemoteNoteFn } from "./kbDemoteRows";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the glyphid dreadnought",
  answer: "Shoot the weak points on its back.",
};
const OTHER: LastExchangeSnapshot = { question: "what is a lootbug", answer: "A harmless bug full of gold." };

const NOTE: DemotableNote = {
  name: "Glyphid Dreadnought",
  kind: "boss",
  card: "",
  trust_tier: "seed",
  source_host: "",
  source_license: "",
  domain: "strategy",
  game_title: "Deep Rock Galactic: Survivor",
  section_id: 41,
};

function setup(demoteNote: DemoteNoteFn | undefined) {
  const view = renderHook(
    (p: { exchange: LastExchangeSnapshot }) =>
      useReplyFeedbackChips({
        lastExchange: p.exchange,
        lastRequestId: 3,
        setUnifiedInput: () => {},
        askMode: "speed",
        pendingReplyFollowUpRef: { current: null },
        demoteNote,
      }),
    { initialProps: { exchange: REPLY } },
  );
  const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
  return { view, state: () => view.result.current.liveReplyDemote, settle };
}

describe("the rating hook's note marks", () => {
  beforeEach(() => resetRememberedReplyFeedbackForTests());

  it("a reason marks the note at once and calls with its id, kind and reason", async () => {
    const calls: unknown[][] = [];
    const h = setup(async (...args) => (calls.push(args), { ok: true, downs: 1 }));
    act(() => h.view.result.current.replyDemoteActions.choose("outdated", [NOTE]));
    expect(h.state()).toMatchObject({ phase: "done", reason: "outdated" });
    await h.settle();
    expect(calls).toEqual([[41, "note", "outdated", false]]);
    expect(h.state().error).toBeUndefined();
  });

  it("a refusal puts the reasons back, with the reason kept and the problem in words", async () => {
    const h = setup(async () => ({ ok: false }));
    act(() => h.view.result.current.replyDemoteActions.choose("wrong_tip", [NOTE]));
    await h.settle();
    expect(h.state()).toEqual({ phase: "reasons", reason: "wrong_tip", error: "Could not mark the note: the library did not keep it" });
  });

  it("with no plugin call handed in, it says so rather than pretending", async () => {
    const h = setup(undefined);
    act(() => h.view.result.current.replyDemoteActions.choose("wrong_tip", [NOTE]));
    await h.settle();
    expect(h.state()).toMatchObject({ phase: "reasons", error: "Could not mark the note: this build cannot mark notes yet" });
  });

  it("Undo calls again with undo set; a failed Undo keeps the mark showing with its words", async () => {
    let fail = false;
    const calls: unknown[][] = [];
    const h = setup(async (...args) => {
      calls.push(args);
      if (fail) throw new Error("timed out");
      return { ok: true };
    });
    act(() => h.view.result.current.replyDemoteActions.choose("wrong_edition", [NOTE]));
    await h.settle();
    act(() => h.view.result.current.replyDemoteActions.undo());
    expect(h.state()).toEqual({ phase: "reasons", reason: "wrong_edition" });
    await h.settle();
    expect(calls[1]).toEqual([41, "note", "wrong_edition", true]);
    act(() => h.view.result.current.replyDemoteActions.choose("wrong_edition", [NOTE]));
    await h.settle();
    fail = true;
    act(() => h.view.result.current.replyDemoteActions.undo());
    await h.settle();
    expect(h.state()).toMatchObject({ phase: "done", reason: "wrong_edition" });
    expect(h.state().error).toMatch(/^Could not undo: /);
  });

  it("the mark outlives the panel closing and opening, and a new reply starts over", async () => {
    const h = setup(async () => ({ ok: true }));
    act(() => h.view.result.current.replyDemoteActions.choose("outdated", [NOTE]));
    await h.settle();
    h.view.unmount();
    const again = setup(async () => ({ ok: true }));
    expect(again.state()).toMatchObject({ phase: "done", reason: "outdated" });
    act(() => again.view.rerender({ exchange: OTHER }));
    expect(again.state()).toEqual({ phase: "reasons", reason: null });
  });

  it("a note with no id is never sent (an older saved chat)", async () => {
    const calls: unknown[][] = [];
    const h = setup(async (...args) => (calls.push(args), { ok: true }));
    act(() => h.view.result.current.replyDemoteActions.choose("outdated", [{ ...NOTE, section_id: 0 }]));
    await h.settle();
    expect(calls).toEqual([]);
    expect(h.state()).toEqual({ phase: "reasons", reason: null });
  });
});
