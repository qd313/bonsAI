/**
 * Title: The folded Settings tab, walked with the D-pad (plan 91 § 2b; plan 92 T1)
 * Purpose: Pin the Deck checks of block B at the level a test can reach: the real Settings tab, every section
 *          closed and every section open, walked Down to the end and back Up a bounded number of presses, the D-pad
 *          pressed the way Steam calls it (the move handlers first, then Steam's own step along the column's
 *          flow), Steam's own scroll-into-view modelled three ways. No stop is visited twice; with every section
 *          closed the walk is the section lines; with every section open it stops once per control (a row of
 *          buttons side by side is one stop going Down, its other buttons are Left and Right); no landing moves the
 *          pane more than a third of it; every ringed control is wholly on screen and, while the strip shows, its
 *          bottom edge with its ring sits 6 px or more above the strip's top. Closed, the tab is under one and a
 *          half screens of the Deck's own. The strip shows the right words on three rows. Right from a line, or
 *          Down from the tab's end (plan 93), reaches the floating button; Down holds there and each exit comes
 *          back.
 * Used for: SettingsTab.tsx and the folded-tabs pieces (src/features/folded-tabs/).
 * Does not: Know the Deck's real heights: foldedTabWalk.tsx lays the stops out by a flow model, and the Deck
 *           walk measures the truth.
 */
import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  /* Steam's switch row: a stop of its own that keeps the move handlers it is given, as Decky's ToggleField does. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _checked, onChange: _onChange, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { SettingsTab, type SettingsTabProps } from "./SettingsTab";
import { settingsProps } from "./ringTestProps";
import { closeAllSettingsSections, openAllSettingsSections } from "../test-harness/settingsFoldOpen";
import { SETTINGS_FOLD_TAB, SETTINGS_SECTIONS, SETTINGS_ROW_HELP, settingsSectionIds } from "../features/folded-tabs/settingsTabFolds";
import { resetNavFocusRegistry } from "../utils/navFocusRegistry";
import { stripHeightFor } from "../styles/sections/foldedTabs";
import { walkFoldedTab, type FoldedLanding } from "../test-harness/foldedTabWalk";
import { paintedFrom, worstFoldAllCover } from "../test-harness/foldAllCover";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../test-harness/steamRing";
import type { SteamFocusScroll } from "../test-harness/tabBodyWalk";

const DECK_PANE = 430;
const MONITOR_PANE = 741;
const RULES: SteamFocusScroll[] = ["nearest", "centerIfHidden", "center"];
/** The room a folded tab leaves under its last line (foldedTabs.ts), not part of "top to bottom". */
const TAIL = 120;
/** The plugin's ring on a plain button reaches 4 px outside it (2 px outline, 2 px offset: scopeBase.ts). */
const RING_REACH = 4;

function props(o: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return { ...settingsProps(), showDeveloperTab: true, aiCharacterEnabled: true, microphoneAccessEnabled: true, ...o };
}

function walk(viewport: number, steam: SteamFocusScroll, o: Partial<SettingsTabProps> = {}) {
  return walkFoldedTab({
    tabId: SETTINGS_FOLD_TAB,
    tab: <SettingsTab {...props(o)} />,
    viewport,
    steam,
    stripHeight: stripHeightFor,
    tail: TAIL,
  });
}

/** Every landing on screen, clear of the strip, and the pane moved no more than a third at each. */
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
const sectionName = (n: string) => n.split(" section")[0];
const repeats = (landings: FoldedLanding[]) => landings.length - new Set(landings.map((l) => l.stop)).size;

beforeEach(() => {
  resetNavFocusRegistry();
});
afterEach(() => cleanup());

describe("the folded Settings tab, every section closed", () => {
  for (const showDeveloperTab of [true, false]) {
    it(`Developer tab ${showDeveloperTab ? "on" : "off"}: Down from the tab bar walks the section lines once each, then the Open all button, and holds; Up walks every line back`, () => {
      closeAllSettingsSections();
      const w = walk(DECK_PANE, "centerIfHidden", { showDeveloperTab });
      const titles = SETTINGS_SECTIONS.filter((s) => showDeveloperTab || s.id !== "uiscale").map((s) => s.title);
      const down = [w.enter(), ...w.walk("down")];
      expect(names(down).map(sectionName)).toEqual([...titles, "Open all"]);
      expect(names(down)[titles.length]).toBe("Open all sections");
      expect(repeats(down)).toBe(0);
      const up = w.walk("up");
      expect(names(up).map(sectionName)).toEqual([...titles].reverse());
      checkLandings([...down, ...up], DECK_PANE, "closed");
      w.unmount();
    });

    it(`Developer tab ${showDeveloperTab ? "on" : "off"}: the tab, top to bottom, is under one and a half screens of the Deck's own`, () => {
      closeAllSettingsSections();
      const w = walk(DECK_PANE, "nearest", { showDeveloperTab });
      expect(w.contentHeight() - TAIL).toBeLessThan(DECK_PANE * 1.5);
      w.unmount();
    });
  }
});

describe("the folded Settings tab, every section open", () => {
  const expectedOrder = [
    /^UI scale/,
    "Adjust UI automatically",
    "Apply UI scale",
    /^Screenshot quality/,
    "Set screenshot quality to Save memory",
    /^Text size/,
    "Set text size to Small",
    /^Remember what I typed/,
    "Remember what I typed",
    /^Story spoilers/,
    "Hide spoilers until I tap",
    /^Suggestion chips/,
    "Show one chip instead of two",
    /^Voice input/,
    "tiny.en (faster, less accurate)",
    "Install voice engine",
    /^Voice replies/,
    /^Off: /,
    /^AI voice & personality section/,
    "AI voice & personality",
    "Character",
    "Accent intensity: Default",
    /^Data/,
    "Show Developer tab",
    "Clear cache...",
    /* Down from the last control: the floating button (plan 93), where the walk holds. */
    "Close all sections",
  ];

  for (const viewport of [DECK_PANE, MONITOR_PANE]) {
    for (const steam of RULES) {
      it(`pane ${viewport}, Steam's rule "${steam}": Down stops once per control to the end and Up comes back, each move under a third of the pane, every row clear of the strip`, () => {
        openAllSettingsSections();
        const w = walk(viewport, steam);
        const down = [w.enter(), ...w.walk("down")];
        expect(repeats(down), names(down).join(" | ")).toBe(0);
        const got = names(down);
        expect(got).toHaveLength(expectedOrder.length);
        expectedOrder.forEach((want, i) => {
          if (typeof want === "string") expect(got[i], `stop ${i}`).toBe(want);
          else expect(got[i], `stop ${i}`).toMatch(want);
        });
        checkLandings(down, viewport, `${steam} down`);
        const up = w.walk("up");
        expect(repeats(up), names(up).join(" | ")).toBe(0);
        /* Up from the button: the line of the section the ring came from. */
        expect(up[0]!.name).toMatch(/^Data section/);
        expect(up[up.length - 1]!.name).toMatch(/^UI scale/);
        checkLandings(up, viewport, `${steam} up`);
        w.unmount();
      });
    }
  }

  for (const steam of RULES) {
    it(`Steam's rule "${steam}": wherever the walk puts the pane, the Open all button covers no row's words or arrow on view (plan 93)`, () => {
      openAllSettingsSections();
      const w = walk(DECK_PANE, steam);
      const pane = { top: 24, bottom: 24 + DECK_PANE, right: 300 };
      const landings = [w.enter(), ...w.walk("down", 80), ...w.walk("up", 80)];
      for (const l of landings) {
        const strip = l.stripTop === null ? 0 : pane.bottom - l.stripTop;
        const c = worstFoldAllCover(w.container, pane, strip);
        expect(c, `press ${l.press} onto ${l.name}: ${c.what}`).toMatchObject({ w: 0, h: 0 });
        /* And the ringed row itself is above the band, never under it. */
        if (!l.stop.closest("[data-bonsai-fold-all]")) {
          expect(l.bottom, `${l.name} above the band`).toBeLessThanOrEqual(paintedFrom(pane.bottom, strip, pane.right));
        }
      }
      w.unmount();
    });
  }

  it("with the Developer tab off the walk is the same without UI scale, and with the character off it skips the picker and the accent row", () => {
    openAllSettingsSections();
    const w = walk(DECK_PANE, "nearest", { showDeveloperTab: false, aiCharacterEnabled: false });
    const down = [w.enter(), ...w.walk("down")];
    const got = names(down);
    expect(repeats(down), got.join(" | ")).toBe(0);
    expect(got.some((n) => /^UI scale/.test(n) || n === "Apply UI scale")).toBe(false);
    expect(got.some((n) => /^Character$|^Accent intensity/.test(n))).toBe(false);
    expect(got.slice(-4)).toEqual([expect.stringMatching(/^Data/), "Show Developer tab", "Clear cache...", "Close all sections"]);
    w.unmount();
  });

  it("with the microphone off the permission button is the voice section's first stop, reached Down and Up", () => {
    openAllSettingsSections();
    const w = walk(DECK_PANE, "nearest", { microphoneAccessEnabled: false, onJumpToPermission: () => {} });
    const down = [w.enter(), ...w.walk("down")];
    const got = names(down);
    expect(repeats(down), got.join(" | ")).toBe(0);
    const at = got.findIndex((n) => /^Voice input/.test(n));
    expect(got[at + 1]).toBe("Open Permissions");
    expect(got[at + 2]).toBe("tiny.en (faster, less accurate)");
    const up = w.walk("up");
    const upNames = names(up);
    expect(upNames.indexOf("Open Permissions")).toBeGreaterThan(upNames.indexOf("tiny.en (faster, less accurate)"));
    expect(upNames[upNames.indexOf("Open Permissions") + 1]).toMatch(/^Voice input/);
    w.unmount();
  });

  it("the strip shows each row's own text while the ring is on it, and hides on a section line", () => {
    openAllSettingsSections();
    const w = walk(MONITOR_PANE, "nearest");
    const seen = new Map<string, string>();
    for (const l of [w.enter(), ...w.walk("down")]) seen.set(l.name, l.stripText);
    expect(seen.get("Remember what I typed")).toBe(`Remember what I typed${SETTINGS_ROW_HELP.remember}`);
    expect(seen.get("Show Developer tab")).toBe(`Show Developer tab${SETTINGS_ROW_HELP.developerTab}`);
    expect(seen.get("Set text size to Small")).toBe(`Text size${SETTINGS_ROW_HELP.textSize}`);
    expect(seen.get("Set screenshot quality to Save memory")).toBe(`Screenshot quality${SETTINGS_ROW_HELP.screenshot}`);
    expect(seen.get("Adjust UI automatically")).toMatch(/^Adjust UI automatically.*Active: Handheld/);
    expect(seen.get("Clear cache...")).toBe("");
    for (const [name, text] of seen) if (/ section(:|$)/.test(name)) expect(text, name).toBe("");
    w.unmount();
  });
});

describe("the floating Open all button on the Settings tab", () => {
  const lineOf = (c: HTMLElement, id: string) => c.querySelector<SteamEl>(`[data-bonsai-fold-line="${id}"]`)!;
  const hostOf = (c: HTMLElement) => c.querySelector<SteamEl>(`[data-bonsai-fold-all="${SETTINGS_FOLD_TAB}"]`)!;

  it("Right from Voice replies puts the ring on it; A opens every section (Close all); Down holds; Up returns to Voice replies", () => {
    closeAllSettingsSections();
    const w = walk(DECK_PANE, "nearest");
    const host = hostOf(w.container);
    const button = host.querySelector("button")!;
    act(() => {
      putSteamRingOn(lineOf(w.container, "voicereplies"));
      lineOf(w.container, "voicereplies").__nav?.onMoveRight?.();
    });
    expect(steamRingHolder()).toBe(button);
    act(() => button.click());
    expect(w.container.querySelectorAll('.bonsai-fold-line[data-open="true"]')).toHaveLength(settingsSectionIds(true).length);
    expect(button.textContent).toContain("Close all");
    expect(steamRingHolder()).toBe(button);
    act(() => {
      host.__nav?.onMoveDown?.();
    });
    expect(steamRingHolder()).toBe(button);
    act(() => {
      host.__nav?.onMoveUp?.();
    });
    expect(steamRingHolder()).toBe(lineOf(w.container, "voicereplies"));
    w.unmount();
  });

  it("Up, Left and B come back to the same line, and Right holds still", () => {
    closeAllSettingsSections();
    const w = walk(DECK_PANE, "nearest");
    const host = hostOf(w.container);
    const button = host.querySelector("button")!;
    const toButton = () =>
      act(() => {
        putSteamRingOn(lineOf(w.container, "chips"));
        lineOf(w.container, "chips").__nav?.onMoveRight?.();
      });
    for (const exit of ["onMoveUp", "onMoveLeft", "onCancelButton"] as const) {
      toButton();
      expect(steamRingHolder(), exit).toBe(button);
      act(() => {
        host.__nav?.[exit]?.({ preventDefault: () => {} });
      });
      expect(steamRingHolder(), exit).toBe(lineOf(w.container, "chips"));
    }
    toButton();
    let claimed: unknown;
    act(() => {
      claimed = host.__nav?.onMoveRight?.();
    });
    expect(claimed).toBe(true);
    expect(steamRingHolder()).toBe(button);
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
