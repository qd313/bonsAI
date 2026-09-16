/**
 * Title: Reply actions row builder
 *
 * Purpose: Builds everything that can sit under one AI reply, below the
 * answer itself: the Helpful / Not really thumbs, the "what went wrong"
 * chips that appear once someone picks Not really, an optional Read aloud
 * line, and the Show details line. Not every reply shows all of them — one
 * still arriving, or one already rated, shows fewer.
 *
 *     ┌─ reply actions ─────────────────────┐
 *     │   Helpful        Not really         │  <- thumbs
 *     │   (only once Not really is picked)  │
 *     │   [chip] [chip] [chip]              │  <- what went wrong
 *     │   [chip] [chip]                     │  <- too long / too short
 *     │   (chip error text, if a chip failed)│
 *     │  ──────── Read aloud ────────       │  <- optional
 *     │  ──────── Show details ↓ ───        │
 *     └───────────────────────────────────────┘
 *
 * Used for: MainTabChatTranscript, once per reply, and the wider chat
 * screen's D-pad wiring that connects this row to the reply above it and
 * whatever comes after it.
 *
 * Solves: This is a plain function, not a component, so the row it returns
 * plugs straight into the chat screen's own D-pad graph as a sibling of the
 * transcript, rather than living in an isolated component tree of its own.
 *
 * Does not: Send the follow-up question itself when a chip is pressed — see
 * useBonsaiAskOrchestration's reply-chip handling.
 *
 * How it works:
 * 1. Work out which pieces even show. Chips only appear once someone picks
 *    Not really; the Read aloud line only when a caller supplied a handler
 *    for it; the Show details line only when a caller supplied its toggle.
 *    If none of that applies and there is no rating yet either, the whole
 *    row renders nothing.
 * 2. renderChipRow() draws one row of "what went wrong" chips from a list of
 *    chip ids, and is called twice — once for the three reasons about the
 *    answer itself, once for "too long" / "too short".
 * 3. Wire D-pad Up and Down between whichever pieces are showing, in the
 *    order drawn above — a piece that is missing is skipped, so its
 *    neighbours reach past it (thumbs down to Read aloud when there is no
 *    Show details line, and so on).
 * 4. Each row answers presses two ways — its own onMoveUp/onMoveDown, and a
 *    shared pressHandler() wired to onButtonDown — because Decky delivers a
 *    directional press through onButtonDown in practice, though onMoveUp and
 *    onMoveDown are the documented way and are kept as a backup. A focus
 *    check in pressHandler() stops the two from double-handling one press.
 * 5. Assemble the whole row's JSX in the same top-to-bottom order.
 *
 * Gotchas:
 * - Every hand-off between rows here that crosses into a different Deck
 *   navigation container — into the answer bubble, or into a glossary-term
 *   chip inside it — asks Steam for its own focus transfer first
 *   (takeAnswerBubbleNavFocus()) instead of calling focus() directly. A
 *   plain focus() only moves the browser's own idea of what is focused, and
 *   this repo has lost fixes to Steam's ring disagreeing with that before.
 * - This file has no hooks available to it (see Solves above), so the row
 *   elements it needs to remember between a render and a later key press are
 *   held in plain objects created fresh each render, not refs.
 */
import React from "react";
import { Focusable } from "@decky/ui";
import { BonsaiChatSecondaryButton } from "../components/BonsaiChatSecondaryButton";
import { ThumbDownOutlineIcon, ThumbUpOutlineIcon } from "../components/icons";
import type { ReplyMicroActionId } from "../data/replyMicroActions";
import { replyMicroActionById } from "../data/replyMicroActions";
import {
  focusDownFromReplyUtilityRow,
  focusLastReplyChip,
  focusReplyHelpful,
  focusReplyReadAloud,
  focusReplyShowDetails,
  focusUpFromReplyActions,
  queryLiveTurnSlot,
} from "./liveTurnFocusGraph";
import { registerReplyStop } from "./replyStopRegistry";
import { elementHasGamepadFocus } from "./uiDocument";
import { isDeckDirectionDownEvent, isDeckDirectionUpEvent } from "./focusNavigation";
import {
  getRegisteredAnswerBubble,
  takeAnswerBubbleNavFocus,
} from "./answerBubbleElRegistry";
import { elementIsWithinViewportOf, focusLastAnswerChunk } from "./answerBubbleNavigation";
import {
  findNextDrgGlossaryTermChipInView,
  focusDrgGlossaryTermChip,
} from "./drgGlossaryTermRegistry";
import { findScrollablePanel } from "./chatPanelScroll";

const CHIP_ROW_REFINE: ReplyMicroActionId[] = [
  "bad_information",
  "misidentified_game",
  "unfenced_spoiler",
];
const CHIP_ROW_LENGTH: ReplyMicroActionId[] = ["too_long", "too_short"];

export type BuildReplyActionsElementArgs = {
  replyKey: string;
  rating: "up" | "down" | null;
  onRate: (rating: "up" | "down") => void;
  showFeedback: boolean;
  /**
   * The reply is not a finished answer — today that means Stop was pressed and only part of it was
   * kept. Helpful / Not really are shown but greyed out; Retry stays live, because it is the button
   * a person actually wants after stopping something. Rating a half-written answer says nothing
   * about the reply and the rating is saved, so it would quietly spoil the feedback that gets read
   * later. Maintainer's call, 2026-09-05.
   */
  ratingUnavailable?: boolean;
  transparencyOpen?: boolean;
  onToggleTransparency?: () => void;
  chipsDisabled?: boolean;
  chipUsed?: boolean;
  chipError?: string | null;
  onChip?: (chipId: ReplyMicroActionId) => void;
  askInFlight?: boolean;
  /**
   * When set, a Read aloud / Stop line renders between the thumbs (or refinement chips, when
   * shown) and the Show details line — same shape as Show details, one row up. `readAloudLabel`
   * is the whole line's text ("Read aloud" or "Stop"); the caller decides which by tracking which
   * answer is currently speaking.
   */
  onReadAloudToggle?: () => void;
  readAloudLabel?: string;
  /** When set, D-pad Up from reply actions focuses strategy chrome before the answer bubble. */
  onMoveUpFromReply?: () => boolean;
  /** D-pad Up from utility row (Retry / Show details) when no chip rows are visible. */
  onMoveUpFromUtility?: () => boolean;
  /** D-pad Up from the first refinement chip → thumbs row. */
  onMoveUpFromChips?: () => boolean;
  /** D-pad Down from thumbs → utility row (Retry). */
  onMoveDownFromThumbs?: () => boolean;
  /** D-pad Down from utility row (Retry / Show details) → context hint / session strip. */
  onMoveDownFromUtility?: () => boolean;
};

function renderChipRow(
  chipIds: ReplyMicroActionId[],
  args: {
    chipsDisabled: boolean;
    onChip?: (chipId: ReplyMicroActionId) => void;
    rowClassName: string;
    onMoveUpFirst?: () => boolean;
  }
): React.ReactElement | null {
  const { chipsDisabled, onChip, rowClassName, onMoveUpFirst } = args;
  if (!onChip) return null;
  const defs = chipIds.map((id) => replyMicroActionById(id)).filter(Boolean);
  if (!defs.length) return null;
  return (
    <Focusable className={rowClassName} flow-children="horizontal">
      {defs.map((def) => (
        <BonsaiChatSecondaryButton
          key={def!.id}
          disabled={chipsDisabled}
          onClick={() => onChip(def!.id)}
          aria-label={def!.label}
          deckNav={
            onMoveUpFirst && def!.id === chipIds[0]
              ? { onMoveUp: () => onMoveUpFirst() ?? false }
              : undefined
          }
        >
          {def!.label}
        </BonsaiChatSecondaryButton>
      ))}
    </Focusable>
  );
}

/*
 * A plain function, not a component, so the row it returns is a direct
 * sibling of the transcript in the D-pad graph rather than sitting inside
 * its own React tree — see the file header's Solves note.
 *
 * In: BuildReplyActionsElementArgs — the reply's own key, its current rating,
 * whether feedback and the chip rows should show, the Read aloud and Show
 * details callbacks, and the handful of D-pad hand-off functions a caller
 * can supply for the row's own Up and Down edges.
 * Out: the finished row, or null when nothing in it would show.
 * What can go wrong: a caller that forgets to supply onChip simply gets no
 * chip rows, even if rating is "down" — renderChipRow() returns null rather
 * than throwing. The 2026-09-05 rule that a half-written reply cannot be
 * rated (see ratingUnavailable above) is enforced by greying the thumbs out,
 * not by hiding them, so a reply stopped partway through still shows Retry
 * as the button a person actually wants next.
 *
 * 1. Read the args apart and work out which optional pieces are showing:
 *    the chip rows, the Read aloud line, the Show details divider.
 * 2. Work out whether feedback is currently allowed to be given at all
 *    (feedbackDisabled) and whether it has already been given (thumbsLocked).
 * 3. Build every D-pad hand-off this row can be asked for — moveUpFromReply,
 *    downFromThumbs, upIntoGlossaryChip, upFromRetry, upFromDivider,
 *    upFromReadAloud, downFromReadAloud, downFromDivider — each one trying
 *    its own neighbours first and falling back outward only once they all
 *    decline. See the file header's How it works for the order they chain in.
 * 4. If nothing would show at all, return null.
 * 5. Otherwise render the pieces top to bottom: thumbs, the chip rows and
 *    any chip error, the Read aloud line, then the Show details line —
 *    each wired to the hand-offs built in step 3.
 */
export function buildReplyActionsElement(
  args: BuildReplyActionsElementArgs
): React.ReactElement | null {
  const {
    replyKey,
    rating,
    onRate,
    showFeedback,
    ratingUnavailable = false,
    transparencyOpen,
    onToggleTransparency,
    chipsDisabled = false,
    chipUsed = false,
    chipError = null,
    onChip,
    askInFlight = false,
    onReadAloudToggle,
    readAloudLabel = "Read aloud",
    onMoveUpFromReply,
    onMoveUpFromChips,
    onMoveDownFromUtility,
  } = args;

  const showChipRows = Boolean(onChip) && rating === "down";
  const showReadAloudRow = Boolean(onReadAloudToggle);
  /*
   * The row of buttons under a reply is gone (D76, D77): Show details became the line below,
   * Copy moved into the answer bubble's corner and Retry onto the question bubble's. What is left
   * is the thumbs and the line.
   */
  const showDetailsDivider = Boolean(onToggleTransparency);
  const feedbackDisabled = askInFlight || ratingUnavailable;
  const chipsInactive = chipsDisabled || chipUsed || askInFlight;
  const thumbsLocked = rating !== null;

  const liveSlot = () => queryLiveTurnSlot();
  /*
   * True when a strategy branch picker or checklist is mounted between the answer bubble and this
   * row (MainTabChatTranscript draws them there, not this file). Checked before calling
   * `focusUpFromReplyActions`: that function's own last resort focuses the whole bubble rather than
   * its last section, which would undo CHAT-REPLY-ENTRY-01 for the ordinary reply if it ran on
   * every Up press. Gating on real presence keeps this row's own last-section fallback for the case
   * neither panel exists, and only adds the new hand-off when one of them does.
   */
  const hasStrategyChromeAboveReply = (slot: HTMLElement | null): boolean =>
    Boolean(slot?.querySelector(".bonsai-strategy-branch-picker, .bonsai-strategy-checklist-panel"));
  /*
   * Up from the thumbs row (Helpful / Not really) — the outer reply-actions container's own
   * `onMoveUp` falls back to the same handler. Measured on device 2026-09-04 (build f9a4c17,
   * CHAT-REPLY-ENTRY-01): this used to be a bare `() => false`, unconditionally yielding to Steam,
   * whose own geometry move landed on the bare answer bubble — never its last section — because
   * every ordinary reply has a thumbs row and this was the only path Up from it ever took. The
   * utility row (Retry / Show details) already had a last-resort chain
   * (`upFromRetry`/`upFromShowDetails` below); this gives the thumbs row the same one, minus the
   * hop to the utility row itself, since thumbs sits above it, not below.
   * `onMoveUpFromReply` is declared but has never had a supplier anywhere in this repo (checked
   * 2026-09-04) — kept rather than dropped, since the type already promises "focuses strategy
   * chrome before the answer bubble" and a caller that wants that ahead of the glossary chip and
   * the bubble fallback can still supply it without another signature change.
   *
   * Branch buttons and a checklist go ahead of the glossary chip and the bubble fallback, once
   * they exist, for the same reason `onMoveUpFromReply` is documented that way: measured on the
   * device 2026-09-05 (round35-spoiler-block-down-and-up), Up from Helpful walked straight past a
   * two-button branch picker into the answer's own paragraphs, never stopping on either button —
   * disagreeing with Down, which reaches them (via Steam's own sibling geometry, or now
   * `focusDownFromLiveAnswerBubble` below) before it ever reaches Helpful. `focusUpFromReplyActions`
   * (liveTurnFocusGraph.ts) already does exactly this hand-off and is already tested; this just
   * wires it in ahead of the chain that used to run unconditionally.
   */
  const moveUpFromReply = () => {
    if (onMoveUpFromReply?.()) return true;
    const slot = liveSlot();
    if (hasStrategyChromeAboveReply(slot) && focusUpFromReplyActions(slot)) return true;
    if (upIntoGlossaryChip()) return true;
    return focusLastAnswerChunk(replyKey);
  };
  /* Below the utility row sits the details line, then whatever was below the row before it. */
  const downFromDivider = () => {
    if (onMoveDownFromUtility?.()) return true;
    return focusDownFromReplyUtilityRow(liveSlot());
  };


  const downFromThumbsRow = () => downFromThumbs();


  /*
   * Row elements, captured at mount so a press handler can ask "is focus still mine?".
   *
   * `buildReplyActionsElement` is a plain function called during render, so a fresh holder per
   * render is the ref equivalent here — there are no hooks to use.
   */
  const thumbsRowEl: { current: HTMLElement | null } = { current: null };
  const readAloudEl: { current: HTMLElement | null } = { current: null };
  const dividerEl: { current: HTMLElement | null } = { current: null };
  /*
   * Steam's nav node for the utility row. Thumbs and utility are separate navigation containers, so
   * a DOM `focus()` alone cannot carry gamepad focus between them — see navFocusRegistry. A local
   * holder rather than the id registry: the row is built here, and a per-render object in the
   * module map would leave stale entries behind.
   */

  /*
   * D-pad handling goes through `onButtonDown`, which instrumentation confirmed is what Decky
   * delivers to these rows for a directional press (button 10 = DIR_DOWN).
   *
   * `onMoveDown` stays wired below because it is the documented mechanism and works elsewhere — the
   * answer bubble uses it — but it was never observed firing here. The focus guard makes the pair
   * safe rather than racy: whichever handler runs first moves focus off the row, and the second sees
   * that focus has left and yields instead of moving twice.
   *
   * What these handlers must NOT do is move focus with a DOM `focus()` when the destination is
   * outside this row's navigation container — that reports success without transferring Steam's
   * gamepad focus, which is what made three earlier fixes look correct. See navFocusRegistry.
   */
  const pressHandler = (
    rowEl: { current: HTMLElement | null },
    onDown: () => boolean,
    onUp: () => boolean
  ) => (evt: unknown): boolean => {
    const isDown = isDeckDirectionDownEvent(evt);
    const isUp = isDeckDirectionUpEvent(evt);
    if (!isDown && !isUp) return false;
    const el = rowEl.current;
    // Same reason as focusedStop: on Deck the row owns the gamepad ring while
    // activeElement can be somewhere else entirely, and this guard then refuses
    // a press that genuinely belongs to this row.
    if (el && !elementHasGamepadFocus(el)) return false;
    return isDown ? onDown() : onUp();
  };

  /*
   * Column-preserving vertical hops when thumbs sit directly above utility
   * (no refinement chips): Helpful↔Retry, Not really↔Show details.
   * With chips between, yield (return false) so Decky advances to the chip row.
   */
  /*
   * Hand Steam's gamepad focus to the utility row *before* picking the column inside it.
   *
   * Without `TakeFocus`, the DOM `focus()` below sets `activeElement` while `gpfocus` stays on the
   * thumbs row, so Steam handles the press itself and lands on the utility row's first child —
   * Retry. That made "Not really → Down" go to Retry instead of Show details, and made
   * "Helpful → Down" look correct only because Retry is where Steam was going to land anyway.
   * Once focus is inside the row, a plain `focus()` moves between its two buttons (same container).
   */
  /*
   * Below the thumbs sits Read aloud (when it renders) and then the Show details line — the
   * button row that used to be here is gone.
   */
  const downFromThumbs = () => {
    if (showChipRows) return false;
    if (showReadAloudRow && focusReplyReadAloud(liveSlot())) return true;
    if (showDetailsDivider && focusReplyShowDetails(liveSlot())) return true;
    return downFromDivider();
  };
  /*
   * Last fallback on the way up: hand the ring straight to a glossary chip inside this turn's
   * answer bubble. Measured on-Deck 2026-08-28 (runs/DRG-GLOSSARY-02-dpad-chip-ladder.json step 3):
   * on a turn with no thumbs row, Up from Show details yielded to Steam, which landed on the
   * bubble — reaching the chip took Up-then-Down. This runs only after every existing fallback
   * declined, so a thumbs row or refinement chips still win when they exist, and turns with no
   * chip in view are unchanged.
   *
   * The bubble is a different navigation container, hence `takeAnswerBubbleNavFocus` before the
   * DOM focus — a bare `focus()` across that boundary moves `activeElement` while Steam's ring
   * stays put, and `focusDrgGlossaryTermChip`'s elementHasFocus check is what reports the truth.
   * `replyKey` and the bubble's answerKey are the same value per turn (`turn.id`, or "live").
   */
  const upIntoGlossaryChip = () => {
    const bubble = getRegisteredAnswerBubble(replyKey);
    if (!bubble) return false;
    const scroll = findScrollablePanel(bubble);
    if (!scroll) return false;
    const chip = findNextDrgGlossaryTermChipInView(
      bubble,
      (el) => elementIsWithinViewportOf(el, scroll),
      "up",
    );
    if (!chip) return false;
    takeAnswerBubbleNavFocus(replyKey);
    return focusDrgGlossaryTermChip(chip);
  };
  /*
   * Last of all: the answer bubble's own last section, when nothing above claimed the press
   * (typically no thumbs row and no glossary chip in view). Same double-landing shape as Down from
   * the turn header — filed 2026-09-02, "Down from the chat slot lands on the whole reply before
   * its first section" — approached from underneath: without this, Up yielded to Steam and landed
   * on the bare bubble, and only a second Up walked into its last `.bonsai-answer-stop`.
   */
  const upFromRetry = () => {
    const slot = liveSlot();
    if (showChipRows && focusLastReplyChip(slot)) return true;
    if (focusReplyHelpful(slot)) return true;
    /* No thumbs row at all (a restored answer, say) — same branch/checklist hand-off as
       moveUpFromReply above, for the same reason. */
    if (hasStrategyChromeAboveReply(slot) && focusUpFromReplyActions(slot)) return true;
    if (upIntoGlossaryChip()) return true;
    return focusLastAnswerChunk(replyKey);
  };

  /* Read aloud, when it renders, sits directly above Show details; otherwise Up goes to the thumbs. */
  const upFromDivider = () => {
    if (showReadAloudRow && focusReplyReadAloud(liveSlot())) return true;
    return upFromRetry();
  };

  /* Read aloud's own Up/Down: same "up to thumbs" fallback as Show details used to use alone, and
     down to Show details when it renders, else straight to whatever sits below the utility row. */
  const upFromReadAloud = () => upFromRetry();
  const downFromReadAloud = () => {
    if (showDetailsDivider && focusReplyShowDetails(liveSlot())) return true;
    return downFromDivider();
  };

  if (!showFeedback && !showDetailsDivider && !showChipRows && !showReadAloudRow && rating === null) {
    return null;
  }

  return (
    <Focusable
      key={`reply-actions-${replyKey}`}
      className="bonsai-chat-reply-actions"
      flow-children="vertical"
      {...({
        onMoveUp: moveUpFromReply,
      } as Record<string, unknown>)}
    >
      {showFeedback && rating === "up" ? (
        <span className="bonsai-chat-feedback-row__label bonsai-chat-feedback-row--rated">
          Saved on this Deck
        </span>
      ) : null}
      {showFeedback && (rating === null || rating === "down") ? (
        <>
          <span className="bonsai-chat-feedback-row__label">Was this helpful?</span>
          <Focusable
            className="bonsai-chat-reply-actions-row"
            flow-children="horizontal"
            ref={(el: HTMLElement | null) => {
              thumbsRowEl.current = el;
            }}
            {...({
              onMoveUp: moveUpFromReply,
              onMoveDown: downFromThumbsRow,
              onButtonDown: pressHandler(thumbsRowEl, downFromThumbsRow, moveUpFromReply),
            } as Record<string, unknown>)}
          >
            <BonsaiChatSecondaryButton
              disabled={feedbackDisabled || thumbsLocked}
              onClick={() => onRate("up")}
              aria-label="Mark reply helpful"
              replyStop="helpful"
            >
              <ThumbUpOutlineIcon size={14} />
              Helpful
            </BonsaiChatSecondaryButton>
            <BonsaiChatSecondaryButton
              disabled={feedbackDisabled || thumbsLocked}
              onClick={() => onRate("down")}
              aria-label="Mark reply not helpful"
              replyStop="not-really"
            >
              <ThumbDownOutlineIcon size={14} />
              Not really
            </BonsaiChatSecondaryButton>
          </Focusable>
        </>
      ) : null}
      {showChipRows ? (
        <span className="bonsai-chat-feedback-row__label">What went wrong?</span>
      ) : null}
      {showChipRows
        ? renderChipRow(CHIP_ROW_REFINE, {
            chipsDisabled: chipsInactive,
            onChip,
            rowClassName: "bonsai-chat-reply-actions-row bonsai-chat-reply-actions-row--chips",
            onMoveUpFirst: onMoveUpFromChips,
          })
        : null}
      {showChipRows
        ? renderChipRow(CHIP_ROW_LENGTH, {
            chipsDisabled: chipsInactive,
            onChip,
            rowClassName: "bonsai-chat-reply-actions-row bonsai-chat-reply-actions-row--chips",
          })
        : null}
      {chipError ? (
        <div
          className="bonsai-chat-reply-chip-error"
          style={{ color: "#f2a0a0", fontSize: 11, lineHeight: 1.35, marginTop: 2 }}
          role="alert"
        >
          {chipError}
        </div>
      ) : null}
      {showReadAloudRow ? (
        /*
         * Read aloud / Stop, one line, same shape as Show details below it (plan 42 step 3). A
         * line rather than a button because the answer bubble's own action row is gone (D76, D77)
         * and this is the surviving shape a single reply-level control takes here.
         */
        <Focusable
          className="bonsai-chat-details-divider"
          ref={(el: HTMLElement | null) => {
            readAloudEl.current = el;
            registerReplyStop("read-aloud", el);
          }}
          onOKButton={onReadAloudToggle}
          onClick={onReadAloudToggle}
          aria-label={readAloudLabel}
          {...({
            onMoveUp: upFromReadAloud,
            onMoveDown: downFromReadAloud,
            onButtonDown: pressHandler(readAloudEl, downFromReadAloud, upFromReadAloud),
          } as Record<string, unknown>)}
        >
          <span className="bonsai-chat-details-divider-rule" />
          <span className="bonsai-chat-details-divider-label">{readAloudLabel}</span>
          <span className="bonsai-chat-details-divider-rule" />
        </Focusable>
      ) : null}
      {showDetailsDivider ? (
        /*
         * Show details is a line across the reply, not a button in the row above (D76).
         *
         * Registered under the same stop name the button used, so focusReplyShowDetails and every
         * caller of it keep working — focusRegisteredReplyStop focuses whatever node is registered
         * and does not care that this one is not a <button>.
         *
         * Same handler placement rule as the row above: the move handlers go on this Focusable.
         * `pressHandler` only answers Up and Down, so an A press still falls through to
         * onOKButton rather than being swallowed — the trap decky-focus-graph.mdc warns about.
         */
        <Focusable
          className={`bonsai-chat-details-divider${
            askInFlight ? " bonsai-chat-details-divider--disabled" : ""
          }`}
          ref={(el: HTMLElement | null) => {
            dividerEl.current = el;
            registerReplyStop("show-details", el);
          }}
          /*
           * Two sources, deliberately not three. `onOKButton` is the D-pad A press; `onClick` is a
           * finger on the screen. `onActivate` is left off on purpose: Steam fires it for the A
           * press as well, so wiring all three would toggle twice on one press. The earlier-pill
           * row uses onActivate/onOKButton and is verified on the device rather than in a test
           * (the harness strips both) — this keeps a press testable without giving up touch.
           */
          onOKButton={askInFlight ? undefined : onToggleTransparency}
          onClick={askInFlight ? undefined : onToggleTransparency}
          aria-expanded={transparencyOpen}
          aria-label={transparencyOpen ? "Hide details" : "Show details"}
          {...({
            onMoveUp: upFromDivider,
            onMoveDown: downFromDivider,
            onButtonDown: pressHandler(dividerEl, downFromDivider, upFromDivider),
          } as Record<string, unknown>)}
        >
          <span className="bonsai-chat-details-divider-rule" />
          <span className="bonsai-chat-details-divider-label">
            {transparencyOpen ? "Hide details ↑" : "Show details ↓"}
          </span>
          <span className="bonsai-chat-details-divider-rule" />
        </Focusable>
      ) : null}
    </Focusable>
  );
}
