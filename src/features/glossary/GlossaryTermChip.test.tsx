import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, fireEvent } from "@testing-library/react";

import {
  DrgGlossaryTermChip,
  TAP_FULL_DISMISS_MS,
  TAP_PEEK_DISMISS_MS,
} from "./GlossaryTermChip";
import { TEST_GLOSSARY_TERMS } from "../../test-harness/glossaryTestTerms";
import { composeDrgGlossaryExplainFurtherQuestion } from "./glossaryAsk";

/*
 * `@decky/ui`'s `Focusable` has to render as a real DOM node with a working `ref`, or this suite
 * would pass for the wrong reason — see src/test-harness/fakeDeckyUi.tsx. onFocus/onBlur/onClick are
 * plain DOM handlers the stub does not strip, so peek/full/explain-further are all reachable through
 * ordinary fireEvent calls; only the real Steam A/B/D-pad path (onActivate/onButtonDown, stripped by
 * the stub) needs the device, per the roadmap's D-pad QA rows.
 */
vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

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

  it("keeps the Explain further button in its own plain wrapper, not a D-pad stop of its own", () => {
    // Plan 96 F6 (workshop:test-evidence/plan96-P96-F6-EXPLAIN.json): a Focusable in the box (a portal to the
    // page body) took Steam's ring but no A or B reached it on the Deck. The wrapper is now a plain span; the
    // stand-in would draw a Focusable as a div carrying data-decky-ui, so the span proves it is not one.
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    const button = document.querySelector(".bonsai-drg-glossary-explain-further") as HTMLElement;
    expect(button).toBeTruthy();
    const wrap = button.closest(".bonsai-drg-glossary-explain-stop") as HTMLElement;
    expect(wrap).not.toBeNull();
    expect(wrap.tagName).toBe("SPAN");
    expect(wrap.hasAttribute("data-decky-ui")).toBe(false);
  });

  it("the full box says what A and B do, since the button is not a stop of its own", () => {
    // plan96-P96-F6-EXPLAIN.json: "a stop inside the portal took the ring but no A or B reached it".
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    expect(document.querySelector(".bonsai-drg-glossary-tooltip")?.textContent).not.toContain("A again");
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    const hint = document.querySelector(".bonsai-drg-glossary-hint");
    expect(hint?.textContent).toBe("A again: ask the AI to explain further. B: close.");
  });

  it("shows no hint line on the short peek", () => {
    const { container } = render(<DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" />);
    fireEvent.focus(container.querySelector(".bonsai-drg-glossary-term") as HTMLElement);
    expect(document.querySelector(".bonsai-drg-glossary-hint")).toBeNull();
  });

  it("two clicks on Explain further in a row send one question, not two", () => {
    // Steam's A and a synthetic click can both arrive before the box has closed; the fired guard keeps it to one.
    const onExplainFurther = vi.fn();
    const { container } = render(
      <DrgGlossaryTermChip term={kitingTerm} matchedText="kiting" onExplainFurther={onExplainFurther} />
    );
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    fireEvent.click(container.querySelector(".bonsai-drg-glossary-term-text")!);
    const button = document.querySelector(".bonsai-drg-glossary-explain-further") as HTMLElement;
    // One act around both clicks: the box has not re-drawn between them, as when the two presses land together.
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(onExplainFurther).toHaveBeenCalledTimes(1);
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
