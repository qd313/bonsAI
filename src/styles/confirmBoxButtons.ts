/**
 * Title: The two button looks of a box's foot: the action and the safe button
 *
 * Purpose: Every box the plugin draws with its own two buttons (the shared two-button confirm box and
 * the first-run popup's foot) shows the same pair: the action on the left in Steam's primary button (the
 * Beta Notice's "Got it": grey at rest, bright blue while the ring is on it) and the safe button (Cancel,
 * Not now, Keep it off) on the right in the plugin's own frosted glass. Both are the same height, the
 * same width in their row, the same text size and weight, so the pair reads as one piece.
 *
 * Used for: shared/TwoButtonConfirmModal.tsx and features/ai-connection/first-run/FirstRunPopupParts.tsx.
 *
 * Solves: Steam's plain button turns solid white with dark words the moment the ring lands on it, and
 * the ring starts on the safe button, so every box opened with a white block beside a grey one, and the
 * two were different heights (the maintainer's screenshot of the Delete chat? box, 2026-10-22). With its
 * own fill the safe button keeps the plugin's colours and shows focus as the white ring every other glass
 * button wears (FOCUS_RING_BTN_CLASS, inside a BonsaiModalScope).
 *
 * Does not: Decide what either button does or where the ring goes; a caller puts these on its own buttons.
 */
import type { CSSProperties } from "react";

import { SETTINGS_GLASS_BTN } from "./settingsGlassButton";
import { textPx } from "./textPx";

/** Both buttons' height; the first-run popup's foot has been this size since plan 94. */
export const CONFIRM_FOOT_BUTTON_H_PX = 32;

/**
 * What the two buttons share: one height, the full width of their column, centred words at the same
 * size and weight, Steam's 2-point corners. border-box, so the glass button's 1-point border does not
 * make it 2 points taller than the action.
 */
const FOOT_SHAPE: CSSProperties = {
  boxSizing: "border-box",
  minHeight: CONFIRM_FOOT_BUTTON_H_PX,
  height: CONFIRM_FOOT_BUTTON_H_PX,
  padding: "0 10px",
  width: "100%",
  minWidth: 0,
  textAlign: "center",
  justifyContent: "center",
  fontSize: textPx(13),
  fontWeight: 600,
  borderRadius: 2,
};

/** The action: Steam's primary button (DialogButtonPrimary) in the foot's shape; its colours are Steam's. */
export const CONFIRM_ACTION_BUTTON_STYLE: CSSProperties = { ...FOOT_SHAPE };

/** The safe button: the plugin's frosted glass in the foot's shape. Pair with FOCUS_RING_BTN_CLASS. */
export const CONFIRM_SAFE_BUTTON_STYLE: CSSProperties = { ...SETTINGS_GLASS_BTN, ...FOOT_SHAPE };
