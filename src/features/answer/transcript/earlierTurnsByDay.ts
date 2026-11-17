/**
 * Title: Earlier questions, grouped by the day they were asked or by the game they were about
 * Purpose: Turn a long chat's older questions into a short list of lines, each of which opens on its own to
 * show its questions: one line per day ("Today · 12", "Yesterday · 30", "Mon 28 Sep · 46"), or, flipped
 * (plan 105, the drawing's option Wild), one line per game across every day ("Hades · 21", "No game · 23").
 * A day that mixes games opens with a row of game buttons (All, each game, No game; the drawing's option C):
 * this file says which buttons that day has and which questions the picked one shows.
 * Used for: MainTabChatTranscript.tsx (through buildEarlierList.tsx), once the "N earlier" line has been
 * opened, and useEarlierTurnsPill.ts, which finds where a question from a Search jump sits.
 * Solves: Opening "N earlier" used to bring back every older question as its own row (42 or 88 in
 * one chat), filling the screen and pushing the newest answer far below.
 * Does not: Draw anything or move the ring -- the transcript does both. It only says which line each
 * question belongs to, which questions are on screen (an open line shows six, and six more per press of
 * its "Show N more" line), which lines and "Show N more" lines sit among them, which game buttons an open
 * day carries, and the small tag each shown question wears (its game under All, its day in the game list).
 * Caution: The day is the Deck's own local day. A question with no saved date goes under a line named
 * "Earlier" (the date is carried from the saved chat, see chatSlotTurns.ts); a question minted this
 * session before its chat reloaded has no saved date yet but carries its time in its id. A question with
 * no game name goes under "No game", which is always the last game. Game names are matched ignoring case.
 */
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";

/** How the opened "N earlier" list is grouped: one line per day, or one line per game. */
export type EarlierGrouping = "day" | "game";

export type EarlierDay = {
  /** Stable across renders: the local date as YYYY-MM-DD or "undated"; for a game line, "game:" and its name. */
  key: string;
  /** "Today", "Yesterday", "Mon 28 Sep" (with the year when it is not this year), "Earlier", or a game's name. */
  label: string;
  /** The line's questions, in the order they were asked. */
  turns: AskThreadCollapsedTurn[];
  /** Where in the full list this line's first question sits. */
  firstIndex: number;
};

/** How many of an open line's questions show at first, and how many each "Show N more" press adds. */
const DAY_PAGE_SIZE = 6;

/** The "Show N more" line at the end of an open line that still has questions to show. */
export type EarlierMore = {
  day: EarlierDay;
  /** How many questions the next press adds: a full page, or fewer if fewer are left. */
  add: number;
  /** The first question that press brings in, where the ring lands. */
  firstNewId: string;
  /** The last question shown now, which the line is drawn right under. */
  lastShownId: string;
};

/** One button in the row an open day carries when it mixes games. */
export type EarlierGameChoice = {
  /** `ALL_GAMES`, or the game line key ("game:hades", "game:" for No game). */
  key: string;
  /** "All", the game's name (cut to fit), or "No game". */
  name: string;
  /** How many of the day's questions it holds. */
  count: number;
  /** Whether it is the one lit: the questions under the row are its. */
  picked: boolean;
};

export type EarlierLayout = {
  /** Every line, oldest day (or first-asked game) first, so the newest is the one nearest the newest turn. */
  days: EarlierDay[];
  /** The questions drawn as rows, in the order they are drawn: the open lines' shown ones, then everything after the earlier ones. */
  shown: AskThreadCollapsedTurn[];
  /** The lines to draw directly in front of a shown question, by that question's id. */
  daysBefore: Map<string, EarlierDay[]>;
  /** Lines with no shown question after them: drawn after the last shown question. */
  trailingDays: EarlierDay[];
  /** The "Show N more" line of each open line that has more, by the id of the question it sits under. */
  moreAfter: Map<string, EarlierMore>;
  /** The game buttons of each open day that mixes games, by day key (grouped by day only). */
  gameChoices: Map<string, EarlierGameChoice[]>;
  /** The small tag a shown older question wears, by its id: its game under All, its day in the game list. */
  tags: Map<string, string>;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNDATED_KEY = "undated";
const UNDATED_LABEL = "Earlier";
const GAME_KEY_PREFIX = "game:";
const NO_GAME_KEY = GAME_KEY_PREFIX;
const NO_GAME_NAME = "No game";
/** The key of the All button: never a game line key, which always starts with "game:". */
export const ALL_GAMES = "all";
/** The longest game name a line, a button and a row's tag show before it is cut with "…". */
const LINE_NAME_MAX = 30;
const BUTTON_NAME_MAX = 18;
const TAG_NAME_MAX = 16;

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

/** The day a question was asked, as its line's key and name ("Earlier" when nothing says). */
function dayOfTurn(turn: AskThreadCollapsedTurn, now: Date): { key: string; label: string } {
  const ms = turnAskedAtMs(turn);
  if (ms === null) return { key: UNDATED_KEY, label: UNDATED_LABEL };
  const date = new Date(ms);
  return { key: dayKeyOf(date), label: labelFor(date, now) };
}

/** The game a question was asked about: a key that ignores case, and the name to show. */
function gameOfTurn(turn: AskThreadCollapsedTurn): { key: string; label: string } {
  const name = (turn.appName ?? "").trim();
  return { key: GAME_KEY_PREFIX + name.toLowerCase(), label: name || NO_GAME_NAME };
}

/**
 * A name longer than `max` cut to fit, ending in "…": at the last space when that keeps at least half of it
 * ("Deep Rock Galactic: Survivor" on a button reads "Deep Rock…", as the drawing shortened it by hand).
 */
function cutName(name: string, max: number): string {
  if (name.length <= max) return name;
  let cut = name.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  if (space >= max / 2) cut = cut.slice(0, space);
  return `${cut.replace(/[\s:;,-]+$/, "")}…`;
}

/** The text on a day or game line: its name and how many questions it holds. */
export function dayLineText(day: EarlierDay): string {
  return `${cutName(day.label, LINE_NAME_MAX)} · ${day.turns.length}`;
}

/** The words on a "Show N more" line. */
export function moreLineText(add: number): string {
  return `Show ${add} more`;
}

/** How many of a line's questions show once "Show N more" has been pressed `presses` times. */
function shownCountForDay(total: number, presses: number): number {
  return Math.min(total, DAY_PAGE_SIZE * (1 + Math.max(0, presses)));
}

/** Put each question under the line `lineOf` names, lines in the order their first question was asked. */
function groupBy(
  turns: AskThreadCollapsedTurn[],
  lineOf: (turn: AskThreadCollapsedTurn) => { key: string; label: string },
): EarlierDay[] {
  const days: EarlierDay[] = [];
  const byKey = new Map<string, EarlierDay>();
  turns.forEach((turn, index) => {
    const { key, label } = lineOf(turn);
    let day = byKey.get(key);
    if (!day) {
      day = { key, label, turns: [], firstIndex: index };
      byKey.set(key, day);
      days.push(day);
    }
    day.turns.push(turn);
  });
  return days;
}

/** Group the older questions by local day, oldest day first. */
export function groupEarlierTurnsByDay(
  turns: AskThreadCollapsedTurn[],
  now: Date = new Date()
): EarlierDay[] {
  return groupBy(turns, (turn) => dayOfTurn(turn, now));
}

/**
 * Group the older questions by game across every day: games in the order each was first asked, "No game"
 * last, each game's questions oldest first. The first spelling of a name seen is the one shown.
 */
export function groupEarlierTurnsByGame(turns: AskThreadCollapsedTurn[]): EarlierDay[] {
  const games = groupBy(turns, gameOfTurn);
  return [...games.filter((g) => g.key !== NO_GAME_KEY), ...games.filter((g) => g.key === NO_GAME_KEY)];
}

/** Whether the first `earlierCount` questions are about two or more games ("No game" counts as one): only then can the list be flipped. */
export function offersGameGrouping(turns: AskThreadCollapsedTurn[], earlierCount: number): boolean {
  return groupEarlierTurnsByGame(turns.slice(0, Math.max(0, earlierCount))).length >= 2;
}

/**
 * The game buttons an open day carries: All, then each game asked that day in the order first asked, then
 * "No game"; none when the day holds fewer than two games. `pickedKey` is the lit one; a key the day does
 * not hold (or none) lights All.
 */
export function gameChoicesOfDay(day: EarlierDay, pickedKey?: string): EarlierGameChoice[] {
  const games = groupEarlierTurnsByGame(day.turns);
  if (games.length < 2) return [];
  const pick = games.some((g) => g.key === pickedKey) ? pickedKey : ALL_GAMES;
  return [
    { key: ALL_GAMES, name: "All", count: day.turns.length, picked: pick === ALL_GAMES },
    ...games.map((g) => ({ key: g.key, name: cutName(g.label, BUTTON_NAME_MAX), count: g.turns.length, picked: g.key === pick })),
  ];
}

function groupsOf(turns: AskThreadCollapsedTurn[], grouping: EarlierGrouping, now: Date): EarlierDay[] {
  return grouping === "game" ? groupEarlierTurnsByGame(turns) : groupEarlierTurnsByDay(turns, now);
}

/**
 * Where an older question sits once "N earlier" is open: the key of the line that holds it (a day, or a game
 * line when `grouping` is "game"), and how many times that line's "Show N more" has to be pressed before the
 * question is among those shown. A day is counted with All lit, so the caller opens it with no game picked.
 * Null when the question is not among the first `earlierCount` turns (it is already on screen, or not in the
 * chat at all). Used by the jump from a Search match to put the chat on the question (useEarlierTurnsPill.ts).
 */
export function locateEarlierTurn(
  turns: AskThreadCollapsedTurn[],
  earlierCount: number,
  turnId: string,
  now: Date = new Date(),
  grouping: EarlierGrouping = "day",
): { dayKey: string; presses: number } | null {
  const day = groupsOf(turns.slice(0, earlierCount), grouping, now).find((d) => d.turns.some((t) => t.id === turnId));
  if (!day) return null;
  const at = day.turns.findIndex((t) => t.id === turnId);
  return { dayKey: day.key, presses: Math.floor(at / DAY_PAGE_SIZE) };
}

/**
 * What is on screen once "N earlier" is open: a line per day (or per game), the questions of the open
 * lines under their line, and the turns after the earlier ones (the newest question and what follows it).
 * The lines are walked in order, so a line's questions always sit right under it, whether or not they sit
 * together in the chat (a game's questions are spread over many days).
 */
export function layoutEarlierList(args: {
  turns: AskThreadCollapsedTurn[];
  earlierCount: number;
  grouping?: EarlierGrouping;
  openDays: ReadonlySet<string>;
  /** How many times "Show N more" has been pressed, by line key; a line not listed has had none. */
  morePresses?: ReadonlyMap<string, number>;
  /** The game button lit in each open day, by day key; a day not listed has All lit. */
  dayGames?: ReadonlyMap<string, string>;
  now?: Date;
}): EarlierLayout {
  const { turns, earlierCount, grouping = "day", openDays, morePresses, dayGames, now = new Date() } = args;
  const days = groupsOf(turns.slice(0, earlierCount), grouping, now);
  const shown: AskThreadCollapsedTurn[] = [];
  const daysBefore = new Map<string, EarlierDay[]>();
  const moreAfter = new Map<string, EarlierMore>();
  const gameChoices = new Map<string, EarlierGameChoice[]>();
  const tags = new Map<string, string>();
  let waiting: EarlierDay[] = [];
  const place = (turn: AskThreadCollapsedTurn, tag?: string) => {
    if (waiting.length) daysBefore.set(turn.id, waiting);
    waiting = [];
    shown.push(turn);
    if (tag) tags.set(turn.id, tag);
  };
  days.forEach((day) => {
    waiting.push(day);
    if (!openDays.has(day.key)) return;
    let list = day.turns;
    let tagOf: ((turn: AskThreadCollapsedTurn) => string) | null =
      grouping === "game" ? (turn) => dayOfTurn(turn, now).label : null;
    const choices = grouping === "day" ? gameChoicesOfDay(day, dayGames?.get(day.key)) : [];
    if (choices.length) {
      gameChoices.set(day.key, choices);
      const picked = choices.find((c) => c.picked)!;
      if (picked.key === ALL_GAMES) tagOf = (turn) => cutName(gameOfTurn(turn).label, TAG_NAME_MAX);
      else list = day.turns.filter((turn) => gameOfTurn(turn).key === picked.key);
    }
    const count = shownCountForDay(list.length, morePresses?.get(day.key) ?? 0);
    list.slice(0, count).forEach((turn) => place(turn, tagOf?.(turn)));
    if (count < list.length) {
      const lastShownId = list[count - 1]!.id;
      moreAfter.set(lastShownId, {
        day,
        add: Math.min(DAY_PAGE_SIZE, list.length - count),
        firstNewId: list[count]!.id,
        lastShownId,
      });
    }
  });
  turns.slice(earlierCount).forEach((turn) => place(turn));
  return { days, shown, daysBefore, trailingDays: waiting, moreAfter, gameChoices, tags };
}

/** `layoutEarlierList` grouped by day: what the list showed before it could be flipped. */
export function layoutEarlierByDay(args: {
  turns: AskThreadCollapsedTurn[];
  earlierCount: number;
  openDays: ReadonlySet<string>;
  morePresses?: ReadonlyMap<string, number>;
  now?: Date;
}): EarlierLayout {
  return layoutEarlierList({ ...args, grouping: "day" });
}
