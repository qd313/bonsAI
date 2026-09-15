/**
 * Title: Lining up the fake caret with the real question box
 *
 * Purpose: The Main tab's question box is drawn as two layers: an
 * invisible native text field that the Deck's own on-screen keyboard and
 * text handling actually type into, and a visible copy of the typed text
 * with a blinking caret drawn on top of it, positioned to sit exactly over
 * the real field. This file measures where the real field actually landed
 * on screen — because the layer Decky wraps it in does not always start in
 * the same place the field itself does — and moves the visible copy to
 * match. It also grows the box taller as the typed question wraps onto
 * more lines.
 *
 * Used for: The Main tab's question box and the caret drawn over it.
 *
 * Solves: On the Deck, the drawn caret and the drawn text used to drift
 * away from where the real, invisible field actually was, because the
 * wrapping layer Decky puts around the native field does not always start
 * at the same point the field itself does. Measuring the real field
 * directly, every time it might have moved, is what keeps the two in
 * sync.
 *
 * Does not: Decide the width of the Ask row or the card around it — both
 * simply fill their container; see section-4.ts. Does not handle
 * submitting the question — see useBonsaiAskOrchestration.
 */
/** Main-tab unified input geometry: the overlay must land on the native field, which Decky's wrapper can offset. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  UNIFIED_INPUT_HEIGHT_PAD_PX,
  UNIFIED_TEXT_BODY_MAX_PX,
  UNIFIED_TEXT_BODY_MIN_PX,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_INSET_LEFT_PX,
  UNIFIED_TEXT_INSET_TOP_PX,
  UNIFIED_TEXT_OVERLAY_FALLBACK_FONT_FAMILY,
  UNIFIED_TEXT_OVERLAY_FALLBACK_OVERFLOW_WRAP,
  UNIFIED_TEXT_OVERLAY_FALLBACK_WHITE_SPACE,
} from "./constants";
import { readUiScaleFromElement } from "../../data/uiScaleProfile";

/**
 * Measures the hidden overlay + the native field's painted bounds so the caret overlay aligns with typed text.
 */
export function useUnifiedInputSurface(currentTab: string, unifiedInput: string) {
  const bonsaiScopeRef = useRef<HTMLDivElement>(null);
  const unifiedInputHostRef = useRef<HTMLDivElement>(null);
  const unifiedInputFieldLayerRef = useRef<HTMLDivElement>(null);
  const unifiedInputMeasureRef = useRef<HTMLDivElement>(null);
  const askBarHostRef = useRef<HTMLDivElement>(null);
  /** Tab id can change between RO/RAF ticks; never remeasure Ask when not on main (avoids tab-switch flicker). */
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;
  const [unifiedInputSurfacePx, setUnifiedInputSurfacePx] = useState(UNIFIED_TEXT_BODY_MIN_PX);
  const [usesNativeMultilineField, setUsesNativeMultilineField] = useState(false);

  const remeasureUnifiedInputSurface = useCallback(() => {
    if (currentTabRef.current !== "main") return;
    const host = unifiedInputHostRef.current;
    const layer = unifiedInputFieldLayerRef.current;
    const measure = unifiedInputMeasureRef.current;
    if (!host || !measure || !host.isConnected) return;
    const hostW = host.getBoundingClientRect().width;
    /* Mid-carousel / first-paint widths are bogus and cause a visible Ask-row snap (tab switch). */
    if (hostW < 40) return;
    const field = (layer ?? host).querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
    setUsesNativeMultilineField(field?.tagName === "TEXTAREA");
    /*
     * Measure against the element the overlay is actually positioned against, not `layer`.
     *
     * The overlay and this measure div are siblings, so they share a positioning context —
     * `.bonsai-unified-input-text-box`, which starts where the field starts. `layer` sits further
     * out, and the gap between the two is the avatar slot (18px + 6px margins). Measuring against
     * `layer` and then positioning against the text box pushed the placeholder ~24px right of the
     * real caret (measured on device 2026-08-12: field text at x=100.7, overlay text at x=124.7).
     */
    const container = (measure.offsetParent as HTMLElement | null) ?? layer ?? host;
    const cr = container.getBoundingClientRect();
    const fr = field?.getBoundingClientRect();
    /*
     * `getBoundingClientRect().width`, not `clientWidth` -- clientWidth rounds to an integer pixel
     * and excludes the border, so it can read narrower than what the field actually renders at.
     * Measured on device 2026-09-04 (roadmap: "The question overlay sits a few pixels off the
     * native text field"): field border-box 274.463px, rounded clientWidth 274px. A mirror sized
     * from the rounded number wraps a long line one character sooner than the real field does,
     * which is what drifted the caret and typed-text overlay on a three-line question.
     */
    const fieldCw = fr && fr.width > 0 ? fr.width : 0;
    const textWidth = Math.max(0, fieldCw > 0 ? fieldCw : hostW);
    const overlayLeft = field && fr ? fr.left - cr.left : UNIFIED_TEXT_INSET_LEFT_PX;
    const overlayTop = field && fr ? fr.top - cr.top : UNIFIED_TEXT_INSET_TOP_PX;
    measure.style.left = `${overlayLeft}px`;
    measure.style.top = `${overlayTop}px`;
    measure.style.width = `${textWidth}px`;
    const layerEl = (layer ?? container) as HTMLElement;
    layerEl.style.setProperty("--bonsai-unified-field-left", `${Math.round(overlayLeft * 100) / 100}px`);
    layerEl.style.setProperty("--bonsai-unified-field-top", `${Math.round(overlayTop * 100) / 100}px`);
    layerEl.style.setProperty("--bonsai-unified-field-width", `${Math.round(textWidth * 100) / 100}px`);
    /*
     * Copy the field's own wrapping and font stack onto the mirrors rather than letting them
     * declare their own. Measured on device 2026-09-04: the field's `white-space` and
     * `overflow-wrap` come out as `normal` (no mid-word wrap) while the mirrors had hard-coded
     * `pre-wrap` / `anywhere`, and the field's font-family stack omits "Arial" where the mirrors'
     * ambient inheritance includes it -- dormant while Motiva Sans is installed, but not on a Deck
     * where it is missing. Reading the live field is the only way this cannot drift again: these
     * values are not something bonsAI's own CSS sets on the field to begin with.
     */
    const fieldStyle = field ? window.getComputedStyle(field) : null;
    layerEl.style.setProperty(
      "--bonsai-unified-field-white-space",
      fieldStyle?.whiteSpace || UNIFIED_TEXT_OVERLAY_FALLBACK_WHITE_SPACE,
    );
    layerEl.style.setProperty(
      "--bonsai-unified-field-overflow-wrap",
      fieldStyle?.overflowWrap || UNIFIED_TEXT_OVERLAY_FALLBACK_OVERFLOW_WRAP,
    );
    layerEl.style.setProperty(
      "--bonsai-unified-field-font-family",
      fieldStyle?.fontFamily || UNIFIED_TEXT_OVERLAY_FALLBACK_FONT_FAMILY,
    );
    const sh = measure.scrollHeight;
    const uiScale = readUiScaleFromElement(bonsaiScopeRef.current);
    const bodyMinPx = UNIFIED_TEXT_BODY_MIN_PX * uiScale;
    const bodyMaxPx = UNIFIED_TEXT_BODY_MAX_PX * uiScale;
    const expandAheadPx = Math.ceil(UNIFIED_TEXT_FONT_PX * uiScale * 1.2);
    const heightPadPx = UNIFIED_INPUT_HEIGHT_PAD_PX * uiScale;
    const nextPx = Math.min(
      bodyMaxPx,
      Math.max(bodyMinPx, sh + heightPadPx + expandAheadPx),
    );
    setUnifiedInputSurfacePx(nextPx);
    /*
     * The Ask row is NOT sized from this measurement any more (2026-08-15). It used to take
     * `hostW - 1px` as a fixed width plus a measured left-edge correction, which made it the one
     * row that could not track the panel: any sample taken mid-carousel, at first paint, or before
     * a padding change settled froze the Ask bar narrower than every neighbouring row, and the
     * user saw it as "the Ask button does not span the panel". It and the unified host are sibling
     * PanelSectionRow children of one column, so `width: 100%` on both makes them equal by
     * construction — no sample to go stale, no correction to compound. See section-4.ts.
     *
     * What still needs measuring is only the *caret overlay* geometry above: the fake caret and the
     * typed-text overlay must sit exactly on the native field, and that offset is not derivable
     * from CSS.
     */
  }, []);

  useLayoutEffect(() => {
    if (currentTab !== "main") return;
    remeasureUnifiedInputSurface();
  }, [unifiedInput, remeasureUnifiedInputSurface]);

  /** Tab changes only: defer remeasure until after layout/carousel settles (avoids Ask bar flash). */
  useLayoutEffect(() => {
    if (currentTab !== "main") return;
    let rafOuter = 0;
    let rafInner = 0;
    let cancelled = false;
    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        if (!cancelled) remeasureUnifiedInputSurface();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
    };
  }, [currentTab, remeasureUnifiedInputSurface]);

  useEffect(() => {
    if (currentTab !== "main") return;
    const host = unifiedInputHostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    let roRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(() => {
        roRaf = 0;
        remeasureUnifiedInputSurface();
      });
    });
    ro.observe(host);
    return () => {
      cancelAnimationFrame(roRaf);
      ro.disconnect();
    };
  }, [currentTab, remeasureUnifiedInputSurface]);

  return {
    bonsaiScopeRef,
    unifiedInputHostRef,
    unifiedInputFieldLayerRef,
    unifiedInputMeasureRef,
    askBarHostRef,
    unifiedInputSurfacePx,
    usesNativeMultilineField,
    remeasureUnifiedInputSurface,
  };
}
