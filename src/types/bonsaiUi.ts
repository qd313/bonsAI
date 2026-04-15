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
};

export type OllamaContextUi = { app_id: string; app_context: "active" | "none" } | null;
