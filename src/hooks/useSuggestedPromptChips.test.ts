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
import { LOCAL_KNOWLEDGE_BASE_ADVICE_PRESET_TEXT, setFrozenTestChips } from "../data/presets";

vi.mock("../utils/sessionRagChipCandidates", () => ({
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
