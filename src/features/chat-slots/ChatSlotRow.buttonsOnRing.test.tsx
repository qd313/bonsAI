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
    expect(stop(container)).toBe("delete");
    expect(shown(container.querySelector(".bonsai-chat-slot-save"))).toBe(true);
    expect(shown(container.querySelector(".bonsai-chat-slot-delete"))).toBe(true);
  });

  it("walks Delete -> Save -> Delete, each stop once, never the name, and A works on each", () => {
    const onSaveChat = vi.fn();
    const onBeforeNestedDeckyModal = vi.fn();
    const { container } = render(row({ onSaveChat, onBeforeNestedDeckyModal }));
    ringOnRow(true);
    const visited: string[] = [stop(container)];
    const presses: Array<"Left" | "Right"> = ["Left", "Right"];
    for (const dir of presses) {
      expect(move(dir)).toBe(true);
      visited.push(stop(container));
    }
    expect(visited).toEqual(["delete", "save", "delete"]);
    expect(visited).not.toContain("title");
    // Bounded: two presses and the walk is over; none of the other directions was needed.
    expect(presses.length).toBeLessThanOrEqual(2);

    move("Left");
    expect(pressA()).toBe(true);
    expect(onSaveChat).toHaveBeenCalledTimes(1);
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

/*
 * Round two (Deck 2026-10-02): the name's box moved 15px right, lost 32px of width and dropped 2px
 * when the ring came onto the row. jsdom lays nothing out, so the claim is proved by its causes: every
 * box that decides where the name sits has the same layout-deciding style with the ring off and on.
 * What moved it: the LB/RB pills (drawn only with the ring, so the middle shrank by 84px), the
 * neighbours (in the flow at rest and display:none with the ring, so they shared out the room), and
 * the row's top padding (5px at rest, 7px with the ring).
 */
const LAYOUT_PROPS = [
  "display", "position", "width", "min-width", "max-width", "flex-grow", "flex-shrink", "flex-basis",
  "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right",
  "padding-bottom", "padding-left", "gap", "left", "right", "top", "bottom", "box-sizing",
  "font-size", "line-height", "min-height", "align-self", "justify-content", "transform",
];
const BOXES = [
  ".bonsai-chat-slot-row-inner", ".bonsai-chat-slot-bumper-pill:first-child",
  ".bonsai-chat-slot-center", ".bonsai-chat-slot-title-row", ".bonsai-chat-slot-title",
  ".bonsai-chat-slot-ghost-anchor--prev", ".bonsai-chat-slot-ghost-anchor--next",
  ".bonsai-chat-slot-save", ".bonsai-chat-slot-delete",
];
function layoutOf(container: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const sel of BOXES) {
    const el = container.querySelector(sel);
    expect(el, sel).not.toBeNull();
    const cs = getComputedStyle(el as Element);
    for (const prop of LAYOUT_PROPS) out[`${sel} ${prop}`] = cs.getPropertyValue(prop);
  }
  const pills = container.querySelectorAll(".bonsai-chat-slot-bumper-pill");
  out["pill count"] = String(pills.length);
  for (const pill of Array.from(pills)) out[`pill display`] = getComputedStyle(pill).display;
  // What is in the flow of the name's line: only the name may be (the buttons and neighbours are not).
  const inFlow = Array.from(container.querySelector(".bonsai-chat-slot-title-row")!.children)
    .filter((c) => {
      const cs = getComputedStyle(c);
      return cs.display !== "none" && cs.position !== "absolute";
    })
    .map((c) => c.className);
  out["in flow of the name line"] = inFlow.join(" | ");
  return out;
}

describe("the chat's name stays put when the ring comes onto the row", () => {
  for (const [what, props] of [
    ["a chat with a neighbour each side", { activeSlotId: "b" }],
    ["the newest chat, with a neighbour on one side only", { activeSlotId: "a" }],
  ] as const) {
    it(`${what}: the same boxes with the ring off and on`, () => {
      const { container } = render(row(props));
      const off = layoutOf(container);
      ringOnRow(true);
      const on = layoutOf(container);
      expect(on).toEqual(off);
      // Both pills' room is held at rest, and only the name is in the flow of its line.
      expect(off["pill count"]).toBe("2");
      expect(off["in flow of the name line"]).toContain("bonsai-chat-slot-title");
      // The zero-width anchors are in the flow but take no room; the neighbours themselves are not.
      expect(off["in flow of the name line"]).not.toMatch(/ghost(?!-anchor)/);
    });
  }

  it("keeps the pills unseen until the ring arrives, and the neighbours until it leaves", () => {
    const { container } = render(row());
    const pills = () => Array.from(container.querySelectorAll(".bonsai-chat-slot-bumper-pill"));
    expect(pills().every((p) => getComputedStyle(p).visibility === "hidden")).toBe(true);
    ringOnRow(true);
    expect(pills().every((p) => getComputedStyle(p).visibility !== "hidden")).toBe(true);
    ringOnRow(false);
    const ghost = container.querySelector(".bonsai-chat-slot-ghost--prev");
    expect(getComputedStyle(ghost!).display).not.toBe("none");
  });
});
