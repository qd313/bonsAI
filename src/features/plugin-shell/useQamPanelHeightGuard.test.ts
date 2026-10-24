import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fitHeightToHostBottom, useQamPanelHeightGuard } from "./useQamPanelHeightGuard";

/**
 * Steam replaces the TabContentsScroll node on every tab switch (measured on device 2026-08-07,
 * node identity changed on all five captured transitions). The guard used to resolve that node
 * once at mount, so its ResizeObserver watched a detached element from the first switch onward
 * and `--bonsai-tab-body-height` silently stopped tracking content.
 */

type Recorded = { observed: Element[]; unobserved: Element[] };

let recorded: Recorded;
let originalRO: unknown;

class RecordingResizeObserver {
  observe(el: Element) {
    recorded.observed.push(el);
  }
  unobserve(el: Element) {
    recorded.unobserved.push(el);
  }
  disconnect() {}
}

/** scope > .bonsai-decky-tabs-root > wrapper > TabContentsScroll — the on-device shape. */
function buildScope(): { scope: HTMLDivElement; wrapper: HTMLDivElement; pane: HTMLDivElement } {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  const tabsRoot = document.createElement("div");
  tabsRoot.className = "bonsai-decky-tabs-root";
  const wrapper = document.createElement("div");
  wrapper.className = "Panel Focusable";
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll_x1y2";

  wrapper.appendChild(pane);
  tabsRoot.appendChild(wrapper);
  scope.appendChild(tabsRoot);
  document.body.appendChild(scope);
  return { scope, wrapper, pane };
}

/** Let MutationObserver callbacks (microtasks) run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Regression, measured on device 2026-08-30: the chain was pinned to the host's full height at
 * every level. Only the topmost level starts at the host's top, so `.bonsai-scope` (top 64, host
 * 14..766, height 752) reached 816 -- fifty pixels below an `overflow: hidden` ancestor. Those
 * fifty pixels were not scrolled off, they were clipped, so no scroll position could reveal them
 * and the Ask bar's context line sat inside them.
 */
describe("fitHeightToHostBottom", () => {
  it("subtracts the chrome above the element instead of reusing the host height", () => {
    expect(fitHeightToHostBottom(64, 766, 752)).toBe(702);
    expect(fitHeightToHostBottom(48, 766, 752)).toBe(718);
    // The level that does start at the host's top keeps the full height.
    expect(fitHeightToHostBottom(14, 766, 752)).toBe(752);
  });

  it("falls back to the host height rather than pinning below the guard's own floor", () => {
    // A mid-relayout frame that would compute an absurdly short panel.
    expect(fitHeightToHostBottom(600, 766, 752)).toBe(752);
    expect(fitHeightToHostBottom(Number.NaN, 766, 752)).toBe(752);
    // An element measured above the host cannot buy itself extra height.
    expect(fitHeightToHostBottom(-100, 766, 752)).toBe(752);
  });
});

describe("useQamPanelHeightGuard", () => {
  beforeEach(() => {
    recorded = { observed: [], unobserved: [] };
    originalRO = (globalThis as Record<string, unknown>).ResizeObserver;
    (globalThis as Record<string, unknown>).ResizeObserver = RecordingResizeObserver;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).ResizeObserver = originalRO;
    document.body.innerHTML = "";
  });

  it("observes the TabContentsScroll present at mount", () => {
    const { scope, pane } = buildScope();
    renderHook(() => useQamPanelHeightGuard({ current: scope }));

    expect(recorded.observed).toContain(scope);
    expect(recorded.observed).toContain(pane);
  });

  it("re-observes TabContentsScroll after a tab switch replaces the node", async () => {
    const { scope, wrapper, pane } = buildScope();
    renderHook(() => useQamPanelHeightGuard({ current: scope }));
    expect(recorded.observed).toContain(pane);

    // What a tab switch does: the old pane is discarded and a fresh one takes its place.
    const replacement = document.createElement("div");
    replacement.className = "TabContentsScroll_x1y2";
    wrapper.removeChild(pane);
    wrapper.appendChild(replacement);
    await flush();

    expect(recorded.observed).toContain(replacement);
    // The detached node must be released, or the observer leaks it for the session.
    expect(recorded.unobserved).toContain(pane);
    expect(pane.isConnected).toBe(false);
  });

  it("keeps up across several switches, not just the first", async () => {
    const { scope, wrapper } = buildScope();
    renderHook(() => useQamPanelHeightGuard({ current: scope }));

    let current = wrapper.firstElementChild as HTMLDivElement;
    for (let i = 0; i < 3; i++) {
      const next = document.createElement("div");
      next.className = "TabContentsScroll_x1y2";
      wrapper.removeChild(current);
      wrapper.appendChild(next);
      await flush();
      expect(recorded.observed).toContain(next);
      current = next;
    }
  });

  it("does not re-resolve while the pane is merely being written into", async () => {
    const { scope, wrapper } = buildScope();
    renderHook(() => useQamPanelHeightGuard({ current: scope }));
    const pane = wrapper.firstElementChild as HTMLDivElement;
    const countAfterMount = recorded.observed.length;

    // A streaming transcript mutates *inside* the pane every token. That must not cost a
    // re-resolve, which is why the structure observer is childList-only and not subtree.
    for (let i = 0; i < 25; i++) {
      pane.appendChild(document.createElement("span"));
    }
    await flush();

    expect(recorded.observed.length).toBe(countAfterMount);
  });

  it("picks up a tabs subtree that mounts after the hook does", async () => {
    const scope = document.createElement("div");
    scope.className = "bonsai-scope";
    document.body.appendChild(scope);
    renderHook(() => useQamPanelHeightGuard({ current: scope }));

    // Decky can mount the tabs host a frame later; the settle pass is the catch-up.
    const tabsRoot = document.createElement("div");
    tabsRoot.className = "bonsai-decky-tabs-root";
    const pane = document.createElement("div");
    pane.className = "TabContentsScroll_late";
    tabsRoot.appendChild(pane);
    scope.appendChild(tabsRoot);

    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await flush();

    expect(recorded.observed).toContain(pane);
  });
});
