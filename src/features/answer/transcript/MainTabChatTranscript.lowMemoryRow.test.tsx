/**
 * Title: "Ask anyway" under the low-memory warning (plan 104 G1)
 * Purpose: Pin roadmap row P104-MEMORY-01 at the level the Deck check looks at: the warning the back end gives
 *          instead of an answer has an "Ask anyway" row under it; pressing it arms the back end's one-shot and then
 *          sends the same question again, in that order; and the row is a D-pad stop that Steam's ring reaches and
 *          leaves, with the panel's page holding the browser's focus and without it, hearing A and B.
 * Used for: MainTabChatTranscript.tsx, ChatTranscriptHintRows.tsx and lowMemoryNotice.ts, the real transcript drawn
 *           into the panel's page (transcriptPanelWalk.tsx) and pressed the way Steam calls it.
 * Solves: Without the row the button text is missing and nothing arms the one-shot -- every check below fails on the
 *         old code. The row borrows the "Open the Ollama tab" row's Steam node, so its chain is the same one.
 * Does not: Prove the real Deck sends the second question through the ordinary path (the Deck check: P104-MEMORY-01
 *           presses nothing; "Ask anyway" itself is pressed once with a light game and the limit raised).
 */
import { describe, expect, it, vi } from "vitest";

import { dockChipsStop, transcriptPanelEachTest, type TranscriptWalk } from "../../../test-harness/transcriptPanelWalk";
import { chatProps } from "../../../test-harness/earlierListTestKit";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { registerNavFocus } from "../../../shared/dpad/navFocusRegistry";

vi.mock("@decky/ui", async () => (await import("../../../test-harness/transcriptPanelWalk")).panelDeckyUi());

import { MainTabChatTranscript, type MainTabChatTranscriptProps } from "./MainTabChatTranscript";

const QUESTION = "What is the first boss in God of War";
const WARNING =
  "Not enough free memory to start the AI. The Deck has about 3,500 MB free and the AI needs about 5,800 MB, so loading it would use more than is free (bonsAI keeps at least 2,000 MB back). To make room, close the game, pick a smaller model on the Ollama tab, or use the AI on a PC. Asking anyway may freeze the Deck.";
const ASK_ANYWAY = "Ask anyway";
const DOCK = "suggestion chips";

const panel = transcriptPanelEachTest();
const page = () => panel.page();

function props(over: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
  return chatProps(
    {
      ollamaResponse: WARNING,
      askThreadDisplayQuestion: QUESTION,
      lastExchange: { question: QUESTION, answer: WARNING },
      liveReplyFeedbackRating: null,
      onRetryLastResponse: () => {},
      ...over,
    },
    [],
    "live",
  );
}

const STAMP = ".bonsai-answer-stop, .bonsai-chat-turn-row-body, .bonsai-chat-details-divider";
function draw(over: Partial<MainTabChatTranscriptProps> = {}): TranscriptWalk {
  const s = panel.draw(<MainTabChatTranscript {...props(over)} />, STAMP, () => null);
  registerNavFocus("preset-carousel", dockChipsStop(page(), () => true).nav);
  return s;
}
const askAnywayButton = () =>
  Array.from(page().host.querySelectorAll("button")).find((b) => b.textContent === ASK_ANYWAY) ?? null;

describe("the Ask anyway row under the low-memory warning", () => {
  it("is drawn under the warning; A arms the one-shot, then asks the same question again", async () => {
    resetFakeDeckyRpc();
    const order: string[] = [];
    setRpcHandler("arm_ollama_ask_anyway", () => {
      order.push("armed");
      return { armed: true };
    });
    const onAskOllama = vi.fn(async () => {
      order.push("asked");
    });
    const s = draw({ onAskOllama });
    expect(askAnywayButton()).not.toBeNull();
    s.put(ASK_ANYWAY);
    askAnywayButton()!.click(); // A on a Steam button is its click
    await vi.waitFor(() => expect(onAskOllama).toHaveBeenCalledTimes(1));
    expect(onAskOllama).toHaveBeenCalledWith(QUESTION, { threadQuestionDisplay: QUESTION });
    expect(order).toEqual(["armed", "asked"]);
    expect(getRpcCallLog().filter((c) => c.method === "arm_ollama_ask_anyway")).toHaveLength(1);
  });

  it("still asks again when arming times out: the warning comes back, which is the honest answer", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("arm_ollama_ask_anyway", () => {
      throw new Error("down");
    });
    const onAskOllama = vi.fn(async () => {});
    draw({ onAskOllama });
    askAnywayButton()!.click();
    await vi.waitFor(() => expect(onAskOllama).toHaveBeenCalledTimes(1));
  });

  it("is not drawn under an ordinary answer, without a way to ask, or while asking", () => {
    draw({ ollamaResponse: "Use the nail first.", lastExchange: { question: QUESTION, answer: "Use the nail first." } });
    expect(askAnywayButton()).toBeNull();
  });

  it("is not drawn without a way to ask again", () => {
    draw({ onAskOllama: undefined });
    expect(askAnywayButton()).toBeNull();
  });

  it("goes away while the next question is being answered", () => {
    draw({ isAsking: true });
    expect(askAnywayButton()).toBeNull();
  });

  it("is drawn when the warned turn has been reloaded as the newest archived turn, and asks that turn's question", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("arm_ollama_ask_anyway", () => ({ armed: true }));
    const onAskOllama = vi.fn(async () => {});
    const turns = [{ id: "turn-1", question: QUESTION, questionDisplay: "the boss question", answer: WARNING }];
    panel.draw(
      <MainTabChatTranscript {...chatProps({ ollamaResponse: "", askThreadDisplayQuestion: "", lastExchange: null, onAskOllama }, turns, "turn-1")} />,
      STAMP,
      () => null,
    );
    askAnywayButton()!.click();
    await vi.waitFor(() => expect(onAskOllama).toHaveBeenCalledTimes(1));
    expect(onAskOllama).toHaveBeenCalledWith(QUESTION, { threadQuestionDisplay: "the boss question" });
  });
});

describe.each([
  ["with the page's focus", true],
  ["with the page's focus gone", false],
])("the Ask anyway row as a D-pad stop, %s", (_label, focused) => {
  it("is reached walking Down from the question, no stop twice, and Down from it reaches the dock", async () => {
    const s = draw();
    s.put(QUESTION);
    page().setFocused(focused);
    const trail = await s.walk("onMoveDown", ASK_ANYWAY);
    expect(trail[trail.length - 1]).toBe(ASK_ANYWAY);
    page().setFocused(true);
    s.put(ASK_ANYWAY);
    page().setFocused(focused);
    expect(await s.press("onMoveDown")).toBe("claimed");
    expect(s.nameOf(page().ring())).toBe(DOCK);
  });

  it("Up from the row lands on a stop of the answer above it, and the walk back up visits no stop twice", async () => {
    const s = draw();
    s.put(ASK_ANYWAY);
    page().setFocused(focused);
    const trail = await s.walk("onMoveUp", QUESTION);
    expect(trail[0]).toBe(ASK_ANYWAY);
    expect(trail).not.toContain(DOCK);
    expect(trail.length).toBeGreaterThan(1);
  });

  it("hears A (its click arms and asks) and leaves B to Steam: no handler claims it between the row and the panel", async () => {
    resetFakeDeckyRpc();
    setRpcHandler("arm_ollama_ask_anyway", () => ({ armed: true }));
    const onAskOllama = vi.fn(async () => {});
    const s = draw({ onAskOllama });
    s.put(ASK_ANYWAY);
    page().setFocused(focused);
    expect(await s.button("onCancelButton")).toBe(false);
    expect(onAskOllama).not.toHaveBeenCalled();
    expect(s.nameOf(page().ring())).toBe(ASK_ANYWAY);
    askAnywayButton()!.click();
    await vi.waitFor(() => expect(onAskOllama).toHaveBeenCalledTimes(1));
  });
});
