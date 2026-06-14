import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { normalizeSettings, type BonsaiSettings } from "../utils/settingsAndResponse";

/** Default settings payload aligned with backend `load_settings` / `normalize_settings`. */
export function defaultSettingsFixture(): BonsaiSettings {
  return normalizeSettings({});
}

export function idleBackgroundStatusFixture(): BackgroundRequestStatus {
  return {
    status: "idle",
    request_id: null,
    question: "",
    app_id: "",
    app_context: "none",
    success: null,
    response: "",
    applied: null,
    elapsed_seconds: 0,
    error: null,
    started_at: null,
    completed_at: null,
  };
}
