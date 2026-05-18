import { describe, expect, it } from "vitest";
import { isLocalAskCommandWithoutOllama } from "./localAskCommands";

describe("localAskCommands", () => {
  it("treats sanitizer magic phrases as local (no Ollama)", () => {
    expect(isLocalAskCommandWithoutOllama("bonsai:disable-sanitize")).toBe(true);
    expect(isLocalAskCommandWithoutOllama("  Bonsai:Enable-Sanitize  ")).toBe(true);
    expect(isLocalAskCommandWithoutOllama("/bonsai:disable-sanitize")).toBe(false);
  });

  it("treats shortcut setup keywords as local (slash optional)", () => {
    expect(isLocalAskCommandWithoutOllama("bonsai:shortcut-setup-deck")).toBe(true);
    expect(isLocalAskCommandWithoutOllama("/bonsai:shortcut-setup-stadia")).toBe(true);
  });

  it("treats vac-check as local (slash optional)", () => {
    expect(isLocalAskCommandWithoutOllama("bonsai:vac-check")).toBe(true);
    expect(isLocalAskCommandWithoutOllama("bonsai:vac-check 76561198000000000")).toBe(true);
    expect(isLocalAskCommandWithoutOllama("/bonsai:vac-check\t76561198000000000")).toBe(true);
  });

  it("returns false for normal questions", () => {
    expect(isLocalAskCommandWithoutOllama("how do I beat the boss")).toBe(false);
    expect(isLocalAskCommandWithoutOllama("bonsai:vac-checkish")).toBe(false);
  });
});
