/**
 * This module centralizes frontend settings normalization and response formatting behavior.
 * Keeping these pure helpers separate from UI components makes validation rules easy to test and reuse.
 */
export type UnifiedInputPersistenceMode = "persist_all" | "persist_search_only" | "no_persist";
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
  capabilities: BonsaiCapabilities;
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

export const DEFAULT_CAPABILITIES: BonsaiCapabilities = {
  filesystem_write: false,
  hardware_control: false,
  media_library_access: false,
  external_navigation: false,
};

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
    capabilities: normalizeCapabilities(raw.capabilities),
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
