/**
 * Title: The Session tab's row list, de-dup, and Sum up this chat
 * Purpose: Pin `computeSessionContextRows`'s de-dup rule (roadmap: "Session context counts the
 *          newest turn twice") now that it is shared code, and pin `SessionContextTabBody`'s own
 *          top section (plan 68): *Sum up this chat* always showing, its greyed-out states and
 *          reason lines, the summary card, no Clear anywhere, and the D-pad edges between the
 *          button, the card, the first row and the chips as real `Focusable` move props rather than
 *          any keyboard event (AGENTS.md's focus-graph rule: Steam never delivers a DOM keydown for
 *          the D-pad).
 * Used for: SessionContextStrip.tsx and features/chat-sum-up/SessionSumUpSection.tsx.
 * Does not: Cover the tabs themselves or the four ways out of the panel they sit in -- see
 *           MainTabChatTranscript.detailsTabs.test.tsx for that. Does not exercise Steam's own
 *           gamepad ring -- jsdom has none; "focused" here means the element's own focus().
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { SessionContextTabBody, computeSessionContextRows } from "./SessionContextStrip";
import type { ChatSumUpState } from "../features/chat-sum-up/chatSumUpModel";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurnTransparency } from "../utils/inputTransparency";

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
  return { ...stubs, Focusable: CapturingFocusable };
});

const CHIP_SNAPSHOT: ChatSlotTurnTransparency = {
  route: "game_context",
  success: true,
  context_chips: [
    {
      id: "chip-1",
      rank: 0,
      label: "Game context",
      attached: true,
      tier_class: "foss",
      body: { title: "Game context", paths: [], bullets: [] },
    },
  ],
};

const ARCHIVED_TURN: AskThreadCollapsedTurn = {
  id: "turn-1",
  question: "How do I dodge the exploders",
  answer: "Keep your distance and strafe.",
  transparency: CHIP_SNAPSHOT,
};

function latestPropsFor(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.focusableProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

function sumUpState(over: Partial<ChatSumUpState> = {}): ChatSumUpState {
  return {
    summary: null,
    canSumUp: true,
    questionsAfterSummary: 2,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: vi.fn(),
    stopSumUp: vi.fn(),
    ...over,
  };
}

const SUMMARY = {
  text: "Playing Half-Life 2, in Route Kanal.\n- Asked about the pulse rifle and the magnum.",
  covers_through_turn_id: "t-10",
  turns_covered: 32,
  oldest_turns_unread: 0,
  hidden_notes_left_out: 1,
  written_at: new Date().toISOString(),
  seconds: 31.6,
  model: "gemma4:e2b-it-qat",
};

beforeEach(() => {
  hoisted.focusableProps = [];
});

describe("computeSessionContextRows -- live/archived de-dup", () => {
  /*
   * Regression guard for "Session context counts the newest turn twice" (roadmap). After a
   * completed Ask, `liveTurn` stays populated by `transparencySnapshot` at the same moment the
   * slot reload archives the identical turn — without de-dup the newest turn counted as both an
   * archived row and the live row.
   */
  it("drops the live row when it matches the newest archived turn", () => {
    const rows = computeSessionContextRows(
      {
        id: "live",
        label: "How do I dodge the exploders",
        question: "How do I dodge the exploders",
        snapshot: CHIP_SNAPSHOT,
      },
      [ARCHIVED_TURN]
    );
    expect(rows).toHaveLength(1);
  });

  it("keeps both rows when the live turn is genuinely different", () => {
    const rows = computeSessionContextRows(
      {
        id: "live",
        label: "What's the DPS meta right now",
        question: "What's the DPS meta right now",
        snapshot: CHIP_SNAPSHOT,
      },
      [ARCHIVED_TURN]
    );
    expect(rows).toHaveLength(2);
  });

  it("is empty with nothing on either side", () => {
    expect(computeSessionContextRows(null, [])).toHaveLength(0);
  });
});

describe("SessionContextTabBody -- the tab shows whenever the chat has a question (plan 68)", () => {
  it("draws Sum up this chat even with no rows at all, greyed out while the chat still fits", () => {
    const { getByText, queryByText } = render(<SessionContextTabBody />);
    expect(getByText("Sum up this chat")).toBeTruthy();
    expect(getByText("The whole chat still fits, so there's nothing to sum up yet.")).toBeTruthy();
    expect(queryByText("Clear")).toBeNull();
  });

  it("has no Clear with rows either", () => {
    const { queryByText } = render(
      <SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} sumUp={sumUpState()} />
    );
    expect(queryByText("Clear")).toBeNull();
  });
});

describe("SessionContextTabBody -- Sum up this chat", () => {
  it("A on the ready button starts the summary, and there is no reason line", () => {
    const state = sumUpState();
    const { queryByText } = render(<SessionContextTabBody sumUp={state} />);
    expect(queryByText(/nothing to sum up/)).toBeNull();
    (latestPropsFor("bonsai-sumup-btn")?.onOKButton as () => void)();
    expect(state.startSumUp).toHaveBeenCalledTimes(1);
  });

  it("a tap starts it too", () => {
    const state = sumUpState();
    const { getByText } = render(<SessionContextTabBody sumUp={state} />);
    fireEvent.click(getByText("Sum up this chat"));
    expect(state.startSumUp).toHaveBeenCalledTimes(1);
  });

  it("greyed out while an answer is being written: still a stop, A does nothing, the line says why", () => {
    const state = sumUpState();
    const { getByText } = render(<SessionContextTabBody sumUp={state} answerInFlight />);
    expect(getByText("Wait for the answer to finish, then sum up.")).toBeTruthy();
    const props = latestPropsFor("bonsai-sumup-btn bonsai-sumup-btn--off");
    expect(props).toBeDefined();
    (props?.onOKButton as () => void)();
    expect(state.startSumUp).not.toHaveBeenCalled();
  });

  it("while working: the spinner's words with the back end's seconds, no card, no reason", () => {
    const { getByText, queryByText, container } = render(
      <SessionContextTabBody sumUp={sumUpState({ summingUp: true, summingUpSeconds: 12, summary: SUMMARY })} />
    );
    expect(getByText("Summing up · 12 s")).toBeTruthy();
    expect(container.querySelector(".bonsai-sumup-card")).toBeNull();
    expect(queryByText(/nothing to sum up|Wait for the answer/)).toBeNull();
  });

  it("reads Sum up again once a summary exists, with the card under it", () => {
    const { getByText } = render(<SessionContextTabBody sumUp={sumUpState({ summary: SUMMARY })} />);
    expect(getByText("Sum up again")).toBeTruthy();
    expect(getByText("What the AI remembers")).toBeTruthy();
    expect(getByText("16 turns · just now")).toBeTruthy();
    expect(getByText("Playing Half-Life 2, in Route Kanal.")).toBeTruthy();
    expect(getByText("Asked about the pulse rifle and the magnum.")).toBeTruthy();
    expect(getByText("Plus the newest 2 turns, word for word · 1 hidden note left out")).toBeTruthy();
  });
});

describe("SessionContextTabBody -- D-pad through the top of the tab", () => {
  it("Up off the button goes to the tabs row above", () => {
    const onMoveUpFromTop = vi.fn(() => true);
    render(<SessionContextTabBody sumUp={sumUpState()} onMoveUpFromTop={onMoveUpFromTop} />);
    expect((latestPropsFor("bonsai-sumup-btn")?.onMoveUp as () => boolean)()).toBe(true);
    expect(onMoveUpFromTop).toHaveBeenCalledTimes(1);
  });

  it("Down from the button lands on the card when there is one, and Down from the card on the first row", () => {
    const { container } = render(
      <SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} sumUp={sumUpState({ summary: SUMMARY })} />
    );
    expect((latestPropsFor("bonsai-sumup-btn")?.onMoveDown as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".bonsai-sumup-card"));
    expect((latestPropsFor("bonsai-sumup-card")?.onMoveDown as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".bonsai-details-session-row"));
  });

  it("Down from the button with no card goes straight to the first row", () => {
    const { container } = render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} sumUp={sumUpState()} />);
    expect((latestPropsFor("bonsai-sumup-btn")?.onMoveDown as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".bonsai-details-session-row"));
  });

  it("with nothing below, Down from the button is consumed so Steam cannot throw the ring into the dock", () => {
    render(<SessionContextTabBody sumUp={sumUpState()} />);
    expect((latestPropsFor("bonsai-sumup-btn")?.onMoveDown as () => boolean)()).toBe(true);
  });

  it("Up off the first row lands on the card, or the button when there is no card", () => {
    const first = render(
      <SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} sumUp={sumUpState({ summary: SUMMARY })} />
    );
    expect((latestPropsFor("bonsai-details-session-row")?.onMoveUp as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(first.container.querySelector(".bonsai-sumup-card"));
    first.unmount();
    hoisted.focusableProps = [];
    const second = render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} sumUp={sumUpState()} />);
    expect((latestPropsFor("bonsai-details-session-row")?.onMoveUp as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(second.container.querySelector(".bonsai-sumup-btn"));
  });

  it("the card's Up goes back to the button", () => {
    const { container } = render(<SessionContextTabBody sumUp={sumUpState({ summary: SUMMARY })} />);
    expect((latestPropsFor("bonsai-sumup-card")?.onMoveUp as () => boolean)()).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".bonsai-sumup-btn"));
  });
});

describe("SessionContextTabBody -- B closes the whole panel, not just this body", () => {
  it("onCancelButton calls onRequestClose and consumes the press", () => {
    const onRequestClose = vi.fn();
    render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} onRequestClose={onRequestClose} />);

    const bodyProps = latestPropsFor("bonsai-details-session-body");
    const onCancelButton = bodyProps?.onCancelButton as (e: unknown) => void;
    expect(onCancelButton).toBeTypeOf("function");

    let prevented = false;
    onCancelButton({ preventDefault: () => (prevented = true) });
    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(prevented).toBe(true);
  });
});
