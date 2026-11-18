/**
 * Title: An ending question's answer shows only a cover until it is opened
 * Purpose: Pin plan 106 lane H2, on what the screen draws. "How does Hollow Knight end?" came back with
 *          its first sentence (the final boss and the outcome) in plain view. The back end now puts the
 *          whole answer inside one hidden block (spoilers/ending_question_cover.py); these strings are
 *          what it writes, read from tests/contracts/ending-cover-answers.json, and the page must draw
 *          nothing of the answer until the person opens the cover, from the first streamed word on.
 * Used for: MainTabChatTranscript.tsx (the live bubble and a finished turn) with the cover reading in
 *           MainTabBonsaiAiMarkdownChunk.tsx and the stream preparer.
 * Solves: The ending spoiled in the answer's opening sentence, live and finished.
 * Does not: Prove the look or the timing on the Deck; that is the Deck check ("How does Hollow Knight
 *           end?" shows only the cover until opened; "What does the Soul meter do?" is not covered).
 *           The Python half (tests/test_ending_question_cover.py) proves the back end writes these strings.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "../markdown/MainTabBonsaiAiMarkdownChunk";
import { repoRoot } from "../../../test-harness/repoPaths";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";

type Case = {
  name: string;
  question: string;
  model_text: string;
  finished: string;
  streamed: [string, string][];
};
const cases = (
  JSON.parse(readFileSync(resolve(repoRoot(), "tests", "contracts", "ending-cover-answers.json"), "utf-8")) as {
    cases: Case[];
  }
).cases;

/* Words of the answers that must never be on screen while the cover is shut. */
const SPOILER_WORDS = ["final boss", "ascending", "Light wins", "credits roll", "Black Egg"];

function liveProps(c: Case, shown: string): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: true,
    selectedAttachment: null,
    ollamaContext: { app_id: "", app_context: "none", app_name: "", asked_entity: "" },
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: c.question,
    lastExchange: null,
    isStreamingPreview: true,
    streamDisplayText: shown,
    strategySpoilerMaskingEnabled: true,
    onAskOllama: async () => {},
  };
}

function finishedProps(c: Case, answer: string): MainTabChatTranscriptProps {
  const turn: AskThreadCollapsedTurn = {
    id: "t1",
    question: c.question,
    answer,
    transparency: { route: "ollama", success: true, context_chips: [], overflow_skips: [] },
  };
  return {
    ...liveProps(c, ""),
    isAsking: false,
    isStreamingPreview: false,
    streamDisplayText: undefined,
    askThreadCollapsed: [turn],
    expandedTurnKey: turn.id,
    askThreadDisplayQuestion: "",
  };
}

function plainViewLeaks(container: HTMLElement): string[] {
  const text = container.textContent ?? "";
  return SPOILER_WORDS.filter((w) => text.includes(w));
}

beforeEach(() => resetSpoilerFenceOpenCountForTests());

describe.each(cases)("the answer to an ending question: $name", (c) => {
  it("shows no word of the answer at any point while it streams, from the first word", () => {
    for (const [, shown] of c.streamed) {
      const { container, unmount } = render(<MainTabChatTranscript {...liveProps(c, shown)} />);
      expect(plainViewLeaks(container)).toEqual([]);
      const covered =
        container.querySelector(".bonsai-spoiler-reveal-target") !== null ||
        (container.textContent ?? "").includes("Spoiler hidden until complete");
      expect(covered).toBe(true);
      unmount();
    }
  });

  it("draws the finished answer as one cover and nothing else in plain view", () => {
    const { container } = render(<MainTabChatTranscript {...finishedProps(c, c.finished)} />);
    expect(container.querySelectorAll(".bonsai-spoiler-reveal-target")).toHaveLength(1);
    expect(plainViewLeaks(container)).toEqual([]);
  });

  it("opens to the whole answer, opening sentence included, when the person opens the cover", () => {
    const { container } = render(<MainTabChatTranscript {...finishedProps(c, c.finished)} />);
    const button = container.querySelector(".bonsai-spoiler-reveal-target button");
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    const opened = container.querySelector(".bonsai-spoiler-expanded");
    expect(opened).not.toBeNull();
    const firstSentence = c.model_text.split(/\n/)[0]!.trim();
    expect(opened!.textContent).toContain(firstSentence.replace(/```.*$/, "").trim());
    expect(opened!.textContent).not.toContain("```");
  });

  it("is a real difference: the same answer with no cover leaks into plain view", () => {
    const { container } = render(<MainTabChatTranscript {...finishedProps(c, c.model_text)} />);
    expect(plainViewLeaks(container).length).toBeGreaterThan(0);
  });
});

describe("why the back end takes a model's own cover out before covering the whole answer", () => {
  it("a cover written inside a cover ends the outer one early, and what follows is in plain view", () => {
    const c = cases[1]!;
    const naive = "```bonsai-spoiler\nIt ends in the Black Egg.\n\n```bonsai-spoiler\nThe Light wins.\n```\n\nThen the credits roll.\n```";
    const { container } = render(<MainTabChatTranscript {...finishedProps(c, naive)} />);
    expect((container.textContent ?? "").includes("credits roll")).toBe(true);
  });
});
