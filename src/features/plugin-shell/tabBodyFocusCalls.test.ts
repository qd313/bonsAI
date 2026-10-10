/**
 * Title: The plain tabs hop between controls through focusInTabBody (plan 87, B10)
 * Purpose: Keep the controls the Ollama and Settings tabs focus by hand off a plain `el.focus()`, which the
 *          browser scrolls for before its focus event (the 310 to 372 px Up jumps of the second Deck walk).
 * Used for: OllamaTab, OllamaWhereAiRunsSection, KnowledgeBaseSection, SettingsTab, SettingsTabUiScaleSection,
 *           SettingsTabConnectionTimeoutSlider.
 * Does not: Cover popovers and modals opened from the tabs, which are not in the tab body's pane.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILES = [
  "OllamaTab.tsx",
  "OllamaWhereAiRunsSection.tsx",
  "KnowledgeBaseSection.tsx",
  "SettingsTab.tsx",
  "SettingsTabUiScaleSection.tsx",
  "SettingsTabConnectionTimeoutSlider.tsx",
];

describe("focus calls in the plain tabs", () => {
  for (const file of FILES) {
    it(`${file} has no plain .focus() call`, () => {
      const code = readFileSync(join(process.cwd(), "src", "components", file), "utf8")
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line));
      expect(code.filter((line) => /\.focus\(/.test(line) && !/focusInTabBody/.test(line))).toEqual([]);
    });
  }
});
