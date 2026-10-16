/**
 * Title: Glossary words are asked for when a question appears
 * Purpose: Pin that the transcript asks the knowledge library for the tap-to-define words of every game
 *          it draws (the running one and each earlier turn's), once each, before any answer streams in,
 *          and that an earlier answer then shows the words underlined.
 * Used for: MainTabChatTranscript's glossary effect, glossaryStore and the reply renderer together.
 * Solves: The words are no longer built in. The first words to arrive redraw an answer's paragraphs, and a
 *         redraw during the reveal closes an opened spoiler cover, so the ask must start with the question.
 * Does not: Check the back end's answer (tests/test_knowledge_base_glossary.py does).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import { TEST_GLOSSARY_APP_ID, TEST_GLOSSARY_TERMS, clearGlossary } from "../test-harness/glossaryTestTerms";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));
vi.mock("../utils/deckyCall", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/deckyCall")>()),
  callDeckyWithTimeout: vi.fn(),
}));

const rpc = vi.mocked(callDeckyWithTimeout);

function baseProps(overrides: Partial<MainTabChatTranscriptProps>): MainTabChatTranscriptProps {
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
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "",
    lastExchange: null,
    ...overrides,
  };
}

const answerWithAWord = (appId: string, id: string): AskThreadCollapsedTurn => ({
  id,
  question: "how do I stay alive",
  answer: "Mining is not a side activity, so a run spent only kiting ends underpowered.",
  appId,
});

const glossaryCalls = () => rpc.mock.calls.filter(([method]) => method === "get_rag_corpus_glossary");

beforeEach(() => {
  clearGlossary();
  rpc.mockReset();
  rpc.mockResolvedValue({
    ok: true,
    installed: true,
    game_title: "Deep Rock Galactic: Survivor",
    terms: TEST_GLOSSARY_TERMS.map((t) => ({ id: t.id, term: t.term, alt_forms: t.altForms, peek: t.peek, full: t.full })),
    reason: "",
  });
});

afterEach(() => {
  clearGlossary();
});

describe("glossary words asked for by the transcript", () => {
  it("asks for the words of every game drawn, once each", async () => {
    const turns = [
      answerWithAWord(TEST_GLOSSARY_APP_ID, "t1"),
      answerWithAWord(TEST_GLOSSARY_APP_ID, "t2"),
      answerWithAWord("570", "t3"),
    ];
    const props = baseProps({
      askThreadCollapsed: turns,
      expandedTurnKey: "t1",
      ollamaContext: { app_id: "1145360" } as MainTabChatTranscriptProps["ollamaContext"],
    });
    const { rerender } = render(<MainTabChatTranscript {...props} />);
    await act(async () => {});
    rerender(<MainTabChatTranscript {...props} />);
    await act(async () => {});
    expect(glossaryCalls().map(([, args]) => (args as string[])[0]).sort()).toEqual(["1145360", "2321470", "570"]);
  });

  it("underlines the library's words in an earlier answer once they arrive", async () => {
    const turn = answerWithAWord(TEST_GLOSSARY_APP_ID, "t1");
    const { container } = render(
      <MainTabChatTranscript {...baseProps({ askThreadCollapsed: [turn], expandedTurnKey: "t1" })} />
    );
    await act(async () => {});
    expect(container.querySelector(".bonsai-drg-glossary-term")?.textContent).toBe("kiting");
  });

  it("leaves the same answer plain for a game whose library has no words", async () => {
    rpc.mockResolvedValue({ ok: true, installed: true, game_title: "Dota 2", terms: [], reason: "" });
    const turn = answerWithAWord("570", "t1");
    const { container } = render(
      <MainTabChatTranscript {...baseProps({ askThreadCollapsed: [turn], expandedTurnKey: "t1" })} />
    );
    await act(async () => {});
    expect(container.textContent).toContain("kiting");
    expect(container.querySelector(".bonsai-drg-glossary-term")).toBeNull();
  });
});
