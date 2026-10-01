import { describe, expect, it } from "vitest";
import { makeChangeSpacer } from "./changeSpacing";

describe("keeping two chip spots from changing together", () => {
  it("leaves a lone reservation alone", () => {
    expect(makeChangeSpacer(2500).reserve(0, 8000)).toBe(8000);
  });

  it("moves the second spot's change later when it falls within the gap of the first's", () => {
    const spacer = makeChangeSpacer(2500);
    expect(spacer.reserve(0, 8000)).toBe(8000);
    expect(spacer.reserve(1, 8500)).toBe(10_500); // half a second apart becomes the full gap
    expect(spacer.reserve(1, 7000)).toBe(10_500); // 1 s before the other's change also moves after it
  });

  it("leaves a change that is already far enough away", () => {
    const spacer = makeChangeSpacer(2500);
    spacer.reserve(0, 8000);
    expect(spacer.reserve(1, 11_000)).toBe(11_000);
  });

  it("as a wait: the same, measured from now", () => {
    const spacer = makeChangeSpacer(2500);
    expect(spacer.delay(0, 1000, 7000)).toBe(7000);
    expect(spacer.delay(1, 1000, 7200)).toBe(9500); // lands 2.5 s after the first, at 10 500
    // With a fade-out before the swap, the swap is what is spaced, not the fade's start.
    const other = makeChangeSpacer(2500);
    other.delay(0, 0, 10_000);
    expect(other.delayBefore(1, 0, 8500, 1500)).toBe(10_000 + 2500 - 1500);
  });

  it("never keeps a spot away from itself", () => {
    const spacer = makeChangeSpacer(2500);
    spacer.reserve(0, 8000);
    expect(spacer.reserve(0, 8100)).toBe(8100);
  });
});
