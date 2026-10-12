/**
 * Title: A one-line row that opens its text while the ring is on it
 *
 * Purpose: The About tab's way of keeping long text out of the way (plan 92, lane T3; the maintainer's pick,
 * "one-line rows, text under the ringed row"). `useRevealWhileRinged` says whether the ring is on a row
 * right now; `AboutRevealRow` is the plain row ("What bonsAI is") built on it, and the Reply language
 * row uses the hook for its own hint text.
 *
 * Used for: AboutTab.tsx ("What bonsAI is") and AboutReplyLanguageSection.tsx (the hint under the picker).
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
import { Focusable } from "@decky/ui";

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

type Props = {
  /** The row's one line. */
  label: string;
  /** The paragraph drawn under the row while the ring is on it. */
  children: React.ReactNode;
  /** A name for the row, for the tests and the Deck driver (`data-bonsai-about-row`). */
  rowId: string;
};

/**
 * The row: a Focusable stop with its one line, and, while the ring is on it, the paragraph under it.
 * In: the line, the paragraph, a name.
 * Out: the row.
 * Can go wrong: nothing. A on the row does nothing; the paragraph opens by the ring alone.
 */
export const AboutRevealRow: React.FC<Props> = ({ label, children, rowId }) => {
  const { open, focusProps } = useRevealWhileRinged();
  return (
    <div className="bonsai-about-item" data-bonsai-about-item={rowId}>
      {/* `focusable` makes it a real D-pad stop; without it Steam treats a Focusable as a pass-through container. */}
      <Focusable
        {...({ focusable: true } as Record<string, unknown>)}
        className="bonsai-about-row bonsai-settings-focus-wrap"
        data-bonsai-about-row={rowId}
        {...focusProps}
      >
        <span>{label}</span>
      </Focusable>
      {open ? (
        <div className="bonsai-about-reveal" data-bonsai-about-reveal={rowId}>
          {children}
        </div>
      ) : null}
    </div>
  );
};
