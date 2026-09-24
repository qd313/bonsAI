/**
 * Title: Developer tab one-off actions
 *
 * Purpose: Two actions the Developer tab triggers that do not belong to any more specific
 * hook: jumping to the Steam Input lexicon entry for phase 1's per-game controller config, and
 * installing the seed knowledge base copy onto local storage.
 *
 * Used for: `index.tsx`'s `useDeveloperTabPayload` call.
 *
 * Solves: Nothing new — the same two callbacks `Content` used to declare inline, moved out as a
 * tight, related pair (both are Developer-tab-only, one-shot actions with no state of their
 * own).
 *
 * Does not: Draw the Developer tab, or decide which lexicon entries exist — `steam-input-
 * lexicon.ts` and `DeveloperTab` do that.
 */
import { useCallback } from "react";
import { call, toaster } from "@decky/api";

import { getSteamInputLexiconEntry } from "../../data/steam-input-lexicon";
import { jumpToSteamInputEntry } from "../../utils/steamInputJump";
import { SEED_KB_SOURCE_DIR } from "../../data/knowledgeBaseDev";
import type { usePluginSettings } from "../../hooks/usePluginSettings";

type PluginSettings = ReturnType<typeof usePluginSettings>;

export type UseDeveloperToolActionsArgs = {
  syncSettingsFromDisk: PluginSettings["syncSettingsFromDisk"];
};

export type DeveloperToolActions = {
  onSteamInputPhase1Jump: () => void;
  installSeedKnowledgeBase: () => Promise<void>;
};

/*
 * In: `syncSettingsFromDisk`, the one thing `installSeedKnowledgeBase` needs from the rest of
 * Content, to pick up the corpus path and version the install just wrote.
 * Out: both actions, ready for `useDeveloperTabPayload`.
 * What can go wrong: `installSeedKnowledgeBase`'s backend call is deliberately not raced against
 * any UI timeout (see the inline comment) — copying the seed corpus to Deck storage can outrun
 * one.
 */
export function useDeveloperToolActions({
  syncSettingsFromDisk,
}: UseDeveloperToolActionsArgs): DeveloperToolActions {
  const onSteamInputPhase1Jump = useCallback(() => {
    const entry = getSteamInputLexiconEntry("phase1_per_game_controller_config");
    if (!entry) {
      toaster.toast({ title: "Steam Input", body: "Lexicon entry missing.", duration: 3500 });
      return;
    }
    const result = jumpToSteamInputEntry(entry);
    if (result.ok) {
      toaster.toast({
        title: "Steam Input jump",
        body: `${result.confidenceLabel}: ${result.method} → ${result.detail}`,
        duration: 4000,
      });
    } else {
      const hint = entry.breadcrumb.length ? ` ${entry.breadcrumb[0]}` : "";
      toaster.toast({ title: "Steam Input jump", body: `${result.reason}${hint}`, duration: 6000 });
    }
  }, []);

  const installSeedKnowledgeBase = useCallback(async () => {
    // Deliberately unwrapped: installing a corpus copies the whole seed knowledge
    // base to disk, which can outrun any UI deadline on Deck storage.
    const out = await call<
      [{ source_dir: string }],
      { ok?: boolean; error?: string; install_path?: string; version?: string }
    >("install_rag_corpus_local", { source_dir: SEED_KB_SOURCE_DIR });
    if (!out?.ok) {
      toaster.toast({
        title: "Seed KB install failed",
        body: out?.error ?? "Could not install seed knowledge base.",
        duration: 10000,
      });
      return;
    }
    await syncSettingsFromDisk();
    toaster.toast({
      title: "Seed knowledge base installed",
      body: `${out.version ?? "seed"} → ${out.install_path ?? "~/.bonsai/rag"}`,
      duration: 6000,
    });
  }, [syncSettingsFromDisk]);

  return { onSteamInputPhase1Jump, installSeedKnowledgeBase };
}
