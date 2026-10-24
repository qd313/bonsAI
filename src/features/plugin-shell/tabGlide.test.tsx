/**
 * Title: The tab glide: the green line under the current tab and the page sliding in (plan 97 G1, option A)
 * Purpose: Pin what a player sees when LB or RB switches tabs, at the level the Deck check looks at: the
 *          page that has just arrived wears the class for the side it comes in from, the 2-point line
 *          moves to the new tab, a second press lands on the next tab at once, and reduced motion
 *          switches both off. The bar and the page are mounted together the way the plugin does it
 *          (the bar always there, the current tab's body built fresh on every switch).
 * Used for: Row P97-G1-TAB-GLIDE (the Deck check: five switches each way, ten fast presses all landing,
 *           reduced motion still, frame rate at least 45).
 * Solves: A glide that quietly never plays (the class never set, the wrong side, the stylesheet rule
 *         beaten by section 3's `animation: none !important` on Steam's content pane), or one that
 *         gets in the way of the next press.
 * Does not: Prove the look or the frame rate; jsdom has no layout and no compositor. The look is the
 *           Deck check, and this file reads the stylesheet's numbers instead.
 */
import { act, fireEvent, render } from "@testing-library/react";
import { Router } from "@decky/ui";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TabBodyFocusRoot } from "./TabBodyFocusRoot";
import { TabIndicatorBar } from "./TabIndicatorBar";
import { resetTabGlideForTests, tabGlideDirection } from "./tabGlide";
import { ALL_BONSAI_TAB_IDS, type BonsaiTabId } from "./tabTitles";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { TAB_BAR_MARKER_BASE_PX } from "../../shared/constants";

const SIX: readonly BonsaiTabId[] = ALL_BONSAI_TAB_IDS.filter((id) => id !== "developer");
const FROM_RIGHT = "bonsai-tab-body-root--glide-from-right";
const FROM_LEFT = "bonsai-tab-body-root--glide-from-left";

/**
 * The bar and the current tab's body, mounted as the plugin does: Main has no body root (its content is
 * a plain box), every other tab is a TabBodyFocusRoot built fresh on every switch (`key`). `rebuild`
 * remounts the showing body in place, as a popup closing does.
 */
function Shell({ start, onSelect }: { start: BonsaiTabId; onSelect?: (id: string) => void }) {
  const [tab, setTab] = useState<string>(start);
  const [build, setBuild] = useState(0);
  return (
    <>
      <TabIndicatorBar
        tabIds={SIX}
        currentTab={tab}
        selectTab={(id) => {
          onSelect?.(id);
          setTab(id);
        }}
        exitDown={() => true}
      />
      {tab === "main" ? (
        <div data-main-body="" />
      ) : (
        <TabBodyFocusRoot key={`${tab}:${build}`} id={tab as BonsaiTabId}>
          <span>{tab}</span>
        </TabBodyFocusRoot>
      )}
      <button data-testid="rebuild" onClick={() => setBuild((n) => n + 1)} />
    </>
  );
}

const rb = (c: HTMLElement) => fireEvent.click(c.querySelector('[aria-label="Next tab"]') as HTMLElement);
const lb = (c: HTMLElement) => fireEvent.click(c.querySelector('[aria-label="Previous tab"]') as HTMLElement);
const body = (c: HTMLElement) => c.querySelector(".bonsai-tab-body-root") as HTMLElement | null;
const marker = (c: HTMLElement) => c.querySelector(".bonsai-tab-bar__marker") as HTMLElement;

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matches && query === "(prefers-reduced-motion: reduce)",
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/** Gives the bar and the current tab a layout (jsdom has none): the current tab sits `x` from the bar's left, `w` wide. */
function layOut(xByTab: Record<string, [number, number]>) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const rect = (left: number, width: number) =>
      ({ left, width, right: left + width, top: 0, bottom: 20, height: 20, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
    if (this.classList.contains("bonsai-tab-bar")) return rect(0, 300);
    if (this.classList.contains("bonsai-tab-bar__current")) {
      const tab = (this.closest(".bonsai-tab-bar") as HTMLElement).getAttribute("data-bonsai-tab-bar-tab") ?? "";
      const [x, w] = xByTab[tab] ?? [0, 0];
      return rect(x, w);
    }
    return rect(0, 0);
  });
}

/** What Steam says is running: nothing, or a game (the Deck's fake starts with a game up). */
const setRunningApp = (app: unknown) => {
  (Router as { MainRunningApp: unknown }).MainRunningApp = app;
};
const originalRunningApp = Router.MainRunningApp;

beforeEach(() => {
  setRunningApp(null);
  resetTabGlideForTests();
  Reflect.deleteProperty(window, "matchMedia");
});
afterEach(() => {
  setRunningApp(originalRunningApp);
  delete (window as { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad;
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("which side the page comes in from", () => {
  it("is the right for a step along the strip, the left for a step back, and wraps the way LB and RB wrap", () => {
    expect(tabGlideDirection("settings", "permissions")).toBe(1);
    expect(tabGlideDirection("permissions", "settings")).toBe(-1);
    expect(tabGlideDirection("main", "search")).toBe(-1);
    // RB on About goes to Search (heading right), LB on Search goes to About (heading left).
    expect(tabGlideDirection("about", "search")).toBe(1);
    expect(tabGlideDirection("search", "about")).toBe(-1);
  });
});

describe("the page sliding in", () => {
  it("wears the from-right class after RB and the from-left class after LB, and none on the first drawing", () => {
    const { container } = render(<Shell start="settings" />);
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
    rb(container);
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("permissions");
    expect(body(container)!.classList.contains(FROM_RIGHT)).toBe(true);
    lb(container);
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("settings");
    expect(body(container)!.classList.contains(FROM_LEFT)).toBe(true);
    expect(body(container)!.classList.contains(FROM_RIGHT)).toBe(false);
  });

  it("follows the wrap: LB on Search comes in from the left, RB on About from the right", () => {
    const first = render(<Shell start="search" />);
    lb(first.container);
    expect(body(first.container)!.getAttribute("data-bonsai-tab-body")).toBe("about");
    expect(body(first.container)!.classList.contains(FROM_LEFT)).toBe(true);
    first.unmount();
    resetTabGlideForTests();
    const second = render(<Shell start="about" />);
    rb(second.container);
    expect(body(second.container)!.getAttribute("data-bonsai-tab-body")).toBe("search");
    expect(body(second.container)!.classList.contains(FROM_RIGHT)).toBe(true);
  });

  it("knows the side even when the tab it came from is Main, which has no body root of its own", () => {
    const { container } = render(<Shell start="search" />);
    rb(container); // Main
    expect(body(container)).toBeNull();
    rb(container); // Ollama
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("ollama");
    expect(body(container)!.classList.contains(FROM_RIGHT)).toBe(true);
    lb(container); // Main again
    lb(container); // Search
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("search");
    expect(body(container)!.classList.contains(FROM_LEFT)).toBe(true);
  });

  it("stays still when the same tab is rebuilt in place (a popup closing), which is not a switch", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); // the clock is the only thing this needs to move
    const { container, getByTestId } = render(<Shell start="settings" />);
    rb(container);
    expect(body(container)!.classList.contains(FROM_RIGHT)).toBe(true);
    vi.advanceTimersByTime(500); // a popup closes some while later
    act(() => {
      fireEvent.click(getByTestId("rebuild"));
    });
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("permissions");
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
  });

  it("is switched off by prefers-reduced-motion: no class is set at all", () => {
    mockReducedMotion(true);
    const { container } = render(<Shell start="settings" />);
    rb(container);
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("permissions");
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
    lb(container);
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
  });

  it("is switched off while a game runs: no class on the arriving page, from either side", () => {
    setRunningApp({ appid: 1145350, display_name: "Hades II" });
    const { container } = render(<Shell start="settings" />);
    rb(container);
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("permissions");
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
    lb(container);
    expect(body(container)!.getAttribute("data-bonsai-tab-body")).toBe("settings");
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
  });

  it("glides again once the game has closed", () => {
    setRunningApp({ appid: 1145350, display_name: "Hades II" });
    const { container } = render(<Shell start="settings" />);
    rb(container);
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
    setRunningApp(null);
    rb(container);
    expect(body(container)!.classList.contains(FROM_RIGHT)).toBe(true);
  });

  it("follows the Deck's own switch for the lighter mode (never lighter: glides even with a game)", () => {
    setRunningApp({ appid: 1145350, display_name: "Hades II" });
    (window as { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad = { off: true };
    const { container } = render(<Shell start="settings" />);
    rb(container);
    expect(body(container)!.classList.contains(FROM_RIGHT)).toBe(true);
  });

  it("is not held up: ten presses with no timer ever running land on ten tabs, one each, none lost", () => {
    vi.useFakeTimers(); // nothing advances the clock: if any press waited for the motion, this would stall
    const picked: string[] = [];
    const { container } = render(<Shell start="settings" onSelect={(id) => picked.push(id)} />);
    for (let i = 0; i < 10; i++) rb(container);
    // Settings -> permissions -> about -> search -> main -> ollama -> settings -> ... in the strip's order, wrapping.
    const expected: string[] = [];
    let at = SIX.indexOf("settings");
    for (let i = 0; i < 10; i++) {
      at = (at + 1) % SIX.length;
      expected.push(SIX[at]!);
    }
    expect(picked).toEqual(expected);
    expect((container.querySelector(".bonsai-tab-bar") as HTMLElement).getAttribute("data-bonsai-tab-bar-tab")).toBe(expected[9]);
    // A press back, mid-motion, goes back one at once.
    lb(container);
    expect(picked[10]).toBe(expected[8]);
  });
});

describe("the green line under the current tab", () => {
  it("is placed on the first drawing with no glide, then moves to the new tab on a press with the glide time set", () => {
    layOut({ settings: [100, 80], permissions: [180, 110] });
    const { container } = render(<Shell start="settings" />);
    // 6 points of padding each side of the name: translateX(left + 6) scaleX((width - 12) / TAB_BAR_MARKER_BASE_PX).
    // The line is drawn 100 points wide and scaled down: a 1-point line scaled 80 times was painted a fifth short on the Deck,
    // where the screen rounds the point to one pixel before scaling.
    expect(marker(container).style.transform).toBe("translateX(106px) scaleX(0.68)");
    expect(marker(container).style.getPropertyValue("--bonsai-tab-marker-ms")).toBe("0ms");
    rb(container);
    expect(marker(container).style.transform).toBe("translateX(186px) scaleX(0.98)");
    expect(marker(container).style.getPropertyValue("--bonsai-tab-marker-ms")).toBe("180ms");
    // Pressing again at once re-aims it, with no wait.
    layOut({ settings: [100, 80], permissions: [180, 110], about: [210, 60] });
    rb(container);
    expect(marker(container).style.transform).toBe("translateX(216px) scaleX(0.48)");
  });

  it("still glides while a game runs: only the page's slide is dropped", () => {
    setRunningApp({ appid: 1145350, display_name: "Hades II" });
    layOut({ settings: [100, 80], permissions: [180, 110] });
    const { container } = render(<Shell start="settings" />);
    rb(container);
    expect(body(container)!.className).toBe("bonsai-tab-body-root");
    expect(marker(container).style.transform).toBe("translateX(186px) scaleX(0.98)");
    expect(marker(container).style.getPropertyValue("--bonsai-tab-marker-ms")).toBe("180ms");
  });

  it("jumps instead of gliding under reduced motion", () => {
    mockReducedMotion(true);
    layOut({ settings: [100, 80], permissions: [180, 110] });
    const { container } = render(<Shell start="settings" />);
    rb(container);
    expect(marker(container).style.transform).toBe("translateX(186px) scaleX(0.98)");
    expect(marker(container).style.getPropertyValue("--bonsai-tab-marker-ms")).toBe("0ms");
  });

  it("is 2 points high inside the bar and is not a tap target", () => {
    const { container } = render(<Shell start="settings" />);
    const mk = marker(container);
    expect(mk.parentElement!.classList.contains("bonsai-tab-bar")).toBe(true);
    expect(mk.getAttribute("aria-hidden")).toBe("true");
    const css = buildBonsaiScopeStylesheet();
    const rule = css.slice(css.indexOf(".bonsai-scope .bonsai-tab-bar__marker {"));
    const decls = rule.slice(0, rule.indexOf("}"));
    expect(decls).toMatch(/height: 2px/);
    expect(decls).toContain(`width: ${TAB_BAR_MARKER_BASE_PX}px`);
    expect(decls).toMatch(/pointer-events: none/);
  });
});

describe("the stylesheet", () => {
  const css = buildBonsaiScopeStylesheet();

  it("slides the page 48 points over 180 ms with the mock-up's easing, from each side, and holds nothing at the end", () => {
    for (const side of ["right", "left"] as const) {
      const sign = side === "right" ? "" : "-";
      const keyframes = css.slice(css.indexOf(`@keyframes bonsai-tab-glide-from-${side}`));
      expect(keyframes.slice(0, keyframes.indexOf("}\n        }"))).toContain(`translateX(${sign}48px)`);
      const rule = css.slice(css.indexOf(`.bonsai-tab-body-root.bonsai-tab-body-root--glide-from-${side} {`));
      const decls = rule.slice(0, rule.indexOf("}"));
      expect(decls).toContain(`animation: bonsai-tab-glide-from-${side} 180ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards !important`);
      expect(decls).not.toMatch(/forwards|both/);
    }
  });

  it("moves transform and opacity only, so the page is not laid out again on every frame", () => {
    const start = css.indexOf("@keyframes bonsai-tab-glide-from-right");
    const end = css.indexOf("@media (prefers-reduced-motion: reduce)", start);
    const props = css.slice(start, end).match(/([a-z-]+):\s/g)!.map((p) => p.replace(/:\s/, ""));
    for (const p of props) expect(["transform", "opacity", "animation"]).toContain(p);
  });

  it("is beaten by nothing in the pane: the rule has more weight than section 3's content-pane animation-off", () => {
    // Section 3 turns animation off, `!important`, on `.bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"] > div`
    // (specificity 0,3,1). The glide's rule is `!important` too and has four classes (0,4,0), so it wins when the root is that div.
    const rule = css.slice(css.indexOf(".bonsai-tab-body-root.bonsai-tab-body-root--glide-from-right {"));
    const selector = css.slice(css.lastIndexOf("\n", css.indexOf(".bonsai-tab-body-root.bonsai-tab-body-root--glide-from-right {")), css.indexOf(".bonsai-tab-body-root.bonsai-tab-body-root--glide-from-right {") + 70);
    expect(rule).toContain("!important");
    expect(selector).toContain(".bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-body-root.bonsai-tab-body-root--glide-from-right");
  });

  it("switches the page's animation and the line's transition off under prefers-reduced-motion", () => {
    const media = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n          .bonsai-scope .bonsai-decky-tabs-root .bonsai-tab-body-root"));
    const block = media.slice(0, media.indexOf("\n        }\n") + 10);
    expect(block).toContain("glide-from-right");
    expect(block).toContain("glide-from-left");
    expect(block).toMatch(/animation: none !important/);
    const markerMedia = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n          .bonsai-scope .bonsai-tab-bar__marker"));
    expect(markerMedia.slice(0, markerMedia.indexOf("}\n        }") + 10)).toMatch(/transition: none/);
  });
});
