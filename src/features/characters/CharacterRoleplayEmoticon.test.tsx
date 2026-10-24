/**
 * Guards the main tab avatar swap (docs/planning/25-ai-character-avatars-handoff.md).
 *
 * The Ask bar moved to the prop-emblem artwork while the character picker deliberately
 * stayed on the pixel grids, so one component now renders two art styles. Two things can
 * break silently here and neither is caught by `tsc`:
 *
 *  1. The maintainer's constraint was that the textarea must not look any different except
 *     for the artwork in the corner. Nothing about the box may change size, and the badge
 *     must stay put. A geometry change would only show up on a Deck.
 *  2. The design bundle generated gradient ids from a module-level counter, which collides
 *     under concurrent rendering and makes one disc paint with another character's tint.
 *     That was swapped for `useId`; if it ever regresses the discs go wrong colour, which
 *     no type or snapshot would notice.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CharacterRoleplayEmoticon } from "./CharacterRoleplayEmoticon";

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no <svg> rendered");
  return svg as SVGSVGElement;
}

function gradientIds(container: HTMLElement): string[] {
  return [...container.querySelectorAll("radialGradient")].map((n) => n.getAttribute("id") ?? "");
}

describe("CharacterRoleplayEmoticon art styles", () => {
  it("defaults to the pixel grid, so a caller that does not ask gets the old art", () => {
    const { container } = render(<CharacterRoleplayEmoticon presetId="tf2_scout" size={24} />);
    const svg = svgOf(container);
    expect(svg.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(container.querySelector("radialGradient")).toBeNull();
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("draws the prop emblem when asked for it", () => {
    const { container } = render(
      <CharacterRoleplayEmoticon presetId="tf2_scout" size={18} art="prop" />,
    );
    const svg = svgOf(container);
    expect(svg.getAttribute("viewBox")).toBe("0 0 32 32");
    // The tinted disc + vignette is the giveaway that this is the emblem, not the grid.
    expect(container.querySelector("radialGradient")).not.toBeNull();
  });

  it("keeps the rendered box identical between the two art styles", () => {
    const grid = render(<CharacterRoleplayEmoticon presetId="tf2_heavy" size={18} />);
    const prop = render(<CharacterRoleplayEmoticon presetId="tf2_heavy" size={18} art="prop" />);
    for (const attr of ["width", "height"]) {
      expect(svgOf(prop.container).getAttribute(attr)).toBe(
        svgOf(grid.container).getAttribute(attr),
      );
    }
    expect(svgOf(prop.container).getAttribute("width")).toBe("18");
  });

  it("marks the art decorative unless it is given a title", () => {
    const { container } = render(
      <CharacterRoleplayEmoticon presetId="tf2_medic" size={18} art="prop" />,
    );
    expect(svgOf(container).getAttribute("aria-hidden")).toBe("true");

    const named = render(
      <CharacterRoleplayEmoticon presetId="tf2_medic" size={18} art="prop" title="Medic" />,
    );
    expect(svgOf(named.container).getAttribute("aria-hidden")).toBeNull();
    expect(named.container.querySelector("title")?.textContent).toBe("Medic");
  });

  it("gives Random its own glyph instead of the bare question mark", () => {
    const plain = render(<CharacterRoleplayEmoticon presetId="__random__" size={18} />);
    expect(plain.container.querySelector("svg")).toBeNull();
    expect(plain.container.textContent).toContain("?");

    const { container } = render(
      <CharacterRoleplayEmoticon presetId="__random__" size={18} art="prop" />,
    );
    expect(svgOf(container).getAttribute("viewBox")).toBe("0 0 32 32");
  });
});

describe("CharacterRoleplayEmoticon badge", () => {
  it("draws the same corner badge for both art styles", () => {
    const grid = render(
      <CharacterRoleplayEmoticon presetId="tf2_spy" size={18} badgeLetter="S" />,
    );
    const prop = render(
      <CharacterRoleplayEmoticon presetId="tf2_spy" size={18} badgeLetter="S" art="prop" />,
    );
    const badgeOf = (c: HTMLElement) => {
      const span = c.querySelector("span[aria-hidden]");
      if (!span) throw new Error("no badge rendered");
      return { text: span.textContent, style: span.getAttribute("style") };
    };
    expect(badgeOf(prop.container)).toEqual(badgeOf(grid.container));
    expect(badgeOf(prop.container).text).toBe("S");
  });

  it("omits the badge wrapper entirely when there is no letter", () => {
    const { container } = render(
      <CharacterRoleplayEmoticon presetId="tf2_spy" size={18} art="prop" />,
    );
    expect(container.querySelector("span[aria-hidden]")).toBeNull();
    // Without a badge the svg is the root, same as the grid path.
    expect(container.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  });
});

describe("CharacterRoleplayEmoticon gradient ids", () => {
  it("gives every instance its own gradient id, so discs cannot borrow a tint", () => {
    const { container } = render(
      <>
        <CharacterRoleplayEmoticon presetId="tf2_scout" size={18} art="prop" />
        <CharacterRoleplayEmoticon presetId="tf2_heavy" size={18} art="prop" />
        <CharacterRoleplayEmoticon presetId="tf2_medic" size={18} art="prop" />
      </>,
    );
    const ids = gradientIds(container);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it("keeps ids free of the colons useId emits, which url(#...) handles badly", () => {
    const { container } = render(
      <CharacterRoleplayEmoticon presetId="tf2_scout" size={18} art="prop" />,
    );
    const [id] = gradientIds(container);
    expect(id).not.toContain(":");
    expect(container.querySelector("circle[fill^='url(']")?.getAttribute("fill")).toBe(
      `url(#${id})`,
    );
  });
});
