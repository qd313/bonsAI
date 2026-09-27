/**
 * Title: The "What went wrong?" chips come out from behind the dock when they appear
 * Purpose: Pin the fix for what the Deck showed on 2026-09-27
 *          (docs/test-evidence/plan72-A5b-BEFORE-SAVEROW-CHIPS.json): after A on "Not really", the
 *          chips appeared but the page did not scroll; with the ring on the first chip, the other
 *          four (y 589.8 to 701.8) sat behind the dock (top 599.6).
 * Used for: buildReplyActionsElement.tsx, using chatPanelScroll.ts's revealBelowKeepingAsItSettles
 *           (the summary card's fix).
 * Does not: Prove it on the Deck. jsdom has no layout, so each box reads its place from the pane's
 *           scrollTop, the way the real screen would move it.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildReplyActionsElement } from "./buildReplyActionsElement";
import { resetUiDocument } from "./uiDocument";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const DOCK_TOP = 600;
const PANE_TOP = 88;
const START_SCROLL = 400;

function deckPane(): HTMLElement {
  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 3000, configurable: true });
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

/** Give `el` a place on screen at START_SCROLL that moves up as the pane scrolls down. */
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

function actions(rating: "up" | "down" | null) {
  return buildReplyActionsElement({
    replyKey: "live",
    rating,
    onRate: () => {},
    showFeedback: true,
    onChip: () => {},
    onToggleTransparency: () => {},
  })!;
}

/* The Deck's places from the evidence, once the chips have mounted (rows as today's two). */
function placeChipBlock(container: HTMLElement, pane: HTMLElement) {
  const rows = container.querySelectorAll(".bonsai-chat-reply-actions-row--chips");
  expect(rows.length).toBe(2);
  place(rows[0]!, pane, 549.8, 581.8);
  place(rows[1]!, pane, 589.8, 621.8);
  return rows[1]!;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the 'What went wrong?' chips after 'Not really'", () => {
  it("scroll into view above the dock by themselves, keeping Not really on screen", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container, rerender } = render(actions(null), { container: host });
    const notReally = container.querySelector('[aria-label="Mark reply not helpful"]')!;
    place(notReally, pane, 487, 519);
    ringOn(notReally);

    /* A on Not really: the rating lands first, then the chip rows mount under it. */
    rerender(actions("down"));
    const lastRow = placeChipBlock(container, pane);
    const focusedBefore = document.activeElement;
    act(() => {
      vi.runAllTimers();
    });

    expect(lastRow.getBoundingClientRect().bottom).toBeLessThanOrEqual(DOCK_TOP);
    expect(notReally.getBoundingClientRect().top).toBeGreaterThanOrEqual(PANE_TOP);
    /* Scrolling only: the ring and the browser's focus stay where they were. */
    expect(notReally.classList.contains("gpfocus")).toBe(true);
    expect(document.activeElement).toBe(focusedBefore);
  });

  it("scroll only once, so a later render does not pull the view back", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container, rerender } = render(actions(null), { container: host });
    const notReally = container.querySelector('[aria-label="Mark reply not helpful"]')!;
    place(notReally, pane, 487, 519);
    ringOn(notReally);
    rerender(actions("down"));
    placeChipBlock(container, pane);
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBeGreaterThan(START_SCROLL);

    pane.scrollTop = START_SCROLL; /* the person scrolls back up */
    rerender(actions("down"));
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBe(START_SCROLL);
  });

  it("do not move the view when a chat opens on a reply already rated down, ring elsewhere", () => {
    const pane = deckPane();
    const chatRow = document.createElement("div");
    pane.appendChild(chatRow);
    ringOn(chatRow);
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container } = render(actions("down"), { container: host });
    placeChipBlock(container, pane);
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBe(START_SCROLL);
  });
});
