/**
 * Title: Room under the "From the notes" card
 * Purpose: Pin that the bronze note card keeps a gap under it, so on the newest answer (the card is
 *          the last thing in the chat) it does not touch the suggestion chip row below
 *          (P79-M10-CARD-CHIP-GAP: Deck measured 0 px).
 * Used for: buildKbNotesBlockElement.tsx via MainTabChatTranscript.tsx.
 * Does not: Prove the pixels on the Deck, and does not test the chip row itself.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

describe("the note card on the newest answer", () => {
  it("has 8 px above and an empty 8 px non-focus spacer below, so the chip row below does not touch it", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "what is a good first upgrade in Hollow Knight",
      answer: "Nail upgrades and Pale Ore are a good first upgrade.",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [],
        overflow_skips: [],
        kb_attached_notes: [
          {
            name: "Nail upgrades and Pale Ore",
            kind: "mechanic",
            card: "Pale Ore upgrades the nail.",
            trust_tier: "wiki_verified",
            source_host: "hollowknight.wiki",
            source_license: "CC-BY-SA-4.0",
            domain: "strategy",
            game_title: "Hollow Knight",
          },
        ],
      },
    };
    const props = {
      fullBleedRowStyle: {},
      isAsking: false,
      selectedAttachment: null,
      ollamaContext: {},
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
    } as unknown as MainTabChatTranscriptProps;
    const { container } = render(<MainTabChatTranscript {...props} />);
    const card = container.querySelector(".bonsai-kb-notes-block") as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.style.marginTop).toBe("8px");
    const gap = card.nextElementSibling as HTMLElement;
    expect(gap?.className).toBe("bonsai-kb-notes-block-gap");
    expect(gap.style.height).toBe("8px");
    expect(gap.getAttribute("aria-hidden")).toBe("true");
    expect(gap.hasAttribute("tabindex")).toBe(false);
    expect(gap.style.pointerEvents).toBe("none");
    expect(gap.children.length).toBe(0);
  });
});
