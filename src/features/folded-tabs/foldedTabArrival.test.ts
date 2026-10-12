/**
 * Title: Arriving on a folded tab: the page starts at its top, and the ring lands on something that exists
 * Purpose: Pin what happens after a real tab switch, once the new tab is drawn (plan 92, T0c): the pane that
 *          holds the tab is put back to its top, so the whole tab is in view and the first section line is on
 *          screen. Measured on the Deck's own screen 2026-10-12 (plan92-P92-FOLD-KEEPS-PLACE): Steam keeps the
 *          pane where it was, 408 px down, and brings it back 330 px down, the first line off screen.
 *          The ring (after Steam's own shoulder switch): Steam sends it back to the control it was last on in
 *          the tab, which is gone once every section is closed (the Deck left it on a "Terse mode" toggle's old
 *          place, and on Main's "Retry same prompt"). If it is on nothing inside the tab's body, the first
 *          section line takes it; if it is already inside, or the person came by the bar, nothing moves it.
 * Used for: foldedTabArrival.ts.
 * Does not: Know when a switch happened (the shell does: useBonsaiPluginShell.foldedSwitch.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerNavFocus, resetNavFocusRegistry } from "../../utils/navFocusRegistry";

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
  resetNavFocusRegistry();
  document.querySelectorAll(".gpfocus").forEach((e) => e.remove());
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

/** The first section line's nav node, as Steam fills it in: TakeFocus puts the ring on the line. */
function registerLine(tab: string, line: HTMLElement | null) {
  const takeFocus = vi.fn(() => {
    document.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
    line?.classList.add("gpfocus");
    return true;
  });
  registerNavFocus(`fold-line:${tab}:where`, { current: { TakeFocus: takeFocus } });
  return takeFocus;
}

describe("after Steam's shoulder switch, the ring is on something that exists", () => {
  it("the ring on nothing: the first section line takes it, and only once", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const take = registerLine("ollama", dom.body.querySelector<HTMLElement>(".bonsai-fold-line"));
    scheduleFoldedTabArrival("ollama", { ring: true });
    vi.advanceTimersByTime(400);
    expect(take).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".gpfocus")).toBe(dom.body.querySelector(".bonsai-fold-line"));
  });

  it("the ring left on the tab it came from (outside this body): the first section line takes it", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const elsewhere = document.createElement("button");
    elsewhere.className = "gpfocus";
    document.body.appendChild(elsewhere);
    const take = registerLine("ollama", dom.body.querySelector<HTMLElement>(".bonsai-fold-line"));
    scheduleFoldedTabArrival("ollama", { ring: true });
    expect(take).toHaveBeenCalledTimes(1);
    elsewhere.remove();
  });

  it("the ring already inside the body is left alone", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    dom.body.querySelector(".bonsai-fold-line")!.classList.add("gpfocus");
    const take = registerLine("ollama", null);
    scheduleFoldedTabArrival("ollama", { ring: true });
    vi.advanceTimersByTime(400);
    expect(take).not.toHaveBeenCalled();
  });

  it("a person who comes by the bar keeps the ring where it is", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const take = registerLine("ollama", dom.body.querySelector<HTMLElement>(".bonsai-fold-line"));
    scheduleFoldedTabArrival("ollama");
    vi.advanceTimersByTime(400);
    expect(take).not.toHaveBeenCalled();
  });

  it("Steam sending the ring to a gone control after the first look: the later looks catch it", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const line = dom.body.querySelector<HTMLElement>(".bonsai-fold-line")!;
    const take = registerLine("ollama", line);
    scheduleFoldedTabArrival("ollama", { ring: true });
    line.classList.remove("gpfocus");
    vi.advanceTimersByTime(300);
    expect(take).toHaveBeenCalledTimes(2);
  });

  it("a tab that is not folded gets no ring", () => {
    drawPane({ tab: "settings", scrollTop: 0, folded: false });
    const take = registerLine("settings", null);
    scheduleFoldedTabArrival("settings", { ring: true });
    vi.advanceTimersByTime(400);
    expect(take).not.toHaveBeenCalled();
  });

  it("a person who moved on within the first moments is never pulled back", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const line = dom.body.querySelector<HTMLElement>(".bonsai-fold-line")!;
    const take = registerLine("ollama", line);
    scheduleFoldedTabArrival("ollama", { ring: true });
    vi.advanceTimersByTime(20);
    const second = document.createElement("div");
    second.className = "bonsai-fold-line gpfocus";
    second.setAttribute("data-bonsai-fold-line", "kb");
    dom.body.appendChild(second);
    line.classList.remove("gpfocus");
    vi.advanceTimersByTime(400);
    expect(take).toHaveBeenCalledTimes(1);
  });

  it("stops when the person moved on to another tab (cancelled)", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const take = registerLine("ollama", dom.body.querySelector<HTMLElement>(".bonsai-fold-line"));
    const cancel = scheduleFoldedTabArrival("ollama", { ring: true });
    cancel();
    document.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
    vi.advanceTimersByTime(400);
    expect(take).toHaveBeenCalledTimes(1);
  });
});
