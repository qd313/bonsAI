/**
 * Title: Chip row "ran out of chips" edge cue — stylesheet checks
 * Purpose: Pin the two things a rendered test cannot: that the cue can actually beat the chip's
 *          own resting `box-shadow: ... !important` / `border: ... !important` rule (section-6.ts,
 *          plan 60 board B; the rest state gained a real gradient, hairline and soft shadow where
 *          it used to say `box-shadow: none`), and that reduced motion drops the ramp without
 *          touching any other control's transition.
 * Used for: The blocked-edge glow wired in MainTabPresetAnimatedChips.tsx / presetRowNav.ts
 *           (roadmap `[chips]` ★★, filed 2026-09-04).
 * Does not: Render anything or assert paint — jsdom has no layout/paint engine
 *           (design-language.md rule 6). These read the generated CSS text, the same approach
 *           presetChipFocusRing.test.ts uses for the same reason.
 */
import { describe, expect, it } from "vitest";
import { buildSection4Section } from "./section-4";
import { buildSection6Section } from "./section-6";
import {
  PRESET_CHIP_BLOCKED_EDGE_FLASH_MS,
  PRESET_VISIBLE_SLOTS,
} from "../../features/preset-carousel/presetRowLayout";

describe("chip row out-of-chips edge cue (section 4 CSS)", () => {
  const css = buildSection4Section();

  it("declares the cue on the real button class, !important, so it outranks the base reset", () => {
    // section-6.ts's `.bonsai-preset-glass` sets its own resting `box-shadow: ... !important` and
    // `border: ... !important`; only a higher-specificity !important rule for the same
    // properties can still paint anything on the flagged chip.
    const match = css.match(
      /\.bonsai-scope button\.bonsai-preset-glass\.bonsai-preset-chip-blocked-edge\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toMatch(/border-color:\s*rgba\(56,\s*189,\s*248,\s*0\.85\)\s*!important/);
    expect(body).toMatch(/box-shadow:\s*0 0 8px 1px rgba\(56,\s*189,\s*248,\s*0\.45\)\s*!important/);
    // A transition, not @keyframes -- see the comment above the rule for why a keyframe
    // animation cannot win against the !important reset.
    expect(body).toMatch(/transition:/);
    expect(css).not.toMatch(/@keyframes\s+bonsai-preset-chip-blocked-edge/);
  });

  it("respects reduced motion: the ramp is dropped, and only for this one selector", () => {
    const reducedBlock = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)$/);
    expect(reducedBlock).toBeTruthy();
    const body = reducedBlock![1]!;
    expect(body).toContain(".bonsai-preset-glass.bonsai-preset-chip-blocked-edge");
    expect(body).toMatch(/transition:\s*none\s*!important/);
    // Scoped to the modifier class alone -- must not also silence the bare .bonsai-preset-glass
    // selector, which would kill the unrelated dimmed/undimmed carousel fade.
    expect(body).not.toMatch(/\.bonsai-scope\s+\.bonsai-preset-glass\s*\{/);
  });

  it("never widens the chip: no width, transform or margin on the cue rule", () => {
    const match = css.match(
      /\.bonsai-scope button\.bonsai-preset-glass\.bonsai-preset-chip-blocked-edge\s*\{([^}]*)\}/,
    );
    const body = match![1]!;
    expect(body).not.toMatch(/\b(width|transform|margin)\s*:/);
  });

  it("keeps the CSS ramp shorter than the JS flash window it lives inside", () => {
    const match = css.match(/transition:\s*border-color\s+(\d+)ms/);
    expect(match).toBeTruthy();
    const rampMs = Number(match![1]);
    expect(rampMs).toBeGreaterThan(0);
    expect(rampMs).toBeLessThan(PRESET_CHIP_BLOCKED_EDGE_FLASH_MS);
  });
});

describe("the settings-results card's surface is fully opaque (section 4 CSS)", () => {
  const css = buildSection4Section();

  it("declares a solid background with no alpha channel at all", () => {
    const match = css.match(
      /\.bonsai-scope \.bonsai-settings-results-card\.bonsai-glass-panel\s*\{([^}]*)\}/,
    );
    expect(match).toBeTruthy();
    const body = match![1]!;
    // rgb(), not rgba() -- an alpha of even 0.92 still let a chat title and a reply's own text
    // read straight through on device (2026-09-16, build ca12429); nothing short of "no alpha
    // channel" rules that class of surprise out for good.
    expect(body).toMatch(/background:\s*rgb\(18,\s*26,\s*34\)\s*!important/);
    expect(body).not.toMatch(/background:\s*rgba\(/);
    // Blur has nothing left to do once nothing behind the card can show through it regardless,
    // and the shared blur rule below carries no !important of its own to fight anyway.
    expect(body).toMatch(/backdrop-filter:\s*none\s*!important/);
  });

  it("declares it on a three-class selector, so it structurally outranks the shared two-class glass-panel rule", () => {
    // section-6.ts's `.bonsai-scope .bonsai-glass-panel { background: rgba(...) !important; }` is
    // two class selectors (bonsai-scope, bonsai-glass-panel). Both declarations carry !important,
    // so the higher-specificity one wins regardless of which file's rule comes later in the
    // concatenated stylesheet (bonsaiScopeStylesheet.ts orders section 4 before section 6) --
    // matched here by literally counting the selector's own class segments rather than trusting
    // that arithmetic to stay true as the rule is edited later.
    const selectorMatch = css.match(
      /(\.bonsai-scope \.bonsai-settings-results-card\.bonsai-glass-panel)\s*\{/,
    );
    expect(selectorMatch).toBeTruthy();
    const classCount = (selectorMatch![1]!.match(/\.[\w-]+/g) ?? []).length;
    expect(classCount).toBe(3);

    // Verified against section-6.ts's own output, not just asserted in a comment: the shared rule
    // this has to outrank really is only two class selectors, on the exact property this fights
    // over.
    const baseCss = buildSection6Section();
    // Specifically the bare rule (background, no comma-joined selector list) -- section-6.ts also
    // has an earlier `.bonsai-glass-panel, .bonsai-preset-glass { backdrop-filter: ... }` block
    // that shares the same leading selector text but is not the one this fight is over.
    const baseMatch = baseCss.match(/(\.bonsai-scope \.bonsai-glass-panel)\s*\{([^}]*)\}/);
    expect(baseMatch).toBeTruthy();
    const baseSelectorClassCount = (baseMatch![1]!.match(/\.[\w-]+/g) ?? []).length;
    expect(baseSelectorClassCount).toBe(2);
    expect(baseMatch![2]).toMatch(/background:\s*rgba\([^)]*\)\s*!important/);
    expect(classCount).toBeGreaterThan(baseSelectorClassCount);
  });
});

describe("carousel track width reads the one-suggestion-chip override (section 4 CSS)", () => {
  const css = buildSection4Section();

  it("the slide distance falls back to PRESET_VISIBLE_SLOTS but reads --bonsai-preset-visible-slots", () => {
    // MainTabPresetAnimatedChips writes --bonsai-preset-visible-slots on the track (alongside
    // --bonsai-preset-window-start) so the "one suggestion chip" setting can override the window
    // width per render without a rebuild; PRESET_VISIBLE_SLOTS is only the fallback for the rare
    // case nothing wrote the variable.
    expect(css).toContain(
      `var(--bonsai-preset-visible-slots, ${PRESET_VISIBLE_SLOTS}))`,
    );
    const transformMatch = css.match(/transform:\s*translateX\(([\s\S]*?)\)\s*!important;/);
    expect(transformMatch).toBeTruthy();
    expect(transformMatch![1]).toContain("var(--bonsai-preset-visible-slots");
  });

  it("each chip's share of the row also reads the same variable, not a baked-in pixel width", () => {
    const flexMatch = css.match(
      /\.bonsai-scope \.bonsai-preset-carousel-track > \.bonsai-preset-carousel-slot\s*\{([^}]*)\}/,
    );
    expect(flexMatch).toBeTruthy();
    expect(flexMatch![1]).toContain("var(--bonsai-preset-visible-slots");
    // No pixel width is measured or hard-coded here (design-language rule 4).
    expect(flexMatch![1]).not.toMatch(/\d+px\s*\)\s*\/\s*\d/);
  });
});

describe("room under the suggestion chips (section 4 CSS)", () => {
  const css = buildSection4Section();

  // Measured on the Deck 2026-09-17 (docs/test-evidence/plan60-measure-before.json): the chips had
  // no room under them at all in three of the four animation modes, so the chip's soft shadow was
  // cut off and the chips touched the question box. These pin the numbers that fixed it, because
  // nothing in jsdom can measure a shadow (design-language.md rule 6).

  it("gives the row 8px under the chips: 5 for the shadow, 3 clear of the box below", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-preset-row-host\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    expect(match![1]!).toMatch(/padding-bottom:\s*8px\s*!important/);
  });

  it("drops fade mode's own gap from 12 to 4, so fade mode still totals 12", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-preset-row-host--fade-anim\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    expect(match![1]!).toMatch(/margin-bottom:\s*4px\s*!important/);
    expect(match![1]!).not.toMatch(/margin-bottom:\s*12px/);
  });

  it("lets the shadow out of the carousel's own clipping box without changing its height", () => {
    const match = css.match(/\.bonsai-scope \.bonsai-preset-carousel-viewport\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const body = match![1]!;
    expect(body).toMatch(/padding-bottom:\s*5px\s*!important/);
    expect(body).toMatch(/margin-bottom:\s*-5px\s*!important/);
  });
});
