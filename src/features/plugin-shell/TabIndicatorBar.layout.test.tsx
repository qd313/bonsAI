/**
 * Title: Where the tab bar's parts sit on the Deck's 300-point bar
 * Purpose: Lay the real bar out at the Deck's width from the real scope stylesheet and pin what a
 *          person sees there (plan 87 F4, on plan 84's design "T3"): LB, then every tab in the
 *          strip's own order, then RB; the tabs spread from LB to RB so Main is the first thing after
 *          LB and About the last before RB on every tab; LB and RB 16 points in from each edge; no
 *          icon box narrower than 18 points on any tab (the old bar shrank three of them to 15.2 on
 *          Permissions and 16.7 on Developer, measured on the Deck 2026-10-09); nothing running into
 *          anything even with the longest name at six tabs; and tap targets big enough to hit.
 * Used for: plan 87 F4 (the tab bar's fixed order), and plan 84's P84-TABS-01.
 * Solves: jsdom draws nothing, so a test that only reads classes would pass while an icon was
 *         crushed. This one reads every length the stylesheet gives the bar's parts, through jsdom's
 *         own cascade, and places them with the two layout rules the bar uses: a grid of
 *         auto | minmax(0, 1fr) | auto, and a flex row that spreads its items from end to end
 *         (space-between) and shrinks none of them.
 * Does not: Know Steam's font. Text is measured with a table of bold capital widths, scaled by a
 *           range of factors to stand in for Motiva Sans, which is not on this PC. The "nothing runs
 *           into anything" checks use the widest factor. The Deck check measures the same things on
 *           the device with the probe.
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TabIndicatorBar } from "./TabIndicatorBar";
import { ALL_BONSAI_TAB_IDS, type BonsaiTabId } from "./tabTitles";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";

const SIX = ALL_BONSAI_TAB_IDS;
const FIVE: readonly BonsaiTabId[] = SIX.filter((id) => id !== "developer");

/** The panel column on the Deck's own screen (design-language.md; plan 84 § 1). */
const DECK_BAR_W = 300;

/** Bold capital advance widths per 1000 of the font size (a common bold sans). */
const CAPS: Record<string, number> = {
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556, K: 722, L: 611, M: 833,
  N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
};
/** Stand-ins for Steam's own font: narrower, as measured, and wider than this table. */
const FONT_FACTORS = [0.9, 1, 1.15];
const WIDEST = Math.max(...FONT_FACTORS);

/** Width of `text` in capitals, with letter-spacing after every letter as the browser adds it. */
function textWidth(text: string, fontPx: number, letterSpacingPx: number, factor: number): number {
  const caps = text.toUpperCase();
  let w = 0;
  for (const ch of caps) w += ((CAPS[ch] ?? 700) * fontPx) / 1000;
  return w * factor + caps.length * letterSpacingPx;
}

/** A length as jsdom reports it, at UI scale 1: "16px", "calc(16px * var(--bonsai-ui-scale, 1))", "0.1em", "0", "". */
function len(value: string, fontPx = 0): number {
  const v = value.trim();
  if (v === "" || v === "0" || v === "auto" || v === "normal") return 0;
  let m = /^calc\((-?[\d.]+)px \* var\(--bonsai-ui-scale, 1\)\)$/.exec(v);
  if (m) return Number(m[1]);
  m = /^(-?[\d.]+)px$/.exec(v);
  if (m) return Number(m[1]);
  m = /^(-?[\d.]+)em$/.exec(v);
  if (m) return Number(m[1]) * fontPx;
  throw new Error(`a length the layout below cannot read: "${v}"`);
}

/** A `flex: 0 <shrink> <basis>` shorthand, the only form the bar uses, as a shrink and a width. */
function flexItem(flex: string): { shrink: number; basis: number } {
  const m = /^0 ([01]) (.+)$/.exec(flex.trim());
  if (!m) throw new Error(`a flex value the layout below cannot read: "${flex}"`);
  return { shrink: Number(m[1]), basis: len(m[2]) };
}

type Span = { left: number; right: number };
type Laid = {
  lbText: Span;
  rbText: Span;
  lbTarget: Span;
  rbTarget: Span;
  /** The tabs' column: from just after LB to just before RB. */
  tabsColumn: Span;
  /** Each item in the row, left to right: the tab it shows, its box, and its drawn icon. */
  items: Array<{ id: string; current: boolean; box: Span; icon: Span; shrink: number }>;
  /** Room left over in the tabs' column once every item is placed (negative: it does not fit). */
  spare: number;
  name: Span;
};

/**
 * The bar laid out at the Deck's width, from the computed styles of the real stylesheet.
 * Grid: the two `auto` columns take their items' widths (margins included, negative ones too) and the
 * `minmax(0, 1fr)` column takes what is left. Flex: `justify-content: space-between` shares the spare
 * room equally between the items, and an item with a shrink of 0 keeps its width however little room.
 */
function layOut(root: HTMLElement, factor: number): Laid {
  const cs = (el: Element) => getComputedStyle(el as HTMLElement);
  const bar = cs(root);
  const pl = len(bar.paddingLeft);
  const pr = len(bar.paddingRight);
  const gap = len(bar.columnGap);
  const [lbEl, tabsEl, rbEl] = Array.from(root.children);

  const mark = (el: Element) => {
    const s = cs(el);
    const fs = len(s.fontSize);
    const text = textWidth(el.textContent ?? "", fs, len(s.letterSpacing, fs), factor);
    return {
      // A set width holds whatever the two letters measure; without one the box is the letters.
      w: s.width === "" || s.width === "auto" ? text : len(s.width),
      pl: len(s.paddingLeft),
      pr: len(s.paddingRight),
      ml: len(s.marginLeft),
      mr: len(s.marginRight),
      text,
    };
  };
  const lb = mark(lbEl);
  const rb = mark(rbEl);
  const lbCol = lb.w + lb.pl + lb.pr + lb.ml + lb.mr;
  const rbCol = rb.w + rb.pl + rb.pr + rb.ml + rb.mr;

  const inner = DECK_BAR_W - pl - pr;
  const tabsW = inner - lbCol - rbCol - 2 * gap;
  const x1 = pl;
  const x2 = x1 + lbCol + gap;
  const x3 = x2 + tabsW + gap;

  const lbBorder = x1 + lb.ml;
  const lbTextLeft = lbBorder + lb.pl; // justify-content: flex-start
  const rbBorder = x3 + rb.ml;
  const rbTextRight = rbBorder + rb.pl + rb.w; // justify-content: flex-end

  /** Each item's own width: a tab's fixed basis, or the current tab's paddings, icon, gap and name. */
  const sized = Array.from(tabsEl.children).map((el) => {
    if (el.classList.contains("bonsai-tab-bar__current")) {
      const c = cs(el);
      const iconEl = el.querySelector(".bonsai-tab-bar__current-icon");
      const iconW = iconEl ? len(cs(iconEl).width) : 0;
      const iconMr = iconEl ? len(cs(iconEl).marginRight) : 0;
      const nameEl = el.querySelector(".bonsai-tab-bar__name") as HTMLElement;
      const ns = cs(nameEl);
      const nfs = len(ns.fontSize);
      const nameW = len(ns.paddingLeft, nfs) + textWidth(nameEl.textContent ?? "", nfs, len(ns.letterSpacing, nfs), factor);
      const padL = len(c.paddingLeft);
      const w = padL + iconW + iconMr + nameW + len(c.paddingRight);
      expect(c.flex.replace(/\s+/g, " ").trim(), "the current tab never shrinks").toMatch(/^(none|0 0 auto)$/);
      return { el, w, shrink: 0, iconLeft: padL, iconW, nameLeft: padL + iconW + iconMr, nameW, current: true };
    }
    const f = flexItem(cs(el).flex);
    expect(len(cs(el).minWidth), "a tab's minimum is its own width").toBe(f.basis);
    const drawn = Number(el.querySelector("svg")?.getAttribute("width") ?? 0);
    return { el, w: f.basis, shrink: f.shrink, iconLeft: (f.basis - drawn) / 2, iconW: drawn, nameLeft: 0, nameW: 0, current: false };
  });
  const total = sized.reduce((a, i) => a + i.w, 0);
  const spare = tabsW - total;
  const between = sized.length > 1 ? Math.max(0, spare) / (sized.length - 1) : 0; // justify-content: space-between

  let x = x2;
  let name: Span = { left: 0, right: 0 };
  const items = sized.map((i) => {
    const box = { left: x, right: x + i.w };
    if (i.current) name = { left: x + i.nameLeft, right: x + i.nameLeft + i.nameW };
    x += i.w + between;
    return {
      id: i.el.getAttribute("data-bonsai-tab") ?? "current",
      current: i.current,
      box,
      icon: { left: box.left + i.iconLeft, right: box.left + i.iconLeft + i.iconW },
      shrink: i.shrink,
    };
  });

  return {
    lbText: { left: lbTextLeft, right: lbTextLeft + lb.text },
    rbText: { left: rbTextRight - rb.text, right: rbTextRight },
    lbTarget: { left: lbBorder, right: lbBorder + lb.pl + lb.w + lb.pr },
    rbTarget: { left: rbBorder, right: rbBorder + rb.pl + rb.w + rb.pr },
    tabsColumn: { left: x2, right: x2 + tabsW },
    items,
    spare,
    name,
  };
}

describe("the tab bar laid out at the Deck's 300 points (plan 87 F4, on plan 84's T3)", () => {
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

  /** Every tab list and current tab the Deck can show, laid out at `factor`. */
  function everyBar(
    factor: number,
    check: (laid: Laid, label: string, ids: readonly BonsaiTabId[], current: BonsaiTabId) => void,
  ) {
    for (const ids of [FIVE, SIX]) {
      for (const current of ids) {
        const host = scope.appendChild(document.createElement("div"));
        const { container, unmount } = render(
          <TabIndicatorBar tabIds={ids} currentTab={current} selectTab={vi.fn()} exitDown={() => true} />,
          { container: host },
        );
        check(layOut(container.querySelector(".bonsai-tab-bar") as HTMLElement, factor), `${current} of ${ids.length}`, ids, current);
        unmount();
      }
    }
  }

  it("puts LB, the tabs and RB left to right, LB and RB 16 points in from each edge", () => {
    everyBar(1, (laid, label) => {
      expect(laid.lbText.left, label).toBeCloseTo(16, 5);
      expect(laid.rbText.right, label).toBeCloseTo(DECK_BAR_W - 16, 5);
      expect(laid.tabsColumn.left, label).toBeGreaterThan(laid.lbTarget.right - 3);
      expect(laid.tabsColumn.right, label).toBeLessThan(laid.rbTarget.left + 3);
    });
  });

  it("draws the tabs in the strip's own order, the first flush after LB and the last flush before RB, on every tab", () => {
    for (const factor of FONT_FACTORS) {
      everyBar(factor, (laid, label, ids, current) => {
        expect(
          laid.items.map((i) => (i.current ? current : i.id)),
          `${label}: order drawn`,
        ).toEqual([...ids]);
        expect(laid.items[0].box.left, `${label}: Main flush after LB`).toBeCloseTo(laid.tabsColumn.left, 5);
        expect(laid.items[laid.items.length - 1].box.right, `${label}: About flush before RB`).toBeCloseTo(
          laid.tabsColumn.right,
          5,
        );
        for (let k = 1; k < laid.items.length; k++) {
          expect(laid.items[k].box.left, `${label}: item ${k} after item ${k - 1}`).toBeGreaterThanOrEqual(
            laid.items[k - 1].box.right - 1e-9,
          );
        }
      });
    }
  });

  it("gives every icon a box at least 18 points wide on all six tabs, Permissions and Developer included, in the widest font", () => {
    let seen = 0;
    everyBar(WIDEST, (laid, label, ids, current) => {
      const widths = laid.items.filter((i) => !i.current);
      for (const item of widths) {
        expect(item.box.right - item.box.left, `${label}: ${item.id}`).toBeGreaterThanOrEqual(18 - 1e-9);
        expect(item.shrink, `${label}: ${item.id} may not shrink`).toBe(0);
      }
      // The two tabs where the old bar shrank the boxes, counted so a failure to reach them reads plainly.
      if (ids === SIX && (current === "permissions" || current === "developer")) seen += 1;
    });
    expect(seen).toBe(2);
  });

  it("fits: even with the longest name at six tabs in a wide font, the row is no wider than the room between LB and RB, with a gap between neighbours", () => {
    everyBar(WIDEST, (laid, label) => {
      expect(laid.spare, `${label}: spare room`).toBeGreaterThanOrEqual(0);
      const drawn = laid.items.map((i) => i.icon);
      for (let k = 1; k < drawn.length; k++) {
        expect(drawn[k].left - drawn[k - 1].right, `${label}: icons ${k - 1} and ${k}`).toBeGreaterThanOrEqual(2);
      }
      expect(drawn[0].left - laid.lbText.right, `${label}: LB to the first icon`).toBeGreaterThanOrEqual(2);
      expect(laid.rbText.left - drawn[drawn.length - 1].right, `${label}: the last icon to RB`).toBeGreaterThanOrEqual(2);
    });
  });

  it("keeps the current tab's name inside its own box, after its icon, inside the bar", () => {
    everyBar(WIDEST, (laid, label) => {
      const cur = laid.items.find((i) => i.current)!;
      expect(laid.name.left, label).toBeGreaterThanOrEqual(cur.icon.right);
      expect(laid.name.right, label).toBeLessThanOrEqual(cur.box.right);
      expect(laid.name.right, label).toBeLessThanOrEqual(DECK_BAR_W);
    });
  });

  it("gives every tap target room to hit: LB and RB about 31 points wide, side icons at least 18, none overlapping", () => {
    everyBar(WIDEST, (laid, label) => {
      for (const t of [laid.lbTarget, laid.rbTarget]) {
        expect(t.right - t.left, label).toBeGreaterThanOrEqual(28);
        expect(t.left).toBeGreaterThanOrEqual(0);
        expect(t.right).toBeLessThanOrEqual(DECK_BAR_W);
      }
      const all = [laid.lbTarget, ...laid.items.map((i) => i.box), laid.rbTarget].sort((a, b) => a.left - b.left);
      for (let k = 1; k < all.length; k++) expect(all[k].left, label).toBeGreaterThanOrEqual(all[k - 1].right - 1e-9);
    });
    // Every target is the bar's full height: the grid and the row of tabs stretch their items.
    const { container } = render(
      <TabIndicatorBar tabIds={SIX} currentTab="main" selectTab={vi.fn()} exitDown={() => true} />,
      { container: scope.appendChild(document.createElement("div")) },
    );
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    expect(getComputedStyle(root).alignItems).toBe("stretch");
    expect(getComputedStyle(container.querySelector(".bonsai-tab-bar__tabs") as HTMLElement).alignItems).toBe("stretch");
  });
});
