/**
 * The picker's avatar size and art style are a maintainer call (D33, locked 2026-08-27 at 26px,
 * prop emblems). Both are easy to undo by accident — a size is a bare number at a JSX call site and
 * the art style is an opt-in prop that defaults to the *old* pixel grids, so forgetting it renders
 * something plausible rather than failing. These tests are the thing that notices.
 *
 * They assert the two properties the decision actually fixed, not the layout around them: every
 * avatar the modal draws is the same size, and every one is the prop emblem.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CharacterPickerModal } from "./CharacterPickerModal";

const EXPECTED_AVATAR_PX = 26;

function renderPicker() {
  return render(
    <CharacterPickerModal
      initialDraft={{ random: false, presetId: "tf2_scout", customText: "" }}
      onCancel={() => {}}
      onOK={() => {}}
    />,
  );
}

/**
 * The emblem is drawn on a 32x32 viewBox and the pixel grids on 8x8 or 16x16, so the viewBox is
 * what tells the two art styles apart without asserting on any path data.
 */
function avatarSvgs(container: HTMLElement) {
  return [...container.querySelectorAll("svg")].filter((svg) => {
    const box = svg.getAttribute("viewBox") ?? "";
    return box === "0 0 32 32" || box === "0 0 16 16" || box === "0 0 8 8";
  });
}

describe("CharacterPickerModal avatars", () => {
  it("draws every avatar at the one locked size", () => {
    const { container } = renderPicker();
    const svgs = avatarSvgs(container);
    expect(svgs.length).toBeGreaterThan(0);

    const sizes = [...new Set(svgs.map((s) => s.getAttribute("width")))];
    expect(sizes).toEqual([String(EXPECTED_AVATAR_PX)]);
  });

  it("draws every avatar as the prop emblem, never the old pixel grid", () => {
    const { container } = renderPicker();
    const svgs = avatarSvgs(container);
    expect(svgs.length).toBeGreaterThan(0);

    const viewBoxes = [...new Set(svgs.map((s) => s.getAttribute("viewBox")))];
    expect(viewBoxes).toEqual(["0 0 32 32"]);
  });
});

/**
 * Roadmap: "The focus ring is clipped on grid layouts." Every entry button fills its column's
 * full width with no inset, and the column itself clips overflow, so a focused button flush
 * against its column's edge had its D-pad ring cut off before it could render. This pins the fix
 * (padding inside the same box that clips) without asserting anything about the ring itself,
 * which jsdom has no layout engine to paint or measure -- see design-language.md Rule 6.
 */
describe("CharacterPickerModal grid ring padding", () => {
  const EXPECTED_GRID_RING_PAD_PX = 6;

  it("gives every catalog column inner padding so an edge tile's ring has room to render", () => {
    const { container } = renderPicker();
    const columns = container.querySelectorAll<HTMLElement>(".bonsai-ai-char-grid-col");

    // One column per CHARACTER_PICKER_COLUMNS entry -- more than one, so this is a real grid.
    expect(columns.length).toBeGreaterThan(1);
    for (const col of columns) {
      expect(col.style.padding).toBe(`${EXPECTED_GRID_RING_PAD_PX}px`);
    }
  });
});
