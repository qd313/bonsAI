/**
 * Title: Turn header question-title expand/collapse tests
 * Purpose: Pin D60 — an OPEN turn's question header shows the whole question; a CLOSED turn keeps
 *          today's single cut line. Regression coverage for roadmap "the question you just asked
 *          is cut to one line" (two-star, chat).
 * Used for: MainTabChatTranscript turn header title rendering, archived and live turns.
 * Solves: The question was cut twice — a 60-letter slice in chatTurnTitle.ts, then a one-line CSS
 *         rule that cuts again around 48 letters — so the 60-letter cap was never actually seen.
 *         D60 (docs/audit/maintainer-decisions-locked.md) settled: open reuses the existing A-button
 *         open state (no new D-pad stop), full text up to a five-line cap.
 * Does not: Cover the five-line CSS clamp itself (jsdom does not compute layout) or the focus-driven
 *           fade cue for a cut CLOSED question — that is a separate Features entry (D60 Q3), not
 *           built here.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const LONG_QUESTION =
  "What is the single best strategy for dealing with a swarm of exploders " +
  "when I only have the starter loadout and no upgrades yet at all";

function baseProps(): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
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
    askThreadDisplayQuestion: "",
  };
}

function titleText(container: HTMLElement): string | null {
  return container.querySelector(".bonsai-chat-turn-row-title")?.textContent ?? null;
}

describe("turn header question title — open vs closed (D60)", () => {
  it("shows the whole question, un-truncated, when the live turn is open", () => {
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      askThreadDisplayQuestion: LONG_QUESTION,
      expandedTurnKey: "live",
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    expect(titleText(container)).toBe(LONG_QUESTION);
  });

  it("keeps today's single cut line when the live turn is closed", () => {
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      askThreadDisplayQuestion: LONG_QUESTION,
      isAsking: true,
      expandedTurnKey: null,
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    const text = titleText(container);
    expect(text).not.toBe(LONG_QUESTION);
    expect(text?.length).toBe(60);
    expect(text?.endsWith("…")).toBe(true);
  });

  it("shows the whole question, un-truncated, for an OPEN archived turn", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: LONG_QUESTION,
      answer: "Kite them into a corridor.",
    };
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      askThreadCollapsed: [turn],
      expandedTurnKey: "t1",
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    expect(titleText(container)).toBe(LONG_QUESTION);
  });

  it("keeps today's single cut line for a CLOSED archived turn", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: LONG_QUESTION,
      answer: "Kite them into a corridor.",
    };
    const other: AskThreadCollapsedTurn = { id: "t2", question: "a short one", answer: "ok" };
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      askThreadCollapsed: [turn, other],
      expandedTurnKey: "t2",
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    const titles = Array.from(container.querySelectorAll(".bonsai-chat-turn-row-title")).map(
      (el) => el.textContent
    );
    const closedTitle = titles.find((t) => t !== "a short one");
    expect(closedTitle).not.toBe(LONG_QUESTION);
    expect(closedTitle?.length).toBe(60);
    expect(closedTitle?.endsWith("…")).toBe(true);
  });
});
