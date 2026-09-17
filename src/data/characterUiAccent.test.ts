import { describe, expect, it } from "vitest";
import { ALL_PRESET_IDS } from "./characterCatalog";
import {
  buildBonsaiScopeAccentInlineStyle,
  CHARACTER_UI_ACCENT_MAIN_BY_PRESET,
  deriveSubtleHexFromMain,
  liftForBar,
  resolveUiAccentFromCharacterSettings,
  TAB_BAR_LIT_HAND_PICKED,
  TAB_BAR_LIT_MIN_CONTRAST,
  toneAccentForChipTags,
} from "./characterUiAccent";

// The open strip's bar colour (TAB_BAR_STRIP_BG_HEX in unified-input/constants.ts), copied here so
// the contrast check is independent of the production formula it is verifying.
const STRIP_BG = "#141c24";
const MIN_CONTRAST = 6;

function hexToRgbForTest(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace(/^#/, ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function srgbChannelToLinearForTest(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminanceForTest(rgb: { r: number; g: number; b: number }): number {
  return (
    0.2126 * srgbChannelToLinearForTest(rgb.r) +
    0.7152 * srgbChannelToLinearForTest(rgb.g) +
    0.0722 * srgbChannelToLinearForTest(rgb.b)
  );
}

function contrastOnBar(hex: string): number {
  const lumA = relativeLuminanceForTest(hexToRgbForTest(hex));
  const lumB = relativeLuminanceForTest(hexToRgbForTest(STRIP_BG));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function channelDiffs(hexA: string, hexB: string): number[] {
  const a = hexToRgbForTest(hexA);
  const b = hexToRgbForTest(hexB);
  return [Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b)];
}

describe("characterUiAccent", () => {
  it("defines a main accent for every catalog preset id", () => {
    for (const id of ALL_PRESET_IDS) {
      const main = CHARACTER_UI_ACCENT_MAIN_BY_PRESET[id];
      expect(main, id).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    expect(Object.keys(CHARACTER_UI_ACCENT_MAIN_BY_PRESET).length).toBe(ALL_PRESET_IDS.length);
  });

  it("deriveSubtleHexFromMain returns a darker hex", () => {
    const main = "#2e8753";
    const sub = deriveSubtleHexFromMain(main);
    expect(sub).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(sub).not.toBe(main);
  });

  it("resolveUiAccentFromCharacterSettings matches roadmap activation", () => {
    expect(
      resolveUiAccentFromCharacterSettings({
        ai_character_enabled: false,
        ai_character_random: false,
        ai_character_preset_id: "cp2077_jackie",
        ai_character_custom_text: "",
      })
    ).toBeNull();
    expect(
      resolveUiAccentFromCharacterSettings({
        ai_character_enabled: true,
        ai_character_random: true,
        ai_character_preset_id: "cp2077_jackie",
        ai_character_custom_text: "",
      })
    ).toBeNull();
    expect(
      resolveUiAccentFromCharacterSettings({
        ai_character_enabled: true,
        ai_character_random: false,
        ai_character_preset_id: "cp2077_jackie",
        ai_character_custom_text: "custom",
      })
    ).toBeNull();
    const on = resolveUiAccentFromCharacterSettings({
      ai_character_enabled: true,
      ai_character_random: false,
      ai_character_preset_id: "cp2077_jackie",
      ai_character_custom_text: "",
    });
    expect(on?.main).toMatch(/^#/);
    expect(on?.subtle).toMatch(/^#/);
  });

  it("active-tab icon accent tracks the character main, and falls back when no character applies", () => {
    const style = buildBonsaiScopeAccentInlineStyle({ main: "#6c3483", subtle: "#3a1c47" }) as Record<
      string,
      string
    >;
    // 108/52/131 is #6c3483; the marker must be the character's own tone, not a fixed green.
    expect(style["--bonsai-ui-tab-active-icon"]).toBe("rgba(108, 52, 131, 0.98)");

    // No character selected: the var is absent so the stylesheet literal in section-1 applies.
    const noAccent = buildBonsaiScopeAccentInlineStyle(null) as Record<string, string>;
    expect(noAccent["--bonsai-ui-tab-active-icon"]).toBeUndefined();
  });

  it("answer-card wash lifts the accent 40% toward white at 11% alpha", () => {
    // #6c3483 is the darkest accent in the map (bg3_shadowheart) — the case the lift exists for.
    // 108+(255-108)*.4=166.8 -> 167; 52+(255-52)*.4=133.2 -> 133; 131+(255-131)*.4=180.6 -> 181.
    const style = buildBonsaiScopeAccentInlineStyle({ main: "#6c3483", subtle: "#3a1c47" }) as Record<
      string,
      string
    >;
    expect(style["--bonsai-chat-ai-bubble-wash"]).toBe("rgba(167, 133, 181, 0.11)");
  });

  describe("suggestion chip accent toning (plan 60, board B, D110 item 6)", () => {
    it("toneAccentForChipTags mixes gold to the designer's exact value", () => {
      expect(toneAccentForChipTags("#f1c40f")).toBe("#e4c94e");
    });

    it("toneAccentForChipTags mixes the default green to the designer's exact value", () => {
      expect(toneAccentForChipTags("#2e8753")).toBe("#5b9e7e");
    });

    it("sets both new scope variables when a character accent is active", () => {
      const style = buildBonsaiScopeAccentInlineStyle({ main: "#f1c40f", subtle: "#8c7409" }) as Record<
        string,
        string
      >;
      expect(style["--bonsai-ui-accent-badge"]).toBe("rgba(241, 196, 15, 0.8)");
      expect(style["--bonsai-ui-accent-toned"]).toBe("#e4c94e");
    });

    it("sets both new scope variables toned from the default green when no character is chosen", () => {
      const style = buildBonsaiScopeAccentInlineStyle(null) as Record<string, string>;
      expect(style["--bonsai-ui-accent-badge"]).toBe("rgba(46, 135, 83, 0.8)");
      expect(style["--bonsai-ui-accent-toned"]).toBe("#5b9e7e");
    });
  });

  describe("liftForBar (the open strip's lit colour)", () => {
    it("the contrast floor is 6:1, one number the Deck evening can move", () => {
      expect(TAB_BAR_LIT_MIN_CONTRAST).toBe(6);
    });

    it("leaves colours that already read on the bar unchanged", () => {
      expect(liftForBar("#f1c40f")).toBe("#f1c40f");
      expect(liftForBar("#52d88a")).toBe("#52d88a");
    });

    it("lifts Fuu's pink close to the designer's own value, at 6:1 or better", () => {
      const lit = liftForBar("#e91e8c");
      expect(channelDiffs(lit, "#f36cb6").every((d) => d <= 8)).toBe(true);
      expect(contrastOnBar(lit)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    });

    it("uses the hand-picked grey for Astarion, case-insensitively", () => {
      expect(liftForBar("#95a5a6")).toBe("#c3d0d1");
      expect(liftForBar("#95A5A6")).toBe("#c3d0d1");
    });

    it("every hand-picked colour reaches the bar's contrast floor, so a future pick cannot be unreadable", () => {
      for (const hex of Object.values(TAB_BAR_LIT_HAND_PICKED)) {
        expect(contrastOnBar(hex)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }
    });

    it("lifts dark presets just enough to read, keeping the hue instead of washing to white", () => {
      for (const hex of ["#6c3483", "#8b3a3a", "#8e6e53"]) {
        const lit = liftForBar(hex);
        const ratio = contrastOnBar(lit);
        expect(ratio).toBeGreaterThanOrEqual(6.0);
        expect(ratio).toBeLessThanOrEqual(6.2);
        const { r, g, b } = hexToRgbForTest(lit);
        expect(r < 240 || g < 240 || b < 240).toBe(true);
      }
    });

    it("gives every catalog preset a lit colour that reads at 6:1 or better", () => {
      for (const id of ALL_PRESET_IDS) {
        const main = CHARACTER_UI_ACCENT_MAIN_BY_PRESET[id];
        expect(contrastOnBar(liftForBar(main)), id).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }
    });

    it("is threaded onto the scope style as --bonsai-ui-tab-lit, absent with no character", () => {
      const style = buildBonsaiScopeAccentInlineStyle({ main: "#6c3483", subtle: "#3a1c47" }) as Record<
        string,
        string
      >;
      expect(style["--bonsai-ui-tab-lit"]).toBe(liftForBar("#6c3483"));

      const noAccent = buildBonsaiScopeAccentInlineStyle(null) as Record<string, string>;
      expect(noAccent["--bonsai-ui-tab-lit"]).toBeUndefined();
    });
  });
});
