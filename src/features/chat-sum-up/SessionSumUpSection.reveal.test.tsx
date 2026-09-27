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

/*
 * Steam's transfer, stood in for: jsdom has no nav nodes, so `takeNavFocus` is replaced by a spy
 * each test scripts (what Steam would do when the card's node takes the ring). Every other export
 * of the registry is the real one.
 */
const nav = vi.hoisted(() => ({ take: vi.fn((_id: string) => false) }));
vi.mock("../../utils/navFocusRegistry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/navFocusRegistry")>()),
  takeNavFocus: (id: string) => nav.take(id),
}));

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
  nav.take.mockReset();
  nav.take.mockImplementation(() => false);
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the summary card when Sum up finishes", () => {
  /*
   * Plan 72, the maintainer's call (job E). Measured before it (plan72-F-SUMUP.json, a 144-entry
   * chat): with the ring left on the button, the 475 px card got only the 471 px between the button
   * and the dock, so its last 10 px sat behind the dock. The room from the pane's top to the dock
   * holds the card alone, so the ring now moves onto the new card and the card comes fully clear.
   */
  it("hands Steam's ring to the new card through the card's nav node, then the card comes clear (136-611)", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    /* While the summary is being written: the busy button, no card. */
    const { container, rerender } = render(section(sumUpState({ summingUp: true, summingUpSeconds: 3 })), {
      container: host,
    });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    place(button, pane, 96, 130);
    ringOn(button);
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBe(START_SCROLL);

    /* Steam fills the new card's node a moment after it mounts: the first try finds nothing. */
    let nodeReady = false;
    nav.take.mockImplementation((id: string) => {
      if (id !== "session-summary-card" || !nodeReady) return false;
      const card = container.querySelector(".bonsai-sumup-card")!;
      ringOn(card);
      fireEvent.focus(card);
      return true;
    });

    /* The job finishes with the ring still on the button. */
    rerender(section(sumUpState({ summary: SUMMARY, canSumUp: true })));
    const card = container.querySelector(".bonsai-sumup-card")!;
    expect(card).toBeTruthy();
    place(card, pane, 136, 611);
    expect(nav.take).toHaveBeenCalledWith("session-summary-card");
    expect(button.classList.contains("gpfocus")).toBe(true);

    nodeReady = true;
    act(() => {
      vi.runAllTimers();
    });
    expect(card.classList.contains("gpfocus")).toBe(true);
    expect(bottom(card)).toBeLessThanOrEqual(DOCK_TOP);
    expect(top(card)).toBeGreaterThanOrEqual(PANE_TOP);
    /* Once the ring has moved, the remaining tries stop. */
    const calls = nav.take.mock.calls.length;
    act(() => {
      vi.runAllTimers();
    });
    expect(nav.take.mock.calls.length).toBe(calls);
  });

  it("still hands the ring over when the summary arrives a render after the job ends (two updates, as on the Deck)", () => {
    /*
     * plan72-F6-SUMUP.json and plan72-F7-SUMUP.json: on the Deck the ring stayed on the button, twice
     * per build. The job's end and its summary can reach this section in two separate updates; the
     * hand-off must wait for the card instead of giving up when the job ends with no summary yet.
     */
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container, rerender } = render(section(sumUpState({ summingUp: true, summingUpSeconds: 3 })), {
      container: host,
    });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    place(button, pane, 96, 130);
    ringOn(button);
    nav.take.mockImplementation((id: string) => {
      if (id !== "session-summary-card") return false;
      ringOn(container.querySelector(".bonsai-sumup-card")!);
      return true;
    });

    /* Update 1: the job has ended, the summary is not here yet. */
    rerender(section(sumUpState({ summingUp: false })));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    /* Update 2: the summary arrives, and with it the card. */
    rerender(section(sumUpState({ summary: SUMMARY, canSumUp: true })));
    const card = container.querySelector(".bonsai-sumup-card")!;
    place(card, pane, 136, 611);
    act(() => {
      vi.runAllTimers();
    });
    expect(nav.take).toHaveBeenCalledWith("session-summary-card");
    expect(card.classList.contains("gpfocus")).toBe(true);
  });

  it("keeps trying until Steam's ring is really on the card, not until the transfer says yes", () => {
    /* On the Deck a node's TakeFocus can report success before it has moved anything. */
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const { container, rerender } = render(section(sumUpState({ summingUp: true, summingUpSeconds: 3 })), {
      container: host,
    });
    const button = container.querySelector(".bonsai-sumup-btn")!;
    place(button, pane, 96, 130);
    ringOn(button);
    let calls = 0;
    nav.take.mockImplementation((id: string) => {
      if (id !== "session-summary-card") return false;
      calls += 1;
      /* The first two "succeed" without moving the ring; the third really moves it. */
      if (calls >= 3) ringOn(container.querySelector(".bonsai-sumup-card")!);
      return true;
    });
    rerender(section(sumUpState({ summary: SUMMARY, canSumUp: true })));
    const card = container.querySelector(".bonsai-sumup-card")!;
    place(card, pane, 136, 611);
    act(() => {
      vi.runAllTimers();
    });
    expect(calls).toBeGreaterThanOrEqual(3);
    expect(card.classList.contains("gpfocus")).toBe(true);
  });

  it("leaves the ring alone when Steam's ring went elsewhere during the wait, even with the button's browser focus", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    const elsewhere = document.createElement("button");
    pane.appendChild(elsewhere);
    nav.take.mockImplementation(() => true);
    const { container, rerender } = render(section(sumUpState({ summingUp: true, summingUpSeconds: 3 })), {
      container: host,
    });
    const button = container.querySelector(".bonsai-sumup-btn") as HTMLElement;
    place(button, pane, 96, 130);
    /* The browser's focus says "button"; Steam's ring says "elsewhere". The ring wins. */
    button.setAttribute("tabindex", "-1");
    button.focus();
    ringOn(elsewhere);

    rerender(section(sumUpState({ summary: SUMMARY, canSumUp: true })));
    act(() => {
      vi.runAllTimers();
    });
    expect(nav.take).not.toHaveBeenCalledWith("session-summary-card");
    expect(elsewhere.classList.contains("gpfocus")).toBe(true);
  });

  it("does not take the ring when the card was already there (opened from the note under an answer)", () => {
    const pane = deckPane();
    const host = document.createElement("div");
    pane.appendChild(host);
    nav.take.mockImplementation(() => true);
    const { container, rerender } = render(section(sumUpState({ summary: SUMMARY })), { container: host });
    ringOn(container.querySelector(".bonsai-sumup-btn")!);
    rerender(section(sumUpState({ summary: SUMMARY, questionsAfterSummary: 1 })));
    act(() => {
      vi.runAllTimers();
    });
    expect(nav.take).not.toHaveBeenCalledWith("session-summary-card");
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
