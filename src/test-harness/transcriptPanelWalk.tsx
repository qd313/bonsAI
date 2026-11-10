/**
 * Title: The real chat transcript in the panel's page, walked the way Steam presses the D-pad
 * Purpose: Shared set-up for plan 103 lane F1's walks (the checklist under the Copy icon, and the Show details
 *          strip): the transcript drawn into the page lostFocusPanel.tsx makes, every element given a box in the
 *          order it is drawn inside a pane tall enough that nothing has to scroll, the chips of a Show details
 *          grid laid side by side in one row, Decky's tabindex stamped on the nodes Steam navigates as each is
 *          drawn, and a bounded walk: no stop twice, and Steam's ring and the page's focus on the same stop after
 *          every press.
 * Used for: MainTabChatTranscript.checklistCopyWalk.test.tsx.
 * Solves: One copy of the scaffolding these walks need, so each walk test does not carry its own.
 * Does not: Model Steam's scroll-into-view: the pane holds the whole turn. The checklist's walk with Steam's
 *           scroll modelled is liveTurnFocusGraph.checklistWalk.test.ts. Does not mock `@decky/ui`: each test file
 *           does, wrapping the stubs in `withPanelNav`.
 *
 * How it works:
 * 1. `drawTranscript` renders the element into a scroll pane inside the page and stamps a tabindex on every
 *    node matching the test's `stamp` selector (Decky does that on the Deck; the stub does not).
 * 2. A stop is an innermost button or tabindex node, in drawn order. Steam's own Up or Down, for a press no
 *    handler claims, is the stop before or after the ringed one in that order.
 * 3. `walk` presses one way until the ring stops moving, the limit runs out, or it reaches `until`.
 */
import type React from "react";
import { act, render } from "@testing-library/react";
import { expect } from "vitest";

import type { MoveKey, PanelNavEl, PanelPage } from "./lostFocusPanel";

/** The innermost nodes Steam navigates: buttons, and the nodes Decky gives a tabindex. */
const STEAM_NODE = "button, [tabindex]";
/** Height of every element's box; elements are stacked in drawn order. */
const ROW_HEIGHT = 4;
/** Tall enough that a whole turn fits, so no press ever has to scroll the pane. */
const PANE_HEIGHT = 4000;
/** Width of one chip in a Show details grid, so a row of them sits side by side. */
const CHIP_WIDTH = 60;

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
  press(key: MoveKey): "claimed" | "declined";
  /** B (`onCancelButton`) or A (`onOKButton`) on the ring, heard by the ringed node or a container round it. */
  button(kind: "onCancelButton" | "onOKButton"): boolean;
  /** A bounded walk from the ring; returns every stop it landed on, the start first. */
  walk(key: MoveKey, until: string, limit?: number): string[];
}

function rect(top: number, left: number, width: number): DOMRect {
  const bottom = top + ROW_HEIGHT;
  return { top, bottom, left, right: left + width, width, height: ROW_HEIGHT, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

/**
 * In: the panel's page, the element to draw, the selector of the nodes Decky would stamp a tabindex on, and the
 *     test's own names for stops it cares about (null: use the label or words).
 * Out: the walk's handles, plus `unmount` to stop the stamping.
 */
export function drawTranscript(
  page: PanelPage,
  element: React.ReactElement,
  stamp: string,
  names: (el: HTMLElement) => string | null,
): TranscriptWalk & { unmount: () => void } {
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
      return rect(Array.from(pane.querySelectorAll("*")).indexOf(row) * ROW_HEIGHT, place * CHIP_WIDTH, CHIP_WIDTH - 4);
    }
    return rect(Array.from(pane.querySelectorAll("*")).indexOf(this) * ROW_HEIGHT, 0, 300);
  };
  const stampAll = () =>
    pane.querySelectorAll<HTMLElement>(stamp).forEach((el) => {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    });
  const stamper = new win.MutationObserver(stampAll);
  stamper.observe(pane, { childList: true, subtree: true });
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
  const press = (key: MoveKey) => {
    let out: "claimed" | "declined" = "declined";
    act(() => {
      out = page.press(key, key === "onMoveDown" || key === "onMoveUp" ? steamStep(key) : undefined);
    });
    return out;
  };
  const button = (kind: "onCancelButton" | "onOKButton") => {
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
    return heard;
  };
  const walk = (key: MoveKey, until: string, limit = 24) => {
    const trail = [nameOf(page.ring())];
    for (let i = 0; i < limit && trail[trail.length - 1] !== until; i++) {
      const before = page.ring();
      press(key);
      if (page.ring() === before) break;
      const now = nameOf(page.ring());
      const said = `${key} from ${trail[trail.length - 1]} (${trail.join(" -> ")})`;
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
    unmount: () => stamper.disconnect(),
  };
}
