import type { AskModeId } from "./askMode";

/**
 * This module owns preset prompt suggestions and category heuristics used by the chat composer.
 * Isolating this data and logic keeps conversational UX tuning separate from view-layer code.
 */
export type PresetPrompt = {
  text: string;
  category: string;
  beta?: boolean;
  /** When set, tapping this chip also switches Ask mode (e.g. Strategy Guide). */
  preferAskMode?: AskModeId;
};

/**
 * **Prompt-testing helper (default off):** When `true`, the main-tab preset carousel uses the
 * three fixed strings in `TEMP_CAROUSEL_FROZEN_TEXTS` (order preserved) instead of random or
 * contextual sampling — stable chips for repeatable Deck / model checks. Shipped builds keep
 * this `false`; set to `true` locally while working through matrices in `docs/prompt-testing.md`.
 */
export const TEMP_PRESET_CAROUSEL_FROZEN = false;

/**
 * Shipped `PRESET_PROMPTS.text` values in chip order: slot1, slot2, slot3.
 * Must match entries in `PRESET_PROMPTS` (same strings).
 */
export const TEMP_CAROUSEL_FROZEN_TEXTS: readonly [string, string, string] = [
  "Why is my game crashing?",
  "How do I fix stuttering?",
  "Help me troubleshoot a Proton issue",
] as const;

const PRESET_PROMPTS: PresetPrompt[] = [
  // Shipped — advice-first questions (TDP/GPU guidance); action only for strong shipped surfaces.
  { text: "How can I optimize for battery life?", category: "battery" },
  { text: "How do I balance FPS and battery?", category: "battery" },
  { text: "What TDP should I use for menus and idle?", category: "battery" },
  { text: "What are the best settings for 30fps with max battery?", category: "battery" },
  { text: "What's the efficiency sweet spot for this game?", category: "performance" },
  { text: "What are the best settings for 60fps?", category: "performance" },
  { text: "Recommended TDP for this game?", category: "performance" },
  { text: "What GPU clock should I use?", category: "performance" },
  { text: "What are the best FSR settings?", category: "performance" },
  { text: "How can I reduce fan noise?", category: "thermal" },
  { text: "What are the best thermal settings for long play sessions?", category: "thermal" },
  { text: "Why is my Deck running hot?", category: "thermal" },
  { text: "Recommended controller layout?", category: "controls" },
  { text: "How can I reduce input lag?", category: "controls" },
  { text: "Open Steam Input config", category: "controls" },
  { text: "Why is my game crashing?", category: "troubleshooting" },
  { text: "How do I fix stuttering?", category: "troubleshooting" },
  { text: "Help me troubleshoot a Proton issue", category: "troubleshooting" },
  { text: "Game won't launch, what should I check?", category: "troubleshooting" },
  { text: "Diagnose a slow Ollama response", category: "ollama" },
  { text: "What settings should I use?", category: "general" },
  { text: "Any known issues running this on Deck?", category: "general" },
  { text: "How well does this game run on Deck?", category: "general" },
  { text: "Describe what you see in this screenshot", category: "general" },
  { text: "Explain the model policy tiers", category: "general" },
  { text: "Which Ollama model fits my Deck setup?", category: "general" },
  { text: "How do I get past this part?", category: "strategy", preferAskMode: "strategy" },
  { text: "I'm stuck — what should I try next?", category: "strategy", preferAskMode: "strategy" },
  { text: "Help me beat this boss or encounter", category: "strategy", preferAskMode: "strategy" },
  // Roadmap previews (honest beta; click only fills input).
  { text: "Can you set a quiet fan profile?", category: "thermal", beta: true },
  { text: "What does my Proton log say about the last crash?", category: "troubleshooting", beta: true },
  { text: "Are there issues with my Steam Input layout?", category: "controls", beta: true },
  { text: "Which Ollama models do I need for bonsAI?", category: "general", beta: true },
  { text: "How do I use strategy mode?", category: "strategy", beta: true, preferAskMode: "strategy" },
  { text: "What's ahead (without spoilers)?", category: "strategy", beta: true, preferAskMode: "strategy" },
  { text: "bonsai:vac-check (paste 64-bit SteamIDs)", category: "troubleshooting", beta: true },
  { text: "Suggest mods or tweaks for this game", category: "general", beta: true },
];

const FOLLOW_UP_CATEGORIES: Record<string, string[]> = {
  performance: ["performance", "thermal", "battery"],
  battery: ["battery", "performance", "thermal"],
  thermal: ["thermal", "battery", "performance"],
  controls: ["controls", "troubleshooting", "general"],
  troubleshooting: ["troubleshooting", "performance", "general"],
  /** After Ollama/latency chips, prefer model policy and connection-adjacent prompts over TDP/FPS. */
  ollama: ["general", "general", "troubleshooting"],
  general: ["general", "performance", "battery"],
  strategy: ["strategy", "general", "troubleshooting"],
};

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["battery", ["battery", "power", "tdp", "watt", "charge", "idle"]],
  [
    "ollama",
    [
      "ollama",
      "ollama_host",
      "11434",
      "keep alive",
      "keep_alive",
      "inference latency",
      "model loads",
    ],
  ],
  ["performance", ["fps", "performance", "speed", "framerate", "frame rate", "fsr", "resolution"]],
  ["thermal", ["fan", "thermal", "temp", "heat", "cool", "noise", "long session"]],
  ["controls", ["controller", "layout", "input", "button", "joystick", "trackpad"]],
  ["troubleshooting", ["crash", "stutter", "fix", "error", "bug", "issue", "problem", "lag", "proton", "launch", "won't"]],
  ["general", ["compatibility", "verified", "run on deck"]],
  [
    "strategy",
    [
      "stuck",
      "beat",
      "boss",
      "puzzle",
      "level",
      "walkthrough",
      "how do i",
      "can't get",
      "progress",
      "temple",
      "dungeon",
    ],
  ],
];

/**
 * When `TEMP_PRESET_CAROUSEL_FROZEN` and `count === 3`, replace the triple with
 * `TEMP_CAROUSEL_FROZEN_TEXTS` in order. Shared by `getRandomPresets` and `getContextualPresets`.
 */
function applyTempFrozenCarousel(picked: PresetPrompt[], count: number): PresetPrompt[] {
  if (!TEMP_PRESET_CAROUSEL_FROZEN || count < 3 || picked.length < 3) {
    return picked;
  }
  const resolved: PresetPrompt[] = [];
  for (const text of TEMP_CAROUSEL_FROZEN_TEXTS) {
    const p = PRESET_PROMPTS.find((x) => x.text === text);
    if (p) {
      resolved.push(p);
    }
  }
  if (resolved.length === 3) {
    return resolved;
  }
  return picked;
}

export function getRandomPresets(count: number): PresetPrompt[] {
  /** Shuffle and return a bounded random subset of starter prompts. */
  const pool = [...PRESET_PROMPTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const sliced = pool.slice(0, count);
  if (count === 3) {
    return applyTempFrozenCarousel(sliced, count);
  }
  return sliced;
}

/** Milliseconds to keep a preset fully visible after fade-in; scales with text length (clamped). */
export function holdMsForPresetText(text: string): number {
  const msPerChar = 300;
  const minMs = 8000;
  const maxMs = 32000;
  const raw = text.length * msPerChar;
  return Math.min(maxMs, Math.max(minMs, raw));
}

/**
 * Pick a random preset whose `text` is not in `exclude`.
 * If every prompt is excluded (unlikely), falls back to a random prompt from the full list.
 */
export function getRandomPresetExcluding(exclude: Set<string>): PresetPrompt {
  const candidates = PRESET_PROMPTS.filter((p) => !exclude.has(p.text));
  const pool = candidates.length > 0 ? candidates : PRESET_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function getContextualPresets(lastCategory: string, count: number): PresetPrompt[] {
  /** Prioritize follow-up prompts related to the previous category, then backfill from remaining prompts. */
  const related = FOLLOW_UP_CATEGORIES[lastCategory] ?? Object.keys(FOLLOW_UP_CATEGORIES);
  const picked: PresetPrompt[] = [];
  const used = new Set<string>();

  for (const cat of related) {
    if (picked.length >= count) break;
    const candidates = PRESET_PROMPTS.filter((p) => p.category === cat && !used.has(p.text));
    if (candidates.length === 0) continue;
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    picked.push(choice);
    used.add(choice.text);
  }

  while (picked.length < count) {
    const remaining = PRESET_PROMPTS.filter((p) => !used.has(p.text));
    if (remaining.length === 0) break;
    const choice = remaining[Math.floor(Math.random() * remaining.length)];
    picked.push(choice);
    used.add(choice.text);
  }

  return count === 3 ? applyTempFrozenCarousel(picked, count) : picked;
}

export function detectPromptCategory(question: string): string {
  /** Detect question category by exact preset match first, then keyword heuristics with default fallback. */
  const lower = question.toLowerCase().replace(/\s+for\s+\S.*$/, "");
  const exact = PRESET_PROMPTS.find((p) => p.text.toLowerCase() === lower);
  if (exact) return exact.category;

  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "general";
}
