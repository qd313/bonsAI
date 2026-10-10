/**
 * Title: A font size that follows the Text size setting
 * Purpose: `chatTextPx(12)` is `calc(12px * var(--bonsai-chat-text-scale, 1))`: the size in the chat's
 *          own words, times the step the person picked in Settings (1 when none is set, so today's size).
 * Used for: the answer, the question and the Show details text only. Not the tab bar, the chat's name,
 *           the chips or Settings: they keep plain sizes (or `uiScalePx`).
 * Does not: Touch the UI scale. It has its own variable on purpose; see src/data/chatTextSize.ts.
 */
export function chatTextPx(px: number): string {
  return `calc(${px}px * var(--bonsai-chat-text-scale, 1))`;
}
