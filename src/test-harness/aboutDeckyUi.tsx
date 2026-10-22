/**
 * Title: Steam's focus controls, kept faithful enough to press the About tab's D-pad
 * Purpose: Stand-ins for @decky/ui's `Focusable`, `Button` and `Dropdown` for the About tab's tests (plan 92,
 *          lane T3). The shared fakes (fakeDeckyUi.tsx) throw Steam's move and focus handlers away; the About
 *          tab's rows are driven by exactly those (`onGamepadFocus` / `onGamepadBlur` open a row's text,
 *          `onMoveRight` / `onMoveLeft` / `onMoveDown` walk the links), so these keep every one of them on the
 *          element (`__nav`) for a test to call the way Steam does. Each is a stop the way Decky makes one:
 *          `tabindex="0"`, and a Focusable marked `focusable` is a real stop (`data-steam-stop`).
 * Used for: AboutTab.test.tsx, AboutLinks.test.tsx, AboutTab.walk.test.tsx.
 *          `steamStep` presses the D-pad the way Steam routes it: through its tree of containers and each one's
 *          `flow-children`, not by distance on screen (a container with no flow set walks nothing; plan 92's Deck
 *          run on build 5d67f9d9 found Down dead between the About link buttons for exactly that reason).
 * Does not: Paint or measure (AboutTab.walk.test.tsx lays out boxes for Steam's scroll), or fire a handler on its
 *           own: `callNav` and `steamStep` press one.
 */
import React from "react";
import { act } from "@testing-library/react";

type Handler = (...args: unknown[]) => unknown;
type NavEl = HTMLElement & { __nav?: Record<string, Handler | undefined> };

const NAV_PROP = /^on(Move|OK|Cancel|Button|Activate|Gamepad|Secondary|Options|Show)/;

function split(props: Record<string, unknown>) {
  const nav: Record<string, Handler | undefined> = {};
  const dom: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (NAV_PROP.test(key)) nav[key] = value as Handler;
    else if (key === "navRef" || key === "focusable" || key === "noFocusRing") continue;
    else dom[key] = value;
  }
  return { nav, dom };
}

/** A Focusable: handlers kept, `tabindex="0"`, `data-steam-stop` when it says `focusable`. */
export const KeepNavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function KeepNavFocusable(
  props,
  ref,
) {
  const { children, ...rest } = props as { children?: React.ReactNode } & Record<string, unknown>;
  const { nav, dom } = split(rest);
  const navRef = props.navRef as { current: unknown } | undefined;
  const setRef = (el: HTMLDivElement | null) => {
    if (el) {
      (el as NavEl).__nav = nav;
      /* Steam's transfer onto a container lands on its first stop inside, or on the element if it is one. */
      if (navRef) {
        navRef.current = {
          TakeFocus: () => {
            // focus-patterns-allow: a test double's own transfer, reading the subtree it stands for.
            const target = el.dataset.steamStop === "true" ? el : el.querySelector<HTMLElement>('[data-steam-stop="true"], button');
            target?.focus();
            return true;
          },
        };
      }
    }
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
  return (
    <div
      ref={setRef}
      tabIndex={0}
      data-decky-ui="Focusable"
      {...(props.focusable === true ? { "data-steam-stop": "true" } : {})}
      {...dom}
    >
      {children as React.ReactNode}
    </div>
  );
});

/** A Button: a real `<button>` (so a click works), handlers kept, `tabindex="0"`. */
export const KeepNavButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function KeepNavButton(
  props,
  ref,
) {
  const { children, ...rest } = props as { children?: React.ReactNode } & Record<string, unknown>;
  const { nav, dom } = split(rest);
  const setRef = (el: HTMLButtonElement | null) => {
    if (el) (el as NavEl).__nav = nav;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
  };
  return (
    <button ref={setRef} tabIndex={0} data-decky-ui="Button" {...dom}>
      {children as React.ReactNode}
    </button>
  );
});

/** The dropdown: one stop; its options and labels are not drawn (the About tests do not look at the menu). */
export const StopDropdown = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function StopDropdown(
  props,
  ref,
) {
  const setRef = (el: HTMLDivElement | null) => {
    // The props are kept on the element (`__dropdown`) so a test can open the list and pick a line the way Steam does.
    if (el) (el as DropdownEl).__dropdown = props;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
  return <div ref={setRef} tabIndex={0} data-decky-ui="Dropdown" data-steam-stop="true" />;
});

type DropdownEl = HTMLElement & { __dropdown?: Record<string, unknown> };

/**
 * Open the list the way Steam does (it tells the dropdown through `onMenuOpened`), then pick one line
 * (`onChange` with that line's option). `pickFromDropdown` alone is a pick after a list that was opened
 * earlier. Both run inside `act`.
 */
export function openDropdownMenu(el: HTMLElement): void {
  const props = (el as DropdownEl).__dropdown;
  act(() => {
    (props?.onMenuOpened as (() => void) | undefined)?.();
  });
}

export function pickFromDropdown(el: HTMLElement, data: string): void {
  const props = (el as DropdownEl).__dropdown;
  act(() => {
    (props?.onChange as ((opt: { data: string; label: string }) => void) | undefined)?.({ data, label: data });
  });
}

/** The same pick, but handed back as a function to call later (after the screen was thrown away). */
export function dropdownPickLater(el: HTMLElement, data: string): () => void {
  const props = (el as DropdownEl).__dropdown;
  return () => (props?.onChange as ((opt: { data: string; label: string }) => void) | undefined)?.({ data, label: data });
}

/**
 * Press one of Steam's handlers on `el`, inside `act`, and say whether it claimed the press (returned true).
 * A press with no such handler claims nothing, as on the device: Steam's own step decides.
 */
export function callNav(el: HTMLElement, name: string): boolean {
  const handler = (el as NavEl).__nav?.[name];
  if (!handler) return false;
  let claimed = false;
  act(() => {
    claimed = handler() === true;
  });
  return claimed;
}

/**
 * The press as Steam delivers it: the stop's own handler first, then, while a handler does not claim it, each
 * Focusable around it. True once one claims the press.
 */
export function pressNav(el: HTMLElement, name: string): boolean {
  for (let up: HTMLElement | null = el; up; up = up.parentElement) {
    if (callNav(up, name)) return true;
  }
  return false;
}

export type SteamDirection = "Up" | "Down" | "Left" | "Right";
type Flow = "row" | "column";

/** The Focusable that holds `el` in Steam's tree (plain divs in between are not nav nodes). */
function navParent(el: HTMLElement): HTMLElement | null {
  for (let up = el.parentElement; up; up = up.parentElement) {
    if (up.dataset.deckyUi === "Focusable") return up;
  }
  return null;
}

const NAV_KINDS = new Set(["Focusable", "Button", "Dropdown"]);

/** A container's own children in Steam's tree, in page order. */
function navChildren(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-decky-ui]")).filter(
    (el) => NAV_KINDS.has(el.dataset.deckyUi ?? "") && navParent(el) === container,
  );
}

function isStop(el: HTMLElement): boolean {
  return el.dataset.deckyUi === "Button" || el.dataset.deckyUi === "Dropdown" || el.dataset.steamStop === "true";
}

/** Where Steam's transfer onto a child lands: the child if it is a stop, else its first stop inside. */
function firstStopIn(el: HTMLElement): HTMLElement | null {
  if (isStop(el)) return el;
  return (
    Array.from(el.querySelectorAll<HTMLElement>("[data-decky-ui]")).find(
      (inner) => NAV_KINDS.has(inner.dataset.deckyUi ?? "") && isStop(inner),
    ) ?? null
  );
}

export type SteamStepOptions = {
  /**
   * Containers with no `flow-children` that Steam is known to walk as a column anyway. The one measured case: a
   * tab body's root (TabBodyFocusRoot), whose rows Down and Up walk on the Deck. Every other container with no
   * flow set walks nothing, which is what the Deck showed for the About links block (plan 92, build 5d67f9d9).
   */
  columnWhereUnset?: (container: HTMLElement) => boolean;
};

function flowOf(container: HTMLElement, opts: SteamStepOptions): Flow | null {
  const attr = container.getAttribute("flow-children");
  if (attr === "horizontal" || attr === "row") return "row";
  if (attr === "vertical" || attr === "column") return "column";
  return opts.columnWhereUnset?.(container) ? "column" : null;
}

/**
 * One D-pad press the way Steam routes it through its tree of nav nodes, not by geometry:
 *  1. the focused stop's own move handler (it may claim the press);
 *  2. then, climbing one container at a time: if the container's flow runs along the press (a column for
 *     Up/Down, a row for Left/Right), Steam moves to the next child that way that holds a stop and lands on
 *     its first stop; if not, or there is no such child, the container's own move handler gets the press;
 *     a container with no flow set moves nothing among its children;
 *  3. with no container left, nothing moves.
 * Returns where the ring is afterwards (the same element when nothing moved).
 */
export function steamStep(from: HTMLElement, direction: SteamDirection, opts: SteamStepOptions = {}): HTMLElement {
  const handler = `onMove${direction}`;
  const ringBefore = document.activeElement;
  const after = () => (document.activeElement as HTMLElement | null) ?? from;
  if (callNav(from, handler)) return ringBefore === document.activeElement ? from : after();
  const axis: Flow = direction === "Up" || direction === "Down" ? "column" : "row";
  const forward = direction === "Down" || direction === "Right";
  for (let child = from, container = navParent(from); container; child = container, container = navParent(container)) {
    if (flowOf(container, opts) === axis) {
      const siblings = navChildren(container);
      const at = siblings.indexOf(child);
      for (let i = at + (forward ? 1 : -1); at >= 0 && i >= 0 && i < siblings.length; i += forward ? 1 : -1) {
        const target = firstStopIn(siblings[i]!);
        if (target) {
          act(() => target.focus());
          return target;
        }
      }
    }
    if (callNav(container, handler)) return ringBefore === document.activeElement ? from : after();
  }
  return from;
}
