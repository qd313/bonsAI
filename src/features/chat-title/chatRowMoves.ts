/**
 * Title: The moves the stops on the chat's name row share
 *
 * Purpose: The name, the + and the delete icon all sit in one row in Decky's title bar and share the same
 * way out: Up to the tab bar, Down to the chat's first stop, LB and RB to the previous or next tab. They
 * are written once here so the three stops cannot drift apart. Every one is Steam's transfer onto a
 * registered nav node (AGENTS.md, "The Steam Deck focus graph"), never a plain `focus()`.
 *
 * Used for: ChatTitleView.tsx (the name), ChatRowIcons.tsx (the + and the delete icon).
 *
 * Does not: Decide Left and Right (each stop has its own, and they are what the row is about), or draw.
 */
import { isBumperLeftDeckEvent, isBumperRightDeckEvent } from "../../utils/focusNavigation";
import { takeNavFocus } from "../../utils/navFocusRegistry";
import { neighbourTab } from "../plugin-shell/tabBarNav";
import { getChatTitleState, setChatsMenuOpen, takeChatFirstStop } from "./chatTitleStore";

/**
 * LB or RB on a stop in the row: the tab before or after, wrapping, as on the tab bar. The ring goes to the
 * tab bar first: the other tabs draw no name row, so the ring would otherwise be left on a control that is
 * gone. False (left to Steam) for any other button, or before the plugin root has handed the tab bar over.
 */
export function switchTabFromRow(evt: unknown): boolean {
  const step = isBumperLeftDeckEvent(evt) ? -1 : isBumperRightDeckEvent(evt) ? 1 : 0;
  const { tab, tabBar } = getChatTitleState();
  if (step === 0 || !tabBar || tab === null) return false;
  const next = neighbourTab(tabBar.tabIds, tab, step);
  if (next === null || next === tab) return true;
  setChatsMenuOpen(false);
  takeNavFocus("tab-bar");
  tabBar.selectTab(next);
  return true;
}

/**
 * Up and Down from a stop in the row. An open chats menu closes as the ring goes, so it is never left open
 * behind the ring. With the bar in the strip, Down enters the chat itself and Up is the bar; otherwise the
 * bar is right below and Up is Steam's own.
 */
export function rowVerticalMoves(strip: boolean): Record<string, () => boolean> {
  return {
    onMoveDown: () => {
      setChatsMenuOpen(false);
      return strip ? takeChatFirstStop() : takeNavFocus("tab-bar");
    },
    ...(strip
      ? {
          onMoveUp: () => {
            setChatsMenuOpen(false);
            return takeNavFocus("tab-bar");
          },
        }
      : {}),
  };
}
