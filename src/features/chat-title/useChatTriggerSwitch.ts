/**
 * Title: LT and RT switch chats
 *
 * Purpose: While the Main tab is showing, the left trigger (LT) opens the chat before the open one and
 * the right trigger (RT) the chat after it, in the saved-chats row's own order: the list newest first,
 * with the new-chat spot before the newest. The ends do not wrap: LT on the new-chat spot and RT on the
 * oldest chat do nothing, as LB and RB did on the old row. The chat's name in Decky's bar shows them as
 * "LT chat 2 of 5 RT".
 *
 * Used for: MainTab.tsx, while the Main tab is drawn. The two moves themselves are the Main tab's
 * (useChatSwitchActions.ts), reached through the chat title store.
 *
 * Solves: Plan 84 § 4, test A (2026-10-08): the Deck passes L2 and R2 to the plugin as gamepad buttons 7
 * and 8, both on the control the ring is on and as `vgp_onbuttondown` at the panel's own document,
 * wherever the ring is, and Steam's menu does nothing of its own with them.
 *
 * Why one listener on the panel's document, not a handler on each control: the triggers have to work
 * from anywhere on the Main tab, including from the chat's name, which Decky draws in its own title bar
 * where bonsAI owns no container, and from every control of the chat, the chips and the question box.
 * A handler per control would need one on each of them (and on controls that do not exist yet), and
 * the measurement showed the document hears every press first. The document is the panel's own,
 * through uiDocument.ts, never the global one, which under Decky is an empty shell page.
 *
 * Does not: Switch while the chats menu or a box that asked for the ring back (rename, save, the
 * character picker and the rest, modalReturnFocusRegistry.ts) is open, or on any tab but Main. Does not read any other button: the bumpers, A, B and the
 * D-pad pass by untouched, and nothing is prevented or stopped.
 *
 * Gotchas:
 * - Switching chats replaces the chat on screen. When the ring was on part of the old chat (an answer,
 *   a question), that control is gone with it, so the ring is handed to the question box rather than
 *   left nowhere. A ring on the name, the chips or the box stays where it is.
 */
import { useEffect } from "react";

import { peekModalReturnFocus } from "../plugin-shell/modalReturnFocusRegistry";
import { isTriggerLeftDeckEvent, isTriggerRightDeckEvent } from "../../utils/focusNavigation";
import { takeNavFocus } from "../../utils/navFocusRegistry";
import { getUiDocument, uiGamepadFocusElement } from "../../utils/uiDocument";
import { getChatTitleState } from "./chatTitleStore";

/** The triggers are refused now: another tab, the menu open, or a box open. */
function chatTriggersRefused(): boolean {
  const s = getChatTitleState();
  return s.tab !== "main" || s.menuOpen || peekModalReturnFocus() !== null;
}

/** Hand the ring to the question box if the control holding it went away with the old chat. */
function keepTheRingSomewhere(before: HTMLElement | null): void {
  if (!before || before === before.ownerDocument?.body) return;
  const check = () => {
    if (!before.isConnected) takeNavFocus("unified-input");
  };
  window.requestAnimationFrame(check);
  window.setTimeout(check, 150);
}

/**
 * Listens for LT and RT on the panel's own document while the caller is mounted and calls the
 * store's previous or next chat. Mounted by the Main tab only, and checks the tab anyway.
 */
export function useChatTriggerSwitch(): void {
  useEffect(() => {
    const doc = getUiDocument();
    const onButtonDown = (evt: Event) => {
      const left = isTriggerLeftDeckEvent(evt);
      if (!left && !isTriggerRightDeckEvent(evt)) return;
      if (chatTriggersRefused()) return;
      const actions = getChatTitleState().actions;
      if (!actions) return;
      const before = uiGamepadFocusElement();
      void Promise.resolve(left ? actions.previous() : actions.next()).then(() => keepTheRingSomewhere(before));
    };
    doc.addEventListener("vgp_onbuttondown", onButtonDown, true);
    return () => doc.removeEventListener("vgp_onbuttondown", onButtonDown, true);
  }, []);
}
