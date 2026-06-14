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

/** Tier ``non_foss`` without explicit unlock collapses to ``open_weight`` so we never persist an illegal pair. */
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
export type DesktopAppLogLevel = "off" | "default" | "verbose";
export type PresetChipAnimation = "fade" | "carousel" | "static";
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
  steam_logs_read: boolean;
  external_navigation: boolean;
  /** Outbound Steam Web API (GetPlayerBans) for ``bonsai:vac-check``; key stored in settings. */
  steam_web_api: boolean;
};

export type NamedOllamaHost = {
  label: string;
  host: string;
};

export type BonsaiSettings = {
  latency_warning_seconds: number;
  request_timeout_seconds: number;
  /** When true, stored warning/timeout apply; when false, defaults (30s / 45s) for Ask + Ollama. */
  latency_timeouts_custom_enabled: boolean;
  unified_input_persistence_mode: UnifiedInputPersistenceMode;
  /** Vision attachment downscale and JPEG quality preset. */
  screenshot_attachment_preset: ScreenshotAttachmentPreset;
  /** When true, append Ask and AI response lines to daily chat files under Desktop/bonsAI_logs (requires filesystem_write). */
  desktop_debug_note_auto_save: boolean;
  /** When true, append full Ask/Ollama transparency blocks to Desktop trace files (requires filesystem_write). */
  desktop_ask_verbose_logging: boolean;
  /** App activity log level written to Desktop/bonsAI_logs/bonsai-app-YYYY-MM-DD.log (requires filesystem_write). */
  desktop_app_log_level: DesktopAppLogLevel;
  /** When true (with Permissions → Steam/Proton log read), troubleshooting-style Asks attach bounded local log excerpts. */
  attach_proton_logs_when_troubleshooting: boolean;
  /** @deprecated Prefer `preset_chip_animation`; kept for migration from older settings.json. */
  preset_chip_fade_animation_enabled: boolean;
  /** Main-tab preset chips: crossfade cycle, vertical carousel, or static rotation without opacity animation. */
  preset_chip_animation: PresetChipAnimation;
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
  /** When true, show the Developer tab in the LB/RB strip (default off for typical users). */
  show_developer_tab: boolean;
  /** Which Ollama model families the backend may try (see README model policy). */
  model_policy_tier: ModelPolicyTierId;
  /** Tier 3 requires explicit acknowledgment for non-FOSS and unclassified tags. */
  model_policy_non_foss_unlocked: boolean;
  /** When true, append large-model tags to fallback chains (may exceed ~16GB VRAM). */
  model_allow_high_vram_fallbacks: boolean;
  /** When true, route Ollama to this device only (fixed 127.0.0.1:11434); LAN PC IP field ignored for Ask/Test. */
  ollama_local_on_deck: boolean;
  /** When false, Strategy ```bonsai-spoiler``` blocks render as visible text (no tap-to-reveal). Default on. */
  strategy_spoiler_masking_enabled: boolean;
  /** When true, spoiler blocks start expanded after the user consented on that Ask (still collapsible). */
  strategy_spoiler_auto_reveal_after_consent: boolean;
  /** Steam Web API key for GetPlayerBans (VAC check command); stored on device with plugin settings. */
  steam_web_api_key: string;
  /** When true, Main tab shows progressive Ollama token streaming (Developer tab opt-in). */
  bonsai_token_streaming_enabled: boolean;
  /** When true, show the translucent on-screen ingest debug HUD (Developer tab opt-in). */
  show_onscreen_debug_hud: boolean;
  /** Rule-based post-check on Ollama replies (Developer / advanced). */
  response_verify_enabled: boolean;
  /** Optional second-model verifier (default off). */
  response_verify_second_pass: boolean;
  /** Ollama tag for verifier second pass (empty disables the model call). */
  response_verify_model: string;
  /** Labeled ``host:port`` presets for quick Connection switching (max 4). */
  named_ollama_hosts: NamedOllamaHost[];
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
  desktopAppLogLevel: DesktopAppLogLevel;
  attachProtonLogsWhenTroubleshooting: boolean;
  presetChipFadeAnimationEnabled: boolean;
  presetChipAnimation: PresetChipAnimation;
  inputSanitizerUserDisabled: boolean;
  capabilities: BonsaiCapabilities;
  aiCharacterEnabled: boolean;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  askMode: AskModeId;
  ollamaKeepAlive: OllamaKeepAliveDuration;
  showDeveloperTab: boolean;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  ollamaLocalOnDeck: boolean;
  strategySpoilerMaskingEnabled: boolean;
  strategySpoilerAutoRevealAfterConsent: boolean;
  steamWebApiKey: string;
  bonsaiTokenStreamingEnabled: boolean;
  showOnscreenDebugHud: boolean;
  responseVerifyEnabled: boolean;
  responseVerifySecondPass: boolean;
  responseVerifyModel: string;
  namedOllamaHosts: NamedOllamaHost[];
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
    desktop_app_log_level: input.desktopAppLogLevel,
    attach_proton_logs_when_troubleshooting: input.attachProtonLogsWhenTroubleshooting,
    preset_chip_fade_animation_enabled: input.presetChipAnimation === "fade",
    preset_chip_animation: input.presetChipAnimation,
    input_sanitizer_user_disabled: input.inputSanitizerUserDisabled,
    capabilities: input.capabilities,
    ai_character_enabled: input.aiCharacterEnabled,
    ai_character_random: input.aiCharacterRandom,
    ai_character_preset_id: input.aiCharacterPresetId,
    ai_character_custom_text: input.aiCharacterCustomText,
    ai_character_accent_intensity: input.aiCharacterAccentIntensity,
    ask_mode: input.askMode,
    ollama_keep_alive: input.ollamaKeepAlive,
    show_developer_tab: input.showDeveloperTab,
    model_policy_tier: input.modelPolicyTier,
    model_policy_non_foss_unlocked: input.modelPolicyNonFossUnlocked,
    model_allow_high_vram_fallbacks: input.modelAllowHighVramFallbacks,
    ollama_local_on_deck: input.ollamaLocalOnDeck,
    strategy_spoiler_masking_enabled: input.strategySpoilerMaskingEnabled,
    strategy_spoiler_auto_reveal_after_consent: input.strategySpoilerAutoRevealAfterConsent,
    steam_web_api_key: input.steamWebApiKey.trim().slice(0, STEAM_WEB_API_KEY_MAX_LEN),
    bonsai_token_streaming_enabled: input.bonsaiTokenStreamingEnabled,
    show_onscreen_debug_hud: input.showOnscreenDebugHud,
    response_verify_enabled: input.responseVerifyEnabled,
    response_verify_second_pass: input.responseVerifySecondPass,
    response_verify_model: input.responseVerifyModel.trim().slice(0, 64),
    named_ollama_hosts: input.namedOllamaHosts,
  };
  return patch ? { ...base, ...patch } : base;
}

export type AppliedResultLike = {
  tdp_watts: number | null;
  gpu_clock_mhz: number | null;
  errors: string[];
};

export const DEFAULT_LATENCY_WARNING_SECONDS = 45;
export const DEFAULT_REQUEST_TIMEOUT_SECONDS = 180;
export const MIN_LATENCY_WARNING_SECONDS = 5;
export const MAX_LATENCY_WARNING_SECONDS = 300;
export const MIN_REQUEST_TIMEOUT_SECONDS = 10;
export const MAX_REQUEST_TIMEOUT_SECONDS = 600;
export const LATENCY_WARNING_STEP_SECONDS = 5;
export const REQUEST_TIMEOUT_STEP_SECONDS = 10;
export const DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE: UnifiedInputPersistenceMode = "no_persist";
export const SCREENSHOT_ATTACHMENT_PRESET_OPTIONS: ScreenshotAttachmentPreset[] = ["low", "mid", "max"];
export const DEFAULT_SCREENSHOT_ATTACHMENT_PRESET: ScreenshotAttachmentPreset = "low";
/** @deprecated use DEFAULT_SCREENSHOT_ATTACHMENT_PRESET; kept for tests/migration. */
export const DEFAULT_SCREENSHOT_MAX_DIMENSION: ScreenshotMaxDimension = 1280;
export const DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE = false;
export const DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING = false;
export const DEFAULT_BONSAI_TOKEN_STREAMING_ENABLED = false;
export const DEFAULT_SHOW_ONSCREEN_DEBUG_HUD = false;
export const DEFAULT_RESPONSE_VERIFY_ENABLED = false;
export const DEFAULT_RESPONSE_VERIFY_SECOND_PASS = false;
export const DEFAULT_RESPONSE_VERIFY_MODEL = "";
export const RESPONSE_VERIFY_MODEL_MAX_LEN = 64;
export const MAX_NAMED_OLLAMA_HOSTS = 4;
export const DEFAULT_DESKTOP_APP_LOG_LEVEL: DesktopAppLogLevel = "off";
export const DESKTOP_APP_LOG_LEVEL_OPTIONS: DesktopAppLogLevel[] = ["off", "default", "verbose"];
export const DEFAULT_ATTACH_PROTON_LOGS_WHEN_TROUBLESHOOTING = false;
export const DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED = true;
export const DEFAULT_PRESET_CHIP_ANIMATION: PresetChipAnimation = "fade";
export const PRESET_CHIP_ANIMATION_OPTIONS: PresetChipAnimation[] = ["fade", "carousel", "static"];
export const DEFAULT_INPUT_SANITIZER_USER_DISABLED = false;
export const DEFAULT_SHOW_DEVELOPER_TAB = false;
/** Persisted routing: off = LAN PC IP text field applies; when on, Ask uses localhost Ollama on the Deck only. */
export const DEFAULT_OLLAMA_LOCAL_ON_DECK = false;
/** Fixed host:port for on-device Ollama (matches `refactor_helpers.DEFAULT_OLLAMA_*`). */
export const OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP = "127.0.0.1:11434";
export const DEFAULT_MODEL_POLICY_NON_FOSS_UNLOCKED = false;
export const DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS = false;
export const DEFAULT_ASK_MODE: AskModeId = "speed";
export const DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED = true;
export const DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT = false;
/** Align with backend ``STEAM_WEB_API_KEY_MAX_LEN``. */
export const STEAM_WEB_API_KEY_MAX_LEN = 128;
export { DEFAULT_OLLAMA_KEEP_ALIVE };
export type { ModelPolicyTierId };
export { DEFAULT_MODEL_POLICY_TIER } from "../data/modelPolicy";

export const DEFAULT_CAPABILITIES: BonsaiCapabilities = {
  filesystem_write: false,
  hardware_control: false,
  media_library_access: false,
  steam_logs_read: false,
  external_navigation: false,
  steam_web_api: false,
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
  if (value === "persist_all" || value === "persist_search_only" || value === "no_persist") {
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

export function normalizeBonsaiTokenStreamingEnabled(value: unknown): boolean {
  return value === true;
}

export function normalizeShowOnscreenDebugHud(value: unknown): boolean {
  return value === true;
}

export function normalizeResponseVerifyEnabled(value: unknown): boolean {
  return value === true;
}

export function normalizeResponseVerifySecondPass(value: unknown): boolean {
  return value === true;
}

const RESPONSE_VERIFY_MODEL_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,63}$/;

export function normalizeResponseVerifyModel(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_RESPONSE_VERIFY_MODEL;
  const tag = value.trim().slice(0, RESPONSE_VERIFY_MODEL_MAX_LEN);
  if (!tag || !RESPONSE_VERIFY_MODEL_RE.test(tag)) return DEFAULT_RESPONSE_VERIFY_MODEL;
  return tag;
}

export function normalizeNamedOllamaHosts(value: unknown): NamedOllamaHost[] {
  if (!Array.isArray(value)) return [];
  const out: NamedOllamaHost[] = [];
  for (const item of value) {
    if (out.length >= MAX_NAMED_OLLAMA_HOSTS) break;
    if (!item || typeof item !== "object") continue;
    const rec = item as { label?: unknown; host?: unknown };
    if (typeof rec.label !== "string" || typeof rec.host !== "string") continue;
    const label = rec.label.trim().slice(0, 32);
    const host = rec.host.trim().slice(0, 128);
    if (!label || !host) continue;
    out.push({ label, host });
  }
  return out;
}

export function normalizeDesktopAppLogLevel(value: unknown): DesktopAppLogLevel {
  if (value === "off" || value === "default" || value === "verbose") {
    return value;
  }
  return DEFAULT_DESKTOP_APP_LOG_LEVEL;
}

export function normalizeAttachProtonLogsWhenTroubleshooting(value: unknown): boolean {
  return value === true;
}

export function normalizePresetChipFadeAnimationEnabled(value: unknown): boolean {
  if (value === false) return false;
  return DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED;
}

export function normalizePresetChipAnimation(
  value: unknown,
  legacyFadeEnabled: unknown
): PresetChipAnimation {
  if (typeof value === "string") {
    const t = value.trim() as PresetChipAnimation;
    if (PRESET_CHIP_ANIMATION_OPTIONS.includes(t)) return t;
  }
  if (legacyFadeEnabled === false) return "static";
  return DEFAULT_PRESET_CHIP_ANIMATION;
}

export function normalizeInputSanitizerUserDisabled(value: unknown): boolean {
  return value === true;
}

export function normalizeShowDeveloperTab(value: unknown, legacyShowDebugTab?: unknown): boolean {
  if (value === true) return true;
  if (legacyShowDebugTab === true) return true;
  return false;
}

export function normalizeModelAllowHighVramFallbacks(value: unknown): boolean {
  return value === true;
}

export function normalizeOllamaLocalOnDeck(value: unknown): boolean {
  if (value === undefined || value === null) {
    return DEFAULT_OLLAMA_LOCAL_ON_DECK;
  }
  return value === true;
}

export function normalizeStrategySpoilerMaskingEnabled(value: unknown): boolean {
  if (value === false) return false;
  return DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED;
}

export function normalizeStrategySpoilerAutoRevealAfterConsent(value: unknown): boolean {
  return value === true;
}

export function normalizeSteamWebApiKey(value: unknown): string {
  if (typeof value !== "string") return "";
  const t = value.trim().slice(0, STEAM_WEB_API_KEY_MAX_LEN);
  return t;
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
    steam_logs_read: raw.steam_logs_read === true,
    external_navigation: raw.external_navigation === true,
    steam_web_api: raw.steam_web_api === true,
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
    desktop_app_log_level: normalizeDesktopAppLogLevel(raw.desktop_app_log_level),
    attach_proton_logs_when_troubleshooting: normalizeAttachProtonLogsWhenTroubleshooting(
      raw.attach_proton_logs_when_troubleshooting
    ),
    preset_chip_animation: normalizePresetChipAnimation(
      raw.preset_chip_animation,
      raw.preset_chip_fade_animation_enabled
    ),
    preset_chip_fade_animation_enabled:
      normalizePresetChipAnimation(raw.preset_chip_animation, raw.preset_chip_fade_animation_enabled) === "fade",
    input_sanitizer_user_disabled: normalizeInputSanitizerUserDisabled(raw.input_sanitizer_user_disabled),
    capabilities: normalizeCapabilities(raw.capabilities),
    ai_character_enabled: normalizeAiCharacterEnabled(raw.ai_character_enabled),
    ai_character_random: normalizeAiCharacterRandom(raw.ai_character_random),
    ai_character_preset_id: normalizeAiCharacterPresetId(raw.ai_character_preset_id),
    ai_character_custom_text: normalizeAiCharacterCustomText(raw.ai_character_custom_text),
    ai_character_accent_intensity: normalizeAiCharacterAccentIntensity(raw.ai_character_accent_intensity),
    ask_mode: normalizeAskMode(raw.ask_mode),
    ollama_keep_alive: normalizeOllamaKeepAlive(raw.ollama_keep_alive),
    show_developer_tab: normalizeShowDeveloperTab(raw.show_developer_tab, rawRecord?.show_debug_tab),
    model_policy_tier: modelPolicy.model_policy_tier,
    model_policy_non_foss_unlocked: modelPolicy.model_policy_non_foss_unlocked,
    model_allow_high_vram_fallbacks: normalizeModelAllowHighVramFallbacks(raw.model_allow_high_vram_fallbacks),
    ollama_local_on_deck: normalizeOllamaLocalOnDeck(raw.ollama_local_on_deck),
    strategy_spoiler_masking_enabled: normalizeStrategySpoilerMaskingEnabled(raw.strategy_spoiler_masking_enabled),
    strategy_spoiler_auto_reveal_after_consent: normalizeStrategySpoilerAutoRevealAfterConsent(
      raw.strategy_spoiler_auto_reveal_after_consent
    ),
    steam_web_api_key: normalizeSteamWebApiKey(raw.steam_web_api_key),
    bonsai_token_streaming_enabled: normalizeBonsaiTokenStreamingEnabled(raw.bonsai_token_streaming_enabled),
    show_onscreen_debug_hud: normalizeShowOnscreenDebugHud(raw.show_onscreen_debug_hud),
    response_verify_enabled: normalizeResponseVerifyEnabled(raw.response_verify_enabled),
    response_verify_second_pass: normalizeResponseVerifySecondPass(raw.response_verify_second_pass),
    response_verify_model: normalizeResponseVerifyModel(raw.response_verify_model),
    named_ollama_hosts: normalizeNamedOllamaHosts(raw.named_ollama_hosts),
  };
}

/** QAM Performance verification line — sysfs is source of truth; QAM can lag. */
const QAM_VERIFY_SLIDER_LINE =
  "If QAM Performance sliders look stale, close and reopen the QAM Performance tab to verify values match the applied cap.";

/**
 * One short banner for the main tab when last Ask included tuning `applied` metadata.
 * TDP (sysfs) is distinguished from GPU MHz (advisory; not written by this plugin yet).
 */
export function formatAppliedTuningBannerText(applied: AppliedResultLike | null | undefined): string | null {
  if (!applied) return null;
  const tdp = applied.tdp_watts;
  const gpu = applied.gpu_clock_mhz;
  if (tdp == null && gpu == null) return null;

  const errList = applied.errors?.length ? applied.errors : [];
  if (tdp != null) {
    let s = `TDP ${tdp}W was applied. ${QAM_VERIFY_SLIDER_LINE}`;
    if (gpu != null) {
      s += ` GPU ${gpu} MHz is a recommendation; this plugin does not write GPU clock to hardware yet.`;
    }
    return s;
  }

  if (gpu != null) {
    const pre =
      errList.length > 0
        ? `TDP was not applied (${errList[0]}). `
        : "";
    return `${pre}GPU ${gpu} MHz is from the model; this plugin does not write GPU clock to hardware yet.`;
  }

  return null;
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
    text += `\n\nNote: If Steam's QAM Performance sliders look stale, close and reopen that tab to verify values match what was applied.`;
  }
  return text;
}
