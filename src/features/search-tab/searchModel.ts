/**
 * Title: The Search tab's rules
 *
 * Purpose: Everything the Search tab decides that is not drawing: which eight words get a button and what
 * count each shows (words of four letters or longer that are in the most questions, everyday words
 * skipped, "charms" counted with "charm"), which questions, notes, settings and game notes hold a picked
 * word, how a game narrows them, the day shown under a chat match, and how a game note is titled before
 * the person opens it (a note whose name does not hold their word may be a boss they never named, so it
 * wears a neutral title). The word rule is the mock-up board's `sWords` (docs/demos/mockup-board/src/
 * 49-search.js), kept the same so what was drawn is what is built.
 *
 * Used for: SearchTab.tsx and its parts, and the tab's tests.
 *
 * Solves: Keeps the rules in plain functions with no screen in them, so each can be tested by itself.
 *
 * Does not: Fetch anything, hold any state, or draw. The settings list and the intent-pack lookup are the
 * Main tab's old ones (utils/intentPackSearch.ts), only called from here now.
 */
import { SETTINGS_DATABASE } from "../../data/settingsDatabase";
import { searchSettingsWithIntentPacks, type IntentPackSearchIndex } from "../../utils/intentPackSearch";
import type { GameNote, GameNoteLabel, SearchChat, SearchQuestion, SearchWord, SettingMatch, UserNote } from "./searchTypes";

/** How many word buttons the tab draws: two rows of four. */
const SEARCH_WORD_BUTTONS = 8;

/** Words worth no button however often they come up: everyday words in questions to a helper. */
const SKIP_WORDS = new Set(
  (
    "what does where find beat quick tips please which best early with have there that this from before after " +
    "into your should about many make last longer good take takes much fight work works come back later first " +
    "more down remind while moving taking damage fastest under would could when they them then than were been " +
    "also just like some doing getting need needs want wants know tell help using used game games play playing " +
    "time thing things really still other every each very only even over most ever upon once here these those " +
    "will without within anything something everything whats dont cant"
  ).split(" "),
);

/**
 * The words worth a button: in the most questions, ignoring short and common ones. A word counts once
 * per question. "charms" is counted with "charm" when both are there. Ties go to the earlier word in the
 * alphabet, so the buttons do not shuffle between loads.
 */
export function searchWords(texts: readonly string[], limit: number = SEARCH_WORD_BUTTONS): SearchWord[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const seen = new Set<string>();
    for (const raw of text.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/)) {
      const word = raw.replace(/^'+|'+$/g, "");
      if (word.length < 4 || SKIP_WORDS.has(word) || seen.has(word)) continue;
      seen.add(word);
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  for (const word of [...counts.keys()]) {
    const singular = word.slice(0, -1);
    if (word.endsWith("s") && counts.has(singular)) {
      counts.set(singular, (counts.get(singular) ?? 0) + (counts.get(word) ?? 0));
      counts.delete(word);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

/** Every question of every chat, with its chat, in the chats' order and each chat's own order. */
export function flattenQuestions(chats: readonly SearchChat[]): SearchQuestion[] {
  return chats.flatMap((chat) =>
    chat.questions.map((q) => ({
      turnId: q.turn_id,
      slotId: chat.slot_id,
      chatLabel: chat.label,
      text: q.text,
      createdAt: q.created_at,
      appId: q.app_id,
      gameTitle: q.game_title,
    })),
  );
}

const sameGame = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The games the chats mention: the most asked about first, then by name. */
export function searchGames(questions: readonly SearchQuestion[]): string[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    const title = q.gameTitle.trim();
    if (title) counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([title]) => title);
}

/** The questions asked about `game`; null is All. */
export function narrowQuestions(questions: readonly SearchQuestion[], game: string | null): SearchQuestion[] {
  return game === null ? [...questions] : questions.filter((q) => sameGame(q.gameTitle, game));
}

/** The questions that hold `word`, in any case, anywhere in the line. */
export function matchQuestions(questions: readonly SearchQuestion[], word: string): SearchQuestion[] {
  const needle = word.trim().toLowerCase();
  return needle ? questions.filter((q) => q.text.toLowerCase().includes(needle)) : [];
}

/** The notes for `game` and the notes for every game; null is All. */
export function narrowNotes(notes: readonly UserNote[], game: string | null): UserNote[] {
  return game === null ? [...notes] : notes.filter((n) => n.game_title.trim() === "" || sameGame(n.game_title, game));
}

/** The notes whose words hold `word`, switched on or off. */
export function matchNotes(notes: readonly UserNote[], word: string): UserNote[] {
  const needle = word.trim().toLowerCase();
  return needle ? notes.filter((n) => n.text.toLowerCase().includes(needle)) : [];
}

/** A settings path split the way the old card drew it: the last part as the title, the rest under it. */
export function splitSetting(path: string): SettingMatch {
  const parts = path.split(">").map((part) => part.trim()).filter(Boolean);
  return {
    path,
    title: parts[parts.length - 1] ?? path,
    breadcrumb: parts.slice(0, -1).join(" > "),
    qam: path.startsWith("QAM >"),
  };
}

/** The Steam settings that hold `word`, by name or by an intent pack's other names (two letters at least). */
export function matchSettings(word: string, index: IntentPackSearchIndex | null | undefined): SettingMatch[] {
  return searchSettingsWithIntentPacks(word, SETTINGS_DATABASE, index).map(splitSetting);
}

/**
 * How a game note is drawn before A opens it. A note whose name holds the person's word shows its name and
 * a snippet. Any other may be a boss they never named, so it shows "A <kind> note · <game>" and no snippet:
 * "An" before a vowel sound ("An item note"), and a kind's underscore read as a space ("starting out").
 */
export function gameNoteLabel(note: GameNote): GameNoteLabel {
  if (note.name_matches) return { title: note.name, snippet: note.snippet, hidden: false };
  const game = note.game_title.trim() || "every game";
  const kind = note.kind.replace(/_/g, " ").trim() || "game";
  const article = /^[aeio]/i.test(kind) || /^u(?!ni|s|t)/i.test(kind) ? "An" : "A";
  return { title: `${article} ${kind} note · ${game}`, snippet: "", hidden: true };
}

/** `text` cut round every place `word` appears, in any case, so the word can be lit. */
export function highlightParts(text: string, word: string): Array<{ text: string; hit: boolean }> {
  const needle = word.trim().toLowerCase();
  if (!needle) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const parts: Array<{ text: string; hit: boolean }> = [];
  let at = 0;
  for (let found = lower.indexOf(needle); found >= 0; found = lower.indexOf(needle, at)) {
    if (found > at) parts.push({ text: text.slice(at, found), hit: false });
    parts.push({ text: text.slice(found, found + needle.length), hit: true });
    at = found + needle.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false });
  return parts.length > 0 ? parts : [{ text, hit: false }];
}

/** "5 matches for 'mantis'" (curly quotes), "1 match for ...", or "Nothing has ...". */
export function matchCountLine(count: number, word: string): string {
  if (count === 0) return `Nothing has “${word}”`;
  return `${count} ${count === 1 ? "match" : "matches"} for “${word}”`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The day a question was asked, under a chat match: Today, Yesterday, or "Mon 5 Oct". "" when unknown. */
export function dayLabel(createdAtSeconds: number, nowMs: number = Date.now()): string {
  if (!createdAtSeconds || createdAtSeconds <= 0) return "";
  const when = new Date(createdAtSeconds * 1000);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date(nowMs)) - startOf(when)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${WEEKDAYS[when.getDay()]} ${when.getDate()} ${MONTHS[when.getMonth()]}`;
}
