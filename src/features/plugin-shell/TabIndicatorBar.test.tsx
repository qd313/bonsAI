/**
 * Title: The tab bar: what it shows, the rule that hides Steam's header, and no ghost
 * Purpose: Pin what the bar shows for a given tab list and current tab, that Steam's own header is
 *          hidden by a rule scoped to our own markup with no build-hashed class in it, and that
 *          nothing of the bar can ever be left drawn over the chip row (plan 84 step 4).
 * Used for: plan 30 W3 (docs/archive/30-collapsing-tab-bar.md § 5); plan 84 step 4, rows
 *           P84-TABS-02 and TAB-BAR-GHOST-01.
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
import { ALL_BONSAI_TAB_IDS, type BonsaiTabId } from "./tabTitles";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";

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

  it("carries the LB and RB marks", () => {
    const { container } = render(bar({ tabIds: SIX, currentTab: "main" }));
    const marks = Array.from(container.querySelectorAll(".bonsai-tab-bar > .bonsai-tab-bar__shoulder")).map((el) => el.textContent);
    expect(marks).toEqual(["LB", "RB"]);
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
