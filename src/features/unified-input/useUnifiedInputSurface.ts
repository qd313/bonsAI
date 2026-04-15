import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ASK_BAR_LAYOUT_SHIFT_RIGHT_PX,
  ASK_BAR_ROW_WIDTH_EXTRA_PX,
  UNIFIED_INPUT_EXPAND_AHEAD_PX,
  UNIFIED_INPUT_HEIGHT_PAD_PX,
  UNIFIED_TEXT_BODY_MAX_PX,
  UNIFIED_TEXT_BODY_MIN_PX,
  UNIFIED_TEXT_INSET_LEFT_PX,
  UNIFIED_TEXT_INSET_RIGHT_PX,
  UNIFIED_TEXT_INSET_TOP_PX,
} from "./constants";

export type UnifiedInputSurfaceRefs = {
  bonsaiScopeRef: React.RefObject<HTMLDivElement>;
  unifiedInputHostRef: React.RefObject<HTMLDivElement>;
  unifiedInputFieldLayerRef: React.RefObject<HTMLDivElement>;
  unifiedInputMeasureRef: React.RefObject<HTMLDivElement>;
  askBarHostRef: React.RefObject<HTMLDivElement>;
};

/**
 * Measures the hidden overlay + syncs CSS vars / Ask bar width to the real TextField geometry (Decky wrappers differ from host width).
 */
export function useUnifiedInputSurface(currentTab: string, unifiedInput: string) {
  const bonsaiScopeRef = useRef<HTMLDivElement>(null);
  const unifiedInputHostRef = useRef<HTMLDivElement>(null);
  const unifiedInputFieldLayerRef = useRef<HTMLDivElement>(null);
  const unifiedInputMeasureRef = useRef<HTMLDivElement>(null);
  const askBarHostRef = useRef<HTMLDivElement>(null);
  const askLeftCorrectionPxRef = useRef<number | null>(null);
  const lastUnifiedHostWRef = useRef(0);
  const [unifiedInputSurfacePx, setUnifiedInputSurfacePx] = useState(UNIFIED_TEXT_BODY_MIN_PX);
  const [usesNativeMultilineField, setUsesNativeMultilineField] = useState(false);

  const remeasureUnifiedInputSurface = useCallback(() => {
    const host = unifiedInputHostRef.current;
    const layer = unifiedInputFieldLayerRef.current;
    const measure = unifiedInputMeasureRef.current;
    if (!host || !measure || !host.isConnected) return;
    const hostW = host.getBoundingClientRect().width;
    const field = (layer ?? host).querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input");
    setUsesNativeMultilineField(field?.tagName === "TEXTAREA");
    const fieldCw = field && field.clientWidth > 0 ? field.clientWidth : 0;
    const textWidth = Math.max(
      0,
      fieldCw > 0 ? fieldCw - UNIFIED_TEXT_INSET_LEFT_PX - UNIFIED_TEXT_INSET_RIGHT_PX : hostW - UNIFIED_TEXT_INSET_LEFT_PX - UNIFIED_TEXT_INSET_RIGHT_PX,
    );
    const container = layer ?? measure.offsetParent ?? host;
    const cr = container.getBoundingClientRect();
    const fr = field?.getBoundingClientRect();
    const overlayLeft = field && fr ? fr.left - cr.left : UNIFIED_TEXT_INSET_LEFT_PX;
    const overlayTop = field && fr ? fr.top - cr.top : UNIFIED_TEXT_INSET_TOP_PX;
    measure.style.left = `${overlayLeft}px`;
    measure.style.top = `${overlayTop}px`;
    measure.style.width = `${textWidth}px`;
    const layerEl = (layer ?? container) as HTMLElement;
    layerEl.style.setProperty("--bonsai-unified-field-left", `${Math.round(overlayLeft * 100) / 100}px`);
    layerEl.style.setProperty("--bonsai-unified-field-top", `${Math.round(overlayTop * 100) / 100}px`);
    layerEl.style.setProperty("--bonsai-unified-field-width", `${Math.round(textWidth * 100) / 100}px`);
    const sh = measure.scrollHeight;
    const nextPx = Math.min(
      UNIFIED_TEXT_BODY_MAX_PX,
      Math.max(UNIFIED_TEXT_BODY_MIN_PX, sh + UNIFIED_INPUT_HEIGHT_PAD_PX + UNIFIED_INPUT_EXPAND_AHEAD_PX),
    );
    setUnifiedInputSurfacePx(nextPx);
    const hostWRounded = Math.round(hostW * 100) / 100;
    if (Math.abs(hostW - lastUnifiedHostWRef.current) > 0.5) {
      askLeftCorrectionPxRef.current = null;
      lastUnifiedHostWRef.current = hostW;
    }
    const askOuterW = Math.round((hostW + ASK_BAR_ROW_WIDTH_EXTRA_PX) * 100) / 100;
    bonsaiScopeRef.current?.style.setProperty("--bonsai-search-host-width", `${hostWRounded}px`);
    bonsaiScopeRef.current?.style.setProperty("--bonsai-askbar-outer-width", `${askOuterW}px`);
    if (askBarHostRef.current) {
      askBarHostRef.current.style.width = `${askOuterW}px`;
      askBarHostRef.current.style.minWidth = `${askOuterW}px`;
    }
    const askEl = askBarHostRef.current;
    if (askEl) {
      const ul = host.getBoundingClientRect().left;
      const al = askEl.getBoundingClientRect().left;
      const leftDelta = Math.round((ul - al) * 100) / 100;
      if (askLeftCorrectionPxRef.current == null && Math.abs(leftDelta) > 0.5) {
        askLeftCorrectionPxRef.current = leftDelta;
      }
      const appliedAskShift = askLeftCorrectionPxRef.current ?? 0;
      const marginLeftPx = Math.round((appliedAskShift + ASK_BAR_LAYOUT_SHIFT_RIGHT_PX) * 100) / 100;
      askEl.style.marginLeft = `${marginLeftPx}px`;
    }
  }, []);

  useLayoutEffect(() => {
    if (currentTab !== "main") return;
    remeasureUnifiedInputSurface();
  }, [unifiedInput, currentTab, remeasureUnifiedInputSurface]);

  useEffect(() => {
    if (currentTab !== "main") {
      askLeftCorrectionPxRef.current = null;
      lastUnifiedHostWRef.current = 0;
      bonsaiScopeRef.current?.style.removeProperty("--bonsai-askbar-outer-width");
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== "main") return;
    const host = unifiedInputHostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => remeasureUnifiedInputSurface());
    ro.observe(host);
    return () => ro.disconnect();
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
