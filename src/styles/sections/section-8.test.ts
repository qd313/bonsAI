/**
 * Title: The Ask pill is never narrower than its own word and arrow
 * Purpose: Pin plan 96 F25. The Deck measured the pill's content 5 px wider than the pill (56 in 51;
 *          the letter-spacing after the last small-caps letter); by eye nothing was cut, but the look
 *          check and the eye disagreed. The pill now takes at least its content's width. Evidence:
 *          workshop:test-evidence/plan96-P96-F25-ASK-PILL.json.
 * Used for: the `.bonsai-ask-pill` rule in section-8.ts.
 * Does not: Measure the pill; jsdom has no layout engine. Reads the generated CSS text, as
 *           section-4.test.ts and section-5.test.ts do. The width is checked on the Deck.
 */
import { describe, expect, it } from "vitest";
import { buildSection8Section } from "./section-8";

describe("the Ask pill's width (plan 96 F25)", () => {
  it("takes at least the width of its content, so it is never narrower than its word and arrow", () => {
    const css = buildSection8Section();
    const match = css.match(/\.bonsai-askbar-target\.bonsai-ask-pill\s*\{([^}]*)\}/);
    expect(match, "no rule for the Ask pill").toBeTruthy();
    expect(match![1]).toContain("min-width: max-content");
    expect(match![1]).not.toMatch(/min-width:\s*0\b/);
  });
});
