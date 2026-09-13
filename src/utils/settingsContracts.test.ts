import { describe, expect, it } from "vitest";
import { REPLY_LANGUAGE_FOLLOW_SYSTEM } from "../data/replyLanguage";
import {
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  DEFAULT_ASK_MODE,
  DEFAULT_CAPABILITIES,
  DEFAULT_OLLAMA_KEEP_ALIVE,
  DEFAULT_REPLY_VERBOSITY,
  DEFAULT_SCREENSHOT_ATTACHMENT_PRESET,
  DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED,
  type DesktopAppLogLevel,
  type AskThinkEffortId,
  type TabResumeMode,
} from "../data/bonsaiSettingsSchema";
import {
  normalizeLatencyWarningSeconds,
  normalizeRequestTimeoutSeconds,
  normalizeSettings,
  reconcileLatencyWarningAndTimeout,
} from "../data/bonsaiSettingsNormalizers";
import { toBonsaiSettingsPayload } from "./settingsPayload";
import { buildResponseText, formatAppliedTuningBannerText } from "./appliedTuningText";

/** Regression tests for normalization bounds and response formatting behavior. */
describe("settings contracts", () => {
  it("normalizeSettings: ui scale defaults and manual profile", () => {
    const defaults = normalizeSettings({});
    expect(defaults.ui_scale_auto_enabled).toBe(true);
    expect(defaults.ui_scale_manual_profile).toBe("handheld");
    const manual = normalizeSettings({
      ui_scale_auto_enabled: false,
      ui_scale_manual_profile: "couch",
    });
    expect(manual.ui_scale_auto_enabled).toBe(false);
    expect(manual.ui_scale_manual_profile).toBe("couch");
  });

  it("normalizes latency warning to configured bounds and step", () => {
    expect(normalizeLatencyWarningSeconds(2)).toBe(5);
    expect(normalizeLatencyWarningSeconds(299)).toBe(300);
  });

  it("normalizes timeout to configured bounds and step", () => {
    expect(normalizeRequestTimeoutSeconds(9)).toBe(10);
    expect(normalizeRequestTimeoutSeconds(611)).toBe(600);
    expect(normalizeRequestTimeoutSeconds(121)).toBe(120);
  });

  it("reconcileLatencyWarningAndTimeout raises timeout when warning is too high", () => {
    const pair = reconcileLatencyWarningAndTimeout(200, 60);
    expect(pair.latency_warning_seconds).toBe(200);
    expect(pair.request_timeout_seconds).toBeGreaterThan(200);
    expect(pair.latency_warning_seconds).toBeLessThan(pair.request_timeout_seconds);
  });

  it("reconcileLatencyWarningAndTimeout lowers warning when timeout is already maxed", () => {
    const pair = reconcileLatencyWarningAndTimeout(300, 600);
    expect(pair.request_timeout_seconds).toBe(600);
    expect(pair.latency_warning_seconds).toBeLessThan(600);
    expect(pair.latency_warning_seconds).toBeLessThan(pair.request_timeout_seconds);
  });

  it("normalizes full settings payload with defaults", () => {
    const settings = normalizeSettings({
      latency_warning_seconds: "21",
      request_timeout_seconds: "149",
      unified_input_persistence_mode: "invalid",
      screenshot_max_dimension: 9999,
    });
    expect(settings.latency_warning_seconds).toBe(20);
    expect(settings.request_timeout_seconds).toBe(150);
    expect(settings.unified_input_persistence_mode).toBe("no_persist");
    expect(settings.screenshot_attachment_preset).toBe(DEFAULT_SCREENSHOT_ATTACHMENT_PRESET);
    expect(settings.latency_timeouts_custom_enabled).toBe(false);
    expect(settings.desktop_debug_note_auto_save).toBe(false);
    expect(settings.desktop_ask_verbose_logging).toBe(false);
    expect(settings.desktop_app_log_level).toBe("off");
    expect(settings.capabilities.filesystem_write).toBe(false);
    expect(settings.capabilities.steam_web_api).toBe(false);
    expect(settings.capabilities.microphone_access).toBe(false);
    expect(settings.voice_stt_model).toBe("tiny.en");
    expect(settings.steam_web_api_key).toBe("");
    expect(settings.ai_character_enabled).toBe(false);
    expect(settings.ai_character_random).toBe(true);
    expect(settings.ai_character_preset_id).toBe("");
    expect(settings.ai_character_custom_text).toBe("");
    expect(settings.ai_character_accent_intensity).toBe(DEFAULT_AI_CHARACTER_ACCENT_INTENSITY);
    expect(settings.preset_chip_fade_animation_enabled).toBe(true);
    expect(settings.input_sanitizer_user_disabled).toBe(false);
    expect(settings.ask_mode).toBe(DEFAULT_ASK_MODE);
    expect(settings.ollama_keep_alive).toBe(DEFAULT_OLLAMA_KEEP_ALIVE);
    expect(settings.show_developer_tab).toBe(false);
    expect(settings.model_policy_tier).toBe("open_source_only");
    expect(settings.model_policy_non_foss_unlocked).toBe(false);
    expect(settings.model_allow_high_vram_fallbacks).toBe(false);
    expect(settings.ollama_local_on_deck).toBe(false);
  });

  it("normalizes model_allow_high_vram_fallbacks: only explicit true enables", () => {
    expect(normalizeSettings({ model_allow_high_vram_fallbacks: true }).model_allow_high_vram_fallbacks).toBe(
      true
    );
    expect(normalizeSettings({ model_allow_high_vram_fallbacks: false }).model_allow_high_vram_fallbacks).toBe(
      false
    );
  });

  it("normalizes ollama_local_on_deck: missing key defaults off; explicit true enables", () => {
    expect(normalizeSettings({ ollama_local_on_deck: true }).ollama_local_on_deck).toBe(true);
    expect(normalizeSettings({ ollama_local_on_deck: false }).ollama_local_on_deck).toBe(false);
    expect(normalizeSettings({}).ollama_local_on_deck).toBe(false);
    expect(normalizeSettings({ ollama_local_on_deck: "yes" as unknown as boolean }).ollama_local_on_deck).toBe(false);
  });

  it("downgrades non_foss tier without unlock to open_weight", () => {
    const settings = normalizeSettings({
      model_policy_tier: "non_foss",
      model_policy_non_foss_unlocked: false,
    });
    expect(settings.model_policy_tier).toBe("open_weight");
    expect(settings.model_policy_non_foss_unlocked).toBe(false);
  });

  it("normalizes ollama_keep_alive to allowed duration tokens", () => {
    expect(normalizeSettings({ ollama_keep_alive: "30s" }).ollama_keep_alive).toBe("30s");
    expect(normalizeSettings({ ollama_keep_alive: "bogus" }).ollama_keep_alive).toBe(DEFAULT_OLLAMA_KEEP_ALIVE);
  });

  it("normalizes reply_verbosity to caveman, balanced, or detailed", () => {
    expect(normalizeSettings({ reply_verbosity: "caveman" }).reply_verbosity).toBe("caveman");
    expect(normalizeSettings({ reply_verbosity: "short" }).reply_verbosity).toBe("caveman");
    expect(normalizeSettings({ reply_verbosity: "detailed" }).reply_verbosity).toBe("detailed");
    expect(normalizeSettings({ reply_verbosity: "bogus" }).reply_verbosity).toBe(DEFAULT_REPLY_VERBOSITY);
    expect(normalizeSettings({}).reply_verbosity).toBe(DEFAULT_REPLY_VERBOSITY);
  });

  it("normalizes reply_language to follow_system, en, or steam codes", () => {
    expect(normalizeSettings({ reply_language: "follow_system" }).reply_language).toBe("follow_system");
    expect(normalizeSettings({ reply_language: "en" }).reply_language).toBe("en");
    expect(normalizeSettings({ reply_language: "japanese" }).reply_language).toBe("japanese");
    expect(normalizeSettings({ reply_language: "bogus" }).reply_language).toBe("follow_system");
    expect(normalizeSettings({}).reply_language).toBe("follow_system");
  });

  it("normalizes ask_mode to allowed ids", () => {
    expect(normalizeSettings({ ask_mode: "expert" }).ask_mode).toBe("expert");
    expect(normalizeSettings({ ask_mode: "deep" }).ask_mode).toBe("expert");
    expect(normalizeSettings({ ask_mode: "bogus" as unknown as string }).ask_mode).toBe(DEFAULT_ASK_MODE);
  });

  it("normalizes ask think effort, defaulting off so thinking stays opt-in", () => {
    expect(normalizeSettings({ ask_think_effort: "low" }).ask_think_effort).toBe("low");
    expect(normalizeSettings({ ask_think_effort: "medium" }).ask_think_effort).toBe("medium");
    expect(normalizeSettings({ ask_think_effort: "high" }).ask_think_effort).toBe("high");
    expect(normalizeSettings({}).ask_think_effort).toBe("off");
    // An unrecognised value must never resolve to an on state.
    expect(
      normalizeSettings({ ask_think_effort: "maximum" as unknown as AskThinkEffortId })
        .ask_think_effort,
    ).toBe("off");
  });

  it("normalizes desktop app log level", () => {
    expect(normalizeSettings({ desktop_app_log_level: "default" }).desktop_app_log_level).toBe("default");
    expect(normalizeSettings({ desktop_app_log_level: "verbose" }).desktop_app_log_level).toBe("verbose");
    expect(normalizeSettings({ desktop_app_log_level: "off" }).desktop_app_log_level).toBe("off");
    expect(normalizeSettings({}).desktop_app_log_level).toBe("off");
    expect(normalizeSettings({ desktop_app_log_level: "bogus" as unknown as DesktopAppLogLevel }).desktop_app_log_level).toBe("off");
  });

  it("normalizes tab resume mode, defaulting to the locked D15 option B", () => {
    expect(normalizeSettings({ tab_resume_mode: "always_main" }).tab_resume_mode).toBe("always_main");
    expect(normalizeSettings({ tab_resume_mode: "resume_recent" }).tab_resume_mode).toBe("resume_recent");
    expect(normalizeSettings({ tab_resume_mode: " resume " }).tab_resume_mode).toBe("resume");
    // Unlike every other Developer toggle, an unreadable value must not land on an off-like
    // state: the shipped behavior is to resume, and this control only picks between options.
    expect(normalizeSettings({}).tab_resume_mode).toBe("resume");
    expect(
      normalizeSettings({ tab_resume_mode: "off" as unknown as TabResumeMode }).tab_resume_mode
    ).toBe("resume");
  });

  it("normalizes desktop ask verbose logging: only explicit true enables", () => {
    expect(normalizeSettings({ desktop_ask_verbose_logging: true }).desktop_ask_verbose_logging).toBe(true);
    expect(normalizeSettings({ desktop_ask_verbose_logging: false }).desktop_ask_verbose_logging).toBe(false);
    expect(normalizeSettings({}).desktop_ask_verbose_logging).toBe(false);
    expect(
      normalizeSettings({ desktop_ask_verbose_logging: "yes" as unknown as boolean }).desktop_ask_verbose_logging
    ).toBe(false);
  });

  it("normalizes input sanitizer disabled: only explicit true disables", () => {
    expect(normalizeSettings({ input_sanitizer_user_disabled: true }).input_sanitizer_user_disabled).toBe(true);
    expect(normalizeSettings({ input_sanitizer_user_disabled: false }).input_sanitizer_user_disabled).toBe(false);
    expect(normalizeSettings({}).input_sanitizer_user_disabled).toBe(false);
    expect(normalizeSettings({ input_sanitizer_user_disabled: "yes" as unknown as boolean }).input_sanitizer_user_disabled).toBe(
      false
    );
  });

  it("normalizes accent intensity to allowed ids", () => {
    expect(normalizeSettings({ ai_character_accent_intensity: "heavy" }).ai_character_accent_intensity).toBe("heavy");
    expect(normalizeSettings({ ai_character_accent_intensity: "bogus" }).ai_character_accent_intensity).toBe(
      DEFAULT_AI_CHARACTER_ACCENT_INTENSITY
    );
  });

  it("normalizes show_developer_tab: only explicit true enables; migrates show_debug_tab", () => {
    expect(normalizeSettings({ show_developer_tab: true }).show_developer_tab).toBe(true);
    expect(normalizeSettings({ show_developer_tab: false }).show_developer_tab).toBe(false);
    expect(normalizeSettings({ show_debug_tab: true }).show_developer_tab).toBe(true);
    expect(normalizeSettings({}).show_developer_tab).toBe(false);
  });

  it("normalizes preset chip fade: only explicit false disables", () => {
    expect(normalizeSettings({ preset_chip_fade_animation_enabled: false }).preset_chip_fade_animation_enabled).toBe(
      false
    );
    expect(normalizeSettings({ preset_chip_fade_animation_enabled: true }).preset_chip_fade_animation_enabled).toBe(
      true
    );
    expect(normalizeSettings({}).preset_chip_fade_animation_enabled).toBe(true);
  });

  it("normalizes capability flags to explicit booleans", () => {
    const settings = normalizeSettings({
      capabilities: {
        filesystem_write: true,
        media_library_access: 1 as unknown as boolean,
      },
    });
    expect(settings.capabilities.filesystem_write).toBe(true);
    expect(settings.capabilities.media_library_access).toBe(false);
    expect(settings.capabilities.steam_logs_read).toBe(false);
  });

  it("normalizeSettings applies ordering when raw values conflict", () => {
    const settings = normalizeSettings({
      latency_warning_seconds: 180,
      request_timeout_seconds: 90,
    });
    expect(settings.latency_warning_seconds).toBeLessThan(settings.request_timeout_seconds);
    expect(settings.request_timeout_seconds).toBeGreaterThanOrEqual(190);
  });

  it("toBonsaiSettingsPayload maps snapshot input to RPC keys", () => {
    const p = toBonsaiSettingsPayload({
      latencyWarningSeconds: 20,
      requestTimeoutSeconds: 150,
      latencyTimeoutsCustomEnabled: true,
      unifiedInputPersistenceMode: "no_persist",
      voiceReplyMode: "off",
      screenshotAttachmentPreset: "mid",
      desktopDebugNoteAutoSave: true,
      desktopAskVerboseLogging: false,
      desktopAppLogLevel: "off",
      presetChipFadeAnimationEnabled: true,
      presetChipAnimation: "fade",
      presetSingleChip: false,
      inputSanitizerUserDisabled: false,
      capabilities: DEFAULT_CAPABILITIES,
      aiCharacterEnabled: true,
      aiCharacterRandom: false,
      aiCharacterPresetId: "preset-a",
      aiCharacterCustomText: "hi",
      aiCharacterAccentIntensity: "balanced",
      askMode: "expert",
      ollamaKeepAlive: "30s",
      replyVerbosity: "detailed",
      askThinkEffort: "high",
      replyLanguage: "japanese",
      showDeveloperTab: true,
      modelPolicyTier: "open_weight",
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: true,
      ollamaLocalOnDeck: true,
      strategySpoilerMaskingEnabled: false,
      strategySpoilerAutoRevealAfterConsent: false,
      steamWebApiKey: "abc",
      showOnscreenDebugHud: false, devForceSessionRagChips: false, devPreloadAskModel: false, devFrozenTestChips: [],
      tabResumeMode: "resume",
      namedOllamaHosts: [],
      voiceSttModel: "tiny.en",
      uiScaleAutoEnabled: true,
      uiScaleManualProfile: "handheld",
      useLocalKnowledgeBase: false,
      ragHybridRetrievalEnabled: true,
      ragCorpusPath: "",
      ragCorpusVersion: "",
      textModelRoutingOrder: [],
      visionModelRoutingOrder: [],
    });
    expect(p.latency_warning_seconds).toBe(20);
    expect(p.request_timeout_seconds).toBe(150);
    expect(p.unified_input_persistence_mode).toBe("no_persist");
    expect(p.screenshot_attachment_preset).toBe("mid");
    expect(p.ai_character_preset_id).toBe("preset-a");
    expect(p.ask_mode).toBe("expert");
    expect(p.ollama_keep_alive).toBe("30s");
    expect(p.reply_verbosity).toBe("detailed");
    expect(p.reply_language).toBe("japanese");
    expect(p.model_allow_high_vram_fallbacks).toBe(true);
    expect(p.ollama_local_on_deck).toBe(true);
    expect(p.strategy_spoiler_masking_enabled).toBe(false);
    expect(p.strategy_spoiler_auto_reveal_after_consent).toBe(false);
    expect(p.steam_web_api_key).toBe("abc");
    expect(p.show_developer_tab).toBe(true);
  });

  it("toBonsaiSettingsPayload merges patch over base (character picker path)", () => {
    const base = {
      latencyWarningSeconds: 30,
      requestTimeoutSeconds: 45,
      latencyTimeoutsCustomEnabled: false,
      unifiedInputPersistenceMode: "persist_all" as const,
      voiceReplyMode: "off" as const,
      screenshotAttachmentPreset: DEFAULT_SCREENSHOT_ATTACHMENT_PRESET,
      desktopDebugNoteAutoSave: false,
      desktopAskVerboseLogging: false,
      desktopAppLogLevel: "off" as const,
      presetChipFadeAnimationEnabled: true,
      presetChipAnimation: "fade" as const,
      presetSingleChip: false,
      inputSanitizerUserDisabled: false,
      capabilities: DEFAULT_CAPABILITIES,
      aiCharacterEnabled: true,
      aiCharacterRandom: true,
      aiCharacterPresetId: "old",
      aiCharacterCustomText: "oldtext",
      aiCharacterAccentIntensity: DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
      askMode: DEFAULT_ASK_MODE,
      ollamaKeepAlive: DEFAULT_OLLAMA_KEEP_ALIVE,
      replyVerbosity: DEFAULT_REPLY_VERBOSITY,
      askThinkEffort: "off" as const,
      replyLanguage: REPLY_LANGUAGE_FOLLOW_SYSTEM,
      showDeveloperTab: false,
      modelPolicyTier: "open_source_only" as const,
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: false,
      ollamaLocalOnDeck: false,
      strategySpoilerMaskingEnabled: DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED,
      strategySpoilerAutoRevealAfterConsent: false,
      steamWebApiKey: "",
      showOnscreenDebugHud: false, devForceSessionRagChips: false, devPreloadAskModel: false, devFrozenTestChips: [],
      tabResumeMode: "resume" as const,
      namedOllamaHosts: [],
      voiceSttModel: "tiny.en" as const,
      uiScaleAutoEnabled: true,
      uiScaleManualProfile: "handheld" as const,
      useLocalKnowledgeBase: false,
      ragHybridRetrievalEnabled: true,
      ragCorpusPath: "",
      ragCorpusVersion: "",
      textModelRoutingOrder: [],
      visionModelRoutingOrder: [],
    };
    const p = toBonsaiSettingsPayload(base, {
      ai_character_random: false,
      ai_character_preset_id: "new-id",
      ai_character_custom_text: "newtext",
    });
    expect(p.ai_character_random).toBe(false);
    expect(p.ai_character_preset_id).toBe("new-id");
    expect(p.ai_character_custom_text).toBe("newtext");
    expect(p.latency_warning_seconds).toBe(30);
  });

  it("builds applied summary text", () => {
    const output = buildResponseText("Done.", {
      tdp_watts: 8,
      gpu_clock_mhz: 900,
      errors: ["GPU write skipped"],
    });
    expect(output).toContain("[Applied: TDP: 8W, GPU: 900 MHz]");
    expect(output).toContain("[Errors: GPU write skipped]");
  });

  it("appends QAM verification note when hardware applied without errors", () => {
    const output = buildResponseText("Tuned.", {
      tdp_watts: 11,
      gpu_clock_mhz: null,
      errors: [],
    });
    expect(output).toContain("[Applied: TDP: 11W]");
    expect(output).toContain("QAM Performance");
    expect(output).not.toContain("[Errors:");
  });

  it("formatAppliedTuningBannerText: TDP only includes watts and QAM verify line", () => {
    const t = formatAppliedTuningBannerText({
      tdp_watts: 11,
      gpu_clock_mhz: null,
      errors: [],
    });
    expect(t).toContain("TDP 11W was applied");
    expect(t).toContain("QAM Performance");
    expect(t).not.toContain("GPU");
  });

  it("formatAppliedTuningBannerText: TDP and GPU — advisory line for GPU only", () => {
    const t = formatAppliedTuningBannerText({
      tdp_watts: 9,
      gpu_clock_mhz: 1000,
      errors: [],
    });
    expect(t).toContain("TDP 9W was applied");
    expect(t).toContain("GPU 1000 MHz");
    expect(t).toContain("does not write GPU clock");
  });

  it("formatAppliedTuningBannerText: GPU only, no TDP (model output)", () => {
    const t = formatAppliedTuningBannerText({
      tdp_watts: null,
      gpu_clock_mhz: 800,
      errors: [],
    });
    expect(t).toContain("GPU 800 MHz");
    expect(t).toContain("does not write GPU clock");
    expect(t).not.toMatch(/TDP \d+W was applied/);
  });

  it("formatAppliedTuningBannerText: TDP failed, GPU present — no false success for TDP", () => {
    const t = formatAppliedTuningBannerText({
      tdp_watts: null,
      gpu_clock_mhz: 900,
      errors: ["Failed to write TDP to /sys/…"],
    });
    expect(t).toContain("TDP was not applied");
    expect(t).toContain("Failed to write TDP");
    expect(t).toContain("GPU 900 MHz");
  });

  it("formatAppliedTuningBannerText: null", () => {
    expect(formatAppliedTuningBannerText(null)).toBeNull();
    expect(
      formatAppliedTuningBannerText({ tdp_watts: null, gpu_clock_mhz: null, errors: ["x"] })
    ).toBeNull();
  });

  it("golden round-trip: normalizeSettings → toBonsaiSettingsPayload preserves RPC keys", () => {
    const raw = {
      latency_warning_seconds: 25,
      request_timeout_seconds: 120,
      unified_input_persistence_mode: "persist_all",
      screenshot_attachment_preset: "max",
      ai_character_enabled: true,
      ai_character_preset_id: "tf2_scout",
      ask_mode: "strategy",
      ollama_keep_alive: "5m",
      model_policy_tier: "open_weight",
      ollama_local_on_deck: true,
      show_developer_tab: true,
    };
    const normalized = normalizeSettings(raw);
    const payload = toBonsaiSettingsPayload({
      latencyWarningSeconds: normalized.latency_warning_seconds,
      requestTimeoutSeconds: normalized.request_timeout_seconds,
      latencyTimeoutsCustomEnabled: normalized.latency_timeouts_custom_enabled,
      unifiedInputPersistenceMode: normalized.unified_input_persistence_mode,
      voiceReplyMode: normalized.voice_reply_mode,
      screenshotAttachmentPreset: normalized.screenshot_attachment_preset,
      desktopDebugNoteAutoSave: normalized.desktop_debug_note_auto_save,
      desktopAskVerboseLogging: normalized.desktop_ask_verbose_logging,
      desktopAppLogLevel: normalized.desktop_app_log_level,
      presetChipFadeAnimationEnabled: normalized.preset_chip_fade_animation_enabled,
      presetChipAnimation: normalized.preset_chip_animation,
      presetSingleChip: normalized.preset_single_chip,
      inputSanitizerUserDisabled: normalized.input_sanitizer_user_disabled,
      capabilities: normalized.capabilities,
      aiCharacterEnabled: normalized.ai_character_enabled,
      aiCharacterRandom: normalized.ai_character_random,
      aiCharacterPresetId: normalized.ai_character_preset_id,
      aiCharacterCustomText: normalized.ai_character_custom_text,
      aiCharacterAccentIntensity: normalized.ai_character_accent_intensity,
      askMode: normalized.ask_mode,
      ollamaKeepAlive: normalized.ollama_keep_alive,
      replyVerbosity: normalized.reply_verbosity,
      askThinkEffort: normalized.ask_think_effort,
      replyLanguage: normalized.reply_language,
      showDeveloperTab: normalized.show_developer_tab,
      modelPolicyTier: normalized.model_policy_tier,
      modelPolicyNonFossUnlocked: normalized.model_policy_non_foss_unlocked,
      modelAllowHighVramFallbacks: normalized.model_allow_high_vram_fallbacks,
      ollamaLocalOnDeck: normalized.ollama_local_on_deck,
      strategySpoilerMaskingEnabled: normalized.strategy_spoiler_masking_enabled,
      strategySpoilerAutoRevealAfterConsent: normalized.strategy_spoiler_auto_reveal_after_consent,
      steamWebApiKey: normalized.steam_web_api_key,
      showOnscreenDebugHud: normalized.show_onscreen_debug_hud,
      devForceSessionRagChips: normalized.dev_force_session_rag_chips,
      devPreloadAskModel: normalized.dev_preload_ask_model,
      devFrozenTestChips: normalized.dev_frozen_test_chips,
      tabResumeMode: normalized.tab_resume_mode,
      namedOllamaHosts: normalized.named_ollama_hosts,
      voiceSttModel: normalized.voice_stt_model,
      uiScaleAutoEnabled: normalized.ui_scale_auto_enabled,
      uiScaleManualProfile: normalized.ui_scale_manual_profile,
      useLocalKnowledgeBase: normalized.use_local_knowledge_base,
      ragHybridRetrievalEnabled: normalized.rag_hybrid_retrieval_enabled,
      ragCorpusPath: normalized.rag_corpus_path,
      ragCorpusVersion: normalized.rag_corpus_version,
      textModelRoutingOrder: normalized.text_model_routing_order ?? [],
      visionModelRoutingOrder: normalized.vision_model_routing_order ?? [],
    });
    expect(payload.ask_mode).toBe("strategy");
    expect(payload.ai_character_preset_id).toBe("tf2_scout");
    expect(payload.ollama_local_on_deck).toBe(true);
    expect(payload.screenshot_attachment_preset).toBe("max");
    expect(payload.latency_warning_seconds).toBeLessThan(payload.request_timeout_seconds);
  });
});
