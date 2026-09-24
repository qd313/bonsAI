/**
 * Title: Jumping outside the panel
 *
 * Purpose: Two stable callbacks that leave the plugin's own panel entirely -- opening the model
 * policy README in the Steam browser, and opening Steam's own Controller settings page for the
 * keyboard-shortcut setup flow.
 *
 * Used for: `index.tsx`'s Ollama tab payload and Main tab payload.
 *
 * Solves: Nothing new — the same two callbacks `Content` used to declare inline, moved out
 * because neither one needs anything from the rest of `Content` (no closure params at all).
 *
 * Does not: Decide what the README URL or the settings breadcrumb is — `modelPolicy.ts` and
 * `steamSettingsNavigation.ts` do that.
 */
import { useCallback } from "react";
import { toaster } from "@decky/api";
import { Navigation } from "@decky/ui";

import { MODEL_POLICY_README_URL } from "../../data/modelPolicy";
import { getSteamSettingsUrl } from "../../data/steamSettingsNavigation";

type SteamUrlApi = {
  ExecuteSteamURL(url: string): void;
};

export type ExternalNavigationActions = {
  openModelPolicyReadme: () => void;
  onOpenControllerSettingsForShortcut: () => void;
};

/*
 * In: nothing — both actions only reach global Steam APIs and module-level constants.
 * Out: the two callbacks, stable across renders (both are `useCallback(..., [])`).
 * What can go wrong: both wrap their Steam API call in try/catch and fall back to a toast,
 * since `Navigation.NavigateToExternalWeb` and `SteamClient.URL` are Steam's own globals and not
 * guaranteed present in every runtime this panel can be previewed in.
 */
export function useExternalNavigationActions(): ExternalNavigationActions {
  const openModelPolicyReadme = useCallback(() => {
    try {
      Navigation.NavigateToExternalWeb(MODEL_POLICY_README_URL);
    } catch {
      toaster.toast({ title: "README", body: MODEL_POLICY_README_URL, duration: 4000 });
    }
  }, []);

  const onOpenControllerSettingsForShortcut = useCallback(() => {
    try {
      const steamUrlApi = SteamClient.URL as unknown as SteamUrlApi;
      steamUrlApi.ExecuteSteamURL(getSteamSettingsUrl("Settings > Controller"));
      toaster.toast({ title: "Opening settings", body: "Controller", duration: 2000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toaster.toast({ title: "Navigation failed", body: message, duration: 3000 });
    }
  }, []);

  return { openModelPolicyReadme, onOpenControllerSettingsForShortcut };
}
