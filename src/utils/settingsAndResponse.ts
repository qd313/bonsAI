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
import {
  DEFAULT_OLLAMA_KEEP_ALIVE,
  isOllamaKeepAliveDuration,
  type OllamaKeepAliveDuration,
} from "../data/ollamaKeepAlive";
import { AI_CHARACTER_CUSTOM_TEXT_MAX, isValidPresetId } from "../data/characterCatalog";
import {
  normalizeModelPolicyNonFossUnlocked,
  normalizeModelPolicyTier,
  type ModelPolicyTierId,
} from "../data/modelPolicy";

function reconcileModelPolicySettings(
  tierRaw: unknown,
  unlockRaw: unknown
): { model_policy_tier: ModelPolicyTierId; model_policy_non_foss_unlocked: boolean } {
  const tier = normalizeModelPolicyTier(tierRaw);
  const unlock = normalizeModelPolicyNonFossUnlocked(unlockRaw);
  if (tier !== "non_foss") {
    return { model_policy_tier: tier, model_policy_non_foss_unlocked: false };
  }
  if (!unlock) {
    return { model_policy_tier: "open_weight", model_policy_non_foss_unlocked: false };
  }
  return { model_policy_tier: "non_foss", model_policy_non_foss_unlocked: true };
}
export type UnifiedInputPersistenceMode = "persist_all" | "persist_search_only" | "no_persist";
export type { AskModeId };
export type { OllamaKeepAliveDuration };
/** Legacy; migration maps to ScreenshotAttachmentPreset. */
export type ScreenshotMaxDimension = 1280 | 1920 | 3160;
export type ScreenshotAttachmentPreset = "low" | "mid" | "max";

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
  /** When true, stored warning/timeout apply; when false, defaults (15s / 120s) for Ask + Ollama. */
  latency_timeouts_custom_enabled: boolean;
  unified_input_persistence_mode: UnifiedInputPersistenceMode;
  /** Vision attachment downscale and JPEG quality preset. */
  screenshot_attachment_preset: ScreenshotAttachmentPreset;
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
  /** Ollama `keep_alive` for each Ask (how long the model stays in VRAM on the host after the request). */
  ollama_keep_alive: OllamaKeepAliveDuration;
  /** When true, show the Debug tab in the LB/RB strip (default off for typical users). */
  show_debug_tab: boolean;
  /** Which Ollama model families the backend may try (see README model policy). */
  model_policy_tier: ModelPolicyTierId;
  /** Tier 3 requires explicit acknowledgment for non-FOSS and unclassified tags. */
  model_policy_non_foss_unlocked: boolean;
  /** When true, append large-model tags to fallback chains (may exceed ~16GB VRAM). */
  model_allow_high_vram_fallbacks: boolean;
};

/** Fields mirrored from React state / hook before `save_settings` RPC. */
export type BonsaiSettingsSnapshotInput = {
  latencyWarningSeconds: number;
  requestTimeoutSeconds: number;
  latencyTimeoutsCustomEnabled: boolean;
  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  desktopDebugNoteAutoSave: boolean;
  desktopAskVerboseLogging: boolean;
  presetChipFadeAnimationEnabled: boolean;
  inputSanitizerUserDisabled: boolean;
  capabilities: BonsaiCapabilities;
  aiCharacterEnabled: boolean;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  askMode: AskModeId;
  ollamaKeepAlive: OllamaKeepAliveDuration;
  showDebugTab: boolean;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
};

/** Build the backend `BonsaiSettings` object; optional `patch` for immediate saves (character picker, permissions). */
export function toBonsaiSettingsPayload(
  input: BonsaiSettingsSnapshotInput,
  patch?: Partial<BonsaiSettings>
): BonsaiSettings {
  const base: BonsaiSettings = {
    latency_warning_seconds: input.latencyWarningSeconds,
    request_timeout_seconds: input.requestTimeoutSeconds,
    latency_timeouts_custom_enabled: input.latencyTimeoutsCustomEnabled,
    unified_input_persistence_mode: input.unifiedInputPersistenceMode,
    screenshot_attachment_preset: input.screenshotAttachmentPreset,
    desktop_debug_note_auto_save: input.desktopDebugNoteAutoSave,
    desktop_ask_verbose_logging: input.desktopAskVerboseLogging,
    preset_chip_fade_animation_enabled: input.presetChipFadeAnimationEnabled,
    input_sanitizer_user_disabled: input.inputSanitizerUserDisabled,
    capabilities: input.capabilities,
    ai_character_enabled: input.aiCharacterEnabled,
    ai_character_random: input.aiCharacterRandom,
    ai_character_preset_id: input.aiCharacterPresetId,
    ai_character_custom_text: input.aiCharacterCustomText,
    ai_character_accent_intensity: input.aiCharacterAccentIntensity,
    ask_mode: input.askMode,
    ollama_keep_alive: input.ollamaKeepAlive,
    show_debug_tab: input.showDebugTab,
    model_policy_tier: input.modelPolicyTier,
    model_policy_non_foss_unlocked: input.modelPolicyNonFossUnlocked,
    model_allow_high_vram_fallbacks: input.modelAllowHighVramFallbacks,
  };
  return patch ? { ...base, ...patch } : base;
}

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
export const SCREENSHOT_ATTACHMENT_PRESET_OPTIONS: ScreenshotAttachmentPreset[] = ["low", "mid", "max"];
export const DEFAULT_SCREENSHOT_ATTACHMENT_PRESET: ScreenshotAttachmentPreset = "low";
/** @deprecated use DEFAULT_SCREENSHOT_ATTACHMENT_PRESET; kept for tests/migration. */
export const DEFAULT_SCREENSHOT_MAX_DIMENSION: ScreenshotMaxDimension = 1280;
export const DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE = false;
export const DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING = false;
export const DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED = true;
export const DEFAULT_INPUT_SANITIZER_USER_DISABLED = false;
export const DEFAULT_SHOW_DEBUG_TAB = false;
export const DEFAULT_MODEL_POLICY_NON_FOSS_UNLOCKED = false;
export const DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS = false;
export const DEFAULT_ASK_MODE: AskModeId = "speed";
export { DEFAULT_OLLAMA_KEEP_ALIVE };
export type { ModelPolicyTierId };
export { DEFAULT_MODEL_POLICY_TIER } from "../data/modelPolicy";

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
  if (value === 1920 || value === 3160) {
    return value;
  }
  return DEFAULT_SCREENSHOT_MAX_DIMENSION;
}

export function normalizeScreenshotAttachmentPreset(
  data: Record<string, unknown> | null | undefined
): ScreenshotAttachmentPreset {
  if (!data) {
    return DEFAULT_SCREENSHOT_ATTACHMENT_PRESET;
  }
  const direct = data.screenshot_attachment_preset;
  if (direct === "low" || direct === "mid" || direct === "max") {
    return direct;
  }
  const leg = data.screenshot_max_dimension;
  if (leg === 1920 || leg === "1920") return "mid";
  if (leg === 3160 || leg === "3160") return "max";
  return DEFAULT_SCREENSHOT_ATTACHMENT_PRESET;
}

export function normalizeLatencyTimeoutsCustomEnabled(value: unknown): boolean {
  return value === true;
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

export function normalizeShowDebugTab(value: unknown): boolean {
  return value === true;
}

export function normalizeModelAllowHighVramFallbacks(value: unknown): boolean {
  return value === true;
}

const _askModeSet = new Set<string>(ASK_MODE_IDS);

export function normalizeAskMode(value: unknown): AskModeId {
  if (typeof value === "string" && _askModeSet.has(value)) {
    return value as AskModeId;
  }
  return DEFAULT_ASK_MODE;
}

export function normalizeOllamaKeepAlive(value: unknown): OllamaKeepAliveDuration {
  if (typeof value === "string" && isOllamaKeepAliveDuration(value)) {
    return value;
  }
  return DEFAULT_OLLAMA_KEEP_ALIVE;
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
  const modelPolicy = reconcileModelPolicySettings(raw.model_policy_tier, raw.model_policy_non_foss_unlocked);
  const rawRecord =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined;
  return {
    latency_warning_seconds: latencyTimeout.latency_warning_seconds,
    request_timeout_seconds: latencyTimeout.request_timeout_seconds,
    latency_timeouts_custom_enabled: normalizeLatencyTimeoutsCustomEnabled(raw.latency_timeouts_custom_enabled),
    unified_input_persistence_mode: normalizeUnifiedInputPersistenceMode(raw.unified_input_persistence_mode),
    screenshot_attachment_preset: normalizeScreenshotAttachmentPreset(rawRecord),
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
    ollama_keep_alive: normalizeOllamaKeepAlive(raw.ollama_keep_alive),
    show_debug_tab: normalizeShowDebugTab(raw.show_debug_tab),
    model_policy_tier: modelPolicy.model_policy_tier,
    model_policy_non_foss_unlocked: modelPolicy.model_policy_non_foss_unlocked,
    model_allow_high_vram_fallbacks: normalizeModelAllowHighVramFallbacks(raw.model_allow_high_vram_fallbacks),
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
  else if (parts.length > 0) {
    text +=
      "\n\nNote: If Steam's QAM Performance sliders look stale, close and reopen that tab to verify values match what was applied.";
  }
  return text;
}
