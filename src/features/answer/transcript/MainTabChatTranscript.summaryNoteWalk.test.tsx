/**
 * Title: The summed-up note, walked with the D-pad while the panel's page may lack focus (plan 104 F1, part 3)
 * Purpose: Pin row P104-SUMMARY-NOTE-STOP-01 at the level the Deck check looks at, where Steam's ring is. The note
 *          under an answer that came right after the chat summed itself up ("The chat summed itself up before this
 *          answer. Press to read what it kept.") was a stop the plugin knew only by its element, so only a plain
 *          focus() reached it: with the panel's page out of the browser's focus that moves the page's focus and not
 *          Steam's ring, and Down from the answer's last section, Up from "Mark reply helpful" and Up from the first
 *          choice each claimed a press that moved nothing. Wave six's paths (Down from Copy, Up from a checklist's
 *          first step) passed over the note in that state instead. The note now has its own Steam nav node, the way
 *          "Show details" does, so every way onto it is Steam's transfer in both states.
 * Used for: buildChatSummaryNoteElement.tsx (the note's nav node), and the chains that reach it:
 *           buildAnswerBubbleElement.tsx, buildReplyActionsElement.tsx, MainTabChatTranscript.tsx (the choices'
 *           Up) and liveTurnFocusGraph.ts (Down from Copy, Up from step 1).
 * Solves: With the page's focus and without it: Down from the last section, Up from Helpful, Up from choice A and
 *         Down from Copy land on the note with Steam's ring and the page's focus together; the walk through it is
 *         bounded and visits no stop twice; A on the note, reached by the walk, opens Show details on the Session
 *         tab; B on it is left to Steam, as on every line of the answer. The page sends no focus events while it
 *         lacks focus, as on the Deck (transcriptPanelWalk.tsx).
 * Does not: Scroll (the pane holds the whole turn; nothing here depends on where the pane is). The block D0 Deck run
 *           could not put a summed-up note on screen (workshop:test-evidence/plan104-P104-M-SUMMARY-NOTE.json), so no
 *           Deck reading backs these numbers yet.
 */
import { describe, expect, it, vi } from "vitest";

import { transcriptPanelEachTest, type TranscriptWalk } from "../../../test-harness/transcriptPanelWalk";
import { chatProps } from "../../../test-harness/earlierListTestKit";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/transcriptPanelWalk")).panelDeckyUi());

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "./MainTabChatTranscript";

const QUESTION = "how do I beat the Mantis Lords";
const PARAGRAPH = (lead: string) => `${lead} ` + "Watch their lunges and jump the boomerangs as they come back. ".repeat(10);
const ANSWER = [PARAGRAPH("Fight them one at a time first."), PARAGRAPH("Then two at once in the second phase.")].join("\n\n");
const HELPFUL = "Mark reply helpful";
const COPY = "Copy reply text";
const A = "A. I keep dying to the first one";
const NOTE = "summed-up note";

/** The newest saved answer, right after the chat summed itself up: its summed-up note is drawn under it. */
const TURN: AskThreadCollapsedTurn = { id: "t-summed", question: QUESTION, answer: ANSWER, chatSummary: "written" };

function props(over: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
  return chatProps(
    { lastExchange: { question: QUESTION, answer: ANSWER, askMode: "strategy" }, liveReplyFeedbackRating: null, ...over },
    [TURN],
    TURN.id,
  );
}

const WITH_CHOICES: Partial<MainTabChatTranscriptProps> = {
  strategyGuideBranches: {
    question: "Which part gives you trouble?",
    options: [
      { id: "a", label: "I keep dying to the first one" },
      { id: "b", label: "The second phase is too fast" },
    ],
  },
  onStrategyBranchPick: () => {},
};

const panel = transcriptPanelEachTest();
/** The current test's panel page. */
const page = () => panel.page();

const STAMP = ".bonsai-answer-stop, .bonsai-chat-turn-row-body, .bonsai-chat-details-divider, .bonsai-chat-summary-note";
function stopName(el: HTMLElement): string | null {
  if (el.classList.contains("bonsai-chat-summary-note")) return NOTE;
  if (el.classList.contains("bonsai-answer-stop")) return `section ${el.getAttribute("data-bonsai-chunk-index")}`;
  if (el.classList.contains("bonsai-chat-turn-row-body")) return "question";
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
/** One press from `from` with the page in the test's focus state; the ring and the page's focus must agree after it. */
async function pressFrom(s: TranscriptWalk, from: string, key: "onMoveUp" | "onMoveDown", focused: boolean): Promise<string> {
  page().setFocused(true);
  s.put(from);
  page().setFocused(focused);
  expect(await s.press(key), `${key} from ${from}`).toBe("claimed");
  const ring = s.nameOf(page().ring());
  expect(s.nameOf(page().active()), `${key} from ${from}: the page's focus is not where the ring is`).toBe(ring);
  return ring;
}

describe.each([
  ["with the page's focus", true],
  ["with the page's focus gone", false],
])("P104-SUMMARY-NOTE-STOP-01, %s", (_label, focused) => {
  it("Down from the answer's last section lands on the summed-up note, three times running", async () => {
    const s = draw();
    for (let i = 0; i < 3; i++) expect(await pressFrom(s, lastSection(s), "onMoveDown", focused)).toBe(NOTE);
  });

  it("Up from Mark reply helpful lands on the summed-up note, three times running", async () => {
    const s = draw();
    for (let i = 0; i < 3; i++) expect(await pressFrom(s, HELPFUL, "onMoveUp", focused)).toBe(NOTE);
  });

  it("Down from the Copy icon lands on the summed-up note (wave six passed over it without the page's focus)", async () => {
    const s = draw();
    expect(await pressFrom(s, COPY, "onMoveDown", focused)).toBe(NOTE);
  });

  it("walks Up from Helpful through the note to the last section, and Down again to Helpful, no stop twice", async () => {
    const s = draw();
    s.put(HELPFUL);
    page().setFocused(focused);
    const up = await s.walk("onMoveUp", lastSection(s));
    expect(up).toEqual([HELPFUL, NOTE, lastSection(s)]);
    expect(await s.walk("onMoveDown", HELPFUL)).toEqual([...up].reverse());
  });

  it("with the choices drawn: Up from choice A lands on the note, and the walk through both mirrors", async () => {
    const s = draw(WITH_CHOICES);
    expect(await pressFrom(s, A, "onMoveUp", focused)).toBe(NOTE);
    page().setFocused(true);
    s.put(lastSection(s));
    page().setFocused(focused);
    const down = await s.walk("onMoveDown", A);
    expect(down).toEqual([lastSection(s), NOTE, A]);
    expect(await s.walk("onMoveUp", lastSection(s))).toEqual([...down].reverse());
  });

  it("A on the note, reached by a press, opens Show details on the Session tab; B is left to Steam", async () => {
    const s = draw();
    expect(await pressFrom(s, lastSection(s), "onMoveDown", focused)).toBe(NOTE);
    expect(await s.button("onCancelButton")).toBe(false);
    expect(s.nameOf(page().ring())).toBe(NOTE);
    expect(await s.button("onOKButton")).toBe(true);
    expect(page().host.querySelector(".bonsai-details-tab--active")?.textContent ?? "").toMatch(/^Session · /);
  });
});
