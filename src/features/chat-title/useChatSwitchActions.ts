/**
 * Title: Previous chat and next chat, in the old row's order
 *
 * Purpose: The two moves LT and RT make (and, later, anything else that steps through the chats): one
 * chat towards the newest, or one towards the oldest, with the new-chat spot before the newest. They
 * are the saved-chats row's LB and RB, unchanged: the list is the back end's own order (newest first),
 * the ends do not wrap, and stepping onto the new-chat spot only shows it (an empty chat that becomes a
 * saved one when the first question is asked, MainTab.tsx's `onAskOllama`), without switching away
 * from the chat underneath.
 *
 * Used for: MainTab.tsx, which publishes the moves through the chat title store, where LT and RT
 * (useChatTriggerSwitch.ts) and the name in Decky's bar reach them.
 *
 * Solves: The moves must keep one identity for the Main tab's whole life (a new pair each render would
 * wake the name in Decky's bar on every streamed word), yet always act on the newest list and the
 * newest open chat. They read both through a ref that every render refreshes.
 *
 * Does not: Decide whether a press is allowed (useChatTriggerSwitch.ts refuses it while the menu or a
 * box is open, or off the Main tab). Does not move Steam's ring.
 */
import { useRef } from "react";

import type { ChatListRow } from "../chat-sum-up/chatSumUpModel";
import type { ChatTitleActions } from "./chatTitleStore";
import { chatPlace } from "./useChatTitlePublisher";

export type ChatSwitchSource = {
  summaries: readonly ChatListRow[] | undefined;
  activeSlotId: string | null | undefined;
  atCreate: boolean;
  setAtCreate: (atCreate: boolean) => void;
  onSelectSlot: ((slotId: string | null) => Promise<void>) | undefined;
  /** Steam's ring onto the chat's first stop; false until the caller has one (plan 84 step 5). */
  takeFirstStop?: () => boolean;
};

/**
 * The old row's order, as positions: 0 is the new-chat spot, 1 to `count` the saved chats newest
 * first. In: where the open chat is, how many chats there are, and which way. Out: the position to go
 * to, or null at an end (no wrap, as on the old row).
 */
export function chatSwitchStep(position: number, count: number, step: -1 | 1): number | null {
  const to = position + step;
  return to < 0 || to > count ? null : to;
}

/**
 * In: the Main tab's chat list, open chat, new-chat-spot flag and the select call. Out: the store's
 * actions, one object for the caller's whole life.
 *
 * 1. Work out where the open chat is (`chatPlace`); a chat not in the list yet counts as the
 *    new-chat spot, so RT still reaches the newest chat.
 * 2. Step one way (`chatSwitchStep`); at an end, nothing happens.
 * 3. Onto the new-chat spot: only show it. Onto a saved chat: leave the spot and select the chat,
 *    unless it is the one already underneath, which needs no reload.
 */
export function useChatSwitchActions(source: ChatSwitchSource): ChatTitleActions {
  const latest = useRef(source);
  latest.current = source;
  const actions = useRef<ChatTitleActions | null>(null);
  if (!actions.current) {
    const go = async (step: -1 | 1): Promise<void> => {
      const s = latest.current;
      const list = s.summaries ?? [];
      const from = chatPlace(list, s.activeSlotId, s.atCreate) ?? 0;
      const to = chatSwitchStep(from, list.length, step);
      if (to === null) return;
      if (to === 0) {
        s.setAtCreate(true);
        return;
      }
      s.setAtCreate(false);
      const target = list[to - 1]!;
      if (target.id !== s.activeSlotId) await s.onSelectSlot?.(target.id);
    };
    actions.current = {
      previous: () => go(-1),
      next: () => go(1),
      takeFirstStop: () => latest.current.takeFirstStop?.() ?? false,
    };
  }
  return actions.current;
}
