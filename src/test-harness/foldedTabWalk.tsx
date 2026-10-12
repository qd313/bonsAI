/**
 * Title: A folded tab walked by the D-pad inside Steam's scroll pane, with a modelled layout
 * Purpose: Test helper for plan 91 § 2b (the folded Ollama tab, then Settings and Developer). Mounts the real
 *          tab inside TabBodyFocusRoot, inside a pane that scrolls (`_TabContentsScroll`), inside bonsAI's tabs
 *          box (so the help strip and the Open all button are drawn beside the pane, as on the Deck), lays the
 *          stops out from top to bottom, and presses the D-pad the way Steam does: the move handlers on the
 *          ringed control and its containers first, then, when none claims the press, Steam's own step to the
 *          nearest stop that way; then Steam's own scroll-into-view (`steam`, the three rules tabBodyWalk.tsx
 *          models). It records every landing: the stop, how far the pane moved, where the stop ended, and
 *          whether the help strip showed and where its top was.
 * Used for: OllamaTab.foldedWalk.test.tsx; the Settings and Developer lanes reuse it for their tabs.
 * Does not: Know the Deck's real heights. jsdom has no layout, so every stop is placed by a simple flow model
 *           (a line 34 px, a switch row 44, a button or a row of buttons side by side 38, a slider's knob 40,
 *           words 16 a line, 6 px between blocks), and the strip's height comes from the stylesheet's own
 *           arithmetic for the text it shows.
 *           The Deck walk measures the truth (plan 91 § 5, P91-FOLD-OLLAMA and P91-STRIP); this pins the logic:
 *           the order, no stop twice, the size of each move, and the ringed row clear of the strip.
 */
import React from "react";
import { act, render } from "@testing-library/react";

import { TabBodyFocusRoot, tabBodyNavFocusId } from "../features/plugin-shell/TabBodyFocusRoot";
import type { BonsaiTabId } from "../features/plugin-shell/tabTitles";
import { takeNavFocus } from "../utils/navFocusRegistry";
import { steamRingHolder, type SteamEl } from "./steamRing";
import type { SteamFocusScroll } from "./tabBodyWalk";

/** The pane's top on the screen (the tab bar ends at 20, the pane starts at 24: plan92-P92-M-OTHER-TABS.json). */
const PANE_TOP = 24;
/** Steam's own padding on the pane (docs/lessons-learned.md § 3). */
const STEAM_PAD_TOP = 116;
const STEAM_PAD_BOTTOM = 80;
/** The tab body's clear space above its first line (TabBodyFocusRoot). */
const INSET = 24;
/** The gap the flow model leaves between two blocks. */
const GAP = 6;
/** Words in the flow model: 16 px a line, about 48 characters a line in the 300-point column. */
const TEXT_LINE = 16;
const CHARS_PER_LINE = 48;
/** The strip's text: about 46 characters a line at its size, across the column less its padding. */
const STRIP_CHARS_PER_LINE = 46;

export interface FoldedLanding {
  press: number;
  /** The element the ring landed on. */
  stop: HTMLElement;
  /** The stop's name: its aria-label, its label, its row's name, or its words. */
  name: string;
  moved: number;
  /** The landed stop's top and bottom on the screen, once Steam's scroll is done. */
  top: number;
  bottom: number;
  /** The strip's top on the screen while it shows, else null. */
  stripTop: number | null;
  /** The strip's words as the landing left them ("" while it is hidden). */
  stripText: string;
}

export interface FoldedTabWalk {
  /** One press from wherever the ring is; returns the landing, or null when the ring did not move. */
  press: (direction: "down" | "up") => FoldedLanding | null;
  /** Down from the tab bar: Steam's transfer onto the tab body, which lands on its first stop. */
  enter: () => FoldedLanding;
  /** Every press in one direction until the ring stops moving, at most `bound` presses. */
  walk: (direction: "down" | "up", bound?: number) => FoldedLanding[];
  ring: () => HTMLElement | null;
  scrollTop: () => number;
  /** The pane's whole height, top to bottom (the content, the tab body's inset and its room at the end). */
  contentHeight: () => number;
  container: HTMLElement;
  unmount: () => void;
}

export interface FoldedTabWalkOptions {
  tabId: BonsaiTabId;
  tab: React.ReactElement;
  viewport: number;
  steam: SteamFocusScroll;
  /** The strip's height for `lines` lines of text (foldedTabs.ts's own arithmetic). */
  stripHeight: (lines: number) => number;
  /** Room the tab leaves under its last line (foldedTabs.ts). */
  tail: number;
}

const box = (top: number, height: number) =>
  ({ top, bottom: top + height, left: 0, right: 300, width: 300, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/** What the scroll plan and Steam navigate: a `.Focusable` or `tabindex="0"` with none of the same inside. */
function isStop(el: Element): boolean {
  return el.classList.contains("Focusable") || el.getAttribute("tabindex") === "0";
}
function holdsStop(el: Element): boolean {
  return Array.from(el.children).some((c) => isStop(c) || holdsStop(c));
}

function nameOf(el: HTMLElement): string {
  const named =
    el.getAttribute("aria-label") ??
    el.getAttribute("label") ??
    el.closest("[data-bonsai-help-label]")?.getAttribute("data-bonsai-help-label") ??
    el.textContent ??
    "";
  return named.trim().slice(0, 48);
}

export function walkFoldedTab(opts: FoldedTabWalkOptions): FoldedTabWalk {
  const view = render(
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={opts.tabId}>
      <div className="Tabs_TabContentsScroll" data-pane="">
        <TabBodyFocusRoot id={opts.tabId}>{opts.tab}</TabBodyFocusRoot>
      </div>
    </div>,
  );
  const pane = view.container.querySelector<HTMLElement>("[data-pane]")!;
  const root = pane.querySelector<HTMLElement>("[data-bonsai-tab-body]")!;
  let scrollTop = 0;
  let height = 0;
  const maxScroll = () => Math.max(0, INSET + height - opts.viewport);
  Object.defineProperty(pane, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = Math.max(0, Math.min(maxScroll(), v));
    },
  });
  Object.defineProperty(pane, "scrollHeight", { configurable: true, get: () => INSET + height });
  Object.defineProperty(pane, "clientHeight", { configurable: true, value: opts.viewport });
  pane.getBoundingClientRect = () => box(PANE_TOP, opts.viewport);

  const strip = () => view.container.querySelector<HTMLElement>("[data-bonsai-help-strip]");
  /** A strip's height for the words in it now, by the stylesheet's arithmetic (0 while hidden). */
  const heightOf = (s: HTMLElement | null): number => {
    if (!s || s.hidden) return 0;
    const chars = (s.textContent ?? "").length;
    return opts.stripHeight(Math.max(1, Math.ceil(chars / STRIP_CHARS_PER_LINE)));
  };
  const stripHeightNow = (): number => heightOf(strip());

  /** Decky stamps tabindex="0" on the controls it navigates; the stubs do not. */
  const stamp = () => {
    root.querySelectorAll<HTMLElement>("button:not([disabled]), [data-decky-ui='ToggleField']").forEach((b) => {
      if (!b.hasAttribute("tabindex")) b.setAttribute("tabindex", "0");
    });
  };

  /** The flow model: every stop and every run of words under the tab body, top to bottom. */
  const layout = () => {
    stamp();
    /* The strip's own measured height, as the landing watcher reads it: the stylesheet's arithmetic for its words. */
    const s = strip();
    if (s) s.getBoundingClientRect = () => box(PANE_TOP + opts.viewport - stripHeightNow(), stripHeightNow());
    /* And the unseen copy the plan's look-ahead measures the next row's words in. */
    const m = view.container.querySelector<HTMLElement>(".bonsai-fold-strip--measure");
    if (m) m.getBoundingClientRect = () => box(PANE_TOP + opts.viewport - heightOf(m), heightOf(m));
    let y = 0;
    const visit = (el: HTMLElement) => {
      if (el.classList.contains("bonsai-fold-tail")) {
        y += opts.tail;
        return;
      }
      if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden")) return;
      /* A row of controls side by side (a Focusable laid out across): one line, every stop on it at the same top. */
      if (el.getAttribute("flow-children") === "horizontal" && holdsStop(el)) {
        const top = y;
        const across: HTMLElement[] = [];
        const collect = (e: Element) => {
          for (const c of Array.from(e.children) as HTMLElement[]) {
            if (isStop(c) && !holdsStop(c)) across.push(c);
            else collect(c);
          }
        };
        collect(el);
        for (const c of across) c.getBoundingClientRect = () => box(PANE_TOP + INSET + top - scrollTop, 38);
        y += 38 + GAP;
        return;
      }
      if (isStop(el) && !holdsStop(el)) {
        const h = el.classList.contains("bonsai-fold-line")
          ? 34
          : el.dataset.deckyUi === "ToggleField"
            ? 44
            : el.closest("[data-bonsai-reply-verbosity-thumb], [data-bonsai-ollama-keepalive-thumb]") || el.closest(".bonsai-dual-slider")
              ? 40
              : 38;
        const top = y;
        el.getBoundingClientRect = () => box(PANE_TOP + INSET + top - scrollTop, h);
        y += h + GAP;
        return;
      }
      const words = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (words) y += Math.ceil(words.length / CHARS_PER_LINE) * TEXT_LINE;
      Array.from(el.children).forEach((c) => visit(c as HTMLElement));
    };
    Array.from(root.children).forEach((c) => visit(c as HTMLElement));
    height = y;
    scrollTop = Math.min(scrollTop, maxScroll());
  };
  layout();

  let ringEl: HTMLElement | null = null;
  /** Where the ring is after a move: Steam's marker when a transfer put it there, else the page's focus. */
  const readRing = (beforeMarker: HTMLElement | null, beforeActive: Element | null): HTMLElement | null => {
    const marker = steamRingHolder(view.container.ownerDocument);
    if (marker && marker !== beforeMarker) return marker;
    const active = view.container.ownerDocument.activeElement as HTMLElement | null;
    if (active && active !== beforeActive && active !== view.container.ownerDocument.body) return active;
    return ringEl;
  };

  /** Steam's own scroll-into-view for the control the ring just landed on (tabBodyWalk.tsx's three rules). */
  const steamScrolls = (el: HTMLElement) => {
    if (!pane.contains(el)) return;
    const bandTop = PANE_TOP + STEAM_PAD_TOP;
    const bandBottom = PANE_TOP + opts.viewport - STEAM_PAD_BOTTOM;
    const r = el.getBoundingClientRect();
    if (r.top >= bandTop - 0.5 && r.bottom <= bandBottom + 0.5) return;
    const overlaps = r.bottom > bandTop && r.top < bandBottom;
    if (opts.steam === "nearest" || (opts.steam === "centerIfHidden" && overlaps)) {
      pane.scrollTop += r.top < bandTop ? r.top - bandTop : r.bottom - bandBottom;
    } else {
      pane.scrollTop += r.top + r.height / 2 - (PANE_TOP + opts.viewport / 2);
    }
  };

  let presses = 0;
  const landing = (el: HTMLElement, before: number): FoldedLanding => {
    layout();
    steamScrolls(el);
    const r = el.getBoundingClientRect();
    const sh = stripHeightNow();
    const s = strip();
    return {
      press: presses++,
      stop: el,
      stripText: s && !s.hidden ? s.textContent ?? "" : "",
      name: nameOf(el),
      moved: Math.abs(scrollTop - before),
      top: r.top,
      bottom: r.bottom,
      stripTop: sh > 0 ? PANE_TOP + opts.viewport - sh : null,
    };
  };

  /*
   * Steam's own move, as the Deck showed it (plan 92, the About tab, 2026-10-12): a press goes first to the
   * ringed control's own move handler; unclaimed, its container moves the ring to its next child only along the
   * container's flow (flow-children "vertical" for Up and Down), landing on that child's first control (its
   * last, going Up a column); a container with no such flow does not hand the press on, it calls its own
   * handler and passes the press up to the container around it. Decky's Button keeps no move handler.
   */
  const isNavNode = (el: Element): boolean => {
    const kind = (el as HTMLElement).dataset?.deckyUi;
    return kind === "Focusable" || kind === "ToggleField" || kind === "Button" || kind === "ButtonItem" || el.tagName === "INPUT";
  };
  const shown = (el: Element) => el.getAttribute("aria-hidden") !== "true" && !el.hasAttribute("hidden");
  const navParent = (el: HTMLElement): HTMLElement | null => {
    for (let up = el.parentElement; up; up = up.parentElement) {
      if (isNavNode(up)) return up;
      if (up === root) return null;
    }
    return null;
  };
  const navChildren = (container: HTMLElement): HTMLElement[] => {
    const out: HTMLElement[] = [];
    const visit = (e: Element) => {
      for (const c of Array.from(e.children) as HTMLElement[]) {
        if (!shown(c)) continue;
        if (isNavNode(c)) out.push(c);
        else visit(c);
      }
    };
    visit(container);
    return out;
  };
  /** Where Steam's landing on nav node `node` ends: itself when it holds no other, else its first (or last) one. */
  const landOn = (node: HTMLElement, last: boolean): HTMLElement | null => {
    const kids = navChildren(node);
    if (kids.length === 0) return node.hasAttribute("disabled") ? null : node;
    const flowAcross = node.getAttribute("flow-children") === "horizontal";
    const order = last && !flowAcross ? [...kids].reverse() : kids;
    for (const k of order) {
      const hit = landOn(k, last);
      if (hit) return hit;
    }
    return null;
  };
  const handlerOf = (el: HTMLElement, dir: "onMoveDown" | "onMoveUp") =>
    (el as SteamEl).__nav?.[dir] as (() => unknown) | undefined;

  const press = (direction: "down" | "up"): FoldedLanding | null => {
    const from = ringEl;
    if (!from) return null;
    const before = scrollTop;
    const marker = steamRingHolder(view.container.ownerDocument);
    const active = view.container.ownerDocument.activeElement;
    const dir = direction === "down" ? "onMoveDown" : "onMoveUp";
    let to: HTMLElement | null = from;
    act(() => {
      if (handlerOf(from, dir)?.() === true) return;
      for (let node: HTMLElement = from; ; ) {
        const container = navParent(node);
        if (!container) return;
        if (container.getAttribute("flow-children") === "vertical") {
          const kids = navChildren(container);
          const step = direction === "down" ? 1 : -1;
          for (let i = kids.indexOf(node) + step; i >= 0 && i < kids.length; i += step) {
            const hit = landOn(kids[i]!, direction === "up");
            if (hit) {
              hit.focus();
              to = hit;
              return;
            }
          }
        }
        if (handlerOf(container, dir)?.() === true) return;
        node = container;
      }
    });
    if (to === from) to = readRing(marker, active);
    if (!to || to === from) return null;
    ringEl = to;
    if (!root.contains(to)) {
      /* Off the tab body (the tab bar, the floating button): no landing in the pane to measure. */
      return { press: presses++, stop: to, name: nameOf(to), moved: Math.abs(scrollTop - before), top: NaN, bottom: NaN, stripTop: null, stripText: "" };
    }
    return landing(to, before);
  };

  const enter = (): FoldedLanding => {
    const before = scrollTop;
    act(() => {
      takeNavFocus(tabBodyNavFocusId(opts.tabId));
    });
    ringEl = steamRingHolder(view.container.ownerDocument);
    if (!ringEl) throw new Error("the tab body took no ring");
    return landing(ringEl, before);
  };

  return {
    press,
    enter,
    walk: (direction, bound = 60) => {
      const out: FoldedLanding[] = [];
      for (let i = 0; i < bound; i++) {
        const l = press(direction);
        if (!l) break;
        out.push(l);
      }
      return out;
    },
    ring: () => ringEl,
    scrollTop: () => scrollTop,
    contentHeight: () => {
      layout();
      return INSET + height;
    },
    container: view.container,
    unmount: () => view.unmount(),
  };
}
