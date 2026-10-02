/**
 * Title: Chip label CSS tests
 *
 * Purpose: Prove the chip's own rules, split out of section 4, still reach the injected stylesheet
 * and still sit before the focus-bar rules that must win over them.
 */
import { describe, expect, it } from "vitest";
import { buildBonsaiScopeStylesheet } from "../bonsaiScopeStylesheet";
import { buildPresetChipLabelCss } from "./presetChipLabel";
import { buildSection4Section } from "./section-4";

describe("buildPresetChipLabelCss", () => {
  it("is written into section 4 and so into the injected stylesheet", () => {
    const css = buildPresetChipLabelCss();
    expect(css).toContain("button.bonsai-preset-glass .bonsai-preset-chip-label");
    expect(buildSection4Section()).toContain(css);
    expect(buildBonsaiScopeStylesheet()).toContain(css);
  });

  it("sits before the carousel and focus rules in section 4 (cascade order is unchanged)", () => {
    const section = buildSection4Section();
    const chipAt = section.indexOf(".bonsai-preset-chip-label {");
    const focusAt = section.indexOf("gpfocuswithin .bonsai-preset-carousel-slot--focus");
    expect(chipAt).toBeGreaterThan(-1);
    expect(focusAt).toBeGreaterThan(chipAt);
  });
});
