/**
 * Title: The chat transcript
 *
 * Purpose: Everything below the Ask bar: the whole conversation in this chat
 * — the finished questions and answers from before, and the one being asked
 * right now or just finished — plus, underneath all of that, a button to
 * save the chat to the desktop.
 *
 *     (empty-state logo, only when this chat has nothing in it yet)
 *
 *     [ N earlier ]                    <- only once there are 2+ old turns
 *     ── older question ──
 *        (its answer, only while that turn is the one expanded)
 *     ── older question ──
 *     ...
 *     ── newest / live question ──
 *        the answer
 *        (a Strategy Guide branch picker or checklist, if one applies)
 *        Helpful / Not really, chips, Read aloud, Show details
 *          (opened: This answer | Session · N tabs, then that tab's own
 *           content — the chip ladder, or the session row list and Clear —
 *           plan 62 3c. Only the newest answer ever carries the Session tab.)
 *
 *     (situational hints: no game detected, a troubleshooting-shaped
 *      question with game-reading off, a permission denial)
 *     (slow-answer and applied-tuning banners)
 *     [ Save chat to Desktop ]
 *
 * Used for: MainTab, filling the space above the dock that holds the
 * suggestion row and the Ask bar.
 *
 * Solves: Keeps the transcript's own layout and D-pad wiring apart from the
 * actual asking and polling logic, so this file only ever draws what it is
 * told — never decides on its own whether a question is still running.
 *
 * Does not: Submit a question or check whether one has finished — see
 * useBonsaiAskOrchestration for that. Does not decide what one answer's own
 * text looks like — the reply bubble and its markdown renderer do that
 * (buildAnswerBubbleElement, MainTabBonsaiAiMarkdownChunk).
 *
 * How it works:
 * 1. Work out whether there is a "live" turn to show at all — not just
 *    whether there is a live answer, but whether it should currently be the
 *    one on screen. A leftover answer still sitting in state after the real
 *    history has already archived it should not summon a stray extra turn.
 * 2. Work out how many of the older, finished turns to actually draw. Once
 *    there are two or more, they collapse behind an "N earlier" pill and
 *    stay collapsed until someone taps it; the newest turn is never one of
 *    the ones hidden behind it.
 * 3. For every turn shown — older or live — draw the same three pieces in
 *    the same order: its question header (buildTurnHeaderElement()), its
 *    answer (buildAnswerBubbleElement(), through the shared
 *    renderAnswerBubble helper below), and, once the turn is finished, its
 *    row of actions (buildReplyActionsElement()) plus its own context chips.
 * 4. When Strategy Guide has more to offer on the newest answer — a branch
 *    to pick, or a checklist — draw one of renderStrategyBranchPicker() or
 *    renderStrategyChecklist() between the answer and the reply actions.
 * 5. Below all of the turns: a handful of situational hint rows (no game
 *    detected, a troubleshooting-shaped question with game-reading
 *    permission off, a VAC-check permission denial), then the slow-answer
 *    and applied-tuning banners.
 * 6. Finally, when this chat can be saved, the Save chat to Desktop button.
 *    (The separate "Session context (N turns)" box that used to sit here is
 *    gone — plan 62 3c folded its row list, chips and Clear into the newest
 *    answer's own Show details panel as a second tab; see
 *    `buildDetailsPanelElement`'s own doc comment for that focus graph.)
 *
 * Gotchas:
 * - There is deliberately no raw keyboard listener in this file for D-pad
 *   routing. A real controller press dispatches no DOM keyboard events at
 *   all (measured on device), so every hand-off lives on the elements
 *   themselves instead — buildTurnHeaderElement()'s own move into the
 *   answer, and buildAnswerBubbleElement()'s own walk through it.
 * - The permission-hint rows below the transcript register themselves as
 *   Steam navigation targets (the navRef pattern) rather than being found by
 *   a plain button and a focus() call, because a DOM focus() alone does not
 *   carry the gamepad ring across a container boundary — the same trap
 *   other files in this phase describe. focusChatPermissionHintRow() is how
 *   a caller reaches them.
 *
 * Focus graph — the Show reasoning row (plan 57, added 2026-09-17):
 *
 *   A new stop sits between an open question and its answer, on any turn
 *   whose model thought before it answered. Written down here, in the
 *   section's parent, before the control was built, because AGENTS.md
 *   ("The Steam Deck focus graph") asks for exactly that.
 *
 *     question header (Retry, then the question text)
 *        | Down
 *     Show reasoning · 41 s          <- the new stop, id "show-reasoning"
 *        | Down
 *     the answer bubble's first stop
 *
 *   Down: the header's own Down tries the reasoning row first and enters the
 *     answer only when there is no row (buildTurnHeaderElement.tsx). The row's
 *     own Down enters the answer, the same call the header used to make.
 *   Up: the row's Up hands the ring to Retry, and to the question header's own
 *     row when this turn offers no Retry. Up out of the answer needs nothing
 *     new — the answer's Up yields to Steam at its first section, and the row
 *     is the nearest thing above it, so the walk up visits the same stops as
 *     the walk down (REPLY-STOPS-MIRROR).
 *   A: opens the block of reasoning below the row, or closes it, and flips the
 *     row's own label between Show and Hide.
 *   B, only while the block is open: closes it and leaves the ring on the row.
 *     Attached as onCancelButton and only while open — measured on device
 *     2026-08-28 (DrgGlossaryTermChip.tsx): onButtonDown receives B but
 *     returning true does not stop Steam backing the ring out of the panel,
 *     and the handler's mere presence eats B even when it does nothing, so an
 *     always-on handler would leave B dead on a closed row.
 *   Being visible, not just focused: nothing new. The Main tab column's own
 *     focusin listener (useDockClearanceOnFocus) lifts whatever the ring lands
 *     on clear of the dock, and a row of this exact shape was measured doing
 *     that on the built-in screen on 2026-09-17 — the Show details row landed
 *     at 279-294 with the dock starting at 297.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanelSectionRow, Button, Focusable } from "@decky/ui";
import bonsaiLogo from "../assets/icons/bonsai-logo.svg";
import {
  BONSAI_CHAT_AI_MAX_WIDTH_CSS,
} from "../features/unified-input/constants";
import { newestReasoningLines } from "../utils/reasoningDisplay";
import {
  buildReasoningFoldRow,
  buildReasoningOpenBlock,
} from "../utils/buildReasoningFoldElement";
import { getUiDocument, uiGamepadFocusElement } from "../utils/uiDocument";
import {
  buildKbNotesBlockElement,
  kbAttachedNotesFrom,
  kbNotesBlockedBySpoiler,
  focusKbNotesBlock,
  focusUpPastLiveKbNotesBlock,
  focusUpPastSessionContextStripKbNotesBlock,
} from "../utils/buildKbNotesBlockElement";
import {
  buildDetailsPanelElement,
  focusChipLadderRow,
  focusDetailsTabsRow,
} from "../utils/buildDetailsPanelElement";
import {
  focusChatPermissionHintRow,
  focusDownFromReplyUtilityRowOrPermHint,
  earlierPillLeftNavHandlers,
  firstArchivedHeaderMoveUp,
} from "../utils/chatTranscriptNavHelpers";
import { formatAppliedTuningBannerText } from "../utils/appliedTuningText";
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import { StrategyChecklistPanel } from "./StrategyChecklistPanel";
import { PermissionDenyAction } from "./PermissionDenyAction";
import { isVacCheckCapabilityDenyResponse } from "../utils/permissionDeepLink";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { isPendingPlaceholderResponse, isStopNoticeResponse } from "../utils/askThinkingPhases";
import { BonsaiChatSecondaryButton } from "./BonsaiChatSecondaryButton";
import { buildReplyActionsElement } from "../utils/buildReplyActionsElement";
import { archivedTurnTransparency } from "../utils/archivedTurnTransparency";
import { buildAnswerBubbleElement } from "../utils/buildAnswerBubbleElement";
import { buildAnswerCopyText } from "../utils/answerCopyText";
import { buildThinkingBlurbTextElement } from "../utils/buildThinkingBlurbTextElement";
import { buildTurnHeaderElement } from "../utils/buildTurnHeaderElement";
import { buildCollapsedTurnTitle, buildExpandedTurnTitle } from "../utils/chatTurnTitle";
import { type SessionContextTurn } from "./SessionContextStrip";
import { transparencyUiAvailable } from "../utils/contextChipsFromSnapshot";
import type {
  AppliedResult,
  AskThreadCollapsedTurn,
  TurnReasoning,
  AskThreadExpandedTurnKey,
  OllamaContextUi,
  StrategyGuideBranchesPayload,
  StrategyChecklistState,
} from "../types/bonsaiUi";
import { ThinkingSpinnerIcon } from "./icons";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { useStreamScrollPin } from "../hooks/useStreamScrollPin";
import type { AskModeId } from "../data/askMode";
import type { LastExchangeSnapshot, LiveThinkingSnapshot } from "../types/backgroundAsk";
import type { ReplyMicroActionId } from "../data/replyMicroActions";
import {
  focusDeckOwner,
  focusReplyShowDetails,
  focusReplyUtilityRow,
  focusSessionContextStrip,
  queryLiveTurnSlot,
  queryTurnSlot,
} from "../utils/liveTurnFocusGraph";
import { focusAnswerChunkAtIndex, focusFirstAnswerChunk } from "../utils/answerBubbleNavigation";
import { getRegisteredAnswerBubble } from "../utils/answerBubbleElRegistry";
import { focusedAnswerStopIndex, orderedAnswerStops } from "../utils/answerStopRegistry";
import { focusRegisteredReplyStop } from "../utils/replyStopRegistry";
import { questionLooksLikeTroubleshootingAsk } from "../utils/troubleshootingAskHeuristic";
import type { DrgGlossaryTerm } from "../data/drgGlossaryTerms";
import {
  composeDrgGlossaryExplainFurtherQuestion,
  drgGlossaryExplainFurtherThreadDisplay,
} from "../utils/drgGlossaryAsk";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
import { buildAnswerReadableText } from "../utils/answerReadableText";
import { useReadAloud } from "../hooks/useReadAloud";
import { useEarlierTurnsPill } from "../hooks/useEarlierTurnsPill";
import { useKbNotesFold } from "../hooks/useKbNotesFold";
import { usePermHintNavTargets } from "../hooks/usePermHintNavTargets";
import { subscribeToSpoilerFenceOpenChange } from "./MainTabBonsaiAiMarkdownChunk";

/* Re-exported so tests that import these focus helpers from this file (their home before this
 * split) need no edit — the block itself now lives in buildKbNotesBlockElement.tsx. */
export { focusKbNotesBlock, focusUpPastLiveKbNotesBlock, focusUpPastSessionContextStripKbNotesBlock };

/**
 * Mirrors `__bonsaiTabRestoreAfterModal` in useBonsaiPluginShell.ts -- same problem, one level
 * deeper. Opening the Session tab's Clear confirm box (or any Decky modal) remounts the whole
 * plugin, which resets this component's own `transparencyDetailsOpen` and `detailsTab` state to
 * their defaults (closed, "answer") the same way it would have reset the top-level tab without
 * that other module-level variable. `expandedTurnKey` (which turn) already survives through the
 * session snapshot index.tsx restores; these two do not, because they are local to this
 * component. Plan 64 bug E: cancelling Clear used to reopen with the panel closed and the ring
 * thrown out to the tab bar, because the Clear button the return-focus registry was aiming for
 * was never rendered -- the Session tab it lives on was gone. Set right before the confirm box
 * opens (`wrapOnBeforeNestedDeckyModal` below), read and cleared by the layout effect next to
 * where `transparencyDetailsOpen`/`detailsTab` are declared.
 */
let __bonsaiDetailsPanelRestoreAfterModal: { open: boolean; tab: "answer" | "session" } | null = null;

export type MainTabChatTranscriptProps = {
  fullBleedRowStyle: React.CSSProperties;
  isAsking: boolean;
  selectedAttachment: import("../types/bonsaiUi").AskAttachment | null;
  ollamaContext: OllamaContextUi;
  unifiedInput: string;
  showSlowWarning: boolean;
  latencyWarningSeconds: number;
  ollamaResponse: string;
  elapsedSeconds: number | null;
  lastApplied: AppliedResult | null;
  canSaveDesktopNote: boolean;
  onOpenDesktopNoteSave: () => void;
  desktopNoteSaveEnabled?: boolean;
  transparencySnapshot?: TransparencySnapshot | null;
  onRunOriginalAsk?: (rawQuestion: string) => void;
  strategyGuideBranches?: StrategyGuideBranchesPayload | null;
  onStrategyBranchPick?: (opt: { id: string; label: string }) => void;
  strategyChecklist?: StrategyChecklistState | null;
  onStrategyChecklistToggle?: (itemId: string, checked: boolean) => void;
  askThreadCollapsed?: AskThreadCollapsedTurn[];
  askThreadDisplayQuestion?: string;
  expandedTurnKey?: AskThreadExpandedTurnKey;
  onTurnActivate?: (key: string | "live") => void;
  modelPolicyDisclosure?: ModelPolicyDisclosurePayload | null;
  onOpenModelPolicyReadme?: () => void;
  shortcutSetupVariant?: "deck" | "stadia" | null;
  onOpenControllerSettings?: () => void;
  strategySpoilerMaskingEnabled?: boolean;
  strategySpoilerAutoRevealAfterConsent?: boolean;
  isStreamingPreview?: boolean;
  streamDisplayText?: string;
  /** Stop was pressed on this turn: show the Stopped notice beside whatever text was kept. */
  askStopped?: boolean;
  /**
  * What fills the space under your question while the answer is being made: the stock waiting
  * phrase, and — on a model that thinks — the model's own newest words, plus (plan 58 phase 1)
  * which knowledge-base notes are attached so far. See LiveThinkingSnapshot.
  *
  * The `kbAttachedNotes` field is read off the same background poll status, the same way the
  * summary and reasoning fields already are — the live-before-the-first-word case (the lesson
  * the spoiler work paid for: a per-turn fact that only arrives with the finished reply
  * flickers). `transparencySnapshot` above is a *post-completion* fetch (`get_input_transparency`,
  * refreshed once an Ask finishes) and does not update mid-stream, so it cannot serve this by
  * itself. `index.tsx` supplies `liveThinking` from the background poll status, and main.py's
  * `_merge_partial_into_background_status` already copies the live snapshot's own note list into
  * it. `kbAttachedNotes` also does a second job once the reply finishes: the transcript below
  * keeps using it as a fallback until `transparencySnapshot` actually lands, since that fetch is
  * async and fires after completion (see the notes block's own comment where it reads this).
  */
  liveThinking?: LiveThinkingSnapshot | null;
  desktopAskVerboseLogging?: boolean;
  lastRequestId?: number | null;
  lastExchange?: LastExchangeSnapshot | null;
  onRetryLastResponse?: () => void;
  liveReplyFeedbackRating?: "up" | "down" | null;
  onReplyFeedback?: (rating: "up" | "down") => void;
  onReplyMicroAction?: (chipId: ReplyMicroActionId) => void;
  liveReplyChipUsed?: boolean;
  liveReplyChipError?: string | null;
  askMode: AskModeId;
  /** When false, troubleshooting-shaped Asks show a dismissible hint to enable game-context permission. */
  gameContextReadEnabled?: boolean;
  onNavigateToPermissions?: (capability: BonsaiCapabilityKey) => void;
  /**
   * Starts a new Ask turn programmatically — same function preset chips and strategy branches
   * already use (useBonsaiAskOrchestration). Backs the DRG Survivor glossary "explain further" chip;
   * already part of MainTabProps and reaches this component via MainTab's `{...props}` spread, so
   * this only needs declaring here to type it.
   */
  onAskOllama?: (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => void | Promise<void>;
  /**
   * D105, now the Session tab's own Clear confirm box (plan 62 3c folded the standalone strip's
   * Clear into it): wrapped the same way Settings' two confirm boxes are -- opening any Decky
   * modal remounts the plugin, and skipping these would let the remount undo whichever turn is
   * expanded right now. Already part of MainTabProps (as `onBeforeNestedDeckyModal` /
   * `onCompleteNestedDeckyModalClose`, the names the chat-slot rename modal already uses) and
   * reaches this component via MainTab's plain `{...props}` spread, the same route `onAskOllama`
   * documents above; only needs declaring here to type it and hand it on to `buildDetailsPanelElement`.
   */
  onBeforeNestedDeckyModal?: () => void;
  onCompleteNestedDeckyModalClose?: (close: () => void) => void;
  /**
   * The slot row's carousel is sitting on the `[+]` create position. Cycling there deliberately
   * does not change the active slot, so the transcript cannot see it any other way; while it is
   * true the empty-slot preview stands in for the turn column even if the previous slot had
   * content (the drawn behavior of board 8f).
   */
  showEmptySlotPreview?: boolean;
  /**
   * The pending Ask belongs to a different chat slot. `isAsking` still has to be true — the ask
   * bar is genuinely busy — but this slot must not grow a live turn header for someone else's
   * question, which would also hide the empty-slot preview.
   */
  isForeignPendingAsk?: boolean;
};

/* Re-exported so tests that import these nav helpers from this file (their home before this
 * split) need no edit — they now live in chatTranscriptNavHelpers.ts. */
export {
  focusChatPermissionHintRow,
  focusDownFromReplyUtilityRowOrPermHint,
  earlierPillLeftNavHandlers,
  firstArchivedHeaderMoveUp,
};

/*
 * In: MainTabChatTranscriptProps — the live question and answer text (or the
 * streaming preview of it), the finished-turn history, which turn is
 * currently expanded, the Strategy Guide branch/checklist state, and a long
 * list of smaller flags and callbacks for feedback, permissions, and the
 * desktop-save button.
 * Out: the whole transcript, as drawn in the file header above.
 * What can go wrong: almost nothing is computed here beyond working out
 * which turns and panels should currently be visible — this function mostly
 * arranges props and derived flags into JSX. See the file header's Gotchas
 * for the two focus traps this file specifically works around.
 *
 * See the file header's How it works for the full step order; in short:
 * 1. Work out whether a live turn should show at all.
 * 2. Work out which older turns are visible versus collapsed behind the
 *    "N earlier" pill.
 * 3. Draw every visible turn's header, answer, and (once finished) its
 *    reply actions and context chips, through the shared helpers defined
 *    just above this function.
 * 4. Fold in a Strategy Guide branch picker or checklist where one applies.
 * 5. Draw the situational hint rows and warning banners below the turns.
 * 6. Draw the Save chat to Desktop button.
 */
export function MainTabChatTranscript(props: MainTabChatTranscriptProps) {
  const {
    fullBleedRowStyle,
    isAsking,
    showEmptySlotPreview = false,
    isForeignPendingAsk = false,
    selectedAttachment,
    ollamaContext,
    unifiedInput,
    showSlowWarning,
    latencyWarningSeconds,
    ollamaResponse,
    elapsedSeconds,
    lastApplied,
    canSaveDesktopNote,
    onOpenDesktopNoteSave,
    desktopNoteSaveEnabled = true,
    transparencySnapshot = null,
    strategyGuideBranches = null,
    onStrategyBranchPick,
    strategyChecklist = null,
    onStrategyChecklistToggle,
    askThreadCollapsed = [],
    askThreadDisplayQuestion = "",
    expandedTurnKey = "live",
    onTurnActivate,
    shortcutSetupVariant = null,
    onOpenControllerSettings,
    strategySpoilerMaskingEnabled = true,
    strategySpoilerAutoRevealAfterConsent = false,
    isStreamingPreview = false,
    streamDisplayText = "",
    askStopped = false,
    liveThinking = null,
    desktopAskVerboseLogging = false,
    lastExchange = null,
    onRetryLastResponse,
    liveReplyFeedbackRating = null,
    onReplyFeedback,
    onReplyMicroAction,
    liveReplyChipUsed = false,
    liveReplyChipError = null,
    askMode,
    gameContextReadEnabled = false,
    onNavigateToPermissions,
    onAskOllama,
    onBeforeNestedDeckyModal,
    onCompleteNestedDeckyModalClose,
  } = props;

  const [sessionHighlightTurnId, setSessionHighlightTurnId] = useState<string | null>(null);
  const [transparencyDetailsOpen, setTransparencyDetailsOpen] = useState(false);
  /**
   * Which tab is showing inside the newest answer's own Show details panel (plan 62 3c). Only the
   * newest turn ever renders the tabs at all — see `renderDetailsPanel`'s `isNewest` — so this one
   * piece of state is unambiguous the same way `transparencyDetailsOpen` already is for "which turn
   * is expanded": only one turn is ever newest, the same reasoning `expandedTurnKey` itself rests
   * on above.
   */
  const [detailsTab, setDetailsTab] = useState<"answer" | "session">("answer");
  const [troubleshootingPermHintDismissed, setTroubleshootingPermHintDismissed] = useState(false);

  /*
   * Stashes the panel's own open/closed state and active tab into the module-level ref right
   * before a nested Decky modal (Clear's confirm box today) throws the whole plugin's React state
   * away. Without this, cancelling Clear reopened on "This answer" with the panel closed instead
   * of back on "Session" with Clear itself focused -- the return-focus registry had a real id to
   * aim for, but nothing left for it to find, because the Session tab's body was never rendered.
   * The restore side sits below, after the "reset on turn change" effect -- see its own comment
   * for why the ordering between the two matters.
   */
  const wrapOnBeforeNestedDeckyModal = useCallback(() => {
    __bonsaiDetailsPanelRestoreAfterModal = { open: transparencyDetailsOpen, tab: detailsTab };
    onBeforeNestedDeckyModal?.();
  }, [transparencyDetailsOpen, detailsTab, onBeforeNestedDeckyModal]);

  /*
   * Read aloud / Stop (plan 42 step 3a). One instance for the whole transcript — the background
   * reader can only speak one answer at a time, so "which turn is speaking" lives here rather than
   * per-turn state.
   */
  const readAloud = useReadAloud();
  const buildTurnReadableText = (
    body: string,
    askQuestion: string,
    appId: string | null,
    appName: string | null,
    askedEntity: string | null,
    spoilerConsentEffective = false
  ) =>
    buildAnswerReadableText({
      body,
      spoilerMaskingEnabled: strategySpoilerMaskingEnabled,
      askQuestion,
      appId,
      appName,
      askedEntity,
      spoilerConsentEffective,
    });
  /** Read aloud props for one turn's reply-actions row: same shape at every call site. */
  const readAloudRowProps = (
    key: string,
    body: string,
    askQuestion: string,
    appId: string | null,
    appName: string | null,
    askedEntity: string | null,
    spoilerConsentEffective = false
  ) => {
    /*
     * A reading that started on its own (Voice replies set to Always or By voice) is keyed "live"
     * by the hook, because the hook cannot know which block will draw the newest answer. Measured
     * on the Deck 2026-09-12: by the time the reading starts, the finished answer is already
     * drawn as the newest *archived* turn (its key is the turn id), so a plain key match left the
     * line saying Read aloud while the Deck was talking, and a press restarted it instead of
     * stopping it. "live" therefore matches whichever block is drawing the newest answer.
     */
    const newestAnswerKey = showLiveTurn ? "live" : askThreadCollapsed[askThreadCollapsed.length - 1]?.id;
    const isReadingThis =
      readAloud.state === "speaking" &&
      (readAloud.speakingKey === key || (readAloud.speakingKey === "live" && key === newestAnswerKey));
    return {
      readAloudLabel: isReadingThis ? "Stop" : "Read aloud",
      onReadAloudToggle: () => {
        if (isReadingThis) {
          readAloud.stop();
          return;
        }
        readAloud.start(
          key,
          buildTurnReadableText(body, askQuestion, appId, appName, askedEntity, spoilerConsentEffective)
        );
      },
    };
  };

  /*
   * A new Ask stops whatever is being read aloud (plan 42 step 3a). Watching `isAsking` here,
   * rather than wherever an Ask happens to start, catches every path that begins one — the Ask
   * button, a follow-up chip, "Ask again" — since they all flip this same prop true, and stopping
   * is idempotent when nothing is speaking.
   */
  const wasAskingRef = useRef(false);
  useEffect(() => {
    if (isAsking && !wasAskingRef.current) {
      readAloud.stop();
    }
    wasAskingRef.current = isAsking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAsking]);

  /*
   * `expandedTurnKey` is a dependency because the details panel is a single boolean shared by
   * whichever turn is expanded — only one ever is. Without the reset, opening details on one turn
   * and then expanding another would show the second turn already open on the first one's chips.
   */
  useEffect(() => {
    setSessionHighlightTurnId(null);
    setTransparencyDetailsOpen(false);
    setDetailsTab("answer");
  }, [
    transparencySnapshot?.raw_question,
    transparencySnapshot?.final_response,
    expandedTurnKey,
  ]);

  /*
   * Plan 64 bug E, other half: put `transparencyDetailsOpen`/`detailsTab` back the way
   * `wrapOnBeforeNestedDeckyModal` above left them, on the very next mount after a Decky modal
   * (Clear, or any nested confirm box) remounted the plugin and reset both to their React
   * defaults. Mirrors `__bonsaiTabRestoreAfterModal` in useBonsaiPluginShell.ts -- same problem,
   * one level deeper (`expandedTurnKey`, which turn, already survives through the session
   * snapshot index.tsx restores; these two are local to this component, so nothing else puts them
   * back).
   *
   * Declared AFTER the "reset on turn change" effect just above on purpose, not before it: that
   * effect's own dependencies (`expandedTurnKey`, `transparencySnapshot`'s question/response) go
   * from unset to their real values on this same first mount, so it fires too and would otherwise
   * win the race, closing the panel this effect just reopened. React runs same-phase effects in
   * the order they were declared, so being textually second is what makes this one run last and
   * be the value that sticks.
   */
  useEffect(() => {
    const pending = __bonsaiDetailsPanelRestoreAfterModal;
    if (pending == null) return;
    __bonsaiDetailsPanelRestoreAfterModal = null;
    setTransparencyDetailsOpen(pending.open);
    setDetailsTab(pending.tab);
  }, []);

  const noActiveGameContext =
    ollamaContext?.app_context !== "active" || !ollamaContext?.app_id?.trim();

  /**
   * Details toggle for one turn. Parameterised by turn key because the row is no longer live-only:
   * a slot-restored turn is expanded instead of "live" (useChatSlots.applySlotTranscript), and the
   * session-context highlight has to name the turn actually being inspected.
   */
  const makeToggleTransparencyDetails = (turnKey: string) => () => {
    setTransparencyDetailsOpen((open) => {
      const next = !open;
      setSessionHighlightTurnId(next ? turnKey : null);
      return next;
    });
  };

  const onToggleTransparencyDetails = makeToggleTransparencyDetails("live");

  const archivedTransparencyFor = (turn: AskThreadCollapsedTurn, index: number) =>
    archivedTurnTransparency({
      turn,
      index,
      total: askThreadCollapsed.length,
      liveSnapshot: transparencySnapshot,
    });

  /* The stock waiting phrase. Unchanged behaviour; it just arrives in the same parcel now. */
  const thinkingSummary = liveThinking?.summary ?? null;
  /*
   * The model's own thinking on the question running right now.
   *
   * `hasLiveReasoning` stays true for the rest of the turn once the first thought has arrived —
   * the slice is kept, not cleared, when the answer starts — which is what lets the stock waiting
   * phrase step aside for good on a turn where the model really did think.
   */
  const liveReasoningPartial = liveThinking?.reasoning?.partial ?? "";
  const hasLiveReasoning = liveReasoningPartial.trim().length > 0;
  const liveReasoningLines = hasLiveReasoning ? newestReasoningLines(liveReasoningPartial) : [];
  const liveQuestion = askThreadDisplayQuestion.trim();
  const liveResponseBody = isStreamingPreview ? streamDisplayText : ollamaResponse;
  const showLiveResponse =
    Boolean(liveResponseBody.trim()) &&
    !(isAsking && !isStreamingPreview && isPendingPlaceholderResponse(liveResponseBody));
  /*
   * The three live lines show only while the wait is still a wait. The moment the first of the
   * answer arrives the block goes, because the answer needs the room: with the question header
   * and a 50px block at the top of the visible chat, about 61px are left for the answer, which is
   * under four lines (measured on the built-in screen 2026-09-17,
   * docs/test-evidence/plan57-M-fold-row-and-live-block.json).
   */
  const showLiveReasoningBlock =
    expandedTurnKey === "live" && isAsking && hasLiveReasoning && !showLiveResponse;
  /*
   * The thinking the live turn's fold row opens.
   *
   * Once the answer has finished, the finished record wins: it is the whole thinking the computer
   * side kept, where the live slice is only the newest 600 characters. Before that, the slice is
   * all there is, and showing it is better than a row that opens on nothing.
   */
  const liveTurnReasoning: TurnReasoning | null =
    lastExchange?.reasoning ??
    (hasLiveReasoning
      ? {
          text: liveReasoningPartial,
          seconds: liveThinking?.reasoning?.seconds ?? null,
          tokens: 0,
        }
      : null);

  /*
   * Which turn's reasoning block is open, if any. Closed by default, always: this starts at null
   * on every mount, so a reopened saved chat and a panel closed and opened again both come back
   * closed, and changing which turn is open closes it too.
   */
  const [reasoningOpenFor, setReasoningOpenFor] = useState<string | null>(null);
  useEffect(() => {
    setReasoningOpenFor(null);
  }, [expandedTurnKey]);

  /* Which turns have their "From the notes" block open, and scrolling a block's own header into
     view the moment it opens — lifted into its own hook, called from exactly the spot this block
     occupied (tests/test_ask_hook_order.py). */
  const { isKbNotesOpen, toggleKbNotesOpen, kbNotesHeaderElRefs } = useKbNotesFold();

  /*
   * Plan 58 phase 1: re-render whenever a spoiler fence opens or closes anywhere, so
   * kbNotesBlockedBySpoiler's read of anySpoilerFenceOpen() below is never stale. The count
   * itself lives in MainTabBonsaiAiMarkdownChunk.tsx, several components away, and changing it
   * does not by itself cause this component to re-render — this subscription is what does.
   */
  const [, forceSpoilerOpenRecheck] = useState(0);
  useEffect(
    () => subscribeToSpoilerFenceOpenChange(() => forceSpoilerOpenRecheck((n) => n + 1)),
    []
  );

  /**
   * Feature: the Show reasoning line between a question and its answer.
   * In: the turn and the thinking behind it. Out: the line, plus the block when it is open.
   *
   * What can go wrong: nothing, when there is no thinking — the caller passes null and gets null,
   * which is what keeps the line off an ordinary turn and off an answer that came back empty.
   */
  const renderReasoningFold = (turnKey: string, reasoning: TurnReasoning | null | undefined) => {
    if (!reasoning || !reasoning.text.trim()) return null;
    const open = reasoningOpenFor === turnKey;
    return (
      <>
        {buildReasoningFoldRow({
          turnId: turnKey,
          open,
          seconds: reasoning.seconds,
          onToggle: () => setReasoningOpenFor((prev) => (prev === turnKey ? null : turnKey)),
          /*
           * Up: Retry on the question above, and the question's own row when this turn has no
           * Retry. Both are siblings inside this turn's own container, so a plain focus is the
           * right move here (AGENTS.md, "The Steam Deck focus graph").
           */
          onMoveUp: () => {
            if (focusRegisteredReplyStop("retry")) return true;
            return focusDeckOwner(turnHeaderElRefs.current[turnKey] ?? null);
          },
          /* Down: into the answer, the same call the question's own Down used to make. */
          onMoveDown: () => focusFirstAnswerChunk(turnKey),
        })}
        {open ? buildReasoningOpenBlock(turnKey, reasoning.text) : null}
      </>
    );
  };
  /*
   * The response alone is not enough to justify a live turn.
   *
   * After a completed Ask the slot reload archives the exchange and expands the archived turn, but
   * `ollamaResponse` still holds that same answer. That left a live turn whose question was empty
   * and whose body was gated on `expandedTurnKey === "live"` — so it rendered as a bare header
   * reading "…" with nothing under it and nothing to activate. Requiring the live turn to be the
   * expanded one before a lone response can summon it removes that stub without hiding a real
   * answer: when live IS expanded, the response still shows.
   *
   * The separate case where a background Ask restores a response with no question (roadmap: "Live
   * Ask user bubble shows … after reopen") is NOT addressed here — that one needs the question
   * carried through get_background_game_ai_status.
   */
  const showLiveTurn =
    Boolean(liveQuestion) ||
    (isAsking && !isForeignPendingAsk) ||
    (showLiveResponse && expandedTurnKey === "live");

  /*
   * Roadmap: "the ring is lost when an answer finishes while you walk it." Walking Down into a
   * still-streaming answer parks the ring on one of its stops, registered under answerKey "live".
   * The instant the Ask completes, the slot reload archives the turn and points `expandedTurnKey`
   * at the newest archived id — `showLiveTurn` goes false and the WHOLE "live" Focusable subtree
   * below (key="live") unmounts, replaced by a brand-new turn slot (key=turn.id) in the archived
   * map above. That takes whatever stop held the ring with it: nothing on screen carries Steam's
   * ring class afterwards, and useStreamScrollPin's own delivery pass — which would otherwise bring
   * a surviving ring back into view — finds no ring to move and drags the pane to the very end
   * instead. Measured on device 2026-09-23 (docs/test-evidence/plan64-STREAM-WALK-REC-01.json,
   * try 2): ring on a live answer stop, answer finishes, "no focus event recorded", scrollTop jumps
   * to 1333 of 1333.
   *
   * The fix remembers WHICH stop held the ring while the live turn shows -- its position, and the
   * element itself -- and on any later commit where that element is gone and nothing else holds
   * the ring, hands the ring to the same position in whichever bubble now shows the turn: the live
   * one, or its archived twin (`focusAnswerChunkAtIndex`, clamped to the last stop). Recorded on
   * every render rather than once at completion, because nothing here is told when the ring moves
   * -- Steam moves it without touching React state -- so the only reliable reading is "whatever it
   * was on the last commit". A ring that has moved anywhere else (Ask, Stop, the header) is left
   * alone, matching the rest of this file's rule that a restore only ever returns the ring to where
   * it already was.
   *
   * The first version (97cde97) only restored on the live -> archived edge and failed on the Deck
   * (docs/test-evidence/plan64-STREAM-WALK-REC-01-try3.json): the stop was destroyed one step
   * earlier, when the finished answer re-rendered its sections under new keys inside the still-live
   * bubble, so by the archive edge the recorded position already read "no ring". Section keys are
   * now positional (buildAnswerBubbleElement.tsx, answerStopKey), so that step keeps the element;
   * this watches for the element going away at any step rather than at one named edge.
   */
  const liveAnswerRingStopRef = useRef<{ index: number; el: HTMLElement } | null>(null);
  useLayoutEffect(() => {
    const held = liveAnswerRingStopRef.current;
    if (held && !held.el.isConnected) {
      liveAnswerRingStopRef.current = null;
      const owner = uiGamepadFocusElement();
      const ringHeldElsewhere = Boolean(owner && owner.isConnected && owner !== getUiDocument().body);
      const targetKey = showLiveTurn ? "live" : askThreadCollapsed[askThreadCollapsed.length - 1]?.id;
      if (!ringHeldElsewhere && targetKey) focusAnswerChunkAtIndex(targetKey, held.index);
    }
    if (!showLiveTurn) return;
    const bubble = getRegisteredAnswerBubble("live");
    const stops = bubble ? orderedAnswerStops("live", bubble) : [];
    const index = focusedAnswerStopIndex(stops);
    liveAnswerRingStopRef.current = index >= 0 ? { index, el: stops[index]! } : null;
  });

  const appliedTuningBannerText = formatAppliedTuningBannerText(lastApplied);

  /* The "N earlier" pill's own open/close state and first-row focus handoff — lifted into its
     own hook, called from exactly the spot this block occupied (tests/test_ask_hook_order.py). */
  const { earlierExpanded, setEarlierExpanded, firstArchivedTurnNavRef } = useEarlierTurnsPill({
    askThreadCollapsed,
  });

  /*
   * Whether an OPEN question's title really overflows its five-line cap (roadmap: "A short
   * question fades out at its right edge as if there were more to read"). CSS alone cannot tell
   * a short question from a cut one, so the title span's own ref (passed to
   * buildTurnHeaderElement, one instance per open turn) measures scrollHeight against the
   * clientHeight the max-height cap enforces — the same shape of check ChatSlotRow.tsx uses for
   * its own title overflow. Keyed by turn id ("live" for the live turn) so switching which turn
   * is open never reads a stale measurement left by the one before it.
   */
  const [overflowingTitles, setOverflowingTitles] = useState<Record<string, boolean>>({});
  const measureTitleOverflow = (key: string) => (el: HTMLSpanElement | null) => {
    if (!el) return;
    const overflowing = el.scrollHeight - el.clientHeight > 1;
    setOverflowingTitles((prev) => (prev[key] === overflowing ? prev : { ...prev, [key]: overflowing }));
  };

  /*
   * Roadmap: "Pressing A on an open question closes it and drops the highlight" — the answer
   * folds away and the ring lands nowhere, so the next D-pad press has to place it fresh instead
   * of moving it.
   *
   * While a turn is open AND it is the newest one, buildTurnHeaderElement offers Retry (D77), and
   * activation sits on the INNER `.bonsai-chat-turn-row-body` stop so a press on the icon cannot
   * also open or close the question. Collapsing that turn drops `onRetry` (only ever passed while
   * expanded), which changes the header from two child stops to one and unmounts whichever one
   * held the ring — Steam has nothing left to fall back to. The OUTER header element keeps the
   * same key and stays mounted through that change, so once a turn collapses this hands the ring
   * back to its own row (the header, which is still on screen) rather than leaving it to land
   * wherever Steam defaults to on the next press.
   *
   * Plain `focus()` rather than the nav registry: the header never leaves its own container, it
   * only loses whichever inner stop used to hold the ring, and a plain `focus()` between elements
   * in one container is the accepted move (AGENTS.md, "The Steam Deck focus graph"). The
   * `contains` check keeps that promise honest — if the row is ever not still inside this
   * transcript's own column for some reason, this does nothing rather than reaching outside it.
   */
  const turnHeaderElRefs = useRef<Record<string, HTMLElement | null>>({});
  const prevExpandedTurnKeyRef = useRef<AskThreadExpandedTurnKey>(expandedTurnKey ?? null);
  useLayoutEffect(() => {
    const prevKey = prevExpandedTurnKeyRef.current;
    prevExpandedTurnKeyRef.current = expandedTurnKey ?? null;
    if (!prevKey || expandedTurnKey) return;
    const headerEl = turnHeaderElRefs.current[prevKey];
    if (!headerEl || !chatMainColumnRef.current?.contains(headerEl)) return;
    try {
      headerEl.focus({ preventScroll: true });
    } catch {
      /* Best effort — nothing else to fall back to for an arbitrary turn header. */
    }
  }, [expandedTurnKey]);

  /* Nav targets for the two permission-hint rows below the transcript — lifted into its own
     hook, called from exactly the spot this block occupied (tests/test_ask_hook_order.py). */
  const { troubleshootHintNavRef, vacDenyRowNavRef } = usePermHintNavTargets();

  const chatMainColumnRef = useRef<HTMLDivElement | null>(null);
  /*
     Every Ask, not only the ones the streaming preview animates. Gating on `isStreamingPreview`
     alone meant that with the preview off - or on an answer that lands in a single commit, which
     a cached or short reply does - nothing ever brought the new text into view, so a long reply
     settled with its end below the fold and the pane still at the top. Measured on device
     2026-08-30: a 900px answer in a 616px pane, scrollTop 0, 176px of tail behind the dock.
     `ollamaResponse` joins the change key for the same reason: with the preview off that, not
     `streamDisplayText`, is what changes when the answer arrives.
  */
  useStreamScrollPin(
    chatMainColumnRef,
    /*
     * The model's own thinking joins the change key for the same reason the answer text is in it:
     * while the three live lines are the only thing under the question, they are the only thing
     * changing, and the follow has to re-measure as they do — the block is 50px where the stock
     * waiting phrase was 21px, so the end of the transcript moves when it appears.
     */
    `${isStreamingPreview ? streamDisplayText : ollamaResponse}${liveReasoningPartial}`,
    isAsking || isStreamingPreview,
  );

  /*
   * Deliberately NOT gated on `expandedTurnKey === "live"`.
   *
   * Both payloads describe the most recently completed answer, and on the ordinary path that answer
   * is not live by the time they arrive: the post-Ask slot reload archives the exchange and re-points
   * the expanded key at its slot id (useChatSlots.applySlotTranscript), so a live-only gate meant the
   * picker and the checklist were never rendered at all — measured on device with the backend
   * reporting branch_options=2 and `.bonsai-strategy-branch-picker` count 0.
   *
   * Broadening the gate alone is not enough — the live *block* is gone by then too — so each of the
   * two render sites below decides for itself, exactly as Show details and the reply actions already
   * do. This is the same fix, applied to the two panels that were left behind.
   */
  const strategyBranchesReady =
    !isAsking &&
    Boolean(strategyGuideBranches?.options.length) &&
    Boolean(onStrategyBranchPick);

  const strategyChecklistReady =
    !isAsking &&
    askMode === "strategy" &&
    Boolean(strategyChecklist?.items.length) &&
    Boolean(onStrategyChecklistToggle);

  useEffect(() => {
    if (!expandedTurnKey) return;
    window.requestAnimationFrame(() => {
      const header = getUiDocument().querySelector(
        `[data-bonsai-turn-id="${expandedTurnKey}"]`
      ) as HTMLElement | null;
      header?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    });
  }, [expandedTurnKey]);

  /*
   * There is deliberately NO keydown listener for D-pad routing here. One lived in this spot
   * until 2026-08-27, carrying the header→bubble entry edge and the answer-walk dispatch — and
   * it was dead code on device: a real controller DOWN press dispatches zero DOM keyboard
   * events into the plugin (measured with a capture-phase logger on `document`, bridge press,
   * empty log). Steam routes the D-pad through its own focus tree, which invokes `Focusable`
   * `onMoveUp`/`onMoveDown` props — so those edges now live on the elements themselves:
   * buildTurnHeaderElement (header→bubble) and buildAnswerBubbleElement (bubble/stop walk).
   * See docs/audit/spoiler-dpad-01-keydown-dead-code-2026-08-27.md before reintroducing one.
   */

  /*
   * askQuestion/appId are the inputs the asked-entity spoiler unwrap runs on, so they must be
   * supplied for history turns too — not just "live". Deriving them from answerKey === "live"
   * meant an answer rendered unfenced while it was live and then re-fenced itself the moment
   * the next Ask pushed it into the collapsed thread.
   */
  /*
   * DRG Survivor glossary "explain further" chip (roadmap: tap-to-define jargon). Same
   * programmatic-Ask shape onStrategyBranchPick already uses: fill the input, then call
   * onAskOllama directly rather than requiring a manual Send.
   *
   * useCallback keyed only on onAskOllama, not on every render: MainTabBonsaiAiMarkdownChunk is
   * memoised specifically so the streaming reveal's per-tick re-renders skip re-parsing closed
   * markdown blocks, and a fresh function identity here on every render would defeat that for
   * every DRG Survivor reply (see the memo note on that component).
   */
  const onDrgGlossaryExplainFurther = useCallback(
    (term: DrgGlossaryTerm) => {
      if (!onAskOllama) return;
      void onAskOllama(composeDrgGlossaryExplainFurtherQuestion(term), {
        threadQuestionDisplay: drgGlossaryExplainFurtherThreadDisplay(term),
      });
    },
    [onAskOllama]
  );

  const renderAnswerBubble = (
    body: string,
    streaming: boolean,
    answerKey: string,
    askQuestion: string,
    appId: string | null,
    appName: string | null,
    askedEntity: string | null,
    spoilerConsentEffective = false
  ) =>
    buildAnswerBubbleElement({
      body,
      streaming,
      spoilerMaskingEnabled: strategySpoilerMaskingEnabled,
      spoilerDefaultExpanded:
        answerKey === "live" &&
        strategySpoilerAutoRevealAfterConsent &&
        spoilerConsentEffective,
      maxWidthCss: BONSAI_CHAT_AI_MAX_WIDTH_CSS,
      answerKey,
      askQuestion,
      appId,
      appName,
      askedEntity,
      spoilerConsentEffective,
      onDrgGlossaryExplainFurther: onAskOllama ? onDrgGlossaryExplainFurther : undefined,
      /*
       * Copy moved into this bubble's corner (D77). Everything buildAnswerCopyText needs is already
       * a parameter here, so it is computed once for both the archived and the live branch rather
       * than twice down in the reply row, where it used to live.
       *
       * Never while streaming: the bubble has no settled bottom to pin the icon to, and the text
       * would change under the press.
       */
      getAnswerCopyText:
        !streaming && body.trim()
          ? () =>
              buildAnswerCopyText({
                body,
                spoilerMaskingEnabled: strategySpoilerMaskingEnabled,
                askQuestion,
                appId,
                appName,
                askedEntity,
                spoilerConsentEffective,
              })
          : undefined,
    });

  /*
   * The two strategy panels, rendered from whichever turn slot currently holds the newest answer.
   *
   * Extracted verbatim from the live branch so the archived branch can render the same markup rather
   * than a second copy of it. `placementKey` only distinguishes the React keys — the panels' D-pad
   * edges are position-based, not id-based: each edge exit returns false so the parent turn-slot
   * Focusable advances to the sibling above (answer bubble) or below (reply actions), and both
   * siblings sit in the same order in either branch. `liveTurnFocusGraph` reads them out of whatever
   * slot it is handed, so nothing there needs to change.
   */
  const renderStrategyBranchPicker = (placementKey: string) => {
    if (!strategyBranchesReady || !strategyGuideBranches || !onStrategyBranchPick) return null;
    return (
      <Focusable
        key={`strategy-branches-${placementKey}`}
        className="bonsai-glass-panel bonsai-strategy-branch-picker"
        flow-children="vertical"
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 4,
          marginBottom: 8,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid rgba(150, 187, 223, 0.45)",
          background:
            "linear-gradient(180deg, rgba(64, 93, 124, 0.42) 0%, rgba(48, 71, 95, 0.42) 100%)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 12, color: "#dce8f4", fontWeight: 600 }}>
          {strategyGuideBranches.question}
        </div>
        {strategyGuideBranches.options.map((opt, idx) => {
          const lastIdx = strategyGuideBranches.options.length - 1;
          /*
           * Edge exits return false so the parent turn-slot Focusable advances to the
           * previous/next sibling (answer bubble / reply actions). Programmatic .focus()
           * is unreliable on Deck and caused skips to Save chat.
           */
          const deckNav =
            idx === 0 || idx === lastIdx
              ? {
                  ...(idx === 0 ? { onMoveUp: () => false } : {}),
                  ...(idx === lastIdx ? { onMoveDown: () => false } : {}),
                }
              : undefined;
          return (
            <BonsaiChatSecondaryButton
              key={`sg-branch-${opt.id}-${idx}`}
              className="bonsai-strategy-branch-btn"
              onClick={() => onStrategyBranchPick(opt)}
              style={{
                width: "100%",
                minHeight: 36,
                fontSize: 12,
                fontWeight: 600,
                color: "#e8eef4",
                justifyContent: "flex-start",
                textAlign: "left",
                borderRadius: 4,
                border: "1px solid rgba(150, 187, 223, 0.35)",
                background: "rgba(36, 52, 70, 0.75)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
              }}
              deckNav={deckNav}
            >
              {`${String.fromCharCode(65 + idx)}. ${opt.label}`}
            </BonsaiChatSecondaryButton>
          );
        })}
      </Focusable>
    );
  };

  const renderStrategyChecklist = (placementKey: string) => {
    if (!strategyChecklistReady || !strategyChecklist || !onStrategyChecklistToggle) return null;
    return (
      <StrategyChecklistPanel
        key={`strategy-checklist-${placementKey}`}
        checklist={strategyChecklist}
        onToggle={onStrategyChecklistToggle}
        onMoveUpFromFirst={() => false}
        onMoveDownFromLast={() => false}
      />
    );
  };

  const showTransparencyUi = transparencyUiAvailable(transparencySnapshot);
  const renderInlineLadder =
    expandedTurnKey === "live" &&
    !isAsking &&
    showTransparencyUi &&
    transparencyDetailsOpen;
  /*
   * Formerly its own always-visible "Ask diagnostics" block below the applied-tuning banner,
   * independent of Show details (roadmap: "Fold Show diagnostics into Show details"). Same gate as
   * before — desktop verbose logging on, and the backend actually returned ask_diagnostics for the
   * most recently completed Ask — now handed to the Developer details chip instead of a second
   * button. `transparencySnapshot` never changes mid-turn, so this one value is correct both for the
   * live ladder and for the newest archived turn's ladder below (see isNewestArchivedTurn).
   */
  const devDiagnosticsForLiveSnapshot = desktopAskVerboseLogging
    ? (transparencySnapshot?.ask_diagnostics ?? null)
    : null;

  const sessionLiveTurnForTabs: SessionContextTurn | null =
    showTransparencyUi && transparencySnapshot
      ? {
          id: "live",
          label: (askThreadDisplayQuestion || lastExchange?.question || "Latest Ask")
            .trim()
            .slice(0, 48),
          question: (askThreadDisplayQuestion || lastExchange?.question || "").trim(),
          snapshot: transparencySnapshot,
        }
      : null;

  /*
   * "N earlier" collapses the older archived turns behind one pill, so a long slot opens on its
   * newest answer instead of a wall of headers.
   *
   * "Earlier" must never include the newest visible turn. On the ordinary path that turn is
   * ARCHIVED, not live: after a completed Ask and after every QAM reopen `applySlotTranscript`
   * archives every turn and points `expandedTurnKey` at the newest archived id, so `showLiveTurn`
   * is false. Collapsing all archived turns there would hide the newest answer and leave the
   * expanded key naming a row that is not on screen.
   */
  const earlierTurns = showLiveTurn ? askThreadCollapsed : askThreadCollapsed.slice(0, -1);
  const earlierCount = earlierTurns.length;
  const hidesEarlierTurns = earlierCount >= 2 && !earlierExpanded;
  /* Index offset so each rendered turn keeps its position in `askThreadCollapsed` — the
     transparency lookup and the newest-archived check both depend on it. */
  const archivedRenderOffset = hidesEarlierTurns ? earlierCount : 0;
  const archivedTurnsToRender = hidesEarlierTurns
    ? askThreadCollapsed.slice(earlierCount)
    : askThreadCollapsed;

  return (
    <>
{(showEmptySlotPreview || (askThreadCollapsed.length === 0 && !showLiveTurn)) && (
  <PanelSectionRow>
    <div className="bonsai-chat-empty-state" aria-hidden>
      <img src={bonsaiLogo} className="bonsai-chat-empty-logo" alt="" />
      <div className="bonsai-chat-empty-caption">Ask anything — this slot keeps its own history.</div>
    </div>
  </PanelSectionRow>
)}
{!showEmptySlotPreview && (askThreadCollapsed.length > 0 || showLiveTurn) && (
  <PanelSectionRow>
    <div
      ref={chatMainColumnRef}
      className="bonsai-chat-main-column"
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      <div className="bonsai-chat-transcript">
        {hidesEarlierTurns ? (
          <Focusable
            className="bonsai-chat-earlier-pill-row"
            onActivate={() => setEarlierExpanded(true)}
            onOKButton={() => setEarlierExpanded(true)}
            {...earlierPillLeftNavHandlers()}
          >
            <span className="bonsai-chat-earlier-pill">{earlierCount} earlier</span>
            <span className="bonsai-chat-earlier-rule" />
          </Focusable>
        ) : null}
        {archivedTurnsToRender.map((turn, renderIndex) => {
          const turnIndex = renderIndex + archivedRenderOffset;
          /* Hoisted out of the reply-actions IIFE below: the strategy panels need it too. */
          const isNewestArchivedTurn = turnIndex === askThreadCollapsed.length - 1;
          /*
           * A stopped Ask is persisted to the chat slot like any other turn (main.py records the
           * assistant turn on both cancel paths), so the reload this triggers (onSlotTurnsChanged)
           * archives it exactly like a completed Ask — expandedTurnKey moves off "live" onto this
           * turn's own id. `askStopped` survives that reload (only cleared by the next Ask or by
           * Clear cache), so it is still readable here; it is the render gate below that stopped
           * looking in the right place. `isStopNoticeResponse` tells a real kept draft apart from
           * the backend's own placeholder text ("Request cancelled.") for the no-draft case — the
           * deliberate "an empty stop shows nothing" behaviour from useBonsaiAskOrchestration.ts
           * stays preserved here rather than re-decided.
           */
          const isNewestStoppedArchivedTurn =
            isNewestArchivedTurn && askStopped && !isStopNoticeResponse(turn.answer);
          return (
          <Focusable
            key={turn.id}
            flow-children="vertical"
            className="bonsai-chat-turn-slot"
            {...(renderIndex === 0
              ? ({ navRef: firstArchivedTurnNavRef } as Record<string, unknown>)
              : {})}
          >
            {buildTurnHeaderElement({
              turnId: turn.id,
              /* D60: an open turn shows the whole question (CSS caps it visually at five lines
                 with a fade on the last line); a closed turn keeps today's single cut line. */
              title:
                expandedTurnKey === turn.id
                  ? buildExpandedTurnTitle(turn.questionDisplay || turn.question)
                  : buildCollapsedTurnTitle(turn.questionDisplay || turn.question),
              expanded: expandedTurnKey === turn.id,
              /* Only the OPEN turn's title can overflow its cap — measuring a closed, single-line
                 ellipsis title would be meaningless, so no ref is handed to the rest. */
              titleRef: expandedTurnKey === turn.id ? measureTitleOverflow(turn.id) : undefined,
              titleOverflowing: overflowingTitles[turn.id] ?? false,
              headerRef: (el: HTMLElement | null) => {
                turnHeaderElRefs.current[turn.id] = el;
              },
              onMoveUp: firstArchivedHeaderMoveUp(turnIndex),
              onActivate: () => onTurnActivate?.(turn.id),
              /*
               * Retry rides on the newest question's bubble now (D77) instead of the row under the
               * answer. It re-asks the turn it is drawn on, always: the turn already carries its
               * own question, so nothing here has to consult session state that may be gone.
               *
               * This used to route a stopped turn that way and every other turn through
               * onRetryLastResponse, which reads lastExchange. A stop clears lastExchange to null,
               * which is why the stopped case was special-cased -- but a plugin restart empties it
               * too, while the chat slots come back from Python and redraw the turn with a live
               * Retry badge. Pressing it toasted "Nothing to retry" and sent nothing (measured on
               * the Deck 2026-09-06: no request reached the backend). Both cases are the same
               * case, so there is one handler now.
               *
               * Passing the question as an override also makes onAskOllama clear any pending
               * reply follow-up itself, which is the clearing onRetryLastResponse did by hand.
               *
               * The stop-notice check keeps the one case that must still show no Retry: a stop
               * with nothing readable kept, where the answer is the backend's own placeholder.
               * That used to fall out of the lastExchange routing by accident; it is a condition
               * now, because the routing it depended on is gone.
               */
              onRetry:
                isNewestArchivedTurn &&
                expandedTurnKey === turn.id &&
                !isStopNoticeResponse(turn.answer)
                  ? () => {
                      void onAskOllama?.(turn.question, {
                        threadQuestionDisplay: turn.questionDisplay || turn.question,
                      });
                    }
                  : undefined,
              retryDisabled: isAsking,
            })}
            {expandedTurnKey === turn.id ? (
              <>
                {isNewestStoppedArchivedTurn ? (
                  /* Same status, same placement as the live-turn Stopped notice below — a
                     stopped turn just does not stay "live" long enough to reach it. */
                  <div
                    className="bonsai-chat-status-line bonsai-chat-stopped-line"
                    role="status"
                    style={{
                      color: "#9fb7d5",
                      fontSize: 12,
                      lineHeight: 1.35,
                      marginBottom: 8,
                    }}
                  >
                    Stopped — partial answer kept.
                  </div>
                ) : null}
                {renderReasoningFold(turn.id, turn.reasoning)}
                {renderAnswerBubble(
                  turn.answer,
                  false,
                  turn.id,
                  turn.question,
                  turn.appId ?? null,
                  turn.appName ?? null,
                  turn.askedEntity ?? null,
                  turn.spoilerConsentEffective === true
                )}
                {/*
                 * Same placement as in the live turn — between the answer bubble and the reply
                 * actions — so the D-pad walk down the slot is unchanged. Gated to the newest
                 * archived turn because both payloads describe the newest answer only: hanging
                 * them off an older expanded turn would offer branches for an answer that is no
                 * longer on screen.
                 */}
                {isNewestArchivedTurn ? renderStrategyBranchPicker(turn.id) : null}
                {isNewestArchivedTurn ? renderStrategyChecklist(turn.id) : null}
                {/*
                 * Show details on an expanded archived turn. Without this the control is
                 * unreachable after a completed Ask: the slot reload expands the archived turn
                 * rather than "live", and the live-only row below renders nothing.
                 *
                 * Feedback, Retry and the refinement chips stay tied to `lastExchange` — the most
                 * recently completed exchange — rather than to "live" specifically, because after a
                 * normal Ask finishes the slot reload expands the newest ARCHIVED turn, not live
                 * (useChatSlots.applySlotTranscript), leaving the whole action row dead code on the
                 * ordinary path. Wiring it here, gated to the newest archived turn while it still
                 * matches `lastExchange`, is the same fix already applied to Show details: teach the
                 * archived branch to render the control instead of assuming it stays live-only.
                 */}
                {(() => {
                  /* Restores Helpful / Not really / Retry on a stopped turn (roadmap: "Stopping a
                     reply leaves no 'Stopped' notice"). `lastExchange` is cleared to null on
                     cancel (useBonsaiAskOrchestration.ts), which is right for its own job — it
                     means "no completed exchange to refine" — but it also silently dropped these
                     buttons for a turn that has a perfectly good kept answer sitting right on it. */
                  const showFeedbackHere =
                    isNewestArchivedTurn &&
                    !isAsking &&
                    (Boolean(lastExchange?.answer?.trim()) || isNewestStoppedArchivedTurn);
                  const transparencyAvailableHere = transparencyUiAvailable(
                    archivedTransparencyFor(turn, turnIndex)
                  );
                  const readAloudAvailableHere = Boolean(turn.answer?.trim());
                  if (!showFeedbackHere && !transparencyAvailableHere && !readAloudAvailableHere) {
                    return null;
                  }
                  const downPastUtilityRow = () =>
                    focusDownFromReplyUtilityRowOrPermHint(queryTurnSlot(turn.id));
                  const kbNotesHere = kbNotesBlockedBySpoiler(turn.answer, strategySpoilerMaskingEnabled)
                    ? []
                    : kbAttachedNotesFrom(archivedTransparencyFor(turn, turnIndex));
                  const actionsEl = buildReplyActionsElement({
                    replyKey: turn.id,
                    rating: showFeedbackHere ? liveReplyFeedbackRating : null,
                    onRate: showFeedbackHere
                      ? (rating) => onReplyFeedback?.(rating)
                      : () => {},
                    showFeedback: showFeedbackHere,
                    /* A stopped turn shows the thumbs greyed out: half an answer is not something
                       to rate, and the rating is saved. Retry below stays live. */
                    ratingUnavailable: isNewestStoppedArchivedTurn,
                    transparencyOpen: transparencyDetailsOpen,
                    onToggleTransparency: transparencyAvailableHere
                      ? makeToggleTransparencyDetails(turn.id)
                      : undefined,
                    chipsDisabled: false,
                    chipUsed: showFeedbackHere ? liveReplyChipUsed : false,
                    chipError: showFeedbackHere ? liveReplyChipError : null,
                    onChip: showFeedbackHere ? onReplyMicroAction : undefined,
                    askInFlight: isAsking,
                    ...(readAloudAvailableHere
                      ? readAloudRowProps(
                          turn.id,
                          turn.answer,
                          turn.question,
                          turn.appId ?? null,
                          turn.appName ?? null,
                          turn.askedEntity ?? null,
                          turn.spoilerConsentEffective === true
                        )
                      : {}),
                    /* Down must reach this turn's own ladder, then the "From the notes" block when
                       one is attached, then the details panel's own tabs row when the panel is open,
                       then whatever came after this row before any of them existed. */
                    onMoveDownFromUtility: () =>
                      focusKbNotesBlock(turn.id) ||
                      focusDetailsTabsRow(turn.id) ||
                      focusChipLadderRow(turn.id) ||
                      downPastUtilityRow(),
                  });
                  return (
                    <>
                      {actionsEl}
                      {buildKbNotesBlockElement({
                        turnKey: turn.id,
                        notes: kbNotesHere,
                        open: isKbNotesOpen(turn.id),
                        onToggle: () => toggleKbNotesOpen(turn.id),
                        onMoveUp: () =>
                          focusReplyShowDetails(queryTurnSlot(turn.id)) ||
                          focusReplyUtilityRow(queryTurnSlot(turn.id)),
                        onMoveDown: () =>
                          focusDetailsTabsRow(turn.id) ||
                          focusChipLadderRow(turn.id) ||
                          downPastUtilityRow(),
                        headerRef: (el: HTMLElement | null) => {
                          kbNotesHeaderElRefs.current[turn.id] = el;
                        },
                      })}
                    </>
                  );
                })()}
                {transparencyDetailsOpen &&
                transparencyUiAvailable(archivedTransparencyFor(turn, turnIndex)) ? (
                  <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                    {buildDetailsPanelElement({
                      turnKey: turn.id,
                      querySlot: () => queryTurnSlot(turn.id),
                      snapshot: archivedTransparencyFor(turn, turnIndex),
                      /*
                       * Only the newest archived turn matches `transparencySnapshot` — the post-Ask
                       * slot reload expands that turn instead of "live" (useChatSlots.applySlotTranscript),
                       * so this is the common path a completed Ask's diagnostics need to stay reachable
                       * on. An older expanded turn never held the live ask_diagnostics to begin with.
                       */
                      devDiagnostics: isNewestArchivedTurn ? devDiagnosticsForLiveSnapshot : null,
                      /*
                       * Plan 62 3c: only the newest answer ever carries the Session tab, so it never
                       * repeats down the chat — an older turn a person hand-expands keeps today's
                       * bare ladder, no tabs.
                       */
                      isNewest: isNewestArchivedTurn,
                      detailsTab,
                      setDetailsTab,
                      sessionLiveTurn: sessionLiveTurnForTabs,
                      archivedTurns: askThreadCollapsed,
                      sessionHighlightTurnId,
                      setSessionHighlightTurnId,
                      setTransparencyDetailsOpen,
                      onBeforeDeckyModal: wrapOnBeforeNestedDeckyModal,
                      onCompleteDeckyModalClose: onCompleteNestedDeckyModalClose,
                    })}
                  </div>
                ) : null}
                {/*
                  A "Context used · view in session context ↓" jump link used to render here (added
                  in 98434b0 alongside the transparency work). Removed 2026-08-23 at the maintainer's
                  call: it sat mid-transcript under every archived turn that had chips, cost two
                  lines of the 300px column, and only pre-selected a row in the Session context panel
                  a few rows below — which already lists every turn by its own question text. The
                  highlight state it drove is still reachable: expanding a turn's own details sets it
                  (see `transparencyDetailsOpen` below), so nothing lost a capability, only a
                  shortcut.
                */}
              </>
            ) : null}
          </Focusable>
          );
        })}
        {showLiveTurn ? (
          <Focusable key="live" flow-children="vertical" className="bonsai-chat-turn-slot">
            {buildTurnHeaderElement({
              turnId: "live",
              variant: "live",
              /* Same open/closed split as the archived-turn header above (D60). */
              title:
                (expandedTurnKey === "live"
                  ? buildExpandedTurnTitle(liveQuestion)
                  : buildCollapsedTurnTitle(liveQuestion)) || "…",
              expanded: expandedTurnKey === "live",
              titleRef: expandedTurnKey === "live" ? measureTitleOverflow("live") : undefined,
              titleOverflowing: overflowingTitles.live ?? false,
              headerRef: (el: HTMLElement | null) => {
                turnHeaderElRefs.current.live = el;
              },
              isStreaming: isStreamingPreview,
              onActivate: () => onTurnActivate?.("live"),
              onRetry: expandedTurnKey === "live" ? onRetryLastResponse : undefined,
              retryDisabled: isAsking,
            })}
            {showLiveReasoningBlock ? (
              /*
               * The model's own newest sentences, where the stock waiting phrase would be.
               *
               * No spinner: the lines change by themselves, which is the only "still working"
               * signal this needs, and the spinner's 14px would break the three-row height the
               * block is sized to. Never more than three lines — `newestReasoningLines` caps it,
               * and a test proves a ten-sentence slice still draws three.
               */
              <div className="bonsai-chat-reasoning-live" role="status" aria-live="polite">
                {liveReasoningLines.map((line, index) => (
                  <div
                    key={`${index}-${line}`}
                    className={`bonsai-chat-reasoning-live-line${
                      index === liveReasoningLines.length - 1
                        ? " bonsai-chat-reasoning-live-line--newest"
                        : ""
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
            {expandedTurnKey === "live" && isAsking && thinkingSummary && !hasLiveReasoning ? (
              /*
               * The stock waiting phrase, unchanged — and still the whole story with thinking
               * off, on a model that cannot think, and in the seconds before the model's first
               * thought arrives. It steps aside for good once that first thought has landed,
               * because a composed stand-in above the model's own words is worse than nothing.
               */
              <div
                className="bonsai-chat-status-line bonsai-chat-thinking-line"
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#9fb7d5",
                  fontSize: 12,
                  lineHeight: 1.35,
                  marginBottom: 8,
                }}
              >
                <ThinkingSpinnerIcon size={14} className="bonsai-thinking-spinner" />
                {buildThinkingBlurbTextElement(thinkingSummary, strategySpoilerMaskingEnabled)}
              </div>
            ) : null}
            {expandedTurnKey === "live" && askStopped ? (
              /*
               * A status, not an answer. The drafted text stays in the bubble below — replacing it
               * with a cancel literal is what STREAM-04 was reported for.
               */
              <div
                className="bonsai-chat-status-line bonsai-chat-stopped-line"
                role="status"
                style={{
                  color: "#9fb7d5",
                  fontSize: 12,
                  lineHeight: 1.35,
                  marginBottom: 8,
                }}
              >
                {showLiveResponse ? "Stopped — partial answer kept." : "Stopped."}
              </div>
            ) : null}
            {expandedTurnKey === "live" && showLiveResponse
              ? renderReasoningFold("live", liveTurnReasoning)
              : null}
            {expandedTurnKey === "live" && showLiveResponse
              ? renderAnswerBubble(
                  liveResponseBody,
                  isStreamingPreview,
                  "live",
                  liveQuestion || lastExchange?.question || "",
                  ollamaContext?.app_id ?? null,
                  ollamaContext?.app_name || lastExchange?.appName || null,
                  ollamaContext?.asked_entity || lastExchange?.askedEntity || null,
                  lastExchange?.spoilerConsentEffective === true
                )
              : null}
            {expandedTurnKey === "live" ? renderStrategyBranchPicker("live") : null}
            {expandedTurnKey === "live" ? renderStrategyChecklist("live") : null}
            {expandedTurnKey === "live" &&
            !isAsking &&
            (lastExchange?.answer?.trim() || onRetryLastResponse)
              ? buildReplyActionsElement({
                  replyKey: "live",
                  rating: liveReplyFeedbackRating,
                  onRate: (rating) => {
                    onReplyFeedback?.(rating);
                  },
                  showFeedback: Boolean(lastExchange?.answer?.trim()),
                  transparencyOpen: transparencyDetailsOpen,
                  onToggleTransparency:
                    showTransparencyUi ? onToggleTransparencyDetails : undefined,
                  chipsDisabled: false,
                  chipUsed: liveReplyChipUsed,
                  chipError: liveReplyChipError,
                  onChip: onReplyMicroAction,
                  askInFlight: isAsking,
                  ...(lastExchange?.answer?.trim()
                    ? readAloudRowProps(
                        "live",
                        lastExchange.answer,
                        liveQuestion || lastExchange?.question || "",
                        ollamaContext?.app_id ?? null,
                        ollamaContext?.app_name || lastExchange?.appName || null,
                        ollamaContext?.asked_entity || lastExchange?.askedEntity || null,
                        lastExchange?.spoilerConsentEffective === true
                      )
                    : {}),
                  onMoveDownFromUtility: () =>
                    focusKbNotesBlock("live") ||
                    focusDetailsTabsRow("live") ||
                    focusChipLadderRow("live") ||
                    focusDownFromReplyUtilityRowOrPermHint(queryLiveTurnSlot()),
                })
              : null}
            {expandedTurnKey === "live"
              ? (() => {
                  /*
                   * Unlike the row above, not gated on `!isAsking`: the whole point of publishing
                   * this live (game_ai_request.py's `_publish_kb_attached_notes_live`) is showing
                   * it before the reply finishes, not only once `buildReplyActionsElement` above
                   * has something to show. `liveThinking?.kbAttachedNotes` is what a live poll
                   * would carry mid-stream; `transparencySnapshot` is the post-completion fetch
                   * used once the turn is done. That fetch runs asynchronously after the reply
                   * finishes, so there is a real gap where `isAsking` has gone false but the
                   * fetch has not landed yet — switching straight to `transparencySnapshot` in
                   * that gap makes the block disappear and then reappear a moment later. Keep
                   * showing the live notes through that gap, and only defer to the fetched
                   * snapshot once it exists (an empty list counts as landed, so a genuinely
                   * note-free turn still clears).
                   */
                  const notes = isAsking
                    ? liveThinking?.kbAttachedNotes ?? []
                    : transparencySnapshot
                    ? kbAttachedNotesFrom(transparencySnapshot)
                    : liveThinking?.kbAttachedNotes ?? [];
                  const answerTextForFenceCheck = isAsking
                    ? liveResponseBody
                    : lastExchange?.answer ?? "";
                  const kbNotesHere = kbNotesBlockedBySpoiler(
                    answerTextForFenceCheck,
                    strategySpoilerMaskingEnabled
                  )
                    ? []
                    : notes;
                  return buildKbNotesBlockElement({
                    turnKey: "live",
                    notes: kbNotesHere,
                    open: isKbNotesOpen("live"),
                    onToggle: () => toggleKbNotesOpen("live"),
                    onMoveUp: () =>
                      focusReplyShowDetails(queryLiveTurnSlot()) ||
                      focusReplyUtilityRow(queryLiveTurnSlot()),
                    onMoveDown: () =>
                      focusDetailsTabsRow("live") ||
                      focusChipLadderRow("live") ||
                      focusDownFromReplyUtilityRowOrPermHint(queryLiveTurnSlot()),
                    headerRef: (el: HTMLElement | null) => {
                      kbNotesHeaderElRefs.current.live = el;
                    },
                  });
                })()
              : null}
            {renderInlineLadder ? (
              <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                {buildDetailsPanelElement({
                  turnKey: "live",
                  querySlot: () => queryLiveTurnSlot(),
                  snapshot: transparencySnapshot,
                  devDiagnostics: devDiagnosticsForLiveSnapshot,
                  // The live turn is always the newest answer while it is the one on screen.
                  isNewest: true,
                  detailsTab,
                  setDetailsTab,
                  sessionLiveTurn: sessionLiveTurnForTabs,
                  archivedTurns: askThreadCollapsed,
                  sessionHighlightTurnId,
                  setSessionHighlightTurnId,
                  setTransparencyDetailsOpen,
                  onBeforeDeckyModal: wrapOnBeforeNestedDeckyModal,
                  onCompleteDeckyModalClose: onCompleteNestedDeckyModalClose,
                })}
              </div>
            ) : null}
            {expandedTurnKey === "live" && shortcutSetupVariant && onOpenControllerSettings ? (
              <div
                style={{
                  marginTop: 10,
                  maxWidth: BONSAI_CHAT_AI_MAX_WIDTH_CSS,
                }}
              >
                <Button onClick={onOpenControllerSettings}>Open Controller settings</Button>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: "rgba(200, 215, 230, 0.85)",
                    lineHeight: 1.4,
                  }}
                >
                  {shortcutSetupVariant === "deck"
                    ? "Then: Guide Button Chord Layout → your chord. Full macro steps: docs (§5 bonsai shortcut setup)."
                    : "Pick a spare button on your Stadia layout, then Guide Button Chord. Full steps: docs (§5)."}
                </div>
              </div>
            ) : null}
          </Focusable>
        ) : null}
      </div>
    </div>
  </PanelSectionRow>
)}
{!isAsking && !selectedAttachment && noActiveGameContext && unifiedInput.trim() ? (
  <PanelSectionRow>
    <div
      className="bonsai-full-bleed-row"
      style={{
        ...fullBleedRowStyle,
        fontSize: 10,
        color: "#8fa8c4",
        lineHeight: 1.35,
        fontStyle: "italic",
      }}
    >
      No game detected — capture & attach a screenshot or name the game for sharper answers.
    </div>
  </PanelSectionRow>
) : null}
{!isAsking &&
!gameContextReadEnabled &&
!troubleshootingPermHintDismissed &&
questionLooksLikeTroubleshootingAsk(unifiedInput) ? (
  <PanelSectionRow>
    {/*
     * Wrapped in its own Focusable so Down/Up can be caught here: a Decky `Button` does not
     * forward `onMoveUp`/`onMoveDown`, and this row sits outside the live turn's own Focusable, so
     * Steam's default fallback (proven elsewhere in this file to skip nearby rows and jump straight
     * to the session strip) cannot be trusted to land here. `flow-children="horizontal"` keeps
     * Left/Right between Open Permissions and Dismiss. `navRef` registers this row as a Steam nav
     * node (`focusChatPermissionHintRow` above, `takeNavFocus` only) — the button-ref + plain-focus
     * approach this replaced moved `activeElement` but not the gamepad ring, measured on device
     * 2026-09-04 (build 49241e7).
     */}
    <Focusable
      className="bonsai-chat-troubleshoot-perm-hint-row"
      flow-children="horizontal"
      {...({
        navRef: troubleshootHintNavRef,
        onMoveUp: focusUpPastLiveKbNotesBlock,
        onMoveDown: () => focusSessionContextStrip(),
      } as Record<string, unknown>)}
    >
      <div
        className="bonsai-full-bleed-row"
        style={{
          ...fullBleedRowStyle,
          fontSize: 11,
          color: "#c8d8ea",
          lineHeight: 1.4,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div>
          Troubleshooting Ask detected. Enable <strong>Read game & screenshot context</strong> in Permissions
          to auto-attach Proton logs and screenshots (never turned on automatically).
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onNavigateToPermissions ? (
            <Button
              focusable
              onClick={() => onNavigateToPermissions("steam_logs_read")}
              style={{ fontSize: 11, padding: "4px 10px", minHeight: 34 }}
            >
              Open Permissions
            </Button>
          ) : null}
          <Button
            focusable
            onClick={() => setTroubleshootingPermHintDismissed(true)}
            style={{ fontSize: 11, padding: "4px 10px", minHeight: 34 }}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </Focusable>
  </PanelSectionRow>
) : null}
{!isAsking && onNavigateToPermissions && isVacCheckCapabilityDenyResponse(ollamaResponse) ? (
  <PanelSectionRow>
    {/*
     * Same reasoning as the troubleshooting hint's wrapper just above: this row sits outside the
     * live turn's own Focusable, between the reply actions row and the session context strip,
     * PermissionDenyAction's own Button cannot forward onMoveUp/onMoveDown itself, and `navRef`
     * (not a button ref plus plain focus) is the only transfer Steam's ring actually follows here —
     * see `focusChatPermissionHintRow` above.
     */}
    <Focusable
      className="bonsai-chat-vac-deny-row"
      flow-children="horizontal"
      {...({
        navRef: vacDenyRowNavRef,
        onMoveUp: focusUpPastLiveKbNotesBlock,
        onMoveDown: () => focusSessionContextStrip(),
      } as Record<string, unknown>)}
    >
      <div className="bonsai-full-bleed-row" style={fullBleedRowStyle}>
        <PermissionDenyAction
          capability="steam_web_api"
          onJump={onNavigateToPermissions}
          compact
        />
      </div>
    </Focusable>
  </PanelSectionRow>
) : null}
{isAsking && showSlowWarning && !isStreamingPreview && (
  <PanelSectionRow>
    <div className="bonsai-chat-status-line" style={{ color: "#f2cf84", fontSize: 12, padding: "6px 0", lineHeight: 1.35 }}>
      Slow (&gt;{latencyWarningSeconds}s): ensure <strong>Ollama</strong> uses your <strong>GPU</strong>, not{" "}
      <strong>CPU</strong>.
    </div>
  </PanelSectionRow>
)}
{!isAsking && elapsedSeconds != null && elapsedSeconds > latencyWarningSeconds && (
  <PanelSectionRow>
    <div style={{ color: "#f2cf84", fontSize: 12, lineHeight: 1.35 }}>
      {elapsedSeconds}s (&gt;{latencyWarningSeconds}s): prefer <strong>GPU</strong> for <strong>Ollama</strong>, not{" "}
      <strong>CPU</strong>.
    </div>
  </PanelSectionRow>
)}
{appliedTuningBannerText && (
  <PanelSectionRow>
    <div style={{ color: "#f2cf84", fontSize: 12, lineHeight: 1.35 }}>{appliedTuningBannerText}</div>
  </PanelSectionRow>
)}
{/*
 * The standalone "Ask diagnostics" block (its own always-visible button next to Show details) was
 * removed 2026-08-28 (roadmap: "Fold Show diagnostics into Show details") — same JSON, same gate on
 * desktopAskVerboseLogging, now rendered inside the "Developer details" chip by ContextChipLadder
 * (see devDiagnosticsForLiveSnapshot above) instead of a second adjacent disclosure control.
 */}
{/*
 * The separate "Session context (N turns) ▸" box that used to sit here is gone (plan 62 3c): its
 * content — the turn list, the active row's chips, and Clear — folded into the newest answer's own
 * Show details panel as a second tab ("Session · N"), reached by name via `buildDetailsPanelElement`
 * above, not by document position. A settled answer now costs one closed control instead of two.
 * `focusUpPastSessionContextStripKbNotesBlock` above is unchanged and still exported (its own test
 * file exercises it directly) but has no caller left inside this file now that nothing renders
 * where the strip used to sit — left as a working, tested utility rather than deleted, since
 * deciding whether anything else should reach for it belongs to whoever reviews this next.
 */}
{canSaveDesktopNote && !showEmptySlotPreview && (
  <PanelSectionRow>
    <div className="bonsai-save-chat-desktop-row">
      <Button
        ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("desktop-note-save", el)}
        onClick={() => {
          rememberModalReturnFocus("desktop-note-save");
          onOpenDesktopNoteSave();
        }}
        style={{
          width: "100%",
          minHeight: 38,
          border: "1px solid rgba(150, 187, 223, 0.45)",
          background: "rgba(64, 93, 124, 0.35)",
          color: "#dce8f4",
          opacity: desktopNoteSaveEnabled ? 1 : 0.45,
        }}
      >
        Save chat to Desktop
      </Button>
    </div>
  </PanelSectionRow>
)}
    </>
  );
}
