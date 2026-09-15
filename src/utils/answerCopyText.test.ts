import { describe, expect, it } from "vitest";
import { SPOILER_HIDDEN_COPY_PLACEHOLDER, buildAnswerCopyText } from "./answerCopyText";

describe("buildAnswerCopyText", () => {
  it("returns plain body text unchanged when there is no spoiler fence or display tag", () => {
    const out = buildAnswerCopyText({ body: "Set TDP to 10W and enable FSR." });
    expect(out).toBe("Set TDP to 10W and enable FSR.");
  });

  it("strips internal bonsai-status and strategy-branch tags before copying", () => {
    const body = [
      "<bonsai-status>thinking about it</bonsai-status>",
      "Here is the answer.",
      "[bonsai-strategy-branches](x)",
    ].join("\n");
    const out = buildAnswerCopyText({ body });
    expect(out).not.toContain("bonsai-status");
    expect(out).not.toContain("bonsai-strategy-branches");
    expect(out).toContain("Here is the answer.");
  });

  it("replaces a still-masked spoiler fence with a placeholder, not the hidden text", () => {
    const body = [
      "Here is the plan.",
      "",
      "```bonsai-spoiler",
      "The reactor core explodes in act three.",
      "```",
    ].join("\n");
    const out = buildAnswerCopyText({
      body,
      spoilerMaskingEnabled: true,
      askQuestion: "how do I beat the final boss",
      appId: null,
      spoilerConsentEffective: false,
    });
    expect(out).not.toContain("reactor core explodes");
    expect(out).toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
    expect(out).toContain("Here is the plan.");
  });

  it("includes the spoiler body when the render would auto-unwrap it (consent given)", () => {
    const body = [
      "Here is the plan.",
      "```bonsai-spoiler",
      "Focus fire the weak point while kiting.",
      "```",
    ].join("\n");
    const out = buildAnswerCopyText({
      body,
      spoilerMaskingEnabled: true,
      spoilerConsentEffective: true,
    });
    expect(out).toContain("Focus fire the weak point while kiting.");
    expect(out).not.toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
    expect(out).not.toContain("```bonsai-spoiler");
  });

  it("includes the spoiler body when masking is off globally, even without consent", () => {
    const body = ["```bonsai-spoiler", "The dwarf retires at the end.", "```"].join("\n");
    const out = buildAnswerCopyText({ body, spoilerMaskingEnabled: false });
    expect(out).toContain("The dwarf retires at the end.");
    expect(out).not.toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
  });

  it("trims and returns an empty string for an empty body", () => {
    expect(buildAnswerCopyText({ body: "" })).toBe("");
    expect(buildAnswerCopyText({ body: "   \n  " })).toBe("");
  });

  // Gap 1 (plan 54): copy must unwrap the same fences the screen shows unwrapped, including a
  // name-only low-narrative title with no AppID (an emulator shortcut).
  it("includes the spoiler body for a name-only low-narrative title with no AppID", () => {
    const body = [
      "```bonsai-spoiler",
      "Circle-strafe the boss and pop the weak point when it opens.",
      "```",
    ].join("\n");
    const out = buildAnswerCopyText({
      body,
      spoilerMaskingEnabled: true,
      appId: "",
      appName: "Doom 64: Retribution",
    });
    expect(out).toContain("Circle-strafe the boss and pop the weak point when it opens.");
    expect(out).not.toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
  });
});
