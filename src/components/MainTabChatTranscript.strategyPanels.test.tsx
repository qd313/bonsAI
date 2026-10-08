import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type {
  AskThreadCollapsedTurn,
  StrategyChecklistState,
  StrategyGuideBranchesPayload,
} from "../types/bonsaiUi";

/*
 * Same reasoning as SessionContextStrip.test.tsx: `Focusable` has to render as a real DOM node or
 * this suite passes for the wrong reason — the assertions below count elements by class name.
 */
vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const BRANCHES: StrategyGuideBranchesPayload = {
  question: "Which exploder problem are you hitting?",
  options: [
    { id: "swarm", label: "They swarm me in tunnels" },
    { id: "chip", label: "They chip my shield on open ground" },
  ],
};

const CHECKLIST: StrategyChecklistState = {
  title: "Before the next dive",
  items: [
    { id: "kite", label: "Kite them into a corridor" },
    { id: "shield", label: "Save the shield for the third wave" },
  ],
  checkedIds: [],
};

const ARCHIVED_TURN: AskThreadCollapsedTurn = {
  id: "53780637-0d91-46bc-b29c-4eb56427ee11",
  question: "how do i deal with the exploders",
  answer: "Keep your distance and let them come to you.",
  transparency: null,
};

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps>) {
  const props: MainTabChatTranscriptProps = {
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
    strategyGuideBranches: BRANCHES,
    onStrategyBranchPick: () => {},
    strategyChecklist: CHECKLIST,
    onStrategyChecklistToggle: () => {},
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

describe("strategy panels follow the newest answer, live or archived", () => {
  /*
   * STRAT-BRANCH-01, frontend half. The backend parsed two branch options and the picker still did
   * not appear on device, because both panels were gated on `expandedTurnKey === "live"` and the
   * post-Ask slot reload re-points that key at the archived turn's id the instant the answer lands
   * (useChatSlots.applySlotTranscript). This is the state the device was measured in: one archived
   * turn, expanded, nothing live. Before the fix both counts here were 0.
   */
  it("renders the picker and the checklist on an expanded archived turn", () => {
    const { container } = renderTranscript({
      askThreadCollapsed: [ARCHIVED_TURN],
      expandedTurnKey: ARCHIVED_TURN.id,
      askThreadDisplayQuestion: "",
      lastExchange: {
        question: ARCHIVED_TURN.question,
        answer: ARCHIVED_TURN.answer,
      } as MainTabChatTranscriptProps["lastExchange"],
    });

    expect(container.querySelectorAll(".bonsai-strategy-branch-picker")).toHaveLength(1);
    expect(container.querySelectorAll(".bonsai-strategy-branch-btn")).toHaveLength(2);
    expect(container.querySelectorAll(".bonsai-strategy-checklist-panel")).toHaveLength(1);
  });

  /*
   * The panels sit between the answer bubble and the reply actions in the live turn, and their D-pad
   * edge exits return false so the parent turn-slot Focusable walks to those two siblings. Rendering
   * them anywhere else in the archived slot would silently reroute the walk, so order is asserted
   * rather than mere presence.
   */
  it("keeps the picker between the answer bubble and the reply actions", () => {
    const { container } = renderTranscript({
      askThreadCollapsed: [ARCHIVED_TURN],
      expandedTurnKey: ARCHIVED_TURN.id,
      lastExchange: {
        question: ARCHIVED_TURN.question,
        answer: ARCHIVED_TURN.answer,
      } as MainTabChatTranscriptProps["lastExchange"],
      onRetryLastResponse: () => {},
    });

    const slot = container.querySelector(".bonsai-chat-turn-slot");
    expect(slot).not.toBeNull();
    const children = Array.from(slot!.children);
    const indexOf = (selector: string) =>
      children.findIndex((el) => el.matches(selector) || el.querySelector(selector));

    const bubble = indexOf(".bonsai-chat-ai-bubble");
    const picker = indexOf(".bonsai-strategy-branch-picker");
    const checklist = indexOf(".bonsai-strategy-checklist-panel");

    expect(bubble).toBeGreaterThanOrEqual(0);
    expect(picker).toBeGreaterThan(bubble);
    expect(checklist).toBeGreaterThan(picker);
  });

  /*
   * Both payloads describe the newest answer only. Attaching them to an older expanded turn would
   * offer branches for an answer that is no longer the one on screen.
   */
  it("does not attach the panels to an older expanded turn", () => {
    const older: AskThreadCollapsedTurn = {
      id: "older-turn",
      question: "what does the drop pod do",
      answer: "It extracts you.",
      transparency: null,
    };
    const { container } = renderTranscript({
      askThreadCollapsed: [older, ARCHIVED_TURN],
      expandedTurnKey: older.id,
    });

    expect(container.querySelectorAll(".bonsai-strategy-branch-picker")).toHaveLength(0);
    expect(container.querySelectorAll(".bonsai-strategy-checklist-panel")).toHaveLength(0);
  });

  /* The live path is unchanged: a still-live answer keeps both panels. */
  it("still renders both panels on the live turn", () => {
    const { container } = renderTranscript({
      askThreadDisplayQuestion: "how do i deal with the exploders",
      ollamaResponse: "Keep your distance and let them come to you.",
      expandedTurnKey: "live",
    });

    expect(container.querySelectorAll(".bonsai-strategy-branch-picker")).toHaveLength(1);
    expect(container.querySelectorAll(".bonsai-strategy-checklist-panel")).toHaveLength(1);
  });

  /* Never two copies: a live turn and an archived turn can be on screen at the same time. */
  it("renders the panels once when a live turn and an archived turn coexist", () => {
    const { container } = renderTranscript({
      askThreadCollapsed: [ARCHIVED_TURN],
      askThreadDisplayQuestion: "and what about the shellbacks",
      expandedTurnKey: ARCHIVED_TURN.id,
    });

    expect(container.querySelectorAll(".bonsai-strategy-branch-picker")).toHaveLength(1);
    expect(container.querySelectorAll(".bonsai-strategy-checklist-panel")).toHaveLength(1);
  });
});

/*
 * Terse mode (Speed answers in three lines) ends every Speed reply with the same branch menu a
 * Strategy reply gets. The picker is drawn from the menu itself, not from the ask mode, so a Speed
 * transcript with a menu shows it, and one without a menu shows none.
 */
describe("the branch picker on a Speed answer (Terse mode)", () => {
  const baseOverrides = {
    askMode: "speed" as const,
    strategyChecklist: null,
    askThreadCollapsed: [ARCHIVED_TURN],
    expandedTurnKey: ARCHIVED_TURN.id,
    lastExchange: {
      question: ARCHIVED_TURN.question,
      answer: ARCHIVED_TURN.answer,
    } as MainTabChatTranscriptProps["lastExchange"],
  };

  it("draws the picker when a Speed answer came with a menu", () => {
    const { container } = renderTranscript(baseOverrides);
    expect(container.querySelectorAll(".bonsai-strategy-branch-picker")).toHaveLength(1);
    expect(container.querySelectorAll(".bonsai-strategy-branch-btn")).toHaveLength(2);
  });

  it("draws no picker when a Speed answer came without one", () => {
    const { container } = renderTranscript({ ...baseOverrides, strategyGuideBranches: null });
    expect(container.querySelectorAll(".bonsai-strategy-branch-picker")).toHaveLength(0);
  });
});
