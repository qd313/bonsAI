import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { type BonsaiSettings } from "../data/bonsaiSettingsSchema";
import { normalizeSettings } from "../data/bonsaiSettingsNormalizers";
/** Default settings payload aligned with backend `load_settings` / `normalize_settings`. */
export function defaultSettingsFixture(): BonsaiSettings {
  // "Run AI on this Deck" starts on in a fresh install (plan 93). The many screen tests built on this
  // fixture were written for the old start (off), so it is kept off here; a test of the real fresh
  // default calls normalizeSettings({}) itself.
  return { ...normalizeSettings({}), ollama_local_on_deck: false };
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
