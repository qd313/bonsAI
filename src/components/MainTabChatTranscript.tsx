/**
 * Title: Main tab chat transcript
 * Purpose: Render live and collapsed Ask turns, strategy branches/checklist, reply actions, and context chips.
 * Used for: MainTab below the Ask bar — displays ollamaResponse and thread history from orchestration.
 * Solves: Separates transcript layout/focus from Ask submit and poll logic.
 * Does not: Submit Asks or poll background status — receives props from useBonsaiAskOrchestration.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanelSectionRow, Button, Focusable } from "@decky/ui";
import bonsaiLogo from "../assets/icons/bonsai-logo.svg";
import {
  BONSAI_CHAT_AI_BUBBLE_MAX_FRAC,
} from "../features/unified-input/constants";
import { getUiDocument } from "../utils/uiDocument";
import { registerNavFocus, unregisterNavFocus, takeNavFocus, type NavRefHolder } from "../utils/navFocusRegistry";
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
import { ContextChipLadder } from "./ContextChipLadder";
import { SessionContextStrip } from "./SessionContextStrip";
import { transparencyUiAvailable } from "../utils/contextChipsFromSnapshot";
import type {
  AppliedResult,
  AskThreadCollapsedTurn,
  AskThreadExpandedTurnKey,
  OllamaContextUi,
  StrategyGuideBranchesPayload,
  StrategyChecklistState,
} from "../types/bonsaiUi";
import { ThinkingSpinnerIcon } from "./icons";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { useStreamScrollPin } from "../hooks/useStreamScrollPin";
import type { AskModeId } from "../data/askMode";
import type { LastExchangeSnapshot } from "../types/backgroundAsk";
import type { ReplyMicroActionId } from "../data/replyMicroActions";
import {
  focusContextChipLadder,
  focusContextHint,
  focusReplyShowDetails,
  focusReplyUtilityRow,
  focusSessionContextStrip,
  focusUpFromBelowContextChipLadder,
  queryLiveTurnSlot,
  queryTurnSlot,
} from "../utils/liveTurnFocusGraph";
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

const BONSAI_CHAT_AI_MAX_WIDTH_CSS = `min(${Math.round(BONSAI_CHAT_AI_BUBBLE_MAX_FRAC * 100)}%, 100%)`;

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
  thinkingSummary?: string | null;
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

/**
 * Hand the ring to whichever permission-hint row is mounted below the transcript — the
 * troubleshooting Ask hint's "Open Permissions", or the vac-check capability deny action's own
 * "Open Permissions" — using Steam's own transfer and nothing else.
 *
 * `focusChatPermissionHintRow` used to look these up by a registered *button* handle and land on it
 * with `focusDeckOwner`, a plain `.focus()` with a defensive `tabindex` stamp. Measured wrong on
 * device 2026-09-04 (build 49241e7, PERM-JUMP-01): the ring did not follow the DOM focus across the
 * container boundary (the standing rule this whole registry exists for), and separately the stamp
 * itself was corrupting — Steam's real Focusables carry no `tabindex` attribute on device at all, so
 * the "only stamp when one is missing" guard fired every time and the *wrapping* `.Panel.Focusable`
 * (the nearest ancestor `focusDeckOwner` climbs to, since the button itself lacked one) came away
 * `tabindex="-1"`, dropping the whole row out of Steam's nav graph. Both rows now register a
 * `navRef` on their own wrapping Focusable (see the two `useEffect`s below and
 * navFocusRegistry.ts), and this function is `takeNavFocus` only — no DOM query, no `.focus()`, no
 * tabindex of any kind.
 */
export function focusChatPermissionHintRow(): boolean {
  if (takeNavFocus("chat-perm-hint-troubleshoot")) return true;
  return takeNavFocus("chat-perm-hint-deny");
}

/**
 * Down from the reply utility row (Retry / Show details / Copy): this turn's own chip ladder or
 * collapsed hint first (closest, inside the turn's own Focusable), then whichever permission-hint
 * row is mounted just below the transcript, then the session context strip.
 *
 * Replaces a plain call to `focusDownFromReplyUtilityRow`, which only tried the ladder and hint
 * before falling to the strip — silently skipping the permission-hint rows because they are not
 * inside the live/turn slot `focusContextChipLadder`/`focusContextHint` search under. Filed
 * 2026-09-03: "The Open Permissions button under a blocked reply is not a D-pad stop"
 * (runs/PERM-JUMP-01-a-find-open-permissions.json — Down from Retry or Copy jumped straight to the
 * session strip).
 */
export function focusDownFromReplyUtilityRowOrPermHint(liveSlot: HTMLElement | null): boolean {
  if (focusContextChipLadder(liveSlot)) return true;
  if (focusContextHint(liveSlot)) return true;
  if (focusChatPermissionHintRow()) return true;
  return focusSessionContextStrip();
}

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
    thinkingSummary = null,
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
  } = props;

  const [sessionHighlightTurnId, setSessionHighlightTurnId] = useState<string | null>(null);
  const [transparencyDetailsOpen, setTransparencyDetailsOpen] = useState(false);
  const [troubleshootingPermHintDismissed, setTroubleshootingPermHintDismissed] = useState(false);

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
    spoilerConsentEffective = false
  ) =>
    buildAnswerReadableText({
      body,
      spoilerMaskingEnabled: strategySpoilerMaskingEnabled,
      askQuestion,
      appId,
      spoilerConsentEffective,
    });
  /** Read aloud props for one turn's reply-actions row: same shape at every call site. */
  const readAloudRowProps = (
    key: string,
    body: string,
    askQuestion: string,
    appId: string | null,
    spoilerConsentEffective = false
  ) => {
    const isReadingThis = readAloud.speakingKey === key && readAloud.state === "speaking";
    return {
      readAloudLabel: isReadingThis ? "Stop" : "Read aloud",
      onReadAloudToggle: () => {
        if (isReadingThis) {
          readAloud.stop();
          return;
        }
        readAloud.start(key, buildTurnReadableText(body, askQuestion, appId, spoilerConsentEffective));
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
  }, [
    transparencySnapshot?.raw_question,
    transparencySnapshot?.final_response,
    expandedTurnKey,
  ]);

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

  const liveQuestion = askThreadDisplayQuestion.trim();
  const liveResponseBody = isStreamingPreview ? streamDisplayText : ollamaResponse;
  const showLiveResponse =
    Boolean(liveResponseBody.trim()) &&
    !(isAsking && !isStreamingPreview && isPendingPlaceholderResponse(liveResponseBody));
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
  const appliedTuningBannerText = formatAppliedTuningBannerText(lastApplied);

  const [earlierExpanded, setEarlierExpanded] = useState(false);
  const firstArchivedTurnNavRef = useRef<NavRefHolder["current"]>(null);
  /* A slot switch (or a cleared thread) re-collapses: the pill is about this thread, not the user. */
  const earlierIdentity = `${askThreadCollapsed.length}:${askThreadCollapsed[0]?.id ?? ""}`;
  useEffect(() => {
    setEarlierExpanded(false);
  }, [earlierIdentity]);
  /* Expanding unmounts the pill, so focus would be orphaned. Hand it to the first revealed row. */
  useLayoutEffect(() => {
    if (!earlierExpanded) return;
    firstArchivedTurnNavRef.current?.TakeFocus?.(true);
  }, [earlierExpanded]);

  /*
   * Nav targets for the two permission-hint rows below the transcript — see
   * `focusChatPermissionHintRow`'s comment above for why this replaced a registered button handle
   * and `focusDeckOwner`. Registered for the lifetime of this component rather than only while the
   * row is actually rendered: `takeNavFocus` already treats an unpopulated or stale holder as "not
   * available" (`navFocusRegistry.ts`), which is exactly the state a conditionally-unmounted row
   * leaves behind, so there is nothing to additionally guard here.
   */
  const troubleshootHintNavRef = useRef<NavRefHolder["current"]>(null);
  const vacDenyRowNavRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("chat-perm-hint-troubleshoot", troubleshootHintNavRef);
    return () => unregisterNavFocus("chat-perm-hint-troubleshoot", troubleshootHintNavRef);
  }, []);
  useEffect(() => {
    registerNavFocus("chat-perm-hint-deny", vacDenyRowNavRef);
    return () => unregisterNavFocus("chat-perm-hint-deny", vacDenyRowNavRef);
  }, []);

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
    isStreamingPreview ? streamDisplayText : ollamaResponse,
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
                {renderAnswerBubble(
                  turn.answer,
                  false,
                  turn.id,
                  turn.question,
                  turn.appId ?? null,
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
                  return buildReplyActionsElement({
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
                          turn.spoilerConsentEffective === true
                        )
                      : {}),
                    /* Down must reach this turn's own ladder. Without a handler the Focusable
                       falls through to the next focusable in document order — the session context
                       strip — and the chips become unreachable from above. */
                    onMoveDownFromUtility: () =>
                      focusDownFromReplyUtilityRowOrPermHint(queryTurnSlot(turn.id)),
                  });
                })()}
                {transparencyDetailsOpen &&
                transparencyUiAvailable(archivedTransparencyFor(turn, turnIndex)) ? (
                  <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                    <ContextChipLadder
                      snapshot={archivedTransparencyFor(turn, turnIndex)}
                      collapsedHint={false}
                      onMoveUpFromLadder={() =>
                        focusReplyShowDetails(queryTurnSlot(turn.id)) ||
                        focusReplyUtilityRow(queryTurnSlot(turn.id))
                      }
                      onMoveDownFromLadder={() => focusSessionContextStrip()}
                      /*
                       * Only the newest archived turn matches `transparencySnapshot` — the post-Ask
                       * slot reload expands that turn instead of "live" (useChatSlots.applySlotTranscript),
                       * so this is the common path a completed Ask's diagnostics need to stay reachable
                       * on. An older expanded turn never held the live ask_diagnostics to begin with.
                       */
                      devDiagnostics={isNewestArchivedTurn ? devDiagnosticsForLiveSnapshot : null}
                    />
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
              isStreaming: isStreamingPreview,
              onActivate: () => onTurnActivate?.("live"),
              onRetry: expandedTurnKey === "live" ? onRetryLastResponse : undefined,
              retryDisabled: isAsking,
            })}
            {expandedTurnKey === "live" && isAsking && thinkingSummary ? (
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
              ? renderAnswerBubble(
                  liveResponseBody,
                  isStreamingPreview,
                  "live",
                  liveQuestion || lastExchange?.question || "",
                  ollamaContext?.app_id ?? null,
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
                        lastExchange?.spoilerConsentEffective === true
                      )
                    : {}),
                  onMoveDownFromUtility: () =>
                    focusDownFromReplyUtilityRowOrPermHint(queryLiveTurnSlot()),
                })
              : null}
            {renderInlineLadder ? (
              <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                <ContextChipLadder
                  snapshot={transparencySnapshot}
                  collapsedHint={false}
                  onMoveUpFromLadder={() =>
                    focusReplyShowDetails(queryLiveTurnSlot()) ||
                    focusReplyUtilityRow(queryLiveTurnSlot())
                  }
                  onMoveDownFromLadder={() => focusSessionContextStrip()}
                  devDiagnostics={devDiagnosticsForLiveSnapshot}
                />
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
        onMoveUp: () => focusUpFromBelowContextChipLadder(queryLiveTurnSlot()),
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
        onMoveUp: () => focusUpFromBelowContextChipLadder(queryLiveTurnSlot()),
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
 * Hidden at the [+] create position. The strip describes the ACTIVE slot, which cycling onto [+]
 * deliberately does not change — so it read "Session context (N turns)" on a screen whose whole
 * message is "this slot keeps its own history". Measured on device 2026-08-31; one of the two
 * things that made [+] and a real empty slot look like interchangeable "new chat screens".
 */}
{!showEmptySlotPreview && (
<PanelSectionRow>
  <SessionContextStrip
    liveTurn={
      showTransparencyUi && transparencySnapshot
        ? {
            id: "live",
            label: (askThreadDisplayQuestion || lastExchange?.question || "Latest Ask").trim().slice(0, 48),
            question: (askThreadDisplayQuestion || lastExchange?.question || "").trim(),
            snapshot: transparencySnapshot,
          }
        : null
    }
    archivedTurns={askThreadCollapsed}
    highlightTurnId={sessionHighlightTurnId ?? (transparencyDetailsOpen ? "live" : null)}
    onHighlightClear={() => setSessionHighlightTurnId(null)}
    onMoveUp={() => {
      if (focusChatPermissionHintRow()) return true;
      return focusUpFromBelowContextChipLadder(queryLiveTurnSlot());
    }}
  />
</PanelSectionRow>
)}
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
