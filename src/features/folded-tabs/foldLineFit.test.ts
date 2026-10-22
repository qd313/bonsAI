/**
 * How it works: a folded section's line (name, summary, arrow) laid out by arithmetic, every number read back out of
 * the built stylesheet (lessons § 5, the plan 84 lesson), for the name widths the Deck measured (plan 94 P94-TEXT-SIZE).
 * jsdom draws nothing, so this is the nearest test to the screen: the same flexbox sums Chromium does for this line.
 * Deck check (P97-L13-LARGE-TEXT): at Normal and Large every summary is shown at a useful width or not at all (never
 * the "Hi..." sliver), and the arrow is at least 8 px from the panel's edge (it sat 3 px from it at Large).
 */
import { describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";

function rule(selector: string): Record<string, string> {
  const css = buildBonsaiScopeStylesheet();
  const at = css.indexOf(`${selector} {`);
  if (at < 0) return {};
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const decl of body.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const [k, ...v] = decl.split(":");
    if (k && v.length) out[k.trim()] = v.join(":").trim();
  }
  return out;
}

const px = (v: string | undefined): number => (v && /^-?\d+(\.\d+)?px$/.test(v) ? parseFloat(v) : 0);
/** The second value of a `padding: <y> <x>` shorthand (the side padding). */
const sidePad = (v: string | undefined): number => px((v ?? "").split(/\s+/)[1] ?? (v ?? ""));

const S = ".bonsai-scope .bonsai-fold-line";
const line = rule(S);
const name = rule(`${S}__name`);
const box = rule(`${S}__summary`);
const boxFirst = rule(`${S}__summary::before`);
const text = rule(`${S}__summary-text`);
const chevron = rule(`${S}__chevron`);

/** The panel's width on the Deck, and the arrow's least distance from its edge (the row's own number). */
const LINE_W = 300;
const ARROW_EDGE_MIN = 8;
/** Anything shown narrower than this is a sliver (the Deck's "Hi..." was 25 px). */
const SLIVER_PX = 40;

/**
 * The line's sums. Its children are the name, the summary box and the arrow, with the line's flex gap between each.
 * The name keeps its whole width unless it can shrink (wraps); the box gets what is left. Inside the box, the words
 * go to a second, clipped row (absent) when the box is narrower than their margin plus their least width.
 */
function layOut(nameW: number): { summaryW: number; arrowFromEdge: number } {
  const pad = sidePad(line["padding"]);
  const gap = px(line["gap"]);
  const arrow = px(chevron["width"]) + px(chevron["margin-left"]);
  const inner = LINE_W - 2 * pad;
  const room = inner - 2 * gap - arrow;
  const nameShrinks = !/^\d+ 0 /.test(name["flex"] ?? "") && name["white-space"] !== "nowrap";
  const nameDrawn = nameShrinks ? Math.min(nameW, room) : nameW;
  const boxW = Math.max(0, room - nameDrawn);
  const arrowRight = pad + nameDrawn + boxW + 2 * gap + arrow;
  const wraps = box["flex-wrap"] === "wrap" && box["overflow"] === "hidden" && boxFirst["height"] === "100%";
  const textMargin = px(text["margin-left"]);
  const least = px((text["flex"] ?? "").split(/\s+/)[2]);
  const summaryW = wraps ? (boxW >= textMargin + least ? boxW - textMargin : 0) : boxW;
  return { summaryW, arrowFromEdge: LINE_W - arrowRight };
}

/** Name widths the Deck measured or implies (plan 94: line width less padding, gaps, arrow and the shown summary). */
const MEASURED: Array<[string, number]> = [
  ["Story spoilers at Small", 206],
  ["Story spoilers at Normal", 229],
  ["Story spoilers at Large", 263],
  ["Suggestion chips at Normal", 125],
  ["Suggestion chips at Large", 144],
  ["Where AI runs at Large", 118],
  ["Knowledge base at Large", 215],
  ["Connection tuning at Large", 160],
];

describe("folded section line at every text size: a summary is useful or absent, the arrow keeps its gap", () => {
  it.each(MEASURED)("%s: no sliver of summary", (_label, nameW) => {
    const { summaryW } = layOut(nameW);
    expect(summaryW === 0 || summaryW >= SLIVER_PX, `summary drawn ${summaryW} px wide`).toBe(true);
  });
  it.each(MEASURED)("%s: the arrow at least 8 px from the panel's edge", (_label, nameW) => {
    expect(layOut(nameW).arrowFromEdge).toBeGreaterThanOrEqual(ARROW_EDGE_MIN);
  });
  it("a name wider than the whole line still leaves the arrow its gap", () => {
    expect(layOut(LINE_W * 2).arrowFromEdge).toBeGreaterThanOrEqual(ARROW_EDGE_MIN);
    expect(layOut(LINE_W * 2).summaryW).toBe(0);
  });
  it("a short name leaves the summary room to show", () => {
    expect(layOut(100).summaryW).toBeGreaterThanOrEqual(SLIVER_PX);
  });
  it("the summary box is one line tall, so its second row (the words with no room) is never drawn", () => {
    expect(box["height"]).toBeDefined();
    expect(box["height"]).toBe(box["line-height"]);
    expect(boxFirst["flex"]).toBe("0 0 0");
    /* A first row of 0 height would put the second row, the words, inside the clip (seen in Chromium). */
    expect(boxFirst["height"]).toBe("100%");
    expect(text["max-width"]).toBe("max-content");
    expect(text["text-overflow"]).toBe("ellipsis");
  });
});
