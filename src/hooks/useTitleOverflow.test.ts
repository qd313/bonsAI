/**
 * Title: The question-title overflow check measures only when something changed
 * Purpose: Pin the frame-rate fix in useTitleOverflow.ts. React calls a title's ref on every render
 *          of the transcript, and each measurement reads scrollHeight, which makes the browser lay
 *          the panel out again. Profiled on the Deck 2026-09-24 that was a third of the page's
 *          script time while an answer streamed. So an unchanged title must not be measured again
 *          on every call, while a changed one must be.
 * Used for: src/hooks/useTitleOverflow.ts.
 * Does not: Measure real layout -- jsdom has none. A fake element counts how often its layout is
 *           read and reports whatever size the test sets.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTitleOverflow } from "./useTitleOverflow";

function fakeTitle(text: string, scrollHeight: number, clientHeight: number) {
  const el = document.createElement("span");
  el.textContent = text;
  const reads = { count: 0 };
  Object.defineProperty(el, "scrollHeight", {
    get: () => {
      reads.count += 1;
      return scrollHeight;
    },
  });
  Object.defineProperty(el, "clientHeight", { get: () => clientHeight });
  return { el, reads };
}

describe("the question-title overflow check (roadmap: the panel drops frames while an answer streams)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("measures an unchanged title once, however many renders call its ref", () => {
    const { result } = renderHook(() => useTitleOverflow());
    const { el, reads } = fakeTitle("how do i beat the broken vessel", 90, 60);
    act(() => {
      for (let i = 0; i < 20; i += 1) result.current.measureTitleOverflow("live")(el);
    });
    expect(reads.count).toBe(1);
    expect(result.current.overflowingTitles.live).toBe(true);
  });

  it("measures again when the title's text changes", () => {
    const { result } = renderHook(() => useTitleOverflow());
    const { el, reads } = fakeTitle("…", 20, 20);
    act(() => result.current.measureTitleOverflow("live")(el));
    el.textContent = "how do i beat the broken vessel";
    act(() => result.current.measureTitleOverflow("live")(el));
    expect(reads.count).toBe(2);
  });

  it("measures again when the title is a different element", () => {
    const { result } = renderHook(() => useTitleOverflow());
    const first = fakeTitle("same words", 20, 20);
    const second = fakeTitle("same words", 90, 60);
    act(() => result.current.measureTitleOverflow("t1")(first.el));
    act(() => result.current.measureTitleOverflow("t1")(second.el));
    expect(second.reads.count).toBe(1);
    expect(result.current.overflowingTitles.t1).toBe(true);
  });

  it("looks again after a second, so a change in layout alone is still caught", () => {
    const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
    const { result } = renderHook(() => useTitleOverflow());
    const { el, reads } = fakeTitle("same words", 20, 20);
    act(() => result.current.measureTitleOverflow("live")(el));
    clock.mockReturnValue(1500);
    act(() => result.current.measureTitleOverflow("live")(el));
    expect(reads.count).toBe(1);
    clock.mockReturnValue(2100);
    act(() => result.current.measureTitleOverflow("live")(el));
    expect(reads.count).toBe(2);
  });

  it("ignores the detach call React makes with no element", () => {
    const { result } = renderHook(() => useTitleOverflow());
    act(() => result.current.measureTitleOverflow("live")(null));
    expect(result.current.overflowingTitles).toEqual({});
  });
});
