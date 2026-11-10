/**
 * Title: The Copy icon and a Strategy checklist, walked with the D-pad (plan 103 F1, part 1)
 * Purpose: Pin row P103-CHECKLIST-COPY-01 at the level the Deck check looks at, where Steam's ring is. On the Deck
 *          (workshop:test-evidence/plan103-P103-M-CHECKLIST.json, 3 of 3) Up from a checklist's step 1 landed on the
 *          Copy icon, and Down from the Copy icon skipped every step and landed on "Mark reply helpful". The real
 *          transcript (an answer with Copy in its corner, a checklist, the reply row) is drawn in the panel's page and
 *          pressed the way Steam calls it; a press no handler claims is Steam's own step to the stop drawn next, which
 *          is how the Copy icon came to be Steam's choice for Up from step 1.
 * Used for: buildAnswerCornerSlots.tsx (Down from Copy), liveTurnFocusGraph.ts (`focusDownFromAnswerCorner`,
 *           `focusUpFromStrategyChecklist`) and the transcript's checklist (`onMoveUpFromFirst`).
 * Solves: Down from Copy lands on the first choice button or step 1 when they are drawn; Up from step 1 lands on
 *         the last choice button, else the answer's last section, never on Copy; the steps walk both ways, with
 *         the panel's page holding the browser's focus and without it.
 * Does not: Scroll (the pane holds the whole turn; liveTurnFocusGraph.checklistWalk.test.ts walks with Steam's
 *           scroll modelled). Does not draw the summed-up note (a chat that summed itself up; its own tests).
 */
import { describe, expect, it, vi } from "vitest";

import { transcriptPanelEachTest, type TranscriptWalk } from "../../../test-harness/transcriptPanelWalk";
import { chatProps } from "../../../test-harness/earlierListTestKit";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/transcriptPanelWalk")).panelDeckyUi());

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "./MainTabChatTranscript";

const QUESTION = "how do I get from Dirtmouth down to the City of Tears";
const PARAGRAPH = (lead: string) => `${lead} ` + "The route runs on past the next few rooms and a bench. ".repeat(12);
const ANSWER = [PARAGRAPH("Head west out of the Crossroads."), PARAGRAPH("Drop through the Fungal Wastes.")].join("\n\n");
const STEP_1 = "Move West from Crossroads to Greenpath";
const STEPS = [STEP_1, "Take the lift down to the Wastes", "Ride the stag to the City"];
const COPY = "Copy reply text";
const HELPFUL = "Mark reply helpful";
const A = "A. Leaving the Forgotten Crossroads";
const B = "B. Exploring the Fungal Wastes";

/** A finished Strategy answer on the live turn, not yet rated, with its checklist (every step shown). */
function props(over: Partial<MainTabChatTranscriptProps>): MainTabChatTranscriptProps {
  return chatProps(
    {
      ollamaResponse: ANSWER,
      askThreadDisplayQuestion: QUESTION,
      lastExchange: { question: QUESTION, answer: ANSWER, askMode: "strategy" },
      onRetryLastResponse: () => {},
      liveReplyFeedbackRating: null,
      strategyChecklist: {
        title: "Navigating from Dirtmouth to the City of Tears",
        items: STEPS.map((label, i) => ({ id: `s${i + 1}`, label })),
        checkedIds: [],
        revealedIds: STEPS.map((_, i) => `s${i + 1}`),
      },
      onStrategyChecklistToggle: () => {},
      ...over,
    },
    [],
    "live",
  );
}

/** The choice menu, drawn together with the checklist: the case the Deck never put on screen (both at once). */
const WITH_CHOICES: Partial<MainTabChatTranscriptProps> = {
  strategyGuideBranches: {
    question: "Where are you at in Hollow Knight?",
    options: [
      { id: "a", label: "Leaving the Forgotten Crossroads" },
      { id: "b", label: "Exploring the Fungal Wastes" },
    ],
  },
  onStrategyBranchPick: () => {},
};

const panel = transcriptPanelEachTest();
/** The current test's panel page. */
const page = () => panel.page();

const STAMP = ".bonsai-answer-stop, .bonsai-chat-turn-row-body, .bonsai-chat-details-divider";
function stopName(el: HTMLElement): string | null {
  if (el.classList.contains("bonsai-answer-stop")) return `section ${el.getAttribute("data-bonsai-chunk-index")}`;
  if (el.classList.contains("bonsai-chat-turn-row-body")) return "question";
  if (el.classList.contains("bonsai-strategy-checklist-step")) {
    return el.textContent?.replace(/^✔/, "").trim().slice(0, 40) ?? null;
  }
  return null;
}
function draw(over: Partial<MainTabChatTranscriptProps> = {}): TranscriptWalk {
  return panel.draw(<MainTabChatTranscript {...props(over)} />, STAMP, stopName);
}
/** The answer's last section, by name, whatever number the cut gave it. */
function lastSection(s: TranscriptWalk): string {
  const sections = s.stops().map(s.nameOf).filter((n) => n.startsWith("section "));
  return sections[sections.length - 1]!;
}

describe.each([
  ["with the page's focus", true],
  ["with the page's focus gone", false],
])("P103-CHECKLIST-COPY-01, %s", (_label, focused) => {
  it("Down from the Copy icon lands on step 1, three times running", async () => {
    const s = draw();
    for (let i = 0; i < 3; i++) {
      s.put(COPY);
      page().setFocused(focused);
      await s.press("onMoveDown");
      expect(s.nameOf(page().ring())).toBe(STEP_1);
      expect(s.nameOf(page().active())).toBe(STEP_1);
      page().setFocused(true);
    }
  });

  it("Up from step 1 lands on the answer's last section, not on the Copy icon, three times running", async () => {
    const s = draw();
    for (let i = 0; i < 3; i++) {
      s.put(STEP_1);
      page().setFocused(focused);
      expect(await s.press("onMoveUp")).toBe("claimed");
      expect(s.nameOf(page().ring())).not.toBe(COPY);
      expect(s.nameOf(page().ring())).toBe(lastSection(s));
      page().setFocused(true);
    }
  });

  it("walks Up from Helpful through every step to the last section, and Down again to Helpful, no stop twice", async () => {
    const s = draw();
    s.put(HELPFUL);
    page().setFocused(focused);
    expect(await s.walk("onMoveUp", lastSection(s))).toEqual([HELPFUL, ...[...STEPS].reverse(), lastSection(s)]);
    expect(await s.walk("onMoveDown", HELPFUL)).toEqual([lastSection(s), ...STEPS, HELPFUL]);
  });

  it("with the choices drawn too: Down from Copy lands on A, Up from step 1 on the last choice, both walks mirror", async () => {
    const s = draw(WITH_CHOICES);
    s.put(COPY);
    page().setFocused(focused);
    await s.press("onMoveDown");
    expect(s.nameOf(page().ring())).toBe(A);

    page().setFocused(true);
    s.put(STEP_1);
    page().setFocused(focused);
    await s.press("onMoveUp");
    expect(s.nameOf(page().ring())).toBe(B);

    page().setFocused(true);
    s.put(HELPFUL);
    page().setFocused(focused);
    const up = await s.walk("onMoveUp", lastSection(s));
    expect(up).toEqual([HELPFUL, ...[...STEPS].reverse(), B, A, lastSection(s)]);
    expect(await s.walk("onMoveDown", HELPFUL)).toEqual([...up].reverse());
  });
});
