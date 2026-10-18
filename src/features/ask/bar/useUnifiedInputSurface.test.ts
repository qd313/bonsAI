/**
 * Title: Unified input surface hook tests
 * Purpose: Pin that the caret overlay's wrapping and font-family are copied from the native
 *          field's own computed style on every measure pass, and that the field's width is read
 *          at full precision rather than rounded to an integer (roadmap: "The question overlay
 *          sits a few pixels off the native text field").
 * Used for: useUnifiedInputSurface.
 * Solves: A silent mismatch here wraps a long line one character sooner in the overlay/measure
 *         mirrors than in the real field does, drifting the caret and typed-text overlay off it.
 * Does not: Cover on-screen pixel positions -- jsdom has no layout engine (design-language.md
 *           Rule 6); every rect here is stubbed, and only the mirrored CSS custom properties are
 *           asserted on.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useUnifiedInputSurface } from "./useUnifiedInputSurface";

function rect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect;
}

/**
 * Builds the host/layer/field/measure tree `remeasureUnifiedInputSurface` expects, attached to
 * `document.body` so the hook's `host.isConnected` guard passes. Field geometry/style defaults
 * match the 2026-09-04 device measurement: a 58-character sentence, field border-box 274.463px,
 * white-space/overflow-wrap both `normal`, font stack with no "Arial".
 */
function makeSurface(fieldOverrides: Partial<CSSStyleDeclaration> = {}) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => rect({ width: 300, left: 48, top: 600 });

  const layer = document.createElement("div");
  layer.getBoundingClientRect = () => rect({ width: 300, left: 48, top: 600 });
  host.appendChild(layer);

  const field = document.createElement("textarea");
  field.style.whiteSpace = (fieldOverrides.whiteSpace as string) ?? "normal";
  field.style.overflowWrap = (fieldOverrides.overflowWrap as string) ?? "normal";
  field.style.fontFamily = (fieldOverrides.fontFamily as string) ?? '"Motiva Sans", Helvetica, sans-serif';
  field.getBoundingClientRect = () => rect({ width: 274.463, left: 72.75, top: 624.13 });
  layer.appendChild(field);

  const measure = document.createElement("div");
  layer.appendChild(measure);

  document.body.appendChild(host);
  return { host, layer, field, measure };
}

describe("useUnifiedInputSurface wrap/font/width mirroring", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("copies the field's own white-space, overflow-wrap and font-family onto the mirror layer", () => {
    const { host, layer, field, measure } = makeSurface();
    const { result } = renderHook(() => useUnifiedInputSurface("main", "hello there"));

    result.current.unifiedInputHostRef.current = host;
    result.current.unifiedInputFieldLayerRef.current = layer;
    result.current.unifiedInputMeasureRef.current = measure;

    act(() => {
      result.current.remeasureUnifiedInputSurface();
    });

    const fieldStyle = window.getComputedStyle(field);
    expect(layer.style.getPropertyValue("--bonsai-unified-field-white-space")).toBe(fieldStyle.whiteSpace);
    expect(layer.style.getPropertyValue("--bonsai-unified-field-overflow-wrap")).toBe(fieldStyle.overflowWrap);
    expect(layer.style.getPropertyValue("--bonsai-unified-field-font-family")).toBe(fieldStyle.fontFamily);

    // Reproduces the actual device bug directly: these must not be the mirrors' old hard-coded
    // values, which is exactly what let them wrap differently than the field.
    expect(layer.style.getPropertyValue("--bonsai-unified-field-white-space")).not.toBe("pre-wrap");
    expect(layer.style.getPropertyValue("--bonsai-unified-field-overflow-wrap")).not.toBe("anywhere");
    expect(layer.style.getPropertyValue("--bonsai-unified-field-font-family")).not.toContain("Arial");
  });

  it("measures the field's width at full precision instead of rounding to an integer", () => {
    const { host, layer, measure } = makeSurface();
    const { result } = renderHook(() => useUnifiedInputSurface("main", "hello there"));

    result.current.unifiedInputHostRef.current = host;
    result.current.unifiedInputFieldLayerRef.current = layer;
    result.current.unifiedInputMeasureRef.current = measure;

    act(() => {
      result.current.remeasureUnifiedInputSurface();
    });

    // Device-measured field border-box width was 274.463px; the old code rounded to 274 via
    // `clientWidth`, which is exactly the half-pixel gap that wrapped a long line one character
    // sooner in the mirrors than in the real field.
    expect(layer.style.getPropertyValue("--bonsai-unified-field-width")).toBe("274.46px");
    expect(measure.style.width).toBe("274.463px");
    expect(layer.style.getPropertyValue("--bonsai-unified-field-width")).not.toBe("274px");
  });

  it("falls back to the shared constants when no native field is present yet", () => {
    const host = document.createElement("div");
    host.getBoundingClientRect = () => rect({ width: 300 });
    const layer = document.createElement("div");
    layer.getBoundingClientRect = () => rect({ width: 300 });
    host.appendChild(layer);
    const measure = document.createElement("div");
    layer.appendChild(measure);
    document.body.appendChild(host);

    const { result } = renderHook(() => useUnifiedInputSurface("main", ""));
    result.current.unifiedInputHostRef.current = host;
    result.current.unifiedInputFieldLayerRef.current = layer;
    result.current.unifiedInputMeasureRef.current = measure;

    act(() => {
      result.current.remeasureUnifiedInputSurface();
    });

    expect(layer.style.getPropertyValue("--bonsai-unified-field-white-space")).toBe("pre-wrap");
    expect(layer.style.getPropertyValue("--bonsai-unified-field-overflow-wrap")).toBe("anywhere");
    expect(layer.style.getPropertyValue("--bonsai-unified-field-font-family")).toBe("inherit");
  });

  it("keeps the empty-field placeholder mirror in step too (no text typed yet)", () => {
    // Same field, empty value -- the second case the roadmap names alongside the three-line
    // question. The measure/overlay divs render a non-breaking space or the mode placeholder when
    // empty, but they are the same DOM nodes the wrap/font copy targets, so nothing here should
    // depend on `unifiedInput` being non-empty.
    const { host, layer, field, measure } = makeSurface();
    const { result } = renderHook(() => useUnifiedInputSurface("main", ""));

    result.current.unifiedInputHostRef.current = host;
    result.current.unifiedInputFieldLayerRef.current = layer;
    result.current.unifiedInputMeasureRef.current = measure;

    act(() => {
      result.current.remeasureUnifiedInputSurface();
    });

    const fieldStyle = window.getComputedStyle(field);
    expect(layer.style.getPropertyValue("--bonsai-unified-field-white-space")).toBe(fieldStyle.whiteSpace);
    expect(layer.style.getPropertyValue("--bonsai-unified-field-overflow-wrap")).toBe(fieldStyle.overflowWrap);
    expect(layer.style.getPropertyValue("--bonsai-unified-field-width")).toBe("274.46px");
  });

  /**
   * Measured on device 2026-09-20, with the plugin's own UI size setting (since removed) turned up to its
   * "Couch" step: the typed-text mirror was 298.44px wide inside a 274.46px box, so it stuck 23px past the
   * right edge of the plugin's 300px column and the end of a typed line sat outside the panel. The
   * real field measured 274.46px at the time, so the mirror was not following it — the width had
   * been written in an earlier frame, while the field still filled the whole host, and no later
   * pass corrected it. Reproduced twice at that setting, never at the default one.
   */
  it("never writes a mirror wider than the box the mirror sits in", () => {
    const host = document.createElement("div");
    host.getBoundingClientRect = () => rect({ width: 300 }); // the whole plugin column
    const layer = document.createElement("div");
    // The box the overlay is positioned against, once the avatar slot beside it has laid out.
    layer.getBoundingClientRect = () => rect({ width: 274.46 });
    host.appendChild(layer);
    const measure = document.createElement("div");
    layer.appendChild(measure);
    document.body.appendChild(host);

    const { result } = renderHook(() => useUnifiedInputSurface("main", "a typed question"));
    result.current.unifiedInputHostRef.current = host;
    result.current.unifiedInputFieldLayerRef.current = layer;
    result.current.unifiedInputMeasureRef.current = measure;

    act(() => {
      result.current.remeasureUnifiedInputSurface();
    });

    // Without the clamp this is the host's own 300px, which is what hung out of the panel.
    expect(layer.style.getPropertyValue("--bonsai-unified-field-width")).toBe("274.46px");
    expect(measure.style.width).toBe("274.46px");
  });

  it("still follows the real field exactly when the field fits its box", () => {
    // The ordinary case, and the one the 2026-09-04 full-precision fix pinned: the clamp must not
    // shave anything off a field that already fits, or the mirror wraps a line early again.
    const { host, layer, measure } = makeSurface();
    const { result } = renderHook(() => useUnifiedInputSurface("main", "a typed question"));
    result.current.unifiedInputHostRef.current = host;
    result.current.unifiedInputFieldLayerRef.current = layer;
    result.current.unifiedInputMeasureRef.current = measure;

    act(() => {
      result.current.remeasureUnifiedInputSurface();
    });

    expect(layer.style.getPropertyValue("--bonsai-unified-field-width")).toBe("274.46px");
    expect(measure.style.width).toBe("274.463px");
  });
});

/**
 * Text size (Small / Normal / Large) changes the size of the letters, never the height of the box
 * (maintainer's rule: rows keep their heights, so bigger words never take room from the chat).
 * Measured on the Deck 2026-10-11 (plan89-P89-TEXT-SIZE-EVERYWHERE): the one-line box was 42.99,
 * 43.99 and 47.00 px, because the box's height was the hidden mirror's scrollHeight, and the mirror's
 * line is 1.2 times the scaled letter size. jsdom has no layout, so the mirror's scrollHeight is
 * modelled here the way the browser makes it: top and bottom inset (6 + 2) plus lines times
 * 1.2 x 12 px x the text scale, rounded to a whole pixel.
 */
describe("question box height does not follow the Text size", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const scales: Array<[string, string]> = [
    ["Small", "0.9"],
    ["Normal", "1"],
    ["Large", "1.15"],
  ];

  function heightFor(textScale: string, lines: number): number {
    const { host, layer, measure } = makeSurface();
    const scope = document.createElement("div");
    scope.style.setProperty("--bonsai-text-scale", textScale);
    document.body.appendChild(scope);
    scope.appendChild(host);
    Object.defineProperty(measure, "scrollHeight", {
      configurable: true,
      get: () => Math.round(8 + lines * 12 * 1.2 * Number(textScale)),
    });
    const { result } = renderHook(() => useUnifiedInputSurface("main", "a typed question"));
    result.current.bonsaiScopeRef.current = scope;
    result.current.unifiedInputHostRef.current = host;
    result.current.unifiedInputFieldLayerRef.current = layer;
    result.current.unifiedInputMeasureRef.current = measure;
    act(() => {
      result.current.remeasureUnifiedInputSurface();
    });
    return result.current.unifiedInputSurfacePx;
  }

  it("a one-line box is today's Normal height (44) on Small, Normal and Large", () => {
    for (const [, scale] of scales) expect(heightFor(scale, 1)).toBe(44);
  });

  it("two lines and three lines grow the box by the same fixed amount on all three sizes", () => {
    for (const [, scale] of scales) {
      expect(heightFor(scale, 2)).toBe(59);
      expect(heightFor(scale, 3)).toBe(73);
    }
  });
});
