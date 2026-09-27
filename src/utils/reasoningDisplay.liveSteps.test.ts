/**
 * Title: The live thinking line shows the model's step titles only
 * Purpose: Pin the maintainer's option B (2026-09-27): while the model thinks, the line under the
 *          question shows only the titles of its numbered steps -- finished ones with a tick, the
 *          current one last with "…", at most five -- and nothing else from the thinking.
 * Used for: reasoningDisplay.ts's mergeLiveSteps and liveStepLines, which useReasoningFoldState
 *           and the transcript's live block are built on.
 * Solves: the Deck still showed rule-shaped lines and quoted a game note word for word, reward
 *         included, after every line-by-line clean-up (docs/test-evidence/plan72-F3-THINK.json).
 * Does not: test the drawing (MainTabChatTranscript.reasoningLiveBlock.test.tsx does).
 *
 * The fixture is every distinct text the Deck's live line drew during that check, in order
 * (reasoningDisplay.liveSteps.fixtures.json says where it came from). Each one is a slice the
 * screen received; feeding them in order is what the screen does poll by poll.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { liveStepLines, mergeLiveSteps, type LiveStep } from "./reasoningDisplay";

// Read rather than import, as kbNoteUsedByAnswer.test.ts does: no resolveJsonModule needed.
const SAMPLES = (
  JSON.parse(readFileSync(resolve(__dirname, "reasoningDisplay.liveSteps.fixtures.json"), "utf-8")) as {
    distinctSamples: string[];
  }
).distinctSamples;

function texts(steps: LiveStep[]): string[] {
  return liveStepLines(steps).map((l) => l.text);
}

/** Everything that must never reach the live line: notes, covers, rules, the model's setup. */
const NEVER = /\[hidden\]|Key info|three sisters|Mark of Pride|Hollow Knight|•|\*|STRATEGY|Mode|Voice|Constraint|Rules|:/;

describe("the Deck's own thinking, poll by poll", () => {
  it("ends on the four real steps, the rule steps left out", () => {
    let steps: LiveStep[] = [];
    for (const s of SAMPLES) steps = mergeLiveSteps(steps, s);
    expect(texts(steps)).toEqual([
      "Analyze the Request ✓",
      "Identify Game/Context ✓",
      "Consult Local Knowledge Base ✓",
      "Draft the Response…",
    ]);
  });

  it("never shows a note, a cover, a rule or a setup line at any point", () => {
    let steps: LiveStep[] = [];
    for (const s of SAMPLES) {
      steps = mergeLiveSteps(steps, s);
      for (const line of texts(steps)) expect(line).not.toMatch(NEVER);
    }
  });

  it("shows nothing before the first step heading is whole", () => {
    expect(texts(mergeLiveSteps([], "1"))).toEqual([]);
    expect(texts(mergeLiveSteps([], "1."))).toEqual([]);
    expect(texts(mergeLiveSteps([], "1.  Analyze the Request"))).toEqual([]);
  });

  it("keeps showing the last real step while the model is on a rule step", () => {
    const slice = SAMPLES.find((s) => s.includes("3.  Determine Strategy Mode: The active mode is STRATEGY GUIDE MODE."));
    expect(slice).toBeDefined();
    expect(texts(mergeLiveSteps([], slice as string))).toEqual(["Analyze the Request ✓", "Identify Game/Context…"]);
  });

  it("keeps early steps once the slice has moved past them", () => {
    const late = SAMPLES[SAMPLES.length - 5];
    expect(late.startsWith("6.  Draft the Response")).toBe(true);
    expect(texts(mergeLiveSteps([], late))).toEqual(["Draft the Response…"]);
    let steps: LiveStep[] = [];
    for (const s of SAMPLES) steps = mergeLiveSteps(steps, s);
    expect(texts(steps)[0]).toBe("Analyze the Request ✓");
  });
});

describe("the heading shapes the model writes", () => {
  it("reads the bold form the same as the plain one, without number, marks, colon or bracket", () => {
    const raw = [
      "Thinking Process:",
      "",
      "1.  **Analyze the Request:** The user is stuck on the Hollow Knight Mantis boss fight.",
      "2.  **Identify Game/Context:** The game is Hollow Knight. [hidden]",
      "3.  **Determine Strategy Mode:** The active mode is STRATEGY GUIDE MODE.",
      "4.  **Apply Strategy Mode Rules:**",
      "    *   Keep coaching free of spoilers initially.",
      "5.  Consult Local Knowledge Base:",
      "6.  **Draft the Response (Ali G Voice):**",
      "7.  **Review against Constraints:**",
    ].join("\n");
    expect(texts(mergeLiveSteps([], raw))).toEqual([
      "Analyze the Request ✓",
      "Identify Game/Context ✓",
      "Consult Local Knowledge Base ✓",
      "Draft the Response…",
    ]);
  });

  it("leaves out persona, voice, output and check steps too", () => {
    const raw = [
      "1.  **Analyze the Request:** x",
      "2.  **Determine Persona:** Ali G.",
      "3.  **Formulate the Output Structure:**",
      "4.  **Final Check:**",
      "5.  **Execution.** (Proceeding with the generated response.)",
    ].join("\n");
    expect(texts(mergeLiveSteps([], raw))).toEqual(["Analyze the Request…"]);
  });

  it("does not read an indented numbered line or a bullet as a step", () => {
    const raw = ["1.  **Analyze the Request:** x", "    1. Dodge the dash: jump.", "    • Key info: the cage closes."].join("\n");
    expect(texts(mergeLiveSteps([], raw))).toEqual(["Analyze the Request…"]);
  });

  it("shows at most the last five, the newest last", () => {
    const raw = Array.from({ length: 7 }, (_, i) => `${i + 1}.  **Step ${i + 1}:** x`).join("\n");
    expect(texts(mergeLiveSteps([], raw))).toEqual(["Step 3 ✓", "Step 4 ✓", "Step 5 ✓", "Step 6 ✓", "Step 7…"]);
  });

  it("marks finished steps as done and the current one as not", () => {
    const lines = liveStepLines(mergeLiveSteps([], "1.  **A:** x\n2.  **B:** y"));
    expect(lines.map((l) => l.done)).toEqual([true, false]);
  });

  it("shows nothing at all for thinking with no numbered steps", () => {
    expect(texts(mergeLiveSteps([], "The armour is on the front.\nSo flank it."))).toEqual([]);
  });
});
