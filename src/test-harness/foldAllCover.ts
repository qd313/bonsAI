/**
 * Title: What the floating Open all button hides of a folded tab's rows, as boxes on the page
 * Purpose: Test helper for plan 93 (the Deck, 2026-10-13: with sections open and the pane scrolled, the button
 *          sat over 56 x 14 px of the Connection tuning line's summary and 10 x 14 px of its arrow). It places the
 *          button where the stylesheet puts it (its height, its gap above the strip, its gap from the right
 *          edge, its width as the Deck measured it), works out what the stylesheet paints over the pane's
 *          bottom (the strip, and the band behind the button when the dock is drawn opaque), and measures how
 *          much of a row's words or arrow is still on view under the button: the part of the row below the
 *          pane's top and above whatever is painted over the bottom, crossed with the button's box.
 * Used for: foldAllCover.test.ts (the Deck's own boxes replayed) and the three folded tabs' walk tests (every
 *           place the walk puts the pane).
 * Does not: Lay anything out: the walk harness (foldedTabWalk.tsx) places the rows, and a section line's words
 *           are put at its right end as the Deck drew them. Does not know the font: the button's width is the
 *           Deck's measure of its wider label, Close all.
 */
import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";
import { FOLD_ALL_HEIGHT_PX } from "../features/folded-tabs/foldedTabs";

export interface PageBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The button's width with its wider label, "Close all" (plan93-P93-M2-OPEN-ALL.json: 74 x 28). */
const FOLD_ALL_WIDTH_PX = 74;

/** The declarations of the first rule whose selector is exactly `selector`, from the plugin's stylesheet. */
function rule(selector: string): Record<string, string> {
  const css = buildBonsaiScopeStylesheet();
  const at = css.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no rule for ${selector}`);
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const decl of body.split(";")) {
    const [k, ...v] = decl.split(":");
    if (k && v.length) out[k.trim()] = v.join(":").replace(/!important/, "").trim();
  }
  return out;
}
const pxAt = (v: string | undefined, index: number) => parseFloat((v ?? "").trim().split(/\s+/)[index] ?? "") || 0;

/** A background that paints: a colour, not missing, not `transparent`, not a see-through rgba. */
function paints(background: string | undefined): boolean {
  if (!background || background === "none" || background === "transparent") return false;
  const alpha = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(background);
  return !alpha || parseFloat(alpha[1]!) >= 1;
}

/** How the stylesheet draws the dock: the button's margins, and whether a band of the panel's colour sits behind it. */
export function foldDockPaint(): { marginRight: number; marginBottom: number; bandOpaque: boolean; bandPadTop: number } {
  const host = rule(".bonsai-scope .bonsai-fold-all-host");
  const dock = rule(".bonsai-scope .bonsai-decky-tabs-root > .bonsai-fold-dock");
  return {
    marginRight: pxAt(host["margin"], 1),
    marginBottom: pxAt(host["margin"], 2),
    bandOpaque: paints(dock["background"] ?? dock["background-color"]),
    bandPadTop: pxAt(dock["padding-top"], 0),
  };
}

/** The button's box: the pane ends at `paneBottom`, the strip under the button is `strip` px tall, the column ends at `columnRight`. */
export function foldAllButtonBox(paneBottom: number, strip: number, columnRight: number): PageBox {
  const d = foldDockPaint();
  const bottom = paneBottom - strip - d.marginBottom;
  const right = columnRight - d.marginRight;
  return { left: right - FOLD_ALL_WIDTH_PX, top: bottom - FOLD_ALL_HEIGHT_PX, right, bottom };
}

/** The top edge of what is painted over the pane's bottom: the band behind the button when it is opaque, else the strip. */
export function paintedFrom(paneBottom: number, strip: number, columnRight: number): number {
  const d = foldDockPaint();
  if (!d.bandOpaque) return paneBottom - strip;
  return foldAllButtonBox(paneBottom, strip, columnRight).top - d.bandPadTop;
}

/** Width and height of the part of `box` still on view (below `viewTop`, above `viewBottom`) that `button` sits over. */
export function coveredOnView(box: PageBox, button: PageBox, viewTop: number, viewBottom: number): { w: number; h: number } {
  const top = Math.max(box.top, viewTop, button.top);
  const bottom = Math.min(box.bottom, viewBottom, button.bottom);
  const left = Math.max(box.left, button.left);
  const right = Math.min(box.right, button.right);
  return bottom > top && right > left ? { w: right - left, h: bottom - top } : { w: 0, h: 0 };
}

/**
 * A section line's words and arrow, as the Deck drew them at the right end of its box (the Connection tuning line,
 * 48..348: its summary 192..320, its arrow 326..336, both 14 tall, 10 below the line's top).
 */
export function lineWordBoxes(line: PageBox): PageBox[] {
  const top = line.top + 10;
  return [
    { left: line.right - 28 - 128, top, right: line.right - 28, bottom: top + 14 },
    { left: line.right - 22, top, right: line.right - 12, bottom: top + 14 },
  ];
}

/**
 * The worst cover in a walk harness's pane right now: every section line's words and arrow, and every other stop's
 * whole box (a row's words can sit anywhere along it), against the button. Returns the largest, with its row's name.
 */
export function worstFoldAllCover(
  container: HTMLElement,
  pane: { top: number; bottom: number; right: number },
  strip: number,
): { w: number; h: number; what: string } {
  const button = foldAllButtonBox(pane.bottom, strip, pane.right);
  const viewBottom = paintedFrom(pane.bottom, strip, pane.right);
  const paneEl = container.querySelector<HTMLElement>("[data-pane]");
  let worst = { w: 0, h: 0, what: "" };
  const consider = (box: PageBox, what: string) => {
    const c = coveredOnView(box, button, pane.top, viewBottom);
    if (c.w * c.h > worst.w * worst.h) worst = { ...c, what };
  };
  paneEl?.querySelectorAll<HTMLElement>(".Focusable, [tabindex='0']").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!(r.height > 0)) return;
    const name = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40) ?? "";
    if (el.classList.contains("bonsai-fold-line")) lineWordBoxes(r).forEach((b, i) => consider(b, `${name} ${i ? "arrow" : "words"}`));
    else consider(r, name);
  });
  return worst;
}
