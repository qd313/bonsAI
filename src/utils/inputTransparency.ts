import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";

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
  ask_diagnostics?: AskDiagnosticsSnapshot | null;
  response_verify?: {
    passed?: boolean;
    warnings?: string[];
    second_pass?: { ran?: boolean; passed?: boolean; model?: string; verdict?: string };
  } | null;
};

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
