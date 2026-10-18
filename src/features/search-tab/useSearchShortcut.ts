/**
 * Title: Y opens the Search tab from the Main tab
 *
 * Purpose: While the Main tab is showing, the Y button opens the Search tab, with the ring on its find box,
 * wherever the ring is on the panel: the question box, a suggestion chip, the chat's name in Decky's bar, an
 * answer. Measured on the Deck (plan 92, M-Y, workshop:test-evidence/plan92-P92-M-Y.json): a Y press reaches the plugin
 * as button 4 at the panel's own document, with the ring on the question box, a chip, the tab bar and an answer's
 * first stop, and Steam does nothing with it (no menu, no keyboard, the ring does not move).
 *
 * Used for: useSearchTabPayload.tsx, which is always mounted at the plugin root and knows the tab showing.
 *
 * Solves: Gives the Search tab a shortcut from the tab people spend their time on. It follows
 * useChatTriggerSwitch.ts: one capture listener on the panel's document (never the global one, which under Decky
 * is an empty shell page), since the press has to work from controls the Main tab does not own (the chat's name in
 * Decky's bar) and from every control of the chat.
 *
 * Does not: Act on any other button, or on any tab but Main. Does not act while the chats menu is open or while a
 * box that asked for the ring back is open (rename, save, the character picker, the models hub and the rest,
 * modalReturnFocusRegistry.ts). Steam's on-screen keyboard has no signal the plugin can read (the question box
 * holds the page's focus whenever the ring is on it, with the keyboard shut), so it is not tested for here: the
 * keyboard takes the controller while it is open, and the Deck row checks that Y then does nothing.
 */
import { useEffect, useRef } from "react";

import { getChatTitleState } from "../chat-title/chatTitleStore";
import { peekModalReturnFocus } from "../../shared/dpad/modalReturnFocusRegistry";
import { isOptionsDeckButtonEvent } from "../../utils/focusNavigation";
import { getUiDocument } from "../../utils/uiDocument";
import { openSearchTab } from "./searchJumpStore";

/**
 * In: the id of the tab showing now.
 * Out: nothing; listens while mounted.
 * Can go wrong: nothing; with no tab switch registered the press does nothing.
 */
export function useSearchShortcut(currentTab: string): void {
  const tab = useRef(currentTab);
  tab.current = currentTab;
  useEffect(() => {
    const doc = getUiDocument();
    const onButtonDown = (evt: Event) => {
      if (!isOptionsDeckButtonEvent(evt)) return;
      if (tab.current !== "main") return;
      if (getChatTitleState().menuOpen || peekModalReturnFocus() !== null) return;
      openSearchTab();
    };
    doc.addEventListener("vgp_onbuttondown", onButtonDown, true);
    return () => doc.removeEventListener("vgp_onbuttondown", onButtonDown, true);
  }, []);
}
