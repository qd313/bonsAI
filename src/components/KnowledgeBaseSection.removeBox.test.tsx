/**
 * Title: "Remove knowledge base?" shows Cancel and Remove only, and opens on Cancel
 *
 * Purpose: Pin plan 76 lane 2, bug 1 (roadmap: '"Remove knowledge base?" opens with the ring on
 * "Remove", not "Cancel"') and plan 93. Steam puts the ring on the first button of a box, and this box
 * had "Remove" there, so one A press deleted the whole library (seen on six Deck runs:
 * plan74-P74-SAFE-FIRST-PICKER.json, t75-1 to t75-5-Q6-REMOVE-KB-SAFE-FIRST.json). It then had three
 * buttons (Not now / Remove / Cancel) because Steam adds its own Cancel; it is now the shared
 * two-button box, drawn and read off the page: Cancel first, Remove beside it. What "Remove" does is
 * unchanged.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ box: null as unknown, closed: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.box = el;
      return { Close: () => (hoisted.closed += 1), Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { drawConfirmBox, type DrawnConfirmBox } from "../test-harness/confirmBoxProbe";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

const removeCalls = () => getRpcCallLog().filter((c) => c.method === "remove_rag_corpus");
const settle = () => new Promise((r) => setTimeout(r, 0));

async function openBox(): Promise<DrawnConfirmBox> {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({ installed: true, corpus_version: "1.0.0" }),
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
  fireEvent.click(await screen.findByText("Remove"));
  await waitFor(() => expect(hoisted.box).not.toBeNull());
  return drawConfirmBox(hoisted.box);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  hoisted.box = null;
  hoisted.closed = 0;
});

describe('"Remove knowledge base?"', () => {
  it("shows Cancel and Remove only, Cancel first where the ring lands", async () => {
    const box = await openBox();
    expect(box.title).toBe("Remove knowledge base?");
    expect(box.labels).toEqual(["Cancel", "Remove"]);
  });

  it("says it deletes the library and no longer claims to turn the switch off (the Deck kept it on)", async () => {
    const box = await openBox();
    expect(box.text).toContain("Deletes the offline knowledge base from disk.");
    expect(box.text).toContain("Answers won't use its game notes until you download it again.");
    expect(box.text).not.toMatch(/grounding/i);
    expect(box.text).not.toMatch(/turns off/i);
    expect(box.text).not.toContain("Use local knowledge base");
  });

  it("Cancel (the ring's first stop) closes the box and deletes nothing", async () => {
    const box = await openBox();
    box.pressCancel();
    await settle();
    expect(hoisted.closed).toBe(1);
    expect(removeCalls()).toHaveLength(0);
  });

  it("B also deletes nothing", async () => {
    const box = await openBox();
    box.pressB();
    await settle();
    expect(hoisted.closed).toBe(1);
    expect(removeCalls()).toHaveLength(0);
  });

  it("the Remove button removes the library, as OK used to", async () => {
    const box = await openBox();
    box.pressAction();
    await waitFor(() => expect(removeCalls()).toHaveLength(1));
    expect(hoisted.closed).toBe(1);
  });
});
