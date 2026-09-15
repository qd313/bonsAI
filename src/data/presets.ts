/**
 * Title: The suggested-question chips on the Main tab
 *
 * Purpose: The Main tab shows a small row of suggested questions — "Why is
 * my Deck running hot?", "How do I fix stuttering?", and so on — that the
 * user can tap to fill the Ask bar instead of typing. This file is the
 * whole list of those questions, which topic each belongs to (battery,
 * thermal, performance, controls, troubleshooting, Ollama, general,
 * strategy), and the code that picks which ones show: at random, or leaning
 * toward questions related to whatever topic the last question was about.
 *
 * Used for: the suggested-question row on the Main tab, and picking which
 * Ask mode a chip should switch to when tapped — some, like "How do I get
 * past this part?", switch the Ask bar into Strategy mode on their own.
 *
 * Solves: one list of questions, their topics, and the picking rules, so
 * "which question comes up next" is decided in one place instead of being
 * scattered across the Main tab's own view code.
 *
 * Does not: actually send a question once a chip is tapped, or decide
 * whether a chip should be swapped out for the name of the game currently
 * running — that swap is `joinPresetWithRunningGame.ts`'s job, done after a
 * question is picked from here.
 *
 * How the row decides what to show, in order:
 *   1. Is a pinned QA batch of exact questions currently in force (set from
 *      a hidden developer setting, `dev_frozen_test_chips`, no rebuild
 *      needed)? If three or more are pinned, show those, in the order they
 *      were pinned, and nothing below this runs. This exists so a tester can
 *      ask the exact same handful of questions on every run, which random or
 *      topic-based picking cannot promise.
 *   2. Otherwise, if the developer-only, shipped-off `TEMP_PRESET_CAROUSEL_FROZEN`
 *      flag is on and at least three of its fixed question list match real
 *      questions in the list below, show those instead — a lighter version
 *      of step 1 for local testing, at the cost of needing a rebuild to
 *      change the batch.
 *   3. Otherwise, show real suggestions: either random questions from the
 *      full list, or, when the previous question's topic is known, more
 *      questions from a handful of related topics first, topped up with
 *      random ones if that is not enough to fill the row.
 *
 * Gotchas:
 *   - Freezing the row (steps 1 or 2) also stops it from mixing in a
 *     knowledge-base tip chip, so a test that expects to see one cannot pass
 *     while either freeze is on.
 *   - Fewer than three pinned questions is treated as "no freeze" on
 *     purpose: a short pinned batch would otherwise mix pinned and random
 *     chips in the same row, which defeats the point of pinning for a
 *     repeatable test.
 */
import type { AskModeId } from "./askMode";

export type PresetPrompt = {
  text: string;
  category: string;
  beta?: boolean;
  /** When set, tapping this chip also switches Ask mode (e.g. Strategy Guide). */
  preferAskMode?: AskModeId;
  /**
   * Phase 4 V4: this chip names something from the corpus for the running game, so it carries a
   * **Tip** badge. Game RAG chips only — shared Proton/Deck troubleshooting chips do not get one,
   * because the badge is a claim about *this game* being covered, and a generic Deck tip is not.
   */
  ragTip?: boolean;
  /**
   * A pinned QA question (see `setFrozenTestChips`). Badged **Test** so a frozen batch is never
   * mistaken for real carousel output — the whole point of freezing is that these chips are not
   * what the plugin would have chosen.
   */
  testChip?: boolean;
};

/**
 * **Prompt-testing helper (default off):** When `true`, the main-tab preset carousel uses the
 * fixed strings in `TEMP_CAROUSEL_FROZEN_TEXTS` (order preserved) instead of random or
 * contextual sampling — stable chips for repeatable Deck / model checks. Shipped builds keep
 * this `false`; set to `true` locally while working through matrices in `docs/testing.md`.
 *
 * Freezing also suppresses session-RAG mixing (`composePresetSeedsWithSessionRag`), so a suite
 * that asserts a RAG chip appears cannot pass while this is on — guard those cases on the flag
 * the way `presets.test.ts` does rather than leaving them to fail.
 */
export const TEMP_PRESET_CAROUSEL_FROZEN = false;

/**
 * Runtime frozen test chips, set from `dev_frozen_test_chips` in settings.
 *
 * Two things this does that `TEMP_CAROUSEL_FROZEN_TEXTS` below cannot, both of which is why it
 * exists rather than the constant being edited:
 *
 * 1. **Arbitrary text.** The constant resolves each entry against `PRESET_PROMPTS` and silently
 *    skips anything that does not match, so a QA question like *"how do i deal with the
 *    exploders"* can never be frozen — it is not a built-in preset. These are the questions QA
 *    actually needs.
 * 2. **No rebuild.** The constant is compile-time, so staging a batch costs a build and a deploy.
 *
 * Module-level on purpose: it mirrors the constant it supersedes, and the alternative is
 * threading a parameter through `getRandomPresets`, `getContextualPresets` and
 * `getRandomPresetExcluding` plus every caller, for a value that is global by nature.
 *
 * Fewer than three entries is treated as off — a short freeze would silently mix frozen and
 * sampled chips, which is the one thing a deterministic QA run cannot have. (The threshold dates
 * from the three-slot row; the row shows two chips since 2026-09-01 and the rule stays as a floor,
 * because seeds are still drawn in threes.)
 */
let runtimeFrozenChipTexts: readonly string[] = [];

/** Replace the frozen QA batch. Empty (or fewer than three) restores normal sampling. */
export function setFrozenTestChips(texts: readonly string[]): void {
  runtimeFrozenChipTexts = texts.map((t) => String(t ?? "").trim()).filter(Boolean);
}

/** The frozen batch currently in force, in carousel order. */
export function getFrozenTestChips(): readonly string[] {
  return runtimeFrozenChipTexts;
}

/** True when a frozen batch is driving the carousel, so RAG mixing and reseeding must stand down. */
export function frozenTestChipsActive(): boolean {
  return runtimeFrozenChipTexts.length >= 3;
}

/**
 * The frozen entry after `currentText`, wrapping at the end; null when no batch is in force.
 *
 * With fewer than three chips on screen, "first frozen entry not on screen" — the rule
 * `getRandomPresetExcluding` uses — cannot walk a batch: it ping-ponged between the first two
 * entries when the row was one chip (2026-08-31). Round-robin from the last entry the row
 * introduced walks the whole batch in order, which is what a staged QA run needs; the slot
 * rotation (presetSlotRotation.ts) drives it and skips entries another chip is still showing.
 */
export function nextFrozenPresetAfter(currentText: string): PresetPrompt | null {
  const frozen = frozenPresets();
  if (frozen.length < 3) return null;
  const idx = frozen.findIndex((p) => p.text === currentText);
  return frozen[(idx + 1) % frozen.length] ?? null;
}

/**
 * Frozen chip texts in order. The chip row walks the batch in this order (two chips on screen at a
 * time since 2026-09-01; carousel mode keeps up to five in its history) — list more than three to
 * stage a whole QA batch in one deploy. Each entry must match a `text` in `PRESET_PROMPTS`; an
 * entry that matches nothing is skipped, and if fewer than three resolve the freeze falls back to
 * random sampling.
 */
export const TEMP_CAROUSEL_FROZEN_TEXTS: readonly string[] = [
  "What are the best settings for 60fps?",
  "How do I fix stuttering?",
  "When should I use Expert mode instead of Speed?",
] as const;

/** Static seed nudging users to turn on the KB; excluded from sampling when the setting is on. */
export const LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT =
  "Enable local knowledge base for better game tips";

export type PresetSamplerOptions = {
  /**
   * When true, KB-advice static seeds are excluded. Gates on `use_local_knowledge_base`
   * only — corpus installed state is not visible on this path.
   */
  useLocalKnowledgeBase?: boolean;
};

function samplerPool(options?: PresetSamplerOptions): PresetPrompt[] {
  if (!options?.useLocalKnowledgeBase) return PRESET_PROMPTS;
  return PRESET_PROMPTS.filter((p) => p.text !== LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT);
}

const PRESET_PROMPTS: PresetPrompt[] = [
  // Shipped — advice-first questions (TDP/GPU guidance); action only for strong shipped surfaces.
  { text: "How can I optimize for battery life?", category: "battery" },
  { text: "How do I balance FPS and battery?", category: "battery" },
  { text: "What TDP should I use for menus and idle?", category: "battery" },
  { text: "What's the efficiency sweet spot for this game?", category: "performance" },
  { text: "What are the best settings for 60fps?", category: "performance" },
  { text: "Recommended TDP for this game?", category: "performance" },
  { text: "What are the best FSR settings?", category: "performance" },
  { text: "Why is my Deck running hot?", category: "thermal" },
  { text: "Recommended controller layout?", category: "controls" },
  { text: "How can I reduce input lag?", category: "controls" },
  { text: "Open Steam Input config", category: "controls" },
  { text: "How do I fix Steam Input for this game?", category: "controls" },
  { text: "How do I bind a BonsAI quick-launch chord?", category: "controls" },
  { text: "Why is my game crashing?", category: "troubleshooting" },
  { text: "How do I fix stuttering?", category: "troubleshooting" },
  { text: "Help me troubleshoot a Proton issue", category: "troubleshooting" },
  { text: "Game won't launch, what should I check?", category: "troubleshooting" },
  { text: "bonsai:vac-check", category: "troubleshooting" },
  { text: "Diagnose a slow Ollama response", category: "ollama" },
  { text: "How do I find Ollama on my LAN?", category: "ollama" },
  { text: "How do I use Find LAN on the Ollama tab?", category: "ollama" },
  { text: "Why can't bonsAI reach my PC Ollama host?", category: "ollama" },
  { text: "What should I do if Ask times out?", category: "ollama" },
  { text: "What settings should I use?", category: "general" },
  { text: "Any known issues running this on Deck?", category: "general" },
  { text: "How well does this game run on Deck?", category: "general" },
  { text: "Describe what you see in this screenshot", category: "general" },
  { text: "What do the model policy tiers mean?", category: "general" },
  { text: "Which Ollama model fits my Deck setup?", category: "general" },
  { text: "Which Ollama essentials should I pull for this Deck?", category: "general" },
  { text: LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT, category: "general" },
  { text: "When should I use Expert mode instead of Speed?", category: "general", preferAskMode: "expert" },
  { text: "How do I set up voice input on the Deck?", category: "general" },
  { text: "How do I get past this part?", category: "strategy", preferAskMode: "strategy" },
  { text: "I'm stuck — what should I try next?", category: "strategy", preferAskMode: "strategy" },
  { text: "Help me beat this boss or encounter", category: "strategy", preferAskMode: "strategy" },
  { text: "How do I use strategy mode?", category: "strategy", preferAskMode: "strategy" },
  { text: "What's ahead (without spoilers)?", category: "strategy", preferAskMode: "strategy" },
  // Wave 2 refresh (roadmap "Preset chip expansion"): shipped features from mid-August/September
  // 2026 with no chip yet. Wave 1 (2026-08-07) already covers Ollama LAN discovery, the
  // quick-launch chord and token streaming — see the "ollama"/"controls" entries above and the
  // beta streaming pair below. All plain informational asks about the plugin itself, so none
  // carry ragTip (that badge is a claim the knowledge base covers the running game) or
  // preferAskMode (none of these need a different Ask mode to answer well).
  { text: "How do I turn on Thinking mode?", category: "general" },
  { text: "What does Kids master lock do?", category: "general" },
  { text: "What is Caveman reply style?", category: "general" },
  { text: "Where do your game tips come from?", category: "general" },
  { text: "How do I start a new named chat?", category: "general" },
  { text: "How do I ask about a game that isn't running?", category: "general" },
  // Roadmap previews (honest beta; click only fills input).
  { text: "How do I enable token streaming?", category: "general", beta: true },
  { text: "What should I expect while answers stream in?", category: "general", beta: true },
  { text: "Can you set a quiet fan profile?", category: "thermal", beta: true },
  { text: "What does my Proton log say about the last crash?", category: "troubleshooting", beta: true },
  { text: "Are there issues with my Steam Input layout?", category: "controls", beta: true },
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
      "find lan",
      "mdns",
      "named host",
      "pc ollama",
      "connection",
      "timeout",
      "essentials",
      "pull model",
    ],
  ],
  ["performance", ["fps", "performance", "speed", "framerate", "frame rate", "fsr", "resolution"]],
  ["thermal", ["fan", "thermal", "temp", "heat", "cool", "noise", "long session"]],
  ["controls", ["controller", "layout", "input", "button", "joystick", "trackpad", "steam input", "chord", "quick-launch"]],
  ["troubleshooting", ["crash", "stutter", "fix", "error", "bug", "issue", "problem", "lag", "proton", "launch", "won't"]],
  ["general", ["compatibility", "verified", "run on deck", "voice input", "expert mode", "token streaming", "stream in"]],
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
/**
 * Frozen texts resolved to prompts, in list order. Returns `[]` when fewer than three resolve,
 * which is the caller's signal to fall back to normal sampling rather than show a short carousel.
 */
function frozenPresets(): PresetPrompt[] {
  // Runtime list wins. Its entries are free text and are NOT looked up in PRESET_PROMPTS -- that
  // lookup is exactly what stops the constant below from being usable for real QA questions.
  if (frozenTestChipsActive()) {
    return runtimeFrozenChipTexts.map((text) => ({
      text,
      category: "testing",
      testChip: true,
    }));
  }
  if (!TEMP_PRESET_CAROUSEL_FROZEN) return [];
  const resolved: PresetPrompt[] = [];
  for (const text of TEMP_CAROUSEL_FROZEN_TEXTS) {
    const p = PRESET_PROMPTS.find((x) => x.text === text);
    if (p) {
      resolved.push(p);
    }
  }
  return resolved.length >= 3 ? resolved : [];
}

function applyTempFrozenCarousel(picked: PresetPrompt[], count: number): PresetPrompt[] {
  if ((!TEMP_PRESET_CAROUSEL_FROZEN && !frozenTestChipsActive()) || count < 3 || picked.length < 3) {
    return picked;
  }
  const resolved = frozenPresets();
  return resolved.length >= 3 ? resolved.slice(0, count) : picked;
}

export function getRandomPresets(count: number, options?: PresetSamplerOptions): PresetPrompt[] {
  /** Shuffle and return a bounded random subset of starter prompts. */
  const pool = [...samplerPool(options)];
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
export function getRandomPresetExcluding(
  exclude: Set<string>,
  options?: PresetSamplerOptions,
): PresetPrompt {
  // Rotation must honour the freeze or the carousel drifts back to random prompts a tick after
  // it is seeded, which silently ends a QA run that looks like it is still set up. Walking the
  // frozen list in order (first entry not already on screen) is what lets a batch longer than the
  // three slots be reached without a redeploy.
  const frozen = frozenPresets();
  if (frozen.length >= 3) {
    const next = frozen.find((p) => !exclude.has(p.text));
    return next ?? frozen[0]!;
  }
  const base = samplerPool(options);
  const candidates = base.filter((p) => !exclude.has(p.text));
  const pool = candidates.length > 0 ? candidates : base;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function getContextualPresets(
  lastCategory: string,
  count: number,
  options?: PresetSamplerOptions,
): PresetPrompt[] {
  /** Prioritize follow-up prompts related to the previous category, then backfill from remaining prompts. */
  const pool = samplerPool(options);
  const related = FOLLOW_UP_CATEGORIES[lastCategory] ?? Object.keys(FOLLOW_UP_CATEGORIES);
  const picked: PresetPrompt[] = [];
  const used = new Set<string>();

  for (const cat of related) {
    if (picked.length >= count) break;
    const candidates = pool.filter((p) => p.category === cat && !used.has(p.text));
    if (candidates.length === 0) continue;
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    picked.push(choice);
    used.add(choice.text);
  }

  while (picked.length < count) {
    const remaining = pool.filter((p) => !used.has(p.text));
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
