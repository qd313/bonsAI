/**
 * Title: Where each D-pad press goes on the Search tab
 *
 * Purpose: The tab's stops sit in rows, top to bottom: the game buttons, the find box, the word buttons
 * (two rows), then either Clear and the matches or the notes. This is the pure rule for one press from one
 * stop: Left and Right walk along a row and hold still at its ends (a Right nobody claims would carry the
 * ring out of the plugin, into Steam's side rail); Up and Down go to the row above or below, landing on
 * the stop nearest in x, or on the same place in the row when nothing is measured; Up from the top row
 * leaves the tab to the tab bar, and Down from the last row holds still.
 *
 * Used for: useSearchNav.ts, which measures the rows and hands the ring over, and the tab's walk test.
 *
 * Solves: Keeps the graph a plain function, so "nothing is visited twice" and "no press is dead" can be
 * tested without a screen. The graph is explicit rather than Steam's spatial walk because a row of
 * buttons left to Steam alone has hopped over stops on the Deck before (docs/focus-graph.md).
 *
 * Does not: Move the ring itself, or read any element; the caller measures and acts.
 */

export type SearchDirection = "up" | "down" | "left" | "right";

/** One stop: its row (index into the rows, top first) and its place along that row. */
export type SearchStopAt = { row: number; col: number };

/** What a press does: land on a stop, leave the tab upward, or hold still. */
export type SearchMove = SearchStopAt | "leave" | "hold";

/**
 * The stop nearest in x to `fromX` among `centers` (a row's stop centres, left to right); the first on a
 * tie. With no measurements (`fromX` or `centers` missing, as in a test page) the same place along the
 * row, held inside it.
 */
export function nearestColumn(fromCol: number, fromX: number | null, centers: readonly number[] | null, length: number): number {
  if (length <= 0) return 0;
  if (fromX === null || centers === null || centers.length !== length) return Math.min(Math.max(fromCol, 0), length - 1);
  let best = 0;
  for (let i = 1; i < length; i++) if (Math.abs(centers[i]! - fromX) < Math.abs(centers[best]! - fromX)) best = i;
  return best;
}

/**
 * One press. `sizes` is how many stops each row holds, top first (rows with none are left out by the
 * caller); `centers(row)` gives a row's stop centres in x, or null when they are not measured.
 */
export function searchMove(
  sizes: readonly number[],
  at: SearchStopAt,
  direction: SearchDirection,
  centers: (row: number) => readonly number[] | null = () => null,
): SearchMove {
  if (direction === "left") return at.col > 0 ? { row: at.row, col: at.col - 1 } : "hold";
  if (direction === "right") return at.col < (sizes[at.row] ?? 0) - 1 ? { row: at.row, col: at.col + 1 } : "hold";
  const row = direction === "up" ? at.row - 1 : at.row + 1;
  if (row < 0) return "leave";
  if (row >= sizes.length) return "hold";
  const fromX = centers(at.row)?.[at.col] ?? null;
  return { row, col: nearestColumn(at.col, fromX, centers(row), sizes[row]!) };
}
