/**
 * Title: Arriving on a folded tab: the page starts at its top (and, further down, the ring lands somewhere real)
 * Purpose: Pin what happens after a real tab switch, once the new tab is drawn (plan 92, T0c): the pane that
 *          holds the tab is put back to its top, so the whole tab is in view and the first section line is on
 *          screen. Measured on the Deck's own screen 2026-10-12 (plan92-P92-FOLD-KEEPS-PLACE): Steam keeps the
 *          pane where it was, 408 px down, and brings it back 330 px down, the first line off screen.
 * Used for: foldedTabArrival.ts.
 * Does not: Know when a switch happened (the shell does: useBonsaiPluginShell.foldedSwitch.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scheduleFoldedTabArrival } from "./foldedTabArrival";

let cleanupDom: () => void = () => {};

/** Steam's pane (`TabContentsScroll`), with a scroll position a test can set and read, around one tab body. */
function drawPane(opts: { tab: string; scrollTop: number; folded?: boolean }) {
  let top = opts.scrollTop;
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll_abc123";
  Object.defineProperty(pane, "scrollTop", { configurable: true, get: () => top, set: (v: number) => (top = v) });
  const body = document.createElement("div");
  body.setAttribute("data-bonsai-tab-body", opts.tab);
  if (opts.folded !== false) {
    const line = document.createElement("div");
    line.className = "bonsai-fold-line";
    line.setAttribute("data-bonsai-fold-line", "where");
    body.appendChild(line);
  }
  pane.appendChild(body);
  document.body.appendChild(pane);
  cleanupDom = () => pane.remove();
  return { pane, body, scrollTop: () => top };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanupDom();
  cleanupDom = () => {};
  vi.useRealTimers();
});

describe("arriving on a folded tab, the page starts at its top", () => {
  it("a pane left 330 px down is put back to 0 at once", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 330.7 });
    scheduleFoldedTabArrival("ollama");
    expect(dom.scrollTop()).toBe(0);
  });

  it("and again if Steam puts the page back a moment later (after the next frame, and at 80 ms)", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 330.7 });
    scheduleFoldedTabArrival("ollama");
    dom.pane.scrollTop = 120;
    vi.advanceTimersByTime(100);
    expect(dom.scrollTop()).toBe(0);
  });

  it("waits for the tab to be drawn when it is not there yet", () => {
    scheduleFoldedTabArrival("ollama");
    const dom = drawPane({ tab: "ollama", scrollTop: 330.7 });
    vi.advanceTimersByTime(100);
    expect(dom.scrollTop()).toBe(0);
  });

  it("leaves a tab that is not folded alone", () => {
    const dom = drawPane({ tab: "settings", scrollTop: 330.7, folded: false });
    scheduleFoldedTabArrival("settings");
    vi.advanceTimersByTime(300);
    expect(dom.scrollTop()).toBe(330.7);
  });

  it("leaves another tab's pane alone", () => {
    const dom = drawPane({ tab: "settings", scrollTop: 330.7 });
    scheduleFoldedTabArrival("ollama");
    vi.advanceTimersByTime(300);
    expect(dom.scrollTop()).toBe(330.7);
  });

  it("stops when cancelled (the person moved on to another tab)", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const cancel = scheduleFoldedTabArrival("ollama");
    cancel();
    dom.pane.scrollTop = 200;
    vi.advanceTimersByTime(300);
    expect(dom.scrollTop()).toBe(200);
  });

  it("does not drag the page back after the settling time (a person scrolling later is left alone)", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    scheduleFoldedTabArrival("ollama");
    vi.advanceTimersByTime(400);
    dom.pane.scrollTop = 200;
    vi.advanceTimersByTime(1000);
    expect(dom.scrollTop()).toBe(200);
  });
});
