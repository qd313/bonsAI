import { describe, expect, it } from "vitest";
import { INPUT_SANITIZER_COMMAND_DISABLE } from "../data/inputSanitizerCommands";
import { questionBypassesOllamaPcIpRequirement } from "./localOnlyAskCommands";

describe("questionBypassesOllamaPcIpRequirement", () => {
  it("allows sanitizer keyword commands without PC IP", () => {
    expect(questionBypassesOllamaPcIpRequirement(INPUT_SANITIZER_COMMAND_DISABLE)).toBe(true);
  });

  it("allows shortcut setup commands without PC IP", () => {
    expect(questionBypassesOllamaPcIpRequirement("bonsai:shortcut-setup-deck")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("/bonsai:shortcut-setup-stadia")).toBe(true);
  });

  it("allows vac-check without PC IP", () => {
    expect(questionBypassesOllamaPcIpRequirement("bonsai:vac-check")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("bonsai:vac-check 76561198000000000")).toBe(true);
  });

  it("treats the ban lookup chip's plain sentence as the same command", () => {
    expect(questionBypassesOllamaPcIpRequirement("Check Steam players for bans")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("check steam players for bans 76561198000000000")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("Check Steam players for bansheeX")).toBe(false);
  });

  it("allows the note commands without PC IP (plan 92: remember ... and note: ...)", () => {
    expect(questionBypassesOllamaPcIpRequirement("remember no spoilers past the City of Tears")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("  Remember that I prefer dodging")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("remember")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("note: I use dash on R1")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("Note : I use dash on R1")).toBe(true);
  });

  it("does not treat a question that only starts like a note command as one", () => {
    expect(questionBypassesOllamaPcIpRequirement("rememberable moments in Hollow Knight")).toBe(false);
    expect(questionBypassesOllamaPcIpRequirement("note that the lords drop at once")).toBe(false);
    expect(questionBypassesOllamaPcIpRequirement("do you remember where the bench is")).toBe(false);
  });

  it("requires PC IP for normal asks", () => {
    expect(questionBypassesOllamaPcIpRequirement("What TDP should I use?")).toBe(false);
  });
});
