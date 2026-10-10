/**
 * Title: The + and the delete icon at the two ends of the chat's name row
 *
 * Purpose: Two quick actions on the row in Decky's title bar (plan 87 F5, the maintainer's call 2 of
 * 2026-10-09): a + before the chat's name that starts a new chat, and a delete icon after it that opens the
 * usual "Delete chat?" box for the open chat. Icons only, no words; each has a spoken name ("New chat",
 * "Delete chat"). The chats menu keeps both of its own actions.
 *
 * Each is a stop for Steam's ring, reached by Left and Right from the name (the name's handlers are in
 * ChatTitleView.tsx):
 *   +       Right -> the name. Left -> Steam's own, onto Decky's back arrow (as from the name before).
 *   delete  Left -> the name. Right holds (nothing of bonsAI lies to the right).
 *   both    Up -> the tab bar, Down -> the chat's first stop, LB and RB -> the previous or next tab
 *           (chatRowMoves.ts, the same as the name); A or a tap does the icon's job; B returns the ring to
 *           the name (claimed with preventDefault, or Decky's own B would leave bonsAI).
 *
 * The delete icon is greyed, and A on it does nothing, at the new-chat spot, as the menu's Delete chat is.
 * It is still a stop, so the walk never has a hole.
 *
 * Used for: ChatTitleView.tsx.
 *
 * Does not: Make a chat or open a box (chatRowActions.ts holds the Main tab's calls, useChatRowActions.ts
 * builds them), or decide how wide it is (chatTitleStyles.ts).
 */
import React, { useEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";

import type { NavRefHolder } from "../../utils/navFocusRegistry";
import { takeChatNameFocus } from "./chatNameNav";
import { getChatRowActions } from "./chatRowActions";
import {
  registerChatIconNav,
  rememberChatIconElement,
  unregisterChatIconNav,
  type ChatIconKind,
} from "./chatRowIconNav";
import { rowVerticalMoves, switchTabFromRow } from "./chatRowMoves";
import { ChatsMenuIcon } from "./chatsMenuIcons";

const LABELS: Record<ChatIconKind, string> = { new: "New chat", delete: "Delete chat" };

/** A or a tap: the icon's job, from the Main tab's calls (nothing while the Main tab is not drawn). */
function press(kind: ChatIconKind): void {
  const actions = getChatRowActions();
  if (kind === "new") actions?.newChat();
  else actions?.deleteChat();
}

/**
 * In: which icon, whether it is greyed, and whether the tab bar is in the strip above (Down and Up differ).
 * Out: the stop. Can go wrong: Steam fills the nav node a moment after mounting, so a transfer onto it just
 * after it appears may report false; callers fall back to Steam's own move.
 */
export function ChatRowIcon({ kind, off, strip }: { kind: ChatIconKind; off: boolean; strip: boolean }): React.ReactElement {
  /* Kept here, not in the row, so it starts over whenever the stop is drawn again. */
  const [ringOn, setRingOn] = useState(false);
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    const holder = navRef as NavRefHolder;
    registerChatIconNav(kind, holder);
    return () => unregisterChatIconNav(kind, holder);
  }, [kind]);
  const act = () => {
    if (!off) press(kind);
  };
  const sideways =
    kind === "new"
      ? { onMoveRight: () => takeChatNameFocus() }
      : { onMoveLeft: () => takeChatNameFocus(), onMoveRight: () => true };
  return (
    <Focusable
      /* Static on purpose: Steam puts its own `gpfocus` marker in this class attribute, and React rewriting
         the attribute for a state change would wipe it. The ring and the greyed look are data attributes. */
      className={`bonsai-chat-title__icon bonsai-chat-title__icon--${kind}`}
      data-ring={ringOn ? "true" : undefined}
      data-off={off ? "true" : undefined}
      ref={(el: HTMLElement | null) => rememberChatIconElement(kind, el)}
      aria-label={LABELS[kind]}
      role="button"
      onFocus={() => setRingOn(true)}
      onBlur={() => setRingOn(false)}
      /* A, or a tap: onOKButton for A and onClick for a finger, never onActivate as well (Steam fires it
         for A too, and the action would run twice: docs/focus-graph.md, "From the notes"). */
      onOKButton={act}
      onClick={act}
      {...({
        navRef,
        /* Its child is a picture, not text: without this Steam treats it as an empty container and skips it. */
        focusable: true,
        /* The view draws its own white ring (chatTitleStyles.ts); Steam's would sit on top of it. */
        noFocusRing: true,
        ...rowVerticalMoves(strip),
        ...sideways,
        onButtonDown: switchTabFromRow,
        /* B returns the ring to the name. Claimed always: B is otherwise Decky's, and goes back to its list. */
        onCancelButton: (e: unknown) => {
          takeChatNameFocus();
          (e as { preventDefault?: () => void })?.preventDefault?.();
        },
      } as Record<string, unknown>)}
    >
      <ChatsMenuIcon action={kind} />
    </Focusable>
  );
}
