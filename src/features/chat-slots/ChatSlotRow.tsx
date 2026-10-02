/**
 * Title: Chat slot row
 *
 * Purpose: The row that always sits at the top of the main tab, above the
 * preset chips. It is a small carousel of your saved chats: press LB/RB (or
 * step the D-pad through it) to flip between them, press A on the middle to
 * rename the current chat, move onto its bin to delete it, or onto the save
 * icon at the left end to save it to the Desktop. Step left past your newest
 * chat to reach the new-chat spot (a pencil and "New chat") and start a new
 * one. Dots below show your
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
 * Gotchas:
 * - A control in this plugin can look completely normal on screen and
 *   still be invisible to the D-pad, because Steam guesses what a
 *   Focusable connects to next from its position on screen, and that
 *   guess is not always right. This row hit that twice, in two different
 *   ways: Steam's automatic guess skipped the whole row in both
 *   directions (see the focusable: true note below), and separately,
 *   Steam's own idea of "what's above this row" was a hidden tab-strip
 *   button nobody could see or reach any other way (see the Up note
 *   below). Both times the fix was the same one this plugin reaches for
 *   whenever the guess is wrong: stop letting Steam guess, and name the
 *   exact next stop by hand.
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

import { TrashBinSlotsIcon } from "../../components/icons";
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
import { SteamMarqueeText } from "../preset-carousel/presetChipButton";
import { prefersReducedMotion } from "../preset-carousel/presetChipShared";
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
  /** Opens the save-to-Desktop window, from the save icon at the row's left end. */
  onSaveChat?: () => void;
  /** The chat has an answer to save; the save icon is drawn only then. */
  canSaveChat?: boolean;
  /** Saving is allowed; when not, the icon is dimmed and A opens the window's permission prompt. */
  saveChatEnabled?: boolean;
};

type RowFocusStop = "save" | "title" | "delete";

const MAX_DOTS = 8;

/*
 * The two icons the maintainer picked from the true-size drawing of 2026-09-27 (plan 72): save
 * option B, a floppy disk at the row's left end facing the bin, and new-chat option 4, a pencil. Both
 * are copied exactly from that drawing, stroked in the current text colour.
 */
function DiskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5a1 1 0 0 1 1-1h11.5L20 7.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M8 4v5h7V4" />
      <path d="M7 20v-6h10v6" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
}

/**
 * The whole slot row: the LB/RB carousel, its center label, the activity
 * dots, and the rename/delete controls.
 *
 * In: the list of saved chats (newest first), which one is active, and
 * callbacks for creating, selecting, renaming and deleting a chat, plus
 * which chat (if any) is currently generating or has an unread reply.
 * Out: the row itself — the shoulder-button pills, the center title (with a
 * small bin to delete it), the ghost previews of the chat to either side, and
 * the row of activity dots.
 *
 * What can go wrong: the carousel position and the "active chat" id can
 * briefly disagree right after a rename or delete finishes elsewhere — the
 * effect that re-syncs carouselIndex from activeSlotId is what catches that
 * back up.
 *
 * 1. Track carouselIndex, the on-screen position — 0 is always the new-chat
 *    spot, 1..N are the saved chats.
 * 2. Work out what is visible at the current position and its two
 *    neighbours, for the ghost previews to either side.
 * 3. On LB/RB (handled by useChatSlotBumpers), move carouselIndex and, unless
 *    it landed on the new-chat spot, call onSelectSlot. D-pad Left/Right walk
 *    the row's three stops: save icon, name, bin.
 * 4. Pressing A: on the new-chat spot, calls onCreateSlot; otherwise opens
 *    the rename modal (useChatSlotRenameModal), or, on the bin stop, the delete
 *    confirmation, or, on the save stop, the save-to-Desktop window.
 * 5. A layout effect measures whether the title text is wider than its box
 *    and, only while focused, swaps it for Steam's Marquee with the chips'
 *    own scroll settings, so a long name scrolls exactly like a long chip.
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
  onSaveChat,
  canSaveChat = false,
  saveChatEnabled = true,
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
  /* Never at the new-chat spot, where there is nothing to save; and only once the chat has an
     answer, the same rule that drew the old Save chat button under the last answer. */
  const showSave = !isCreatePosition && canSaveChat && onSaveChat !== undefined;
  /* The save stop with no icon to stand on (the chat has nothing to save yet, or LB/RB moved to a
     chat without an answer) is the name; so the ring can never sit on an invisible stop. */
  const stop: RowFocusStop = focusStop === "save" && !showSave ? "title" : focusStop;

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

  const centerLabel = isCreatePosition ? "New chat" : (activeSlot?.label ?? "New chat");

  // CSS cannot detect overflow, so measure the plain name here and, only when it is wider than its
  // window, swap it for Steam's Marquee with the suggestion chips' own settings (SteamMarqueeText):
  // a long chat name and a long chip label scroll at one speed with the same pauses. It used to be
  // its own 6-second CSS sweep, whose speed changed with the name's length (plan 72, 2026-09-27).
  // `overflowLabel` names the label that was measured as too wide, so a new name or a return of
  // the ring starts from the plain span again and is measured afresh before it may scroll.
  // Known accepted edge: this re-runs on [focused, centerLabel] only, so a resize with both
  // unchanged (a UI-scale change) can leave a stale answer until the next focus change.
  const titleWindowRef = useRef<HTMLSpanElement | null>(null);
  const titleInnerRef = useRef<HTMLSpanElement | null>(null);
  const [overflowLabel, setOverflowLabel] = useState<string | null>(null);
  const titleScrolls = focused && overflowLabel === centerLabel && !prefersReducedMotion();

  useLayoutEffect(() => {
    const win = titleWindowRef.current;
    const inner = titleInnerRef.current;
    if (!focused) {
      setOverflowLabel(null);
      return;
    }
    // The Marquee is already showing (the plain span, and so its ref, is gone): nothing to measure.
    if (!win || !inner) return;
    setOverflowLabel(inner.scrollWidth - win.clientWidth > 1 ? centerLabel : null);
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
          registerModalReturnFocusOwner("desktop-note-save", el);
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
            if (stop === "delete") {
              setFocusStop("title");
            } else if (stop === "title" && showSave) {
              setFocusStop("save");
            }
            /* Claimed even when nothing moves (the save icon itself, a name with no icon, the
               new-chat spot): nothing in bonsAI lies to the row's left, and Steam's own answer
               was to leave the plugin for its side menu (plan 72 must-fix list). */
            return true;
          },
          onMoveRight: () => {
            if (stop === "save") {
              setFocusStop("title");
              return true;
            }
            if (stop === "title" && !isCreatePosition) {
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
          if (stop === "save" && onSaveChat) {
            rememberModalReturnFocus("desktop-note-save");
            onSaveChat();
            return true;
          }
          if (stop === "delete" && activeSlot) {
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
              Always rendered, empty or not - a line that appears on some rows and not others is
              the row-height bug the min-height below was added to settle, so the band is reserved
              either way. The text itself only shows while the D-pad ring is on this row (2026-09-20):
              at rest it is blank even for a slot with a stored game, and reusing `focused` (the same
              state that drives the row's own `--focused` class) rather than a fresh signal keeps this
              in lockstep with the ring instead of a second, possibly-stale idea of "on this row".
            */}
            <div className="bonsai-chat-slot-game">
              {isCreatePosition || !focused ? "" : (activeSlot?.origin_app_name ?? "")}
            </div>
            <div className={`bonsai-chat-slot-title-row${showSave ? " bonsai-chat-slot-title-row--has-save" : ""}`}>
              {showGhosts && prevSlot && (prevSlot.id === generatingSlotId || unreadSlotIds?.has(prevSlot.id)) ? (
                <span
                  className={`bonsai-chat-slot-ghost-spark${prevSlot.id === generatingSlotId ? " bonsai-chat-slot-ghost-spark--pending" : " bonsai-chat-slot-ghost-spark--unread"}`}
                  aria-hidden
                />
              ) : null}
              {showGhosts && prevIsCreatePosition ? (
                <span className="bonsai-chat-slot-ghost bonsai-chat-slot-ghost--prev bonsai-chat-slot-ghost--create">
                  <PencilIcon />
                </span>
              ) : null}
              {showGhosts && prevSlot ? (
                <span className="bonsai-chat-slot-ghost bonsai-chat-slot-ghost--prev">{prevSlot.label}</span>
              ) : null}
              {showSave ? (
                <span
                  className={`bonsai-chat-slot-save${stop === "save" ? " bonsai-chat-slot-save--active-stop" : ""}${saveChatEnabled ? "" : " bonsai-chat-slot-save--disabled"}`}
                  aria-hidden
                >
                  <DiskIcon />
                </span>
              ) : null}
              {isCreatePosition ? (
                <span className="bonsai-chat-slot-newchat">
                  <PencilIcon />
                  New chat
                </span>
              ) : (
                <span
                  ref={titleWindowRef}
                  className={`bonsai-chat-slot-title${stop === "title" ? " bonsai-chat-slot-title--active-stop" : ""}${titleScrolls ? " bonsai-chat-slot-title--overflowing" : ""}`}
                >
                  {titleScrolls ? (
                    <SteamMarqueeText
                      text={centerLabel}
                      className="bonsai-chat-slot-title-marquee"
                      fallback={<span className="bonsai-chat-slot-title-inner">{centerLabel}</span>}
                    />
                  ) : (
                    <span ref={titleInnerRef} className="bonsai-chat-slot-title-inner">
                      {centerLabel}
                    </span>
                  )}
                </span>
              )}
              {!isCreatePosition ? (
                <span
                  className={`bonsai-chat-slot-delete${stop === "delete" ? " bonsai-chat-slot-delete--active-stop" : ""}`}
                  aria-hidden
                >
                  <TrashBinSlotsIcon />
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
