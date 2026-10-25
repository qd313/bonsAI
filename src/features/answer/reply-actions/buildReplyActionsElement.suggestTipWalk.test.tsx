/**
 * Title: Walking to "Suggest as a tip" and past it, in the Deck's numbers (plan 100, lane J)
 * Purpose: Pin the D-pad route through the new stop at the level the Deck check (P100-SUGGEST-01) looks at: the real
 *          rating hook, the real tip hook and the real reply row, inside a pane with Steam's own scroll after every
 *          landing and the plugin's lift off the dock (src/test-harness/deckAnswerWalk.ts, under each Steam scroll
 *          rule and with and without its top margin). Helpful, Right to Not really, Down to Suggest as a tip, Down to
 *          Show details, then Up and Up back to Helpful; after Not really, Down walks the choices and lands on the
 *          button; after A on Helpful (the thumbs give way to the saved words) the ring is handed onto the button
 *          and Up from it reaches the answer's last section. No stop is visited twice in a walk, every stop lies
 *          inside the plugin's reply row (so A and B reach it, the lesson of the glossary box in plan 96), every
 *          landing is on screen, and A on the button sends the tip.
 * Used for: buildReplyActionsElement.tsx, suggestTipRow.tsx, replyStopRegistry.ts.
 * Does not: Prove any of it on the Deck. Steam's own step for a press no handler claims is modelled here as the stop
 *           drawn next that way (Left and Right inside the thumbs row, and Down between the two choice rows).
 */
import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { WALK_RULES, deckAnswer, resetDeckAnswerWalk, type SteamScrollRule } from "../../../test-harness/deckAnswerWalk";
import { putSteamRingOn, type SteamEl } from "../../../test-harness/steamRing";
import { buildReplyActionsElement } from "./buildReplyActionsElement";
import { resetRememberedReplyFeedbackForTests, useReplyFeedbackChips } from "./useReplyFeedbackChips";
import { resetRememberedReplySuggestTipForTests, useReplySuggestTip, type SuggestTipFn } from "./useReplySuggestTip";
import { REPLY_STOP_ORDER, registerReplyStop, setReplyStopUnavailable } from "../../../shared/dpad/replyStopRegistry";
import { focusDownFromLiveAnswerBubble, queryTurnSlot } from "../../../shared/dpad/liveTurnFocusGraph";
import type { LastExchangeSnapshot } from "../../../types/backgroundAsk";

const TURN = "turn-1";
type Dir = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

const RULES: Array<[SteamScrollRule | undefined, boolean]> = WALK_RULES.flatMap((rule) =>
  [false, true].map((margin) => [rule, margin] as [SteamScrollRule | undefined, boolean]),
);

const REPLY: LastExchangeSnapshot = {
  question: "how do i beat the mantis lords",
  answer: "Stay near the middle and dash through the first lunge.",
  appName: "Hollow Knight",
};

beforeEach(() => {
  resetDeckAnswerWalk();
  resetRememberedReplyFeedbackForTests();
  resetRememberedReplySuggestTipForTests();
  for (const id of REPLY_STOP_ORDER) {
    registerReplyStop(id, null);
    setReplyStopUnavailable(id, false);
  }
});
afterEach(() => cleanup());

function Row(props: { suggest: SuggestTipFn }): React.ReactElement | null {
  const fb = useReplyFeedbackChips({
    lastExchange: REPLY,
    lastRequestId: 7,
    setUnifiedInput: () => {},
    askMode: "strategy",
    pendingReplyFollowUpRef: { current: null },
  });
  const tip = useReplySuggestTip({ lastExchange: REPLY, appId: "367520", appName: "Hollow Knight", suggest: props.suggest });
  return buildReplyActionsElement({
    replyKey: TURN,
    rating: fb.liveReplyFeedbackRating,
    onRate: (r) => void fb.onReplyFeedback(r),
    showFeedback: true,
    onToggleTransparency: () => {},
    onChip: (id) => void fb.onReplyMicroAction(id),
    chipUsed: fb.liveReplyChipUsed,
    onMoveDownFromUtility: () => false,
    suggestTip: tip,
  });
}

const NAMES: Record<string, string> = {
  "Mark reply helpful": "Helpful",
  "Mark reply not helpful": "Not really",
  "Suggest as a tip": "Suggest as a tip",
  "Show details": "Show details",
};

function mount(rule: SteamScrollRule | undefined, steamTopMargin: boolean) {
  const calls: Parameters<SuggestTipFn>[0][] = [];
  const suggest: SuggestTipFn = async (req) => (
    calls.push(req),
    { ok: true, file: "hollow-knight-20261025-153012.json", issueUrl: "https://github.com/qd313/bonsAI/issues/new?title=x" }
  );
  const a = deckAnswer([[100, 150], [158, 200]], 0, rule, { steamTopMargin });
  const slot = document.createElement("div");
  slot.className = "bonsai-chat-turn-slot";
  slot.setAttribute("data-bonsai-turn-id", TURN);
  a.pane.appendChild(slot);
  const holder = document.createElement("div");
  slot.appendChild(holder);
  render(<Row suggest={suggest} />, { container: holder });

  /* Every stop drawn now, in drawing order, each row 30 px under the last starting at y 540; a press can redraw. */
  const stops = new Map<Element, string>();
  const rowOf = new Map<Element, number>();
  const layout = () => {
    stops.clear();
    rowOf.clear();
    const rows: Element[] = [];
    const add = (el: Element, name: string) => {
      const row = el.closest(".bonsai-chat-reply-actions-row") ?? el;
      if (!rows.includes(row)) rows.push(row);
      const i = rows.indexOf(row);
      a.place(el as HTMLElement, [540 + i * 30, 564 + i * 30]);
      stops.set(el, name);
      rowOf.set(el, i);
    };
    holder.querySelectorAll("button, .bonsai-chat-details-divider").forEach((el) => {
      const label = el.getAttribute("aria-label") ?? el.textContent ?? "?";
      add(el, NAMES[label] ?? label);
    });
  };
  layout();
  a.pane.scrollTop = 0;
  const answerEnd = a.stops[a.stops.length - 1]!;
  const nameOf = (el: Element | null) => (el === answerEnd ? "Answer end" : stops.get(el as Element) ?? "other");

  /** Steam's own step for a press nobody claimed: sideways inside a row, else the first stop of the next row. */
  const steamStep = (dir: Dir): boolean => {
    const from = document.activeElement as HTMLElement | null;
    if (!from || !stops.has(from)) return false;
    const all = [...stops.keys()] as HTMLElement[];
    const row = rowOf.get(from)!;
    const inRow = all.filter((e) => rowOf.get(e) === row);
    let to: HTMLElement | undefined;
    if (dir === "onMoveLeft") to = inRow[inRow.indexOf(from) - 1];
    else if (dir === "onMoveRight") to = inRow[inRow.indexOf(from) + 1];
    else to = all.find((e) => rowOf.get(e) === row + (dir === "onMoveDown" ? 1 : -1));
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
  const settleAfterPress = async () => {
    await act(async () => void (await new Promise((r) => setTimeout(r, 120))));
    layout();
    a.settle();
  };
  /** A on the stop holding the ring: its own press handler, else the button's click; then the redraw settles. */
  const pressA = async () => {
    const ring = document.activeElement as SteamEl | null;
    act(() => {
      const ok = ring?.__nav?.onOKButton;
      if (ok) ok();
      else ring?.click();
    });
    await settleAfterPress();
  };
  const click = (label: string) => holder.querySelector<HTMLElement>(`[aria-label='${label}']`)!;
  const ringOn = (label: string) => {
    act(() => putSteamRingOn(click(label)));
    a.settle();
  };
  const onScreen = (el: Element | null) => Boolean(el && a.bottom(el as HTMLElement) > a.paneTop && a.top(el as HTMLElement) < a.dockTop);
  return { a, holder, calls, press, pressA, ringOn, nameOf, onScreen, ring: () => nameOf(document.activeElement), layout };
}

/** Walk the given presses, noting every landing; each must be a press somebody heard, on screen, in the plugin's row. */
function walk(m: ReturnType<typeof mount>, presses: Dir[]) {
  const seen = [m.ring()];
  const problems: string[] = [];
  for (const dir of presses) {
    const ok = m.press(dir);
    const at = m.ring();
    if (!ok) problems.push(`${dir} from ${seen[seen.length - 1]} did nothing`);
    /* The answer's own last section is the answer walk's to judge (answerBubbleNavigation.*.test.ts); Steam's glide to it is not modelled under every rule. */
    if (at !== "Answer end") {
      if (!m.onScreen(document.activeElement)) problems.push(`${at} is off the screen`);
      if (document.activeElement?.closest(".bonsai-chat-reply-actions") === null) problems.push(`${at} is outside the plugin's reply row`);
    }
    seen.push(at);
  }
  return { seen, problems };
}

describe("a fresh answer: Helpful, Not really, Suggest as a tip, Show details", () => {
  it.each(RULES)(
    "Right, Down, Down visits each once, then Up and Up come back to Helpful (Steam rule %s, top margin %s)",
    (rule, margin) => {
      const m = mount(rule, margin);
      m.ringOn("Mark reply helpful");
      const down = walk(m, ["onMoveRight", "onMoveDown", "onMoveDown"]);
      expect(down.seen).toEqual(["Helpful", "Not really", "Suggest as a tip", "Show details"]);
      expect(new Set(down.seen).size).toBe(down.seen.length);
      const up = walk(m, ["onMoveUp", "onMoveUp"]);
      expect(up.seen).toEqual(["Show details", "Suggest as a tip", "Helpful"]);
      expect([...down.problems, ...up.problems]).toEqual([]);
    },
  );

  it.each(RULES)("Left and Right on the button hold the ring (Steam rule %s, top margin %s)", (rule, margin) => {
    const m = mount(rule, margin);
    m.ringOn("Suggest as a tip");
    expect(m.press("onMoveLeft")).toBe(true);
    expect(m.press("onMoveRight")).toBe(true);
    expect(m.ring()).toBe("Suggest as a tip");
  });

  it("A on the button sends the tip and the ring stays on it, with the line drawn under it", async () => {
    const m = mount("padded", true);
    m.ringOn("Suggest as a tip");
    await m.pressA();
    expect(m.calls).toHaveLength(1);
    expect(m.ring()).toBe("Suggest as a tip");
    expect(m.holder.querySelector(".bonsai-chat-suggest-tip-line")?.textContent).toContain("To send it in:");
    expect(m.onScreen(document.activeElement)).toBe(true);
    expect(m.press("onMoveDown")).toBe(true);
    expect(m.ring()).toBe("Show details");
  });
});

describe("after Not really the choices lead down to the button", () => {
  it.each(RULES)(
    "Down from Not really walks Wrong game or topic, Spoiled it, Suggest as a tip, Show details (Steam rule %s, top margin %s)",
    async (rule, margin) => {
      const m = mount(rule, margin);
      m.ringOn("Mark reply not helpful");
      await m.pressA();
      expect(m.ring()).toBe("Not really");
      const down = walk(m, ["onMoveDown", "onMoveDown", "onMoveDown", "onMoveDown"]);
      expect(down.seen).toEqual(["Not really", "Wrong game or topic", "Spoiled it", "Suggest as a tip", "Show details"]);
      expect(new Set(down.seen).size).toBe(down.seen.length);
      expect(down.problems).toEqual([]);
    },
  );
});

describe("after Helpful the thumbs are gone and the button stays", () => {
  it.each(RULES)(
    "A on Helpful hands the ring onto the button; Up from it reaches the answer's last section; Down comes back (Steam rule %s, top margin %s)",
    async (rule, margin) => {
      const m = mount(rule, margin);
      m.ringOn("Mark reply helpful");
      await m.pressA();
      expect(m.holder.textContent).toContain("Saved on this Deck");
      expect(m.ring()).toBe("Suggest as a tip");
      expect(m.onScreen(document.activeElement)).toBe(true);
      const up = walk(m, ["onMoveUp"]);
      expect(up.seen).toEqual(["Suggest as a tip", "Answer end"]);
      expect(up.problems).toEqual([]);
    },
  );
});

describe("Down out of the answer", () => {
  it.each(RULES)(
    "with the thumbs gone (rated Helpful) it lands on the button, not past it on Show details (Steam rule %s, top margin %s)",
    async (rule, margin) => {
      const m = mount(rule, margin);
      m.ringOn("Mark reply helpful");
      await m.pressA();
      /* The ring goes back to the answer's last section, then Down leaves the answer the way the bubble's own Down does. */
      act(() => putSteamRingOn(m.a.stops[m.a.stops.length - 1]!));
      act(() => void focusDownFromLiveAnswerBubble(queryTurnSlot(TURN)));
      m.a.settle();
      expect(m.ring()).toBe("Suggest as a tip");
    },
  );

  it("with the thumbs showing it still lands on Helpful first", () => {
    const m = mount(undefined, false);
    act(() => putSteamRingOn(m.a.stops[m.a.stops.length - 1]!));
    act(() => void focusDownFromLiveAnswerBubble(queryTurnSlot(TURN)));
    expect(m.ring()).toBe("Helpful");
  });
});
