/**
 * How it works: the Strategy checklist's steps are checkboxes, not switches (plan 96, F19).
 *
 * The maintainer's call of 2026-10-17: a list you tick off should look like a list you tick off. These
 * tests render the panel the way an answer draws it and check what the person sees: each step is a
 * checkbox row with a tick box and its words, a ticked step shows a tick and its words go struck
 * through, A (a press on the row) ticks and unticks, and the first and last step still carry the Up and
 * Down handlers the live-turn ring path hangs on. No step is drawn as Steam's on/off switch any more.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";

const handed: Record<string, unknown>[] = [];

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const R = await import("react");
  // The real stub drops Steam's move handlers from the page; record what each step was handed first.
  const Button = R.forwardRef<HTMLButtonElement, Record<string, unknown>>(function Recording(props, ref) {
    handed.push(props);
    return R.createElement(stubs.Button as React.ElementType, { ...props, ref });
  });
  return { ...stubs, Button };
});

import { StrategyChecklistPanel } from "./StrategyChecklistPanel";
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
  const view = render(<StrategyChecklistPanel checklist={CHECKLIST} onToggle={onToggle} {...extra} />);
  return { ...view, onToggle };
}

describe("the Strategy checklist draws checkboxes (plan 96, F19)", () => {
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

  it("keeps the ring path: the first step takes Up, the last takes Down, the middle takes neither", () => {
    const up = vi.fn(() => false);
    const down = vi.fn(() => false);
    draw(vi.fn(), { onMoveUpFromFirst: up, onMoveDownFromLast: down });
    const byLabel = (n: number) => handed.filter((p) => p["role"] === "checkbox")[n];
    expect(typeof byLabel(0).onMoveUp).toBe("function");
    expect(byLabel(0).onMoveDown).toBeUndefined();
    expect(byLabel(1).onMoveUp).toBeUndefined();
    expect(byLabel(1).onMoveDown).toBeUndefined();
    expect(byLabel(2).onMoveUp).toBeUndefined();
    expect(typeof byLabel(2).onMoveDown).toBe("function");
    (byLabel(0).onMoveUp as () => boolean)();
    (byLabel(2).onMoveDown as () => boolean)();
    expect(up).toHaveBeenCalledTimes(1);
    expect(down).toHaveBeenCalledTimes(1);
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
