/**
 * Title: The chat row's dots line up — stylesheet checks
 * Purpose: Pin the two causes found on the Deck on 2026-09-27 (plan 72, flow D,
 *          docs/test-evidence/plan72-D-DOTS-*.json) for "the dots under the chat name don't line
 *          up". The round dots were already painted on the same screen rows in every state; what
 *          the eye caught was (1) the "+" at the left end, a text glyph that snaps to its own text
 *          line and sat one screen pixel low with the row lit, and (2) the chat name's glow,
 *          clipped to the name's box, which ended 0.2px inside the dots and lit the dim dots' top
 *          row, so the bright active dot looked a hair lower than the rest.
 * Used for: savedChatSlotDots.ts (the + marker) and savedChatSlotsRow.ts (the name line's lift).
 * Does not: Measure where anything lands — jsdom has no layout engine. The painted centres are
 *           measured on the Deck from full-size screenshots (the dots' lit-pixel centres).
 */
import { describe, expect, it } from "vitest";
import { buildSavedChatSlotDotsSection } from "./savedChatSlotDots";
import { buildSavedChatSlotsRowSection } from "./savedChatSlotsRow";
import { uiScalePx } from "./uiScalePx";

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  expect(match, `no rule for ${selector}`).toBeTruthy();
  return match![1]!;
}

/** The rule body without its comments, so a word in an explanation cannot pass a check. */
function declarations(css: string, selector: string): string {
  return ruleBody(css, selector).replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("the + at the left end of the dots is painted in its own box, like a dot (plan 72)", () => {
  const css = buildSavedChatSlotDotsSection();
  const create = declarations(css, ".bonsai-scope .bonsai-chat-slot-dot--create");

  it("draws the + as two bars in the box's background, crossing at the box's centre", () => {
    const bar = uiScalePx(1);
    expect(create).toContain(`linear-gradient(currentColor, currentColor) center / 100% ${bar} no-repeat`);
    expect(create).toContain(`linear-gradient(currentColor, currentColor) center / ${bar} 100% no-repeat`);
    expect(create).toMatch(/background:\s*var\(--bonsai-slot-plus\)/);
  });

  it("does not paint a text glyph, which snaps to its own line rather than the dots' boxes", () => {
    expect(create).toMatch(/font-size:\s*0/);
    expect(create).not.toMatch(/align-items|justify-content/);
  });

  it("keeps the same box as every other dot", () => {
    const dot = declarations(css, ".bonsai-scope .bonsai-chat-slot-dot");
    for (const decl of [`width: ${uiScalePx(4)}`, `height: ${uiScalePx(4)}`]) {
      expect(dot).toContain(decl);
      expect(create).toContain(decl);
    }
  });

  it("keeps the bars when the + is the active spot, lit or not (no rule paints over them)", () => {
    for (const selector of [
      ".bonsai-scope .bonsai-chat-slot-dot--create.bonsai-chat-slot-dot--active",
      ".bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--create.bonsai-chat-slot-dot--active",
    ]) {
      expect(declarations(css, selector)).toMatch(/background:\s*var\(--bonsai-slot-plus\)/);
    }
  });
});

describe("the chat name's line sits clear of the dots, so its glow cannot touch them (plan 72)", () => {
  const css = buildSavedChatSlotsRowSection();
  const titleRow = declarations(css, ".bonsai-scope .bonsai-chat-slot-title-row");

  it("lifts the whole name line 1px by its paint, not its layout", () => {
    expect(titleRow).toMatch(/position:\s*relative/);
    expect(titleRow).toContain(`top: ${uiScalePx(-1)}`);
    expect(titleRow).not.toMatch(/margin-top/);
  });

  it("lifts the name itself only with its line, so it stays centred on the save icon and the x", () => {
    const title = declarations(css, ".bonsai-scope .bonsai-chat-slot-title");
    expect(title).not.toMatch(/(^|[;\s])top:/);
    expect(title).not.toMatch(/margin-top|transform/);
  });
});
