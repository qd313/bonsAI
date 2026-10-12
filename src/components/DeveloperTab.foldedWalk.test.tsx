/**
 * Title: The folded Developer tab, walked with the D-pad (plan 91 § 2b; plan 92 lane T2)
 * Purpose: Pin the Deck checks for the Developer tab at the level a test can reach: the real tab, every section
 *          closed, every section open (with the most rows it ever has: two captured errors, the scramble rows,
 *          pinned test chips, the Open Permissions button), and a few open, walked Down to the end and back Up
 *          a bounded number of presses, the D-pad pressed the way Steam calls it (the move handlers first, then
 *          Steam's own step along the column), Steam's own scroll-into-view modelled three ways. No stop is
 *          visited twice; closed, the walk is the six lines; open, it stops once per control, the captured
 *          errors' rows included; no landing moves the pane more than a third of it; every ringed control is
 *          wholly on screen and, while the strip shows, its bottom edge with its ring sits 6 px or more above
 *          the strip's top. Closed, the tab is under one screen of the Deck's own (430 points). Picking another
 *          "Tab to open on" changes the strip's words at once. The tab's appearing moves nothing.
 * Used for: DeveloperTab.tsx and the folded-tabs pieces (src/features/folded-tabs/).
 * Does not: Know the Deck's real heights: foldedTabWalk.tsx lays the stops out by a flow model, and the Deck
 *           walk measures the truth.
 */
import React from "react";
import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={String(label)} data-decky-ui="ToggleField" />;
  };
  /* Steam's text field: an input Steam can ring. */
  const TextField = (p: Record<string, unknown>) => (
    <input type="text" tabIndex={0} aria-label="Steam Web API key" data-decky-ui="TextField" defaultValue={String(p.value ?? "")} />
  );
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField, TextField };
});

import { DeveloperTab, type DeveloperTabProps } from "./DeveloperTab";
import { STREAM_SCRAMBLE_OFF } from "../features/stream-scramble/streamScrambleContext";
import { resetFoldedTabsForTests, setAllSections, toggleSection } from "../features/folded-tabs/foldedTabsStore";
import { DEVELOPER_FOLD_TAB, DEVELOPER_SECTIONS } from "../features/folded-tabs/developerTabFolds";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { stripHeightFor } from "../styles/sections/foldedTabs";
import { walkFoldedTab, type FoldedLanding } from "../test-harness/foldedTabWalk";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../test-harness/steamRing";
import type { SteamFocusScroll } from "../test-harness/tabBodyWalk";

const noop = () => {};
const DECK_PANE = 430;
const MONITOR_PANE = 741;
const RULES: SteamFocusScroll[] = ["nearest", "centerIfHidden", "center"];
const SECTION_IDS: string[] = DEVELOPER_SECTIONS.map((s) => s.id);
/** The room a folded tab leaves under its last line (foldedTabs.ts), not part of "top to bottom". */
const TAIL = 120;
/** The plugin's ring on a plain button reaches 4 px outside it (2 px outline, 2 px offset: scopeBase.ts). */
const RING_REACH = 4;

function props(overrides: Partial<DeveloperTabProps> = {}): DeveloperTabProps {
  return {
    capturedErrors: [],
    onClearErrors: noop,
    desktopDebugNoteAutoSave: false,
    setDesktopDebugNoteAutoSave: noop,
    desktopAskVerboseLogging: false,
    setDesktopAskVerboseLogging: noop,
    desktopAppLogLevel: "off",
    setDesktopAppLogLevel: noop,
    filesystemWrite: true,
    presetChipAnimation: "fade",
    setPresetChipAnimation: noop,
    steamWebApiKey: "",
    setSteamWebApiKey: noop,
    showOnscreenDebugHud: false,
    setShowOnscreenDebugHud: noop,
    devForceSessionRagChips: false,
    setDevForceSessionRagChips: noop,
    devPreloadAskModel: false,
    setDevPreloadAskModel: noop,
    devFrozenTestChips: [],
    setDevFrozenTestChips: noop,
    ragHybridRetrievalEnabled: true,
    setRagHybridRetrievalEnabled: noop,
    tabResumeMode: "resume",
    setTabResumeMode: noop,
    onInstallSeedKnowledgeBase: async () => {},
    onSteamInputPhase1Jump: noop,
    streamScramble: STREAM_SCRAMBLE_OFF,
    onStreamScrambleChange: noop,
    ...overrides,
  };
}

/** The most rows the tab ever has: the permission button, two captured errors, pinned chips, every scramble row. */
const BUSIEST = (): Partial<DeveloperTabProps> => ({
  filesystemWrite: false,
  onJumpToPermission: noop,
  capturedErrors: ["first boom", "second boom"],
  devFrozenTestChips: ["one question", "another question"],
  streamScramble: { ...STREAM_SCRAMBLE_OFF, enabled: true, style: "settle" },
});

function walk(viewport: number, steam: SteamFocusScroll, overrides: Partial<DeveloperTabProps> = {}, tab?: React.ReactElement) {
  return walkFoldedTab({
    tabId: DEVELOPER_FOLD_TAB,
    tab: tab ?? <DeveloperTab {...props(overrides)} />,
    viewport,
    steam,
    stripHeight: stripHeightFor,
    tail: TAIL,
  });
}

/** Every landing on screen, clear of the strip, and the pane moved no more than a third of it at each. */
function checkLandings(landings: FoldedLanding[], viewport: number, label: string) {
  for (const l of landings) {
    expect(l.moved, `${label}: press ${l.press} onto ${l.name}`).toBeLessThanOrEqual(viewport / 3);
    expect(l.top, `${label}: ${l.name} top`).toBeGreaterThanOrEqual(24 - 0.5);
    expect(l.bottom, `${label}: ${l.name} bottom`).toBeLessThanOrEqual(24 + viewport + 0.5);
    if (l.stripTop !== null) {
      expect(l.bottom + RING_REACH + 6, `${label}: ${l.name} clear of the strip`).toBeLessThanOrEqual(l.stripTop);
    }
  }
}

const names = (landings: FoldedLanding[]) => landings.map((l) => l.name);
const lineTitles = (landings: FoldedLanding[]) => names(landings).map((n) => n.split(" section")[0]);
const repeats = (landings: FoldedLanding[]) => landings.length - new Set(landings.map((l) => l.stop)).size;

beforeEach(() => {
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
});
afterEach(() => cleanup());

describe("the folded Developer tab, every section closed", () => {
  it("Down from the tab bar walks the six section lines, once each, then holds; Up walks them back", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
    const w = walk(DECK_PANE, "centerIfHidden");
    const down = [w.enter(), ...w.walk("down")];
    expect(lineTitles(down)).toEqual(DEVELOPER_SECTIONS.map((s) => s.title));
    const up = w.walk("up");
    expect(lineTitles(up)).toEqual(DEVELOPER_SECTIONS.slice(0, -1).map((s) => s.title).reverse());
    checkLandings([...down, ...up], DECK_PANE, "closed");
    w.unmount();
  });

  it("fits in one screen of the Deck's own: the last line ends above 430 points (well under one and a half)", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
    const w = walk(DECK_PANE, "nearest");
    expect(w.contentHeight() - TAIL).toBeLessThan(DECK_PANE);
    w.unmount();
  });

  it("without a seed install the walk is the five other lines", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
    const w = walk(DECK_PANE, "nearest", { onInstallSeedKnowledgeBase: undefined });
    const down = [w.enter(), ...w.walk("down")];
    expect(lineTitles(down)).toEqual(DEVELOPER_SECTIONS.slice(1).map((s) => s.title));
    w.unmount();
  });

  it("mounting the tab moves the pane nowhere and puts the ring on nothing", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, true);
    const w = walk(DECK_PANE, "nearest", BUSIEST());
    expect(w.scrollTop()).toBe(0);
    expect(w.ring()).toBeNull();
    expect(steamRingHolder()).toBeNull();
    w.unmount();
  });
});

describe("the folded Developer tab, every section open", () => {
  for (const viewport of [DECK_PANE, MONITOR_PANE]) {
    for (const steam of RULES) {
      it(`pane ${viewport}, Steam's rule "${steam}": Down stops once per control to the end and Up comes back, each move under a third of the pane, every row clear of the strip`, () => {
        setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, true);
        const w = walk(viewport, steam, BUSIEST());
        const down = [w.enter(), ...w.walk("down", 80)];
        expect(repeats(down), names(down).join(" | ")).toBe(0);
        const order = names(down);
        expect(order[0]).toMatch(/^Knowledge base \(dev QA\)/);
        /* A control of every section, the captured errors included, in order. */
        const at = (name: string | RegExp) => order.findIndex((n) => (typeof name === "string" ? n === name : name.test(n)));
        const expectedOrder = [
          /^Knowledge base \(dev QA\)/,
          "Install seed knowledge base",
          "Hybrid retrieval (meaning search)",
          /^Diagnostics/,
          "On-screen debug HUD",
          "Warm the Ask model at boot",
          "Jump to Steam Input (running game)",
          "Clear (2)",
          "first boom",
          "second boom",
          /^Navigation/,
          /^A · Main: /,
          /^Logging & exports/,
          /^Off: No app activity log file/,
          "Open Permissions",
          "Auto-save chat to Desktop notes",
          "Verbose Ask logging to Desktop notes",
          "Force session RAG chips (QA)",
          "Frozen test chips (QA)",
          "Clear frozen test chips",
          /^Animations/,
          "Preset animation: fade",
          "Scramble animation",
          "Settle",
          "300",
          "Same as text",
          /^Integrations/,
          "Steam Web API key",
        ];
        const found = expectedOrder.map(at);
        expect(found.includes(-1), `missing stop in: ${order.join(" | ")}`).toBe(false);
        expect([...found].sort((a, b) => a - b), "in order").toEqual(found);
        expect(order[order.length - 1]).toBe("Steam Web API key");
        checkLandings(down, viewport, `${steam} down`);
        const up = w.walk("up", 80);
        expect(repeats(up), names(up).join(" | ")).toBe(0);
        expect(up[up.length - 1]!.name).toMatch(/^Knowledge base \(dev QA\)/);
        checkLandings(up, viewport, `${steam} up`);
        w.unmount();
      });
    }
  }

  it("the captured errors' rows are reachable inside Diagnostics and the stops after them are still reached", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
    toggleSection(DEVELOPER_FOLD_TAB, SECTION_IDS, "diagnostics");
    const w = walk(MONITOR_PANE, "nearest", { capturedErrors: ["boom one", "boom two", "boom three"] });
    const down = [w.enter(), ...w.walk("down")];
    expect(names(down).map((n) => n.split(" section")[0])).toEqual([
      "Knowledge base (dev QA)",
      "Diagnostics",
      "On-screen debug HUD",
      "Warm the Ask model at boot",
      "Jump to Steam Input (running game)",
      "Clear (3)",
      "boom one",
      "boom two",
      "boom three",
      "Navigation",
      "Logging & exports",
      "Animations",
      "Integrations",
    ]);
    w.unmount();
  });

  it("the strip shows each row's own words while the ring is on it, and hides on a section line", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, true);
    const w = walk(MONITOR_PANE, "nearest", BUSIEST());
    const seen = new Map<string, string>();
    for (const l of [w.enter(), ...w.walk("down", 80)]) seen.set(l.name, l.stripText);
    expect(seen.get("Warm the Ask model at boot")).toMatch(/^Warm the Ask model at bootLoads the default Ask model into memory/);
    expect(seen.get("Install seed knowledge base")).toMatch(/Public HF\/GitHub download is not live yet\./);
    expect(seen.get("Frozen test chips (QA)")).toMatch(/^Frozen test chips \(QA\)2 pinned\. The carousel is showing these/);
    expect(seen.get("Steam Web API key")).toBe(
      "Steam Web API keyFor the bonsai:vac-check command. Enable Steam ban lookup in Permissions. Stored on this device.",
    );
    /* No words on a captured error or a Clear button: the strip hides. */
    expect(seen.get("first boom")).toBe("");
    expect(seen.get("Clear (2)")).toBe("");
    for (const [name, text] of seen) if (/ section(:|$)/.test(name)) expect(text, name).toBe("");
    w.unmount();
  });

  it("a different Tab to open on changes the strip's words at once, with the ring still on the row", async () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
    toggleSection(DEVELOPER_FOLD_TAB, SECTION_IDS, "navigation");
    function Stateful() {
      const [mode, setMode] = React.useState<DeveloperTabProps["tabResumeMode"]>("resume");
      return <DeveloperTab {...props({ tabResumeMode: mode, setTabResumeMode: setMode })} />;
    }
    const w = walk(DECK_PANE, "nearest", {}, <Stateful />);
    /* The Knowledge base line, Diagnostics, Navigation, then into its row. */
    const down = [w.enter(), ...w.walk("down", 3)];
    expect(names(down)[3]).toMatch(/^A · Main/);
    const stripText = () => w.container.querySelector<HTMLElement>("[data-bonsai-help-strip]")!.textContent ?? "";
    expect(stripText()).toBe(
      "Tab to open on (D15)Reopen lands on the tab you left. Shipped default. Takes effect the next time you close and reopen the plugin.",
    );
    const press = async (label: string) => {
      const b = Array.from(w.container.querySelectorAll<HTMLButtonElement>("button")).find((x) => x.textContent === label)!;
      await act(async () => {
        b.click();
      });
    };
    await press("C · 5 min");
    expect(stripText()).toBe(
      "Tab to open on (D15)Reopen resumes the tab within 5 minutes, then falls back to Main. Takes effect the next time you close and reopen the plugin.",
    );
    await press("A · Main");
    expect(stripText()).toBe(
      "Tab to open on (D15)Every reopen starts on Main, whatever tab you left from. Takes effect the next time you close and reopen the plugin.",
    );
    w.unmount();
  });
});

describe("the floating Open all button on the Developer tab", () => {
  it("Right from Logging & exports puts the ring on it; A opens every section (Close all); Down returns to Logging & exports", () => {
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
    const w = walk(DECK_PANE, "nearest");
    const line = w.container.querySelector<HTMLElement>('[data-bonsai-fold-line="logging"]') as SteamEl;
    const host = w.container.querySelector<HTMLElement>('[data-bonsai-fold-all="developer"]') as SteamEl;
    const button = host.querySelector("button")!;
    act(() => {
      putSteamRingOn(line);
      line.__nav?.onMoveRight?.();
    });
    expect(steamRingHolder()).toBe(button);
    act(() => button.click());
    expect(w.container.querySelectorAll('.bonsai-fold-line[data-open="true"]')).toHaveLength(6);
    expect(button.textContent).toContain("Close all");
    act(() => {
      host.__nav?.onMoveDown?.();
    });
    expect(steamRingHolder()).toBe(w.container.querySelector('[data-bonsai-fold-line="logging"]'));
    w.unmount();
  });

  it("is drawn outside the pane Steam scrolls, so landing on it never scrolls the list", () => {
    const w = walk(DECK_PANE, "nearest");
    const pane = w.container.querySelector("[data-pane]")!;
    expect(pane.contains(w.container.querySelector("[data-bonsai-fold-all]"))).toBe(false);
    w.unmount();
  });
});

export {};
