/**
 * Title: The Delete chat box has two buttons and opens on Cancel
 *
 * Purpose: Steam opens a box with the ring on its first button. The chat row's Delete box once had
 * "Delete" there, so an A pressed by habit deleted the chat (plan 79); it then had three buttons
 * ("Keep chat", Delete, Cancel) to keep that first A harmless. The maintainer's call on 2026-10-06
 * is two buttons only: Cancel first, where the ring opens, and Delete second. B keeps the chat.
 * The check is made on what the row really hands to Steam: the box is drawn here, its buttons are
 * read off the page in the order Steam would walk them, and each one is pressed.
 *
 * Does not: open a real Steam box, so where the ring lands on the Deck is the device row's job.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";

import type { ChatSlotSummary } from "../../utils/chatSlotsApi";
import * as navFocusRegistry from "../../utils/navFocusRegistry";

type Handlers = Record<string, unknown>;
let rowProps: Handlers = {};
let shown: React.ReactElement[] = [];
let modalRootCancel: (() => void) | undefined;
const close = vi.fn();

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  const Focusable = React.forwardRef<HTMLDivElement, Handlers & { children?: React.ReactNode }>(
    function RecordingFocusable(props, ref) {
      if (props.className === "bonsai-chat-slot-row-focus") rowProps = props;
      return (
        <div ref={ref} className={props.className as string}>
          {props.children as React.ReactNode}
        </div>
      );
    },
  );
  const ModalRoot = React.forwardRef<HTMLDivElement, Handlers & { children?: React.ReactNode }>(
    function CapturingModalRoot(props, ref) {
      modalRootCancel = props.onCancel as (() => void) | undefined;
      return <fake.ModalRoot {...props} ref={ref} />;
    },
  );
  return {
    ...fake,
    Focusable,
    ModalRoot,
    showModal: (el: React.ReactElement) => {
      shown.push(el);
      return { Close: close, Update: () => undefined };
    },
  };
});

import { ChatSlotRow } from "./ChatSlotRow";

const SUMMARIES: ChatSlotSummary[] = [
  { id: "a", label: "Alpha", created_at: 0, updated_at: 0 },
  { id: "b", label: "Beta", created_at: 0, updated_at: 0 },
];

beforeEach(() => {
  rowProps = {};
  shown = [];
  modalRootCancel = undefined;
  close.mockClear();
});
afterEach(() => navFocusRegistry.resetNavFocusRegistry());

/** Open the box from the row, then draw it the way Steam would and hand back its buttons. */
function openDeleteBox(onDeleteSlot: (id: string) => Promise<boolean>) {
  render(
    <ChatSlotRow
      summaries={SUMMARIES}
      activeSlotId="b"
      onCreateSlot={async () => undefined}
      onSelectSlot={async () => undefined}
      onRenameSlot={async () => true}
      onDeleteSlot={onDeleteSlot}
      onCompleteNestedDeckyModalClose={(fn) => fn()}
    />,
  );
  act(() => void (rowProps.onMoveRight as () => unknown)());
  act(() => void (rowProps.onButtonDown as (evt: unknown) => unknown)("a"));
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
});
