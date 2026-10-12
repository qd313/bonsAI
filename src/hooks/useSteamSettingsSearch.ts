/**
 * Title: Opening a Steam settings page from a search match
 * Purpose: Deep-link to a Steam or Quick Access settings page through Router or steam:// URLs, and say so in a toast.
 * Used for: The Search tab's Settings matches (plan 92, lane N3), and the controller shortcut.
 * Solves: One way to open a page, from wherever a settings match is shown. The search itself moved with the card
 *         that used to show it above the Main tab's question box: the Search tab finds settings with
 *         searchModel.ts and the intent packs (utils/intentPackSearch.ts).
 * Does not: Own intent pack data or the page list (data/settingsDatabase.ts, data/steamSettingsNavigation.ts).
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";
import { Navigation } from "@decky/ui";
import { getQamTab, isQamSetting, openSteamSettingsPage } from "../data/steamSettingsNavigation";

export type UseSteamSettingsSearchOptions = {
  setNavigationMessage: Dispatch<SetStateAction<string>>;
};

export function useSteamSettingsSearch({ setNavigationMessage }: UseSteamSettingsSearchOptions) {
  const onSettingClick = useCallback(
    (settingPath: string) => {
      try {
        if (isQamSetting(settingPath)) {
          const qamTab = getQamTab(settingPath);
          Navigation.OpenQuickAccessMenu(qamTab);
          toaster.toast({ title: "Opening QAM", body: settingPath, duration: 2000 });
          setNavigationMessage(`Opened QAM: ${settingPath}`);
          return;
        }

        openSteamSettingsPage(settingPath);
        toaster.toast({ title: "Opening settings", body: settingPath, duration: 2000 });
        setNavigationMessage(`Opened: ${settingPath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toaster.toast({ title: "Navigation failed", body: message, duration: 3000 });
        setNavigationMessage(`Navigation failed: ${message}`);
      }
    },
    [setNavigationMessage],
  );

  return { onSettingClick };
}
