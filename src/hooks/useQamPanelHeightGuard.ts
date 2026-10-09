/**
 * Title: QAM panel height guard
 * Purpose: Pin Steam QAM tab pane height and flex column chain to prevent gamescope panel sag on hover.
 * Used for: index.tsx `.bonsai-scope` alongside useTabStripBodyOffset.
 * Solves: Shrinking or jumping QAM content area when pointer enters the plugin panel. Also keeps
 *         the ResizeObserver pointed at the live TabContentsScroll, which Steam replaces on every
 *         tab switch. And plan 84 step 6: while Decky's bar is reshaped for the tab bar in Steam's
 *         strip, the header changes height with the tab (and when it is applied or undone), so the
 *         lock re-measures on every such change, against Decky's own page, whose bottom is the
 *         screen's (deckyHeaderShape.ts gives it back the 14 points it moved up). Measured on the Deck
 *         2026-10-08 without this: the panel ended 14 points short, and did not notice a tab switch.
 * Does not: Measure tab strip reserve — see useTabStripBodyOffset and tabBodyViewport.
 */
import { useLayoutEffect, useRef } from "react";
import { deckyPageWhileReshaped, subscribeDeckyHeader } from "../features/chat-title/deckyHeaderShape";
import { syncTabBodyViewportHeight } from "../utils/tabBodyViewport";

const QAM_HOST_MIN_PX = 320;
const QAM_HOST_MAX_PX = 1200;
const CRUSHED_SCOPE_MAX_PX = 160;
const LOCK_SAG_TOLERANCE_PX = 8;

const TAB_CONTENTS_SELECTOR = '.bonsai-decky-tabs-root [class*="TabContentsScroll"]';

function isTabPaneHost(el: HTMLElement): boolean {
  return (el.className?.toString() ?? "").includes("tab_");
}

/** Walk up from scope and return the Steam QAM tab pane (tab_*), not outer Panel wrappers. */
export function findQamTabHost(scope: HTMLElement): HTMLElement | null {
  let panelFallback: HTMLElement | null = null;
  let el: HTMLElement | null = scope.parentElement;
  while (el && el !== document.documentElement) {
    const h = el.clientHeight;
    if (h >= QAM_HOST_MIN_PX && h <= QAM_HOST_MAX_PX) {
      if (isTabPaneHost(el)) {
        return el;
      }
      if (!panelFallback && el.classList.contains("Panel")) {
        panelFallback = el;
      }
    }
    el = el.parentElement;
  }
  return panelFallback;
}

function pinElementHeight(el: HTMLElement, px: string): void {
  el.style.height = px;
  el.style.minHeight = px;
  el.style.maxHeight = px;
  el.style.overflow = "hidden";
  el.style.boxSizing = "border-box";
}

function pinFlexColumn(el: HTMLElement, px: string): void {
  pinElementHeight(el, px);
  el.style.display = "flex";
  el.style.flexDirection = "column";
}

/**
 * Height that puts an element's BOTTOM edge on the host's bottom edge, given where its own top
 * already sits.
 *
 * The chain used to be pinned to the host's full height at every level, which is only right for
 * the element that starts at the host's top. Every level below starts lower, so the same number
 * hangs each one past the bottom by however much chrome sits above it. Measured on device
 * 2026-08-30: host bottom 766, `.bonsai-scope` top 64 yet pinned to the host's 752 -> scope bottom
 * 816, fifty pixels below a `overflow: hidden` ancestor that clips at 766. The scroll viewport
 * inherits that overshoot from the scope, so the last 50px of every tab was unreachable: not
 * scrolled off, clipped away, with no scrollbar position that could ever reveal it.
 *
 * `fallbackPx` (the host height, i.e. today's value) is returned whenever the measurement is not
 * usable, so a mid-relayout frame can never pin the panel smaller than the guard's own floor.
 */
export function fitHeightToHostBottom(elTop: number, hostBottom: number, fallbackPx: number): number {
  const fitted = Math.floor(hostBottom - elTop);
  if (!Number.isFinite(fitted) || fitted < QAM_HOST_MIN_PX || fitted > fallbackPx) return fallbackPx;
  return fitted;
}

/** Pins the chain and returns the height actually applied to the scope. */
function pinScopeChain(scope: HTMLElement, host: HTMLElement | null, lockPx: number): number {
  const scopeTop = scope.getBoundingClientRect().top;
  const hostBottom = host ? host.getBoundingClientRect().bottom : scopeTop + lockPx;

  const ancestors: HTMLElement[] = [];
  const qamHost = scope.parentElement;
  if (qamHost?.classList.contains("decky-qam-scope")) ancestors.push(qamHost);
  let walker: HTMLElement | null = scope.parentElement;
  while (walker && walker !== host) {
    if (!ancestors.includes(walker)) ancestors.push(walker);
    walker = walker.parentElement;
  }

  /* Every top is read before anything is written. pinFlexColumn sets `display`, so interleaving
     reads and writes would force a reflow per element AND measure a half-applied layout. */
  const tops = ancestors.map((el) => el.getBoundingClientRect().top);

  const scopePx = fitHeightToHostBottom(scopeTop, hostBottom, lockPx);
  scope.style.setProperty("--bonsai-qam-lock-height", `${scopePx}px`);
  scope.classList.add("bonsai-qam-height-locked");

  ancestors.forEach((el, i) => {
    const px = `${fitHeightToHostBottom(tops[i], hostBottom, lockPx)}px`;
    if (el.classList.contains("decky-qam-scope") || el.classList.contains("Panel")) {
      pinFlexColumn(el, px);
    } else {
      pinElementHeight(el, px);
    }
  });

  return scopePx;
}

/**
 * Bazzite / gamescope QAM can collapse `.bonsai-scope` to ~80px on pointer entry.
 * Lock scope to the stable QAM tab host height; never size from scroll content. Each level of the
 * chain is pinned to the distance from ITS OWN top to the host's bottom — see
 * fitHeightToHostBottom for why the host height alone overshoots.
 */
export function useQamPanelHeightGuard(scopeRef: React.RefObject<HTMLDivElement | null>): void {
  const lockedHeightRef = useRef(0);
  /* What was last pinned onto the scope, which is the host height MINUS the chrome above it.
     Sag has to be judged against this and not against the host height, or the scope reads as
     permanently sagged and the guard re-pins on every pointer move. */
  const fittedHeightRef = useRef(0);

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const applyLock = () => {
      const scopeH = scope.getBoundingClientRect().height;
      /* Decky's page while it is moved up for the tab bar in Steam's strip: found by structure, never
         guessed, and its bottom is the screen's. */
      const reshapedPage = deckyPageWhileReshaped();
      const host = reshapedPage ?? findQamTabHost(scope);
      const hostH = host?.clientHeight ?? 0;
      const hostIsTab = reshapedPage ? true : host ? isTabPaneHost(host) : false;

      if (hostH >= QAM_HOST_MIN_PX && hostH <= QAM_HOST_MAX_PX && hostIsTab) {
        lockedHeightRef.current = hostH;
      } else if (
        !lockedHeightRef.current &&
        hostH >= QAM_HOST_MIN_PX &&
        hostH <= QAM_HOST_MAX_PX
      ) {
        lockedHeightRef.current = hostH;
      }

      const lockPx = lockedHeightRef.current;
      const crushed = scopeH < CRUSHED_SCOPE_MAX_PX && lockPx >= QAM_HOST_MIN_PX;
      const fittedPx = fittedHeightRef.current;
      const sagged = fittedPx >= QAM_HOST_MIN_PX && scopeH < fittedPx - LOCK_SAG_TOLERANCE_PX;
      const needsLock = crushed || sagged;
      const layoutStable = scopeH >= CRUSHED_SCOPE_MAX_PX;

      /* No host found, nothing pinned: the chain runs from the scope up to the host, and with no host it
         would run up to the page's root, through Steam's own containers (plan 84 step 6 found this when
         the reshape was undone as bonsAI closed and the lock measured once more). */
      if (host && lockPx >= QAM_HOST_MIN_PX && (needsLock || layoutStable)) {
        fittedHeightRef.current = pinScopeChain(scope, host, lockPx);
      }
      syncTabBodyViewportHeight(scope);
    };

    let raf = 0;
    let settleRaf = 0;

    const ro = new ResizeObserver(() => {
      syncTabBodyViewportHeight(scope);
    });
    ro.observe(scope);

    /*
      Steam replaces the TabContentsScroll node on every tab switch — measured on device
      2026-08-07, node identity changed on all five captured transitions. Observing whatever
      node happened to exist at mount meant the ResizeObserver watched a detached element from
      the first switch onward, so `--bonsai-tab-body-height` stopped tracking content and
      section-3 pinned the pane to a stale pixel value. Re-resolve instead of assuming.
    */
    let observedContents: Element | null = null;
    const structureObserver = new MutationObserver(() => {
      // O(1) guard: the node is only re-resolved when the one we hold actually went away,
      // so ordinary DOM churn costs a boolean read.
      if (observedContents?.isConnected) return;
      resyncTabContents();
    });

    function resyncTabContents(): void {
      const next = scope!.querySelector(TAB_CONTENTS_SELECTOR);
      if (next !== observedContents) {
        if (observedContents) ro.unobserve(observedContents);
        observedContents = next;
        if (next) {
          ro.observe(next);
          syncTabBodyViewportHeight(scope!);
        }
      }

      /*
        Watch the ancestor chain for the replacement, childList only and deliberately WITHOUT
        subtree. The swap shows up as a childList mutation on whichever ancestor owns the
        replaced node, and every ancestor between the tabs root and the pane is covered — while
        nothing inside TabContentsScroll is, so a streaming transcript does not generate a
        mutation record per token just to keep this observer honest.
      */
      structureObserver.disconnect();
      const tabsRoot = scope!.querySelector(".bonsai-decky-tabs-root");
      if (!tabsRoot) return;
      structureObserver.observe(tabsRoot, { childList: true });
      let node: Element | null = observedContents;
      while (node && node !== tabsRoot) {
        const parent: Element | null = node.parentElement;
        if (!parent) break;
        structureObserver.observe(parent, { childList: true });
        node = parent;
      }
    }

    const scheduleSettle = () => {
      cancelAnimationFrame(settleRaf);
      settleRaf = requestAnimationFrame(() => {
        settleRaf = requestAnimationFrame(() => {
          applyLock();
          // The tabs subtree may not exist yet at mount; this is the catch-up pass.
          resyncTabContents();
        });
      });
    };

    applyLock();
    resyncTabContents();
    scheduleSettle();

    const onPointer = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyLock());
    };
    scope.addEventListener("pointerenter", onPointer);
    scope.addEventListener("pointermove", onPointer, { passive: true });
    /* Decky's bar changed shape (plan 84 step 6): measure again now, and once more after it settles. */
    const stopHeader = subscribeDeckyHeader(() => {
      applyLock();
      resyncTabContents();
      scheduleSettle();
    });

    return () => {
      stopHeader();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(settleRaf);
      ro.disconnect();
      structureObserver.disconnect();
      scope.removeEventListener("pointerenter", onPointer);
      scope.removeEventListener("pointermove", onPointer);
    };
  }, [scopeRef]);
}
