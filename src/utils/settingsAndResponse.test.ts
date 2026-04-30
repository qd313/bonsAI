import { describe, expect, it } from "vitest";
import {
  buildResponseText,
  formatAppliedTuningBannerText,
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  DEFAULT_ASK_MODE,
  DEFAULT_CAPABILITIES,
  DEFAULT_OLLAMA_KEEP_ALIVE,
  DEFAULT_SCREENSHOT_ATTACHMENT_PRESET,
  normalizeLatencyWarningSeconds,
  normalizeRequestTimeoutSeconds,
  normalizeSettings,
  reconcileLatencyWarningAndTimeout,
  toBonsaiSettingsPayload,
} from "./settingsAndResponse";

/** Regression tests for normalization bounds and response formatting behavior. */
describe("settingsAndResponse", () => {
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
    expect(settings.attach_proton_logs_when_troubleshooting).toBe(false);
    expect(settings.capabilities.filesystem_write).toBe(false);
    expect(settings.capabilities.hardware_control).toBe(false);
    expect(settings.ai_character_enabled).toBe(false);
    expect(settings.ai_character_random).toBe(true);
    expect(settings.ai_character_preset_id).toBe("");
    expect(settings.ai_character_custom_text).toBe("");
    expect(settings.ai_character_accent_intensity).toBe(DEFAULT_AI_CHARACTER_ACCENT_INTENSITY);
    expect(settings.preset_chip_fade_animation_enabled).toBe(true);
    expect(settings.input_sanitizer_user_disabled).toBe(false);
    expect(settings.ask_mode).toBe(DEFAULT_ASK_MODE);
    expect(settings.ollama_keep_alive).toBe(DEFAULT_OLLAMA_KEEP_ALIVE);
    expect(settings.show_debug_tab).toBe(false);
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

  it("normalizes ask_mode to allowed ids", () => {
    expect(normalizeSettings({ ask_mode: "deep" }).ask_mode).toBe("deep");
    expect(normalizeSettings({ ask_mode: "bogus" as unknown as string }).ask_mode).toBe(DEFAULT_ASK_MODE);
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

  it("normalizes show_debug_tab: only explicit true enables", () => {
    expect(normalizeSettings({ show_debug_tab: true }).show_debug_tab).toBe(true);
    expect(normalizeSettings({ show_debug_tab: false }).show_debug_tab).toBe(false);
    expect(normalizeSettings({}).show_debug_tab).toBe(false);
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
        hardware_control: "no" as unknown as boolean,
        media_library_access: 1 as unknown as boolean,
      },
    });
    expect(settings.capabilities.filesystem_write).toBe(true);
    expect(settings.capabilities.hardware_control).toBe(false);
    expect(settings.capabilities.media_library_access).toBe(false);
    expect(settings.capabilities.steam_logs_read).toBe(false);
    expect(settings.capabilities.external_navigation).toBe(false);
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
      screenshotAttachmentPreset: "mid",
      desktopDebugNoteAutoSave: true,
      desktopAskVerboseLogging: false,
      attachProtonLogsWhenTroubleshooting: true,
      presetChipFadeAnimationEnabled: true,
      inputSanitizerUserDisabled: false,
      capabilities: DEFAULT_CAPABILITIES,
      aiCharacterEnabled: true,
      aiCharacterRandom: false,
      aiCharacterPresetId: "preset-a",
      aiCharacterCustomText: "hi",
      aiCharacterAccentIntensity: "balanced",
      askMode: "deep",
      ollamaKeepAlive: "30s",
      showDebugTab: true,
      modelPolicyTier: "open_weight",
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: true,
      ollamaLocalOnDeck: true,
    });
    expect(p.latency_warning_seconds).toBe(20);
    expect(p.request_timeout_seconds).toBe(150);
    expect(p.unified_input_persistence_mode).toBe("no_persist");
    expect(p.screenshot_attachment_preset).toBe("mid");
    expect(p.ai_character_preset_id).toBe("preset-a");
    expect(p.ask_mode).toBe("deep");
    expect(p.ollama_keep_alive).toBe("30s");
    expect(p.model_allow_high_vram_fallbacks).toBe(true);
    expect(p.ollama_local_on_deck).toBe(true);
    expect(p.attach_proton_logs_when_troubleshooting).toBe(true);
  });

  it("toBonsaiSettingsPayload merges patch over base (character picker path)", () => {
    const base = {
      latencyWarningSeconds: 30,
      requestTimeoutSeconds: 360,
      latencyTimeoutsCustomEnabled: false,
      unifiedInputPersistenceMode: "persist_all" as const,
      screenshotAttachmentPreset: DEFAULT_SCREENSHOT_ATTACHMENT_PRESET,
      desktopDebugNoteAutoSave: false,
      desktopAskVerboseLogging: false,
      attachProtonLogsWhenTroubleshooting: false,
      presetChipFadeAnimationEnabled: true,
      inputSanitizerUserDisabled: false,
      capabilities: DEFAULT_CAPABILITIES,
      aiCharacterEnabled: true,
      aiCharacterRandom: true,
      aiCharacterPresetId: "old",
      aiCharacterCustomText: "oldtext",
      aiCharacterAccentIntensity: DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
      askMode: DEFAULT_ASK_MODE,
      ollamaKeepAlive: DEFAULT_OLLAMA_KEEP_ALIVE,
      showDebugTab: false,
      modelPolicyTier: "open_source_only" as const,
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: false,
      ollamaLocalOnDeck: false,
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
});
