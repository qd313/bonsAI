/**
 * Title: Sharing the current text size with pop-up windows
 *
 * Purpose: A pop-up window (opened with `showModal`) is drawn outside the plugin's normal
 * on-panel area, so it cannot simply inherit the text and spacing size (the size a person picked,
 * or the plugin worked out automatically for the screen) the same way the rest of the plugin
 * does. This file is a small shared shelf: the main panel publishes its current size choice here,
 * and a pop-up window reads it back so its own text and spacing match.
 *
 * Used for: `useUiScaleProfile` and `BonsaiModalScope`, the wrapper pop-up windows use to pick up
 * the current size.
 *
 * Solves: without a shared place to read the current size from, a pop-up window would show its
 * own text and spacing at the wrong size compared to the panel it was opened from.
 *
 * Does not: measure the screen or work out what the right size actually is — see
 * `useUiScaleProfile` for that. This file only holds the answer so a pop-up window can read it.
 */
import type React from "react";

let publishedUiScaleScopeStyle: React.CSSProperties = {};

/** showModal() portals sit outside the QAM React tree — publish scale vars for BonsaiModalScope. */
export function publishUiScaleScopeStyle(style: React.CSSProperties): void {
  publishedUiScaleScopeStyle = style;
}

export function readPublishedUiScaleScopeStyle(): React.CSSProperties {
  return publishedUiScaleScopeStyle;
}
