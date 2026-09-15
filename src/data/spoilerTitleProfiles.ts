/**
 * Title: Which games get extra spoiler protection
 *
 * Purpose: When the AI's answer wraps something in a spoiler fence, the
 * screen normally hides it behind a tap-to-reveal. For some games that tap
 * is pointless — the AI's answers about, say, Deep Rock Galactic almost
 * never contain a real story spoiler, so hiding routine tips behind a tap
 * only adds friction. This file is the fixed list of which games fall into
 * each of two groups: "low narrative" games where a spoiler fence opens on
 * its own, and "protect progression" games (Baldur's Gate 3, Hades, and
 * other story-heavy titles) where it stays hidden until tapped, because
 * getting that judgment wrong the other way — showing a real story spoiler
 * by mistake — cannot be taken back. A game in neither list behaves the same
 * as "protect progression": it stays hidden until tapped.
 *
 * Used for: deciding, right before an answer is drawn on screen, whether a
 * spoiler fence in it should already be open.
 *
 * Solves: this decision needs to work for two different situations — a game
 * that is currently running, which has a Steam App ID, and a game named in
 * the question itself with no App ID to look up (an emulated game, for
 * instance) — so games are listed twice over, once by App ID and once by
 * name.
 *
 * Does not: decide anything about the AI's own answer, or about what counts
 * as a spoiler in the first place — the AI is told to wrap possible spoilers
 * as it writes, on the computer or Deck side
 * (`py_modules/backend/services/spoiler_title_profiles.py`, which keeps its
 * own copy of this same list). This file only decides, after the answer
 * already has its fences, whether one of them should start open or closed.
 *
 * Gotchas:
 *   - If a game's name happens to match an entry in both lists, "protect
 *     progression" wins. That is the conservative answer on purpose: an
 *     unnecessary tap can just be tapped, but a spoiler shown by mistake
 *     cannot be un-shown.
 */

export type SpoilerTitleProfile = "low_narrative" | "protect_progression" | "unknown";

/** Keep in sync with LOW_NARRATIVE_APP_IDS in spoiler_title_profiles.py */
export const LOW_NARRATIVE_APP_IDS = new Set([
  "2321470", // Deep Rock Galactic: Survivor
  "550", // Left 4 Dead 2
  "1222670", // The Sims 4
  "782330", // DOOM Eternal — named bosses, no reveal (2026-09-05 tranche, D69)
]);

/** Keep in sync with PROTECT_PROGRESSION_APP_IDS in spoiler_title_profiles.py */
export const PROTECT_PROGRESSION_APP_IDS = new Set([
  "1086940", // Baldur's Gate 3
  "377160", // Fallout 4
  "1145360", // Hades
  "1091500", // Cyberpunk 2077
  "1547000", // GTA: San Andreas DE
  "1174180", // Red Dead Redemption 2
  "220", // Half-Life 2
  "620", // Portal 2 — puzzles spoil nothing, the late reveal does; see the Python table
  // 2026-09-05 tranche (D69); reasons in the Python table. GTA V has two Steam builds.
  "362890", // Black Mesa
  "367520", // Hollow Knight
  "3240220", // Grand Theft Auto V Enhanced
  "271590", // Grand Theft Auto V Legacy
  "12210", // Grand Theft Auto IV: The Complete Edition
  "22380", // Fallout: New Vegas
]);

/**
 * Same two profiles, reachable by title name. Required by D19: a title recognised from the
 * question text has no AppID to look up. Keep in sync with _LOW_NARRATIVE_TITLES /
 * _PROTECT_PROGRESSION_TITLES in spoiler_title_profiles.py — tests/contracts/spoiler-title-profiles.json
 * asserts both languages against the same cases.
 */
const LOW_NARRATIVE_TITLES = [
  "state of emergency",
  "deep rock galactic",
  "left 4 dead 2",
  "the sims 4",
  // 2026-09-05 tranche (D69): emulated shortcuts have no AppID, so the name is the handle.
  "doom eternal",
  "doom 64",
  "super mario 64",
  "mario kart 64",
  "smash bros",
  "pikmin 2",
];

const PROTECT_PROGRESSION_TITLES = [
  "ocarina of time",
  "ship of harkinian",
  "baldur's gate 3",
  "baldurs gate 3",
  "fallout 4",
  "hades",
  "cyberpunk 2077",
  "san andreas",
  "red dead redemption 2",
  "half-life 2",
  "half life 2",
  "portal 2",
  // 2026-09-05 tranche (D69); "gta v" also catches Vice City, the right side to err on.
  "black mesa",
  "hollow knight",
  "grand theft auto v",
  "grand theft auto iv",
  "gta v",
  "gta iv",
  "gta 5",
  "gta 4",
  "paper mario",
  "thousand-year door",
  "new vegas",
];

function normalizeTitle(name: string): string {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveTitleSpoilerProfile(
  appId?: string | null,
  appName?: string
): SpoilerTitleProfile {
  const aid = String(appId || "").trim();
  if (aid && LOW_NARRATIVE_APP_IDS.has(aid)) return "low_narrative";
  if (aid && PROTECT_PROGRESSION_APP_IDS.has(aid)) return "protect_progression";
  const title = normalizeTitle(appName || "");
  if (!title) return "unknown";
  // Protect first: when a name matches both tables the conservative answer wins, because
  // over-fencing annoys and under-fencing cannot be taken back.
  if (PROTECT_PROGRESSION_TITLES.some((known) => title.includes(known))) {
    return "protect_progression";
  }
  if (LOW_NARRATIVE_TITLES.some((known) => title.includes(known))) return "low_narrative";
  return "unknown";
}

export function titleProfileIsLowNarrative(appId?: string | null, appName?: string): boolean {
  return resolveTitleSpoilerProfile(appId, appName) === "low_narrative";
}
