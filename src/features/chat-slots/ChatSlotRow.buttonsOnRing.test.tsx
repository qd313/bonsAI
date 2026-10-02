/**
 * Title: The chat row's Save and Delete buttons show only while the ring is on the row
 *
 * Purpose: Pin the roadmap feature "Show a chat's Save and Delete buttons only while its tab has the
 * ring" (plan 79, helper J). Resting, the row shows the chat's name and nothing beside it; the disk
 * and the × appear when the ring lands on the row, stay while it moves between them, and go when it
 * leaves. Checked at the level the Deck is looked at: the REAL stylesheet is put on the page and the
 * answer is the buttons' computed visibility, not a class name.
 *
 * How they are hidden: `visibility: hidden`, by a rule keyed on the row's own `--focused` class. The
 * disk and the × are not separate controls: they are two drawn spans inside the row's one Focusable,
 * and "which of the three stops is lit" is the row's own state, moved by its move handlers. A
 * hidden span therefore costs the D-pad nothing, and `visibility` (unlike `display: none`) also
 * keeps the 22px boxes where they are, so the name does not jump sideways when they appear.
 *
 * Does not: prove the look on the Deck; jsdom paints nothing. The two Steam things it models are
 * the ones the row depends on: Steam's focus events and its move handlers.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import type { ChatSlotSummary } from "../../utils/chatSlotsApi";
import { buildSavedChatSlotsRowSection } from "../../styles/sections/savedChatSlotsRow";
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
    <div className="bonsai-scope">
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
    </div>
  );
}

/** Steam puts the ring on the row, or takes it away: its focus events on the row's Focusable. */
function ringOnRow(on: boolean) {
  act(() => {
    (rowProps[on ? "onFocus" : "onBlur"] as () => void)();
  });
}
/** One of Steam's move handlers, as Steam calls it. */
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

function stop(container: HTMLElement): string {
  if (container.querySelector(".bonsai-chat-slot-save--active-stop")) return "save";
  if (container.querySelector(".bonsai-chat-slot-delete--active-stop")) return "delete";
  return "title";
}
/** What a person sees: the computed answer with the real stylesheet applied, not a class name. */
function shown(el: Element | null): boolean {
  expect(el).not.toBeNull();
  return getComputedStyle(el as Element).visibility !== "hidden";
}

let styleEl: HTMLStyleElement;
beforeEach(() => {
  rowProps = {};
  styleEl = document.createElement("style");
  styleEl.textContent = buildSavedChatSlotsRowSection();
  document.head.appendChild(styleEl);
});
afterEach(() => {
  styleEl.remove();
  vi.restoreAllMocks();
  navFocusRegistry.resetNavFocusRegistry();
});

describe("Save and Delete show only while the ring is on the chat's row", () => {
  it("hides both while the ring is anywhere else", () => {
    const { container } = render(row());
    expect(shown(container.querySelector(".bonsai-chat-slot-save"))).toBe(false);
    expect(shown(container.querySelector(".bonsai-chat-slot-delete"))).toBe(false);
    // The name stays: only the two buttons go.
    expect(shown(container.querySelector(".bonsai-chat-slot-title"))).toBe(true);
  });

  it("shows both when the ring lands on the row, and hides them again when it leaves", () => {
    const { container } = render(row());
    ringOnRow(true);
    expect(shown(container.querySelector(".bonsai-chat-slot-save"))).toBe(true);
    expect(shown(container.querySelector(".bonsai-chat-slot-delete"))).toBe(true);
    ringOnRow(false);
    expect(shown(container.querySelector(".bonsai-chat-slot-save"))).toBe(false);
    expect(shown(container.querySelector(".bonsai-chat-slot-delete"))).toBe(false);
  });

  it("keeps them shown while the ring sits on either of them", () => {
    const { container } = render(row());
    ringOnRow(true);
    move("Left");
    expect(stop(container)).toBe("save");
    expect(shown(container.querySelector(".bonsai-chat-slot-save"))).toBe(true);
    expect(shown(container.querySelector(".bonsai-chat-slot-delete"))).toBe(true);
    move("Right");
    move("Right");
    expect(stop(container)).toBe("delete");
    expect(shown(container.querySelector(".bonsai-chat-slot-save"))).toBe(true);
    expect(shown(container.querySelector(".bonsai-chat-slot-delete"))).toBe(true);
  });

  it("walks tab -> Save -> tab -> Delete -> tab, each stop once, and A works on each", () => {
    const onSaveChat = vi.fn();
    const onBeforeNestedDeckyModal = vi.fn();
    const { container } = render(row({ onSaveChat, onBeforeNestedDeckyModal }));
    ringOnRow(true);
    const visited: string[] = [stop(container)];
    const presses: Array<"Left" | "Right"> = ["Left", "Right", "Right", "Left"];
    for (const dir of presses) {
      expect(move(dir)).toBe(true);
      visited.push(stop(container));
    }
    expect(visited).toEqual(["title", "save", "title", "delete", "title"]);
    expect(visited.filter((s) => s === "save")).toHaveLength(1);
    expect(visited.filter((s) => s === "delete")).toHaveLength(1);
    // Bounded: four presses and the walk is over; none of the other directions was needed.
    expect(presses.length).toBeLessThanOrEqual(4);

    move("Left");
    expect(pressA()).toBe(true);
    expect(onSaveChat).toHaveBeenCalledTimes(1);
    move("Right");
    move("Right");
    expect(pressA()).toBe(true);
    expect(onBeforeNestedDeckyModal).toHaveBeenCalledTimes(1);
  });

  it("does not move the name: the buttons keep their boxes whether shown or hidden", () => {
    const { container } = render(row());
    const save = container.querySelector(".bonsai-chat-slot-save") as HTMLElement;
    const del = container.querySelector(".bonsai-chat-slot-delete") as HTMLElement;
    const rest = [getComputedStyle(save).position, getComputedStyle(del).position];
    const restDisplay = [getComputedStyle(save).display, getComputedStyle(del).display];
    ringOnRow(true);
    expect([getComputedStyle(save).position, getComputedStyle(del).position]).toEqual(rest);
    expect([getComputedStyle(save).display, getComputedStyle(del).display]).toEqual(restDisplay);
    // Out of the flow in both states (so the centred name cannot shift), and never display:none.
    expect(rest).toEqual(["absolute", "absolute"]);
    expect(restDisplay).not.toContain("none");
  });

  it("is still the same two buttons in the page when hidden, so the D-pad stops are unchanged", () => {
    const { container } = render(row());
    expect(container.querySelector(".bonsai-chat-slot-save")).not.toBeNull();
    expect(container.querySelector(".bonsai-chat-slot-delete")).not.toBeNull();
    // Ring elsewhere, nothing focused: the handlers the row owns still answer the same way.
    expect(move("Left")).toBe(true);
    expect(stop(container)).toBe("save");
  });
});
