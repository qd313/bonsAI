/**
 * Title: Ask bar timers and persistence
 *
 * Purpose: Two small, unrelated-but-adjacent behaviors the unified input box needs: the "this
 * is taking a while" warning timer, and writing (or not writing) the typed text back to local
 * storage depending on the persistence mode setting.
 *
 * Used for: `index.tsx`, right after the settings and Ask orchestration hooks it reads from
 * exist.
 *
 * Solves: Nothing new — the same effects `Content` used to declare inline, moved out as a tight
 * group (both are plain Ask-bar behavior, no state either reaches into the other).
 *
 * Does not: Decide what the persistence mode setting does elsewhere, or own the warning banner
 * itself — this only flips `showSlowWarning` and writes to storage.
 */
import { useEffect, useRef } from "react";

import { persistSearchQuery } from "./pluginStorage";
import { shouldClearUnifiedInputForPersistenceMode } from "../../utils/unifiedInputPersistenceMode";
import type { UnifiedInputPersistenceMode } from "../../data/bonsaiSettingsSchema";
import type { useBonsaiAskOrchestration } from "../../hooks/useBonsaiAskOrchestration";

type AskOrchestration = ReturnType<typeof useBonsaiAskOrchestration>;

export type UseSlowResponseWarningTimerArgs = {
  isAsking: boolean;
  isStreamingPreview: boolean;
  effectiveLatencyWarningSeconds: number;
  setShowSlowWarning: AskOrchestration["setShowSlowWarning"];
};

/*
 * In: whether a question is in flight, whether it is already streaming (which suppresses the
 * warning), and the timeout to wait before showing it.
 * Out: nothing — only calls `setShowSlowWarning`.
 * What can go wrong: the timer must be cleared on every dependency change (the returned cleanup
 * does this) or a stale warning from a cancelled Ask could fire after a new one starts.
 */
export function useSlowResponseWarningTimer({
  isAsking,
  isStreamingPreview,
  effectiveLatencyWarningSeconds,
  setShowSlowWarning,
}: UseSlowResponseWarningTimerArgs): void {
  useEffect(() => {
    if (!isAsking) {
      setShowSlowWarning(false);
      return;
    }
    if (isStreamingPreview) {
      setShowSlowWarning(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowWarning(true), effectiveLatencyWarningSeconds * 1000);
    return () => clearTimeout(timer);
  }, [isAsking, isStreamingPreview, effectiveLatencyWarningSeconds]);
}

export type UseUnifiedInputPersistenceArgs = {
  unifiedInput: string;
  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  filteredSettingsCount: number;
  setUnifiedInput: (value: string) => void;
  clearAskCameFromMicRef: React.MutableRefObject<() => void>;
};

/*
 * In: the typed text, the persistence mode setting, and how many Steam settings currently match
 * it (search-only persistence writes nothing when nothing matched).
 * Out: nothing — only calls `persistSearchQuery` and, on a mode change that should clear the
 * box, `setUnifiedInput("")`.
 * What can go wrong: the previous-mode ref must be updated every render this effect runs, even
 * when nothing else in it fires, or the next mode change compares against a stale value.
 */
export function useUnifiedInputPersistence({
  unifiedInput,
  unifiedInputPersistenceMode,
  filteredSettingsCount,
  setUnifiedInput,
  clearAskCameFromMicRef,
}: UseUnifiedInputPersistenceArgs): void {
  useEffect(() => {
    if (unifiedInputPersistenceMode === "persist_all") {
      persistSearchQuery(unifiedInput);
      return;
    }
    if (unifiedInputPersistenceMode === "persist_search_only") {
      if (filteredSettingsCount > 0) {
        persistSearchQuery(unifiedInput);
      } else {
        persistSearchQuery("");
      }
      return;
    }
    persistSearchQuery("");
  }, [unifiedInput, unifiedInputPersistenceMode, filteredSettingsCount]);

  const unifiedInputPersistenceModePrevRef = useRef<typeof unifiedInputPersistenceMode | null>(null);
  useEffect(() => {
    const prev = unifiedInputPersistenceModePrevRef.current;
    unifiedInputPersistenceModePrevRef.current = unifiedInputPersistenceMode;
    if (shouldClearUnifiedInputForPersistenceMode(prev, unifiedInputPersistenceMode)) {
      setUnifiedInput("");
      clearAskCameFromMicRef.current();
    }
  }, [unifiedInputPersistenceMode]);
}
