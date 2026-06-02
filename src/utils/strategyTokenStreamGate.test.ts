import { describe, expect, it } from "vitest";
import { shouldSuppressStrategyTokenStreamPreview } from "./strategyTokenStreamGate";

describe("shouldSuppressStrategyTokenStreamPreview", () => {
  it("suppresses when strategy + masking on and user has not consented", () => {
    expect(
      shouldSuppressStrategyTokenStreamPreview({
        askMode: "strategy",
        strategySpoilerMaskingEnabled: true,
        strategySpoilerConsentForNextAsk: false,
      }),
    ).toBe(true);
  });

  it("does not suppress when user opts into spoilers for this ask", () => {
    expect(
      shouldSuppressStrategyTokenStreamPreview({
        askMode: "strategy",
        strategySpoilerMaskingEnabled: true,
        strategySpoilerConsentForNextAsk: true,
      }),
    ).toBe(false);
  });

  it("does not suppress when spoiler masking is disabled", () => {
    expect(
      shouldSuppressStrategyTokenStreamPreview({
        askMode: "strategy",
        strategySpoilerMaskingEnabled: false,
        strategySpoilerConsentForNextAsk: false,
      }),
    ).toBe(false);
  });

  it("does not suppress outside strategy mode", () => {
    expect(
      shouldSuppressStrategyTokenStreamPreview({
        askMode: "speed",
        strategySpoilerMaskingEnabled: true,
        strategySpoilerConsentForNextAsk: false,
      }),
    ).toBe(false);
  });
});
