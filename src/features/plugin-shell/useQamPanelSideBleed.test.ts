import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useQamPanelSideBleed } from "./useQamPanelSideBleed";

/**
 * Once bonsAI's own insets were zero, the rows still stopped short of the QAM edges because a
 * Steam/Decky ancestor carries side padding no bonsAI selector can name. This hook clears that
 * padding by walking the real chain. The risks worth pinning are what it must NOT do: walk past
 * the tab pane into Steam chrome, and clobber an `auto` margin (which centres the panel rather
 * than insetting our content).
 */

/**
 * scope > qamScope > pane(tab_) > outerChrome — mirrors the on-device chain.
 * `findQamTabHost` matches a `tab_*` class with clientHeight in [320, 1200], so the pane is given
 * a real clientHeight via defineProperty (jsdom reports 0 for everything otherwise).
 */
function buildChain() {
  const outerChrome = document.createElement("div");
  outerChrome.className = "quickaccessmenu_Chrome";
  outerChrome.style.paddingLeft = "20px";
  outerChrome.style.paddingRight = "20px";

  const pane = document.createElement("div");
  pane.className = "tab_Pane_abc";
  pane.style.paddingLeft = "9px";
  pane.style.paddingRight = "9px";
  Object.defineProperty(pane, "clientHeight", { value: 800, configurable: true });

  const qamScope = document.createElement("div");
  qamScope.className = "decky-qam-scope";
  qamScope.style.paddingLeft = "6px";
  qamScope.style.paddingRight = "6px";

  const scope = document.createElement("div");
  scope.className = "bonsai-scope";

  qamScope.appendChild(scope);
  pane.appendChild(qamScope);
  outerChrome.appendChild(pane);
  document.body.appendChild(outerChrome);
  return { scope, qamScope, pane, outerChrome };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useQamPanelSideBleed", () => {
  it("clears side padding on every ancestor up to and including the tab pane", () => {
    const { scope, qamScope, pane } = buildChain();

    renderHook(() => useQamPanelSideBleed({ current: scope }));

    expect(qamScope.style.paddingLeft).toBe("0px");
    expect(qamScope.style.paddingRight).toBe("0px");
    expect(pane.style.paddingLeft).toBe("0px");
    expect(pane.style.paddingRight).toBe("0px");
  });

  /* The whole reason the walk is bounded by findQamTabHost: Steam owns everything above the pane
     and other QAM content lives there. Stripping its padding would be a visible regression
     outside the plugin. */
  it("does not touch chrome above the tab pane", () => {
    const { scope, outerChrome } = buildChain();

    renderHook(() => useQamPanelSideBleed({ current: scope }));

    // Still the fixture's own value: had the walk reached it, this would read "0px".
    expect(outerChrome.style.paddingLeft).toBe("20px");
    expect(outerChrome.style.paddingRight).toBe("20px");
  });

  /* `auto` centres the panel — zeroing it would slide the panel sideways instead of widening
     our rows, which is a different bug than the one being fixed. */
  it("leaves auto margins alone and clears fixed ones", () => {
    const { scope, qamScope, pane } = buildChain();
    qamScope.style.marginLeft = "auto";
    qamScope.style.marginRight = "auto";
    pane.style.marginLeft = "12px";

    renderHook(() => useQamPanelSideBleed({ current: scope }));

    expect(qamScope.style.marginLeft).toBe("auto");
    expect(qamScope.style.marginRight).toBe("auto");
    expect(pane.style.marginLeft).toBe("0px");
  });

  /* A chain that is already flush should write no inline styles at all, so this hook cannot be
     blamed for layout it never changed. */
  it("writes nothing when the chain has no inset", () => {
    const { scope, qamScope, pane } = buildChain();
    qamScope.removeAttribute("style");
    pane.removeAttribute("style");
    Object.defineProperty(pane, "clientHeight", { value: 800, configurable: true });

    renderHook(() => useQamPanelSideBleed({ current: scope }));

    expect(qamScope.getAttribute("style")).toBeNull();
    expect(pane.getAttribute("style")).toBeNull();
  });

  /* No pane means the shape is not what we expect; walking on would reach <body> and strip
     Steam's own padding. Bail instead. */
  it("does nothing when the tab pane cannot be found", () => {
    const qamScope = document.createElement("div");
    qamScope.className = "decky-qam-scope";
    qamScope.style.paddingLeft = "6px";
    const scope = document.createElement("div");
    scope.className = "bonsai-scope";
    qamScope.appendChild(scope);
    document.body.appendChild(qamScope);

    renderHook(() => useQamPanelSideBleed({ current: scope }));

    expect(qamScope.style.paddingLeft).toBe("6px");
  });
});
