/**
 * Title: Show details' credit line on an answer that hid a spoiler
 * Purpose: Pin the maintainer's call of 2026-09-27: when an answer hid a spoiler (a boss the person
 *          never named, marked protected by the back end), the credit line in Show details stays
 *          hidden -- "Sources hidden — open the notes to see them" -- until the person opens that
 *          answer's "From the notes" block, and then shows exactly as before. An answer that hid
 *          nothing, and a person with spoiler covers switched off, see the credit line as always.
 * Used for: MainTabChatTranscript.tsx (creditsHiddenFor), buildDetailsPanelElement.tsx,
 *           SessionContextStrip.tsx (Session tab rows), ContextChipLadder.tsx (the credit block).
 * Solves: The credit line listed every note by name ("Soul Master · No source page"), so pressing
 *         Show details gave away the name the answer's cover and the notes block's neutral title
 *         were both hiding.
 * Does not: Prove anything on the device -- that is the Deck re-check row.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

/* Which notes an answer used has its own tests (kbNoteUsedByAnswer.test.ts); here every attached
   note counts as used so the block's presence depends only on what this file is about. */
vi.mock("../utils/kbNoteUsedByAnswer", async (importOriginal) => {
  const real = await importOriginal<typeof import("../utils/kbNoteUsedByAnswer")>();
  return { ...real, kbNotesUsedByAnswer: (notes: unknown[]) => notes };
});
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "./MainTabBonsaiAiMarkdownChunk";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ContextChip, KbAttachedNote } from "../utils/inputTransparency";

const HIDDEN_TEXT = "Sources hidden — open the notes to see them";

function soulMaster(overrides: Partial<KbAttachedNote> = {}): KbAttachedNote {
  return {
    name: "Soul Master",
    kind: "boss",
    card: "Soul Master teleports between attacks; hit him from below while he conjures orbs.",
    trust_tier: "bonsai_memory",
    source_host: "",
    source_license: "",
    domain: "strategy",
    game_title: "Hollow Knight",
    spoiler_protected: true,
    ...overrides,
  };
}

/* The knowledge chip exactly as the back end builds it for this turn: one credit group with no
   source page, naming the note (transparency_service.build_attribution_entries). */
const KB_CHIP: ContextChip = {
  id: "kb",
  rank: 1,
  label: "Keyword + meaning",
  attached: true,
  tier_class: "",
  body: {
    title: "Local knowledge base",
    paths: [],
    bullets: [],
    attribution: [{ source: "No source page", license: "", url: "", cards: ["Soul Master"] }],
  },
};

const QUESTION = "in hollow knight how do I beat the spell casting boss at the top of the sanctum";

function turnWith(notes: KbAttachedNote[], answer: string): AskThreadCollapsedTurn {
  return {
    id: "t1",
    question: QUESTION,
    answer,
    transparency: {
      route: "ollama",
      success: true,
      context_chips: [KB_CHIP],
      overflow_skips: [],
      kb_attached_notes: notes,
    },
  };
}

function props(turn: AskThreadCollapsedTurn, masking: boolean): MainTabChatTranscriptProps {
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
  };
}

function openShowDetails(container: HTMLElement) {
  const toggle = container.querySelector('[aria-label="Show details"]');
  expect(toggle).not.toBeNull();
  fireEvent.click(toggle!);
}

function ladderText(container: HTMLElement): string {
  const ladder = container.querySelector(".bonsai-chip-ladder");
  expect(ladder).not.toBeNull();
  return ladder!.parentElement?.textContent ?? "";
}

function openNotesBlock(container: HTMLElement) {
  const block = container.querySelector(".bonsai-kb-notes-block");
  expect(block).not.toBeNull();
  fireEvent.click(block as HTMLElement);
}

beforeEach(() => {
  resetSpoilerFenceOpenCountForTests();
});

describe("an answer that hid a spoiler", () => {
  // The Deck case: the answer covered the name, the notes block reads "Boss note (spoiler)".
  const covered = turnWith(
    [soulMaster()],
    "Hit him from below.\n\n```bonsai-spoiler\nThat boss is the Soul Master.\n```"
  );
  const uncoveredButProtected = turnWith([soulMaster()], "Hit him from below while he conjures orbs.");

  it("keeps the credit line hidden in Show details, naming nothing, before the notes are opened", () => {
    const { container } = render(<MainTabChatTranscript {...props(covered, true)} />);
    openShowDetails(container);
    const text = ladderText(container);
    expect(text).toContain(HIDDEN_TEXT);
    expect(text).not.toContain("Soul Master");
    expect(text).not.toContain("No source page");
    expect(container.textContent).not.toContain("Soul Master");
  });

  it("shows the full credit line once the person opens the notes block", () => {
    const { container } = render(<MainTabChatTranscript {...props(covered, true)} />);
    // The block only appears after the answer's own cover is opened (buildKbNotesBlockElement).
    fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button") as HTMLElement);
    openNotesBlock(container);
    openShowDetails(container);
    const text = ladderText(container);
    expect(text).toContain("No source page");
    expect(text).toContain("Soul Master");
    expect(text).not.toContain(HIDDEN_TEXT);
  });

  it("hides it on an answer with no cover of its own but a protected note, until the block opens", () => {
    const { container } = render(<MainTabChatTranscript {...props(uncoveredButProtected, true)} />);
    openShowDetails(container);
    expect(ladderText(container)).not.toContain("Soul Master");
    expect(ladderText(container)).toContain(HIDDEN_TEXT);
    openNotesBlock(container);
    expect(ladderText(container)).toContain("Soul Master");
  });

  it("keeps it hidden on the Session tab's row for that answer too", () => {
    const { container } = render(<MainTabChatTranscript {...props(uncoveredButProtected, true)} />);
    openShowDetails(container);
    const sessionTab = Array.from(container.querySelectorAll(".bonsai-details-tab")).find((el) =>
      (el.textContent ?? "").startsWith("Session")
    );
    expect(sessionTab).toBeDefined();
    fireEvent.click(sessionTab as HTMLElement);
    const body = container.querySelector(".bonsai-details-session-body");
    expect(body).not.toBeNull();
    expect(body!.textContent).toContain(HIDDEN_TEXT);
    expect(body!.textContent).not.toContain("Soul Master");
  });

  it("shows everything when the person has spoiler covers switched off", () => {
    const { container } = render(<MainTabChatTranscript {...props(uncoveredButProtected, false)} />);
    openShowDetails(container);
    const text = ladderText(container);
    expect(text).toContain("Soul Master");
    expect(text).not.toContain(HIDDEN_TEXT);
  });
});

describe("an answer that hid nothing", () => {
  it("shows the credit line exactly as before, notes block closed", () => {
    const plain = turnWith([soulMaster({ spoiler_protected: undefined })], "Fight the Soul Master from below.");
    const { container } = render(<MainTabChatTranscript {...props(plain, true)} />);
    openShowDetails(container);
    const text = ladderText(container);
    expect(text).toContain("No source page");
    expect(text).toContain("Soul Master");
    expect(text).not.toContain(HIDDEN_TEXT);
  });
});
