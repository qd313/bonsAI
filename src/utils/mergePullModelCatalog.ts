import type {
  PullModelEntry,
  PullModelGroup,
  PullModelLicenseClass,
  PullModelUseTag,
} from "../data/pullModelCatalog";

export type PullModelCatalogSource = "bundled" | "cached" | "live";

export type PullModelCatalogOverlay = {
  schema_version?: number;
  updated_at?: string;
  entries?: PullModelEntry[];
  removed_tags?: string[];
  overrides?: Record<string, Partial<PullModelEntry>>;
};

export type FetchPullModelCatalogResponse = {
  source?: PullModelCatalogSource;
  error?: string;
  updated_at?: string | null;
  fetched_at?: number | null;
  entries?: PullModelEntry[];
  removed_tags?: string[];
  overrides?: Record<string, Partial<PullModelEntry>>;
};

const VALID_GROUPS = new Set<PullModelGroup>(["essentials", "smallest", "stretch", "specialist"]);
const VALID_LICENSE = new Set<PullModelLicenseClass>(["foss", "open_weight", "non_foss", "unknown"]);
const VALID_USE_TAGS = new Set<PullModelUseTag>(["chat", "vision", "ocr", "strategy", "coding"]);
const TAG_RE = /^[a-z0-9][a-z0-9._-]{0,63}(:[a-z0-9._-]{1,32})?$/;
const RELEASED_YM_RE = /^\d{4}-\d{2}$/;

function normalizeOverlayPayload(
  overlay: FetchPullModelCatalogResponse | PullModelCatalogOverlay | null | undefined
): PullModelCatalogOverlay {
  if (!overlay || typeof overlay !== "object") {
    return { entries: [], removed_tags: [], overrides: {} };
  }
  return {
    entries: Array.isArray(overlay.entries) ? overlay.entries : [],
    removed_tags: Array.isArray(overlay.removed_tags) ? overlay.removed_tags : [],
    overrides:
      overlay.overrides && typeof overlay.overrides === "object" && !Array.isArray(overlay.overrides)
        ? overlay.overrides
        : {},
  };
}

function isValidEntry(entry: unknown): entry is PullModelEntry {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as PullModelEntry;
  if (typeof e.tag !== "string" || !TAG_RE.test(e.tag.trim())) return false;
  if (typeof e.params !== "string" || !e.params.trim()) return false;
  if (typeof e.sizeGb !== "number" || !(e.sizeGb > 0)) return false;
  if (typeof e.releasedYm !== "string" || !RELEASED_YM_RE.test(e.releasedYm.trim())) return false;
  if (typeof e.license !== "string") return false;
  if (!VALID_LICENSE.has(e.licenseClass)) return false;
  if (!VALID_GROUPS.has(e.group)) return false;
  if (!Array.isArray(e.tags) || !e.tags.length || !e.tags.every((t) => VALID_USE_TAGS.has(t))) return false;
  const rating = Math.round(Number(e.rating));
  if (rating < 1 || rating > 6) return false;
  if (typeof e.blurb !== "string" || !e.blurb.trim()) return false;
  return true;
}

function sanitizeEntry(entry: PullModelEntry): PullModelEntry {
  const rating = Math.max(1, Math.min(6, Math.round(Number(entry.rating)))) as PullModelEntry["rating"];
  return {
    ...entry,
    tag: entry.tag.trim(),
    params: entry.params.trim(),
    releasedYm: entry.releasedYm.trim(),
    license: entry.license.trim(),
    blurb: entry.blurb.trim(),
    rating,
    tags: [...entry.tags],
  };
}

/** Merge bundled catalog with remote overlay delta (entries, removals, partial overrides). */
export function mergePullModelCatalog(
  bundled: readonly PullModelEntry[],
  overlay: FetchPullModelCatalogResponse | PullModelCatalogOverlay | null | undefined
): PullModelEntry[] {
  const { entries, removed_tags, overrides } = normalizeOverlayPayload(overlay);
  const removed = new Set((removed_tags ?? []).map((t) => t.trim()).filter(Boolean));
  const byTag = new Map<string, PullModelEntry>();

  for (const entry of bundled) {
    if (!removed.has(entry.tag)) byTag.set(entry.tag, { ...entry, tags: [...entry.tags] });
  }

  for (const raw of entries ?? []) {
    if (!isValidEntry(raw) || removed.has(raw.tag)) continue;
    byTag.set(raw.tag, sanitizeEntry(raw));
  }

  for (const [tag, patch] of Object.entries(overrides ?? {})) {
    if (!tag.trim() || removed.has(tag) || !patch || typeof patch !== "object") continue;
    const existing = byTag.get(tag);
    if (!existing) continue;
    const merged = { ...existing, ...patch, tag: existing.tag, tags: patch.tags ? [...patch.tags] : existing.tags };
    if (!isValidEntry(merged)) continue;
    byTag.set(tag, sanitizeEntry(merged));
  }

  const bundledOrder = bundled.map((e) => e.tag);
  const out: PullModelEntry[] = [];
  const seen = new Set<string>();
  for (const tag of bundledOrder) {
    const entry = byTag.get(tag);
    if (entry) {
      out.push(entry);
      seen.add(tag);
    }
  }
  for (const [tag, entry] of byTag) {
    if (!seen.has(tag)) out.push(entry);
  }
  return out;
}

export function getCatalogTags(catalog: readonly PullModelEntry[]): string[] {
  return catalog.map((e) => e.tag);
}

export function isCatalogModelTagInList(catalog: readonly PullModelEntry[], tag: string): boolean {
  return catalog.some((e) => e.tag === tag);
}
