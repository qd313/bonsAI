/**
 * Title: Which "what went into this answer" details to show for an old reply
 *
 * Purpose: The Show details panel tells the player what went into a particular AI answer — which
 * files it read, what game it thought it was answering about, and so on. A reply still on screen
 * always has this information close at hand. A reply reopened from an earlier saved chat should
 * carry its own copy of it, saved alongside the reply itself — but some saved chats were written
 * before that copy started being saved, and a turn written by some other path may never have gotten
 * one attached. This file decides what Show details displays for exactly that gap: a reopened reply
 * with no details of its own.
 *
 * Used for: the Show details row in the main chat view, for a reply reopened from an earlier saved
 * chat (MainTabChatTranscript).
 *
 * Solves: without this, an old saved reply missing its own details would show a blank Show details
 * panel, or every caller would have to work out the same fallback for itself.
 *
 * Does not: fetch the details from the back end, or save them to disk — a separate call to the back
 * end fetches the current ones, and the chat-slot saving code is what attaches a copy to a saved turn
 * going forward.
 *
 * How it works: if the reopened turn has its own saved details, use those. Otherwise, only the very
 * newest turn in the reopened chat may borrow the details of the most recently finished live answer
 * — because that is the one turn those details could actually describe. Any older turn in the same
 * chat gets nothing rather than someone else's details: showing one reply's "what went into this"
 * information under a different reply's answer would be worse than showing none, since the whole
 * point of the panel is to say what *that* reply was built from.
 */
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurnTransparency, TransparencySnapshot } from "./inputTransparency";

export type ArchivedTurnTransparencyArgs = {
  turn: Pick<AskThreadCollapsedTurn, "transparency">;
  /** Index of this turn within the archived list. */
  index: number;
  /** Length of the archived list. */
  total: number;
  /** Snapshot for the most recently completed Ask, from `get_input_transparency`. */
  liveSnapshot: TransparencySnapshot | null | undefined;
};

/**
 * A turn's own snapshot wins when it has one. Otherwise only the NEWEST archived turn may borrow
 * the live snapshot, because that snapshot describes the Ask that was just archived. Older turns
 * return null rather than borrowing it — showing one turn's context under another turn's answer
 * would be worse than showing none, since the whole point of the panel is to say what *this*
 * reply was built from.
 */
export function archivedTurnTransparency(
  args: ArchivedTurnTransparencyArgs
): TransparencySnapshot | ChatSlotTurnTransparency | null {
  const { turn, index, total, liveSnapshot } = args;
  if (turn.transparency) return turn.transparency;
  const isNewest = total > 0 && index === total - 1;
  return isNewest ? liveSnapshot ?? null : null;
}
