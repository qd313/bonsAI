/**
 * Title: The pin that marks a note
 *
 * Purpose: The small pushpin drawn beside a note: on the kept line, on the "Read N of your notes" line and
 * in the notes sheet. The same stroke as the mock-up board's pin (docs/demos/mockup-board/src/20-kit.js).
 *
 * Used for: NoteOfferCard.tsx, NotesReadLine.tsx, UserNotesSheet.tsx.
 *
 * Solves: One drawing of the pin, so the three places cannot drift apart.
 *
 * Does not: Take a colour of its own: it draws in the surrounding text colour.
 */
import React from "react";

export function NotePinIcon({ size = 11, className = "bonsai-note-pin" }: { size?: number; className?: string }): React.ReactElement {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v8" />
    </svg>
  );
}
