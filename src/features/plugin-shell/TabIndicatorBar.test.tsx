/**
 * Title: The tab bar: T3, its presses and taps, the rule that hides Steam's header, and no ghost
 * Purpose: Pin what the bar shows for a given tab list and current tab (plan 84's T3: LB, the tabs
 *          before, the current tab's icon and name, the tabs after, RB), what each press and tap
 *          does, that LB and RB light only with the ring on the bar, that Steam's own header is
 *          hidden by a rule scoped to our own markup with no build-hashed class in it, and that
 *          nothing of the bar can ever be left drawn over the chip row (plan 84 step 4).
 * Used for: plan 30 W3 (docs/archive/30-collapsing-tab-bar.md § 5); plan 84 step 4, rows
 *           P84-TABS-01, P84-TABS-02, the LB/RB half of P84-HINTS-01, and TAB-BAR-GHOST-01.
 *           Where things sit on the 300-point bar is TabIndicatorBar.layout.test.tsx.
 * Solves: The ways this can rot silently — a hiding selector that quietly grows a Steam hash and
 *         stops matching after a client update (docs/audit/decky-tab-strip-classes.md is the prior
 *         art for that failure), and the faded ghost of the old drop-down strip, left over the chip
 *         row after touching the screen because its fade could freeze while a game ran.
 * Does not: Measure heights or where the ring lands on the Deck; jsdom has no layout and no gamepad.
 *           Computed styles here come from the real scope stylesheet through jsdom's own cascade,
 *           which follows source order only (no specificity, no !important).
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import React from "react";

import { TabIndicatorBar } from "./TabIndicatorBar";
import { neighbourTab } from "./tabBarNav";
import { ALL_BONSAI_TAB_IDS, BONSAI_TAB_SHORT_NAMES, type BonsaiTabId } from "./tabTitles";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { buildTabBarRules } from "../../styles/sections/tabIndicatorBar";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
}));

/*
 * A local override of the global `@decky/ui` mock (src/test-harness/setup.ts), the technique
 * ContextChipLadder.test.tsx uses: wraps the stub `Focusable` so the props Steam reads (onMoveLeft,
 * onButtonDown and the rest, which the stub strips before the DOM) can be called the way Steam
 * calls them on the Deck.
 */
vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    },
  );
  return { ...stubs, Focusable: CapturingFocusable };
});

/** The props Steam would read off the bar's own Focusable, from its latest render. */
function barProps(): Record<string, (...args: unknown[]) => unknown> {
  const matches = hoisted.focusableProps.filter((p) => p.className === "bonsai-tab-bar");
  return matches[matches.length - 1] as Record<string, (...args: unknown[]) => unknown>;
}

/** The shape `deckButtonId` reads: a GamepadEvent with `detail.button`. LB = 5, RB = 6. */
const press = (button: number) => ({ detail: { button } });

const SIX = ALL_BONSAI_TAB_IDS;
const FIVE: readonly BonsaiTabId[] = SIX.filter((id) => id !== "developer");

/** The bar with its two callbacks stubbed; tests that care pass their own. */
function bar(props: Partial<React.ComponentProps<typeof TabIndicatorBar>> = {}) {
  return (
    <TabIndicatorBar
      tabIds={SIX}
      currentTab="main"
      selectTab={vi.fn()}
      exitDown={() => true}
      {...props}
    />
  );
}

/** `[selector, declarations]` for every rule in a stylesheet, comments stripped. */
function rulesOf(css: string): Array<[string, string]> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Array<[string, string]> = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withoutComments)) !== null) {
    out.push([m[1].trim(), m[2].trim()]);
  }
  return out;
}

/** A Steam CSS-module hash: a long alphanumeric run mixing cases and digits, e.g. _3IBLc81yyL08OJ7rfKtF00. */
function hasHashedToken(selector: string): boolean {
  const runs = selector.match(/[A-Za-z0-9]{10,}/g) ?? [];
  return runs.some((run) => /\d/.test(run) && /[a-z]/.test(run) && /[A-Z]/.test(run));
}

/** Mounts the real scope stylesheet so computed styles are the ones the Deck would draw. */
function withScopeStylesheet() {
  let style: HTMLStyleElement;
  let scope: HTMLDivElement;
  beforeEach(() => {
    style = document.createElement("style");
    style.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(style);
    scope = document.createElement("div");
    scope.className = "bonsai-scope";
    document.body.appendChild(scope);
  });
  afterEach(() => {
    style.remove();
    scope.remove();
  });
  return () => scope.appendChild(document.createElement("div"));
}

const sideIds = (container: HTMLElement, side: "l" | "r") =>
  Array.from(container.querySelectorAll(`.bonsai-tab-bar__side--${side} .bonsai-tab-bar__peek`)).map((el) =>
    el.getAttribute("data-bonsai-tab"),
  );

describe("the tab bar as T3 (plan 84 step 4)", () => {
  const host = withScopeStylesheet();

  it("is one row of five columns in order: LB, the tabs before, the current tab, the tabs after, RB", () => {
    const { container } = render(bar({ currentTab: "settings" }), { container: host() });
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    const columns = Array.from(root.children).map((el) => el.className);
    expect(columns).toEqual([
      "bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--l",
      "bonsai-tab-bar__side bonsai-tab-bar__side--l",
      "bonsai-tab-bar__current",
      "bonsai-tab-bar__side bonsai-tab-bar__side--r",
      "bonsai-tab-bar__shoulder bonsai-tab-bar__shoulder--r",
    ]);
    const cs = getComputedStyle(root);
    expect(cs.display).toBe("grid");
    expect(cs.gridTemplateColumns).toBe("auto minmax(0, 1fr) auto minmax(0, 1fr) auto");
  });

  it("names the current tab in the middle, after its icon, and follows currentTab", () => {
    const { container, rerender } = render(bar({ currentTab: "settings" }), { container: host() });
    const current = container.querySelector(".bonsai-tab-bar__current") as HTMLElement;
    expect(current.querySelector(".bonsai-tab-bar__current-icon svg")).not.toBeNull();
    expect(current.querySelector(".bonsai-tab-bar__name")?.textContent).toBe("Settings");
    expect(current.firstElementChild?.className).toBe("bonsai-tab-bar__current-icon");
    expect(getComputedStyle(container.querySelector(".bonsai-tab-bar__name") as HTMLElement).textTransform).toBe("uppercase");
    rerender(bar({ currentTab: "about" }));
    expect(container.querySelector(".bonsai-tab-bar__name")?.textContent).toBe("About");
    expect(container.querySelector(".bonsai-tab-bar")?.getAttribute("data-bonsai-tab-bar-tab")).toBe("about");
  });

  it.each([
    ["five", FIVE],
    ["six", SIX],
  ] as const)("at %s tabs, every current tab shows each other tab exactly once as an icon, LB's on the left and RB's on the right", (_n, ids) => {
    for (const current of ids) {
      const { container, unmount } = render(bar({ tabIds: ids, currentTab: current }), { container: host() });
      const left = sideIds(container, "l");
      const right = sideIds(container, "r");
      expect(left).toHaveLength(Math.floor((ids.length - 1) / 2));
      expect([...left, ...right].sort()).toEqual(ids.filter((id) => id !== current).sort());
      // Nearest to the name is the tab one press of LB (left) or RB (right) away.
      expect(left[left.length - 1]).toBe(neighbourTab(ids, current, -1));
      expect(right[0]).toBe(neighbourTab(ids, current, 1));
      for (const peek of Array.from(container.querySelectorAll(".bonsai-tab-bar__peek"))) {
        expect(peek.querySelector("svg")).not.toBeNull();
        expect(peek.getAttribute("aria-label")).toBe(BONSAI_TAB_SHORT_NAMES[peek.getAttribute("data-bonsai-tab") as BonsaiTabId]);
      }
      unmount();
    }
  });

  it("lights nothing and names nothing for a tab that is not mounted, so a stale id never claims a tab", () => {
    const { container } = render(bar({ tabIds: FIVE, currentTab: "developer" }), { container: host() });
    expect(container.querySelector(".bonsai-tab-bar__name")?.textContent).toBe("");
    expect(container.querySelector(".bonsai-tab-bar__current-icon")).toBeNull();
    expect(container.querySelectorAll(".bonsai-tab-bar__peek")).toHaveLength(0);
  });

  it("dims LB and RB while the ring is elsewhere and lights them at full strength while it is on the bar", () => {
    const { container } = render(bar(), { container: host() });
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    const marks = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-tab-bar__shoulder"));
    expect(marks.map((el) => el.textContent)).toEqual(["LB", "RB"]);
    for (const mark of marks) expect(getComputedStyle(mark).opacity).toBe("0.32");
    // Plain browser focus is not Steam's ring: it lights nothing. (Decky stamps a tabindex on what it
    // navigates; plan 78 measured the bar holding browser focus with no Steam ring anywhere.)
    root.setAttribute("tabindex", "0");
    root.focus();
    expect(document.activeElement).toBe(root);
    for (const mark of marks) expect(getComputedStyle(mark).opacity).toBe("0.32");
    root.classList.add("gpfocus");
    for (const mark of marks) {
      expect(getComputedStyle(mark).opacity).toBe("1");
      expect(getComputedStyle(mark).color).toBe("rgb(238, 243, 248)");
    }
    root.classList.remove("gpfocus");
    for (const mark of marks) expect(getComputedStyle(mark).opacity).toBe("0.32");
  });

  it("wears the white inset ring and a faint fill on the whole bar only while Steam's ring is on it", () => {
    const { container } = render(bar(), { container: host() });
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    expect(getComputedStyle(root).boxShadow).not.toMatch(/inset/);
    root.setAttribute("tabindex", "0");
    root.focus();
    expect(getComputedStyle(root).boxShadow).not.toMatch(/inset/);
    root.classList.add("gpfocus");
    expect(getComputedStyle(root).boxShadow).toMatch(/inset 0 0 0 2px rgba\(255, 255, 255, 0\.85\)/);
    expect(getComputedStyle(root).backgroundColor).toBe("rgba(255, 255, 255, 0.06)");
  });
});

describe("the tab bar's presses and taps (plan 84 step 4)", () => {
  it("Left and LB step back one tab and wrap from the first to the last; Right and RB step on and wrap back", () => {
    const selectTab = vi.fn();
    const first = render(bar({ selectTab, currentTab: "main" }));
    expect(barProps().onMoveLeft()).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("about");
    expect(barProps().onButtonDown(press(5))).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("about");
    first.unmount();
    render(bar({ selectTab, currentTab: "about" }));
    expect(barProps().onMoveRight()).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("main");
    expect(barProps().onButtonDown(press(6))).toBe(true);
    expect(selectTab).toHaveBeenLastCalledWith("main");
  });

  it("Down hands the ring to the tab body through exitDown; Up is left to Steam", () => {
    const exitDown = vi.fn(() => true);
    render(bar({ exitDown }));
    expect(barProps().onMoveDown()).toBe(true);
    expect(exitDown).toHaveBeenCalledTimes(1);
    expect(barProps().onMoveUp()).toBe(false);
  });

  it("is one stop for the D-pad: its taps are plain elements, none of them a focus stop of its own", () => {
    hoisted.focusableProps.length = 0;
    const { container } = render(bar());
    expect(barProps().focusable).toBe(true);
    expect(hoisted.focusableProps.filter((p) => p.className !== "bonsai-tab-bar")).toHaveLength(0);
    for (const el of Array.from(container.querySelectorAll(".bonsai-tab-bar *"))) {
      expect(el.hasAttribute("tabindex")).toBe(false);
    }
  });

  it("a tap on LB steps back one tab and a tap on RB steps on one, wrapping at both ends", () => {
    const selectTab = vi.fn();
    const first = render(bar({ selectTab, currentTab: "main" }));
    fireEvent.click(first.container.querySelector(".bonsai-tab-bar__shoulder--l") as HTMLElement);
    expect(selectTab).toHaveBeenLastCalledWith("about");
    first.unmount();
    const last = render(bar({ selectTab, currentTab: "about" }));
    fireEvent.click(last.container.querySelector(".bonsai-tab-bar__shoulder--r") as HTMLElement);
    expect(selectTab).toHaveBeenLastCalledWith("main");
  });

  it("a tap on a side icon opens that tab", () => {
    for (const ids of [FIVE, SIX]) {
      const selectTab = vi.fn();
      const { container, unmount } = render(bar({ tabIds: ids, selectTab, currentTab: "settings" }));
      const peeks = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-tab-bar__peek"));
      expect(peeks).toHaveLength(ids.length - 1);
      for (const peek of peeks) {
        fireEvent.click(peek);
        expect(selectTab).toHaveBeenLastCalledWith(peek.getAttribute("data-bonsai-tab"));
      }
      unmount();
    }
  });

  it("a tap on the current tab's name does nothing", () => {
    const selectTab = vi.fn();
    const { container } = render(bar({ selectTab, currentTab: "settings" }));
    fireEvent.click(container.querySelector(".bonsai-tab-bar__current") as HTMLElement);
    expect(selectTab).not.toHaveBeenCalled();
  });
});

describe("the rule that hides Steam's tab header", () => {
  const rules = rulesOf(buildBonsaiScopeStylesheet());
  const hiding = rules.filter(
    ([selector, decls]) => selector.includes(".bonsai-tab-title-leaf") && /display:\s*none/.test(decls),
  );

  it("exists exactly once", () => {
    expect(hiding).toHaveLength(1);
  });

  it("is scoped under the tabs root and addresses Steam's row by our own markup, never by a hash", () => {
    const [selector] = hiding[0];
    expect(selector.startsWith(".bonsai-scope .bonsai-decky-tabs-root")).toBe(true);
    expect(selector).toContain(":has(.bonsai-tab-title-leaf)");
    expect(hasHashedToken(selector)).toBe(false);
  });

  it("keeps the bar 20px with an !important height, because section 3 sets every Panel.Focusable to height: auto", () => {
    const heightRule = rules.find(([selector]) => selector === ".bonsai-scope .bonsai-tab-bar.Panel.Focusable");
    expect(heightRule).toBeDefined();
    expect(heightRule?.[1]).toMatch(/height:\s*calc\(20px \* var\(--bonsai-ui-scale, 1\)\)\s*!important/);
    const reset = rules.find(([selector, decls]) => selector === ".bonsai-scope .Panel.Focusable" && /height:\s*auto\s*!important/.test(decls));
    expect(reset).toBeDefined();
  });

  it("builds the same bar rules for bonsAI's title view in Decky's bar, under that view's own root (plan 84 step 6)", () => {
    const inScope = rulesOf(buildTabBarRules(".bonsai-scope"));
    const inTitle = rulesOf(buildTabBarRules(".bonsai-chat-title"));
    expect(inTitle.length).toBeGreaterThan(10);
    expect(inTitle.every(([selector]) => selector.split(",").every((one) => one.trim().startsWith(".bonsai-chat-title ")))).toBe(true);
    expect(inTitle.map(([selector, decls]) => [selector.split(".bonsai-chat-title").join(".bonsai-scope"), decls])).toEqual(inScope);
    /* Every bar rule of bonsAI's own stylesheet is one of them. */
    const scopeSheet = rulesOf(buildBonsaiScopeStylesheet());
    for (const rule of inScope) expect(scopeSheet).toContainEqual(rule);
  });

  it("declares the 4px reserve in the stylesheet so a tabs-root remount cannot lose it", () => {
    const reserveRule = rules.find(([selector]) => selector === ".bonsai-scope:has(.bonsai-tab-bar) .bonsai-decky-tabs-root");
    expect(reserveRule).toBeDefined();
    expect(reserveRule?.[1]).toMatch(/--bonsai-tab-strip-reserve:\s*calc\(4px \* var\(--bonsai-ui-scale, 1\)\)/);
  });

  it("hides the bar's LB/RB marks while the chat-slot row holds the ring, without moving anything", () => {
    const marksRule = rules.find(
      ([selector]) =>
        selector.includes(".bonsai-tab-bar__shoulder") && selector.includes(":has(.bonsai-chat-slot-row--focused)"),
    );
    expect(marksRule).toBeDefined();
    expect(marksRule?.[1]).toMatch(/visibility:\s*hidden/);
    expect(marksRule?.[1]).not.toMatch(/display:\s*none/);
  });
});

/*
  The open bug "A faded ghost of the tab bar is left drawn over the chip row after touching the
  screen" (TAB-BAR-GHOST-01). The ghost was the drop-down strip: an absolutely placed layer that
  hung 46 points below the bar, over the chip row, opened by the ring or by a tap and closed by a CSS
  fade that could freeze part-way while a game ran. Plan 84 step 4 deletes the strip. These tests are
  the ones that would have caught it, and they hold for any future part of the bar too: whatever
  the ring and a finger have done, the bar draws exactly what it drew at rest, nothing inside it can
  be drawn outside its own 20 points, and nothing in it fades.
*/
describe("nothing of the tab bar can be left drawn over the chip row (plan 84 step 4, TAB-BAR-GHOST-01)", () => {
  let style: HTMLStyleElement;
  let scope: HTMLDivElement;

  beforeEach(() => {
    style = document.createElement("style");
    style.textContent = buildBonsaiScopeStylesheet();
    document.head.appendChild(style);
    scope = document.createElement("div");
    scope.className = "bonsai-scope";
    document.body.appendChild(scope);
  });

  afterEach(() => {
    style.remove();
    scope.remove();
  });

  /** Everything a person or Steam can do to the bar: the ring arriving and leaving, and taps on and off it. */
  type Step = "ring-on" | "ring-off" | "tap-bar" | "tap-each-part" | "tap-elsewhere";
  const SEQUENCES: Step[][] = [
    ["ring-on", "ring-off"],
    ["tap-bar"],
    ["tap-bar", "tap-elsewhere"],
    ["tap-each-part"],
    ["ring-on", "tap-bar", "ring-off", "tap-elsewhere"],
    ["tap-bar", "ring-on", "tap-each-part", "ring-off"],
  ];

  function run(root: HTMLElement, step: Step) {
    switch (step) {
      case "ring-on":
        // What Steam does when its ring lands: DOM focus plus its own marker class.
        root.classList.add("gpfocus");
        fireEvent.focus(root);
        return;
      case "ring-off":
        root.classList.remove("gpfocus");
        fireEvent.blur(root);
        return;
      case "tap-bar":
        fireEvent.pointerDown(root);
        fireEvent.click(root);
        return;
      case "tap-each-part":
        for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
          fireEvent.pointerDown(el);
          fireEvent.click(el);
        }
        return;
      case "tap-elsewhere":
        fireEvent.pointerDown(document.body);
        fireEvent.click(document.body);
        return;
    }
  }

  /** The bar's markup with Steam's own marker taken out, so only what the plugin draws is compared. */
  const drawn = (root: HTMLElement) => {
    const copy = root.cloneNode(true) as HTMLElement;
    copy.classList.remove("gpfocus");
    return copy.outerHTML;
  };

  it.each(SEQUENCES.map((s) => [s.join(", "), s] as const))(
    "after %s, the bar draws exactly what it drew at rest, with no strip anywhere",
    (_label, sequence) => {
      for (const tabIds of [SIX, FIVE]) {
        const host = scope.appendChild(document.createElement("div"));
        const { container, unmount } = render(bar({ tabIds, currentTab: "settings" }), { container: host });
        const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
        const atRest = drawn(root);
        for (const step of sequence) {
          run(root, step);
          expect(container.querySelector('[class*="strip"]')).toBeNull();
          expect(drawn(root)).toBe(atRest);
        }
        unmount();
      }
    },
  );

  it("clips everything inside it to its own 20 points, and lifts nothing inside it out of the row", () => {
    const { container } = render(bar(), { container: scope });
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    for (const step of ["ring-on", "tap-bar"] as const) {
      run(root, step);
      expect(getComputedStyle(root).overflow).toBe("hidden");
      for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
        expect(["absolute", "fixed", "sticky"]).not.toContain(getComputedStyle(el).position);
      }
    }
  });

  it("fades nothing: no part of the bar has a transition or an animation that could freeze part-way", () => {
    const { container } = render(bar(), { container: scope });
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    run(root, "ring-on");
    for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
      const cs = getComputedStyle(el);
      expect(cs.transition === "" || /^none\b/.test(cs.transition)).toBe(true);
      expect(cs.animation === "" || /^none\b/.test(cs.animation)).toBe(true);
    }
  });
});
