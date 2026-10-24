/**
 * Title: The transcript hands each answer's notes to the "the note was wrong" reasons (plan 98)
 * Purpose: Pin the wiring the walk tests cannot see: in the real transcript, after Not really, Wrong tip,
 *          Outdated and Wrong edition appear when the answer used a note that carries the library's id, both on a
 *          finished answer read from its saved snapshot and on the live answer read from the poll's notes, and
 *          they stay away when the note carries no id (a chat saved before plan 98). A tag shows in the open notes
 *          block for a note the back end says is marked.
 * Used for: MainTabChatTranscript.tsx, useReplyDemote.ts, buildReplyActionsElement.tsx, kbDemoteRows.tsx.
 * Does not: Walk the D-pad (buildReplyActionsElement.demote.test.tsx does) or check the back end's ids.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import type { KbAttachedNote } from "../../../types/inputTransparency";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

const QUESTION = "how do i beat the glyphid dreadnought";
const ANSWER = "Aim for the glowing abdomen plates during its burrowing phase, then dodge the acid spray.";

const note = (over: Partial<KbAttachedNote> = {}): KbAttachedNote => ({
  name: "Glyphid Dreadnought",
  kind: "boss",
  card: "Summary: aim for the glowing abdomen plates during the burrowing phase; dodge the acid spray.",
  trust_tier: "seed",
  source_host: "",
  source_license: "",
  domain: "strategy",
  game_title: "Deep Rock Galactic: Survivor",
  section_id: 41,
  ...over,
});

function baseProps(over: Record<string, unknown>): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {},
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadDisplayQuestion: "",
    lastExchange: { question: QUESTION, answer: ANSWER },
    lastRequestId: 5,
    liveReplyFeedbackRating: "down",
    onReplyFeedback: () => {},
    onReplyMicroAction: () => {},
    ...over,
  } as unknown as MainTabChatTranscriptProps;
}

/** A finished answer, read from its saved snapshot (the newest turn in the chat). */
function savedAnswer(notes: KbAttachedNote[]) {
  const turn: AskThreadCollapsedTurn = {
    id: "t1",
    question: QUESTION,
    answer: ANSWER,
    transparency: { route: "ollama", success: true, context_chips: [], overflow_skips: [], kb_attached_notes: notes },
  };
  return render(<MainTabChatTranscript {...baseProps({ askThreadCollapsed: [turn], expandedTurnKey: turn.id })} />).container;
}

/** The answer that just finished, its notes still the ones the poll carried (no snapshot fetched yet). */
function liveAnswer(notes: KbAttachedNote[]) {
  return render(
    <MainTabChatTranscript
      {...baseProps({
        askThreadCollapsed: [],
        expandedTurnKey: "live",
        askThreadDisplayQuestion: QUESTION,
        ollamaResponse: ANSWER,
        liveThinking: { kbAttachedNotes: notes },
        transparencySnapshot: null,
      })}
    />,
  ).container;
}

const reasons = (c: HTMLElement) => [...c.querySelectorAll(".bonsai-kb-demote-chip")].map((e) => e.textContent);

describe("the transcript offers the three reasons for the notes the answer used", () => {
  it("on a finished answer whose saved notes carry the library's id", () => {
    expect(reasons(savedAnswer([note()]))).toEqual(["Wrong tip", "Outdated", "Wrong edition"]);
  });

  it("on the live answer whose polled notes carry the library's id", () => {
    expect(reasons(liveAnswer([note()]))).toEqual(["Wrong tip", "Outdated", "Wrong edition"]);
  });

  it("not on an answer whose notes carry no id (saved before plan 98), live or saved", () => {
    expect(reasons(savedAnswer([note({ section_id: undefined })]))).toEqual([]);
    expect(reasons(liveAnswer([note({ section_id: 0 })]))).toEqual([]);
  });
});
