/** Curated Ollama models for the Pull Models fullscreen picker (bundled offline fallback sizes). */

export type PullModelLicenseClass = "foss" | "open_weight" | "non_foss" | "unknown";

export type PullModelUseTag = "chat" | "vision" | "ocr" | "strategy" | "coding";

export type PullModelGroup = "featured" | "smallest" | "stretch" | "specialist";

export interface PullModelEntry {
  tag: string;
  params: string;
  sizeGb: number;
  releasedYm: string;
  license: string;
  licenseClass: PullModelLicenseClass;
  group: PullModelGroup;
  tags: ReadonlyArray<PullModelUseTag>;
  rating: 1 | 2 | 3 | 4 | 5 | 6;
  blurb: string;
}

export const PULL_MODEL_GROUP_LABELS: Record<PullModelGroup, string> = {
  featured: "Featured (chat + vision + strategy, each ≤ 3.3 GB)",
  smallest: "Smallest / fastest",
  stretch: "If you have room (slower, bigger; confirm before pull)",
  specialist: "Specialists",
};

export const PULL_MODEL_GROUP_ORDER: readonly PullModelGroup[] = [
  "featured",
  "smallest",
  "stretch",
  "specialist",
];

export const PULL_MODEL_FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "chat", label: "Chat" },
  { id: "vision", label: "Vision" },
  { id: "strategy", label: "Strategy" },
  { id: "coding", label: "Coding" },
] as const;

export type PullModelFilterId = (typeof PULL_MODEL_FILTER_OPTIONS)[number]["id"];

export const PULL_MODEL_CATALOG: readonly PullModelEntry[] = [
  {
    tag: "gemma3:4b",
    params: "4B",
    sizeGb: 3.3,
    releasedYm: "2025-03",
    license: "Gemma Terms",
    licenseClass: "open_weight",
    group: "featured",
    tags: ["chat", "vision"],
    rating: 6,
    blurb: "Multimodal — chat + screenshot understanding in one pull.",
  },
  {
    tag: "qwen2.5vl:3b",
    params: "3B",
    sizeGb: 3.2,
    releasedYm: "2025-01",
    license: "Qwen Research",
    licenseClass: "foss",
    group: "featured",
    tags: ["vision", "ocr", "strategy"],
    rating: 6,
    blurb: "Best small VLM for screenshots, OCR, game/UI identification.",
  },
  {
    tag: "qwen3:4b",
    params: "4B",
    sizeGb: 2.5,
    releasedYm: "2025-04",
    license: "Apache 2.0",
    licenseClass: "foss",
    group: "featured",
    tags: ["strategy", "chat"],
    rating: 6,
    blurb: 'Top strategy/reasoning under 5 GB; optional "thinking" mode.',
  },
  {
    tag: "llama3.2:3b",
    params: "3B",
    sizeGb: 2.0,
    releasedYm: "2024-09",
    license: "Llama 3.2",
    licenseClass: "open_weight",
    group: "featured",
    tags: ["chat"],
    rating: 6,
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
    tag: "moondream",
    params: "1.8B",
    sizeGb: 1.7,
    releasedYm: "2024-03",
    license: "Apache 2.0",
    licenseClass: "unknown",
    group: "smallest",
    tags: ["vision", "ocr"],
    rating: 5,
    blurb: "Tiniest practical vision model; great companion to a chat model.",
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
    releasedYm: "2024-11",
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

/** Format YYYY-MM as "Mon YYYY" for the table. */
export function formatReleasedYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m[2], 10) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${months[idx]} ${m[1]}`;
}

export function formatSizeGb(gb: number): string {
  if (gb < 0.1) return "< 0.1 GB";
  return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
}

export function formatGtaStars(rating: number): string {
  const n = Math.max(1, Math.min(6, Math.round(rating)));
  return "★".repeat(n);
}

export function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}
