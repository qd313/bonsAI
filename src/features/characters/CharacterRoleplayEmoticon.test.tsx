/**
 * Guards the character avatar (docs/planning/25-ai-character-avatars-handoff.md).
 *
 * Every avatar on screen is the prop-emblem artwork; the old pixel grids are gone. Two things
 * can break silently here and neither is caught by `tsc`:
 *
 *  1. The textarea must not look any different except for the artwork in the corner. Nothing
 *     about the box may change size, and the badge must stay put. A geometry change would only
 *     show up on a Deck.
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

describe("CharacterRoleplayEmoticon art", () => {
  it("draws the prop emblem, with no pixel grid behind it", () => {
    const { container } = render(<CharacterRoleplayEmoticon presetId="tf2_scout" size={18} />);
    const svg = svgOf(container);
    expect(svg.getAttribute("viewBox")).toBe("0 0 32 32");
    // The tinted disc + vignette is the giveaway that this is the emblem, not the old grid.
    expect(container.querySelector("radialGradient")).not.toBeNull();
    expect(svg.getAttribute("width")).toBe("18");
    expect(svg.getAttribute("height")).toBe("18");
  });

  it("marks the art decorative unless it is given a title", () => {
    const { container } = render(<CharacterRoleplayEmoticon presetId="tf2_medic" size={18} />);
    expect(svgOf(container).getAttribute("aria-hidden")).toBe("true");

    const named = render(
      <CharacterRoleplayEmoticon presetId="tf2_medic" size={18} title="Medic" />,
    );
    expect(svgOf(named.container).getAttribute("aria-hidden")).toBeNull();
    expect(named.container.querySelector("title")?.textContent).toBe("Medic");
  });

  it("gives Random its own glyph instead of a bare question mark", () => {
    const { container } = render(<CharacterRoleplayEmoticon presetId="__random__" size={18} />);
    expect(svgOf(container).getAttribute("viewBox")).toBe("0 0 32 32");
  });
});

describe("CharacterRoleplayEmoticon badge", () => {
  it("draws the corner badge over the art", () => {
    const { container } = render(
      <CharacterRoleplayEmoticon presetId="tf2_spy" size={18} badgeLetter="S" />,
    );
    const span = container.querySelector("span[aria-hidden]");
    expect(span?.textContent).toBe("S");
  });

  it("omits the badge wrapper entirely when there is no letter", () => {
    const { container } = render(<CharacterRoleplayEmoticon presetId="tf2_spy" size={18} />);
    expect(container.querySelector("span[aria-hidden]")).toBeNull();
    // Without a badge the svg is the root.
    expect(container.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  });
});

describe("CharacterRoleplayEmoticon gradient ids", () => {
  it("gives every instance its own gradient id, so discs cannot borrow a tint", () => {
    const { container } = render(
      <>
        <CharacterRoleplayEmoticon presetId="tf2_scout" size={18} />
        <CharacterRoleplayEmoticon presetId="tf2_heavy" size={18} />
        <CharacterRoleplayEmoticon presetId="tf2_medic" size={18} />
      </>,
    );
    const ids = gradientIds(container);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it("keeps ids free of the colons useId emits, which url(#...) handles badly", () => {
    const { container } = render(<CharacterRoleplayEmoticon presetId="tf2_scout" size={18} />);
    const [id] = gradientIds(container);
    expect(id).not.toContain(":");
    expect(container.querySelector("circle[fill^='url(']")?.getAttribute("fill")).toBe(
      `url(#${id})`,
    );
  });
});
