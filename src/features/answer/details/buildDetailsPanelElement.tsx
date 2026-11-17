/**
 * Title: The Show details panel
 *
 * Purpose: Builds the panel a turn's "Show details" line opens: the chip ladder, and on the newest turn its last
 * chip, the dashed Session chip, whose box is the chat's Session view (plan 105; until then a "This answer /
 * Session · N" tabs row sat above the chips, plan 62 3c). On any older, hand-expanded turn, the bare ladder.
 *
 * Used for: MainTabChatTranscript, once per turn while that turn's details panel is open.
 *
 * Solves: A plain function, not a component (like `buildKbNotesBlockElement` and
 * `buildReplyActionsElement`, and for the same reason: a test can call it directly and read the
 * returned element's own props, rather than rendering the whole transcript and hunting through a
 * mocked `Focusable` tree for one row). Keeps the chip ladder's own per-turn registry together with
 * the one function that draws it.
 *
 * Does not: Decide whether a turn's transparency snapshot has anything to show — the caller only
 * calls this while `transparencyUiAvailable` says yes. See `buildDetailsPanelElement`'s own leading
 * comment below for the focus graph.
 */
import React from "react";
import { findScrollablePanel, revealBelowKeeping } from "../../../shared/dpad/chatPanelScroll";
import { uiGamepadFocusElement } from "../../../shared/dpad/uiDocument";
import { focusPerTurnRow } from "../../../shared/dpad/focusPerTurnRow";
import { focusKbNotesBlock } from "../../knowledge-library/buildKbNotesBlockElement";
import { focusChatPermissionHintRow } from "../../../shared/dpad/chatTranscriptNavHelpers";
import { takeNavFocus } from "../../../shared/dpad/navFocusRegistry";
import { getReplyStop } from "../../../shared/dpad/replyStopRegistry";
import { takeChipSlotFocus } from "./detailsSlotStore";
import {
  focusReplyShowDetails,
  focusReplyUtilityRow,
  focusSessionContextStrip,
} from "../../../shared/dpad/liveTurnFocusGraph";
import { ContextChipLadder } from "./ContextChipLadder";
import {
  SessionContextTabBody,
  computeSessionContextRows,
  type SessionContextTurn,
} from "./SessionContextStrip";
import { focusSumUpButton } from "../../chats/sum-up/SessionSumUpSection";
import type { ChatSumUpState } from "../../chats/sum-up/chatSumUpModel";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import type {
  AskDiagnosticsSnapshot,
  ChatSlotTurnTransparency,
  TransparencySnapshot,
} from "../../../types/inputTransparency";
import type { CreditsView } from "./contextChipsFromSnapshot";

/**
 * The "This answer / Session · N" tabs row's way in (plan 62 3c). Plan 105 removed the row: Session is the
 * ladder's last chip now, so there is never a row to land on and this always says no. It is kept only so the
 * five Down chains in MainTabChatTranscript.tsx that ask for it first (each goes on to `focusChipLadderRow`,
 * the chips) need no edit in a round where other lanes work in that file; remove it with those calls.
 */
export function focusDetailsTabsRow(_turnKey: string): boolean {
  return false;
}

/**
 * The chip ladder's own root, per turn, registered by name.
 *
 * Why a registry rather than the existing `focusContextChipLadder` page query: measured on the
 * Deck 2026-09-21 (build 29ca207). With the details panel open on "This answer", Down from the
 * tabs row called `focusContextChipLadder`, which finds `.bonsai-chip-ladder` by class and hands
 * it to `focusDeckOwner`. That returns FALSE for this element. `focusDeckOwner` refuses to stamp a
 * `tabindex` on a genuine `.Panel.Focusable` -- rightly, that stamp is what corrupted a permission
 * row on 2026-09-04 -- and the ladder's root carries no `tabindex` on device and holds no natively
 * focusable descendant to fall back to, so the plain `.focus()` does nothing and the move is
 * reported as unhandled. Steam's own navigation then ran and threw the ring clean out of the panel
 * onto a preset chip in the dock (measured: ring on `.bonsai-preset-glass`, "TEST", y 600, while
 * the ladder sat unreached at y 449). `focusDeckOwner`'s own comment names this target as the
 * UNKNOWN case of that trade-off; this is the measurement, and the answer is yes.
 *
 * `focusPerTurnRow` is the fix because it is the one already proven on this device, in this
 * container, on the same night: the tabs row then drawn above (gone since plan 105) was also a bare
 * `.Panel.Focusable`, focused through this same helper, and took the ring correctly. Stamping our own
 * component's root is not the ancestor-climbing stamp that caused the 2026-09-04 damage. The root
 * carries its own Steam stop (plan 103 F1), a transfer onto its open chip, the Session chip included.
 */
const chipLadderEls = new Map<string, HTMLElement>();

function registerChipLadderEl(turnKey: string, el: HTMLElement | null): void {
  if (el) chipLadderEls.set(turnKey, el);
  else chipLadderEls.delete(turnKey);
}

export function focusChipLadderRow(turnKey: string): boolean {
  return focusPerTurnRow(chipLadderEls, turnKey);
}

/**
 * B's one way out of an open Show details panel: shut it and hand the ring back to the Show
 * details line that opened it. The ladder and the Session box use it, and so does the "From
 * the notes" block above the panel (plan 74 lane 3) -- a stop with no B of its own let the press
 * fall through to Steam's back-out, which threw the ring to the tab bar and left the panel open.
 */
export function closeDetailsPanel(args: {
  setTransparencyDetailsOpen: (open: boolean) => void;
  setSessionHighlightTurnId: (id: string | null) => void;
  querySlot: () => HTMLElement | null;
}): void {
  args.setTransparencyDetailsOpen(false);
  args.setSessionHighlightTurnId(null);
  focusReplyShowDetails(args.querySlot());
}

/** Panels already brought into view once; a later render of the same open panel leaves it be. */
const revealedPanels = new WeakSet<HTMLElement>();

/**
 * The line that opened this panel ("Show details", reading "Hide details" now), when it is this turn's.
 * Only the open answer draws the line, so the reply stop registry holds at most one; a slot that can be
 * found must contain it.
 */
function openingLine(querySlot: () => HTMLElement | null): HTMLElement | null {
  const line = getReplyStop("show-details");
  if (!line?.isConnected) return null;
  const slot = querySlot();
  return !slot || slot.contains(line) ? line : null;
}

/**
 * Bring a just-opened panel out from behind the dock, once per opening (plan 70 flow 4.2,
 * workshop:test-evidence/plan70-F4-SHOW-DETAILS.json: the tab row opened at y 617 behind the dock at
 * 600, with no scroll, so only the words "Hide details" changed). A frame later, so the panel's
 * content has laid out; never past the line that opened it.
 *
 * Held back by that line, not by wherever the ring reads at that instant (plan 104 F1): the scroll
 * skips its "keep the ring on screen" limit when the ring reads as nothing, as the page, or as
 * something inside the panel, and then a panel taller than the room scrolls until its own top meets
 * the pane's, carrying the line above it out of sight. On the Deck's own screen, B then A with the
 * Session tab showing left "Hide details" at -22 and -39 against a pane top of 52, 4 of 6 tries
 * (workshop:test-evidence/plan103-P103-DETAILS-STRIP-01.json and -try2.json); the scroll matched
 * that limit exactly (410 to 715). The ring is still asked when the line cannot be found.
 */
function revealWhenOpened(panel: HTMLElement | null, querySlot: () => HTMLElement | null): void {
  if (!panel || revealedPanels.has(panel)) return;
  revealedPanels.add(panel);
  requestAnimationFrame(() => {
    if (panel.isConnected) revealBelowKeeping(panel, keepWhenOpened(panel, querySlot));
  });
}

/**
 * What the reveal above keeps on screen: the line that opened the panel, or the control holding the ring
 * when the ring truly sits on one in the chat above that line, whichever is higher. The case is the
 * summed-up note above the answer's reply row (plan 104 F1, the second opinion's consult 4): A on it
 * opens the panel on the Session tab, and held back by the line alone the scroll could carry the note
 * off the top while the ring was still on it, which is where the ring stays when the panel's page lacks
 * the browser's focus and the hop on to "Sum up" cannot carry it. A ring that reads as nothing, as the
 * page, as the pane, as something in the dock, as the line itself, or as anything below the line (inside
 * the panel) leaves the line as the limit.
 */
function keepWhenOpened(panel: HTMLElement, querySlot: () => HTMLElement | null): HTMLElement | null {
  const ring = uiGamepadFocusElement();
  const line = openingLine(querySlot);
  if (!line) return ring;
  const pane = findScrollablePanel(panel);
  const ringInChat =
    ring && pane && ring !== pane && ring !== line && pane.contains(ring) && !ring.closest(".bonsai-main-tab-dock");
  return ringInChat && ring.getBoundingClientRect().top < line.getBoundingClientRect().top ? ring : line;
}

/**
 * Focus graph (plan 105; docs/focus-graph.md, "The Show details chips grid"):
 *
 *   Hide details (the "show-details" reply stop), or the notes line under it when one is drawn
 *      | Down                                          ^ Up (from the top row, or Left off the first chip)
 *   the chips, in rows: this answer's own, then the dashed Session chip last ("bonsai-chip-ladder")
 *      Left/Right step through them in drawn order, Up/Down cross a row; the open box follows the ring
 *      | Down off the bottom row, from an answer chip        | Down, Right or A on the Session chip
 *      | (after showing the rest of a tall box)               v
 *      |                                  the Session box: Sum up this chat, the summary card, the chat's
 *      |                                  questions and the open question's own chips (SessionContextTabBody;
 *      |                                  its own graph is drawn in SessionSumUpSection.tsx). Up from Sum up
 *      |                                  goes back to the Session chip.
 *      v                                        | Down off the box's last stop
 *   a permission hint row below the chat, else the suggestion chips, else the question box --
 *   Steam's own transfer each time (`downPastPanel`), since all three sit outside this turn.
 *
 * - Only the newest turn (`isNewest`) carries the Session chip, so it never repeats down the chat; an
 *   older, hand-expanded turn keeps the bare ladder.
 * - The ladder's root carries its own Steam stop (plan 103 F1), a transfer onto its open chip, so every
 *   way onto the chips (Down from Hide details, Up from Sum up, Up from below) is Steam's transfer, which
 *   still moves the ring when the panel's page has lost the browser's focus.
 * - Which box is open survives B then A: `detailsTab` is the transcript's ("session": the Session chip is
 *   open), so A on the summed-up note can open the panel with it open.
 * - B, from any chip or anywhere inside the Session box, closes the whole panel and hands the ring back
 *   to the still-mounted Show details / Hide details line -- not just the local re-collapse
 *   `ContextChipLadder` does on its own B press, which is why both the ladder's `onExpandChange` and
 *   the Session box's `onRequestClose` call the same `closePanel` below.
 */
export function buildDetailsPanelElement(args: {
  turnKey: string;
  querySlot: () => HTMLElement | null;
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null;
  devDiagnostics: AskDiagnosticsSnapshot | null;
  isNewest: boolean;
  /** Which box is open on the newest turn: an answer chip's ("answer") or the Session chip's ("session"). */
  detailsTab: "answer" | "session";
  setDetailsTab: (tab: "answer" | "session") => void;
  sessionLiveTurn: SessionContextTurn | null;
  archivedTurns: AskThreadCollapsedTurn[];
  sessionHighlightTurnId: string | null;
  setSessionHighlightTurnId: (id: string | null) => void;
  setTransparencyDetailsOpen: (open: boolean) => void;
  /** Plan 68: the open chat's summary and the Sum up button's job, for the Session box. */
  sumUp?: ChatSumUpState | null;
  /** Plan 68: an answer is being written right now (the Sum up button is greyed out). */
  answerInFlight?: boolean;
  /**
   * How a turn's credit line treats a spoiler the rest of the screen hides (CreditsView,
   * contextChipsFromSnapshot.ts) — asked per turn key, so the Session box's rows answer for their
   * own turn. Absent: credits always show.
   */
  creditsViewFor?: (
    turnKey: string,
    snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null | undefined
  ) => CreditsView;
}): React.ReactElement {
  const {
    turnKey,
    querySlot,
    snapshot,
    devDiagnostics,
    isNewest,
    detailsTab,
    setDetailsTab,
    sessionLiveTurn,
    archivedTurns,
    sessionHighlightTurnId,
    setSessionHighlightTurnId,
    setTransparencyDetailsOpen,
    sumUp = null,
    answerInFlight = false,
    creditsViewFor,
  } = args;
  const creditsView = creditsViewFor?.(turnKey, snapshot);

  const upPastPanel = () =>
    focusKbNotesBlock(turnKey) ||
    focusReplyShowDetails(querySlot()) ||
    focusReplyUtilityRow(querySlot());
  /*
   * Down off the bottom of the panel, to what sits below Show details in the chat: a permission
   * hint row when one shows, else the slot above the question box (the chips, or this line standing
   * in for them, DetailsSlot.tsx), else the question box. Each is a registered
   * nav node outside this turn's own container, so only Steam's transfer carries the ring there.
   */
  const downPastPanel = () =>
    focusChatPermissionHintRow() || takeChipSlotFocus() || takeNavFocus("unified-input");

  if (!isNewest) {
    /*
     * Unchanged: an older, hand-expanded turn keeps the bare ladder, no Session chip.
     *
     * `onMoveDownFromLadder` keeps the same shape it always had — try the standalone strip below —
     * even though plan 62 3c removed that strip: `focusSessionContextStrip()` (liveTurnFocusGraph.ts,
     * not owned by this lane) now safely reports false with nothing left to find, and Down past the
     * last chip on an older turn falls through to Steam's own default nav, exactly as Down past
     * anything else with nothing wired below it already does elsewhere in this file.
     */
    return (
      <ContextChipLadder
        snapshot={snapshot}
        collapsedHint={false}
        rootRef={(el) => {
          registerChipLadderEl(turnKey, el);
          revealWhenOpened(el?.parentElement ?? null, querySlot);
        }}
        onMoveUpFromLadder={upPastPanel}
        onMoveDownFromLadder={() => focusSessionContextStrip()}
        devDiagnostics={devDiagnostics}
        creditsView={creditsView}
      />
    );
  }

  const sessionRowCount = computeSessionContextRows(sessionLiveTurn, archivedTurns).length;

  const closePanel = () =>
    closeDetailsPanel({ setTransparencyDetailsOpen, setSessionHighlightTurnId, querySlot });
  /* The Session chip's box: the chat's Session view, drawn by the ladder under the grid while the chip is open. */
  const sessionBox = (
    <SessionContextTabBody
      liveTurn={sessionLiveTurn}
      archivedTurns={archivedTurns}
      highlightTurnId={sessionHighlightTurnId}
      onHighlightClear={() => setSessionHighlightTurnId(null)}
      /* Up from Sum up: back onto the Session chip, by the ladder's own stop (a transfer onto its open chip). */
      onMoveUpFromTop={() => focusChipLadderRow(turnKey) || upPastPanel()}
      onRequestClose={closePanel}
      onMoveDownPastTab={downPastPanel}
      sumUp={sumUp}
      answerInFlight={answerInFlight}
      creditsViewFor={creditsViewFor}
    />
  );

  return (
    <ContextChipLadder
      snapshot={snapshot}
      collapsedHint={false}
      rootRef={(el) => {
        registerChipLadderEl(turnKey, el);
        revealWhenOpened(el?.parentElement ?? null, querySlot);
      }}
      /* Up off the top row: Hide details, or the notes line under it (no tabs row between since plan 105). */
      onMoveUpFromLadder={upPastPanel}
      /*
       * Down off the bottom row leaves the panel by name, the Session box's way (plan 72). It used to
       * fall through to Steam's own guess, which found the suggestion chips from the ladder as a whole;
       * since plan 79 the ring is on one chip nested inside the ladder, so the guess would start from
       * somewhere else. `focusSessionContextStrip()` stays first for the older-turn branch's reason
       * above: it safely reports false.
       */
      onMoveDownFromLadder={() => focusSessionContextStrip() || downPastPanel()}
      devDiagnostics={devDiagnostics}
      creditsView={creditsView}
      onExpandChange={(expanded) => {
        if (!expanded) closePanel();
      }}
      session={{
        label: `Session · ${sessionRowCount}`,
        open: detailsTab === "session",
        onOpenChange: (open) => setDetailsTab(open ? "session" : "answer"),
        box: sessionBox,
        enter: focusSumUpButton,
      }}
    />
  );
}
