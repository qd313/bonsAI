/**
 * Title: The live thinking line without the model's own rule checklist
 * Purpose: Pin what the thinking line keeps and what it drops, using thinking the model really
 *          wrote on the Deck, not shapes imagined here.
 * Used for: reasoningDisplay.ts's tidyReasoningText.
 * Solves: the roadmap bug "The live thinking line shows the model's own rule checklist while it
 *         works" -- the checklist, stray backtick marks and a raw "Thinking Process" heading showed
 *         on every answer.
 * Does not: prove anything about how the block looks; the transcript's own tests do that.
 *
 * Where the fixtures come from. Every line's words are copied from a Deck read:
 *   - CHECKLIST_SCREENSHOT: docs/test-evidence/plan70-THINKING-CHECKLIST.png (the maintainer's own
 *     screenshot), line for line.
 *   - OPEN_WORLD and PARRYING: the live-line reads in docs/test-evidence/plan64-GHOST-QUESTION-01.json.
 *     Those reads were taken with textContent, which loses line breaks, so the breaks and the
 *     "1.  " / "    *   " indents are put back in the layout the screenshot above and the saved
 *     thinking in docs/test-evidence/plan57-desk-summary.json show ("Thinking Process:\n\n1.  **...").
 *   - NOTE_TITLE: the backtick-quoted note title in docs/test-evidence/plan70-THINKING-SPOILER-01-try2.json.
 */
import { describe, expect, it } from "vitest";
import { tidyReasoningText } from "./reasoningDisplay";

const CHECKLIST_SCREENSHOT = [
  "    *   Direct and concise? Yes, within the character constraints.",
  "    *   No tool use claimed? Yes.",
  "    *   No unnecessary JSON blocks (no performance/power talk requested)? Yes.",
  "",
  "8.  **Generate Output.** (This leads to the final response.)",
].join("\n");

const OPEN_WORLD = [
  "Thinking Process:",
  "",
  '1.  **Analyze the Request:** The user is asking, "how should i spend my first hour in a new open world game."',
  "2.  **Determine Mode:** The system is in STRATEGY GUIDE MODE.",
  "3.  **Determine Persona:** The character voice is Ali G from Da Ali G Show (streetwise interviewer humor, pronounced accent, rhythm, attitude).",
  "4.  **Determine Constraints:**",
  "    *   Must start with `<bonsai-status>`.",
  "    *   Must be patient coach, plain spoken, short steps.",
  "    *   Must infer game title/progress (currently none provided).",
  "    *   Must lead with tactics, skip orientation.",
  "    *   Must end with *exactly one* fenced JSON branch block.",
  "    *   Strategy Spoiler Policy: Coaching is spoiler-minimized by default. Use ````bonsai-spoiler ...```` for unavoidable spoilers.",
  "    *   No hardware/power talk (TDP/GPU).",
  "5.  **Address Context Gap:** No game title or progress is provided. I must state uncertainty honestly but still provide actionable, general advice based on the prompt.",
  "6.  **Develop Strategy (First Hour in Open World):** The best advice for a new open-world game is usually: exploration, understanding movement/controls, finding the main objective/hub, and getting familiar with basic mechanics.",
  "9.  **Final Review:** Check against all constraints (Status line, Voice, Strategy Mode, No hardware talk, JSON fence structure).",
  "    *(Execution)*",
].join("\n");

const PARRYING = [
  "6.  **Formulate the Output Structure:**",
  "    *   Status Line",
  "    *   The mandatory JSON branch fence.",
  "7.  **Drafting - Self-Correction:**",
  "    *   *Initial thought:* Just tell them to practice against bots.",
  "    *   *Correction:* Too generic. Need to make it sound like Ali G is giving insider tips.",
  "    *   *Focus:* Focus on timing and muscle memory, keeping it simple for a handheld player.",
  "8.  **Final Check:**",
  "    *   Ali G voice? Yes.",
  "    *   Ends with exactly one JSON branch fence? Yes.",
  "9.  **Execution.** (Proceeding with the generated response.)",
].join("\n");

const NOTE_TITLE =
  "    *   `[Hollow Knight / mechanic: Starting out in Hollow Knight]` covers the first area. The context is Hollow Knight. [hidden]";

describe("the model's rule checklist leaves the live thinking line", () => {
  it("drops the yes/no self-check from the maintainer's screenshot", () => {
    const out = tidyReasoningText(CHECKLIST_SCREENSHOT, { dropRuleChecklist: true });
    expect(out).not.toMatch(/Direct and concise/);
    expect(out).not.toMatch(/No tool use claimed/);
    expect(out).not.toMatch(/Generate Output/);
  });

  it("keeps the real working-through and drops the restated rules (open-world question)", () => {
    const out = tidyReasoningText(OPEN_WORLD, { dropRuleChecklist: true });
    expect(out).toBe(
      [
        '1.  Analyze the Request: The user is asking, "how should i spend my first hour in a new open world game."',
        "2.  Determine Mode: The system is in STRATEGY GUIDE MODE.",
        "3.  Determine Persona: The character voice is Ali G from Da Ali G Show (streetwise interviewer humor, pronounced accent, rhythm, attitude).",
        "5.  Address Context Gap: No game title or progress is provided. I must state uncertainty honestly but still provide actionable, general advice based on the prompt.",
        "6.  Develop Strategy (First Hour in Open World): The best advice for a new open-world game is usually: exploration, understanding movement/controls, finding the main objective/hub, and getting familiar with basic mechanics.",
      ].join("\n"),
    );
  });

  it("keeps the drafting and self-correction, drops the output format and the final check (parrying question)", () => {
    const out = tidyReasoningText(PARRYING, { dropRuleChecklist: true });
    expect(out).toBe(
      [
        "7.  Drafting - Self-Correction:",
        "    • Initial thought: Just tell them to practice against bots.",
        "    • Correction: Too generic. Need to make it sound like Ali G is giving insider tips.",
        "    • Focus: Focus on timing and muscle memory, keeping it simple for a handheld player.",
      ].join("\n"),
    );
  });

  it("drops restated rules and self-checks even when the slice starts below their heading", () => {
    const slice = [
      "    *   Must use the CHARACTER VOICE (Ali G).",
      "    *   Must be a patient coach for Steam Deck (assume gamepad).",
      "    *   Status line? Yes.",
      "4.  **Develop the Strategy (Parrying Practice):** Since no game is specified, I need to give general, actionable advice.",
    ].join("\n");
    expect(tidyReasoningText(slice, { dropRuleChecklist: true })).toBe(
      "4.  Develop the Strategy (Parrying Practice): Since no game is specified, I need to give general, actionable advice.",
    );
  });

  it("keeps a real question the model asks itself about the game, and a 'must' inside its own drafting", () => {
    const text = [
      "3.  **Recall the fight:**",
      "    *   Is the boss weak to fire? Yes, the notes say so.",
      "    *   Must dodge left on the second slam.",
    ].join("\n");
    expect(tidyReasoningText(text, { dropRuleChecklist: true })).toBe(
      ["3.  Recall the fight:", "    • Is the boss weak to fire? Yes, the notes say so.", "    • Must dodge left on the second slam."].join(
        "\n",
      ),
    );
  });
});

describe("the marks and the heading the model writes for itself", () => {
  it("removes backticks around a quoted note title but keeps the title and the [hidden] cover", () => {
    expect(tidyReasoningText(NOTE_TITLE)).toBe(
      "• [Hollow Knight / mechanic: Starting out in Hollow Knight] covers the first area. The context is Hollow Knight. [hidden]",
    );
  });

  it("removes the raw Thinking Process heading and the bold marks, but not the rule checklist, when not asked to", () => {
    const out = tidyReasoningText(OPEN_WORLD);
    expect(out.startsWith("1.  Analyze the Request:")).toBe(true);
    expect(out).not.toMatch(/Thinking Process/);
    expect(out).not.toMatch(/[`*]/);
    expect(out).toMatch(/Must start with <bonsai-status>\./);
  });

  it("leaves ordinary prose exactly as it was", () => {
    expect(tidyReasoningText("The armour is on the front.\nSo flank it.")).toBe(
      "The armour is on the front.\nSo flank it.",
    );
  });
});

describe("the live-line tidy (dropRuleChecklist)", () => {
  it("leaves nothing of the screenshot's checklist", () => {
    expect(tidyReasoningText(CHECKLIST_SCREENSHOT, { dropRuleChecklist: true })).toBe("");
  });

  it("draws the open-world thinking without the heading, the marks or the rules", () => {
    const out = tidyReasoningText(OPEN_WORLD, { dropRuleChecklist: true });
    expect(out.startsWith("1.  Analyze the Request:")).toBe(true);
    expect(out).not.toMatch(/Thinking Process|Must start|`|\*\*/);
  });
});
