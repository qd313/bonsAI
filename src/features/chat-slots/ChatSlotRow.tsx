/**
 * Title: Chat slot row
 *
 * Purpose: The row that always sits at the top of the main tab, above the
 * preset chips. It is a small carousel of your saved chats: press LB/RB (or
 * step the D-pad through it) to flip between them, press A on the middle to
 * rename the current chat, or move onto its × to delete it. Step right past
 * your newest chat to reach [+] and start a new one. Dots below show your
 * recent chats at a glance, and a small dot lights up on any chat that is
 * still generating a reply or has one waiting that you have not read yet.
 *
 * Used for: Drawn by MainTab, directly above the preset row.
 *
 * Solves: A way to switch between named chats without opening a separate
 * picker screen, with its own D-pad path in and out that has been checked
 * on the Deck.
 *
 * Does not: Actually send or receive Ask messages. This only switches which
 * saved chat is showing; useBonsaiAskOrchestration owns talking to the AI.
 *
 * How it works:
 * 1. carouselIndex tracks the on-screen position — 0 is always "[+] new
 *    chat", 1..N are the saved chats — and an effect keeps it in sync with
 *    the real active chat.
 * 2. LB/RB (useChatSlotBumpers) or a D-pad Left/Right step move
 *    carouselIndex and, unless it lands on [+], call onSelectSlot.
 * 3. Pressing A creates a chat from [+], opens the rename modal, or opens
 *    the delete confirmation, depending on where the D-pad currently sits.
 * 4. A layout effect measures whether the title text is wider than its box
 *    and, only while focused, publishes the overflow as a CSS variable so
 *    long titles scroll into view.
 *
 * Gotchas:
 * - Recent chats are ordered newest first, with [+] sitting right next to
 *   whichever chat you were just in. It used to be ordered the other way,
 *   which put "start a new chat" next to your OLDEST chat — so leaving your
 *   current conversation to start a fresh one meant stepping past every
 *   older chat first.
 * - This row's own container needs `focusable: true` set by hand. Steam
 *   skips a row with no plain focusable children inside it, and this row's
 *   children are all plain text — without that flag the D-pad walked
 *   straight past the whole row in both directions.
 * - Up from this row jumps to the tab bar by name rather than letting Steam
 *   find it on its own, because the tab bar's real target is hidden and
 *   cannot be discovered by looking.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ConfirmModal, Focusable, showModal } from "@decky/ui";

import type { ChatSlotSummary } from "../../utils/chatSlotsApi";
import {
  isBumperLeftDeckEvent,
  isBumperRightDeckEvent,
  isOkDeckButtonEvent,
} from "../../utils/focusNavigation";
import { registerNavFocus, unregisterNavFocus, takeNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import {
  rememberModalReturnFocus,
  registerModalReturnFocusOwner,
} from "../plugin-shell/modalReturnFocusRegistry";
import { useChatSlotBumpers } from "./useChatSlotBumpers";
import { useChatSlotRenameModal } from "./useChatSlotRenameModal";

export type ChatSlotRowProps = {
  summaries: ChatSlotSummary[];
  activeSlotId: string | null;
  onCreateSlot: () => Promise<unknown>;
  onSelectSlot: (slotId: string | null) => Promise<void>;
  onRenameSlot: (slotId: string, label: string) => Promise<boolean>;
  onDeleteSlot: (slotId: string) => Promise<boolean>;
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  /**
   * Fires when the carousel enters or leaves the `[+]` create position. Cycling there does not
   * change the active slot, so this is the only signal the rest of the tab gets.
   */
  onCreatePositionChange?: (atCreate: boolean) => void;
  /** Slot the backend is generating for right now, or null. */
  generatingSlotId?: string | null;
  /** Slots that finished an answer while the user was looking at a different slot. */
  unreadSlotIds?: ReadonlySet<string>;
};

type RowFocusStop = "title" | "delete";

const MAX_DOTS = 8;
/** What the create position shows, both as the centre label and as the ghost to a slot's left. */
const CREATE_LABEL = "[+]";

/**
 * The whole slot row: the LB/RB carousel, its center label, the activity
 * dots, and the rename/delete controls. See "How it works" above for the
 * flow.
 *
 * In: the list of saved chats (newest first), which one is active, and
 * callbacks for creating, selecting, renaming and deleting a chat, plus
 * which chat (if any) is currently generating or has an unread reply.
 * Out: the row itself — the shoulder-button pills, the center title (with a
 * small × to delete it), the ghost previews of the chat to either side, and
 * the row of activity dots.
 *
 * What can go wrong: the carousel position and the "active chat" id can
 * briefly disagree right after a rename or delete finishes elsewhere — the
 * effect that re-syncs carouselIndex from activeSlotId is what catches that
 * back up.
 */
export function ChatSlotRow({
  summaries,
  activeSlotId,
  onCreateSlot,
  onSelectSlot,
  onRenameSlot,
  onDeleteSlot,
  onBeforeNestedDeckyModal,
  onCompleteNestedDeckyModalClose,
  onCreatePositionChange,
  generatingSlotId = null,
  unreadSlotIds,
}: ChatSlotRowProps) {
  /*
   * Summaries arrive most-recently-updated first (chat_slot_service sorts by updated_at, newest
   * first) and are used in that order: position 1 / the leftmost dot is the newest chat, with the
   * [+] create position at 0 directly to its left. This used to be reversed, which put [+] next to
   * the OLDEST chat — so from the chat a user was just in, reaching "new chat" meant LB-ing past
   * every older chat in the ring, and the 8-dot cap trimmed the newest chats instead of the oldest.
   * Reported on device 2026-08-31.
   */
  const orderedSlots = summaries;
  const positionCount = 1 + orderedSlots.length;

  const slotIndexFromId = useCallback(
    (id: string | null) => {
      if (!id) return 0;
      const idx = orderedSlots.findIndex((s) => s.id === id);
      return idx >= 0 ? idx + 1 : 0;
    },
    [orderedSlots],
  );

  const [carouselIndex, setCarouselIndex] = useState(() => slotIndexFromId(activeSlotId));
  const [focused, setFocused] = useState(false);
  const [focusStop, setFocusStop] = useState<RowFocusStop>("title");
  const navRef = useRef<NavRefHolder["current"]>(null);
  const rowFocusElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    registerNavFocus("chat-slot-row", navRef);
    return () => unregisterNavFocus("chat-slot-row", navRef);
  }, []);

  useEffect(() => {
    setCarouselIndex(slotIndexFromId(activeSlotId));
  }, [activeSlotId, slotIndexFromId]);

  const isCreatePosition = carouselIndex === 0;
  const activeSlot = isCreatePosition ? null : orderedSlots[carouselIndex - 1] ?? null;
  const prevSlot = carouselIndex > 1 ? orderedSlots[carouselIndex - 2] : null;
  /* Position 0 is the create slot, so the first real slot's left neighbour IS "new chat". Without
     this the leftmost slot looked like the end of the carousel with nothing to its left. */
  const prevIsCreatePosition = carouselIndex === 1;
  const nextSlot =
    !isCreatePosition && carouselIndex < orderedSlots.length ? orderedSlots[carouselIndex] : null;
  const showGhosts = orderedSlots.length > 1;

  useEffect(() => {
    onCreatePositionChange?.(isCreatePosition);
  }, [isCreatePosition, onCreatePositionChange]);

  const selectCarouselIndex = useCallback(
    async (index: number) => {
      const clamped = Math.max(0, Math.min(index, positionCount - 1));
      setCarouselIndex(clamped);
      if (clamped === 0) return;
      const slot = orderedSlots[clamped - 1];
      if (slot) await onSelectSlot(slot.id);
    },
    [onSelectSlot, orderedSlots, positionCount],
  );

  const { handleBumperButtonDown } = useChatSlotBumpers({
    onBumperLeft: () => {
      void selectCarouselIndex(carouselIndex - 1);
    },
    onBumperRight: () => {
      void selectCarouselIndex(carouselIndex + 1);
    },
  });

  const { openRenameModal } = useChatSlotRenameModal({
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
    onRename: onRenameSlot,
  });

  const openDeleteConfirm = useCallback(
    (slotId: string, label: string) => {
      onBeforeNestedDeckyModal?.();
      rememberModalReturnFocus("chat-slot-rename");
      if (rowFocusElRef.current) {
        registerModalReturnFocusOwner("chat-slot-rename", rowFocusElRef.current);
      }
      const handle = showModal(
        <ConfirmModal
          strTitle="Delete chat slot?"
          strDescription={`Delete "${label}" and its transcript? This cannot be undone.`}
          bDestructiveWarning
          strOKButtonText="Delete"
          strCancelButtonText="Cancel"
          onOK={() => {
            void onDeleteSlot(slotId);
            onCompleteNestedDeckyModalClose?.(() => handle.Close());
          }}
          onCancel={() => {
            onCompleteNestedDeckyModalClose?.(() => handle.Close());
          }}
        />,
      );
    },
    [onBeforeNestedDeckyModal, onCompleteNestedDeckyModalClose, onDeleteSlot],
  );

  /* Pending wins over unread: a slot cannot be both, but a stale unread entry must not
     outrank the ring the user is watching fill. */
  const slotStateClass = (slotId: string): string => {
    if (slotId === generatingSlotId) return " bonsai-chat-slot-dot--pending";
    if (unreadSlotIds?.has(slotId)) return " bonsai-chat-slot-dot--unread";
    return "";
  };

  const centerLabel = isCreatePosition ? CREATE_LABEL : (activeSlot?.label ?? "New chat");

  // CSS cannot detect overflow, and `text-overflow: ellipsis` clips the text so a plain
  // transform would only slide the ellipsized fragment. So measure here, publish the
  // distance as a CSS var, and let the stylesheet attach the sweep only when it is needed.
  // Known accepted edge: this re-runs on [focused, centerLabel] only, so a resize with both
  // unchanged (a UI-scale change, or a ghost mounting from a summaries refresh) can leave a
  // stale distance until the next focus change. No ResizeObserver unless device QA shows it.
  const titleWindowRef = useRef<HTMLSpanElement | null>(null);
  const titleInnerRef = useRef<HTMLSpanElement | null>(null);
  const [titleOverflows, setTitleOverflows] = useState(false);

  useLayoutEffect(() => {
    const win = titleWindowRef.current;
    const inner = titleInnerRef.current;
    if (!focused || !win || !inner) {
      setTitleOverflows(false);
      return;
    }
    const overflow = inner.scrollWidth - win.clientWidth;
    if (overflow > 1) {
      win.style.setProperty("--bonsai-slot-title-overflow", `${overflow}px`);
      setTitleOverflows(true);
    } else {
      setTitleOverflows(false);
    }
  }, [focused, centerLabel]);

  return (
    <div className={`bonsai-chat-slot-row${focused ? " bonsai-chat-slot-row--focused" : ""}`}>
      <Focusable
        /*
          The return-focus registry must be handed THIS element, not the wrapper above it.
          `focusOwnerById` resolves its target with
          `el.matches(".Panel.Focusable") ? el : el.closest(".Panel.Focusable")` — from the plain
          wrapper that walks UP to an ancestor container, so closing the rename modal put the ring
          on the tab strip instead of the row. Measured on device 2026-08-30. This element is the
          row's own `Panel Focusable`, so the ladder's first target hits it directly.
        */
        ref={(el: HTMLElement | null) => {
          rowFocusElRef.current = el;
          registerModalReturnFocusOwner("chat-slot-rename", el);
        }}
        {...({
          navRef,
          /*
            Steam treats a `Focusable` as a CONTAINER unless something marks it as a stop, and a
            container with no focusable children is skipped entirely. This row's children are all
            plain spans, and its A handling lives on `onButtonDown` rather than `onActivate` — so
            it rendered correctly and was unreachable by D-pad in both directions.

            Measured on device 2026-08-30 (deck_runSequence, six presses each way): Down went tab
            strip -> preset chips and Up went preset chips -> tab strip, never landing on the row;
            the row's div carried no `tabindex` while every working Focusable div in the panel
            (e.g. `.bonsai-ai-character-avatar`) carried `tabindex="0"`.

            `focusable` marks the stop without adding a second activation path, so `onButtonDown`
            stays the single owner of A / LB / RB and its create-vs-rename-vs-delete branching is
            untouched.
          */
          focusable: true,
          onMoveLeft: () => {
            if (focusStop === "delete") {
              setFocusStop("title");
              return true;
            }
            return false;
          },
          onMoveRight: () => {
            if (focusStop === "title" && !isCreatePosition) {
              setFocusStop("delete");
              return true;
            }
            return false;
          },
          // Layout is slot row -> transcript -> presets -> ask bar (D-A). Returning false
          // lets Steam's spatial navigation descend into whatever is directly below,
          // which is the transcript when it has content and the preset row when it does not.
          onMoveDown: () => false,
          // Up goes to the collapsing tab bar (plan 30 W4). Steam's own answer for "above the
          // row" is its hidden tab button — a stop nobody can see (runs/TAB-BAR-W1b-*.json) —
          // so the hop is explicit. False when the bar is not registered, and Steam decides.
          onMoveUp: () => takeNavFocus("tab-bar"),
        } as Record<string, unknown>)}
        className="bonsai-chat-slot-row-focus"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onButtonDown={(evt) => {
          if (handleBumperButtonDown(evt)) return true;
          if (isBumperLeftDeckEvent(evt) || isBumperRightDeckEvent(evt)) return true;
          if (!isOkDeckButtonEvent(evt)) return false;
          if (isCreatePosition) {
            void onCreateSlot();
            return true;
          }
          if (focusStop === "delete" && activeSlot) {
            openDeleteConfirm(activeSlot.id, activeSlot.label);
            return true;
          }
          if (activeSlot) {
            openRenameModal(activeSlot.id, activeSlot.label, rowFocusElRef.current);
            return true;
          }
          return false;
        }}
      >
        <div className="bonsai-chat-slot-row-inner">
          {focused ? (
            <span
              className={`bonsai-chat-slot-bumper-pill${carouselIndex === 0 ? " bonsai-chat-slot-bumper-pill--dead" : ""}`}
            >
              LB
            </span>
          ) : null}
          <div className="bonsai-chat-slot-center">
            {/*
              Always rendered, empty or not. Slots saved before the name was kept have nothing to
              show, and a line that appears on some rows and not others is the row-height bug the
              min-height below was added to settle - so the band is reserved either way.
            */}
            <div className="bonsai-chat-slot-game">{isCreatePosition ? "" : (activeSlot?.origin_app_name ?? "")}</div>
            <div className="bonsai-chat-slot-title-row">
              {showGhosts && prevSlot && (prevSlot.id === generatingSlotId || unreadSlotIds?.has(prevSlot.id)) ? (
                <span
                  className={`bonsai-chat-slot-ghost-spark${prevSlot.id === generatingSlotId ? " bonsai-chat-slot-ghost-spark--pending" : " bonsai-chat-slot-ghost-spark--unread"}`}
                  aria-hidden
                />
              ) : null}
              {showGhosts && prevIsCreatePosition ? (
                <span className="bonsai-chat-slot-ghost bonsai-chat-slot-ghost--prev bonsai-chat-slot-ghost--create">
                  {CREATE_LABEL}
                </span>
              ) : null}
              {showGhosts && prevSlot ? (
                <span className="bonsai-chat-slot-ghost bonsai-chat-slot-ghost--prev">{prevSlot.label}</span>
              ) : null}
              <span
                ref={titleWindowRef}
                className={`bonsai-chat-slot-title${focusStop === "title" ? " bonsai-chat-slot-title--active-stop" : ""}${isCreatePosition ? " bonsai-chat-slot-title--create" : ""}${titleOverflows ? " bonsai-chat-slot-title--overflowing" : ""}`}
              >
                <span ref={titleInnerRef} className="bonsai-chat-slot-title-inner">
                  {centerLabel}
                </span>
              </span>
              {!isCreatePosition ? (
                <span
                  className={`bonsai-chat-slot-delete${focusStop === "delete" ? " bonsai-chat-slot-delete--active-stop" : ""}`}
                  aria-hidden
                >
                  ×
                </span>
              ) : null}
              {showGhosts && nextSlot ? (
                <span className="bonsai-chat-slot-ghost bonsai-chat-slot-ghost--next">{nextSlot.label}</span>
              ) : null}
              {showGhosts && nextSlot && (nextSlot.id === generatingSlotId || unreadSlotIds?.has(nextSlot.id)) ? (
                <span
                  className={`bonsai-chat-slot-ghost-spark${nextSlot.id === generatingSlotId ? " bonsai-chat-slot-ghost-spark--pending" : " bonsai-chat-slot-ghost-spark--unread"}`}
                  aria-hidden
                />
              ) : null}
            </div>
            {orderedSlots.length > 0 ? (
              <div className="bonsai-chat-slot-dots" aria-hidden>
                <span
                  className={`bonsai-chat-slot-dot bonsai-chat-slot-dot--create${isCreatePosition ? " bonsai-chat-slot-dot--active" : ""}`}
                >
                  +
                </span>
                {/*
                  Marked by CAROUSEL POSITION, not by the stored active slot id. Cycling onto [+]
                  deliberately leaves the active slot alone, so keying off the id lit a slot dot at
                  the create position on top of the +, saying two places were current at once.
                  carouselIndex is what is on screen, so it is what the strip reports.
                */}
                {orderedSlots.slice(0, MAX_DOTS).map((slot, i) => (
                  <span
                    key={slot.id}
                    className={`bonsai-chat-slot-dot${i + 1 === carouselIndex ? " bonsai-chat-slot-dot--active" : ""}${slotStateClass(slot.id)}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
          {focused ? (
            <span
              className={`bonsai-chat-slot-bumper-pill${carouselIndex >= positionCount - 1 ? " bonsai-chat-slot-bumper-pill--dead" : ""}`}
            >
              RB
            </span>
          ) : null}
        </div>
      </Focusable>
    </div>
  );
}
