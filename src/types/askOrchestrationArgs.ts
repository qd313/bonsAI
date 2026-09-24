/**
 * Title: What the Ask flow needs to start
 *
 * Purpose: The one argument `useBonsaiAskOrchestration` takes — every setting, ref and
 * callback it reads in order to ask a question correctly and report back what happened.
 *
 * Used for: `useBonsaiAskOrchestration` declares its own parameter with this type, and
 * `index.tsx` builds the object it is called with.
 *
 * Solves: The hook's input list is long enough that writing it down once, separately from
 * the hook's own code, is what keeps a new field's meaning from having to be re-read out
 * of the function body every time.
 *
 * Does not: Describe what the hook hands back — see `BonsaiAskOrchestration` in
 * `./askOrchestration`. Does not run anything itself; this file is only a type.
 */
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { AskAttachment } from "./bonsaiUi";
import { type AskModeId, type UnifiedInputPersistenceMode } from "../data/bonsaiSettingsSchema";

/** Maps RPC poll payloads into Main-tab AI presentation state (pending vs terminal branches differ sharply). */
export type UseBonsaiAskOrchestrationArgs = {
  desktopDebugNoteAutoSave: boolean;
  filesystemWrite: boolean;
  strategySpoilerMaskingEnabled: boolean;
  askMode: AskModeId;
  unifiedInput: string;
  setUnifiedInput: Dispatch<SetStateAction<string>>;
  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  effectiveOllamaPcIp: string;
  selectedAttachment: AskAttachment | null;
  setSelectedAttachment: Dispatch<SetStateAction<AskAttachment | null>>;
  /** Reload settings from disk after server-side persistence (e.g. sanitizer keywords). */
  syncSettingsFromDisk: () => Promise<unknown>;
  unifiedInputFieldLayerRef: RefObject<HTMLDivElement | null>;
  unifiedInputHostRef: RefObject<HTMLDivElement | null>;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setNavigationMessage: Dispatch<SetStateAction<string>>;
  saveIp: (ip: string) => void;
  persistSearchQuery: (unifiedInputText: string) => void;
  /** When app log level is verbose, copy external/RPC failures into Desktop bonsAI_logs. */
  onExternalFailure?: (source: string, message: string, detail?: Record<string, unknown>) => void;
  aiCharacterEnabled?: boolean;
  aiCharacterPresetId?: string | null;
  useLocalKnowledgeBase?: boolean;
  /**
   * False until ``load_settings`` resolves. The preset carousel waits for it before its
   * one-shot mount reseed, because the KB flags above are still at their UI defaults
   * before then. Omit to opt out of the wait (tests that do not model settings loading).
   */
  settingsLoaded?: boolean;
  /** QA override (Developer tab): force every eligible carousel slot to a session RAG chip. */
  devForceSessionRagChips?: boolean;
  /** Active chat slot id for Ask submit — ref updated synchronously in useChatSlots. */
  activeSlotIdRef?: RefObject<string | null>;
  /**
   * Creates a slot when none is active and returns the id this Ask should carry. Omit it
   * and the Ask still runs — the backend simply has nowhere to file the turns, which is
   * the data loss this arg exists to prevent.
   */
  ensureActiveSlotForAsk?: (question: string) => Promise<string | null>;
  /** Reload slot transcript from disk after terminal Ask completion. */
  onSlotTurnsChanged?: () => void;
  /** Which slot the backend is generating for right now, or null when nothing is pending. */
  onGeneratingSlotChange?: (slotId: string | null) => void;
  /** A slot the user was not looking at just finished an answer — it is now unread. */
  onSlotAnswerFinished?: (slotId: string) => void;
};
