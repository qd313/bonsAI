import { afterEach, describe, expect, it } from "vitest";
import {
  LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT,
  TEMP_CAROUSEL_FROZEN_TEXTS,
  TEMP_PRESET_CAROUSEL_FROZEN,
  detectPromptCategory,
  getContextualPresets,
  getRandomPresetExcluding,
  getRandomPresets,
  holdMsForPresetText,
  setFrozenTestChips,
  getFrozenTestChips,
  frozenTestChipsActive,
} from "./presets";
import { questionBypassesOllamaPcIpRequirement } from "../utils/localOnlyAskCommands";

/** Regression tests for preset sampling and category detection heuristics. */
describe("presets", () => {
  // The runtime freeze is module-level state (see setFrozenTestChips), so every case here has to
  // clear it or it leaks into the sampling tests below and they fail for the wrong reason.
  afterEach(() => setFrozenTestChips([]));

  it("returns requested number of random presets when possible", () => {
    const presets = getRandomPresets(3);
    expect(presets.length).toBe(3);
  });

  it("detects category from explicit preset text", () => {
    expect(detectPromptCategory("Please help with battery optimization")).toBe("battery");
    expect(detectPromptCategory("How do I fix stuttering?")).toBe("troubleshooting");
    expect(detectPromptCategory("Diagnose a slow Ollama response")).toBe("ollama");
    expect(detectPromptCategory("How do I find Ollama on my LAN?")).toBe("ollama");
    expect(detectPromptCategory("What should I do if Ask times out?")).toBe("ollama");
    expect(detectPromptCategory("How do I use Find LAN on the Ollama tab?")).toBe("ollama");
    expect(detectPromptCategory("How do I bind a BonsAI quick-launch chord?")).toBe("controls");
    expect(detectPromptCategory("How do I enable token streaming?")).toBe("general");
    expect(detectPromptCategory("What should I expect while answers stream in?")).toBe("general");
  });

  it("detects category for the wave 2 preset refresh (2026-09-05)", () => {
    // These must hit the exact-preset-text match, not the keyword fallback. Three of the six
    // start with "how do i", which is itself a "strategy" keyword (CATEGORY_KEYWORDS) -- so if
    // the exact match ever stopped firing (e.g. a wording change added a "for ..." clause, which
    // detectPromptCategory strips before comparing), these would silently reclassify as
    // "strategy" instead of failing loudly. This test is the tripwire for that.
    expect(detectPromptCategory("How do I turn on Thinking mode?")).toBe("general");
    expect(detectPromptCategory("What does Kids master lock do?")).toBe("general");
    expect(detectPromptCategory("What is Caveman reply style?")).toBe("general");
    expect(detectPromptCategory("Where do your game tips come from?")).toBe("general");
    expect(detectPromptCategory("How do I start a new named chat?")).toBe("general");
    expect(detectPromptCategory("How do I ask about a game that isn't running?")).toBe("general");
  });

  it("returns contextual presets with requested length", () => {
    const presets = getContextualPresets("performance", 3);
    expect(presets.length).toBe(3);
  });

  it("when TEMP_PRESET_CAROUSEL_FROZEN is on, random and contextual triples match TEMP_CAROUSEL_FROZEN_TEXTS", () => {
    if (!TEMP_PRESET_CAROUSEL_FROZEN) return;
    // The frozen list may be longer than the carousel's three slots (a whole QA batch staged in
    // one deploy); the first three fill it and rotation walks the rest.
    const want = [...TEMP_CAROUSEL_FROZEN_TEXTS].slice(0, 3);
    expect(getRandomPresets(3).map((p) => p.text)).toEqual(want);
    expect(getContextualPresets("performance", 3).map((p) => p.text)).toEqual(want);
  });

  it("when carousel is not frozen, preset sampling is not locked to the frozen testing triple", () => {
    if (TEMP_PRESET_CAROUSEL_FROZEN) return;
    const key = [...TEMP_CAROUSEL_FROZEN_TEXTS].join("\0");
    let sawOtherRandom = false;
    let sawOtherContextual = false;
    for (let i = 0; i < 40; i++) {
      if (getRandomPresets(3).map((p) => p.text).join("\0") !== key) sawOtherRandom = true;
      if (getContextualPresets("performance", 3).map((p) => p.text).join("\0") !== key) sawOtherContextual = true;
      if (sawOtherRandom && sawOtherContextual) break;
    }
    expect(sawOtherRandom).toBe(true);
    expect(sawOtherContextual).toBe(true);
  });

  it("holdMsForPresetText clamps by length", () => {
    expect(holdMsForPresetText("a")).toBe(8000);
    expect(holdMsForPresetText("x".repeat(200))).toBe(32000);
    expect(holdMsForPresetText("How do I fix stuttering?")).toBeGreaterThan(4000);
    expect(holdMsForPresetText("How do I fix stuttering?")).toBeLessThan(32000);
  });

  it("getRandomPresetExcluding avoids listed texts when possible", () => {
    const all = getRandomPresets(50).map((p) => p.text);
    const exclude = new Set(all.slice(0, all.length - 1));
    const one = getRandomPresetExcluding(exclude);
    expect(exclude.has(one.text)).toBe(false);
  });

  it("excludes KB-advice static seed when useLocalKnowledgeBase is on (all samplers)", () => {
    for (let i = 0; i < 40; i++) {
      const random = getRandomPresets(50, { useLocalKnowledgeBase: true });
      expect(random.some((p) => p.text === LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT)).toBe(false);
      const contextual = getContextualPresets("performance", 50, { useLocalKnowledgeBase: true });
      expect(contextual.some((p) => p.text === LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT)).toBe(false);
      const excluding = getRandomPresetExcluding(new Set(), { useLocalKnowledgeBase: true });
      expect(excluding.text).not.toBe(LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT);
    }
  });

  it("includes KB-advice static seed when useLocalKnowledgeBase is off", () => {
    const all = getRandomPresets(50, { useLocalKnowledgeBase: false });
    expect(all.some((p) => p.text === LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT)).toBe(true);
  });
});

describe("frozen test chips (QA)", () => {
  afterEach(() => setFrozenTestChips([]));

  const BATCH = [
    "how do i deal with the exploders",
    "what is red sugar for",
    "how do i beat the twins",
  ];

  it("drives the carousel with arbitrary text that is not a built-in preset", () => {
    // The whole reason this exists: TEMP_CAROUSEL_FROZEN_TEXTS resolves entries against
    // PRESET_PROMPTS and skips misses, so a real QA question could never be frozen.
    setFrozenTestChips(BATCH);
    expect(getRandomPresets(3).map((p) => p.text)).toEqual(BATCH);
    expect(getContextualPresets("performance", 3).map((p) => p.text)).toEqual(BATCH);
  });

  it("badges frozen chips so a batch is never mistaken for real carousel output", () => {
    setFrozenTestChips(BATCH);
    expect(getRandomPresets(3).every((p) => p.testChip === true)).toBe(true);
  });

  it("keeps rotation inside the batch instead of drifting back to sampled prompts", () => {
    setFrozenTestChips(BATCH);
    const next = getRandomPresetExcluding(new Set([BATCH[0]!, BATCH[1]!]));
    expect(next.text).toBe(BATCH[2]);
  });

  it("walks a batch longer than the three slots", () => {
    const long = [...BATCH, "how do i sink underwater"];
    setFrozenTestChips(long);
    const next = getRandomPresetExcluding(new Set(long.slice(0, 3)));
    expect(next.text).toBe("how do i sink underwater");
  });

  it("treats fewer than three entries as off, rather than showing a short carousel", () => {
    setFrozenTestChips(["only one"]);
    expect(frozenTestChipsActive()).toBe(false);
    expect(getRandomPresets(3).some((p) => p.text === "only one")).toBe(false);
  });

  it("trims and drops blank entries when the batch is set", () => {
    setFrozenTestChips(["  a  ", "", "b", "c"]);
    expect(getFrozenTestChips()).toEqual(["a", "b", "c"]);
  });

  it("clears back to normal sampling", () => {
    setFrozenTestChips(BATCH);
    setFrozenTestChips([]);
    expect(frozenTestChipsActive()).toBe(false);
    expect(getRandomPresets(3).some((p) => p.testChip)).toBe(false);
  });
});

describe("suggestion chip pool", () => {
  it("never offers a typed command as a suggestion chip (plan 70, flow L6)", () => {
    // "bonsai:vac-check" sat in the chip list and rotated through the chips like a question.
    // A raw typed command; the ban lookup's plain-words chip is allowed (see the test below).
    const isCommand = (text: string) =>
      questionBypassesOllamaPcIpRequirement(text) && /^\/?\s*bonsai:/i.test(text);
    for (const options of [undefined, { useLocalKnowledgeBase: true }]) {
      expect(getRandomPresets(500, options).some((p) => isCommand(p.text))).toBe(false);
      for (const category of ["troubleshooting", "ollama", "general"]) {
        expect(getContextualPresets(category, 500, options).some((p) => isCommand(p.text))).toBe(false);
      }
      for (let i = 0; i < 300; i++) {
        expect(isCommand(getRandomPresetExcluding(new Set(), options).text)).toBe(false);
      }
    }
  });

  it("offers the ban lookup in plain words, and pressing it runs the lookup (maintainer, plan 72)", () => {
    const pool = getRandomPresets(500);
    expect(pool.some((p) => p.text.toLowerCase().includes("bonsai:"))).toBe(false);
    const chip = pool.find((p) => p.text === "Check Steam players for bans");
    expect(chip).toBeTruthy();
    // Pressing a chip puts its text in the Ask box; this is the check that sends it to the lookup
    // rather than the AI (the back end's parse_vac_check_command answers to the same sentence).
    expect(questionBypassesOllamaPcIpRequirement(chip!.text)).toBe(true);
  });
});
