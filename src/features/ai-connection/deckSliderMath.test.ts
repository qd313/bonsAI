import { describe, expect, it } from "vitest";
import {
  clamp,
  clientXToPct,
  indexToPct,
  isLeftDeckButton,
  isRightDeckButton,
  pctToIndex,
  pctToValue,
  pickNearestThumbIndex,
  valueToPct,
} from "./deckSliderMath";

describe("deckSliderMath", () => {
  it("clamp bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("indexToPct and pctToIndex round-trip discrete slots", () => {
    expect(indexToPct(0, 2)).toBe(0);
    expect(indexToPct(1, 2)).toBe(50);
    expect(indexToPct(2, 2)).toBe(100);
    expect(pctToIndex(0, 4)).toBe(0);
    expect(pctToIndex(50, 4)).toBe(2);
    expect(pctToIndex(100, 4)).toBe(4);
  });

  it("pctToIndex clamps out-of-range percentages", () => {
    expect(pctToIndex(-10, 3)).toBe(0);
    expect(pctToIndex(150, 3)).toBe(3);
  });

  it("indexToPct returns 50 when maxIdx is zero", () => {
    expect(indexToPct(0, 0)).toBe(50);
  });

  it("clientXToPct maps pointer position across track width", () => {
    const rect = { left: 100, width: 200 } as DOMRect;
    expect(clientXToPct(100, rect)).toBe(0);
    expect(clientXToPct(200, rect)).toBe(50);
    expect(clientXToPct(300, rect)).toBe(100);
  });

  it("clientXToPct handles zero-width track", () => {
    const rect = { left: 0, width: 0 } as DOMRect;
    expect(clientXToPct(50, rect)).toBe(0);
  });

  it("valueToPct and pctToValue map numeric domains", () => {
    expect(valueToPct(60, 5, 605)).toBeCloseTo(9.167, 2);
    expect(pctToValue(50, 10, 110)).toBe(60);
    expect(pctToValue(200, 10, 110)).toBe(110);
  });

  it("pickNearestThumbIndex chooses closest thumb", () => {
    expect(pickNearestThumbIndex(25, [10, 90])).toBe(0);
    expect(pickNearestThumbIndex(75, [10, 90])).toBe(1);
    expect(pickNearestThumbIndex(50, [10, 90])).toBe(0);
  });

  it("isLeftDeckButton and isRightDeckButton recognize deck inputs", () => {
    expect(isLeftDeckButton("GamepadLeftStickLeft")).toBe(true);
    expect(isLeftDeckButton("ArrowLeft")).toBe(true);
    expect(isRightDeckButton("GamepadLeftStickRight")).toBe(true);
    expect(isRightDeckButton("ArrowRight")).toBe(true);
    expect(isLeftDeckButton("ArrowRight")).toBe(false);
  });
});
