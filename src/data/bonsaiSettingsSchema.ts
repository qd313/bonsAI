/**
 * Title: Bonsai settings schema
 * Purpose: TypeScript types and default constants for persisted plugin settings shape.
 * Used for: usePluginSettings, RPC get/set settings, and bonsaiSettingsNormalizers coercion.
 * Solves: Single schema for capabilities, Ollama options, UI preferences, and character fields.
 * Does not: Validate at runtime alone — normalizers coerce unknown RPC payloads into this shape.
 */
import {
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  type AiCharacterAccentIntensityId,
} from "./aiCharacterAccentIntensity";
import type { AskModeId } from "./askMode";
import { DEFAULT_OLLAMA_KEEP_ALIVE, type OllamaKeepAliveDuration } from "./ollamaKeepAlive";
import { DEFAULT_REPLY_VERBOSITY, type ReplyVerbosityId } from "./replyVerbosity";
import {
  ASK_THINK_EFFORT_IDS,
  DEFAULT_ASK_THINK_EFFORT,
  type AskThinkEffortId,
} from "./askThinkEffort";
import { type ReplyLanguageId } from "./replyLanguage";

export { DEFAULT_REPLY_LANGUAGE, type ReplyLanguageId } from "./replyLanguage";
import {
  DEFAULT_MODEL_POLICY_TIER,
  type ModelPolicyTierId,
} from "./modelPolicy";
import { type UiScaleProfileId } from "./uiScaleProfile";

export type { UiScaleProfileId };
export type { AskModeId };
export type { OllamaKeepAliveDuration };
export type { ReplyVerbosityId };
export type { AskThinkEffortId };
export type { ModelPolicyTierId };
export { DEFAULT_OLLAMA_KEEP_ALIVE };
export { DEFAULT_REPLY_VERBOSITY };
export { ASK_THINK_EFFORT_IDS, DEFAULT_ASK_THINK_EFFORT };
export { DEFAULT_MODEL_POLICY_TIER };

export type UnifiedInputPersistenceMode = "persist_all" | "persist_search_only" | "no_persist";
/**
 * Whether a finished answer is read aloud without a press (D99 call 3): never, only when the
 * question that produced it came in through the mic, or every time. Off is the shipped default.
 */
export type VoiceReplyMode = "off" | "voice_only" | "always";
export type DesktopAppLogLevel = "off" | "default" | "verbose";
/**
 * Which tab a reopen lands on. One stop per option in roadmap **D15**, so the three can be
 * compared on-device without another code change:
 * `always_main` = A, `resume` = B (locked default), `resume_recent` = C.
 */
export type TabResumeMode = "always_main" | "resume" | "resume_recent";
export type PresetChipAnimation = "fade" | "carousel" | "static" | "decode";
/** Legacy; migration maps to ScreenshotAttachmentPreset. */
export type ScreenshotMaxDimension = 1280 | 1920 | 3160;
export type ScreenshotAttachmentPreset = "low" | "mid" | "max";

/** High-impact capability toggles; keep keys aligned with backend `capabilities` and Permission Center UI. */
export type BonsaiCapabilities = {
  filesystem_write: boolean;
  media_library_access: boolean;
  steam_logs_read: boolean;
  /** Outbound Steam Web API (GetPlayerBans) for ``bonsai:vac-check``; key stored in settings. */
  steam_web_api: boolean;
  /** Local microphone capture for speech-to-text in the Ask bar. */
  microphone_access: boolean;
};

export type VoiceSttModelId = "tiny.en" | "base.en";

export type NamedOllamaHost = {
  label: string;
  host: string;
};

export type BonsaiSettings = {
  latency_warning_seconds: number;
  request_timeout_seconds: number;
  /** When true, stored warning/timeout apply; when false, defaults (60s / 180s) for Ask + Ollama. */
  latency_timeouts_custom_enabled: boolean;
  unified_input_persistence_mode: UnifiedInputPersistenceMode;
  /** When a finished answer is read aloud on its own, without a Read aloud press (D99 call 3). */
  voice_reply_mode: VoiceReplyMode;
  /** Vision attachment downscale and JPEG quality preset. */
  screenshot_attachment_preset: ScreenshotAttachmentPreset;
  /** When true, append Ask and AI response lines to daily chat files under Desktop/bonsAI_logs (requires filesystem_write). */
  desktop_debug_note_auto_save: boolean;
  /** When true, append full Ask/Ollama transparency blocks to Desktop trace files (requires filesystem_write). */
  desktop_ask_verbose_logging: boolean;
  /** App activity log level written to Desktop/bonsAI_logs/bonsai-app-YYYY-MM-DD.log (requires filesystem_write). */
  desktop_app_log_level: DesktopAppLogLevel;
  /** @deprecated Prefer `preset_chip_animation`; kept for migration from older settings.json. */
  preset_chip_fade_animation_enabled: boolean;
  /** Main-tab preset chips: crossfade cycle, vertical carousel, or static rotation without opacity animation. */
  preset_chip_animation: PresetChipAnimation;
  /**
   * When true, the suggestion row shows one chip with the whole 300px column instead of two side
   * by side. Off (two chips) is the shipped default (D43, 2026-09-01).
   */
  preset_single_chip: boolean;
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
  /** Global reply prose style (Short / Balanced / Detailed); Balanced = no verbosity inject. */
  reply_verbosity: ReplyVerbosityId;
  /** Hidden model reasoning before the reply; `off` sends `think: false`. Off by default. */
  ask_think_effort: AskThinkEffortId;
  /** Ask reply language: follow Steam client, always English, or a fixed Steam language code. */
  reply_language: ReplyLanguageId;
  /** When true, show the Developer tab in the LB/RB strip (default off for typical users). */
  show_developer_tab: boolean;
  /** Which Ollama model families the backend may try (see README model policy). */
  model_policy_tier: ModelPolicyTierId;
  /** Tier 3 requires explicit acknowledgment for non-FOSS and unclassified tags. */
  model_policy_non_foss_unlocked: boolean;
  /** When true, append large-model tags to fallback chains (may exceed ~16GB VRAM). */
  model_allow_high_vram_fallbacks: boolean;
  /** User-ordered text model try order (empty = shipped defaults intersect installed). */
  text_model_routing_order: string[];
  /** User-ordered vision model try order (empty = shipped defaults intersect installed). */
  vision_model_routing_order: string[];
  /** When true, route Ollama to this device only (fixed 127.0.0.1:11434); LAN PC IP field ignored for Ask/Test. */
  ollama_local_on_deck: boolean;
  /**
   * When true, a per-user Deck startup entry starts local Ollama at boot with the loaded-model
   * limit raised to two. Off by default -- it changes how the Deck starts, so it only happens
   * when the person turns it on. See `apply_ollama_local_autostart` (main.py).
   */
  ollama_local_autostart: boolean;
  /** When false, Strategy ```bonsai-spoiler``` blocks render as visible text (no tap-to-reveal). Default on. */
  strategy_spoiler_masking_enabled: boolean;
  /** When true, spoiler blocks start expanded after the user consented on that Ask (still collapsible). */
  strategy_spoiler_auto_reveal_after_consent: boolean;
  /** Steam Web API key for GetPlayerBans (VAC check command); stored on device with plugin settings. */
  steam_web_api_key: string;
  /** When true, show the translucent on-screen ingest debug HUD (Developer tab opt-in). */
  show_onscreen_debug_hud: boolean;
  /**
   * QA only: force every eligible preset-carousel slot to a session RAG chip instead of rolling
   * `SESSION_RAG_CHIP_PROBABILITY`. Makes SESSION-RAG-CHIPS-01 deterministic; not a user feature.
   */
  dev_force_session_rag_chips: boolean;
  /**
   * Developer-tab switch: warm the default Ask model into memory at plugin boot so the first
   * question does not pay the cold-load cost. Off by default; the backend only ever warms a
   * model of 3B parameters or under and skips silently when memory is tight.
   */
  dev_preload_ask_model: boolean;
  /** Which tab a reopen lands on — the three D15 options behind one Developer-tab control. */
  tab_resume_mode: TabResumeMode;
  /** Labeled ``host:port`` presets for quick Connection switching (max 4). */
  named_ollama_hosts: NamedOllamaHost[];
  dev_frozen_test_chips: string[];
  /** Local whisper.cpp model for voice Ask (tiny.en default for Deck real-time). */
  voice_stt_model: VoiceSttModelId;
  /** When true, UI scale profile is chosen automatically from QAM viewport + display heuristics. */
  ui_scale_auto_enabled: boolean;
  /** Manual snap profile when ``ui_scale_auto_enabled`` is false. */
  ui_scale_manual_profile: UiScaleProfileId;
  /** When true, inject retrieved offline strategy/compat cards into Strategy/troubleshooting Asks. */
  use_local_knowledge_base: boolean;
  /**
   * When false, knowledge retrieval runs keyword-only — no query embedding, no vector fusion.
   * Defaults on; the off state is a diagnosis aid, not a way to disable the knowledge base.
   */
  rag_hybrid_retrieval_enabled: boolean;
  /** Absolute path to installed corpus directory (contains corpus.db). */
  rag_corpus_path: string;
  /** Installed corpus manifest version string. */
  rag_corpus_version: string;
};

/** Fields mirrored from React state / hook before `save_settings` RPC. */
export type BonsaiSettingsSnapshotInput = {
  latencyWarningSeconds: number;
  requestTimeoutSeconds: number;
  latencyTimeoutsCustomEnabled: boolean;
  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  voiceReplyMode: VoiceReplyMode;
  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  desktopDebugNoteAutoSave: boolean;
  desktopAskVerboseLogging: boolean;
  desktopAppLogLevel: DesktopAppLogLevel;
  presetChipFadeAnimationEnabled: boolean;
  presetChipAnimation: PresetChipAnimation;
  presetSingleChip: boolean;
  inputSanitizerUserDisabled: boolean;
  capabilities: BonsaiCapabilities;
  aiCharacterEnabled: boolean;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  askMode: AskModeId;
  ollamaKeepAlive: OllamaKeepAliveDuration;
  replyVerbosity: ReplyVerbosityId;
  askThinkEffort: AskThinkEffortId;
  replyLanguage: ReplyLanguageId;
  showDeveloperTab: boolean;
  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  modelAllowHighVramFallbacks: boolean;
  textModelRoutingOrder: string[];
  visionModelRoutingOrder: string[];
  ollamaLocalOnDeck: boolean;
  ollamaLocalAutostart: boolean;
  strategySpoilerMaskingEnabled: boolean;
  strategySpoilerAutoRevealAfterConsent: boolean;
  steamWebApiKey: string;
  showOnscreenDebugHud: boolean;
  devForceSessionRagChips: boolean;
  devPreloadAskModel: boolean;
  tabResumeMode: TabResumeMode;
  namedOllamaHosts: NamedOllamaHost[];
  devFrozenTestChips: string[];
  voiceSttModel: VoiceSttModelId;
  uiScaleAutoEnabled: boolean;
  uiScaleManualProfile: UiScaleProfileId;
  useLocalKnowledgeBase: boolean;
  ragHybridRetrievalEnabled: boolean;
  ragCorpusPath: string;
  ragCorpusVersion: string;
};

export type AppliedResultLike = {
  tdp_watts: number | null;
  gpu_clock_mhz: number | null;
  errors: string[];
};

export const DEFAULT_LATENCY_WARNING_SECONDS = 60;
export const DEFAULT_REQUEST_TIMEOUT_SECONDS = 180;
export const MIN_LATENCY_WARNING_SECONDS = 5;
export const MAX_LATENCY_WARNING_SECONDS = 300;
export const MIN_REQUEST_TIMEOUT_SECONDS = 10;
export const MAX_REQUEST_TIMEOUT_SECONDS = 600;
export const LATENCY_WARNING_STEP_SECONDS = 5;
export const REQUEST_TIMEOUT_STEP_SECONDS = 10;
export const DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE: UnifiedInputPersistenceMode = "no_persist";
export const DEFAULT_VOICE_REPLY_MODE: VoiceReplyMode = "off";
export const VOICE_REPLY_MODE_OPTIONS: VoiceReplyMode[] = ["off", "voice_only", "always"];
export const SCREENSHOT_ATTACHMENT_PRESET_OPTIONS: ScreenshotAttachmentPreset[] = ["low", "mid", "max"];
export const DEFAULT_SCREENSHOT_ATTACHMENT_PRESET: ScreenshotAttachmentPreset = "low";
export const DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE = false;
export const DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING = false;
export const DEFAULT_SHOW_ONSCREEN_DEBUG_HUD = false;
export const DEFAULT_DEV_FORCE_SESSION_RAG_CHIPS = false;
export const DEFAULT_DEV_PRELOAD_ASK_MODEL = false;
/** D15 option B, the locked decision — a fresh install resumes the tab you left. */
export const DEFAULT_TAB_RESUME_MODE: TabResumeMode = "resume";
export const TAB_RESUME_MODE_OPTIONS: TabResumeMode[] = ["always_main", "resume", "resume_recent"];
/**
 * D15 option C's "N minutes". Long enough to cover popping out of the QAM to check something
 * mid-task, short enough that tomorrow's first open is a fresh start on Main.
 */
export const TAB_RESUME_RECENT_WINDOW_MS = 5 * 60 * 1000;
export const MAX_NAMED_OLLAMA_HOSTS = 4;

/** Mirrors `MAX_FROZEN_TEST_CHIPS` / `FROZEN_TEST_CHIP_MAX_LEN` in `settings_service.py`. */
export const MAX_FROZEN_TEST_CHIPS = 12;
export const FROZEN_TEST_CHIP_MAX_LEN = 160;
export const DEFAULT_DESKTOP_APP_LOG_LEVEL: DesktopAppLogLevel = "off";
export const DESKTOP_APP_LOG_LEVEL_OPTIONS: DesktopAppLogLevel[] = ["off", "default", "verbose"];
export const DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED = true;
export const DEFAULT_PRESET_CHIP_ANIMATION: PresetChipAnimation = "fade";
/** D43 (2026-09-01): two chips is the shipped default; this setting overrides it to one. */
export const DEFAULT_PRESET_SINGLE_CHIP = false;
export const PRESET_CHIP_ANIMATION_OPTIONS: PresetChipAnimation[] = ["fade", "carousel", "static", "decode"];
export const DEFAULT_INPUT_SANITIZER_USER_DISABLED = false;
export const DEFAULT_SHOW_DEVELOPER_TAB = false;
/** Persisted routing: off = LAN PC IP text field applies; when on, Ask uses localhost Ollama on the Deck only. */
export const DEFAULT_OLLAMA_LOCAL_ON_DECK = false;
/** Off by default (2026-09-12): changes how the Deck starts, so only an explicit opt-in turns it on. */
export const DEFAULT_OLLAMA_LOCAL_AUTOSTART = false;
/** Fixed host:port for on-device Ollama (matches `refactor_helpers.DEFAULT_OLLAMA_*`). */
export const OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP = "127.0.0.1:11434";
export const DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS = false;
export const DEFAULT_ASK_MODE: AskModeId = "speed";
export const DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED = true;
export const DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT = false;
/** Align with backend ``STEAM_WEB_API_KEY_MAX_LEN``. */
export const STEAM_WEB_API_KEY_MAX_LEN = 128;

export const DEFAULT_CAPABILITIES: BonsaiCapabilities = {
  filesystem_write: false,
  media_library_access: false,
  steam_logs_read: false,
  steam_web_api: false,
  microphone_access: false,
};

export const DEFAULT_VOICE_STT_MODEL: VoiceSttModelId = "tiny.en";
export const VOICE_STT_MODEL_OPTIONS: VoiceSttModelId[] = ["tiny.en", "base.en"];
export const DEFAULT_UI_SCALE_AUTO_ENABLED = true;
export const DEFAULT_UI_SCALE_MANUAL_PROFILE: UiScaleProfileId = "handheld";
export const DEFAULT_USE_LOCAL_KNOWLEDGE_BASE = false;
export const DEFAULT_RAG_HYBRID_RETRIEVAL_ENABLED = true;
export const DEFAULT_RAG_CORPUS_PATH = "";
export const DEFAULT_RAG_CORPUS_VERSION = "";

export const DEFAULT_AI_CHARACTER_ENABLED = false;
export const DEFAULT_AI_CHARACTER_RANDOM = true;
export const DEFAULT_AI_CHARACTER_PRESET_ID = "";
export const DEFAULT_AI_CHARACTER_CUSTOM_TEXT = "";
export { DEFAULT_AI_CHARACTER_ACCENT_INTENSITY };
