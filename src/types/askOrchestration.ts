/**
 * Title: Ask orchestration contract
 * Purpose: The exact shape the Ask hook hands back, written down so it cannot drift.
 * Used for: useBonsaiAskOrchestration declares this as its return type; index.tsx and the
 *           Main tab read the pieces out of it.
 * Solves: The widest seam in the project. 52 things come out of one hook, and the refactor
 *         splits the file behind it. Without a written shape a split can quietly drop,
 *         rename or retype one of them and nothing fails until someone uses the plugin.
 * Does not: Add behaviour or wrap anything. It is a type; it costs nothing at run time.
 * Caution: FROZEN for the phase 4 reshape. Changing a name or a type here is a change to
 *          the contract, not a refactor. Work behind the seam, not on it.
 */
import type { Dispatch, SetStateAction } from "react";

import type { PresetPrompt } from "../data/presets";
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type { ReplyMicroActionId } from "../data/replyMicroActions";
import type { LastExchangeSnapshot, PresetCarouselInjectPayload } from "./backgroundAsk";
import type {
  AppliedResult,
  AskThreadCollapsedTurn,
  AskThreadExpandedTurnKey,
  OllamaContextUi,
  StrategyChecklistState,
  StrategyGuideBranchesPayload,
} from "./bonsaiUi";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";
import type { TransparencySnapshot } from "../utils/inputTransparency";

/**
 * What the Ask hook returns, in the order the hook returns it.
 *
 * Grouped by what each part is for, because 52 names in one list is not readable:
 * the reply itself, what the reply came with, the thread, what is happening right
 * now, and the things a person can do.
 */
export interface BonsaiAskOrchestration {
  // The reply, and the conversation state it belongs to.
  ollamaResponse: string;
  ollamaContext: OllamaContextUi;
  lastExchange: LastExchangeSnapshot | null;
  setLastExchange: Dispatch<SetStateAction<LastExchangeSnapshot | null>>;

  // Extras a reply can arrive with: branch choices, a checklist, a disclosure, chips.
  strategyGuideBranches: StrategyGuideBranchesPayload | null;
  strategyChecklist: StrategyChecklistState | null;
  modelPolicyDisclosure: ModelPolicyDisclosurePayload | null;
  presetCarouselInject: PresetCarouselInjectPayload | null;
  shortcutSetupVariant: "deck" | "stadia" | null;
  suggestedPrompts: PresetPrompt[];

  // The slow-answer warning and its clock.
  showSlowWarning: boolean;
  setShowSlowWarning: Dispatch<SetStateAction<boolean>>;
  elapsedSeconds: number | null;

  // What the answer was built from, and what the model was thinking about.
  lastTransparency: TransparencySnapshot | null;
  setLastTransparency: Dispatch<SetStateAction<TransparencySnapshot | null>>;
  thinkingSummary: string | null;
  lastRequestId: number | null;

  // The thread above the live answer: older turns, which one is open.
  askThreadCollapsed: AskThreadCollapsedTurn[];
  setAskThreadCollapsed: Dispatch<SetStateAction<AskThreadCollapsedTurn[]>>;
  setAskThreadDisplayQuestion: Dispatch<SetStateAction<string>>;
  setStrategyChecklist: Dispatch<SetStateAction<StrategyChecklistState | null>>;
  expandedTurnKey: AskThreadExpandedTurnKey;
  setExpandedTurnKey: Dispatch<SetStateAction<AskThreadExpandedTurnKey>>;
  onTurnActivate: (key: string | "live") => void;
  askThreadDisplayQuestion: string;

  // What is happening right now.
  isAsking: boolean;
  askStopped: boolean;
  isForeignPendingAsk: boolean;
  isStreamingPreview: boolean;
  isStreamSettling: boolean;
  streamDisplayText: string;
  lastApplied: AppliedResult | null;

  // Asking, stopping, and the request bookkeeping around it.
  refreshInputTransparency: () => Promise<void>;
  startNextRequest: () => number;
  invalidateRequests: () => void;
  clearUnifiedInput: () => void;
  onCancelAsk: () => void;
  onAskOllama: (
    overrideQuestion?: string,
    opts?: { threadQuestionDisplay?: string },
  ) => Promise<void>;
  onRetryLastResponse: () => void;

  // What a person can do to a reply once it has arrived.
  onReplyFeedback: (rating: "up" | "down") => Promise<void>;
  onReplyMicroAction: (chipId: ReplyMicroActionId) => Promise<void>;
  liveReplyFeedbackRating: "up" | "down" | null;
  liveReplyChipUsed: boolean;
  liveReplyChipError: string | null;
  onStrategyBranchPick: (opt: { id: string; label: string }) => void;
  onStrategyChecklistToggle: (itemId: string, checked: boolean) => void;

  // Coming back to a session: from disk, or from a snapshot the plugin kept.
  hydrateStrategyChecklistFromDisk: (appId: string) => Promise<void>;
  restoreSessionSnapshot: (snap: BonsaiSessionSurvivalSnapshot) => void;
  resetAskSessionSlice: () => void;
  setStrategyGuideBranches: Dispatch<SetStateAction<StrategyGuideBranchesPayload | null>>;
  setSuggestedPrompts: Dispatch<SetStateAction<PresetPrompt[]>>;
  reseedSuggestedPrompts: (
    mode: "random" | "contextual",
    category?: string,
    forceRefresh?: boolean,
  ) => Promise<void>;
}
