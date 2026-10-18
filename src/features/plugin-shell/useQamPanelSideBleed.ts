/**
 * Title: QAM panel side bleed
 * Purpose: Zero horizontal padding and fixed side margins on every ancestor between `.bonsai-scope`
 *          and the Steam QAM tab pane, so plugin rows reach the panel edges.
 * Used for: index.tsx `.bonsai-scope`, alongside useQamPanelHeightGuard.
 * Solves: Rows stopping short of the QAM edges because a Steam/Decky ancestor carries side padding
 *         that bonsAI's stylesheet cannot name — the last cause of the "Unified input + Ask bar no
 *         longer span QAM width" bug once bonsAI's own insets were removed.
 * Does not: Set any row's width (that is `width: 100%` in section-4.ts), touch vertical spacing
 *           (see useQamPanelHeightGuard), or walk above the tab pane — Steam chrome outside the
 *           plugin's own pane is left alone.
 */
import { useLayoutEffect, useRef } from "react";
import { findQamTabHost } from "./useQamPanelHeightGuard";
import { bonsaiDebugLog } from "../developer/bonsaiDebugIngest";

/** Ignore sub-pixel rounding; only real gutters are worth writing an inline style for. */
const MIN_MEANINGFUL_PX = 0.5;

/**
 * A margin of `auto` centres the panel — zeroing it would move the panel rather than widen our
 * content, so only fixed px margins are cleared.
 */
function fixedMarginPx(value: string): number {
  if (!value || value === "auto") return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Clear one ancestor's horizontal inset. Returns the px reclaimed, 0 if it had none —
 * so a chain that is already flush writes no inline styles at all.
 */
function clearSideInset(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const padding = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const margin = fixedMarginPx(cs.marginLeft) + fixedMarginPx(cs.marginRight);
  const reclaimed = padding + margin;
  if (reclaimed < MIN_MEANINGFUL_PX) return 0;
  if (padding >= MIN_MEANINGFUL_PX) {
    el.style.paddingLeft = "0px";
    el.style.paddingRight = "0px";
  }
  if (margin >= MIN_MEANINGFUL_PX) {
    if (fixedMarginPx(cs.marginLeft) > 0) el.style.marginLeft = "0px";
    if (fixedMarginPx(cs.marginRight) > 0) el.style.marginRight = "0px";
  }
  return reclaimed;
}

function describe(el: HTMLElement): string {
  const cls = (el.className?.toString() ?? "").trim().split(/\s+/)[0] ?? "";
  return el.tagName.toLowerCase() + (cls ? "." + cls : "");
}

/**
 * Walk scope -> tab pane inclusive, clearing side insets. Bails when the pane cannot be found
 * rather than walking to `<body>`: an unbounded walk would strip padding from Steam's own chrome.
 */
function bleedScopeChain(scope: HTMLElement): { total: number; touched: string[] } {
  const host = findQamTabHost(scope);
  if (!host) return { total: 0, touched: [] };

  let total = 0;
  const touched: string[] = [];
  let walker: HTMLElement | null = scope;
  /* Bounded so a DOM shape we did not anticipate cannot spin: the pane is ~2-6 levels up. */
  for (let depth = 0; walker && depth < 12; depth += 1) {
    const reclaimed = clearSideInset(walker);
    if (reclaimed > 0) {
      total += reclaimed;
      touched.push(`${describe(walker)}=${Math.round(reclaimed * 100) / 100}px`);
    }
    if (walker === host) break;
    walker = walker.parentElement;
  }
  return { total, touched };
}

/**
 * Give plugin rows the panel's full width by removing ancestor side insets bonsAI's CSS cannot
 * reach. Re-applies on the same signals as the height guard, because Steam re-renders the pane
 * on tab switches and drops inline styles with it.
 */
export function useQamPanelSideBleed(scopeRef: React.RefObject<HTMLDivElement | null>): void {
  const loggedRef = useRef(false);

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const apply = () => {
      const { total, touched } = bleedScopeChain(scope);
      /* Log the first pass that actually reclaims something: if a gutter survives on device this
         says whether the walk found nothing, or cleared insets and something else is at fault. */
      if (!loggedRef.current && touched.length > 0) {
        loggedRef.current = true;
        bonsaiDebugLog("useQamPanelSideBleed", "cleared QAM ancestor side inset", "ASK-WIDTH-01", {
          totalPx: Math.round(total * 100) / 100,
          touched,
        });
      }
    };

    let raf = 0;
    let settleRaf = 0;

    const scheduleSettle = () => {
      cancelAnimationFrame(settleRaf);
      settleRaf = requestAnimationFrame(() => {
        settleRaf = requestAnimationFrame(apply);
      });
    };

    apply();
    scheduleSettle();

    /* Steam swaps the pane on tab switch, taking inline styles with it; re-assert cheaply on the
       same pointer signals the height guard already uses rather than adding another observer. */
    const onPointer = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    scope.addEventListener("pointerenter", onPointer);
    scope.addEventListener("pointermove", onPointer, { passive: true });

    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => onPointer());
    ro?.observe(scope);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(settleRaf);
      ro?.disconnect();
      scope.removeEventListener("pointerenter", onPointer);
      scope.removeEventListener("pointermove", onPointer);
    };
  }, [scopeRef]);
}
