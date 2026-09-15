/**
 * Title: Suggesting an AI character based on the game you're playing
 *
 * Purpose: When the AI-character feature is on and a person opens the
 * character picker, this works out up to three characters from the
 * built-in catalog that fit whatever game is currently running — so
 * someone playing a game with catalog characters sees them offered first,
 * instead of having to search a long list by hand.
 *
 * Used for: The character picker popup, when it opens while a game is
 * running.
 *
 * Solves: Matches a running game to catalog characters three different
 * ways, from most to least exact: a curated list of specific games known
 * to have characters, a special case for Team Fortress 2 (which has many
 * catalog characters spread across several teams), and, failing both, a
 * looser match on the game's own name.
 *
 * Does not: Decide the full list of playable characters — see
 * characterCatalog for that. This only narrows it down to a short,
 * relevant suggestion strip for the game currently running.
 */
import {
  CHARACTER_CATALOG_SECTIONS,
  findCatalogEntry,
  type CharacterCatalogEntry,
} from "../data/characterCatalog";

const MAX_SUGGESTIONS = 3;

/** Resolved strip for the character picker when a running game maps to the catalog. */
export type RunningGameCharacterSuggestions = {
  /** Shown after “Playing:” — prefer Steam `display_name`. */
  headline: string;
  entries: CharacterCatalogEntry[];
};

/**
 * In: a game's display name, in whatever casing and punctuation Steam
 * gives it.
 * Out: a plain, lowercase version with accents removed and everything
 * that is not a letter or digit turned into a single space, so two
 * spellings of the same title can be compared safely.
 * Can go wrong: nothing — always produces a string, even an empty one.
 */
function normalizeGameTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Curated Steam AppID → catalog preset ids (must exist in `characterCatalog.ts`). */
const STEAM_APP_PRESET_IDS: Readonly<Record<string, readonly string[]>> = {
  "1091500": ["cp2077_jackie"],
  "1174180": ["rdr2_arthur", "rdr2_dutch"],
  "400": ["portal_glados"],
  "620": ["portal_glados"],
  "550": ["l4d2_ellis"],
  "271590": ["gta5_michael", "gta5_trevor", "gta5_lamar"],
  "1086940": ["bg3_shadowheart", "bg3_astarion", "bg3_laezel"],
  "377160": ["fo4_nick_valentine", "fo4_piper", "fo4_preston"],
  "1145360": ["hades_zagreus"],
  /** METAL GEAR SOLID: MASTER COLLECTION Vol.1 — Otacon is the catalog anchor for MGS1-era voice. */
  "2131630": ["mgs_otacon"],
};

/**
 * In: a list of catalog character ids, in preferred order.
 * Out: the matching catalog entries, in the same order, with duplicates
 * removed and capped at three.
 * Can go wrong: an id that no longer exists in the catalog is silently
 * skipped rather than producing a gap or an error.
 */
function entriesFromPresetIds(ids: readonly string[]): CharacterCatalogEntry[] {
  const out: CharacterCatalogEntry[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const found = findCatalogEntry(id);
    if (!found || seen.has(found.entry.id)) continue;
    seen.add(found.entry.id);
    out.push(found.entry);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/**
 * In: nothing — reads the whole catalog itself.
 * Out: up to three Team Fortress 2 characters from the catalog.
 * Can go wrong: nothing — an empty catalog section simply yields no
 * suggestions.
 *
 * Its own function because Team Fortress 2's characters are spread
 * across more than one catalog section (its classes are grouped
 * separately), so it needs to gather across all of them instead of
 * reading one section like the other matches below.
 */
function tf2MergedEntries(): CharacterCatalogEntry[] {
  const seen = new Set<string>();
  const out: CharacterCatalogEntry[] = [];
  for (const section of CHARACTER_CATALOG_SECTIONS) {
    if (section.workTitle !== "Team Fortress 2") continue;
    for (const e of section.entries) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
      if (out.length >= MAX_SUGGESTIONS) return out;
    }
  }
  return out;
}

/**
 * In: a catalog section's own game title, and the running game's name
 * (already cleaned up by normalizeGameTitle()).
 * Out: true if the two look like the same game.
 * Can go wrong: this is a loose match on purpose (one name containing
 * the other, or every meaningful word of one appearing in the other), so
 * a coincidental short name could in principle match something it
 * should not — no case of that has been found in the current catalog.
 */
function titleMatchesGame(workTitle: string, gameNorm: string): boolean {
  const w = normalizeGameTitle(workTitle);
  if (!w || !gameNorm) return false;
  if (gameNorm.includes(w) || w.includes(gameNorm)) return true;
  const words = w.split(" ").filter((x) => x.length > 2);
  if (words.length > 0 && words.every((t) => gameNorm.includes(t))) return true;
  return false;
}

/**
 * In: the running game's cleaned-up name.
 * Out: up to three catalog characters from every section whose game title
 * matches, or null if nothing matched at all.
 * Can go wrong: nothing beyond what titleMatchesGame() can — see its own
 * note above.
 */
function collectNameMatchEntries(gameNorm: string): CharacterCatalogEntry[] | null {
  const matchedSections = CHARACTER_CATALOG_SECTIONS.filter((s) => titleMatchesGame(s.workTitle, gameNorm));
  if (matchedSections.length === 0) return null;
  const seen = new Set<string>();
  const out: CharacterCatalogEntry[] = [];
  for (const s of matchedSections) {
    for (const e of s.entries) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
      if (out.length >= MAX_SUGGESTIONS) return out;
    }
  }
  return out.length > 0 ? out : null;
}

/**
 * In: the game's display name from Steam (if any), its app id, and a
 * fallback title (the catalog's own name for the matched game).
 * Out: the one line of text shown after "Playing:" above the suggestion
 * strip — Steam's own name if there is one (cut short if it runs long),
 * else the catalog's title, else the raw app id, else a generic label.
 * Can go wrong: nothing — always returns a usable string.
 */
function resolveHeadline(displayName: string | undefined, appId: string, fallbackWorkTitle?: string): string {
  const d = displayName?.trim();
  if (d) return d.length > 48 ? `${d.slice(0, 46)}…` : d;
  if (fallbackWorkTitle?.trim()) return fallbackWorkTitle.trim();
  if (appId) return `App ${appId}`;
  return "Current game";
}

/**
 * In: the running game's Steam app id and its display name — either can
 * be missing.
 * Out: a headline and one to three catalog characters, or null if there
 * is no game context to work from or nothing in the catalog matches it.
 * Can go wrong: nothing throws; every branch below falls through to null
 * rather than guessing. The three ways to match are tried in a fixed
 * order — Team Fortress 2's special case, then the curated app-id list,
 * then a looser name match — and the first one that finds something
 * wins, even if a later one might have found something too.
 */
export function resolveRunningGameCharacterSuggestions(
  appId: string | undefined,
  displayName: string | undefined
): RunningGameCharacterSuggestions | null {
  const aid = (appId ?? "").trim();
  const nameRaw = (displayName ?? "").trim();
  const gameNorm = normalizeGameTitle(nameRaw);

  if (!aid && !gameNorm) return null;

  if (aid === "440") {
    const entries = tf2MergedEntries();
    if (entries.length === 0) return null;
    return {
      headline: resolveHeadline(displayName, aid, "Team Fortress 2"),
      entries,
    };
  }

  const steamIds = aid ? STEAM_APP_PRESET_IDS[aid] : undefined;
  if (steamIds && steamIds.length > 0) {
    const entries = entriesFromPresetIds(steamIds);
    if (entries.length === 0) return null;
    const first = findCatalogEntry(entries[0].id);
    return {
      headline: resolveHeadline(displayName, aid, first?.workTitle),
      entries,
    };
  }

  if (gameNorm) {
    const byName = collectNameMatchEntries(gameNorm);
    if (byName && byName.length > 0) {
      const first = findCatalogEntry(byName[0].id);
      return {
        headline: resolveHeadline(displayName, aid, first?.workTitle),
        entries: byName,
      };
    }
  }

  return null;
}
