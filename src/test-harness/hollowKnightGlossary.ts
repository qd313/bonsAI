/**
 * Title: Hollow Knight glossary words for tests
 * Purpose: The five Hollow Knight words and the answer the maintainer saw on the Deck on 2026-10-25,
 * with eleven underlined words, for tests of "only the first mention is underlined".
 * Used for: the first-mention tests (chunk, sections, streaming).
 * Solves: One copy of the real answer, word for word, so the tests share the case that was reported.
 * Does not: Call the back end or check the library's real Hollow Knight file.
 */
import { setGlossaryTermsForTests, type DrgGlossaryTerm } from "../features/glossary/glossaryStore";

export const HK_APP_ID = "367520";

const word = (id: string, term: string, altForms: string[]): DrgGlossaryTerm => ({
  id,
  term,
  altForms,
  peek: `${term}, in short.`,
  full: `${term}, in full.`,
  gameTitle: "Hollow Knight",
});

const HK_TERMS: DrgGlossaryTerm[] = [
  word("mothwing-cloak", "Mothwing Cloak", []),
  word("charms", "charms", ["charm"]),
  word("notches", "notches", ["notch"]),
  word("bench", "bench", ["benches"]),
  word("geo", "Geo", []),
];

/** The reply as drawn on the Deck: eleven underlined words before the change, five after. */
export const HK_ANSWER =
  "The Mothwing Cloak is a short dash ability with a brief cooldown. It's a useful movement tool for " +
  "navigating areas. Charms are your build system; you start with three notches and can find eight more. " +
  "You can only swap charms while sitting on a bench. Each charm takes a set number of notches to equip. " +
  "You can spend Geo to get more notches, and you can force a charm in if you run out of notches.";

/** The words that should be underlined, in reading order, as they are spelled where they first appear. */
export const HK_FIRST_MENTIONS = ["Mothwing Cloak", "Charms", "notches", "bench", "Geo"];

export function primeHollowKnight(): void {
  setGlossaryTermsForTests(HK_APP_ID, HK_TERMS);
}
