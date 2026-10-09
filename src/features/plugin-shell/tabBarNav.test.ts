/**
 * Title: Tab bar D-pad and bumper handlers
 * Purpose: Pin what each press on the tab bar does before any of it reaches a Focusable.
 * Used for: plan 30 W4.
 * Solves: The handler table in the plan (§ 4.3) is the contract; this is the cheap half of it.
 * Does not: Prove Steam delivers the presses — that is on-device (TAB-BAR-03, -04).
 */
import { describe, expect, it, vi } from "vitest";

import { buildTabBarNavHandlers, neighbourTab } from "./tabBarNav";

const SIX = ["main", "ollama", "settings", "permissions", "developer", "about"] as const;

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
});
