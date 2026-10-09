/**
 * Title: bonsAI's own part of Decky's title bar: the chat's name, and the tab bar above it
 *
 * Purpose: What bonsAI draws in its one spot in Decky's title bar, to the right of Decky's back
 * arrow (plan 84 steps 5 and 6, the drawing's frame "Z", round eight's pick X1). On the Main tab: the
 * open chat's name, centred on the panel's centre line, with a small menu arrow after it, and under it
 * a small line "LT chat 2 of 5 RT" ("not saved yet" for a new chat nothing has been asked in), with an
 * empty space on the right as wide as the back arrow and its gap, so the two sides balance. Above it,
 * in the 20 points that were Steam's empty strip and the top of Decky's padding, bonsAI's tab bar
 * (TitleTabStrip.tsx), once Decky's bar has been reshaped for it (deckyHeaderShape.ts, which this view
 * applies on mount, follows to the tab showing, and undoes on unmount). Off the Main tab the name row
 * is not drawn and Decky's back arrow is hidden, so Decky's bar is the strip alone. When Decky's bar is
 * not the shape step 6 expects, nothing of Decky's is changed: the bar stays in bonsAI's own box as
 * before, and the other tabs show the plain "bonsAI" wordmark here.
 *
 * The name is a stop for Steam's ring. While the ring is on it, LT and RT light up (they are dimmed
 * the rest of the time), a white ring is drawn round the name, and a name too long for its room
 * slides once to show the rest (ChatNameWords.tsx).
 *
 * Used for: `definePlugin`'s `titleView` in index.tsx. Decky draws it outside bonsAI's own box, in a
 * part of the page bonsAI's providers do not reach, so everything it shows comes from chatTitleStore.ts
 * and every rule it is drawn with comes from its own `<style>` (chatTitleStyles.ts, TitleTabStrip.tsx).
 *
 * Solves: The saved-chats row at the top of the chat took 54 points of the answer's height and the tab
 * bar 24 more; the chat's name moves into Decky's bar, and the tab bar into the strip above it.
 *
 * Does not: Switch chats or draw the chats menu: switching is the Main tab's, reached through the store,
 * and the menu is drawn in bonsAI's own box (ChatsMenu.tsx); A or a tap on the name only says "open"
 * or "close" through the store. Does not scale with bonsAI's UI-size setting (see chatTitleStyles.ts).
 *
 * Focus (docs/focus-graph.md, "The chat's name and the chats menu (plan 84 step 5)" and "The tab bar in
 * Steam's strip (plan 84 step 6)"), with the bar in the strip:
 *   Up    -> the tab bar, by Steam's transfer; an open chats menu closes as the ring goes
 *   Down  -> the chat's first stop (the Main tab's own action); an open chats menu closes
 *   Left  -> Steam's own move, onto Decky's back arrow beside it (the same bar, one container)
 *   Right -> holds still: nothing of bonsAI lies to the right of the name
 *   LB/RB -> the previous or next tab; the ring goes to the tab bar first (the name is not drawn there)
 *   A, tap -> opens the chats menu, which takes the ring onto the open chat; again closes it
 *   B     -> with the menu open, closes it; otherwise Decky's own (back to its plugin list)
 * With the bar in bonsAI's box (Decky's bar not as expected): Up is Steam's own and Down goes to the
 * tab bar, right below, as in step 5.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";

import { isBumperLeftDeckEvent, isBumperRightDeckEvent } from "../../utils/focusNavigation";
import { takeNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { neighbourTab } from "../plugin-shell/tabBarNav";
import { ChatNameWords } from "./ChatNameWords";
import { registerChatNameNav, rememberChatNameElement, unregisterChatNameNav } from "./chatNameNav";
import { CHAT_TITLE_CSS } from "./chatTitleStyles";
import {
  getChatTitleState,
  setChatsMenuOpen,
  takeChatFirstStop,
  useChatTitleState,
  type ChatTitleChat,
} from "./chatTitleStore";
import { releaseDeckyHeaderShape, syncDeckyHeaderShape, useTopStripActive } from "./deckyHeaderShape";
import { rememberChatTitleRoot } from "./deckyTitleParts";
import { useNameRowBalance } from "./nameRowBalance";
import { TITLE_TAB_STRIP_CSS, TitleTabStrip } from "./TitleTabStrip";

/** The small line under the name: "chat 2 of 5", or "not saved yet" for a new chat. */
export function chatCountLine(chat: Pick<ChatTitleChat, "unsaved" | "place" | "count">): string {
  return chat.unsaved || chat.place < 1 ? "not saved yet" : `chat ${chat.place} of ${chat.count}`;
}

/** The menu arrow after the name (the drawing's `ICON.down`). */
function CaretIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** A or a tap on the name: open the chats menu, or close it when it is open (the ring is on the name then). */
function toggleChatsMenu(): void {
  setChatsMenuOpen(!getChatTitleState().menuOpen);
}

/**
 * LB or RB on the name: the tab before or after, wrapping, as on the tab bar. The ring goes to the tab bar
 * first: the other tabs draw no name, so the ring would otherwise be left on a control that is gone.
 * False (left to Steam) for any other button, or before the plugin root has handed the tab bar over.
 */
function switchTabFromName(evt: unknown): boolean {
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
 * In: the open chat as the store has it, the measured empty space for the right, and whether the menu
 * is open. Out: the name row, its one stop wired as the file header lists. Can go wrong: Steam fills the
 * nav node a moment after mounting, so a transfer onto the name just after it appears may report false;
 * callers retry or fall back.
 */
function ChatNameRow({
  chat,
  balance,
  menuOpen,
  strip,
}: {
  chat: ChatTitleChat;
  balance: number;
  menuOpen: boolean;
  /** The tab bar is in the strip above the name (plan 84 step 6), not in bonsAI's box below it. */
  strip: boolean;
}) {
  /* Kept here, not on the root, so it starts over whenever the row is drawn again. */
  const [ringOn, setRingOn] = useState(false);
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    const holder = navRef as NavRefHolder;
    registerChatNameNav(holder);
    return () => unregisterChatNameNav(holder);
  }, []);
  const count = chatCountLine(chat);
  return (
    <div className={`bonsai-chat-title__row${ringOn ? " bonsai-chat-title__row--ring" : ""}`}>
      <Focusable
        className="bonsai-chat-title__name"
        ref={(el: HTMLElement | null) => rememberChatNameElement(el)}
        aria-label={`${chat.name}, ${count}. Opens your chats`}
        aria-expanded={menuOpen}
        onFocus={() => setRingOn(true)}
        onBlur={() => setRingOn(false)}
        /* A on the name, or a tap (onOKButton for A, onClick for a finger; never onActivate as well,
           which Steam fires for A too and would toggle twice: docs/focus-graph.md, "From the notes"). */
        onOKButton={toggleChatsMenu}
        onClick={toggleChatsMenu}
        {...({
          navRef,
          /* Its children are plain text, so without this Steam treats it as an empty container and
             skips it (the old saved-chats row measured that on 2026-08-30). */
          focusable: true,
          /* The view draws its own white ring (chatTitleStyles.ts); Steam's would sit on top of it. */
          noFocusRing: true,
          onMoveRight: () => true,
          /* An open menu the ring had left (a tap that opened it, then the ring came back here) closes
             as the ring goes, so it never stays open behind the ring. With the bar in the strip, Down
             enters the chat itself and Up is the bar; otherwise the bar is right below and Up is Steam's. */
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
          onButtonDown: switchTabFromName,
          /* B with the menu open closes it and keeps the ring here. Claimed only then: otherwise B is
             Decky's, and goes back to its plugin list. */
          ...(menuOpen
            ? {
                onCancelButton: (e: unknown) => {
                  setChatsMenuOpen(false);
                  (e as { preventDefault?: () => void })?.preventDefault?.();
                },
              }
            : {}),
        } as Record<string, unknown>)}
      >
        <span className="bonsai-chat-title__line">
          <span className="bonsai-chat-title__spacer" aria-hidden="true" />
          <ChatNameWords text={chat.name} ringOn={ringOn} />
          <i className="bonsai-chat-title__caret" aria-hidden="true">
            <CaretIcon />
          </i>
        </span>
        <span className="bonsai-chat-title__sub">
          <span className="bonsai-chat-title__key">LT</span>
          <span className="bonsai-chat-title__count">{count}</span>
          <span className="bonsai-chat-title__key">RT</span>
        </span>
      </Focusable>
      <span className="bonsai-chat-title__mirror" style={{ width: balance }} aria-hidden="true" />
    </div>
  );
}

/** The plain wordmark the other tabs show. No version beside it since plan 84: that is the About tab's. */
function Wordmark() {
  return <span className="bonsai-chat-title__wordmark">bonsAI</span>;
}

/**
 * In: nothing; everything comes from the store. Out: the name row on the Main tab once the Main tab
 * has said which chat is open; with the bar in the strip, the bar too, and nothing else off the Main
 * tab; with the bar in bonsAI's box, the wordmark off the Main tab.
 *
 * The name row comes before the bar in the page: the bar is placed at the top by the stylesheet, and
 * Steam walks Decky's bar in page order, so Right from Decky's back arrow reaches the name, not the bar
 * (the Deck, 2026-10-08: with the bar first, Right from the arrow went to the bar).
 */
export function ChatTitleView(): React.ReactElement {
  const s = useChatTitleState();
  const strip = useTopStripActive();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chat = s.tab === "main" ? s.chat : null;
  const balance = useNameRowBalance(rootRef, chat !== null);

  /* Decky's bar follows the tab showing; Decky's own parts are put back when this view goes away. */
  useLayoutEffect(() => syncDeckyHeaderShape(s.tab), [s.tab]);
  useLayoutEffect(() => () => releaseDeckyHeaderShape(), []);

  const classes = ["bonsai-chat-title"];
  if (chat) classes.push("bonsai-chat-title--main");
  if (chat && s.menuOpen) classes.push("bonsai-chat-title--menu-open");
  if (strip) classes.push("bonsai-chat-title--strip");
  /* The character's lit colour, for the menu arrow and for the tab bar in the strip, which reads the same
     variable bonsAI's box sets for it there (tabIndicatorBar.ts). */
  const style = s.litColor
    ? ({ "--bonsai-chat-title-lit": s.litColor, "--bonsai-ui-tab-lit": s.litColor } as React.CSSProperties)
    : undefined;
  const wordmark = !chat && !(strip && s.tab !== null && s.tab !== "main");
  return (
    <div
      ref={(el: HTMLDivElement | null) => {
        rootRef.current = el;
        rememberChatTitleRoot(el);
      }}
      className={classes.join(" ")}
      style={style}
    >
      <style>{strip ? CHAT_TITLE_CSS + TITLE_TAB_STRIP_CSS : CHAT_TITLE_CSS}</style>
      {chat ? <ChatNameRow chat={chat} balance={balance} menuOpen={s.menuOpen} strip={strip} /> : null}
      {wordmark ? <Wordmark /> : null}
      {strip && s.tabBar ? <TitleTabStrip tab={s.tab} bar={s.tabBar} /> : null}
    </div>
  );
}
