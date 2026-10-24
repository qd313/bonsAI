/**
 * Title: Nothing changes on screen when an answer finishes
 * Purpose: Pin plan 93's fix for "when an answer finishes streaming, the screen flickers and then
 *   jumps to the end" (the maintainer, 2026-10-13), built as the Features entry "a long answer is
 *   cut into sections while it writes, so nothing changes when it finishes" (mock-up board,
 *   2026-10-10, tab 3, option A). Rendered through the whole transcript, the way the Deck draws it:
 *   while the answer writes it is already cut into its finished sections, and a section that has
 *   closed is never drawn again -- not by later words, and not at the finish.
 * Used for: MainTabChatTranscript.tsx, buildAnswerBubbleElement.tsx, buildAnswerSections.tsx and
 *   the cut in splitResponseIntoChunks.ts (cutAnswerSections).
 * Solves: The Deck measurement of 2026-10-13 (workshop:test-evidence/plan93-M4-ANSWER-FINISH.json): a
 *   seven-section answer was one block while it wrote and was cut into sections at the finish, so
 *   every section was drawn again at that moment.
 * Does not: Measure frame rate or the scroll position on the Deck; the Deck check does.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetAnswerStopRegistry } from "../../../shared/dpad/answerStopRegistry";
import { resetUiDocument } from "../../../shared/dpad/uiDocument";
import { cutAnswerSections } from "../markdown/splitResponseIntoChunks";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

/* Every time the markdown renderer draws a piece of text: what a person sees being drawn again. */
const draws: string[] = [];
vi.mock("../markdown/MainTabBonsaiAiMarkdownChunk", async (importOriginal) => {
  const real = await importOriginal<typeof import("../markdown/MainTabBonsaiAiMarkdownChunk")>();
  const Real = real.MainTabBonsaiAiMarkdownChunk;
  const Counted = React.memo((props: React.ComponentProps<typeof Real>) => {
    draws.push(props.source);
    return <Real {...props} />;
  });
  return { ...real, MainTabBonsaiAiMarkdownChunk: Counted };
});

const SENTENCE = "Dash through the arc rather than away from it, and keep moving between her attacks. ";
/* Seven paragraphs of about 340 letters: long enough to close several sections, like M4's answer. */
const ANSWER = Array.from({ length: 7 }, (_, i) => `Part ${i + 1}. ${SENTENCE.repeat(4)}`.trim()).join("\n\n");
const QUESTION = "Describe every area of Hollow Knight";

function writing(text: string): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: true,
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
    askMode: "expert",
    askThreadCollapsed: [],
    askThreadDisplayQuestion: QUESTION,
    onRetryLastResponse: () => {},
    expandedTurnKey: "live",
    isStreamingPreview: true,
    streamDisplayText: text,
  };
}

/* The poll's finish: the final text lands and the rating row appears, the turn still live. */
function finished(): MainTabChatTranscriptProps {
  return {
    ...writing(""),
    isAsking: false,
    isStreamingPreview: false,
    streamDisplayText: "",
    ollamaResponse: ANSWER,
    lastExchange: { question: QUESTION, answer: ANSWER } as MainTabChatTranscriptProps["lastExchange"],
  };
}

function stops(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".bonsai-chat-ai-bubble .bonsai-answer-stop"));
}

describe("an answer is cut into its finished sections while it writes", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetUiDocument();
    draws.length = 0;
  });
  afterEach(() => cleanup());

  it("shows the finished answer's sections already while it writes, with only the last one live", () => {
    const sofar = ANSWER.slice(0, Math.floor(ANSWER.length * 0.7));
    const { container } = render(<MainTabChatTranscript {...writing(sofar)} />);
    const shown = stops(container);
    const finishedSections = cutAnswerSections(ANSWER);
    expect(shown.length).toBeGreaterThan(2);
    shown.slice(0, -1).forEach((stop, i) => {
      const letters = (s: string) => s.replace(/\s+/g, "");
      expect(letters(stop.textContent ?? "")).toBe(letters(finishedSections[i]!));
      expect(stop.hasAttribute("data-bonsai-stream-preview")).toBe(false);
    });
    expect(shown[shown.length - 1]!.getAttribute("data-bonsai-stream-preview")).toBe("true");
  });

  it("never draws a closed section again, neither for later words nor at the finish", () => {
    const first = ANSWER.slice(0, Math.floor(ANSWER.length * 0.6));
    const { container, rerender } = render(<MainTabChatTranscript {...writing(first)} />);
    const closedBefore = stops(container).slice(0, -1);
    expect(closedBefore.length).toBeGreaterThan(1);
    const closedTexts = cutAnswerSections(first, false).slice(0, -1);
    const drawsOf = (text: string) => draws.filter((d) => d === text).length;
    const countsBefore = closedTexts.map(drawsOf);
    expect(countsBefore.every((n) => n === 1)).toBe(true);

    for (let n = first.length + 7; n < ANSWER.length; n += 37) {
      rerender(<MainTabChatTranscript {...writing(ANSWER.slice(0, n))} />);
    }
    rerender(<MainTabChatTranscript {...writing(ANSWER)} />);
    rerender(<MainTabChatTranscript {...finished()} />);

    expect(closedTexts.map(drawsOf)).toEqual(countsBefore);
    const after = stops(container);
    closedBefore.forEach((el, i) => expect(after[i]).toBe(el));
    expect(after).toHaveLength(cutAnswerSections(ANSWER).length);
  });

  it("keeps the bubble the same element from the first words to the finish", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...writing(ANSWER.slice(0, 120))} />);
    const bubble = container.querySelector(".bonsai-chat-ai-bubble");
    expect(bubble).not.toBeNull();
    rerender(<MainTabChatTranscript {...writing(ANSWER)} />);
    rerender(<MainTabChatTranscript {...finished()} />);
    expect(container.querySelector(".bonsai-chat-ai-bubble")).toBe(bubble);
  });
});

/* The chat reload after the finish: the turn comes back as the newest saved turn (applySlotTranscript). */
function archived(): MainTabChatTranscriptProps {
  return {
    ...finished(),
    askThreadDisplayQuestion: "",
    expandedTurnKey: "turn-1",
    askThreadCollapsed: [{ id: "turn-1", question: QUESTION, answer: ANSWER }],
  };
}

describe("the chat reload after the finish keeps the very same answer on screen", () => {
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetUiDocument();
    draws.length = 0;
  });
  afterEach(() => cleanup());

  it("keeps the bubble, its sections and the ring's element through the finish and the reload", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...writing(ANSWER.slice(0, 900))} />);
    const bubble = container.querySelector(".bonsai-chat-ai-bubble");
    const slot = container.querySelector(".bonsai-chat-turn-slot");
    /* The ring on the first section, the way a person walking the answer while it writes leaves it. */
    const ringStop = stops(container)[0]!;
    ringStop.classList.add("gpfocus");
    ringStop.setAttribute("tabindex", "-1");
    ringStop.focus();
    rerender(<MainTabChatTranscript {...writing(ANSWER)} />);
    const closedBefore = stops(container).slice(0, -1);
    const drawsBefore = draws.length;

    rerender(<MainTabChatTranscript {...finished()} />);
    rerender(<MainTabChatTranscript {...archived()} />);

    expect(container.querySelector(".bonsai-chat-ai-bubble")).toBe(bubble);
    expect(container.querySelector(".bonsai-chat-turn-slot")).toBe(slot);
    const after = stops(container);
    closedBefore.forEach((el, i) => expect(after[i]).toBe(el));
    expect(after[0]).toBe(ringStop);
    expect(ringStop.isConnected).toBe(true);
    expect(ringStop.classList.contains("gpfocus")).toBe(true);
    expect(document.activeElement).toBe(ringStop);
    /* Only the section that was still live is drawn once more, as a finished one. */
    const closedTexts = cutAnswerSections(ANSWER).slice(0, closedBefore.length);
    expect(draws.slice(drawsBefore).filter((d) => closedTexts.includes(d))).toEqual([]);
    /* And the saved turn answers to its own id from now on (the D-pad helpers look it up so). */
    expect(container.querySelector('[data-bonsai-answer-key="turn-1"]')).not.toBeNull();
  });

  it("keeps the rating row the same element through the reload", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...writing(ANSWER)} />);
    rerender(<MainTabChatTranscript {...finished()} />);
    const helpful = container.querySelector(".bonsai-chat-reply-actions");
    expect(helpful).not.toBeNull();
    rerender(<MainTabChatTranscript {...archived()} />);
    expect(container.querySelector(".bonsai-chat-reply-actions")).toBe(helpful);
  });

  it("draws the reopened chat's saved turn the same way, and a follow-up as a turn of its own", () => {
    const reopened = render(<MainTabChatTranscript {...archived()} />);
    expect(stops(reopened.container)).toHaveLength(cutAnswerSections(ANSWER).length);
    const savedSlot = reopened.container.querySelector(".bonsai-chat-turn-slot");
    reopened.rerender(
      <MainTabChatTranscript
        {...writing("A follow-up answer")}
        askThreadDisplayQuestion="And the next area?"
        askThreadCollapsed={archived().askThreadCollapsed}
      />
    );
    const slots = reopened.container.querySelectorAll(".bonsai-chat-turn-slot");
    expect(slots).toHaveLength(2);
    expect(slots[0]).toBe(savedSlot);
    expect(slots[1]!.querySelector(".bonsai-chat-ai-bubble")?.textContent).toContain("A follow-up answer");
  });
});

/*
 * The scroll pane, as the Deck measured it (plan93-M4-ANSWER-FINISH.json): a 402 px box whose answer
 * runs to 1,667 px, the ring on the question box in the dock. jsdom has no layout, so the pane and
 * the transcript's rects are set by hand; every way the code can move the pane is counted.
 */
function inScrollPane() {
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll";
  pane.getBoundingClientRect = () => ({ top: 0, bottom: 402, left: 0, right: 300, width: 300, height: 402, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  let top = 0;
  const moves = { scrollTopWrites: 0 };
  Object.defineProperty(pane, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      moves.scrollTopWrites += 1;
      top = v;
    },
  });
  const host = document.createElement("div");
  pane.appendChild(host);
  document.body.appendChild(pane);
  return { pane, host, moves, get scrollTop() { return top; } };
}

describe("the view does not move when an answer finishes", () => {
  const realScrollIntoView = Element.prototype.scrollIntoView;
  beforeEach(() => {
    resetAnswerStopRegistry();
    resetUiDocument();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = realScrollIntoView;
    document.body.innerHTML = "";
  });

  it("sets no scroll position through the finish, the reload and two seconds after", () => {
    const scrolled = vi.fn();
    Element.prototype.scrollIntoView = scrolled;
    const pane = inScrollPane();
    const { container, rerender } = render(<MainTabChatTranscript {...writing(ANSWER)} />, { container: pane.host });
    const column = container.querySelector<HTMLElement>(".bonsai-chat-main-column")!;
    column.getBoundingClientRect = () => ({ top: 0, bottom: 1667, left: 0, right: 300, width: 300, height: 1667, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    rerender(<MainTabChatTranscript {...writing(ANSWER)} />);
    scrolled.mockClear();
    pane.moves.scrollTopWrites = 0;

    rerender(<MainTabChatTranscript {...finished()} />);
    rerender(<MainTabChatTranscript {...archived()} />);
    vi.advanceTimersByTime(2000);

    expect(scrolled).not.toHaveBeenCalled();
    expect(pane.moves.scrollTopWrites).toBe(0);
    expect(pane.scrollTop).toBe(0);
  });
});
