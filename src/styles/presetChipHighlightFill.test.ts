/**
 * Title: Preset chip highlight is a soft blue fill
 * Purpose: Pin what the chip under the D-pad ring looks like: a pale blue tint laid over its own
 *          gradient and brighter words, with no light bar along its bottom edge.
 * Used for: The highlighted chip rule in section-4.ts and the resting chip rule in section-6.ts.
 * Solves: The maintainer's pick of 2026-10-02 ("highlight 1, the soft fill") replacing the
 *         bottom bar. The tests read the colour the browser would resolve for a chip that holds the
 *         ring and for one that does not, from the real combined stylesheet.
 * Does not: Check paint on screen; jsdom has no paint engine. The edge flash and its own bar are
 *           pinned in presetChipFocusRing.test.ts and section-4.test.ts.
 *
 * How it works: the real stylesheet is put in a style tag and getComputedStyle reads a button
 * with and without Steam's focus marker. jsdom drops gradients from the background shorthand, so
 * the declared rule text is read as well and both are pinned.
 */
import { afterEach, describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "./bonsaiScopeStylesheet";

const REST_GRADIENT = "linear-gradient(180deg, rgba(56, 70, 84, 0.5) 0%, rgba(16, 22, 30, 0.55) 100%)";
const TINT = "linear-gradient(rgba(56, 189, 248, 0.20), rgba(56, 189, 248, 0.20))";

/** The declarations of the rule whose selector list contains this exact selector. */
function ruleBodyFor(css: string, selector: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = stripped.match(/[^{}]+\{[^}]*\}/g) ?? [];
  const hits = rules.filter((rule) =>
    rule
      .split("{")[0]!
      .split(",")
      .some((sel) => sel.trim() === selector),
  );
  expect(hits.length, `no rule for ${selector}`).toBeGreaterThan(0);
  return hits.map((rule) => rule.split("{")[1]!.replace("}", "")).join(" ");
}

const mounted: HTMLElement[] = [];
afterEach(() => {
  mounted.splice(0).forEach((el) => el.remove());
});

/**
 * A chip styled by the real rules for it. jsdom cannot parse the long `:has()` selector lists the
 * stylesheet uses, so only the two rules a chip needs are lifted out of it, body unchanged: the
 * resting chip's and the plain `.gpfocus` one's (the arm every other arm repeats).
 */
function mountChip(withRing: boolean): HTMLElement {
  const css = buildBonsaiScopeStylesheet();
  const style = document.createElement("style");
  style.textContent =
    `.bonsai-scope .bonsai-preset-glass { ${ruleBodyFor(css, ".bonsai-scope .bonsai-preset-glass")} }
` +
    `.bonsai-scope button.bonsai-preset-glass.gpfocus { ${ruleBodyFor(css, FOCUSED)} }
` +
    `.bonsai-scope button.bonsai-preset-glass.gpfocus .bonsai-preset-chip-label { ${ruleBodyFor(css, `${FOCUSED} .bonsai-preset-chip-label`)} }`;
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  const chip = document.createElement("button");
  chip.className = `bonsai-preset-glass${withRing ? " gpfocus" : ""}`;
  const label = document.createElement("span");
  label.className = "bonsai-preset-chip-label";
  chip.appendChild(label);
  scope.appendChild(chip);
  document.head.appendChild(style);
  document.body.appendChild(scope);
  mounted.push(style, scope);
  return chip;
}

const FOCUSED = ".bonsai-scope button.bonsai-preset-glass.gpfocus";

describe("preset chip highlight is a soft fill, not a bar", () => {
  const css = buildBonsaiScopeStylesheet();
  const focusedSelector = FOCUSED;

  it("tints the highlighted chip over its own resting gradient", () => {
    const body = ruleBodyFor(css, focusedSelector);
    expect(body.replace(/\s+/g, " ")).toContain(`background: ${TINT}, ${REST_GRADIENT} !important`);
  });

  it("draws no light bar along the bottom edge of the highlighted chip", () => {
    const body = ruleBodyFor(css, focusedSelector);
    expect(body).not.toMatch(/inset 0 -2px 0/);
    // The resting hairline and drop shadow stay, in the same list.
    expect(body).toMatch(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.10\)/);
    expect(body).toMatch(/0 2px 3px rgba\(0,\s*0,\s*0,\s*0\.4\)/);
  });

  it("brightens the highlighted chip's words to #eef7fd", () => {
    const labelRule = ruleBodyFor(css, `${focusedSelector} .bonsai-preset-chip-label`);
    expect(labelRule).toContain("color: #eef7fd !important;");
    expect(css).not.toContain("#dcebf8");
  });

  it("the resting chip has no tint and no bottom bar", () => {
    const body = ruleBodyFor(css, ".bonsai-scope .bonsai-preset-glass").replace(/\s+/g, " ");
    expect(body).toContain(`background: ${REST_GRADIENT} !important`);
    expect(body).not.toContain("rgba(56, 189, 248");
    expect(body).not.toMatch(/inset 0 -2px 0/);
  });

  it("on screen: a chip holding the ring gets bright words and no bar, a resting chip no tint", () => {
    const litChip = mountChip(true);
    const restChip = mountChip(false);
    const lit = getComputedStyle(litChip);
    const rest = getComputedStyle(restChip);
    // jsdom's style parser cannot hold a two-layer background, so the tint layer itself is pinned
    // from the rule text above; here the resting chip is checked to carry none.
    expect(rest.backgroundImage).not.toContain("rgba(56, 189, 248");
    expect(lit.boxShadow).not.toMatch(/-2px/);
    expect(lit.boxShadow).toContain("0 2px 3px");
    expect(lit.boxShadow.replace(/\s+/g, " ")).toBe(rest.boxShadow.replace(/\s+/g, " "));
    expect(getComputedStyle(litChip.firstElementChild!).color).toBe("rgb(238, 247, 253)");
  });
});
