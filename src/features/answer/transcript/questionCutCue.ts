/**
 * Title: Is a closed question cut short? (the ring's fade)
 *
 * Purpose: A closed question shows one line, ending in three dots when it does not fit. Plan 105 (lane A5,
 * the maintainer's pick of 2026-09-05, option A) lets the controller ring on such a question swap those dots
 * for a soft fade at the right-hand edge, so the player sees "there is more, A opens it" and a finger sees
 * nothing. CSS alone cannot tell a cut question from one that fits (a fade on a short question would read as
 * more to read, the bug an earlier fix removed), so the title is measured here, once, when the ring lands, and
 * the answer is left on the title as a data attribute the stylesheet keys on.
 *
 * Used for: buildTurnHeaderElement.tsx (the focus handlers of a closed header) and the one rule that reads
 * the attribute in questionBubble.ts.
 *
 * Solves: Measuring on focus, not on every render, keeps layout reads off the streaming path (the same cost
 * useTitleOverflow.ts documents). The attribute is set on the DOM node directly, never through React state or
 * the header's class: Steam writes its own `gpfocus` marker into the header's class attribute, and a React
 * re-render that rewrote the class would wipe the ring.
 *
 * Does not: Draw anything. Does not touch an OPEN question, whose five-line cap keeps its own bottom fade.
 */

/** The attribute the stylesheet reads. Present only while the ring is on a closed, cut question. */
const QUESTION_CUT_ATTRIBUTE = "data-bonsai-cut";

/**
 * In: the closed question's title span.
 * Out: true when its text is cut: wider than its one-line box (the browser's own dots), or ending in the
 * ellipsis the code wrote itself when it cut the question at 60 letters (chatTurnTitle.ts) and the dots
 * happened to fit.
 * Can go wrong: nothing; a title with no layout (a detached node) reads as not cut.
 */
function isQuestionTitleCut(title: HTMLElement): boolean {
  if (title.scrollWidth - title.clientWidth > 1) return true;
  return (title.textContent ?? "").trimEnd().endsWith("…");
}

/** The ring landed on a closed question: remember whether its title is cut. */
export function markQuestionCut(title: HTMLElement | null): void {
  if (!title) return;
  if (isQuestionTitleCut(title)) title.setAttribute(QUESTION_CUT_ATTRIBUTE, "true");
  else title.removeAttribute(QUESTION_CUT_ATTRIBUTE);
}

/** The ring left the question: forget it. */
export function clearQuestionCut(title: HTMLElement | null): void {
  title?.removeAttribute(QUESTION_CUT_ATTRIBUTE);
}
