import { describe, expect, it } from "vitest";
import { ALL_PRESET_IDS } from "./characterCatalog";
import {
  CHARACTER_UI_ACCENT_MAIN_BY_PRESET,
  deriveSubtleHexFromMain,
  resolveUiAccentFromCharacterSettings,
} from "./characterUiAccent";

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
});
