/**
 * Title: The first-time setup screen's fixed sizes, from the picked drawing
 *
 * Purpose: Every height on the popup's first screen that is not a line of words, and the sizes of the words that
 * are, in the numbers of the drawing the maintainer picked (board 5, tab 4, round 4 B, `t4-4B`, measured in the
 * built page on 2026-11-17: title 23, checklist 205, switch 40, buttons 32, beta line 14, gaps 6; 392 points with
 * the frame). The screen draws itself from these numbers, and the fit test adds them up against the room Steam
 * leaves a popup on the Deck's own screen (src/test-harness/deckPopupFit.ts: 403.5 points with the frame, so 351.5
 * for what the box draws): about 11 points to spare on Normal text, in a stand-in font.
 *
 * Used for: FirstRunWhereAiRunsModal.tsx, firstRunChecklist.tsx, FirstRunDownloadsSwitch.tsx, and the fit test
 * (FirstRunWhereAiRunsModal.fit.test.tsx).
 *
 * Solves: The drawing has very little room to spare once Steam's popup layer is counted, so a row drawn a few
 * points taller (Steam's own switch is taller than the drawn one) would push the title under Steam's top bar. Fixed
 * row heights in one place keep the screen and its test reading the same numbers.
 *
 * Does not: Measure the real box in Steam's font; the Deck driver does that before the change counts as done.
 */
export const FIRST_RUN_BOX = {
  /** The width the words have inside the box, from the drawing (658 less its 41-point sides; 574 measured). */
  contentWidthPx: 574,
  /** The gap between the screen's five parts. */
  gapPx: 6,
  /** The title: one line of 16-point words at 1.45. */
  titlePx: 16,
  titleLineHeight: 1.45,
  /** The checklist: a 1-point rule on top, its header (6 above, 2 below, 16 tall), then five rows of 36. */
  checklistRulePx: 1,
  headMarginTopPx: 6,
  headMarginBottomPx: 2,
  headHeightPx: 16,
  rowHeightPx: 36,
  rows: 5,
  /** The Internet downloads switch, as drawn (Steam's own switch row is taller). */
  switchHeightPx: 40,
  /** The three buttons: 32 tall, 2 below the switch's gap. */
  footMarginTopPx: 2,
  footHeightPx: 32,
  /** The beta line: one line of 10.5-point words at 1.35. */
  betaPx: 10.5,
  betaLineHeight: 1.35,
} as const;
