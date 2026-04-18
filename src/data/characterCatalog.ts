/**
 * Character roleplay catalog — keep preset `id` values in sync with
 * `backend/services/ai_character_service.py` (`VALID_PRESET_IDS`).
 */
export type CharacterCatalogEntry = {
  id: string;
  /** Short display name in the picker. */
  label: string;
};

export type CharacterCatalogSection = {
  workTitle: string;
  entries: CharacterCatalogEntry[];
};

/**
 * Four-column picker (left → right). TF2 is split into two sections so column height stays near the others.
 * `CHARACTER_CATALOG_SECTIONS` is a flat concat for id lookup and parity tests.
 */
export const CHARACTER_PICKER_COLUMNS: readonly CharacterCatalogSection[][] = [
  [
    {
      workTitle: "Cyberpunk 2077",
      entries: [{ id: "cp2077_jackie", label: "Jackie Welles" }],
    },
    {
      workTitle: "Red Dead Redemption 2",
      entries: [
        { id: "rdr2_arthur", label: "Arthur" },
        { id: "rdr2_dutch", label: "Dutch" },
      ],
    },
    {
      workTitle: "The Legend of Zelda",
      entries: [
        { id: "zelda_zelda", label: "Princess Zelda" },
        { id: "zelda_navi", label: "Navi" },
      ],
    },
    {
      workTitle: "Portal",
      entries: [{ id: "portal_glados", label: "GLaDOS" }],
    },
    {
      workTitle: "Left 4 Dead 2",
      entries: [{ id: "l4d2_ellis", label: "Ellis" }],
    },
  ],
  [
    {
      workTitle: "Grand Theft Auto V",
      entries: [
        { id: "gta5_michael", label: "Michael" },
        { id: "gta5_trevor", label: "Trevor" },
        { id: "gta5_lamar", label: "Lamar" },
        { id: "gta5_lester", label: "Lester" },
      ],
    },
    {
      workTitle: "Metal Gear Solid",
      entries: [{ id: "mgs_otacon", label: "Otacon" }],
    },
    {
      workTitle: "Hades",
      entries: [{ id: "hades_zagreus", label: "Zagreus" }],
    },
    {
      workTitle: "Other",
      entries: [
        { id: "alig_ali_g", label: "Ali G" },
        { id: "sc_fuu", label: "Fuu" },
      ],
    },
  ],
  [
    {
      workTitle: "Baldur's Gate 3",
      entries: [
        { id: "bg3_shadowheart", label: "Shadowheart" },
        { id: "bg3_astarion", label: "Astarion" },
        { id: "bg3_laezel", label: "Lae'zel" },
      ],
    },
    {
      workTitle: "Team Fortress 2",
      entries: [
        { id: "tf2_scout", label: "Scout" },
        { id: "tf2_soldier", label: "Soldier" },
        { id: "tf2_pyro", label: "Pyro" },
        { id: "tf2_demoman", label: "Demoman" },
        { id: "tf2_heavy", label: "Heavy" },
      ],
    },
  ],
  [
    {
      workTitle: "Fallout 4",
      entries: [
        { id: "fo4_nick_valentine", label: "Nick Valentine" },
        { id: "fo4_piper", label: "Piper Wright" },
        { id: "fo4_preston", label: "Preston Garvey" },
      ],
    },
    {
      workTitle: "Team Fortress 2",
      entries: [
        { id: "tf2_engineer", label: "Engineer" },
        { id: "tf2_medic", label: "Medic" },
        { id: "tf2_sniper", label: "Sniper" },
        { id: "tf2_spy", label: "Spy" },
        { id: "tf2_announcer", label: "Announcer" },
      ],
    },
  ],
];

export const CHARACTER_CATALOG_SECTIONS: CharacterCatalogSection[] = CHARACTER_PICKER_COLUMNS.flat();

/** Number of catalog columns in the character picker (D-pad left/right wiring). */
export const CHARACTER_PICKER_COLUMN_COUNT = CHARACTER_PICKER_COLUMNS.length;

const _allEntries: CharacterCatalogEntry[] = CHARACTER_CATALOG_SECTIONS.flatMap((s) => s.entries);

export const ALL_PRESET_IDS: readonly string[] = _allEntries.map((e) => e.id);

const _presetIdSet = new Set(ALL_PRESET_IDS);

export function isValidPresetId(id: string): boolean {
  return _presetIdSet.has(id);
}

export function findCatalogEntry(
  id: string
): { workTitle: string; entry: CharacterCatalogEntry } | undefined {
  for (const section of CHARACTER_CATALOG_SECTIONS) {
    const entry = section.entries.find((e) => e.id === id);
    if (entry) return { workTitle: section.workTitle, entry };
  }
  return undefined;
}

export const AI_CHARACTER_CUSTOM_TEXT_MAX = 400;

/** One-line summary for the Settings row (not shown when feature is off). */
export function formatAiCharacterSelectionLine(opts: {
  random: boolean;
  presetId: string;
  customText: string;
}): string {
  if (opts.random) return "Random";
  const c = opts.customText.trim();
  if (c) return c.length > 44 ? `${c.slice(0, 42)}…` : c;
  const found = opts.presetId ? findCatalogEntry(opts.presetId) : undefined;
  if (found) return `${found.entry.label} — ${found.workTitle}`;
  return "Choose character…";
}

/** Which emoticon to show in the main input chrome. */
export function resolveMainTabAvatarPresetId(opts: {
  enabled: boolean;
  random: boolean;
  presetId: string;
  customText: string;
}): string | null {
  if (!opts.enabled) return null;
  if (opts.random) return "__random__";
  if (opts.customText.trim()) return "__custom__";
  if (opts.presetId && isValidPresetId(opts.presetId)) return opts.presetId;
  return "__custom__";
}

const _unicodeLetterRe = /\p{L}/u;

function firstUnicodeLetterUpper(s: string): string | null {
  const m = _unicodeLetterRe.exec(s);
  if (!m) return null;
  return m[0].toUpperCase();
}

/** Badge letter from a display label (e.g. catalog row: GLaDOS → G). */
export function resolveAvatarBadgeLetterFromDisplayLabel(label: string): string {
  return firstUnicodeLetterUpper(label) ?? "?";
}

/** Single-letter badge for the main-tab avatar (null when AI character chrome is off). */
export function resolveMainTabAvatarBadgeLetter(opts: {
  enabled: boolean;
  random: boolean;
  presetId: string;
  customText: string;
}): string | null {
  if (!opts.enabled) return null;
  if (opts.random) return "?";
  const trimmedCustom = opts.customText.trim();
  if (trimmedCustom) {
    return firstUnicodeLetterUpper(trimmedCustom) ?? "?";
  }
  if (opts.presetId && isValidPresetId(opts.presetId)) {
    const found = findCatalogEntry(opts.presetId);
    if (found) {
      return firstUnicodeLetterUpper(found.entry.label) ?? "?";
    }
  }
  return "?";
}
