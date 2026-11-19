/**
 * Title: Remove on the knowledge library reacts at once: "Removing the library…", and a second Remove is ignored
 *
 * Purpose: After Remove was confirmed the box closed and the row kept showing the library as installed, with Update and
 * Remove, until the back end answered (seconds); Remove could be opened and confirmed again meanwhile. Read the way a
 * person sees it, through the real box with the delete held back: the line under the buttons says "Removing the
 * library…" at once; it is still there on a copy of the section rebuilt as the box closes (a Decky box closing rebuilds
 * the tab); a second Remove opens no second box and sends no second delete; when the delete answers the line goes and
 * the library reads as removed; when it fails the line goes, the "Remove failed" toast shows and Remove works again.
 *
 * Does not: run the real back end (tests/test_remove_rag_corpus_settings.py pins what it writes).
 */
import { toaster } from "@decky/api";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ box: null as unknown, boxes: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.box = el;
      hoisted.boxes += 1;
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { resetKbRemovalForTests } from "./kbRemoval";
import { drawConfirmBox } from "../../test-harness/confirmBoxProbe";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const REMOVING = "Removing the library…";
const section = () => (
  <KnowledgeBaseSection
    useLocalKnowledgeBase={true}
    setUseLocalKnowledgeBase={() => {}}
    ragCorpusVersion="1.0.0"
    ollamaIp="127.0.0.1"
    ollamaLocalOnDeck={true}
    onBeforeDeckyModal={() => {}}
    onCompleteDeckyModalClose={(close) => close()}
  />
);

const removeCalls = () => getRpcCallLog().filter((c) => c.method === "remove_rag_corpus").length;
const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));
let installed = true;
let finish: (v: unknown) => void = () => {};
let fail: (e: Error) => void = () => {};
let toasts: Array<{ title?: string }> = [];

/** Press Remove, then Remove in the box: the delete is now out and unanswered. */
async function confirmRemove() {
  fireEvent.click(await screen.findByText("Remove"));
  await waitFor(() => expect(hoisted.box).not.toBeNull());
  const box = drawConfirmBox(hoisted.box);
  hoisted.box = null;
  box.pressAction();
  box.unmount();
  await settle();
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  resetKbRemovalForTests();
  hoisted.box = null;
  hoisted.boxes = 0;
  installed = true;
  toasts = [];
  vi.spyOn(toaster, "toast").mockImplementation(((t: { title?: string }) => void toasts.push(t)) as never);
  setRpcHandler("get_rag_corpus_status", () => ragCorpusStatusFixture({ installed, corpus_version: installed ? "1.0.0" : "" }));
  setRpcHandler(
    "remove_rag_corpus",
    () =>
      new Promise((resolve, reject) => {
        finish = (v) => {
          installed = false;
          resolve(v);
        };
        fail = reject;
      }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Remove on the knowledge library", () => {
  it("says at once that the library is being removed, while the delete is still out", async () => {
    render(section());
    await confirmRemove();
    expect(removeCalls()).toBe(1);
    expect(screen.getByText(REMOVING)).toBeTruthy();
  });

  it("the line is still there on a copy of the section rebuilt as the box closes", async () => {
    const view = render(section());
    await confirmRemove();
    view.unmount();
    render(section());
    expect(await screen.findByText(REMOVING)).toBeTruthy();
  });

  it("a second Remove while one is out opens no second box and sends no second delete", async () => {
    render(section());
    await confirmRemove();
    const boxesBefore = hoisted.boxes;
    fireEvent.click(screen.getByText("Remove"));
    await settle();
    expect(hoisted.boxes).toBe(boxesBefore);
    expect(removeCalls()).toBe(1);
  });

  it("when the delete answers the line goes and the library reads as removed", async () => {
    render(section());
    await confirmRemove();
    await act(async () => finish({ ok: true }));
    await waitFor(() => expect(screen.queryByText(REMOVING)).toBeNull());
    await waitFor(() => expect(screen.queryByText("Remove")).toBeNull());
    expect(toasts.map((t) => t.title)).toContain("Knowledge base removed");
  });

  it("when the delete fails the line goes, the Remove failed toast shows and Remove works again", async () => {
    render(section());
    await confirmRemove();
    await act(async () => fail(new Error("disk is read-only")));
    await waitFor(() => expect(screen.queryByText(REMOVING)).toBeNull());
    expect(toasts.map((t) => t.title)).toContain("Remove failed");
    expect(screen.getByText("Remove")).toBeTruthy();
    const boxesBefore = hoisted.boxes;
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => expect(hoisted.boxes).toBe(boxesBefore + 1));
  });
});
