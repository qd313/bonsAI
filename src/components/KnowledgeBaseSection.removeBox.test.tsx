/**
 * Title: "Remove knowledge base?" opens on the safe choice
 *
 * Purpose: Pin plan 76 lane 2, bug 1 (roadmap: '"Remove knowledge base?" opens with the ring on
 * "Remove", not "Cancel"'). Steam opens a ConfirmModal with the ring on its OK button, and this box
 * had "Remove" there, so one A press deleted the whole library (seen on six Deck runs:
 * plan74-P74-SAFE-FIRST-PICKER.json, t75-1 to t75-5-Q6-REMOVE-KB-SAFE-FIRST.json). OK is now the
 * choice that changes nothing ("Not now") and "Remove" sits on the middle button, the download
 * notice's own shape (downloadNotice.tsx). What "Remove" does is unchanged.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type BoxProps = {
  strTitle?: unknown;
  strOKButtonText?: unknown;
  strMiddleButtonText?: unknown;
  strCancelButtonText?: unknown;
  onOK?: () => void;
  onMiddleButton?: () => void;
  onCancel?: () => void;
};

const hoisted = vi.hoisted(() => ({ box: null as BoxProps | null, closed: 0 }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: ReactElement<BoxProps>) => {
      hoisted.box = el.props;
      return { Close: () => (hoisted.closed += 1), Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

const removeCalls = () => getRpcCallLog().filter((c) => c.method === "remove_rag_corpus");
const settle = () => new Promise((r) => setTimeout(r, 0));

async function openBox(): Promise<BoxProps> {
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
  return hoisted.box!;
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  hoisted.box = null;
  hoisted.closed = 0;
});

describe('"Remove knowledge base?"', () => {
  it("puts the safe choice on OK, where the ring lands, and Remove on the middle button", async () => {
    const box = await openBox();
    expect(box.strTitle).toBe("Remove knowledge base?");
    expect(box.strOKButtonText).toBe("Not now");
    expect(box.strMiddleButtonText).toBe("Remove");
    expect(box.strCancelButtonText).toBe("Cancel");
  });

  it("OK (the ring's first stop) closes the box and deletes nothing", async () => {
    const box = await openBox();
    box.onOK?.();
    await settle();
    expect(hoisted.closed).toBe(1);
    expect(removeCalls()).toHaveLength(0);
  });

  it("Cancel and B also delete nothing", async () => {
    const box = await openBox();
    box.onCancel?.();
    await settle();
    expect(hoisted.closed).toBe(1);
    expect(removeCalls()).toHaveLength(0);
  });

  it("the middle button removes the library, as OK used to", async () => {
    const box = await openBox();
    box.onMiddleButton?.();
    await waitFor(() => expect(removeCalls()).toHaveLength(1));
    expect(hoisted.closed).toBe(1);
  });
});
