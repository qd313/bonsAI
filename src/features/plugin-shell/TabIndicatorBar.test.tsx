/**
 * Title: Collapsing tab bar — rest state and the hiding rule
 * Purpose: Pin what the thin bar shows for a given tab list and active tab, and that Steam's header
 *          is hidden by a rule scoped to our own markup with no build-hashed class in it.
 * Used for: plan 30 W3 (docs/archive/30-collapsing-tab-bar.md § 5).
 * Solves: The two ways this can rot silently — a dash count that stops following the mounted tabs,
 *         and a hiding selector that quietly grows a Steam hash and stops matching after a client
 *         update (docs/audit/decky-tab-strip-classes.md is the prior art for that failure).
 * Does not: Measure heights or where the ring lands; jsdom has no layout and no gamepad. Those are
 *           the on-device rows TAB-BAR-01 … -06.
 */
import { fireEvent, render } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

import React from "react";

import { isPointerInsideTabBar, TabIndicatorBar } from "./TabIndicatorBar";
import { ALL_BONSAI_TAB_IDS, BONSAI_TAB_SHORT_NAMES, type BonsaiTabId } from "./tabTitles";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { rememberUiDocument, resetUiDocument } from "../../utils/uiDocument";
import {
  TAB_BAR_CELL_BUG_ICON_PX,
  TAB_BAR_CELL_HEIGHT_PX,
  TAB_BAR_CELL_ICON_PX,
  TAB_BAR_CELL_ICON_TOP_PX,
  TAB_BAR_CELL_NAME_PX,
  TAB_BAR_CELL_RADIUS_PX,
  TAB_BAR_PILL_PAD_X_PX,
  TAB_BAR_PILL_PAD_Y_PX,
  TAB_BAR_SLOT_W_PX,
  TAB_BAR_STRIP_PAD_X_PX,
  TAB_BAR_STRIP_PAD_Y_PX,
  TAB_BAR_SWITCH_FADE_MS,
} from "../unified-input/constants";

const SIX = ALL_BONSAI_TAB_IDS;
const FIVE: readonly BonsaiTabId[] = SIX.filter((id) => id !== "developer");

/** The bar with the two callbacks W4 added, stubbed; tests that care pass their own. */
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

describe("plan 59 — the open strip's new tokens, pinned before W4 wires them into the stylesheet", () => {
  it("matches the values board 2a drew (docs/archive/59-tab-strip-redesign-build.md § 3)", () => {
    expect(TAB_BAR_CELL_HEIGHT_PX).toBe(44);
    expect(TAB_BAR_CELL_ICON_PX).toBe(22);
    expect(TAB_BAR_CELL_BUG_ICON_PX).toBe(26);
    expect(TAB_BAR_CELL_ICON_TOP_PX).toBe(6);
    expect(TAB_BAR_CELL_NAME_PX).toBe(9.5);
    expect(TAB_BAR_CELL_RADIUS_PX).toBe(8);
    expect(TAB_BAR_STRIP_PAD_Y_PX).toBe(5);
    expect(TAB_BAR_STRIP_PAD_X_PX).toBe(6);
    expect(TAB_BAR_SLOT_W_PX).toBe(20);
    expect(TAB_BAR_PILL_PAD_Y_PX).toBe(3);
    expect(TAB_BAR_PILL_PAD_X_PX).toBe(4);
    expect(TAB_BAR_SWITCH_FADE_MS).toBe(120);
  });
});

describe("TabIndicatorBar at rest", () => {
  it("draws one dash per mounted tab, so the count follows the tab list rather than a constant", () => {
    const six = render(bar({ tabIds: SIX, currentTab: "main" }));
    expect(six.container.querySelectorAll(".bonsai-tab-bar__dash")).toHaveLength(6);
    six.unmount();
    const five = render(bar({ tabIds: FIVE, currentTab: "main" }));
    expect(five.container.querySelectorAll(".bonsai-tab-bar__dash")).toHaveLength(5);
  });

  it("lights the active tab's dash and names it", () => {
    const { container } = render(bar({ tabIds: SIX, currentTab: "settings" }));
    const lit = container.querySelectorAll(".bonsai-tab-bar__dash--active");
    expect(lit).toHaveLength(1);
    expect(lit[0].getAttribute("data-bonsai-tab")).toBe("settings");
    expect(container.querySelector(".bonsai-tab-bar__name")?.textContent).toBe("Settings");
  });

  it("follows currentTab when it changes, which is what a shoulder press does", () => {
    const { container, rerender } = render(bar({ tabIds: SIX, currentTab: "main" }));
    expect(container.querySelector(".bonsai-tab-bar__name")?.textContent).toBe("Main");
    rerender(bar({ tabIds: SIX, currentTab: "about" }));
    expect(container.querySelector(".bonsai-tab-bar__dash--active")?.getAttribute("data-bonsai-tab")).toBe("about");
    expect(container.querySelector(".bonsai-tab-bar__name")?.textContent).toBe("About");
  });

  it("lights nothing and names nothing for a tab that is not mounted, so a stale id never claims a tab", () => {
    const { container } = render(bar({ tabIds: FIVE, currentTab: "developer" }));
    expect(container.querySelectorAll(".bonsai-tab-bar__dash--active")).toHaveLength(0);
    expect(container.querySelector(".bonsai-tab-bar__name")?.textContent).toBe("");
  });

  it("opens while it holds the ring and closes the moment it loses it, with no timer", () => {
    const { container } = render(bar());
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    expect(root.getAttribute("data-bonsai-tab-bar-state")).toBe("rest");
    fireEvent.focus(root);
    expect(root.getAttribute("data-bonsai-tab-bar-state")).toBe("open");
    expect(root.classList.contains("bonsai-tab-bar--open")).toBe(true);
    fireEvent.blur(root);
    expect(root.getAttribute("data-bonsai-tab-bar-state")).toBe("rest");
  });

  it("carries the LB and RB marks, present in the markup whether or not they are visible", () => {
    const { container } = render(bar({ tabIds: SIX, currentTab: "main" }));
    // The thin bar's own marks; the open strip carries its own pair (plan 59: inside fixed slots).
    const marks = Array.from(container.querySelectorAll(".bonsai-tab-bar > .bonsai-tab-bar__shoulder")).map((el) => el.textContent);
    expect(marks).toEqual(["LB", "RB"]);
    const stripMarks = Array.from(container.querySelectorAll(".bonsai-tab-bar__strip .bonsai-tab-bar__shoulder")).map((el) => el.textContent);
    expect(stripMarks).toEqual(["LB", "RB"]);
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

  it("floats the open strip with an !important placement, because section 3 resets every Panel child to relative", () => {
    // Specificity has to beat the reset's (0,3,1) as well as its !important, so the placement
    // rule names the bar's Panel.Focusable classes on the way to the strip.
    const stripRule = rules.find(
      ([selector]) => selector === ".bonsai-scope .bonsai-tab-bar.Panel.Focusable > div.bonsai-tab-bar__strip",
    );
    expect(stripRule).toBeDefined();
    expect(stripRule?.[1]).toMatch(/position:\s*absolute\s*!important/);
    expect(stripRule?.[1]).toMatch(/top:\s*0\s*!important/);
    // The reset it has to beat is real and !important; if it ever goes, this test can relax.
    const reset = rules.find(([selector, decls]) => selector === ".bonsai-scope .Panel.Focusable > div" && /position:\s*relative\s*!important/.test(decls));
    expect(reset).toBeDefined();
  });

  it("keeps the bar 20px with an !important height, because section 3 sets every Panel.Focusable to height: auto", () => {
    const heightRule = rules.find(([selector]) => selector === ".bonsai-scope .bonsai-tab-bar.Panel.Focusable");
    expect(heightRule).toBeDefined();
    expect(heightRule?.[1]).toMatch(/height:\s*calc\(20px \* var\(--bonsai-ui-scale, 1\)\)\s*!important/);
    const reset = rules.find(([selector, decls]) => selector === ".bonsai-scope .Panel.Focusable" && /height:\s*auto\s*!important/.test(decls));
    expect(reset).toBeDefined();
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

describe("the open strip (plan 30 W5)", () => {
  afterEach(() => {
    resetUiDocument();
  });

  const strip = (container: HTMLElement) => container.querySelector(".bonsai-tab-bar__strip") as HTMLElement;

  it("draws one cell per mounted tab with the active one lit, and follows currentTab", () => {
    const { container, rerender } = render(bar({ tabIds: SIX, currentTab: "settings" }));
    expect(container.querySelectorAll(".bonsai-tab-bar__cell")).toHaveLength(6);
    expect(container.querySelector(".bonsai-tab-bar__cell--active")?.getAttribute("data-bonsai-tab")).toBe("settings");
    rerender(bar({ tabIds: FIVE, currentTab: "about" }));
    expect(container.querySelectorAll(".bonsai-tab-bar__cell")).toHaveLength(5);
    expect(container.querySelector(".bonsai-tab-bar__cell--active")?.getAttribute("data-bonsai-tab")).toBe("about");
  });

  it("shows the same lowercase words at five tabs and six (plan 59 — no more short-form switch)", () => {
    const six = render(bar({ tabIds: SIX, currentTab: "main" }));
    const sixLabels = Array.from(six.container.querySelectorAll(".bonsai-tab-bar__cell-name")).map((el) => el.textContent);
    expect(sixLabels).toEqual(["main", "ollama", "settings", "perms", "dev", "about"]);
    six.unmount();
    const five = render(bar({ tabIds: FIVE, currentTab: "main" }));
    const fiveLabels = Array.from(five.container.querySelectorAll(".bonsai-tab-bar__cell-name")).map((el) => el.textContent);
    expect(fiveLabels).toEqual(["main", "ollama", "settings", "perms", "about"]);
  });

  it("every cell carries its name in the markup always; a tab switch changes only which cell is active, never the words", () => {
    const { container, rerender } = render(bar({ tabIds: SIX, currentTab: "main" }));
    const namesBefore = Array.from(container.querySelectorAll(".bonsai-tab-bar__cell-name")).map((el) => el.textContent);
    expect(namesBefore).toEqual(["main", "ollama", "settings", "perms", "dev", "about"]);
    expect(container.querySelectorAll(".bonsai-tab-bar__cell-name")).toHaveLength(6);
    expect(
      container.querySelector(".bonsai-tab-bar__cell--active .bonsai-tab-bar__cell-name")?.textContent,
    ).toBe("main");

    rerender(bar({ tabIds: SIX, currentTab: "about" }));
    const namesAfter = Array.from(container.querySelectorAll(".bonsai-tab-bar__cell-name")).map((el) => el.textContent);
    expect(namesAfter).toEqual(namesBefore);
    expect(container.querySelectorAll(".bonsai-tab-bar__cell-name")).toHaveLength(6);
    expect(
      container.querySelector(".bonsai-tab-bar__cell--active .bonsai-tab-bar__cell-name")?.textContent,
    ).toBe("about");
  });

  it("gives every cell an accessible name equal to the tab's short name, since only the lit one shows text", () => {
    const { container } = render(bar({ tabIds: SIX, currentTab: "main" }));
    for (const id of SIX) {
      const cell = container.querySelector(`.bonsai-tab-bar__cell[data-bonsai-tab="${id}"]`);
      expect(cell?.getAttribute("aria-label")).toBe(BONSAI_TAB_SHORT_NAMES[id]);
    }
  });

  it("puts LB and RB each in their own fixed-width slot, so the pill hiding never shifts a cell", () => {
    const { container } = render(bar({ tabIds: SIX, currentTab: "main" }));
    const slots = container.querySelectorAll(".bonsai-tab-bar__strip > .bonsai-tab-bar__slot");
    expect(slots).toHaveLength(2);
    for (const slot of Array.from(slots)) {
      expect(slot.querySelector(".bonsai-tab-bar__shoulder")).not.toBeNull();
    }
    const slotRule = rulesOf(buildBonsaiScopeStylesheet()).find(
      ([selector]) => selector === ".bonsai-scope .bonsai-tab-bar__slot",
    );
    expect(slotRule).toBeDefined();
    expect(slotRule?.[1]).toMatch(/width:\s*\S/);
  });

  it("shows the strip while the bar holds the ring and hides it when the ring leaves", () => {
    const { container } = render(bar());
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    expect(strip(container).classList.contains("bonsai-tab-bar__strip--open")).toBe(false);
    fireEvent.focus(root);
    expect(strip(container).classList.contains("bonsai-tab-bar__strip--open")).toBe(true);
    fireEvent.blur(root);
    expect(strip(container).classList.contains("bonsai-tab-bar__strip--open")).toBe(false);
  });

  it("a tap on the thin bar opens the strip with no ring involved, and a tap outside closes it", () => {
    const { container } = render(bar());
    rememberUiDocument(container);
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    fireEvent.click(root);
    expect(root.getAttribute("data-bonsai-tab-bar-state")).toBe("open");
    fireEvent.pointerDown(document.body);
    expect(root.getAttribute("data-bonsai-tab-bar-state")).toBe("rest");
  });

  it("a tap on a cell switches through selectTab and closes the strip", () => {
    const selectTab = vi.fn();
    const { container } = render(bar({ selectTab }));
    rememberUiDocument(container);
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    fireEvent.click(root);
    fireEvent.click(container.querySelector('.bonsai-tab-bar__cell[data-bonsai-tab="ollama"]') as HTMLElement);
    expect(selectTab).toHaveBeenCalledWith("ollama");
    expect(root.getAttribute("data-bonsai-tab-bar-state")).toBe("rest");
  });

  it("removes the outside-tap listener once the strip is closed", () => {
    const { container, unmount } = render(bar());
    rememberUiDocument(container);
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    const removeSpy = vi.spyOn(document, "removeEventListener");
    fireEvent.click(root);
    fireEvent.pointerDown(document.body);
    expect(removeSpy.mock.calls.some(([type]) => type === "pointerdown")).toBe(true);
    removeSpy.mockRestore();
    unmount();
  });

  // Closing is a CSS fade (tabIndicatorBar.ts): opacity to 0, then `visibility: hidden` after a
  // delay. jsdom never runs that fade, so these tests stand in for the one thing jsdom cannot show
  // -- a fade that never reaches its end, the ghost this bug reports (docs/roadmap.md, "A faded
  // ghost of the tab bar is left drawn over the chip row after touching the screen"). Without the
  // fix, nothing here ever forces the strip closed, so it is left exactly as the browser's own
  // transition last painted it -- a `style` object with no opacity, visibility or pointer-events
  // set at all, the same as while the strip was open. That is the state a person can see through.
  describe("the open strip settles fully closed on its own, in case the CSS fade never finishes", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("forces opacity 0, visibility hidden and pointer-events none after closing, without waiting on the transition to fire an event", () => {
      vi.useFakeTimers();
      const { container } = render(bar());
      const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
      const strip = container.querySelector(".bonsai-tab-bar__strip") as HTMLElement;

      fireEvent.focus(root);
      fireEvent.blur(root);
      // Not yet -- the real fade (120ms) should still be given the chance to finish on its own.
      vi.advanceTimersByTime(150);
      expect(strip.style.opacity).toBe("");

      vi.advanceTimersByTime(100);
      expect(strip.style.opacity).toBe("0");
      expect(strip.style.visibility).toBe("hidden");
      expect(strip.style.pointerEvents).toBe("none");
    });

    it("clears the forced-closed style the moment it opens again, so the fade-in is not fought", () => {
      vi.useFakeTimers();
      const { container } = render(bar());
      const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
      const strip = container.querySelector(".bonsai-tab-bar__strip") as HTMLElement;

      fireEvent.focus(root);
      fireEvent.blur(root);
      vi.advanceTimersByTime(300);
      expect(strip.style.opacity).toBe("0");

      fireEvent.focus(root);
      expect(strip.style.opacity).toBe("");
      expect(strip.style.visibility).toBe("");
      expect(strip.style.pointerEvents).toBe("");
    });

    it("never forces the closed style while still open, however long the ring sits there", () => {
      vi.useFakeTimers();
      const { container } = render(bar());
      const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
      const strip = container.querySelector(".bonsai-tab-bar__strip") as HTMLElement;

      fireEvent.focus(root);
      vi.advanceTimersByTime(5000);
      expect(strip.style.opacity).toBe("");
      expect(strip.classList.contains("bonsai-tab-bar__strip--open")).toBe(true);
    });
  });
});

describe("the open strip's new look (plan 59 W4)", () => {
  const rules = rulesOf(buildBonsaiScopeStylesheet());

  it("fades the name in only on the active cell: opacity 0 at rest, opacity 1 when active", () => {
    const nameRule = rules.find(([selector]) => selector === ".bonsai-scope .bonsai-tab-bar__cell-name");
    expect(nameRule).toBeDefined();
    expect(nameRule?.[1]).toMatch(/opacity:\s*0\b/);

    const activeNameRule = rules.find(
      ([selector]) => selector === ".bonsai-scope .bonsai-tab-bar__cell--active .bonsai-tab-bar__cell-name",
    );
    expect(activeNameRule).toBeDefined();
    expect(activeNameRule?.[1]).toMatch(/opacity:\s*1\b/);
  });

  it("lights the active cell with a fill only -- no ring, no box-shadow", () => {
    const activeCellRule = rules.find(([selector]) => selector === ".bonsai-scope .bonsai-tab-bar__cell--active");
    expect(activeCellRule).toBeDefined();
    expect(activeCellRule?.[1]).not.toMatch(/box-shadow/);
  });

  it("the strip is 66px tall and each cell is 44px tall, so the chosen height cannot drift silently", () => {
    const stripRule = rules.find(([selector]) => selector === ".bonsai-scope .bonsai-tab-bar__strip");
    expect(stripRule).toBeDefined();
    expect(stripRule?.[1]).toMatch(/height:\s*calc\(66px \* var\(--bonsai-ui-scale, 1\)\)/);

    const cellRule = rules.find(([selector]) => selector === ".bonsai-scope .bonsai-tab-bar__cell");
    expect(cellRule).toBeDefined();
    expect(cellRule?.[1]).toMatch(/height:\s*calc\(44px \* var\(--bonsai-ui-scale, 1\)\)/);
  });

  it("turns off the switch fade under reduced motion, for the cell and its name only", () => {
    const css = buildBonsaiScopeStylesheet();
    const reducedMotionBlock = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n {8}\}/g);
    const hitsCellAndName = (reducedMotionBlock ?? []).some(
      (block) =>
        block.includes(".bonsai-tab-bar__cell") &&
        block.includes(".bonsai-tab-bar__cell-name") &&
        /transition:\s*none/.test(block),
    );
    expect(hitsCellAndName).toBe(true);
  });
});

describe("isPointerInsideTabBar across a genuine realm boundary (2026-09-04 device finding)", () => {
  // `root` and `evt.target` both come from the QuickAccess popup document in production, a
  // different realm than this module's own (SharedJSContext), so `evt.target instanceof Node` was
  // always false there -- every pointerdown closed the open strip immediately, including one landing
  // on a cell inside it. A normal render cannot reproduce that split: React needs `root` and its
  // descendants in the same document to begin with, which is exactly what makes them the same realm
  // in jsdom. This constructs both nodes directly in a second, genuinely separate `JSDOM` instance,
  // the same technique as useHiddenTabHeaderTrap.test.tsx's realm tests.
  let other: JSDOM;

  afterEach(() => {
    other?.window.close();
  });

  it("treats a foreign-realm descendant of root as inside", () => {
    other = new JSDOM(`<div id="root"><div id="cell"></div></div>`);
    const foreignRoot = other.window.document.getElementById("root") as unknown as HTMLElement;
    const foreignCell = other.window.document.getElementById("cell");
    expect(foreignCell instanceof Node).toBe(false); // sanity: this really is a foreign realm

    expect(isPointerInsideTabBar(foreignRoot, foreignCell)).toBe(true);
  });

  it("treats a foreign-realm node outside root as outside", () => {
    other = new JSDOM(`<div id="root"></div>`);
    const foreignRoot = other.window.document.getElementById("root") as unknown as HTMLElement;
    expect(isPointerInsideTabBar(foreignRoot, other.window.document.body)).toBe(false);
  });

  it("is false with no root, and false for a non-element target", () => {
    expect(isPointerInsideTabBar(null, document.body)).toBe(false);
    expect(isPointerInsideTabBar(document.body, null)).toBe(false);
    expect(isPointerInsideTabBar(document.body, "not a node" as unknown as EventTarget)).toBe(false);
  });
});
