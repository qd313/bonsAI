/**
 * Title: Scale a pixel size
 *
 * Purpose: Every fixed size in the stylesheet is meant to pass through here,
 * so turning the plugin's own "UI scale" setting up or down resizes it too,
 * instead of only resizing the handful of things Steam already knows how to
 * scale on its own.
 *
 * Used for: Called throughout the stylesheet section files wherever a plain
 * pixel number needs to grow or shrink with the UI scale setting.
 */

/**
 * In: a plain pixel number, e.g. 14.
 * Out: a CSS `calc()` string that multiplies it by the current UI scale, so
 * the browser does the resizing itself when it draws the page.
 * Can go wrong: nothing checks that the number makes sense — a negative or
 * huge value is passed straight through into the CSS untouched.
 */
export function uiScalePx(px: number): string {
  return `calc(${px}px * var(--bonsai-ui-scale, 1))`;
}
