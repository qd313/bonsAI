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
import { act, fireEvent, render } from "@testing-library/react";
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

/*
 * Plan 98, H: the route look, as the maintainer's pick draws it (the mock-up board's tab 5, option C:
 * 45b-maps-r2.js "route", 48b-round2.css .m5-*). A five-step list draws step 1 open and steps 2 to 5 covered
 * on one line of dots; the first covered step reads "A shows this step", the later ones "Covered". A on the
 * first covered step shows it without ticking it, A on a later one does nothing; the shown step stays shown
 * when the panel is drawn again; ticking a step opens the next. Every covered step is still the same Decky
 * Button in its own wrapper with its own nav node, so the D-pad walk is the walk it was.
 */
describe("the checklist drawn as a route (plan 98, H)", () => {
  const ROUTE: StrategyChecklistState = {
    title: "To the False Knight",
    appId: "367520",
    items: [
      { id: "1", label: "Drop down the well in Dirtmouth" },
      { id: "2", label: "Go right past the stag station" },
      { id: "3", label: "Follow the path down to the arena" },
      { id: "4", label: "Hit him while he swings, then back off" },
      { id: "5", label: "Take the City Crest he drops" },
    ],
    checkedIds: [],
  };

  function drawRoute(checklist: StrategyChecklistState = ROUTE, onToggle = vi.fn()) {
    handed.length = 0;
    wrapped.length = 0;
    const view = render(<StrategyChecklistPanel checklist={checklist} onToggle={onToggle} />);
    const stops = () => Array.from(view.container.querySelectorAll<HTMLElement>(".bonsai-strategy-checklist-step"));
    const kinds = () => stops().map((s) => s.getAttribute("data-route-stop"));
    return { ...view, onToggle, stops, kinds };
  }

  afterEach(() => {
    resetStrategyChecklistNavForTests();
    window.localStorage.clear();
  });

  it("draws step 1 open and steps 2 to 5 covered: a bold Step N, 'A shows this step' on the first, 'Covered' after", () => {
    const { stops, kinds } = drawRoute();
    expect(kinds()).toEqual(["open", "covered", "covered", "covered", "covered"]);
    expect(stops()[0].textContent).toBe("Drop down the well in Dirtmouth");
    expect(stops().slice(1).map((s) => s.textContent)).toEqual([
      "Step 2A shows this step",
      "Step 3Covered",
      "Step 4Covered",
      "Step 5Covered",
    ]);
    stops().slice(1).forEach((stop, i) => {
      expect(stop.textContent).not.toContain(ROUTE.items[i + 1].label);
      expect(stop.style.color).toBe("rgb(138, 138, 116)");
    });
  });

  it("draws the drawing's dots: hollow cyan when open, hatched when covered, filled with a check when ticked, gold for the goal", () => {
    const dot = (stop: HTMLElement) => stop.querySelector<HTMLElement>(".bonsai-strategy-checklist-box")!;
    const fresh = drawRoute();
    const open = dot(fresh.stops()[0]);
    expect(open.style.width).toBe("12px");
    expect(open.style.borderRadius).toBe("50%");
    expect(open.style.borderColor).toBe("rgb(156, 231, 255)");
    expect(open.style.background).toBe("rgb(12, 18, 24)");
    expect(open.textContent).toBe("");
    const hatched = dot(fresh.stops()[1]);
    expect(hatched.style.borderColor).toBe("rgb(58, 70, 84)");
    expect(hatched.getAttribute("style")).toContain("repeating-linear-gradient");
    fresh.unmount();
    // Ticked step 1 and 4 shown by ticking 3: the goal (step 5) opens and wears the gold dot.
    const ticked = drawRoute({ ...ROUTE, checkedIds: ["1", "4"] });
    expect(dot(ticked.stops()[0]).style.background).toBe("rgb(156, 231, 255)");
    expect(dot(ticked.stops()[0]).textContent).toBe("✔");
    expect(ticked.kinds()[4]).toBe("open");
    expect(dot(ticked.stops()[4]).style.borderColor).toBe("rgb(250, 204, 21)");
    expect(dot(ticked.stops()[4]).style.background).toBe("rgb(250, 204, 21)");
  });

  it("joins the dots with one 2 px line per step, none after the last", () => {
    const { container } = drawRoute();
    const wraps = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-strategy-checklist-step-wrap"));
    const lines = wraps.map((w) => w.querySelector<HTMLElement>(".bonsai-strategy-checklist-line"));
    expect(lines.slice(0, 4).every((l) => l !== null)).toBe(true);
    expect(lines[4]).toBeNull();
    expect(lines[0]!.style.width).toBe("2px");
    expect(lines[0]!.style.background).toBe("rgb(111, 130, 150)");
  });

  it("A on a later covered step does nothing: it reads Covered", () => {
    const { stops, kinds, onToggle } = drawRoute();
    act(() => void fireEvent.click(stops()[3]));
    expect(onToggle).not.toHaveBeenCalled();
    expect(kinds()).toEqual(["open", "covered", "covered", "covered", "covered"]);
    expect(stops()[3].textContent).toBe("Step 4Covered");
  });

  it("A on a covered step shows it and does not tick it in the same press", () => {
    const { stops, kinds, onToggle } = drawRoute();
    const second = stops()[1];
    act(() => void fireEvent.click(second));
    expect(onToggle).not.toHaveBeenCalled();
    expect(kinds()).toEqual(["open", "open", "covered", "covered", "covered"]);
    // The same button stays under Steam's ring: the step was redrawn in place, not replaced.
    expect(stops()[1]).toBe(second);
    expect(second.textContent).toContain("Go right past the stag station");
    expect(second.getAttribute("role")).toBe("checkbox");
    // The next A on the now-open step ticks it, as any open step does.
    act(() => void fireEvent.click(second));
    expect(onToggle).toHaveBeenCalledWith("2", true);
  });

  it("a shown step stays shown when the panel is drawn again (close and reopen)", () => {
    const first = drawRoute();
    act(() => void fireEvent.click(first.stops()[1]));
    expect(first.kinds()).toEqual(["open", "open", "covered", "covered", "covered"]);
    first.unmount();
    const again = drawRoute();
    expect(again.kinds()).toEqual(["open", "open", "covered", "covered", "covered"]);
    // The next covered step is now the one A shows.
    expect(again.stops()[2].textContent).toBe("Step 3A shows this step");
  });

  it("a new list starts covered again, and the old list keeps what was shown on it", () => {
    const { rerender, stops, kinds, onToggle } = drawRoute();
    act(() => void fireEvent.click(stops()[1]));
    const next = { ...ROUTE, title: "To Greenpath" };
    rerender(<StrategyChecklistPanel checklist={next} onToggle={onToggle} />);
    expect(kinds()).toEqual(["open", "covered", "covered", "covered", "covered"]);
    rerender(<StrategyChecklistPanel checklist={ROUTE} onToggle={onToggle} />);
    expect(kinds()).toEqual(["open", "open", "covered", "covered", "covered"]);
  });

  it("ticking step 1 opens step 2 and leaves 3 to 5 covered", () => {
    const { rerender, kinds, onToggle } = drawRoute();
    rerender(<StrategyChecklistPanel checklist={{ ...ROUTE, checkedIds: ["1"] }} onToggle={onToggle} />);
    expect(kinds()).toEqual(["open", "open", "covered", "covered", "covered"]);
  });

  it("a two-step list has no covers", () => {
    const { kinds } = drawRoute({ ...ROUTE, items: ROUTE.items.slice(0, 2) });
    expect(kinds()).toEqual(["open", "open"]);
  });

  it("keeps every covered step a focusable Decky Button in its own wrapper with its own nav node", () => {
    const { stops } = drawRoute();
    expect(wrapped).toHaveLength(5);
    wrapped.forEach((props, i) => expect(props["navRef"]).toBe(strategyChecklistStepNav(i)));
    const buttons = handed.filter((p) => String(p["className"] ?? "").includes("bonsai-strategy-checklist-step"));
    expect(buttons).toHaveLength(5);
    buttons.forEach((p) => {
      expect(p["focusable"]).toBe(true);
      expect(p["disabled"]).toBeUndefined();
    });
    stops().forEach((s) => expect((s as HTMLButtonElement).disabled).toBe(false));
  });

  it("Down walks steps 1 to 5, covered ones too, each once, then leaves the list", () => {
    /*
     * The walk the Deck makes. A move between two steps is Steam's own (the steps are sibling Focusables in
     * one panel), modelled as the next wrapper in the panel; Down from the last step is the plugin's handler,
     * which hands the ring on to the rating row. The walk is bounded and no step may be visited twice.
     * Steam's scroll is not modelled here: every step has the same 32 px floor whether covered or open, so
     * the covers do not change where Steam scrolls the panel. The ring itself is the Deck row's job.
     */
    const leave = vi.fn(() => true);
    handed.length = 0;
    wrapped.length = 0;
    const { container } = render(
      <StrategyChecklistPanel checklist={ROUTE} onToggle={vi.fn()} onMoveDownFromLast={leave} />,
    );
    const wraps = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-strategy-checklist-step-wrap"));
    const visited: string[] = [];
    let at = 0;
    for (let press = 0; press < 12 && at < wraps.length; press++) {
      const stop = wraps[at].querySelector<HTMLElement>(".bonsai-strategy-checklist-step")!;
      visited.push(stop.getAttribute("data-route-step") ?? "?");
      const handler = wrapped[at]?.onMoveDown as (() => boolean) | undefined;
      if (handler) {
        expect(handler()).toBe(true);
        break;
      }
      at += 1; // Steam's own move to the next sibling stop
    }
    expect(visited).toEqual(["1", "2", "3", "4", "5"]);
    expect(new Set(visited).size).toBe(visited.length);
    expect(leave).toHaveBeenCalledTimes(1);
  });
});

/*
 * Plan 98, H: a "what you need" line under an open step, drawn only when the step's own words carry one
 * ("Needs: ..."). The model is not asked for it yet; a step without one draws no extra line.
 */
describe("the 'what you need' line under a route step (plan 98, H)", () => {
  afterEach(() => {
    resetStrategyChecklistNavForTests();
    window.localStorage.clear();
  });

  const NEEDS: StrategyChecklistState = {
    title: "Into the City of Tears",
    items: [
      { id: "1", label: "Beat the False Knight. Needs: a few masks of health" },
      { id: "2", label: "Drop into the Fungal Wastes" },
      { id: "3", label: "Open the city gate. Needs: the City Crest" },
    ],
    checkedIds: [],
  };

  it("draws the line under an open step that names what it needs, and none under a step that does not", () => {
    const { container } = render(<StrategyChecklistPanel checklist={{ ...NEEDS, checkedIds: ["1"] }} onToggle={vi.fn()} />);
    const stops = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-strategy-checklist-step"));
    const needsOf = (el: HTMLElement) => el.querySelector(".bonsai-strategy-checklist-needs")?.textContent ?? null;
    expect(needsOf(stops[0])).toBe("Needs: a few masks of health");
    expect(stops[0].textContent).toContain("Beat the False Knight.");
    expect(needsOf(stops[1])).toBeNull();
    expect(stops[1].textContent).toBe("Drop into the Fungal Wastes");
  });

  it("does not draw the line on a covered step", () => {
    const { container } = render(<StrategyChecklistPanel checklist={NEEDS} onToggle={vi.fn()} />);
    const third = container.querySelectorAll<HTMLElement>(".bonsai-strategy-checklist-step")[2];
    expect(third.getAttribute("data-route-stop")).toBe("covered");
    expect(third.querySelector(".bonsai-strategy-checklist-needs")).toBeNull();
    expect(third.textContent).not.toContain("City Crest");
  });
});
