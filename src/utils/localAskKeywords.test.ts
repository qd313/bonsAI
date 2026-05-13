import { describe, expect, it } from "vitest";
import { isPcIpOptionalForLocalAsk } from "./localAskKeywords";

describe("isPcIpOptionalForLocalAsk", () => {
  it("returns false for empty or normal questions", () => {
    expect(isPcIpOptionalForLocalAsk("")).toBe(false);
    expect(isPcIpOptionalForLocalAsk("   ")).toBe(false);
    expect(isPcIpOptionalForLocalAsk("What is TDP")).toBe(false);
  });

  it("recognizes sanitizer commands (no leading slash on backend)", () => {
    expect(isPcIpOptionalForLocalAsk("bonsai:disable-sanitize")).toBe(true);
    expect(isPcIpOptionalForLocalAsk("bonsai:enable-sanitize")).toBe(true);
    expect(isPcIpOptionalForLocalAsk("BonsAI:ENABLE-SANITIZE")).toBe(true);
  });

  it("recognizes shortcut setup with optional slash", () => {
    expect(isPcIpOptionalForLocalAsk("bonsai:shortcut-setup-deck")).toBe(true);
    expect(isPcIpOptionalForLocalAsk("/bonsai:shortcut-setup-stadia")).toBe(true);
  });

  it("recognizes vac-check with optional slash and args", () => {
    expect(isPcIpOptionalForLocalAsk("bonsai:vac-check")).toBe(true);
    expect(isPcIpOptionalForLocalAsk("/bonsai:vac-check 76561198000000000")).toBe(true);
    expect(isPcIpOptionalForLocalAsk("bonsai:vac-check\t76561198000000000")).toBe(true);
  });

  it("does not treat partial prefixes as commands", () => {
    expect(isPcIpOptionalForLocalAsk("bonsai:vac-checkish")).toBe(false);
    expect(isPcIpOptionalForLocalAsk("say bonsai:vac-check")).toBe(false);
  });
});
