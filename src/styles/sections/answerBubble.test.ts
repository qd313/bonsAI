/**
 * Title: The streamed-answer scramble -- stylesheet checks
 * Purpose: Pin the three things plan 69 asks the stylesheet for while an answer's letters are still
 *          scrambling: no blinking end cursor, line breaks inside the unsettled stretch kept as
 *          line breaks, and the Copy corner held back until the last letter settles.
 * Used for: The `.bonsai-stream-scramble` rules in answerBubble.ts, and the span
 *           ScrambledAnswerText.tsx draws.
 * Does not: Check what any of it looks like -- jsdom has no layout engine. These read the generated
 *           CSS text, as the other section tests do; the look is the Deck's and the maintainer's.
 */
import { describe, expect, it } from "vitest";
import { buildAnswerBubbleSection } from "./answerBubble";
import { ANSWER_LINE_HEIGHT, buildAnswerMarkdownFormattingSection } from "./answerMarkdownFormatting";

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  expect(match, `no rule for ${selector}`).toBeTruthy();
  return match![1]!;
}

describe("the answer's line spacing (the maintainer's call, 2026-09-25: tighter lines)", () => {
  const css = buildAnswerBubbleSection();

  it("spaces answer lines at 1.25 of the text size, not the old 1.4, in every rule that sets it", () => {
    expect(ANSWER_LINE_HEIGHT).toBe(1.25);
    for (const selector of [
      ".bonsai-scope .bonsai-chat-ai-bubble .bonsai-ai-response-chunk--in-bubble",
      ".bonsai-scope .bonsai-ai-response-plain-stream",
    ]) {
      expect(ruleBody(css, selector)).toMatch(/line-height:\s*1\.25 !important/);
    }
    expect(css).not.toMatch(/line-height:\s*1\.4 !important/);
    expect(buildAnswerMarkdownFormattingSection()).toMatch(/line-height:\s*1\.25;/);
  });
});

describe("the streamed-answer scramble's stylesheet (plan 69)", () => {
  const css = buildAnswerBubbleSection();

  it("hides the end cursor while the answer has a scramble in it", () => {
    const body = ruleBody(
      css,
      '.bonsai-scope [data-bonsai-stream-preview="true"].bonsai-ai-response-chunk:has(.bonsai-stream-scramble)::after'
    );
    expect(body).toMatch(/content:\s*none/);
  });

  it("keeps line breaks in the unsettled stretch", () => {
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble")).toMatch(/white-space:\s*pre-wrap/);
  });

  it("holds the Copy corner back, without removing it, while any letter is unsettled", () => {
    const body = ruleBody(
      css,
      ".bonsai-scope .bonsai-chat-ai-bubble:has(.bonsai-stream-scramble) + .bonsai-reply-copy-corner-slot"
    );
    expect(body).toMatch(/visibility:\s*hidden/);
    expect(body).not.toMatch(/display:\s*none/);
  });

  it("keeps each unsettled letter in the line, invisible, with its symbol drawn over it", () => {
    const letter = ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-char");
    expect(letter).toMatch(/-webkit-text-fill-color:\s*transparent/);
    expect(letter).toMatch(/position:\s*relative/);
    const symbol = ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-char::before");
    expect(symbol).toMatch(/content:\s*attr\(data-s\)/);
    expect(symbol).toMatch(/position:\s*absolute/);
    expect(symbol).toMatch(/-webkit-text-fill-color:\s*currentColor/);
  });

  it("gives each colour choice its own look", () => {
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-churn--dim")).toMatch(/opacity:\s*0\.5/);
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-churn--green")).toMatch(/color:\s*#5b9e7e/);
    expect(ruleBody(css, ".bonsai-scope .bonsai-stream-scramble-churn--cyan")).toMatch(/color:\s*#7fd3f7/);
  });
});
