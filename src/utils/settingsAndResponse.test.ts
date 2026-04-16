import { describe, expect, it } from "vitest";
import {
  buildResponseText,
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
    expect(settings.capabilities.filesystem_write).toBe(false);
    expect(settings.capabilities.hardware_control).toBe(false);
    expect(settings.ai_character_enabled).toBe(false);
    expect(settings.ai_character_random).toBe(true);
    expect(settings.ai_character_preset_id).toBe("");
    expect(settings.ai_character_custom_text).toBe("");
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
