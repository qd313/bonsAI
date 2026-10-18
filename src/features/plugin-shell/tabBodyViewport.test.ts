/**
 * Title: Tab body viewport sync tests
 * Purpose: Guard that the panel-height check writes the CSS height only when it changes.
 * Used for: syncTabBodyViewportHeight.
 * Solves: A style write on every resize check, a possible feed for "ResizeObserver loop" errors.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { syncTabBodyViewportHeight } from "./tabBodyViewport";

function rect(top: number, height: number): DOMRect {
  return { top, height, bottom: top + height, left: 0, right: 300, width: 300, x: 0, y: top, toJSON() {} } as DOMRect;
}

function buildScope(scopeH: number, contentsTop: number) {
  const scope = document.createElement("div");
  const root = document.createElement("div");
  root.className = "bonsai-decky-tabs-root";
  const contents = document.createElement("div");
  contents.className = "gamepadtabbedpage_TabContentsScroll_abc";
  root.appendChild(contents);
  scope.appendChild(root);
  document.body.appendChild(scope);
  const dims = { scopeH, contentsTop };
  vi.spyOn(scope, "getBoundingClientRect").mockImplementation(() => rect(0, dims.scopeH));
  vi.spyOn(contents, "getBoundingClientRect").mockImplementation(() => rect(dims.contentsTop, 100));
  return { scope, dims };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("syncTabBodyViewportHeight", () => {
  it("writes the body height on the first check", () => {
    const { scope } = buildScope(600, 70);
    expect(syncTabBodyViewportHeight(scope)).toBe(true);
    expect(scope.style.getPropertyValue("--bonsai-tab-body-height")).toBe("530px");
  });

  it("does not rewrite the style when the height has not changed", () => {
    const { scope } = buildScope(600, 70);
    syncTabBodyViewportHeight(scope);
    const setProperty = vi.spyOn(scope.style, "setProperty");
    expect(syncTabBodyViewportHeight(scope)).toBe(true);
    expect(syncTabBodyViewportHeight(scope)).toBe(true);
    expect(setProperty).not.toHaveBeenCalled();
  });

  it("writes again once the measured height changes", () => {
    const { scope, dims } = buildScope(600, 70);
    syncTabBodyViewportHeight(scope);
    const setProperty = vi.spyOn(scope.style, "setProperty");
    dims.scopeH = 640;
    expect(syncTabBodyViewportHeight(scope)).toBe(true);
    expect(setProperty).toHaveBeenCalledTimes(1);
    expect(scope.style.getPropertyValue("--bonsai-tab-body-height")).toBe("570px");
  });

  it("leaves a crushed scope alone", () => {
    const { scope } = buildScope(100, 20);
    expect(syncTabBodyViewportHeight(scope)).toBe(false);
    expect(scope.style.getPropertyValue("--bonsai-tab-body-height")).toBe("");
  });
});
