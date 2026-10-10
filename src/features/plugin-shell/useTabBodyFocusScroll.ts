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
 * How it works: two entry points, both ending in the same plan. A `focusin` listener in the capture phase on
 * the tab body, so it runs before Steam's own scroll (which comes after the focus event, and glides); and
 * `focusInTabBody(el)`, which the tabs call instead of `el.focus()` for the controls they focus by hand,
 * because the browser scrolls for those BEFORE the focus event. It reads the boxes of the focused control and of the
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
 * How far a stop's box may reach beyond the control itself, above and below. A toggle's row reaches about
 * 10 px above the switch and up to about 100 below it (measured 2026-10-09: toggles come to rest 65 to
 * 120 px above the band's bottom edge, and 10 px below its top edge). A section that holds one control
 * can reach much further (its heading and description), and keeping all of it in the band would move the
 * pane for text nobody is on. A limit, not a measurement of any one section.
 */
const BOX_ABOVE_MAX_PX = 12;
const BOX_BELOW_MAX_PX = 110;

/**
 * The box the plan keeps in the band for a stop: the control, grown to the row Steam scrolls into view when the
 * nearest `.Focusable` ancestor holds this stop and no other, by no more than the limits above. A button, whose
 * nearest `.Focusable` ancestor holds the whole tab, is its own box.
 */
function stopBox(stop: HTMLElement, root: HTMLElement, pane: HTMLElement, stops: HTMLElement[]): PlanBox {
  const own = contentBox(stop, pane);
  let up = stop.parentElement;
  while (up && up !== root && up !== pane && !up.classList.contains("Focusable")) up = up.parentElement;
  if (!up || up === root || up === pane) return own;
  const holder = up;
  if (stops.filter((s) => holder.contains(s)).length !== 1) return own;
  const row = contentBox(holder, pane);
  return {
    top: Math.min(own.top, Math.max(row.top, own.top - BOX_ABOVE_MAX_PX)),
    bottom: Math.max(own.bottom, Math.min(row.bottom, own.bottom + BOX_BELOW_MAX_PX)),
  };
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

/** What one tab body remembers between landings. */
interface BodyState {
  root: HTMLElement;
  /** Where the ring was before, in the pane's coordinates: says which way it is travelling. */
  lastTop: number | null;
  lastPointerAt: number;
  /** The element `focusInTabBody` has just planned for, so its focus event does not plan a second step. */
  planned: HTMLElement | null;
}

const bodies = new Set<BodyState>();

/** Plan and write the pane's place for focus landing on `target`; false when nothing was planned. */
function placeFor(body: BodyState, target: HTMLElement): boolean {
  if (performance.now() - body.lastPointerAt < POINTER_QUIET_MS) return false;
  const place = scrollPlaceFor(body.root, target, body.lastTop);
  if (!place) return false;
  body.lastTop = place.top;
  const pane = findTabContentsScroll(body.root);
  if (pane && Math.abs(place.scrollTop - pane.scrollTop) >= 1) pane.scrollTop = place.scrollTop;
  return true;
}

/**
 * `el.focus()` for a control of a tab body, for the tabs' own hops between controls: plan the pane's place
 * first, then focus without the browser's own scroll. The Ollama and Settings tabs hop with plain `focus()`
 * calls (the Reply style slider's Up and Down, the knowledge base toggle, the first and last controls), and the
 * browser scrolls for such a call BEFORE it fires the focus event: a control wholly outside the band is put in
 * the middle of the pane, and only then does the focus listener run. That was the 310 to 372 px Up jump left
 * on Ollama, Settings and Developer after the first version (plan 87, second Deck walk), which a focus
 * listener alone cannot stop. An element outside any tab body, or one the plan leaves alone (no range to
 * scroll, a tap just before), is focused with a plain `focus()`. It is a call the tabs make, not a change to
 * `HTMLElement.prototype.focus`: that belongs to Steam's whole page.
 */
export function focusInTabBody(el: HTMLElement): void {
  for (const body of bodies) {
    if (body.root === el || !body.root.contains(el) || !placeFor(body, el)) continue;
    /* Its focus event fires inside this call and finds the flag; one that does not fire (already focused) must not leave it set. */
    body.planned = el;
    try {
      el.focus({ preventScroll: true });
    } finally {
      body.planned = null;
    }
    return;
  }
  el.focus();
}

export function useTabBodyFocusScroll(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const body: BodyState = { root, lastTop: null, lastPointerAt: -Infinity, planned: null };
    bodies.add(body);

    const onPointer = () => {
      body.lastPointerAt = performance.now();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target === root || !root.contains(target)) return;
      if (body.planned === target) {
        body.planned = null;
        return;
      }
      placeFor(body, target);
    };

    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("pointerdown", onPointer, true);
    return () => {
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("pointerdown", onPointer, true);
      bodies.delete(body);
    };
  }, [rootRef]);
}
