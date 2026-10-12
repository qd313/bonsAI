/**
 * Title: The Search tab's game row
 *
 * Purpose: The row of buttons above the find box (plan 90 § 2b, the drawing's `.s-games`): All, then one
 * button for each game the saved chats mention. Picking a game narrows the chats, the notes and the game
 * notes to it; the picked one wears the gold look.
 *
 * Used for: SearchTab.tsx.
 *
 * Solves: Keeps the row's drawing and its stops in one file.
 *
 * Does not: Narrow anything; the tab holds the picked game and searchModel.ts does the narrowing.
 */
import React from "react";

import { SearchStop } from "./SearchStop";
import type { SearchNav } from "./useSearchNav";

export type SearchGameRowProps = {
  nav: SearchNav;
  games: readonly string[];
  /** The picked game, or null for All. */
  game: string | null;
  onPick: (game: string | null) => void;
};

export function SearchGameRow({ nav, games, game, onPick }: SearchGameRowProps): React.ReactElement {
  const buttons: Array<string | null> = [null, ...games];
  return (
    <div className="bonsai-search__games" data-bonsai-search-games="true">
      {buttons.map((title, col) => {
        const on = title === null ? game === null : game !== null && game.toLowerCase() === title.toLowerCase();
        return (
          <SearchStop
            key={title ?? "\u0000all"}
            stop={nav.stop("games", col)}
            className={`bonsai-search__stop bonsai-search__game${on ? " bonsai-search__game--on" : ""}`}
            label={title === null ? "All games" : title}
            pressed={on}
            onPress={() => onPick(title)}
          >
            <span className="bonsai-search__game-name">{title === null ? "All" : title}</span>
          </SearchStop>
        );
      })}
    </div>
  );
}
