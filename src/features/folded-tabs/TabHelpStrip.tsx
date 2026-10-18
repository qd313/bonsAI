/**
 * Title: The help strip and the floating button's corner, pinned over the bottom of a tab's pane
 *
 * Purpose: The bottom of a folded tab (plan 91 § 2b): a strip showing the ringed row's longer text
 * (its name in bold, then the text), and, above it, the corner where the floating Open all button
 * sits. Both stay put over the bottom of the panel while the list scrolls under them.
 *
 * Used for: the Ollama tab now, the Settings and Developer tabs next. The tab draws
 * `<TabHelpStrip tab="..."><FoldAllButton .../></TabHelpStrip>` once, at the end of its column.
 *
 * Solves: Where the two live. They are drawn beside Steam's scroll pane, inside bonsAI's own tabs
 * box, not inside the pane: a focusable button inside the pane at its very bottom sits outside the
 * band Steam keeps controls in (116 px clear at the top, 80 at the bottom), and Steam would scroll the
 * whole pane to bring it in, by up to half a screen (plan 87, B10). Outside the pane it is never
 * scrolled for. Their place is measured, as the Main tab measures where its question box pins
 * (useMainTabColumnFill.ts): the gap between the bottom of bonsAI's tabs box and the bottom of the
 * pane is read off the screen and written as the dock's bottom, not guessed in the stylesheet.
 *
 * Does not: Decide what text a row has (rows carry it; useHelpStrip reads it), or scroll anything.
 * Shows only while its own tab is the one on screen (a stylesheet rule on the tabs box's
 * data-bonsai-active-tab, so an outgoing tab still sliding away does not leave its strip behind).
 * When the tabs box cannot be found (a test drawing the tab alone) it draws in place, at the end of
 * the tab.
 */
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { findTabContentsScroll } from "../../shared/dpad/chatPanelScroll";
import { useHelpStrip, type HelpStripElements } from "./useHelpStrip";

/** bonsAI's own box around Steam's tabs (index.tsx); the dock is drawn inside it, beside the pane. */
const TABS_BOX_CLASS = "bonsai-decky-tabs-root";
/** The CSS variable holding the measured gap under the pane, on the dock. */
const DOCK_BOTTOM_VAR = "--bonsai-fold-dock-bottom";

export type TabHelpStripProps = {
  /** The tab's id, as its TabBodyFocusRoot has it (e.g. "ollama"). */
  tab: string;
  /** The floating button (FoldAllButton), drawn above the strip. */
  children?: React.ReactNode;
};

/**
 * The dock: a marker left in the tab's column, and the strip with the button above it, drawn in the tabs
 * box beside the pane (in place when there is no tabs box). The strip's words are never React's: the
 * landing listener writes them (useHelpStrip).
 */
export function TabHelpStrip({ tab, children }: TabHelpStripProps): React.ReactElement {
  /* An empty marker left in the tab's own column: where the tabs box and the pane are looked for from. */
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const partsRef = useRef<HelpStripElements | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const syncParts = useCallback(() => {
    const m = measureRef.current;
    const mLabel = m?.querySelector<HTMLElement>(".bonsai-fold-strip__label");
    const mText = m?.querySelector<HTMLElement>(".bonsai-fold-strip__text");
    partsRef.current =
      stripRef.current && labelRef.current && textRef.current && m && mLabel && mText
        ? {
            strip: stripRef.current,
            label: labelRef.current,
            text: textRef.current,
            measure: { strip: m, label: mLabel, text: mText },
          }
        : null;
  }, []);
  useHelpStrip(tab, partsRef);

  /* The tabs box around the pane: the nearest one above the tab's own column. */
  useLayoutEffect(() => {
    setHost(anchorRef.current?.closest<HTMLElement>(`.${TABS_BOX_CLASS}`) ?? null);
  }, []);

  /* The measured gap between the bottom of the tabs box and the bottom of the pane. */
  useLayoutEffect(() => {
    const dock = dockRef.current;
    const pane = findTabContentsScroll(anchorRef.current);
    if (!host || !dock || !pane) return;
    const measure = () => {
      const gap = Math.max(0, host.getBoundingClientRect().bottom - pane.getBoundingClientRect().bottom);
      const next = `${Math.round(gap)}px`;
      if (dock.style.getPropertyValue(DOCK_BOTTOM_VAR) !== next) dock.style.setProperty(DOCK_BOTTOM_VAR, next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    ro.observe(pane);
    return () => ro.disconnect();
  }, [host]);

  const setStrip = (el: HTMLDivElement | null) => {
    stripRef.current = el;
    syncParts();
  };
  const setLabel = (el: HTMLSpanElement | null) => {
    labelRef.current = el;
    syncParts();
  };
  const setText = (el: HTMLSpanElement | null) => {
    textRef.current = el;
    syncParts();
  };
  const setMeasure = (el: HTMLDivElement | null) => {
    measureRef.current = el;
    syncParts();
  };

  const dock = (
    <div ref={dockRef} className="bonsai-fold-dock" data-bonsai-fold-tab={tab}>
      {children}
      {/* Written by useHelpStrip on the landing itself, never by a render: React never sets its words. */}
      <div ref={setStrip} className="bonsai-fold-strip" data-bonsai-help-strip={tab} hidden aria-live="polite">
        <span ref={setLabel} className="bonsai-fold-strip__label" />
        <span ref={setText} className="bonsai-fold-strip__text" />
      </div>
      {/* The same strip, never seen, for the scroll plan to measure the next row's text in. */}
      <div ref={setMeasure} className="bonsai-fold-strip bonsai-fold-strip--measure" aria-hidden="true" hidden>
        <span className="bonsai-fold-strip__label" />
        <span className="bonsai-fold-strip__text" />
      </div>
    </div>
  );
  return (
    <>
      <span ref={anchorRef} className="bonsai-fold-dock-anchor" aria-hidden="true" hidden />
      {host ? createPortal(dock, host) : dock}
    </>
  );
}
