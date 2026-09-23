import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useStreamScrollPin } from "./useStreamScrollPin";

const VIEWPORT_BOTTOM = 250;

/**
 * jsdom has no layout, so the parts the hook reads are modelled by hand: a scroll container with a
 * settable scrollTop and a fixed 0–250 viewport, and an anchor whose on-screen rect moves as the
 * container scrolls, the way a real one does.
 *
 * scrollIntoView is modelled rather than spied into a void, because on device it is the ONLY way
 * the hook can move the pane — Steam's scroller erases direct scrollTop writes (measured
 * 2026-08-31). The model does what Chrome does with `block: "end"`: put the anchor's bottom at the
 * viewport bottom minus its scroll-margin-bottom, clamped to the scroll range. It deliberately
 * fires no scroll event — neither does jsdom — so late self-scroll events are delivered by hand
 * via emitScroll where a test needs one.
 */
function makeTranscript(opts: { contentBottom: number; scrollHeight?: number }) {
  const scroll = document.createElement("div");
  scroll.className = "TabContentsScroll";

  let scrollTop = 0;
  let contentBottom = opts.contentBottom;
  let directWrites = 0;

  Object.defineProperty(scroll, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (next: number) => {
      directWrites += 1;
      scrollTop = next;
      scroll.dispatchEvent(new Event("scroll"));
    },
  });
  Object.defineProperty(scroll, "scrollHeight", {
    configurable: true,
    get: () => opts.scrollHeight ?? 2000,
  });
  Object.defineProperty(scroll, "clientHeight", {
    configurable: true,
    get: () => VIEWPORT_BOTTOM,
  });
  scroll.getBoundingClientRect = () => rect(0, VIEWPORT_BOTTOM);

  const anchor = document.createElement("div");
  anchor.className = "bonsai-chat-main-column";
  /* Document-space bottom minus how far we have scrolled — i.e. where it actually appears. */
  anchor.getBoundingClientRect = () => rect(0 - scrollTop, contentBottom - scrollTop);
  const scrollIntoView = vi.fn(() => {
    const margin = parseFloat(anchor.style.scrollMarginBottom || "0") || 0;
    const max = Math.max(0, (opts.scrollHeight ?? 2000) - VIEWPORT_BOTTOM);
    scrollTop = Math.max(0, Math.min(max, contentBottom - (VIEWPORT_BOTTOM - margin)));
  });
  anchor.scrollIntoView = scrollIntoView;
  scroll.appendChild(anchor);
  document.body.appendChild(scroll);

  return {
    anchorRef: { current: anchor },
    scroll,
    anchor,
    scrollIntoView,
    /* A scroll event delivered after the fact, carrying a position nobody moved to since. Real
       scroll events are asynchronous; this is what one looks like arriving late. */
    emitScroll: () => scroll.dispatchEvent(new Event("scroll")),
    /** More tokens arrived: the transcript got taller. */
    grow: (by: number) => {
      contentBottom += by;
    },
    /** A swipe or a D-pad panel step. */
    userScrollTo: (top: number) => {
      scroll.scrollTop = top;
    },
    get scrollTop() {
      return scrollTop;
    },
    get directWrites() {
      return directWrites;
    },
  };
}

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

function mount(t: ReturnType<typeof makeTranscript>, enabled = true) {
  return renderHook(
    ({ text }: { text: string }) => useStreamScrollPin(t.anchorRef, text, enabled),
    { initialProps: { text: "" } }
  );
}

describe("stream scroll follow", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("brings newly arrived text into view", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);

    act(() => rerender({ text: "first tokens" }));

    // 150px of transcript was below the fold; the tail now sits on the bottom edge.
    expect(t.scrollTop).toBe(150);
  });

  it("keeps following as the answer grows", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);

    act(() => rerender({ text: "first" }));
    t.grow(120);
    act(() => rerender({ text: "first second" }));

    expect(t.scrollTop).toBe(270);
  });

  it("does nothing while the whole transcript still fits", () => {
    const t = makeTranscript({ contentBottom: 200 });
    const { rerender } = mount(t);

    act(() => rerender({ text: "short" }));

    expect(t.scrollTop).toBe(0);
    expect(t.scrollIntoView).not.toHaveBeenCalled();
  });

  /*
   * Steam's TabContentsScroll ignores scrollTop assignment: its own scroller re-asserts the value
   * it has recorded around every commit, so a direct write is erased before paint — measured on
   * device 2026-08-31, ~300 consecutive writes with zero effect. Everything this hook does must
   * therefore go through scrollIntoView, which Steam adopts. A direct write here would pass every
   * jsdom test and be a no-op on the Deck; this test is the tripwire for that regression.
   */
  it("moves the pane only via scrollIntoView, never by assigning scrollTop", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);

    act(() => rerender({ text: "first tokens" }));
    t.grow(120);
    act(() => rerender({ text: "first second" }));

    expect(t.scrollTop).toBe(270); // it moved...
    expect(t.directWrites).toBe(0); // ...and not by writing scrollTop
    expect(t.scrollIntoView).toHaveBeenCalledWith({ block: "end", behavior: "auto" });
  });

  /*
   * The behaviour this hook was originally written for. Scrolling up to re-read something must not
   * be undone by the next partial.
   */
  it("holds position once the user scrolls up", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);
    act(() => rerender({ text: "first" }));

    act(() => t.userScrollTo(20));
    t.grow(120);
    act(() => rerender({ text: "first second" }));

    expect(t.scrollTop).toBe(20);
  });

  /*
   * Walking the reply with the D-pad while it is written. A step near the end takes no pin (it is
   * inside the slack), so without this the follow scrolled the ring's own control off screen —
   * six of eight stops on the Deck, 2026-09-18.
   */
  it("holds still while the gamepad ring is on something inside the transcript", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);
    act(() => rerender({ text: "first" }));
    expect(t.scrollTop).toBe(150);

    const control = document.createElement("div");
    control.className = "gpfocus";
    t.anchor.appendChild(control);
    t.grow(120);
    act(() => rerender({ text: "first second" }));
    expect(t.scrollTop).toBe(150);

    control.className = "";
    t.grow(60);
    act(() => rerender({ text: "first second third" }));
    expect(t.scrollTop).toBe(330);
  });

  it("keeps following while the ring is on the dock, outside the transcript", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const dockButton = document.createElement("div");
    dockButton.className = "gpfocus";
    t.scroll.appendChild(dockButton);
    const { rerender } = mount(t);

    act(() => rerender({ text: "first tokens" }));

    expect(t.scrollTop).toBe(150);
  });

  /*
   * 48px of slack, so nudging the view slightly off the bottom — or a D-pad step that lands just
   * short of it — still counts as watching the answer rather than reading back.
   */
  it("treats a small gap from the bottom as still watching", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);
    act(() => rerender({ text: "first" }));

    act(() => t.userScrollTo(120)); // tail sits 30px below the fold, inside the slack
    t.grow(100);
    act(() => rerender({ text: "first second" }));

    expect(t.scrollTop).toBe(250);
  });

  it("resumes following when the user scrolls back down", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);
    act(() => rerender({ text: "first" }));
    act(() => t.userScrollTo(0));

    act(() => t.userScrollTo(150));
    t.grow(100);
    act(() => rerender({ text: "first second" }));

    expect(t.scrollTop).toBe(250);
  });

  /*
   * Reported on device 2026-08-07: following worked, then locked a paragraph short of the tail.
   *
   * `scroll` events are asynchronous, so one caused by the follow itself lands a frame or more
   * later — by which time the reveal has added text and the tail is below the fold again. Read as
   * "the user scrolled up", that pins the view at the position the follow just set, and nothing
   * moves for the rest of the answer.
   */
  it("does not mistake its own scroll for the user's when it arrives late", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t);
    act(() => rerender({ text: "first" }));
    expect(t.scrollTop).toBe(150);

    t.grow(200);
    act(() => t.emitScroll());

    act(() => rerender({ text: "first second" }));
    expect(t.scrollTop).toBe(350);
  });

  /*
   * On device the answer ran past the bottom edge while the panel reported itself fully scrolled —
   * the QAM's scroll range does not always cover its own content. scrollIntoView clamps to the
   * range it has; asking is still right, because the browser may move an ancestor that can.
   */
  it("still asks the browser when the panel will not scroll far enough", () => {
    const t = makeTranscript({ contentBottom: 400, scrollHeight: 300 });
    const { rerender } = mount(t);

    act(() => rerender({ text: "first" }));

    expect(t.scrollTop).toBe(50); // clamped at the container's maximum
    expect(t.scrollIntoView).toHaveBeenCalledWith({ block: "end", behavior: "auto" });
  });

  /* A pin taken during the previous answer, or by the scrollIntoView that fires as a turn opens,
     must not freeze the next one before a token has arrived. */
  it("starts each answer following again", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = renderHook(
      ({ text, on }: { text: string; on: boolean }) => useStreamScrollPin(t.anchorRef, text, on),
      { initialProps: { text: "", on: true } }
    );
    act(() => t.userScrollTo(0));
    act(() => rerender({ text: "first", on: true }));
    expect(t.scrollTop).toBe(0); // pinned, as it should be

    act(() => rerender({ text: "first", on: false })); // the answer finished
    act(() => rerender({ text: "new answer", on: true })); // the next one starts

    expect(t.scrollTop).toBe(150);
  });

  it("stays out of the way when streaming is off", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mount(t, false);

    act(() => rerender({ text: "first" }));

    expect(t.scrollTop).toBe(0);
    expect(t.scrollIntoView).not.toHaveBeenCalled();
  });

  it("is a no-op without a scroll container", () => {
    const orphan = document.createElement("div");
    document.body.appendChild(orphan);
    const anchorRef = { current: orphan };

    expect(() =>
      renderHook(({ text }: { text: string }) => useStreamScrollPin(anchorRef, text, true), {
        initialProps: { text: "tokens" },
      })
    ).not.toThrow();
  });
});

/*
 * The delivery window. The completion poll disables the follow in the SAME commit that lands the
 * final answer text, and the slot reload then rebuilds the transcript with the pane back at 0 —
 * so on device every scroll taken while streaming was thrown away ~50ms after the last token
 * (measured 2026-08-31: scrollTop 0, 366px of answer below the fold, every run). For a short
 * window after the Ask ends the hook keeps delivering the tail, and ignores the scroll churn the
 * rebuild causes.
 */
describe("post-answer delivery", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function mountAsk(t: ReturnType<typeof makeTranscript>) {
    return renderHook(
      ({ text, on }: { text: string; on: boolean }) => useStreamScrollPin(t.anchorRef, text, on),
      { initialProps: { text: "streaming", on: true } }
    );
  }

  it("delivers the tail on the commit that ends the Ask", () => {
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mountAsk(t);
    expect(t.scrollTop).toBe(150);

    // Growth the streaming passes never saw: the final text and "follow off" land together.
    t.grow(200);
    act(() => rerender({ text: "final answer text", on: false }));

    expect(t.scrollTop).toBe(350);
  });

  it("re-delivers after the slot rebuild yanks the pane back to the top", () => {
    vi.useFakeTimers();
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mountAsk(t);

    act(() => rerender({ text: "final answer text", on: false }));
    expect(t.scrollTop).toBe(150);

    // The rebuild: Steam lands the pane at 0. Not the user, and must not pin.
    act(() => t.userScrollTo(0));
    act(() => vi.advanceTimersByTime(400));

    expect(t.scrollTop).toBe(150);
  });

  /*
   * On the Deck 2026-09-23 (plan 64): Down 0.8s after an answer finished put the ring on "40
   * earlier", and the 900ms delivery pass then scrolled to the end of the answer, leaving the ring
   * 656px above the pane.
   */
  it("brings the ring's own control back, not the answer's end, when the ring is in the transcript", () => {
    vi.useFakeTimers();
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mountAsk(t);

    act(() => rerender({ text: "final answer text", on: false }));
    // The rebuild lands the pane at the top, and the person walks onto a control up there.
    act(() => t.userScrollTo(0));
    const control = document.createElement("div");
    control.className = "gpfocus";
    control.scrollIntoView = vi.fn();
    t.anchor.appendChild(control);
    act(() => vi.advanceTimersByTime(1000));

    expect(t.scrollTop).toBe(0);
    expect(control.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" });
  });

  it("stops delivering once the window has passed", () => {
    vi.useFakeTimers();
    const t = makeTranscript({ contentBottom: 400 });
    const { rerender } = mountAsk(t);

    act(() => rerender({ text: "final answer text", on: false }));
    act(() => vi.advanceTimersByTime(2000));
    const callsAfterWindow = t.scrollIntoView.mock.calls.length;

    // Idle life goes on: a slot switch swaps the text while the follow is off.
    act(() => t.userScrollTo(0));
    t.grow(300);
    act(() => rerender({ text: "a different slot's answer", on: false }));

    expect(t.scrollIntoView.mock.calls.length).toBe(callsAfterWindow);
    expect(t.scrollTop).toBe(0);
  });
});
