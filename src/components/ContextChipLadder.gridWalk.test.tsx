/**
 * Title: Walking the Show details chip grid in four directions, as Steam delivers the presses
 * Purpose: Pin the chip grid (plan 87 F3, the maintainer's call 2): the eight chips the Deck showed on
 *          2026-10-09, at their measured widths, packed into rows that fit; Left and Right step through every
 *          chip in drawn order, Up and Down cross one row per press onto the nearest chip, and every edge
 *          leaves the grid where the old ladder's ends did. Each walk is bounded, visits no chip twice and
 *          has no press that does nothing.
 * Used for: ContextChipLadder.tsx, chipLadderGrid.ts, useChipGridOrder.ts, rendered for real into a pane
 *           laid out in the Deck's numbers (deckChipLadderPane.ts), with Steam's own glide on focus and the
 *           plugin's lift after every press, under every glide rule the answer walks are tested under.
 * Does not: Prove it on the Deck (the Deck check does: the presses below, read off the screen).
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextChipLadder } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";
import { deckChipLadderPane, type ChipLadderPane } from "../test-harness/deckChipLadderPane";
import { WALK_RULES } from "../test-harness/deckAnswerWalk";

/* Steam calls the move handlers of the element holding focus, so the walk needs each element's own. */
const hoisted = vi.hoisted(() => ({ propsByEl: new WeakMap<Element, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      const keep = (el: HTMLDivElement | null) => {
        if (el) hoisted.propsByEl.set(el, props);
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      };
      return <RealFocusable {...props} ref={keep} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

/* The chips, widths and details boxes of docs/test-evidence/plan87-M3-CHIPS.json. */
const DECK_CHIPS: Array<[label: string, width: number, box: number]> = [
  ["Knowledge base", 143.7, 55.4],
  ["KB: 13 sections", 92.9, 55.4],
  ["Read current TDP", 102.9, 55.4],
  ["Reply style: balanced", 120.2, 55.4],
  ["Thinking: Balanced · 65 s · ~626 tokens", 205.7, 87.3],
  ["Spoiler risk: low", 94.6, 135.1],
  ["Routed gemma4:e2b-it-qat", 150, 55.4],
  ["Developer details", 102.1, 253.9],
];
const LABELS = DECK_CHIPS.map(([label]) => label);

function chip(label: string, i: number): ContextChip {
  return { id: `chip-${i}`, rank: i + 1, label, attached: true, tier_class: "", body: { title: label, paths: [], bullets: [] } };
}

type Dir = "Left" | "Right" | "Up" | "Down";

/** The ladder in the pane, with a stop above it (the This answer | Session toggle) and one below (a suggestion chip). */
function mount(options: { rule?: (typeof WALK_RULES)[number]; steamTopMargin?: boolean; scrollTop?: number } = {}) {
  const scene = deckChipLadderPane({
    ladderDocTop: 389.5,
    scrollTop: options.scrollTop ?? 50,
    chipWidths: Object.fromEntries(DECK_CHIPS.map(([l, w]) => [l, w])),
    boxHeights: Object.fromEntries(DECK_CHIPS.map(([l, , b]) => [l, b])),
    rule: options.rule,
    steamTopMargin: options.steamTopMargin,
  });
  const above = document.createElement("button");
  above.textContent = "toggle";
  const below = document.createElement("button");
  below.textContent = "suggestion chip";
  document.body.append(above, below);
  const onUp = vi.fn(() => {
    above.focus();
    return true;
  });
  const onDown = vi.fn(() => {
    below.focus();
    return true;
  });
  const snapshot = { context_chips: LABELS.map(chip) } as unknown as TransparencySnapshot;
  const ui = <ContextChipLadder snapshot={snapshot} onMoveUpFromLadder={onUp} onMoveDownFromLadder={onDown} />;
  const { container, rerender } = render(ui, { container: scene.host });
  const ladder = container.querySelector<HTMLElement>(".bonsai-chip-ladder")!;
  scene.install(ladder);
  /* Draw again now the chips have widths, so the ladder measures and packs them. */
  act(() => rerender(ui));
  scene.install(ladder);
  return { scene, ladder, above, below, onUp, onDown };
}

function nameOf(el: Element | null, above: Element, below: Element): string {
  if (el === above) return "toggle";
  if (el === below) return "suggestion chip";
  if (el?.classList.contains("bonsai-chip-ladder-chip")) return el.textContent ?? "";
  return `other ${el?.className ?? "nothing"}`;
}

function settleAll(scene: ChipLadderPane) {
  scene.settle();
  act(() => {
    vi.runAllTimers();
  });
}

/** The ring arrives on a chip from outside the grid, then Steam's glide and the passes settle. */
function arriveOn(scene: ChipLadderPane, ladder: HTMLElement, label: string) {
  const target = [...ladder.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip")].find((c) => c.textContent === label)!;
  target.setAttribute("tabindex", "-1");
  act(() => target.focus());
  settleAll(scene);
}

/** One press, as Steam delivers it: the focused element's own handler, then its glide and the lift. */
function press(scene: ChipLadderPane, dir: Dir): boolean {
  const ring = document.activeElement;
  const handler = ring ? (hoisted.propsByEl.get(ring)?.[`onMove${dir}`] as (() => boolean) | undefined) : undefined;
  let claimed = false;
  act(() => {
    claimed = Boolean(handler?.());
  });
  settleAll(scene);
  return claimed;
}

/** Press one way until the ring leaves the grid; every stop, and what broke the rules. */
function walk(m: ReturnType<typeof mount>, dir: Dir, limit = 12) {
  const stops = [nameOf(document.activeElement, m.above, m.below)];
  const problems: string[] = [];
  for (let i = 1; i <= limit; i += 1) {
    const before = document.activeElement;
    const scroll = m.scene.pane.scrollTop;
    if (!press(m.scene, dir)) {
      problems.push(`press ${i}: not claimed on ${stops[stops.length - 1]}`);
      break;
    }
    const ring = document.activeElement;
    const name = nameOf(ring, m.above, m.below);
    if (ring === before && m.scene.pane.scrollTop === scroll) problems.push(`press ${i}: dead on ${name}`);
    if (ring !== before) {
      if (stops.includes(name)) problems.push(`press ${i}: ${name} visited twice`);
      stops.push(name);
      if (!m.ladder.contains(ring)) break;
      const caption = /Chip (\d+) of 8/.exec(m.ladder.textContent ?? "");
      if (!ring?.classList.contains("bonsai-chip-ladder-chip--active")) problems.push(`press ${i}: ${name} is not the open chip`);
      if (!caption) problems.push(`press ${i}: no caption`);
    }
  }
  return { stops, problems };
}

beforeEach(() => {
  hoisted.propsByEl = new WeakMap();
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const ORDER = LABELS;
const DOWN_FROM_FIRST = [LABELS[0], LABELS[2], LABELS[4], LABELS[5], LABELS[7]];

describe("the chips are packed into rows that fit the column", () => {
  it("draws the eight measured chips in five rows, in reading order", () => {
    const { scene, ladder } = mount();
    expect(scene.rowCount()).toBe(5);
    const tops = LABELS.map((l) => scene.chipBox(l).top);
    expect(new Set(tops).size).toBe(5);
    for (const l of LABELS) expect(scene.chipBox(l).right).toBeLessThanOrEqual(288);
    expect(ladder.textContent).toContain("Chip 1 of 8");
  });
});

describe.each(WALK_RULES.flatMap((rule) => [false, true].map((margin) => [rule ?? "no glide", rule, margin] as const)))(
  "the four-direction walk, Steam's glide %s, top margin %s",
  (_name, rule, steamTopMargin) => {
    it("Right visits every chip in drawn order, once each, then leaves for the stop below", () => {
      const m = mount({ rule, steamTopMargin });
      arriveOn(m.scene, m.ladder, LABELS[0]!);
      const right = walk(m, "Right");
      expect(right.problems).toEqual([]);
      expect(right.stops).toEqual([...ORDER, "suggestion chip"]);
    });

    it("Left visits every chip back to the first, once each, then leaves for the stop above", () => {
      const m = mount({ rule, steamTopMargin });
      arriveOn(m.scene, m.ladder, LABELS[7]!);
      const left = walk(m, "Left");
      expect(left.problems).toEqual([]);
      expect(left.stops).toEqual([...[...ORDER].reverse(), "toggle"]);
    });

    it("Down crosses one row per press onto the nearest chip, then leaves; Up walks the same rows back", () => {
      const m = mount({ rule, steamTopMargin });
      arriveOn(m.scene, m.ladder, LABELS[0]!);
      const down = walk(m, "Down");
      expect(down.problems).toEqual([]);
      expect(down.stops).toEqual([...DOWN_FROM_FIRST, "suggestion chip"]);

      arriveOn(m.scene, m.ladder, LABELS[7]!);
      const up = walk(m, "Up");
      expect(up.problems).toEqual([]);
      expect(up.stops).toEqual([...[...DOWN_FROM_FIRST].reverse(), "toggle"]);
    });

    it("Down from the right-hand column lands on the right-hand chips", () => {
      const m = mount({ rule, steamTopMargin });
      arriveOn(m.scene, m.ladder, LABELS[1]!);
      const down = walk(m, "Down");
      expect(down.problems).toEqual([]);
      expect(down.stops).toEqual([LABELS[1], LABELS[3], LABELS[4], LABELS[5], LABELS[7], "suggestion chip"]);
    });
  },
);

describe("the caption counts chips in drawn order", () => {
  it("names the chip the ring is on at every step", () => {
    const m = mount();
    arriveOn(m.scene, m.ladder, LABELS[0]!);
    for (let n = 1; n <= 8; n += 1) {
      expect(m.ladder.textContent).toContain(`Chip ${n} of 8`);
      expect(document.activeElement?.textContent).toBe(LABELS[n - 1]);
      if (n < 8) press(m.scene, "Right");
    }
  });
});
