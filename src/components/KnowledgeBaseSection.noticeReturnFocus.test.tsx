/**
 * Title: The ring comes back after the library's Update and Pull notices close
 *
 * Purpose: Pin plan 76 lane 2 follow-up, bugs 2 and 4. "Update knowledge base" and "Pull
 * nomic-embed-text" ask the download notice first (downloadNotice.tsx); when its box closed, the tab
 * was rebuilt and the ring went to the tab bar. Each button now tells the shell "it was me" while the
 * box is open:
 *  - Not now / B: the ring returns to the button that opened it.
 *  - Download (the action): the ring goes to the library's Download/Update button, which stays and is
 *    enabled, because the Pull button turns into a disabled "Starting..." and could not take it.
 *  - No box at all (downloads on and the notice already seen resolves at once, or the kids lock
 *    refuses at once): the note is not left armed, so a later, unrelated box close is not hijacked.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); that is the Deck row's job.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ answer: false, delayMs: 0 }));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: () =>
    new Promise<boolean>((resolve) => setTimeout(() => resolve(hoisted.answer), hoisted.delayMs)),
}));

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

async function draw() {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({
      installed: true,
      corpus_version: "1.0.0",
      embeddings_populated: true,
      embed_model_available: false,
    }),
  );
  render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={true}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion="1.0.0"
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
  const pull = (await screen.findByText(/^Pull nomic-embed-text/)).closest("button") as HTMLButtonElement;
  const update = screen.getByText("Update knowledge base").closest("button") as HTMLButtonElement;
  return { pull, update };
}

const later = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ringLeaves = () => (document.activeElement as HTMLElement | null)?.blur();

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  resetModalReturnFocusRegistry();
  hoisted.answer = false;
  hoisted.delayMs = 120; // a box a person answers takes far longer than this
});

describe("Update knowledge base and its notice", () => {
  it("Not now / B: the ring returns to Update", async () => {
    const { update } = await draw();
    fireEvent.click(update);
    await waitFor(() => expect(peekModalReturnFocus()).not.toBeNull());
    await later(200); // the box closes, saying no
    ringLeaves();
    restoreModalReturnFocus();
    expect(document.activeElement).toBe(update);
  });

  it("no box appeared (answer at once): nothing is left armed", async () => {
    hoisted.delayMs = 0;
    const { update } = await draw();
    fireEvent.click(update);
    await later(60);
    expect(peekModalReturnFocus()).toBeNull();
  });
});

describe("Pull nomic-embed-text and its notice", () => {
  it("Not now / B: the ring returns to the Pull button", async () => {
    const { pull } = await draw();
    fireEvent.click(pull);
    await later(200);
    ringLeaves();
    restoreModalReturnFocus();
    expect(document.activeElement).toBe(pull);
  });

  it("Download: the ring goes to the library's Update button, not the button that is about to be disabled", async () => {
    hoisted.answer = true;
    const { pull, update } = await draw();
    fireEvent.click(pull);
    await later(200);
    ringLeaves();
    restoreModalReturnFocus();
    expect(document.activeElement).toBe(update);
    expect(document.activeElement).not.toBe(pull);
  });

  it("no box appeared (answer at once): nothing is left armed", async () => {
    hoisted.delayMs = 0;
    const { pull } = await draw();
    fireEvent.click(pull);
    await later(60);
    expect(peekModalReturnFocus()).toBeNull();
  });
});
