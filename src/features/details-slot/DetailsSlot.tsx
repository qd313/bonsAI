/**
 * Title: The chip slot above the question box, and the Show details line that can take it over
 *
 * Purpose: While a person reads an answer whose own Show details line is out of sight, that line
 * sits in the suggestion chip's place above the question box; when the real line is on screen, or
 * the person has scrolled past that answer, the chip is back (plan 79, drawn in
 * details-line-swap.html; the maintainer picked way 2, the 120 ms cross-fade).
 *
 * Used for: MainTabPresetRow.tsx wraps the suggestion chips in `DetailsSlot`.
 *
 * How it works:
 * 1. `useDetailsSlotFace()` measures on every scroll of the panel (one capturing listener on the
 *    panel's own document), whenever the real line re-registers (it opens, closes, greys), and on a
 *    slow 300 ms tick for layout changes nothing else reports. Each pass reads five boxes and applies
 *    detailsSlotStore's `slotShouldShowLine()`.
 * 2. Both faces are always drawn, stacked in one grid cell, so the dock never changes height and the
 *    chips keep their own fade cycle underneath. The face going away fades out over the tab bar's
 *    120 ms and is then hidden (visibility). That hides it from a person but NOT from Steam: Steam's
 *    own step reads no CSS, and on the Deck (plan81-QA-FREE-PLAY-01-NOGAME.json) Down from the answer's
 *    Show details landed on the hidden chip. So every Down that enters the slot is claimed
 *    and handed in through Steam's transfer (detailsSlotStore's slot helpers), never left to Steam's own
 *    step. With reduced motion the swap
 *    is instant (styles/sections/detailsSlot.ts).
 * 3. The line is its own Focusable with a registered stop ("details-slot-line"). A runs the real
 *    line's handler (detailsSlotStore's `pressDetailsSlotLine()`); Up leaves the way Up from a chip
 *    does (`chipRowExitUp()`); Down goes to the question box; Left and Right are claimed so Steam
 *    does not walk out of the plugin to the Quick Access rail, as the chips do at their ends.
 * 4. A swap while the ring is in the slot keeps the ring in the slot: it is handed, through Steam's
 *    own transfer, to whichever face replaces the one it was on.
 *
 * Does not: Open the details itself (the real line's own handler does, in the chat under that
 * line), and B is left to Steam on the slot, as it is on a chip.
 */
import React, { useEffect, useRef, useState } from "react";
import { Focusable } from "@decky/ui";
import { chipRowExitUp } from "../preset-carousel/presetRowFocusNav";
import { findScrollablePanel, readableBottomOf } from "../../utils/chatPanelScroll";
import { registerNavFocus, takeNavFocus, unregisterNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { uiGamepadFocusElement } from "../../utils/uiDocument";
import {
  currentDetailsLine,
  pressDetailsSlotLine,
  setSlotShowsLine,
  slotShouldShowLine,
  subscribeDetailsLine,
} from "./detailsSlotStore";

/** How often the slot re-measures with no scroll: an answer finishing or a panel opening moves boxes too. */
const DETAILS_SLOT_TICK_MS = 300;

type SlotFace = { showLine: boolean; open: boolean };

/** One measurement: what the slot should hold, given where the chat is scrolled right now. */
function measureFace(host: HTMLElement | null, showingNow: boolean): SlotFace {
  const line = currentDetailsLine();
  const pane = findScrollablePanel(host);
  if (!line || line.disabled || !line.toggle || !pane) return { showLine: false, open: false };
  const turn = (line.el.closest(".bonsai-chat-turn-slot") as HTMLElement | null) ?? line.el;
  const lineBox = line.el.getBoundingClientRect();
  const turnBox = turn.getBoundingClientRect();
  const showLine = slotShouldShowLine(
    {
      bandTop: pane.getBoundingClientRect().top,
      bandBottom: readableBottomOf(pane),
      turnTop: turnBox.top,
      turnBottom: line.open ? turnBox.bottom : lineBox.bottom,
      lineTop: lineBox.top,
      lineBottom: lineBox.bottom,
    },
    showingNow,
  );
  return { showLine, open: line.open };
}

function useDetailsSlotFace(hostRef: React.RefObject<HTMLElement | null>): SlotFace {
  const [face, setFace] = useState<SlotFace>({ showLine: false, open: false });
  const showingRef = useRef(false);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = measureFace(hostRef.current, showingRef.current);
      showingRef.current = next.showLine;
      setSlotShowsLine(next.showLine);
      setFace((prev) => (prev.showLine === next.showLine && prev.open === next.open ? prev : next));
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const doc = hostRef.current?.ownerDocument ?? document;
    doc.addEventListener("scroll", soon, { capture: true, passive: true });
    const unsubscribe = subscribeDetailsLine(soon);
    const tick = window.setInterval(measure, DETAILS_SLOT_TICK_MS);
    measure();
    return () => {
      doc.removeEventListener("scroll", soon, { capture: true });
      unsubscribe();
      window.clearInterval(tick);
      if (frame) cancelAnimationFrame(frame);
      setSlotShowsLine(false);
    };
  }, [hostRef]);
  return face;
}

/** The slot's copy of the line: same words and same handler as the real one, the inset ring. */
function DetailsSlotLine(props: { shown: boolean; open: boolean; onMoveDown: () => unknown; lineRef: React.Ref<HTMLDivElement> }) {
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("details-slot-line", navRef);
    return () => unregisterNavFocus("details-slot-line", navRef);
  }, []);
  const label = props.open ? "Hide details ↑" : "Show details ↓";
  const press = () => {
    pressDetailsSlotLine();
  };
  return (
    <Focusable
      ref={props.lineRef}
      className={`bonsai-details-slot__line${props.shown ? " bonsai-details-slot__line--shown" : ""}`}
      aria-hidden={!props.shown}
      aria-label={props.open ? "Hide details" : "Show details"}
      onOKButton={press}
      onClick={press}
      {...({
        navRef,
        onMoveUp: () => chipRowExitUp(),
        onMoveDown: () => props.onMoveDown() === true,
        onMoveLeft: () => true,
        onMoveRight: () => true,
      } as Record<string, unknown>)}
    >
      <span className="bonsai-details-slot__rule" />
      <span className="bonsai-details-slot__label">{label}</span>
      <span className="bonsai-details-slot__rule" />
    </Focusable>
  );
}

/**
 * In: the chips (children) and the Ask field's focus handover for Down.
 * Out: the slot, holding the chips or this answer's Show details line.
 */
export function DetailsSlot(props: { children: React.ReactNode; focusUnifiedTextField: () => unknown }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const { showLine, open } = useDetailsSlotFace(rootRef);

  /* The ring never stays on a face that is going away: hand it to the one replacing it. */
  const shownBefore = useRef(showLine);
  useEffect(() => {
    if (shownBefore.current === showLine) return;
    shownBefore.current = showLine;
    const ring = uiGamepadFocusElement();
    const leaving = showLine ? chipsRef.current : lineRef.current;
    if (!ring || !leaving?.contains(ring)) return;
    takeNavFocus(showLine ? "details-slot-line" : "preset-carousel");
  }, [showLine]);

  return (
    <div ref={rootRef} className="bonsai-details-slot">
      <div
        ref={chipsRef}
        className={`bonsai-details-slot__chips${showLine ? " bonsai-details-slot__chips--away" : ""}`}
      >
        {props.children}
      </div>
      <DetailsSlotLine shown={showLine} open={open} onMoveDown={props.focusUnifiedTextField} lineRef={lineRef} />
    </div>
  );
}
