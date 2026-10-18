import { describe, expect, it } from "vitest";
import { resolveRunningGameCharacterSuggestions } from "./runningGameCharacterSuggestions";

describe("resolveRunningGameCharacterSuggestions", () => {
  it("returns null when no app id and no display name", () => {
    expect(resolveRunningGameCharacterSuggestions(undefined, undefined)).toBeNull();
    expect(resolveRunningGameCharacterSuggestions("", "   ")).toBeNull();
  });

  it("maps Cyberpunk 2077 AppID to Jackie", () => {
    const r = resolveRunningGameCharacterSuggestions("1091500", "Cyberpunk 2077");
    expect(r).not.toBeNull();
    expect(r!.headline).toContain("Cyberpunk");
    expect(r!.entries.map((e) => e.id)).toEqual(["cp2077_jackie"]);
  });

  it("maps Portal 2 AppID to GLaDOS", () => {
    const r = resolveRunningGameCharacterSuggestions("620", "Portal 2");
    expect(r?.entries.map((e) => e.id)).toEqual(["portal_glados"]);
  });

  it("caps GTA V steam list at three presets", () => {
    const r = resolveRunningGameCharacterSuggestions("271590", "Grand Theft Auto V");
    expect(r?.entries).toHaveLength(3);
    expect(r!.entries.map((e) => e.id)).toEqual(["gta5_michael", "gta5_trevor", "gta5_lamar"]);
  });

  it("merges Team Fortress 2 (440) into three suggestions", () => {
    const r = resolveRunningGameCharacterSuggestions("440", "Team Fortress 2");
    expect(r?.entries).toHaveLength(3);
    expect(r!.entries.map((e) => e.id)).toEqual(["tf2_scout", "tf2_soldier", "tf2_pyro"]);
  });

  it("matches catalog by display name when AppID unknown", () => {
    const r = resolveRunningGameCharacterSuggestions("", "Left 4 Dead 2");
    expect(r?.entries.map((e) => e.id)).toEqual(["l4d2_ellis"]);
  });

  it("matches Zelda by substring in long Steam title", () => {
    const r = resolveRunningGameCharacterSuggestions(
      "0",
      "The Legend of Zelda: Tears of the Kingdom"
    );
    expect(r?.entries.map((e) => e.id)).toEqual(["zelda_zelda", "zelda_navi"]);
  });

  it("returns null for unrelated game name", () => {
    expect(resolveRunningGameCharacterSuggestions("", "Totally Unknown Indie Game XYZ")).toBeNull();
  });

  it("returns null for unknown numeric AppID with empty name", () => {
    expect(resolveRunningGameCharacterSuggestions("999999", "")).toBeNull();
  });
});
