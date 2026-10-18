import { describe, expect, it } from "vitest";
import {
  getSteamInputLexiconEntry,
  interpolateSteamInputTemplate,
  STEAM_INPUT_LEXICON_VERSION,
} from "./steam-input-lexicon";

describe("steam-input-lexicon", () => {
  it("exports a positive lexicon version for changelog and docs alignment", () => {
    expect(STEAM_INPUT_LEXICON_VERSION).toBeGreaterThan(0);
  });

  it("interpolates app id into path and steam URL templates", () => {
    expect(interpolateSteamInputTemplate("/controller/app/{appId}/gyro", "730")).toBe("/controller/app/730/gyro");
    expect(interpolateSteamInputTemplate("steam://controllerconfig/{appId}", "730")).toBe(
      "steam://controllerconfig/730"
    );
  });

  it("resolves the Phase 1 per-game controller entry", () => {
    const entry = getSteamInputLexiconEntry("phase1_per_game_controller_config");
    expect(entry).toBeDefined();
    expect(entry?.steamUrlTemplate).toContain("{appId}");
    expect(entry?.routeConfidence).toBe("Near");
  });
});
