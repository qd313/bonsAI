/**
 * Title: A font size that follows the Text size setting
 *
 * Purpose: `textPx(12)` is `calc(12px * var(--bonsai-text-scale, 1))`: today's size for the words,
 * times the step the person picked under Settings > Text size (1 when none is set, so Normal is
 * exactly today's size). Every font size in the plugin is written through here, in the stylesheets
 * and in inline styles alike, so Small, Normal and Large move every word the same way.
 *
 * Used for: every `font-size` in src/styles/sections, the chat title and chats-menu stylesheets, and
 * every inline `fontSize` in the components and features.
 *
 * Solves: Plan 89 (S1). The Text size row used to scale only the chat's own words (`chatTextPx`);
 * the maintainer asked for every word on every tab. One helper means a new font size cannot forget
 * the setting without a test noticing (src/components/textSizeEverywhere.test.tsx scans for it).
 *
 * Does not: Touch heights, paddings, gaps or icon sizes: only the size of the letters. Rows keep
 * their heights, so a long line is cut off with an ellipsis sooner on Large instead of growing the
 * row. Does not apply to Steam's or Decky's own controls, which take their sizes from Steam.
 */
import { TEXT_SCALE_VAR } from "../../data/chatTextSize";

/** `px` pixels, times the Text size step. */
export function textPx(px: number): string {
  return `calc(${px}px * var(${TEXT_SCALE_VAR}, 1))`;
}

/** `px` pixels, times the UI scale and the Text size step. For a size that already followed the UI scale. */
export function uiTextPx(px: number): string {
  return `calc(${px}px * var(--bonsai-ui-scale, 1) * var(${TEXT_SCALE_VAR}, 1))`;
}

/**
 * The step on the box itself: `1em` of the size it inherits, times the step (exactly the inherited size
 * on Normal). Anything inside the box that takes its size from its parent, Steam's own controls
 * included where they do, follows the setting; a size written through `textPx` is its own number and is
 * not touched by this. Only the plugin's one box (and a popup's) carries it, so it is applied once.
 */
export const TEXT_SCALE_ROOT_CSS = `
        .bonsai-scope {
          font-size: calc(1em * var(${TEXT_SCALE_VAR}, 1));
        }
`;
