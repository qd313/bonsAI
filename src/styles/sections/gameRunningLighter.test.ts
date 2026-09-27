/**
 * Title: Held-still animations while a game runs -- stylesheet checks
 * Purpose: Pin plan 70's frame-rate fix: with a game running, the panel drew 10 to 20 frames a
 *          second while an answer arrived. Every small animation still running then (a blinking
 *          cursor, a spinner, the question box's breathing) is a change the Deck has to redraw
 *          for, so the Main tab marks its column while a game runs and a question is in flight,
 *          and these rules hold each one still under that mark.
 * Does not: Render anything or assert paint -- jsdom has no paint engine. These read the built
 *           stylesheet text, the way section-6.test.ts does, and check each rule outranks the one
 *           it holds still: more classes in its selector, or the same with !important, and later
 *           in the stylesheet.
 */
import { describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "../bonsaiScopeStylesheet";

const MARK = ".bonsai-scope .bonsai-main-tab-column--game-steady";

function ruleBody(css: string, selector: string): { body: string; at: number } | null {
  let at = css.indexOf(selector);
  while (at >= 0) {
    const open = css.indexOf("{", at);
    const between = css.slice(at + selector.length, open);
    // The selector must end right here (or continue a selector list), not be a prefix of a longer one.
    if (/^\s*(,[^{]*)?$/.test(between)) {
      return { body: css.slice(open + 1, css.indexOf("}", open)), at };
    }
    at = css.indexOf(selector, at + 1);
  }
  return null;
}

describe("animations held still while a game runs and a question is in flight", () => {
  const css = buildBonsaiScopeStylesheet();

  it.each([
    ["the question box's breathing", ".bonsai-unified-input-host.bonsai-unified-input--asking.bonsai-glass-panel"],
    ["the question box's cursor", ".bonsai-unified-input-fake-caret"],
    ["the answer's blinking end cursor", '[data-bonsai-stream-preview="true"] .bonsai-ai-response-chunk::after'],
    ["the waiting spinner", ".bonsai-thinking-spinner"],
    ["the code-box wait chip's pulse", ".bonsai-stream-fence-wait--code"],
    ["the code-box wait chip's spinner", ".bonsai-stream-fence-wait-spin"],
  ])("%s has no animation under the mark, after the rule that runs it", (_label, target) => {
    const original = ruleBody(css, `.bonsai-scope ${target}`);
    const held = ruleBody(css, `${MARK} ${target}`);
    expect(original, "the animated rule still exists").toBeTruthy();
    expect(original!.body).toMatch(/animation:/);
    expect(held, "the held-still rule exists").toBeTruthy();
    expect(held!.body).toMatch(/animation:\s*none\s*!important/);
    expect(held!.at).toBeGreaterThan(original!.at);
  });

  it("the question box keeps its full glow, steady, rather than losing it", () => {
    const held = ruleBody(css, `${MARK} .bonsai-unified-input-host.bonsai-unified-input--asking.bonsai-glass-panel`);
    expect(held!.body).toMatch(/border-color:[^;]*!important/);
    expect(held!.body).toMatch(/box-shadow:/);
  });
});
