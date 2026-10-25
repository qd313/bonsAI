/**
 * Title: "How much to hide" reaches the drawn answer
 * Purpose: Pin plan 100 lane V. With Settings -> "How much to hide" on Hide more, a cover the AI
 *          draws on a game with no story (Mario Kart 64) stays a cover on screen; on Default it
 *          opens by itself, as it always did. Before this, the screen never read the setting.
 * Used for: MainTabChatTranscript.tsx (the `spoilerTier` prop), buildAnswerBubbleElement.tsx and
 *           answerCopyText.ts (the Copy press), all fed from the same per-turn facts.
 * Solves: The back end already asks for covers on a no-story game under Hide more; the screen
 *         opened every one of them anyway (unwrapAskedEntitySpoilerFences.ts, the no-story rule).
 * Does not: prove the AI draws a cover at all, or what the Deck shows; that is the Deck check.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "../markdown/MainTabBonsaiAiMarkdownChunk";
import { buildAnswerCopyText } from "../reply-actions/answerCopyText";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";

const QUESTION = "in Mario Kart 64 what is the best shortcut on the last track";
const ANSWER =
  "Stay left at the start.\n\n```bonsai-spoiler\nCut the corner at the ramp to skip the last turn.\n```\n\nThen drift.";
const PROTECTED_ANSWER =
  "Stay left at the start.\n\n```bonsai-spoiler\nThe Soul Master hides near the ramp.\n```\n\nThen drift.";

const archived = (answer: string, spoiler_protected = false): AskThreadCollapsedTurn => ({
  id: "t1",
  question: QUESTION,
  answer,
  appName: "Mario Kart 64",
  transparency: spoiler_protected
    ? {
        route: "ollama",
        success: true,
        context_chips: [],
        overflow_skips: [],
        kb_attached_notes: [
          {
            name: "Soul Master",
            kind: "boss",
            card: "Soul Master teleports between attacks.",
            trust_tier: "bonsai_memory",
            source_host: "",
            source_license: "",
            domain: "strategy",
            game_title: "Mario Kart 64",
            spoiler_protected: true,
          },
        ],
      }
    : undefined,
});

function props(overrides: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
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
    askMode: "strategy",
    askThreadCollapsed: [archived(ANSWER)],
    expandedTurnKey: "t1",
    askThreadDisplayQuestion: "",
    lastExchange: null,
    strategySpoilerMaskingEnabled: true,
    onAskOllama: async () => {},
    ...overrides,
  };
}

/* A drawn cover: the hidden-block shell with its tap-to-reveal button. Unwrapped prose draws none. */
const coverCount = (container: HTMLElement) => container.querySelectorAll(".bonsai-spoiler-reveal-target").length;
const showsText = (container: HTMLElement, text: string) => (container.textContent ?? "").includes(text);

beforeEach(() => resetSpoilerFenceOpenCountForTests());

describe("a no-story game's cover on screen, by 'How much to hide'", () => {
  it("opens by itself under Default, with no setting passed, and under Hide less", () => {
    for (const spoilerTier of [undefined, "default", "open"] as const) {
      const { container, unmount } = render(<MainTabChatTranscript {...props({ spoilerTier })} />);
      expect(coverCount(container)).toBe(0);
      expect(showsText(container, "Cut the corner at the ramp")).toBe(true);
      unmount();
    }
  });

  it("stays a cover under Hide more", () => {
    const { container } = render(<MainTabChatTranscript {...props({ spoilerTier: "strict" })} />);
    expect(coverCount(container)).toBe(1);
  });

  it("stays a cover under Hide more on the newest answer too", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...props({
          askThreadCollapsed: [],
          expandedTurnKey: "live",
          askThreadDisplayQuestion: QUESTION,
          ollamaContext: { app_name: "Mario Kart 64" } as MainTabChatTranscriptProps["ollamaContext"],
          ollamaResponse: ANSWER,
          lastExchange: { question: QUESTION, answer: ANSWER, appName: "Mario Kart 64" } as MainTabChatTranscriptProps["lastExchange"],
          spoilerTier: "strict",
        })}
      />
    );
    expect(coverCount(container)).toBe(1);
  });

  it("keeps a cover naming a protected note shut under all three", () => {
    for (const spoilerTier of ["strict", "default", "open"] as const) {
      const { container, unmount } = render(
        <MainTabChatTranscript
          {...props({ askThreadCollapsed: [archived(PROTECTED_ANSWER, true)], spoilerTier })}
        />
      );
      expect(coverCount(container)).toBe(1);
      unmount();
    }
  });
});

describe("the Copy press follows the same setting", () => {
  const facts = { body: ANSWER, askQuestion: QUESTION, appName: "Mario Kart 64" };

  it("copies the opened text under Default, Hide less and no setting", () => {
    for (const spoilerTier of [undefined, "default", "open"] as const) {
      expect(buildAnswerCopyText({ ...facts, spoilerTier })).toContain("Cut the corner at the ramp");
    }
  });

  it("copies the hidden-block placeholder, not the text, under Hide more", () => {
    const out = buildAnswerCopyText({ ...facts, spoilerTier: "strict" });
    expect(out).not.toContain("Cut the corner at the ramp");
    expect(out).toContain("Stay left at the start.");
  });
});
