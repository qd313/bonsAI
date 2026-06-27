export type AppliedResult = {
  tdp_watts: number | null;
  gpu_clock_mhz: number | null;
  errors: string[];
};

export type AskAttachment = {
  path: string;
  name: string;
  source: "capture" | "recent" | "picker";
  preview_data_uri?: string;
  size_bytes?: number;
  app_id?: string;
};

export type ScreenshotItem = {
  path: string;
  name: string;
  mtime: number;
  size_bytes?: number;
  source: string;
  app_id?: string;
  preview_data_uri?: string;
  capture_method?: string;
};

export type OllamaContextUi = { app_id: string; app_context: "active" | "none" } | null;

/** Parsed from Ollama when Ask mode is Strategy Guide and the model emitted a branch picker block. */
export type StrategyGuideBranchesPayload = {
  question: string;
  options: { id: string; label: string }[];
};

/** Parsed from Strategy follow-up replies (`bonsai-strategy-checklist` fence). */
export type StrategyChecklistPayload = {
  title: string;
  items: { id: string; label: string }[];
};

export type StrategyChecklistState = StrategyChecklistPayload & {
  checkedIds: string[];
  appId?: string;
  appName?: string;
};

/** One completed Ask round shown in the session thread (client-only; not persisted across reloads). */
export type AskThreadCollapsedTurn = {
  id: string;
  question: string;
  answer: string;
};

/** Accordion key for the Ask transcript: archived turn id, live turn, or all collapsed. */
export type AskThreadExpandedTurnKey = string | "live" | null;
