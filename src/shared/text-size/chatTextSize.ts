/**
 * Title: Text size
 *
 * Purpose: The four Text size steps (Tiny, Small, Normal, Large) and how the chosen one reaches the screen. Each step is a
 * number written into `--bonsai-text-scale` on the plugin's root (and on the other places the plugin
 * draws: popups, and the chat's name and tab bar in Decky's title bar); every font size in the plugin
 * is written as `calc(<today's size> * var(--bonsai-text-scale, 1))` (see
 * src/styles/textPx.ts), so Normal (1) is exactly today's size.
 *
 * Used for: index.tsx (puts the number on the root), the popup bridge and the title bar's store (carry
 * it to the places outside the root), and textPx.ts (reads it).
 *
 * Solves: Plan 87 call 3, widened by plan 89 (S1): the steps change every word on every
 * tab, not only the chat's. A variable of its own: it scales only the letters, never boxes, bars or
 * chips (the old UI scale setting, removed in plan 86, scaled those).
 *
 * Why 0.8 / 0.9 / 1 / 1.15: the chat column is 300 px wide and the answer bubble leaves about 240 px for
 * words (92% of the row, less the bubble's and the section's padding). Large turns the 12 px answer
 * into 13.8 px: about 34 letters a line, still room for a 25-letter word, and the answer already
 * breaks any longer word where it must instead of spilling out. A bigger step (1.25) would add a
 * quarter more lines to every answer inside a panel whose answer area is already short. Small turns
 * 12 px into 10.8 px and the smallest line in the details (9 px) into 8.1 px. Tiny (plan 105, the
 * maintainer's call 17) goes below that on purpose, to 9.6 px for the 12 px answer and 7.2 px for the
 * 9 px line: it is the maintainer's choice for a person who wants more words on the screen at once,
 * and it is not a size the plugin recommends. 0.8 is the floor; the settings row's four buttons were
 * measured to keep whole words in the 300 px choice row with it. The same steps apply to the tab bar's 11 px
 * name (12.65 px on Large inside a fixed 20-point bar) and the 30-point chips (12 px to 13.8 px).
 *
 * Does not: Scale anything that is not a letter's size: rows keep their
 * heights, so a long line is cut off sooner on Large instead of growing its row.
 */
import type React from "react";

import type { ChatTextSize } from "../../features/settings/bonsaiSettingsSchema";

export const TEXT_SCALE_VAR = "--bonsai-text-scale";

export const TEXT_SCALE: Record<ChatTextSize, number> = {
  tiny: 0.8,
  small: 0.9,
  normal: 1,
  large: 1.15,
};

/** The step as the text written into the variable. */
export function textScaleValue(size: ChatTextSize): string {
  return String(TEXT_SCALE[size] ?? 1);
}

/** `base` with the chosen step written into it as the plugin's text scale. */
export function withTextScale(base: React.CSSProperties, size: ChatTextSize): React.CSSProperties {
  return { ...base, [TEXT_SCALE_VAR as string]: textScaleValue(size) };
}
