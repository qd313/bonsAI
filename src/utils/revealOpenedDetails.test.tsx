/**
 * Title: Opening Show details brings the details into view above the dock
 * Purpose: Pin the fix for plan 70 flow 4.2 (docs/test-evidence/plan70-F4-SHOW-DETAILS.json and
 *          plan70-F4-SHOW-DETAILS-opened-behind-dock.png): A on "Show details" opened the details
 *          under the notes block with their tab row at y 617, behind the dock (top y 600), and the
 *          view did not move, so the only visible change was the words turning into "Hide details".
 * Used for: chatPanelScroll.ts's revealBelowKeeping and buildDetailsPanelElement.tsx's tab row.
 * Does not: Prove the fix on the Deck (see the commit for the check it owes).
 */
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { revealBelowKeeping } from "./chatPanelScroll";
import { buildDetailsPanelElement } from "./buildDetailsPanelElement";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

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
