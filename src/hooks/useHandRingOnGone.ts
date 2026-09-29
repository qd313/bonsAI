/**
 * Title: Hand the ring on when the control holding it goes away by itself
 *
 * Purpose: Some controls disappear without being pressed: the knowledge-base section's "Pull
 * nomic-embed-text" button is removed the moment the model lands on this Deck, whether or not the
 * player's ring was on it. Steam then has nothing holding the ring and the next press starts from
 * nowhere (plan 76 lane 2, docs/roadmap-details.md "Flow L10 findings"). This is the counterpart of
 * handRingOnWhenGone.ts, for a removal nobody pressed: a ref callback for the control (or a plain
 * wrapper around it) that, at the moment React removes it, notes whether the ring was on it, and if
 * so, once it is gone and nothing else has picked the ring up, runs the caller's hand-over.
 *
 * Used for: KnowledgeBaseSection.tsx (the meaning-search Pull button's wrapper).
 *
 * Solves: the ring left on nothing after a control's own state change took the control away.
 *
 * Does not: decide where the ring goes (the caller's `handOver` does, and must leave the container
 * through Steam's own transfer, never a bare focus() across containers); do anything when the ring was
 * elsewhere, or when the whole screen is going away with the control (a tab switch).
 *
 * How it works: React detaches a ref before it takes the element out of the page, so the ref
 * callback's null call is the last moment `elementHasGamepadFocus` can still see the ring inside the
 * old element. The hand-over then waits a beat (0 ms, and once more at 150 ms) and runs only if the
 * ring still belongs to nobody, the same guard handRingOnWhenGone.ts uses.
 */
import { useCallback, useLayoutEffect, useRef } from "react";
import { elementHasGamepadFocus, getUiDocument, uiGamepadFocusElement } from "../utils/uiDocument";

/** How long after the removal the second look happens, in case Steam re-places the ring itself first. */
const SECOND_LOOK_MS = 150;

export function useHandRingOnGone(handOver: () => void): (el: HTMLElement | null) => void {
  const elRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(true);
  const handOverRef = useRef(handOver);
  handOverRef.current = handOver;

  // Layout, not a passive effect: its cleanup must have run by the time the timers below fire when
  // the whole screen unmounts, so a tab switch is never mistaken for one control leaving.
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback((el: HTMLElement | null) => {
    if (el) {
      elRef.current = el;
      return;
    }
    const gone = elRef.current;
    elRef.current = null;
    if (!gone || !elementHasGamepadFocus(gone)) return;
    const look = () => {
      if (!mountedRef.current) return;
      const owner = uiGamepadFocusElement();
      if (owner && owner.isConnected && owner !== getUiDocument().body) return;
      handOverRef.current();
    };
    window.setTimeout(look, 0);
    window.setTimeout(look, SECOND_LOOK_MS);
  }, []);
}
