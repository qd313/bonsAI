/**
 * Title: The Search tab's matches
 *
 * Purpose: What shows once a word is picked (plan 90 § 2b, the drawing's `.s-count`, `.s-group`, `.s-hit`):
 * the line "N matches for 'word'" with a Clear button, then the matches in five groups in a fixed order,
 * Your chats, Your notes, bonsAI settings (bonsAI's own, plan 96), Settings (Steam's), Game and help notes.
 * A match shows its words with the picked word lit and a small line under it (the chat's name and the day, the note's game, the setting's place, the game note's
 * snippet). A game note whose name does not hold the word is shown by a neutral title and no snippet until A
 * opens it, so a search for a boss does not name another boss.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the groups' drawing and their stops in one file; each row is one stop, in group order.
 *
 * Does not: Find the matches (searchModel.ts) or decide what A does (the tab passes `press` in each row).
 */
import React from "react";
import { FiBook, FiBookmark, FiMessageSquare, FiSettings, FiSliders } from "react-icons/fi";

import { highlightParts, matchCountLine } from "./searchModel";
import { SearchStop } from "./SearchStop";
import type { SearchNav } from "./useSearchNav";

export type ResultRow = {
  key: string;
  /** The name of the row this match is a stop in (useSearchNav). */
  rowName: string;
  title: string;
  /** False for a hidden game note: its title is not the person's word, so nothing is lit. */
  lit: boolean;
  sub: string;
  /** Set on a note: draws its switch, on or off. */
  on?: boolean;
  /** A Quick Access setting wears the gold edge the old card gave it. */
  qam?: boolean;
  press: () => void;
};

export type ResultGroupId = "chats" | "notes" | "bonsai" | "settings" | "game";
export type ResultGroup = { id: ResultGroupId; label: string; rows: ResultRow[] };

const GROUP_ICON: Record<ResultGroupId, React.ReactElement> = {
  chats: <FiMessageSquare size={11} />,
  notes: <FiBookmark size={11} />,
  bonsai: <FiSliders size={11} />,
  settings: <FiSettings size={11} />,
  game: <FiBook size={11} />,
};

/** Words with the picked word lit. */
function Lit({ text, word }: { text: string; word: string }): React.ReactElement {
  return (
    <>
      {highlightParts(text, word).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : <React.Fragment key={i}>{part.text}</React.Fragment>))}
    </>
  );
}

export type SearchResultsProps = {
  nav: SearchNav;
  word: string;
  groups: readonly ResultGroup[];
  onClear: () => void;
};

export function SearchResults({ nav, word, groups, onClear }: SearchResultsProps): React.ReactElement {
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <div className="bonsai-search__results" data-bonsai-search-results="true">
      <div className="bonsai-search__count">
        <span className="bonsai-search__count-text">{matchCountLine(total, word)}</span>
        <SearchStop stop={nav.stop("clear", 0)} className="bonsai-search__stop bonsai-search__clear" label="Clear the search" onPress={onClear}>
          Clear
        </SearchStop>
      </div>
      {groups.map((group) => (
        <React.Fragment key={group.id}>
          <div className="bonsai-search__group" data-bonsai-search-group={group.id}>
            <span className="bonsai-search__group-icon" aria-hidden="true">
              {GROUP_ICON[group.id]}
            </span>
            {group.label}
            <small>{group.rows.length}</small>
          </div>
          {group.rows.map((row) => {
            return (
              <SearchStop
                key={row.key}
                stop={nav.stop(row.rowName, 0)}
                className={`bonsai-search__stop bonsai-search__hit${row.qam ? " bonsai-search__hit--qam" : ""}`}
                label={row.sub ? `${row.title}, ${row.sub}` : row.title}
                pressed={row.on}
                onPress={row.press}
              >
                <span className="bonsai-search__hit-main">
                  <span className="bonsai-search__hit-title">{row.lit ? <Lit text={row.title} word={word} /> : row.title}</span>
                  {row.sub ? <small>{row.sub}</small> : null}
                </span>
                {row.on === undefined ? null : <span className={`bonsai-search__switch${row.on ? " bonsai-search__switch--on" : ""}`} aria-hidden="true" />}
              </SearchStop>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
