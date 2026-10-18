/**
 * Title: Decky's title bar laid out from the styles, for tests
 * Purpose: jsdom lays nothing out, and the back-button bug (plan 87 B7) is pure flex arithmetic: Decky's
 *          bar is a flex row, the back arrow shrinks, and a long chat name's wide natural size made the
 *          arrow lose up to 8 points (measured on the Deck 2026-10-09: 40 points with a 14-letter name,
 *          32 to 33.5 with names of 51 to 60 letters). This reads the flex numbers out of the stylesheet
 *          bonsAI really draws (`CHAT_TITLE_CSS`, and the empty space's inline width) and runs the browser's
 *          own flex rule (grow and shrink in proportion, a box that hits its minimum is frozen and the rest is
 *          shared again) over Decky's bar and over the name row, so a regression in the stylesheet shows
 *          as a changed arrow width. Checked against Chrome on 2026-10-09 (a copy of the bar with the same
 *          numbers gave 40, 32.9 and 31.4 for the old stylesheet, and 40 for all three with the new one).
 * Used for: the title-bar layout tests (nameRowSpill.test.tsx, nameRowIcons.test.tsx).
 * Does not: Know about words: the name's natural width is handed in. Not part of the plugin.
 */

/** One box in a flex row, as the stylesheet gives it. */
type FlexBox = { basis: number; grow: number; shrink: number; min: number };

/** Decky's bar on the Deck: 300 wide, 16 points of padding a side, a 10-point gap after its arrow (measured). */
const DECKY_BAR = { width: 300, padX: 16, gapAfterArrow: 10, arrowNatural: 40 };

/**
 * The browser's flex rule over a row of boxes in `room` points: grow by the free space when there is some,
 * otherwise shrink in proportion to shrink factor times basis, freezing any box that would go below its
 * minimum and sharing the rest again. Returns each box's final width.
 */
function solveFlexRow(boxes: FlexBox[], room: number): number[] {
  const sizes = boxes.map((b) => b.basis);
  const free = room - sizes.reduce((a, b) => a + b, 0);
  if (free >= 0) {
    const grow = boxes.reduce((a, b) => a + b.grow, 0);
    return grow > 0 ? sizes.map((s, i) => s + (free * boxes[i].grow) / grow) : sizes;
  }
  const frozen = boxes.map(() => false);
  for (let round = 0; round < boxes.length + 1; round += 1) {
    const open = boxes.map((_, i) => i).filter((i) => !frozen[i]);
    const left = room - boxes.reduce((a, b, i) => a + (frozen[i] ? sizes[i] : b.basis), 0);
    const weight = open.reduce((a, i) => a + boxes[i].shrink * boxes[i].basis, 0);
    if (weight <= 0) break;
    let violated = false;
    for (const i of open) {
      sizes[i] = boxes[i].basis + (left * boxes[i].shrink * boxes[i].basis) / weight;
      if (sizes[i] < boxes[i].min) {
        sizes[i] = boxes[i].min;
        frozen[i] = true;
        violated = true;
      }
    }
    if (!violated) break;
  }
  return sizes;
}

/** The text between the braces of the rule whose selector ends in `selector` (the first such rule). */
function ruleBody(css: string, selector: string): string | null {
  let from = 0;
  for (;;) {
    const at = css.indexOf(selector, from);
    if (at < 0) return null;
    const after = css.slice(at + selector.length);
    const open = after.match(/^\s*\{/);
    if (open) return after.slice(open[0].length, after.indexOf("}"));
    from = at + selector.length;
  }
}

/** The numbers a rule gives a class through `flex: <grow> <shrink> <basis>`; the basis is "auto", "0%" or points. */
function flexOf(css: string, selector: string): { grow: number; shrink: number; basis: "auto" | number } {
  const body = ruleBody(css, selector);
  if (body === null) throw new Error(`no rule for ${selector}`);
  const flex = /(?:^|[;\s])flex:\s*([^;]+);/.exec(body);
  if (!flex) throw new Error(`no flex in ${selector}`);
  const parts = flex[1].trim().split(/\s+/);
  if (parts[0] === "none") return { grow: 0, shrink: 0, basis: "auto" };
  const basis = parts[2] === undefined || parts[2] === "auto" ? "auto" : parseFloat(parts[2]);
  return { grow: parseFloat(parts[0]), shrink: parts[1] === undefined ? 1 : parseFloat(parts[1]), basis };
}

/** Whether a rule gives `min-width: 0` (all of bonsAI's boxes here do). */
function hasMinWidthZero(css: string, selector: string): boolean {
  return /min-width:\s*0/.test(ruleBody(css, selector) ?? "");
}

type TitleBarLayout = {
  arrow: number;
  root: number;
  name: number;
  mirror: number;
  /** Where the name's box starts and ends, from the bar's left edge. */
  nameStart: number;
  nameEnd: number;
  /** The delete icon's left edge, from the bar's left edge (0 when there is no icon). */
  deleteStart: number;
};

/**
 * Decky's bar with its back arrow and bonsAI's view, laid out from `css`. `nameNatural` is the name box's
 * natural width (its words and furniture in one line); `mirrorWidth` is the empty space's inline width;
 * `iconSlot` is the width one icon takes (the + before the name and the delete icon after the empty space),
 * 0 when the row has none (plan 87 F5 added them).
 */
export function layoutTitleBar(css: string, nameNatural: number, mirrorWidth: number, iconSlot = 0): TitleBarLayout {
  const room = DECKY_BAR.width - 2 * DECKY_BAR.padX - DECKY_BAR.gapAfterArrow;
  const rootFlex = flexOf(css, ".bonsai-chat-title");
  const nameFlex = flexOf(css, ".bonsai-chat-title__name");
  const mirrorFlex = flexOf(css, ".bonsai-chat-title__mirror");
  const mirrorBox: FlexBox = {
    basis: mirrorFlex.basis === "auto" ? mirrorWidth : mirrorFlex.basis,
    grow: mirrorFlex.grow,
    shrink: mirrorFlex.shrink,
    min: mirrorFlex.shrink === 0 || !hasMinWidthZero(css, ".bonsai-chat-title__mirror") ? mirrorWidth : 0,
  };
  const nameBox: FlexBox = {
    basis: nameFlex.basis === "auto" ? nameNatural : nameFlex.basis,
    grow: nameFlex.grow,
    shrink: nameFlex.shrink,
    min: hasMinWidthZero(css, ".bonsai-chat-title__name") ? 0 : nameNatural,
  };
  const iconBox: FlexBox = { basis: iconSlot, grow: 0, shrink: 0, min: iconSlot };
  const rootNatural = nameNatural + mirrorWidth + 2 * iconSlot;
  const rootBox: FlexBox = {
    basis: rootFlex.basis === "auto" ? rootNatural : rootFlex.basis,
    grow: rootFlex.grow,
    shrink: rootFlex.shrink,
    min: hasMinWidthZero(css, ".bonsai-chat-title") ? 0 : rootNatural,
  };
  const arrowBox: FlexBox = { basis: DECKY_BAR.arrowNatural, grow: 0, shrink: 1, min: 0 };
  const [arrow, root] = solveFlexRow([arrowBox, rootBox], room);
  const [, name, mirror] = solveFlexRow([iconBox, nameBox, mirrorBox, iconBox], root);
  const rootLeft = DECKY_BAR.padX + arrow + DECKY_BAR.gapAfterArrow;
  const nameStart = rootLeft + iconSlot;
  return {
    arrow,
    root,
    name,
    mirror,
    nameStart,
    nameEnd: nameStart + name,
    deleteStart: iconSlot > 0 ? rootLeft + root - iconSlot : 0,
  };
}
