/**
 * Title: The folded Developer tab: sections, rows and their words
 * Purpose: Pin plan 91 § 2b / plan 92 lane T2 at the level a screen test reaches: the Developer tab opens as a
 *          column of one-line sections (the knowledge-base one only when a seed install was passed in), every
 *          section closed on a first visit once the test says so; open, each section has one line per setting
 *          with its longer words on the row for the strip (word for word against the density board's data file);
 *          the strip's words follow the pick on an option row; the captured errors stay inside Diagnostics; the
 *          buttons that run something still run it; and nothing in the tab scrolls the pane or moves the ring
 *          when it appears (the Deck showed the tab opening scrolled 1,800 px down on 2026-10-12).
 * Used for: DeveloperTab.tsx and the Developer row files.
 * Does not: Walk the D-pad (DeveloperTab.foldedWalk.test.tsx) or see pixels.
 */
import fs from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeveloperTab, type DeveloperTabProps } from "./DeveloperTab";
import { STREAM_SCRAMBLE_OFF } from "../features/stream-scramble/streamScrambleContext";
import { resetFoldedTabsForTests, setAllSections, toggleSection } from "../features/folded-tabs/foldedTabsStore";
import { DEVELOPER_FOLD_TAB, DEVELOPER_SECTIONS, DEVELOPER_ROW_HELP, DEVELOPER_ROW_LABELS } from "../features/folded-tabs/developerTabFolds";
import { HELP_TEXT_ATTR } from "../features/folded-tabs/useHelpStrip";

const SECTION_IDS: string[] = DEVELOPER_SECTIONS.map((s) => s.id);

function props(overrides: Partial<DeveloperTabProps> = {}): DeveloperTabProps {
  return {
    capturedErrors: [],
    onClearErrors: () => {},
    desktopDebugNoteAutoSave: false,
    setDesktopDebugNoteAutoSave: () => {},
    desktopAskVerboseLogging: false,
    setDesktopAskVerboseLogging: () => {},
    desktopAppLogLevel: "off",
    setDesktopAppLogLevel: () => {},
    filesystemWrite: true,
    presetChipAnimation: "fade",
    setPresetChipAnimation: () => {},
    steamWebApiKey: "",
    setSteamWebApiKey: () => {},
    showOnscreenDebugHud: false,
    setShowOnscreenDebugHud: () => {},
    devForceSessionRagChips: false,
    setDevForceSessionRagChips: () => {},
    devPreloadAskModel: false,
    setDevPreloadAskModel: () => {},
    devFrozenTestChips: [],
    setDevFrozenTestChips: () => {},
    ragHybridRetrievalEnabled: true,
    setRagHybridRetrievalEnabled: () => {},
    tabResumeMode: "resume",
    setTabResumeMode: () => {},
    onInstallSeedKnowledgeBase: async () => {},
    onSteamInputPhase1Jump: () => {},
    streamScramble: STREAM_SCRAMBLE_OFF,
    onStreamScrambleChange: () => {},
    ...overrides,
  };
}

const lines = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".bonsai-fold-line"));
const lineName = (el: HTMLElement) => el.querySelector(".bonsai-fold-line__name")!.textContent;
const lineSummary = (el: HTMLElement) => el.querySelector(".bonsai-fold-line__summary")!.textContent;
const helpOf = (c: HTMLElement, label: string): string | null =>
  Array.from(c.querySelectorAll<HTMLElement>("[data-bonsai-help-label]"))
    .find((el) => el.getAttribute("data-bonsai-help-label") === label)
    ?.getAttribute(HELP_TEXT_ATTR) ?? null;

beforeEach(() => resetFoldedTabsForTests());
afterEach(() => cleanup());

describe("the folded Developer tab, every section closed", () => {
  beforeEach(() => setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false));

  it("is six one-line sections, each with its summary, and no row drawn", () => {
    const { container } = render(<DeveloperTab {...props()} />);
    expect(lines(container).map((l) => [lineName(l), lineSummary(l)])).toEqual([
      ["Knowledge base", "Hybrid retrieval (meaning search) on"],
      ["Diagnostics", "On-screen debug HUD off · Warm the Ask model at boot off"],
      ["Navigation", "Tab to open on: B · Resume"],
      ["Logging & exports", "App activity logging to Desktop: Off · 0 of 3 on"],
      ["Animations", "Preset suggestions: fade · Scramble animation off"],
      ["Integrations", ""],
    ]);
    expect(container.querySelectorAll(".bonsai-fold-body")).toHaveLength(0);
    expect(container.querySelector(".bonsai-dense-row")).toBeNull();
  });

  it("leaves the knowledge-base section out without a seed-install callback", () => {
    const { container } = render(<DeveloperTab {...props({ onInstallSeedKnowledgeBase: undefined })} />);
    expect(lines(container).map(lineName)).toEqual(["Diagnostics", "Navigation", "Logging & exports", "Animations", "Integrations"]);
  });

  it("the summaries follow the settings", () => {
    const { container } = render(
      <DeveloperTab {...props({ showOnscreenDebugHud: true, tabResumeMode: "always_main", desktopAppLogLevel: "verbose", devForceSessionRagChips: true })} />,
    );
    const by = Object.fromEntries(lines(container).map((l) => [lineName(l), lineSummary(l)]));
    expect(by["Diagnostics"]).toBe("On-screen debug HUD on · Warm the Ask model at boot off");
    expect(by["Navigation"]).toBe("Tab to open on: A · Main");
    expect(by["Logging & exports"]).toBe("App activity logging to Desktop: Verbose · 1 of 3 on");
  });

  it("A on a line opens just that section", () => {
    const { container } = render(<DeveloperTab {...props()} />);
    expect(container.querySelector('[data-bonsai-fold-line="navigation"]')).toBeTruthy();
    act(() => toggleSection(DEVELOPER_FOLD_TAB, SECTION_IDS, "navigation"));
    expect(screen.getByText("Tab to open on")).toBeTruthy();
    expect(container.querySelectorAll(".bonsai-fold-body")).toHaveLength(1);
  });
});

describe("the folded Developer tab, every section open: one line per setting, the longer words on the row", () => {
  beforeEach(() => setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, true));

  it("every row's words are the board's, word for word", () => {
    const { container } = render(<DeveloperTab {...props()} />);
    const file = path.resolve(__dirname, "../../docs/demos/mockup-board-2/src/42-tabs-data.js");
    const data = new Function(`${fs.readFileSync(file, "utf8")}; return TAB_DATA;`)() as Record<
      string,
      { items: { t: string; label: string; desc?: string; descs?: string[]; sel?: number }[] }
    >;
    const stripTags = (s: string) => s.replace(/<br>/g, " ").replace(/<[^>]+>/g, "");
    let checked = 0;
    for (const item of data.Developer!.items) {
      const words = item.descs ? item.descs[item.sel ?? 0] : item.desc;
      if (!words) continue;
      /* The board's "Jump to Steam Input" row is a button with the label of its words; the field is "Steam Web API key". */
      const label = item.label?.replace(/ \(D\d+\)/, ""); /* the drawing's decision number is not drawn on screen */
      expect(helpOf(container, label), label).toBe(stripTags(words));
      checked += 1;
    }
    expect(checked).toBe(12);
  });

  it("the Force switch keeps its own words; the frozen test chips row carries the board's block", () => {
    const { container } = render(<DeveloperTab {...props()} />);
    expect(helpOf(container, DEVELOPER_ROW_LABELS.forceChips)).toBe(DEVELOPER_ROW_HELP.forceChips);
    expect(helpOf(container, DEVELOPER_ROW_LABELS.frozenChips)).toBe(DEVELOPER_ROW_HELP.frozenNone);
    expect(screen.getByText("None pinned")).toBeTruthy();
  });

  it("no row prints its longer words any more: they are only on the row for the strip", () => {
    const { container } = render(<DeveloperTab {...props()} />);
    expect(container.textContent).not.toContain("Public HF/GitHub download");
    expect(container.textContent).not.toContain("Loads the default Ask model");
    expect(container.textContent).not.toContain("Takes effect the next time");
  });

  it("an option row's strip words change with the pick: Tab to open on, App activity logging, How letters settle", () => {
    const { container, rerender } = render(<DeveloperTab {...props({ streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true } })} />);
    const tab = "Tab to open on";
    expect(helpOf(container, tab)).toBe("Reopen lands on the tab you left. Shipped default. Takes effect the next time you close and reopen the plugin.");
    rerender(<DeveloperTab {...props({ tabResumeMode: "resume_recent", streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true } })} />);
    expect(helpOf(container, tab)).toBe("Reopen resumes the tab within 5 minutes, then falls back to Main. Takes effect the next time you close and reopen the plugin.");
    rerender(<DeveloperTab {...props({ desktopAppLogLevel: "verbose", streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, style: "tail" } })} />);
    expect(helpOf(container, DEVELOPER_ROW_LABELS.appLog)).toBe(
      "Default events plus RPC details, setup log lines, and frontend errors. Writes bonsai-app-YYYY-MM-DD.log under Desktop/bonsAI_logs/.",
    );
    expect(helpOf(container, "How letters settle")).toBe("The last 10 letters are always scrambled.");
  });

  it("with Save files to Desktop off, the logging row says so and Open Permissions jumps to it", () => {
    const onJump = vi.fn();
    const { container } = render(<DeveloperTab {...props({ filesystemWrite: false, onJumpToPermission: onJump })} />);
    expect(helpOf(container, DEVELOPER_ROW_LABELS.appLog)).toMatch(/Enable Save files to Desktop in Permissions to save logs\.$/);
    fireEvent.click(screen.getByText("Open Permissions"));
    expect(onJump).toHaveBeenCalledWith("filesystem_write");
  });

  it("Open Permissions is not drawn while Save files to Desktop is on", () => {
    render(<DeveloperTab {...props({ filesystemWrite: true, onJumpToPermission: () => {} })} />);
    expect(screen.queryByText("Open Permissions")).toBeNull();
  });

  it("the captured errors stay inside Diagnostics, each its own stop, with Clear above them", () => {
    const onClear = vi.fn();
    const { container } = render(<DeveloperTab {...props({ capturedErrors: ["first boom", "second boom"], onClearErrors: onClear })} />);
    const diagnostics = container.querySelector<HTMLElement>('[data-bonsai-fold-section="diagnostics"] .bonsai-fold-body')!;
    expect(within(diagnostics).getByText("first boom")).toBeTruthy();
    expect(within(diagnostics).getByText("second boom")).toBeTruthy();
    expect(screen.queryByText("No errors captured.")).toBeNull();
    fireEvent.click(within(diagnostics).getByText("Clear (2)"));
    expect(onClear).toHaveBeenCalledTimes(1);
    /* The line's own summary does not list them. */
    expect(lineSummary(container.querySelector<HTMLElement>('[data-bonsai-fold-line="diagnostics"]')!)).toBe(
      "On-screen debug HUD off · Warm the Ask model at boot off",
    );
  });

  it("with no errors the section says so and draws no Clear button", () => {
    render(<DeveloperTab {...props()} />);
    expect(screen.getByText("No errors captured.")).toBeTruthy();
    expect(screen.queryByText(/^Clear \(/)).toBeNull();
  });

  it("the buttons that run something still run it", async () => {
    const install = vi.fn(async () => {});
    const jump = vi.fn();
    render(<DeveloperTab {...props({ onInstallSeedKnowledgeBase: install, onSteamInputPhase1Jump: jump })} />);
    fireEvent.click(screen.getByText("Install seed knowledge base"));
    expect(install).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Jump to Steam Input (running game)"));
    expect(jump).toHaveBeenCalledTimes(1);
  });

  it("pinned test chips: the row counts them, the list shows, Clear empties them", () => {
    const set = vi.fn();
    const { container } = render(<DeveloperTab {...props({ devFrozenTestChips: ["q one", "q two"], setDevFrozenTestChips: set })} />);
    expect(screen.getByText("2 pinned")).toBeTruthy();
    expect(helpOf(container, DEVELOPER_ROW_LABELS.frozenChips)).toBe(DEVELOPER_ROW_HELP.frozenPinned(2));
    expect(screen.getByText("q one")).toBeTruthy();
    fireEvent.click(screen.getByText("Clear frozen test chips"));
    expect(set).toHaveBeenCalledWith([]);
  });

  it("the Steam Web API key field is there, with its words for the strip", () => {
    const { container } = render(<DeveloperTab {...props({ steamWebApiKey: "abc" })} />);
    expect(helpOf(container, "Steam Web API key")).toBe(DEVELOPER_ROW_HELP.steamWebApiKey);
    const field = container.querySelector('[data-decky-ui="TextField"]') as HTMLElement | null;
    expect(field).toBeTruthy();
  });
});

describe("the Developer tab appearing", () => {
  it("scrolls nothing and moves the ring nowhere: no scroll call, no focus change, no ring marker", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, true);
    const scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    const proto = Element.prototype as unknown as Record<string, unknown>;
    const old = { scrollIntoView: proto.scrollIntoView, scrollTo: proto.scrollTo };
    proto.scrollIntoView = scrollIntoView;
    proto.scrollTo = scrollTo;
    const before = document.activeElement;
    try {
      const { container } = render(<DeveloperTab {...props({ capturedErrors: ["boom"] })} />);
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(before);
      expect(container.querySelector(".gpfocus")).toBeNull();
    } finally {
      proto.scrollIntoView = old.scrollIntoView;
      proto.scrollTo = old.scrollTo;
    }
  });
});
