/**
 * Title: Reading an open reasoning block with the D-pad, a screen at a time
 * Purpose: Pin the plan 82 bug "the open reasoning block does not scroll in steps like the answer; one Down
 *          jumps past the whole of it". On the Deck (docs/test-evidence/plan82-M5-REASONING-SCROLL.json) the
 *          open block was 818 px tall in a readable band of 513 px (pane top 88, dock 601). One Down from the
 *          Hide reasoning line moved the pane 554.7 px and put the ring on the answer's first section: the
 *          person never stopped on any of the reasoning. Up did the same backwards.
 * Used for: buildReasoningFoldElement.tsx (the line and the block, exactly as the transcript draws them)
 *           and the answer walk the block hands over to, in the Deck's own numbers.
 * Solves: Checking the walk at the level the Deck check looks at: how far the pane moves on each press,
 *         whether the ring is on something on screen after every press, and whether every line of the
 *         reasoning was on screen at some point going down and again going up. Steam's own scroll after a
 *         landing and the plugin's lift off the dock run after every press (src/test-harness/deckAnswerWalk.ts),
 *         under each of the harness's Steam rules, and so does Steam's own Up out of the answer's first
 *         section, which goes to the stop drawn just above the answer in the turn.
 * Does not: Prove any of it on the device; the Deck check is in the lane report.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { buildReasoningFold } from "./buildReasoningFoldElement";
import { focusFirstAnswerChunk } from "./answerBubbleNavigation";
import {
  WALK_RULES,
  deckAnswer,
  resetDeckAnswerWalk,
  type Box,
  type SteamScrollRule,
} from "../test-harness/deckAnswerWalk";

type NavHandlers = Partial<Record<"onMoveUp" | "onMoveDown" | "onCancelButton", (e?: unknown) => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

/*
 * The stock stub drops every Steam prop. This one keeps the move and B handlers on the element, so a press
 * runs the handler Steam would run, fills `navRef` with a TakeFocus that focuses the element, and gives the
 * element the tabindex="0" Decky stamps on every node Steam navigates (AGENTS.md, the focus graph).
 */
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavFocusable(props, ref) {
    const { onMoveUp, onMoveDown, onCancelButton, navRef, ...rest } = props as Record<string, unknown> &
      NavHandlers & { navRef?: { current: unknown } };
    const setRef = (el: HTMLDivElement | null) => {
      if (el) {
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
        (el as NavEl).__nav = { onMoveUp, onMoveDown, onCancelButton };
        if (navRef) navRef.current = { TakeFocus: () => (el.focus(), true) };
      }
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };
    return <Base ref={setRef} {...rest} />;
  });
  return { ...stubs, Focusable: NavFocusable };
});

/** deckAnswer's own answer key: the turn the line and the block belong to. */
const TURN = "turn-1";
/** The Deck's screen in M5: the pane from y 88 to 765 and the dock from 601, so the readable band is 513 px. */
const DECK = { paneTop: 88, paneBottom: 765, dockTop: 601 };
const BAND = DECK.dockTop - DECK.paneTop;

/** One turn's line, open block and answer sections, in page coordinates (screen y plus the scroll). */
type Fold = { line: Box; block: Box; sections: Box[]; start: number };

/**
 * M5 itself, at the scroll the Deck had (31): the line at 204-219 on screen, the block at 227-1045, and the
 * answer's first section 90 px tall right under the block (Down left it at 511-601 with the scroll at 586).
 */
const M5: Fold = { line: [235, 250], block: [258, 1076], sections: [[1097, 1187], [1187, 1290], [1290, 1400]], start: 31 };
/** A long thinking: a 2,000 px block. */
const LONG: Fold = { line: [235, 250], block: [258, 2258], sections: [[2279, 2369], [2369, 2472]], start: 31 };
/** A short thinking that fits the band with room to spare. */
const SHORT: Fold = { line: [235, 250], block: [258, 458], sections: [[479, 569], [569, 672]], start: 31 };

const RULES: Array<[SteamScrollRule | undefined, boolean]> = WALK_RULES.flatMap((rule) =>
  [false, true].map((margin) => [rule, margin] as [SteamScrollRule | undefined, boolean]),
);

function mountFold(fold: Fold, rule: SteamScrollRule | undefined, steamTopMargin: boolean, open = true) {
  const a = deckAnswer(fold.sections, fold.start, rule, { ...DECK, steamTopMargin });
  Object.defineProperty(a.pane, "scrollHeight", { value: 4000, configurable: true });
  const slot = document.createElement("div");
  a.pane.insertBefore(slot, a.bubble);
  const toggles: string[] = [];
  const exits: string[] = [];
  render(
    buildReasoningFold({
      turnId: TURN,
      open,
      seconds: 18,
      text: "1. Analyze the request.\n2. Final review.",
      onToggle: () => toggles.push("toggle"),
      onMoveUp: () => (exits.push("question"), true),
      onMoveDown: () => focusFirstAnswerChunk(TURN),
    }),
    { container: slot },
  );
  const line = slot.querySelector<HTMLElement>(".bonsai-chat-reasoning-fold")!;
  const block = slot.querySelector<HTMLElement>(".bonsai-chat-reasoning-block");
  a.place(line, fold.line);
  if (block) a.place(block, fold.block);
  /* The ring on the line with the pane where the Deck had it. */
  a.land(line);
  a.pane.scrollTop = fold.start;

  const isStop = (el: HTMLElement | null) => el?.getAttribute("data-decky-ui") === "Focusable";
  const label = (el: Element | null): string => {
    if (el === line) return "line";
    if (el === block) return "block";
    const s = a.stops.indexOf(el as HTMLDivElement);
    return s >= 0 ? `section${s + 1}` : "other";
  };

  /** One press the way Steam routes it: the focused stop's own handler, then Steam's glide and the lift. */
  const press = (dir: "down" | "up"): boolean => {
    const ring = document.activeElement as NavEl;
    if (ring === line || ring === block) {
      const handled = Boolean((dir === "down" ? ring.__nav?.onMoveDown : ring.__nav?.onMoveUp)?.());
      a.settle();
      return handled;
    }
    const handled = dir === "down" ? a.down() : a.up();
    if (handled || dir === "down") return handled;
    /* Steam's own Up out of the answer: the stop drawn just above it in the turn's column. */
    const above = [line, block].filter(isStop);
    a.land(above[above.length - 1]!);
    return true;
  };

  /** The rows of the block inside the readable band right now, in page coordinates, or null. */
  const blockRowsShown = (): Box | null => {
    const from = Math.max(fold.block[0], a.pane.scrollTop + DECK.paneTop);
    const to = Math.min(fold.block[1], a.pane.scrollTop + DECK.dockTop);
    return to > from ? [from, to] : null;
  };

  /**
   * Press `dir` until `done(ring)` or `limit` presses. Lists every rule a press broke: a press nobody
   * claimed, the pane moving more than one band, and the ring left on something off the screen.
   * `unread` is every stretch of the block that was never inside the band during the walk, start included.
   */
  const walk = (dir: "down" | "up", done: (label: string) => boolean, limit = 20) => {
    const labels = [label(document.activeElement)];
    const problems: string[] = [];
    const shown: Box[] = [];
    const note = () => {
      const rows = blockRowsShown();
      if (rows) shown.push(rows);
    };
    note();
    for (let i = 1; i <= limit && !done(labels[labels.length - 1]!); i += 1) {
      const before = a.pane.scrollTop;
      if (!press(dir)) {
        problems.push(`press ${i}: not claimed on ${labels[labels.length - 1]}`);
        break;
      }
      const ring = document.activeElement as HTMLElement;
      const named = label(ring);
      labels.push(named);
      const moved = Math.round(a.pane.scrollTop - before);
      if (Math.abs(moved) > BAND) problems.push(`press ${i}: the pane moved ${moved} px, more than the ${BAND} px band`);
      if (!(a.bottom(ring) > DECK.paneTop && a.top(ring) < DECK.dockTop)) {
        problems.push(`press ${i}: the ring is on ${named} at ${a.top(ring)}..${a.bottom(ring)}, off the screen`);
      }
      note();
    }
    const stops = labels.filter((name, i) => i === 0 || name !== labels[i - 1]);
    return { labels, stops, presses: labels.length - 1, problems, unread: unreadRows(fold.block, shown) };
  };

  return { a, line, block, toggles, exits, walk, label };
}

/** The stretches of `box` no interval in `shown` covered. */
function unreadRows(box: Box, shown: Box[]): Box[] {
  const sorted = [...shown].sort((x, y) => x[0] - y[0]);
  const gaps: Box[] = [];
  let reached = box[0];
  for (const [from, to] of sorted) {
    if (from > reached + 1) gaps.push([reached, from]);
    reached = Math.max(reached, to);
  }
  if (reached < box[1] - 1) gaps.push([reached, box[1]]);
  return gaps;
}

describe("the open reasoning block reads a screen at a time, like the answer (plan 82, M5)", () => {
  beforeEach(() => resetDeckAnswerWalk());
  afterEach(() => cleanup());

  it.each(RULES)(
    "818 px block in a 513 px band (Steam rule %s, top margin %s): Down stops on the reasoning, a band at most per press, then the answer",
    (rule, margin) => {
      const f = mountFold(M5, rule, margin);
      const down = f.walk("down", (at) => at.startsWith("section"));
      expect(down.problems).toEqual([]);
      expect(down.stops).toEqual(["line", "block", "section1"]);
      expect(down.presses).toBeGreaterThanOrEqual(2);
      expect(down.presses).toBeLessThanOrEqual(3);
      expect(down.unread).toEqual([]);
      /* The answer's first section is entered as before: wholly on screen. */
      const first = f.a.stops[0]!;
      expect(f.a.top(first)).toBeGreaterThanOrEqual(DECK.paneTop);
      expect(f.a.bottom(first)).toBeLessThanOrEqual(DECK.dockTop + 4);
    },
  );

  it.each(RULES)(
    "818 px block (Steam rule %s, top margin %s): Up from the answer is Down reversed, the block from its end, then the line",
    (rule, margin) => {
      const f = mountFold(M5, rule, margin);
      f.walk("down", (at) => at.startsWith("section"));
      const up = f.walk("up", (at) => at === "line");
      expect(up.problems).toEqual([]);
      expect(up.stops).toEqual(["section1", "block", "line"]);
      expect(up.presses).toBeLessThanOrEqual(4);
      expect(up.unread).toEqual([]);
      expect(f.a.top(f.line)).toBeGreaterThanOrEqual(DECK.paneTop);
      expect(f.a.bottom(f.line)).toBeLessThanOrEqual(DECK.dockTop);
      expect(f.exits).toEqual([]);
    },
  );

  it("enters the block going Up with its end at the dock", () => {
    const f = mountFold(M5, undefined, false);
    f.walk("down", (at) => at.startsWith("section"));
    f.walk("up", (at) => at === "block");
    expect(f.label(document.activeElement)).toBe("block");
    expect(f.a.bottom(f.block!)).toBe(DECK.dockTop);
  });

  it.each(RULES)(
    "2,000 px block (Steam rule %s, top margin %s): a bounded walk Down then Up visits no stop twice and ends on the line",
    (rule, margin) => {
      const f = mountFold(LONG, rule, margin);
      const down = f.walk("down", (at) => at.startsWith("section"));
      expect(down.problems).toEqual([]);
      expect(down.stops).toEqual(["line", "block", "section1"]);
      expect(down.presses).toBeLessThanOrEqual(8);
      expect(down.unread).toEqual([]);
      const up = f.walk("up", (at) => at === "line");
      expect(up.problems).toEqual([]);
      expect(up.stops).toEqual(["section1", "block", "line"]);
      expect(up.presses).toBeLessThanOrEqual(8);
      expect(up.unread).toEqual([]);
    },
  );

  it.each(RULES)(
    "a block shorter than the band (Steam rule %s, top margin %s) is one stop each way",
    (rule, margin) => {
      const f = mountFold(SHORT, rule, margin);
      const down = f.walk("down", (at) => at.startsWith("section"));
      expect(down.problems).toEqual([]);
      expect(down.labels).toEqual(["line", "block", "section1"]);
      const up = f.walk("up", (at) => at === "line");
      expect(up.problems).toEqual([]);
      expect(up.labels).toEqual(["section1", "block", "line"]);
    },
  );

  it("with the block closed, Down from the line still goes straight into the answer", () => {
    const f = mountFold(M5, undefined, false, false);
    expect(f.block).toBeNull();
    const down = f.walk("down", (at) => at.startsWith("section"));
    expect(down.labels).toEqual(["line", "section1"]);
  });

  it("B on the block, half way down it, closes it and puts the ring back on the line, on screen", () => {
    const f = mountFold(LONG, undefined, false);
    f.walk("down", () => false, 2);
    expect(f.label(document.activeElement)).toBe("block");
    expect(f.a.top(f.line)).toBeLessThan(DECK.paneTop);
    let prevented = false;
    (f.block as NavEl).__nav!.onCancelButton!({ preventDefault: () => (prevented = true) });
    expect(prevented).toBe(true);
    expect(f.toggles).toEqual(["toggle"]);
    expect(f.label(document.activeElement)).toBe("line");
    expect(f.a.top(f.line)).toBeGreaterThanOrEqual(DECK.paneTop);
    expect(f.a.bottom(f.line)).toBeLessThanOrEqual(DECK.dockTop);
  });
});
