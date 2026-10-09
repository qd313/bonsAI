/**
 * Title: Where the tab bar's parts sit on the Deck's 300-point bar
 * Purpose: Lay the real bar out at the Deck's width from the real scope stylesheet and pin what a
 *          person sees there (plan 84 step 4, design "T3"): the five columns in order, the current
 *          tab's name centred within 1 point of the bar's centre for every tab at five and six tabs,
 *          LB and RB 16 points in from each edge, no icon running into LB, RB or the name even with
 *          the longest name at six tabs, and tap targets big enough to hit.
 * Used for: plan 84 rows P84-TABS-01 and the name-centre half of the step 4 brief.
 * Solves: jsdom draws nothing, so a test that only reads classes would pass while the name sat off
 *         centre. This one reads every length the stylesheet gives the bar's parts, through jsdom's
 *         own cascade, and places them with the two layout rules the bar uses: a grid of
 *         auto | minmax(0, 1fr) | auto | minmax(0, 1fr) | auto, and a flex row with shrinking.
 * Does not: Know Steam's font. Text is measured with a table of bold capital widths, scaled by a
 *           range of factors to stand in for Motiva Sans, which is not on this PC. The centring holds
 *           for any width; the "nothing runs into anything" checks use the widest factor. The Deck
 *           check measures the same things on the device with the probe.
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

/** A `flex: 0 <shrink> <basis>` shorthand, the only form the bar uses, as a basis and a minimum. */
function flexItem(flex: string, minWidth: number): Item {
  const m = /^0 ([01]) (.+)$/.exec(flex.trim());
  if (!m) throw new Error(`a flex value the layout below cannot read: "${flex}"`);
  const basis = len(m[2]);
  return { basis, min: m[1] === "0" ? basis : minWidth };
}

/** The declarations of one rule, by exact selector (jsdom has no computed style for ::before). */
function ruleDecls(selector: string): string {
  const css = buildBonsaiScopeStylesheet().replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    if (m[1].trim() === selector) return m[2];
  }
  throw new Error(`no rule for ${selector}`);
}

type Item = { basis: number; min: number };
/** A flex row's item sizes in `room`: every item shrinks by its basis until it reaches its minimum. */
function shrink(items: Item[], room: number): number[] {
  const sizes = items.map((i) => i.basis);
  const frozen = items.map(() => false);
  for (let pass = 0; pass < items.length + 1; pass++) {
    const over = sizes.reduce((a, b) => a + b, 0) - room;
    if (over <= 0) break;
    const live = items.map((_, k) => k).filter((k) => !frozen[k]);
    const weight = live.reduce((a, k) => a + items[k].basis, 0);
    if (weight === 0) break;
    let clamped = false;
    for (const k of live) {
      const next = sizes[k] - (over * items[k].basis) / weight;
      if (next <= items[k].min) {
        sizes[k] = items[k].min;
        frozen[k] = true;
        clamped = true;
      } else {
        sizes[k] = next;
      }
    }
    if (!clamped) break;
  }
  return sizes;
}

type Span = { left: number; right: number };
type Laid = {
  columns: Span[];
  lbText: Span;
  rbText: Span;
  lbTarget: Span;
  rbTarget: Span;
  currentIcon: Span | null;
  name: Span;
  leftIcons: Span[];
  rightIcons: Span[];
  peekTargets: Span[];
};

/**
 * The bar laid out at the Deck's width, from the computed styles of the real stylesheet.
 * Grid: the three `auto` columns take their items' widths (margins included, negative ones too),
 * and the two `minmax(0, 1fr)` columns share what is left equally.
 */
function layOut(root: HTMLElement, factor: number): Laid {
  const cs = (el: Element) => getComputedStyle(el as HTMLElement);
  const bar = cs(root);
  const pl = len(bar.paddingLeft);
  const pr = len(bar.paddingRight);
  const gap = len(bar.columnGap);
  const [lbEl, leftEl, curEl, rightEl, rbEl] = Array.from(root.children);

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

  const cur = cs(curEl);
  const iconEl = curEl.querySelector(".bonsai-tab-bar__current-icon");
  const iconW = iconEl ? len(cs(iconEl).width) : 0;
  const iconMr = iconEl ? len(cs(iconEl).marginRight) : 0;
  const nameEl = curEl.querySelector(".bonsai-tab-bar__name") as HTMLElement;
  const ns = cs(nameEl);
  const nfs = len(ns.fontSize);
  const nameW = len(ns.paddingLeft, nfs) + textWidth(nameEl.textContent ?? "", nfs, len(ns.letterSpacing, nfs), factor);
  const curPl = len(cur.paddingLeft);
  const curMl = len(cur.marginLeft);
  const midCol = curPl + iconW + iconMr + nameW + len(cur.paddingRight) + curMl;

  const inner = DECK_BAR_W - pl - pr;
  const side = Math.max(0, (inner - lbCol - midCol - rbCol - 4 * gap) / 2);
  const x1 = pl;
  const x2 = x1 + lbCol + gap;
  const x3 = x2 + side + gap;
  const x4 = x3 + midCol + gap;
  const x5 = x4 + side + gap;
  const columns = [
    { left: x1, right: x1 + lbCol },
    { left: x2, right: x2 + side },
    { left: x3, right: x3 + midCol },
    { left: x4, right: x4 + side },
    { left: x5, right: x5 + rbCol },
  ];

  const lbBorder = x1 + lb.ml;
  const lbTextLeft = lbBorder + lb.pl; // justify-content: flex-start
  const rbBorder = x5 + rb.ml;
  const rbTextRight = rbBorder + rb.pl + rb.w; // justify-content: flex-end

  const curContent = x3 + curMl + curPl;
  const nameLeft = curContent + iconW + iconMr;

  /** One side's icons: each tap target's span, and the icon drawn centred in it. */
  const peeks = (sideEl: Element) => Array.from(sideEl.querySelectorAll(".bonsai-tab-bar__peek"));
  const peekItem = (el: Element): Item => flexItem(cs(el).flex, len(cs(el).minWidth));
  const drawnIcon = (el: Element) => Number(el.querySelector("svg")?.getAttribute("width") ?? 0);
  const place = (els: Element[], sizes: number[], start: number) => {
    const targets: Span[] = [];
    const icons: Span[] = [];
    let x = start;
    els.forEach((el, k) => {
      targets.push({ left: x, right: x + sizes[k] });
      const c = x + sizes[k] / 2;
      icons.push({ left: c - drawnIcon(el) / 2, right: c + drawnIcon(el) / 2 });
      x += sizes[k];
    });
    return { targets, icons };
  };

  const leftPeeks = peeks(leftEl);
  const leftRoom = side - len(cs(leftEl).paddingRight);
  const leftSizes = shrink(leftPeeks.map(peekItem), leftRoom);
  const leftStart = x2 + leftRoom - leftSizes.reduce((a, b) => a + b, 0); // justify-content: flex-end
  const L = place(leftPeeks, leftSizes, leftStart);

  const spacer = flexItem(/flex:\s*([^;]+);/.exec(ruleDecls(".bonsai-scope .bonsai-tab-bar__side--r::before"))![1], 0);
  const rightPeeks = peeks(rightEl);
  const rightSizes = shrink([spacer, ...rightPeeks.map(peekItem)], side);
  const R = place(rightPeeks, rightSizes.slice(1), x4 + rightSizes[0]); // justify-content: flex-start

  return {
    columns,
    lbText: { left: lbTextLeft, right: lbTextLeft + lb.text },
    rbText: { left: rbTextRight - rb.text, right: rbTextRight },
    lbTarget: { left: lbBorder, right: lbBorder + lb.pl + lb.w + lb.pr },
    rbTarget: { left: rbBorder, right: rbBorder + rb.pl + rb.w + rb.pr },
    currentIcon: iconEl ? { left: curContent, right: curContent + iconW } : null,
    name: { left: nameLeft, right: nameLeft + nameW },
    leftIcons: L.icons,
    rightIcons: R.icons,
    peekTargets: [...L.targets, ...R.targets],
  };
}

describe("the tab bar laid out at the Deck's 300 points (plan 84 step 4, T3)", () => {
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
  function everyBar(factor: number, check: (laid: Laid, label: string) => void) {
    for (const ids of [FIVE, SIX]) {
      for (const current of ids) {
        const host = scope.appendChild(document.createElement("div"));
        const { container, unmount } = render(
          <TabIndicatorBar tabIds={ids} currentTab={current} selectTab={vi.fn()} exitDown={() => true} />,
          { container: host },
        );
        check(layOut(container.querySelector(".bonsai-tab-bar") as HTMLElement, factor), `${current} of ${ids.length}`);
        unmount();
      }
    }
  }

  it("centres the current tab's name within 1 point of the bar's centre, for every tab at five and six tabs", () => {
    for (const factor of FONT_FACTORS) {
      everyBar(factor, (laid, label) => {
        const off = Math.abs((laid.name.left + laid.name.right) / 2 - DECK_BAR_W / 2);
        expect(off, `${label} at font factor ${factor}`).toBeLessThanOrEqual(1);
        // Exact by construction (equal LB and RB boxes, equal sides, equal paddings round the name),
        // so anything over a hair means one of those pairs came apart, even while still under 1.
        expect(off, `${label} at font factor ${factor}: a pair came apart`).toBeLessThan(0.05);
      });
    }
  });

  it("puts the five columns left to right inside the bar, with LB and RB 16 points in from each edge", () => {
    everyBar(1, (laid, label) => {
      for (let k = 1; k < laid.columns.length; k++) {
        expect(laid.columns[k].left, label).toBeGreaterThan(laid.columns[k - 1].right);
      }
      expect(laid.columns[0].left).toBeGreaterThanOrEqual(0);
      expect(laid.columns[4].right).toBeLessThanOrEqual(DECK_BAR_W);
      expect(laid.lbText.left).toBeCloseTo(16, 5);
      expect(laid.rbText.right).toBeCloseTo(DECK_BAR_W - 16, 5);
    });
  });

  it("keeps every icon clear of LB, RB and the current tab, even with the longest name at six tabs in a wide font", () => {
    everyBar(WIDEST, (laid, label) => {
      const left = laid.leftIcons;
      const right = laid.rightIcons;
      if (left.length > 0) {
        expect(left[0].left - laid.lbText.right, `${label}: LB to the first icon`).toBeGreaterThanOrEqual(2);
        expect(laid.currentIcon!.left - left[left.length - 1].right, `${label}: last left icon to the current icon`).toBeGreaterThanOrEqual(2);
      }
      for (let k = 1; k < left.length; k++) expect(left[k].left, label).toBeGreaterThan(left[k - 1].right);
      expect(right[0].left - laid.name.right, `${label}: the name to the first right icon`).toBeGreaterThanOrEqual(2);
      for (let k = 1; k < right.length; k++) expect(right[k].left, label).toBeGreaterThan(right[k - 1].right);
      expect(laid.rbText.left - right[right.length - 1].right, `${label}: the last icon to RB`).toBeGreaterThanOrEqual(2);
    });
  });

  it("draws the drawing's spacing where there is room: icons 7 apart, 12 from the current icon, 28 after the name", () => {
    everyBar(1, (laid, label) => {
      if (label !== "main of 5") return;
      const { leftIcons: l, rightIcons: r } = laid;
      expect(l[1].left - l[0].right).toBeCloseTo(7, 5);
      expect(r[1].left - r[0].right).toBeCloseTo(7, 5);
      expect(laid.currentIcon!.left - l[l.length - 1].right).toBeCloseTo(12, 5);
      expect(r[0].left - laid.name.right).toBeCloseTo(28, 5);
    });
  });

  it("gives every tap target room to hit: LB and RB about 31 points wide, side icons at least the icon, none overlapping", () => {
    everyBar(WIDEST, (laid, label) => {
      for (const t of [laid.lbTarget, laid.rbTarget]) {
        expect(t.right - t.left, label).toBeGreaterThanOrEqual(28);
        expect(t.left).toBeGreaterThanOrEqual(0);
        expect(t.right).toBeLessThanOrEqual(DECK_BAR_W);
      }
      const all = [laid.lbTarget, ...laid.peekTargets, laid.rbTarget].sort((a, b) => a.left - b.left);
      for (const t of laid.peekTargets) expect(t.right - t.left, label).toBeGreaterThanOrEqual(11);
      for (let k = 1; k < all.length; k++) expect(all[k].left, label).toBeGreaterThanOrEqual(all[k - 1].right - 1e-9);
    });
    // Every target is the bar's full height: the grid and the sides stretch their items.
    const { container } = render(
      <TabIndicatorBar tabIds={SIX} currentTab="main" selectTab={vi.fn()} exitDown={() => true} />,
      { container: scope.appendChild(document.createElement("div")) },
    );
    const root = container.querySelector(".bonsai-tab-bar") as HTMLElement;
    expect(getComputedStyle(root).alignItems).toBe("stretch");
    for (const side of Array.from(root.querySelectorAll(".bonsai-tab-bar__side"))) {
      expect(getComputedStyle(side as HTMLElement).alignItems).toBe("stretch");
    }
  });
});
