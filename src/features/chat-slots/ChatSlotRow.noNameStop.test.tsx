/**
 * Title: The chat row's D-pad never stops on the chat's name
 *
 * Purpose: Pin the maintainer's call of 2026-10-06 for the chat row at the top of the Main tab (a
 * Save icon, the chat's name, a Delete icon). The name is not a button and has nothing to do, so
 * Left and Right step between Save and Delete only: Right from Save goes straight to Delete, Left
 * from Delete goes straight to Save. Whenever the ring comes onto the row from above (the tab bar's
 * Down) or from below (Up from the first question) it lands on Delete.
 *
 * Checked at the level the Deck is looked at: which of the three drawn things carries the ring
 * (the active-stop class the stylesheet turns into the ring), after the presses Steam delivers and
 * after the transfers Steam's registry makes. The registry call is the real one: the fake Focusable
 * below answers `TakeFocus` the way Steam does, with a focus event on the row.
 *
 * Does not: prove how the ring looks on the Deck; jsdom paints nothing.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import type { ChatSlotSummary } from "../../utils/chatSlotsApi";
import * as navFocusRegistry from "../../utils/navFocusRegistry";

type Handlers = Record<string, unknown>;
let rowProps: Handlers = {};
let shown: React.ReactElement[] = [];

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  const Focusable = React.forwardRef<HTMLDivElement, Handlers & { children?: React.ReactNode }>(
    function RecordingFocusable(props, ref) {
      if (props.className === "bonsai-chat-slot-row-focus") {
        rowProps = props;
        // Steam fills the row's navRef; its TakeFocus puts the ring on the row, which fires onFocus.
        (props.navRef as { current: unknown }).current = {
          TakeFocus: () => {
            act(() => (rowProps.onFocus as () => void)());
            return true;
          },
        };
      }
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
      return { Close: () => undefined, Update: () => undefined };
    },
  };
});

import { ChatSlotRow } from "./ChatSlotRow";
import { ChatSlotDeleteModal } from "./ChatSlotDeleteModal";

function summary(id: string, label: string): ChatSlotSummary {
  return { id, label, created_at: 0, updated_at: 0 };
}
const SUMMARIES = [summary("a", "Alpha"), summary("b", "Beta"), summary("c", "Gamma")];

function row(overrides: Partial<React.ComponentProps<typeof ChatSlotRow>> = {}) {
  return (
    <ChatSlotRow
      summaries={SUMMARIES}
      activeSlotId="b"
      onCreateSlot={async () => undefined}
      onSelectSlot={async () => undefined}
      onRenameSlot={async () => true}
      onDeleteSlot={async () => true}
      onBeforeNestedDeckyModal={() => undefined}
      onSaveChat={() => undefined}
      canSaveChat
      {...overrides}
    />
  );
}

function move(dir: "Left" | "Right"): unknown {
  let out: unknown;
  act(() => {
    out = (rowProps[`onMove${dir}`] as () => unknown)();
  });
  return out;
}
function pressA(): unknown {
  let out: unknown;
  act(() => {
    out = (rowProps.onButtonDown as (evt: unknown) => unknown)("a");
  });
  return out;
}
/** The ring arrives the way a Down from the tab bar or an Up from the first question delivers it. */
function enterRow(): void {
  expect(navFocusRegistry.takeNavFocus("chat-slot-row")).toBe(true);
}
function leaveRow(): void {
  act(() => (rowProps.onBlur as () => void)());
}
/** Which of the three drawn things carries the ring; "none" if more or fewer than one does. */
function ringOn(container: HTMLElement): string {
  const lit = [
    ["save", ".bonsai-chat-slot-save--active-stop"],
    ["name", ".bonsai-chat-slot-title--active-stop"],
    ["delete", ".bonsai-chat-slot-delete--active-stop"],
  ].filter(([, sel]) => container.querySelector(sel!) !== null);
  return lit.length === 1 ? lit[0]![0]! : "none";
}

beforeEach(() => {
  rowProps = {};
  shown = [];
});
afterEach(() => {
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
});

describe("the chat row's ring never rests on the name", () => {
  it("lands on Delete when the ring comes onto the row", () => {
    const { container } = render(row());
    enterRow();
    expect(ringOn(container)).toBe("delete");
  });

  it("Left from Delete goes straight to Save; Right from Save goes straight to Delete", () => {
    const { container } = render(row());
    enterRow();
    expect(move("Left")).toBe(true);
    expect(ringOn(container)).toBe("save");
    expect(move("Right")).toBe(true);
    expect(ringOn(container)).toBe("delete");
  });

  it("a bounded walk of presses never puts the ring on the name, and each of the two once", () => {
    const { container } = render(row());
    enterRow();
    const seen: string[] = [ringOn(container)];
    for (const dir of ["Left", "Left", "Right", "Left", "Right", "Right"] as const) {
      move(dir);
      seen.push(ringOn(container));
    }
    expect(seen).toEqual(["delete", "save", "save", "delete", "save", "delete", "delete"]);
    expect(seen).not.toContain("name");
    expect(seen).not.toContain("none");
  });

  it("Left at Save stays put and is claimed; Right at Delete is left to Steam", () => {
    const { container } = render(row());
    enterRow();
    move("Left");
    expect(move("Left")).toBe(true);
    expect(ringOn(container)).toBe("save");
    move("Right");
    expect(move("Right")).toBe(false);
    expect(ringOn(container)).toBe("delete");
  });

  it("coming back onto the row from above or below lands on Delete again, even after Save", () => {
    const { container } = render(row());
    enterRow();
    move("Left");
    expect(ringOn(container)).toBe("save");
    leaveRow();
    enterRow();
    expect(ringOn(container)).toBe("delete");
  });

  it("with no Save icon, Left from Delete is claimed and stays on Delete", () => {
    const { container } = render(row({ canSaveChat: false }));
    enterRow();
    expect(container.querySelector(".bonsai-chat-slot-save")).toBeNull();
    expect(move("Left")).toBe(true);
    expect(ringOn(container)).toBe("delete");
  });

  it("A on the stop the ring lands on is the delete question; Save's A opens the save window", () => {
    const onSaveChat = vi.fn();
    const onBeforeNestedDeckyModal = vi.fn();
    render(row({ onSaveChat, onBeforeNestedDeckyModal }));
    enterRow();
    pressA();
    expect(onBeforeNestedDeckyModal).toHaveBeenCalledTimes(1);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.type).toBe(ChatSlotDeleteModal);
    expect(onSaveChat).not.toHaveBeenCalled();
    move("Left");
    pressA();
    expect(onSaveChat).toHaveBeenCalledTimes(1);
  });

  it("the ring stays on Save when the save window closes and gives it back", () => {
    const { container } = render(row());
    enterRow();
    move("Left");
    pressA();
    leaveRow();
    enterRow();
    expect(ringOn(container)).toBe("save");
  });

  it("at the new-chat spot Left is claimed and Right is left to Steam, with no ring on a bin", () => {
    const { container } = render(row({ activeSlotId: null }));
    enterRow();
    expect(move("Left")).toBe(true);
    expect(move("Right")).toBe(false);
    expect(container.querySelector(".bonsai-chat-slot-delete")).toBeNull();
    expect(ringOn(container)).toBe("none");
  });
});
