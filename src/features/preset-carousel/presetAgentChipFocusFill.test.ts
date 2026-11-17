/**
 * Title: The agent chip lights up under the ring like every other chip
 * Purpose: Pin that the orange agent chip, when Steam's D-pad ring is on it (`gpfocus`), ends up
 *          with the same soft blue fill a suggestion chip gets, and keeps its own dark orange-brown
 *          fill when the ring is elsewhere.
 * Used for: The chips' focused rule in section-4.ts and the agent chip's rule in section-6.ts.
 * Solves: Row CHIP-BUTTON-06: section-6.ts sets the agent chip's background with !important at the
 *         same weight as the focused rule and comes later, so the blue fill never showed.
 * Does not: Paint anything; it works out which rule's background wins, as the help chip's test does.
 *
 * How it works: same cascade model as presetHelpChipFocusFill.test.ts, over the real stylesheet.
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
function mountChip(kind: "help" | "agent" | "suggestion", withRing: boolean): HTMLElement {
  const scope = document.createElement("div");
  scope.className = "bonsai-scope";
  const row = document.createElement("div");
  row.className = "bonsai-full-bleed-row bonsai-preset-row-host";
  const chip = document.createElement("button");
  chip.className =
    (kind === "help" ? "bonsai-preset-glass bonsai-preset-help-chip" : kind === "agent" ? "bonsai-preset-glass bonsai-pyro-inject-chip" : "bonsai-preset-glass") +
    (withRing ? " Focusable gpfocus gpfocuswithin" : " Focusable");
  row.appendChild(chip);
  scope.appendChild(row);
  document.body.appendChild(scope);
  mounted.push(scope);
  return chip;
}

describe("the agent chip's focused look", () => {
  const css = buildBonsaiScopeStylesheet();

  it("on the Deck: with the ring on it, the agent chip gets the same blue fill as a suggestion chip", () => {
    const agentLit = winningBackground(css, mountChip("agent", true));
    const suggestionLit = winningBackground(css, mountChip("suggestion", true));
    expect(suggestionLit).toContain("rgba(56, 189, 248, 0.20)");
    expect(agentLit).toBe(suggestionLit);
  });

  it("without the ring, the agent chip keeps its own fill and shows no blue", () => {
    const rest = winningBackground(css, mountChip("agent", false));
    expect(rest).toContain("rgba(38, 22, 18, 0.38)");
    expect(rest).not.toContain("rgba(56, 189, 248");
  });
});
