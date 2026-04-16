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
};

export type InputTransparencyRpcResult =
  | { available: false }
  | { available: true; snapshot: TransparencySnapshot };
