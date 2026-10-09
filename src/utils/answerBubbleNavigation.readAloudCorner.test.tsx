/**
 * Title: Read aloud in the answer's corner is fully on screen when the ring lands on it (P84-READ-01)
 * Purpose: Pin plan 84 step 3's "on a long answer, the ring on Read aloud must be fully visible". The
 *          speaker sits in the bubble's lower-left corner, below the last section and often below the
 *          dock once the answer has been read to its end. Steam glides to a stop that takes the ring,
 *          then the plugin's own lift (useDockClearanceOnFocus.ts, liftForFocus) moves anything that is
 *          still behind the dock; the lift leaves only an answer's SECTIONS alone. Copy has always
 *          been scrolled into view that way. This pins that the speaker is treated exactly like Copy.
 * Used for: buildAnswerBubbleElement.tsx's corner slot; useDockClearanceOnFocus.ts's decision.
 * Does not: Prove it on the Deck (that is the plan's P84-READ-01 row). The corner is a pair of boxes
 *           drawn where the bubble's bottom strip is, because jsdom has no layout; the class check
 *           below is what ties them to the real element.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { buildAnswerBubbleElement } from "./buildAnswerBubbleElement";
import { WALK_RULES, SOUL_SANCTUM, deckAnswer, resetDeckAnswerWalk } from "../test-harness/deckAnswerWalk";
import { liftForFocus } from "../hooks/useDockClearanceOnFocus";

beforeEach(resetDeckAnswerWalk);
afterEach(() => cleanup());

describe("the corner icons are lifted like Copy, not left to the answer's own walk", () => {
  it("neither the speaker nor its slot carries a class the lift leaves alone", () => {
    const el = buildAnswerBubbleElement({
      body: "One short paragraph.",
      streaming: false,
      spoilerMaskingEnabled: true,
      maxWidthCss: "100%",
      answerKey: "live",
      getAnswerCopyText: () => "text",
      onReadAloudToggle: () => undefined,
    })!;
    const { container } = render(el);
    const speaker = container.querySelector<HTMLElement>(".bonsai-reply-read-aloud-corner")!;
    const copy = container.querySelector<HTMLElement>(".bonsai-reply-copy-corner")!;
    for (const node of [speaker, copy]) {
      /* liftForFocus skips these two classes and no others: the answer's sections, the open reasoning block. */
      expect(node.classList.contains("bonsai-answer-stop")).toBe(false);
      expect(node.classList.contains("bonsai-chat-reasoning-block")).toBe(false);
    }
    /* A detached element has no pane, so the lift reports it did nothing rather than throwing. */
    expect(liftForFocus(speaker)).toBe(liftForFocus(copy));
  });
});

describe.each(WALK_RULES)("a long answer read to its end, Steam scroll rule: %s", (rule) => {
  /*
   * The Soul Sanctum answer in the Deck's numbers (four sections, 265 to 790 on the page). The bubble
   * ends 9 px below the last section; both icons sit 4 px above its bottom edge, 20 tall, so they are
   * the lowest boxes of the answer, well behind the dock (290) once the walk has reached the last section.
   */
  const CORNER: [number, number] = [790 + 9 - 4 - 20, 790 + 9 - 4];

  function walkToTheCorner() {
    const a = deckAnswer(SOUL_SANCTUM.sections, SOUL_SANCTUM.start, rule, { steamTopMargin: rule !== undefined });
    const read = a.control(CORNER);
    const copy = a.control(CORNER);
    a.enterFromAbove();
    for (let i = 0; i < 40 && a.down(); i++) {
      /* the answer's own walk, until it has nothing left to read */
    }
    return { a, read, copy };
  }

  it("lands the speaker wholly between the header and the dock, as Copy does", () => {
    const { a, read, copy } = walkToTheCorner();
    a.land(read);
    expect(a.top(read), "speaker top under the header").toBeGreaterThanOrEqual(a.paneTop);
    expect(a.bottom(read), "speaker bottom above the dock").toBeLessThanOrEqual(a.dockTop + 4);
    a.land(copy);
    expect(a.top(copy)).toBeGreaterThanOrEqual(a.paneTop);
    expect(a.bottom(copy)).toBeLessThanOrEqual(a.dockTop + 4);
  });

  it("walking Right to Copy and Left back lands each wholly on screen, and none is landed twice going right", () => {
    const { a, read, copy } = walkToTheCorner();
    const visited: HTMLElement[] = [];
    for (const el of [read, copy, read]) {
      a.land(el);
      expect(a.top(el)).toBeGreaterThanOrEqual(a.paneTop);
      expect(a.bottom(el)).toBeLessThanOrEqual(a.dockTop + 4);
      visited.push(el);
    }
    expect(new Set(visited.slice(0, 2)).size).toBe(2);
  });
});

describe("with Steam leaving the pane where it is, the plugin's own lift brings the icons clear of the dock", () => {
  /* Pane at the top of a long answer, the corner far below the dock: the lift is the only thing that
     can move it (the shape of the Deck's own landings on the controls under an answer, plan 81 K3). */
  const CORNER: [number, number] = [790 + 9 - 4 - 20, 790 + 9 - 4];

  it("lifts the speaker, then Copy, to just above the dock", () => {
    const a = deckAnswer(SOUL_SANCTUM.sections, 0, undefined, {});
    const read = a.control(CORNER);
    const copy = a.control(CORNER);
    expect(a.bottom(read), "hidden before the ring lands").toBeGreaterThan(a.dockTop);
    a.land(read);
    expect(a.bottom(read)).toBeLessThanOrEqual(a.dockTop - 4);
    expect(a.top(read)).toBeGreaterThanOrEqual(a.paneTop);
    a.land(copy);
    expect(a.bottom(copy)).toBeLessThanOrEqual(a.dockTop - 4);
  });
});

/* React import kept so the JSX transform has it under any test config. */
void React;
