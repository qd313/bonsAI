/**
 * Title: Left and Right on the "From the notes" block stay in the plugin
 * Purpose: Pin that the notes block's own Focusable claims Left and Right (returns true), so on the
 *          Deck a press of Left on the "Performance" card does not carry the D-pad ring out of the
 *          plugin into Steam's own side tab list (plan 87 bug, QA-FREE-PLAY-01 with no game running).
 * Used for: buildKbNotesBlockElement.tsx via MainTabChatTranscript.tsx.
 * Solves: The Deck calls the Focusable's onMoveLeft / onMoveRight props. A jsdom test cannot see the
 *         ring, so this file reads the exact props Steam invokes, the same standard the details-tabs
 *         test holds this codebase to. With the handlers missing, Steam's own Left takes the ring.
 * Does not: Prove the ring stays on the device. That is the Deck row QA-FREE-PLAY-01 owes.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return {
    ...stubs,
    Focusable: CapturingFocusable,
  };
});

function turnWithOneNote(): AskThreadCollapsedTurn {
  return {
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
  } as unknown as AskThreadCollapsedTurn;
}

function transcriptProps(turn: AskThreadCollapsedTurn): MainTabChatTranscriptProps {
  return {
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
}

/* The notes block's own Focusable, from the latest render (every render pushes its props). */
function notesBlockProps(): Record<string, unknown> | undefined {
  return [...hoisted.focusableProps].reverse().find((p) => p.className === "bonsai-kb-notes-block");
}

describe("the From the notes block on the D-pad", () => {
  it("claims Left and Right, so Steam does not move the ring out of the plugin", () => {
    hoisted.focusableProps.length = 0;
    render(<MainTabChatTranscript {...transcriptProps(turnWithOneNote())} />);
    const block = notesBlockProps();
    expect(block).toBeDefined();
    expect(typeof block?.onMoveLeft).toBe("function");
    expect(typeof block?.onMoveRight).toBe("function");
    expect((block?.onMoveLeft as () => unknown)()).toBe(true);
    expect((block?.onMoveRight as () => unknown)()).toBe(true);
  });

  it("still claims Left and Right after the block is opened to show its card", () => {
    hoisted.focusableProps.length = 0;
    const { container } = render(<MainTabChatTranscript {...transcriptProps(turnWithOneNote())} />);
    const card = container.querySelector(".bonsai-kb-notes-block") as HTMLElement;
    expect(card).not.toBeNull();
    fireEvent.click(card);
    const block = notesBlockProps();
    expect(block?.["aria-expanded"]).toBe(true);
    expect((block?.onMoveLeft as () => unknown)()).toBe(true);
    expect((block?.onMoveRight as () => unknown)()).toBe(true);
  });
});
