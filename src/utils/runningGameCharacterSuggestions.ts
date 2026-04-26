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

function titleMatchesGame(workTitle: string, gameNorm: string): boolean {
  const w = normalizeGameTitle(workTitle);
  if (!w || !gameNorm) return false;
  if (gameNorm.includes(w) || w.includes(gameNorm)) return true;
  const words = w.split(" ").filter((x) => x.length > 2);
  if (words.length > 0 && words.every((t) => gameNorm.includes(t))) return true;
  return false;
}

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

function resolveHeadline(displayName: string | undefined, appId: string, fallbackWorkTitle?: string): string {
  const d = displayName?.trim();
  if (d) return d.length > 48 ? `${d.slice(0, 46)}…` : d;
  if (fallbackWorkTitle?.trim()) return fallbackWorkTitle.trim();
  if (appId) return `App ${appId}`;
  return "Current game";
}

/**
 * Map Steam’s running app to 1–3 catalog characters for the picker strip.
 * Returns `null` when no game context or no catalog match.
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
