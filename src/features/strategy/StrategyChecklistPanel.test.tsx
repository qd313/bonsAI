/**
 * How it works: the Strategy checklist's steps are checkboxes, not switches (plan 96, F19).
 *
 * The maintainer's call of 2026-10-17: a list you tick off should look like a list you tick off. These
 * tests render the panel the way an answer draws it and check what the person sees: each step is a
 * checkbox row with a tick box and its words, a ticked step shows a tick and its words go struck
 * through, A (a press on the row) ticks and unticks, and the first and last step still carry the Up and
 * Down handlers the live-turn ring path hangs on. No step is drawn as Steam's on/off switch any more.
 *
 * Plan 96 F4 (workshop:test-evidence/plan96-P96-F4-TICK.json): on the Deck no step could be reached or ticked,
 * because the answer's chain moved the page's focus while Steam's ring stayed on the answer. Each step now sits
 * in a Focusable wrapper that carries the Up/Down handlers and the step's own nav node, so the chain can hand
 * Steam's ring over. The stand-in strips those props from the page, so the wrapper mock below records them first.
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";

const handed: Record<string, unknown>[] = [];
const wrapped: Record<string, unknown>[] = [];

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const R = await import("react");
  // The real stub drops Steam's move handlers from the page; record what each step was handed first.
  const Button = R.forwardRef<HTMLButtonElement, Record<string, unknown>>(function Recording(props, ref) {
    handed.push(props);
    return R.createElement(stubs.Button as React.ElementType, { ...props, ref });
  });
  // Same for the wrapper around each step: it carries Steam's nav props, which the stand-in drops from the page.
  const Focusable = R.forwardRef<HTMLDivElement, Record<string, unknown>>(function RecordingWrap(props, ref) {
    if (props["className"] === "bonsai-strategy-checklist-step-wrap") wrapped.push(props);
    return R.createElement(stubs.Focusable as React.ElementType, { ...props, ref });
  });
  return { ...stubs, Button, Focusable };
});

import { StrategyChecklistPanel } from "./StrategyChecklistPanel";
import {
  resetStrategyChecklistNavForTests,
  strategyChecklistStepNav,
  takeStrategyChecklistStep,
} from "../../shared/dpad/strategyChecklistNav";
import type { StrategyChecklistState } from "../../types/bonsaiUi";

const CHECKLIST: StrategyChecklistState = {
  title: "Managing Heat and Weapon Choice",
  items: [
    { id: "1", label: "Engage in combat to build heat levels" },
    { id: "2", label: "Try the Stygian Blade" },
    { id: "3", label: "Use a Boon that adds dash" },
  ],
  checkedIds: ["2"],
};

function draw(onToggle = vi.fn(), extra: Partial<React.ComponentProps<typeof StrategyChecklistPanel>> = {}) {
  handed.length = 0;
  wrapped.length = 0;
  const view = render(<StrategyChecklistPanel checklist={CHECKLIST} onToggle={onToggle} {...extra} />);
  return { ...view, onToggle };
}

describe("the Strategy checklist draws checkboxes (plan 96, F19)", () => {
  afterEach(() => resetStrategyChecklistNavForTests());

  it("draws every step as a checkbox and none as an on/off switch", () => {
    const { container } = draw();
    const boxes = container.querySelectorAll('[role="checkbox"]');
    expect(boxes).toHaveLength(3);
    expect(container.querySelectorAll('[data-decky-ui="ToggleField"]')).toHaveLength(0);
    expect(Array.from(boxes).map((b) => b.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
  });

  it("shows a ticked step as done: a tick mark and struck-through words", () => {
    const { container } = draw();
    const [first, second] = Array.from(container.querySelectorAll<HTMLElement>('[role="checkbox"]'));
    expect(first.querySelector(".bonsai-strategy-checklist-box")?.textContent).toBe("");
    expect(second.querySelector(".bonsai-strategy-checklist-box")?.textContent).toBe("✔");
    const words = (el: HTMLElement) => el.querySelectorAll<HTMLElement>("span")[1];
    expect(words(first).style.textDecoration).toBe("none");
    expect(words(second).style.textDecoration).toBe("line-through");
    expect(second.textContent).toContain("Try the Stygian Blade");
  });

  it("A ticks an unticked step and unticks a ticked one", () => {
    const { container, onToggle } = draw();
    const boxes = container.querySelectorAll<HTMLElement>('[role="checkbox"]');
    fireEvent.click(boxes[0]);
    expect(onToggle).toHaveBeenLastCalledWith("1", true);
    fireEvent.click(boxes[1]);
    expect(onToggle).toHaveBeenLastCalledWith("2", false);
  });

  it("draws each step button inside its own wrapper, one wrapper per step (plan 96 F4)", () => {
    // plan96-P96-F4-TICK.json: the steps had no node of their own for Steam to send the ring to.
    const { container } = draw();
    const wraps = container.querySelectorAll<HTMLElement>(".bonsai-strategy-checklist-step-wrap");
    expect(wraps).toHaveLength(3);
    wraps.forEach((wrap, i) => {
      const buttons = wrap.querySelectorAll("button");
      expect(buttons).toHaveLength(1);
      expect(buttons[0].getAttribute("role")).toBe("checkbox");
      expect(buttons[0].textContent).toContain(CHECKLIST.items[i].label);
    });
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(3);
  });

  it("hands each wrapper its own step's nav node, so the answer's chain can send Steam's ring there", () => {
    draw();
    expect(wrapped).toHaveLength(3);
    wrapped.forEach((props, i) => {
      expect(props["navRef"]).toBe(strategyChecklistStepNav(i));
    });
  });

  it("keeps the ring path: the first step's wrapper takes Up, the last takes Down, the middle takes neither", () => {
    const up = vi.fn(() => false);
    const down = vi.fn(() => false);
    draw(vi.fn(), { onMoveUpFromFirst: up, onMoveDownFromLast: down });
    expect(wrapped).toHaveLength(3);
    expect(typeof wrapped[0].onMoveUp).toBe("function");
    expect(wrapped[0].onMoveDown).toBeUndefined();
    expect(wrapped[1].onMoveUp).toBeUndefined();
    expect(wrapped[1].onMoveDown).toBeUndefined();
    expect(wrapped[2].onMoveUp).toBeUndefined();
    expect(typeof wrapped[2].onMoveDown).toBe("function");
    (wrapped[0].onMoveUp as () => boolean)();
    (wrapped[2].onMoveDown as () => boolean)();
    expect(up).toHaveBeenCalledTimes(1);
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("no longer puts the move handlers on the step button itself", () => {
    draw(vi.fn(), { onMoveUpFromFirst: () => false, onMoveDownFromLast: () => false });
    const buttons = handed.filter((p) => p["role"] === "checkbox");
    expect(buttons).toHaveLength(3);
    buttons.forEach((p) => {
      expect(p.onMoveUp).toBeUndefined();
      expect(p.onMoveDown).toBeUndefined();
    });
  });

  it("tells the nav module how many steps are drawn, and clears it when the panel goes", () => {
    // takeStrategyChecklistStep("last") needs the count; a leftover count would aim at a step that is gone.
    const takeFocus = vi.fn(() => true);
    const lastStep = strategyChecklistStepNav(2);
    lastStep.current = { TakeFocus: takeFocus } as never;
    const { unmount } = draw();
    expect(takeStrategyChecklistStep("last")).toBe(true);
    expect(takeFocus).toHaveBeenCalledWith(true);
    unmount();
    takeFocus.mockClear();
    expect(takeStrategyChecklistStep("last")).toBe(false);
    expect(takeFocus).not.toHaveBeenCalled();
  });
});

describe("the note under the checklist title names only real actions (plan 96, F20)", () => {
  it("lists the four things that clear the ticks, by the names on screen", () => {
    const { container } = draw();
    const note = container.querySelector(".bonsai-strategy-checklist-note")?.textContent ?? "";
    expect(note).toContain("new Strategy question");
    expect(note).toContain("leave Strategy mode");
    expect(note).toContain("Clear cache");
    expect(note).toContain("Clear all data");
  });

  it("no longer names a button that does not exist", () => {
    const { container } = draw();
    const note = container.querySelector(".bonsai-strategy-checklist-note")?.textContent ?? "";
    expect(note.length).toBeGreaterThan(0);
    expect(note).not.toMatch(/session cache/i);
    expect(note).not.toMatch(/thread/i);
  });
});
