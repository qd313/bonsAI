/**
 * Title: One Left press the way Steam delivers it, and Steam's side menu, for the Left-out tests (plan 105, lane C5)
 * Purpose: The Deck check for "Left reaches the Quick Access Menu" reads one thing: after each Left, is the ring on
 *          the same control, on another bonsAI control, or out on Steam's side menu (the icon column left of the
 *          panel, workshop:test-evidence/plan105-P105-M-LEFT-EDGES.json). This presses Left that way: first the press
 *          is heard at the panel's page (`vgp_onbuttondown` on the ringed control, bubbling, with Steam's repeat
 *          mark), then the ringed control's own `onMoveLeft` and its containers' in turn, as Steam calls them; a
 *          press none of them claims is Steam's own Left, which moves to the stop before it in a sideways row
 *          (`flow-children="horizontal"`) and, at a left edge, out to Steam's menu.
 * Used for: the Left-out tests of the ask strip, the chat, the folded tabs and the Search tab. Works with every
 *           harness that keeps Steam's move handlers on the element as `__nav` (steamRing.tsx, lostFocusPanel.tsx,
 *           searchTabTestKit.tsx, earlierListNavStub.tsx). `leftsAt` presses at one stop of a walk until the ring
 *           moves or leaves, and puts it back, so a walk can go on; `leftsDownWalk` does that at every stop of a
 *           folded tab's walk (foldedTabWalk.tsx) with `steamRingWorld`.
 * Does not: Hand the move handler any press of its own: on the Deck it is not known whether Steam does, so the
 *           counter must work from the press heard at the page alone (leftEdge.ts). Does not walk Steam's
 *           spatial search beyond a row: the menu stands for everything outside the plugin.
 */

import { act } from "@testing-library/react";

import { putSteamRingOn } from "./steamRing";
import { advanceLeftEdgeClockForTests } from "../shared/dpad/leftEdge";

/** Steam's button numbers (`@decky/ui`, `GamepadButton`). */
export const DIR_LEFT = 11;
export const DIR_RIGHT = 12;
export const DIR_DOWN = 10;

type NavEl = HTMLElement & { __nav?: Record<string, ((e?: unknown) => unknown) | undefined> };

/** A person's separate presses come this far apart; a held-down Left repeats this fast (leftEdge.ts's floor sits between). */
const PRESS_GAP_MS = 400;
const REPEAT_GAP_MS = 50;

/**
 * A press heard at the panel's page: `vgp_onbuttondown` on `at` (a control, or the page), bubbling, as on the Deck. A
 * Left also moves the count's clock on by `gapMs`: a separate press's gap by default, a repeat's when `repeat`.
 */
export function hearPress(at: Element | Document, button: number, repeat = false, gapMs?: number): void {
  if (button === DIR_LEFT) advanceLeftEdgeClockForTests(gapMs ?? (repeat ? REPEAT_GAP_MS : PRESS_GAP_MS));
  const doc = (at as Element).ownerDocument ?? (at as Document);
  const Custom = (doc.defaultView ?? window).CustomEvent;
  at.dispatchEvent(new Custom("vgp_onbuttondown", { detail: { button, is_repeat: repeat, source: 0 }, bubbles: true }));
}

/** Steam's side menu in `doc`: one stop outside the plugin, where Steam's own Left from a left edge puts the ring. */
function steamMenu(doc: Document): HTMLElement {
  // focus-patterns-allow: the test stand-in for Steam's own menu, outside the plugin.
  const found = doc.querySelector<HTMLElement>("[data-steam-menu]");
  if (found) return found;
  const menu = doc.createElement("div");
  menu.setAttribute("data-steam-menu", "");
  menu.setAttribute("aria-label", "Steam's menu");
  menu.tabIndex = 0;
  doc.body.prepend(menu);
  return menu;
}

/**
 * The stops Steam walks inside a row: buttons, fields and the nodes Decky gives a tabindex, in drawn order. A greyed
 * Decky button is one of them: it keeps its place in Steam's graph and still takes the ring (fakeDeckyUi.tsx).
 */
function stopsIn(row: HTMLElement): HTMLElement[] {
  // focus-patterns-allow: the test stand-in for Steam's own walk along a row.
  return Array.from(row.querySelectorAll<HTMLElement>("button, input, textarea, [tabindex]"));
}

/** Steam's own Left from `from`: the stop before it in the nearest sideways row that has one, else its menu. */
function steamOwnLeft(from: HTMLElement): HTMLElement {
  for (let row = from.parentElement; row; row = row.parentElement) {
    if (row.getAttribute("flow-children") !== "horizontal") continue;
    const stops = stopsIn(row);
    const at = stops.findIndex((s) => s === from || s.contains(from) || from.contains(s));
    if (at > 0) return stops[at - 1]!;
  }
  return steamMenu(from.ownerDocument);
}

export type LeftResult = "held" | "moved" | "out";

export interface SteamLeftWorld {
  /** The control Steam's ring is on now. */
  ring: () => HTMLElement | null;
  /** Steam's own move of the ring onto `el` (its marker and the page's focus together). */
  move: (el: HTMLElement) => void;
}

/**
 * In: where the ring is and how Steam moves it. Out: "held" (the ring did not move), "moved" (onto another bonsAI
 * control) or "out" (on Steam's menu), and the control it ended on.
 */
export function pressLeft(world: SteamLeftWorld, repeat = false): { result: LeftResult; at: HTMLElement | null } {
  const from = world.ring();
  if (!from) throw new Error("no ring to press Left from");
  const doc = from.ownerDocument;
  // focus-patterns-allow: the test reads the page's own focus to tell a plain hop from a held press.
  const active = doc.activeElement;
  hearPress(from, DIR_LEFT, repeat);
  let claimed = false;
  for (let el: NavEl | null = from as NavEl; el && !claimed; el = el.parentElement as NavEl | null) {
    claimed = el.__nav?.onMoveLeft?.() === true;
  }
  if (!claimed) world.move(steamOwnLeft(from));
  const ring = world.ring();
  // focus-patterns-allow: the test reads the page's own focus to tell a plain hop from a held press.
  const focus = doc.activeElement as HTMLElement | null;
  const at = ring !== from ? ring : focus !== active && focus !== doc.body ? focus : from;
  if (at && at.hasAttribute("data-steam-menu")) return { result: "out", at };
  return { result: at === from ? "held" : "moved", at };
}

/**
 * Lefts at `stop` as Steam delivers them, until one moves the ring or puts it on Steam's menu, at most `cap`; the
 * press that brought the ring here (a Down) is heard first, as on the Deck, and the ring is put back on `stop` after,
 * so a walk can go on from it. Every press runs inside React's `act`.
 */
export function leftsAt(stop: HTMLElement, world: SteamLeftWorld, cap = 8): LeftResult[] {
  act(() => world.move(stop));
  hearPress(stop, DIR_DOWN);
  const out: LeftResult[] = [];
  for (let i = 0; i < cap && out[out.length - 1] !== "moved" && out[out.length - 1] !== "out"; i++) {
    let r: LeftResult = "held";
    act(() => {
      r = pressLeft(world).result;
    });
    out.push(r);
  }
  act(() => world.move(stop));
  return out;
}

/** Steam's ring as steamRing.tsx models it in a walk: the page's focus, moved by Steam's own move or transfer. */
export const steamRingWorld: SteamLeftWorld = {
  ring: () => {
    // focus-patterns-allow: the walk moves the page's focus as Steam's ring.
    const el = document.activeElement as HTMLElement | null;
    return el && el !== document.body ? el : null;
  },
  move: (el) => putSteamRingOn(el),
};

/** The two calls of a walk this needs (foldedTabWalk.tsx's). */
interface DownWalk {
  enter(): { stop: HTMLElement; name: string };
  press(direction: "down"): { stop: HTMLElement; name: string } | null;
}

/**
 * Down a walk from its first stop to its end, with `leftsAt` at every stop: each stop's name (or `nameOf`'s) and its
 * Lefts, in order. Throws on a stop the walk lands on twice.
 */
export function leftsDownWalk(
  w: DownWalk,
  world: SteamLeftWorld,
  cap = 8,
  nameOf: (stop: HTMLElement, name: string) => string = (_s, n) => n,
): Array<[string, LeftResult[]]> {
  const seen = new Set<HTMLElement>();
  const out: Array<[string, LeftResult[]]> = [];
  for (let l: { stop: HTMLElement; name: string } | null = w.enter(); l; l = w.press("down")) {
    if (seen.has(l.stop)) throw new Error(`the walk landed on ${l.name} twice`);
    seen.add(l.stop);
    out.push([nameOf(l.stop, l.name), leftsAt(l.stop, world, cap)]);
  }
  return out;
}
