/**
 * Title: Opening Show details brings the details into view above the dock
 * Purpose: Pin the fix for plan 70 flow 4.2 (workshop:test-evidence/plan70-F4-SHOW-DETAILS.json and
 *          plan70-F4-SHOW-DETAILS-opened-behind-dock.png): A on "Show details" opened the details
 *          under the notes block with their tab row at y 617, behind the dock (top y 600), and the
 *          view did not move, so the only visible change was the words turning into "Hide details".
 *          Plan 104 F1 part 1 (workshop:test-evidence/plan103-P103-DETAILS-STRIP-01.json and -try2.json, 4 of 6):
 *          B then A on the Session tab left the "Hide details" line holding the ring above the pane (top -22 and
 *          -39, pane top 52), because the reveal only held back by the ring and skipped that limit when the ring
 *          read as nothing. Today's build kept the ring readable 5 of 5 (plan104-P104-M-REOPEN.json), so the case
 *          is pinned here with the ring read as nothing, in the Deck's own-screen numbers from that run. And the
 *          second opinion's consult 4: A on the summed-up note (above the line) opens the panel, and the note holding
 *          the ring must stay on screen too, with the panel's page focused and without its focus.
 * Used for: chatPanelScroll.ts's revealBelowKeeping and buildDetailsPanelElement.tsx's tab row.
 * Does not: Prove the fix on the Deck (see the commit for the check it owes), or model Steam's own scroll after the
 *           panel appears. The ring is whatever `uiGamepadFocusElement` answers: set per test, or read off the
 *           panel's own page (lostFocusPanel.tsx) in the summed-up note's cases.
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { revealBelowKeeping } from "../../../shared/dpad/chatPanelScroll";
import { registerReplyStop } from "../../../shared/dpad/replyStopRegistry";
import { mountPanelPage, type PanelPage } from "../../../test-harness/lostFocusPanel";
import { buildDetailsPanelElement } from "./buildDetailsPanelElement";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

/** What Steam's ring reads as in a test; undefined leaves the real lookup in place (the ring marker on the page). */
const ringRead: { current: HTMLElement | null | undefined } = { current: undefined };
vi.mock("../../../shared/dpad/uiDocument", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../shared/dpad/uiDocument")>();
  return {
    ...real,
    uiGamepadFocusElement: () => (ringRead.current === undefined ? real.uiGamepadFocusElement() : ringRead.current),
  };
});

/* The Deck's shape from the evidence: pane 88-766, dock top 600, scrollTop 489 of 824. */
function deckPane() {
  const pane = document.createElement("div");
  pane.className = "_TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 1502, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: 678, configurable: true });
  pane.scrollTop = 489;
  pane.getBoundingClientRect = () => ({ top: 88, bottom: 766 }) as DOMRect;
  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: 600, bottom: 766 }) as DOMRect;
  pane.appendChild(dock);
  document.body.appendChild(pane);
  return pane;
}

function box(top: number, bottom: number): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
  ringRead.current = undefined;
  registerReplyStop("show-details", null);
  vi.useRealTimers();
});

describe("revealBelowKeeping", () => {
  it("scrolls an opened panel out from behind the dock", () => {
    const pane = deckPane();
    const panel = box(617, 760);
    pane.appendChild(panel);
    expect(revealBelowKeeping(panel, null)).toBe(true);
    expect(pane.scrollTop).toBe(489 + (760 + 8 - 600));
  });

  it("never scrolls the control holding the ring off the top", () => {
    const pane = deckPane();
    const hideDetails = box(150, 170);
    const panel = box(617, 1100);
    pane.append(hideDetails, panel);
    revealBelowKeeping(panel, hideDetails);
    expect(pane.scrollTop).toBe(489 + (150 - 88 - 8));
  });

  it("never scrolls the panel's own top off the top", () => {
    const pane = deckPane();
    const panel = box(400, 1600);
    pane.appendChild(panel);
    revealBelowKeeping(panel, null);
    expect(pane.scrollTop).toBe(489 + (400 - 88 - 8));
  });

  it("leaves a panel that already clears the dock alone", () => {
    const pane = deckPane();
    const panel = box(300, 500);
    pane.appendChild(panel);
    expect(revealBelowKeeping(panel, null)).toBe(false);
    expect(pane.scrollTop).toBe(489);
  });
});

describe("the newest answer's details panel", () => {
  it("scrolls itself into view once, when it opens", () => {
    vi.useFakeTimers();
    const pane = deckPane();
    const host = document.createElement("div");
    host.getBoundingClientRect = () => ({ top: 617, bottom: 760 }) as DOMRect;
    pane.appendChild(host);
    const panel = () =>
      buildDetailsPanelElement({
        turnKey: "turn-1",
        querySlot: () => null,
        snapshot: null,
        devDiagnostics: null,
        isNewest: true,
        detailsTab: "answer",
        setDetailsTab: () => {},
        sessionLiveTurn: null,
        archivedTurns: [],
        sessionHighlightTurnId: null,
        setSessionHighlightTurnId: () => {},
        setTransparencyDetailsOpen: () => {},
      });
    const { rerender } = render(panel(), { container: host });
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBe(489 + (760 + 8 - 600));

    /* A later render of the same open panel does not scroll again. */
    pane.scrollTop = 100;
    rerender(panel());
    act(() => {
      vi.runAllTimers();
    });
    expect(pane.scrollTop).toBe(100);
  });
});

/**
 * One screen from the evidence: the pane, the dock, where the pane was scrolled, the "Show details" line and the
 * reopened Session panel, in screen y at that scroll. Every box follows the pane's scrollTop afterwards.
 */
type ReopenScreen = { paneTop: number; paneBottom: number; dockTop: number; scrollTop: number; line: [number, number]; panel: [number, number] };

const REOPEN_SCREENS: Array<[string, ReopenScreen]> = [
  /* plan103-P103-DETAILS-STRIP-01.json: the line at 282-297, scroll 410; the Deck put it at -22 (scroll 715). */
  ["the Deck's own screen", { paneTop: 52, paneBottom: 454, dockTop: 351, scrollTop: 410, line: [282, 297], panel: [365, 1100] }],
  /* plan104-P104-M-REOPEN.json: the line at 560, scroll 138, the Session panel 582 tall from 652. */
  ["the external screen", { paneTop: 52, paneBottom: 766, dockTop: 662, scrollTop: 138, line: [560, 575], panel: [652, 1234] }],
];

/**
 * The pane, the dock (with a chip in it), the summed-up note under the answer (`NOTE_BOX`, above the reply row), the
 * "Show details" line (registered as the reply stop, as the reply row does), the panel's host and a control below
 * the line, drawn into `doc` (the panel's own page when a test models it).
 */
function reopenedScreen(at: ReopenScreen, doc: Document = document, parent: HTMLElement = document.body) {
  const pane = doc.createElement("div");
  pane.className = "_TabContentsScroll";
  Object.defineProperty(pane, "scrollHeight", { value: 5000, configurable: true });
  Object.defineProperty(pane, "clientHeight", { value: at.paneBottom - at.paneTop, configurable: true });
  pane.scrollTop = at.scrollTop;
  pane.getBoundingClientRect = () => ({ top: at.paneTop, bottom: at.paneBottom }) as DOMRect;
  const dock = doc.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => ({ top: at.dockTop, bottom: at.paneBottom }) as DOMRect;
  const dockChip = doc.createElement("div");
  dockChip.setAttribute("tabindex", "0");
  dockChip.getBoundingClientRect = () => ({ top: at.dockTop + 10, bottom: at.dockTop + 40 }) as DOMRect;
  dock.appendChild(dockChip);
  const moving = ([top, bottom]: [number, number]) => {
    const el = doc.createElement("div");
    el.getBoundingClientRect = () => {
      const moved = pane.scrollTop - at.scrollTop;
      return { top: top - moved, bottom: bottom - moved } as DOMRect;
    };
    return el;
  };
  const note = moving([at.line[0] - 132, at.line[0] - 102]);
  note.className = "bonsai-chat-summary-note";
  note.setAttribute("tabindex", "0");
  const line = moving(at.line);
  line.className = "bonsai-chat-details-divider";
  const host = moving(at.panel);
  const below = moving([at.panel[0] + 40, at.panel[0] + 70]);
  pane.append(note, line, host, below, dock);
  parent.appendChild(pane);
  registerReplyStop("show-details", line);
  return { pane, dockChip, note, line, host, below };
}

function openSessionPanel(host: HTMLElement) {
  render(
    buildDetailsPanelElement({
      turnKey: "turn-1",
      querySlot: () => null,
      snapshot: null,
      devDiagnostics: null,
      isNewest: true,
      detailsTab: "session",
      setDetailsTab: () => {},
      sessionLiveTurn: null,
      archivedTurns: [],
      sessionHighlightTurnId: null,
      setSessionHighlightTurnId: () => {},
      setTransparencyDetailsOpen: () => {},
    }),
    { container: host },
  );
  act(() => {
    vi.runAllTimers();
  });
}

describe.each(REOPEN_SCREENS)("B then A on the Session tab, on %s", (_screen, at) => {
  it.each([
    ["nothing", () => null],
    ["the page itself, outside the pane", () => document.body],
    ["the pane itself", (s: ReturnType<typeof reopenedScreen>) => s.pane],
    ["a chip in the dock", (s: ReturnType<typeof reopenedScreen>) => s.dockChip],
    ["a control below the line, as inside the opened panel", (s: ReturnType<typeof reopenedScreen>) => s.below],
  ])("with the ring read as %s, the line that opened the panel stays inside the pane", (_read, read) => {
    vi.useFakeTimers();
    const s = reopenedScreen(at);
    ringRead.current = read(s);
    openSessionPanel(s.host);
    expect(s.line.getBoundingClientRect().top).toBeGreaterThanOrEqual(at.paneTop);
    /* Held 8 px under the pane's top, the same place the ring's own limit puts it when the ring reads right. */
    expect(s.line.getBoundingClientRect().top).toBe(at.paneTop + 8);
    expect(s.pane.scrollTop).toBeGreaterThan(at.scrollTop);
  });

  it("with the ring read right, on the line, the panel opens to the same place", () => {
    vi.useFakeTimers();
    const { line, host } = reopenedScreen(at);
    ringRead.current = line;
    openSessionPanel(host);
    expect(line.getBoundingClientRect().top).toBe(at.paneTop + 8);
  });
});

/*
 * The second opinion's consult 4: A on the summed-up note opens Show details on the Session tab. The note sits above
 * the reply row, so above the line; held back by the line alone, the panel's scroll carried it to -72 (the Deck's own
 * screen) while the ring was still on it. Without the page's focus the hop on to "Sum up" moves only the page's focus
 * and the ring stays on the note, so it must stay on screen. Steam's ring is read off the panel's own page here
 * (lostFocusPanel.tsx: the ring marker follows a plain focus() only while the page has the browser's focus).
 */
describe.each([
  ["with the page's focus", true],
  ["with the page's focus gone, the hop on to Sum up moving only the page's focus", false],
])("A on the summed-up note opens the Session tab, on the Deck's own screen, %s", (_label, focused) => {
  let page: PanelPage | null = null;
  afterEach(() => {
    cleanup();
    page?.remove();
    page = null;
  });

  it("after the hop on to Sum up, the control holding the ring stays inside the pane: the note without focus, the line's limit with it", () => {
    vi.useFakeTimers();
    page = mountPanelPage();
    const s = reopenedScreen(REOPEN_SCREENS[0]![1], page.doc, page.host);
    page.steamMove(s.note);
    page.setFocused(focused);
    /* The hop on to "Sum up" below the line (focusSumUpButtonWhenMounted), as a plain focus: it carries the ring
       only while the page has the browser's focus. */
    s.below.setAttribute("tabindex", "0");
    s.below.focus();
    const ring = page.ring()!;
    expect(ring).toBe(focused ? s.below : s.note);
    openSessionPanel(s.host);
    expect(ring.getBoundingClientRect().top, "the ring's control under the pane's top").toBeGreaterThanOrEqual(52);
    /* Without focus the note, above the line, is the limit; with it the ring is below the line and the line is. */
    expect((focused ? s.line : s.note).getBoundingClientRect().top).toBe(52 + 8);
  });

  it("with the ring still on the note when the panel appears (the hop not made yet), the note stays inside the pane", () => {
    vi.useFakeTimers();
    page = mountPanelPage();
    const s = reopenedScreen(REOPEN_SCREENS[0]![1], page.doc, page.host);
    page.steamMove(s.note);
    page.setFocused(focused);
    openSessionPanel(s.host);
    expect(page.ring()).toBe(s.note);
    expect(s.note.getBoundingClientRect().top).toBe(52 + 8);
    expect(s.line.getBoundingClientRect().top).toBeLessThan(351);
  });
});
