/**
 * Title: Character UI accent colors
 * Purpose: Per-preset main/subtle accent pairs and helpers for character-derived theming.
 * Used for: Main tab Ask bar, chat bubbles, Settings character summary styling, and the open tab
 *   strip's lit colour (icon, name, rest-bar dash).
 * Solves: Central map from catalog preset ids to distinctive hex accents and CSS variables.
 * Does not: List character names or bios — see characterCatalog for display metadata.
 */
import type { CSSProperties } from "react";
import type { BonsaiSettings } from "./bonsaiSettingsSchema";
import { isValidPresetId } from "./characterCatalog";
import { BONSAI_FOREST_GREEN, TAB_BAR_STRIP_BG_HEX } from "../features/unified-input/constants";

/** Default forest main for accent fallbacks and chat bubble theming when no catalog accent applies. */
const BONSAI_UI_ACCENT_MAIN_FALLBACK = BONSAI_FOREST_GREEN;

export type UiAccentPair = { main: string; subtle: string };

/** Distinctive main tones per catalog preset (art direction). */
export const CHARACTER_UI_ACCENT_MAIN_BY_PRESET: Record<string, string> = {
  cp2077_jackie: "#e8b923",
  rdr2_arthur: "#c45c3e",
  rdr2_dutch: "#8b3a3a",
  zelda_zelda: "#1e8449",
  zelda_navi: "#5dade2",
  portal_glados: "#5ee8d8",
  l4d2_ellis: "#e67e22",
  gta5_michael: "#5d7aa2",
  gta5_trevor: "#c0392b",
  gta5_lamar: "#9b59b6",
  gta5_lester: "#27ae60",
  mgs_otacon: "#3498db",
  hades_zagreus: "#e74c3c",
  alig_ali_g: "#f1c40f",
  sc_fuu: "#e91e8c",
  bg3_shadowheart: "#6c3483",
  bg3_astarion: "#95a5a6",
  bg3_laezel: "#1abc9c",
  tf2_scout: "#f4d03f",
  tf2_soldier: "#c0392b",
  tf2_pyro: "#ff6b35",
  tf2_demoman: "#a0522d",
  tf2_heavy: "#e74c3c",
  fo4_nick_valentine: "#8e6e53",
  fo4_piper: "#c0392b",
  fo4_preston: "#3498db",
  tf2_engineer: "#e67e22",
  tf2_medic: "#e74c3c",
  tf2_sniper: "#d4a574",
  tf2_spy: "#8e44ad",
  tf2_announcer: "#f1c40f",
};

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const h = hex.replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const x = (n: number) => n.toString(16).padStart(2, "0");
  return `#${x(r)}${x(g)}${x(b)}`;
}

function darkenRgb(rgb: Rgb, factor: number): Rgb {
  return {
    r: Math.max(0, Math.min(255, Math.round(rgb.r * factor))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g * factor))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b * factor))),
  };
}

/** Lifts a colour toward white so a dark accent still reads as a wash rather than a smudge. */
function liftRgb(rgb: Rgb, factor: number): Rgb {
  return {
    r: Math.max(0, Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))),
  };
}

function srgbChannelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * srgbChannelToLinear(rgb.r) +
    0.7152 * srgbChannelToLinear(rgb.g) +
    0.0722 * srgbChannelToLinear(rgb.b)
  );
}

/** WCAG contrast ratio between two hex colours (order does not matter). */
function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The lowest contrast the lifted accent must reach against the open strip's bar
 * (`TAB_BAR_STRIP_BG_HEX`), so the lit name and icon read on the dark strip. The designer's own lit
 * colours are green #52d88a (9.5:1), gold #f1c40f (10.4:1), pink #f36cb6 (6.2:1, lifted from Fuu's
 * #e91e8c at 4.1:1) and grey #c3d0d1 (10.9:1, lifted from Astarion's #95a5a6, which was already
 * 6.7:1). No single threshold reproduces all four: at 4.5:1 pink barely moves (#eb3598) and grey
 * does not move; at 6:1 gold and green stay, pink lands at #f068b2 (within 4 per channel of the
 * designer's), and grey stays at its raw #95a5a6 — the one the rule does not match, so it is
 * hand-picked instead (`TAB_BAR_LIT_HAND_PICKED` below). Dark presets lift to Shadowheart #ad8eba,
 * Dutch #bc8d8d, Nick Valentine #ac9581, all just at 6:1. One number here moves every lift at once
 * for a future Deck evening.
 */
export const TAB_BAR_LIT_MIN_CONTRAST = 6;

/**
 * Lit colours the designer picked by hand where the rule's answer was not the one wanted, keyed by
 * the character's main colour in lowercase. Astarion's grey already reads at 6.7:1 so the rule
 * would leave it, but the board drew a lighter grey (10.9:1) and the maintainer chose the
 * designer's on 2026-09-17 (plan 59 § 5).
 */
export const TAB_BAR_LIT_HAND_PICKED: Readonly<Record<string, string>> = {
  "#95a5a6": "#c3d0d1",
};

/**
 * The character's main colour, lifted toward white only as far as needed to read on the open
 * strip's bar. Hand-picked colours win outright; otherwise a colour that already reaches
 * `TAB_BAR_LIT_MIN_CONTRAST` is returned unchanged, and one that does not is lifted by the smallest
 * factor (binary search, 1/512 precision) that gets it there.
 */
export function liftForBar(mainHex: string): string {
  const handPicked = TAB_BAR_LIT_HAND_PICKED[mainHex.toLowerCase()];
  if (handPicked) return handPicked;

  if (contrastRatio(mainHex, TAB_BAR_STRIP_BG_HEX) >= TAB_BAR_LIT_MIN_CONTRAST) {
    return mainHex;
  }

  const base = hexToRgb(mainHex);
  let lo = 0;
  let hi = 1;
  // 10 halvings reach 1/1024 precision, finer than the 1/512 the brief asks for.
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    const liftedHex = rgbToHex(liftRgb(base, mid));
    if (contrastRatio(liftedHex, TAB_BAR_STRIP_BG_HEX) >= TAB_BAR_LIT_MIN_CONTRAST) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return rgbToHex(liftRgb(base, hi));
}

/** Darker / lower-chroma companion for borders and soft glows (not opacity-only on the same hue). */
export function deriveSubtleHexFromMain(mainHex: string): string {
  const base = hexToRgb(mainHex);
  const darker = darkenRgb(base, 0.58);
  return rgbToHex(darker);
}

function rgba(rgb: Rgb, a: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

/**
 * When non-null, character-derived accent is active — set on `.bonsai-scope` as CSS variables.
 */
export function resolveUiAccentFromCharacterSettings(
  s: Pick<BonsaiSettings, "ai_character_enabled" | "ai_character_random" | "ai_character_preset_id" | "ai_character_custom_text">
): UiAccentPair | null {
  if (!s.ai_character_enabled || s.ai_character_random) return null;
  if (s.ai_character_custom_text.trim()) return null;
  const id = s.ai_character_preset_id.trim();
  if (!id || !isValidPresetId(id)) return null;
  const main = CHARACTER_UI_ACCENT_MAIN_BY_PRESET[id];
  if (!main) return null;
  return { main, subtle: deriveSubtleHexFromMain(main) };
}

/**
 * Main-tab AI reply bubble: tinted from character accent (main + darker subtle companion).
 * Always applied on `.bonsai-scope` so CSS can use `var(--bonsai-chat-ai-bubble-*)`; when no catalog
 * accent is active, `main` falls back to forest green.
 */
function buildChatAiBubbleScopeVars(mainHex: string, subtleHex: string): CSSProperties {
  const m = hexToRgb(mainHex);
  const s = hexToRgb(subtleHex);
  const dDeep = darkenRgb(m, 0.32);
  const r = rgba;
  return {
    ["--bonsai-chat-ai-bubble-border" as string]: r(s, 0.5),
    ["--bonsai-chat-ai-bubble-bg-top" as string]: r(m, 0.1),
    ["--bonsai-chat-ai-bubble-bg-bottom" as string]: r(dDeep, 0.45),
    ["--bonsai-chat-ai-bubble-text" as string]: "#d4dde6",
    ["--bonsai-chat-ai-bubble-chunk-border" as string]: r(m, 0.1),
    // Constant 11%-alpha wash of the accent lifted 40% toward white, layered over the gradient
    // above. Lifted at every accent, not conditionally on luminance (decision 8c -> B).
    ["--bonsai-chat-ai-bubble-wash" as string]: r(liftRgb(m, 0.4), 0.11),
  };
}

/**
 * Inline style object for the root `.bonsai-scope` when accent theming applies.
 * Tab strip / icon glow values mirror the default forest math using the accent main + dark companion.
 * Chat AI bubble vars are always set (catalog accent or forest fallback).
 */
export function buildBonsaiScopeAccentInlineStyle(accent: UiAccentPair | null): CSSProperties {
  const mainHex = accent?.main ?? BONSAI_UI_ACCENT_MAIN_FALLBACK;
  const subtleHex = accent?.subtle ?? deriveSubtleHexFromMain(mainHex);
  const chatVars = buildChatAiBubbleScopeVars(mainHex, subtleHex);

  if (!accent) {
    return chatVars;
  }

  const m = hexToRgb(accent.main);
  const d = darkenRgb(m, 0.44);
  const r = rgba;
  return {
    ...chatVars,
    ["--bonsai-ui-accent-main" as string]: accent.main,
    ["--bonsai-ui-accent-subtle" as string]: accent.subtle,
    ["--bonsai-ui-accent-muted" as string]: r(m, 0.88),
    ["--bonsai-ui-tab-dim-1" as string]: r(m, 0.2),
    ["--bonsai-ui-tab-dim-2" as string]: r(d, 0.12),
    ["--bonsai-ui-tab-bright-1" as string]: r(m, 0.95),
    ["--bonsai-ui-tab-bright-2" as string]: r(d, 0.55),
    ["--bonsai-ui-tab-bright-3" as string]: r(m, 0.32),
    ["--bonsai-ui-tab-focus-1" as string]: r(m, 0.92),
    ["--bonsai-ui-tab-focus-2" as string]: r(m, 0.18),
    ["--bonsai-ui-tab-active-icon" as string]: r(m, 0.98),
    ["--bonsai-ui-tab-lit" as string]: liftForBar(accent.main),
    ["--bonsai-ui-tab-icon-ds-1" as string]: r(m, 0.22),
    ["--bonsai-ui-tab-icon-ds-2" as string]: r(d, 0.16),
    ["--bonsai-ui-tab-icon-ds-3" as string]: r(m, 0.95),
    ["--bonsai-ui-tab-icon-ds-4" as string]: r(d, 0.62),
    ["--bonsai-ui-tab-icon-ds-5" as string]: r(m, 0.45),
  };
}
