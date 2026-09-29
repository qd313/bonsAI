/**
 * Title: The ring comes back to the library's own buttons after their boxes close
 *
 * Purpose: Pin plan 76 lane 2, bug 2 (roadmap: 'After B closes the library's location box, or after
 * Remove, the ring goes to the tab bar'; evidence plan74-P74-SAFE-FIRST-PICKER.json). Closing a
 * Decky box rebuilds the tab behind it, so the ring lands wherever Steam puts it: the tab bar. The
 * shell already hands the ring back to whichever button opened a box, when that button signed up in
 * modalReturnFocusRegistry.ts and said "it was me" when pressed ("Browse models..." does). Here:
 *  - "Download knowledge base" opens the location box; B or "Not now" returns to it.
 *  - "Remove" opens its box; "Not now" or B returns to Remove.
 *  - Once Remove has gone (the box's Remove button), the ring goes to the button that now stands
 *    where the controls were: "Download knowledge base".
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); that is the Deck row's
 * job. The shell's own close hook is what calls the restore, and is stood in for by calling it here.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type BoxProps = { onClose?: () => void; onPick?: (p: string, s: string) => void; onOK?: () => void; onMiddleButton?: () => void };

const hoisted = vi.hoisted(() => ({ box: null as BoxProps | null }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: ReactElement<BoxProps>) => {
      hoisted.box = el.props;
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

async function draw(installed: boolean) {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture(installed ? { installed: true, corpus_version: "1.0.0" } : {}),
  );
  render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={true}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion=""
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
  const primary = (await screen.findByText(installed ? "Update knowledge base" : "Download knowledge base")).closest(
    "button",
  ) as HTMLButtonElement;
  const remove = installed ? ((await screen.findByText("Remove")).closest("button") as HTMLButtonElement) : null;
  return { primary, remove };
}

function ringLeaves() {
  (document.activeElement as HTMLElement | null)?.blur();
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  resetModalReturnFocusRegistry();
  hoisted.box = null;
});

afterEach(() => {
  resetModalReturnFocusRegistry();
});

describe("the library's location box", () => {
  it("says it opened the box, and the restore reaches the Download button (B or Not now)", async () => {
    const { primary } = await draw(false);
    expect(peekModalReturnFocus()).toBeNull();

    fireEvent.click(primary);
    await waitFor(() => expect(hoisted.box).not.toBeNull());
    expect(peekModalReturnFocus()).not.toBeNull();

    ringLeaves();
    hoisted.box!.onClose?.();
    restoreModalReturnFocus();

    expect(document.activeElement).toBe(primary);
  });

  it("choosing a place leaves nothing armed, so the download's own boxes are not hijacked", async () => {
    const { primary } = await draw(false);
    fireEvent.click(primary);
    await waitFor(() => expect(hoisted.box).not.toBeNull());

    hoisted.box!.onPick?.("~/.bonsai/rag", "internal");

    expect(peekModalReturnFocus()).toBeNull();
  });
});

describe('"Remove knowledge base?"', () => {
  it("Not now (or B) returns the ring to Remove", async () => {
    const { remove } = await draw(true);
    fireEvent.click(remove!);
    await waitFor(() => expect(hoisted.box).not.toBeNull());

    ringLeaves();
    hoisted.box!.onOK?.();
    restoreModalReturnFocus();

    expect(document.activeElement).toBe(remove);
  });

  it("Remove itself sends the ring to the button that stays: Update, then Download once it is gone", async () => {
    const { primary, remove } = await draw(true);
    fireEvent.click(remove!);
    await waitFor(() => expect(hoisted.box).not.toBeNull());

    ringLeaves();
    hoisted.box!.onMiddleButton?.();
    restoreModalReturnFocus();

    // The Remove button itself is about to be removed, so the ring must not go back to it.
    expect(document.activeElement).toBe(primary);
    expect(document.activeElement).not.toBe(remove);
  });
});
