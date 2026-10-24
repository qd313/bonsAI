import { describe, expect, it } from "vitest";
import { joinPresetWithRunningGame } from "./joinPresetWithRunningGame";

describe("joinPresetWithRunningGame", () => {
  it("returns preset text unchanged (no running-game substitution or append)", () => {
    expect(
      joinPresetWithRunningGame("What's the efficiency sweet spot for this game?"),
    ).toBe("What's the efficiency sweet spot for this game?");
    expect(joinPresetWithRunningGame("Suggest mods for this game")).toBe("Suggest mods for this game");
    expect(joinPresetWithRunningGame("Why is my Deck running hot?")).toBe("Why is my Deck running hot?");
    expect(joinPresetWithRunningGame("What are the best settings for 60fps?")).toBe(
      "What are the best settings for 60fps?",
    );
  });
});
