/**
 * This module owns preset prompt suggestions and category heuristics used by the chat composer.
 * Isolating this data and logic keeps conversational UX tuning separate from view-layer code.
 */
export type PresetPrompt = { text: string; category: string; beta?: boolean };

const PRESET_PROMPTS: PresetPrompt[] = [
  { text: "Optimize for battery life", category: "battery" },
  { text: "Balance FPS and battery", category: "battery" },
  { text: "Set TDP to minimum for menu/idle", category: "battery" },
  { text: "Best settings for 30fps with max battery", category: "battery" },
  { text: "Max performance for this game", category: "performance" },
  { text: "Best settings for 60fps", category: "performance" },
  { text: "Recommended TDP for this game?", category: "performance" },
  { text: "What GPU clock should I use?", category: "performance" },
  { text: "Best FSR settings for this game", category: "performance" },
  { text: "Reduce fan noise", category: "thermal" },
  { text: "Best thermal settings for long play sessions", category: "thermal" },
  { text: "What settings should I use?", category: "general" },
  { text: "Any known issues running this on Deck?", category: "general" },
  { text: "How well does this game run on Deck?", category: "general" },
  { text: "Why is my game crashing?", category: "troubleshooting" },
  { text: "How do I fix stuttering?", category: "troubleshooting" },
  { text: "Help me troubleshoot a Proton issue", category: "troubleshooting" },
  { text: "Game won't launch, what should I check?", category: "troubleshooting" },
  { text: "Recommended controller layout?", category: "controls" },
  { text: "How to reduce input lag?", category: "controls" },
  { text: "Set a quiet fan profile", category: "thermal", beta: true },
  { text: "Analyze my controller config", category: "controls", beta: true },
  { text: "Check my Proton logs for errors", category: "troubleshooting", beta: true },
  { text: "Suggest mods or tweaks for this game", category: "general", beta: true },
];

const FOLLOW_UP_CATEGORIES: Record<string, string[]> = {
  performance: ["performance", "thermal", "battery"],
  battery: ["battery", "performance", "thermal"],
  thermal: ["thermal", "battery", "performance"],
  controls: ["controls", "troubleshooting", "general"],
  troubleshooting: ["troubleshooting", "performance", "general"],
  general: ["general", "performance", "battery"],
};

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["battery", ["battery", "power", "tdp", "watt", "charge", "idle"]],
  ["performance", ["fps", "performance", "speed", "framerate", "frame rate", "fsr", "resolution"]],
  ["thermal", ["fan", "thermal", "temp", "heat", "cool", "noise", "long session"]],
  ["controls", ["controller", "layout", "input", "button", "joystick", "trackpad"]],
  ["troubleshooting", ["crash", "stutter", "fix", "error", "bug", "issue", "problem", "lag", "proton", "launch", "won't"]],
  ["general", ["compatibility", "verified", "run on deck"]],
];

export function getRandomPresets(count: number): PresetPrompt[] {
  /** Shuffle and return a bounded random subset of starter prompts. */
  const pool = [...PRESET_PROMPTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
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

  return picked;
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
