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
 *           searchTabTestKit.tsx, earlierListNavStub.tsx).
 * Does not: Hand the move handler any press of its own: on the Deck it is not known whether Steam does, so the
 *           counter must work from the press heard at the page alone (leftEdge.ts). Does not walk Steam's
 *           spatial search beyond a row: the menu stands for everything outside the plugin.
 */

/** Steam's button numbers (`@decky/ui`, `GamepadButton`). */
export const DIR_LEFT = 11;
export const DIR_RIGHT = 12;

type NavEl = HTMLElement & { __nav?: Record<string, ((e?: unknown) => unknown) | undefined> };

/** A press heard at the panel's page: `vgp_onbuttondown` on `at` (a control, or the page), bubbling, as on the Deck. */
export function hearPress(at: Element | Document, button: number, repeat = false): void {
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
