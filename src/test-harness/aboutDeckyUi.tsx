/**
 * Title: Steam's focus controls, kept faithful enough to press the About tab's D-pad
 * Purpose: Stand-ins for @decky/ui's `Focusable`, `Button` and `Dropdown` for the About tab's tests (plan 92,
 *          lane T3). The shared fakes (fakeDeckyUi.tsx) throw Steam's move and focus handlers away; the About
 *          tab's rows are driven by exactly those (`onGamepadFocus` / `onGamepadBlur` open a row's text,
 *          `onMoveRight` / `onMoveLeft` / `onMoveDown` walk the links), so these keep every one of them on the
 *          element (`__nav`) for a test to call the way Steam does. Each is a stop the way Decky makes one:
 *          `tabindex="0"`, and a Focusable marked `focusable` is a real stop (`data-steam-stop`).
 * Used for: AboutTab.test.tsx, AboutLinks.test.tsx, AboutTab.walk.test.tsx.
 * Does not: Walk Steam's spatial navigation (AboutTab.walk.test.tsx models that itself), or fire a handler on its
 *           own: `callNav` presses one.
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
  _props,
  ref,
) {
  return <div ref={ref} tabIndex={0} data-decky-ui="Dropdown" data-steam-stop="true" />;
});

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
