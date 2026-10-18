/**
 * Title: The Delete chat box has two buttons and opens on Cancel
 *
 * Purpose: Steam opens a box with the ring on its first button. The old chat row's Delete box once had
 * "Delete" there, so an A pressed by habit deleted the chat (plan 79); it then had three buttons
 * ("Keep chat", Delete, Cancel) to keep that first A harmless. The maintainer's call on 2026-10-06
 * is two buttons only: Delete on the left and Cancel on the right, where the ring opens (plan 96, 2026-10-18). B keeps the chat.
 * The chats menu's Delete chat opens the same box (plan 84 step 5); these cases moved here from the
 * old row's own test when the row went. The box is drawn as Steam is handed it, its buttons read off
 * the page in the order Steam would walk them, and each one pressed.
 *
 * Does not: open a real Steam box, so where the ring lands on the Deck is the device row's job.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react";

type Handlers = Record<string, unknown>;
let shown: React.ReactElement[] = [];
let modalRootCancel: (() => void) | undefined;
const close = vi.fn();

vi.mock("@decky/ui", async () => {
  const fake = await import("../../../test-harness/fakeDeckyUi");
  const ModalRoot = React.forwardRef<HTMLDivElement, Handlers & { children?: React.ReactNode }>(
    function CapturingModalRoot(props, ref) {
      modalRootCancel = props.onCancel as (() => void) | undefined;
      return <fake.ModalRoot {...props} ref={ref} />;
    },
  );
  return {
    ...fake,
    ModalRoot,
    showModal: (el: React.ReactElement) => {
      shown.push(el);
      return { Close: close, Update: () => undefined };
    },
  };
});

import { useChatSlotDeleteConfirm } from "./useChatSlotDeleteConfirm";
import { peekModalReturnFocus, clearModalReturnFocus } from "../../../shared/dpad/modalReturnFocusRegistry";

beforeEach(() => {
  shown = [];
  modalRootCancel = undefined;
  close.mockClear();
  clearModalReturnFocus();
});

/** Open the box for chat "b", named "Beta", then draw it the way Steam would and hand back its buttons. */
function openDeleteBox(onDeleteSlot: (id: string) => Promise<boolean>) {
  const { result } = renderHook(() =>
    useChatSlotDeleteConfirm({ onDeleteSlot, onCompleteNestedDeckyModalClose: (fn) => fn() }),
  );
  result.current("b", "Beta", document.createElement("div"));
  expect(shown).toHaveLength(1);
  const box = render(shown[0]!);
  const buttons = Array.from(box.container.querySelectorAll("button"));
  return { box, buttons, labels: buttons.map((b) => b.textContent ?? "") };
}

describe("the Delete chat box", () => {
  it("has exactly two buttons, Delete on the left and Cancel on the right (where the ring opens)", () => {
    const { labels } = openDeleteBox(vi.fn(async () => true));
    expect(labels).toEqual(["Delete", "Cancel"]);
  });

  it("shows the title Delete chat? and not the old Delete chat slot?", () => {
    const { box } = openDeleteBox(vi.fn(async () => true));
    const text = box.container.textContent ?? "";
    expect(text).toContain("Delete chat?");
    expect(text).not.toContain("slot?");
  });

  it("puts Delete and Cancel side by side in one row, Delete first, so Left from Cancel lands on Delete", () => {
    const { buttons } = openDeleteBox(vi.fn(async () => true));
    const deleteCell = buttons[0]!.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const cancelCell = buttons[1]!.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const row = cancelCell.parentElement as HTMLElement;
    expect(deleteCell.parentElement).toBe(row);
    expect(row.style.display).toBe("flex");
    expect(row.style.flexDirection).toBe("row");
    expect(Array.from(row.children)).toEqual([deleteCell, cancelCell]);
  });

  it("holds both buttons in one Focusable that tells Steam its children flow horizontally, so Right and Left step between them", () => {
    const { buttons } = openDeleteBox(vi.fn(async () => true));
    const deleteCell = buttons[0]!.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const cancelCell = buttons[1]!.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const row = cancelCell.parentElement as HTMLElement;
    expect(deleteCell.parentElement).toBe(row);
    expect(row.getAttribute("data-decky-ui")).toBe("Focusable");
    expect(row.getAttribute("flow-children")).toBe("horizontal");
    expect(Array.from(row.children)).toEqual([deleteCell, cancelCell]);
  });

  it("Cancel keeps the chat: A on it deletes nothing and closes the box", () => {
    const onDeleteSlot = vi.fn(async () => true);
    const { buttons } = openDeleteBox(onDeleteSlot);
    fireEvent.click(buttons[1]!);
    expect(onDeleteSlot).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("B keeps the chat too: it closes the box and deletes nothing", () => {
    const onDeleteSlot = vi.fn(async () => true);
    openDeleteBox(onDeleteSlot);
    expect(modalRootCancel).toBeTypeOf("function");
    modalRootCancel!();
    expect(onDeleteSlot).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("Delete deletes the right chat once and closes the box", async () => {
    const onDeleteSlot = vi.fn(async () => true);
    const { buttons } = openDeleteBox(onDeleteSlot);
    fireEvent.click(buttons[0]!);
    expect(onDeleteSlot).toHaveBeenCalledTimes(1);
    expect(onDeleteSlot).toHaveBeenCalledWith("b");
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it("the box stays open until the delete is done, so the screen rebuilt behind it finds the chat gone", async () => {
    let finishDelete: (ok: boolean) => void = () => undefined;
    const onDeleteSlot = vi.fn(() => new Promise<boolean>((resolve) => (finishDelete = resolve)));
    const { buttons } = openDeleteBox(onDeleteSlot);
    fireEvent.click(buttons[0]!);
    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();
    await act(async () => finishDelete(true));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("names the chat and the title in the box", () => {
    const { box } = openDeleteBox(vi.fn(async () => true));
    expect(box.container.textContent).toContain("Delete chat?");
    expect(box.container.textContent).toContain('Delete "Beta" and its transcript?');
  });

  it("asks for the ring back when it closes, under the id the row always used", () => {
    openDeleteBox(vi.fn(async () => true));
    expect(peekModalReturnFocus()).toBe("chat-slot-rename");
  });
});
