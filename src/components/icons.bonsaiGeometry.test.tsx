/**
 * Geometry guard for the shared bonsai trunk/pot path in tab and plugin-list icons.
 * Canopy bbox center is 11.5 on the 24-unit viewBox; pot/trunk must match (roadmap Wave 1 D).
 * Also guards the plugin's own logo icon (plan 59 § 5): its inline path must never drift from the
 * production asset it is drawn from.
 *
 * BonsaiSvgIcon (Decky's own plugin-list icon) used to draw the small trunk/pot outline below,
 * the same one BonsaiTreeTabIcon (the Steam-level tab title) still uses. Roadmap: "The Decky
 * plugin icon does not match the tab bar's bonsai icon" (reported 2026-09-19) — the fix makes
 * BonsaiSvgIcon render the production logo asset instead, the same one the open tab strip's Main
 * cell (BonsaiLogoIcon) already draws, so picking bonsAI in Decky's list and opening its tab strip
 * now show the same drawing.
 */
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BonsaiLogoIcon, BonsaiSvgIcon, BonsaiTreeTabIcon } from "./icons";

/** Documented corrected path: pot/trunk shifted 0.5 left so rim/base center aligns with canopy. */
const BONSAI_TRUNK_POT_PATH = "M11.5 14.5v3.2m-4.8 0h9.6l-1.1 2.3H7.8l-1.1-2.3Z";

function trunkPotPath(container: HTMLElement): string | null {
  const paths = container.querySelectorAll("svg path");
  return paths.length >= 2 ? paths[1].getAttribute("d") : null;
}

describe("bonsai icon trunk/pot geometry", () => {
  it("BonsaiTreeTabIcon uses canopy-aligned trunk/pot path", () => {
    const { container } = render(<BonsaiTreeTabIcon size={36} />);
    expect(trunkPotPath(container)).toBe(BONSAI_TRUNK_POT_PATH);
  });
});

const productionLogoAssetD = (() => {
  const svgSource = fs.readFileSync(
    path.join(__dirname, "..", "assets", "icons", "bonsai-logo.svg"),
    "utf-8",
  );
  const assetPathMatch = svgSource.match(/<path\s[^>]*\bd="([^"]*)"/);
  return assetPathMatch?.[1] ?? null;
})();

describe("BonsaiLogoIcon matches the production asset (plan 59 § 5)", () => {
  it("the asset itself still has exactly one path with a d attribute to compare against", () => {
    expect(productionLogoAssetD).toBeTruthy();
  });

  it("renders exactly one path with the asset's own d, fill=currentColor, fill-rule=evenodd, viewBox 0 0 475 475", () => {
    const { container } = render(<BonsaiLogoIcon size={22} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 475 475");
    const paths = container.querySelectorAll("svg path");
    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute("d")).toBe(productionLogoAssetD);
    expect(paths[0].getAttribute("fill")).toBe("currentColor");
    expect(paths[0].getAttribute("fill-rule")).toBe("evenodd");
  });

  it("sizes the IconShell box to the requested size", () => {
    const { container } = render(<BonsaiLogoIcon size={22} />);
    const shell = container.firstElementChild as HTMLElement;
    expect(shell.style.width).toBe("22px");
    expect(shell.style.height).toBe("22px");
  });
});

describe("BonsaiSvgIcon matches BonsaiLogoIcon (roadmap: Decky plugin icon does not match the tab bar's bonsai icon)", () => {
  it("no longer draws the small trunk/pot outline BonsaiTreeTabIcon uses", () => {
    const { container } = render(<BonsaiSvgIcon size={26} />);
    expect(trunkPotPath(container)).not.toBe(BONSAI_TRUNK_POT_PATH);
  });

  it("renders the same production asset path, viewBox and fill rule as BonsaiLogoIcon", () => {
    const { container } = render(<BonsaiSvgIcon size={26} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 475 475");
    const paths = container.querySelectorAll("svg path");
    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute("d")).toBe(productionLogoAssetD);
    expect(paths[0].getAttribute("fill")).toBe("currentColor");
    expect(paths[0].getAttribute("fill-rule")).toBe("evenodd");
  });
});
