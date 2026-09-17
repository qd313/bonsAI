/**
 * Title: The shape of "what went into this answer"
 *
 * Purpose: The Show details panel tells the player what went into a particular AI answer — the exact
 * question sent to the model, which files or notes it read, whether anything was blocked by the
 * content filter, and more. This file describes the shape of that information exactly as the back
 * end sends it, so the screen code that draws the panel and its chips knows what fields it can rely
 * on.
 *
 * Used for: the Show details panel and its row of chips on the main tab (MainTabChatTranscript), and
 * the code that asks the back end for a fresh copy after each answer finishes
 * (useBonsaiAskOrchestration's refreshInputTransparency).
 *
 * Solves: gives one agreed shape for "what went into this answer" that both the back-end call and the
 * screen code that draws it from can check against, instead of the screen code guessing at field
 * names.
 *
 * Does not: work out what went into an answer in the first place — that happens on the back end, in
 * transparency_service.py. This file only describes the shape of what comes back, plus a couple of
 * narrower shapes: `ChatSlotTurnTransparency` is the smaller, trimmed set of fields saved alongside a
 * turn in a saved chat (route, whether it succeeded, and the chips — not the full raw prompts or
 * developer-only details), and `InputTransparencyRpcResult` is the "is there anything to show at all"
 * shape the back-end call itself returns.
 */
import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";

/**
 * One note the search actually attached to a turn, in its own words (plan 58 phase 1's "From the
 * notes" block). Filled in purely from what retrieval found — `card` is never the model's own
 * text. `source_host` is the raw credited host exactly as read (e.g. "hollowknight.wiki",
 * "www.pikminwiki.com" with its "www." kept) so the screen side's own host-to-name map can look
 * it up; empty when the note has no source at all (a maintainer-written note, or every shared
 * troubleshooting tip). `domain` is "strategy" for a game note or "compat" for a shared tip.
 */
export type KbAttachedNote = {
  name: string;
  kind: string;
  card: string;
  trust_tier: string;
  source_host: string;
  source_license: string;
  domain: string;
  game_title: string;
};

/** One credit line: a licensed source, plus the cards from it that reached the model. */
export type ContextChipAttribution = {
  source: string;
  license: string;
  url: string;
  cards: string[];
  /** YYYY-MM-DD the credited text was captured. Empty when the backend did not say. */
  captured?: string;
};

type ContextChipBody = {
  title: string;
  paths: string[];
  bullets: string[];
  /** Absent when nothing licensed was used — most turns. */
  attribution?: ContextChipAttribution[];
  dev_json?: unknown;
};

export type ContextChip = {
  id: string;
  rank: number;
  label: string;
  attached: boolean;
  tier_class: string;
  body: ContextChipBody;
};

/**
 * Last Ask transparency snapshot from backend `get_input_transparency` (matches main.py keys).
 */
export type TransparencySnapshot = {
  route: string;
  raw_question: string;
  sanitizer_action: string;
  sanitizer_reason_codes: string[];
  text_after_sanitizer: string;
  ollama_model: string | null;
  system_prompt: string | null;
  user_text_for_model: string | null;
  user_image_count: number;
  attachment_paths: string[];
  assistant_raw: string | null;
  assistant_after_attachment_format: string | null;
  final_response: string;
  applied: unknown;
  success: boolean;
  app_id: string;
  app_name: string;
  pc_ip: string;
  error_message: string;
  elapsed_seconds: number;
  model_policy_disclosure?: ModelPolicyDisclosurePayload | null;
  /** Local Proton/Steam log excerpts attached to the last Ollama system prompt (troubleshooting flow). */
  proton_log_excerpt_attached?: boolean;
  proton_log_sources?: { path: string; bytes_read: number }[];
  proton_log_notes?: string;
  proton_journal_attached?: boolean;
  proton_journal_entry_count?: number;
  proton_journal_notes?: string;
  kb_attached?: boolean;
  kb_trust_tier?: string;
  kb_sources?: string[];
  kb_notes?: string;
  kb_unavailable_reason?: string;
  kb_retrieval_method?: string;
  kb_domain?: string;
  kb_timing_ms?: Record<string, number>;
  kb_coverage_status?: string;
  kb_coverage_section_count?: number;
  kb_coverage_reason?: string;
  tdp_cap_watts?: number | null;
  context_chips?: ContextChip[];
  overflow_skips?: string[];
  ask_diagnostics?: AskDiagnosticsSnapshot | null;
  response_verify?: {
    passed?: boolean;
    warnings?: string[];
    second_pass?: { ran?: boolean; passed?: boolean; model?: string; verdict?: string };
  } | null;
  /** Global reply prose style active for this Ask (short / balanced / detailed). */
  reply_verbosity?: string;
  /** Ask mode active for the last transparency snapshot (speed / strategy / expert). */
  ask_mode?: string;
  /** Backend spoiler-risk scoring inputs for the confidence chip. */
  spoiler_risk_signals?: {
    ask_mode?: string;
    app_id?: string;
    game_genres?: string;
    asked_entity?: string;
    kb_entity_match?: boolean;
    kb_section_types?: string[];
  };
  /** Plan 58 phase 1: the notes behind the "From the notes" block. Empty on every turn with
   *  nothing attached, absent only on a snapshot built before this field existed. */
  kb_attached_notes?: KbAttachedNote[];
};

/**
 * Trimmed per-turn snapshot persisted alongside a restored chat-slot turn
 * (`transparency_snapshot_for_chat_slot` in transparency_service.py).
 *
 * Chat slots keep up to 200 turns per slot, and the session context strip only ever reads
 * `route`, `success`, and `context_chips`/`overflow_skips` off an archived turn — so that is all
 * the backend persists per turn rather than the full snapshot (raw prompts, system prompt text,
 * developer dev_json). A slot-restored turn carries this shape, not the full TransparencySnapshot.
 */
export type ChatSlotTurnTransparency = Pick<
  TransparencySnapshot,
  "route" | "success" | "context_chips" | "overflow_skips" | "kb_attached_notes"
>;

export type AskDiagnosticsSnapshot = {
  models_before_policy?: string[];
  models_after_policy?: string[];
  models_attempted?: string[];
  model_succeeded?: string | null;
  policy_tier?: string;
  policy_dropped_count?: number;
  requires_vision?: boolean;
  attachment_count?: number;
  attachment_warnings?: string[];
  attachment_errors?: string[];
  elapsed_seconds?: number | null;
};

export type InputTransparencyRpcResult =
  | { available: false }
  | { available: true; snapshot: TransparencySnapshot };
