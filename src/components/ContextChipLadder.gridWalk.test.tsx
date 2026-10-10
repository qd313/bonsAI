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
type MountOptions = {
  rule?: (typeof WALK_RULES)[number];
  steamTopMargin?: boolean;
  scrollTop?: number;
  /** The screen: the monitor run's numbers unless given (pane 88 to 766, dock 658.4). */
  screen?: { paneBottom: number; dockTop: number; ladderDocTop: number };
};

function mount(options: MountOptions = {}) {
  const scene = deckChipLadderPane({
    ladderDocTop: options.screen?.ladderDocTop ?? 389.5,
    paneBottom: options.screen?.paneBottom,
    dockTop: options.screen?.dockTop,
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
  /* From outside the grid, as Down from the toggle or Up from below brings it. */
  (document.activeElement as HTMLElement | null)?.blur();
  act(() => target.focus());
  settleAll(scene);
}

/**
 * Where the pane stood before the last press, after its handler, after Steam's glide and the lift, and
 * after every pass had run: a press that scrolls one way and then back is a jump, whatever it ends on.
 */
let trail: number[] = [];

/** One press, as Steam delivers it: the focused element's own handler, then its glide and the lift. */
function press(scene: ChipLadderPane, dir: Dir): boolean {
  const ring = document.activeElement;
  const handler = ring ? (hoisted.propsByEl.get(ring)?.[`onMove${dir}`] as (() => boolean) | undefined) : undefined;
  let claimed = false;
  trail = [scene.pane.scrollTop];
  act(() => {
    claimed = Boolean(handler?.());
  });
  trail.push(scene.pane.scrollTop);
  scene.settle();
  trail.push(scene.pane.scrollTop);
  act(() => {
    vi.runAllTimers();
  });
  trail.push(scene.pane.scrollTop);
  return claimed;
}

/** True when the pane only ever moved one way during the last press. */
function oneWay(): boolean {
  const steps = trail.slice(1).map((v, i) => v - trail[i]!).filter((d) => Math.abs(d) > 0.5);
  return steps.every((d) => Math.sign(d) === Math.sign(steps[0]!));
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

/* The Deck's own screen with no game, in the setup's numbers (deckAnswerWalk.ts): pane 88 to 366, dock at 290. */
const SMALL_SCREEN = { paneBottom: 366, dockTop: 290, ladderDocTop: 300 };

describe.each(WALK_RULES.flatMap((rule) => [false, true].map((margin) => [rule ?? "no glide", rule, margin] as const)))(
  "the open chip's details stay readable, Steam's glide %s, top margin %s",
  (_name, rule, steamTopMargin) => {
    /*
     * The Deck's Right walk of 2026-10-09: the panel at scrollTop 50, the row at 448.3, presses quicker than
     * the pane settled. Spoiler risk's box ended 46.2 px under the question box and was never shown;
     * Developer details' 164.9 px under it. Now every box ends above the dock (658.4, itself above the
     * question box at 691.2) once its chip opens, by one smooth scroll, and nothing moves for the others.
     */
    it("walking Right from the first chip, every box ends above the dock, and the row only rises, smoothly", () => {
      const m = mount({ rule, steamTopMargin });
      arriveOn(m.scene, m.ladder, LABELS[0]!);
      const problems: string[] = [];
      for (const label of LABELS) {
        if (document.activeElement?.textContent !== label) {
          const before = m.scene.rowTop();
          press(m.scene, "Right");
          if (!oneWay()) problems.push(`${label}: the pane went both ways (${trail.join(" > ")})`);
          const moved = m.scene.rowTop() - before;
          if (moved > 0.5) problems.push(`${label}: the row went down ${moved}`);
        }
        expect(document.activeElement?.textContent).toBe(label);
        const box = m.scene.detailsBox();
        const chip = m.scene.chipBox(label);
        if (box.bottom > m.scene.dockTop) problems.push(`${label}: box ends at ${box.bottom}, dock at ${m.scene.dockTop}`);
        if (chip.top < m.scene.paneTop || chip.bottom > m.scene.dockTop) problems.push(`${label}: chip off screen`);
      }
      expect(problems).toEqual([]);
      expect(m.scene.smoothScrolls.length).toBeGreaterThan(0);
    });

    it("after Developer details, the Left walk back to the first chip moves nothing (the slip guard)", () => {
      const m = mount({ rule, steamTopMargin });
      arriveOn(m.scene, m.ladder, LABELS[0]!);
      for (let i = 0; i < 7; i += 1) press(m.scene, "Right");
      expect(document.activeElement?.textContent).toBe(LABELS[7]);
      const row = m.scene.rowTop();
      const scroll = m.scene.pane.scrollTop;
      for (let i = 0; i < 7; i += 1) {
        press(m.scene, "Left");
        expect([document.activeElement?.textContent, m.scene.rowTop(), m.scene.pane.scrollTop]).toEqual([
          LABELS[6 - i],
          row,
          scroll,
        ]);
        expect(m.scene.detailsBox().bottom).toBeLessThanOrEqual(m.scene.dockTop);
      }
    });

    it("on the Deck's own small screen, every chip shows its box's end at once or on the first Down", () => {
      const m = mount({ rule, steamTopMargin, scrollTop: 0, screen: SMALL_SCREEN });
      const problems: string[] = [];
      for (const label of LABELS) {
        arriveOn(m.scene, m.ladder, label);
        const chip = m.scene.chipBox(label);
        if (chip.top < m.scene.paneTop - 0.5 || chip.bottom > m.scene.dockTop) problems.push(`${label}: chip off screen on arrival`);
        if (m.scene.detailsBox().bottom > m.scene.dockTop) {
          press(m.scene, "Down");
          if (document.activeElement?.textContent !== label) problems.push(`${label}: Down moved on before the box's end showed`);
          if (m.scene.detailsBox().bottom > m.scene.dockTop) problems.push(`${label}: box still ends at ${m.scene.detailsBox().bottom}`);
          if (!oneWay()) problems.push(`${label}: the pane went both ways`);
        }
      }
      expect(problems).toEqual([]);
    });
  },
);

describe("Developer details, a box taller than the room", () => {
  it("on the small screen: the first Down shows the box's end with the ring still on the chip, the second Down leaves", () => {
    const m = mount({ scrollTop: 0, screen: SMALL_SCREEN });
    arriveOn(m.scene, m.ladder, LABELS[7]!);
    expect(m.scene.detailsBox().bottom).toBeGreaterThan(m.scene.dockTop);

    expect(press(m.scene, "Down")).toBe(true);
    expect(document.activeElement?.textContent).toBe(LABELS[7]);
    expect(m.scene.detailsBox().bottom).toBeLessThanOrEqual(m.scene.dockTop);
    expect(m.onDown).not.toHaveBeenCalled();

    press(m.scene, "Down");
    expect(m.onDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(m.below);
  });

  it("on the monitor: its end is on screen as soon as it opens, so the first Down leaves", () => {
    const m = mount();
    arriveOn(m.scene, m.ladder, LABELS[0]!);
    for (let i = 0; i < 7; i += 1) press(m.scene, "Right");
    expect(m.scene.detailsBox().bottom).toBeLessThanOrEqual(m.scene.dockTop);
    press(m.scene, "Down");
    expect(m.onDown).toHaveBeenCalledTimes(1);
  });
});

describe.each(WALK_RULES.map((rule) => [rule ?? "no glide", rule] as const))(
  "the four-direction walk on the Deck's own small screen, Steam's glide %s with its top margin",
  (_name, rule) => {
    /* A press that only shows the rest of a box keeps the ring where it is: it is not a stop, and not dead. */
    it("Right, Left, Down and Up visit the same stops as on the monitor, none twice, no dead press", () => {
      const m = mount({ rule, steamTopMargin: true, scrollTop: 0, screen: SMALL_SCREEN });
      arriveOn(m.scene, m.ladder, LABELS[0]!);
      const right = walk(m, "Right", 20);
      expect(right.problems).toEqual([]);
      expect(right.stops).toEqual([...ORDER, "suggestion chip"]);

      arriveOn(m.scene, m.ladder, LABELS[7]!);
      const left = walk(m, "Left", 20);
      expect(left.problems).toEqual([]);
      expect(left.stops).toEqual([...[...ORDER].reverse(), "toggle"]);

      arriveOn(m.scene, m.ladder, LABELS[0]!);
      const down = walk(m, "Down", 20);
      expect(down.problems).toEqual([]);
      expect(down.stops).toEqual([...DOWN_FROM_FIRST, "suggestion chip"]);

      arriveOn(m.scene, m.ladder, LABELS[7]!);
      const up = walk(m, "Up", 20);
      expect(up.problems).toEqual([]);
      expect(up.stops).toEqual([...[...DOWN_FROM_FIRST].reverse(), "toggle"]);
    });
  },
);
