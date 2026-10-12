/**
 * Title: A game note, in its own words
 *
 * Purpose: What A on a game note shows (plan 92, contract C7): the note's name, its kind and game, and its
 * own text, over the tab's body. It is drawn inside the tab rather than as a Steam popup: closing a Steam
 * popup rebuilds the whole tab and the word and game the person had picked would be lost. B, or the Close
 * button, goes back to the matches with the ring on the row that opened it.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Opening a note is the moment its real name is no longer a spoiler: the person asked to see it, so
 * the sheet shows the name even where the matches showed a neutral title.
 *
 * Does not: Search, or remember where to return; the tab does (a small store that survives a rebuild).
 */
import React from "react";

import { SearchStop } from "./SearchStop";
import type { GameNote } from "./searchTypes";
import type { SearchNav } from "./useSearchNav";

export type GameNoteSheetProps = {
  nav: SearchNav;
  note: GameNote;
  onClose: () => void;
};

export function GameNoteSheet({ nav, note, onClose }: GameNoteSheetProps): React.ReactElement {
  const place = [note.kind, note.game_title || "every game"].filter(Boolean).join(" · ");
  return (
    <div className="bonsai-search__sheet" data-bonsai-search-sheet="true" role="dialog" aria-label={note.name}>
      <div className="bonsai-search__sheet-head">
        <div className="bonsai-search__sheet-name">{note.name}</div>
        <small>{place}</small>
      </div>
      <SearchStop stop={nav.stop("sheet-close", 0)} className="bonsai-search__stop bonsai-search__clear" label="Close the note" onPress={onClose} onCancel={onClose}>
        Close
      </SearchStop>
      <SearchStop stop={nav.stop("sheet-text", 0)} className="bonsai-search__stop bonsai-search__sheet-text" label={`${note.name}, the note`} onPress={() => {}} onCancel={onClose}>
        {note.text}
      </SearchStop>
    </div>
  );
}
