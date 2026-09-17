/**
 * Title: Thinking row description text
 * Purpose: Pin the four help-text lines shown under the Thinking row, which now say that
 *          reasoning shows on screen as it happens (plan 57), not just that it happens.
 * Used for: plan 57 step 2 (lane B).
 * Solves: Nothing pinned this wording, so a later edit could quietly drop "shown on screen as
 *         it happens" -- the one line telling a person what actually changed for them.
 */
import { describe, expect, it } from "vitest";

import { ASK_THINK_EFFORT_DESCRIPTIONS } from "./askThinkEffort";

describe("ASK_THINK_EFFORT_DESCRIPTIONS", () => {
  it("reads as plan 57 expects", () => {
    expect(ASK_THINK_EFFORT_DESCRIPTIONS.off).toBe("Answer straight away. Fastest.");
    expect(ASK_THINK_EFFORT_DESCRIPTIONS.low).toBe(
      "A moment of reasoning first, shown on screen as it happens."
    );
    expect(ASK_THINK_EFFORT_DESCRIPTIONS.medium).toBe(
      "More reasoning on harder questions, shown on screen as it happens."
    );
    expect(ASK_THINK_EFFORT_DESCRIPTIONS.high).toBe(
      "Most reasoning, shown on screen as it happens. Noticeably slower on a Deck."
    );
  });
});
