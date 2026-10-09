/**
 * Title: The chat's name in Decky's title bar
 *
 * Purpose: What bonsAI draws in its one spot in Decky's title bar, to the right of Decky's back
 * arrow (plan 84 step 5, the drawing's frame "Z", round eight's pick X1). On the Main tab: the open
 * chat's name, centred on the panel's centre line, with a small menu arrow after it, and under it a
 * small line "LT chat 2 of 5 RT" ("not saved yet" for a new chat nothing has been asked in), with an
 * empty space on the right as wide as the back arrow and its gap, so the two sides balance. On the
 * other tabs, for now, the plain "bonsAI" wordmark, without the version that used to sit beside it
 * (plan 84 step 7 shows the version in the About tab; step 6 will hide this row on the other tabs).
 *
 * The name is a stop for Steam's ring. While the ring is on it, LT and RT light up (they are dimmed
 * the rest of the time), a white ring is drawn round the name, and a name too long for its room
 * slides once to show the rest (ChatNameWords.tsx).
 *
 * Used for: `definePlugin`'s `titleView` in index.tsx. Decky draws it outside bonsAI's own box, in a
 * React tree of its own, so everything it shows comes from chatTitleStore.ts and every rule it is
 * drawn with comes from its own `<style>` (chatTitleStyles.ts).
 *
 * Solves: The saved-chats row at the top of the chat took 54 points of the answer's height; the
 * chat's name moves into Decky's bar, which was already there and held only the plugin's name.
 *
 * Does not: Switch chats or draw the chats menu: switching is the Main tab's, reached through the store,
 * and the menu is drawn in bonsAI's own box (ChatsMenu.tsx); A or a tap on the name only says "open"
 * or "close" through the store. Does not scale with bonsAI's UI-size setting (see chatTitleStyles.ts).
 *
 * Focus (docs/focus-graph.md, "The chat's name and the chats menu (plan 84 step 5)"):
 *   Left  -> Steam's own move, onto Decky's back arrow beside it (the same bar, one container)
 *   Right -> holds still: nothing of bonsAI lies to the right of the name
 *   Down  -> the tab bar, by Steam's transfer (`takeNavFocus("tab-bar")`): it is right below; an open
 *            chats menu closes as the ring goes
 *   Up    -> Steam's own: nothing lies above yet (step 6 puts the tab strip there)
 *   A, tap -> opens the chats menu, which takes the ring onto the open chat; again closes it
 *   B     -> with the menu open, closes it; otherwise Decky's own (back to its plugin list)
 *
 * Leave room for step 6: the root is one element that can hold a second child above the name row
 * (the tab strip), the tab showing is read from the store, and nothing here depends on how tall
 * Decky's bar is.
 */
import React, { useEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";

import { takeNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { ChatNameWords } from "./ChatNameWords";
import { registerChatNameNav, rememberChatNameElement, unregisterChatNameNav } from "./chatNameNav";
import { CHAT_TITLE_CSS } from "./chatTitleStyles";
import { getChatTitleState, setChatsMenuOpen, useChatTitleState, type ChatTitleChat } from "./chatTitleStore";
import { useNameRowBalance } from "./nameRowBalance";

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
 * In: the open chat as the store has it, the measured empty space for the right, and whether the menu
 * is open. Out: the name row, its one stop wired as the file header lists. Can go wrong: Steam fills the
 * nav node a moment after mounting, so a transfer onto the name just after it appears may report false;
 * callers retry or fall back.
 */
function ChatNameRow({ chat, balance, menuOpen }: { chat: ChatTitleChat; balance: number; menuOpen: boolean }) {
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
             as the ring goes down, so it never stays open behind the ring. */
          onMoveDown: () => {
            setChatsMenuOpen(false);
            return takeNavFocus("tab-bar");
          },
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
 * has said which chat is open, else the wordmark.
 */
export function ChatTitleView(): React.ReactElement {
  const s = useChatTitleState();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chat = s.tab === "main" ? s.chat : null;
  const balance = useNameRowBalance(rootRef, chat !== null);
  const classes = ["bonsai-chat-title"];
  if (chat) classes.push("bonsai-chat-title--main");
  if (chat && s.menuOpen) classes.push("bonsai-chat-title--menu-open");
  const style = s.litColor ? ({ "--bonsai-chat-title-lit": s.litColor } as React.CSSProperties) : undefined;
  return (
    <div ref={rootRef} className={classes.join(" ")} style={style}>
      <style>{CHAT_TITLE_CSS}</style>
      {chat ? <ChatNameRow chat={chat} balance={balance} menuOpen={s.menuOpen} /> : <Wordmark />}
    </div>
  );
}
