/**
 * Title: The model's own thinking, live under the question
 * Purpose: Pin what fills the space under your question while a thinking model works — the stock
 *          waiting phrase before its first thought, then the model's own newest thinking as
 *          ordinary wrapping text — and prove the block gets out of the way the moment the answer
 *          starts.
 * Used for: MainTabChatTranscript.tsx's live turn (plan 57 step 3, the first of the three states).
 * Solves: The "the phrase steps aside" rule and the maintainer's 2026-09-24 call ("let it display
 *         the thinking normally" -- it had been three cut-off one-line sentences) are drawing
 *         decisions nothing else would notice breaking.
 * Does not: Prove the block's real height, or that the newest lines stay in view — the stylesheet
 *           does that (section-6.ts) and a stylesheet test pins it; the look needs a device.
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

function drawn(container: HTMLElement): string | null {
  return container.querySelector<HTMLElement>(".bonsai-chat-reasoning-live")?.textContent ?? null;
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

  it("draws the model's thinking as it wrote it, line breaks kept", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: {
            summary: "Reading the wiki.",
            reasoning: { partial: "The armour is on the front.\nSo flank it.", seconds: 2 },
          },
        })}
      />,
    );

    expect(drawn(container)).toBe("The armour is on the front.\nSo flank it.");
  });

  it("no longer stops at three sentences", () => {
    const ten = "a one. b two. c three. d four. e five. f six. g seven. h eight. i nine. j ten.";
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ liveThinking: { summary: null, reasoning: { partial: ten, seconds: 9 } } })}
      />,
    );

    expect(drawn(container)).toBe(ten);
    expect(container.querySelector(".bonsai-chat-reasoning-live-line")).toBeNull();
  });

  it("does not open on the half word a long think's slice starts with", () => {
    const slice = ("ing at the health bar. " + "Then I check the wiki. ".repeat(30)).slice(0, 600);
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ liveThinking: { summary: null, reasoning: { partial: slice, seconds: 9 } } })}
      />,
    );

    expect(drawn(container)?.startsWith("Then I check the wiki.")).toBe(true);
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
