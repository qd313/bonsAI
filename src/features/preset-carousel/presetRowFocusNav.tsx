/**
 * Title: Preset row focus container and D-pad graph
 *
 * Purpose: The two pieces every animation mode shares for moving the gamepad ring around the
 * suggestion chips: PresetRowFocusRoot, the focus container Steam treats as the row's own
 * navigation boundary, and usePresetRowNav, the D-pad graph (Left/Right/Up/Down handlers, the
 * "ran out of chips" edge cue) for whichever chips are showing.
 *
 * Used for: MainTabPresetAnimatedChipsInner, MainTabPresetDecodeSlots and
 * MainTabPresetSidewaysCarousel, all in src/components/MainTabPresetAnimatedChips.tsx.
 *
 * Solves: Left/Right move DOM focus between siblings of one container (safe with a plain
 * `focus()`); Down and Up hand the ring across a container boundary, which needs the registered
 * handover (`navFocusRegistry`) instead — one hook gives every animation mode both without
 * re-deriving which is which.
 *
 * Does not: Decide what the chips show or how a new one arrives — see presetChipButton.tsx and
 * the animation-mode components in MainTabPresetAnimatedChips.tsx.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Focusable } from "@decky/ui";
import { buildChipNavHandlers } from "./presetRowNav";
import { PRESET_CHIP_BLOCKED_EDGE_FLASH_MS } from "./presetRowLayout";
import { registerNavFocus, unregisterNavFocus, takeNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { focusBottomOfNewestReply } from "../../utils/liveTurnFocusGraph";

/**
 * The row's focus container, shared by every mode. Steam treats it as one navigation container;
 * the chips inside carry their own Left/Right/Up/Down handlers (`usePresetRowNav`), because the
 * `flow-children` hint on its own left Steam navigating the row as a column on device.
 *
 * `navRef` is what lets the Ask bar hand the ring up across that boundary. Steam populates it with
 * the container's nav node, which is the only supported way to move the gamepad ring between
 * containers — a plain `focus()` moves `activeElement` and leaves the ring where it was
 * (navFocusRegistry, measured 2026-08-04). That split is what put a ring on a chip while the D-pad
 * was really on the tab strip, found on device 2026-08-28. Before 2026-09-01 only carousel mode
 * registered; the other modes fell back to the plain `focus()` and inherited that bug.
 */
export function PresetRowFocusRoot(props: {
  className: string;
  children: React.ReactNode;
  /**
   * Fires when the ring enters the row from outside it (the Ask field's Up, the strip's Down), not
   * on moves between chips. The carousel uses it to land on its marked chip: Steam enters a
   * container at its first focusable child, which is the older of the two on screen.
   */
  onEnterFromOutside?: () => void;
}) {
  const navRef = useRef<NavRefHolder["current"]>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    registerNavFocus("preset-carousel", navRef);
    return () => unregisterNavFocus("preset-carousel", navRef);
  }, []);
  const { onEnterFromOutside } = props;
  const onFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (!onEnterFromOutside) return;
      const from = e.relatedTarget as Node | null;
      if (from && rootRef.current?.contains(from)) return;
      onEnterFromOutside();
    },
    [onEnterFromOutside],
  );
  return (
    <Focusable
      ref={rootRef}
      /* `navRef` is a real Steam Focusable prop that Decky's types omit — same gap as `onMoveDown`,
         so it goes through the cast the repo already uses for those (SessionContextStrip). */
      {...({ navRef } as Record<string, unknown>)}
      flow-children="horizontal"
      className={`bonsai-preset-carousel-focus-root ${props.className}`}
      onFocus={onFocus}
    >
      {props.children}
    </Focusable>
  );
}

/**
 * The D-pad graph for the chips, the same shape as the Ask bar's buttons: each chip carries its own
 * Left/Right/Up/Down handlers, spread onto the Decky Button through the cast the repo uses for the
 * Steam props Decky's types omit. Steam treats a Focusable as a column unless told otherwise, and
 * the `flow-children="horizontal"` hint alone did not change that on device (2026-09-01): Left left
 * the plugin for the Quick Access rail and Down/Up walked between chips. Left/Right move DOM focus
 * between siblings of this one container, which is the one case a plain `focus()` is right for;
 * Down and Up hand the ring across a container boundary through the registered handovers.
 *
 * `maxCount` sizes the ref array once so the ref callbacks keep their identity across renders.
 */
export function usePresetRowNav(
  maxCount: number,
  exitDown?: () => boolean | void,
  options?: {
    /** False for a chip that is rendered but not a focus stop right now (a carousel chip outside the window). */
    isFocusable?: (index: number) => boolean;
    /** Bring a chip that is not a focus stop yet into the window; the caller focuses it once it is. */
    requestFocus?: (index: number) => boolean;
    /** Right at the last chip; see buildChipNavHandlers and carouselState.nextFrozenHistoryEntry. */
    advanceAtEnd?: () => boolean;
  },
) {
  const buttonRefs = useRef<(HTMLElement | null)[]>(Array.from({ length: maxCount }, () => null));
  const setButtonRef = useMemo(
    () =>
      Array.from({ length: maxCount }, (_, i) => (el: HTMLElement | null) => {
        buttonRefs.current[i] = el;
      }),
    [maxCount],
  );
  const isFocusable = options?.isFocusable;
  const requestFocus = options?.requestFocus;
  const advanceAtEnd = options?.advanceAtEnd;
  const focusChip = useCallback(
    (i: number): boolean => {
      if (isFocusable && !isFocusable(i)) return requestFocus ? requestFocus(i) : false;
      const el = buttonRefs.current[i];
      if (!el) return false;
      el.focus();
      return true;
    },
    [isFocusable, requestFocus],
  );
  /*
   * Which chip, if any, should show the "ran out of chips" edge cue right now (roadmap `[chips]`
   * ★★, filed 2026-09-04). `buildChipNavHandlers`' `onBlockedEdge` fires only on a Left/Right press
   * that was claimed *without moving anything* -- exactly the case that used to leave the screen
   * looking identical to a stall. A timeout clears it after PRESET_CHIP_BLOCKED_EDGE_FLASH_MS so a
   * second press at the same edge always restarts the cue rather than extending one already
   * running out.
   */
  const [blockedEdgeChip, setBlockedEdgeChip] = useState<{ index: number; token: number } | null>(null);
  const blockedEdgeTimeoutRef = useRef<number | null>(null);
  const flagBlockedEdge = useCallback((index: number) => {
    if (blockedEdgeTimeoutRef.current !== null) window.clearTimeout(blockedEdgeTimeoutRef.current);
    setBlockedEdgeChip((prev) => ({ index, token: (prev?.token ?? 0) + 1 }));
    blockedEdgeTimeoutRef.current = window.setTimeout(() => {
      setBlockedEdgeChip(null);
      blockedEdgeTimeoutRef.current = null;
    }, PRESET_CHIP_BLOCKED_EDGE_FLASH_MS);
  }, []);
  useEffect(
    () => () => {
      if (blockedEdgeTimeoutRef.current !== null) window.clearTimeout(blockedEdgeTimeoutRef.current);
    },
    [],
  );
  const handlersFor = useCallback(
    (index: number, count: number): Record<string, unknown> =>
      buildChipNavHandlers({
        index,
        count,
        focusChip,
        exitDown: () => exitDown?.() === true,
        // The lowest stop of the newest reply is what sits above the dock whenever a reply is on
        // screen; with no reply at all (an empty chat), fall back to the always-mounted chat slot
        // row (ChatSlotRow.tsx) rather than let Steam's own navigation take over. D58 #2, measured
        // 2026-09-03: leaving that unclaimed made Steam's own multi-step fallback walk one chip
        // to the left per Up press -- four wasted presses before a fifth finally reached the slot
        // row (runs/PRESET-ROW-up-from-chips-probe.json). Trying both here, in order, claims the
        // move on the first press instead.
        //
        // This used to aim at the session context strip, which really was the last stop above the
        // dock -- until plan 62 3c folded that strip into the Show details panel as a tab and
        // removed it. Nothing has been registered under that name since, so the first half always
        // reported false and every Up press fell through to the chat slot row, stepping over the
        // whole reply. Measured on the Deck 2026-09-21, roadmap: "Walking up from the question box
        // skips every reply row".
        exitUp: () => focusBottomOfNewestReply() || takeNavFocus("chat-slot-row"),
        advanceAtEnd,
        onBlockedEdge: () => flagBlockedEdge(index),
      }) as unknown as Record<string, unknown>,
    [focusChip, exitDown, advanceAtEnd, flagBlockedEdge],
  );
  /** True for the one chip that should carry the edge-cue class right now. */
  const isBlockedEdge = useCallback((index: number) => blockedEdgeChip?.index === index, [blockedEdgeChip]);
  return { setButtonRef, handlersFor, focusChip, isBlockedEdge };
}
