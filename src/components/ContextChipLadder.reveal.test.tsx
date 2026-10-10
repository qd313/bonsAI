/**
 * Title: The chip ladder holding the ring comes out from behind the dock
 * Purpose: Pin the fix for the roadmap bug "Show details' chip ladder hides under the question box"
 *          (plan64-DETAILS-LADDER-01-try2.json: the ringed ladder read 33% to 67% visible at several
 *          steps) and the same sighting in plan 72 free play (plan72-Z-FREEPLAY.json finding 1: the
 *          ladder's bottom at 652 against a dock top of 586, 67% visible, on "Chip 6 of 6").
 * Used for: ContextChipLadder.tsx, using chipLadderPlacement.ts.
 * Solves: Stepping between its chips changes what the ladder shows (the open chip's details
 *         grow or shrink underneath) with no focus event on the ladder for the dock lift to
 *         answer (since plan 79 the ring moves chip to chip, inside it). The ladder scrolls the
 *         open chip's box clear when it takes the ring, keeping the chip on screen, and again for a
 *         step only when the new box's end would be behind the dock (plan 87 call 6; a step whose box
 *         is readable moves nothing, ContextChipLadder.stillRow.test.tsx). Scrolling only; it never
 *         moves the ring.
 * Does not: Prove it on the Deck. jsdom has no layout, so every box reads its place from the pane's
 *           scrollTop, the way the real screen would move it.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextChipLadder } from "./ContextChipLadder";
import type { ContextChip, TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

const DOCK_TOP = 586;
const PANE_TOP = 88;
const START_SCROLL = 1200;

function deckPane(): HTMLElement {
  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 4000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: 678, configurable: true });
  pane.scrollTop = START_SCROLL;
  pane.getBoundingClientRect = () => ({ top: PANE_TOP, bottom: 766 }) as DOMRect;
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: DOCK_TOP, bottom: 766 }) as DOMRect;
  pane.appendChild(dock);
  document.body.appendChild(pane);
  return pane;
}

function place(el: Element, pane: HTMLElement, top: number, bottom: number): void {
  (el as HTMLElement).getBoundingClientRect = () => {
    const moved = pane.scrollTop - START_SCROLL;
    return { top: top - moved, bottom: bottom - moved } as DOMRect;
  };
}

/* Place the ladder, its chips (one row, 24 px tall, at its top) and the open chip's box under them. */
function placeLadder(ladder: HTMLElement, pane: HTMLElement, top: number, bottom: number): void {
  place(ladder, pane, top, bottom);
  ladder.querySelectorAll(".bonsai-chip-ladder-chip").forEach((c) => place(c, pane, top, top + 24));
  place(ladder.querySelector(".bonsai-chip-ladder-hold")!.previousElementSibling!, pane, top + 32, bottom);
}

function boxOf(ladder: HTMLElement): DOMRect {
  return (ladder.querySelector(".bonsai-chip-ladder-hold")!.previousElementSibling as HTMLElement).getBoundingClientRect();
}

function ringOn(el: Element): void {
  document.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
  el.classList.add("gpfocus");
}

function chip(id: string, label: string): ContextChip {
  return { id, rank: 1, label, attached: true, tier_class: "", body: { title: label, paths: [], bullets: [] } };
}

const SNAPSHOT = {
  context_chips: [chip("kb", "Keyword + meaning"), chip("routing", "Routed gemma3"), chip("developer", "Developer")],
} as unknown as TransparencySnapshot;

/* Since plan 79 each chip is its own stop and carries the moves and B; the open chip holds them
   for the tests below (the ladder itself no longer has any). */
const OPEN_CHIP = "bonsai-chip-ladder-chip bonsai-chip-ladder-chip--active";

function ladderProps(): Record<string, unknown> {
  const matches = hoisted.focusableProps.filter((p) => p.className === OPEN_CHIP);
  return matches[matches.length - 1]!;
}

function mountLadder(pane: HTMLElement): HTMLElement {
  const host = document.createElement("div");
  pane.appendChild(host);
  const { container } = render(<ContextChipLadder snapshot={SNAPSHOT} onMoveDownFromLadder={() => true} />, {
    container: host,
  });
  return container.querySelector(".bonsai-chip-ladder") as HTMLElement;
}

beforeEach(() => {
  hoisted.focusableProps = [];
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the chip ladder holding the ring stays above the dock", () => {
  it("the ring arriving scrolls the open chip's box clear of the dock (the measured 284-652 against 586)", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    placeLadder(ladder, pane, 284, 652);
    ringOn(ladder);

    fireEvent.focus(ladder);
    act(() => {
      vi.runAllTimers();
    });

    expect(boxOf(ladder).bottom).toBeLessThanOrEqual(DOCK_TOP);
    expect(ladder.getBoundingClientRect().top).toBeGreaterThanOrEqual(PANE_TOP);
    expect(ladder.classList.contains("gpfocus")).toBe(true);
  });

  it("a box taller than the room above the dock keeps its chip on screen, below Steam's own top margin", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    placeLadder(ladder, pane, 300, 1000);
    ringOn(ladder);

    fireEvent.focus(ladder);
    act(() => {
      vi.runAllTimers();
    });

    const chip = ladder.querySelector(".bonsai-chip-ladder-chip")!.getBoundingClientRect();
    expect(chip.top).toBeGreaterThanOrEqual(PANE_TOP);
    expect(chip.bottom).toBeGreaterThanOrEqual(PANE_TOP + 116);
    expect(boxOf(ladder).bottom).toBeGreaterThan(DOCK_TOP);
  });

  it("a step whose box already ends above the dock leaves the pane where it is", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    placeLadder(ladder, pane, 284, 500);
    ringOn(ladder);

    act(() => {
      (ladderProps().onMoveDown as () => boolean)();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(pane.scrollTop).toBe(START_SCROLL);
  });

  it("a step whose box would end behind the dock scrolls just enough to end it above the dock", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    placeLadder(ladder, pane, 284, 652);
    ringOn(ladder);

    act(() => {
      (ladderProps().onMoveDown as () => boolean)();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(pane.scrollTop).toBe(START_SCROLL + 652 - (DOCK_TOP - 6));
    expect(boxOf(ladder).bottom).toBe(DOCK_TOP - 6);
  });

  it("leaves the view alone while the ring is somewhere else", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    place(ladder, pane, 400, 640);
    const elsewhere = document.createElement("div");
    pane.appendChild(elsewhere);
    ringOn(elsewhere);

    act(() => {
      (ladderProps().onMoveRight as () => boolean)();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(pane.scrollTop).toBe(START_SCROLL);
  });
});
