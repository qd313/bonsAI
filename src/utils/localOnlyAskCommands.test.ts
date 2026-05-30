import { describe, expect, it } from "vitest";
import { INPUT_SANITIZER_COMMAND_DISABLE, INPUT_SANITIZER_COMMAND_ENABLE } from "../data/inputSanitizerCommands";
import { questionBypassesOllamaPcIpRequirement } from "./localOnlyAskCommands";

describe("questionBypassesOllamaPcIpRequirement", () => {
  it("allows exact sanitizer keyword lines (no leading slash — matches backend)", () => {
    expect(questionBypassesOllamaPcIpRequirement(INPUT_SANITIZER_COMMAND_DISABLE)).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement(INPUT_SANITIZER_COMMAND_ENABLE)).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement(`  ${INPUT_SANITIZER_COMMAND_DISABLE}  `)).toBe(true);
  });

  it("allows shortcut-setup keywords, including optional leading slash", () => {
    expect(questionBypassesOllamaPcIpRequirement("bonsai:shortcut-setup-deck")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("/bonsai:shortcut-setup-stadia")).toBe(true);
  });

  it("allows vac-check with optional slash and trailing args", () => {
    expect(questionBypassesOllamaPcIpRequirement("bonsai:vac-check")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("/bonsai:vac-check 76561198000000000")).toBe(true);
    expect(questionBypassesOllamaPcIpRequirement("bonsai:vac-check\t76561198000000000")).toBe(true);
  });

  it("does not bypass for normal questions or unrelated bonsai lines", () => {
    expect(questionBypassesOllamaPcIpRequirement("What is my TDP?")).toBe(false);
    expect(questionBypassesOllamaPcIpRequirement("bonsai:vac-checks are cool")).toBe(false);
    expect(questionBypassesOllamaPcIpRequirement("prefix bonsai:vac-check")).toBe(false);
  });
});
