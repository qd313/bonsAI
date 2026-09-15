/**
 * Title: Keeping the Strategy checklist in step with the running game
 *
 * Purpose: Strategy mode's checklist belongs to whichever game is running,
 * not to the plugin session as a whole. This file notices when the running
 * game changes (checked about every second and a half) and loads that
 * game's own saved checklist from disk. If the person switches out of
 * Strategy mode, it clears the checklist, both on screen and on disk, so
 * an old game's checklist cannot bleed into a different mode.
 *
 * Used for: useBonsaiAskOrchestration, for the checklist shown under
 * Strategy mode.
 *
 * Solves: Keeps the checklist correct across switching games and
 * reopening the plugin, without tangling that bookkeeping into the code
 * that actually sends and checks on Ask answers.
 *
 * Does not: Draw the checklist on screen, or build what gets sent to the
 * back end when a box is checked — see the shared checklist helpers for
 * both.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Router } from "@decky/ui";

import type { AskModeId } from "../data/bonsaiSettingsSchema";
import type { StrategyChecklistState } from "../types/bonsaiUi";
import {
  clearStrategyChecklistSession,
  loadStrategyChecklistSession,
} from "../utils/strategyChecklistPersistence";
import { peekBonsaiSessionPendingRestore } from "../utils/bonsaiSessionSurvival";

export function useStrategyChecklistSession(askMode: AskModeId) {
  const survivalPeek = peekBonsaiSessionPendingRestore();
  const [strategyChecklist, setStrategyChecklist] = useState<StrategyChecklistState | null>(
    () => survivalPeek?.strategyChecklist ?? null,
  );
  const strategyChecklistRef = useRef<StrategyChecklistState | null>(strategyChecklist);
  useEffect(() => {
    strategyChecklistRef.current = strategyChecklist;
  }, [strategyChecklist]);

  const runningAppIdRef = useRef<string>("");

  const hydrateStrategyChecklistFromDisk = useCallback(async (appId: string) => {
    runningAppIdRef.current = appId;
    try {
      const loaded = await loadStrategyChecklistSession(appId);
      if (runningAppIdRef.current !== appId) return;
      setStrategyChecklist(loaded);
    } catch {
      if (runningAppIdRef.current === appId) setStrategyChecklist(null);
    }
  }, []);

  const [trackedRunningAppId, setTrackedRunningAppId] = useState(
    () => Router.MainRunningApp?.appid?.toString() ?? "",
  );
  useEffect(() => {
    const poll = () => {
      const next = Router.MainRunningApp?.appid?.toString() ?? "";
      setTrackedRunningAppId((prev) => (prev !== next ? next : prev));
    };
    poll();
    const id = window.setInterval(poll, 1500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void hydrateStrategyChecklistFromDisk(trackedRunningAppId);
  }, [hydrateStrategyChecklistFromDisk, trackedRunningAppId]);

  const prevAskModeRef = useRef(askMode);
  useEffect(() => {
    const prev = prevAskModeRef.current;
    prevAskModeRef.current = askMode;
    if (prev === "strategy" && askMode !== "strategy") {
      const appId = Router.MainRunningApp?.appid?.toString() ?? "";
      setStrategyChecklist(null);
      void clearStrategyChecklistSession(appId).catch(() => {});
    }
  }, [askMode]);

  return {
    strategyChecklist,
    setStrategyChecklist,
    strategyChecklistRef,
    hydrateStrategyChecklistFromDisk,
    trackedRunningAppId,
  };
}
