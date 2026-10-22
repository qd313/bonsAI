/**
 * Title: The panel's page without the browser's focus, with Steam's ring modelled on it
 * Purpose: A stand-in for the Quick Access page in the state plan 97 block B caught on the Deck
 *          (workshop:test-evidence/plan97-P97-B-FREEZE-2.json): the page on screen, `document.hasFocus()`
 *          false, and nothing winning the focus back. The page is a real frame with its own document and window,
 *          the way the panel's page is its own page under Decky (uiDocument.ts), so the plugin's own
 *          `uiWindowMissingFocus` reads the state exactly as it does on the device.
 * Used for: the plan 97 lane L14 tests of the plugin's own hops from the question box, its strip, the question's
 *           row and a Settings section line.
 * Solves: Steam's ring is the `gpfocus` marker on one element. Steam's own move and its transfer (a nav node's
 *         `TakeFocus`) put the ring and the page's focus on the same element, focused or not. A plain `focus()`
 *         moves the page's focus, and the ring follows it only while the page has the browser's focus: the
 *         ring hears the focus event, which a page without focus never gets. `press` runs the move handlers
 *         the way Steam calls them (the ringed element's, then its containers'); a press no handler claims is
 *         Steam's own, and the caller says where Steam's own step goes.
 * Does not: Walk Steam's spatial navigation: a test hands `press` the stop Steam's own step would pick. Does not
 *           model the window ever taking focus back: `window.focus()` here is refused, as the readings show.
 */
import React from "react";

import { rememberUiDocument, resetUiDocument } from "../shared/dpad/uiDocument";

type Handlers = Record<string, ((e?: unknown) => unknown) | undefined>;
export type PanelNavEl = HTMLElement & { __nav?: Handlers };
export type MoveKey = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

/** The handlers Steam itself calls on a Focusable, kept on the element for `press`. */
const KEPT = ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight", "onOKButton", "onCancelButton"];

export interface PanelPage {
  doc: Document;
  /** Where a test renders: a node in the panel's own document. */
  host: HTMLElement;
  /** Give the page the browser's focus, or take it away. */
  setFocused(focused: boolean): void;
  /** The element Steam's ring is on, or null. */
  ring(): HTMLElement | null;
  /** The page's own focus. */
  active(): HTMLElement | null;
  /** Every element Steam's transfer landed on, in order. */
  transfers: HTMLElement[];
  /** Steam's ring onto `el` by its own move: the ring and the page's focus together. */
  steamMove(el: HTMLElement): void;
  /**
   * One press, as Steam delivers it. Returns "claimed" when a handler said it handled the press, else
   * "declined"; on a declined press Steam's own step runs onto whatever `steamStep` picks (nothing: stays).
   */
  press(key: MoveKey, steamStep?: (from: HTMLElement) => HTMLElement | null): "claimed" | "declined";
  remove(): void;
}

let current: PanelPage | null = null;

function markRing(doc: Document, el: HTMLElement | null): void {
  // focus-patterns-allow: the test stand-in for Steam itself, which owns the ring marker.
  doc.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
  el?.classList.add("gpfocus");
}

/** Mount the panel's page: focused to begin with. Pair with `remove()`. */
export function mountPanelPage(): PanelPage {
  const frame = document.createElement("iframe");
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const state = { focused: true };
  doc.hasFocus = () => state.focused;
  Object.defineProperty(doc, "visibilityState", { get: () => "visible", configurable: true });
  /* The ring follows a plain focus() only while the page has the browser's focus. */
  doc.addEventListener(
    "focusin",
    (e) => {
      if (state.focused) markRing(doc, e.target as HTMLElement);
    },
    true,
  );
  const host = doc.createElement("div");
  doc.body.appendChild(host);
  rememberUiDocument(host);

  const page: PanelPage = {
    doc,
    host,
    transfers: [],
    setFocused(focused) {
      state.focused = focused;
    },
    // focus-patterns-allow: the test stand-in reading Steam's ring marker, which is the measurement.
    ring: () => doc.querySelector<HTMLElement>(".gpfocus"),
    active: () => {
      // focus-patterns-allow: the test reads the page's own focus to compare it with the ring.
      const el = doc.activeElement as HTMLElement | null;
      return el && el !== doc.body ? el : null;
    },
    steamMove(el) {
      markRing(doc, el);
      el.focus();
    },
    press(key, steamStep) {
      let el = page.ring() as PanelNavEl | null;
      const from = el;
      while (el) {
        const h = el.__nav?.[key];
        if (h && h({ stopPropagation: () => {} }) === true) return "claimed";
        el = el.parentElement as PanelNavEl | null;
      }
      const next = from && steamStep ? steamStep(from) : null;
      if (next) page.steamMove(next);
      return "declined";
    },
    remove() {
      resetUiDocument();
      frame.remove();
      if (current === page) current = null;
    },
  };
  current = page;
  return page;
}

/** Where Steam's transfer onto `el` lands: `el` when it is a stop of its own, else its first stop inside. */
function transferTarget(el: HTMLElement, stop: boolean): HTMLElement {
  if (stop) return el;
  // focus-patterns-allow: the test stand-in for Steam's own transfer, which picks the stop inside a node.
  return el.querySelector<HTMLElement>("button, textarea, input, [tabindex]") ?? el;
}

/**
 * Wrap a fake Decky component so it behaves as Steam's node would: its move handlers kept on the element, and
 * its `navRef` filled with Steam's transfer onto the panel page `mountPanelPage` made last.
 */
export function withPanelNav(Base: React.ElementType) {
  return React.forwardRef<HTMLElement, Record<string, unknown>>(function PanelNavStub(props, ref) {
    const { navRef, ...rest } = props as Record<string, unknown> & { navRef?: { current: unknown } };
    const setRef = (el: HTMLElement | null) => {
      if (el) {
        const nav: Handlers = {};
        for (const k of KEPT) nav[k] = props[k] as Handlers[string];
        (el as PanelNavEl).__nav = nav;
        if (navRef) {
          navRef.current = {
            TakeFocus: () => {
              const page = current;
              if (!page) return false;
              const target = transferTarget(el, props.focusable === true);
              page.steamMove(target);
              page.transfers.push(target);
              return true;
            },
          };
        }
      }
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
    };
    return <Base {...rest} ref={setRef} />;
  });
}
