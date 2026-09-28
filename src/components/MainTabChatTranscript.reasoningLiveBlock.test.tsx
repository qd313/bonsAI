/**
 * Title: The model's own thinking, live under the question
 * Purpose: Pin what fills the space under your question while a thinking model works — the stock
 *          waiting phrase before its first thought, then the titles of the model's thinking steps
 *          only (the maintainer's option B, 2026-09-27) — and prove the block gets out of the way
 *          the moment the answer starts.
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

  /* Two real step headings from the Deck (docs/test-evidence/plan72-F3-THINK.json), with a note under the second. */
  const TWO_STEPS =
    "1.  **Analyze the Request:** The user is stuck on the Hollow Knight Mantis boss fight.\n" +
    "2.  **Identify Game/Context:** The game is Hollow Knight. [hidden]\n" +
    '    *   Key info: "The three sisters on the thrones in the Mantis Village do not attack until you challenge them."';

  it("draws the step titles only: the finished one faded with a tick, the current one last", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ liveThinking: { summary: "Reading the wiki.", reasoning: { partial: TWO_STEPS, seconds: 2 } } })}
      />,
    );

    const steps = [...container.querySelectorAll<HTMLElement>(".bonsai-chat-reasoning-live-step")];
    expect(steps.map((el) => el.textContent)).toEqual(["Analyze the Request ✓", "Identify Game/Context…"]);
    expect(steps[0].style.opacity).toBe("0.55");
    expect(steps[1].style.opacity).toBe("");
    expect(drawn(container)).not.toMatch(/three sisters|Key info|\[hidden\]|Hollow Knight/);
  });

  it("keeps an early step once the newest slice has moved past it", () => {
    const props = baseProps({ liveThinking: { summary: null, reasoning: { partial: TWO_STEPS, seconds: 2 } } });
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);
    rerender(
      <MainTabChatTranscript
        {...props}
        liveThinking={{ summary: null, reasoning: { partial: "5.  Consult Local Knowledge Base:\n[hidden]", seconds: 6 } }}
      />,
    );

    expect(
      [...container.querySelectorAll(".bonsai-chat-reasoning-live-step")].map((el) => el.textContent),
    ).toEqual(["Analyze the Request ✓", "Identify Game/Context ✓", "Consult Local Knowledge Base…"]);
  });

  it("forgets the last turn's steps once a new question empties the slice", () => {
    const props = baseProps({ liveThinking: { summary: null, reasoning: { partial: TWO_STEPS, seconds: 2 } } });
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);
    rerender(<MainTabChatTranscript {...props} liveThinking={{ summary: "Reading the wiki.", reasoning: null }} />);
    rerender(
      <MainTabChatTranscript
        {...props}
        liveThinking={{ summary: null, reasoning: { partial: "1.  **Analyze the Request:** a new one.", seconds: 1 } }}
      />,
    );

    expect(
      [...container.querySelectorAll(".bonsai-chat-reasoning-live-step")].map((el) => el.textContent),
    ).toEqual(["Analyze the Request…"]);
  });

  it("draws nothing for thinking with no step heading yet, and the stock phrase has stepped aside", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          liveThinking: { summary: "Reading the wiki.", reasoning: { partial: "The armour is on the front.", seconds: 4 } },
        })}
      />,
    );

    expect(container.querySelector(".bonsai-chat-reasoning-live")).toBeNull();
    expect(container.querySelector(".bonsai-chat-thinking-line")).toBeNull();
  });

  it("draws no spinner inside the block", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({ liveThinking: { summary: "Reading the wiki.", reasoning: { partial: TWO_STEPS, seconds: 4 } } })}
      />,
    );

    const block = container.querySelector(".bonsai-chat-reasoning-live");
    expect(block).not.toBeNull();
    expect(block?.querySelector(".bonsai-thinking-spinner")).toBeNull();
    /* And the stock phrase has stepped aside, rather than sitting above the model's own steps. */
    expect(container.querySelector(".bonsai-chat-thinking-line")).toBeNull();
  });

  it("swaps the block for the fold line the moment the answer starts", () => {
    const props = baseProps({
      liveThinking: { summary: null, reasoning: { partial: TWO_STEPS, seconds: 41 } },
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

  /* Roadmap: "With thinking off, the waiting spinner can keep spinning through the whole answer". */
  it("with thinking off, drops the waiting line and its spinner once the answer's first words arrive", () => {
    const props = baseProps({ liveThinking: { summary: "Reading the wiki.", reasoning: null } });
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);
    expect(container.querySelector(".bonsai-thinking-spinner")).not.toBeNull();

    rerender(<MainTabChatTranscript {...props} isStreamingPreview streamDisplayText="Flank it and" />);

    expect(container.querySelector(".bonsai-chat-thinking-line")).toBeNull();
    expect(container.querySelector(".bonsai-thinking-spinner")).toBeNull();
  });

  it("with thinking off and no streaming preview, drops the waiting line once real answer text lands", () => {
    const props = baseProps({ liveThinking: { summary: "Reading the wiki.", reasoning: null } });
    const { container, rerender } = render(<MainTabChatTranscript {...props} />);
    rerender(<MainTabChatTranscript {...props} ollamaResponse="Flank it and shoot the soft belly." />);

    expect(container.querySelector(".bonsai-chat-thinking-line")).toBeNull();
    expect(container.querySelector(".bonsai-thinking-spinner")).toBeNull();
  });
});
