/**
 * Title: Handing the Text size step to the places outside the plugin's box
 *
 * Purpose: The plugin's box carries the Text size step as a style on its root. Two kinds of words are
 * drawn outside that box and need it handed over: the chat's name and the tab bar in Decky's title
 * bar (they read it from the title store), and the plain popups opened with Decky's showModal (a
 * confirm box's description, the download notices, the delete box), which sit in SteamOS's shared
 * page, not in the plugin's page. This hook writes the step to both: the store, and the shared
 * page's root element, where every popup inherits it.
 *
 * Used for: index.tsx, once, with the saved Text size.
 *
 * Solves: Plan 89 (S1). A popup's words are written through `textPx`, which reads the variable; a
 * popup with no box of the plugin's own around it (no BonsaiModalScope) found nothing and stayed at
 * Normal on Large.
 *
 * Does not: Touch the plugin's own box (index.tsx puts the step in its style) or any size itself. The
 * variable is removed from the shared page when the plugin goes away.
 */
import { useEffect } from "react";

import { TEXT_SCALE_VAR, textScaleValue } from "./chatTextSize";
import type { ChatTextSize } from "../../features/settings/bonsaiSettingsSchema";
import { setChatTitleTextScale } from "../../features/chats/title/chatTitleStore";

export function usePublishTextScale(size: ChatTextSize): void {
  const value = textScaleValue(size);
  useEffect(() => setChatTitleTextScale(value), [value]);
  useEffect(() => {
    /* The global `document` is SteamOS's shared page: where showModal draws (see utils/uiDocument.ts). */
    const root = document.documentElement;
    root.style.setProperty(TEXT_SCALE_VAR, value);
    return () => {
      root.style.removeProperty(TEXT_SCALE_VAR);
    };
  }, [value]);
}
