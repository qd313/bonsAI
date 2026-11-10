/**
 * Title: The real chat transcript in the panel's page, walked the way Steam presses the D-pad
 * Purpose: Shared set-up for plan 103 lane F1's walks (the checklist under the Copy icon, and the Show details
 *          strip): the transcript drawn into the page lostFocusPanel.tsx makes, every element given a box in the
 *          order it is drawn inside a pane tall enough that nothing has to scroll, the chips of a Show details
 *          grid laid side by side in one row (or wrapped onto more), Decky's tabindex stamped on the nodes Steam
 *          navigates as each is drawn, no focus events while the page lacks the browser's focus (as on the Deck),
 *          and a bounded walk: no stop twice, no press claimed while the ring stays put, and Steam's ring and the
 *          page's focus on the same stop after every press. Also a stand-in for the dock's suggestion chips.
 * Used for: MainTabChatTranscript.checklistCopyWalk.test.tsx, MainTabChatTranscript.detailsStripLostFocus.test.tsx.
 * Solves: One copy of the scaffolding these walks need, so each walk test does not carry its own.
 * Does not: Model Steam's scroll-into-view: the pane holds the whole turn. The checklist's walk with Steam's
 *           scroll modelled is liveTurnFocusGraph.checklistWalk.test.ts.
 *
 * How it works:
 * 1. `drawTranscript` renders the element into a scroll pane inside the page and stamps a tabindex on every
 *    node matching the test's `stamp` selector (Decky does that on the Deck; the stub does not).
 * 2. A stop is an innermost button or tabindex node, in drawn order. Steam's own Up or Down, for a press no
 *    handler claims, is the stop before or after the ringed one in that order.
 * 3. Every press lets the page's queued work run before it returns (the chip ladder hands the ring on to its
 *    open chip a moment after its root takes focus, ContextChipLadder.tsx).
 * 4. `walk` presses one way until the ring stops moving, the limit runs out, or it reaches `until`. A press
 *    claimed while the ring stayed where it was fails the walk: that is a dead press.
 * 5. `transcriptPanelEachTest` registers the per-test hooks: empty registries and a fresh page before, all
 *    taken down after.
 */
import type React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect } from "vitest";

import { mountPanelPage, type MoveKey, type PanelNavEl, type PanelPage } from "./lostFocusPanel";
import { resetNavFocusRegistry } from "../shared/dpad/navFocusRegistry";
import { resetAnswerStopRegistry } from "../shared/dpad/answerStopRegistry";
import { resetStrategyChecklistNavForTests } from "../shared/dpad/strategyChecklistNav";
import { REPLY_STOP_ORDER, registerReplyStop, setReplyStopUnavailable } from "../shared/dpad/replyStopRegistry";

/** The innermost nodes Steam navigates: buttons, and the nodes Decky gives a tabindex. */
const STEAM_NODE = "button, [tabindex]";
/** Height of every element's box; elements are stacked in drawn order. */
const ROW_HEIGHT = 4;
/** Tall enough that a whole turn fits, so no press ever has to scroll the pane. */
const PANE_HEIGHT = 4000;
/** Width of one chip in a Show details grid, so a row of them sits side by side. */
const CHIP_WIDTH = 60;

/** How the Show details chips are laid out: `chipsPerRow` wraps them onto more rows (default: one row). */
export interface ChipLayout {
  chipsPerRow?: number;
}

/**
 * `@decky/ui` for these walks, for a test's `vi.mock` factory: the shared stubs, with Steam's Focusable and Button
 * modelled on the panel's page (their move handlers kept, their `navRef` a transfer).
 */
export async function panelDeckyUi(): Promise<Record<string, unknown>> {
  const stubs = await import("./fakeDeckyUi");
  const { withPanelNav } = await import("./lostFocusPanel");
  return { ...stubs, Focusable: withPanelNav(stubs.Focusable), Button: withPanelNav(stubs.Button) };
}

export interface TranscriptWalk {
  /** Every stop, in drawn order. */
  stops(): HTMLElement[];
  /** The test's name for a stop (or the stop's label, or its words). */
  nameOf(el: HTMLElement | null): string;
  /** The stop of that name; fails the test when there is none. */
  byName(name: string): HTMLElement;
  /** Steam's ring onto the named stop by its own move. */
  put(name: string): void;
  /** One D-pad press; a press no handler claims is Steam's own step to the neighbouring stop. */
  press(key: MoveKey): Promise<"claimed" | "declined">;
  /** B (`onCancelButton`) or A (`onOKButton`) on the ring, heard by the ringed node or a container round it. */
  button(kind: "onCancelButton" | "onOKButton"): Promise<boolean>;
  /** A bounded walk from the ring; returns every stop it landed on, the start first. */
  walk(key: MoveKey, until: string, limit?: number): Promise<string[]>;
}

function rect(top: number, left: number, width: number): DOMRect {
  const bottom = top + ROW_HEIGHT;
  return { top, bottom, left, right: left + width, width, height: ROW_HEIGHT, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

/** Let the work a press queued (a microtask, a redraw) run before the test reads where the ring is. */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/**
 * In: the panel's page, the element to draw, the selector of the nodes Decky would stamp a tabindex on, and the
 *     test's own names for stops it cares about (null: use the label or words), and the chips' layout.
 * Out: the walk's handles, plus `unmount` to stop the stamping.
 */
export function drawTranscript(
  page: PanelPage,
  element: React.ReactElement,
  stamp: string,
  names: (el: HTMLElement) => string | null,
  chips: ChipLayout = {},
): TranscriptWalk & { unmount: () => void } {
  const perRow = chips.chipsPerRow ?? Number.POSITIVE_INFINITY;
  const pane = page.doc.createElement("div");
  pane.className = "TabContentsScroll";
  Object.defineProperty(pane, "clientHeight", { value: PANE_HEIGHT, configurable: true });
  Object.defineProperty(pane, "scrollHeight", { value: PANE_HEIGHT + 100, configurable: true });
  page.host.appendChild(pane);
  const win = page.doc.defaultView as unknown as { Element: typeof Element; MutationObserver: typeof MutationObserver };
  win.Element.prototype.getBoundingClientRect = function boxInDrawnOrder(this: Element) {
    if (this === pane) return { ...rect(0, 0, 300), bottom: PANE_HEIGHT, height: PANE_HEIGHT } as DOMRect;
    const chip = this.closest(".bonsai-chip-ladder-chip");
    if (chip) {
      const row = chip.parentElement!;
      const place = Array.from(row.children).indexOf(chip);
      const line = Number.isFinite(perRow) ? Math.floor(place / perRow) : 0;
      const top = Array.from(pane.querySelectorAll("*")).indexOf(row) * ROW_HEIGHT + line * (ROW_HEIGHT + 2);
      return rect(top, (place - line * (Number.isFinite(perRow) ? perRow : 0)) * CHIP_WIDTH, CHIP_WIDTH - 4);
    }
    return rect(Array.from(pane.querySelectorAll("*")).indexOf(this) * ROW_HEIGHT, 0, 300);
  };
  const stampAll = () =>
    pane.querySelectorAll<HTMLElement>(stamp).forEach((el) => {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    });
  const stamper = new win.MutationObserver(stampAll);
  stamper.observe(pane, { childList: true, subtree: true });
  /*
   * Steam draws its ring class itself, so a redraw never takes it off; the stand-in adds it by hand, and React
   * rewriting a stop's class (a chip becoming the open one) wiped it. Put it back on the stop that held it while
   * that stop is still drawn; a stop that is gone leaves no ring, as on the Deck.
   */
  /*
   * The real page sends no focus events while it lacks the browser's focus (lostFocusHop.ts); jsdom always does.
   * Stop them at the page's top before the screen's own handlers hear them, so nothing here passes on an event
   * the Deck would never deliver. The stand-in's own ring rule (lostFocusPanel.tsx) ignores them then anyway.
   */
  for (const type of ["focus", "focusin", "blur", "focusout"]) {
    page.doc.addEventListener(type, (e) => (page.doc.hasFocus() ? undefined : e.stopImmediatePropagation()), true);
  }
  let lastRing: HTMLElement | null = null;
  const steamMove = page.steamMove;
  page.steamMove = (el) => {
    steamMove(el);
    lastRing = el;
  };
  /* After the stand-in's own listener, which moves the ring with the page's focus while the page has it. */
  page.doc.addEventListener("focusin", () => (lastRing = page.ring() ?? lastRing), true);
  const ringKeeper = new win.MutationObserver(() => {
    if (!page.ring() && lastRing?.isConnected) lastRing.classList.add("gpfocus");
  });
  ringKeeper.observe(page.host, { attributes: true, attributeFilter: ["class"], subtree: true });
  render(element, { container: pane });
  stampAll();

  const stops = () =>
    Array.from(page.host.querySelectorAll<HTMLElement>(STEAM_NODE)).filter((el) => el.querySelector(STEAM_NODE) === null);
  const nameOf = (el: HTMLElement | null) => {
    if (!el) return "nothing";
    return names(el) ?? (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).trim().slice(0, 40);
  };
  const byName = (name: string) => {
    const found = stops().find((s) => nameOf(s) === name);
    expect(found, `no stop "${name}" among: ${stops().map(nameOf).join(" | ")}`).toBeTruthy();
    return found!;
  };
  const steamStep = (key: MoveKey) => (from: HTMLElement) => {
    const all = stops();
    const at = all.indexOf(from);
    if (at < 0) return null;
    return all[key === "onMoveDown" ? at + 1 : at - 1] ?? null;
  };
  const press = async (key: MoveKey) => {
    let out: "claimed" | "declined" = "declined";
    act(() => {
      out = page.press(key, key === "onMoveDown" || key === "onMoveUp" ? steamStep(key) : undefined);
    });
    await settle();
    return out;
  };
  const button = async (kind: "onCancelButton" | "onOKButton") => {
    let heard = false;
    act(() => {
      for (let el = page.ring() as PanelNavEl | null; el && !heard; el = el.parentElement as PanelNavEl | null) {
        const handler = el.__nav?.[kind];
        if (handler) {
          handler({ preventDefault: () => {}, stopPropagation: () => {} });
          heard = true;
        }
      }
    });
    await settle();
    return heard;
  };
  const walk = async (key: MoveKey, until: string, limit = 24) => {
    const trail = [nameOf(page.ring())];
    for (let i = 0; i < limit && trail[trail.length - 1] !== until; i++) {
      const before = page.ring();
      const out = await press(key);
      const said = `${key} from ${trail[trail.length - 1]} (${trail.join(" -> ")})`;
      if (page.ring() === before) {
        expect(out, `${said}: claimed while the ring stayed put`).toBe("declined");
        break;
      }
      const now = nameOf(page.ring());
      expect(nameOf(page.active()), `${said}: the page's focus is not where the ring is`).toBe(now);
      expect(trail.includes(now), `${said}: ${now} visited twice`).toBe(false);
      trail.push(now);
    }
    return trail;
  };
  return {
    stops,
    nameOf,
    byName,
    put: (name) => act(() => page.steamMove(byName(name))),
    press,
    button,
    walk,
    unmount: () => {
      stamper.disconnect();
      ringKeeper.disconnect();
    },
  };
}

/**
 * The set-up every walk test here shares, as hooks: before each test the registries are emptied and a fresh
 * panel page is mounted; after it, whatever was drawn is taken down with the page. Call once at a test file's
 * top level; `page()` is the current test's page, `draw` draws into it (drawTranscript's arguments).
 */
export function transcriptPanelEachTest(): {
  page: () => PanelPage;
  draw: (element: React.ReactElement, stamp: string, names: (el: HTMLElement) => string | null, chips?: ChipLayout) => TranscriptWalk;
} {
  let page: PanelPage | null = null;
  let drawn: (TranscriptWalk & { unmount: () => void }) | null = null;
  beforeEach(() => {
    resetNavFocusRegistry();
    resetAnswerStopRegistry();
    resetStrategyChecklistNavForTests();
    for (const id of REPLY_STOP_ORDER) {
      registerReplyStop(id, null);
      setReplyStopUnavailable(id, false);
    }
    page = mountPanelPage();
  });
  afterEach(() => {
    drawn?.unmount();
    drawn = null;
    cleanup();
    page?.remove();
    document.body.innerHTML = "";
  });
  return {
    page: () => page!,
    draw: (element, stamp, names, chips) => (drawn = drawTranscript(page!, element, stamp, names, chips)),
  };
}

/**
 * A stand-in for the dock's suggestion chips: one stop drawn after the transcript, named "suggestion chips".
 * `nav` is its Steam nav node, for the test to register as the chips' own ("preset-carousel"); the chain under
 * an open Show details panel ends in a transfer onto it, so a press that skips the panel lands here. `onUp` is
 * what the real chips do with Up (presetRowFocusNav.tsx asks for the lowest stop of the newest answer).
 */
export function dockChipsStop(page: PanelPage, onUp: () => boolean): { nav: { current: { TakeFocus: () => boolean } } } {
  const el = page.doc.createElement("div") as PanelNavEl;
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", "suggestion chips");
  el.__nav = { onMoveUp: onUp };
  page.host.appendChild(el);
  return {
    nav: {
      current: {
        TakeFocus: () => {
          page.steamMove(el);
          page.transfers.push(el);
          return true;
        },
      },
    },
  };
}
