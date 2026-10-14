/**
 * Title: Up from the rating row onto a last section that holds a spoiler cover ends clear of the dock
 *
 * Purpose: Pin plan 93's free-play finding (docs/test-evidence/plan93-QA-FREE-PLAY-01-before.json and its
 * picture): on the Deck's own screen, Down to "Mark reply helpful" and Up once put the ring on the answer's
 * last section (109 px, a spoiler cover at its top and a paragraph under it) at y 240 to 349 with the dock
 * at 330: its last line wholly under the dock, the one before cut by 5 px.
 *
 * Used for: the entry from below (`focusLastAnswerChunk`) and the Up step into a section with a cover
 * (`stepUpIntoSection`, answerBubbleCoverUp.ts).
 *
 * Solves: the walk placed the section as it landed, but Steam glides the whole answer a moment later (its
 * bottom 80 px above the pane's bottom, `steamBubbleGlide`), and for a section holding a cover nothing put
 * it back: the after-glide passes ran only for a section with no cover (`settleBoxGoingUp`).
 *
 * Does not: model the dock's own contents; the dock top is the Deck's 330, a status note under the question
 * box having made the dock taller than the 348 of the night before.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DECK_SCREEN,
  GEO_ANSWER,
  WALK_RULES,
  resetDeckAnswerWalk,
  shapedAnswer,
  steamBubbleGlide,
} from "../test-harness/deckAnswerWalk";

beforeEach(() => {
  resetDeckAnswerWalk();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** The dock's top in the free-play run (details slot from y 331). */
const DOCK_TOP = 330;
/** The pane's scroll position with the ring on "Mark reply helpful" in that run. */
const ON_HELPFUL = 1281;

describe.each(WALK_RULES)("Up from the rating row on the Deck's own screen, Steam scroll rule: %s", (rule) => {
  it("the last section ends at or above the dock once Steam's glide is over, its top still on screen", () => {
    const a = shapedAnswer(GEO_ANSWER, rule, DOCK_TOP, DECK_SCREEN);
    const last = a.stops[6]!;
    a.pane.scrollTop = ON_HELPFUL;

    expect(a.enterFromBelow()).toBe(true);
    expect(a.label(document.activeElement)).toBe("section7"); // its box first: text runs on under its cover
    steamBubbleGlide(a.bubble, a.pane, DECK_SCREEN.paneTop, DECK_SCREEN.paneBottom);
    vi.advanceTimersByTime(1000);

    expect(a.bottom(last)).toBeLessThanOrEqual(DOCK_TOP);
    expect(a.top(last)).toBeGreaterThanOrEqual(DECK_SCREEN.paneTop);

    // The walk Up goes on as before: the cover at the section's top, then the section above.
    expect(a.up()).toBe(true);
    expect(a.label(document.activeElement)).toBe("cover3");
    expect(a.up()).toBe(true);
    expect(a.label(document.activeElement)).toBe("section6");
  });

  it("Up inside the answer onto a section with a cover is put back the same way after a glide", () => {
    const a = shapedAnswer(GEO_ANSWER, rule, DOCK_TOP, DECK_SCREEN);
    const sixth = a.stops[5]!;
    a.pane.scrollTop = ON_HELPFUL;
    a.enterFromBelow();
    vi.advanceTimersByTime(1000);
    a.up(); // cover 3
    vi.advanceTimersByTime(1000);

    expect(a.up()).toBe(true);
    expect(a.label(document.activeElement)).toBe("section6");
    // Whatever glide comes after, under the dock by a line: the after-glide pass lifts it back.
    a.pane.scrollTop -= Math.max(0, DOCK_TOP + 20 - a.bottom(sixth));
    vi.advanceTimersByTime(1000);

    expect(a.bottom(sixth)).toBeLessThanOrEqual(DOCK_TOP + 4);
    expect(a.top(sixth)).toBeGreaterThanOrEqual(DECK_SCREEN.paneTop - 1);
  });
});
