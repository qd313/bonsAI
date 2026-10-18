import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findFirstSpoilerFenceIn,
  findNextSpoilerFenceInView,
  focusSpoilerFence,
  registerSpoilerFence,
  resetSpoilerFenceRegistry,
} from "./spoilerFenceRegistry";

const alwaysInView = () => true;
/** The walk with no ring anywhere, which offers every fence in view. */
const findNext = (bubble: HTMLElement, isInView: (el: HTMLElement) => boolean, ring: HTMLElement | null = null) =>
  findNextSpoilerFenceInView(bubble, isInView, ring);
const neverInView = () => false;

function makeBubbleWith(...fences: HTMLElement[]): HTMLElement {
  const bubble = document.createElement("div");
  for (const f of fences) bubble.appendChild(f);
  document.body.appendChild(bubble);
  return bubble;
}

describe("spoiler fence registry", () => {
  beforeEach(() => {
    resetSpoilerFenceRegistry();
    document.body.innerHTML = "";
  });

  it("finds nothing when no fence is registered", () => {
    const bubble = makeBubbleWith();
    expect(findNext(bubble, alwaysInView)).toBeNull();
  });

  it("finds a masked fence inside the bubble", () => {
    const fence = document.createElement("div");
    const bubble = makeBubbleWith(fence);
    registerSpoilerFence("a", fence);
    expect(findNext(bubble, alwaysInView)).toBe(fence);
  });

  it("ignores a fence that belongs to a different reply", () => {
    const fence = document.createElement("div");
    const otherBubble = makeBubbleWith(fence);
    const bubble = makeBubbleWith();
    registerSpoilerFence("a", fence);
    expect(otherBubble.contains(fence)).toBe(true);
    expect(findNext(bubble, alwaysInView)).toBeNull();
  });

  it("ignores a fence that is scrolled out of view", () => {
    const fence = document.createElement("div");
    const bubble = makeBubbleWith(fence);
    registerSpoilerFence("a", fence);
    expect(findNext(bubble, neverInView)).toBeNull();
  });

  it("never offers the fence the ring is on, so Down walks past it instead of being trapped", () => {
    const fence = document.createElement("div");
    const bubble = makeBubbleWith(fence);
    registerSpoilerFence("a", fence);

    expect(findNext(bubble, alwaysInView)).toBe(fence);
    expect(findNext(bubble, alwaysInView, fence)).toBeNull();
  });

  it("focusSpoilerFence focuses the fence, and the walk then skips it because the ring is on it", () => {
    const fence = document.createElement("div");
    const bubble = makeBubbleWith(fence);
    const focus = vi.spyOn(fence, "focus");
    registerSpoilerFence("a", fence);

    expect(focusSpoilerFence(fence)).toBe(true);
    expect(focus).toHaveBeenCalled();
    expect(findNext(bubble, alwaysInView, fence)).toBeNull();
  });

  /*
   * The bug this replaced (plan 76 lane 3): a flag set when the ring first landed on a cover was
   * never cleared, so a walk Up that had parked on it made every later walk Down skip it.
   */
  it("offers a cover again on a second walk, after the ring has been elsewhere", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    const bubble = makeBubbleWith(first, second);
    registerSpoilerFence("a", first);
    registerSpoilerFence("b", second);
    focusSpoilerFence(first);
    focusSpoilerFence(second);

    // The ring is on the bubble again (re-entering from the header): both covers are ahead of it.
    expect(findNext(bubble, alwaysInView, bubble)).toBe(first);
  });

  it("offers only fences after the ring, nearest first, and none the ring has passed", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    const third = document.createElement("div");
    const bubble = makeBubbleWith(first, second, third);
    registerSpoilerFence("a", first);
    registerSpoilerFence("b", second);
    registerSpoilerFence("c", third);

    expect(findNext(bubble, alwaysInView, first)).toBe(second);
    expect(findNext(bubble, alwaysInView, second)).toBe(third);
    expect(findNext(bubble, alwaysInView, third)).toBeNull();
  });

  it("offers a fence inside the section the ring is on, and ignores a ring outside the bubble", () => {
    const section = document.createElement("div");
    const fence = document.createElement("div");
    section.appendChild(fence);
    const bubble = makeBubbleWith(section);
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    registerSpoilerFence("a", fence);

    expect(findNext(bubble, alwaysInView, section)).toBe(fence);
    expect(findNext(bubble, alwaysInView, outside)).toBe(fence);
  });

  it("names the nearest fence in reading order even when they registered out of order", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    const bubble = makeBubbleWith(first, second);
    registerSpoilerFence("b", second);
    registerSpoilerFence("a", first);

    expect(findNext(bubble, alwaysInView)).toBe(first);
  });

  it("finds the first fence on screen inside a section, for A on the section", () => {
    const section = document.createElement("div");
    const above = document.createElement("div");
    const shown = document.createElement("div");
    const alsoShown = document.createElement("div");
    section.append(above, shown, alsoShown);
    makeBubbleWith(section);
    registerSpoilerFence("a", above);
    registerSpoilerFence("b", shown);
    registerSpoilerFence("c", alsoShown);

    expect(findFirstSpoilerFenceIn(section, (el) => el !== above)).toBe(shown);
    expect(findFirstSpoilerFenceIn(section, () => false)).toBeNull();
  });

  /*
   * Decky renders the fence with tabindex="0" and navigates by it. Replacing that with "-1" — which
   * the first version of this helper did to every element it touched — takes the fence back out of
   * Steam's navigation graph, so the press after the reveal has nowhere to go.
   */
  it("leaves Decky's own tabindex alone", () => {
    const fence = document.createElement("div");
    fence.setAttribute("tabindex", "0");
    makeBubbleWith(fence);
    registerSpoilerFence("a", fence);

    focusSpoilerFence(fence);

    expect(fence.getAttribute("tabindex")).toBe("0");
  });

  it("makes an untabbable fence focusable before focusing it", () => {
    const fence = document.createElement("div");
    makeBubbleWith(fence);
    registerSpoilerFence("a", fence);

    focusSpoilerFence(fence);

    expect(fence.getAttribute("tabindex")).toBe("-1");
  });

  /* The return value is a measurement, not an assumption: the previous version returned true
     unconditionally, so a diversion that moved no focus still reported success and swallowed the
     press. */
  it("reports false when focus does not land", () => {
    const fence = document.createElement("div");
    makeBubbleWith(fence);
    vi.spyOn(fence, "focus").mockImplementation(() => {
      /* focus refused, as a detached or hidden node would */
    });
    registerSpoilerFence("a", fence);

    expect(focusSpoilerFence(fence)).toBe(false);
  });

  it("focusSpoilerFence is a no-op for null", () => {
    expect(focusSpoilerFence(null)).toBe(false);
  });

  it("survives an element whose focus() throws", () => {
    const fence = document.createElement("div");
    makeBubbleWith(fence);
    vi.spyOn(fence, "focus").mockImplementation(() => {
      throw new Error("detached");
    });
    registerSpoilerFence("a", fence);
    expect(() => focusSpoilerFence(fence)).not.toThrow();
  });

  it("revealing a fence removes it from consideration", () => {
    const fence = document.createElement("div");
    const bubble = makeBubbleWith(fence);
    registerSpoilerFence("a", fence);
    // The fence de-registers itself when it opens.
    registerSpoilerFence("a", null);
    expect(findNext(bubble, alwaysInView)).toBeNull();
  });

  it("a remounted fence is offered under its new element", () => {
    const old = document.createElement("div");
    const bubble = makeBubbleWith(old);
    registerSpoilerFence("a", old);
    registerSpoilerFence("a", null);

    const fresh = document.createElement("div");
    bubble.appendChild(fresh);
    registerSpoilerFence("a", fresh);
    expect(findNext(bubble, alwaysInView)).toBe(fresh);
  });
});
