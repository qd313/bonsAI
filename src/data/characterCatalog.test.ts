import { describe, expect, it } from "vitest";
import {
  ALL_PRESET_IDS,
  findCatalogEntry,
  formatAiCharacterSelectionLine,
  isValidPresetId,
  resolveMainTabAvatarPresetId,
} from "./characterCatalog";

describe("characterCatalog", () => {
  it("exposes a non-empty allowlist of preset ids", () => {
    expect(ALL_PRESET_IDS.length).toBeGreaterThan(10);
    expect(isValidPresetId("cp2077_jackie")).toBe(true);
    expect(isValidPresetId("not_a_real_id")).toBe(false);
  });

  it("findCatalogEntry resolves known ids", () => {
    const j = findCatalogEntry("cp2077_jackie");
    expect(j?.workTitle).toContain("Cyberpunk");
    expect(j?.entry.label).toContain("Jackie");
  });

  it("formatAiCharacterSelectionLine covers random, preset, custom, empty", () => {
    expect(formatAiCharacterSelectionLine({ random: true, presetId: "", customText: "" })).toBe("Random");
    expect(
      formatAiCharacterSelectionLine({ random: false, presetId: "cp2077_jackie", customText: "" })
    ).toContain("Jackie");
    expect(
      formatAiCharacterSelectionLine({ random: false, presetId: "", customText: "Custom hero" })
    ).toContain("Custom hero");
    expect(formatAiCharacterSelectionLine({ random: false, presetId: "", customText: "" })).toBe("Choose character…");
  });

  it("resolveMainTabAvatarPresetId returns null when disabled", () => {
    expect(
      resolveMainTabAvatarPresetId({
        enabled: false,
        random: true,
        presetId: "cp2077_jackie",
        customText: "",
      })
    ).toBeNull();
  });
});
