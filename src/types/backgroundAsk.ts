/**
 * Title: The shapes behind asking a question in the background
 *
 * Purpose: Asking bonsAI a question does not block the screen while the AI
 * is thinking — the question is handed to the computer or Deck side to run
 * in the background, and the panel checks back on it every so often until
 * it is done, even if the panel was closed and reopened in the meantime.
 * This file is the exact shape of the message that starts a question
 * running (`BackgroundStartResponse`) and the shape of each check-back
 * (`BackgroundRequestStatus`), plus a few related shapes: what a finished
 * exchange looked like, an attachment that went with a question, and a
 * follow-up chip waiting to be sent.
 *
 * Used for: the hook that starts a question and polls for its answer, the
 * toast notification that tells the user their answer is ready if they have
 * navigated away, and the Main tab's own record of the conversation.
 *
 * Solves: the code that starts a question and the code that polls for its
 * answer are both describing the same two messages the computer or Deck
 * side sends back — writing the shape once here means both sides of that
 * back-and-forth agree on what fields exist.
 *
 * Does not: send anything, or poll for anything itself. These are just
 * shapes; the hooks and call utilities elsewhere do the actual asking and
 * checking.
 */
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type { AppliedResult, StrategyGuideBranchesPayload, StrategyChecklistPayload } from "./bonsaiUi";

/** Shortcut-setup keyword replies surface this so the UI can deep-link Controller settings. */
type ShortcutSetupKind = "deck" | "stadia";

export type BackgroundStartResponse = {
  accepted?: boolean;
  status: "pending" | "busy" | "invalid" | "completed" | "blocked";
  request_id?: number | null;
  response?: string;
  app_id?: string;
  /** The running game's display name, for a title reachable only by name (plan 54 gap 1). */
  app_name?: string;
  app_context?: string;
  success?: boolean;
  applied?: AppliedResult | null;
  elapsed_seconds?: number;
  /**
   * Opening thinking blurb, composed by the backend at accept time. The client renders it and
   * never composes its own — two composers on two request-id spaces rewrote the line for no
   * reason within the first poll. See docs/planning/06-thinking-blurbs-review.md § 2.1.
   */
  thinking_summary?: string | null;
  /** When set, this start finished without Ollama (e.g. sanitizer keyword command). */
  meta?: string;
  /** Set when the Ask was a bonsai:shortcut-setup-* keyword (no Ollama). */
  shortcut_setup?: ShortcutSetupKind;
  /** True when this Ask asked for thinking and the model refused; see the status type. */
  thinking_unsupported?: boolean;
  /** Model that answered, used to warn about unsupported thinking once per model. */
  model?: string | null;
};

export type BackgroundRequestStatus = {
  status: "idle" | "pending" | "completed" | "failed" | "cancelled";
  request_id: number | null;
  question: string;
  app_id: string;
  /** The running game's display name, for a title reachable only by name (plan 54 gap 1). */
  app_name?: string;
  app_context: "active" | "none";
  success: boolean | null;
  response: string;
  applied: AppliedResult | null;
  elapsed_seconds: number;
  error: string | null;
  started_at: number | null;
  completed_at: number | null;
  strategy_guide_branches?: StrategyGuideBranchesPayload | null;
  strategy_checklist?: StrategyChecklistPayload | null;
  model_policy_disclosure?: ModelPolicyDisclosurePayload | null;
  /** True when this Ask had explicit spoiler consent (toggle and/or backend phrase match). */
  strategy_spoiler_consent_effective?: boolean;
  /** Pyro talent-manager easter egg: optional inject chip text from last successful Ask (helpful or asshole tip). */
  preset_carousel_inject?: PresetCarouselInjectPayload | null;
  /** Present when the completed Ask was a shortcut-setup keyword. */
  shortcut_setup?: ShortcutSetupKind | null;
  /** True when the user hit Stop mid-generation (HTTP session closed locally). */
  cancelled?: boolean;
  /** Progressive assistant text while status is pending and token streaming is enabled. */
  partial_response?: string | null;
  /** True while Ollama NDJSON deltas are still arriving (faster poll cadence on the frontend). */
  streaming?: boolean;
  /** Model-emitted or deterministic phase label while status is pending. */
  thinking_summary?: string | null;
  /**
   * True when this Ask asked for thinking and the model refused, so the backend retried
   * without it. Set only on the Ask that discovered it — later Asks on the same model skip
   * thinking up front and leave this false.
   */
  thinking_unsupported?: boolean;
  /** Model that answered, used to warn about unsupported thinking once per model. */
  model?: string | null;
  /**
   * Named chat slot this request belongs to, so a poll can tell whether the tokens it is about
   * to paint belong to the slot the user is looking at. Set at accept time and carried on the
   * state dict, so it is still present on the terminal poll — `_chat_slot_by_request` is popped
   * before then.
   */
  chat_slot_id?: string | null;
};

export type PresetCarouselInjectPayload = {
  text: string;
};

export type AskAttachmentSnapshot = {
  path: string;
  name: string;
  source: string;
  app_id: string;
};

export type LastExchangeSnapshot = {
  question: string;
  answer: string;
  /** Raw question sent to the backend (may differ from display thread title). */
  originalQuestion?: string;
  model?: string | null;
  attachments?: AskAttachmentSnapshot[];
  spoilerConsentEffective?: boolean;
  askMode?: import("../data/askMode").AskModeId;
  /** The game this exchange was asked against, for a title reachable only by name (plan 54 gap 1). */
  appName?: string;
};

export type ReplyFollowUpPending = {
  chipId: import("../data/replyMicroActions").ReplyMicroActionId;
  parentQuestion: string;
  parentAnswer: string;
  preferredModel: string | null;
  attachments: AskAttachmentSnapshot[];
  spoilerConsentEffective: boolean;
  askMode: import("../data/askMode").AskModeId;
};

export type AppendDesktopChatEventPayload = {
  event: "ask" | "response";
  question?: string;
  response_text?: string;
  screenshot_paths?: string[];
};

export type AppendDesktopNoteResult = {
  success: boolean;
  path?: string;
  error?: string;
};
