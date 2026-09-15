/**
 * Title: The frosted-glass button look
 *
 * Purpose: The style two kinds of button share across the Settings and
 * Ollama tabs — a soft, semi-transparent gradient with a thin light border,
 * matching SteamOS's own look for a secondary action. There is also a red
 * variant of the same look for a destructive action. Both are plain style
 * objects, not components: whatever button uses them still owns its own
 * click handling.
 *
 * Used for: Buttons like Test connection and Browse models, and other
 * secondary actions on those two tabs.
 *
 * Solves: One shared look, defined once, instead of every button that wants
 * this style copying the same gradient and border values and drifting apart
 * over time.
 *
 * Does not: Decide what a button does when pressed, or how the D-pad reaches
 * it — a caller applies one of these two style objects to its own Button and
 * keeps everything else about that button as it already was.
 */
import type React from "react";

/** SteamOS glass row button — matches Test connection / Browse models (no tint fill). */
export const SETTINGS_GLASS_BTN: React.CSSProperties = {
  minHeight: 36,
  minWidth: 0,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
  color: "#e8eef5",
  textAlign: "left",
  justifyContent: "flex-start",
};

/** Compact destructive glass — red border/text only. */
export const SETTINGS_GLASS_BTN_DANGER: React.CSSProperties = {
  ...SETTINGS_GLASS_BTN,
  padding: "6px 12px",
  border: "1px solid rgba(248,113,113,0.5)",
  color: "#fecaca",
};
