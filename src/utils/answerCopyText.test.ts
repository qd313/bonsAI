import { describe, expect, it } from "vitest";
import { SPOILER_HIDDEN_COPY_PLACEHOLDER, buildAnswerCopyText } from "./answerCopyText";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";

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

  // Gap 2 (plan 54): copy must use the backend's named entity too, for a name-first question the
  // local regex cannot read ("wheatley fight").
  it("includes the spoiler body for a fence mentioning the backend's named entity", () => {
    const body = [
      "```bonsai-spoiler",
      "Wheatley starts lying the moment you reach the surface.",
      "```",
    ].join("\n");
    const out = buildAnswerCopyText({
      body,
      spoilerMaskingEnabled: true,
      askQuestion: "wheatley fight",
      askedEntity: "Wheatley",
    });
    expect(out).toContain("Wheatley starts lying the moment you reach the surface.");
    expect(out).not.toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
  });
});

/*
 * Roadmap: "Copy joined two paragraphs into one" (plan72-Z-FREEPLAY.json, finding 13). An answer
 * written as one long paragraph, with no line breaks, is cut by the screen into pieces of about
 * 300 letters at sentence ends, each drawn as its own block -- so it reads as two paragraphs.
 * Copy took the source text, which has only a space there.
 */
describe("buildAnswerCopyText keeps the breaks the screen shows", () => {
  const LONG_ONE_PARAGRAPH =
    "Megaera is the first Fury you meet in Tartarus, and her fight is mostly about space. " +
    "She lashes in a wide arc, so dash through her rather than away, and keep moving between her attacks. " +
    "When her health drops she calls in help from the Underworld's shades, and the room gets crowded fast. " +
    "Clear the small ones first with a sweeping attack, then turn back to her once the floor is quiet. " +
    "Pick a boon that adds damage to your dash, because you will be dashing a lot in this fight.";

  it("puts a blank line where the screen cuts one long paragraph into two blocks", () => {
    const shown = splitResponseIntoChunks(LONG_ONE_PARAGRAPH);
    expect(shown.length).toBeGreaterThan(1);

    const copied = buildAnswerCopyText({ body: LONG_ONE_PARAGRAPH });

    expect(copied.split("\n\n")).toEqual(shown);
  });

  it("leaves a short one-paragraph answer exactly as written", () => {
    const body = "Dash through Megaera's lash rather than away from it.";
    expect(buildAnswerCopyText({ body })).toBe(body);
  });

  it("leaves an answer that already has its own paragraphs exactly as written", () => {
    const body = `${LONG_ONE_PARAGRAPH}\n\nThat is the whole fight.`;
    expect(buildAnswerCopyText({ body })).toBe(body);
  });

  it("does not cut an answer the screen keeps whole because it holds a hidden block", () => {
    const body = `${LONG_ONE_PARAGRAPH}\n\n\`\`\`bonsai-spoiler\nThe second Fury is her sister.\n\`\`\``;
    const copied = buildAnswerCopyText({ body });
    expect(copied.startsWith(LONG_ONE_PARAGRAPH)).toBe(true);
    expect(copied).toContain(SPOILER_HIDDEN_COPY_PLACEHOLDER);
  });
});
