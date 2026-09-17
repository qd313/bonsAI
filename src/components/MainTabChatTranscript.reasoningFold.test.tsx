/**
 * Title: The Show reasoning line, and the block it opens
 * Purpose: Pin the second and third of the three states in plan 57 — the line that appears above
 *          the answer once a thinking model starts writing, its seconds, and the block a press
 *          opens and a press closes.
 * Used for: MainTabChatTranscript.tsx (the live turn and whichever older turn is open), and
 *           buildReasoningFoldElement.tsx.
 * Solves: Four rules that nothing else would catch breaking — no line on a turn with no thinking,
 *         a line that never reads "0 s", a block that is closed every time a turn is drawn
 *         (including a reopened saved chat), and B closing the block rather than backing the ring
 *         out of the panel.
 * Does not: Prove any of it on the device. The Deck rows this owes: Down from the question lands
 *           on the line with the ring visible above the dock, A opens the block, A closes it, B
 *           closes it, and Down from the line enters the answer.
 */
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { buildReasoningFoldRow } from "../utils/buildReasoningFoldElement";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

function baseProps(overrides: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "Flank it and shoot the back.",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "how do i kill the big armoured bug boss",
    lastExchange: {
      question: "how do i kill the big armoured bug boss",
      answer: "Flank it and shoot the back.",
      reasoning: { text: "The armour is on the front.\nSo flank it.", seconds: 41, tokens: 380 },
    },
    ...overrides,
  };
}

function foldRow(container: HTMLElement): HTMLElement | null {
  return container.querySelector(".bonsai-chat-reasoning-fold");
}

function foldLabel(container: HTMLElement): string {
  return foldRow(container)?.querySelector(".bonsai-chat-details-divider-label")?.textContent ?? "";
}

describe("the Show reasoning line above an answer", () => {
  it("appears once the answer has started, reading the seconds the model thought for", () => {
    const { container } = render(<MainTabChatTranscript {...baseProps()} />);
    expect(foldLabel(container)).toBe("Show reasoning · 41 s");
  });

  it("never reads nought seconds", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          lastExchange: {
            question: "q",
            answer: "a",
            reasoning: { text: "a quick thought", seconds: 0, tokens: 2 },
          },
        })}
      />,
    );
    expect(foldLabel(container)).toBe("Show reasoning · 1 s");
  });

  it("reads one second when the computer side sent no number at all", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          lastExchange: {
            question: "q",
            answer: "a",
            reasoning: { text: "a thought", seconds: null, tokens: 2 },
          },
        })}
      />,
    );
    expect(foldLabel(container)).toBe("Show reasoning · 1 s");
  });

  it("stays away on a turn where the model did no thinking", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ lastExchange: { question: "q", answer: "Head north." } })}
      />,
    );
    expect(foldRow(container)).toBeNull();
  });

  /* Decision: no line beside an error line, because the fold belongs to an answer. */
  it("stays away when the answer came back empty", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          ollamaResponse: "",
          lastExchange: {
            question: "q",
            answer: "",
            reasoning: { text: "I thought and wrote nothing.", seconds: 9, tokens: 20 },
          },
        })}
      />,
    );
    expect(foldRow(container)).toBeNull();
  });

  it("opens the whole thinking on a press, and closes it on another", () => {
    const { container } = render(<MainTabChatTranscript {...baseProps()} />);
    expect(container.querySelector(".bonsai-chat-reasoning-block")).toBeNull();

    fireEvent.click(foldRow(container) as HTMLElement);
    const block = container.querySelector(".bonsai-chat-reasoning-block");
    expect(block?.textContent).toBe("The armour is on the front.\nSo flank it.");
    expect(foldLabel(container)).toBe("Hide reasoning · 41 s");

    fireEvent.click(foldRow(container) as HTMLElement);
    expect(container.querySelector(".bonsai-chat-reasoning-block")).toBeNull();
    expect(foldLabel(container)).toBe("Show reasoning · 41 s");
  });

  it("draws no spinner inside the opened block", () => {
    const { container } = render(<MainTabChatTranscript {...baseProps()} />);
    fireEvent.click(foldRow(container) as HTMLElement);
    expect(
      container.querySelector(".bonsai-chat-reasoning-block .bonsai-thinking-spinner"),
    ).toBeNull();
  });
});

describe("a reopened saved chat", () => {
  const savedTurn: AskThreadCollapsedTurn = {
    id: "turn-1",
    question: "how do i kill the big armoured bug boss",
    answer: "Flank it and shoot the back.",
    reasoning: { text: "The armour is on the front.", seconds: 41, tokens: 380 },
  };

  it("brings the line back, closed", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [savedTurn],
          expandedTurnKey: "turn-1",
          lastExchange: null,
          ollamaResponse: "",
          askThreadDisplayQuestion: "",
        })}
      />,
    );

    expect(foldLabel(container)).toBe("Show reasoning · 41 s");
    expect(container.querySelector(".bonsai-chat-reasoning-block")).toBeNull();
  });

  it("shows nothing at all on an older turn saved before thinking was kept", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          askThreadCollapsed: [{ id: "turn-1", question: "q", answer: "a" }],
          expandedTurnKey: "turn-1",
          lastExchange: null,
          ollamaResponse: "",
          askThreadDisplayQuestion: "",
        })}
      />,
    );

    expect(foldRow(container)).toBeNull();
    expect(container.querySelector(".bonsai-chat-reasoning-block")).toBeNull();
  });
});

/*
 * B is checked on the built row's own props rather than by firing an event: the test harness drops
 * every Steam navigation prop before it reaches the DOM, exactly as the real components consume
 * them themselves. What matters here is the wiring the device reads — the handler is attached only
 * while the block is open, and it consumes the press.
 */
describe("B while the block is open", () => {
  function rowProps(open: boolean) {
    const el = buildReasoningFoldRow({
      turnId: "live",
      open,
      seconds: 41,
      onToggle: () => {},
      onMoveUp: () => true,
      onMoveDown: () => true,
    });
    return el.props as Record<string, unknown>;
  }

  it("closes the block and swallows the press, so the ring stays on the line", () => {
    const toggled: string[] = [];
    const el = buildReasoningFoldRow({
      turnId: "live",
      open: true,
      seconds: 41,
      onToggle: () => toggled.push("toggle"),
      onMoveUp: () => true,
      onMoveDown: () => true,
    });
    const onCancelButton = (el.props as Record<string, unknown>).onCancelButton as (
      e: unknown,
    ) => void;
    expect(onCancelButton).toBeTypeOf("function");

    let prevented = false;
    onCancelButton({ preventDefault: () => (prevented = true) });
    expect(toggled).toEqual(["toggle"]);
    expect(prevented).toBe(true);
  });

  it("is not wired at all while the block is closed, so B still backs out of the panel", () => {
    expect(rowProps(false).onCancelButton).toBeUndefined();
  });
});

describe("the controller's path through the line", () => {
  it("hands Up and Down to the turn's own neighbours", () => {
    const went: string[] = [];
    const el = buildReasoningFoldRow({
      turnId: "live",
      open: false,
      seconds: 41,
      onToggle: () => {},
      onMoveUp: () => {
        went.push("up");
        return true;
      },
      onMoveDown: () => {
        went.push("down");
        return true;
      },
    });
    const props = el.props as Record<string, unknown>;
    (props.onMoveDown as () => boolean)();
    (props.onMoveUp as () => boolean)();
    expect(went).toEqual(["down", "up"]);
  });
});
