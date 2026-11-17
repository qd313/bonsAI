/**
 * Title: The one count every Left dead end shares (plan 105, lane C5)
 * Purpose: Pin leftEdge.ts: the first and second Left in a row at a dead end hold, the third goes to Steam; what
 *          starts a run again (any other button heard at the panel's page, a finger, the panel hiding, another place
 *          or control, about two seconds with no Left, a slider step, the hand-off itself); and that a held-down
 *          Left counts once and never leaves. Every press is first heard at the panel's page the way Steam sends it
 *          (`vgp_onbuttondown` with its repeat mark), and the move handler is handed nothing of its own, since on the
 *          Deck it is not known whether Steam hands it the press.
 * Used for: src/shared/dpad/leftEdge.ts.
 * Does not: Press through a component: the screen-level tests (the ask strip, the chat, the tabs) do that.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LEFT_PRESSES_TO_LEAVE,
  LEFT_RUN_PAUSE_MS,
  leftActedInPlace,
  leftAtEdge,
  leftEdgePress,
  type LeftEdgeOutcome,
} from "./leftEdge";
import { rememberUiDocument, resetUiDocument } from "./uiDocument";
import { DIR_LEFT, DIR_RIGHT, hearPress } from "../../test-harness/steamLeftPress";

let page: Document;

/** One fresh (or held-down) Left at `place`: heard at the page, then the dead end's own handler. */
function left(place = "paperclip", repeat = false): LeftEdgeOutcome {
  hearPress(page, DIR_LEFT, repeat);
  return leftEdgePress(place);
}
const lefts = (n: number, place?: string) => Array.from({ length: n }, () => left(place));

beforeEach(() => {
  page = document.implementation.createHTMLDocument("panel");
  rememberUiDocument(page.body);
});
afterEach(() => {
  vi.useRealTimers();
  resetUiDocument();
});

describe("a run of Lefts at a dead end", () => {
  it("holds on the first and second Left and hands the third to Steam", () => {
    expect(LEFT_PRESSES_TO_LEAVE).toBe(3);
    expect(lefts(3)).toEqual(["held", "held", "leave"]);
  });

  it("starts again after the hand-off, so a stray Left after coming back holds", () => {
    expect(lefts(4)).toEqual(["held", "held", "leave", "held"]);
  });

  it("reads true while it holds and false on the hand-off, for a dead end's own handler", () => {
    hearPress(page, DIR_LEFT);
    expect(leftAtEdge("chip")).toBe(true);
    hearPress(page, DIR_LEFT);
    expect(leftAtEdge("chip")).toBe(true);
    hearPress(page, DIR_LEFT);
    expect(leftAtEdge("chip")).toBe(false);
  });
});

describe("what starts a run again", () => {
  /* Up, Down, Right, A, B, X, Y, View, Menu, the shoulders and the triggers. */
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14])("button %i between Lefts", (button) => {
    lefts(2);
    hearPress(page, button);
    expect(lefts(3)).toEqual(["held", "held", "leave"]);
  });

  it("a button it does not know (a stick touch, a back button, a pad click) neither counts nor breaks the run", () => {
    lefts(2);
    for (const button of [17, 19, 20, 23, 26]) hearPress(page, button);
    expect(left()).toBe("leave");
  });

  it("a finger on the screen", () => {
    lefts(2);
    page.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(lefts(3)).toEqual(["held", "held", "leave"]);
  });

  it("the panel hiding or showing", () => {
    lefts(2);
    page.dispatchEvent(new Event("visibilitychange"));
    expect(lefts(3)).toEqual(["held", "held", "leave"]);
  });

  it("about two seconds with no Left, so two old Lefts and a stray one never leave; a quicker third still does", () => {
    vi.useFakeTimers();
    lefts(2);
    vi.advanceTimersByTime(LEFT_RUN_PAUSE_MS + 1);
    expect(lefts(3)).toEqual(["held", "held", "leave"]);
    lefts(2);
    vi.advanceTimersByTime(LEFT_RUN_PAUSE_MS - 200);
    expect(left()).toBe("leave");
  });

  it("a Left at another place starts at one", () => {
    lefts(2, "paperclip");
    expect(lefts(3, "answer-section")).toEqual(["held", "held", "leave"]);
  });

  it("a Left with Steam's ring on another control starts at one", () => {
    const a = page.body.appendChild(page.createElement("div"));
    const b = page.body.appendChild(page.createElement("div"));
    a.className = "gpfocus";
    lefts(2, "day-line");
    a.className = "";
    b.className = "gpfocus";
    expect(lefts(3, "day-line")).toEqual(["held", "held", "leave"]);
  });

  it("a slider step (a Left that changed something in place)", () => {
    lefts(2);
    leftActedInPlace();
    expect(lefts(3)).toEqual(["held", "held", "leave"]);
  });

  it("a Right does not count as a Left", () => {
    left();
    hearPress(page, DIR_RIGHT);
    expect(left()).toBe("held");
  });
});

describe("Left held down", () => {
  it("counts the press once; its repeats hold and never leave, however long it is held", () => {
    expect(left()).toBe("held");
    for (let i = 0; i < 40; i++) expect(left("paperclip", true)).toBe("repeat");
    expect(left()).toBe("held");
    expect(left()).toBe("leave");
  });

  it("goes by the press the handler is handed, when Steam hands it one", () => {
    left();
    hearPress(page, DIR_LEFT);
    expect(leftEdgePress("paperclip", { detail: { button: DIR_LEFT, is_repeat: true } })).toBe("repeat");
    expect(leftEdgePress("paperclip", { detail: { button: DIR_LEFT, is_repeat: false } })).toBe("held");
    expect(leftEdgePress("paperclip", { detail: { button: DIR_LEFT, is_repeat: false } })).toBe("leave");
  });

  it("does not count a Left nobody heard, except the very first on a new page (heard before anything could listen)", () => {
    expect(leftEdgePress("paperclip")).toBe("held");
    for (let i = 0; i < 10; i++) expect(leftEdgePress("paperclip")).toBe("unheard");
  });

  it("tells a held-down repeat from a press it heard nothing of", () => {
    left();
    hearPress(page, DIR_LEFT, true);
    expect(leftEdgePress("paperclip")).toBe("repeat");
    expect(leftEdgePress("paperclip")).toBe("unheard");
  });
});
