/**
 * Title: Tab bar icon line thickness
 *
 * Purpose: The tab bar draws its icons tiny (10 px beside the current tab, 12 px for the current
 * one). On the Deck's own screen the thin lines were hard to see, so every line-drawn tab icon
 * must have a thick line at those sizes, and the line icons must look about equally heavy. Reads
 * the width off the drawn SVG, which is what a person's eye sees.
 *
 * Used for: Guarding the Search, Main (tree), Settings, Permissions and Developer icons; the
 * filled icons (logo, Ollama, About) must stay filled shapes with no outline added.
 *
 * Does not: Check icon size or position; other tests cover those.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BugIcon, BonsaiTreeTabIcon, GearIcon, LockIcon, SearchTabIcon } from "./icons";
import { BonsaiLogoIcon, OllamaTabIcon, AboutTabTitleIcon } from "./icons";
import { TAB_BAR_CURRENT_ICON_PX, TAB_BAR_SIDE_ICON_PX } from "../constants";

const MIN_STROKE = 2.6;
const MAX_SPREAD = 0.35;

/** Every drawn line width in the icon, in the icon's own 24-unit drawing. */
function lineWidths(el: React.ReactElement): number[] {
  const { container, unmount } = render(el);
  const widths: number[] = [];
  container.querySelectorAll("svg, svg *").forEach((n) => {
    const w = n.getAttribute("stroke-width");
    const stroke = n.getAttribute("stroke");
    if (w !== null && stroke !== "none") widths.push(Number(w));
  });
  unmount();
  return widths;
}

const LINE_ICONS: Array<[string, React.FC<{ size?: number }>]> = [
  ["Search", SearchTabIcon],
  ["Main tree", BonsaiTreeTabIcon],
  ["Settings", GearIcon],
  ["Permissions", LockIcon],
  ["Developer", BugIcon],
];

describe("tab bar icons draw thick lines at the tab bar's sizes", () => {
  for (const size of [TAB_BAR_SIDE_ICON_PX, TAB_BAR_CURRENT_ICON_PX]) {
    it(`every line icon is at least ${MIN_STROKE} thick at ${size}px, and they are about equal`, () => {
      const thinnest: number[] = [];
      for (const [name, Icon] of LINE_ICONS) {
        const widths = lineWidths(<Icon size={size} />);
        expect(widths.length, name).toBeGreaterThan(0);
        for (const w of widths) expect(w, `${name} at ${size}px`).toBeGreaterThanOrEqual(MIN_STROKE);
        thinnest.push(Math.min(...widths));
      }
      expect(Math.max(...thinnest) - Math.min(...thinnest)).toBeLessThanOrEqual(MAX_SPREAD);
    });
  }

  it("the filled icons keep their fill and gain a visible outline, about 4% of their width", () => {
    for (const [name, Icon] of [
      ["Main logo", BonsaiLogoIcon],
      ["Ollama", OllamaTabIcon],
      ["About", AboutTabTitleIcon],
    ] as const) {
      const { container, unmount } = render(<Icon size={TAB_BAR_SIDE_ICON_PX} />);
      const svg = container.querySelector("svg") as SVGSVGElement;
      const box = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
      const shapes = Array.from(container.querySelectorAll("svg path, svg circle, svg rect"));
      expect(shapes.length, name).toBeGreaterThan(0);
      for (const n of shapes) {
        expect(n.getAttribute("stroke"), name).toBe("currentColor");
        expect(n.getAttribute("paint-order"), name).toBe("stroke");
        expect(n.getAttribute("stroke-linejoin"), name).toBe("round");
        const fraction = Number(n.getAttribute("stroke-width")) / box;
        expect(fraction, name).toBeGreaterThanOrEqual(0.035);
        expect(fraction, name).toBeLessThanOrEqual(0.045);
      }
      const filled = svg.getAttribute("fill") === "currentColor" || shapes.every((n) => n.getAttribute("fill") === "currentColor" || n.closest("g[fill]")?.getAttribute("fill") === "currentColor");
      expect(filled, name).toBe(true);
      unmount();
    }
  });
});
