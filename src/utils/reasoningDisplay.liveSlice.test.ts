/**
 * Title: The live thinking line's three leftovers from the plan 72 Deck check
 * Purpose: Pin the fixes for what the Deck still showed after the rule checklist was taken out:
 *          a slice opening on the tail of a cut word ("ess:"), a line that was only ".", and the
 *          model's setup lines quoted back ("Mode: Strategy Guide mode (active)", "Voice: Ali G").
 * Used for: reasoningDisplay.ts's liveReasoningText and tidyReasoningText.
 * Solves: the computer side cuts the thinking to its newest 600 characters and only then swaps a
 *         sentence naming a protected thing for "[hidden]", so a cut slice can arrive shorter than
 *         600 and the old "600 or more means it was cut" test let the half word through.
 * Does not: prove how it looks on the Deck.
 *
 * Where the fixtures come from: the 250 ms samples of the live line taken on the Deck on
 * 2026-09-27 (docs/test-evidence/plan72-F-THINK.json, "distinctLiveLines" and "oddities"; the raw
 * samples were kept in the session's scratch folder). Those samples are what the screen drew, i.e.
 * after the first clean-up: its "•" was the model's "*   " and bold stars were already gone. The
 * fixtures put the model's "*   " back; every word is the Deck's.
 */
import { describe, expect, it } from "vitest";
import { liveReasoningText, tidyReasoningText } from "./reasoningDisplay";

/* Sample at 14.0 s: shorter than 600 characters because two sentences became "[hidden]". */
const ESS_SLICE = [
  "ess:",
  "",
  '1.  **Analyze the Request:** The user is asking for help learning the pattern of the "big mantis boss" in Hollow Knight.',
  "2.  **Identify Context/Game:** The game is Hollow Knight. [hidden]",
].join("\n");

/* Samples at 14.25 s and 15.0 s: cut part way through a word or a sentence. */
const MID_WORD_SLICE = [
  'er is asking for help learning the pattern of the "big mantis boss" in Hollow Knight.',
  "2.  **Identify Context/Game:** The game is Hollow Knight. [hidden]",
].join("\n");

/* Samples at 16.75 s to 18.26 s: the "Determine Constraints" heading has scrolled off above. */
const SETUP_LINES_SLICE = [
  "straints:",
  "    *   Mode: Strategy Guide mode (active).",
  "    *   Voice: Ali G (streetwise interviewer humor, pronounced accent, rhythm, idioms).",
  "    *   Constraint (Strategy Guide): Keep coaching free of spoilers. Only use bonsai-spoiler for unavoidable spoilers.",
  "    *   Constraint (Structure): Start with a status line, use the required opening fence, and end only with the closing fence.",
  "    *   Constraint (Content): Must lead with tactics, skip orientation, and end with the branch fence.",
  "",
  "4.  [hidden]",
  '    *   "The three sisters on the thrones in the Mantis Village do not attack until you challenge them, and then a cage closes with spike pits either side."',
].join("\n");

/* Sample at 18.26 s: the slice starts inside "Constraint (Strategy Guide): ...". */
const CLOSING_BRACKET_SLICE = [
  "Guide): Keep coaching free of spoilers. Only use bonsai-spoiler for unavoidable spoilers.",
  "    *   Constraint (Content): Must lead with tactics, skip orientation, and end with the branch fence.",
  "",
  "4.  [hidden]",
].join("\n");

describe("a slice that starts part way through a line", () => {
  it("drops the tail of the cut 'Thinking Process:' heading even when the slice is under 600 characters", () => {
    expect(ESS_SLICE.length).toBeLessThan(600);
    expect(liveReasoningText(ESS_SLICE)).toBe(
      [
        '1.  Analyze the Request: The user is asking for help learning the pattern of the "big mantis boss" in Hollow Knight.',
        "2.  Identify Context/Game: The game is Hollow Knight. [hidden]",
      ].join("\n"),
    );
  });

  it("starts at the next line when the slice opens mid-word", () => {
    expect(liveReasoningText(MID_WORD_SLICE)).toBe("2.  Identify Context/Game: The game is Hollow Knight. [hidden]");
  });

  it("starts at the next line when the slice opens after an opening bracket it cannot see", () => {
    expect(liveReasoningText(CLOSING_BRACKET_SLICE)).toBe("4.  [hidden]");
  });

  it("keeps a slice that starts on a real line whole", () => {
    const whole = "[hidden]\nThe second phase is faster.";
    expect(liveReasoningText(whole)).toBe(whole);
    const quoted = '"The three sisters on the thrones do not attack until you challenge them."';
    expect(liveReasoningText(quoted)).toBe(quoted);
  });
});

describe("a slice with nothing left to read", () => {
  it("shows the short plain line instead of a lone full stop (sample at 16.5 s)", () => {
    expect(liveReasoningText(".")).toBe("Double-checking the answer…");
    expect(liveReasoningText(".\n3.  **Determine Mode and Constraints:**\n    *   Mode: Strategy Guide mode (active).")).toBe(
      "Double-checking the answer…",
    );
  });
});

describe("the model's setup lines quoted back", () => {
  it("leaves out Mode, Voice and Constraint lines and keeps the note about the game", () => {
    expect(liveReasoningText(SETUP_LINES_SLICE)).toBe(
      [
        "4.  [hidden]",
        '    • "The three sisters on the thrones in the Mantis Village do not attack until you challenge them, and then a cage closes with spike pits either side."',
      ].join("\n"),
    );
  });

  it("leaves out Persona and Character lines too, but never a line about the game", () => {
    const text = [
      "2.  **Identify Context/Game:** The game is Hollow Knight.",
      "    *   **Persona:** Ali G.",
      "    *   Character voice: Ali G (streetwise).",
      "    *   Game: Hollow Knight, early Greenpath.",
      "    *   Boss: the three sisters in the Mantis Village.",
    ].join("\n");
    expect(tidyReasoningText(text, { dropRuleChecklist: true })).toBe(
      [
        "2.  Identify Context/Game: The game is Hollow Knight.",
        "    • Game: Hollow Knight, early Greenpath.",
        "    • Boss: the three sisters in the Mantis Village.",
      ].join("\n"),
    );
  });

  it("keeps the setup lines in the opened Show reasoning block", () => {
    expect(tidyReasoningText("    *   Mode: Strategy Guide mode (active).")).toBe("• Mode: Strategy Guide mode (active).");
  });
});
