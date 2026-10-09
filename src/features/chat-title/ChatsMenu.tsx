/**
 * Title: The chats menu
 *
 * Purpose: The menu that drops down over the answer when A (or a tap) lands on the chat's name in
 * Decky's bar (plan 84 step 5, the drawing's `chatSheet` and frame "R4"). It covers the answer and
 * stops at the dock's top edge, so the question box stays in view. It lists every saved chat, newest
 * first: the open one with a lit left edge, a green dot on any with a reply waiting, a hollow cyan ring
 * on one still being written, and when each last changed. Under them, five actions: New chat, Rename
 * chat, Sum up this chat, Save to Desktop note and Delete chat (in red). It does everything the
 * saved-chats row at the top of the chat did, and adds Sum up as a second way in to the Session tab's
 * own button.
 *
 * Used for: MainTab.tsx draws it inside the dock while the chat title store says it is open. It is drawn
 * in bonsAI's own box, so it gets bonsAI's styling and focus graph; only the name that opens it sits in
 * Decky's bar.
 *
 * Solves: The saved-chats row took 54 points at the top of every chat; its jobs move here.
 *
 * Does not: Load, switch, rename or delete a chat itself: each action calls exactly what the row called
 * (the Main tab's `onChatSlot*` callbacks, the save window, the Sum up job). Does not decide whether Sum
 * up or Save are allowed: the Session tab's own rules (`sumUpButtonView`) and the row's rules (there is an
 * answer to save; without the permission the window asks for it) do.
 *
 * Focus (docs/focus-graph.md, "The chat's name and the chats menu (plan 84 step 5)"):
 *   - In: Steam's transfer from the name onto the open chat's row (each stop has its own nav node),
 *     retried until it lands, because Steam fills a new node a moment after it mounts.
 *   - Inside: every stop is a sibling in one container, so a move is a plain focus(); the moves
 *     themselves are chatsMenuModel.ts's.
 *   - Out: Up from the first chat, B anywhere, or any action: Steam's transfer back onto the name
 *     (chatNameNav.ts), then the menu closes. An action that opens a box (rename, delete, save) hands
 *     the ring to the name first, and the box gives it back there when it closes.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";

import { findTabContentsScroll } from "../../utils/chatPanelScroll";
import { takeHolderFocus } from "../../utils/chatTranscriptNavHelpers";
import type { NavRefHolder } from "../../utils/navFocusRegistry";
import { elementHasGamepadFocus } from "../../utils/uiDocument";
import { useChatSlotDeleteConfirm } from "../chat-slots/useChatSlotDeleteConfirm";
import { useChatSlotRenameModal } from "../chat-slots/useChatSlotRenameModal";
import { sumUpButtonView, type ChatSumUpState } from "../chat-sum-up/chatSumUpModel";
import {
  rememberModalReturnFocus,
  registerModalReturnFocusOwner,
} from "../plugin-shell/modalReturnFocusRegistry";
import { chatNameElement, takeChatNameFocus } from "./chatNameNav";
import { CHATS_MENU_ACTIONS, chatsMenuMove, chatWhenLabel, type ChatsMenuAction, type MenuDirection } from "./chatsMenuModel";
import { ChatsMenuIcon } from "./chatsMenuIcons";
import { CHATS_MENU_CSS } from "./chatsMenuStyles";
import { setChatsMenuOpen, type ChatTitleChat } from "./chatTitleStore";

export type ChatsMenuProps = {
  /** What the name in Decky's bar shows, with every chat's marks (the chat title store's own copy). */
  chat: ChatTitleChat;
  /** The saved chat underneath; still set while the new-chat spot is showing. */
  activeSlotId: string | null;
  setAtCreate: (atCreate: boolean) => void;
  onSelectSlot?: (slotId: string | null) => Promise<void>;
  onCreateSlot?: () => Promise<unknown>;
  onRenameSlot?: (slotId: string, label: string) => Promise<boolean>;
  onDeleteSlot?: (slotId: string) => Promise<boolean>;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  /** The chat has an answer to save (the row's own rule). */
  canSaveChat: boolean;
  /** Saving is allowed; when not, Save is greyed and its window asks for the permission. */
  saveChatEnabled: boolean;
  onSaveChat?: () => void;
  /** The open chat's Sum up state (the Session tab's), or null. */
  sumUp: ChatSumUpState | null;
  answerInFlight: boolean;
};

/** Steam fills a new stop's nav node a moment after it mounts; the transfer in is retried until then. */
const ENTRY_RETRY_MS = [0, 60, 150, 300, 600];

/** Hand the ring back to the chat's name in Decky's bar, then close the menu. */
function leaveToName(): void {
  takeChatNameFocus();
  setChatsMenuOpen(false);
}

/**
 * In: the chat list as the name row has it, and the Main tab's chat callbacks. Out: the menu, holding
 * Steam's ring from the moment it opens until it closes.
 *
 * 1. Measure the room between the top of the scrolling pane and the dock's top edge, and fill it.
 * 2. Hand the ring in, onto the open chat's row (the first chat at the new-chat spot, New chat with no
 *    chats), retrying until Steam has the stop's node.
 * 3. Walk the stops with chatsMenuModel.ts's moves; B, or Up from the first chat, leaves for the name.
 * 4. A on a chat opens it; A on an action does what the old row did; either way the ring goes back to
 *    the name and the menu closes.
 */
export function ChatsMenu(props: ChatsMenuProps): React.ReactElement {
  const { chat, activeSlotId } = props;
  const chats = chat.chats;
  const atCreate = chat.place === 0;
  const stopEls = useRef<Array<HTMLElement | null>>([]);
  const navs = useRef<NavRefHolder[]>([]);
  const navFor = (i: number): NavRefHolder => (navs.current[i] ??= { current: null });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState<number | null>(null);

  /* 1. Room: CSS cannot know where the dock's top edge is on screen, so it is read once the menu is laid out. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const dock = root?.parentElement;
    const pane = dock ? findTabContentsScroll(dock) : null;
    if (!dock || !pane) return;
    const r = dock.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    if (r > 40) setRoom(Math.floor(r));
  }, []);

  /* 2. In: onto the open chat. */
  const entry = Math.max(0, chats.findIndex((c) => c.current));
  useEffect(() => {
    const target = chats.length > 0 ? entry : 0;
    let done = false;
    const onAStop = () => stopEls.current.some((el) => elementHasGamepadFocus(el));
    const attempt = () => {
      if (done) return;
      if (onAStop()) {
        done = true;
        return;
      }
      takeHolderFocus(navFor(target));
    };
    const frame = window.requestAnimationFrame(attempt);
    const timers = ENTRY_RETRY_MS.map((ms) => window.setTimeout(attempt, ms));
    return () => {
      done = true;
      window.cancelAnimationFrame(frame);
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on opening
  }, []);

  const openRenameModal = useChatSlotRenameModal({
    onBeforeNestedDeckyModal: props.onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose: props.onCompleteNestedDeckyModalClose,
    onRename: props.onRenameSlot ?? (async () => false),
  }).openRenameModal;
  const openDeleteConfirm = useChatSlotDeleteConfirm({
    onBeforeNestedDeckyModal: props.onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose: props.onCompleteNestedDeckyModalClose,
    onDeleteSlot: props.onDeleteSlot ?? (async () => false),
  });

  const sumUpView = sumUpButtonView({ state: props.sumUp, answerInFlight: props.answerInFlight });
  const openLabel = atCreate ? null : chat.name;
  /** Greyed: still a stop, A does nothing. Save without the permission is greyed but still opens its window. */
  const actionOff = (id: ChatsMenuAction): boolean => {
    if (id === "rename" || id === "delete") return atCreate || !activeSlotId;
    if (id === "sumup") return sumUpView.disabled || !props.sumUp;
    if (id === "save") return atCreate || !props.canSaveChat || !props.saveChatEnabled;
    return false;
  };
  const actionInert = (id: ChatsMenuAction): boolean =>
    id === "save" ? atCreate || !props.canSaveChat || !props.onSaveChat : actionOff(id);

  const runAction = (id: ChatsMenuAction) => {
    if (actionInert(id)) return;
    const slotId = activeSlotId!;
    leaveToName();
    if (id === "new") {
      props.setAtCreate(false);
      void props.onCreateSlot?.();
    } else if (id === "rename") {
      openRenameModal(slotId, openLabel ?? "", chatNameElement());
    } else if (id === "delete") {
      openDeleteConfirm(slotId, openLabel ?? "", chatNameElement());
    } else if (id === "save") {
      rememberModalReturnFocus("desktop-note-save");
      registerModalReturnFocusOwner("desktop-note-save", chatNameElement());
      props.onSaveChat?.();
    } else if (id === "sumup") {
      props.sumUp?.startSumUp();
    }
  };

  const openChat = (id: string) => {
    leaveToName();
    props.setAtCreate(false);
    if (id !== activeSlotId) void props.onSelectSlot?.(id);
  };

  /* 3. Moves. */
  const move = useCallback(
    (at: number, dir: MenuDirection): boolean => {
      const m = chatsMenuMove(chats.length, at, dir);
      if (m === "hold") return true;
      if (m === "leave") {
        leaveToName();
        return true;
      }
      stopEls.current[m.to]?.focus();
      return true;
    },
    [chats.length],
  );

  const stopProps = (i: number, onPress: () => void, className: string, label: string) => ({
    className,
    "aria-label": label,
    ref: (el: HTMLElement | null) => {
      stopEls.current[i] = el;
    },
    onOKButton: onPress,
    onClick: onPress,
    ...({
      navRef: navFor(i),
      /* Plain text inside: without this Steam takes it for an empty container and skips it. */
      focusable: true,
      noFocusRing: true,
      onMoveUp: () => move(i, "up"),
      onMoveDown: () => move(i, "down"),
      onMoveLeft: () => move(i, "left"),
      onMoveRight: () => move(i, "right"),
      /* B goes back to the chat; only onCancelButton really keeps Steam from backing out too
         (ContextChipLadder.tsx, measured 2026-08-28). */
      onCancelButton: (e: unknown) => {
        leaveToName();
        (e as { preventDefault?: () => void })?.preventDefault?.();
      },
    } as Record<string, unknown>),
  });

  const style: React.CSSProperties | undefined = room ? { height: room, maxHeight: room } : undefined;
  return (
    <div ref={rootRef} className="bonsai-chats-menu" style={style} role="dialog" aria-label="Your chats">
      <style>{CHATS_MENU_CSS}</style>
      <Focusable className="bonsai-chats-menu__stops">
        <div className="bonsai-chats-menu__heading">Your chats</div>
        {chats.map((c, i) => {
          const when = chatWhenLabel(c.updatedAt);
          const mark = c.writing ? "writing" : c.unread ? "unread" : null;
          return (
            <Focusable
              key={c.id}
              {...stopProps(
                i,
                () => openChat(c.id),
                `bonsai-chats-menu__chat${c.current ? " bonsai-chats-menu__chat--current" : ""}`,
                `${c.label}${c.current ? ", open now" : ""}${mark === "unread" ? ", reply waiting" : mark === "writing" ? ", still writing" : ""}`,
              )}
            >
              <span className="bonsai-chats-menu__label">{c.label}</span>
              {mark ? <span className={`bonsai-chats-menu__mark bonsai-chats-menu__mark--${mark}`} aria-hidden="true" /> : null}
              <span className="bonsai-chats-menu__when">{when}</span>
            </Focusable>
          );
        })}
        <div className="bonsai-chats-menu__actions">
          {CHATS_MENU_ACTIONS.map((a, k) => {
            const label = a.id === "sumup" ? sumUpView.label : a.label;
            const classes = ["bonsai-chats-menu__action", `bonsai-chats-menu__action--${a.id}`];
            if (a.id === "delete") classes.push("bonsai-chats-menu__action--danger");
            if (actionOff(a.id)) classes.push("bonsai-chats-menu__action--off");
            return (
              <Focusable key={a.id} {...stopProps(chats.length + k, () => runAction(a.id), classes.join(" "), label)}>
                <ChatsMenuIcon action={a.id} />
                <span>{label}</span>
              </Focusable>
            );
          })}
        </div>
        <p className="bonsai-chats-menu__hint">B, or the same button again, goes back to the chat.</p>
      </Focusable>
    </div>
  );
}
