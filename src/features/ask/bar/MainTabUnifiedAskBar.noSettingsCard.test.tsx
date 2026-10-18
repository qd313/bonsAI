/**
 * Title: Typing a setting's name into the Main tab's question box draws no settings card
 * Purpose: Pin the Deck check of plan 92 lane N3: on the Main tab, typing "brightness" into the question box
 *          only asks the AI; the card of matching Steam settings that used to pop up above the box is gone
 *          (the settings search lives on the Search tab now), and nothing in the source still draws one.
 * Used for: MainTabUnifiedAskBar.tsx, MainTab.tsx and useMainTabPayload.tsx after the card's removal.
 * Solves: The card's tests moved to the Search tab's (SearchTab.test.tsx: A on a setting opens it); this keeps
 *         the Main side from growing the card back, in the box and anywhere else in the source.
 * Does not: Cover the Search tab; see src/features/search-tab.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

import { repoRoot } from "../../../test-harness/repoPaths";
import { MainTabUnifiedAskBar, type MainTabUnifiedAskBarProps } from "./MainTabUnifiedAskBar";

function buildProps(overrides: Record<string, unknown> = {}): MainTabUnifiedAskBarProps {
  return {
    fullBleedRowStyle: {},
    presetCarouselHostRef: { current: null },
    unifiedInputHostRef: { current: null },
    unifiedInputFieldLayerRef: { current: null },
    unifiedInputMeasureRef: { current: null },
    attachActionHostRef: { current: null },
    askBarHostRef: { current: null },
    unifiedInputSurfacePx: 60,
    unifiedInput: "brightness",
    usesNativeMultilineField: true,
    setIsUnifiedInputFocused: vi.fn(),
    isUnifiedInputFocused: false,
    setUnifiedInput: vi.fn(),
    isAsking: false,
    ollamaIp: "192.168.1.50",
    onAskOllama: vi.fn(),
    onOpenScreenshotBrowser: vi.fn(),
    onTakeScreenshot: vi.fn(),
    onCancelAsk: vi.fn(),
    onMicInput: vi.fn(),
    selectedAttachment: null,
    setSelectedAttachment: vi.fn(),
    clearUnifiedInput: vi.fn(),
    showSearchClearButton: false,
    mediaError: "",
    askMode: "speed",
    onAskModeChange: vi.fn(),
    ...overrides,
  } as unknown as MainTabUnifiedAskBarProps;
}

describe("the Main tab's question box", () => {
  it("draws no settings card while a setting's name is typed, even if it is still handed a list of matches", () => {
    const { container } = render(
      <MainTabUnifiedAskBar
        {...buildProps({
          // What the box was handed before the card moved to the Search tab; it must be ignored now.
          filteredSettings: ["Settings > Display > Brightness"],
          onSettingClick: vi.fn(),
          isQamSetting: () => false,
        })}
      />,
    );
    expect(container.querySelector(".bonsai-settings-results-card")).toBeNull();
    expect(container.textContent).not.toContain("Steam settings");
    expect(container.textContent).not.toContain("Brightness");
  });
});

const SRC = join(repoRoot(), "src");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("the card is gone from the source", () => {
  it("no file draws it, styles it, or still has its hooks; the retired 'Search only' name is read in one place only", () => {
    const left: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const rel = relative(SRC, file).split(sep).join("/");
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/^\s*(\*|\/\/)/.test(line)) return;
          if (/persist_search_only/.test(line) && basename(file) !== "bonsaiSettingsNormalizers.ts") left.push(`${rel}:${i + 1}: ${line.trim()}`);
          if (/bonsai-settings-results-card|useAskBarSettingsCard|shouldHideSettingsResultsCard|settingsCardRowsThatFit|SETTINGS_CARD_|"settings-results-card"/.test(line)) left.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(left).toEqual([]);
  });
});
