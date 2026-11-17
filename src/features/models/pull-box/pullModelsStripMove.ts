/**
 * Title: Which stop the D-pad reaches inside the AI models box's filter strip
 *
 * Purpose: The strip above the list is two switches on one line and word buttons that wrap onto more lines. Steam
 * cannot guess a sensible Up or Down across lines of different widths, so each stop answers its own press: this works
 * out where it goes from where the stops are drawn at the moment of the press.
 *
 * Used for: PullModelsFiltersStrip.tsx, which measures its stops and moves the ring by a plain focus between them.
 *
 * Solves: Down from a switch landing on the word under it, not the first word; Down from a word landing on the
 * nearest one on the next line; Up and Down leaving the strip from its first and last lines.
 *
 * Does not: move anything (the strip does) or know about stops outside the strip.
 */
export type StripStop = { key: string; left: number; top: number; width: number; height: number };

export type StripDirection = "left" | "right" | "up" | "down";
/** A stop's key, "hold" (nothing there: the press is used up), or "out-up" / "out-down" (leave the strip). */
export type StripTarget = string;

const centreX = (s: StripStop) => s.left + s.width / 2;
const centreY = (s: StripStop) => s.top + s.height / 2;
/** Stops whose centres are this near in height are on one line (a 22 px pill and a 30 px switch differ by 4). */
const SAME_LINE_PX = 8;

/** The stops grouped into the lines they are drawn on, top to bottom, each line left to right. */
export function stripRows(stops: readonly StripStop[]): StripStop[][] {
  const rows: StripStop[][] = [];
  for (const s of [...stops].sort((a, b) => centreY(a) - centreY(b) || a.left - b.left)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(centreY(row[0]) - centreY(s)) <= SAME_LINE_PX) row.push(s);
    else rows.push([s]);
  }
  for (const row of rows) row.sort((a, b) => a.left - b.left);
  return rows;
}

export function stripTarget(stops: readonly StripStop[], from: string, dir: StripDirection): StripTarget {
  const rows = stripRows(stops);
  const r = rows.findIndex((row) => row.some((s) => s.key === from));
  if (r < 0) return "hold";
  const here = rows[r].find((s) => s.key === from)!;
  if (dir === "left" || dir === "right") {
    const i = rows[r].indexOf(here) + (dir === "left" ? -1 : 1);
    return rows[r][i]?.key ?? "hold";
  }
  const next = rows[r + (dir === "up" ? -1 : 1)];
  if (!next) return dir === "up" ? "out-up" : "out-down";
  let best = next[0];
  for (const s of next) if (Math.abs(centreX(s) - centreX(here)) < Math.abs(centreX(best) - centreX(here))) best = s;
  return best.key;
}
