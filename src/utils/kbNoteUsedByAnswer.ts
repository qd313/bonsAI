/**
 * Title: Did this answer use that note?
 *
 * Purpose: For each knowledge-base note the search attached to a turn, decide whether the answer
 * actually said something from it, so the gold "From the notes" block under an answer shows only
 * then. The maintainer's rule (2026-09-24): the block shows up when the answer has just stated
 * something from those notes, not every time a note was attached.
 *
 * Used for: buildKbNotesBlockElement.tsx's `kbNotesToShow`, for the live turn and every archived
 * one. The Show details panel still lists every note that was attached, used or not.
 *
 * Solves: The search attaches a note to nearly every Strategy question (three of them, usually),
 * whether or not the answer ends up using it. Measured on the maintainer's own saved chats,
 * 2026-09-24: 49 answers had notes attached and the block showed all 144 of those notes, including
 * Strider and Ravenholm notes under a question about taming a horse and Sandtraps notes under a
 * crash report. With this check, 52 of the 144 show.
 *
 * Does not: Understand meaning. It counts words: a note counts as used when the answer repeats
 * enough of the words that belong to that note alone, or names the note's subject when the
 * question did not. A paraphrase that shares no words is missed on purpose -- the block staying
 * away from an answer it may have informed costs less than the block sitting under an answer it
 * did not, which is the bug this fixes.
 *
 * How it works:
 * 1. Words are lowercase letters and digits, four letters or longer, with a trailing plural "s"
 *    folded away ("antlions" and "antlion" are one word), minus everyday English words and words
 *    that turn up in advice about any game ("damage", "enemies", "time").
 * 2. A note's own words are the words of its text and its name, minus any word in the question
 *    (repeating the question proves nothing) and minus any word another attached note also has
 *    (two notes about antlions both say "antlion"; only what sets one apart can show it was used).
 * 3. Each of those words the answer also has scores 1, or 2 when it is eight letters or longer --
 *    long words are the specific ones ("vibration", "survivability", "sawblades"). Three points
 *    and the note counts as used.
 * 4. A game note whose name the answer says, when the question did not, also counts: that is the
 *    answer naming the boss the question only described ("the boss past the crystal spike area"
 *    answered with "Broken Vessel"). Shared troubleshooting tips are named by a bare topic word
 *    ("crash", "proton"), so their names never count this way.
 * 5. The footer lines the back end adds under an answer ("No close match in my notes, ...") are
 *    cut off before counting, so their own words cannot match a note.
 */
import type { KbAttachedNote } from "./inputTransparency";

const EVERYDAY_WORDS = `a about above after again against all almost also although always among an and another
any anyone anything are around as at away back be because been before being below best better
between both but by can cannot could did do does doing done down during each either else enough
even ever every few first for from further get gets getting give go goes going good got great had
has have having he her here hers him his how however i if in into is it its itself just keep know
last least less let like little long look lot lots make makes making many may maybe me might more
most much must my need needs never new next no not now of off often on once one only or other
others our out over own part people perhaps pretty quite rather really right said same say see
seem should since so some something sometimes still such sure take than that the their them then
there these they thing things think this those though through to too try trying two under until
up upon us use used using very want was way ways we well were what whatever when where whether
which while who whole why will with within without would yes yet you your yours yourself`;

/** Words that turn up in advice about any game, so sharing them says nothing about one note. */
const GAME_ADVICE_WORDS = `come early path piece real step answer area attack attacks away back boss bosses
break chance close damage distance easy end enemies enemy fast fight fights fighting fire focus
free full game games hard health help hit hits hold kill learn level levels lose main mode move
moves moving nothing open play player point points power quick quickly room run runs safe side
slow space spot start started starting stay time times turn work world`;

/** Score a note needs before it counts as used (see "How it works", step 3). */
const USED_SCORE = 3;
/** A shared word this long or longer scores 2 instead of 1. */
const LONG_WORD_LETTERS = 8;

const WORD_RE = /[a-z0-9][a-z0-9'-]*[a-z0-9]|[a-z0-9]/g;
/** The back end's answer footers all start with a line holding only a dash (kb_not_in_notes_notice.py). */
const FOOTER_RULE_RE = /\n\s*—\s*\n/;

function foldPlural(word: string): string {
  return word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

const IGNORED = new Set(
  `${EVERYDAY_WORDS} ${GAME_ADVICE_WORDS}`.split(/\s+/).filter(Boolean).map(foldPlural)
);

/** The words step 1 of "How it works" keeps from a piece of text. */
export function countedWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().match(WORD_RE) ?? []) {
    const word = foldPlural(raw);
    if (word.length >= 4 && !IGNORED.has(word)) out.add(word);
  }
  return out;
}

/** The answer without the footer lines the back end adds under it. */
function answerBody(answer: string): string {
  return answer.split(FOOTER_RULE_RE)[0] ?? "";
}

/** Plural-folded words joined by single spaces, so a name can be found as a whole phrase. */
function foldedPhrase(text: string): string {
  return (text.toLowerCase().match(WORD_RE) ?? []).map(foldPlural).join(" ");
}

function saysName(note: KbAttachedNote, text: string): boolean {
  const name = foldedPhrase(note.name.replace(/\([^)]*\)/g, " "));
  if (!name) return false;
  return ` ${foldedPhrase(text)} `.includes(` ${name} `);
}

/**
 * In: the notes attached to one turn, that turn's answer (or as much of it as has arrived), and
 * its question.
 * Out: the notes the answer used, in their original order. Empty when there is no answer yet.
 */
export function kbNotesUsedByAnswer(
  notes: KbAttachedNote[],
  answer: string | null | undefined,
  question: string | null | undefined
): KbAttachedNote[] {
  const body = answerBody(answer ?? "");
  if (!notes.length || !body.trim()) return [];
  const questionText = question ?? "";
  const questionWords = countedWords(questionText);
  const answerWords = countedWords(body);
  const noteWords = notes.map((note) => countedWords(`${note.card ?? ""} ${note.name ?? ""}`));
  return notes.filter((note, i) => {
    if (note.domain !== "compat" && saysName(note, body) && !saysName(note, questionText)) return true;
    let score = 0;
    for (const word of noteWords[i]!) {
      if (questionWords.has(word) || !answerWords.has(word)) continue;
      if (noteWords.some((other, j) => j !== i && other.has(word))) continue;
      score += word.length >= LONG_WORD_LETTERS ? 2 : 1;
      if (score >= USED_SCORE) return true;
    }
    return false;
  });
}
