/**
 * Title: Earlier questions, grouped by the day they were asked
 * Purpose: Turn a long chat's older questions into a short list of day lines ("Today · 12",
 * "Yesterday · 30", "Mon 28 Sep · 46"), each of which opens on its own to show that day's questions.
 * Used for: MainTabChatTranscript.tsx, once the "N earlier" line has been opened.
 * Solves: Opening "N earlier" used to bring back every older question as its own row (42 or 88 in
 * one chat), filling the screen and pushing the newest answer far below.
 * Does not: Draw anything or move the ring -- the transcript does both. It only says which day each
 * question belongs to, which questions are on screen, and which day lines sit in front of them.
 * Caution: The day is the Deck's own local day. A question with no saved date goes under a line named
 * "Earlier" (the date is carried from the saved chat, see chatSlotTurns.ts); a question minted this
 * session before its chat reloaded has no saved date yet but carries its time in its id.
 */
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";

export type EarlierDay = {
  /** Stable across renders: the local date as YYYY-MM-DD, or "undated". */
  key: string;
  /** "Today", "Yesterday", "Mon 28 Sep" (with the year when it is not this year), or "Earlier". */
  label: string;
  /** The day's questions, in the order they were asked. */
  turns: AskThreadCollapsedTurn[];
  /** Where in the full list this day's first question sits. */
  firstIndex: number;
};

export type EarlierLayout = {
  /** Every day line, oldest day first, so the newest day is the one nearest the newest turn. */
  days: EarlierDay[];
  /** The questions drawn as rows: those of the days that are open, then everything after the earlier ones. */
  shown: AskThreadCollapsedTurn[];
  /** The day lines to draw directly in front of a shown question, by that question's id. */
  daysBefore: Map<string, EarlierDay[]>;
  /** Day lines with no shown question after them: drawn after the last shown question. */
  trailingDays: EarlierDay[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNDATED_KEY = "undated";

/** When a question was asked, in milliseconds, or null when nothing says. */
export function turnAskedAtMs(turn: AskThreadCollapsedTurn): number | null {
  if (typeof turn.createdAt === "number" && turn.createdAt > 0) return turn.createdAt * 1000;
  const minted = /^turn-(\d{10,})-/.exec(turn.id);
  return minted ? Number(minted[1]) : null;
}

function dayKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function labelFor(date: Date, now: Date): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKeyOf(date) === dayKeyOf(now)) return "Today";
  if (dayKeyOf(date) === dayKeyOf(yesterday)) return "Yesterday";
  const base = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

/** The text on a day line: the day and how many questions it holds. */
export function dayLineText(day: EarlierDay): string {
  return `${day.label} · ${day.turns.length}`;
}

/** Group the older questions by local day, oldest day first. */
export function groupEarlierTurnsByDay(
  turns: AskThreadCollapsedTurn[],
  now: Date = new Date()
): EarlierDay[] {
  const days: EarlierDay[] = [];
  const byKey = new Map<string, EarlierDay>();
  turns.forEach((turn, index) => {
    const ms = turnAskedAtMs(turn);
    const date = ms === null ? null : new Date(ms);
    const key = date ? dayKeyOf(date) : UNDATED_KEY;
    let day = byKey.get(key);
    if (!day) {
      day = { key, label: date ? labelFor(date, now) : "Earlier", turns: [], firstIndex: index };
      byKey.set(key, day);
      days.push(day);
    }
    day.turns.push(turn);
  });
  return days;
}

/**
 * What is on screen once "N earlier" is open: a line per day, the questions of the open days under
 * their line, and the turns after the earlier ones (the newest question and what follows it).
 */
export function layoutEarlierByDay(args: {
  turns: AskThreadCollapsedTurn[];
  earlierCount: number;
  openDays: ReadonlySet<string>;
  now?: Date;
}): EarlierLayout {
  const { turns, earlierCount, openDays, now } = args;
  const days = groupEarlierTurnsByDay(turns.slice(0, earlierCount), now);
  const openIds = new Set<string>();
  days.forEach((day) => {
    if (openDays.has(day.key)) day.turns.forEach((t) => openIds.add(t.id));
  });
  const shownIndexes: number[] = [];
  turns.forEach((turn, index) => {
    if (index >= earlierCount || openIds.has(turn.id)) shownIndexes.push(index);
  });
  const daysBefore = new Map<string, EarlierDay[]>();
  const trailingDays: EarlierDay[] = [];
  days.forEach((day) => {
    const anchor = shownIndexes.find((index) => index >= day.firstIndex);
    if (anchor === undefined) {
      trailingDays.push(day);
      return;
    }
    const id = turns[anchor]!.id;
    daysBefore.set(id, [...(daysBefore.get(id) ?? []), day]);
  });
  return { days, shown: shownIndexes.map((i) => turns[i]!), daysBefore, trailingDays };
}
