/**
 * This module centralizes frontend settings normalization and response formatting behavior.
 * Keeping these pure helpers separate from UI components makes validation rules easy to test and reuse.
 */
export type UnifiedInputPersistenceMode = "persist_all" | "persist_search_only" | "no_persist";
export type ScreenshotMaxDimension = 1280 | 1920 | 3160;

export type BonsaiSettings = {
  latency_warning_seconds: number;
  request_timeout_seconds: number;
  unified_input_persistence_mode: UnifiedInputPersistenceMode;
  screenshot_max_dimension: ScreenshotMaxDimension;
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
export const MAX_REQUEST_TIMEOUT_SECONDS = 600;
export const LATENCY_WARNING_STEP_SECONDS = 5;
export const REQUEST_TIMEOUT_STEP_SECONDS = 30;
export const DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE: UnifiedInputPersistenceMode = "persist_all";
export const SCREENSHOT_DIMENSION_OPTIONS: ScreenshotMaxDimension[] = [1280, 1920, 3160];
export const DEFAULT_SCREENSHOT_MAX_DIMENSION: ScreenshotMaxDimension = 1280;

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

export function normalizeSettings(data: unknown): BonsaiSettings {
  /** Normalize a raw settings payload into a fully populated frontend settings object. */
  const raw = (typeof data === "object" && data !== null) ? (data as Partial<BonsaiSettings>) : {};
  return {
    latency_warning_seconds: normalizeLatencyWarningSeconds(
      raw.latency_warning_seconds,
      DEFAULT_LATENCY_WARNING_SECONDS
    ),
    request_timeout_seconds: normalizeRequestTimeoutSeconds(
      raw.request_timeout_seconds,
      DEFAULT_REQUEST_TIMEOUT_SECONDS
    ),
    unified_input_persistence_mode: normalizeUnifiedInputPersistenceMode(raw.unified_input_persistence_mode),
    screenshot_max_dimension: normalizeScreenshotMaxDimension(raw.screenshot_max_dimension),
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
