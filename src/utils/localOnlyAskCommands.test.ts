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

  it("requires PC IP for normal asks", () => {
    expect(questionBypassesOllamaPcIpRequirement("What TDP should I use?")).toBe(false);
  });
});
