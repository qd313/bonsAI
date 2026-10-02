/**
 * Title: The Show details panel
 *
 * Purpose: Builds the panel a turn's "Show details" line opens (plan 62 3c) — on the newest turn,
 * the "This answer / Session · N" tabs row plus whichever tab's own body is active; on any older,
 * hand-expanded turn, today's bare chip ladder with no tabs.
 *
 * Used for: MainTabChatTranscript, once per turn while that turn's details panel is open.
 *
 * Solves: A plain function, not a component (like `buildKbNotesBlockElement` and
 * `buildReplyActionsElement`, and for the same reason: a test can call it directly and read the
 * returned element's own props, rather than rendering the whole transcript and hunting through a
 * mocked `Focusable` tree for one row). Keeps the tabs row's own small per-turn focus registry and
 * the chip ladder's own registry together with the one function that draws both of them.
 *
 * Does not: Decide whether a turn's transparency snapshot has anything to show — the caller only
 * calls this while `transparencyUiAvailable` says yes. See `buildDetailsPanelElement`'s own leading
 * comment below for the focus graph.
 */
import React from "react";
import { Focusable } from "@decky/ui";
import { revealBelowKeeping } from "./chatPanelScroll";
import { uiGamepadFocusElement } from "./uiDocument";
import { focusPerTurnRow } from "./focusPerTurnRow";
import { focusKbNotesBlock } from "./buildKbNotesBlockElement";
import { focusChatPermissionHintRow } from "./chatTranscriptNavHelpers";
import { takeNavFocus } from "./navFocusRegistry";
import { takeChipSlotFocus } from "../features/details-slot/detailsSlotStore";
import {
  isDeckDirectionDownEvent,
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDeckDirectionUpEvent,
} from "./focusNavigation";
import {
  focusContextChipLadder,
  focusReplyShowDetails,
  focusReplyUtilityRow,
  focusSessionContextStrip,
} from "./liveTurnFocusGraph";
import { ContextChipLadder } from "../components/ContextChipLadder";
import {
  SessionContextTabBody,
  computeSessionContextRows,
  type SessionContextTurn,
} from "../components/SessionContextStrip";
import { focusSumUpButton } from "../features/chat-sum-up/SessionSumUpSection";
import type { ChatSumUpState } from "../features/chat-sum-up/chatSumUpModel";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type {
  AskDiagnosticsSnapshot,
  ChatSlotTurnTransparency,
  TransparencySnapshot,
} from "./inputTransparency";
import type { CreditsView } from "./contextChipsFromSnapshot";

/**
 * The newest turn's own "This answer / Session · N" tabs row (plan 62 3c), one per turn key —
 * same shape as the KB notes block's own registry (buildKbNotesBlockElement.tsx) and for the same
 * reason: this row is a sibling of Show details, the KB notes block and the ladder/session body
 * inside one turn's own Focusable container, so a plain `.focus()` carries Steam's ring correctly
 * between them without a registry hop (AGENTS.md, "The Steam Deck focus graph"). Only the newest
 * turn ever mounts one, so at most one entry is ever live at a time in practice, but keyed by turn
 * id anyway to match the pattern every other per-turn registry in this file already uses.
 */
const detailsTabsRowEls = new Map<string, HTMLElement>();

function registerDetailsTabsRowEl(turnKey: string, el: HTMLElement | null): void {
  if (el) detailsTabsRowEls.set(turnKey, el);
  else detailsTabsRowEls.delete(turnKey);
}

export function focusDetailsTabsRow(turnKey: string): boolean {
  return focusPerTurnRow(detailsTabsRowEls, turnKey);
}

/**
 * The chip ladder's own root, per turn, registered the same way the tabs row above is.
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
 * container, on the same night: the tabs row directly above is also a bare `.Panel.Focusable`, is
 * focused through this same helper, and took the ring correctly. Stamping our own component's root
 * is not the ancestor-climbing stamp that caused the 2026-09-04 damage.
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
 * details line that opened it. The tabs row and the ladder below use it, and so does the "From
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
 * Bring a just-opened panel out from behind the dock, once per opening (plan 70 flow 4.2,
 * docs/test-evidence/plan70-F4-SHOW-DETAILS.json: the tab row opened at y 617 behind the dock at
 * 600, with no scroll, so only the words "Hide details" changed). A frame later, so the panel's
 * content has laid out; never past the control holding the ring.
 */
function revealWhenOpened(panel: HTMLElement | null): void {
  if (!panel || revealedPanels.has(panel)) return;
  revealedPanels.add(panel);
  requestAnimationFrame(() => {
    if (panel.isConnected) revealBelowKeeping(panel, uiGamepadFocusElement());
  });
}

/**
 * Focus graph, written before the control existed per AGENTS.md ("The Steam Deck focus graph") and
 * design-language.md Rule 8:
 *
 *   Hide details (the existing "show-details" reply stop, unchanged)
 *      | Down                                          ^ Up
 *   This answer | Session · N        <- new stop, only on the newest turn ("bonsai-details-tabs-row")
 *      | Down                                          ^ Up
 *   This answer tab: the chip ladder ("bonsai-chip-ladder"), one stop per chip since plan 79,
 *   Down off its last chip to what sits below the panel, the Session tab's way
 *   Session tab (plan 68): Sum up this chat, the summary card when there is one, then the turn row
 *   list and the active row's own chips (SessionContextTabBody; its own graph is drawn in
 *   SessionSumUpSection.tsx). No Clear.
 *      | Down off the Session tab's last chip (plan 72)
 *   a permission hint row below the chat, else the suggestion chips, else the question box --
 *   Steam's own transfer each time (`downPastPanel`), since all three sit outside this turn.
 *
 * - Only the newest turn (`isNewest`) ever renders the tabs row at all — an older, hand-expanded
 *   turn keeps today's shape, a bare ladder with no tabs, exactly as `SessionContextStrip`'s own
 *   file header already promises ("Older answers show the panel as it is today, with no tabs").
 * - Left/Right switch tabs; Up leaves to Show details (via the existing KB-notes-block-then-
 *   show-details chain every ladder already uses); Down enters whichever tab is active — the
 *   ladder for "This answer", the Sum up button for "Session" (registered, never a page search).
 * - B, from anywhere inside either tab's content, closes the whole panel and hands the ring back
 *   to the still-mounted Show details / Hide details line — not just the local re-collapse
 *   `ContextChipLadder` does on its own B press, which is why both the tabs row's own
 *   `onCancelButton` and the ladder's `onExpandChange` call the same `closePanel` below.
 */
export function buildDetailsPanelElement(args: {
  turnKey: string;
  querySlot: () => HTMLElement | null;
  snapshot: TransparencySnapshot | ChatSlotTurnTransparency | null;
  devDiagnostics: AskDiagnosticsSnapshot | null;
  isNewest: boolean;
  detailsTab: "answer" | "session";
  setDetailsTab: (tab: "answer" | "session") => void;
  sessionLiveTurn: SessionContextTurn | null;
  archivedTurns: AskThreadCollapsedTurn[];
  sessionHighlightTurnId: string | null;
  setSessionHighlightTurnId: (id: string | null) => void;
  setTransparencyDetailsOpen: (open: boolean) => void;
  /** Plan 68: the open chat's summary and the Sum up button's job, for the Session tab. */
  sumUp?: ChatSumUpState | null;
  /** Plan 68: an answer is being written right now (the Sum up button is greyed out). */
  answerInFlight?: boolean;
  /**
   * How a turn's credit line treats a spoiler the rest of the screen hides (CreditsView,
   * contextChipsFromSnapshot.ts) — asked per turn key, so the Session tab's rows answer for their
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
     * Unchanged: an older, hand-expanded turn keeps today's bare ladder, no tabs.
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
          revealWhenOpened(el?.parentElement ?? null);
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
  const focusFirstTabContent = () =>
    detailsTab === "answer"
      ? focusChipLadderRow(turnKey) || focusContextChipLadder(querySlot())
      : focusSumUpButton();

  return (
    <>
      <Focusable
        className="bonsai-details-tabs-row"
        flow-children="horizontal"
        ref={(el: HTMLElement | null) => {
          registerDetailsTabsRowEl(turnKey, el);
          revealWhenOpened(el?.parentElement ?? null);
        }}
        {...({
          onMoveUp: upPastPanel,
          onMoveDown: focusFirstTabContent,
          onMoveLeft: () => {
            if (detailsTab !== "session") return false;
            setDetailsTab("answer");
            return true;
          },
          onMoveRight: () => {
            if (detailsTab !== "answer") return false;
            setDetailsTab("session");
            return true;
          },
          onButtonDown: (evt: unknown) => {
            if (isDeckDirectionUpEvent(evt)) return upPastPanel();
            if (isDeckDirectionDownEvent(evt)) return focusFirstTabContent();
            if (isDeckDirectionLeftEvent(evt) && detailsTab === "session") {
              setDetailsTab("answer");
              return true;
            }
            if (isDeckDirectionRightEvent(evt) && detailsTab === "answer") {
              setDetailsTab("session");
              return true;
            }
            return false;
          },
          /*
           * B closes the whole panel. `onCancelButton` + `preventDefault`, not `onButtonDown`
           * checking the button code: measured on device 2026-08-28 (DrgGlossaryTermChip.tsx,
           * buildReasoningFoldElement.tsx) that `onButtonDown` does receive B, but returning
           * `true` from it does NOT stop Steam also backing the ring out of the panel — only
           * `onCancelButton` genuinely consumes the press. Safe to attach unconditionally: this
           * row only exists while Show details is open, so there is no "closed" state of this
           * same node where B ought to fall through instead.
           */
          onCancelButton: (evt: unknown) => {
            closePanel();
            (evt as { preventDefault?: () => void })?.preventDefault?.();
          },
        } as Record<string, unknown>)}
        style={{ display: "flex", flexDirection: "row", width: "100%", gap: 4, marginTop: 8 }}
      >
        <span
          className={`bonsai-details-tab${detailsTab === "answer" ? " bonsai-details-tab--active" : ""}`}
          onClick={() => setDetailsTab("answer")}
        >
          This answer
        </span>
        <span
          className={`bonsai-details-tab${detailsTab === "session" ? " bonsai-details-tab--active" : ""}`}
          onClick={() => setDetailsTab("session")}
        >
          {`Session · ${sessionRowCount}`}
        </span>
      </Focusable>
      {detailsTab === "answer" ? (
        <ContextChipLadder
          snapshot={snapshot}
          collapsedHint={false}
          rootRef={(el) => registerChipLadderEl(turnKey, el)}
          onMoveUpFromLadder={() => focusDetailsTabsRow(turnKey) || upPastPanel()}
          /*
           * Down off the last chip leaves the panel by name, the Session tab's way (plan 72). It
           * used to fall through to Steam's own guess, which found the suggestion chips from the
           * ladder as a whole; since plan 79 the ring is on one chip nested inside the ladder, so
           * the guess would start from somewhere else. `focusSessionContextStrip()` stays first
           * for the older-turn branch's reason above: it safely reports false.
           */
          onMoveDownFromLadder={() => focusSessionContextStrip() || downPastPanel()}
          devDiagnostics={devDiagnostics}
          creditsView={creditsView}
          onExpandChange={(expanded) => {
            if (!expanded) closePanel();
          }}
        />
      ) : (
        <SessionContextTabBody
          liveTurn={sessionLiveTurn}
          archivedTurns={archivedTurns}
          highlightTurnId={sessionHighlightTurnId}
          onHighlightClear={() => setSessionHighlightTurnId(null)}
          onMoveUpFromTop={() => focusDetailsTabsRow(turnKey) || upPastPanel()}
          onRequestClose={closePanel}
          onMoveDownPastTab={downPastPanel}
          sumUp={sumUp}
          answerInFlight={answerInFlight}
          creditsViewFor={creditsViewFor}
        />
      )}
    </>
  );
}
