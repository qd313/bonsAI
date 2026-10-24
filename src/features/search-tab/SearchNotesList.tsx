/**
 * Title: The Search tab's list of the person's notes
 *
 * Purpose: What the tab shows before a word is picked (plan 90 § 2b, the drawing's `.s2-notes`): every note
 * the person kept, newest first, narrowed by the game row, each with its on/off switch, and the line "Ask
 * reads the ones that are on. New notes come from what you say in a chat." This is the one home for notes.
 * A on a row flips its switch.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the list's drawing and its stops (one per note) in one file.
 *
 * Does not: Save a note (useSearchIndex.ts does) or open one for editing (the notes sheet comes later).
 */
import React from "react";
import { FiBookmark } from "react-icons/fi";

import { SearchStop } from "./SearchStop";
import type { UserNote } from "./searchTypes";
import type { SearchNav } from "./useSearchNav";

export type SearchNotesListProps = {
  nav: SearchNav;
  /** Newest first, already narrowed to the picked game. */
  notes: readonly UserNote[];
  /** How many of all the person's notes are on, for the heading. */
  onCount: number;
  onToggle: (id: string) => void;
};

export function SearchNotesList({ nav, notes, onCount, onToggle }: SearchNotesListProps): React.ReactElement {
  return (
    <div className="bonsai-search__notes" data-bonsai-search-notes="true">
      <div className="bonsai-search__group">
        <span className="bonsai-search__group-icon" aria-hidden="true">
          <FiBookmark size={11} />
        </span>
        Your notes
        <small>{onCount} on</small>
      </div>
      {notes.map((note, i) => (
        <SearchStop
          key={note.id}
          stop={nav.stop(`n${i}`, 0)}
          className={`bonsai-search__stop bonsai-search__note${note.on ? " bonsai-search__note--on" : ""}`}
          label={`${note.text}, ${note.game_title || "every game"}, ${note.on ? "on" : "off"}`}
          pressed={note.on}
          onPress={() => onToggle(note.id)}
        >
          <span className="bonsai-search__hit-main">
            <span className="bonsai-search__hit-title">{note.text}</span>
            <small>{note.game_title || "Every game"}</small>
          </span>
          <span className={`bonsai-search__switch${note.on ? " bonsai-search__switch--on" : ""}`} aria-hidden="true" />
        </SearchStop>
      ))}
      {notes.length === 0 ? <p className="bonsai-search__hint">You have not kept any notes yet.</p> : null}
      <p className="bonsai-search__hint">Ask reads the ones that are on. New notes come from what you say in a chat.</p>
    </div>
  );
}
