/**
 * Title: One stop on the Search tab
 *
 * Purpose: The one wrapper every pressable control on the tab uses: a Steam `Focusable` that is a stop
 * (it carries the nav node and the four move handlers from useSearchNav) and does something on A. It is
 * built the way the chats menu's rows are (plan 84 step 5, verified on the Deck): `focusable` so Steam does
 * not skip a stop that holds only text, `noFocusRing` so the tab draws its own ring, A on `onOKButton` and a
 * tap on `onClick`.
 *
 * Used for: SearchGameRow, SearchWords, SearchResults, SearchNotesList and the game note sheet.
 *
 * Solves: One place for the wiring, so no control forgets a part of it. A press that arrives as both A and a
 * click within a moment counts once, so a note's switch cannot flip twice from one press.
 *
 * Does not: Decide what a press does, or where the ring goes; the caller passes the action and useSearchNav
 * moves the ring.
 */
import React, { useRef } from "react";
import { Focusable } from "@decky/ui";

import type { SearchStopProps } from "./useSearchNav";

/** A click this soon after an A press is the same press seen twice. */
const SAME_PRESS_MS = 400;

export type SearchStopViewProps = {
  stop: SearchStopProps;
  className: string;
  label: string;
  onPress: () => void;
  /** Reported to a screen reader as pressed (a picked game or word, a note that is on). */
  pressed?: boolean;
  /** An extra handler for B; the tab leaves B to the tab body unless given one. */
  onCancel?: () => void;
  children: React.ReactNode;
};

export function SearchStop({ stop, className, label, onPress, pressed, onCancel, children }: SearchStopViewProps): React.ReactElement {
  const lastOk = useRef(0);
  const press = (fromOk: boolean) => {
    const now = Date.now();
    if (!fromOk && now - lastOk.current < SAME_PRESS_MS) return;
    if (fromOk) lastOk.current = now;
    onPress();
  };
  const { ref, ...rest } = stop;
  return (
    <Focusable
      ref={ref}
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      onClick={() => press(false)}
      {...({
        ...rest,
        focusable: true,
        noFocusRing: true,
        onOKButton: () => press(true),
        ...(onCancel ? { onCancelButton: () => { onCancel(); return true; } } : {}),
      } as Record<string, unknown>)}
    >
      {children}
    </Focusable>
  );
}
