/**
 * Title: The knowledge-base buttons keep their whole label at Large
 * Purpose: Plan 93 (M10, round 2). On the Deck at Large the Ollama tab's "Update knowledge base" button showed
 *          "Update knowledge bas": the words are one line, cut off by the button. Now the words may wrap to a
 *          second line, and two lines of the Large size must fit inside the button's fixed height. jsdom has no
 *          layout, so this works the fit out from what the button is told: no `nowrap`, no ellipsis, the words
 *          allowed to shrink (min-width 0) with the icon not, and the button's height minus its border and
 *          padding at least two lines of the settled Large font size at the label's line height. Checked for the
 *          label before the library is installed ("Download knowledge base", the longer one) and after
 *          ("Update knowledge base"), and for Remove.
 * Used for: KnowledgeBaseSection.tsx, KnowledgeBaseButtonLabel.tsx.
 * Does not: Measure the label's real width: whether it needs the second line is the Deck check (Ollama tab at
 *           Large, the section open).
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => await import("../test-harness/fakeDeckyUi"));

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { withTextScale } from "../data/chatTextSize";
import { makeFontSizeReader } from "../test-harness/settledFontSize";

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
});

function renderAtLarge(installed: boolean) {
  setRpcHandler("get_rag_corpus_status", () => ragCorpusStatusFixture({ installed, corpus_version: installed ? "1.0.0" : "" }));
  render(
    <div className="bonsai-scope" style={withTextScale({}, "large")}>
      <KnowledgeBaseSection
        useLocalKnowledgeBase={true}
        setUseLocalKnowledgeBase={() => {}}
        ragCorpusVersion="1.0.0"
        ollamaIp="127.0.0.1"
        ollamaLocalOnDeck={true}
        onBeforeDeckyModal={() => {}}
        onCompleteDeckyModalClose={(close) => close()}
      />
    </div>,
  );
}

/** The button around `words`, checked to show every line of them at Large. */
function expectWholeLabel(words: string) {
  const text = screen.getByText(words);
  const button = text.closest("button") as HTMLButtonElement;
  expect(button, words).toBeTruthy();
  const style = button.style;
  expect(style.whiteSpace, `${words} may wrap`).not.toBe("nowrap");
  expect(style.textOverflow, `${words} is not cut with an ellipsis`).not.toBe("ellipsis");
  expect(parseFloat(text.style.minWidth), `${words} may shrink`).toBe(0);
  expect(text.style.overflowWrap, `${words} never breaks inside a word`).not.toMatch(/anywhere|break-word/);
  expect(text.style.wordBreak).not.toBe("break-all");
  const lineHeight = Number(text.style.lineHeight);
  expect(lineHeight).toBeGreaterThan(0);
  const font = makeFontSizeReader("")(text);
  const [padV] = style.padding.split(" ").map((p) => parseFloat(p));
  const room = parseFloat(style.height) - 2 /* the border */ - 2 * padV!;
  expect(room, `${words}: two lines at Large (${(2 * font * lineHeight).toFixed(1)}) fit in ${room}`).toBeGreaterThanOrEqual(2 * font * lineHeight);
}

describe("knowledge base buttons at Large", () => {
  it("Update knowledge base and Remove show every line of their words", async () => {
    renderAtLarge(true);
    await screen.findByText("Update knowledge base");
    expectWholeLabel("Update knowledge base");
    expectWholeLabel("Remove");
  });

  it("Remove stays one whole word in the 93-wide box the Deck measured at Large (not Remov / e)", async () => {
    renderAtLarge(true);
    const text = await screen.findByText("Remove");
    const button = text.closest("button") as HTMLButtonElement;
    // Marked one word: it cannot wrap at all, so it cannot split.
    expect(text.style.whiteSpace).toBe("nowrap");
    // And the word, the 16 icon and the 6 gap fit between the button's border and side padding. The word is
    // estimated generously (0.65 of the font size a letter, bold), since jsdom cannot measure it.
    const font = makeFontSizeReader("")(text);
    const [, padH] = button.style.padding.split(" ").map((p) => parseFloat(p));
    const room = 93 - 2 - 2 * padH! - 16 - 6;
    expect(room, `the word needs about ${(6 * 0.65 * font).toFixed(1)} of ${room}`).toBeGreaterThanOrEqual(6 * 0.65 * font);
  });

  it("Download knowledge base (not installed yet) shows every line of its words", async () => {
    renderAtLarge(false);
    await screen.findByText("Download knowledge base");
    expectWholeLabel("Download knowledge base");
  });
});
