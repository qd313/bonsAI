/**
 * Title: Preset chip focus cue honesty
 * Purpose: Pin that a suggestion chip only looks focused when it really holds Steam's gamepad ring,
 *          and that the cue it shows is the lit bar along its own bottom edge — not Steam's white
 *          ring, which the row around the chips has been cutting off since 2026-09-01.
 * Used for: The chips' focus styling in section-4.ts and the shared white ring in
 *           gamepadAndPullModels.ts.
 * Solves: Two things found on the device. The fake focus ring of 2026-08-28 — a chip drew a
 *         highlight while the D-pad was on the tab strip above it, so the maintainer and the QA rig
 *         both read the wrong control. And the measurement of 2026-09-17, which showed the white
 *         ring had never once been visible on a chip, so the chips were given a cue drawn inside
 *         themselves instead (plan 60).
 * Does not: Check where anything is drawn on screen — jsdom has no layout or paint engine
 *           (design-language.md rule 6). These read the generated stylesheet as text, because what
 *           went wrong both times was the *selector* and the *list of effects*, not the paint.
 */
import { describe, expect, it } from "vitest";

import { buildGamepadFocusRingStylesheet } from "./sections/gamepadAndPullModels";
import { buildSection4Section } from "./sections/section-4";

/** Every individual selector in a stylesheet, comments and declarations stripped. */
function selectorsOf(css: string): string[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const heads = withoutComments.match(/[^{}]+(?=\{)/g) ?? [];
  return heads
    .flatMap((head) => head.split(","))
    .map((sel) => sel.trim())
    .filter((sel) => sel.length > 0 && !sel.startsWith("@"));
}

/**
 * The three ways a selector is allowed to claim focus styling.
 *
 * `.gpfocus` / `.gpfocuswithin` are Steam's own markers. The third is the no-ring fallback: when
 * nothing in the panel owns a gamepad ring at all — desktop, the in-IDE preview, touch — the DOM's
 * idea of focus is the best answer available, which is the same rule `elementHasGamepadFocus` uses
 * in utils/uiDocument.ts.
 */
function isGatedOnTheRing(selector: string): boolean {
  return (
    selector.includes(".gpfocus") ||
    selector.includes(".gpfocuswithin") ||
    selector.includes(":not(:has(.gpfocus))")
  );
}

const SHEETS: Array<[string, string]> = [
  ["gamepad focus rings", buildGamepadFocusRingStylesheet()],
  ["section 4", buildSection4Section()],
];

/** The rule that draws the bar, as one block of declarations. */
function focusBarRuleBody(): string {
  const css = buildSection4Section();
  const match = css.match(
    /\.bonsai-scope button\.bonsai-preset-glass\.gpfocus,[\s\S]*?\{([^}]*)\}/,
  );
  expect(match).toBeTruthy();
  return match![1]!;
}

describe("preset chip focus cue", () => {
  it.each(SHEETS)(
    "%s: the chip's focus cue never paints unless something really holds the ring",
    (_name, css) => {
      const ungated = selectorsOf(css).filter(
        (sel) =>
          (sel.includes("bonsai-preset-carousel-slot--focus") ||
            sel.includes("bonsai-preset-glass:focus-visible")) &&
          !isGatedOnTheRing(sel),
      );
      expect(ungated).toEqual([]);
    },
  );

  it("does not draw Steam's white ring on a chip any more", () => {
    // Measured on the Deck 2026-09-17: the ring is drawn 2 to 5px outside the chip, the chip fills
    // its row exactly, and the row hides anything outside itself — so no part of it was ever seen.
    // Worse, now that the row has room under it for the shadow, the ring's bottom edge would peek
    // out as a stray white underline. The chips must not be in this selector list at all.
    const ringCss = buildGamepadFocusRingStylesheet();
    expect(ringCss).not.toContain("button.bonsai-preset-glass.gpfocus");
    expect(ringCss).not.toContain("button.bonsai-preset-glass:focus-visible");
    expect(ringCss).not.toContain("button.bonsai-preset-help-chip.gpfocus");
    expect(ringCss).not.toContain("button.bonsai-preset-help-chip:focus-visible");
    // Every other control keeps it.
    expect(ringCss).toContain("button.bonsai-chat-secondary-btn.gpfocus");
    expect(ringCss).toContain("outline: 2px solid rgba(255, 255, 255, 0.9) !important;");
  });

  it("draws the bar, the hairline and the soft shadow in one list, so none of them erases another", () => {
    // box-shadow replaces the whole list rather than adding to it. Leaving the resting hairline and
    // drop shadow out of this line would flatten the chip the moment the D-pad landed on it — the
    // "two effects on the same edge can cancel each other" lesson. This is the guard for that.
    const body = focusBarRuleBody();
    expect(body).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.10\)/);
    expect(body).toMatch(/inset 0 -2px 0 rgba\(56,\s*189,\s*248,\s*0\.85\)/);
    expect(body).toMatch(/0 2px 3px rgba\(0,\s*0,\s*0,\s*0\.4\)\s*!important/);
    // The blue border that used to be the cue is gone from both stylesheets.
    expect(body).not.toMatch(/border-color:/);
    expect(buildGamepadFocusRingStylesheet()).not.toContain("rgba(56, 189, 248, 0.72)");
  });

  it("turns off Steam's own focus outline on a chip, so nothing clipped shows in its place", () => {
    expect(focusBarRuleBody()).toMatch(/outline:\s*none\s*!important/);
  });

  it("brightens the focused chip's label in every animation mode, decode included", () => {
    // Decode used to be stepped around here (`:not(.bonsai-preset-glass--decode)`) because its
    // label carried its own accent-toned colour. That rule is gone -- it tinted the resolved text
    // and the Tip badge's words too, not just the still-churning ones, which is the bug fixed
    // 2026-09-19 -- so a focused decode chip now brightens like every other mode, and this
    // selector must never single decode back out.
    const labelSelectors = selectorsOf(buildSection4Section()).filter(
      (sel) => sel.includes("bonsai-preset-chip-label") && isGatedOnTheRing(sel),
    );
    expect(labelSelectors.length).toBeGreaterThan(0);
    for (const sel of labelSelectors) {
      expect(sel).not.toContain("bonsai-preset-glass--decode");
    }
    expect(buildSection4Section()).toContain("color: #dcebf8 !important;");
  });

  it("no longer tints a decode chip's whole label with the accent colour", () => {
    // The removed rule made a decode chip's words read in the same colour family as its Tip
    // dot -- only the dot is meant to carry the accent (maintainer bug report, 2026-09-19).
    // Checked as a selector, not a substring search, because the file header comment above the
    // (now-removed) rule still names the variable in prose while explaining why it is gone.
    const css = buildSection4Section();
    expect(selectorsOf(css)).not.toContain(".bonsai-scope button.bonsai-preset-glass--decode .bonsai-preset-chip-label");
    expect(css).not.toContain("color: var(--bonsai-ui-accent-toned");
  });

  it("still marks the current row for mouse, touch and the preview, where no ring exists", () => {
    const selectors = selectorsOf(buildSection4Section());
    expect(
      selectors.some(
        (sel) =>
          sel.includes(":not(:has(.gpfocus))") && sel.includes("bonsai-preset-carousel-slot--focus"),
      ),
    ).toBe(true);
  });
});
