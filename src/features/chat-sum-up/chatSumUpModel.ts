/**
 * Title: What the Session tab says about a chat's summary
 *
 * Purpose: The pure half of plan 68's screen: given a chat's saved summary, its turns, and whether
 * the back end says there is anything to sum up, work out every word the Session tab shows — the
 * button's label, the line saying why it is greyed out, the summary card's header, its lines and
 * its footer — and which of the chat's turns the AI still carries word for word.
 *
 * Used for: SessionSumUpSection.tsx (the button and the card) and useChatSlots.ts (which turns come
 * after the summary).
 *
 * Solves: Keeps the wording testable on its own, away from React and the D-pad, and in one place,
 * so the card, the button and the reason line cannot drift apart on what "a turn" means.
 *
 * Does not: Load anything, start a summary, or decide whether a chat has outgrown its room — the
 * back end decides that and sends `can_sum_up`.
 *
 * What "a turn" means on screen: one question and its answer, the way the Session tab's own row
 * list counts them. The back end counts saved entries (a question OR an answer), so its numbers
 * are halved here, rounding up.
 */
import type { ChatMemorySummary, ChatSlotSummary, ChatSlotTurn } from "../../utils/chatSlotsApi";

/**
 * Everything the Session tab needs about the open chat's summary, carried from useChatSlots to the
 * tab on the open chat's own row of the chat list (the one value already handed to the Main tab —
 * plan 68 Appendix A: no new prop may be added there).
 */
export type ChatSumUpState = {
  /** The chat's own summary, or null before the first one is written. */
  summary: ChatMemorySummary | null;
  /** The back end's answer to "is there anything to sum up": false while the whole chat still fits. */
  canSumUp: boolean;
  /** Questions after the summary's last covered turn — the ones the AI still carries word for word. */
  questionsAfterSummary: number;
  /** True while the back end is writing a summary this person asked for with the button. */
  summingUp: boolean;
  /** Whole seconds the summary has been running, from the back end's own clock; null before the first poll. */
  summingUpSeconds: number | null;
  /** True while the back end is summing up a DIFFERENT chat (the person switched away mid-job). */
  otherJobRunning: boolean;
  /** Ask the back end to sum the open chat up now. */
  startSumUp: () => void;
  /** Stop a summary the button started — the Ask bar's Stop calls this while one is running. */
  stopSumUp: () => void;
};

/** A row of the chat list as the screen holds it: the open chat's row also carries `sumUp`. */
export type ChatListRow = ChatSlotSummary & { sumUp?: ChatSumUpState };

/** A chat entry count from the back end (questions and answers each counted) as questions. */
export function entriesAsQuestions(entries: number): number {
  const n = Math.max(0, Math.floor(Number(entries) || 0));
  return Math.ceil(n / 2);
}

/**
 * The turns after the summary's coverage, in order. Every turn up to and including
 * `covers_through_turn_id` is covered; when that id is no longer in the chat (the 200-turn cap
 * dropped it), none of the remaining turns is — the same rule the back end reads it by.
 */
export function turnsAfterSummary(
  turns: readonly ChatSlotTurn[],
  summary: ChatMemorySummary | null | undefined,
): ChatSlotTurn[] {
  if (!summary) return [...turns];
  const at = turns.findIndex((t) => t.id === summary.covers_through_turn_id);
  return at < 0 ? [...turns] : turns.slice(at + 1);
}

export function questionsIn(turns: readonly ChatSlotTurn[]): number {
  return turns.filter((t) => t.role === "user").length;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "just now", "5 min ago", "2 h ago", or the date — how long ago the summary was written. */
export function writtenAgo(writtenAt: string, now: number = Date.now()): string {
  const at = Date.parse(writtenAt);
  if (!Number.isFinite(at)) return "";
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString();
}

/** The card header's right-hand side: "16 turns · just now". */
export function summaryCardMeta(summary: ChatMemorySummary, now: number = Date.now()): string {
  const turns = plural(entriesAsQuestions(summary.turns_covered), "turn", "turns");
  const ago = writtenAgo(summary.written_at, now);
  return ago ? `${turns} · ${ago}` : turns;
}

/**
 * The summary as short lines. The model is asked for short plain lines with no headings or bold;
 * this still strips a leading list mark and stray bold, because a small model does not always do
 * as it is told and a raw "**" on the Deck reads as a fault.
 */
export function summaryCardLines(text: string): string[] {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .trim(),
    )
    .filter(Boolean);
}

/**
 * The card's footer. An old chat too long for one pass says so first, because that is the one
 * thing a person would not otherwise guess: "Too long to read in one go: this covers the newest 60
 * turns. The oldest 140 are not in it."
 */
export function summaryCardFooter(summary: ChatMemorySummary, questionsKept: number): string {
  const unread = entriesAsQuestions(summary.oldest_turns_unread);
  if (unread > 0) {
    const covered = entriesAsQuestions(summary.turns_covered);
    return `Too long to read in one go: this covers the newest ${covered} turns. The oldest ${unread} are not in it.`;
  }
  const parts = [`Plus the newest ${plural(questionsKept, "turn", "turns")}, word for word`];
  if (summary.hidden_notes_left_out > 0) {
    parts.push(`${plural(summary.hidden_notes_left_out, "hidden note", "hidden notes")} left out`);
  }
  return parts.join(" · ");
}

export type SumUpButtonView = {
  label: string;
  /** True while a summary is being written; the label then carries the spinner's words. */
  busy: boolean;
  /** Greyed out: still a D-pad stop (measured 2026-09-16), but A does nothing. */
  disabled: boolean;
  /** The one line under a greyed button saying why, or null. */
  reason: string | null;
};

export const REASON_ANSWER_IN_FLIGHT = "Wait for the answer to finish, then sum up.";
export const REASON_NOTHING_TO_SUM = "The whole chat still fits, so there's nothing to sum up yet.";

/**
 * The button, in the order the plan's § 6 lists its states: working beats everything; an answer
 * being written greys it out; so does a chat that still fits; otherwise it reads "Sum up this
 * chat", or "Sum up again" once a summary exists.
 */
export function sumUpButtonView(args: {
  state: ChatSumUpState | null | undefined;
  answerInFlight: boolean;
}): SumUpButtonView {
  const { state, answerInFlight } = args;
  if (state?.summingUp) {
    const secs = state.summingUpSeconds;
    return {
      label: secs == null ? "Summing up" : `Summing up · ${secs} s`,
      busy: true,
      disabled: true,
      reason: null,
    };
  }
  const label = state?.summary ? "Sum up again" : "Sum up this chat";
  if (answerInFlight || state?.otherJobRunning) {
    return { label, busy: false, disabled: true, reason: REASON_ANSWER_IN_FLIGHT };
  }
  if (!state?.canSumUp) return { label, busy: false, disabled: true, reason: REASON_NOTHING_TO_SUM };
  return { label, busy: false, disabled: false, reason: null };
}
