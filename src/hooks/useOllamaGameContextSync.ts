/**
 * Title: Ask-bar footnote game sync
 * Purpose: Keep the Ask-bar footnote's game context (the "Context: <game>" line) in step
 *          with whichever game Steam reports running, on its own timer.
 * Used for: The Ask hook calls this and gets back the one function it also calls directly
 *           elsewhere — before and after an Ask, and whenever a saved snapshot is restored.
 * Solves: The footnote used to only learn about a game change through the Strategy
 *         checklist's own poll (a different feature) or an Ask's status poll landing.
 *         Measured on the Deck: it stayed wrong for minutes in both directions — naming a
 *         game after it was exited, and never naming one that had just launched — while the
 *         panel stayed open the whole time. This hook gives the footnote its own timer.
 * Does not: Decide what to show when nothing is running, or read the survived snapshot —
 *           both stay the caller's job (see askOrchestrationRestore.ts for the mount case).
 * Caution: Lifted out of useBonsaiAskOrchestration on 2026-09-24. It must stay at exactly
 *          this point in the Ask hook's own hook list — React matches hooks by the order
 *          they run, not by name.
 */
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { Router } from "@decky/ui";

import type { OllamaContextUi } from "../types/bonsaiUi";

/**
 * How often the Ask-bar footnote re-checks which game Steam reports as running while this hook
 * stays mounted. Before this poll existed, the footnote only picked up a game change through
 * `trackedRunningAppId` (owned by the Strategy checklist, a different feature) or by restarting
 * the plugin outright — on the Deck the line was measured staying wrong for minutes, in both
 * directions, while the panel never closed (roadmap: "The panel only learns which game is
 * running when it starts, and never again"). A few seconds, not faster: this is cheap but it
 * does not need to be instant.
 */
const GAME_CONTEXT_POLL_MS = 2000;

export type UseOllamaGameContextSyncArgs = {
  /** The Strategy checklist's own tracked app id, used only as a fallback below. */
  trackedRunningAppId: string;
  /** A question in flight: the mid-Ask effect below skips a sync while this is true. */
  isAsking: boolean;
  setOllamaContext: Dispatch<SetStateAction<OllamaContextUi>>;
};

/** Returns the sync function so the caller can also invoke it directly (Ask submit, cancel, restore). */
export function useOllamaGameContextSync(a: UseOllamaGameContextSyncArgs): () => void {
  const { trackedRunningAppId, isAsking, setOllamaContext } = a;

  const syncOllamaContextFromRunningApp = useCallback(() => {
    const running = Router.MainRunningApp;
    const liveAppId = (running?.appid?.toString() ?? "").trim();
    const appId = liveAppId || trackedRunningAppId.trim();
    // Only trust the name next to an id read from Steam in this same call — a name paired with
    // an id that came from the `trackedRunningAppId` fallback instead could name the wrong game.
    const appName = liveAppId ? (running?.display_name ?? "").trim() : "";
    const next: NonNullable<OllamaContextUi> = {
      app_id: appId,
      app_context: appId ? "active" : "none",
      app_name: appName,
    };
    setOllamaContext((prev) => {
      if (
        prev?.app_id === next.app_id &&
        prev?.app_context === next.app_context &&
        (prev?.app_name ?? "") === next.app_name
      ) {
        return prev;
      }
      return next;
    });
  }, [trackedRunningAppId, setOllamaContext]);

  /** Keep Main-tab game context in sync with Steam before/after Asks (not only mid-Ask). */
  useEffect(() => {
    if (isAsking) return;
    syncOllamaContextFromRunningApp();
  }, [trackedRunningAppId, isAsking, syncOllamaContextFromRunningApp]);

  /*
   * Read inside the poll below without restarting its interval on every isAsking flip.
   * `isAsking` itself still gates the effect above so a game changing mid-Ask is picked up the
   * instant the Ask ends, without waiting for this poll's own next tick.
   */
  const isAskingForGameContextPollRef = useRef(isAsking);
  isAskingForGameContextPollRef.current = isAsking;

  /*
   * The footnote's own poll, on its own timer rather than borrowed from `trackedRunningAppId`
   * (the Strategy checklist's poll, a different feature). Measured on the Deck: the footnote
   * stayed wrong for minutes in both directions — naming Hades after it was exited, and never
   * naming Deep Rock Galactic: Survivor after it launched — while the panel stayed open the
   * whole time, so waiting on another feature's timer was not enough on its own. Runs the whole
   * time this hook is mounted and stops the moment it unmounts.
   */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (isAskingForGameContextPollRef.current) return;
      syncOllamaContextFromRunningApp();
    }, GAME_CONTEXT_POLL_MS);
    return () => window.clearInterval(id);
  }, [syncOllamaContextFromRunningApp]);

  return syncOllamaContextFromRunningApp;
}
