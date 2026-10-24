/**
 * Title: The "the note was wrong" rows' state (plan 98)
 * Purpose: Pin what the hook holds for the rows kbDemoteRows.tsx draws: a reason marks the note at once and calls
 *          the plugin with the note's id and kind, a refusal puts the reasons back with words a person can read,
 *          Undo calls again with undo set, a failed Undo keeps the mark showing, the real call is the default, the state outlives the panel
 *          closing and opening (a remount), and a new reply starts over.
 * Used for: useReplyDemote.ts, kbDemoteRows.tsx's sendDemotes.
 * Does not: Draw anything or walk the D-pad (buildReplyActionsElement.demote.test.tsx does).
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { resetRememberedReplyDemoteForTests, useReplyDemote } from "./useReplyDemote";
import type { DemoteNoteFn } from "./kbDemoteRows";
import type { KbAttachedNote } from "../../../types/inputTransparency";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";
import { getRpcCallLog } from "../../../test-harness/fakeDeckyRpc";

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the glyphid dreadnought",
  answer: "Shoot the weak points on its back.",
};
const OTHER: LastExchangeSnapshot = { question: "what is a lootbug", answer: "A harmless bug full of gold." };

const NOTE: KbAttachedNote = {
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
    (p: { exchange: LastExchangeSnapshot }) => useReplyDemote({ lastExchange: p.exchange, lastRequestId: 3, demoteNote }),
    { initialProps: { exchange: REPLY } },
  );
  const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
  return { view, state: () => view.result.current.state, settle };
}

describe("the note marks", () => {
  beforeEach(() => resetRememberedReplyDemoteForTests());

  it("a reason marks the note at once and calls with its id, kind and reason", async () => {
    const calls: unknown[][] = [];
    const h = setup(async (...args) => (calls.push(args), { ok: true, downs: 1 }));
    act(() => h.view.result.current.actions.choose("outdated", [NOTE]));
    expect(h.state()).toMatchObject({ phase: "done", reason: "outdated" });
    await h.settle();
    expect(calls).toEqual([[41, "note", "outdated", false]]);
    expect(h.state().error).toBeUndefined();
  });

  it("a refusal puts the reasons back, with the reason kept and the problem in words", async () => {
    const h = setup(async () => ({ ok: false }));
    act(() => h.view.result.current.actions.choose("wrong_tip", [NOTE]));
    await h.settle();
    expect(h.state()).toEqual({ phase: "reasons", reason: "wrong_tip", error: "Could not mark the note: the library did not keep it" });
  });

  it("with no stand-in it makes the real plugin call, section id, kind, reason, undo in that order", async () => {
    const h = setup(undefined);
    act(() => h.view.result.current.actions.choose("wrong_tip", [{ ...NOTE, kind: "tip", section_id: 9 }]));
    await h.settle();
    const sent = getRpcCallLog().filter((c) => c.method === "demote_rag_corpus_note").map((c) => c.args);
    expect(sent).toEqual([[9, "tip", "wrong_tip", false]]);
    expect(h.state()).toMatchObject({ phase: "done", reason: "wrong_tip" });
  });

  it("Undo calls again with undo set; a failed Undo keeps the mark showing with its words", async () => {
    let fail = false;
    const calls: unknown[][] = [];
    const h = setup(async (...args) => {
      calls.push(args);
      if (fail) throw new Error("timed out");
      return { ok: true };
    });
    act(() => h.view.result.current.actions.choose("wrong_edition", [NOTE]));
    await h.settle();
    act(() => h.view.result.current.actions.undo());
    expect(h.state()).toEqual({ phase: "reasons", reason: "wrong_edition" });
    await h.settle();
    expect(calls[1]).toEqual([41, "note", "wrong_edition", true]);
    act(() => h.view.result.current.actions.choose("wrong_edition", [NOTE]));
    await h.settle();
    fail = true;
    act(() => h.view.result.current.actions.undo());
    await h.settle();
    expect(h.state()).toMatchObject({ phase: "done", reason: "wrong_edition" });
    expect(h.state().error).toMatch(/^Could not undo: /);
  });

  it("the mark outlives the panel closing and opening, and a new reply starts over", async () => {
    const h = setup(async () => ({ ok: true }));
    act(() => h.view.result.current.actions.choose("outdated", [NOTE]));
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
    act(() => h.view.result.current.actions.choose("outdated", [{ ...NOTE, section_id: 0 }]));
    await h.settle();
    expect(calls).toEqual([]);
    expect(h.state()).toEqual({ phase: "reasons", reason: null });
  });

  it("two notes ask which first; pick marks only the one picked, back keeps the reason", async () => {
    const calls: unknown[][] = [];
    const h = setup(async (...args) => (calls.push(args), { ok: true }));
    const lootbug = { ...NOTE, name: "Lootbug", kind: "enemy", section_id: 77 };
    act(() => h.view.result.current.actions.choose("wrong_tip", [NOTE, lootbug]));
    expect(h.state()).toEqual({ phase: "which", reason: "wrong_tip" });
    act(() => h.view.result.current.actions.back());
    expect(h.state()).toEqual({ phase: "reasons", reason: "wrong_tip" });
    act(() => h.view.result.current.actions.choose("wrong_tip", [NOTE, lootbug]));
    act(() => h.view.result.current.actions.pick([lootbug]));
    await h.settle();
    expect(calls).toEqual([[77, "note", "wrong_tip", false]]);
    expect(h.state()).toMatchObject({ phase: "done", reason: "wrong_tip", picked: [lootbug] });
  });

  it("All of them with one call failing keeps the marks that took, with words, and Undo takes back only those", async () => {
    const calls: unknown[][] = [];
    const h = setup(async (...args) => {
      calls.push(args);
      if (args[0] === 77 && args[3] === false) return { ok: false };
      return { ok: true, downs: 1 };
    });
    const lootbug = { ...NOTE, name: "Lootbug", kind: "enemy", section_id: 77 };
    const proton = { ...NOTE, name: "proton", kind: "tip", section_id: 5 };
    act(() => h.view.result.current.actions.choose("outdated", [NOTE, lootbug, proton]));
    act(() => h.view.result.current.actions.pick([NOTE, lootbug, proton]));
    await h.settle();
    expect(h.state()).toEqual({
      phase: "done",
      reason: "outdated",
      picked: [NOTE, proton],
      error: "Could not mark every note: the library did not keep it",
    });
    act(() => h.view.result.current.actions.undo());
    await h.settle();
    expect(calls.filter((c) => c[3] === true)).toEqual([
      [41, "note", "outdated", true],
      [5, "tip", "outdated", true],
    ]);
    expect(h.state()).toEqual({ phase: "reasons", reason: "outdated" });
  });

  it("an Undo that fails for one note keeps the marked line for that note alone", async () => {
    const h = setup(async (id, _kind, _reason, undo) => (undo && id === 41 ? { ok: false } : { ok: true }));
    const lootbug = { ...NOTE, name: "Lootbug", kind: "enemy", section_id: 77 };
    act(() => h.view.result.current.actions.choose("outdated", [NOTE, lootbug]));
    act(() => h.view.result.current.actions.pick([NOTE, lootbug]));
    await h.settle();
    act(() => h.view.result.current.actions.undo());
    await h.settle();
    expect(h.state()).toMatchObject({ phase: "done", picked: [NOTE] });
    expect(h.state().error).toMatch(/^Could not undo: /);
  });
});
