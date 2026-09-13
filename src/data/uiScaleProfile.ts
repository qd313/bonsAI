/**
 * Title: UI scale profiles
 * Purpose: Profile ids, viewport thresholds, labels, and classifier helpers for QAM density.
 * Used for: SettingsTabUiScaleSection, UiScaleContext, and auto profile selection on resize.
 * Solves: Typed Handheld/Desktop/Couch (and dev Immersive) profiles with multiplier math.
 * Does not: Inject CSS at runtime — see bonsaiScopeStylesheet and uiScaleScopeBridge.
 */
import type React from "react";

/** User-visible UI scale profiles (Immersive is dev-only until Steam Frame ships). */
export type UiScaleProfileId = "handheld" | "desktop" | "couch" | "immersive";
/** Profiles exposed in Settings manual slider (v1). */
export const UI_SCALE_MANUAL_PROFILE_IDS: Exclude<UiScaleProfileId, "immersive">[] = [
  "handheld",
  "desktop",
  "couch",
];

/**
 * QAM viewport width (px) at or above which a docked/external output is classified as Couch.
 * Calibrate on 24"/27" monitors vs 65" TV — start 960; tune via on-Deck QA matrix.
 */
export const EXTERNAL_COUCH_VIEWPORT_MIN_PX = 960;

/** Viewport below this width is treated as arm's-length handheld QAM geometry. */
export const HANDHELD_VIEWPORT_MAX_PX = 600;

/** Dev-only: expose Immersive profile in classifier (Steam Frame proxy). */
export const SHOW_IMMERSIVE_UI_SCALE = false;

export const UI_SCALE_PROFILE_LABEL: Record<UiScaleProfileId, string> = {
  handheld: "Handheld",
  desktop: "Desktop",
  couch: "Couch",
  immersive: "Immersive",
};

export const UI_SCALE_PROFILE_DESCRIPTION: Record<UiScaleProfileId, string> = {
  handheld: "Arm's-length — Deck or Legion Go screen, touch-friendly density.",
  desktop: "Desk monitor — same layout recipe, comfortable at close range.",
  couch: "TV distance — larger type, spacing, and focus targets.",
  immersive: "Large virtual display at close range (preview).",
};

/** Readability multipliers per profile (layout recipe stays proportional). */
const UI_SCALE_PROFILE_MULTIPLIER: Record<UiScaleProfileId, number> = {
  handheld: 1,
  desktop: 1,
  couch: 1.18,
  immersive: 1.22,
};

const UI_SCALE_IMMERSIVE_MAX_MULTIPLIER = 1.28;

export type DisplayContext = "internal" | "external";

export type ClassifyUiScaleInput = {
  autoEnabled: boolean;
  manualProfile: UiScaleProfileId;
  viewportWidthPx: number;
  screenWidthPx?: number;
  screenHeightPx?: number;
};

/**
 * Heuristic: docked / TV output vs built-in handheld panel.
 * QAM viewport width is the primary signal — Legion Go native 2560px screen still uses a narrow QAM column.
 */
export function detectDisplayContext(
  viewportWidthPx: number,
  screenWidthPx: number = typeof window !== "undefined" ? window.screen?.width ?? 0 : 0,
  screenHeightPx: number = typeof window !== "undefined" ? window.screen?.height ?? 0 : 0,
): DisplayContext {
  if (viewportWidthPx > 0 && viewportWidthPx < HANDHELD_VIEWPORT_MAX_PX) {
    return "internal";
  }
  if (screenWidthPx > 0 && screenWidthPx <= 1280 && screenHeightPx > 0 && screenHeightPx <= 800) {
    return "internal";
  }
  if (viewportWidthPx >= HANDHELD_VIEWPORT_MAX_PX) {
    return "external";
  }
  if (screenWidthPx >= 1600 || screenHeightPx >= 900) {
    return "external";
  }
  return "internal";
}

export function classifyUiScaleProfile(input: ClassifyUiScaleInput): UiScaleProfileId {
  const { autoEnabled, manualProfile, viewportWidthPx } = input;
  if (!autoEnabled) {
    return normalizeUiScaleProfileId(manualProfile);
  }
  const display = detectDisplayContext(
    viewportWidthPx,
    input.screenWidthPx,
    input.screenHeightPx,
  );
  if (display === "internal") {
    return "handheld";
  }
  if (viewportWidthPx >= EXTERNAL_COUCH_VIEWPORT_MIN_PX) {
    return "couch";
  }
  return "desktop";
}

export function normalizeUiScaleProfileId(value: unknown): UiScaleProfileId {
  const t = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (t === "desktop" || t === "couch" || t === "immersive" || t === "handheld") {
    if (t === "immersive" && !SHOW_IMMERSIVE_UI_SCALE) {
      return "handheld";
    }
    return t;
  }
  return "handheld";
}

export function profileScaleMultiplier(profileId: UiScaleProfileId): number {
  const base = UI_SCALE_PROFILE_MULTIPLIER[profileId] ?? 1;
  if (profileId === "immersive") {
    return Math.min(base, UI_SCALE_IMMERSIVE_MAX_MULTIPLIER);
  }
  return base;
}

export function indexOfManualUiScaleProfile(profileId: UiScaleProfileId): number {
  const id = normalizeUiScaleProfileId(profileId);
  if (id === "immersive") return 0;
  const idx = UI_SCALE_MANUAL_PROFILE_IDS.indexOf(id as (typeof UI_SCALE_MANUAL_PROFILE_IDS)[number]);
  return idx >= 0 ? idx : 0;
}

export function manualUiScaleProfileAtIndex(index: number): (typeof UI_SCALE_MANUAL_PROFILE_IDS)[number] {
  const maxIdx = UI_SCALE_MANUAL_PROFILE_IDS.length - 1;
  const clamped = Math.max(0, Math.min(maxIdx, Math.round(index)));
  return UI_SCALE_MANUAL_PROFILE_IDS[clamped] ?? "handheld";
}

/** CSS custom property + inline style for `.bonsai-scope` root. */
export function buildBonsaiUiScaleInlineStyle(profileId: UiScaleProfileId): React.CSSProperties {
  const scale = profileScaleMultiplier(profileId);
  return {
    ["--bonsai-ui-scale" as string]: String(scale),
  };
}

/** Read current scale from a scope element (for JS layout math). */
export function readUiScaleFromElement(el: HTMLElement | null | undefined): number {
  if (!el) return 1;
  const raw = getComputedStyle(el).getPropertyValue("--bonsai-ui-scale").trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
