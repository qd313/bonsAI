import { describe, expect, it } from "vitest";
import {
  ALL_PRESET_IDS,
  findCatalogEntry,
  formatAiCharacterSelectionLine,
  isValidPresetId,
  resolveAvatarBadgeLetterFromDisplayLabel,
  resolveMainTabAvatarBadgeLetter,
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

  it("resolveAvatarBadgeLetterFromDisplayLabel uses first Unicode letter", () => {
    expect(resolveAvatarBadgeLetterFromDisplayLabel("GLaDOS")).toBe("G");
    expect(resolveAvatarBadgeLetterFromDisplayLabel("… 123")).toBe("?");
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

  it("resolveMainTabAvatarBadgeLetter returns null when disabled", () => {
    expect(
      resolveMainTabAvatarBadgeLetter({
        enabled: false,
        random: true,
        presetId: "portal_glados",
        customText: "",
      })
    ).toBeNull();
  });

  it("resolveMainTabAvatarBadgeLetter covers random, preset, custom, empty", () => {
    expect(
      resolveMainTabAvatarBadgeLetter({
        enabled: true,
        random: true,
        presetId: "portal_glados",
        customText: "",
      })
    ).toBe("?");
    expect(
      resolveMainTabAvatarBadgeLetter({
        enabled: true,
        random: false,
        presetId: "portal_glados",
        customText: "",
      })
    ).toBe("G");
    expect(
      resolveMainTabAvatarBadgeLetter({
        enabled: true,
        random: false,
        presetId: "",
        customText: "villain",
      })
    ).toBe("V");
    expect(
      resolveMainTabAvatarBadgeLetter({
        enabled: true,
        random: false,
        presetId: "",
        customText: "… 123",
      })
    ).toBe("?");
  });
});
