import { describe, expect, it } from "vitest";
import {
  buildResponseText,
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  DEFAULT_ASK_MODE,
  DEFAULT_OLLAMA_KEEP_ALIVE,
  DEFAULT_SCREENSHOT_MAX_DIMENSION,
  normalizeLatencyWarningSeconds,
  normalizeRequestTimeoutSeconds,
  normalizeSettings,
  reconcileLatencyWarningAndTimeout,
} from "./settingsAndResponse";

/** Regression tests for normalization bounds and response formatting behavior. */
describe("settingsAndResponse", () => {
  it("normalizes latency warning to configured bounds and step", () => {
    expect(normalizeLatencyWarningSeconds(2)).toBe(5);
    expect(normalizeLatencyWarningSeconds(299)).toBe(300);
  });

  it("normalizes timeout to configured bounds and step", () => {
    expect(normalizeRequestTimeoutSeconds(9)).toBe(10);
    expect(normalizeRequestTimeoutSeconds(611)).toBe(300);
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
    expect(pair.request_timeout_seconds).toBe(300);
    expect(pair.latency_warning_seconds).toBeLessThan(300);
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
    expect(settings.unified_input_persistence_mode).toBe("persist_all");
    expect(settings.screenshot_max_dimension).toBe(DEFAULT_SCREENSHOT_MAX_DIMENSION);
    expect(settings.desktop_debug_note_auto_save).toBe(false);
    expect(settings.desktop_ask_verbose_logging).toBe(false);
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
    expect(settings.capabilities.external_navigation).toBe(false);
  });

  it("normalizeSettings applies ordering when raw values conflict", () => {
    const settings = normalizeSettings({
      latency_warning_seconds: 180,
      request_timeout_seconds: 90,
    });
    expect(settings.latency_warning_seconds).toBeLessThan(settings.request_timeout_seconds);
    expect(settings.request_timeout_seconds).toBeGreaterThanOrEqual(120);
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
});
