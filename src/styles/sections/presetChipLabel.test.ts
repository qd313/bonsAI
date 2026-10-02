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

  it("clips the words in the room and keeps the moving words on one line", () => {
    const css = buildPresetChipLabelCss();
    const room = css.match(/\.bonsai-preset-chip-text--marquee\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(room).toMatch(/overflow:\s*hidden/);
    const moving = css.match(/\.bonsai-preset-chip-text-run\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(moving).toMatch(/display:\s*inline-block/);
    expect(moving).toMatch(/white-space:\s*nowrap/);
  });

  /*
   * Centred words (plan 79 I, part two). jsdom lays nothing out, so this reads what the Deck's
   * layout is told: the label row centres what is in it, and the words take only the room they
   * need (they do not stretch to fill the chip and sit at its left). A long chip is the exception
   * by construction: its words are wider than the room, so the room is all it takes and the scroll
   * starts from the left edge as before.
   */
  it("centres the words of a chip that fits, badges and all", () => {
    const css = buildBonsaiScopeStylesheet();
    const label = [...css.matchAll(/[^{}]*\.bonsai-preset-chip-label\s*\{([^}]*)\}/g)].map((m) => m[1]).join("\n");
    expect(label).toMatch(/justify-content:\s*center/);
    expect(label).toMatch(/text-align:\s*center/);
    expect(label).not.toMatch(/text-align:\s*left/);
    expect(label).not.toMatch(/justify-content:\s*(flex-start|start|left)/);
  });

  it("lets the words take only the room they need, and shrink to the chip when they are longer", () => {
    const css = buildPresetChipLabelCss();
    const words = css.match(/\.bonsai-preset-chip-text\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(words).toMatch(/flex:\s*0 1 auto/);
    expect(words).toMatch(/min-width:\s*0/);
  });
});
