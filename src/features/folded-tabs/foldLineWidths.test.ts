/**
 * How it works: a folded section's one-line header keeps its NAME whole and lets the SUMMARY give way, as the
 * drawing does (mockup-board-2 43-tabs.css .k-ft / .k-fs). Read back out of the built stylesheet (lessons § 5).
 * Deck check: "WHERE AI..." / "KNOWLEDGE BASE (OF..." names are no longer cut; the summary takes the ellipsis. A name
 * too long for the whole line wraps rather than pushing the arrow (plan 97 L13; the sums are in foldLineFit.test.ts).
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
  const summaryText = rule(".bonsai-scope .bonsai-fold-line__summary-text");
  const chevron = rule(".bonsai-scope .bonsai-fold-line__chevron");

  it("the name never grows, has no width cap and is never cut: too long, it wraps", () => {
    expect(name["flex"]).toMatch(/^0 /);
    expect(name["max-width"]).toBeUndefined();
    expect(name["overflow"]).toBeUndefined();
    expect(name["text-overflow"]).toBeUndefined();
    expect(name["white-space"]).toBe("normal");
  });
  it("the summary shrinks to nothing and its words end in an ellipsis", () => {
    expect(summary["min-width"]).toBe("0");
    expect(summary["overflow"]).toBe("hidden");
    expect(summaryText["text-overflow"]).toBe("ellipsis");
  });
  it("the chevron keeps its place", () => {
    expect(chevron["flex"]).toBe("none");
  });
});
