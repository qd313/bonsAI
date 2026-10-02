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
 * secondary actions on those two tabs. Also home to FOCUS_RING_BTN_CLASS,
 * the class every such button must carry so the D-pad's ring shows on it.
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

/**
 * The class that draws the plugin's white focus ring on a button while Steam
 * has the D-pad on it (the rule is in sections/scopeBase.ts).
 *
 * Any Button given its own `background` needs it. Steam shows focus on its
 * buttons by changing their fill through its `gpfocus` class, and an inline
 * style always wins over a class rule, so a button that sets its own fill
 * never shows Steam's cue at all: the ring goes invisible (measured on the
 * Deck 2026-10-02, plan79-P79-M2-OLLAMA-INVISIBLE.json). It is opt-in on
 * purpose: a catch-all ring for every button was tried and reverted on
 * 2026-08-04 because it doubled up on controls Steam already outlines.
 * src/styles/buttonFocusRing.test.ts fails when a new button repeats this.
 */
export const FOCUS_RING_BTN_CLASS = "bonsai-settings-focus-btn";

/** SteamOS glass row button — matches Test connection / Browse models (no tint fill). Pair with FOCUS_RING_BTN_CLASS. */
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
