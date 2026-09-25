/**
 * Title: Making sense of a settings file that might say anything
 *
 * Purpose: A saved settings file can hold almost anything — an old value
 * from a version of the plugin that worked differently, a value someone
 * edited by hand, or nothing at all for a setting that did not exist yet
 * when the file was written. This file is where every one of those cases
 * gets turned into a safe, known value the rest of the plugin can trust
 * without checking again. Most settings are simple — a toggle, or a
 * choice from a short list — and share one of a handful of common rules
 * defined once near the bottom of the file. A few need their own
 * function: a legacy name to read as well as the current one, two
 * settings that have to agree with each other, or a value built from
 * more than one saved field.
 *
 * Used for: Every time settings are loaded — when the plugin opens, after
 * a save round-trip, and when restoring a snapshot taken before a popup
 * closed the plugin's screen.
 *
 * Solves: Puts every one of these safety rules in one place, so a
 * question like "what happens if this setting is missing" or "what
 * happens if someone typed something odd into the settings file by hand"
 * has exactly one answer instead of a different guess in every place
 * that reads a setting.
 *
 * Does not: Decide what a setting's default should be, or what type it
 * is — see bonsaiSettingsSchema for the list of settings and their
 * starting values. This file only cleans up whatever value already
 * arrived.
 *
 * How it works: Most settings are declared as one row in the `SIMPLE_FIELDS` table near the
 * bottom, built from one of a handful of shared field-kind functions near the top of the file
 * (`boolDefaultFalse`, `enumOf`, `boundedString`, `clampedWholeNumber`, and the rest) — mirroring
 * `_SIMPLE_FIELDS` in settings_service.py row for row. `normalizeSettings()` runs every row
 * through its coercer, then layers the handful of settings that need something a table row
 * cannot express — a legacy key, another field's value, or a nested structure — on top by
 * calling their own named function directly.
 */
import {
  AI_CHARACTER_ACCENT_INTENSITY_IDS,
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  type AiCharacterAccentIntensityId,
} from "./aiCharacterAccentIntensity";
import { ASK_MODE_IDS, type AskModeId } from "./askMode";
import {
  ASK_THINK_EFFORT_IDS,
  DEFAULT_ASK_THINK_EFFORT,
  type AskThinkEffortId,
} from "./askThinkEffort";
import {
  DEFAULT_REPLY_VERBOSITY,
  isReplyVerbosityId,
  type ReplyVerbosityId,
} from "./replyVerbosity";
import { normalizeReplyLanguage } from "./replyLanguage";
import {
  DEFAULT_OLLAMA_KEEP_ALIVE,
  isOllamaKeepAliveDuration,
  type OllamaKeepAliveDuration,
} from "./ollamaKeepAlive";
import { AI_CHARACTER_CUSTOM_TEXT_MAX, isValidPresetId } from "./characterCatalog";
import {
  normalizeModelPolicyNonFossUnlocked,
  normalizeModelPolicyTier,
  type ModelPolicyTierId,
} from "./modelPolicy";
import { normalizeUiScaleProfileId } from "./uiScaleProfile";
import {
  DEFAULT_AI_CHARACTER_CUSTOM_TEXT,
  DEFAULT_AI_CHARACTER_PRESET_ID,
  DEFAULT_ASK_MODE,
  DEFAULT_DESKTOP_APP_LOG_LEVEL,
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_PRESET_CHIP_ANIMATION,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  DEFAULT_SCREENSHOT_ATTACHMENT_PRESET,
  DEFAULT_STREAM_SCRAMBLE_COLOR,
  DEFAULT_STREAM_SCRAMBLE_SETTLE_MS,
  DEFAULT_STREAM_SCRAMBLE_STYLE,
  DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
  DEFAULT_VOICE_REPLY_MODE,
  VOICE_REPLY_MODE_OPTIONS,
  DEFAULT_VOICE_STT_MODEL,
  LATENCY_WARNING_STEP_SECONDS,
  MAX_LATENCY_WARNING_SECONDS,
  MAX_NAMED_OLLAMA_HOSTS,
  MAX_FROZEN_TEST_CHIPS,
  FROZEN_TEST_CHIP_MAX_LEN,
  MAX_REQUEST_TIMEOUT_SECONDS,
  MIN_LATENCY_WARNING_SECONDS,
  MIN_REQUEST_TIMEOUT_SECONDS,
  PRESET_CHIP_ANIMATION_OPTIONS,
  REQUEST_TIMEOUT_STEP_SECONDS,
  STEAM_WEB_API_KEY_MAX_LEN,
  STREAM_SCRAMBLE_COLOR_OPTIONS,
  STREAM_SCRAMBLE_SETTLE_MS_MAX,
  STREAM_SCRAMBLE_SETTLE_MS_MIN,
  STREAM_SCRAMBLE_STYLE_OPTIONS,
  TAB_RESUME_MODE_OPTIONS,
  DEFAULT_TAB_RESUME_MODE,
  VOICE_STT_MODEL_OPTIONS,
  type BonsaiCapabilities,
  type BonsaiSettings,
  type DesktopAppLogLevel,
  type NamedOllamaHost,
  type PresetChipAnimation,
  type ScreenshotAttachmentPreset,
  type StreamScrambleColor,
  type StreamScrambleStyle,
  type TabResumeMode,
  type UnifiedInputPersistenceMode,
  type VoiceReplyMode,
  type VoiceSttModelId,
} from "./bonsaiSettingsSchema";

/** Tier ``non_foss`` without explicit unlock collapses to ``open_weight`` so we never persist an illegal pair. */
function reconcileModelPolicySettings(
  tierRaw: unknown,
  unlockRaw: unknown,
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

function clampNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.max(minimum, Math.min(maximum, rounded));
}

function snapToStep(value: number, minimum: number, maximum: number, step: number): number {
  const clamped = Math.max(minimum, Math.min(maximum, value));
  const offset = clamped - minimum;
  const snapped = minimum + Math.round(offset / step) * step;
  return Math.max(minimum, Math.min(maximum, snapped));
}

export function normalizeLatencyWarningSeconds(
  value: unknown,
  fallback: number = DEFAULT_LATENCY_WARNING_SECONDS,
): number {
  const clamped = clampNumber(value, fallback, MIN_LATENCY_WARNING_SECONDS, MAX_LATENCY_WARNING_SECONDS);
  return snapToStep(clamped, MIN_LATENCY_WARNING_SECONDS, MAX_LATENCY_WARNING_SECONDS, LATENCY_WARNING_STEP_SECONDS);
}

export function normalizeRequestTimeoutSeconds(
  value: unknown,
  fallback: number = DEFAULT_REQUEST_TIMEOUT_SECONDS,
): number {
  const clamped = clampNumber(value, fallback, MIN_REQUEST_TIMEOUT_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS);
  return snapToStep(clamped, MIN_REQUEST_TIMEOUT_SECONDS, MAX_REQUEST_TIMEOUT_SECONDS, REQUEST_TIMEOUT_STEP_SECONDS);
}

/**
 * Normalize warning + timeout independently, then enforce strict ordering (warning &lt; timeout).
 * Prefers raising the timeout on conflicts; if that hits max, lowers the warning instead.
 */
export function reconcileLatencyWarningAndTimeout(
  warningRaw: unknown,
  timeoutRaw: unknown,
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
      Math.min(MAX_LATENCY_WARNING_SECONDS, t - LATENCY_WARNING_STEP_SECONDS),
    );
    w = snapToStep(w, MIN_LATENCY_WARNING_SECONDS, MAX_LATENCY_WARNING_SECONDS, LATENCY_WARNING_STEP_SECONDS);
  }
  return { latency_warning_seconds: w, request_timeout_seconds: t };
}

function normalizeScreenshotAttachmentPreset(
  data: Record<string, unknown> | null | undefined,
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

// --- field kinds -------------------------------------------------------------
// Mirrors the `_SIMPLE_FIELDS` table in py_modules/backend/services/settings_service.py.
// Most settings are one of a handful of plain shapes; declaring them keeps "add a setting" to
// one row per language instead of a hand-written function each. Settings needing a legacy key,
// another field's value, or a nested structure stay as functions below, on purpose.
//
// The predicates are not interchangeable. `=== true` and `!== false` differ for every
// non-boolean value, and the two string kinds differ for non-strings. See
// tests/contracts/settings-hostile-inputs.json, which pins both languages to the same answers.

/** Off unless the value is exactly `true` — any other type stays off. */
function boolDefaultFalse(value: unknown): boolean {
  return value === true;
}

/** On unless the user explicitly saved `false` — a missing key stays on. */
function boolDefaultTrue(value: unknown): boolean {
  return value !== false;
}

/** Membership in `options` or the default. `trim` normalizes first; matching stays case-sensitive. */
function enumOf<T extends string>(
  options: readonly T[],
  fallback: T,
  { trim = false }: { trim?: boolean } = {},
): (value: unknown) => T {
  const allowed = new Set<string>(options);
  return (value: unknown): T => {
    if (typeof value !== "string") return fallback;
    const candidate = trim ? value.trim() : value;
    return allowed.has(candidate) ? (candidate as T) : fallback;
  };
}

/** Trimmed and length-capped. A non-string is rejected outright, not stringified. */
function boundedString(maxLength: number): (value: unknown) => string {
  return (value: unknown): string => (typeof value === "string" ? value.trim().slice(0, maxLength) : "");
}

/**
 * A whole number clamped to `[minimum, maximum]`, or `fallback` for anything that is not a
 * finite number. Mirrors Python's `_clamped_whole_number` in settings_service.py: a non-whole
 * number is cut to its whole part with `Math.trunc` (matching Python's `int()` truncation
 * towards zero), and `Number.isFinite` rejects `NaN` and the infinities before that runs.
 */
function clampedWholeNumber(
  fallback: number,
  minimum: number,
  maximum: number,
): (value: unknown) => number {
  return (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    const whole = Math.trunc(value);
    return Math.max(minimum, Math.min(maximum, whole));
  };
}

/**
 * QA-only: exact questions pinned into the preset carousel, in order. Mirrors Python's
 * `sanitize_frozen_test_chips`. Free text by design — the older compile-time freeze resolved
 * entries against the built-in preset list, which is why it could never hold a real QA question.
 */
function normalizeFrozenTestChips(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (out.length >= MAX_FROZEN_TEST_CHIPS) break;
    if (typeof item !== "string") continue;
    const text = item.trim().slice(0, FROZEN_TEST_CHIP_MAX_LEN);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function normalizeNamedOllamaHosts(value: unknown): NamedOllamaHost[] {
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

/**
 * Mirror of Python's `str(value or "").strip()` for the value types that realistically reach
 * settings.json. Exact for strings and numbers, which is what matters: a version or path
 * written unquoted must read the same on both sides.
 *
 * Not exact for booleans, objects and arrays — Python would stringify those to `"True"` or a
 * container repr. Those are garbage-in cases with no sensible reading, so both sides discard
 * them here rather than pretending at parity.
 */
function coerceScalarToTrimmedString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value) && value !== 0) return String(value).trim();
  return "";
}

/** D13: matches Python, which rejects traversal outright rather than storing it. */
function normalizeRagCorpusPath(value: unknown): string {
  const raw = coerceScalarToTrimmedString(value);
  if (!raw) return "";
  if (raw.replace(/\\/g, "/").includes("..")) return "";
  return raw.slice(0, 512);
}

function normalizePresetChipAnimation(
  value: unknown,
  legacyFadeEnabled: unknown,
): PresetChipAnimation {
  if (typeof value === "string") {
    const t = value.trim();
    // Migrated away in the Ghost in the Shell chip-decode rewrite: a Deck whose settings.json
    // still holds the retired `stream` mode maps forward to its replacement rather than falling
    // through to the `fade` default below, which would read as "the setting reset itself."
    // Mirrors `sanitize_preset_chip_animation` in settings_service.py (Python is authoritative, D13).
    if (t === "stream") return "decode";
    if (PRESET_CHIP_ANIMATION_OPTIONS.includes(t as PresetChipAnimation)) return t as PresetChipAnimation;
  }
  if (legacyFadeEnabled === false) return "static";
  return DEFAULT_PRESET_CHIP_ANIMATION;
}

function normalizeShowDeveloperTab(value: unknown, legacyShowDebugTab?: unknown): boolean {
  if (value === true) return true;
  if (legacyShowDebugTab === true) return true;
  return false;
}

const _askModeSet = new Set<string>(ASK_MODE_IDS);

function normalizeAskMode(value: unknown): AskModeId {
  if (value === "deep") {
    return "expert";
  }
  if (typeof value === "string" && _askModeSet.has(value)) {
    return value as AskModeId;
  }
  return DEFAULT_ASK_MODE;
}

function normalizeOllamaKeepAlive(value: unknown): OllamaKeepAliveDuration {
  if (typeof value === "string" && isOllamaKeepAliveDuration(value)) {
    return value;
  }
  return DEFAULT_OLLAMA_KEEP_ALIVE;
}

function normalizeReplyVerbosity(value: unknown): ReplyVerbosityId {
  if (typeof value === "string") {
    // Legacy Short (pre-Caveman rename) → caveman.
    const raw = value.trim().toLowerCase() === "short" ? "caveman" : value;
    if (isReplyVerbosityId(raw)) {
      return raw;
    }
  }
  return DEFAULT_REPLY_VERBOSITY;
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


function normalizeCapabilities(value: unknown): BonsaiCapabilities {
  const raw =
    typeof value === "object" && value !== null ? (value as Partial<BonsaiCapabilities>) : {};
  return {
    filesystem_write: raw.filesystem_write === true,
    media_library_access: raw.media_library_access === true,
    steam_logs_read: raw.steam_logs_read === true,
    steam_web_api: raw.steam_web_api === true,
    microphone_access: raw.microphone_access === true,
  };
}

function normalizeModelRoutingOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || t.length > 96 || seen.has(t)) continue;
    if (!/^[a-z0-9][a-z0-9._-]{0,63}(:[a-z0-9._-]{1,32})?$/i.test(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 16) break;
  }
  return out;
}

// --- the field table ---------------------------------------------------------
// One row per setting whose rule is a plain shape, mirroring `_SIMPLE_FIELDS` in
// settings_service.py. Adding such a setting is one row here plus one there;
// tests/contracts/settings-defaults.json and settings-hostile-inputs.json fail if the two
// disagree. Anything needing a legacy key, another field's value, or a nested structure is
// deliberately absent — see the functions above and `normalizeSettings` below.
//
// A few rows delegate to a named function rather than a kind, because the rule's option list
// or feature gate lives in that field's own module. `ui_scale_manual_profile` is the important
// one: `normalizeUiScaleProfileId` also applies the `SHOW_IMMERSIVE_UI_SCALE` gate, which is a
// deliberate TS-only behavior and the documented exception to TS/Python parity.
const SIMPLE_FIELDS = {
  // Developer and Desktop logging opt-ins.
  desktop_debug_note_auto_save: boolDefaultFalse,
  desktop_ask_verbose_logging: boolDefaultFalse,
  show_onscreen_debug_hud: boolDefaultFalse,
  dev_force_session_rag_chips: boolDefaultFalse,
  dev_preload_ask_model: boolDefaultFalse,
  preset_single_chip: boolDefaultFalse,
  // Trimmed before matching so a hand-edited `" verbose "` reads the same as in Python (D13).
  desktop_app_log_level: enumOf<DesktopAppLogLevel>(
    ["off", "default", "verbose"],
    DEFAULT_DESKTOP_APP_LOG_LEVEL,
    { trim: true },
  ),
  // Defaults to `resume` rather than off, because D15 option B is the locked behavior and this
  // control exists to compare the alternatives, not to gate the feature.
  tab_resume_mode: enumOf<TabResumeMode>(TAB_RESUME_MODE_OPTIONS, DEFAULT_TAB_RESUME_MODE, {
    trim: true,
  }),
  // Ask behavior.
  input_sanitizer_user_disabled: boolDefaultFalse,
  latency_timeouts_custom_enabled: boolDefaultFalse,
  unified_input_persistence_mode: enumOf<UnifiedInputPersistenceMode>(
    ["persist_all", "persist_search_only", "no_persist"],
    DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
  ),
  // Off unless the person turns it on; an unrecognised value must not start reading answers
  // out loud on its own.
  voice_reply_mode: enumOf<VoiceReplyMode>(VOICE_REPLY_MODE_OPTIONS, DEFAULT_VOICE_REPLY_MODE, {
    trim: true,
  }),
  reply_verbosity: normalizeReplyVerbosity,
  // Trimmed before matching, case-sensitive, and an unknown value falls back to `off` —
  // an unrecognised effort must not silently turn thinking on.
  ask_think_effort: enumOf<AskThinkEffortId>(
    ASK_THINK_EFFORT_IDS,
    DEFAULT_ASK_THINK_EFFORT,
    { trim: true },
  ),
  reply_language: normalizeReplyLanguage,
  ollama_keep_alive: normalizeOllamaKeepAlive,
  // `undefined`/`null` mean "never saved", which is off — same as any other non-`true`.
  ollama_local_on_deck: boolDefaultFalse,
  // Off unless the person turns it on — it changes how the Deck starts.
  ollama_local_autostart: boolDefaultFalse,
  model_allow_high_vram_fallbacks: boolDefaultFalse,
  // Presentation, defaulting on: only an explicit `false` turns these off.
  strategy_spoiler_masking_enabled: boolDefaultTrue,
  ui_scale_auto_enabled: boolDefaultTrue,
  strategy_spoiler_auto_reveal_after_consent: boolDefaultFalse,
  ui_scale_manual_profile: normalizeUiScaleProfileId,
  // Character.
  ai_character_enabled: boolDefaultFalse,
  ai_character_random: boolDefaultTrue,
  ai_character_preset_id: normalizeAiCharacterPresetId,
  ai_character_custom_text: normalizeAiCharacterCustomText,
  ai_character_accent_intensity: enumOf<AiCharacterAccentIntensityId>(
    AI_CHARACTER_ACCENT_INTENSITY_IDS,
    DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
    { trim: true },
  ),
  // Knowledge base.
  use_local_knowledge_base: boolDefaultFalse,
  // Defaults on: only an explicit `false` drops retrieval back to keyword-only.
  rag_hybrid_retrieval_enabled: boolDefaultTrue,
  rag_corpus_version: (value: unknown) => coerceScalarToTrimmedString(value).slice(0, 64),
  // Voice and credentials.
  voice_stt_model: enumOf<VoiceSttModelId>(VOICE_STT_MODEL_OPTIONS, DEFAULT_VOICE_STT_MODEL, {
    trim: true,
  }),
  steam_web_api_key: boundedString(STEAM_WEB_API_KEY_MAX_LEN),
  // Developer-tab switch: a streaming answer's newest text scrambles before settling. Off by
  // default (plan 69).
  stream_scramble_enabled: boolDefaultFalse,
  stream_scramble_style: enumOf<StreamScrambleStyle>(
    STREAM_SCRAMBLE_STYLE_OPTIONS,
    DEFAULT_STREAM_SCRAMBLE_STYLE,
    { trim: true },
  ),
  stream_scramble_color: enumOf<StreamScrambleColor>(
    STREAM_SCRAMBLE_COLOR_OPTIONS,
    DEFAULT_STREAM_SCRAMBLE_COLOR,
    { trim: true },
  ),
  stream_scramble_settle_ms: clampedWholeNumber(
    DEFAULT_STREAM_SCRAMBLE_SETTLE_MS,
    STREAM_SCRAMBLE_SETTLE_MS_MIN,
    STREAM_SCRAMBLE_SETTLE_MS_MAX,
  ),
} as const satisfies { [K in keyof BonsaiSettings]?: (value: unknown) => BonsaiSettings[K] };

type SimpleFieldKey = keyof typeof SIMPLE_FIELDS;

export function normalizeSettings(data: unknown): BonsaiSettings {
  const raw = typeof data === "object" && data !== null ? (data as Partial<BonsaiSettings>) : {};
  const rawRecord =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined;

  const simple = {} as { [K in SimpleFieldKey]: BonsaiSettings[K] };
  for (const key of Object.keys(SIMPLE_FIELDS) as SimpleFieldKey[]) {
    const coerce = SIMPLE_FIELDS[key] as (value: unknown) => BonsaiSettings[SimpleFieldKey];
    simple[key] = coerce(raw[key]) as never;
  }

  // Everything below needs something a table row cannot express: another field's value, a
  // legacy key, a nested structure, or a pairwise reconciliation.
  const latencyTimeout = reconcileLatencyWarningAndTimeout(
    raw.latency_warning_seconds ?? DEFAULT_LATENCY_WARNING_SECONDS,
    raw.request_timeout_seconds ?? DEFAULT_REQUEST_TIMEOUT_SECONDS,
  );
  const modelPolicy = reconcileModelPolicySettings(raw.model_policy_tier, raw.model_policy_non_foss_unlocked);
  const presetChipAnimation = normalizePresetChipAnimation(
    raw.preset_chip_animation,
    raw.preset_chip_fade_animation_enabled,
  );

  return {
    ...simple,
    // Clamped as a pair — the warning must land below the timeout.
    latency_warning_seconds: latencyTimeout.latency_warning_seconds,
    request_timeout_seconds: latencyTimeout.request_timeout_seconds,
    // Reconciled as a pair — tier 3 requires the non-FOSS acknowledgment.
    model_policy_tier: modelPolicy.model_policy_tier,
    model_policy_non_foss_unlocked: modelPolicy.model_policy_non_foss_unlocked,
    // Read a legacy key as well as their own.
    screenshot_attachment_preset: normalizeScreenshotAttachmentPreset(rawRecord),
    ask_mode: normalizeAskMode(raw.ask_mode),
    show_developer_tab: normalizeShowDeveloperTab(raw.show_developer_tab, rawRecord?.show_debug_tab),
    preset_chip_animation: presetChipAnimation,
    // Deprecated, and derived from the live field rather than read independently — Python
    // matches this since D13, because reading it on its own can contradict the animation.
    preset_chip_fade_animation_enabled: presetChipAnimation === "fade",
    // Structured or list-valued.
    capabilities: normalizeCapabilities(raw.capabilities),
    named_ollama_hosts: normalizeNamedOllamaHosts(raw.named_ollama_hosts),
    dev_frozen_test_chips: normalizeFrozenTestChips(raw.dev_frozen_test_chips),
    text_model_routing_order: normalizeModelRoutingOrder(raw.text_model_routing_order),
    vision_model_routing_order: normalizeModelRoutingOrder(raw.vision_model_routing_order),
    // Path validation beyond a length cap (traversal rejection).
    rag_corpus_path: normalizeRagCorpusPath(raw.rag_corpus_path),
  };
}
