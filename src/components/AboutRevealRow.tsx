/**
 * Title: Say whether the ring is on a row, so its hint can open
 *
 * Purpose: `useRevealWhileRinged` says whether the ring is on a row right now. The Reply language row uses it
 * to open its hint text under the picker (plan 92, lane T3; the maintainer's pick, "text under the ringed
 * row"). The "What bonsAI is" row that used it too is gone: on 2026-10-12 the maintainer asked for that
 * paragraph back at the top, always shown, so only the hook is left here.
 *
 * Used for: AboutReplyLanguageSection.tsx (the hint under the picker).
 *
 * Solves: Steam tells a row it holds the ring through `onGamepadFocus` / `onGamepadBlur`; a plain DOM focus
 * event is the second signal, for a build of Steam that only fires that (and for the tests). Either one opens
 * the text, either one closing it shuts it. A blur that only moves between two things inside the same row
 * (the Reply language dropdown's own parts) does not shut it.
 *
 * Does not: Move the ring, or make the text a stop. The text is drawn under the row, outside the Focusable,
 * so the ring stays on the one line.
 */
import React, { useMemo, useState } from "react";

/** What a row spreads onto its Focusable so it opens and closes its text with the ring. */
export type RevealFocusProps = {
  onGamepadFocus: () => void;
  onGamepadBlur: () => void;
  onFocus: () => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
};

/**
 * In: nothing.
 * Out: `open` (the ring is on the row) and the four handlers to spread onto the row's Focusable.
 * Can go wrong: nothing. A blur whose target is still inside the row is ignored, so an inner control taking
 * the focus from another inner control does not flicker the text.
 */
export function useRevealWhileRinged(): { open: boolean; focusProps: RevealFocusProps } {
  const [open, setOpen] = useState(false);
  const focusProps = useMemo<RevealFocusProps>(
    () => ({
      onGamepadFocus: () => setOpen(true),
      onGamepadBlur: () => setOpen(false),
      onFocus: () => setOpen(true),
      onBlur: (event) => {
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        setOpen(false);
      },
    }),
    [],
  );
  return { open, focusProps };
}
