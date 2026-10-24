/**
 * Title: The "No close match" line is never taken off the screen
 * Purpose: Pin that an answer the back end saved with its "No close match in my notes" line shows
 *          that line, even when the answer's words echo an attached note and the gold notes block
 *          shows under it (plan 98, consult 1). The screen used to delete the line in that case
 *          (plan 87 K1), which hid the warning exactly when the AI had built an answer on a wrong
 *          note (the made-up "Bone Hydra" in Hades). The back end now adds the line only when the
 *          question names a thing no attached note mentions (plan 98 lane L), and a block and the
 *          line on the same reply is allowed (the maintainer's call, 2026-09-07). Every case is a
 *          real saved turn from the fixtures file the notes-block rule is tested on (question,
 *          answer and attached notes word for word), so the shape is the one the back end emits.
 * Used for: MainTabChatTranscript.tsx.
 * Does not: Decide whether the back end should add the line (that is kb_not_in_notes_notice.py)
 *           or judge an answer. It renders the transcript the way the Deck does and reads what is
 *           on the page.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { findSrcFile } from "../../../test-harness/repoPaths";
import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import type { KbAttachedNote } from "../../../types/inputTransparency";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

type Case = { why: string; question: string; answer: string; notes: Partial<KbAttachedNote>[] };

const fixtures = JSON.parse(
  readFileSync(findSrcFile("kbNoteUsedByAnswer.fixtures.json"), "utf-8")
) as Case[];

const LINE = "No close match in my notes";
/** The footer exactly as kb_not_in_notes_notice.py appends it (blank line, rule, italic line). */
const FOOTER = "\n\n—\n*No close match in my notes, this answer leans on the model's own knowledge.*";

function fixture(why: string): Case {
  const hit = fixtures.find((c) => c.why.startsWith(why));
  expect(hit, `no fixture starting "${why}"`).toBeTruthy();
  return hit!;
}

function archivedTurn(question: string, answer: string, notes: Partial<KbAttachedNote>[]): AskThreadCollapsedTurn {
  return {
    id: "t1",
    question,
    answer,
    transparency: {
      route: "ollama",
      success: true,
      context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
      overflow_skips: [],
      kb_attached_notes: notes as KbAttachedNote[],
    },
  };
}

function props(turn: AskThreadCollapsedTurn): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: [turn],
    expandedTurnKey: turn.id,
    askThreadDisplayQuestion: "",
    lastExchange: null,
  };
}

function screenOf(turn: AskThreadCollapsedTurn) {
  const { container } = render(<MainTabChatTranscript {...props(turn)} />);
  return {
    hasLine: (container.textContent ?? "").includes(LINE),
    hasBlock: container.querySelector(".bonsai-kb-notes-block") !== null,
    text: container.textContent ?? "",
  };
}

describe("a saved answer shows its No close match line, whatever the notes block shows", () => {
  it("answer echoes an attached note (shotgun answered from the Gravity Gun note): block and line both show", () => {
    const c = fixture("the shotgun question");
    expect(c.answer).toContain(LINE); // the saved answer really carries the footer
    const screen = screenOf(archivedTurn(c.question, c.answer, c.notes));
    expect(screen.hasBlock).toBe(true);
    expect(screen.hasLine).toBe(true);
  });

  it("answer named the boss the question only described (Broken Vessel): block and line both show", () => {
    const c = fixture("the boss past the crystal spike area");
    expect(c.answer).toContain(LINE);
    const screen = screenOf(archivedTurn(c.question, c.answer, c.notes));
    expect(screen.hasBlock).toBe(true);
    expect(screen.hasLine).toBe(true);
  });

  it("notes attached but none used (the 2026-10-08 Deck case): line stays, no block", () => {
    // Real Deep Rock Galactic: Survivor notes (the first fixture), the horse question from the
    // Deck evidence file, and the reply it described: no horses, then the footer.
    const drg = fixture("Driller upgrades");
    const question = "in deep rock galactic survivor how do I tame a horse";
    const answer = `There is nothing about horses in Deep Rock Galactic: Survivor, so I have no info on taming one.${FOOTER}`;
    const screen = screenOf(archivedTurn(question, answer, drg.notes));
    expect(screen.hasBlock).toBe(false);
    expect(screen.hasLine).toBe(true);
  });

  it("notes attached, none used, on the Half-Life horse reply: line stays, no block", () => {
    const c = fixture("taming a horse");
    const screen = screenOf(archivedTurn(c.question, c.answer, c.notes));
    expect(screen.hasBlock).toBe(false);
    expect(screen.hasLine).toBe(true);
  });

  it("a reply with no footer is untouched whatever the notes did", () => {
    const c = fixture("electrified water");
    expect(c.answer).not.toContain(LINE);
    const screen = screenOf(archivedTurn(c.question, c.answer, c.notes));
    expect(screen.hasBlock).toBe(true);
    expect(screen.hasLine).toBe(false);
    expect(screen.text).toContain(c.answer.split("\n")[0]!.slice(0, 20));
  });
});

describe("the newest answer (the live slot) shows the line the same way", () => {
  function liveScreen(question: string, answer: string, notes: Partial<KbAttachedNote>[]) {
    const { container } = render(
      <MainTabChatTranscript
        {...props(archivedTurn(question, answer, notes))}
        askThreadCollapsed={[]}
        expandedTurnKey="live"
        askThreadDisplayQuestion={question}
        ollamaResponse={answer}
        lastExchange={{ question, answer }}
        liveThinking={{ summary: null, reasoning: null, kbAttachedNotes: notes as KbAttachedNote[] }}
        transparencySnapshot={null}
      />
    );
    return {
      hasLine: (container.textContent ?? "").includes(LINE),
      hasBlock: container.querySelector(".bonsai-kb-notes-block") !== null,
    };
  }

  it("keeps the line on a finished answer that echoes a note, and the block shows too", () => {
    const c = fixture("the shotgun question");
    expect(liveScreen(c.question, c.answer, c.notes)).toEqual({ hasLine: true, hasBlock: true });
  });

  it("keeps the line on a finished answer that used none, and no block shows", () => {
    const c = fixture("taming a horse");
    expect(liveScreen(c.question, c.answer, c.notes)).toEqual({ hasLine: true, hasBlock: false });
  });
});
