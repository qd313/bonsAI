/**
 * Title: A cut question fades at its right edge while the ring is on it (plan 105, lane A5)
 * Purpose: Pin the maintainer's pick of 2026-09-05 (option A of docs/demos/question-bubble-cue-mockups.html):
 *          a CLOSED question that is cut short ends in three dots at rest; with the controller ring on it,
 *          the dots give way to a soft fade at the right-hand edge, and nothing changes for a finger.
 * Used for: questionCutCue.ts, buildTurnHeaderElement.tsx and questionBubble.ts.
 * Does not: Prove how the fade looks on the Deck. jsdom has no layout, so the widths the cut check reads
 *           are stubbed; the Deck row P105-CUT-QUESTION-01 settles the look.
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTurnHeaderElement } from "./buildTurnHeaderElement";
import { buildQuestionBubbleSection } from "./questionBubble";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const LONG = "How do I beat the Wallmaster ambush in Ravenholm without wasting all my shotgun shells";

/* Stands in for layout: how wide the text is, and how much room the one-line title has. */
function stubWidths(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLSpanElement.prototype, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(HTMLSpanElement.prototype, "clientWidth", { configurable: true, value: clientWidth });
}

afterEach(() => {
  delete (HTMLSpanElement.prototype as unknown as Record<string, unknown>).scrollWidth;
  delete (HTMLSpanElement.prototype as unknown as Record<string, unknown>).clientWidth;
});

function closedHeader(title = LONG, over: Record<string, unknown> = {}) {
  const el = buildTurnHeaderElement({
    turnId: "turn-1",
    title,
    expanded: false,
    onActivate: () => {},
    ...over,
  });
  const view = render(el);
  const header = view.container.querySelector(".bonsai-chat-turn-row-header") as HTMLElement;
  const titleEl = view.container.querySelector(".bonsai-chat-turn-row-title") as HTMLElement;
  return { el, header, titleEl, view };
}

describe("a closed question tells the stylesheet when it is cut", () => {
  it("marks a title that runs wider than its box when the ring (a DOM focus) lands on it", () => {
    stubWidths(420, 245);
    const { header, titleEl } = closedHeader();
    expect(titleEl.hasAttribute("data-bonsai-cut")).toBe(false);
    fireEvent.focus(header);
    expect(titleEl.getAttribute("data-bonsai-cut")).toBe("true");
  });

  it("marks it on Steam's own gamepad-focus call too, and clears it when the ring leaves", () => {
    stubWidths(420, 245);
    const { el, titleEl } = closedHeader();
    const props = el.props as Record<string, () => void>;
    props.onGamepadFocus!();
    expect(titleEl.getAttribute("data-bonsai-cut")).toBe("true");
    props.onGamepadBlur!();
    expect(titleEl.hasAttribute("data-bonsai-cut")).toBe(false);
  });

  it("clears the mark on a DOM blur", () => {
    stubWidths(420, 245);
    const { header, titleEl } = closedHeader();
    fireEvent.focus(header);
    fireEvent.blur(header);
    expect(titleEl.hasAttribute("data-bonsai-cut")).toBe(false);
  });

  it("does not mark a short question that fits (it must not fade as if there were more)", () => {
    stubWidths(120, 245);
    const { header, titleEl } = closedHeader("what about its second phase");
    fireEvent.focus(header);
    expect(titleEl.hasAttribute("data-bonsai-cut")).toBe(false);
  });

  it("marks a question the code itself cut at 60 letters, even when its dots happen to fit", () => {
    stubWidths(240, 245);
    const { header, titleEl } = closedHeader("How do I beat the Wallmaster ambush in Ravenholm without wasting…");
    fireEvent.focus(header);
    expect(titleEl.getAttribute("data-bonsai-cut")).toBe("true");
  });

  it("an OPEN question gets none of this: the five-line cap keeps its own bottom fade", () => {
    stubWidths(420, 245);
    const el = buildTurnHeaderElement({
      turnId: "turn-1",
      title: LONG,
      expanded: true,
      onActivate: () => {},
    });
    const props = el.props as Record<string, unknown>;
    expect(props.onGamepadFocus).toBeUndefined();
    expect(props.onFocus).toBeUndefined();
  });

  it("keeps a caller's own title ref working on a closed question", () => {
    const titleRef = vi.fn();
    closedHeader(LONG, { titleRef });
    expect(titleRef).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});

describe("the stylesheet: the fade shows only on a cut, closed question under the ring", () => {
  const css = buildQuestionBubbleSection();
  /* [selector, body]; the selector is read after the rule's own comment so its words are not part of it. */
  const found = css.match(/([^{}]*\[data-bonsai-cut\][^{}]*)\{([^}]*)\}/);
  const rule = found && [found[0], found[1]!.slice(found[1]!.lastIndexOf("*/") + 2), found[2]];

  it("has one rule for it", () => {
    expect(rule).toBeTruthy();
  });

  it("keys on the closed header, Steam's gamepad ring marker and the cut mark, all three", () => {
    const selector = rule![1]!;
    expect(selector).toContain(".bonsai-chat-turn-row-header--collapsed");
    expect(selector).toContain(".gpfocus");
    expect(selector).toContain(".bonsai-chat-turn-row-title");
  });

  it("is ring only: a finger's DOM focus or hover draws nothing", () => {
    const selector = rule![1]!;
    expect(selector).not.toMatch(/:focus|:hover|:active/);
  });

  it("swaps the three dots for a fade to the right, not to the bottom", () => {
    const body = rule![2]!;
    expect(body).toContain("text-overflow: clip !important");
    expect(body).toMatch(/mask-image: linear-gradient\(\s*to right,\s*#000 0%,\s*#000 72%,\s*transparent 100%\s*\)/);
    expect(body).not.toContain("to bottom");
  });

  it("puts the mask on the title text only, so the ring on the bubble is not faded with it", () => {
    const masked = css
      .split("}")
      .filter((block) => block.includes("mask-image"))
      .map((block) => block.split("{")[0]!.trim());
    for (const selector of masked) {
      expect(selector).toMatch(/bonsai-chat-turn-row-title/);
    }
  });

  it("leaves the open question's bottom fade as it was, and never stacks the two on one element", () => {
    expect(css).toMatch(
      /\.bonsai-chat-turn-row-header--expanded\s*\.bonsai-chat-turn-row-title--overflowing\s*\{[^}]*to bottom/,
    );
    expect(rule![1]).not.toContain("--expanded");
    expect(rule![1]).not.toContain("--overflowing");
  });
});
