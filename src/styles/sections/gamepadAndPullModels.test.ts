/**
 * Title: The models list must fill its popup, not take a share of the screen — stylesheet checks
 * Purpose: Pin the fix for roadmap "You only see two models before you have to scroll" (measured
 *          on the Deck 2026-09-20). The list shell capped itself at `min(48vh, 400px)`. A share of
 *          viewport height is not one fixed number: the Deck drives its own 1280x800 panel some of
 *          the time and an external 1920x1080 monitor the rest of the time, and it is never
 *          announced. The same stylesheet therefore gave the list 400px on the monitor and about
 *          300px on the Deck's own screen, which is where "two models" came from while a drawing
 *          made on the monitor said five. Both were right about different screens.
 * Used for: The `.bonsai-pullmodels-shell` and `.bonsai-pullmodels-list` rules in
 *           gamepadAndPullModels.ts, and a sweep of the whole scoped stylesheet for the same
 *           mistake anywhere else.
 * Does not: Render anything or measure layout — jsdom has no layout engine (design-language.md
 *           rule 6), so these read the generated CSS text, the way section-4.test.ts and
 *           section-6.test.ts do for the same reason. Proving the row count on each screen is a
 *           device job and stays one.
 *
 * The shape to keep: exactly one box decides how tall a popup may be, and it is the popup's own
 * outermost box, which may size itself against the screen because that is what keeps the popup on
 * the screen. Everything inside it fills what it is given (`flex: 1 1 auto; min-height: 0`) and
 * scrolls. A second, screen-relative cap further in is the bug — it wins over the parent's box on
 * whichever screen makes it the smaller of the two, so the fault appears on one screen and hides
 * on the other.
 */
import { describe, expect, it } from "vitest";
import { buildPullModelsStylesheet } from "./gamepadAndPullModels";
import { buildBonsaiScopeStylesheet } from "../bonsaiScopeStylesheet";

/** Drop CSS comments, so a rule that explains the old mistake is not read as still making it. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Read one rule's body out of a stylesheet by its exact selector. */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = withoutComments(css).match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  expect(match, `expected a rule for ${selector}`).toBeTruthy();
  return match![1]!;
}

describe("the models list fills its popup instead of measuring the screen", () => {
  const css = buildPullModelsStylesheet();

  it("lets the list's shell take whatever height the popup body gives it", () => {
    const body = ruleBody(css, ".bonsai-scope .bonsai-pullmodels-shell");
    // Fill the parent, and be allowed to shrink inside it. Without `min-height: 0` a flex child
    // refuses to go below its content height, so the list would push the popup instead of scrolling.
    expect(body).toMatch(/flex:\s*1\s+1\s+auto/);
    expect(body).toMatch(/min-height:\s*0/);
    // `none` rather than simply absent, so the old cap is actively cleared. The same shell is used
    // by both ways into this list — the models hub and the standalone pull popup — so an inherited
    // or later-added cap has something to lose against.
    expect(body).toMatch(/max-height:\s*none/);
  });

  it("gives the rows themselves the scroll, so a short popup still reaches every model", () => {
    const body = ruleBody(css, ".bonsai-scope .bonsai-pullmodels-list");
    expect(body).toMatch(/flex:\s*1\s+1\s+auto/);
    expect(body).toMatch(/min-height:\s*0/);
    expect(body).toMatch(/overflow-y:\s*auto/);
  });

  it("ties neither of them to the size of the screen", () => {
    // This is the actual regression guard. A height written in vh, vw, vmin, vmax, dvh or svh here
    // reintroduces the 2026-09-20 bug: correct on one screen, wrong on the other, and nobody says
    // which screen is plugged in.
    for (const selector of [
      ".bonsai-scope .bonsai-pullmodels-shell",
      ".bonsai-scope .bonsai-pullmodels-list",
    ]) {
      expect(ruleBody(css, selector)).not.toMatch(/\d\s*(?:vh|vw|vmin|vmax|dvh|svh|dvw|svw)\b/);
    }
  });
});

describe("no scrolling area in the plugin sizes itself against the screen", () => {
  /**
   * Selectors allowed to measure the screen, each with the reason. A screen-relative height is
   * right for something pinned to the screen itself; it is wrong for anything sitting inside a
   * popup, which already has a bounded box to fill.
   */
  const ALLOWED = [
    // An opt-in developer badge, position: fixed to the corner of the screen. It is pinned to the
    // screen, so a share of the screen is the correct measure, and it holds no reachable controls.
    ".bonsai-debug-overlay",
  ];

  it("keeps every height in the scoped stylesheet off the screen's own size", () => {
    const css = withoutComments(buildBonsaiScopeStylesheet());
    const offenders: string[] = [];
    const rulePattern = /([^{}]+)\{([^}]*)\}/g;
    for (const [, rawSelector, declarations] of css.matchAll(rulePattern)) {
      const screenSized = declarations
        .split(";")
        .map((d) => d.trim())
        .filter(
          (d) =>
            /^(?:max-height|min-height|height)\s*:/.test(d) &&
            /\d\s*(?:vh|vw|vmin|vmax|dvh|svh|dvw|svw)\b/.test(d),
        );
      if (screenSized.length === 0) continue;
      const selector = rawSelector.trim().split("\n").pop()!.trim();
      if (ALLOWED.some((allowed) => selector.includes(allowed))) continue;
      offenders.push(`${selector} -> ${screenSized.join("; ")}`);
    }
    // If this fails on something genuinely pinned to the screen, add it to ALLOWED above with the
    // reason. If it fails on anything inside a popup, the fix is to fill the parent instead.
    expect(offenders).toEqual([]);
  });
});
