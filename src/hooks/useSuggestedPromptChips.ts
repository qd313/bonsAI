/**
 * Title: Suggested prompt chips
 * Purpose: Own the three question chips above the Ask box — what they say and when they change.
 * Used for: The Ask hook calls this; the Main tab draws whatever comes out of it.
 * Solves: Choosing chips is its own job. It mixes three sampled prompts with chips drawn from
 *         what the knowledge base knows about the running game, and it re-rolls on four
 *         different triggers. None of that has anything to do with asking a question.
 * Does not: Ask anything, or know a reply has arrived.
 * Caution: Lifted out of useBonsaiAskOrchestration on 2026-09-14 with the order of its own
 *          hooks unchanged, because React only tolerates a fixed order. It is called from
 *          exactly the position the block used to occupy. Keep it there.
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Router } from "@decky/ui";

import {
  composePresetSeedsWithSessionRag,
  setSessionRagCarouselCandidates,
} from "../features/preset-carousel/composePresetSeedsWithSessionRag";
import type { SessionRagChipCandidate } from "../features/preset-carousel/sessionRagComposer";
import { getContextualPresets, getRandomPresets, type PresetPrompt } from "../data/presets";
import { fetchSessionRagChipCandidates } from "../utils/sessionRagChipCandidates";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";
import type { AppliedResult } from "../types/bonsaiUi";

export type UseSuggestedPromptChipsArgs = {
  /** What the plugin kept from before it was closed, if anything. */
  survivalPeek: BonsaiSessionSurvivalSnapshot | null;
  /** The running game, tracked by the checklist hook, so both agree on which game it is. */
  trackedRunningAppId: string;
  useLocalKnowledgeBase?: boolean;
  settingsLoaded?: boolean;
  devForceSessionRagChips?: boolean;
};

export interface SuggestedPromptChips {
  lastApplied: AppliedResult | null;
  setLastApplied: Dispatch<SetStateAction<AppliedResult | null>>;
  suggestedPrompts: PresetPrompt[];
  setSuggestedPrompts: Dispatch<SetStateAction<PresetPrompt[]>>;
  reseedSuggestedPrompts: (
    mode: "random" | "contextual",
    category?: string,
    forceRefresh?: boolean,
  ) => Promise<void>;
}

/**
 * Own the three chips and re-roll them when something makes them stale.
 *
 * Four things cause a re-roll, and they are not interchangeable: the first open once
 * settings have loaded, the running game changing, the developer override being flipped,
 * and the Ask code asking for a contextual set after a reply. Each has its own guard,
 * because the guards used to overlap and the result was that chips drawn from the
 * knowledge base could never appear at all.
 *
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useSuggestedPromptChips(
  a: UseSuggestedPromptChipsArgs,
): SuggestedPromptChips {
  const { survivalPeek, trackedRunningAppId } = a;

  const [lastApplied, setLastApplied] = useState<AppliedResult | null>(
    () => survivalPeek?.lastApplied ?? null
  );
  const [suggestedPrompts, setSuggestedPrompts] = useState<PresetPrompt[]>(
    () => survivalPeek?.suggestedPrompts ?? getRandomPresets(3, { useLocalKnowledgeBase: a.useLocalKnowledgeBase }),
  );
  const ragCandidatesCacheRef = useRef<{ appId: string; candidates: SessionRagChipCandidate[] }>({
    appId: "",
    candidates: [],
  });
  const prevAppIdForPresetReseedRef = useRef<string | undefined>(undefined);
  // Always reseed on mount, so reopening the QAM draws fresh chips. This used to start as
  // `!!survivalPeek?.suggestedPrompts?.length`, which meant a restored session skipped the
  // reseed entirely and kept the same three chips for the rest of the Steam session — the
  // session RAG roll never re-ran, so RAG chips could never appear after the first seeding.
  // The ref still guards against re-running when `reseedSuggestedPrompts` changes identity.
  //
  // Restored prompts stay on screen until the reseed's RPC resolves, so there is no empty
  // carousel frame; the survival snapshot is what makes that hand-off seamless.
  const coldMountPresetReseedDoneRef = useRef(false);

  const loadSessionRagCandidates = useCallback(
    async (
      appId: string,
      appName: string,
      forceRefresh = false,
    ): Promise<SessionRagChipCandidate[]> => {
      if (!a.useLocalKnowledgeBase) {
        ragCandidatesCacheRef.current = { appId, candidates: [] };
        setSessionRagCarouselCandidates([]);
        return [];
      }
      if (
        !forceRefresh &&
        ragCandidatesCacheRef.current.appId === appId &&
        ragCandidatesCacheRef.current.candidates.length > 0
      ) {
        return ragCandidatesCacheRef.current.candidates;
      }
      const candidates = await fetchSessionRagChipCandidates({
        appId,
        appName,
      });
      ragCandidatesCacheRef.current = { appId, candidates };
      // The carousel tick draws from these too, or the corpus chip seeded below is carried out of
      // the window within about four ticks and never returns. The QA override rides along so it
      // forces the whole carousel rather than only the seeded slots.
      setSessionRagCarouselCandidates(candidates, {
        ...(a.devForceSessionRagChips ? { ragProbability: 1 } : {}),
      });
      return candidates;
    },
    [a.useLocalKnowledgeBase, a.devForceSessionRagChips],
  );

  const applyComposedSuggestedPrompts = useCallback(
    (staticSeeds: PresetPrompt[], candidates: SessionRagChipCandidate[]) => {
      setSuggestedPrompts(
        composePresetSeedsWithSessionRag({
          staticSeeds,
          ragCandidates: candidates,
          // QA override: every eligible slot takes a RAG chip instead of rolling 0.3, so
          // SESSION-RAG-CHIPS-01 stops depending on luck. Developer tab only, default off.
          ...(a.devForceSessionRagChips ? { ragProbability: 1 } : {}),
        }),
      );
    },
    [a.devForceSessionRagChips],
  );

  const reseedSuggestedPrompts = useCallback(
    async (mode: "random" | "contextual", category?: string, forceRefresh = false) => {
      const appId = Router.MainRunningApp?.appid?.toString() ?? "";
      const appName = Router.MainRunningApp?.display_name ?? "";
      const samplerOptions = { useLocalKnowledgeBase: a.useLocalKnowledgeBase };
      const staticSeeds =
        mode === "contextual" && category
          ? getContextualPresets(category, 3, samplerOptions)
          : getRandomPresets(3, samplerOptions);
      if (!a.useLocalKnowledgeBase) {
        setSuggestedPrompts(staticSeeds);
        return;
      }
      const candidates = await loadSessionRagCandidates(appId, appName, forceRefresh);
      applyComposedSuggestedPrompts(staticSeeds, candidates);
    },
    [a.useLocalKnowledgeBase, applyComposedSuggestedPrompts, loadSessionRagCandidates],
  );

  useEffect(() => {
    // Wait for load_settings before spending the one-shot reseed. useLocalKnowledgeBase
    // starts at its UI default of false, so reseeding first takes reseedSuggestedPrompts'
    // static-only early return AND marks the mount reseed done. The re-run that follows
    // hydration is then swallowed by the guard below, which is why session RAG chips could
    // not appear on any open -- reopening only re-ran the same losing race.
    if (a.settingsLoaded === false) {
      return;
    }
    if (coldMountPresetReseedDoneRef.current) {
      return;
    }
    coldMountPresetReseedDoneRef.current = true;
    void reseedSuggestedPrompts("random");
  }, [a.settingsLoaded, reseedSuggestedPrompts]);

  const prevDevForceRagRef = useRef(a.devForceSessionRagChips);
  useEffect(() => {
    if (prevDevForceRagRef.current === a.devForceSessionRagChips) {
      return;
    }
    prevDevForceRagRef.current = a.devForceSessionRagChips;
    // Bypass both the cold-mount guard and the appId guard: the survival snapshot would
    // otherwise keep the previously composed chips for the rest of the session.
    void reseedSuggestedPrompts("random", undefined, true);
  }, [a.devForceSessionRagChips, reseedSuggestedPrompts]);

  useEffect(() => {
    const prev = prevAppIdForPresetReseedRef.current;
    prevAppIdForPresetReseedRef.current = trackedRunningAppId;
    if (prev === undefined) {
      return;
    }
    if (prev === trackedRunningAppId) {
      return;
    }
    void reseedSuggestedPrompts("random");
  }, [reseedSuggestedPrompts, trackedRunningAppId]);

  return {
    lastApplied,
    setLastApplied,
    suggestedPrompts,
    setSuggestedPrompts,
    reseedSuggestedPrompts,
  };
}
