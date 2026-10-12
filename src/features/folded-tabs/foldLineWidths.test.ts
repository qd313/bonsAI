/**
 * How it works: a folded section's one-line header keeps its NAME whole and lets the SUMMARY give way, as the
 * drawing does (mockup-board-2 43-tabs.css .k-ft / .k-fs). Read back out of the built stylesheet (lessons § 5).
 * Deck check: "WHERE AI..." / "KNOWLEDGE BASE (OF..." names are no longer cut; the summary takes the ellipsis.
 */
import { describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";

function rule(selector: string): Record<string, string> {
  const css = buildBonsaiScopeStylesheet();
  const at = css.indexOf(`${selector} {`);
  expect(at).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const decl of body.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const [k, ...v] = decl.split(":");
    if (k && v.length) out[k.trim()] = v.join(":").trim();
  }
  return out;
}

describe("folded section line: the name stays whole, the summary gives way", () => {
  const name = rule(".bonsai-scope .bonsai-fold-line__name");
  const summary = rule(".bonsai-scope .bonsai-fold-line__summary");
  const chevron = rule(".bonsai-scope .bonsai-fold-line__chevron");

  it("the name does not shrink and has no width cap", () => {
    expect(name["flex"]).toMatch(/^0 0 /);
    expect(name["max-width"]).toBeUndefined();
  });
  it("the summary shrinks to nothing and ends in an ellipsis", () => {
    expect(summary["min-width"]).toBe("0");
    expect(summary["overflow"]).toBe("hidden");
    expect(summary["text-overflow"]).toBe("ellipsis");
  });
  it("the chevron keeps its place", () => {
    expect(chevron["flex"]).toBe("none");
  });
});
