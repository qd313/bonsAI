/**
 * Title: The Search tab's find box and its word buttons
 *
 * Purpose: The box at the top of the tab (a magnifier and "Chats, settings, notes...") and, under it, the
 * word buttons: the eight words in the most of the person's own questions, each with its count, in two rows
 * of four (plan 90 § 2b, the drawing's `.s-box` and `.s-word`). Pressing a word button is the first way to
 * search, with no typing: it puts the word in the box. Typing is the second: A on the box opens Steam's
 * keyboard on a plain Steam text field, and the matches follow what is typed.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the box, the buttons and their stops in one file. The text field is the Steam one, with a
 * nav node of its own like every stop here, so Up and Down leave it through Steam's transfer.
 *
 * Does not: Search; the tab holds the typed word. Known hazard (to be checked on the Deck once): A on a plain
 * Steam text field opens Steam's keyboard, and after the keyboard closes the field can leave the D-pad dead
 * until the panel is closed and reopened (deck-driver rule 1). The word buttons are the way round it.
 */
import React from "react";
import { TextField } from "@decky/ui";
import { FiSearch } from "react-icons/fi";

import { SearchStop } from "./SearchStop";
import type { SearchWord } from "./searchTypes";
import type { SearchNav } from "./useSearchNav";

/** Words per row. */
const WORDS_PER_ROW = 4;

export type SearchFindBoxProps = {
  nav: SearchNav;
  /** What is in the box: a typed or picked word. */
  value: string;
  /** The person typed in the box. */
  onType: (next: string) => void;
  /** The person pressed a word button. */
  onPickWord: (word: string) => void;
  words: readonly SearchWord[];
};

export function SearchFindBox({ nav, value, onType, onPickWord, words }: SearchFindBoxProps): React.ReactElement {
  const find = nav.stop("find", 0);
  const picked = value.trim().toLowerCase();
  const rows = [words.slice(0, WORDS_PER_ROW), words.slice(WORDS_PER_ROW, WORDS_PER_ROW * 2)];
  return (
    <div className="bonsai-search__find" data-bonsai-search-find="true">
      <div className="bonsai-search__box">
        <span className="bonsai-search__mag" aria-hidden="true">
          <FiSearch size={13} />
        </span>
        <TextField
          label=""
          value={value}
          spellCheck={false}
          {...({
            ...find,
            placeholder: "Chats, settings, notes…",
            "aria-label": "Search for a word",
            // Left and Right hold still: the field is the whole row.
            onMoveLeft: () => true,
            onMoveRight: () => true,
          } as Record<string, unknown>)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onType(e.target.value)}
        />
      </div>
      {rows.map((row, r) =>
        row.length === 0 ? null : (
          <div key={r} className="bonsai-search__words" data-bonsai-search-word-row={r}>
            {row.map((w, col) => (
              <SearchStop
                key={w.word}
                stop={nav.stop(`w${r}`, col)}
                className={`bonsai-search__stop bonsai-search__word${picked === w.word ? " bonsai-search__word--on" : ""}`}
                label={`${w.word}, in ${w.count} of your questions`}
                pressed={picked === w.word}
                onPress={() => onPickWord(w.word)}
              >
                <span className="bonsai-search__word-text">{w.word}</span>
                <small>{w.count}</small>
              </SearchStop>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
