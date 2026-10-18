/**
 * Title: Tab body focus scroll
 * Purpose: When the ring lands on a control in one of the plain tabs, leave the pane still if the control is
 *          comfortably in view, and otherwise turn the page by one step first, so Steam's own scroll-into-view
 *          finds nothing to do.
 * Used for: TabBodyFocusRoot, around the Ollama, Settings, Permissions, Developer and About tabs.
 * Solves: A D-pad step that scrolled the tab half a screen (plan 87, B10): Steam moves a control that lies
 *         wholly outside its padded band to the middle of the pane. Then the page moving at nearly every press,
 *         Left and Right on one line included, and jumping to its end at the last control (plan 89): the plan
 *         (tabBodyScrollPlan.ts) now moves only when the control is out of the band.
 * Does not: Move the ring, scroll Main (its answer sections and dock have their own placement), or react to a
 *           tap or the mouse (Steam's own scroll handles those). Does not animate. Steam looks at the control
 *           the moment focus lands and scrolls it in itself if it is outside its band; a glide of ours would
 *           still have it outside, and Steam would scroll it too (to the middle, if it were wholly outside). The Deck shows Steam acting on that
 *           moment: where the plan left a row a few px outside Steam's band, Steam glided it in itself
 *           (4 to 8 px over 3 or 4 frames, plan89-M1-TAB-WALK.json). Nothing yet shows Steam leaving a pane we
 *           glide alone, so the step is instant.
 *
 * How it works: two entry points, both ending in the same plan. A `focusin` listener in the capture phase on
 * the tab body, so it runs before Steam's own scroll (which comes after the focus event, and glides); and
 * `focusInTabBody(el)`, which the tabs call instead of `el.focus()` for the controls they focus by hand,
 * because the browser scrolls for those BEFORE the focus event. It reads the boxes of the focused control and of the
 * other controls under the body (the elements Steam navigates: `.Focusable` or `tabindex="0"` with none of
 * the same inside), asks `planTabBodyScroll` for the pane's place, and writes `scrollTop` once. The band the
 * plan keeps the control in is the pane's own `scroll-padding` (Steam's 116 px at the top and 80 at the
 * bottom), read off the pane, so what the plan leaves is what Steam's scroll leaves alone.
 *
 * Landing watchers (plan 92, the folded tabs' help strip): a tab can register one watcher, run first at
 * every landing in its body, on the same event, before the plan. The watcher hands back how much of
 * the pane's bottom it now covers (the strip, sized for the ringed row's text), and the plan's bottom
 * margin grows by that much, so the ringed row is placed clear of it. A ring leaving the body tells the
 * watcher with null.
 */
import { useEffect, type RefObject } from "react";
import { findTabContentsScroll, panelScrollMax } from "../../utils/chatPanelScroll";
import { planTabBodyScroll, type PlanBox } from "./tabBodyScrollPlan";

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
 * 20 px above the switch and up to about 100 below it (measured 2026-10-09: toggles come to rest 65 to
 * 120 px above the band's bottom edge; 2026-10-11, plan89-M1-TAB-WALK.json: where the plan left a switch 12 px
 * below the band's top, Steam glided it another 4 to 8 px, to rest 20 px below). A section that holds one control
 * can reach much further (its heading and description), and keeping all of it in the band would move the
 * pane for text nobody is on. A limit, not a measurement of any one section.
 */
const BOX_ABOVE_MAX_PX = 22;
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
 * range to scroll). `lastTop` is where the ring was before, which says which way it is travelling: down, up, or
 * along one line (Left and Right), which has no next control. Null (the ring has not been in this body yet) is
 * down, the way in from the tab bar.
 */
function scrollPlaceFor(
  root: HTMLElement,
  target: HTMLElement,
  lastTop: number | null,
  coveredBelow: number,
  watch: LandingWatch | undefined,
): { scrollTop: number; top: number } | null {
  const pane = findTabContentsScroll(root);
  if (!pane || pane === target) return null;
  const viewport = pane.clientHeight;
  const maxScroll = panelScrollMax(pane);
  if (viewport <= 0 || maxScroll <= 0) return null;

  const style = getComputedStyle(pane);
  const padTop = px(style.scrollPaddingTop, STEAM_PAD_TOP_PX) + EDGE_SLACK_PX;
  /* Anything drawn over the pane's bottom (a folded tab's help strip) widens the margin by its height. */
  const steamPadBottom = px(style.scrollPaddingBottom, STEAM_PAD_BOTTOM_PX) + EDGE_SLACK_PX;
  const padBottom = steamPadBottom + coveredBelow;

  const stops = stopsUnder(root);
  /*
   * The stop the ring is on: the target itself, the stop around it (a text field inside its wrapper), or the one
   * stop inside it. Steam puts the ring on the Focusable wrapper around a button (the voice model rows, Reinstall
   * voice engine): skipping those left Settings' 326 px Up press untouched by two rounds (plan 87, B10 round
   * three). A target holding several stops is a section or the body, not a control: left alone.
   */
  const inside = holdsStop(target) ? stops.filter((s) => target.contains(s)) : [];
  if (holdsStop(target) && inside.length !== 1) return null;
  const here = inside[0] ?? stops.find((s) => s === target || s.contains(target)) ?? target;
  const current = stopBox(here, root, pane, stops);
  /* A control beside this one on the same line is neither above nor below it. */
  const others = stops.filter((s) => s !== here).map((el) => ({ el, box: stopBox(el, root, pane, stops) }));
  const above = others.filter((o) => o.box.top < current.top - 1).sort((a, b) => b.box.top - a.box.top);
  const below = others.filter((o) => o.box.top > current.top + 1).sort((a, b) => a.box.top - b.box.top);
  const way = lastTop === null || current.top > lastTop + 1 ? below : current.top < lastTop - 1 ? above : [];
  const next = way[0];

  return {
    top: current.top,
    scrollTop: planTabBodyScroll({
      current,
      next: next?.box,
      atStart: above.length === 0,
      scrollTop: pane.scrollTop,
      viewport,
      maxScroll,
      padTop,
      padBottom,
      /* The strip the next control would bring, when the tab draws one (the folded tabs' help strip). */
      nextPadBottom: next && watch?.coverOf ? steamPadBottom + Math.max(0, watch.coverOf(next.el)) : undefined,
      stepFraction: watch?.stepFraction,
    }),
  };
}

/**
 * Told of every landing in one tab's body (null: the ring left it) before the plan runs; returns how many
 * px at the pane's bottom it covers now, which the plan keeps the ringed control clear of.
 */
export type TabBodyLandingWatcher = (target: HTMLElement | null) => number;

interface LandingWatch {
  watcher: TabBodyLandingWatcher;
  /** The page-turn step this tab wants (tabBodyScrollPlan's `stepFraction`), when not the default. */
  stepFraction?: number;
  /** What the watcher would cover if the ring landed on `el` (the look-ahead's margin for the next control). */
  coverOf?: (el: HTMLElement) => number;
}

const landingWatchers = new Map<string, LandingWatch>();

/** Register the one landing watcher for tab `tabId`; returns its removal (which leaves a newer one alone). */
export function watchTabBodyLandings(
  tabId: string,
  watcher: TabBodyLandingWatcher,
  opts?: { stepFraction?: number; coverOf?: (el: HTMLElement) => number },
): () => void {
  const entry: LandingWatch = { watcher, stepFraction: opts?.stepFraction, coverOf: opts?.coverOf };
  landingWatchers.set(tabId, entry);
  return () => {
    if (landingWatchers.get(tabId) === entry) landingWatchers.delete(tabId);
  };
}

/** What one tab body remembers between landings. */
interface BodyState {
  root: HTMLElement;
  /** The tab's id, for its landing watcher; null for a body with none. */
  tabId: string | null;
  /** Where the ring was before, in the pane's coordinates: says which way it is travelling. */
  lastTop: number | null;
  lastPointerAt: number;
  /** The element `focusInTabBody` has just planned for, so its focus event does not plan a second step. */
  planned: HTMLElement | null;
}

const bodies = new Set<BodyState>();

/** Plan and write the pane's place for focus landing on `target`; false when nothing was planned. */
function placeFor(body: BodyState, target: HTMLElement): boolean {
  const watch = body.tabId === null ? undefined : landingWatchers.get(body.tabId);
  const covered = Math.max(0, watch?.watcher(target) ?? 0);
  if (performance.now() - body.lastPointerAt < POINTER_QUIET_MS) return false;
  const place = scrollPlaceFor(body.root, target, body.lastTop, covered, watch);
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

export function useTabBodyFocusScroll(rootRef: RefObject<HTMLElement | null>, tabId?: string): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const body: BodyState = { root, tabId: tabId ?? null, lastTop: null, lastPointerAt: -Infinity, planned: null };
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
    /* The ring left the body (the tab bar, a floating button outside it): the watcher hides what it showed. */
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && root.contains(next)) return;
      if (body.tabId !== null) landingWatchers.get(body.tabId)?.watcher(null);
    };

    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("focusout", onFocusOut, true);
    root.addEventListener("pointerdown", onPointer, true);
    return () => {
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("focusout", onFocusOut, true);
      root.removeEventListener("pointerdown", onPointer, true);
      bodies.delete(body);
    };
  }, [rootRef, tabId]);
}
