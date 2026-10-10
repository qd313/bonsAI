/**
 * Title: The Show details chips in the Deck's second round (2026-10-10), walked as Steam delivers the presses
 * Purpose: Pin what the Deck showed on build 95139093 (docs/test-evidence/plan87-P87-F3-CHIPS-GRID-try2.json): walking
 *          back Left or Up from Developer details read to its end, the row moved once (fine), then 23.5 px again at
 *          the second chip and 57.8 px on reaching the "This answer | Session" toggle, because Steam glides any stop
 *          whose top is above its line.
 * Used for: ContextChipLadder.tsx, useChipLadderReveal.ts and chipLadderPlacement.ts, rendered for real into a pane
 *           in that run's numbers (deckChipLadderPane.ts), with the toggle drawn directly above the ladder as on the
 *           Deck, Steam's glide as the chip walks measured it, and the plugin's lift after every press.
 * Does not: Prove it on the Deck (the Deck check does: the same presses, read off the screen).
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextChipLadder } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";
import { deckChipLadderPane, type ChipLadderPane } from "../test-harness/deckChipLadderPane";

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

/*
 * The eight chips of that run, at the first run's measured widths (the same five rows: [1,2] [3,4] [5] [6,7] [8]),
 * and the box heights read off its screen: every box starts at 449.7 with the row at 295.7, and ended at 683.4 (the
 * first chip's), 505.0, 505.0, 505.0, 536.9, 584.7 and 505.0; Developer details' ran 176.2 to 677.0.
 */
const CHIPS: Array<[label: string, width: number, box: number]> = [
  ["Keyword + meaning", 143.7, 233.7],
  ["KB: 14 sections", 92.9, 55.3],
  ["Read current TDP", 102.9, 55.3],
  ["Reply style: balanced", 120.2, 55.3],
  ["Thinking: Balanced · 19 s · ~514 tokens", 205.7, 87.2],
  ["Spoiler risk: high", 94.6, 135.0],
  ["Routed gemma4:e2b-it-qat", 150, 55.3],
  ["Developer details", 102.1, 500.8],
];
const LABELS = CHIPS.map(([label]) => label);

/*
 * The run's screen: page 766 tall, the pane from 52.2 (Steam's line at 168.2), the dock's top at 657.6. The ladder
 * sits where scrollTop 387.5 puts the row at 295.7, with 108.7 px of content after it: so the farthest scroll was
 * 413 with the first chip open and 680 with Developer details open, as the Deck reported.
 */
const SCREEN = { paneTop: 52.2, paneBottom: 766, dockTop: 657.6, ladderDocTop: 610.2, below: 108.7 };
const START_SCROLL = 387.5;

function chip(label: string, i: number): ContextChip {
  return { id: `chip-${i}`, rank: i + 1, label, attached: true, tier_class: "", body: { title: label, paths: [], bullets: [] } };
}

type Mounted = {
  scene: ChipLadderPane;
  ladder: HTMLElement;
  toggle: HTMLElement;
  below: HTMLElement;
  onDown: ReturnType<typeof vi.fn>;
};

/** The toggle, then the ladder, as the newest answer draws them; a stop below standing in for the Hide details line. */
function mount(glideDecidedOnFocus: boolean): Mounted {
  const scene = deckChipLadderPane({
    ...SCREEN,
    scrollTop: START_SCROLL,
    chipWidths: Object.fromEntries(CHIPS.map(([l, w]) => [l, w])),
    boxHeights: Object.fromEntries(CHIPS.map(([l, , b]) => [l, b])),
    rule: "padded",
    steamTopMargin: true,
    glideTopAboveLine: true,
    roundScrollHeight: true,
    glideDecidedOnFocus,
  });
  const below = document.createElement("button");
  below.textContent = "Hide details";
  document.body.append(below);
  let toggleEl: HTMLElement | null = null;
  const onUp = vi.fn(() => {
    toggleEl?.focus();
    return true;
  });
  const onDown = vi.fn(() => {
    below.focus();
    return true;
  });
  const snapshot = { context_chips: LABELS.map(chip) } as unknown as TransparencySnapshot;
  const ui = (
    <>
      <div
        className="bonsai-details-tabs-row"
        tabIndex={-1}
        ref={(el) => {
          toggleEl = el;
        }}
      >
        This answer | Session
      </div>
      <ContextChipLadder snapshot={snapshot} onMoveUpFromLadder={onUp} onMoveDownFromLadder={onDown} />
    </>
  );
  const { container, rerender } = render(ui, { container: scene.host });
  const ladder = container.querySelector<HTMLElement>(".bonsai-chip-ladder")!;
  scene.install(ladder);
  act(() => rerender(ui));
  scene.install(ladder);
  return { scene, ladder, toggle: toggleEl!, below, onDown };
}

function chipEl(m: Mounted, label: string): HTMLElement {
  return [...m.ladder.querySelectorAll<HTMLElement>(".bonsai-chip-ladder-chip")].find((c) => c.textContent === label)!;
}

/** Where the pane stood before the last press, after its handler, after Steam's glide and the lift, after every pass. */
let trail: number[] = [];

/** One press, as Steam delivers it: the focused element's own handler, then its glide and the lift, then the passes. */
function press(m: Mounted, dir: "Left" | "Right" | "Up" | "Down"): boolean {
  const ring = document.activeElement;
  const handler = ring ? (hoisted.propsByEl.get(ring)?.[`onMove${dir}`] as (() => boolean) | undefined) : undefined;
  let claimed = false;
  trail = [m.scene.pane.scrollTop];
  act(() => {
    claimed = Boolean(handler?.());
  });
  trail.push(m.scene.pane.scrollTop);
  m.scene.settle();
  trail.push(m.scene.pane.scrollTop);
  act(() => {
    vi.runAllTimers();
  });
  trail.push(m.scene.pane.scrollTop);
  return claimed;
}

/** True when the pane only ever moved one way during the last press. */
function oneWay(): boolean {
  const steps = trail.slice(1).map((v, i) => v - trail[i]!).filter((d) => Math.abs(d) > 0.5);
  return steps.every((d) => Math.sign(d) === Math.sign(steps[0]!));
}

/** The ring arrives on a chip from outside the grid, then Steam's glide and the passes settle. */
function arriveOn(m: Mounted, label: string) {
  const target = chipEl(m, label);
  target.setAttribute("tabindex", "-1");
  (document.activeElement as HTMLElement | null)?.blur();
  act(() => target.focus());
  m.scene.settle();
  act(() => {
    vi.runAllTimers();
  });
}

/** Right from the first chip to Developer details, then Down while its end is behind the dock (the run's steps 1 and 2). */
function readDeveloperDetailsToItsEnd(m: Mounted) {
  arriveOn(m, LABELS[0]!);
  for (let i = 0; i < 7; i += 1) press(m, "Right");
  expect(document.activeElement?.textContent).toBe(LABELS[7]);
  if (m.scene.detailsBox().bottom > m.scene.dockTop) press(m, "Down");
  expect(document.activeElement?.textContent).toBe(LABELS[7]);
  expect(m.scene.detailsBox().bottom).toBeLessThanOrEqual(m.scene.dockTop);
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

describe.each([
  ["after the press", false],
  ["decided on focus", true],
] as const)("the Deck's second round, Steam's glide %s", (_when, onFocus) => {
  /*
   * (a) The Deck: from Developer details with its end shown, Left x7 moved the row 146.9 (the one move leaving the
   * tall box), then 23.5 at the second chip, whose top was still 24 px above Steam's line, and Left at the first
   * chip reached the toggle and moved it 57.8 more. Up x5 did the same three. One move leaving the tall box is
   * fine; after it, the row holds all the way back, the toggle included.
   */
  for (const [dir, stops] of [
    ["Left", [6, 5, 4, 3, 2, 1, 0]],
    ["Up", [5, 4, 2, 0]],
  ] as const) {
    it(`${dir} back from Developer details read to its end: one move leaving it, then nothing moves, the toggle included`, () => {
      const m = mount(onFocus);
      readDeveloperDetailsToItsEnd(m);
      const moves: string[] = [];
      let row = m.scene.rowTop();
      for (const stop of stops) {
        press(m, dir);
        expect(document.activeElement?.textContent).toBe(LABELS[stop]);
        expect(oneWay(), `${LABELS[stop]}: the pane went both ways (${trail.join(" > ")})`).toBe(true);
        expect(m.scene.detailsBox().bottom, `${LABELS[stop]}'s box`).toBeLessThanOrEqual(m.scene.dockTop);
        moves.push(`${LABELS[stop]} ${Math.round((m.scene.rowTop() - row) * 10) / 10}`);
        row = m.scene.rowTop();
      }
      press(m, dir);
      expect(document.activeElement).toBe(m.toggle);
      moves.push(`toggle ${Math.round((m.scene.rowTop() - row) * 10) / 10}`);
      const later = moves.slice(1).filter((s) => Math.abs(Number(s.split(" ").pop())) >= 2);
      expect(later, moves.join(", ")).toEqual([]);
      expect(m.scene.toggleBox().top).toBeGreaterThanOrEqual(m.scene.steamLine - 1);
    });
  }
});
