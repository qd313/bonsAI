/**
 * Title: Tab body focus scroll
 * Purpose: When the ring lands on a control in one of the plain tabs, move the pane a little first, to where
 *          the control is comfortably in view, so Steam's own scroll-into-view finds nothing to do.
 * Used for: TabBodyFocusRoot, around the Ollama, Settings, Permissions, Developer and About tabs.
 * Solves: A D-pad step that scrolled the tab half a screen (plan 87, B10). Steam moves a control that lies
 *         wholly outside its padded band to the middle of the pane; planning the move ourselves, a few
 *         controls ahead (tabBodyScrollPlan.ts), keeps every press to a couple of lines.
 * Does not: Move the ring, scroll Main (its answer sections and dock have their own placement), or react to a
 *           tap or the mouse (Steam's own scroll handles those). Does not animate: Steam looks at the control
 *           the moment focus lands, and a glide would show it still outside the band and make it scroll too.
 *
 * How it works: one `focusin` listener in the capture phase on the tab body, so it runs before Steam's own
 * scroll (which comes after the focus event, and glides). It reads the boxes of the focused control and of the
 * other controls under the body (the elements Steam navigates: `.Focusable` or `tabindex="0"` with none of
 * the same inside), asks `planTabBodyScroll` for the pane's place, and writes `scrollTop` once. The band the
 * plan keeps the control in is the pane's own `scroll-padding` (Steam's 116 px at the top and 80 at the
 * bottom), read off the pane, so what the plan leaves is what Steam's scroll leaves alone.
 */
import { useEffect, type RefObject } from "react";
import { findTabContentsScroll, panelScrollMax } from "../../utils/chatPanelScroll";
import { planTabBodyScroll, type PlanBox } from "../../utils/tabBodyScrollPlan";

/**
 * Steam's own margins on the pane (docs/lessons-learned.md § 3), used when the pane's style cannot be read.
 * They are kept, not shrunk: a band of our own that lay inside Steam's would put controls where Steam still
 * moves them, and nothing here can see which of the two the Deck's Steam really goes by.
 */
const STEAM_PAD_TOP_PX = 116;
const STEAM_PAD_BOTTOM_PX = 80;

/** Slack inside the band, so a control placed on its edge is not measured as just outside it. */
const EDGE_SLACK_PX = 2;

/** A tap or click this recent means focus came from a pointer: Steam's own scroll looks after it. */
const POINTER_QUIET_MS = 600;

function px(value: string | null | undefined, fallback: number): number {
  const n = parseFloat(value ?? "");
  return Number.isFinite(n) ? n : fallback;
}

/** An element's box in the pane's own coordinates. */
function contentBox(el: HTMLElement, pane: HTMLElement): PlanBox {
  const r = el.getBoundingClientRect();
  const top = r.top - pane.getBoundingClientRect().top + pane.scrollTop;
  return { top, bottom: top + r.height };
}

/** What Steam navigates: a `.Focusable`, or an element Decky stamped `tabindex="0"`. */
function isStop(el: Element): boolean {
  return el.classList.contains("Focusable") || el.getAttribute("tabindex") === "0";
}

/** True when a stop sits somewhere inside `el`. */
function holdsStop(el: Element): boolean {
  for (const child of Array.from(el.children)) if (isStop(child) || holdsStop(child)) return true;
  return false;
}

/**
 * The elements Steam can put the ring on under `el`: the innermost stops that are shown. A walk down the
 * tree, not a page search: nothing here finds an element to move focus to, it only reads where they are.
 */
function stopsUnder(el: Element, out: HTMLElement[] = []): HTMLElement[] {
  for (const child of Array.from(el.children) as HTMLElement[]) {
    if (child.getAttribute("aria-hidden") === "true" || child.hasAttribute("hidden")) continue;
    if (isStop(child) && !holdsStop(child)) {
      if (!child.hasAttribute("disabled") && child.getBoundingClientRect().height > 0) out.push(child);
    } else {
      stopsUnder(child, out);
    }
  }
  return out;
}

/**
 * The box Steam scrolls into view for a stop. For a toggle that is not the switch itself but its whole row
 * (label, switch and the description under them): measured 2026-10-09, toggles come to rest with the
 * switch 65 to 120 px above the band's bottom edge and about 10 px below its top edge, which is where a
 * row, not a 22 px switch, would stop. So the box is that of the nearest `.Focusable` ancestor when it holds
 * this stop and no other; a button, whose nearest `.Focusable` ancestor holds the whole tab, is its own box.
 */
function stopBox(stop: HTMLElement, root: HTMLElement, pane: HTMLElement, stops: HTMLElement[]): PlanBox {
  let up = stop.parentElement;
  while (up && up !== root && up !== pane && !up.classList.contains("Focusable")) up = up.parentElement;
  if (!up || up === root || up === pane) return contentBox(stop, pane);
  const holder = up;
  return stops.filter((s) => holder.contains(s)).length === 1 ? contentBox(holder, pane) : contentBox(stop, pane);
}

/**
 * The pane's place for focus having landed on `target`, or null to leave it (not a plain stop, no pane, no
 * range to scroll). `lastTop` is where the ring was before, which says which way it is travelling.
 */
function scrollPlaceFor(
  root: HTMLElement,
  target: HTMLElement,
  lastTop: number | null,
): { scrollTop: number; top: number } | null {
  const pane = findTabContentsScroll(root);
  if (!pane || pane === target || holdsStop(target)) return null;
  const viewport = pane.clientHeight;
  const maxScroll = panelScrollMax(pane);
  if (viewport <= 0 || maxScroll <= 0) return null;

  const style = getComputedStyle(pane);
  const padTop = px(style.scrollPaddingTop, STEAM_PAD_TOP_PX) + EDGE_SLACK_PX;
  const padBottom = px(style.scrollPaddingBottom, STEAM_PAD_BOTTOM_PX) + EDGE_SLACK_PX;

  const stops = stopsUnder(root);
  /* The stop the ring is on: the target itself, or the stop around it (a text field inside its wrapper). */
  const here = stops.find((s) => s === target || s.contains(target)) ?? target;
  const current = stopBox(here, root, pane, stops);
  const others = stops.filter((s) => s !== here).map((s) => stopBox(s, root, pane, stops));
  const above = others.filter((b) => b.top < current.top - 1).sort((a, b) => b.top - a.top);
  const below = others.filter((b) => b.top > current.top + 1).sort((a, b) => a.top - b.top);
  const goingUp = lastTop !== null && current.top < lastTop - 1;

  return {
    top: current.top,
    scrollTop: planTabBodyScroll({
      current,
      ahead: goingUp ? above : below,
      atStart: above.length === 0,
      atEnd: below.length === 0,
      scrollTop: pane.scrollTop,
      viewport,
      maxScroll,
      padTop,
      padBottom,
    }),
  };
}

export function useTabBodyFocusScroll(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let lastTop: number | null = null;
    let lastPointerAt = -Infinity;
    const onPointer = () => {
      lastPointerAt = performance.now();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target === root || !root.contains(target)) return;
      if (performance.now() - lastPointerAt < POINTER_QUIET_MS) return;
      const place = scrollPlaceFor(root, target, lastTop);
      if (!place) return;
      lastTop = place.top;
      const scroller = findTabContentsScroll(root);
      if (scroller && Math.abs(place.scrollTop - scroller.scrollTop) >= 1) scroller.scrollTop = place.scrollTop;
    };

    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("pointerdown", onPointer, true);
    return () => {
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("pointerdown", onPointer, true);
    };
  }, [rootRef]);
}
