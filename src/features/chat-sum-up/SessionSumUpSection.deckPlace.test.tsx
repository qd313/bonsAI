/**
 * Title: Where the summary card lands after Sum up, in the Deck's own numbers
 * Purpose: Pin the roadmap bug "The chat summary card appears behind the dock until Down is pressed" at
 *          the level the Deck check reads it: the card's box against the band between the pane's top and
 *          the dock, after it mounts and through every later re-placement, with no press. Every box here
 *          is the one plan 81 measured on the Deck's own screen (plan81-P81-M-L-SUMUP-try2.json, build
 *          afd2f444, no game): pane top 88, dock top 290.2, the ring on "Sum up this chat" at 204.1 with
 *          the pane at scroll 393, and the card mounting at 279.6-542.5, 10.6 px of it above the dock.
 * Used for: SessionSumUpSection.tsx (the card's reveal on mount, revealOnceWhenMounted in
 *           chatPanelScroll.ts) and SessionTitleOffer.tsx (Rename and Keep under the card).
 * Does not: Stand in for Steam's transfer. Steam's ring stays on the button through the whole wait, as it
 *           did on the Deck in four builds out of four; nothing here moves it except a modelled press.
 *           jsdom has no layout, so each box reads its place from the pane's scrollTop.
 */
import React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionSumUpSection } from "./SessionSumUpSection";
import type { ChatSumUpState } from "./chatSumUpModel";
import { resetUiDocument } from "../../utils/uiDocument";

/* The real stub, with each Focusable's props kept so a test can make the press Steam would make. */
const hoisted = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const Real = stubs.Focusable;
  const Capturing = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function Capturing(props, ref) {
    hoisted.props.push(props);
    return <Real {...props} ref={ref} />;
  });
  return { ...stubs, Focusable: Capturing };
});

/* plan81-P81-M-L-SUMUP-try2.json: the Deck's own screen, no game. */
const PANE_TOP = 88;
const PANE_BOTTOM = 454;
const DOCK_TOP = 290.2;
/** Steam's scroll padding at the pane's top (docs/lessons-learned.md § 3): a small stop it glides to sits here. */
const MARGIN_LINE = PANE_TOP + 116;
/** The scroll the Deck read with the ring on "Sum up this chat"; every box below is its screen y at this scroll. */
const AT = 393;
const BOX = {
  button: [204.1, 236.8],
  /* The greyed button's one line ("already summed up"), between the button and the card. */
  reason: [242, 274],
  card: [279.6, 542.5],
  /* The card's title line ("What the AI remembers" and its meta), down to where its lines begin (308.7). */
  head: [279.6, 308.7],
  offer: [542.5, 627.3],
  rename: [591.9, 618.7],
  keep: [591.9, 618.7],
} as const;
type Box = readonly [number, number];

function deckPane(): HTMLElement {
  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 3000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: PANE_BOTTOM - PANE_TOP, configurable: true });
  pane.scrollTop = AT;
  pane.getBoundingClientRect = () => ({ top: PANE_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: DOCK_TOP, bottom: PANE_BOTTOM }) as DOMRect;
  pane.appendChild(dock);
  document.body.appendChild(pane);
  return pane;
}

function place(el: Element | null, pane: HTMLElement, [top, bottom]: Box): void {
  if (!el) throw new Error("nothing to place");
  (el as HTMLElement).getBoundingClientRect = () => {
    const moved = pane.scrollTop - AT;
    return { top: top - moved, bottom: bottom - moved } as DOMRect;
  };
}

const top = (el: Element) => el.getBoundingClientRect().top;
const bottom = (el: Element) => el.getBoundingClientRect().bottom;
/** How much of `el` a person sees: the part between the pane's top and the dock. */
const visiblePx = (el: Element) => Math.max(0, Math.min(bottom(el), DOCK_TOP) - Math.max(top(el), PANE_TOP));
const whollyInBand = (el: Element) => top(el) >= PANE_TOP && bottom(el) <= DOCK_TOP;

/** Steam stamps its ring as the `gpfocus` class. */
function ringOn(el: Element): void {
  document.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
  el.classList.add("gpfocus");
}
const ring = () => document.querySelector(".gpfocus") as HTMLElement | null;

const SUMMARY = {
  text: "- Game topics include Hollow Knight\n- Player asked about boss tactics\n- No sticking point stated",
  covers_through_turn_id: "t120",
  turns_covered: 120,
  oldest_turns_unread: 64,
  hidden_notes_left_out: 0,
  written_at: new Date().toISOString(),
  seconds: 28,
  model: "test",
  suggested_title: "Hollow Knight and Game Tips",
};

function sumUpState(over: Partial<ChatSumUpState>): ChatSumUpState {
  return {
    summary: null,
    canSumUp: true,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: () => {},
    stopSumUp: () => {},
    ...over,
  };
}

let upPastButton = 0;
function section(state: ChatSumUpState): React.ReactElement {
  return (
    <SessionSumUpSection
      state={state}
      answerInFlight={false}
      onMoveUpFromButton={() => {
        upPastButton += 1;
        return true;
      }}
      onMoveDownPastSection={() => false}
    />
  );
}

/**
 * The Deck's route: the ring on the button while the summary is written (busy), then the job ends and
 * the card mounts under it. Returns the stops, placed at the measured boxes, before any frame has run.
 */
function sumUpFinishes() {
  const pane = deckPane();
  const host = document.createElement("div");
  pane.appendChild(host);
  const { container, rerender } = render(section(sumUpState({ summingUp: true, summingUpSeconds: 27 })), {
    container: host,
  });
  const button = container.querySelector(".bonsai-sumup-btn")!;
  place(button, pane, BOX.button);
  ringOn(button);
  act(() => {
    vi.runAllTimers();
  });
  expect(pane.scrollTop).toBe(AT);

  rerender(section(sumUpState({ summary: SUMMARY, canSumUp: false })));
  const q = (sel: string) => container.querySelector(sel)!;
  const stops = {
    pane,
    button: q(".bonsai-sumup-btn"),
    reason: q(".bonsai-sumup-reason"),
    card: q(".bonsai-sumup-card"),
    head: q(".bonsai-sumup-card-head"),
    offer: q(".bonsai-sumup-offer"),
    rename: container.querySelectorAll(".bonsai-sumup-offer-btn")[0]!,
    keep: container.querySelectorAll(".bonsai-sumup-offer-btn")[1]!,
  };
  expect(stops.button).toBe(button);
  expect(stops.button.getAttribute("aria-label")).toBe("Sum up again");
  /* React rewrote the button's class (greyed); Steam's own marker stays on it, as the Deck read for 38 s. */
  ringOn(stops.button);
  for (const key of ["reason", "card", "head", "offer", "rename", "keep"] as const) place(stops[key], pane, BOX[key]);
  /* Where the Deck saw the card at the moment it mounted, before anything scrolled. */
  expect(visiblePx(stops.card)).toBeCloseTo(10.6, 1);
  return stops;
}

/** What a person must see, from the first frame on: the title line and at least 60 px of the card, and the ring's button. */
function expectCardInView(s: ReturnType<typeof sumUpFinishes>, when: string): void {
  expect(top(s.card), `card top at ${when}`).toBeGreaterThanOrEqual(PANE_TOP);
  expect(whollyInBand(s.head), `title line clear of the dock at ${when}`).toBe(true);
  expect(visiblePx(s.card), `card px showing at ${when}`).toBeGreaterThanOrEqual(60);
  expect(ring(), `ring at ${when}`).toBe(s.button);
  expect(whollyInBand(s.button), `the ring's button on screen at ${when}`).toBe(true);
}

/**
 * Steam's glide after a press that moved its ring (the walk harness's rules, deckAnswerWalk.ts): "padded"
 * carries a small stop that is off the band, or wholly inside the 116 px top margin, to the margin line;
 * "top" aligns any stop not wholly in the band to the pane's top; "deck" is what this screen measured on
 * 2026-10-03: padded for a small stop (Up put the button at 204.1), top for a tall one (Down put the card at
 * 88.2). No "still" rule: the Deck glided on both landings, and nothing in this section brings a button that
 * sits above the pane back down by itself (the button only reveals its reason line below it).
 */
type SteamRule = "top" | "padded" | "deck";
function steamGlide(pane: HTMLElement, el: Element, rule: SteamRule): void {
  const r = el.getBoundingClientRect();
  const small = r.bottom - r.top < 100;
  const inside = r.top >= PANE_TOP && r.bottom <= DOCK_TOP;
  const padded = rule === "padded" || (rule === "deck" && small);
  let target: number | null = null;
  if (padded && small && (!inside || r.bottom < MARGIN_LINE - 1)) target = MARGIN_LINE;
  else if (!padded && !inside) target = PANE_TOP;
  if (target !== null) pane.scrollTop = Math.max(0, pane.scrollTop + r.top - target);
}

function propsOf(el: Element): Record<string, unknown> {
  const label = el.getAttribute("aria-label");
  const mine = hoisted.props.filter((p) => p["aria-label"] === label);
  return mine[mine.length - 1]!;
}

const HANDLER = { down: "onMoveDown", up: "onMoveUp", left: "onMoveLeft", right: "onMoveRight" } as const;

/**
 * One D-pad press as the Deck delivers it: Steam calls the ring holder's move handler; a stop the plugin
 * focused inside this one container takes the ring; Steam glides a moment later, then the plugin's own
 * settle passes run. Returns the new holder, or null when the press was left to Steam's own navigation.
 */
function press(pane: HTMLElement, dir: keyof typeof HANDLER, rule: SteamRule): HTMLElement | null {
  const from = ring()!;
  const handled = (propsOf(from)[HANDLER[dir]] as () => boolean)();
  if (!handled) return null;
  const to = document.activeElement as HTMLElement;
  if (to && to !== from && to.closest(".bonsai-sumup-btn, .bonsai-sumup-card, .bonsai-sumup-offer-btn")) ringOn(to);
  act(() => {
    vi.advanceTimersByTime(100);
  });
  steamGlide(pane, ring()!, rule);
  act(() => {
    vi.runAllTimers();
  });
  return ring();
}

beforeEach(() => {
  hoisted.props.length = 0;
  upPastButton = 0;
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("after Sum up, the card is in view above the dock with no press (Deck numbers)", () => {
  it("shows the card's title and first lines from the first frame, through 150/300/900 ms and at 2 s", () => {
    const s = sumUpFinishes();
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expectCardInView(s, "first frame");
    let now = 20;
    for (const at of [150, 300, 900, 2000]) {
      act(() => {
        vi.advanceTimersByTime(at - now);
      });
      now = at;
      expectCardInView(s, `${at} ms`);
    }
    /* The Deck's own number at the moment the card appeared (scroll 501): the card's top at 171.6, right under
       the button (96.1) and its reason line, with 118 px of the card showing. */
    expect(top(s.card)).toBeCloseTo(171.6, 0);
    expect(top(s.button)).toBeCloseTo(96, 0);
    expect(visiblePx(s.card)).toBeGreaterThan(110);
  });

  it.each([50, 400])("comes back into view when Steam pulls its ring holder back to the margin line at %i ms", (atMs) => {
    const s = sumUpFinishes();
    act(() => {
      vi.advanceTimersByTime(atMs);
    });
    /* Steam re-placing the ring holder at its 116 px line, as it does on a landing: the card drops back behind the dock. */
    steamGlide(s.pane, s.button, "padded");
    expect(top(s.button)).toBeCloseTo(MARGIN_LINE, 0);
    expect(visiblePx(s.card)).toBeLessThan(60);
    act(() => {
      vi.advanceTimersByTime(2000 - atMs);
    });
    expectCardInView(s, `2 s, after a pull-back at ${atMs} ms`);
  });
});

describe("after the card is placed, Down and Up behave (Deck numbers, Steam's glide modelled)", () => {
  it.each<SteamRule>(["top", "padded", "deck"])("walks button, card, Rename and back with no stop twice (%s)", (rule) => {
    const s = sumUpFinishes();
    act(() => {
      vi.runAllTimers();
    });
    expectCardInView(s, "rest");

    const down: Element[] = [ring()!];
    for (let i = 0; i < 6; i += 1) {
      const next = press(s.pane, "down", rule);
      if (!next) break;
      expect(down, `Down visited ${next.getAttribute("aria-label")} twice`).not.toContain(next);
      down.push(next);
      if (next === s.card) {
        /* Taller than the band: entered from its top edge, which must show with its title. */
        expect(whollyInBand(s.head)).toBe(true);
        expect(visiblePx(s.card)).toBeGreaterThanOrEqual(60);
        /* The Deck: one Down put the card at 88.2-351.1. */
        if (rule === "deck") expect(top(s.card)).toBeCloseTo(88.2, 0);
      } else {
        expect(whollyInBand(next), `${next.getAttribute("aria-label")} visible`).toBe(true);
      }
    }
    expect(down).toEqual([s.button, s.card, s.rename]);

    expect(press(s.pane, "right", rule)).toBe(s.keep);
    expect(whollyInBand(s.keep)).toBe(true);
    expect(press(s.pane, "left", rule)).toBe(s.rename);

    const up: Element[] = [ring()!];
    for (let i = 0; i < 6; i += 1) {
      const before = ring();
      const next = press(s.pane, "up", rule);
      if (!next || next === before) break;
      expect(up, `Up visited ${next.getAttribute("aria-label")} twice`).not.toContain(next);
      up.push(next);
      expect(visiblePx(next), `${next.getAttribute("aria-label")} showing`).toBeGreaterThanOrEqual(
        next === s.card ? 60 : bottom(next) - top(next) - 0.5,
      );
    }
    /* The Deck: Up from the card put "Sum up again" back at 204.1-236.8 (scroll 393). */
    if (rule === "deck") expect(top(s.button)).toBeCloseTo(204.1, 0);
    expect(up).toEqual([s.rename, s.card, s.button]);
    expect(upPastButton).toBe(1);
  });
});
