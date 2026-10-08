/**
 * Title: The chip ladder holding the ring comes out from behind the dock
 * Purpose: Pin the fix for the roadmap bug "Show details' chip ladder hides under the question box"
 *          (plan64-DETAILS-LADDER-01-try2.json: the ringed ladder read 33% to 67% visible at several
 *          steps) and the same sighting in plan 72 free play (plan72-Z-FREEPLAY.json finding 1: the
 *          ladder's bottom at 652 against a dock top of 586, 67% visible, on "Chip 6 of 6").
 * Used for: ContextChipLadder.tsx, using chatPanelScroll.ts's revealBelowKeeping.
 * Solves: Stepping between its chips changes what the ladder shows (the open chip's details
 *         grow or shrink underneath) with no focus event on the ladder for the dock lift to
 *         answer (since plan 79 the ring moves chip to chip, inside it). The ladder scrolls itself
 *         clear when it takes the ring, keeping its own top (the chip row) on screen. It does NOT
 *         scroll again for a step (2026-10-08: scrolling for every step moved the whole answer on
 *         every press; ContextChipLadder.stillRow.test.tsx holds the row still). Scrolling only;
 *         it never moves the ring.
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
  it("the ring arriving scrolls the ladder clear of the dock (the measured 284-652 against 586)", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    place(ladder, pane, 284, 652);
    ringOn(ladder);

    fireEvent.focus(ladder);
    act(() => {
      vi.runAllTimers();
    });

    expect(ladder.getBoundingClientRect().bottom).toBeLessThanOrEqual(DOCK_TOP);
    expect(ladder.getBoundingClientRect().top).toBeGreaterThanOrEqual(PANE_TOP);
    expect(ladder.classList.contains("gpfocus")).toBe(true);
  });

  it("a ladder taller than the room above the dock keeps its chip row on screen", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    place(ladder, pane, 300, 1000);
    ringOn(ladder);

    fireEvent.focus(ladder);
    act(() => {
      vi.runAllTimers();
    });

    expect(ladder.getBoundingClientRect().top).toBeGreaterThanOrEqual(PANE_TOP);
    expect(ladder.getBoundingClientRect().top).toBeLessThan(PANE_TOP + 20);
  });

  it("a step between the chips leaves the pane where it is, even with the ladder behind the dock", () => {
    const pane = deckPane();
    const ladder = mountLadder(pane);
    place(ladder, pane, 284, 652);
    ringOn(ladder);

    act(() => {
      (ladderProps().onMoveDown as () => boolean)();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(pane.scrollTop).toBe(START_SCROLL);
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
