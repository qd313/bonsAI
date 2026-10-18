/**
 * Title: The two magic phrases that turn text clean-up off and on
 *
 * Purpose: Before a question is sent to the AI, the plugin quietly cleans it
 * up — this is on by default and most people never notice it happening.
 * Typing the exact phrase "bonsai:disable-sanitize" into the Ask box turns
 * that clean-up off; typing "bonsai:enable-sanitize" turns it back on.
 * Neither phrase is sent to the AI as a real question — the plugin
 * recognises them and acts on them instead. This file is the two exact
 * phrases, spelled the one way they are recognised. Documented in the
 * README as an advanced, not-recommended option — most people never need
 * either phrase.
 *
 * Used for: the code that reads what was typed into the Ask box and checks
 * it against these two phrases before deciding whether to send it to the AI
 * at all.
 *
 * Solves: the phrase has to be spelled exactly the same way here, in the
 * README (the only place a person can learn about it), and on the computer
 * or Deck side that actually turns the clean-up off. This is the one place
 * the two phrases are written down for this side.
 *
 * Does not: turn the clean-up off or on by itself, or do any cleaning.
 * Recognising the phrase and acting on it happens elsewhere; this file only
 * holds the two exact strings to match against.
 */
export const INPUT_SANITIZER_COMMAND_DISABLE = "bonsai:disable-sanitize";
export const INPUT_SANITIZER_COMMAND_ENABLE = "bonsai:enable-sanitize";
