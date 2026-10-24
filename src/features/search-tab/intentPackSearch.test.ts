import { describe, expect, it } from "vitest";
import {
  buildIntentPackSearchIndex,
  searchSettingsWithIntentPacks,
  type IntentPack,
} from "./intentPackSearch";

const DATABASE = [
  "Settings > Internet > Enable Wi-Fi",
  "Settings > Display > Brightness",
  "QAM > Performance > TDP Limit",
];

const SAMPLE_PACKS: IntentPack[] = [
  {
    id: "test",
    label: "Test",
    enabled: true,
    entries: [
      {
        target: "Settings > Internet > Enable Wi-Fi",
        aliases: ["wifi"],
        synonyms: ["wireless"],
        expansions: ["network"],
      },
      {
        target: "QAM > Performance > TDP Limit",
        aliases: ["tdp"],
        synonyms: [],
        expansions: ["performance"],
      },
    ],
  },
];

describe("searchSettingsWithIntentPacks", () => {
  it("returns empty for short queries", () => {
    expect(searchSettingsWithIntentPacks("w", DATABASE, null)).toEqual([]);
  });

  it("preserves native-only results when index is null", () => {
    expect(searchSettingsWithIntentPacks("brightness", DATABASE, null)).toEqual([
      "Settings > Display > Brightness",
    ]);
  });

  it("matches alias terms from enabled packs", () => {
    const index = buildIntentPackSearchIndex(SAMPLE_PACKS);
    const hits = searchSettingsWithIntentPacks("wifi", DATABASE, index);
    expect(hits).toContain("Settings > Internet > Enable Wi-Fi");
  });

  it("ranks native matches before pack hits and dedupes", () => {
    const index = buildIntentPackSearchIndex(SAMPLE_PACKS);
    const hits = searchSettingsWithIntentPacks("internet", DATABASE, index);
    expect(hits[0]).toBe("Settings > Internet > Enable Wi-Fi");
    expect(hits.filter((h) => h === "Settings > Internet > Enable Wi-Fi")).toHaveLength(1);
  });

  it("includes expansion matches after alias/synonym tier", () => {
    const index = buildIntentPackSearchIndex(SAMPLE_PACKS);
    const hits = searchSettingsWithIntentPacks("performance", DATABASE, index);
    expect(hits).toContain("QAM > Performance > TDP Limit");
  });

  it("ignores disabled packs", () => {
    const index = buildIntentPackSearchIndex([{ ...SAMPLE_PACKS[0], enabled: false }]);
    expect(searchSettingsWithIntentPacks("wifi", DATABASE, index)).toEqual([]);
  });
});
