/**
 * Title: Putting the checklist that came with an answer on screen without losing its ticks
 *
 * Purpose: A finished Strategy answer can carry a checklist. When the person opens the panel again
 * the screen asks the back end for the last finished answer and paints it, and this file decides
 * what the checklist under it looks like: the answer's steps, with every step the person already
 * ticked still ticked.
 *
 * Used for: `useBonsaiAskOrchestration`, where a finished answer's status is turned into what is
 * drawn.
 *
 * Solves: On a fresh open the saved ticks are read from disk a moment after the last answer is
 * read. The answer used to be merged into an empty list, drawn unticked and saved over the ticked
 * copy, so a tick was lost every time the panel was closed and opened (plan 94 block 5, plan 96
 * F4). On an open, this file reads the saved copy of that game's list first and merges into it.
 *
 * Does not: Load the list when no answer is involved (see `useStrategyChecklistSession`), save on
 * a tick (see `useStrategyBranchActions`), or decide whether an answer has a checklist.
 *
 * How it works: `paintAnswerChecklist` merges at once when the answer was just written in this
 * open. When it is the open's own read of an old answer, and the list on screen has not been
 * loaded yet, it reads the saved list for the answer's game, then merges and saves.
 */
import type { StrategyChecklistPayload, StrategyChecklistState } from "../../types/bonsaiUi";
import { mergeStrategyChecklistState } from "./strategyChecklist";
import {
  loadStrategyChecklistSession,
  scheduleStrategyChecklistSessionSave,
} from "./strategyChecklistPersistence";

export type PaintAnswerChecklistArgs = {
  payload: StrategyChecklistPayload;
  /** The game the answer was for ("" for none). */
  appId: string;
  /** That game's name as the status gave it. */
  statusAppName: string;
  /** The game running now ("" for none) and its name. */
  runningAppId: string;
  runningAppName: string;
  /** The list on screen right now (null before the disk load lands). */
  readCurrent: () => StrategyChecklistState | null;
  /** True when this is the open's own read of an answer that finished earlier. */
  fromMountRead: boolean;
  /** Draws the list on screen. */
  draw: (next: StrategyChecklistState) => void;
};

export function paintAnswerChecklist(a: PaintAnswerChecklistArgs): void {
  // Only the game this answer was for may have its list drawn (plan 78, finding 3).
  const stillRunning = a.appId === a.runningAppId;
  const finish = (prev: StrategyChecklistState | null) => {
    const merged = mergeStrategyChecklistState(prev, a.payload, {
      appId: a.appId,
      appName: stillRunning ? a.runningAppName : a.statusAppName,
    });
    if (stillRunning) a.draw(merged);
    scheduleStrategyChecklistSessionSave(merged);
  };
  const current = stillRunning ? a.readCurrent() : null;
  if (!a.fromMountRead || current) {
    finish(current);
    return;
  }
  void loadStrategyChecklistSession(a.appId)
    .catch(() => null)
    .then((saved) => finish((stillRunning ? a.readCurrent() : null) ?? saved));
}
