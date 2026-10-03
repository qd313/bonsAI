/**
 * Title: The thinking tidy leaves out the model's setup lines
 * Purpose: Pin that the model's setup lines quoted back ("Mode: Strategy Guide mode (active)",
 *          "Voice: Ali G") are left out of the tidy thinking, and a line about the game is not.
 * Used for: reasoningDisplay.ts's tidyReasoningText.
 * Solves: the plan 72 Deck check still showed these lines after the rule checklist was taken out.
 * Does not: prove how it looks on the Deck.
 *
 * Where the fixtures come from: the 250 ms samples of the live line taken on the Deck on
 * 2026-09-27 (docs/test-evidence/plan72-F-THINK.json, "distinctLiveLines" and "oddities"; the raw
 * samples were kept in the session's scratch folder). Those samples are what the screen drew, i.e.
 * after the first clean-up: its "•" was the model's "*   " and bold stars were already gone. The
 * fixtures put the model's "*   " back; every word is the Deck's.
 */
import { describe, expect, it } from "vitest";
import { tidyReasoningText } from "./reasoningDisplay";

/* Samples at 16.75 s to 18.26 s: the "Determine Constraints" heading has scrolled off above. The
 * cut-off opening fragment ("straints:") is left out here: dropping it was the removed live-line
 * trimming's job, not the tidy's. */
const SETUP_LINES_SLICE = [
  "    *   Mode: Strategy Guide mode (active).",
  "    *   Voice: Ali G (streetwise interviewer humor, pronounced accent, rhythm, idioms).",
  "    *   Constraint (Strategy Guide): Keep coaching free of spoilers. Only use bonsai-spoiler for unavoidable spoilers.",
  "    *   Constraint (Structure): Start with a status line, use the required opening fence, and end only with the closing fence.",
  "    *   Constraint (Content): Must lead with tactics, skip orientation, and end with the branch fence.",
  "",
  "4.  [hidden]",
  '    *   "The three sisters on the thrones in the Mantis Village do not attack until you challenge them, and then a cage closes with spike pits either side."',
].join("\n");

describe("the model's setup lines quoted back", () => {
  it("leaves out Mode, Voice and Constraint lines and keeps the note about the game", () => {
    expect(tidyReasoningText(SETUP_LINES_SLICE, { dropRuleChecklist: true })).toBe(
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
