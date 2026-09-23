import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { liftAboveDock, useDockClearanceOnFocus } from "./useDockClearanceOnFocus";

/*
 * jsdom has no layout, so the three rects the lift reads are stubbed: a 0–616 scroll pane, a dock
 * whose top is at 370 (covering the bottom 246px, the on-device number), and a focused element
 * placed by each test. What matters is the decision — lift or leave — and the two outputs: the
 * scroll-margin carrying the covered strip, and the scrollIntoView call itself.
 */
function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function makePane(opts: { dockTop?: number } = {}) {
  const scroll = document.createElement("div");
  scroll.className = "TabContentsScroll";
  scroll.getBoundingClientRect = () => rect(0, 616);

  const dock = document.createElement("div");
  dock.className = "bonsai-main-tab-dock";
  dock.getBoundingClientRect = () => rect(opts.dockTop ?? 370, 616);
  scroll.appendChild(dock);
  document.body.appendChild(scroll);

  const focusEl = (top: number, bottom: number, parent: HTMLElement = scroll) => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => rect(top, bottom);
    el.scrollIntoView = vi.fn();
    parent.appendChild(el);
    return el;
  };

  return { scroll, dock, focusEl };
}

describe("liftAboveDock", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("lifts an element sitting behind the dock, with the covered strip as its margin", () => {
    const t = makePane();
    const el = t.focusEl(400, 428); // fully inside the dock's overlay

    expect(liftAboveDock(el)).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: "end", behavior: "auto" });
    // 616 - 370 = 246 covered, plus the breathing pad.
    expect(el.style.scrollMarginBottom).toBe("252px");
  });

  it("lifts an element straddling the dock's top edge", () => {
    const t = makePane();
    const el = t.focusEl(350, 390);

    expect(liftAboveDock(el)).toBe(true);
  });

  it("leaves an element already clear of the dock alone", () => {
    const t = makePane();
    const el = t.focusEl(200, 240);

    expect(liftAboveDock(el)).toBe(false);
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  /* The dock's own controls are always visible by construction — lifting one would scroll the
     transcript underneath it for no reason. */
  it("never lifts a control inside the dock itself", () => {
    const t = makePane();
    const chip = t.focusEl(500, 530, t.dock);

    expect(liftAboveDock(chip)).toBe(false);
  });

  /* At max scroll the dock is back in normal flow below the content: nothing is covered. */
  it("does nothing when the dock is not covering the pane", () => {
    const t = makePane({ dockTop: 616 });
    const el = t.focusEl(590, 615);

    expect(liftAboveDock(el)).toBe(false);
  });

  /*
   * Inside the answer bubble scrollIntoView is a no-op: the bubble clips its overflow, which
   * swallows the scroll-margin, and Steam's pane pads its scroll edge by 80px. Measured on the Deck
   * 2026-09-06, Up from the Show details line: margins of 0 to 300px all parked the pane at the
   * same place, the section 77px behind the dock. The lift must then move the pane itself.
   */
  it("scrolls the pane by hand when scrollIntoView leaves the element covered", () => {
    const t = makePane();
    let scrollTop = 100;
    Object.defineProperty(t.scroll, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (next: number) => {
        scrollTop = next;
      },
    });
    Object.defineProperty(t.scroll, "scrollHeight", { configurable: true, get: () => 2000 });
    Object.defineProperty(t.scroll, "clientHeight", { configurable: true, get: () => 616 });
    // 200 tall, bottom 77 behind the dock's top at 370; the stubbed scrollIntoView moves nothing.
    const el = t.focusEl(247, 447);

    expect(liftAboveDock(el)).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalled();
    // 77 hidden plus the 6px pad, on top of where the pane already was.
    expect(scrollTop).toBe(183);
  });

  it("never scrolls a tall element's own top off the pane while lifting by hand", () => {
    const t = makePane();
    let scrollTop = 0;
    Object.defineProperty(t.scroll, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (next: number) => {
        scrollTop = next;
      },
    });
    Object.defineProperty(t.scroll, "scrollHeight", { configurable: true, get: () => 2000 });
    Object.defineProperty(t.scroll, "clientHeight", { configurable: true, get: () => 616 });
    // Starts 30 below the pane's top and runs 200 past the dock: it may only move by the 30 it has.
    const el = t.focusEl(30, 570);

    expect(liftAboveDock(el)).toBe(true);
    expect(scrollTop).toBe(30);
  });

  /*
   * Plan 64, on the Deck 2026-09-23: Down onto long answer sections (308 and 375px, taller than
   * the band above the dock) showed only their ends. On the device scrollIntoView end-aligns such a
   * section and takes its opening lines off the top, so it must not be asked to at all.
   */
  it("keeps a tall element's first line on screen: no end-aligning scroll when its top shows", () => {
    const t = makePane();
    const el = t.focusEl(120, 500); // 380 tall; the band above the dock is 364

    expect(liftAboveDock(el)).toBe(true);
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  it("still end-aligns a tall element whose start is already above the pane (arriving from below)", () => {
    const t = makePane();
    const el = t.focusEl(-150, 450);

    expect(liftAboveDock(el)).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: "end", behavior: "auto" });
  });

  it("does nothing outside a scroll pane", () => {
    const orphan = document.createElement("div");
    orphan.scrollIntoView = vi.fn();
    document.body.appendChild(orphan);

    expect(liftAboveDock(orphan)).toBe(false);
  });
});

/*
 * Round 35, 2026-09-05: on the last paragraph of a reply the hook writes the correct
 * scroll-margin-bottom and calls scrollIntoView — read live off the device with the ring on that
 * paragraph — and the pane still reads scrollTop 0 at ~300ms and ~900ms after the press, while the
 * SAME mechanism reached scrollTop 216 and 277 for other controls in the same walk. The one other
 * place this repo has seen a scroll get undone after a correct scrollIntoView call is
 * useStreamScrollPin's post-Ask rebuild, proven on-Deck 2026-08-31 (docs/archive/roadmap-bugs-fixed.md,
 * row CHAT-SLOTS-V3-14): a single early pass was not enough there either, and delivery passes timed
 * at 300ms and 900ms were what won. These tests model the same kind of revert — something else sets
 * scrollTop back to 0 between passes — and check the hook keeps re-correcting through that whole
 * window rather than giving up after its first (previously only) settle pass at 150ms.
 */
describe("useDockClearanceOnFocus", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    document.body.innerHTML = "";
  });

  /** Same rect stub as liftAboveDock's own tests, plus a settable scrollTop and a scrollIntoView
   *  that actually moves it (modelled the way useStreamScrollPin.test.ts models Chrome's
   *  `block: "end"` + scroll-margin-bottom), so a later pass can be checked against an earlier one. */
  function makeScene() {
    const scroll = document.createElement("div");
    scroll.className = "TabContentsScroll";
    let scrollTop = 0;
    Object.defineProperty(scroll, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (next: number) => {
        scrollTop = next;
      },
    });
    scroll.getBoundingClientRect = () => rect(0, 616);

    const column = document.createElement("div");
    scroll.appendChild(column);

    const dock = document.createElement("div");
    dock.className = "bonsai-main-tab-dock";
    dock.getBoundingClientRect = () => rect(370, 616);
    column.appendChild(dock);

    const elDocBottom = 428; // document-space bottom at scrollTop 0 — 12px behind the dock's top
    const el = document.createElement("div");
    el.setAttribute("tabindex", "0");
    el.getBoundingClientRect = () => rect(400 - scrollTop, elDocBottom - scrollTop);
    const scrollIntoView = vi.fn(() => {
      const margin = parseFloat(el.style.scrollMarginBottom || "0") || 0;
      const max = 277; // matches the on-device "how far the pane COULD scroll" reading
      scrollTop = Math.max(0, Math.min(max, elDocBottom + margin - 616));
    });
    el.scrollIntoView = scrollIntoView;
    column.appendChild(el);
    document.body.appendChild(scroll);

    return {
      column,
      el,
      scrollIntoView,
      revert: () => {
        scrollTop = 0;
      },
      get scrollTop() {
        return scrollTop;
      },
    };
  }

  it("re-corrects a lift that gets undone, all the way out to the 900ms pass", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.useFakeTimers();

    const t = makeScene();
    renderHook(() => useDockClearanceOnFocus({ current: t.column }));

    act(() => {
      t.el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    // The rAF pass ran synchronously (mocked above) and lifted the element.
    expect(t.scrollTop).toBeGreaterThan(0);

    // Something else (the device behaviour under investigation) yanks the pane back to 0 before
    // the previously-only settle pass at 150ms.
    t.revert();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(t.scrollTop).toBeGreaterThan(0);

    // Reverted again, past the old single-pass window — only a pass scheduled beyond 150ms can
    // still catch this.
    t.revert();
    act(() => {
      vi.advanceTimersByTime(150); // total 300ms
    });
    expect(t.scrollTop).toBeGreaterThan(0);

    // And once more, out to where the device readings were actually taken.
    t.revert();
    act(() => {
      vi.advanceTimersByTime(600); // total 900ms
    });
    expect(t.scrollTop).toBeGreaterThan(0);
  });

  it("does not schedule passes forever — a later focus elsewhere stops the old element's schedule", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.useFakeTimers();

    const t = makeScene();
    renderHook(() => useDockClearanceOnFocus({ current: t.column }));

    act(() => {
      t.el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    const callsAfterFirstFocus = t.scrollIntoView.mock.calls.length;

    // Focus leaves this element (e.g. moves to the dock's own controls) before the schedule
    // finishes; the abandoned passes must not keep firing against a stale target.
    const other = document.createElement("div");
    other.setAttribute("tabindex", "0");
    other.getBoundingClientRect = () => rect(0, 20); // clear of the dock — nothing to lift
    other.scrollIntoView = vi.fn();
    t.column.appendChild(other);
    act(() => {
      other.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });

    t.scrollIntoView.mockClear();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(t.scrollIntoView).not.toHaveBeenCalled();
    expect(callsAfterFirstFocus).toBeGreaterThan(0);
  });
});
