/**
 * Title: The chip with the ring takes the row (the hook)
 *
 * Purpose: The part of "the selected chip widens" that touches the screen: it learns which chip
 * Steam's ring is on, remembers how wide each chip's words need to be, reads the row's width off the
 * live row, asks planChipWiden (presetChipWiden.ts) what to do, and hands each slot the CSS length it
 * should take and each shrunk neighbour its stub words.
 *
 * Used for: the decode row (presetDecodeSlots.tsx) and the static row (MainTabPresetAnimatedChips.tsx);
 * a chip reports what it needs through `reportNeed` (presetChipButton.tsx).
 *
 * Solves: One place for the ring-follows-the-chip bookkeeping, so the two looks cannot draw the row
 * differently. It moves nothing but widths: the buttons, their order and the one that holds the ring
 * stay exactly as they are, so the ring is never lost and Left and Right still reach each neighbour.
 *
 * Does not: Move the ring, change any chip's words (a stub is drawn by the chip from the words this
 * hook names), or draw anything itself. No chip widens under a touch tap: only Steam's own ring call
 * (or a keyboard-style focus) counts as the ring, never a pointer press.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { chipStubText, planChipWiden, slotBasisCss, type ChipWidenPlan } from "./presetChipWiden";
import { PRESET_CHIP_GAP_PX } from "./presetRowLayout";

/** What a chip tells the row: for these words, the width they need on one line (null once they are gone). */
export type ChipNeedListener = (text: string, needPx: number | null) => void;

/**
 * Whether a DOM focus is the ring and not a pointer press. A mouse or finger press focuses a button
 * too, but never matches `:focus-visible`; a browser that does not know the selector says yes, which
 * is the old behaviour (every focus counts).
 */
function focusIsRing(el: Element): boolean {
  try {
    // focus-patterns-allow: asking the focused chip itself how it got focus, not searching for a target.
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

function samePlan(a: ChipWidenPlan | null, b: ChipWidenPlan | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.selected === b.selected &&
    a.widthPx.every((w, i) => Math.abs(w - b.widthPx[i]!) < 0.5) &&
    a.stubbed.every((s, i) => s === b.stubbed[i])
  );
}

export type PresetChipWiden = {
  /** Focus and ring handlers for the chip button in slot `i`, spread next to its move handlers. */
  ringHandlers: (i: number) => Record<string, unknown>;
  /** Ref for the slot's box; the first one's parent is the row, whose width is read. */
  slotRef: (i: number) => (el: HTMLElement | null) => void;
  /** The slot's style: its CSS length, as a custom property section-4.ts reads. */
  slotStyle: (i: number) => React.CSSProperties;
  /** The words a shrunk chip shows in place of its own, or null when it shows them all. */
  stubFor: (i: number) => string | null;
  /** The listener slot `i`'s chip reports its needed width on. */
  reportNeed: (i: number) => ChipNeedListener;
  /** True while a chip holds the row open. */
  open: boolean;
};

/**
 * `texts` are the words now in each slot (the real words, never a stub); `count` is how many slots
 * the row has.
 */
export function usePresetChipWiden(texts: readonly string[], count: number): PresetChipWiden {
  const [ring, setRing] = useState<number | null>(null);
  const [plan, setPlan] = useState<ChipWidenPlan | null>(null);
  const [version, setVersion] = useState(0);
  const needs = useRef(new Map<number, { text: string; px: number }>());
  const slotEls = useRef<(HTMLElement | null)[]>([]);
  const textsRef = useRef(texts);
  textsRef.current = texts;
  const textsKey = texts.join("\u0001");

  const ringHandlers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const enter = () => setRing(i);
        const leave = () => setRing((now) => (now === i ? null : now));
        return {
          onGamepadFocus: enter,
          onGamepadBlur: leave,
          onFocus: (e: React.FocusEvent<HTMLElement>) => {
            if (focusIsRing(e.currentTarget)) enter();
          },
          onBlur: leave,
        } as Record<string, unknown>;
      }),
    [count],
  );
  const slotRefs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => (el: HTMLElement | null) => {
        slotEls.current[i] = el;
      }),
    [count],
  );
  const reporters = useMemo(
    () =>
      Array.from({ length: count }, (_, i): ChipNeedListener => (text, px) => {
        const known = needs.current.get(i);
        if (px === null) {
          if (known?.text === text) {
            needs.current.delete(i);
            setVersion((v) => v + 1);
          }
          return;
        }
        if (known && known.text === text && Math.abs(known.px - px) < 0.5) return;
        needs.current.set(i, { text, px });
        setVersion((v) => v + 1);
      }),
    [count],
  );

  // After every ring move, new words or new measurement: read the row and plan again.
  useLayoutEffect(() => {
    const row = slotEls.current[0]?.parentElement;
    const needPx = textsRef.current.map((t, i) => {
      const known = needs.current.get(i);
      return known && known.text === t ? known.px : null;
    });
    const next = planChipWiden({ ringIndex: ring, needPx, rowPx: row?.clientWidth ?? 0, gapPx: PRESET_CHIP_GAP_PX });
    setPlan((prev) => (samePlan(prev, next) ? prev : next));
  }, [ring, version, textsKey, count]);

  const slotStyle = (i: number): React.CSSProperties =>
    ({ ["--bonsai-chip-basis" as string]: slotBasisCss(plan, i, count, PRESET_CHIP_GAP_PX) }) as React.CSSProperties;
  const stubFor = (i: number): string | null =>
    plan?.stubbed[i] && texts[i] !== undefined ? chipStubText(texts[i]!) : null;

  return {
    ringHandlers: (i) => ringHandlers[i] ?? {},
    slotRef: (i) => slotRefs[i]!,
    slotStyle,
    stubFor,
    reportNeed: (i) => reporters[i]!,
    open: plan !== null,
  };
}
