/**
 * Per-preset UI accent colors (main hex) for character-derived theming.
 * Keep keys in sync with `ALL_PRESET_IDS` in `./characterCatalog`.
 */
import type { CSSProperties } from "react";
import type { BonsaiSettings } from "../utils/settingsAndResponse";
import { ALL_PRESET_IDS, isValidPresetId } from "./characterCatalog";
import { BONSAI_FOREST_GREEN } from "../features/unified-input/constants";

/** Default forest main for accent fallbacks and chat bubble theming when no catalog accent applies. */
export const BONSAI_UI_ACCENT_MAIN_FALLBACK = BONSAI_FOREST_GREEN;

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
    ["--bonsai-ui-tab-icon-ds-1" as string]: r(m, 0.22),
    ["--bonsai-ui-tab-icon-ds-2" as string]: r(d, 0.16),
    ["--bonsai-ui-tab-icon-ds-3" as string]: r(m, 0.95),
    ["--bonsai-ui-tab-icon-ds-4" as string]: r(d, 0.62),
    ["--bonsai-ui-tab-icon-ds-5" as string]: r(m, 0.45),
  };
}

/** Ensures the accent map stays aligned with the catalog (compile-time guard). */
export function assertCharacterAccentMapComplete(): void {
  for (const id of ALL_PRESET_IDS) {
    if (!(id in CHARACTER_UI_ACCENT_MAIN_BY_PRESET)) {
      throw new Error(`characterUiAccent: missing main color for preset "${id}"`);
    }
  }
}
