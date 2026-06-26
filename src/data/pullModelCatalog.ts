/** Curated Ollama models for the Pull Models fullscreen picker (bundled offline fallback sizes).
 *  Living recommendations: see data/pull-model-catalog-overlay.json (merged at runtime). */

export type PullModelLicenseClass = "foss" | "open_weight" | "non_foss" | "unknown";

export type PullModelUseTag = "chat" | "vision" | "ocr" | "strategy" | "coding";

export type PullModelGroup = "essentials" | "smallest" | "stretch" | "specialist";

export interface PullModelEntry {
  tag: string;
  params: string;
  sizeGb: number;
  /** Public model-family release month (YYYY-MM), not Ollama tag publish date. */
  releasedYm: string;
  license: string;
  licenseClass: PullModelLicenseClass;
  group: PullModelGroup;
  tags: ReadonlyArray<PullModelUseTag>;
  rating: 1 | 2 | 3 | 4 | 5 | 6;
  blurb: string;
}

export const PULL_MODEL_GROUP_LABELS: Record<PullModelGroup, string> = {
  essentials: "Deck essentials",
  smallest: "More models",
  stretch: "Expert (large)",
  specialist: "Specialist",
};

export const PULL_MODEL_GROUP_ORDER: readonly PullModelGroup[] = [
  "essentials",
  "smallest",
  "stretch",
  "specialist",
];

export const PULL_MODEL_FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "speed", label: "Speed" },
  { id: "strategy", label: "Strategy" },
  { id: "expert", label: "Expert" },
  { id: "vision", label: "Vision" },
  { id: "coding", label: "Coding" },
] as const;

export type PullModelFilterId = (typeof PULL_MODEL_FILTER_OPTIONS)[number]["id"];

/** Pull models table header — curated 1–6 ★ score for quality/fit on Steam Deck. */
export const PULL_MODEL_RATING_COLUMN_LABEL = "Deck fit";

/** Daily-driver picks — stretch (Expert large) models may run but are slow on Deck CPU/RAM. */
export function isDeckDailyPullModel(entry: PullModelEntry): boolean {
  return entry.group !== "stretch";
}

/** One-pull Deck presets shown by default in Browse models. */
export function isDeckEssentialsPullModel(entry: PullModelEntry): boolean {
  return entry.group === "essentials";
}

export const PULL_MODEL_CATALOG: readonly PullModelEntry[] = [
  {
    tag: "qwen2.5vl:3b",
    params: "3B",
    sizeGb: 3.2,
    releasedYm: "2025-01",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "essentials",
    tags: ["chat", "vision", "ocr", "strategy"],
    rating: 6,
    blurb: "Tier 1 default — one FOSS pull for chat, screenshots, OCR, and Strategy mode.",
  },
  {
    tag: "qwen3.5:4b",
    params: "4B",
    sizeGb: 3.4,
    releasedYm: "2026-02",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "essentials",
    tags: ["chat", "vision", "ocr", "strategy"],
    rating: 6,
    blurb:
      "FOSS native multimodal — vision fallback after qwen2.5vl; open-source-tier alternative to gemma4:e2b.",
  },
  {
    tag: "gemma4:e2b-it-qat",
    params: "E2B",
    sizeGb: 4.3,
    releasedYm: "2026-04",
    license: "Apache 2.0 (Gemma)",
    licenseClass: "open_weight",
    group: "essentials",
    tags: ["chat", "vision", "ocr", "strategy"],
    rating: 6,
    blurb: "Tier 2 one-model multimodal — Gemma 4 edge QAT; requires open-weight policy tier.",
  },
  {
    tag: "qwen3:4b",
    params: "4B",
    sizeGb: 2.5,
    releasedYm: "2025-04",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "smallest",
    tags: ["strategy", "chat"],
    rating: 5,
    blurb: 'Optional strategy specialist; optional "thinking" mode.',
  },
  {
    tag: "qwen2.5:7b",
    params: "7B",
    sizeGb: 4.7,
    releasedYm: "2024-09",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "smallest",
    tags: ["chat", "strategy"],
    rating: 5,
    blurb: "Stronger FOSS text when essentials feel too small.",
  },
  {
    tag: "llava:7b",
    params: "7B",
    sizeGb: 4.7,
    releasedYm: "2024-01",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "smallest",
    tags: ["vision", "ocr"],
    rating: 4,
    blurb: "Legacy vision fallback — pinned tag avoids ambiguous `llava:latest` pulls.",
  },
  {
    tag: "gemma4:latest",
    params: "E4B",
    sizeGb: 9.6,
    releasedYm: "2026-04",
    license: "Apache 2.0 (Gemma)",
    licenseClass: "open_weight",
    group: "smallest",
    tags: ["chat", "vision"],
    rating: 4,
    blurb: "Same as gemma4:e4b on Ollama — heavier than e2b-it-qat; Tier 2 only.",
  },
  {
    tag: "gemma3:4b",
    params: "4B",
    sizeGb: 3.3,
    releasedYm: "2025-03",
    license: "Gemma Terms",
    licenseClass: "open_weight",
    group: "smallest",
    tags: ["chat", "vision"],
    rating: 4,
    blurb: "Older Gemma multimodal — superseded by Gemma 4 edge tags.",
  },
  {
    tag: "qwen3:1.7b",
    params: "1.7B",
    sizeGb: 1.4,
    releasedYm: "2025-04",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "smallest",
    tags: ["strategy", "chat"],
    rating: 5,
    blurb: "Punchy reasoning at 1B-class speed; great fallback if 4b feels slow.",
  },
  {
    tag: "gemma3:1b",
    params: "1B",
    sizeGb: 0.8,
    releasedYm: "2025-03",
    license: "Gemma Terms",
    licenseClass: "open_weight",
    group: "smallest",
    tags: ["chat"],
    rating: 4,
    blurb: "Smallest serious chat; text-only.",
  },
  {
    tag: "qwen2.5:3b",
    params: "3B",
    sizeGb: 1.9,
    releasedYm: "2024-09",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "smallest",
    tags: ["chat"],
    rating: 5,
    blurb: "Fast FOSS text-only fallback if you skip the essentials VLM.",
  },
  {
    tag: "qwen2.5:1.5b",
    params: "1.5B",
    sizeGb: 1.0,
    releasedYm: "2024-09",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "smallest",
    tags: ["chat"],
    rating: 3,
    blurb: "Ultra-light text; deprioritized in Ask chains.",
  },
  {
    tag: "llama3.2:3b",
    params: "3B",
    sizeGb: 2.0,
    releasedYm: "2024-09",
    license: "Llama 3.2",
    licenseClass: "open_weight",
    group: "smallest",
    tags: ["chat"],
    rating: 5,
    blurb: "Default fast generic chat; standard baseline at 2 GB.",
  },
  {
    tag: "llama3.2:1b",
    params: "1B",
    sizeGb: 1.3,
    releasedYm: "2024-09",
    license: "Llama 3.2",
    licenseClass: "open_weight",
    group: "smallest",
    tags: ["chat"],
    rating: 5,
    blurb: "Ultra-fast tiny chat; instant, weaker on multi-step reasoning.",
  },
  {
    tag: "moondream",
    params: "1.8B",
    sizeGb: 1.7,
    releasedYm: "2024-03",
    license: "Apache 2.0",
    licenseClass: "unknown",
    group: "smallest",
    tags: ["vision", "ocr"],
    rating: 4,
    blurb: "Tiniest practical vision model; great companion to a chat model.",
  },
  {
    tag: "qwen2.5:14b",
    params: "14B",
    sizeGb: 9.0,
    releasedYm: "2024-09",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "stretch",
    tags: ["strategy", "chat"],
    rating: 4,
    blurb: "Strongest FOSS text that may fit 16 GB — slower on Deck CPU.",
  },
  {
    tag: "minicpm-v:8b",
    params: "8B",
    sizeGb: 5.5,
    releasedYm: "2024-08",
    license: "MiniCPM",
    licenseClass: "unknown",
    group: "stretch",
    tags: ["vision", "ocr"],
    rating: 4,
    blurb: "Heavy-duty OCR of menus/UI strings; tight on Deck RAM but one-shot OK.",
  },
  {
    tag: "llama3.2-vision:11b",
    params: "11B",
    sizeGb: 7.8,
    releasedYm: "2024-09",
    license: "Llama 3.2",
    licenseClass: "open_weight",
    group: "stretch",
    tags: ["vision", "ocr"],
    rating: 3,
    blurb: "High-quality screenshot reasoning when latency doesn't matter.",
  },
  {
    tag: "deepseek-r1:1.5b",
    params: "1.5B",
    sizeGb: 1.1,
    releasedYm: "2025-01",
    license: "MIT",
    licenseClass: "open_weight",
    group: "specialist",
    tags: ["strategy"],
    rating: 4,
    blurb: "Cheap reasoning specialist for math/logic; verbose CoT slow on CPU.",
  },
  {
    tag: "llava-phi3",
    params: "3.8B",
    sizeGb: 2.9,
    releasedYm: "2024-04",
    license: "MIT",
    licenseClass: "foss",
    group: "specialist",
    tags: ["vision"],
    rating: 4,
    blurb: "Compact MIT-licensed vision alternative.",
  },
  {
    tag: "qwen2.5-coder:3b",
    params: "3B",
    sizeGb: 1.9,
    releasedYm: "2024-11",
    license: "Qwen Research",
    licenseClass: "foss",
    group: "specialist",
    tags: ["coding"],
    rating: 3,
    blurb: "Coding/tool-use bonus; low priority for a gamer unless scripting.",
  },
] as const;

export const PULL_MODEL_CATALOG_TAGS: readonly string[] = PULL_MODEL_CATALOG.map((e) => e.tag);

const catalogTagSet = new Set<string>(PULL_MODEL_CATALOG_TAGS);

export function isCatalogModelTag(tag: string): boolean {
  return catalogTagSet.has(tag);
}

/** Sort catalog entries newest-first within a group. */
export function comparePullModelEntriesNewestFirst(a: PullModelEntry, b: PullModelEntry): number {
  const byDate = b.releasedYm.localeCompare(a.releasedYm);
  if (byDate !== 0) return byDate;
  return a.tag.localeCompare(b.tag);
}

/** Format YYYY-MM as "Mon YYYY" for the table. */
export function formatReleasedYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m[2], 10) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${months[idx]} ${m[1]}`;
}

/** Compact table date — e.g. May '25 — saves horizontal space in Pull models. */
export function formatReleasedYmShort(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m[2], 10) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${months[idx]} '${m[1].slice(2)}`;
}

export function formatSizeGb(gb: number): string {
  if (gb < 0.1) return "< 0.1 GB";
  return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
}

export function formatGtaStars(rating: number): string {
  const n = Math.max(1, Math.min(6, Math.round(rating)));
  return "★".repeat(n);
}

export function formatPullModelTags(tags: ReadonlyArray<PullModelUseTag>): string {
  return tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" · ");
}

export function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}
