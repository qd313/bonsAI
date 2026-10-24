/**
 * Title: Marking a wrong note from under an answer, walked with the D-pad in the Deck's numbers
 * Purpose: Pin plan 98 lane D at the level the Deck check (P98-DEMOTE-01) looks at: the real rating hook and the
 *          real reply row, inside a pane with Steam's own scroll after every landing and the plugin's lift off the
 *          dock (src/test-harness/deckAnswerWalk.ts, under each Steam scroll rule):
 *          Not really, then the eight reasons each once, then A on Wrong tip: the row reads "Marked not helpful"
 *          with Undo, the gold line names the note, the ring is on Undo, and Down leaves to Show details. Undo
 *          puts the reasons back with the ring on Wrong tip. The three reasons are absent on an answer that used
 *          no note.
 * Used for: buildReplyActionsElement.tsx, kbDemoteRows.tsx, useReplyFeedbackChips.ts.
 * Does not: Prove any of it on the Deck, or call the real plugin method (a stand-in records each call). Steam's
 *           own step for a press no handler claims is modelled here as the stop drawn next in that direction
 *           (the five older reasons leave Left, Right and some Downs to Steam).
 */
import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { WALK_RULES, deckAnswer, resetDeckAnswerWalk, type Box, type SteamScrollRule } from "../../../test-harness/deckAnswerWalk";
import { putSteamRingOn, type SteamEl } from "../../../test-harness/steamRing";
import { getRpcCallLog } from "../../../test-harness/fakeDeckyRpc";
import { buildReplyActionsElement } from "./buildReplyActionsElement";
import { resetRememberedReplyFeedbackForTests, useReplyFeedbackChips } from "./useReplyFeedbackChips";
import type { DemotableNote, DemoteNoteFn } from "./kbDemoteRows";
import { REPLY_STOP_ORDER, registerReplyStop, setReplyStopUnavailable } from "../../../shared/dpad/replyStopRegistry";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";

const TURN = "turn-1";
type Dir = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

const RULES: Array<[SteamScrollRule | undefined, boolean]> = WALK_RULES.flatMap((rule) =>
  [false, true].map((margin) => [rule, margin] as [SteamScrollRule | undefined, boolean]),
);

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the glyphid dreadnought",
  answer: "Shoot the weak points on its back while the swarm is down.",
  model: "gemma4:e2b-it-qat",
  askMode: "strategy",
};

const NOTE = (over: Partial<DemotableNote> = {}): DemotableNote => ({
  name: "Glyphid Dreadnought",
  kind: "boss",
  card: "Summary: a boss.",
  trust_tier: "seed",
  source_host: "",
  source_license: "",
  domain: "strategy",
  game_title: "Deep Rock Galactic: Survivor",
  section_id: 41,
  ...over,
});

beforeEach(() => {
  resetDeckAnswerWalk();
  resetRememberedReplyFeedbackForTests();
  for (const id of REPLY_STOP_ORDER) {
    registerReplyStop(id, null);
    setReplyStopUnavailable(id, false);
  }
});
afterEach(() => cleanup());

function Row(props: { notes: DemotableNote[]; demoteNote: DemoteNoteFn }): React.ReactElement | null {
  const fb = useReplyFeedbackChips({
    lastExchange: REPLY,
    lastRequestId: 7,
    setUnifiedInput: () => {},
    askMode: "strategy",
    pendingReplyFollowUpRef: { current: null },
    demoteNote: props.demoteNote,
  });
  return buildReplyActionsElement({
    replyKey: TURN,
    rating: fb.liveReplyFeedbackRating,
    onRate: (r) => void fb.onReplyFeedback(r),
    showFeedback: true,
    onToggleTransparency: () => {},
    onChip: (id) => void fb.onReplyMicroAction(id),
    onMoveDownFromUtility: () => false,
    demote: { ...fb.replyDemoteActions, state: fb.liveReplyDemote, notes: props.notes },
  });
}

/** Where each stop is drawn, in the answer's own coordinates (rows 24 tall, 6 apart, under the thumbs). */
const ROWS: Array<[string, Box]> = [
  ["thumbs", [540, 568]],
  ["reasons-1", [590, 614]],
  ["reasons-2", [620, 644]],
  ["reasons-3", [650, 674]],
  ["undo", [590, 606]],
  ["details", [690, 706]],
];

function mount(rule: SteamScrollRule | undefined, steamTopMargin: boolean, notes: DemotableNote[]) {
  const calls: Array<[number, string, string, boolean]> = [];
  const demoteNote: DemoteNoteFn = async (id, kind, reason, undo) => {
    calls.push([id, kind, reason, undo]);
    return { ok: true, downs: undo ? 0 : 1, excluded: false };
  };
  const a = deckAnswer([[100, 150], [158, 200]], 0, rule, { steamTopMargin });
  const slot = document.createElement("div");
  slot.className = "bonsai-chat-turn-slot";
  slot.setAttribute("data-bonsai-turn-id", TURN);
  a.pane.appendChild(slot);
  const holder = document.createElement("div");
  slot.appendChild(holder);
  render(<Row notes={notes} demoteNote={demoteNote} />, { container: holder });

  const box = (row: string) => ROWS.find(([r]) => r === row)![1];
  /** Name every stop drawn now and give it its box (a press can redraw the rows, so this runs after each). */
  const names = new Map<Element, string>();
  const rowOf = new Map<Element, string>();
  const layout = () => {
    names.clear();
    rowOf.clear();
    const put = (el: Element | null | undefined, name: string, row: string) => {
      if (!el) return;
      a.place(el as HTMLElement, box(row));
      names.set(el, name);
      rowOf.set(el, row);
    };
    put(holder.querySelector("[aria-label='Mark reply helpful']"), "Helpful", "thumbs");
    put(holder.querySelector("[aria-label='Mark reply not helpful']"), "Not really", "thumbs");
    const chipRows = [...holder.querySelectorAll(".bonsai-chat-reply-actions-row--chips")];
    chipRows.forEach((r, i) =>
      [...r.querySelectorAll("button, .bonsai-kb-demote-chip")].forEach((c) => put(c, c.getAttribute("aria-label") ?? "?", `reasons-${i + 1}`)),
    );
    put(holder.querySelector(".bonsai-kb-demote-undo"), "Undo", "undo");
    put(holder.querySelector("[aria-label='Show details']"), "Show details", "details");
  };
  layout();
  a.pane.scrollTop = 0;
  const nameOf = (el: Element | null) => {
    for (let e: Element | null = el; e; e = e.parentElement) if (names.has(e)) return names.get(e)!;
    return "other";
  };
  const stopOf = (el: Element | null) => {
    for (let e: Element | null = el; e; e = e.parentElement) if (names.has(e)) return e as HTMLElement;
    return null;
  };

  /** Steam's own step for a press nobody claimed: the stop drawn next that way (same row sideways, next row down/up). */
  const steamStep = (dir: Dir): boolean => {
    const from = stopOf(document.activeElement);
    if (!from) return false;
    const all = [...names.keys()] as HTMLElement[];
    const row = rowOf.get(from)!;
    const inRow = all.filter((e) => rowOf.get(e) === row);
    const i = inRow.indexOf(from);
    let to: HTMLElement | undefined;
    if (dir === "onMoveLeft") to = inRow[i - 1];
    else if (dir === "onMoveRight") to = inRow[i + 1];
    else {
      const order = ROWS.map(([r]) => r).filter((r) => all.some((e) => rowOf.get(e) === r));
      const next = order[order.indexOf(row) + (dir === "onMoveDown" ? 1 : -1)];
      to = all.find((e) => rowOf.get(e) === next);
    }
    if (!to) return false;
    putSteamRingOn(to);
    return true;
  };

  /** One press the way Steam routes it: the ring's handler, then each container's, then Steam's own step. */
  const press = (dir: Dir): boolean => {
    let handled = false;
    act(() => {
      for (let el = document.activeElement as SteamEl | null; el && !handled; el = el.parentElement as SteamEl | null) {
        const h = el.__nav?.[dir];
        if (h && h() === true) handled = true;
      }
      if (!handled) handled = steamStep(dir);
    });
    a.settle();
    return handled;
  };

  /** A on the stop holding the ring: a stop's own A handler, else the button's click; then the redraw settles. */
  const pressA = async () => {
    const ring = stopOf(document.activeElement) as SteamEl | null;
    act(() => {
      const ok = ring?.__nav?.onOKButton;
      if (ok) ok();
      else ring?.click();
    });
    /* The redraw is in; let the ring's hand-over (handRingOnWhenGone.ts) and the call's answer run. */
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    layout();
    a.settle();
  };

  const visible = (el: Element | null) => {
    const e = stopOf(el);
    return Boolean(e && a.bottom(e) > a.paneTop && a.top(e) < a.dockTop);
  };
  return { a, holder, calls, press, pressA, nameOf, visible, ring: () => nameOf(document.activeElement) };
}

describe("Not really, then Wrong tip, on an answer that used one note", () => {
  it.each(RULES)(
    "walks the eight reasons once each, then A on Wrong tip lands on Undo and Down leaves to Show details (Steam rule %s, top margin %s)",
    async (rule, margin) => {
      const m = mount(rule, margin, [NOTE()]);
      act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>("[aria-label='Mark reply not helpful']")!));
      m.a.settle();
      await m.pressA();
      expect(m.ring()).toBe("Not really");

      const seen = [m.ring()];
      const problems: string[] = [];
      const step = (dir: Dir) => {
        const ok = m.press(dir);
        const at = m.ring();
        if (!ok) problems.push(`${dir} from ${seen[seen.length - 1]} did nothing`);
        if (!m.visible(document.activeElement)) problems.push(`${at} is off the screen`);
        seen.push(at);
      };
      step("onMoveDown"); // Wrong game or topic, under Not really
      step("onMoveLeft"); // Bad info
      step("onMoveDown"); // Spoiled it
      step("onMoveRight"); // Too long
      step("onMoveRight"); // Too short
      step("onMoveDown"); // Wrong edition, same column
      step("onMoveLeft"); // Outdated
      step("onMoveLeft"); // Wrong tip
      expect(seen).toEqual([
        "Not really", "Wrong game or topic", "Bad info", "Spoiled it", "Too long", "Too short",
        "Wrong edition", "Outdated", "Wrong tip",
      ]);
      expect(new Set(seen).size).toBe(seen.length);
      expect(m.press("onMoveLeft")).toBe(true); // held: the ring stays in the plugin
      expect(m.ring()).toBe("Wrong tip");

      await m.pressA();
      expect(m.calls).toEqual([[41, "note", "wrong_tip", false]]);
      expect(m.holder.querySelector(".bonsai-kb-demote-row")).toBeNull();
      expect(m.holder.textContent).not.toContain("What went wrong?");
      expect(m.holder.querySelector(".bonsai-kb-demote-done")?.textContent).toContain("Marked not helpful");
      expect(m.holder.querySelector(".bonsai-kb-demote-noted")?.textContent).toBe(
        'Noted — "Glyphid Dreadnought" will rank lower for questions like this.',
      );
      expect(m.ring()).toBe("Undo");
      expect(m.visible(document.activeElement)).toBe(true);

      step("onMoveDown");
      expect(m.ring()).toBe("Show details");
      step("onMoveUp");
      expect(m.ring()).toBe("Undo");
      step("onMoveUp");
      expect(m.ring()).toBe("Not really");
      expect(problems).toEqual([]);
    },
  );

  it("saves the reason in the feedback log as the other five are", async () => {
    const m = mount(undefined, false, [NOTE()]);
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>("[aria-label='Mark reply not helpful']")!));
    await m.pressA();
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>(".bonsai-kb-demote-chip[aria-label='Outdated']")!));
    await m.pressA();
    const saves = getRpcCallLog().filter((c) => c.method === "save_ask_feedback").map((c) => c.args[4]);
    expect(saves).toContain("outdated");
    expect(m.calls).toEqual([[41, "note", "outdated", false]]);
  });

  it("a tip is marked as a tip (its id and a note's id can be the same number)", async () => {
    const m = mount(undefined, false, [NOTE({ kind: "tip", name: "proton", section_id: 41 })]);
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>("[aria-label='Mark reply not helpful']")!));
    await m.pressA();
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>(".bonsai-kb-demote-chip[aria-label='Wrong tip']")!));
    await m.pressA();
    expect(m.calls).toEqual([[41, "tip", "wrong_tip", false]]);
    expect(m.holder.querySelector(".bonsai-kb-demote-noted")?.textContent).toContain('"Proton"');
  });

  it("Undo takes the mark back, puts the reasons back and the ring on the reason that was picked", async () => {
    const m = mount("padded", true, [NOTE()]);
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>("[aria-label='Mark reply not helpful']")!));
    await m.pressA();
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>(".bonsai-kb-demote-chip[aria-label='Wrong edition']")!));
    await m.pressA();
    expect(m.ring()).toBe("Undo");
    await m.pressA();
    expect(m.calls).toEqual([
      [41, "note", "wrong_edition", false],
      [41, "note", "wrong_edition", true],
    ]);
    expect(m.holder.querySelector(".bonsai-kb-demote-done")).toBeNull();
    expect(m.holder.textContent).toContain("What went wrong?");
    expect(m.ring()).toBe("Wrong edition");
  });
});

describe("when the answer used no note the reasons are the five they were", () => {
  it.each([
    ["no note at all", [] as DemotableNote[]],
    ["a note with no id (an older saved chat)", [NOTE({ section_id: undefined })]],
  ])("%s: no Wrong tip, Outdated or Wrong edition, and Down from the last reason leaves to Show details", async (_n, notes) => {
    const m = mount(undefined, false, notes);
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>("[aria-label='Mark reply not helpful']")!));
    await m.pressA();
    expect(m.holder.querySelector(".bonsai-kb-demote-chip")).toBeNull();
    expect(m.holder.querySelectorAll(".bonsai-chat-reply-actions-row--chips button")).toHaveLength(5);
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>("[aria-label='Too short']")!));
    m.press("onMoveDown");
    expect(m.ring()).toBe("Show details");
  });
});

describe("every new stop is the plugin's own and hears A", () => {
  it("each reason and Undo is a stop inside the reply row with all four moves and an A handler", async () => {
    const m = mount(undefined, false, [NOTE()]);
    act(() => putSteamRingOn(m.holder.querySelector<HTMLElement>("[aria-label='Mark reply not helpful']")!));
    await m.pressA();
    const check = (el: Element | null) => {
      const nav = (el as SteamEl).__nav!;
      expect(el?.closest(".bonsai-chat-reply-actions")).not.toBeNull();
      expect(el?.getAttribute("data-steam-stop")).toBe("true");
      for (const k of ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight", "onOKButton"]) expect(typeof nav[k]).toBe("function");
    };
    const chips = [...m.holder.querySelectorAll(".bonsai-kb-demote-chip")];
    expect(chips.map((c) => c.textContent)).toEqual(["Wrong tip", "Outdated", "Wrong edition"]);
    chips.forEach(check);
    act(() => putSteamRingOn(chips[0] as HTMLElement));
    await m.pressA();
    check(m.holder.querySelector(".bonsai-kb-demote-undo"));
  });
});
