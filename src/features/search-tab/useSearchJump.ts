/**
 * Title: A on a chat match: open that chat on the question that matched
 *
 * Purpose: What the Search tab does when the person presses A on a match from their chats (plan 90 § 3d, the
 * drawing's `sJump`): remember the word, the game and the match (searchJumpStore.ts, so the way back finds
 * them even though the tab is rebuilt), then ask the plugin root to open that chat and switch to the Main tab.
 * The Main tab does the rest once its chat has loaded: opens "N earlier", the day that holds the question,
 * "Show N more" as often as needed, and puts the ring on the question (useEarlierTurnsPill.ts), under the
 * "Back to where you were" line this jump has switched on.
 *
 * Used for: SearchTab.tsx, for the chats group's rows.
 *
 * Solves: Keeps the jump's two halves (remember, then open) in one place so a row only says "jump here".
 *
 * Does not: Switch a chat or a tab itself (the root's `onOpenChat` does), find the question in the chat, or move
 * the ring; the Main tab's transcript does.
 */
import { useCallback } from "react";

import { startSearchJump } from "./searchJumpStore";
import type { SearchQuestion } from "./searchTypes";

export type SearchJumpArgs = {
  /** The word in the find box. */
  word: string;
  /** The game picked, or null for All. */
  game: string | null;
  /** Opens a saved chat and shows the Main tab; handed in by the plugin root. */
  onOpenChat?: (slotId: string) => Promise<unknown> | void;
};

/**
 * In: the word, the game and the root's open-chat function.
 * Out: `jumpTo(question, matchKey)` for a chats row's A.
 * Can go wrong: a chat that has gone since the list was read opens as nothing, and the question is not found;
 * the Back line then never shows (it only shows over a chat that holds the question) and the person is on Main.
 */
export function useSearchJump({ word, game, onOpenChat }: SearchJumpArgs): (q: SearchQuestion, matchKey: string) => void {
  return useCallback(
    (q, matchKey) => {
      startSearchJump({ slotId: q.slotId, turnId: q.turnId, matchKey, word, game });
      void onOpenChat?.(q.slotId);
    },
    [word, game, onOpenChat],
  );
}
