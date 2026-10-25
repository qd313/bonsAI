/**
 * Title: The index of bonsAI's own settings
 * Purpose: Pin the table the Search tab reads to find bonsAI's own settings: every entry's tab and section exist
 *          in the fold tables the tabs are drawn from (a renamed or removed section fails here, not on the Deck),
 *          every section of the Settings and Ollama tabs has at least one entry, every Permissions entry is a real
 *          switch with its drawn name, and the words a person types find the right row ("mic", "spoiler",
 *          "text size") and nothing for a Steam-only word ("brightness").
 * Used for: bonsaiSettingsIndex.ts (plan 96, lane N2).
 * Does not: Draw the results or jump anywhere (SearchTab.bonsaiSettings.test.tsx, bonsaiSettingJump.test.ts).
 */
import { describe, expect, it } from "vitest";

import { OLLAMA_SECTIONS } from "../ai-connection/ollamaTabFolds";
import { PERMISSION_TOGGLE_LABELS } from "../permissions/permissionDeepLink";
import { SETTINGS_SECTIONS } from "../settings/settingsTabFolds";
import { BONSAI_SETTINGS_INDEX, bonsaiSettingCrumb, matchBonsaiSettings } from "./bonsaiSettingsIndex";

const SECTIONS_BY_TAB = {
  settings: SETTINGS_SECTIONS.map((s) => s.id as string),
  ollama: OLLAMA_SECTIONS.map((s) => s.id as string),
};

describe("the table", () => {
  it("names a tab and a section that exist in the fold tables for every entry", () => {
    for (const entry of BONSAI_SETTINGS_INDEX) {
      if (entry.tab === "permissions") {
        expect(entry.section, entry.label).toBeNull();
      } else {
        expect(SECTIONS_BY_TAB[entry.tab], `${entry.label}: section ${entry.section}`).toContain(entry.section);
      }
    }
  });

  it("covers every section of the Settings tab and of the Ollama tab", () => {
    for (const tab of ["settings", "ollama"] as const) {
      for (const section of SECTIONS_BY_TAB[tab]) {
        const found = BONSAI_SETTINGS_INDEX.some((e) => e.tab === tab && e.section === section);
        expect(found, `${tab}/${section} has no entry`).toBe(true);
      }
    }
  });

  it("gives every Permissions entry a real switch, with the name the tab draws", () => {
    const entries = BONSAI_SETTINGS_INDEX.filter((e) => e.tab === "permissions");
    expect(entries.map((e) => e.row).sort()).toEqual(Object.keys(PERMISSION_TOGGLE_LABELS).sort());
    for (const entry of entries) {
      expect(entry.label).toBe(PERMISSION_TOGGLE_LABELS[entry.row as keyof typeof PERMISSION_TOGGLE_LABELS]);
    }
  });

  it("has a label, words and a row for each entry, and no label twice", () => {
    const labels = BONSAI_SETTINGS_INDEX.map((e) => e.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const entry of BONSAI_SETTINGS_INDEX) {
      expect(entry.label.trim(), "label").not.toBe("");
      expect(entry.row.trim(), `${entry.label}: row`).not.toBe("");
      expect(entry.words.length, `${entry.label}: words`).toBeGreaterThan(0);
      for (const w of entry.words) expect(w, `${entry.label}: "${w}" is lower case`).toBe(w.toLowerCase());
    }
  });

  it("draws the place as the tab and the section's own title", () => {
    const voice = BONSAI_SETTINGS_INDEX.find((e) => e.label === "Voice input")!;
    expect(bonsaiSettingCrumb(voice)).toBe("bonsAI Settings > Voice input");
    const internet = BONSAI_SETTINGS_INDEX.find((e) => e.label === "Internet downloads")!;
    expect(bonsaiSettingCrumb(internet)).toBe("bonsAI Permissions");
  });
});

describe("matching a typed word", () => {
  const labels = (word: string) => matchBonsaiSettings(word).map((e) => e.label);

  it("finds Voice input for mic, microphone and voice", () => {
    expect(labels("mic")).toContain("Voice input");
    expect(labels("microphone")).toContain("Voice input");
    expect(labels("VOICE")).toContain("Voice input");
  });

  it("finds Story spoilers and How much to hide for spoiler", () => {
    expect(labels("spoiler")).toEqual(["Story spoilers", "How much to hide"]);
    expect(labels("how much")).toEqual(["How much to hide"]);
  });

  it("finds Text size for 'text size' and for text, size and font", () => {
    expect(labels("text size")).toEqual(["Text size"]);
    for (const w of ["text", "size", "font"]) expect(labels(w)).toContain("Text size");
  });

  it("finds a Permissions switch by its own name", () => {
    expect(labels("internet")).toEqual(["Internet downloads"]);
  });

  it("finds nothing for a word only Steam knows, or for one letter", () => {
    expect(labels("brightness")).toEqual([]);
    expect(labels("m")).toEqual([]);
    expect(labels("  ")).toEqual([]);
  });

  it("lists the entries in the table's own order", () => {
    const order = BONSAI_SETTINGS_INDEX.map((e) => e.label);
    const got = labels("voice");
    expect(got.length).toBeGreaterThan(1);
    expect(got).toEqual(order.filter((l) => got.includes(l)));
  });
});
