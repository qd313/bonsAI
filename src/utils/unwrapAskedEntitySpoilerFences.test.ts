import { describe, expect, it } from "vitest";
import {
  extractAskedBeatEntity,
  shouldUnwrapSpoilerFence,
  unwrapAskedEntitySpoilerFences,
} from "./unwrapAskedEntitySpoilerFences";

describe("unwrapAskedEntitySpoilerFences", () => {
  it("extracts Glyphid Dreadnought from beat phrasing", () => {
    expect(extractAskedBeatEntity("How do I beat Glyphid Dreadnought?")).toBe(
      "Glyphid Dreadnought"
    );
  });

  it("unwraps fence that contains the asked entity", () => {
    const q = "How do I beat Glyphid Dreadnought?";
    const raw = [
      "Here is the plan.",
      "",
      "```bonsai-spoiler",
      "Focus fire Glyphid Dreadnought weak points while kiting.",
      "```",
      "",
      "Pick a branch below.",
    ].join("\n");
    const out = unwrapAskedEntitySpoilerFences(raw, q);
    expect(out).not.toContain("```bonsai-spoiler");
    expect(out).toContain("Focus fire Glyphid Dreadnought weak points while kiting.");
  });

  it("keeps unrelated spoiler fences when AppID is narrative", () => {
    const q = "How do I beat Glyphid Dreadnought?";
    const raw = [
      "```bonsai-spoiler",
      "The true ending is that the dwarf retires.",
      "```",
    ].join("\n");
    expect(unwrapAskedEntitySpoilerFences(raw, { question: q, appId: "1174180" })).toContain(
      "```bonsai-spoiler"
    );
  });

  it("unwraps all fences for known low-spoiler-risk AppIDs", () => {
    const raw = [
      "```bonsai-spoiler",
      "Dodge the charge and focus the crystal.",
      "```",
    ].join("\n");
    const out = unwrapAskedEntitySpoilerFences(raw, { appId: "2321470" });
    expect(out).not.toContain("```bonsai-spoiler");
    expect(out).toContain("Dodge the charge and focus the crystal.");
  });

  it("unwraps all fences when spoiler consent is effective", () => {
    const raw = [
      "```bonsai-spoiler",
      "The true ending is that the dwarf retires.",
      "```",
    ].join("\n");
    const out = unwrapAskedEntitySpoilerFences(raw, {
      question: "Where should I go?",
      appId: "1174180",
      spoilerConsentEffective: true,
    });
    expect(out).not.toContain("```bonsai-spoiler");
    expect(out).toContain("The true ending is that the dwarf retires.");
  });

  it("unwraps all fences for L4D2 low-narrative AppID", () => {
    const raw = [
      "```bonsai-spoiler",
      "Hold the choke point and watch the rear.",
      "```",
    ].join("\n");
    const out = unwrapAskedEntitySpoilerFences(raw, { appId: "550" });
    expect(out).not.toContain("```bonsai-spoiler");
    expect(out).toContain("Hold the choke point and watch the rear.");
  });

  // Gap 1 (plan 54): the screen only ever checked the AppID for a low-narrative title, so an
  // emulator shortcut with no AppID — reachable only by name — kept its boxes shut even though
  // the prompt was told to relax for it.
  it("unwraps all fences for a name-only low-narrative title (no AppID)", () => {
    const raw = [
      "```bonsai-spoiler",
      "Circle-strafe the boss and pop the weak point when it opens.",
      "```",
    ].join("\n");
    const out = unwrapAskedEntitySpoilerFences(raw, {
      appId: "",
      appName: "Doom 64: Retribution",
    });
    expect(out).not.toContain("```bonsai-spoiler");
    expect(out).toContain("Circle-strafe the boss and pop the weak point when it opens.");
  });

  it("keeps fences shut for a name-only story title (no AppID) with no entity named", () => {
    const raw = [
      "```bonsai-spoiler",
      "The Courier's true allegiance is revealed at the dam.",
      "```",
    ].join("\n");
    const out = unwrapAskedEntitySpoilerFences(raw, {
      question: "What should I do next?",
      appId: "",
      appName: "Fallout: New Vegas",
    });
    expect(out).toContain("```bonsai-spoiler");
  });
});

describe("shouldUnwrapSpoilerFence", () => {
  it("qualifies on consent regardless of fence text", () => {
    expect(
      shouldUnwrapSpoilerFence("```bonsai-spoiler\nThe true ending", {
        spoilerConsentEffective: true,
      })
    ).toBe(true);
  });

  it("qualifies on a low-narrative AppID regardless of fence text", () => {
    expect(
      shouldUnwrapSpoilerFence("```bonsai-spoiler\nDodge the charge", { appId: "2321470" })
    ).toBe(true);
  });

  it("qualifies when the fence mentions the asked entity", () => {
    expect(
      shouldUnwrapSpoilerFence(
        "```bonsai-spoiler\nFocus fire Glyphid Dreadnought weak points",
        { question: "How do I beat Glyphid Dreadnought?" }
      )
    ).toBe(true);
  });

  it("does not qualify on a narrative title with no entity named", () => {
    expect(
      shouldUnwrapSpoilerFence("```bonsai-spoiler\nThe true ending is that the dwarf retires", {
        question: "Where should I go?",
        appId: "1174180",
      })
    ).toBe(false);
  });

  // Gap 1 (plan 54): the mid-stream gate must agree with the closed-fence unwrap above, or a
  // fence that opens once finished would still show the "hidden until complete" chip while it
  // streams in.
  it("qualifies a name-only low-narrative title with no AppID", () => {
    expect(
      shouldUnwrapSpoilerFence("```bonsai-spoiler\nCircle-strafe the boss", {
        appId: "",
        appName: "Doom 64: Retribution",
      })
    ).toBe(true);
  });
});
