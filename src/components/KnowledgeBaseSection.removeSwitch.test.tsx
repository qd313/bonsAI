/**
 * Title: Removing the library turns "Use local knowledge base" off on the screen that is there afterwards
 *
 * Purpose: Pin plan 93 block C part 2 (workshop:test-evidence/plan93-P90-SEARCH-KB.json). The Remove box says
 * Remove turns the switch off, and the back end does write it off in settings.json, but on the Deck the
 * switch read "on" before and after. Closing the box rebuilds the Ollama tab (lessons-learned.md,
 * 'Closing a Decky popup rebuilds the tab behind it'), and the delete takes a few seconds, so the answer
 * comes back to a copy of the section that is already gone; its setter reached nothing the person can see.
 * These tests remove through the real box with the section thrown away and rebuilt as the box closes, with
 * the delete finishing afterwards, and read the switch of the copy on screen.
 *
 * Does not: run the real back end (tests/test_remove_rag_corpus_settings.py pins what it writes).
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ box: null as unknown }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.box = el;
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { drawConfirmBox } from "../test-harness/confirmBoxProbe";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

/** The plugin's settings state, as the tab above the section holds it; the section only gets the setter. */
function Screen({ startOn }: { startOn: boolean }) {
  const [on, setOn] = useState(startOn);
  return (
    <KnowledgeBaseSection
      useLocalKnowledgeBase={on}
      setUseLocalKnowledgeBase={setOn}
      ragCorpusVersion="1.0.0"
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />
  );
}

/** What the switch reads, off the page (the stub switch keeps `checked` as a property, not an attribute). */
const switchIsOn = () =>
  Boolean((document.querySelector('[label="Use local knowledge base"]') as unknown as { checked?: boolean })?.checked);

const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

/** Open the Remove box on a first copy; the delete is held until the test lets it finish. */
async function removeWithCopyThrownAway(mountReplacementWhen: "before" | "after") {
  let finishDelete: () => void = () => {};
  setRpcHandler("get_rag_corpus_status", () => ragCorpusStatusFixture({ installed: true, corpus_version: "1.0.0" }));
  setRpcHandler("remove_rag_corpus", () => new Promise((resolve) => (finishDelete = () => resolve({ ok: true }))));
  const first = render(<KnowledgeBaseSection
    useLocalKnowledgeBase={true}
    setUseLocalKnowledgeBase={() => {}}
    ragCorpusVersion="1.0.0"
    ollamaIp="127.0.0.1"
    ollamaLocalOnDeck={true}
    onBeforeDeckyModal={() => {}}
    onCompleteDeckyModalClose={(close) => {
      // Decky closing the box: the tab is thrown away and built again (a copy that is told nothing).
      first.unmount();
      if (mountReplacementWhen === "before") render(<Screen startOn={true} />);
      close();
    }}
  />);
  fireEvent.click(await screen.findByText("Remove"));
  await waitFor(() => expect(hoisted.box).not.toBeNull());
  drawConfirmBox(hoisted.box).pressAction();
  await settle();
  return {
    finish: async () => {
      finishDelete();
      await settle();
      await settle();
    },
  };
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  hoisted.box = null;
});

describe("after Remove, the switch on screen", () => {
  it("reads off when the tab was rebuilt before the delete finished", async () => {
    const removal = await removeWithCopyThrownAway("before");
    expect(switchIsOn()).toBe(true);
    await removal.finish();
    await waitFor(() => expect(switchIsOn()).toBe(false));
  });

  it("reads off when the tab is built only after the delete finished", async () => {
    const removal = await removeWithCopyThrownAway("after");
    await removal.finish();
    render(<Screen startOn={true} />);
    await waitFor(() => expect(switchIsOn()).toBe(false));
  });

  it("is left alone when nothing was removed", async () => {
    setRpcHandler("get_rag_corpus_status", () => ragCorpusStatusFixture({ installed: true, corpus_version: "1.0.0" }));
    render(<Screen startOn={true} />);
    await screen.findByText("Remove");
    await settle();
    expect(switchIsOn()).toBe(true);
  });
});
