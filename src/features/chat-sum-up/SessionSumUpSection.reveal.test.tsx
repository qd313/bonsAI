/**
 * Title: The summary card, and the greyed button's reason line, come out from behind the dock
 * Purpose: Pin the fix for the roadmap bug "The chat summary card appears behind the dock until
 *          Down is pressed" (plan 68 Deck pass, rows SUMUP-02 and SUMUP-03, and again 2026-09-26):
 *          after Sum up finished, the card's top sat at 597 against the dock's top at 600; opened
 *          from the note under a summarised answer, only 44 of its 418 px showed; and the greyed
 *          button's two-line reason line sat at 573-604, 4 px under the dock.
 * Used for: SessionSumUpSection.tsx, using chatPanelScroll.ts's revealBelowKeeping (the same
 *           scroll plan 70 gave Show details).
 * Does not: Prove it on the Deck. jsdom has no layout, so every box here reads its place from the
 *           pane's scrollTop, the way the real screen would move it.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionSumUpSection } from "./SessionSumUpSection";
import type { ChatSumUpState } from "./chatSumUpModel";
import { resetUiDocument } from "../../utils/uiDocument";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

const DOCK_TOP = 600;
const PANE_TOP = 88;
const START_SCROLL = 489;

/* The Deck's shape: pane 88-766, dock top 600 (plan 70's Show details evidence uses the same). */
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

function top(el: Element): number {
  return el.getBoundingClientRect().top;
}
function bottom(el: Element): number {
  return el.getBoundingClientRect().bottom;
}

/** Steam stamps its ring as the `gpfocus` class; move it the way Steam would. */
function ringOn(el: Element): void {
  document.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
  el.classList.add("gpfocus");
}

const SUMMARY = {
  text: "- Beat the first boss\n- Found the double jump",
  covers_through_turn_id: "t4",
  turns_covered: 4,
  oldest_turns_unread: 0,
  hidden_notes_left_out: 0,
  written_at: new Date().toISOString(),
  seconds: 12,
  model: "test",
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

function section(state: ChatSumUpState): React.ReactElement {
  return (
    <SessionSumUpSection
      state={state}
      answerInFlight={false}
      onMoveUpFromButton={() => true}
      onMoveDownPastSection={() => false}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the summary card when Sum up finishes", () => {
  it("scrolls itself out from behind the dock, keeping the button and the ring where they are", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    /* While the summary is being written: the busy button, no card. */
    const { container, rerender } = render(section(sumUpState({ summingUp: true, summingUpSeconds: 3 })), {
      container: host,
    });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    place(button, pane, 540, 572);
    ringOn(button);
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBe(START_SCROLL);

    /* The job finishes: the card mounts just under the dock's top edge (597, as measured). */
    rerender(section(sumUpState({ summary: SUMMARY, canSumUp: true })));
    const card = container.querySelector(".bonsai-sumup-card")!;
    expect(card).toBeTruthy();
    place(card, pane, 597, 1015);
    const focusedBefore = document.activeElement;
    act(() => {
      vi.runAllTimers();
    });

    expect(bottom(card)).toBeLessThanOrEqual(DOCK_TOP);
    expect(top(button)).toBeGreaterThanOrEqual(PANE_TOP);
    /* Scrolling only: the ring and the browser's focus are untouched. */
    expect(button.classList.contains("gpfocus")).toBe(true);
    expect(document.activeElement).toBe(focusedBefore);
  });

  it("scrolls only once for the same card, so a later render does not pull the view back", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container, rerender } = render(section(sumUpState({ summary: SUMMARY })), { container: host });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    const card = container.querySelector(".bonsai-sumup-card")!;
    place(button, pane, 540, 572);
    place(card, pane, 597, 1015);
    ringOn(button);
    act(() => {
      vi.runAllTimers();
    });
    const settled = pane.scrollTop;
    expect(settled).toBeGreaterThan(START_SCROLL);

    pane.scrollTop = START_SCROLL; /* the person scrolls back up */
    rerender(section(sumUpState({ summary: SUMMARY, questionsAfterSummary: 1 })));
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBe(START_SCROLL);
  });
});

describe("the summary card opened from the note under a summarised answer", () => {
  it("comes fully into view once the ring reaches the Sum up button", () => {
    const pane = deckPane();
    const note = document.createElement("div");
    note.className = "bonsai-chat-summary-note";
    place(note, pane, 200, 230);
    pane.appendChild(note);
    ringOn(note);
    const host = document.createElement("div");
    pane.appendChild(host);

    /* The Session tab mounts with the card already there; only 44 of its 418 px show. */
    const { container } = render(section(sumUpState({ summary: SUMMARY })), { container: host });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    const card = container.querySelector(".bonsai-sumup-card")!;
    place(button, pane, 510, 542);
    place(card, pane, 556, 974);

    /* First frame: the ring is still on the note, which must not leave the top. */
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(top(note)).toBeGreaterThanOrEqual(PANE_TOP);

    /* The note's opener then hands the ring to Sum up (focusSumUpButtonWhenMounted). */
    ringOn(button);
    act(() => {
      vi.runAllTimers();
    });
    expect(bottom(card)).toBeLessThanOrEqual(DOCK_TOP);
    expect(top(button)).toBeGreaterThanOrEqual(PANE_TOP);
  });
});

describe("the greyed Sum up button's reason line", () => {
  it("stays above the dock when the ring lands on the button", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container } = render(section(sumUpState({ canSumUp: false })), { container: host });
    /* Mounted out of view further down; nothing to do yet. */
    act(() => {
      vi.runAllTimers();
    });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    const reason = container.querySelector(".bonsai-sumup-reason")!;
    expect(reason.textContent).toMatch(/nothing to sum up/);
    /* Where the dock lift leaves the button: its reason line at 573-604, dock at 600. */
    place(button, pane, 540, 567);
    place(reason, pane, 573, 604);

    ringOn(button);
    fireEvent.focus(button);
    act(() => {
      vi.runAllTimers();
    });
    expect(bottom(reason)).toBeLessThanOrEqual(DOCK_TOP);
    expect(top(button)).toBeGreaterThanOrEqual(PANE_TOP);
  });
});

describe("the summary card taking the ring", () => {
  /*
   * Plan 72 free play (plan72-Z-FREEPLAY.json finding 2): Down from "Sum up again" put the ring on
   * the card while a third of it sat behind the question box. The one-time reveal on mount had been
   * held back by the ring above it; once the card holds the ring itself, nothing above needs keeping.
   */
  it("scrolls fully above the dock", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container } = render(section(sumUpState({ summary: SUMMARY })), { container: host });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    const card = container.querySelector(".bonsai-sumup-card")!;
    /* The ring on the button near the top of the pane holds the mount reveal back. */
    place(button, pane, 96, 128);
    place(card, pane, 330, 720);
    ringOn(button);
    act(() => {
      vi.runAllTimers();
    });
    expect(bottom(card)).toBeGreaterThan(DOCK_TOP);

    ringOn(card);
    fireEvent.focus(card);
    act(() => {
      vi.runAllTimers();
    });
    expect(bottom(card)).toBeLessThanOrEqual(DOCK_TOP);
    expect(top(card)).toBeGreaterThanOrEqual(PANE_TOP);
    expect(card.classList.contains("gpfocus")).toBe(true);
  });

  it("a card taller than the room keeps its top on screen", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container } = render(section(sumUpState({ summary: SUMMARY })), { container: host });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    const card = container.querySelector(".bonsai-sumup-card")!;
    place(button, pane, 96, 128);
    place(card, pane, 330, 1100);
    ringOn(button);
    act(() => {
      vi.runAllTimers();
    });

    ringOn(card);
    fireEvent.focus(card);
    act(() => {
      vi.runAllTimers();
    });
    expect(top(card)).toBeGreaterThanOrEqual(PANE_TOP);
    expect(top(card)).toBeLessThan(PANE_TOP + 20);
  });
});
