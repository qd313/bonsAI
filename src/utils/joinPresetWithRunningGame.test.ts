import { describe, expect, it } from "vitest";
import { joinPresetWithRunningGame } from "./joinPresetWithRunningGame";

describe("joinPresetWithRunningGame", () => {
  it("replaces 'this game?' with the running title (no extra 'for')", () => {
    expect(
      joinPresetWithRunningGame("What's the efficiency sweet spot for this game?", "Deep Rock Galactic: Survivor")
    ).toBe("What's the efficiency sweet spot for Deep Rock Galactic: Survivor?");
  });

  it("replaces trailing 'this game' without question mark", () => {
    expect(joinPresetWithRunningGame("Suggest mods for this game", "Portal 2")).toBe("Suggest mods for Portal 2");
  });

  it("appends an em dash and title when preset does not end with 'this game' (no extra 'for')", () => {
    expect(joinPresetWithRunningGame("Why is my Deck running hot?", "Hades")).toBe("Why is my Deck running hot? — Hades");
    expect(
      joinPresetWithRunningGame("What are the best settings for 60fps?", "Deep Rock Galactic: Survivor")
    ).toBe("What are the best settings for 60fps? — Deep Rock Galactic: Survivor");
    expect(joinPresetWithRunningGame("What GPU clock should I use?", "Hades")).toBe("What GPU clock should I use? — Hades");
  });

  it("returns preset unchanged when game name is empty", () => {
    expect(joinPresetWithRunningGame("Recommended TDP for this game?", "")).toBe("Recommended TDP for this game?");
  });
});
