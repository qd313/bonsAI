/**
 * Title: The rename box closes whatever happens, and says when the rename did not take
 *
 * Purpose: Save in the "Rename chat" box saves the name and closes the box. When the back end refused
 * (the save answers false) the box used to close as if all was well, the chat still under its old name; when
 * the save threw, the close came after the failed step and never ran, so the box stayed open for ever.
 * Checked on the box the hook hands to Steam, drawn with a Save button that does what Steam's does (calls
 * the box's onOK): the box closes in every case, and a toast says so when the rename did not happen.
 *
 * Does not: open a real Steam box, or type a name (the field is Steam's; the box opens with the chat's
 * current name in it, which Save sends).
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook, waitFor } from "@testing-library/react";

let shown: React.ReactElement[] = [];
const close = vi.fn();

vi.mock("@decky/ui", async () => {
  const fake = await import("../../../test-harness/fakeDeckyUi");
  return {
    ...fake,
    // Steam's ConfirmModal draws Save and Cancel; the stub does not, so this one stands in for it.
    ConfirmModal: (props: { onOK?: () => void; onCancel?: () => void; strOKButtonText?: string }) => (
      <div>
        <button onClick={props.onOK}>{props.strOKButtonText}</button>
        <button onClick={props.onCancel}>Cancel</button>
      </div>
    ),
    showModal: (el: React.ReactElement) => {
      shown.push(el);
      return { Close: close, Update: () => undefined };
    },
  };
});

import { toaster } from "@decky/api";
import { useChatSlotRenameModal } from "./useChatSlotRenameModal";

beforeEach(() => {
  shown = [];
  close.mockClear();
  vi.mocked(toaster.toast).mockClear();
});

/** Open the box for chat "b" (named "Beta"), draw it, and press Save. */
function pressSave(onRename: (id: string, label: string) => Promise<boolean>) {
  const { result } = renderHook(() =>
    useChatSlotRenameModal({ onRename, onCompleteNestedDeckyModalClose: (fn) => fn() }),
  );
  result.current.openRenameModal("b", "Beta", document.createElement("div"));
  const box = render(shown[0]!);
  fireEvent.click(box.getByText("Save"));
}

describe("the Rename chat box", () => {
  it("a good rename closes the box with no toast", async () => {
    const onRename = vi.fn(async () => true);
    pressSave(onRename);
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(onRename).toHaveBeenCalledWith("b", "Beta");
    expect(toaster.toast).not.toHaveBeenCalled();
  });

  it("a rename the back end refuses closes the box and says the chat could not be renamed", async () => {
    pressSave(vi.fn(async () => false));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(toaster.toast).toHaveBeenCalledTimes(1);
    const shownToast = vi.mocked(toaster.toast).mock.calls[0]![0];
    expect(`${shownToast.title} ${shownToast.body}`).toMatch(/could not be renamed/i);
  });

  it("a rename that throws closes the box too, says so, and leaves no error unhandled", async () => {
    pressSave(vi.fn(async () => Promise.reject(new Error("rpc gone"))));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(toaster.toast).toHaveBeenCalledTimes(1);
  });
});
