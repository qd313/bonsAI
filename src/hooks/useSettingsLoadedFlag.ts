/**
 * Title: Re-render once the plugin's saved settings have finished loading
 *
 * Purpose: Reads settingsLoadedSignal.ts's flag and re-renders the caller the one time it flips
 * from false to true, without index.tsx having to thread that value down as a prop.
 *
 * Used for: OllamaWhereAiRunsSection.tsx, whose automatic connection check must wait for real
 * settings (see settingsLoadedSignal.ts for why this exists instead of a prop).
 *
 * Does not: write the flag — only usePluginSettings.ts does that, once, when its own load effect
 * settles.
 */
import { useEffect, useState } from "react";
import { peekSettingsLoaded, subscribeSettingsLoaded } from "../features/plugin-shell/settingsLoadedSignal";

export function useSettingsLoadedFlag(): boolean {
  const [loaded, setLoaded] = useState(peekSettingsLoaded);
  useEffect(() => {
    if (loaded) return;
    return subscribeSettingsLoaded(() => setLoaded(true));
  }, [loaded]);
  return loaded;
}
