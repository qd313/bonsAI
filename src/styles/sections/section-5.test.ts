/**
 * Title: The question box's blinking cursor — stylesheet checks
 * Purpose: Pin the root cause of a bug that came back more than once: the blinking cursor in the
 *          empty question box sat up and to the left of the hint text ("Describe the level, boss,
 *          or puzzle you're stuck on."). Measured on the Deck 2026-09-24: the cursor was pinned to
 *          the drawn overlay's corner (position absolute, left 0, top 0), which lies outside the
 *          overlay's 8px/6px padding, while the hint text starts inside it — 5px left of the "D"
 *          and 4px above it. The fix before this one matched the two font sizes, and the Deck check
 *          that closed it compared sizes, not positions.
 * Used for: The `.bonsai-unified-input-fake-caret` rules in section-5.ts, and the cursor span
 *           MainTabUnifiedAskBar.tsx draws in the line of text.
 * Does not: Measure where anything lands — jsdom has no layout engine (design-language.md rule 6).
 *           These read the generated CSS text, as section-4.test.ts and section-6.test.ts do. The
 *           position itself is checked on the Deck with scripts/probe_deck_ask_caret.py.
 */
import { describe, expect, it } from "vitest";
import { buildSection5Section } from "./section-5";
import {
  UNIFIED_CARET_GAP_PX,
  UNIFIED_CARET_WIDTH_PX,
} from "../../features/unified-input/constants";

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  expect(match, `no rule for ${selector}`).toBeTruthy();
  return match![1]!;
}

describe("the question box's blinking cursor sits in the line of text (roadmap: the cursor sits up and to the left of the hint)", () => {
  const css = buildSection5Section();
  const caret = ruleBody(css, ".bonsai-scope .bonsai-unified-input-fake-caret");
  const beforeHint = ruleBody(css, ".bonsai-scope .bonsai-unified-input-fake-caret--before-hint");

  it("is never pinned to a spot in the box, so padding, size and scale move it with the text", () => {
    for (const body of [caret, beforeHint]) {
      expect(body).not.toMatch(/position:\s*absolute/);
      expect(body).not.toMatch(/(^|[\s;])left:/);
      expect(body).not.toMatch(/(^|[\s;])top:/);
    }
    expect(css).not.toContain("fake-caret--overlay");
  });

  it("takes no room, so the text beside it never shifts or re-wraps when it appears", () => {
    expect(caret).toMatch(new RegExp(`width:\\s*${UNIFIED_CARET_WIDTH_PX}px`));
    expect(caret).toMatch(new RegExp(`margin:\\s*0 -${UNIFIED_CARET_WIDTH_PX}px 0 0`));
    expect(caret).toMatch(/display:\s*inline-block/);
  });

  it("spans the text's own line, from its top", () => {
    expect(caret).toMatch(/height:\s*1lh/);
    expect(caret).toMatch(/vertical-align:\s*top/);
  });

  it("before the hint, ends half a pixel short of the first letter", () => {
    expect(beforeHint).toMatch(
      new RegExp(`transform:\\s*translateX\\(calc\\(-100% - ${UNIFIED_CARET_GAP_PX}px\\)\\)`),
    );
  });
});
