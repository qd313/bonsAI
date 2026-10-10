/**
 * Title: A plain tab walked by the D-pad inside Steam's scroll pane, in the Deck's numbers
 * Purpose: Test helper for plan 87 (B9, B10). Mounts the real TabBodyFocusRoot around the controls of one of
 *          the five plain tabs, laid out where the controller rig measured them on 2026-10-09
 *          (tabBodyDeckGeometry.ts), inside a pane that scrolls (`_TabContentsScroll`), and walks it Down to the
 *          last control and back Up the way the rig does: one landing per press, then Steam's own
 *          scroll-into-view runs, as it does on the Deck a moment after the ring lands.
 * Used for: TabBodyFocusRoot.walk.test.tsx.
 * Does not: Know Steam's one real rule. The Deck's moves (a control wholly outside Steam's padded band put in
 *           the middle of the pane, one partly outside moved to the nearest edge) are modelled three ways
 *           (`steam`), so a plan that only works under one is caught: "nearest" always moves the nearest edge
 *           to the band's, "centerIfHidden" centres a control wholly outside the band, "center" centres any
 *           control that is not wholly inside. It does not animate: the pane is where Steam leaves it once
 *           its glide is over. The pane's top fade is a number (`TOP_FADE_PX`), read off the maintainer's
 *           screenshot, because jsdom paints nothing.
 */
import React from "react";
import { act, render } from "@testing-library/react";

import { TabBodyFocusRoot } from "../features/plugin-shell/TabBodyFocusRoot";
import { TAB_GEOMETRY } from "./tabBodyDeckGeometry";

export type TabName = keyof typeof TAB_GEOMETRY;
export type SteamFocusScroll = "nearest" | "centerIfHidden" | "center";

/** The pane's top on the screen (the tab bar ends at 20, the pane starts at 24: plan87-M4-OTHER-TABS.json). */
const PANE_TOP = 24;
/** The monitor's pane height, and an estimate of the Deck's own screen (300 by 454 points less the title and bar). */
export const MONITOR_PANE_PX = 741;
export const OWN_SCREEN_PANE_PX = 400;
/** How far down from the pane's top Steam fades what it shows (about 20 px; DeckCapture_20261009_194005_game.png). */
export const TOP_FADE_PX = 20;
/** Steam's own padding on the pane (docs/lessons-learned.md § 3). */
const STEAM_PAD_TOP = 116;
const STEAM_PAD_BOTTOM = 80;
/** The heading's place at the top of every tab (plan87-M4-OTHER-TABS.json: top 24.8 with the pane at 24). */
const HEADING: [top: number, height: number] = [0.8, 19.5];

interface TabWalkOptions {
  tab: TabName;
  viewport: number;
  steam: SteamFocusScroll;
  /** Mount the plugin's root (default), or a bare wrapper: the tab as it is without the fix. */
  withRoot?: boolean;
}

interface Landing {
  press: number;
  stop: number;
  direction: "down" | "up";
  /** How far the pane moved at this press, plugin and Steam together. */
  moved: number;
  /** The control's top and bottom on the screen once the pane has settled. */
  top: number;
  bottom: number;
}

interface TabWalk {
  landings: Landing[];
  largestDown: number;
  largestUp: number;
  /** The heading's top, relative to the pane's top, the first time the first control had the ring, going down and coming back up. */
  headingTopAtFirstDown: number;
  headingTopAtFirstUp: number;
  /** Controls that were not wholly on screen when the ring was on them. */
  notVisible: number[];
  /** Landings that visited a stop already visited in the same leg. */
  repeated: number;
  scrollTop: () => number;
  /** Put the ring on stop `i` right after a tap, which Steam's own scroll looks after; returns how far the pane moved. */
  tap: (i: number) => number;
  unmount: () => void;
}

function bareRect(top: number, height: number): DOMRect {
  return { top, bottom: top + height, left: 0, right: 300, width: 300, height, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}

export function walkTab(opts: TabWalkOptions): TabWalk {
  const geometry = TAB_GEOMETRY[opts.tab];
  const body = (
    <>
      <div data-heading="" />
      {geometry.stops.map(([, , name], i) => (
        <button key={i} className="Focusable" data-stop={i} aria-label={name} />
      ))}
    </>
  );
  const Root = ({ children }: { children: React.ReactNode }) =>
    opts.withRoot === false ? <div>{children}</div> : <TabBodyFocusRoot id={opts.tab}>{children}</TabBodyFocusRoot>;
  const view = render(
    <div className="Tabs_TabContentsScroll" data-pane="">
      <Root>{body}</Root>
    </div>,
  );
  const pane = view.container.querySelector<HTMLElement>("[data-pane]")!;
  const heading = pane.querySelector<HTMLElement>("[data-heading]")!;
  const stops = Array.from(pane.querySelectorAll<HTMLElement>("[data-stop]"));
  /* Whatever clear space the root puts above the first thing is read off its own element, not assumed. */
  const spacer = pane.querySelector<HTMLElement>("[data-bonsai-tab-body-inset]");
  const inset = spacer ? parseFloat(spacer.style.height) || 0 : 0;

  let scrollTop = 0;
  const maxScroll = () => Math.max(0, inset + geometry.contentHeight - opts.viewport);
  Object.defineProperty(pane, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = Math.max(0, Math.min(maxScroll(), v));
    },
  });
  Object.defineProperty(pane, "scrollHeight", { configurable: true, get: () => inset + geometry.contentHeight });
  Object.defineProperty(pane, "clientHeight", { configurable: true, value: opts.viewport });
  pane.getBoundingClientRect = () => bareRect(PANE_TOP, opts.viewport);
  const place = (el: HTMLElement, top: number, height: number) => {
    el.getBoundingClientRect = () => bareRect(PANE_TOP + inset + top - scrollTop, height);
  };
  place(heading, HEADING[0], HEADING[1]);
  stops.forEach((el, i) => place(el, geometry.stops[i]![0], geometry.stops[i]![1]));

  /** Steam's own scroll-into-view for the control the ring just landed on. */
  const steamScrolls = (el: HTMLElement) => {
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

  const landings: Landing[] = [];
  const headingTop = () => heading.getBoundingClientRect().top - PANE_TOP;
  const headingAtFirst: number[] = [];
  const land = (i: number, direction: "down" | "up"): number => {
    const el = stops[i]!;
    const before = scrollTop;
    act(() => {
      el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    steamScrolls(el);
    const r = el.getBoundingClientRect();
    landings.push({ press: landings.length, stop: i, direction, moved: Math.abs(scrollTop - before), top: r.top, bottom: r.bottom });
    if (i === 0) headingAtFirst.push(headingTop());
    return scrollTop;
  };

  for (let i = 0; i < stops.length; i++) land(i, "down");
  for (let i = stops.length - 1; i >= 0; i--) land(i, "up");

  const down = landings.filter((l) => l.direction === "down");
  const up = landings.filter((l) => l.direction === "up");
  return {
    landings,
    largestDown: Math.max(...down.map((l) => l.moved)),
    largestUp: Math.max(...up.map((l) => l.moved)),
    headingTopAtFirstDown: headingAtFirst[0]!,
    headingTopAtFirstUp: headingAtFirst[1]!,
    notVisible: landings.filter((l) => l.top < PANE_TOP - 0.5 || l.bottom > PANE_TOP + opts.viewport + 0.5).map((l) => l.press),
    repeated: [down, up].reduce((n, leg) => n + leg.length - new Set(leg.map((l) => l.stop)).size, 0),
    scrollTop: () => scrollTop,
    tap: (i) => {
      const el = stops[i]!;
      const before = scrollTop;
      act(() => {
        el.dispatchEvent(new Event("pointerdown", { bubbles: true }));
        el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      });
      return scrollTop - before;
    },
    unmount: () => view.unmount(),
  };
}
