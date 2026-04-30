import type { ModelPolicyDisclosurePayload } from "../data/modelPolicy";
import type { AppliedResult, StrategyGuideBranchesPayload } from "./bonsaiUi";

/** Shortcut-setup keyword replies surface this so the UI can deep-link Controller settings. */
export type ShortcutSetupKind = "deck" | "stadia";

export type BackgroundStartResponse = {
  accepted?: boolean;
  status: "pending" | "busy" | "invalid" | "completed" | "blocked";
  request_id?: number | null;
  response?: string;
  app_id?: string;
  app_context?: string;
  success?: boolean;
  applied?: AppliedResult | null;
  elapsed_seconds?: number;
  /** When set, this start finished without Ollama (e.g. sanitizer keyword command). */
  meta?: string;
  /** Set when the Ask was a bonsai:shortcut-setup-* keyword (no Ollama). */
  shortcut_setup?: ShortcutSetupKind;
};

export type BackgroundRequestStatus = {
  status: "idle" | "pending" | "completed" | "failed" | "cancelled";
  request_id: number | null;
  question: string;
  app_id: string;
  app_context: "active" | "none";
  success: boolean | null;
  response: string;
  applied: AppliedResult | null;
  elapsed_seconds: number;
  error: string | null;
  started_at: number | null;
  completed_at: number | null;
  strategy_guide_branches?: StrategyGuideBranchesPayload | null;
  model_policy_disclosure?: ModelPolicyDisclosurePayload | null;
  /** True when this Ask had explicit spoiler consent (toggle and/or backend phrase match). */
  strategy_spoiler_consent_effective?: boolean;
  /** Pyro talent-manager easter egg: distinguished chip text from last successful Ask. */
  preset_carousel_inject?: PresetCarouselInjectPayload | null;
  /** Present when the completed Ask was a shortcut-setup keyword. */
  shortcut_setup?: ShortcutSetupKind | null;
  /** True when the user hit Stop mid-generation (HTTP session closed locally). */
  cancelled?: boolean;
};

export type PresetCarouselInjectPayload = {
  text: string;
};

export type LastExchangeSnapshot = {
  question: string;
  answer: string;
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
