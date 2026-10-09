/**
 * Title: Reshaping Decky's bar so bonsAI's tab bar sits in Steam's empty strip
 *
 * Purpose: Plan 84 step 6. While bonsAI is open, this moves Decky's own Quick Access page up into the
 * 14-point strip Steam leaves empty at the top, grows Decky's title padding by the same 14 so the chat's
 * name stays exactly where it was, shrinks Decky's 16-point gap under its bar to bonsAI's 4, and gives the
 * page the 14 points back at its bottom (its height grows by 14), so the panel still reaches the bottom of
 * the screen (plan 84 test C measured it 14 short without this). bonsAI's
 * title view then draws the tab bar in that padding, at the very top (TitleTabStrip.tsx). Off the Main
 * tab, Decky's back arrow is hidden as well, and the title view draws no name, so Decky's bar is the strip
 * alone. The numbers are deckyHeaderLayout.ts's.
 *
 * Used for: ChatTitleView.tsx (applies on mount, follows the tab, undoes on unmount), useTopStripTabBar.ts
 * (bonsAI's box mounting is a second chance to apply), and anything that must know whether the bar is in
 * the strip (`topStripActive`) or hear the header change shape (`subscribeDeckyHeader`): the height lock
 * (useQamPanelHeightGuard.ts, which measures to Decky's page while it is moved), the body offset, the stop
 * above the chat.
 *
 * Solves: Three rules from the Deck tests (plan 84 § 4):
 *   - Steam's shared 14-point padding belongs to every Quick Access page, and bonsAI stays loaded when the
 *     menu switches page: zeroing it moved Steam's own Performance page up 14 (test B, v1). Only Decky's
 *     own page is moved; Steam's container is never written to.
 *   - Every reach outside bonsAI's box checks what it finds first (deckyHeaderParts, and Decky's own two
 *     paddings) and changes nothing when the shape is not the expected one. The fallback is today's
 *     layout, with the bar in bonsAI's box, never a half-moved one.
 *   - Everything is undone exactly: each inline value written is the one saved before, put back when
 *     bonsAI's view goes away (bonsAI closes, or another plugin replaces it).
 *
 * Does not: Draw the bar or the name (the title view does), route the D-pad (the bar and the name do), or
 * size bonsAI's own box (the height lock's job).
 */
import { useSyncExternalStore } from "react";

import { deckyHeaderParts, type DeckyHeaderParts } from "./deckyTitleParts";
import {
  DECKY_GAP_PX,
  DECKY_TITLE_PAD_TOP_PX,
  GAP_WITH_STRIP_PX,
  STEAM_STRIP_PX,
  TITLE_PAD_WITH_STRIP_PX,
} from "./deckyHeaderLayout";

/** Every inline value written, as it was before. */
type Saved = {
  titlePaddingTop: string;
  titlePosition: string;
  gapPaddingTop: string;
  pagePosition: string;
  pageTop: string;
  pageHeight: string;
  pageMinHeight: string;
  pageMaxHeight: string;
  arrowDisplay: string;
  /** The parts that had no inline style at all: they are left with none, not with an empty one. */
  bare: HTMLElement[];
};

type Applied = { parts: DeckyHeaderParts; saved: Saved; arrowHidden: boolean };

let applied: Applied | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Hear every change of the header's shape (applied, undone, a tab's shape); returns the stop. */
export function subscribeDeckyHeader(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The tab bar is in Steam's strip (the reshape is applied). */
export function topStripActive(): boolean {
  return applied !== null;
}

/** For a React reader: redraws when the bar moves into the strip or back. */
export function useTopStripActive(): boolean {
  return useSyncExternalStore(subscribeDeckyHeader, topStripActive, topStripActive);
}

/**
 * Decky's own page while it is moved up and given its 14 back: its bottom is the bottom of the screen, so
 * the height lock measures to it. Null while nothing is reshaped.
 */
export function deckyPageWhileReshaped(): HTMLElement | null {
  return applied?.parts.page ?? null;
}

/** Tell the listeners the header may have changed size (a UI-size Apply rebuilt bonsAI's tabs). */
export function notifyDeckyHeaderChanged(): void {
  if (applied) notify();
}

function px(value: number): string {
  return `${value}px`;
}

/** An element's computed `position`, read as "static" when the engine leaves it unset. */
function positionOf(win: Window, el: HTMLElement): string {
  return win.getComputedStyle(el).position || "static";
}

/**
 * Decky's own two paddings are the ones the arithmetic starts from, and Decky's page is laid out and not
 * placed in a way a `top` would act on differently. Anything else: leave it all alone.
 */
function shapeAsExpected(parts: DeckyHeaderParts): boolean {
  const win = parts.page.ownerDocument.defaultView;
  if (!win || typeof win.getComputedStyle !== "function") return false;
  if (win.getComputedStyle(parts.title).paddingTop !== px(DECKY_TITLE_PAD_TOP_PX)) return false;
  if (win.getComputedStyle(parts.gap).paddingTop !== px(DECKY_GAP_PX)) return false;
  const position = positionOf(win, parts.page);
  if (position !== "static" && position !== "relative") return false;
  if (parts.page.style.top !== "") return false;
  return parts.page.getBoundingClientRect().height > 0;
}

function apply(parts: DeckyHeaderParts): void {
  const { title, gap, page, arrow } = parts;
  const win = page.ownerDocument.defaultView!;
  const saved: Saved = {
    titlePaddingTop: title.style.paddingTop,
    titlePosition: title.style.position,
    gapPaddingTop: gap.style.paddingTop,
    pagePosition: page.style.position,
    pageTop: page.style.top,
    pageHeight: page.style.height,
    pageMinHeight: page.style.minHeight,
    pageMaxHeight: page.style.maxHeight,
    arrowDisplay: arrow?.style.display ?? "",
    bare: [title, gap, page, arrow].filter((el): el is HTMLElement => !!el && !el.hasAttribute("style")),
  };
  /* Read before anything is written. */
  const pageHeight = Math.round(page.getBoundingClientRect().height);
  const titleStatic = positionOf(win, title) === "static";
  const pageStatic = positionOf(win, page) === "static";

  title.style.paddingTop = px(TITLE_PAD_WITH_STRIP_PX);
  /* The bar is placed against Decky's bar, which must be its containing block. */
  if (titleStatic) title.style.position = "relative";
  gap.style.paddingTop = px(GAP_WITH_STRIP_PX);
  if (pageStatic) page.style.position = "relative";
  /* Up by the whole of Steam's strip: Decky's own page only (deckyHeaderLayout.ts). */
  page.style.top = px(-STEAM_STRIP_PX);
  /* The 14 points the move leaves empty at the bottom, given back: pinned, so a flex parent cannot shrink it. */
  const height = px(pageHeight + STEAM_STRIP_PX);
  page.style.height = height;
  page.style.minHeight = height;
  page.style.maxHeight = height;
  applied = { parts, saved, arrowHidden: false };
}

function undo(): void {
  if (!applied) return;
  const { parts, saved } = applied;
  applied = null;
  parts.title.style.paddingTop = saved.titlePaddingTop;
  parts.title.style.position = saved.titlePosition;
  parts.gap.style.paddingTop = saved.gapPaddingTop;
  parts.page.style.position = saved.pagePosition;
  parts.page.style.top = saved.pageTop;
  parts.page.style.height = saved.pageHeight;
  parts.page.style.minHeight = saved.pageMinHeight;
  parts.page.style.maxHeight = saved.pageMaxHeight;
  if (parts.arrow) parts.arrow.style.display = saved.arrowDisplay;
  for (const el of saved.bare) if (el.getAttribute("style") === "") el.removeAttribute("style");
}

/** Off the Main tab, Decky's back arrow is hidden; on it, it is as Decky drew it. True when that changed. */
function shapeForTab(tab: string | null): boolean {
  if (!applied?.parts.arrow) return false;
  const hide = tab !== null && tab !== "main";
  if (hide === applied.arrowHidden) return false;
  applied.arrowHidden = hide;
  applied.parts.arrow.style.display = hide ? "none" : applied.saved.arrowDisplay;
  return true;
}

function sameParts(a: DeckyHeaderParts, b: DeckyHeaderParts): boolean {
  return a.title === b.title && a.arrow === b.arrow && a.box === b.box && a.gap === b.gap && a.page === b.page;
}

/**
 * Bring Decky's bar to the shape it should have now, for the tab showing: apply when bonsAI's view and box
 * are both drawn in the expected shape, follow the tab, and undo when the parts it changed are not the
 * parts it finds any more. Safe to call any number of times; does nothing when nothing needs to change.
 */
export function syncDeckyHeaderShape(tab: string | null): void {
  const parts = deckyHeaderParts();
  let changed = false;
  if (applied && (!parts || !sameParts(applied.parts, parts))) {
    undo();
    changed = true;
  }
  if (applied && parts) {
    applied.parts = parts; /* bonsAI's own box may have been drawn again; Decky's parts are the same */
  } else if (parts && shapeAsExpected(parts)) {
    apply(parts);
    changed = true;
  }
  if (shapeForTab(tab)) changed = true;
  if (changed) notify();
}

/** bonsAI's view is going away (bonsAI closes, or is replaced): put everything back. */
export function releaseDeckyHeaderShape(): void {
  if (!applied) return;
  undo();
  notify();
}

/** Test-only reset: forgets without writing anything. */
export function resetDeckyHeaderShape(): void {
  applied = null;
  listeners.clear();
}
