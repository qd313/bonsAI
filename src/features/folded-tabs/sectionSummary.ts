/**
 * Title: A folded section's one-line summary
 *
 * Purpose: The short line of current values a folded section shows beside its name, so a person can
 * read what a section is set to without opening it ("Balanced · Thinking: Off · Terse mode off" beside
 * "Reply style"). One pure function from the section's rows to that line.
 *
 * Used for: FoldedSection's line, on the Ollama tab now and the Settings and Developer tabs next
 * (plan 91 § 2b and § 3b).
 *
 * Solves: Three tabs folding their sections, each needing the same rule. Written once, the rule
 * cannot drift between tabs: a choice or a slider shows "Label: value", the label dropped when it is
 * the section's own name; one or two switches show "Label on" or "Label off"; three or more switches
 * show "2 of 4 on"; buttons add nothing; the pieces are joined with " · ".
 *
 * Does not: Read any setting itself, or decide what a row is called: the tab hands in each row's
 * kind, label and value as it draws them. Does not shorten the line: the stylesheet cuts it off with
 * an ellipsis when the panel is too narrow.
 *
 * Gotchas: The order is the drawing's (docs/demos/mockup-board-2/src/44-tabs.js, `sectionSummary`):
 * the choices and sliders first, in row order, then the switches. Plan 91's own example sentence
 * ("Reply style · Balanced · Terse mode off · Thinking: Off") lists the Reply style rows in row order
 * instead; the plan says the drawing wins where the two disagree.
 */

/** One row of a section, as far as its summary needs it. */
export type SummaryRow =
  | { kind: "switch"; label: string; on: boolean }
  | { kind: "choice" | "slider"; label: string; value: string }
  | { kind: "button"; label: string };

/** The separator between the summary's pieces. */
const SUMMARY_SEPARATOR = " · ";

/** From this many switches up, the switches are counted ("2 of 4 on") instead of named. */
const SWITCHES_COUNTED_FROM = 3;

/** The summary for a section named `sectionName` holding `rows`; "" when nothing in it has a value to show. */
export function summarizeSection(sectionName: string, rows: readonly SummaryRow[]): string {
  const own = (label: string) => label.trim().toLowerCase() === sectionName.trim().toLowerCase();
  const pieces: string[] = [];
  for (const row of rows) {
    if (row.kind === "choice" || row.kind === "slider") {
      pieces.push(own(row.label) ? row.value : `${row.label}: ${row.value}`);
    }
  }
  const switches = rows.filter((r): r is Extract<SummaryRow, { kind: "switch" }> => r.kind === "switch");
  if (switches.length >= SWITCHES_COUNTED_FROM) {
    pieces.push(`${switches.filter((s) => s.on).length} of ${switches.length} on`);
  } else {
    for (const s of switches) {
      const state = s.on ? "on" : "off";
      pieces.push(own(s.label) ? state : `${s.label} ${state}`);
    }
  }
  return pieces.join(SUMMARY_SEPARATOR);
}
