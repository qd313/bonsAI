/**
 * Title: A on the section around a hidden cover opens the cover, through the cover's own handle
 * Purpose: Pin plan 76 lane 3, bug 2's second half. A section's own A did nothing, so a ring that
 *          landed on the section instead of the cover inside it (docs/test-evidence/
 *          plan76-P76-M-COVER-ONLY.json) could not open the cover. The cover now hands the
 *          registry the same "open me" its own A calls, and A on the section uses it.
 * Used for: MainTabBonsaiAiMarkdownChunk.tsx (BonsaiSpoilerFence), spoilerFenceRegistry.ts
 *           (revealSpoilerFence), answerBubbleNavigation.ts (openHiddenCoverIn).
 * Does not: press A on the device; the section's onActivate is Steam's call, and the geometry half
 *           of openHiddenCoverIn is covered in answerBubbleNavigation.walkKeepsRing.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "./MainTabBonsaiAiMarkdownChunk";
import { revealSpoilerFence } from "../utils/spoilerFenceRegistry";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

const turn: AskThreadCollapsedTurn = {
  id: "t1",
  question: "in hollow knight how do I beat the spell casting boss at the top of the sanctum",
  answer: "Hit him from below.\n\n```bonsai-spoiler\nThat boss is the Soul Master.\n```",
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

function props(): MainTabChatTranscriptProps {
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
  };
}

beforeEach(() => resetSpoilerFenceOpenCountForTests());

describe("the registered handle of a hidden cover", () => {
  it("opens the cover the way A on it does, and only a registered cover", () => {
    const { container } = render(<MainTabChatTranscript {...props()} />);
    const cover = container.querySelector(".bonsai-spoiler-reveal-target") as HTMLElement;
    expect(cover).not.toBeNull();
    expect(container.querySelector(".bonsai-spoiler-expanded")).toBeNull();

    expect(revealSpoilerFence(document.createElement("div"))).toBe(false);
    let opened = false;
    act(() => {
      opened = revealSpoilerFence(cover);
    });
    expect(opened).toBe(true);

    expect(container.querySelector(".bonsai-spoiler-expanded")).not.toBeNull();
    expect(container.querySelector(".bonsai-spoiler-reveal-target")).toBeNull();
  });
});
