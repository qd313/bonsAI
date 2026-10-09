/**
 * Title: The Delete chat box has two buttons and opens on Cancel
 *
 * Purpose: Steam opens a box with the ring on its first button. The old chat row's Delete box once had
 * "Delete" there, so an A pressed by habit deleted the chat (plan 79); it then had three buttons
 * ("Keep chat", Delete, Cancel) to keep that first A harmless. The maintainer's call on 2026-10-06
 * is two buttons only: Cancel first, where the ring opens, and Delete second. B keeps the chat.
 * The chats menu's Delete chat opens the same box (plan 84 step 5); these cases moved here from the
 * old row's own test when the row went. The box is drawn as Steam is handed it, its buttons read off
 * the page in the order Steam would walk them, and each one pressed.
 *
 * Does not: open a real Steam box, so where the ring lands on the Deck is the device row's job.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook } from "@testing-library/react";

type Handlers = Record<string, unknown>;
let shown: React.ReactElement[] = [];
let modalRootCancel: (() => void) | undefined;
const close = vi.fn();

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
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
import { peekModalReturnFocus, clearModalReturnFocus } from "../plugin-shell/modalReturnFocusRegistry";

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
  it("has exactly two buttons, Cancel first (where the ring opens) and Delete second", () => {
    const { labels } = openDeleteBox(vi.fn(async () => true));
    expect(labels).toEqual(["Cancel", "Delete"]);
  });

  it("the opening button keeps the chat: A on it deletes nothing and closes the box", () => {
    const onDeleteSlot = vi.fn(async () => true);
    const { buttons } = openDeleteBox(onDeleteSlot);
    fireEvent.click(buttons[0]!);
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

  it("Delete deletes the right chat once and closes the box", () => {
    const onDeleteSlot = vi.fn(async () => true);
    const { buttons } = openDeleteBox(onDeleteSlot);
    fireEvent.click(buttons[1]!);
    expect(onDeleteSlot).toHaveBeenCalledTimes(1);
    expect(onDeleteSlot).toHaveBeenCalledWith("b");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("names the chat and the title in the box", () => {
    const { box } = openDeleteBox(vi.fn(async () => true));
    expect(box.container.textContent).toContain("Delete chat slot?");
    expect(box.container.textContent).toContain('Delete "Beta" and its transcript?');
  });

  it("asks for the ring back when it closes, under the id the row always used", () => {
    openDeleteBox(vi.fn(async () => true));
    expect(peekModalReturnFocus()).toBe("chat-slot-rename");
  });
});
