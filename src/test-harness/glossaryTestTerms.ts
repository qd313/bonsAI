/**
 * Title: Test glossary words
 * Purpose: The two Deep Rock Galactic: Survivor words ("kiting", "overclock") as the screen gets them
 * from the knowledge library, for tests that need a game with glossary words.
 * Used for: the glossary matcher, chip, "Explain further" and reply-renderer tests.
 * Solves: The words used to be built into the plugin; now they only exist in the library, so a test
 * brings its own copy (same text as data/kb/glossary_terms.json) and fills the store with it.
 * Does not: Call the back end, or check the library's real file (a Python test pins that).
 */
import { resetGlossaryStore, setGlossaryTermsForTests, type DrgGlossaryTerm } from "../utils/glossaryStore";

export const TEST_GLOSSARY_APP_ID = "2321470";
const TEST_GLOSSARY_GAME_TITLE = "Deep Rock Galactic: Survivor";

export const TEST_GLOSSARY_TERMS: DrgGlossaryTerm[] = [
  {
    id: "kiting",
    term: "kiting",
    altForms: ["kite", "kited", "kites"],
    peek: "Backing away while you keep shooting.",
    full:
      "Kiting means backing away from an enemy while you keep shooting it, using your movement " +
      "speed to stay just out of melee range instead of tanking hits. It buys survival time, but a " +
      "run spent only kiting mines nothing — kite between waves, not instead of mining.",
    gameTitle: TEST_GLOSSARY_GAME_TITLE,
  },
  {
    id: "overclock",
    term: "overclock",
    altForms: ["overclocks", "overclocked"],
    peek: "A weapon mod that changes what it does, not just its numbers.",
    full:
      "An overclock is a weapon mod that changes what a weapon is for rather than simply making it " +
      "bigger — read what it removes as well as what it adds before slotting one. Save your best " +
      "overclock, or a nuke, for an armor-break window on a boss like the Dreadnought.",
    gameTitle: TEST_GLOSSARY_GAME_TITLE,
  },
];

/** Make the store hold `terms` for `appId`, as if the back end had just answered. */
export function primeGlossary(appId: string = TEST_GLOSSARY_APP_ID, terms: readonly DrgGlossaryTerm[] = TEST_GLOSSARY_TERMS): void {
  setGlossaryTermsForTests(appId, terms);
}

/** Empty the store; call between tests. */
export function clearGlossary(): void {
  resetGlossaryStore();
}
