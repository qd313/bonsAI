/**
 * Title: An opened spoiler cover stays open while the question box changes
 * Purpose: Pin plan 76 lane 3, bug 3 (roadmap "An opened spoiler cover closed again by itself";
 *          docs/test-evidence/plan76-P76-M-COVER-RECLOSE.json). On the Deck an opened cover went
 *          back to hidden within about two seconds of a question being put in the question box,
 *          and never with the D-pad moves or with time alone.
 * Used for: MainTabChatTranscript.tsx (onDrgGlossaryExplainFurther) and
 *           MainTabBonsaiAiMarkdownChunk.tsx (the markdown rules memo).
 * Solves: The Ask function reaching the transcript is rebuilt on every keystroke (it closes over
 *         the question text, useVoiceAskWithReadAloud.ts). The transcript's own "explain further"
 *         callback was keyed on it, so it changed on every keystroke, and the markdown rules of
 *         every answer section were rebuilt with it. Those rules are the component types react
 *         draws each paragraph and each cover with, so a new set made React throw away the old
 *         drawn answer and draw a fresh one, cover state and all -- the cover came back hidden.
 * Does not: prove the ring stays put on the device; that is the Deck check.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "./MainTabBonsaiAiMarkdownChunk";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

const ANSWER = "Hit him from below.\n\n```bonsai-spoiler\nThat boss is the Soul Master.\n```\n\nThen dodge left.";

/* The back end marks the boss note protected, which is what keeps the cover a cover: an answer
   whose fence names nothing protected is unwrapped and never draws one (unwrapAskedEntitySpoilerFences). */
const turn: AskThreadCollapsedTurn = {
  id: "t1",
  question: "in hollow knight how do I beat the spell casting boss at the top of the sanctum",
  answer: ANSWER,
  transparency: {
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
        game_title: "Hollow Knight",
        spoiler_protected: true,
      },
    ],
  },
};

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
    askThreadCollapsed: [turn],
    expandedTurnKey: turn.id,
    askThreadDisplayQuestion: "",
    lastExchange: null,
    strategySpoilerMaskingEnabled: true,
    /* A fresh function per call, as the real one is on every keystroke. */
    onAskOllama: async () => {},
    ...overrides,
  };
}

const isOpen = (container: HTMLElement) => container.querySelector(".bonsai-spoiler-expanded") !== null;

function openCover(container: HTMLElement) {
  fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button") as HTMLElement);
  expect(isOpen(container)).toBe(true);
}

beforeEach(() => resetSpoilerFenceOpenCountForTests());

describe("an opened spoiler cover", () => {
  it("stays open when the question box text and the Ask function change", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...props()} />);
    openCover(container);
    const openedBox = container.querySelector(".bonsai-spoiler-expanded");

    rerender(
      <MainTabChatTranscript
        {...props({ unifiedInput: "What upgrades matter most for the Nail", onAskOllama: async () => {} })}
      />
    );

    expect(isOpen(container)).toBe(true);
    /* The very same drawn box, not a fresh one that happens to read open. */
    expect(container.querySelector(".bonsai-spoiler-expanded")).toBe(openedBox);
  });

  it("stays open through several keystrokes in a row", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...props()} />);
    openCover(container);

    for (const typed of ["W", "Wh", "Wha", "What", "What u"]) {
      rerender(<MainTabChatTranscript {...props({ unifiedInput: typed, onAskOllama: async () => {} })} />);
    }

    expect(isOpen(container)).toBe(true);
  });

  it("still hides again when the person taps to hide it", () => {
    const { container, rerender } = render(<MainTabChatTranscript {...props()} />);
    openCover(container);
    rerender(<MainTabChatTranscript {...props({ unifiedInput: "x", onAskOllama: async () => {} })} />);

    fireEvent.click(container.querySelector(".bonsai-spoiler-collapse-target button") as HTMLElement);

    expect(isOpen(container)).toBe(false);
    expect(container.querySelector(".bonsai-spoiler-reveal-target")).not.toBeNull();
  });
});
