/**
 * Title: The chat row's save icon and its new-chat spot
 *
 * Purpose: Pin the maintainer's pick from the true-size drawing of 2026-09-27 (plan 72, lane 5):
 * a save icon at the row's left end, the mirror of the ×, which replaces the "Save chat to
 * Desktop" button under the last answer; and a pencil with the words "New chat" at the new-chat
 * spot, with just the pencil beside the newest chat.
 *
 * Does not: Press anything on the Deck. The D-pad moves here are Steam's own move handlers,
 * called directly from the props the row hands its Focusable -- the stub records them.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import type { ChatSlotSummary } from "../../utils/chatSlotsApi";
import * as navFocusRegistry from "../../utils/navFocusRegistry";

type Handlers = Record<string, unknown>;
let rowProps: Handlers = {};

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
  return { ...fake, Focusable };
});

import { ChatSlotRow } from "./ChatSlotRow";

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
      onSaveChat={() => undefined}
      canSaveChat
      {...overrides}
    />
  );
}

/** Calls one of Steam's move handlers the row hands its Focusable, as Steam would. */
function move(dir: "Left" | "Right" | "Up" | "Down"): unknown {
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

function activeStop(container: HTMLElement): string {
  if (container.querySelector(".bonsai-chat-slot-save--active-stop")) return "save";
  if (container.querySelector(".bonsai-chat-slot-delete--active-stop")) return "delete";
  if (container.querySelector(".bonsai-chat-slot-title--active-stop")) return "title";
  return "none";
}

beforeEach(() => {
  rowProps = {};
});
afterEach(() => {
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
});

describe("the save icon", () => {
  it("sits at the row's left end, a floppy disk drawn in the ×'s box", () => {
    const { container } = render(row());
    const save = container.querySelector(".bonsai-chat-slot-save");
    expect(save).not.toBeNull();
    expect(save!.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(save!.querySelectorAll("svg path").length).toBe(3);
    // Left end: it comes before the name, the × after it.
    const title = container.querySelector(".bonsai-chat-slot-title")!;
    expect(save!.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("Left from the name lands on it; Left again stays on it; Right goes back to the name", () => {
    const { container } = render(row());
    expect(activeStop(container)).toBe("title");
    expect(move("Left")).toBe(true);
    expect(activeStop(container)).toBe("save");
    expect(move("Left")).toBe(true);
    expect(activeStop(container)).toBe("save");
    expect(move("Right")).toBe(true);
    expect(activeStop(container)).toBe("title");
  });

  it("Right from the name still lands on the ×, and Left from the × comes back to the name", () => {
    const { container } = render(row());
    expect(move("Right")).toBe(true);
    expect(activeStop(container)).toBe("delete");
    expect(move("Left")).toBe(true);
    expect(activeStop(container)).toBe("title");
  });

  it("A on it opens the save window, and not the rename window", () => {
    const onSaveChat = vi.fn();
    const onRenameSlot = vi.fn(async () => true);
    render(row({ onSaveChat, onRenameSlot }));
    move("Left");
    expect(pressA()).toBe(true);
    expect(onSaveChat).toHaveBeenCalledTimes(1);
    expect(onRenameSlot).not.toHaveBeenCalled();
  });

  it("Up from it goes to the tab bar through Steam's transfer, like the rest of the row", () => {
    const spy = vi.spyOn(navFocusRegistry, "takeNavFocus");
    render(row());
    move("Left");
    move("Up");
    expect(spy).toHaveBeenCalledWith("tab-bar");
    expect(move("Down")).toBe(false);
  });

  it("is not drawn while the chat has nothing to save, and Left from the name then stays put", () => {
    const { container } = render(row({ canSaveChat: false }));
    expect(container.querySelector(".bonsai-chat-slot-save")).toBeNull();
    expect(move("Left")).toBe(true);
    expect(activeStop(container)).toBe("title");
  });

  it("turns up in the same chat as soon as its first answer is there", () => {
    const { container, rerender } = render(row({ canSaveChat: false }));
    expect(container.querySelector(".bonsai-chat-slot-save")).toBeNull();
    rerender(row({ canSaveChat: true }));
    expect(container.querySelector(".bonsai-chat-slot-save")).not.toBeNull();
    expect(move("Left")).toBe(true);
    expect(activeStop(container)).toBe("save");
  });

  it("looks dimmed while saving is not allowed, and A still opens the window (it asks for the permission)", () => {
    const onSaveChat = vi.fn();
    const { container } = render(row({ onSaveChat, saveChatEnabled: false }));
    expect(container.querySelector(".bonsai-chat-slot-save--disabled")).not.toBeNull();
    move("Left");
    pressA();
    expect(onSaveChat).toHaveBeenCalledTimes(1);
  });
});

describe("the delete button", () => {
  it("draws the bin with two slots, not the letter x", () => {
    const { container } = render(row());
    const del = container.querySelector(".bonsai-chat-slot-delete")!;
    expect(del.textContent).toBe("");
    expect(del.textContent).not.toContain("×");
    const svg = del.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("width")).toBe("14");
    expect(Array.from(svg.querySelectorAll("path")).map((p) => p.getAttribute("d"))).toEqual([
      "M3 6h18",
      "M8 6V4h8v2",
      "M6 6l1 14h10l1-14",
      "M10 10.5v6",
      "M14 10.5v6",
    ]);
  });
});

describe("the new-chat spot", () => {
  it("shows a pencil and the words New chat, with no save icon and no ×", () => {
    const { container } = render(row({ activeSlotId: null }));
    const label = container.querySelector(".bonsai-chat-slot-newchat");
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe("New chat");
    expect(label!.querySelector("svg")).not.toBeNull();
    expect(container.textContent).not.toContain("[+]");
    expect(container.querySelector(".bonsai-chat-slot-save")).toBeNull();
    expect(container.querySelector(".bonsai-chat-slot-delete")).toBeNull();
  });

  it("claims Left and Right without moving, so Left never leaves bonsAI", () => {
    render(row({ activeSlotId: null }));
    expect(move("Left")).toBe(true);
    expect(move("Right")).toBe(false);
  });

  it("A there still starts a new chat", () => {
    const onCreateSlot = vi.fn(async () => undefined);
    render(row({ activeSlotId: null, onCreateSlot }));
    expect(pressA()).toBe(true);
    expect(onCreateSlot).toHaveBeenCalledTimes(1);
  });

  it("beside the newest chat shows just the pencil, no words", () => {
    const { container } = render(row({ activeSlotId: "a" }));
    const ghost = container.querySelector(".bonsai-chat-slot-ghost--create");
    expect(ghost).not.toBeNull();
    expect(ghost!.querySelector("svg")).not.toBeNull();
    expect(ghost!.textContent).toBe("");
  });

  it("leaves the tiny + at the left end of the dots exactly as it was", () => {
    const { container } = render(row());
    expect(container.querySelector(".bonsai-chat-slot-dot--create")?.textContent).toBe("+");
  });
});
