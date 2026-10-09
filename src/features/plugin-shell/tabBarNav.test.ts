/**
 * Title: Tab bar D-pad and bumper handlers
 * Purpose: Pin what each press on the tab bar does before any of it reaches a Focusable.
 * Used for: plan 30 W4.
 * Solves: The handler table in the plan (§ 4.3) is the contract; this is the cheap half of it.
 * Does not: Prove Steam delivers the presses — that is on-device (TAB-BAR-03, -04).
 */
import { describe, expect, it, vi } from "vitest";

import { buildTabBarNavHandlers, neighbourTab, tabBarSides } from "./tabBarNav";

const SIX = ["main", "ollama", "settings", "permissions", "developer", "about"] as const;
const FIVE = SIX.filter((id) => id !== "developer");

/** The shape `deckButtonId` reads: a GamepadEvent with `detail.button`. A = 1, B = 2, LB = 5, RB = 6. */
const press = (button: number) => ({ detail: { button } });

describe("neighbourTab", () => {
  it("steps to the next and previous tab", () => {
    expect(neighbourTab(SIX, "settings", 1)).toBe("permissions");
    expect(neighbourTab(SIX, "settings", -1)).toBe("ollama");
  });

  it("wraps at both ends, the way LB and RB do on the device", () => {
    expect(neighbourTab(SIX, "main", -1)).toBe("about");
    expect(neighbourTab(SIX, "about", 1)).toBe("main");
  });

  it("resolves an unknown current tab to the first one, and an empty list to nothing", () => {
    expect(neighbourTab(SIX, "nope", 1)).toBe("main");
    expect(neighbourTab([], "main", 1)).toBeNull();
  });
});

describe("buildTabBarNavHandlers", () => {
  const make = (currentTab = "settings", exitDown: () => boolean = () => true) => {
    const selectTab = vi.fn();
    const h = buildTabBarNavHandlers({ tabIds: SIX, currentTab, selectTab, exitDown });
    return { h, selectTab };
  };

  it("Left and Right switch to the neighbour and always claim the press", () => {
    const { h, selectTab } = make();
    expect(h.onMoveRight()).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("permissions");
    expect(h.onMoveLeft()).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("ollama");
  });

  it("wraps rather than stopping at the ends, so Left/Right and LB/RB agree", () => {
    const first = make("main");
    expect(first.h.onMoveLeft()).toBe(true);
    expect(first.selectTab).toHaveBeenCalledWith("about");
    const last = make("about");
    expect(last.h.onMoveRight()).toBe(true);
    expect(last.selectTab).toHaveBeenCalledWith("main");
  });

  it("switches on LB and RB itself, because Steam cannot see a bumper pressed outside its Tabs", () => {
    const { h, selectTab } = make();
    expect(h.onButtonDown(press(6))).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("permissions");
    expect(h.onButtonDown(press(5))).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("ollama");
  });

  it("leaves A and every other button to Steam", () => {
    const { h, selectTab } = make();
    expect(h.onButtonDown(press(1))).toBe(false);
    expect(h.onButtonDown(press(2))).toBe(false);
    expect(selectTab).not.toHaveBeenCalled();
  });

  it("does not re-select the current tab when there is nowhere to go", () => {
    const selectTab = vi.fn();
    const h = buildTabBarNavHandlers({ tabIds: ["main"], currentTab: "main", selectTab, exitDown: () => true });
    expect(h.onMoveRight()).toBe(true);
    expect(selectTab).not.toHaveBeenCalled();
  });

  it("Down claims the press only when the handover moved the ring", () => {
    expect(make("settings", () => true).h.onMoveDown()).toBe(true);
    expect(make("settings", () => false).h.onMoveDown()).toBe(false);
  });

  it("Up never claims, so Steam takes the ring to Decky's Back button as it did from the strip", () => {
    expect(make().h.onMoveUp()).toBe(false);
  });

  it("with upHolds (the bar at the very top, plan 84 step 6) Up claims and switches nothing", () => {
    const selectTab = vi.fn();
    const exitDown = vi.fn(() => true);
    const h = buildTabBarNavHandlers({ tabIds: FIVE, currentTab: "settings", selectTab, exitDown, upHolds: true });
    expect(h.onMoveUp()).toBe(true);
    expect(selectTab).not.toHaveBeenCalled();
    expect(exitDown).not.toHaveBeenCalled();
  });
});

describe("tabBarSides (plan 84 step 4, T3)", () => {
  /** The tabs LB reaches, nearest first, by pressing it again and again. */
  const lbOrder = (ids: readonly string[], current: string) => {
    const out: string[] = [];
    let at = current;
    for (let i = 1; i < ids.length; i++) {
      at = neighbourTab(ids, at, -1)!;
      out.push(at);
    }
    return out;
  };

  it.each([
    ["five", FIVE],
    ["six", SIX],
  ] as const)("at %s tabs, every current tab shows each other tab exactly once, LB's on the left and RB's on the right", (_n, ids) => {
    for (const current of ids) {
      const { left, right } = tabBarSides(ids, current);
      const n = ids.length;
      expect(left).toHaveLength(Math.floor((n - 1) / 2));
      expect(right).toHaveLength(n - 1 - Math.floor((n - 1) / 2));
      // Each other tab once, the current tab never.
      expect([...left, ...right].sort()).toEqual(ids.filter((id) => id !== current).sort());
      // Left, read from the name outward, is what LB reaches press by press; right is what RB reaches.
      expect([...left].reverse()).toEqual(lbOrder(ids, current).slice(0, left.length));
      const rbReach: string[] = [];
      let at: string = current;
      for (let i = 0; i < right.length; i++) {
        at = neighbourTab(ids, at, 1)!;
        rbReach.push(at);
      }
      expect(right).toEqual(rbReach);
    }
  });

  it("wraps at both ends, as the drawing does: Main at six tabs has Developer and About on its left", () => {
    expect(tabBarSides(SIX, "main")).toEqual({ left: ["developer", "about"], right: ["ollama", "settings", "permissions"] });
    expect(tabBarSides(FIVE, "about")).toEqual({ left: ["settings", "permissions"], right: ["main", "ollama"] });
  });

  it("shows no sides for a tab that is not mounted, so a stale id claims nothing", () => {
    expect(tabBarSides(FIVE, "developer")).toEqual({ left: [], right: [] });
    expect(tabBarSides([], "main")).toEqual({ left: [], right: [] });
  });
});
