/**
 * Title: Arriving on a folded tab: the page starts at its top, and the ring lands on something that exists
 * Purpose: Pin what happens after a real tab switch, once the new tab is drawn (plan 92, T0c): the pane that
 *          holds the tab is put back to its top, so the whole tab is in view and the first section line is on
 *          screen. Measured on the Deck's own screen 2026-10-12 (plan92-P92-FOLD-KEEPS-PLACE): Steam keeps the
 *          pane where it was, 408 px down, and brings it back 330 px down, the first line off screen.
 *          The ring (after Steam's own shoulder switch): Steam sends it back to the control it was last on in
 *          the tab, which is gone once every section is closed (the Deck left it on a "Terse mode" toggle's old
 *          place, and on Main's "Retry same prompt"; on 2026-10-12 it came back on the LAST line twice, a ring
 *          Steam had placed inside the tab). A ring Steam placed on arrival is not the person's: until the
 *          person presses something, the first section line has it; after a press, nothing moves it. A person
 *          who came by the bar keeps the ring where it is.
 * Used for: foldedTabArrival.ts.
 * Does not: Know when a switch happened (the shell does: useBonsaiPluginShell.foldedSwitch.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerNavFocus, resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";

import { scheduleFoldedTabArrival } from "./foldedTabArrival";
import { notePersonPress } from "./foldedTabsStore";

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

/** A further section line in the same body, as Steam would have it. */
function drawLine(body: HTMLElement, id: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "bonsai-fold-line";
  line.setAttribute("data-bonsai-fold-line", id);
  body.appendChild(line);
  return line;
}

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

  it("the ring already on the first line is left alone", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    dom.body.querySelector(".bonsai-fold-line")!.classList.add("gpfocus");
    const take = registerLine("ollama", null);
    scheduleFoldedTabArrival("ollama", { ring: true });
    vi.advanceTimersByTime(400);
    expect(take).not.toHaveBeenCalled();
  });

  it("Steam drops the ring on the LAST line at arrival: it ends on the first line", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const first = dom.body.querySelector<HTMLElement>(".bonsai-fold-line")!;
    const last = drawLine(dom.body, "models");
    last.classList.add("gpfocus");
    registerLine("ollama", first);
    scheduleFoldedTabArrival("ollama", { ring: true });
    expect(document.querySelector(".gpfocus")).toBe(first);
  });

  it("Steam drops the ring on the last line a moment AFTER the first look: the later looks bring it back", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const first = dom.body.querySelector<HTMLElement>(".bonsai-fold-line")!;
    const last = drawLine(dom.body, "models");
    registerLine("ollama", first);
    scheduleFoldedTabArrival("ollama", { ring: true });
    vi.advanceTimersByTime(10);
    first.classList.remove("gpfocus");
    last.classList.add("gpfocus");
    vi.advanceTimersByTime(30);
    expect(document.querySelector(".gpfocus")).toBe(first);
    vi.advanceTimersByTime(30);
    first.classList.remove("gpfocus");
    last.classList.add("gpfocus");
    vi.advanceTimersByTime(300);
    expect(document.querySelector(".gpfocus")).toBe(first);
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

  it("a person's Down after arrival is never pulled back", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const first = dom.body.querySelector<HTMLElement>(".bonsai-fold-line")!;
    const second = drawLine(dom.body, "kb");
    const take = registerLine("ollama", first);
    scheduleFoldedTabArrival("ollama", { ring: true });
    vi.advanceTimersByTime(20);
    /* The person presses Down: the line's move handler notes it, and the ring is on the second line. */
    notePersonPress();
    first.classList.remove("gpfocus");
    second.classList.add("gpfocus");
    vi.advanceTimersByTime(400);
    expect(take).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".gpfocus")).toBe(second);
  });

  it("a press made before the switch does not count as a press after it", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    notePersonPress();
    const take = registerLine("ollama", dom.body.querySelector<HTMLElement>(".bonsai-fold-line"));
    scheduleFoldedTabArrival("ollama", { ring: true });
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

describe("a switch from the floating button (the ring was on a button that is now hidden)", () => {
  const registerBar = () => {
    const take = vi.fn(() => true);
    registerNavFocus("tab-bar", { current: { TakeFocus: take } });
    return take;
  };

  it("to a tab that is not folded: the ring goes to the tab bar", () => {
    drawPane({ tab: "main", scrollTop: 0, folded: false });
    const dock = document.createElement("div");
    dock.className = "bonsai-fold-dock";
    const button = document.createElement("button");
    button.className = "gpfocus";
    dock.appendChild(button);
    document.body.appendChild(dock);
    const bar = registerBar();
    scheduleFoldedTabArrival("main", { ring: true, barIfNotFolded: true });
    vi.advanceTimersByTime(400);
    expect(bar).toHaveBeenCalledTimes(1);
    dock.remove();
  });

  it("to a tab that is not folded, with the ring already somewhere real: nothing moves it", () => {
    drawPane({ tab: "main", scrollTop: 0, folded: false });
    const real = document.createElement("button");
    real.className = "gpfocus";
    document.body.appendChild(real);
    const bar = registerBar();
    scheduleFoldedTabArrival("main", { ring: true, barIfNotFolded: true });
    vi.advanceTimersByTime(400);
    expect(bar).not.toHaveBeenCalled();
    real.remove();
  });

  it("to a folded tab: the first section line, not the bar", () => {
    const dom = drawPane({ tab: "ollama", scrollTop: 0 });
    const take = registerLine("ollama", dom.body.querySelector<HTMLElement>(".bonsai-fold-line"));
    const bar = registerBar();
    scheduleFoldedTabArrival("ollama", { ring: true, barIfNotFolded: true });
    vi.advanceTimersByTime(400);
    expect(take).toHaveBeenCalledTimes(1);
    expect(bar).not.toHaveBeenCalled();
  });
});
