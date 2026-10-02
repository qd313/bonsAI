/**
 * Title: A spoiler cover cut off by Clear never shows the word "undefined"
 * Purpose: Pin plan 79 helper A (roadmap Bugs: "A spoiler cover cut off by Clear shows the word
 *          'undefined' when opened"). Clear pressed while an answer arrives keeps the part that
 *          arrived; when that part ends inside a hidden block, the saved text holds an opening
 *          mark with nothing after it, or half a sentence, and no closing mark.
 * Used for: MainTabBonsaiAiMarkdownChunk.tsx (the cover and its body) as the transcript draws it.
 * Solves: A fence with an empty body reaches the draw step with no children at all, and
 *         String(undefined) put the word "undefined" under the opened cover. The saved text was
 *         fine; the drawing was the faulty side.
 * Does not: prove the ring or the look on the Deck; that is the Deck check.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "./MainTabBonsaiAiMarkdownChunk";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

function turnWith(answer: string): AskThreadCollapsedTurn {
  return {
    id: "t1",
    question: "in hollow knight how do I beat the spell casting boss at the top of the sanctum",
    answer,
    transparency: { route: "ollama", success: true, context_chips: [], overflow_skips: [] },
  };
}

function props(answer: string, masking = true): MainTabChatTranscriptProps {
  const turn = turnWith(answer);
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
    strategySpoilerMaskingEnabled: masking,
    onAskOllama: async () => {},
  };
}

const INTRO = "Hit him from below.\n\n";

function openCoverIfAny(container: HTMLElement) {
  const button = container.querySelector(".bonsai-spoiler-reveal-target button");
  if (button) fireEvent.click(button);
}

beforeEach(() => resetSpoilerFenceOpenCountForTests());

describe("an answer cut off inside a spoiler cover", () => {
  it.each([
    ["nothing after the opening mark", `${INTRO}\`\`\`bonsai-spoiler`],
    ["only the line break after the opening mark", `${INTRO}\`\`\`bonsai-spoiler\n`],
    ["an empty block closed straight away", `${INTRO}\`\`\`bonsai-spoiler\n\`\`\`\n\nThen dodge.`],
  ])("never shows the word undefined: %s", (_label, answer) => {
    const { container } = render(<MainTabChatTranscript {...props(answer)} />);
    openCoverIfAny(container);
    expect(container.textContent).toContain("Hit him from below.");
    expect(container.textContent).not.toContain("undefined");
  });

  it("draws no empty cover when nothing arrived inside it", () => {
    const { container } = render(<MainTabChatTranscript {...props(`${INTRO}\`\`\`bonsai-spoiler`)} />);
    expect(container.querySelector(".bonsai-spoiler-reveal-target")).toBeNull();
    expect(container.textContent).not.toContain("tap to show");
  });

  it("opens to the half sentence that had arrived", () => {
    const { container } = render(
      <MainTabChatTranscript {...props(`${INTRO}\`\`\`bonsai-spoiler\nThat boss is the Soul Mas`)} />
    );
    expect(container.querySelector(".bonsai-spoiler-reveal-target")).not.toBeNull();
    openCoverIfAny(container);
    const opened = container.querySelector(".bonsai-spoiler-expanded");
    expect(opened?.textContent).toContain("That boss is the Soul Mas");
    expect(container.textContent).not.toContain("undefined");
  });

  it("shows no stray word with covers switched off", () => {
    const { container } = render(<MainTabChatTranscript {...props(`${INTRO}\`\`\`bonsai-spoiler`, false)} />);
    expect(container.textContent).toContain("Hit him from below.");
    expect(container.textContent).not.toContain("undefined");
    /* The empty block leaves no padded code box behind either. */
    expect(container.querySelector("pre.bonsai-md-fenced-pre")).toBeNull();
  });

  it("leaves no empty code box with covers on either", () => {
    const { container } = render(<MainTabChatTranscript {...props(`${INTRO}\`\`\`bonsai-spoiler`)} />);
    expect(container.querySelector("pre.bonsai-md-fenced-pre")).toBeNull();
  });
});
