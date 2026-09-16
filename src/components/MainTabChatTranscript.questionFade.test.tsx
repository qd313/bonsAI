/**
 * Title: Open-question overflow fade tests
 * Purpose: Pin the fix for roadmap "A short question fades out at its right edge as if there
 *          were more to read" — the bottom fade on an OPEN question must only draw when the
 *          text really overflows the five-line cap, not on every open question.
 * Used for: MainTabChatTranscript's title measurement (measureTitleOverflow) and the modifier
 *           class it adds via buildTurnHeaderElement's titleRef/titleOverflowing props.
 * Solves: CSS alone cannot tell a short question from a cut one, so the fade used to draw
 *         unconditionally on `.bonsai-chat-turn-row-header--expanded .bonsai-chat-turn-row-title`
 *         (screenshots screenshots/DeckCapture_20260913_125644_game.png and
 *         ...125707_game.png). jsdom does not compute real layout, so scrollHeight/clientHeight
 *         are stubbed on HTMLElement.prototype to stand in for "wraps past the cap" vs "fits".
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const QUESTION = "what about its second phase";

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

/* Stubs the two layout reads jsdom never computes so measureTitleOverflow sees a chosen shape. */
function stubTitleHeights(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLSpanElement.prototype, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(HTMLSpanElement.prototype, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
}

const originalScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLSpanElement.prototype,
  "scrollHeight"
);
const originalClientHeight = Object.getOwnPropertyDescriptor(
  HTMLSpanElement.prototype,
  "clientHeight"
);

afterEach(() => {
  if (originalScrollHeight) {
    Object.defineProperty(HTMLSpanElement.prototype, "scrollHeight", originalScrollHeight);
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLSpanElement.prototype, "clientHeight", originalClientHeight);
  }
});

function titleEl(container: HTMLElement): HTMLElement | null {
  return container.querySelector(".bonsai-chat-turn-row-title");
}

describe("open question fade — only when the text really overflows", () => {
  it("carries the fade class when the title's content is taller than its capped box", () => {
    stubTitleHeights(120, 40);
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      askThreadDisplayQuestion: QUESTION,
      expandedTurnKey: "live",
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    expect(titleEl(container)?.className).toContain("bonsai-chat-turn-row-title--overflowing");
  });

  it("does not carry the fade class when a short one-line question fits with room to spare", () => {
    stubTitleHeights(40, 40);
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      askThreadDisplayQuestion: QUESTION,
      expandedTurnKey: "live",
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    expect(titleEl(container)?.className).not.toContain("bonsai-chat-turn-row-title--overflowing");
  });

  it("also applies to an OPEN archived turn, not just the live one", () => {
    stubTitleHeights(120, 40);
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: QUESTION,
      answer: "Its second phase adds a ground slam.",
    };
    const props: MainTabChatTranscriptProps = {
      ...baseProps(),
      askThreadCollapsed: [turn],
      expandedTurnKey: "t1",
    };
    const { container } = render(<MainTabChatTranscript {...props} />);
    expect(titleEl(container)?.className).toContain("bonsai-chat-turn-row-title--overflowing");
  });
});
