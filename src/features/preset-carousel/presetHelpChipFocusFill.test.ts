/**
 * Title: The "How to use bonsAI" chip lights up under the ring like every other chip
 * Purpose: Pin that the help chip, when Steam's D-pad ring is on it (Steam's `gpfocus` class), ends
 *          up with the same soft blue fill a suggestion chip gets, and that it keeps its own green
 *          look when the ring is elsewhere.
 * Used for: The chips' focused rule in section-4.ts and the help chip's own colours in section-6.ts.
 * Solves: Measured on the Deck 2026-10-22 (plan 97, row P97-B-HELP-CHIP-RING): the help chip held
 *         the ring but looked exactly as it did at rest. Its own green background rule is as
 *         specific as the chips' focused rule, both are !important, and it comes later in the
 *         sheet, so it won and the blue fill never showed.
 * Does not: Paint anything; jsdom has no paint engine and drops gradients. This works out which
 *           rule's background wins the way the browser does (important first, then the more
 *           specific selector, then the later rule) over the real combined stylesheet.
 *
 * How it works: every rule of the real stylesheet is matched against a mounted chip with
 * `Element.matches`; selectors jsdom cannot parse are skipped (they are the `:has()` arms that
 * stand in for the ring on desktop, false on the Deck anyway). The winning `background` text of
 * the help chip is compared with that of a suggestion chip in the same state.
 */
import { afterEach, describe, expect, it } from "vitest";

import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";

type Candidate = { important: boolean; weight: number; order: number; value: string };

/** Rough selector specificity, ids, then classes and pseudo-classes, then element names. */
function weightOf(selector: string): number {
  const s = selector.replace(/:(not|is|where|has)\(/g, " (");
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classLike = (s.match(/[.:][\w-]+|\[[^\]]+\]/g) ?? []).length;
  const names = (s.replace(/[.#:][\w-]+|\[[^\]]+\]/g, " ").match(/(?:^|[\s>+~(])[a-z][\w-]*/gi) ?? []).length;
  return ids * 10000 + classLike * 100 + names;
}

/** The `background` value the browser would settle on for this element, from the given sheet. */
function winningBackground(css: string, el: Element): string | null {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let best: Candidate | null = null;
  let order = 0;
  for (const block of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const head = block[1]!.trim();
    order += 1;
    if (head.startsWith("@")) continue;
    const decl = block[2]!.split(/;(?![^(]*\))/).find((d) => d.split(":")[0]!.trim() === "background");
    if (!decl) continue;
    const raw = decl.slice(decl.indexOf(":") + 1).trim();
    for (const selector of head.split(/,(?![^(]*\))/).map((x) => x.trim())) {
      let hit = false;
      try {
        hit = el.matches(selector);
      } catch {
        hit = false;
      }
      if (!hit) continue;
      const next: Candidate = {
        important: /!important\s*$/.test(raw),
        weight: weightOf(selector),
        order,
        value: raw.replace(/\s*!important\s*$/, "").replace(/\s+/g, " "),
      };
      const beats =
        !best ||
        (next.important !== best.important
          ? next.important
          : next.weight !== best.weight
            ? next.weight > best.weight
            : next.order > best.order);
      if (beats) best = next;
    }
  }
  return best ? best.value : null;
}

const mounted: HTMLElement[] = [];
afterEach(() => {
  mounted.splice(0).forEach((el) => el.remove());
});

/** A chip in the dock's row, with the classes the Deck read off it (evidence P97-B / P97-A). */
function mountChip(kind: "help" | "suggestion", withRing: boolean): HTMLElement {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  const row = document.createElement("div");
  row.className = "bonsai-full-bleed-row bonsai-preset-row-host";
  const chip = document.createElement("button");
  chip.className =
    (kind === "help" ? "bonsai-preset-glass bonsai-preset-help-chip" : "bonsai-preset-glass") +
    (withRing ? " Focusable gpfocus gpfocuswithin" : " Focusable");
  row.appendChild(chip);
  scope.appendChild(row);
  document.body.appendChild(scope);
  mounted.push(scope);
  return chip;
}

describe("the help chip's focused look", () => {
  const css = buildBonsaiScopeStylesheet();

  it("on the Deck: with the ring on it, the help chip gets the same blue fill as a suggestion chip", () => {
    const helpLit = winningBackground(css, mountChip("help", true));
    const suggestionLit = winningBackground(css, mountChip("suggestion", true));
    expect(suggestionLit).toContain("rgba(56, 189, 248, 0.20)");
    expect(helpLit).toBe(suggestionLit);
  });

  it("without the ring, the help chip keeps its own green and shows no blue", () => {
    const helpRest = winningBackground(css, mountChip("help", false));
    expect(helpRest).toContain("rgba(46, 135, 83, 0.28)");
    expect(helpRest).not.toContain("rgba(56, 189, 248");
  });
});
