import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, fireEvent } from "@testing-library/react";

import {
  DrgGlossaryTermChip,
  TAP_FULL_DISMISS_MS,
  TAP_PEEK_DISMISS_MS,
} from "./DrgGlossaryTermChip";
import { TEST_GLOSSARY_TERMS } from "../test-harness/glossaryTestTerms";
import { composeDrgGlossaryExplainFurtherQuestion } from "../utils/drgGlossaryAsk";

/*
 * `@decky/ui`'s `Focusable` has to render as a real DOM node with a working `ref`, or this suite
 * would pass for the wrong reason — see src/test-harness/fakeDeckyUi.tsx. onFocus/onBlur/onClick are
 * plain DOM handlers the stub does not strip, so peek/full/explain-further are all reachable through
 * ordinary fireEvent calls; only the real Steam A/B/D-pad path (onActivate/onButtonDown, stripped by
 * the stub) needs the device, per the roadmap's D-pad QA rows.
 */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const kitingTerm = TEST_GLOSSARY_TERMS.find((t) => t.id === "kiting")!;

describe("DrgGlossaryTermChip", () => {
  it("renders the matched text with no tooltip while idle", () => {
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    expect(container.textContent).toContain("kiting");
    expect(document.querySelector(".bonsai-drg-glossary-tooltip")).toBeNull();
  });

  it("shows the short peek on focus alone, with no action needed", () => {
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    const chip = container.querySelector(".bonsai-drg-glossary-term") as HTMLElement;
    fireEvent.focus(chip);
    const tooltip = document.querySelector(".bonsai-drg-glossary-tooltip");
    expect(tooltip?.textContent).toBe(kitingTerm.peek);
  });

  it("clears the peek on blur", () => {
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    const chip = container.querySelector(".bonsai-drg-glossary-term") as HTMLElement;
    fireEvent.focus(chip);
    fireEvent.blur(chip);
    expect(document.querySelector(".bonsai-drg-glossary-tooltip")).toBeNull();
  });

  it("underlines every letter — no skip-ink gap at the g's descender", () => {
    // Regression: Chrome's default text-decoration-skip-ink broke the underline around the g in
    // "kiting", so on device the last letter read as not part of the tappable term
    // (maintainer screenshot 2026-08-28).
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    const text = container.querySelector(".bonsai-drg-glossary-term-text") as HTMLElement;
    expect(text.style.textDecorationSkipInk).toBe("none");
  });

  it("opens the full definition, with an explain-further chip, when the term is activated", () => {
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    const chip = container.querySelector(".bonsai-drg-glossary-term") as HTMLElement;
    fireEvent.focus(chip);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    const tooltip = document.querySelector(".bonsai-drg-glossary-tooltip");
    expect(tooltip?.textContent).toContain(kitingTerm.full);
    expect(document.querySelector(".bonsai-drg-glossary-explain-further")).toBeTruthy();
  });

  it("explain-further calls back with the term and composes the right Ask text", () => {
    const onExplainFurther = vi.fn();
    const { container } = render(
      <DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" onExplainFurther={onExplainFurther} />
    );
    // Two taps: the first shows the short peek, the second escalates to the full definition.
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    fireEvent.click(document.querySelector(".bonsai-drg-glossary-explain-further")!);
    expect(onExplainFurther).toHaveBeenCalledTimes(1);
    expect(onExplainFurther).toHaveBeenCalledWith(kitingTerm);
    const question = composeDrgGlossaryExplainFurtherQuestion(onExplainFurther.mock.calls[0][0]);
    expect(question).toContain("kiting");
    expect(question).toContain("Deep Rock Galactic: Survivor");
  });

  it("closes the tooltip after explain-further is used", () => {
    const { container } = render(
      <DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" onExplainFurther={vi.fn()} />
    );
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    fireEvent.click(document.querySelector(".bonsai-drg-glossary-explain-further")!);
    expect(document.querySelector(".bonsai-drg-glossary-tooltip")).toBeNull();
  });
});

describe("DrgGlossaryTermChip tap flow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const renderChip = () => {
    const utils = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    return {
      ...utils,
      chip: utils.container.querySelector(".bonsai-drg-glossary-term") as HTMLElement,
      text: utils.container.querySelector(".bonsai-drg-glossary-term-text") as HTMLElement,
      tooltip: () => document.querySelector(".bonsai-drg-glossary-tooltip"),
    };
  };

  it("a single tap shows the short plain-language peek, not the full definition", () => {
    const { text, tooltip } = renderChip();
    fireEvent.pointerDown(text);
    fireEvent.click(text);
    expect(tooltip()?.textContent).toBe(kitingTerm.peek);
  });

  it("the tap decision survives the focus the tap itself causes", () => {
    // On device a tap moves gamepad focus, so onFocus (idle → peek) fires before onClick. Deciding
    // from the live state would make every first tap read "peek" and jump straight to full — the
    // pointerdown snapshot is what keeps the first tap on the short definition.
    const { chip, text, tooltip } = renderChip();
    fireEvent.pointerDown(text);
    fireEvent.focus(chip);
    fireEvent.click(text);
    expect(tooltip()?.textContent).toBe(kitingTerm.peek);
  });

  it("a tap-opened peek dismisses itself", () => {
    vi.useFakeTimers();
    const { text, tooltip } = renderChip();
    fireEvent.pointerDown(text);
    fireEvent.click(text);
    expect(tooltip()).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(TAP_PEEK_DISMISS_MS + 1);
    });
    expect(tooltip()).toBeNull();
  });

  it("a second tap escalates to the full definition, which also dismisses itself", () => {
    vi.useFakeTimers();
    const { text, tooltip } = renderChip();
    fireEvent.pointerDown(text);
    fireEvent.click(text);
    fireEvent.pointerDown(text);
    fireEvent.click(text);
    expect(tooltip()?.textContent).toContain(kitingTerm.full);
    act(() => {
      vi.advanceTimersByTime(TAP_FULL_DISMISS_MS + 1);
    });
    expect(tooltip()).toBeNull();
  });

  it("a third tap dismisses instead of firing explain-further", () => {
    const onExplainFurther = vi.fn();
    const { container } = render(
      <DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" onExplainFurther={onExplainFurther} />
    );
    const text = container.querySelector(".bonsai-drg-glossary-term-text") as HTMLElement;
    for (let i = 0; i < 3; i += 1) {
      fireEvent.pointerDown(text);
      fireEvent.click(text);
    }
    expect(document.querySelector(".bonsai-drg-glossary-tooltip")).toBeNull();
    expect(onExplainFurther).not.toHaveBeenCalled();
  });

  it("gamepad focus cancels a pending tap auto-dismiss", () => {
    vi.useFakeTimers();
    const { chip, text, tooltip } = renderChip();
    fireEvent.pointerDown(text);
    fireEvent.click(text);
    fireEvent.focus(chip);
    act(() => {
      vi.advanceTimersByTime(TAP_PEEK_DISMISS_MS + 1);
    });
    // The ring owns the popup now; it closes on blur/B, not on a leftover timer.
    expect(tooltip()).toBeTruthy();
  });
});
