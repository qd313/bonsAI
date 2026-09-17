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
import type {
  AppliedResult,
  StrategyGuideBranchesPayload,
  StrategyChecklistPayload,
  TurnReasoning,
} from "./bonsaiUi";
import type { KbAttachedNote } from "../utils/inputTransparency";

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
  /**
   * The thing the backend worked out this question named — a card title such as "Wheatley" or
   * "Dreadnought Twins" (plan 54 gap 2). The screen's own guess only reads two phrasings; the
   * backend recognises many more, so this wins when present.
   */
  strategy_spoiler_asked_entity?: string;
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
   * While the answer is still being made: the newest 600 characters the model has thought so far,
   * republished on every poll, and null until the first piece of thinking arrives. The screen
   * shows its newest three sentences where the stock waiting phrase used to be.
   *
   * Absent on every build before thinking was kept, and on every Ask with thinking off — so the
   * screen must treat "not there" as "show the old waiting phrase", which is what it does.
   */
  reasoning_partial?: string | null;
  /**
   * How long the model has been thinking, in whole seconds, counted from its first piece of
   * thinking. It stops counting the moment the first piece of the answer arrives, so the number
   * on the fold row does not creep up while the answer types itself out.
   */
  reasoning_seconds?: number | null;
  /**
   * On a finished answer: the whole thinking the computer side kept, "" when there was none. It
   * may open with a line saying the start was cut to fit; that is the computer side's own line.
   */
  reasoning_text?: string | null;
  /** On a finished answer: a rough count of the thinking, for the Show details chip only. */
  reasoning_tokens?: number | null;
  /**
   * Named chat slot this request belongs to, so a poll can tell whether the tokens it is about
   * to paint belong to the slot the user is looking at. Set at accept time and carried on the
   * state dict, so it is still present on the terminal poll — `_chat_slot_by_request` is popped
   * before then.
   */
  chat_slot_id?: string | null;
  /**
   * Plan 58 phase 1: the "From the notes" block's own material, published before the model call
   * so the live streaming bubble can show it from the first word (game_ai_request.py's
   * `_publish_kb_attached_notes_live`, carried into a poll by `_merge_partial_into_
   * background_status`). Empty on a turn with nothing attached; absent on a build before this
   * field existed.
   */
  kb_attached_notes?: KbAttachedNote[];
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
  /** The thing the backend worked out this question named (plan 54 gap 2). */
  askedEntity?: string;
  /**
   * What the model thought before writing this answer, when it thought at all. Carried here so the
   * turn on screen keeps its fold row for the moment between the answer landing and the saved chat
   * reloading with the same record on the turn itself.
   */
  reasoning?: TurnReasoning;
};

/**
 * The thinking of the question being answered right now, as the screen holds it between polls.
 *
 * `partial` is the newest slice the computer side published, kept once it has arrived: a later
 * poll that carries nothing must not blank the lines that are already on screen. `seconds` is what
 * the fold row shows the moment the answer starts, before the finished status arrives with the
 * same number.
 */
export type LiveReasoningSnapshot = {
  partial: string;
  seconds: number | null;
};

/**
 * Everything the space under your question shows while the answer is being made, as one thing.
 *
 * Two facts, and only one of them is ever on screen at a time: the stock waiting phrase the
 * computer side composes, and — on a model that thinks, once its first thought arrives — the
 * model's own words. They are handed down together because they are alternatives for the same
 * few lines of screen, and because the main screen's job is measured by how many separate things
 * it passes to a tab (scripts/shell_seam.mjs): two related facts about one piece of screen belong
 * in one parcel.
 */
export type LiveThinkingSnapshot = {
  summary: string | null;
  reasoning: LiveReasoningSnapshot | null;
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
