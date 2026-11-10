/**
 * Title: Copy, the checklist and the answer above it, walked with Steam's scroll modelled (plan 103 F1, part 1)
 * Purpose: The walk half of row P103-CHECKLIST-COPY-01 in the Deck's own numbers (deckAnswerWalk.ts): the pane
 *          from y 88 with the dock at 290 or 262, Steam's glide after every landing under each modelled rule, the
 *          plugin's lift off the dock. On the Deck (workshop:test-evidence/plan103-P103-M-CHECKLIST.json) Down from
 *          the Copy icon skipped the steps and Up from step 1 went to Copy. Here Down from Copy must land on step 1
 *          wholly on screen; Up from step 1 must land in the answer, never on Copy, showing the edge it is entered
 *          by; and the walk Up through the answer and back Down must end on step 1 again, no stop twice each way.
 * Used for: liveTurnFocusGraph.ts (`focusDownFromAnswerCorner`, `focusUpFromStrategyChecklist`,
 *           `focusDownFromLiveAnswerBubble`) and strategyChecklistNav.ts (the steps' own nav nodes).
 * Does not: Draw the transcript or the choice buttons (MainTabChatTranscript.checklistCopyWalk.test.tsx walks the real
 *           screen, with the page's focus and without it). Each step's nav node here lands the ring the way Steam's
 *           transfer does, followed by Steam's glide.
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  SOUL_SANCTUM,
  TALL_348,
  TALL_348_BETWEEN,
  THREE_BOXES,
  WALK_DOCKS,
  WALK_RULES,
  fullyVisible,
  resetDeckAnswerWalk,
  shapedAnswer,
  walkAnswer,
  type AnswerShape,
  type SteamScrollRule,
} from "../../test-harness/deckAnswerWalk";
import { focusDownFromAnswerCorner, focusDownFromLiveAnswerBubble, focusUpFromStrategyChecklist } from "./liveTurnFocusGraph";
import { resetStrategyChecklistNavForTests, setStrategyChecklistStepCount, strategyChecklistStepNav } from "./strategyChecklistNav";
import { REPLY_STOP_ORDER, registerReplyStop, setReplyStopUnavailable } from "./replyStopRegistry";

/** The key deckAnswerWalk.ts registers its answer under. */
const ANSWER_KEY = "turn-1";
const STEP_COUNT = 3;
const STEP_PX = 32;
const STEP_GAP_PX = 4;
/** From the last section's bottom to step 1's top: the bubble's frame and gap, the list's title and its note. */
const LIST_HEAD_PX = 89;

beforeEach(() => {
  resetDeckAnswerWalk();
  resetStrategyChecklistNavForTests();
  for (const id of REPLY_STOP_ORDER) {
    registerReplyStop(id, null);
    setReplyStopUnavailable(id, false);
  }
});

/** The answer, its Copy icon in the bubble's corner, and the checklist's steps under it, each with its nav node. */
function answerWithChecklist(shape: AnswerShape, rule: SteamScrollRule | undefined, dockTop: number) {
  /* Steam's top-margin model stays off, as in the other answer walks: with it on, the answer's own Up entry
     (the same call Up from Helpful makes) is the known dock-262 "padded" gap deckAnswerWalk.ts describes. */
  const a = shapedAnswer(shape, rule, dockTop);
  const end = shape.sections[shape.sections.length - 1]![1];
  const copy = a.control([end - 14, end + 6]);
  const steps = Array.from({ length: STEP_COUNT }, (_, i) => {
    const top = end + LIST_HEAD_PX + i * (STEP_PX + STEP_GAP_PX);
    const el = a.control([top, top + STEP_PX]);
    strategyChecklistStepNav(i).current = {
      TakeFocus: () => {
        a.land(el);
        return true;
      },
    };
    return el;
  });
  setStrategyChecklistStepCount(STEP_COUNT);
  const name = (el: Element | null) => (el === copy ? "copy" : steps.includes(el as HTMLElement) ? `step${steps.indexOf(el as HTMLElement) + 1}` : a.label(el));
  /** The ring on Copy, reached by Right from the last section with the answer's end on screen. */
  const ringOnCopy = () => {
    a.pane.scrollTop = Math.max(0, end - dockTop + 8);
    a.land(copy);
  };
  return { ...a, copy, steps, name, ringOnCopy };
}

describe.each([
  ["Soul Sanctum", SOUL_SANCTUM],
  ["three boxes", THREE_BOXES],
  ["a tall section between two short ones", TALL_348_BETWEEN],
  ["one section taller than the screen", TALL_348],
])("Copy and a checklist under the %s answer", (_label, shape) => {
  describe.each(WALK_DOCKS)("dock at y %i", (dockTop) => {
    describe.each(WALK_RULES)("Steam scroll rule: %s", (rule) => {
      it("Down from Copy lands on step 1, wholly on screen", () => {
        const a = answerWithChecklist(shape, rule, dockTop);
        a.ringOnCopy();

        expect(focusDownFromAnswerCorner(null)).toBe(true);

        expect(a.name(document.activeElement)).toBe("step1");
        expect(fullyVisible(a, a.steps[0]!, "down"), `step 1 at ${a.top(a.steps[0]!)}..${a.bottom(a.steps[0]!)}`).toBe(true);
      });

      it("Up from step 1 lands in the answer, never on Copy; up through it and back down ends on step 1 again", () => {
        const a = answerWithChecklist(shape, rule, dockTop);
        a.ringOnCopy();
        focusDownFromAnswerCorner(null);

        expect(focusUpFromStrategyChecklist(null, ANSWER_KEY)).toBe(true);
        a.settle();
        const entry = document.activeElement as HTMLElement;
        expect(a.name(entry)).not.toBe("copy");
        expect(a.name(entry)).toMatch(/^(section|cover)\d$/);
        expect(fullyVisible(a, entry, "up"), `${a.name(entry)} at ${a.top(entry)}..${a.bottom(entry)}`).toBe(true);

        const up = walkAnswer(a, "up");
        const down = walkAnswer(a, "down");
        expect(up.yielded && down.yielded).toBe(true);
        expect([...up.problems, ...down.problems]).toEqual([]);
        expect(new Set(up.stops).size).toBe(up.stops.length);
        expect(down.stops).toEqual([...up.stops].reverse());

        /* The answer has nothing left below: the bubble's own Down goes on to the list. */
        expect(focusDownFromLiveAnswerBubble(null)).toBe(true);
        expect(a.name(document.activeElement)).toBe("step1");
        expect(fullyVisible(a, a.steps[0]!, "down")).toBe(true);
        expect([...up.stops, ...down.stops]).not.toContain("copy");
      });
    });
  });
});
