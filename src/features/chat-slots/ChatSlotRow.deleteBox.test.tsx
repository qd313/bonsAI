/**
 * Title: The Delete chat box opens on the button that deletes nothing
 *
 * Purpose: Steam opens a confirm box with the ring on its OK button. The chat row's Delete box had
 * "Delete" as OK, so on the Deck an A pressed by habit deleted the chat (plan 79, round two). The
 * box now follows the Remove-knowledge-base shape that was proven on the Deck: OK is "Keep chat",
 * Delete sits on the middle button, and Cancel and B both close the box. The check is made on the
 * box the row really hands to Steam: which action each of the three buttons runs.
 *
 * Does not: open a real Steam box. The stub only records what the row asks Steam to show.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import type { ChatSlotSummary } from "../../utils/chatSlotsApi";
import * as navFocusRegistry from "../../utils/navFocusRegistry";

type Handlers = Record<string, unknown>;
let rowProps: Handlers = {};
let shown: React.ReactElement[] = [];
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
  return {
    ...fake,
    Focusable,
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
  close.mockClear();
});
afterEach(() => navFocusRegistry.resetNavFocusRegistry());

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
  return shown[0]!.props as Record<string, (() => void) | string | undefined>;
}

describe("the Delete chat box", () => {
  it("opens on a button that deletes nothing: OK, B and Cancel all keep the chat", () => {
    const onDeleteSlot = vi.fn(async () => true);
    const box = openDeleteBox(onDeleteSlot);
    // Steam puts the ring on OK. It must not be the Delete button.
    expect(box.strOKButtonText).not.toBe("Delete");
    (box.onOK as () => void)();
    (box.onCancel as () => void)();
    expect(onDeleteSlot).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("still deletes, on its own labelled button, for the right chat", () => {
    const onDeleteSlot = vi.fn(async () => true);
    const box = openDeleteBox(onDeleteSlot);
    expect(box.strMiddleButtonText).toBe("Delete");
    (box.onMiddleButton as () => void)();
    expect(onDeleteSlot).toHaveBeenCalledTimes(1);
    expect(onDeleteSlot).toHaveBeenCalledWith("b");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
