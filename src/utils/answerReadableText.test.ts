import { describe, expect, it } from "vitest";
import {
  CODE_SPOKEN_PHRASE,
  SPOILER_HIDDEN_SPOKEN_PHRASE,
  TABLE_SPOKEN_PHRASE,
  buildAnswerReadableText,
} from "./answerReadableText";

describe("buildAnswerReadableText", () => {
  it("returns an empty string for empty or whitespace-only text", () => {
    expect(buildAnswerReadableText({ body: "" })).toBe("");
    expect(buildAnswerReadableText({ body: "   \n\t " })).toBe("");
  });

  it("returns an empty string when the body is only internal markers", () => {
    expect(buildAnswerReadableText({ body: "[bonsai-strategy-branches](x)" })).toBe("");
  });

  it("returns plain text unchanged when there is nothing to flatten", () => {
    expect(buildAnswerReadableText({ body: "Set TDP to 10W and enable FSR." })).toBe(
      "Set TDP to 10W and enable FSR."
    );
  });

  it("strips internal bonsai-status and strategy-branch tags", () => {
    const body = [
      "<bonsai-status>thinking about it</bonsai-status>",
      "Here is the answer.",
      "[bonsai-strategy-branches](x)",
    ].join("\n");
    const out = buildAnswerReadableText({ body });
    expect(out).not.toContain("bonsai-status");
    expect(out).not.toContain("thinking about it");
    expect(out).not.toContain("bonsai-strategy-branches");
    expect(out).toBe("Here is the answer.");
  });

  it("flattens a heading, bullets and a numbered list to their words", () => {
    const body = [
      "## Boss tips",
      "- Dodge left",
      "- Use the drill",
      "1. Approach slowly",
      "2. Strike the weak point",
    ].join("\n");
    const out = buildAnswerReadableText({ body });
    expect(out).toBe("Boss tips Dodge left Use the drill Approach slowly Strike the weak point");
  });

  it("flattens bold, italic and a link to their words", () => {
    const body = "Set **TDP** to *10W*, enable _FSR_, and read the [patch notes](https://example.com/notes).";
    const out = buildAnswerReadableText({ body });
    expect(out).toBe("Set TDP to 10W, enable FSR, and read the patch notes.");
  });

  it("flattens inline code to its words", () => {
    const out = buildAnswerReadableText({ body: "Run `steamos-select-branch` to switch." });
    expect(out).toBe("Run steamos-select-branch to switch.");
  });

  it("says a spoiler is hidden here for a masked spoiler fence, without the hidden text", () => {
    const body = [
      "Here is the plan.",
      "",
      "```bonsai-spoiler",
      "The reactor core explodes in act three.",
      "```",
    ].join("\n");
    const out = buildAnswerReadableText({
      body,
      spoilerMaskingEnabled: true,
      askQuestion: "how do I beat the final boss",
      appId: null,
      spoilerConsentEffective: false,
    });
    expect(out).not.toContain("reactor core explodes");
    expect(out).toContain(SPOILER_HIDDEN_SPOKEN_PHRASE);
    expect(out).toContain("Here is the plan.");
  });

  it("reads the spoiler body when the screen would unwrap it (consent given)", () => {
    const body = [
      "Here is the plan.",
      "```bonsai-spoiler",
      "Focus fire the weak point while kiting.",
      "```",
    ].join("\n");
    const out = buildAnswerReadableText({
      body,
      spoilerMaskingEnabled: true,
      spoilerConsentEffective: true,
    });
    expect(out).toContain("Focus fire the weak point while kiting.");
    expect(out).not.toContain(SPOILER_HIDDEN_SPOKEN_PHRASE);
  });

  it("reads the spoiler body when masking is off globally, even without consent", () => {
    const body = ["```bonsai-spoiler", "The dwarf retires at the end.", "```"].join("\n");
    const out = buildAnswerReadableText({ body, spoilerMaskingEnabled: false });
    expect(out).toContain("The dwarf retires at the end.");
    expect(out).not.toContain(SPOILER_HIDDEN_SPOKEN_PHRASE);
  });

  // Gap 1 (plan 54): read-aloud must unwrap the same fences the screen shows unwrapped,
  // including a name-only low-narrative title with no AppID (an emulator shortcut).
  it("reads the spoiler body for a name-only low-narrative title with no AppID", () => {
    const body = [
      "```bonsai-spoiler",
      "Circle-strafe the boss and pop the weak point when it opens.",
      "```",
    ].join("\n");
    const out = buildAnswerReadableText({
      body,
      spoilerMaskingEnabled: true,
      appId: "",
      appName: "Doom 64: Retribution",
    });
    expect(out).toContain("Circle-strafe the boss and pop the weak point when it opens.");
    expect(out).not.toContain(SPOILER_HIDDEN_SPOKEN_PHRASE);
  });

  it("says there is a table on screen in place of a markdown table", () => {
    const body = [
      "Here are the settings:",
      "",
      "| Setting | Value |",
      "|---|---|",
      "| TDP | 10W |",
      "| FSR | On |",
      "",
      "That should help.",
    ].join("\n");
    const out = buildAnswerReadableText({ body });
    expect(out).not.toContain("TDP");
    expect(out).not.toContain("10W");
    expect(out).toContain(TABLE_SPOKEN_PHRASE);
    expect(out).toContain("Here are the settings:");
    expect(out).toContain("That should help.");
  });

  it("says there is code on screen in place of a fenced code block", () => {
    const body = [
      "Run this:",
      "",
      "```bash",
      "steamos-select-branch main",
      "```",
      "",
      "Then restart.",
    ].join("\n");
    const out = buildAnswerReadableText({ body });
    expect(out).not.toContain("steamos-select-branch");
    expect(out).toContain(CODE_SPOKEN_PHRASE);
    expect(out).toContain("Run this:");
    expect(out).toContain("Then restart.");
  });

  it("reads a character answer as written, with only formatting flattened", () => {
    const body = "Oi oi, listen up — **overclock** the drill and don't be a wasteman about it.";
    const out = buildAnswerReadableText({ body });
    expect(out).toBe("Oi oi, listen up — overclock the drill and don't be a wasteman about it.");
  });
});
