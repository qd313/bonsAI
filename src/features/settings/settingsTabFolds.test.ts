/**
 * Title: The Settings tab's folded sections: names, summaries and strip words
 * Purpose: Pin plan 91 § 3c / plan 92 T1's first piece: the nine Settings sections in order,
 *          each section's one-line summary against the density board's own drawing
 *          (docs/demos/mockup-board-2/src/44-tabs.js, `sectionSummary`, fed the state 42-tabs-data.js draws),
 *          and every row's longer text word for word against that data file.
 * Used for: settingsTabFolds.ts.
 * Does not: Draw the tab or walk it (SettingsTab.foldedWalk.test.tsx does).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SETTINGS_FOLD_TAB,
  SETTINGS_ROW_HELP,
  SETTINGS_SECTIONS,
  accentIntensityHelp,
  settingsSectionSummaries,
  type SettingsFoldValues,
} from "./settingsTabFolds";

const DRAWING_STATE = join(process.cwd(), "docs", "demos", "mockup-board-2", "src", "42-tabs-data.js");
const drawn = readFileSync(DRAWING_STATE, "utf8");

/**
 * The state the drawing's Settings tab is in: Save memory, Normal, remember off, spoilers on, chip off, base.en, character on,
 * Developer on. The drawing is older than the spoiler tier row (plan 98), so the tier is Default here and the Story spoilers
 * summary is the one place this test reads past the drawing.
 */
const DRAWN: SettingsFoldValues = {
  screenshotAttachmentPreset: "low",
  chatTextSize: "normal",
  rememberTyped: false,
  spoilerMasking: true,
  spoilerTier: "default",
  singleChip: false,
  voiceSttModel: "base.en",
  aiCharacterEnabled: true,
  showDeveloperTab: true,
};

describe("the Settings tab's sections", () => {
  it("belong to the tab the fold store and the tab body know as settings", () => {
    expect(SETTINGS_FOLD_TAB).toBe("settings");
  });

  it("are the drawing's sections, in the drawing's order, under the drawing's names", () => {
    const names = Array.from(drawn.matchAll(/sec\("([^"]+)"\)/g)).map((m) => m[1]!);
    const settingsStart = names.indexOf("Screenshot quality");
    expect(names.slice(settingsStart, settingsStart + SETTINGS_SECTIONS.length)).toEqual(SETTINGS_SECTIONS.map((s) => s.title));
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      "screenshot",
      "textsize",
      "remember",
      "spoilers",
      "chips",
      "voiceinput",
      "character",
      "data",
    ]);
  });
});

describe("the Settings tab's summaries, by the drawing's rule", () => {
  it("read exactly as the drawing's sectionSummary reads them in the state it draws", () => {
    expect(settingsSectionSummaries(DRAWN)).toEqual({
      screenshot: "Save memory",
      textsize: "Normal",
      remember: "off",
      spoilers: "How much to hide: Default · Hide spoilers until I tap on",
      chips: "Show one chip instead of two off",
      voiceinput: "STT model: base.en",
      character: "on",
      data: "Show Developer tab on",
    });
  });

  it("follow each setting: a choice shows its pick, a lone switch shows on or off, the section's own name is dropped", () => {
    const flipped = settingsSectionSummaries({
      screenshotAttachmentPreset: "max",
      chatTextSize: "large",
      rememberTyped: true,
      spoilerMasking: false,
      spoilerTier: "open",
      singleChip: true,
      voiceSttModel: "tiny.en",
      aiCharacterEnabled: false,
      showDeveloperTab: false,
    });
    expect(flipped).toEqual({
      screenshot: "Best detail",
      textsize: "Large",
      remember: "on",
      spoilers: "How much to hide: Hide less · Hide spoilers until I tap off",
      chips: "Show one chip instead of two on",
      voiceinput: "STT model: tiny.en",
      character: "off",
      data: "Show Developer tab off",
    });
  });
});

describe("the Settings tab's strip words", () => {
  it("are the drawing's words, row by row, except the Text size row, which keeps the words plan 89 gave it", () => {
    const fromDrawing: Array<[string, string]> = [
      ["Screenshot quality", SETTINGS_ROW_HELP.screenshot],
      ["Remember what I typed", SETTINGS_ROW_HELP.remember],
      ["Story spoilers", SETTINGS_ROW_HELP.spoilers],
      ["Suggestion chips", SETTINGS_ROW_HELP.chips],
      ["Voice input", SETTINGS_ROW_HELP.voiceInput],
      ["AI voice & personality", SETTINGS_ROW_HELP.character],
      ["Show Developer tab", SETTINGS_ROW_HELP.developerTab],
    ];
    for (const [row, words] of fromDrawing) expect(drawn, row).toContain(words);
  });

  it("keep the Text size words the row has had since plan 89 (the drawing's copy is older)", () => {
    expect(SETTINGS_ROW_HELP.textSize).toMatch(/^How big the words are, everywhere in bonsAI:/);
    expect(SETTINGS_ROW_HELP.textSize).not.toMatch(/stay the same|only the chat/i);
  });

  it("name the accent level then point at the menu", () => {
    expect(accentIntensityHelp("balanced")).toMatch(/ — use the menu for full descriptions\.$/);
  });
});
