/**
 * Title: Small settings-driven guard effects
 *
 * Purpose: Two independent effects that each undo one piece of state when a setting no longer
 * allows it: bouncing off the Developer tab if it gets hidden while a person is on it, and
 * clearing the strategy guide's branch state whenever Ask mode leaves "strategy".
 *
 * Used for: `index.tsx`, right after the settings and Ask orchestration hooks they read from
 * exist.
 *
 * Solves: Nothing new — the same two effects `Content` used to declare inline, moved out as a
 * tight, adjacent pair (each is a one-line guard with no state of its own).
 *
 * Does not: Decide what strategy mode's branch state means, or draw the Developer tab toggle —
 * `useBonsaiAskOrchestration.ts` and `DeveloperTab`/`SettingsTab` do that.
 */
import { useEffect } from "react";
import { toaster } from "@decky/api";

import type { useBonsaiPluginShell } from "../../hooks/useBonsaiPluginShell";
import type { useBonsaiAskOrchestration } from "../../hooks/useBonsaiAskOrchestration";

type PluginShell = ReturnType<typeof useBonsaiPluginShell>;
type AskOrchestration = ReturnType<typeof useBonsaiAskOrchestration>;

export type UseTabAndModeGuardEffectsArgs = {
  settingsLoaded: boolean;
  showDeveloperTab: boolean;
  currentTab: string;
  setCurrentTab: PluginShell["setCurrentTab"];
  askMode: string;
  setStrategyGuideBranches: AskOrchestration["setStrategyGuideBranches"];
};

/*
 * In: the two settings each guard reacts to, plus the tab/strategy state they read and the
 * setters they call.
 * Out: nothing — both effects only call their setter.
 * What can go wrong: nothing shared between the two — they are independent guards that happen
 * to sit next to each other in Content, not one feature.
 */
export function useTabAndModeGuardEffects({
  settingsLoaded,
  showDeveloperTab,
  currentTab,
  setCurrentTab,
  askMode,
  setStrategyGuideBranches,
}: UseTabAndModeGuardEffectsArgs): void {
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!showDeveloperTab && currentTab === "developer") {
      setCurrentTab("main");
      toaster.toast({ title: "Developer tab hidden", body: "Switched to Main.", duration: 2800 });
    }
  }, [showDeveloperTab, currentTab, settingsLoaded]);

  useEffect(() => {
    if (askMode !== "strategy") {
      setStrategyGuideBranches(null);
    }
  }, [askMode, setStrategyGuideBranches]);
}
