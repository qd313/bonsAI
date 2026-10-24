import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { DeckFocusSlider, type DeckSliderThumbVisualState } from "./DeckFocusSlider";

/*
 * Deck 2026-10-06 (maintainer) and 2026-10-07 (plan82-M3-SLIDER-RING): the grey frame around the
 * Unload delay and Reply style knobs was Steam's own ring. Steam placed it when the thumb took focus
 * and did not move it when the knob stepped, so after a Right press the frame sat one step behind
 * the knob; it was also drawn around the 42 px box, twice the dot's width. The page's own numbers
 * showed the thumb box moving with the dot, which is why the box tests passed while the picture was
 * wrong. So the ring is now drawn by the dot itself while the thumb is focused, and Steam's ring is
 * switched off on the thumb. These check what a person sees: the element that carries the ring is the
 * dot, before and after a step.
 */

// The same look the four real callers give the dot (a faint halo on focus, no outline of their own).
const callerDotStyle = ({ focused }: DeckSliderThumbVisualState): React.CSSProperties => ({
  border: focused ? "2px solid #9ce7ff" : "2px solid #77c4da",
  background: "#0f2a34",
  boxShadow: focused ? "0 0 0 2px rgba(124,214,255,0.22)" : "none",
});

function Harness({ pct }: { pct: number }) {
  return (
    <DeckFocusSlider
      header="Unload delay"
      thumbPct={pct}
      onSelectClientX={() => {}}
      onStepLeft={() => {}}
      onStepRight={() => {}}
      getThumbDotStyle={callerDotStyle}
    />
  );
}

function thumbParts(container: HTMLElement) {
  const host = container.querySelector<HTMLElement>('[data-decky-ui="Focusable"]');
  if (!host) throw new Error("thumb Focusable not rendered");
  const dot = host.firstElementChild as HTMLElement;
  return { host, dot };
}

describe("slider thumb focus ring", () => {
  it("draws the ring on the knob itself once the thumb has focus", () => {
    const { container } = render(<Harness pct={40} />);
    const { host, dot } = thumbParts(container);
    expect(dot.style.outline).toBe("");
    fireEvent.focus(host);
    expect(dot.style.outline).toMatch(/2px solid/);
    expect(dot.style.outline).toMatch(/255,\s*255,\s*255/);
    expect(host.style.outline).toBe("");
  });

  it("keeps the ring on the knob after a step moves it, with no ring left at the old spot", () => {
    const { container, rerender } = render(<Harness pct={40} />);
    fireEvent.focus(thumbParts(container).host);
    rerender(<Harness pct={55} />);
    const { host, dot } = thumbParts(container);
    expect(dot.style.outline).toMatch(/2px solid/);
    const ringed = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => el.style.outline !== "",
    );
    expect(ringed).toEqual([dot]);
    expect((host.parentElement as HTMLElement).style.left).toBe("calc(55% - 16px)");
  });

  it("switches Steam's own ring off on the thumb, so only one ring is ever drawn", () => {
    const { container } = render(<Harness pct={40} />);
    expect(thumbParts(container).host.getAttribute("data-no-focus-ring")).toBe("true");
  });

  it("shows no ring while the thumb is not focused", () => {
    const { container } = render(<Harness pct={40} />);
    const ringed = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => el.style.outline !== "",
    );
    expect(ringed).toEqual([]);
  });
});
