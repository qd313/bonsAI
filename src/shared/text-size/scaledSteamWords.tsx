/**
 * Title: Words handed to a Steam control, drawn at the Text size step
 *
 * Purpose: `scaledSteamWords("Terse mode", 16)` is the words as a small element of the plugin's own,
 * whose font size is `textPx(16)`: Steam's size for that word today (16 for a switch name, a button or a
 * section title, 12 for a switch's description), times the step under Settings > Text size. At Normal it
 * is exactly the size Steam used, so nothing moves for a person who never opens that setting.
 *
 * Used for: the label and description of Steam's switches (DenseRow.tsx, PermissionsTab.tsx), the words
 * inside Steam's buttons (developerRowsDiagnostics.tsx) and the titles of Steam's sections (AboutTab.tsx,
 * AboutReplyLanguageSection.tsx, PermissionsTab.tsx).
 *
 * Solves: Plan 93 (M10): the words Steam draws inside its own controls stayed the same size at Small,
 * Normal and Large, because Steam gives them a fixed size of its own. Those controls accept an element
 * where they accept words, so the plugin passes the words as an element it sizes itself. Nothing here
 * names a Steam or Decky class (they are scrambled at build time).
 *
 * Does not: Change the words, the colour or the weight (all still Steam's, inherited), or the control's
 * height. Does not reach a Steam control that takes only a string; the caller keeps the plain text for
 * anything that reads it as text (the help strip, the tests' lookups).
 */
import React from "react";

import { textPx } from "../../styles/textPx";

/** `words` as an element sized `px` (today's size) times the Text size step. */
export function scaledSteamWords(words: React.ReactNode, px: number): React.ReactElement {
  return (
    <span data-bonsai-scaled-words="" style={{ fontSize: textPx(px) }}>
      {words}
    </span>
  );
}
