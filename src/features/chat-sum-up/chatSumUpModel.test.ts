/**
 * Title: What the Session tab says about a chat's summary -- tests
 * Purpose: Pin every word the Sum up section can show (plan 68 § 6, as drawn) and the one rule the
 *          screen shares with the back end: which turns come after a summary's coverage, including
 *          the case where the 200-turn cap has dropped the covered turn.
 * Used for: chatSumUpModel.ts.
 * Does not: Render anything -- SessionContextStrip.test.tsx covers the drawn section.
 */
import { describe, expect, it, vi } from "vitest";

import {
  REASON_ANSWER_IN_FLIGHT,
  REASON_NOTHING_TO_SUM,
  entriesAsQuestions,
  questionsIn,
  summaryCardFooter,
  summaryCardLines,
  summaryCardMeta,
  sumUpButtonView,
  turnsAfterSummary,
  writtenAgo,
  type ChatSumUpState,
} from "./chatSumUpModel";
import type { ChatMemorySummary, ChatSlotTurn } from "../../utils/chatSlotsApi";

const NOW = Date.parse("2026-09-25T20:00:00Z");

function summary(over: Partial<ChatMemorySummary> = {}): ChatMemorySummary {
  return {
    text: "Playing Half-Life 2.",
    covers_through_turn_id: "a2",
    turns_covered: 32,
    oldest_turns_unread: 0,
    hidden_notes_left_out: 0,
    written_at: "2026-09-25T19:59:40Z",
    seconds: 31.6,
    model: "gemma4:e2b-it-qat",
    ...over,
  };
}

function state(over: Partial<ChatSumUpState> = {}): ChatSumUpState {
  return {
    summary: null,
    canSumUp: true,
    questionsAfterSummary: 0,
    summingUp: false,
    summingUpSeconds: null,
    otherJobRunning: false,
    startSumUp: vi.fn(),
    stopSumUp: vi.fn(),
    ...over,
  };
}

const TURNS: ChatSlotTurn[] = [
  { id: "q1", role: "user", text: "one" },
  { id: "a1", role: "assistant", text: "one." },
  { id: "q2", role: "user", text: "two" },
  { id: "a2", role: "assistant", text: "two." },
  { id: "q3", role: "user", text: "three" },
  { id: "a3", role: "assistant", text: "three." },
];

describe("which turns come after the summary", () => {
  it("everything after the covered turn", () => {
    expect(turnsAfterSummary(TURNS, summary()).map((t) => t.id)).toEqual(["q3", "a3"]);
    expect(questionsIn(turnsAfterSummary(TURNS, summary()))).toBe(1);
  });

  it("all of them with no summary", () => {
    expect(turnsAfterSummary(TURNS, null)).toHaveLength(6);
  });

  it("all of them when the covered turn was dropped by the 200-turn cap -- none is covered", () => {
    expect(turnsAfterSummary(TURNS, summary({ covers_through_turn_id: "gone" }))).toHaveLength(6);
  });

  it("counts saved entries as questions, rounding up", () => {
    expect(entriesAsQuestions(32)).toBe(16);
    expect(entriesAsQuestions(33)).toBe(17);
    expect(entriesAsQuestions(-4)).toBe(0);
  });
});

describe("the card", () => {
  it("header: turns and how long ago", () => {
    expect(summaryCardMeta(summary(), NOW)).toBe("16 turns · just now");
    expect(summaryCardMeta(summary({ written_at: "2026-09-25T19:55:00Z" }), NOW)).toBe("16 turns · 5 min ago");
    expect(summaryCardMeta(summary({ written_at: "2026-09-25T17:00:00Z" }), NOW)).toBe("16 turns · 3 h ago");
    expect(writtenAgo("not a date", NOW)).toBe("");
  });

  it("lines: plain short lines, list marks and stray bold taken off", () => {
    expect(
      summaryCardLines("Game: **Half-Life 2**\n- Player asked about the pulse rifle.\n\n2. Stuck on __Route Kanal__")
    ).toEqual(["Game: Half-Life 2", "Player asked about the pulse rifle.", "Stuck on Route Kanal"]);
  });

  it("footer: the newest turns kept word for word, and the hidden notes left out", () => {
    expect(summaryCardFooter(summary(), 2)).toBe("Plus the newest 2 turns, word for word");
    expect(summaryCardFooter(summary({ hidden_notes_left_out: 1 }), 1)).toBe(
      "Plus the newest 1 turn, word for word · 1 hidden note left out"
    );
    expect(summaryCardFooter(summary({ hidden_notes_left_out: 2 }), 2)).toBe(
      "Plus the newest 2 turns, word for word · 2 hidden notes left out"
    );
  });

  it("footer: an old chat too long for one pass says what was left out", () => {
    expect(summaryCardFooter(summary({ turns_covered: 120, oldest_turns_unread: 280 }), 2)).toBe(
      "Too long to read in one go: this covers the newest 60 turns. The oldest 140 are not in it."
    );
  });
});

describe("the button", () => {
  it("ready: Sum up this chat, then Sum up again once a summary exists", () => {
    expect(sumUpButtonView({ state: state(), answerInFlight: false })).toEqual({
      label: "Sum up this chat",
      busy: false,
      disabled: false,
      reason: null,
    });
    expect(sumUpButtonView({ state: state({ summary: summary() }), answerInFlight: false }).label).toBe(
      "Sum up again"
    );
  });

  it("greyed out while an answer is being written, or another chat is being summed up", () => {
    expect(sumUpButtonView({ state: state(), answerInFlight: true })).toMatchObject({
      disabled: true,
      reason: REASON_ANSWER_IN_FLIGHT,
    });
    expect(sumUpButtonView({ state: state({ otherJobRunning: true }), answerInFlight: false })).toMatchObject({
      disabled: true,
      reason: REASON_ANSWER_IN_FLIGHT,
    });
  });

  it("greyed out while the whole chat still fits, and with no state at all", () => {
    expect(sumUpButtonView({ state: state({ canSumUp: false }), answerInFlight: false })).toMatchObject({
      disabled: true,
      reason: REASON_NOTHING_TO_SUM,
    });
    expect(sumUpButtonView({ state: null, answerInFlight: false })).toMatchObject({
      label: "Sum up this chat",
      disabled: true,
      reason: REASON_NOTHING_TO_SUM,
    });
  });

  it("working beats everything, with the back end's seconds", () => {
    expect(
      sumUpButtonView({ state: state({ summingUp: true, summingUpSeconds: 12 }), answerInFlight: true })
    ).toEqual({ label: "Summing up · 12 s", busy: true, disabled: true, reason: null });
    expect(sumUpButtonView({ state: state({ summingUp: true }), answerInFlight: false }).label).toBe("Summing up");
  });
});
