/**
 * Title: Down with Steam's ring on the whole answer bubble, not on one of its sections
 *
 * Purpose: Plan 79 helper P2, the ★★★ trap "After picking a setting from the search list above the
 * question box, Down cannot get past the answer". The maintainer's screenshot
 * (screenshots/DeckCapture_20261002_004346_game.png) shows Steam's ring as one tall box the width of
 * the answer bubble, the answer's end running on behind the question box, and Down doing nothing until
 * Steam was restarted. That is the ring on the bubble itself: a Focusable that takes Up and Down itself.
 *
 * Two ways the ring gets there are modelled:
 * - the section holding the ring is replaced by a re-render and Steam falls back to the nearest
 *   focusable ancestor, the bubble. Ring and page focus move together. Down from the bubble already
 *   lands on the first section on screen and walks on: kept here as a guard.
 * - the ring is on the bubble while the panel's page has lost the browser's focus (Quick Access came
 *   back from Quick Settings, the state plan 76 measured: plan76-P76-TRAP-SPLIT.json). Then the
 *   plugin's own plain focus() hop moves the page's focus but not Steam's ring. Down from the bubble
 *   hopped to the section, reported the press as used, and left the ring on the bubble: every press the
 *   same, nothing moving. That is the trap, and what these tests pin.
 *
 * Built the way the Deck behaves (deckAnswerWalk.ts: the Deck's pane, dock and bubble frame, Steam's
 * glide under three rules and none, the plugin's lift). Steam's ring is a `.gpfocus` mark, the one the
 * plugin reads (`uiGamepadFocusElement`); it follows a plain focus() only while the panel's page holds
 * the browser's focus.
 *
 * Does not: prove the browser hands the panel its focus back on the Deck (`refocusPanelWindowIfLost`
 * asks; only a device run shows it is granted), nor what Steam does with a press the bubble declines.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WALK_DOCKS, WALK_RULES, deckAnswer, resetDeckAnswerWalk, walkAnswer } from "../test-harness/deckAnswerWalk";
import type { Box, ShapedAnswer, SteamScrollRule } from "../test-harness/deckAnswerWalk";
import { registerAnswerStop } from "./answerStopRegistry";

/* The panel's own window: whether it holds the browser's focus, and whether asking for it is granted. */
const panelWindow = vi.hoisted(() => ({ focused: true, grantOnAsk: true, asks: 0 }));
vi.mock("./navFocusRegistry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./navFocusRegistry")>()),
  refocusPanelWindowIfLost: () => {
    if (panelWindow.focused) return false;
    panelWindow.asks += 1;
    if (panelWindow.grantOnAsk) panelWindow.focused = true;
    return true;
  },
}));

const PANE_TOP = 88;

/** A long answer, five sections: the newest answer of the screenshot, its end behind the question box. */
const LONG: Box[] = [[120, 300], [308, 470], [478, 640], [648, 780], [788, 900]];

/* Steam's ring: on one element, following a plain focus() only while the panel's page has the browser's focus. */
let ringListener: AbortController | null = null;
function steamRing(start: HTMLElement) {
  const ring = () => document.querySelector<HTMLElement>(".gpfocus");
  const put = (el: HTMLElement) => {
    ring()?.classList.remove("gpfocus");
    el.classList.add("gpfocus");
  };
  start.focus();
  put(start);
  ringListener = new AbortController();
  document.addEventListener("focusin", (e) => panelWindow.focused && put(e.target as HTMLElement), {
    signal: ringListener.signal,
  });
  return { ring };
}

function answer(rule: SteamScrollRule | undefined, dock: number) {
  // The panel scrolled so the answer's last 40 px run on behind the question box.
  const a = deckAnswer(LONG, 900 - (dock + 40), rule, { dockTop: dock });
  const label = (el: Element | null) => {
    const i = a.stops.indexOf(el as HTMLDivElement);
    return i >= 0 ? `section${i + 1}` : el === a.bubble ? "bubble" : "other";
  };
  return { ...a, covers: [] as HTMLElement[], label };
}

/** On screen as a landing: wholly in the band, or (taller than it) its top edge in it. */
function landedVisibly(a: ReturnType<typeof answer>, el: HTMLElement): boolean {
  const top = a.top(el);
  const bottom = a.bottom(el);
  if (bottom - top > a.dockTop - PANE_TOP) return top >= PANE_TOP - 1 && top < a.dockTop;
  return top >= PANE_TOP - 1 && bottom <= a.dockTop + 4;
}

beforeEach(() => {
  resetDeckAnswerWalk();
  Object.assign(panelWindow, { focused: true, grantOnAsk: true, asks: 0 });
});
afterEach(() => {
  ringListener?.abort();
  ringListener = null;
});

const SHAPES = WALK_RULES.flatMap((rule) =>
  WALK_DOCKS.map((dock) => ({ name: `${rule ?? "no glide"}, dock ${dock}`, rule, dock }))
);

describe("the ring on the bubble itself, ring and page focus together", () => {
  it.each(SHAPES)("$name: Down lands on a section on screen, then walks out with no stop twice", ({ rule, dock }) => {
    const a = answer(rule, dock);
    steamRing(a.bubble);
    const walk = walkAnswer(a as unknown as ShapedAnswer, "down", 20);
    expect(walk.stops[1]).toMatch(/^section/);
    expect(walk.problems).toEqual([]);
    expect(new Set(walk.stops).size).toBe(walk.stops.length);
    expect(walk.yielded).toBe(true);
  });

  /*
   * Up from the bubble itself never steps into a section (by design: Up arriving on the bubble is on its
   * way out to the turn header). Each press scrolls the panel up with the ring on the whole bubble until
   * the answer's top is on screen, then leaves: never a dead press, never a loop.
   */
  it.each(SHAPES)("$name: Up scrolls the answer back to its top and leaves, no dead press", ({ rule, dock }) => {
    const a = answer(rule, dock);
    steamRing(a.bubble);
    const walk = walkAnswer(a as unknown as ShapedAnswer, "up", 20);
    expect(walk.problems).toEqual([]);
    expect(walk.yielded).toBe(true);
    expect(a.top(a.bubble)).toBeGreaterThanOrEqual(PANE_TOP - 9);
  });

  it("a re-render replaces the section holding the ring and Steam falls back to the bubble: Down still lands", () => {
    const a = answer("top", 290);
    a.land(a.stops[3]!);
    steamRing(a.stops[3]!);
    // React rebuilds the section: the old element goes, a new one takes its place and its registry slot.
    const fresh = a.stops[3]!.cloneNode() as HTMLDivElement;
    fresh.getBoundingClientRect = a.stops[3]!.getBoundingClientRect;
    a.stops[3]!.replaceWith(fresh);
    a.stops[3] = fresh;
    registerAnswerStop("turn-1", 3, fresh);
    a.bubble.focus(); // Steam's fallback: the nearest focusable ancestor
    a.bubble.classList.add("gpfocus");

    expect(a.down()).toBe(true);
    expect(document.querySelector(".gpfocus")).toBe(fresh);
    expect(landedVisibly(a, fresh)).toBe(true);
  });
});

describe("the ring on the bubble itself while the panel's page has lost the browser's focus", () => {
  it.each(SHAPES)("$name: Down puts the ring on a section on screen, and the walk goes on to the end", ({ rule, dock }) => {
    const a = answer(rule, dock);
    const { ring } = steamRing(a.bubble);
    panelWindow.focused = false; // back from Quick Settings: the split state

    const seen: string[] = [a.label(ring())];
    let yielded = false;
    for (let press = 1; press <= 20; press += 1) {
      const before = ring();
      const scrollBefore = a.pane.scrollTop;
      if (!a.down()) {
        yielded = true;
        break;
      }
      const now = ring()!;
      // Never a dead press: the ring moves, or the panel does.
      expect(now !== before || a.pane.scrollTop !== scrollBefore, `press ${press} dead on ${a.label(now)}`).toBe(true);
      if (now !== before) {
        expect(a.label(now)).toMatch(/^section/);
        expect(landedVisibly(a, now), `press ${press}: ${a.label(now)} not on screen`).toBe(true);
        seen.push(a.label(now));
      }
    }
    expect(seen[1]).toMatch(/^section/);
    expect(new Set(seen).size).toBe(seen.length);
    expect(yielded).toBe(true);
    expect(panelWindow.asks).toBe(1);
  });

  it("when the panel's window will not take the focus back, Down is handed on, never claimed and dead", () => {
    const a = answer("top", 290);
    const { ring } = steamRing(a.bubble);
    panelWindow.focused = false;
    panelWindow.grantOnAsk = false;

    // Declined here, so the bubble's own Down goes on to the row under the answer, by Steam's own transfer.
    expect(a.down()).toBe(false);
    expect(ring()).toBe(a.bubble);
    expect(a.down()).toBe(false);
  });
});
