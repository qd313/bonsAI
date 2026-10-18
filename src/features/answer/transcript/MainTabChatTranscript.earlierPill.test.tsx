/**
 * Title: "N earlier" collapsed-history pill tests
 * Purpose: Pin which archived turns the pill stands in for, and that expanding it reveals them.
 * Used for: Regression coverage for redesign plan 28 item 13 (board 8e -> A, decision D-G).
 * Solves: "Earlier" must never swallow the newest visible turn — on the ordinary path that turn
 *         is archived, not live, so a naive "collapse all archived turns" hides the newest answer.
 * Does not: Cover expanding the pill or the focus hand-off that follows. The pill activates through
 *           `onActivate`/`onOKButton`, the same Steam A-button path every turn header uses, and the
 *           test harness strips those props on purpose (src/test-harness/fakeDeckyUi.tsx) — so
 *           expansion is on-Deck row CHAT-SLOTS-V3-07, not a click here.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";

/* Focusable/Button must be real DOM nodes or this suite passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

function turn(n: number): AskThreadCollapsedTurn {
  return { id: `t${n}`, question: `question number ${n}`, answer: `answer number ${n}` };
}

function renderTranscript(turns: AskThreadCollapsedTurn[]) {
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
    askMode: "speed",
    askThreadCollapsed: turns,
    expandedTurnKey: turns.length ? turns[turns.length - 1].id : "live",
    askThreadDisplayQuestion: "",
  };
  return render(<MainTabChatTranscript {...props} />);
}

function turnSlots(container: HTMLElement): number {
  return container.querySelectorAll(".bonsai-chat-turn-slot").length;
}

describe('"N earlier" collapsed history pill', () => {
  it("does not render with one archived turn", () => {
    const { container } = renderTranscript([turn(1)]);
    expect(container.querySelector(".bonsai-chat-earlier-pill")).toBeNull();
    expect(turnSlots(container)).toBe(1);
  });

  it("does not render with two archived turns, because only one of them is earlier", () => {
    const { container } = renderTranscript([turn(1), turn(2)]);
    expect(container.querySelector(".bonsai-chat-earlier-pill")).toBeNull();
    expect(turnSlots(container)).toBe(2);
  });

  it("collapses the older turns behind one pill and always keeps the newest visible", () => {
    const { container } = renderTranscript([turn(1), turn(2), turn(3), turn(4)]);
    expect(container.querySelector(".bonsai-chat-earlier-pill")?.textContent).toBe("3 earlier");
    expect(turnSlots(container)).toBe(1);
    expect(container.textContent).toContain("question number 4");
    expect(container.textContent).not.toContain("question number 1");
  });

  it("counts every older turn, not just the ones it can fit", () => {
    const { container } = renderTranscript([turn(1), turn(2), turn(3), turn(4), turn(5), turn(6)]);
    expect(container.querySelector(".bonsai-chat-earlier-pill")?.textContent).toBe("5 earlier");
    expect(turnSlots(container)).toBe(1);
  });

  it("renders nothing at all with no turns", () => {
    const { container } = renderTranscript([]);
    expect(container.querySelector(".bonsai-chat-earlier-pill")).toBeNull();
    expect(turnSlots(container)).toBe(0);
  });
});
