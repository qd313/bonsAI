/**
 * Title: The "Enable local knowledge base" chip never shows while the knowledge base is on
 * Purpose: Pin the fix for the roadmap's "The 'Enable local knowledge base' chip showed while the
 *          knowledge base was on" (plan 70 flow L7; again in plan72-F4-TIP.json, right after an
 *          answer that had used the knowledge base).
 * Used for: useSuggestedPromptChips.
 * Solves: The Ask hook reseeds the chips after every answer from inside applyBackgroundStatusToUi,
 *         a useCallback that does not list reseedSuggestedPrompts among its dependencies. It kept
 *         the copy from its first render, when the knowledge-base setting still read its UI
 *         default (off) because settings had not loaded yet, so every after-answer reseed drew
 *         from the pool that still holds the "Enable local knowledge base" chip. These tests hold
 *         an early copy the same way.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSuggestedPromptChips, type UseSuggestedPromptChipsArgs } from "./useSuggestedPromptChips";
import { LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT, setFrozenTestChips } from "./presets";
import { fetchSessionRagChipCandidates } from "./sessionRagChipCandidates";
import { getSessionRagCarouselCandidates, setSessionRagCarouselCandidates } from "./composePresetSeedsWithSessionRag";

vi.mock("./sessionRagChipCandidates", () => ({
  fetchSessionRagChipCandidates: vi.fn(async () => []),
}));

const base: UseSuggestedPromptChipsArgs = {
  survivalPeek: null,
  trackedRunningAppId: "",
  useLocalKnowledgeBase: false,
  settingsLoaded: false,
};

const kbChipShown = (texts: string[]) => texts.includes(LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT);

describe("useSuggestedPromptChips: no 'Enable local knowledge base' chip while it is on", () => {
  beforeEach(() => {
    setFrozenTestChips([]);
  });

  it("a reseed held from before settings loaded still reads the setting as it is now", async () => {
    const { result, rerender } = renderHook((args: UseSuggestedPromptChipsArgs) => useSuggestedPromptChips(args), {
      initialProps: base,
    });
    // The Ask hook's copy, taken on the first render (setting still at its default, off).
    const heldReseed = result.current.reseedSuggestedPrompts;

    // Settings load: the knowledge base is on.
    rerender({ ...base, useLocalKnowledgeBase: true, settingsLoaded: true });

    // Many after-answer reseeds through the held copy; "general" follow-ups include that chip.
    for (let i = 0; i < 300; i++) {
      await act(async () => {
        await heldReseed("contextual", "general", true);
      });
      const texts = result.current.suggestedPrompts.map((p) => p.text);
      expect(kbChipShown(texts), `reseed ${i}: ${texts.join(" | ")}`).toBe(false);
    }
  });

  it("chips kept from before (the reopen snapshot) lose that chip once the setting reads on", () => {
    const { result } = renderHook(() =>
      useSuggestedPromptChips({
        ...base,
        useLocalKnowledgeBase: true,
        survivalPeek: {
          suggestedPrompts: [
            { text: "Why is my Deck running hot?", category: "thermal" },
            { text: LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT, category: "general" },
            { text: "How do I fix stuttering?", category: "performance" },
          ],
        } as unknown as UseSuggestedPromptChipsArgs["survivalPeek"],
      }),
    );
    expect(kbChipShown(result.current.suggestedPrompts.map((p) => p.text))).toBe(false);
  });
});

describe("useSuggestedPromptChips: the closest notes lead only the row drawn right after an answer", () => {
  const game = (text: string, closest?: true) => ({
    text,
    category: "strategy",
    domain: "strategy",
    ...(closest ? { closest } : {}),
  });

  it("an after-answer reseed opens on the two closest chips; a later reseed of the cached list does not", async () => {
    vi.mocked(fetchSessionRagChipCandidates).mockResolvedValueOnce([
      game("How do I beat Boss1?", true),
      game("How do I use Item4?", true),
      game("How do I deal with Enemy0?"),
    ]);
    const { result } = renderHook(() =>
      // Settings not yet "loaded", so the cold-open reseed does not take the one prepared answer first.
      useSuggestedPromptChips({ ...base, useLocalKnowledgeBase: true, settingsLoaded: false }),
    );
    await act(async () => {
      await result.current.reseedSuggestedPrompts("contextual", "strategy", true);
    });
    expect(result.current.suggestedPrompts.slice(0, 2).map((p) => p.text)).toEqual([
      "How do I beat Boss1?",
      "How do I use Item4?",
    ]);
    // Nothing new was asked: the same game's list comes from the cache, and the closest are spent.
    // Every per-slot roll loses (0.99), so only the closest marks could put two game chips in front.
    const dice = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      await act(async () => {
        await result.current.reseedSuggestedPrompts("random");
      });
    } finally {
      dice.mockRestore();
    }
    const texts = result.current.suggestedPrompts.slice(0, 2).map((p) => p.text);
    expect(texts).not.toEqual(["How do I beat Boss1?", "How do I use Item4?"]);
    expect(result.current.suggestedPrompts.filter((p) => p.ragTip === true)).toHaveLength(1);
  });

  it("the list the rotation draws from carries the marks after an answer and loses them on a cached reseed", async () => {
    vi.mocked(fetchSessionRagChipCandidates).mockResolvedValueOnce([game("C1", true), game("C2", true), game("C3")]);
    const { result } = renderHook(() =>
      useSuggestedPromptChips({ ...base, useLocalKnowledgeBase: true, settingsLoaded: false }),
    );
    try {
      await act(async () => {
        await result.current.reseedSuggestedPrompts("contextual", "strategy", true);
      });
      expect(getSessionRagCarouselCandidates().filter((c) => c.closest).map((c) => c.text)).toEqual(["C1", "C2"]);
      await act(async () => {
        await result.current.reseedSuggestedPrompts("random");
      });
      expect(getSessionRagCarouselCandidates().some((c) => c.closest)).toBe(false);
      expect(getSessionRagCarouselCandidates().map((c) => c.text)).toEqual(["C1", "C2", "C3"]);
    } finally {
      setSessionRagCarouselCandidates([]);
    }
  });
});
