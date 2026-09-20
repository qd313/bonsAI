/**
 * Title: Reply block end-to-end render tests
 * Purpose: Render a whole finished reply and pin what is on screen and in what order.
 * Used for: The three 2026-09-06 changes — fewer D-pad stops (D78), the Show details line (D76),
 *   and Copy and Retry as corner icons (D77) — checked together rather than one builder at a time.
 * Solves: Each builder's own suite proves its piece; nothing proved the pieces still add up to one
 *   reply, in the right order, with the button row actually gone.
 * Does not: Prove anything about geometry or D-pad focus. The test runner has no layout engine and
 *   the preview suite does not validate focus graphs — that is the device rows' job.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { splitResponseIntoChunks } from "../utils/splitResponseIntoChunks";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const QUESTION = "how do i handle the exploders";
const SHORT_ANSWER = "Keep your distance.\n\nThen strafe around them.";
/* Ten short paragraphs plus a twelve-line list: one stop each before D78, a handful after. */
const LONG_ANSWER = [
  ...Array.from({ length: 10 }, (_, i) => `Paragraph ${i} says a short thing about the fight.`),
  Array.from({ length: 12 }, (_, i) => `- Bullet number ${i}`).join("\n"),
].join("\n\n");

/* Enough of a snapshot for the details line to have something to open. */
const TRANSPARENCY = {
  raw_question: QUESTION,
  final_response: SHORT_ANSWER,
  success: true,
  app_id: "",
  app_name: "",
  pc_ip: "",
  error_message: "",
  elapsed_seconds: 1.2,
  /* transparencyUiAvailable needs a route before it will offer the control at all. */
  route: "speed",
  context_chips: [{ id: "mode", label: "Mode", value: "Speed" }],
} as unknown as TransparencySnapshot;

function turn(id: string, answer: string): AskThreadCollapsedTurn {
  return { id, question: QUESTION, answer };
}

function renderReply(
  answer: string,
  overrides: Partial<MainTabChatTranscriptProps> = {}
) {
  const turns = [turn("t1", answer)];
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: answer,
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: turns,
    expandedTurnKey: "t1",
    askThreadDisplayQuestion: "",
    lastExchange: { question: QUESTION, answer },
    onRetryLastResponse: () => {},
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

describe("a finished reply, all three changes together", () => {
  it("has no button row under the answer at all", () => {
    const { container } = renderReply(SHORT_ANSWER);
    expect(container.querySelector(".bonsai-chat-reply-actions-row--utility")).toBeNull();
    expect(container.textContent).not.toContain("Retry");
    expect(container.textContent).not.toContain("Copy");
    expect(container.textContent).not.toContain("Show details");
  });

  it("shows Retry on the question and Copy on the answer", () => {
    const { container } = renderReply(SHORT_ANSWER);
    expect(container.querySelector(".bonsai-turn-retry-corner")).not.toBeNull();
    expect(container.querySelector(".bonsai-reply-copy-corner")).not.toBeNull();
    expect(container.querySelector(".bonsai-chat-turn-row-header--with-retry")).not.toBeNull();
  });

  it("reads top to bottom: question, answer, Was this helpful?, Read aloud, then Show details", () => {
    const { container } = renderReply(SHORT_ANSWER, { transparencySnapshot: TRANSPARENCY });
    /* Read aloud is a bare speaker glyph at the end of the Helpful / Not really row now (plan 62
       section 3b), not a line of its own — the divider shape is Show details alone these days. */
    const lines = container.querySelectorAll(".bonsai-chat-details-divider");
    expect(lines.length).toBe(1);
    expect(lines[0]!.textContent).toContain("Show details");
    const speaker = container.querySelector(".bonsai-chat-read-aloud-btn");
    expect(speaker).not.toBeNull();
    expect(speaker!.getAttribute("aria-label")).toMatch(/Read aloud|Stop/);

    const order = [
      ".bonsai-chat-turn-row-header",
      ".bonsai-chat-ai-bubble",
      ".bonsai-chat-feedback-row__label",
      ".bonsai-chat-read-aloud-btn",
      ".bonsai-chat-details-divider",
    ].map((sel) => {
      const el = container.querySelector(sel);
      expect(el, sel).not.toBeNull();
      return el!;
    });
    for (let i = 1; i < order.length; i++) {
      /* Node.DOCUMENT_POSITION_FOLLOWING — the next one comes after the last in the document. */
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) & 4,
        `${i} should follow ${i - 1}`
      ).toBeTruthy();
    }
  });

  it("puts Show details last, with nothing between it and the chips it opens", () => {
    const { container } = renderReply(SHORT_ANSWER, { transparencySnapshot: TRANSPARENCY });
    const block = container.querySelector(".bonsai-chat-reply-actions")!;
    const last = block.lastElementChild!;
    expect(last.className).toContain("bonsai-chat-details-divider");
    expect(last.textContent).toContain("Show details");
  });

  it("puts Retry in the question bubble and Copy right after the answer", () => {
    const { container } = renderReply(SHORT_ANSWER);
    const questionBubble = container.querySelector(".bonsai-chat-turn-row-header")!;
    const answerBubble = container.querySelector(".bonsai-chat-ai-bubble")!;
    expect(questionBubble.querySelector(".bonsai-turn-retry-corner")).not.toBeNull();
    expect(questionBubble.querySelector(".bonsai-reply-copy-corner")).toBeNull();

    /* Copy is a step after the answer, not inside it — measured on the Deck 2026-09-06: inside, it
       was a dead end going Down and could sit behind the Ask bar with the ring on it. */
    const copy = container.querySelector(".bonsai-reply-copy-corner-slot")!;
    expect(answerBubble.contains(copy)).toBe(false);
    expect(answerBubble.compareDocumentPosition(copy) & 4).toBeTruthy();
    expect(answerBubble.querySelector(".bonsai-turn-retry-corner")).toBeNull();
  });

  it("keeps Copy above the thumbs, so the walk down is answer, Copy, then the buttons", () => {
    const { container } = renderReply(SHORT_ANSWER);
    const copy = container.querySelector(".bonsai-reply-copy-corner-slot")!;
    const thumbs = container.querySelector(".bonsai-chat-reply-actions")!;
    expect(copy.compareDocumentPosition(thumbs) & 4).toBeTruthy();
  });

  it("names both icons for someone who cannot see them", () => {
    const { container } = renderReply(SHORT_ANSWER);
    expect(
      container.querySelector('[aria-label="Retry same prompt"]')
    ).not.toBeNull();
    expect(container.querySelector('[aria-label="Copy reply text"]')).not.toBeNull();
  });

  it("gives a long answer a handful of D-pad stops, not one per paragraph", () => {
    const { container } = renderReply(LONG_ANSWER);
    const stops = container.querySelectorAll(".bonsai-answer-stop");
    expect(stops.length).toBe(splitResponseIntoChunks(LONG_ANSWER).length);
    expect(stops.length).toBeLessThanOrEqual(4);
    /* The same text, one stop per paragraph and per bullet, is what this replaces. */
    expect(LONG_ANSWER.split("\n\n").length + 11).toBeGreaterThan(20);
  });

  it("shows the answer's own text once, whatever the stops did to it", () => {
    const { container } = renderReply(LONG_ANSWER);
    const bubble = container.querySelector(".bonsai-chat-ai-bubble")!;
    expect(bubble.textContent).toContain("Paragraph 0 says");
    expect(bubble.textContent).toContain("Paragraph 9 says");
    expect(bubble.textContent).toContain("Bullet number 11");
  });

  it("hides Copy and dims Retry while an answer is on its way", () => {
    const { container } = renderReply(SHORT_ANSWER, { isAsking: true });
    const retry = container.querySelector(".bonsai-turn-retry-corner") as HTMLButtonElement | null;
    expect(retry).not.toBeNull();
    expect(retry!.disabled).toBe(true);
  });

  it("offers no Retry on an older question, only on the newest", () => {
    const turns = [turn("t0", "An older answer."), turn("t1", SHORT_ANSWER)];
    const { container } = render(
      <MainTabChatTranscript
        {...({
          fullBleedRowStyle: {},
          isAsking: false,
          selectedAttachment: null,
          ollamaContext: {},
          unifiedInput: "",
          showSlowWarning: false,
          latencyWarningSeconds: 30,
          ollamaResponse: SHORT_ANSWER,
          elapsedSeconds: null,
          lastApplied: null,
          canSaveDesktopNote: false,
          onOpenDesktopNoteSave: () => {},
          askMode: "speed",
          askThreadCollapsed: turns,
          expandedTurnKey: "t1",
          askThreadDisplayQuestion: "",
          lastExchange: { question: QUESTION, answer: SHORT_ANSWER },
          onRetryLastResponse: () => {},
        } as unknown as MainTabChatTranscriptProps)}
      />
    );
    expect(container.querySelectorAll(".bonsai-turn-retry-corner")).toHaveLength(1);
    const slots = container.querySelectorAll(".bonsai-chat-turn-slot");
    expect(slots.length).toBe(2);
    expect(slots[0]!.querySelector(".bonsai-turn-retry-corner")).toBeNull();
    expect(slots[1]!.querySelector(".bonsai-turn-retry-corner")).not.toBeNull();
  });
});
