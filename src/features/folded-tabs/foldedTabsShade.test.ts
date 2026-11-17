/**
 * Title: A folded section is one shaded block, and the ring on its line stays clear
 * Purpose: Pin plan 105 lane C1 (row P105-SECTION-SHADE-01), the look the maintainer picked on board 5, tab 1, option
 *          B (docs/demos/mockup-board-5/src/61-sections.css, `.b5t1-v-b`): every section is a small rounded block a few
 *          points in from the sides; an open section is its line and its settings on one shade; the line is a lighter
 *          band; the name is a little bigger and bolder. Read back out of the built stylesheet (lessons-learned § 5).
 *          The pair that must not erase each other is checked too: the white ring on a line (inset, 2 px) and the
 *          shade it sits on. The ring is drawn over the line's own focus fill, and nothing on the block clips or
 *          covers it.
 * Used for: foldedTabs.ts (the rules), FoldedSection.tsx (the elements they style).
 * Does not: See pixels. The picture per tab is the Deck check; the nearest this reaches is the sums.
 */
import { describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import { textPx } from "../../styles/textPx";

function rule(selector: string): Record<string, string> {
  const css = buildBonsaiScopeStylesheet();
  const at = css.indexOf(`${selector} {`);
  expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const decl of body.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const [k, ...v] = decl.split(":");
    if (k && v.length) out[k.trim()] = v.join(":").trim();
  }
  return out;
}

const S = ".bonsai-scope .bonsai-fold-section";
const L = ".bonsai-scope .bonsai-fold-line";

const hex = (c: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  expect(m, `${c} is not a #rrggbb colour`).not.toBeNull();
  const n = parseInt(m![1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = ([r, g, b]: number[]): number => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: number[], b: number[]): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `fg` at `alpha` laid over `bg`. */
const over = (fg: number[], alpha: number, bg: number[]): number[] => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha));

describe("a section is one rounded block, a few points in from the sides (the drawing's .b5t1-v-b .b5t1-sec)", () => {
  const block = rule(S);
  const open = rule(`${S}[data-open="true"]`);

  it("is inset 5 points at the top and 6 at each side, with a 4-point radius, on its own shade", () => {
    expect(block["margin"]).toBe("5px 6px 0");
    expect(block["border-radius"]).toBe("4px");
    expect(block["background"]).toBe("#131b24");
    expect(block["box-shadow"]).toBe("0 0 0 1px #1c2530");
  });

  it("an open section keeps the shade and takes a slightly lighter edge, so its start and end show", () => {
    expect(open["box-shadow"]).toBe("0 0 0 1px #26313e");
    expect(open["background"] ?? block["background"]).toBe("#131b24");
  });

  it("the last block has 4 points under it", () => {
    expect(rule(`${S}:last-child`)["margin-bottom"]).toBe("4px");
  });

  it("is lighter than the panel, so a block stands out of it", () => {
    expect(lum(hex(block["background"]))).toBeGreaterThan(lum(hex("#0e141b")));
  });
});

describe("the line is a lighter band; its name is a little bigger and bolder", () => {
  const line = rule(L);
  const openLine = rule(`${L}[data-open="true"]`);
  const name = rule(`${L}__name`);

  it("the line sits on a lighter shade than the block and draws no line of its own under it", () => {
    expect(line["background"]).toBe("#1b2531");
    expect(lum(hex(line["background"]))).toBeGreaterThan(lum(hex("#131b24")));
    expect(line["border-bottom"]).toBe("0");
    expect(line["min-height"]).toBe("34px");
  });

  it("the name is 13 points at weight 800, light grey shut and white open", () => {
    expect(name["font-size"]).toBe(textPx(13));
    expect(name["font-weight"]).toBe("800");
    expect(name["color"]).toBe("#d7dadd");
    expect(rule(`${L}[data-open="true"] .bonsai-fold-line__name`)["color"]).toBe("#ffffff");
    expect(openLine["color"]).toBe("#ffffff");
  });

  it("the settings of an open section sit on the block's shade with no line under them", () => {
    const body = rule(".bonsai-scope .bonsai-fold-body");
    expect(body["border-bottom"]).toBeUndefined();
    expect(body["padding"]).toBe("2px 0 6px");
    expect(body["background"]).toBeUndefined();
  });
});

describe("the white ring on a shaded line stays clear (two effects on one edge must not erase each other)", () => {
  const block = rule(S);
  const line = rule(L);
  const openLine = rule(`${L}[data-open="true"]`);
  const ringed = rule(`${L}.gpfocus`);
  const fill = hex(ringed["background"]);
  const ring = over([255, 255, 255], 0.85, fill);

  it("the ringed line's fill is lighter than its shade (a step, as drawn: the white edge carries the focus), so the ring never sits on the shade itself", () => {
    expect(lum(fill)).toBeGreaterThan(lum(hex(line["background"])));
    expect(contrast(fill, hex(line["background"]))).toBeGreaterThan(1.2);
  });

  it("the ring is white on that fill, inset inside the line's own box, with the halo beside it", () => {
    expect(ringed["outline"]).toBe("2px solid rgba(255, 255, 255, 0.85)");
    expect(ringed["outline-offset"]).toBe("-2px");
    expect(ringed["box-shadow"]).toBe("inset 0 0 0 1px rgba(255, 255, 255, 0.55)");
    expect(contrast(ring, fill)).toBeGreaterThanOrEqual(7);
  });

  it("the ring is also clear of the block's own shade and edge", () => {
    expect(contrast(ring, hex(block["background"]))).toBeGreaterThanOrEqual(7);
    expect(contrast(ring, hex(rule(`${S}[data-open="true"]`)["box-shadow"].split(" ").pop()!))).toBeGreaterThanOrEqual(5);
  });

  it("nothing on the block clips the ring or paints over it: no overflow cut, and the line's corners follow the block's", () => {
    expect(block["overflow"]).toBeUndefined();
    expect(line["border-radius"]).toBe("4px");
    expect(openLine["border-radius"]).toBe("4px 4px 0 0");
    /* The ring's own rule never changes the line's box, so it cannot move off the block's edge. */
    for (const key of ["margin", "padding", "border", "border-radius", "overflow", "position"]) expect(ringed[key]).toBeUndefined();
  });
});
