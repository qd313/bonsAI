/**
 * Title: Sharing the panel's look (Text size and accent colour) with pop-up windows
 *
 * Purpose: A pop-up window (opened with `showModal`) is drawn outside the plugin's normal
 * on-panel area, so it cannot simply inherit the plugin's root style (the accent colour and the
 * Text size step the person picked) the way the rest of the plugin does. This file is a small
 * shared shelf: the main panel publishes its whole root style here, and a pop-up window reads it
 * back so its own look matches.
 *
 * Used for: `useBonsaiScopeStyle`, which publishes, and `BonsaiModalScope`, which pop-up windows
 * use to pick the style up.
 *
 * Solves: without a shared place to read the current style from, a pop-up window would show its
 * own text at the wrong size and in the wrong accent compared to the panel it was opened from.
 *
 * Does not: work out the Text size or the accent (`withTextScale` and `useBonsaiScopeStyle` do
 * that). This file only holds the answer so a pop-up window can read it. Its name is from the
 * UI scale setting that used to travel here too; a later rename will change it.
 */
import type React from "react";

let publishedUiScaleScopeStyle: React.CSSProperties = {};

/** showModal() portals sit outside the QAM React tree — publish the root style (accent, Text size) for BonsaiModalScope. */
export function publishUiScaleScopeStyle(style: React.CSSProperties): void {
  publishedUiScaleScopeStyle = style;
}

export function readPublishedUiScaleScopeStyle(): React.CSSProperties {
  return publishedUiScaleScopeStyle;
}
