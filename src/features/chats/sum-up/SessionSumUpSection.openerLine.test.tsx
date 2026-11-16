/**
 * Title: The Session tab's scrolls on appearing keep "Hide details" on screen when the ring reads as nothing
 *
 * Purpose: Plan 104, beside lane F1's fix to the details panel's own reveal. On the Deck's own screen, B then A with
 *          the Session tab showing left the "Hide details" line holding the ring above the pane (top -22 and -39,
 *          pane top 52; workshop:test-evidence/plan103-P103-DETAILS-STRIP-01.json and -try2.json), because a scroll
 *          that brings something out from behind the dock held back only by where the ring read, and skipped that
 *          limit when the ring read as nothing. The Session tab's greyed button line and its summary card each run
 *          such a scroll when they appear, in the same frames as the panel's. Here, with the ring read as nothing,
 *          as the page, or as the dock, they hold back by the line that opened the panel instead; with the ring read
 *          as a control in the chat they hold back by it, as before (the note under an answer, Sum up after a
 *          summary arrives).
 * Used for: SessionSumUpSection.tsx (keepOnScreen, the reveals on the reason line and the card).
 * Does not: run the panel's own reveal (lane F1's, buildDetailsPanelElement.tsx) or model Steam's ring: the ring is
 *           whatever `uiGamepadFocusElement` answers, set per test. The pane, the dock, the scroll, the line and the
 *           panel's top are the evidence's numbers; where the strip, the button, its reason line and the card sit
 *           inside the panel is laid out from plan 81's measured gaps (plan81-P81-M-L-SUMUP-try2.json) and the card's
 *           246.5-point height (SessionSumUpSection.cardFit.test.tsx), not measured on that screen.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionSumUpSection } from "./SessionSumUpSection";
import type { ChatSumUpState } from "./chatSumUpModel";
import { registerReplyStop } from "../../../shared/dpad/replyStopRegistry";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

/** What Steam's ring reads as in a test; undefined leaves the real lookup in place. */
const ringRead: { current: HTMLElement | null | undefined } = { current: undefined };
vi.mock("../../../shared/dpad/uiDocument", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../shared/dpad/uiDocument")>();
  return { ...real, uiGamepadFocusElement: () => (ringRead.current === undefined ? real.uiGamepadFocusElement() : ringRead.current) };
});

type Box = readonly [number, number];
/** A screen at one scroll: the pane, the dock, and boxes in screen y at that scroll; each box follows the scroll. */
type Shot = { paneTop: number; paneBottom: number; dockTop: number; scrollTop: number };

function screenAt(at: Shot) {
  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 5000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: at.paneBottom - at.paneTop, configurable: true });
  pane.scrollTop = at.scrollTop;
  pane.getBoundingClientRect = () => ({ top: at.paneTop, bottom: at.paneBottom }) as DOMRect;
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: at.dockTop, bottom: at.paneBottom }) as DOMRect;
  const place = (el: HTMLElement, [top, bottom]: Box) => {
    el.getBoundingClientRect = () => ({ top: top - (pane.scrollTop - at.scrollTop), bottom: bottom - (pane.scrollTop - at.scrollTop) }) as DOMRect;
    return el;
  };
  const host = document.createElement("div");
  pane.append(host, dock);
  document.body.appendChild(pane);
  return { pane, dock, host, place, top: (el: Element) => el.getBoundingClientRect().top };
}

/** The "Show details" line, registered as the reply row registers it, placed before `host` on the page. */
function openerLine(s: ReturnType<typeof screenAt>, box: Box): HTMLElement {
  const line = s.place(document.createElement("div"), box);
  line.className = "bonsai-chat-details-divider";
  s.pane.insertBefore(line, s.host);
  registerReplyStop("show-details", line);
  return line;
}

const SUMMARY = {
  text: "- Hollow Knight: charms explained\n- Brotato: surviving wave 18",
  covers_through_turn_id: "t26",
  turns_covered: 26,
  oldest_turns_unread: 0,
  hidden_notes_left_out: 0,
  written_at: new Date().toISOString(),
  seconds: 30,
  model: "test",
};

/** "Sum up again", greyed with its reason line, and the card: the long test chat after its summary. */
function sessionTab(host: HTMLElement) {
  const state: ChatSumUpState = {
    summary: SUMMARY,
    canSumUp: false,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: () => {},
    stopSumUp: () => {},
  };
  const { container } = render(
    <SessionSumUpSection state={state} answerInFlight={false} onMoveUpFromButton={() => true} onMoveDownPastSection={() => false} />,
    { container: host },
  );
  const q = (sel: string) => container.querySelector<HTMLElement>(sel)!;
  return { button: q(".bonsai-sumup-btn"), reason: q(".bonsai-sumup-reason"), card: q(".bonsai-sumup-card") };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetUiDocument();
});

afterEach(() => {
  vi.useRealTimers();
  ringRead.current = undefined;
  registerReplyStop("show-details", null);
  document.body.innerHTML = "";
});

/*
 * The reopen, from the evidence lane F1 pins: the line, the scroll and the Session panel's top. Inside the panel
 * (from its top): the tab strip, then the button 44 to 76.7, its reason line 81.9 to 113.9, the card from 119.5.
 */
const REOPEN: Array<[string, Shot & { line: Box; panelTop: number }]> = [
  /* plan103-P103-DETAILS-STRIP-01.json: the line at 282-297, scroll 410; the Deck then put it at -22. */
  ["the Deck's own screen", { paneTop: 52, paneBottom: 454, dockTop: 351, scrollTop: 410, line: [282, 297], panelTop: 365 }],
  /* plan104-P104-M-REOPEN.json: the line at 560, scroll 138, the Session panel from 652. */
  ["the external screen", { paneTop: 52, paneBottom: 766, dockTop: 662, scrollTop: 138, line: [560, 575], panelTop: 652 }],
];

describe.each(REOPEN)("B then A on the Session tab, on %s: the section's own scrolls as it appears", (_name, at) => {
  function reopen(ring: (s: ReturnType<typeof screenAt>, line: HTMLElement) => HTMLElement | null) {
    const s = screenAt(at);
    const line = openerLine(s, at.line);
    ringRead.current = ring(s, line);
    const tab = sessionTab(s.host);
    const p = at.panelTop;
    s.place(tab.button, [p + 44, p + 76.7]);
    s.place(tab.reason, [p + 81.9, p + 113.9]);
    s.place(tab.card, [p + 119.5, p + 119.5 + 246.5]);
    act(() => void vi.runAllTimers());
    return { ...s, ...tab, line };
  }

  it.each([
    ["nothing", () => null],
    ["the page itself, outside the pane", () => document.body],
    ["the dock, which never scrolls", (s: ReturnType<typeof screenAt>) => s.dock],
  ] as const)("with the ring read as %s, the line that opened the panel stays inside the pane", (_read, ring) => {
    const s = reopen(ring);
    expect(s.top(s.line)).toBeGreaterThanOrEqual(at.paneTop + 8);
    /* The card still comes up as far as the line allows. */
    expect(s.pane.scrollTop).toBeGreaterThan(at.scrollTop);
  });

  it("with the ring read right, on the line, the line ends in the same place", () => {
    const s = reopen((_s, line) => line);
    const withRingOnLine = s.top(s.line);
    document.body.innerHTML = "";
    registerReplyStop("show-details", null);
    const nothing = reopen(() => null);
    expect(nothing.top(nothing.line)).toBe(withRingOnLine);
  });
});

describe("with the ring read as a control in the chat, the section keeps that control, as before", () => {
  it("opened from the note under an answer: the note holding the ring stays on screen, though the line sits lower", () => {
    /* SessionSumUpSection.reveal.test.tsx's note case (pane 88-766, dock 600), with the line drawn between the note
       and the panel. Held back by the line instead, the note would end at 56, above the pane. */
    const s = screenAt({ paneTop: 88, paneBottom: 766, dockTop: 600, scrollTop: 489 });
    const note = s.place(document.createElement("div"), [200, 230]);
    s.pane.insertBefore(note, s.host);
    openerLine(s, [240, 255]);
    ringRead.current = note;
    const tab = sessionTab(s.host);
    s.place(tab.button, [510, 542]);
    s.place(tab.card, [556, 974]);
    act(() => void vi.runAllTimers());
    expect(s.top(note)).toBeGreaterThanOrEqual(88);
    expect(s.pane.scrollTop).toBe(489 + 104);
  });

  it("a summary arriving with the ring on Sum up again: the card comes up until the button meets the pane's top", () => {
    /* SessionSumUpSection.deckPlace.test.tsx's numbers (pane top 88, dock 290.2, the button at 204.1), with the line on
       screen above the button. The button ends at 96, as the Deck measured; held back by the line it would stop at 170. */
    const s = screenAt({ paneTop: 88, paneBottom: 454, dockTop: 290.2, scrollTop: 393 });
    openerLine(s, [130, 145]);
    const tab = sessionTab(s.host);
    s.place(tab.button, [204.1, 236.8]);
    s.place(tab.reason, [242, 274]);
    s.place(tab.card, [279.6, 542.5]);
    ringRead.current = tab.button;
    act(() => void vi.runAllTimers());
    expect(s.top(tab.button)).toBeCloseTo(96, 5);
  });
});
