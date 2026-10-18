/**
 * Title: Steam's Focusable, as the "N earlier" list tests model it
 *
 * Purpose: The `vi.mock("@decky/ui", ...)` stand-in for the tests that draw the real transcript: Steam's
 * `Focusable` with each stop's move, activate and cancel handlers kept on the element (`__nav`), and `navRef`
 * given a `TakeFocus` that puts the ring on the container's first live child and notes the container it was
 * asked for (`taken`), so a test can say the ring arrived through Steam's own transfer and not a bare `focus()`.
 *
 * Used for: earlierListTestKit.tsx, and the `vi.mock` factory of MainTabChatTranscript.earlierByDay.test.tsx and
 * MainTabChatTranscript.searchJump.test.tsx.
 *
 * Solves: Kept apart from the kit because the factory runs while the mocked module is being loaded: a factory that
 * imported the file that draws the transcript would wait on the very module it is standing in for.
 *
 * Does not: Draw or press anything.
 */
import React from "react";

export type Dir = "Up" | "Down" | "Left" | "Right";
export type NavHandlers = Partial<Record<`onMove${Dir}` | "onActivate" | "onCancelButton", (e?: unknown) => unknown>>;
export type NavEl = HTMLElement & { __nav?: NavHandlers };

/** Every container Steam's transfer (`navRef.TakeFocus`) was asked to take the ring to, in order. */
export const taken: HTMLElement[] = [];

/** What `vi.mock("@decky/ui", ...)` returns in these tests: Steam's Focusable with the move, activate and cancel handlers kept on the element and `navRef` given Steam's TakeFocus. */
export async function deckyUiWithNavNodes() {
  const stubs = await import("./fakeDeckyUi");
  const Base = stubs.Focusable;
  /* The ring goes to the container's first live child. */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function NavFocusable(props, ref) {
      const { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, onActivate, onCancelButton, navRef, ...rest } =
        props as Record<string, unknown> & NavHandlers & { navRef?: { current: unknown } };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          (el as NavEl).__nav = { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, onActivate, onCancelButton };
          if (navRef) {
            navRef.current = {
              TakeFocus: () => {
                taken.push(el);
                // focus-patterns-allow: a test stand-in for Steam's own transfer, which lands on the container's first stop.
                const first = el.querySelector<HTMLElement>("button:not([disabled]), [tabindex]");
                /* Decky stamps tabindex="0" on a node it navigates; a row mounted a moment ago has not
                   had it yet when Steam's transfer reaches it. */
                if (!first && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
                (first ?? el).focus();
                return true;
              },
            };
          }
        }
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      };
      return <Base {...rest} ref={setRef} />;
    },
  );
  return { ...stubs, Focusable: NavFocusable };
}

