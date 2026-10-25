/**
 * Title: The Knowledge base section's "Lowered notes: N" row and its Clear box (plan 100, lane U)
 *
 * Purpose: Pin what a person sees and what each press does. Notes ranked lower by a thumbs-down show as one row,
 * "Lowered notes: N" with a Clear button, under the Update / Remove row; with none the row is not drawn. Clear asks
 * first with the shared two-button box ("Clear lowered notes?", Clear then Cancel, the ring on Cancel); Cancel and
 * B clear nothing; the box's Clear calls the back end's clear once, the row goes, and the ring is sent to Remove,
 * the stop that stays. The row also shows with the library removed: the marks live in their own file.
 *
 * Used for: KnowledgeBaseSection.tsx, demoteNoteApi.ts.
 *
 * Does not: Walk the D-pad (OllamaTab.foldedWalk.test.tsx does) or prove the ring moves on the device.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ box: null as unknown, closed: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.box = el;
      return { Close: () => (hoisted.closed += 1), Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { drawConfirmBox, type DrawnConfirmBox } from "../../test-harness/confirmBoxProbe";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { peekModalReturnFocus, resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";

const clearCalls = () => getRpcCallLog().filter((c) => c.method === "clear_rag_corpus_demotes");
const settle = () => new Promise((r) => setTimeout(r, 0));
const row = () => document.querySelector<HTMLElement>(".bonsai-kb-lowered-row");

/** The back end as the Deck has it: `count` marks in the file until Clear empties it. */
function backEnd(count: number, installed = true) {
  let held = count;
  setRpcHandler("get_rag_corpus_status", () => ragCorpusStatusFixture({ installed, corpus_version: installed ? "1.0.0" : "" }));
  setRpcHandler("list_rag_corpus_demotes", () => ({ ok: true, count: held, notes: [] }));
  setRpcHandler("clear_rag_corpus_demotes", () => {
    const cleared = held;
    held = 0;
    return { ok: true, cleared };
  });
}

function draw() {
  return render(
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
}

async function openBox(): Promise<DrawnConfirmBox> {
  draw();
  fireEvent.click(await screen.findByText("Clear"));
  await waitFor(() => expect(hoisted.box).not.toBeNull());
  return drawConfirmBox(hoisted.box);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  resetModalReturnFocusRegistry();
  hoisted.box = null;
  hoisted.closed = 0;
});

describe('the "Lowered notes" row', () => {
  it("reads the count from the back end, with one Clear button", async () => {
    backEnd(2);
    draw();
    await waitFor(() => expect(row()).not.toBeNull());
    expect(row()!.textContent).toContain("Lowered notes: 2");
    expect(row()!.querySelectorAll("button")).toHaveLength(1);
    expect(row()!.querySelector("button")!.textContent).toBe("Clear");
  });

  it("is not drawn when nothing is lowered", async () => {
    backEnd(0);
    draw();
    await screen.findByText("Update knowledge base");
    await settle();
    expect(row()).toBeNull();
    expect(screen.queryByText("Clear")).toBeNull();
  });

  it("still shows with the library removed, under Download (the marks live in their own file)", async () => {
    backEnd(1, false);
    draw();
    await screen.findByText("Download knowledge base");
    await waitFor(() => expect(row()).not.toBeNull());
    expect(row()!.textContent).toContain("Lowered notes: 1");
  });
});

describe('"Clear lowered notes?"', () => {
  it("shows Clear and Cancel only, and says the notes come back on later questions", async () => {
    backEnd(2);
    const box = await openBox();
    expect(box.title).toBe("Clear lowered notes?");
    expect(box.labels).toEqual(["Clear", "Cancel"]);
    expect(box.text).toContain("The 2 notes you ranked lower come back on later questions.");
  });

  it("Cancel closes the box and clears nothing", async () => {
    backEnd(2);
    const box = await openBox();
    box.pressCancel();
    await settle();
    expect(hoisted.closed).toBe(1);
    expect(clearCalls()).toHaveLength(0);
    expect(row()).not.toBeNull();
  });

  it("B also clears nothing", async () => {
    backEnd(2);
    const box = await openBox();
    box.pressB();
    await settle();
    expect(hoisted.closed).toBe(1);
    expect(clearCalls()).toHaveLength(0);
  });

  it("the box's Clear clears once, the row goes, and the ring is sent to Remove, which stays", async () => {
    backEnd(2);
    const box = await openBox();
    box.pressAction();
    await waitFor(() => expect(clearCalls()).toHaveLength(1));
    expect(hoisted.closed).toBe(1);
    await waitFor(() => expect(row()).toBeNull());
    expect(peekModalReturnFocus()).toBe("kb-remove");
  });

  it("with the library removed, the ring is sent to Download instead", async () => {
    backEnd(1, false);
    const box = await openBox();
    expect(box.text).toContain("The 1 note you ranked lower comes back on later questions.");
    box.pressAction();
    await waitFor(() => expect(clearCalls()).toHaveLength(1));
    expect(peekModalReturnFocus()).toBe("kb-download");
  });
});
