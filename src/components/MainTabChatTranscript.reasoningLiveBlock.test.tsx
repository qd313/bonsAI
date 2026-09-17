/**
 * Title: The model's own thinking, live under the question
 * Purpose: Pin what fills the space under your question while a thinking model works — the stock
 *          waiting phrase before its first thought, then the model's own newest three sentences,
 *          never four, with the newest one brighter — and prove the block gets out of the way the
 *          moment the answer starts.
 * Used for: MainTabChatTranscript.tsx's live turn (plan 57 step 3, the first of the three states).
 * Solves: The three-line cap and the "the phrase steps aside" rule are drawing decisions from the
 *         plan that nothing else would notice breaking. On the device a fourth line would push the
 *         answer off the bottom of the visible chat: the built-in screen leaves about 61 pixels
 *         for the answer with the block on screen (measured 2026-09-17).
 * Does not: Prove the block's real height, or anything about the fold row above the answer — the
 *           height needs a device and the fold row has tests of its own.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

function baseProps(overrides: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
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
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "how do i kill the big armoured bug boss",
    lastExchange: null,
    ...overrides,
  };
}

function lines(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".bonsai-chat-reasoning-live-line"),
  ).map((el) => el.textContent ?? "");
}

describe("the space under the question while a thinking model works", () => {
  it("shows the stock waiting phrase and its spinner before the model's first thought", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ liveThinking: { summary: "Reading the wiki. Glamorous.", reasoning: null } })}
      />,
    );

    expect(container.querySelector(".bonsai-chat-thinking-line")).not.toBeNull();
    expect(container.querySelector(".bonsai-thinking-spinner")).not.toBeNull();
    expect(container.querySelector(".bonsai-chat-reasoning-live")).toBeNull();
  });

  it("still shows the stock phrase when the thinking slice is there but empty", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: { summary: "Reading the wiki.", reasoning: { partial: "   ", seconds: null } },
        })}
      />,
    );

    expect(container.querySelector(".bonsai-chat-thinking-line")).not.toBeNull();
    expect(container.querySelector(".bonsai-chat-reasoning-live")).toBeNull();
  });

  it("shows one line for one sentence", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: {
            summary: "Reading the wiki.",
            reasoning: { partial: "The armour is on the front.", seconds: 2 },
          },
        })}
      />,
    );

    expect(lines(container)).toEqual(["The armour is on the front."]);
  });

  it("shows two lines for two sentences", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: {
            summary: null,
            reasoning: { partial: "The armour is on the front. So flank it.", seconds: 3 },
          },
        })}
      />,
    );

    expect(lines(container)).toEqual(["The armour is on the front.", "So flank it."]);
  });

  it("shows three lines for three sentences", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: {
            summary: null,
            reasoning: { partial: "One thing. Then another. Then a third.", seconds: 5 },
          },
        })}
      />,
    );

    expect(lines(container)).toEqual(["One thing.", "Then another.", "Then a third."]);
  });

  it("never draws a fourth line, and keeps the newest three", () => {
    const ten = "a one. b two. c three. d four. e five. f six. g seven. h eight. i nine. j ten.";
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ liveThinking: { summary: null, reasoning: { partial: ten, seconds: 9 } } })}
      />,
    );

    expect(lines(container)).toHaveLength(3);
    expect(lines(container)).toEqual(["h eight.", "i nine.", "j ten."]);
  });

  /* A class, not a colour: the colour lives in the stylesheet and is not applied in a test render. */
  it("marks the newest line as the bright one and leaves the two older ones plain", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: { summary: null, reasoning: { partial: "one. two. three.", seconds: 4 } },
        })}
      />,
    );

    const drawn = Array.from(
      container.querySelectorAll<HTMLElement>(".bonsai-chat-reasoning-live-line"),
    );
    expect(drawn[0]?.className).not.toContain("--newest");
    expect(drawn[1]?.className).not.toContain("--newest");
    expect(drawn[2]?.className).toContain("bonsai-chat-reasoning-live-line--newest");
  });

  it("draws no spinner inside the block", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: { summary: "Reading the wiki.", reasoning: { partial: "one. two.", seconds: 4 } },
        })}
      />,
    );

    const block = container.querySelector(".bonsai-chat-reasoning-live");
    expect(block).not.toBeNull();
    expect(block?.querySelector(".bonsai-thinking-spinner")).toBeNull();
    /* And the stock phrase has stepped aside, rather than sitting above the model's own words. */
    expect(container.querySelector(".bonsai-chat-thinking-line")).toBeNull();
  });

  it("swaps the block for the fold line the moment the answer starts", () => {
    const props = baseProps({
      liveThinking: { summary: null, reasoning: { partial: "one. two. three.", seconds: 41 } },
    });
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);
    expect(container.querySelector(".bonsai-chat-reasoning-live")).not.toBeNull();
    expect(container.querySelector(".bonsai-chat-reasoning-fold")).toBeNull();

    rerender(
      <MainTabChatTranscript
        {...props}
        isStreamingPreview
        streamDisplayText="Flank it and shoot the"
      />,
    );

    expect(container.querySelector(".bonsai-chat-reasoning-live")).toBeNull();
    /*
     * The seconds come from the still-running question's own count, which the computer side stops
     * the moment the answer starts — so the number does not creep up while the answer types itself
     * out, and it already matches the one the finished answer will carry.
     */
    expect(
      container
        .querySelector(".bonsai-chat-reasoning-fold")
        ?.querySelector(".bonsai-chat-details-divider-label")?.textContent,
    ).toBe("Show reasoning · 41 s");
  });

  it("changes nothing with thinking off", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ liveThinking: { summary: "Reading the wiki.", reasoning: null } })}
      />,
    );

    expect(container.querySelector(".bonsai-chat-reasoning-live")).toBeNull();
    expect(container.querySelector(".bonsai-chat-thinking-line")?.textContent).toContain(
      "Reading the wiki.",
    );
  });
});
