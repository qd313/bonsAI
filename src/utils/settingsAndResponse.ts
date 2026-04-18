/**
 * This module centralizes frontend settings normalization and response formatting behavior.
 * Keeping these pure helpers separate from UI components makes validation rules easy to test and reuse.
 */
import {
  AI_CHARACTER_ACCENT_INTENSITY_IDS,
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  type AiCharacterAccentIntensityId,
} from "../data/aiCharacterAccentIntensity";
import type { AskModeId } from "../data/askMode";
import { ASK_MODE_IDS } from "../data/askMode";
import { AI_CHARACTER_CUSTOM_TEXT_MAX, isValidPresetId } from "../data/characterCatalog";
export type UnifiedInputPersistenceMode = "persist_all" | "persist_search_only" | "no_persist";
export type { AskModeId };
export type ScreenshotMaxDimension = 1280 | 1920 | 3160;

/** High-impact capability toggles; keep keys aligned with backend `capabilities` and Permission Center UI. */
export type BonsaiCapabilities = {
  filesystem_write: boolean;
  hardware_control: boolean;
  media_library_access: boolean;
  external_navigation: boolean;
};

export type BonsaiSettings = {
  latency_warning_seconds: number;
  request_timeout_seconds: number;
  unified_input_persistence_mode: UnifiedInputPersistenceMode;
  screenshot_max_dimension: ScreenshotMaxDimension;
  /** When true, append Ask and AI response lines to daily chat files under Desktop/BonsAI_notes (requires filesystem_write). */
  desktop_debug_note_auto_save: boolean;
  /** When true, append full Ask/Ollama transparency blocks to Desktop trace files (requires filesystem_write). */
  desktop_ask_verbose_logging: boolean;
  /** When false, main-tab preset suggestion chips stay opaque and swap text without fade transitions (default true). */
  preset_chip_fade_animation_enabled: boolean;
  /** When true, Ask input sanitizer lane is off (set via README magic phrases, not the Settings UI). */
  input_sanitizer_user_disabled: boolean;
  capabilities: BonsaiCapabilities;
  /** Opt-in character tone for model replies (system prompt augmentation on the backend). */
  ai_character_enabled: boolean;
  ai_character_random: boolean;
  /** Known catalog id when not using random/custom. */
  ai_character_preset_id: string;
  ai_character_custom_text: string;
  /** How strongly to lean into accent/dialect for character replies (backend system prompt). */
  ai_character_accent_intensity: AiCharacterAccentIntensityId;
  /** Main-tab Ask inference mode (ordered Ollama model fallbacks on the backend). */
  ask_mode: AskModeId;
};

export type AppliedResultLike = {
  tdp_watts: number | null;
  gpu_clock_mhz: number | null;
  errors: string[];
};

export const DEFAULT_LATENCY_WARNING_SECONDS = 15;
export const DEFAULT_REQUEST_TIMEOUT_SECONDS = 120;
export const MIN_LATENCY_WARNING_SECONDS = 5;
export const MAX_LATENCY_WARNING_SECONDS = 300;
export const MIN_REQUEST_TIMEOUT_SECONDS = 10;
export const MAX_REQUEST_TIMEOUT_SECONDS = 300;
export const LATENCY_WARNING_STEP_SECONDS = 5;
export const REQUEST_TIMEOUT_STEP_SECONDS = 10;
export const DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE: UnifiedInputPersistenceMode = "persist_all";
export const SCREENSHOT_DIMENSION_OPTIONS: ScreenshotMaxDimension[] = [1280, 1920, 3160];
export const DEFAULT_SCREENSHOT_MAX_DIMENSION: ScreenshotMaxDimension = 1280;
export const DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE = false;
export const DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING = false;
export const DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED = true;
export const DEFAULT_INPUT_SANITIZER_USER_DISABLED = false;
export const DEFAULT_ASK_MODE: AskModeId = "speed";

export const DEFAULT_CAPABILITIES: BonsaiCapabilities = {
  filesystem_write: false,
  hardware_control: false,
  media_library_access: false,
  external_navigation: false,
};

export const DEFAULT_AI_CHARACTER_ENABLED = false;
export const DEFAULT_AI_CHARACTER_RANDOM = true;
export const DEFAULT_AI_CHARACTER_PRESET_ID = "";
export const DEFAULT_AI_CHARACTER_CUSTOM_TEXT = "";
export { DEFAULT_AI_CHARACTER_ACCENT_INTENSITY };

function clampNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  /** Coerce unknown input to a bounded integer value. */
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.max(minimum, Math.min(maximum, rounded));
}

function snapToStep(value: number, minimum: number, maximum: number, step: number): number {
  /** Snap bounded values to configured step increments for stable slider/state behavior. */
  const clamped = Math.max(minimum, Math.min(maximum, value));
  const offset = clamped - minimum;
  const snapped = minimum + Math.round(offset / step) * step;
  return Math.max(minimum, Math.min(maximum, snapped));
}

export function normalizeLatencyWarningSeconds(
  value: unknown,
  fallback: number = DEFAULT_LATENCY_WARNING_SECONDS
): number {
  /** Normalize latency warning seconds into configured range and step constraints. */
  const clamped = clampNumber(value, fallback, MIN_LATENCY_WARNING_SECONDS, MAX_LATENCY_WARNING_SECONDS);
  return snapToStep(clamped, MIN_LATENCY_WARNING_SECONDS, MAX_LATENCY_WARNING_SECONDS, LATENCY_WARNING_STEP_SECONDS);
}

export function normalizeRequestTimeoutSeconds(
  value: unknown,
  fallback: number = DEFAULT_REQUEST_TIMEOUT_SECONDS
): number {
  /** Normalize request timeout seconds into backend-safe range and step constraints. */
  const clamped = clampNumber(value, fallback, MIN_REQUEST_TIMEOUT_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS);
  return snapToStep(clamped, MIN_REQUEST_TIMEOUT_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS, REQUEST_TIMEOUT_STEP_SECONDS);
}

/**
 * Normalize warning + timeout independently, then enforce strict ordering (warning &lt; timeout).
 * Prefers raising the timeout on conflicts; if that hits max, lowers the warning instead.
 */
export function reconcileLatencyWarningAndTimeout(
  warningRaw: unknown,
  timeoutRaw: unknown
): { latency_warning_seconds: number; request_timeout_seconds: number } {
  let warning = normalizeLatencyWarningSeconds(warningRaw, DEFAULT_LATENCY_WARNING_SECONDS);
  let timeout = normalizeRequestTimeoutSeconds(timeoutRaw, DEFAULT_REQUEST_TIMEOUT_SECONDS);

  if (warning < timeout) {
    return { latency_warning_seconds: warning, request_timeout_seconds: timeout };
  }

  let t = timeout;
  while (warning >= t && t < MAX_REQUEST_TIMEOUT_SECONDS) {
    t += REQUEST_TIMEOUT_STEP_SECONDS;
  }
  t = Math.min(t, MAX_REQUEST_TIMEOUT_SECONDS);
  t = normalizeRequestTimeoutSeconds(t, timeout);
  if (warning < t) {
    return { latency_warning_seconds: warning, request_timeout_seconds: t };
  }

  let w = warning;
  while (w >= t && w > MIN_LATENCY_WARNING_SECONDS) {
    w -= LATENCY_WARNING_STEP_SECONDS;
  }
  w = normalizeLatencyWarningSeconds(w, warning);
  if (w >= t) {
    w = Math.max(
      MIN_LATENCY_WARNING_SECONDS,
      Math.min(MAX_LATENCY_WARNING_SECONDS, t - LATENCY_WARNING_STEP_SECONDS)
    );
    w = snapToStep(w, MIN_LATENCY_WARNING_SECONDS, MAX_LATENCY_WARNING_SECONDS, LATENCY_WARNING_STEP_SECONDS);
  }
  return { latency_warning_seconds: w, request_timeout_seconds: t };
}

export function normalizeUnifiedInputPersistenceMode(value: unknown): UnifiedInputPersistenceMode {
  /** Validate persistence mode input and fall back to the default UI behavior. */
  if (value === "persist_search_only" || value === "no_persist") {
    return value;
  }
  return DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE;
}

export function normalizeScreenshotMaxDimension(value: unknown): ScreenshotMaxDimension {
  /** Validate screenshot dimension against the explicit option set shown in settings UI. */
  if (value === 1920 || value === 3160) {
    return value;
  }
  return DEFAULT_SCREENSHOT_MAX_DIMENSION;
}

export function normalizeDesktopDebugNoteAutoSave(value: unknown): boolean {
  /** Only explicit true enables auto-save (matches backend capability-style booleans). */
  return value === true;
}

export function normalizeDesktopAskVerboseLogging(value: unknown): boolean {
  return value === true;
}

export function normalizePresetChipFadeAnimationEnabled(value: unknown): boolean {
  if (value === false) return false;
  return DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED;
}

export function normalizeInputSanitizerUserDisabled(value: unknown): boolean {
  return value === true;
}

const _askModeSet = new Set<string>(ASK_MODE_IDS);

export function normalizeAskMode(value: unknown): AskModeId {
  if (typeof value === "string" && _askModeSet.has(value)) {
    return value as AskModeId;
  }
  return DEFAULT_ASK_MODE;
}

export function normalizeAiCharacterEnabled(value: unknown): boolean {
  return value === true;
}

export function normalizeAiCharacterRandom(value: unknown): boolean {
  if (value === false) return false;
  if (value === true) return true;
  return DEFAULT_AI_CHARACTER_RANDOM;
}

export function normalizeAiCharacterPresetId(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AI_CHARACTER_PRESET_ID;
  const t = value.trim();
  if (!t || !isValidPresetId(t)) return DEFAULT_AI_CHARACTER_PRESET_ID;
  return t;
}

export function normalizeAiCharacterCustomText(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AI_CHARACTER_CUSTOM_TEXT;
  let s = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!s) return DEFAULT_AI_CHARACTER_CUSTOM_TEXT;
  if (s.length > AI_CHARACTER_CUSTOM_TEXT_MAX) s = s.slice(0, AI_CHARACTER_CUSTOM_TEXT_MAX);
  return s;
}

const _accentIntensitySet = new Set<string>(AI_CHARACTER_ACCENT_INTENSITY_IDS);

export function normalizeAiCharacterAccentIntensity(value: unknown): AiCharacterAccentIntensityId {
  if (typeof value !== "string") return DEFAULT_AI_CHARACTER_ACCENT_INTENSITY;
  const t = value.trim();
  if (_accentIntensitySet.has(t)) return t as AiCharacterAccentIntensityId;
  return DEFAULT_AI_CHARACTER_ACCENT_INTENSITY;
}

export function normalizeCapabilities(value: unknown): BonsaiCapabilities {
  /** Coerce capability flags; only explicit true enables a scope (matches backend sanitize). */
  const raw =
    typeof value === "object" && value !== null ? (value as Partial<BonsaiCapabilities>) : {};
  return {
    filesystem_write: raw.filesystem_write === true,
    hardware_control: raw.hardware_control === true,
    media_library_access: raw.media_library_access === true,
    external_navigation: raw.external_navigation === true,
  };
}

export function normalizeSettings(data: unknown): BonsaiSettings {
  /** Normalize a raw settings payload into a fully populated frontend settings object. */
  const raw = (typeof data === "object" && data !== null) ? (data as Partial<BonsaiSettings>) : {};
  const latencyTimeout = reconcileLatencyWarningAndTimeout(
    raw.latency_warning_seconds ?? DEFAULT_LATENCY_WARNING_SECONDS,
    raw.request_timeout_seconds ?? DEFAULT_REQUEST_TIMEOUT_SECONDS
  );
  return {
    latency_warning_seconds: latencyTimeout.latency_warning_seconds,
    request_timeout_seconds: latencyTimeout.request_timeout_seconds,
    unified_input_persistence_mode: normalizeUnifiedInputPersistenceMode(raw.unified_input_persistence_mode),
    screenshot_max_dimension: normalizeScreenshotMaxDimension(raw.screenshot_max_dimension),
    desktop_debug_note_auto_save: normalizeDesktopDebugNoteAutoSave(raw.desktop_debug_note_auto_save),
    desktop_ask_verbose_logging: normalizeDesktopAskVerboseLogging(raw.desktop_ask_verbose_logging),
    preset_chip_fade_animation_enabled: normalizePresetChipFadeAnimationEnabled(
      raw.preset_chip_fade_animation_enabled
    ),
    input_sanitizer_user_disabled: normalizeInputSanitizerUserDisabled(raw.input_sanitizer_user_disabled),
    capabilities: normalizeCapabilities(raw.capabilities),
    ai_character_enabled: normalizeAiCharacterEnabled(raw.ai_character_enabled),
    ai_character_random: normalizeAiCharacterRandom(raw.ai_character_random),
    ai_character_preset_id: normalizeAiCharacterPresetId(raw.ai_character_preset_id),
    ai_character_custom_text: normalizeAiCharacterCustomText(raw.ai_character_custom_text),
    ai_character_accent_intensity: normalizeAiCharacterAccentIntensity(raw.ai_character_accent_intensity),
    ask_mode: normalizeAskMode(raw.ask_mode),
  };
}

export function buildResponseText(responseText: string, applied?: AppliedResultLike | null): string {
  /** Append applied tuning metadata to model text for the conversation transcript. */
  let text = responseText || "No response text.";
  if (!applied) return text;
  const parts: string[] = [];
  if (applied.tdp_watts != null) parts.push(`TDP: ${applied.tdp_watts}W`);
  if (applied.gpu_clock_mhz != null) parts.push(`GPU: ${applied.gpu_clock_mhz} MHz`);
  if (parts.length > 0) text += `\n\n[Applied: ${parts.join(", ")}]`;
  if (applied.errors?.length) text += `\n[Errors: ${applied.errors.join("; ")}]`;
  return text;
}
