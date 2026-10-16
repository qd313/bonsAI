/**
 * Title: The Developer tab's folded sections, against the drawing
 * Purpose: Pin plan 91 § 2b's summary rule to the drawing's own lines for the six Developer sections
 *          (docs/demos/mockup-board-2/src/42-tabs-data.js and 44-tabs.js, the state they draw: scramble off,
 *          hybrid retrieval on, the tab reopening on the tab you left, app logging off, preset fade), and
 *          check every Developer row's longer text word for word against the board's own data file, so a
 *          row the code has and the checklist lacks (or the other way round) fails here.
 * Used for: developerTabFolds.ts.
 * Does not: Draw the tab (DeveloperTab.folded.test.tsx does) or walk it (DeveloperTab.foldedWalk.test.tsx).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEVELOPER_ROW_HELP,
  DEVELOPER_ROW_LABELS,
  DEVELOPER_SECTIONS,
  appLogHelp,
  developerSectionSummaries,
  developerSectionsShown,
  tabToOpenOnHelp,
  type DeveloperFoldValues,
} from "./developerTabFolds";

/** The state the drawing draws. */
const DRAWN: DeveloperFoldValues = {
  hasSeedKb: true,
  ragHybridRetrievalEnabled: true,
  showOnscreenDebugHud: false,
  devPreloadAskModel: false,
  tabResumeMode: "resume",
  desktopAppLogLevel: "off",
  desktopDebugNoteAutoSave: false,
  desktopAskVerboseLogging: false,
  devForceSessionRagChips: false,
  presetChipAnimation: "fade",
  scrambleEnabled: false,
};

type BoardItem = { t: string; label: string; desc?: string; descs?: string[]; sel?: number; post?: string };

/** The board's data file, evaluated: its Developer rows, as the code had them on 2026-10-11. */
function boardDeveloperItems(): BoardItem[] {
  const file = path.resolve(__dirname, "../../../docs/demos/mockup-board-2/src/42-tabs-data.js");
  const data = new Function(`${fs.readFileSync(file, "utf8")}; return TAB_DATA;`)() as Record<string, { items: BoardItem[] }>;
  /* The drawing still carries the decision number in one label; the tab does not show it. */
  return data.Developer!.items.map((i) => ({ ...i, label: i.label?.replace(/ \(D\d+\)/, "") }));
}

/** The drawing's own tag-stripping (44-tabs.js, `stripTags`): line breaks become spaces, tags go. */
const stripTags = (s: string) => s.replace(/<br>/g, " ").replace(/<[^>]+>/g, "");

describe("the Developer tab's section list", () => {
  it("names the five sections in the drawing's order", () => {
    expect(DEVELOPER_SECTIONS.map((s) => s.title)).toEqual([
      "Knowledge base",
      "Diagnostics",
      "Navigation",
      "Logging & exports",
      "Animations",
    ]);
    expect(boardDeveloperItems().filter((i) => i.t === "sec").map((i) => i.label)).toEqual(
      DEVELOPER_SECTIONS.map((s) => s.title),
    );
  });

  it("leaves the knowledge-base section out when no seed-install callback was passed", () => {
    expect(developerSectionsShown(false).map((s) => s.id)).toEqual(["diagnostics", "navigation", "logging", "animations"]);
    expect(developerSectionsShown(true)).toHaveLength(5);
  });
});

describe("a Developer section's summary line, as the drawing writes it", () => {
  it("every section, in the drawn state", () => {
    expect(developerSectionSummaries(DRAWN)).toEqual({
      kb: "Hybrid retrieval (meaning search) on",
      diagnostics: "On-screen debug HUD off · Warm the Ask model at boot off",
      navigation: "Tab to open on: B · Resume",
      logging: "App activity logging to Desktop: Off · 0 of 3 on",
      animations: "Preset suggestions: fade · Scramble animation off",
    });
  });

  it("follows the settings: the picked tab, the log level, the counted switches, the switches that are on", () => {
    const s = developerSectionSummaries({
      ...DRAWN,
      ragHybridRetrievalEnabled: false,
      showOnscreenDebugHud: true,
      tabResumeMode: "resume_recent",
      desktopAppLogLevel: "verbose",
      desktopAskVerboseLogging: true,
      devForceSessionRagChips: true,
      presetChipAnimation: "decode",
    });
    expect(s.kb).toBe("Hybrid retrieval (meaning search) off");
    expect(s.diagnostics).toBe("On-screen debug HUD on · Warm the Ask model at boot off");
    expect(s.navigation).toBe("Tab to open on: C · 5 min");
    expect(s.logging).toBe("App activity logging to Desktop: Verbose · 2 of 3 on");
    expect(s.animations).toBe("Preset suggestions: decode · Scramble animation off");
  });

  it("Animations says whether the scramble switch is on, and leaves its three detail rows out so the line stays short", () => {
    expect(developerSectionSummaries({ ...DRAWN, scrambleEnabled: true }).animations).toBe(
      "Preset suggestions: fade · Scramble animation on",
    );
  });
});

describe("every Developer row's longer text, word for word against the board's data file", () => {
  /** Row name on the board -> the words this tab hands the strip, in the drawn state. */
  const mine: Record<string, string> = {
    [DEVELOPER_ROW_LABELS.installSeedKb]: DEVELOPER_ROW_HELP.installSeedKb,
    [DEVELOPER_ROW_LABELS.hybrid]: DEVELOPER_ROW_HELP.hybrid,
    [DEVELOPER_ROW_LABELS.hud]: DEVELOPER_ROW_HELP.hud,
    [DEVELOPER_ROW_LABELS.warm]: DEVELOPER_ROW_HELP.warm,
    [DEVELOPER_ROW_LABELS.steamInput]: DEVELOPER_ROW_HELP.steamInput,
    [DEVELOPER_ROW_LABELS.tabToOpenOn]: tabToOpenOnHelp("resume"),
    /* The board draws the permission sentence on none of its rows: with Save files to Desktop on there is none. */
    [DEVELOPER_ROW_LABELS.appLog]: appLogHelp("off", true),
    [DEVELOPER_ROW_LABELS.autoSave]: DEVELOPER_ROW_HELP.autoSave,
    [DEVELOPER_ROW_LABELS.verbose]: DEVELOPER_ROW_HELP.verbose,
    /* The board puts the frozen-chips block after the Force switch's words; the tab gives it its own row. */
    [DEVELOPER_ROW_LABELS.forceChips]: DEVELOPER_ROW_HELP.forceChips,
    [DEVELOPER_ROW_LABELS.scramble]: DEVELOPER_ROW_HELP.scramble,
  };

  it("each board row that has words matches what the tab hands the strip", () => {
    const covered = new Set<string>();
    for (const item of boardDeveloperItems()) {
      const words = item.descs ? item.descs[item.sel ?? 0] : item.desc;
      if (!words) continue;
      expect(mine[item.label], `no help for the board row "${item.label}"`).toBeDefined();
      expect(mine[item.label], item.label).toBe(stripTags(words));
      covered.add(item.label);
    }
    /* And no row of this tab claims words the board does not have. */
    expect([...covered].sort()).toEqual(Object.keys(mine).sort());
  });

  it("the Force switch's block on the board is the frozen-chips row's words, split off", () => {
    const force = boardDeveloperItems().find((i) => i.label === DEVELOPER_ROW_LABELS.forceChips)!;
    expect(stripTags(force.post!)).toBe(`${DEVELOPER_ROW_LABELS.frozenChips} ${DEVELOPER_ROW_HELP.frozenNone}`);
  });

  it("the other two tab-to-open-on lines and the logging levels follow the pick", () => {
    expect(tabToOpenOnHelp("always_main")).toBe(
      "Every reopen starts on Main, whatever tab you left from. Takes effect the next time you close and reopen the plugin.",
    );
    expect(tabToOpenOnHelp("resume_recent")).toBe(
      "Reopen resumes the tab within 5 minutes, then falls back to Main. Takes effect the next time you close and reopen the plugin.",
    );
    expect(appLogHelp("verbose", true)).toBe(
      "Default events plus RPC details, setup log lines, and frontend errors. Writes bonsai-app-YYYY-MM-DD.log under Desktop/bonsAI_logs/.",
    );
  });

  it("with Save files to Desktop off, the logging row says what it needs, as the tab did", () => {
    expect(appLogHelp("default", false)).toBe(
      "Summary events (connection tests, asks, settings changes). Writes bonsai-app-YYYY-MM-DD.log under Desktop/bonsAI_logs/. Enable Save files to Desktop in Permissions to save logs.",
    );
  });

  it("the pinned-chips line counts what is pinned", () => {
    expect(DEVELOPER_ROW_HELP.frozenPinned(3)).toMatch(/^3 pinned\. The carousel is showing these and will not reseed\./);
  });
});
