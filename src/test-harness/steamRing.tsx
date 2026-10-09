/**
 * Title: Steam's ring, modelled for focus tests
 * Purpose: A stand-in for @decky/ui's `Focusable` that behaves the way Steam does on the Deck in the one
 *          respect the header and box-return tests need: Steam's own transfer (a nav node's `TakeFocus`)
 *          moves the ring, and a plain `focus()` does not. The ring is Steam's own marker, the `gpfocus`
 *          class, on exactly one element; the page's focus (`document.activeElement`) moves with it on a
 *          transfer and on its own on a plain `focus()`, which is how the two come apart on the device
 *          (AGENTS.md, "The Steam Deck focus graph"). Steam's move handlers are kept on the element
 *          (`__nav`) so a test can press a direction the way Steam calls it.
 * Used for: tests that must fail when a move is a plain `focus()` across containers: the chats menu's box
 *           return (plan 84 step 5's bug), and plan 84 step 6's strip, name and back-arrow routes.
 *          A transfer onto a container (a Focusable without `focusable: true`) lands on its first stop inside,
 *          as Steam's does: the first Focusable marked `focusable`, or the first enabled button or text field.
 * Does not: Walk Steam's spatial navigation. A press with no handler, or a handler that returns false, moves
 *           nothing here; a test that needs Steam's own step models it itself.
 */
import React from "react";

type SteamHandlers = Record<string, ((...args: unknown[]) => unknown) | undefined>;
export type SteamEl = HTMLElement & { __nav?: SteamHandlers };

/** The handlers Steam itself calls on a Focusable (focus-graph-patterns). */
const KEPT = ["onMoveUp", "onMoveDown", "onMoveLeft", "onMoveRight", "onOKButton", "onCancelButton", "onButtonDown"];

/** Steam's ring onto `el` (or off everything): the `gpfocus` marker on it alone, and the page's focus with it. */
export function putSteamRingOn(el: HTMLElement | null): void {
  const doc = el?.ownerDocument ?? document;
  doc.querySelectorAll(".gpfocus").forEach((e) => e.classList.remove("gpfocus"));
  if (!el) return;
  el.classList.add("gpfocus");
  el.focus();
}

/** The element Steam's ring is on, or null. */
export function steamRingHolder(doc: Document = document): HTMLElement | null {
  return doc.querySelector<HTMLElement>(".gpfocus");
}

/** Where Steam's transfer onto `el` lands: `el` itself when it is a stop, else its first stop inside. */
function transferTarget(el: HTMLElement): HTMLElement {
  if (el.dataset.steamStop === "true") return el;
  return el.querySelector<HTMLElement>('[data-steam-stop="true"], button:not([disabled]), textarea, input') ?? el;
}

/**
 * The Focusable stand-in: the fake's `div`, with Steam's handlers kept on the element, `navRef` filled with
 * a `TakeFocus` that moves the ring onto it, and `tabindex="0"` as Decky stamps on the nodes it navigates.
 */
export const SteamRingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function SteamRingFocusable(
  props,
  ref,
) {
  const nav: SteamHandlers = {};
  for (const k of KEPT) nav[k] = props[k] as SteamHandlers[string];
  const { navRef, children, focusable, noFocusRing, ...rest } = props as Record<string, unknown> & {
    navRef?: { current: unknown };
    children?: React.ReactNode;
  };
  const dom: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (!KEPT.includes(k) && !/^on(Move|OK|Cancel|Button|Activate|Gamepad|Secondary|Options)/.test(k)) dom[k] = v;
  }
  if (noFocusRing !== undefined) dom["data-no-focus-ring"] = String(Boolean(noFocusRing));
  if (focusable === true) dom["data-steam-stop"] = "true";
  const setRef = (el: HTMLDivElement | null) => {
    if (el) {
      (el as SteamEl).__nav = nav;
      el.setAttribute("tabindex", "0");
      if (navRef) navRef.current = { TakeFocus: () => (putSteamRingOn(transferTarget(el)), true) };
    }
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
  return (
    <div ref={setRef} data-decky-ui="Focusable" {...dom}>
      {children}
    </div>
  );
});
