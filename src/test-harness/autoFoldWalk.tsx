/**
 * Title: "Open sections as you walk", walked on a real folded tab: the shared test kit (plan 105, lane C2)
 * Purpose: What the autoFold walk tests share: the three folded tabs as a person arrives on them, the walk with its
 *          boxes laid out again at every read (foldedTabWalk.tsx's `liveLayout`, so a section that opens or closes
 *          inside a press is measured at once), each landing read off the screen as it happens, the sections the
 *          maintainer's rule asks for after each landing, and the checks every landing must pass. `checkAutoFoldWalk`
 *          is the whole check of row P105-SECTIONS-AUTO-01 for one tab, one pane and one of Steam's scroll rules.
 * Used for: src/features/folded-tabs/autoFold.walk*.test.tsx (one file per tab, so no file runs long enough to
 *           starve the test runner's own messages, and one for the rest). Each test file mocks @decky/ui itself.
 * Does not: Know the Deck's real heights (foldedTabWalk.tsx's flow model); the Deck walk measures the truth.
 */
import React from "react";
import { act } from "@testing-library/react";
import { expect } from "vitest";

import { OllamaTab } from "../features/ai-connection/OllamaTab";
import { SettingsTab } from "../features/settings/SettingsTab";
import { DeveloperTab } from "../features/developer/DeveloperTab";
import { developerProps, ollamaProps, settingsProps } from "./ringTestProps";
import { OLLAMA_FOLD_TAB, OLLAMA_SECTIONS } from "../features/ai-connection/ollamaTabFolds";
import { SETTINGS_FOLD_TAB, settingsSectionIds } from "../features/settings/settingsTabFolds";
import { DEVELOPER_FOLD_TAB, developerSectionsShown } from "../features/developer/developerTabFolds";
import { resetFoldedTabsForTests, setAllSections } from "../features/folded-tabs/foldedTabsStore";
import { resetAutoFoldForTests, sectionsOpenAfterLanding } from "../features/folded-tabs/autoFold";
import { stripHeightFor } from "../features/folded-tabs/foldedTabs";
import { publishOpenSectionsAsYouWalk, resetOpenSectionsAsYouWalkForTests } from "../features/settings/openSectionsAsYouWalkSignal";
import { resetNavFocusRegistry } from "../shared/dpad/navFocusRegistry";
import { walkFoldedTab, type FoldedLanding, type FoldedTabWalk } from "./foldedTabWalk";
import type { SteamFocusScroll } from "./tabBodyWalk";

export const DECK_PANE = 430;
const MONITOR_PANE = 741;
/** The pane's top on the screen (foldedTabWalk.tsx). */
export const PANE_TOP = 24;
export const BOUND = 90;
/** The room a folded tab leaves under its last line (foldedTabs.ts). */
const TAIL = 120;
/** The plugin's ring on a plain button reaches 4 px outside it (2 px outline, 2 px offset: scopeBase.ts). */
const RING_REACH = 4;

/** Each pane and Steam scroll rule a tab is walked under: the Deck's own pane under all three, the monitor's under one. */
export const PANES: [number, SteamFocusScroll][] = [
  [DECK_PANE, "nearest"],
  [DECK_PANE, "centerIfHidden"],
  [DECK_PANE, "center"],
  [MONITOR_PANE, "nearest"],
];

export interface TabCase {
  name: string;
  tabId: "ollama" | "settings" | "developer";
  tab: () => React.ReactElement;
  /** The tab's sections on screen, in order. */
  ids: string[];
}

export const OLLAMA_CASE: TabCase = {
  name: "Ollama",
  tabId: OLLAMA_FOLD_TAB as "ollama",
  tab: () => <OllamaTab {...ollamaProps()} />,
  ids: OLLAMA_SECTIONS.map((s) => s.id),
};

export const SETTINGS_CASE: TabCase = {
  name: "Settings",
  tabId: SETTINGS_FOLD_TAB as "settings",
  tab: () => <SettingsTab {...settingsProps()} showDeveloperTab aiCharacterEnabled microphoneAccessEnabled />,
  ids: settingsSectionIds(),
};

/*
 * One test chip pinned, as the every-section-open Developer walk has it (DeveloperTab.foldedWalk.test.tsx, BUSIEST):
 * with none pinned, Logging & exports' last row is "Frozen test chips", whose long words make the strip so tall that
 * at the page's end the row sits 2 px too close to it, with the switch on or off alike (Logging & exports became the
 * last section when the Animations section went; reported by lane C2, not this switch's to fix).
 */
export const DEVELOPER_CASE: TabCase = {
  name: "Developer",
  tabId: DEVELOPER_FOLD_TAB as "developer",
  tab: () => (
    <DeveloperTab
      {...developerProps()}
      onInstallSeedKnowledgeBase={async () => {}}
      capturedErrors={["first boom"]}
      devFrozenTestChips={["one question"]}
    />
  ),
  ids: developerSectionsShown(true).map((s) => s.id),
};

/** Every store the walk touches back to a first visit, the switch off; for each test's beforeEach. */
export function resetAutoFoldWalk(): void {
  resetFoldedTabsForTests();
  resetAutoFoldForTests();
  resetNavFocusRegistry();
  resetOpenSectionsAsYouWalkForTests();
}

/** The settings hook's part: the switch on (no settings hook runs in these tests). */
export function switchOn(): void {
  act(() => publishOpenSectionsAsYouWalk(true, () => {}));
}

export function walk(t: TabCase, viewport: number, steam: SteamFocusScroll): FoldedTabWalk {
  return walkFoldedTab({ tabId: t.tabId, tab: t.tab(), viewport, steam, stripHeight: stripHeightFor, tail: TAIL, liveLayout: true });
}

/** The sections drawn open now, in order. */
export function openNow(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.bonsai-fold-line[data-open="true"]')).map(
    (l) => l.getAttribute("data-bonsai-fold-line") ?? "",
  );
}

/**
 * One landing as the screen showed it at that moment: the sections drawn open, and which section the stop is in and
 * whether it is the line. Read at the landing, because a stop whose section later closes is no longer on the page.
 */
export type Seen = { l: FoldedLanding; open: string[]; section: string | null; line: boolean };

export function seeing(w: FoldedTabWalk, l: FoldedLanding): Seen {
  const section = l.stop.closest("[data-bonsai-fold-section]")?.getAttribute("data-bonsai-fold-section") ?? null;
  return { l, open: openNow(w.container), section, line: Boolean(l.stop.closest("[data-bonsai-fold-line]")) };
}

/** Every press one way until the ring stops, at most `bound`, each landing as the screen showed it. */
export function walkSeeing(w: FoldedTabWalk, direction: "down" | "up", bound = BOUND): Seen[] {
  const out: Seen[] = [];
  for (let i = 0; i < bound; i++) {
    const l = w.press(direction);
    if (!l) break;
    out.push(seeing(w, l));
  }
  return out;
}

export const names = (seen: Seen[]) => seen.filter((s) => s.section !== null).map((s) => s.l.name);
const repeats = (seen: Seen[]) => seen.length - new Set(seen.map((s) => s.l.stop)).size;

/**
 * The sections the rule asks for after each landing, worked out from the walk itself: which section each landing is
 * in, whether it is the line, and its place among that section's settings as the walk met them (first, last). The
 * rule is applied to those places, so the tab's own finders and wiring are what is under test.
 */
function expectedOpen(order: string[], start: string[], seen: Seen[], direction: "down" | "up"): string[][] {
  const total = new Map<string, number>();
  for (const s of seen) if (s.section !== null && !s.line) total.set(s.section, (total.get(s.section) ?? 0) + 1);
  const met = new Map<string, number>();
  let open = new Set(start);
  return seen.map((s) => {
    const section = s.section;
    if (section === null) return [...open].sort();
    if (s.line) {
      open = sectionsOpenAfterLanding(order, open, { section, line: true, first: false, last: false });
    } else {
      const k = (met.get(section) ?? 0) + 1;
      met.set(section, k);
      const n = total.get(section)!;
      const index = direction === "down" ? k : n - k + 1;
      open = sectionsOpenAfterLanding(order, open, { section, line: false, first: index === 1, last: index === n });
    }
    return [...open].sort();
  });
}

/**
 * Every landing on screen and clear of the strip; the page moved no more than a third; the redraw held the row still.
 * Up from the floating button too: it lands on the last section's last control, just above the button (plan 106 F1);
 * its line, where it used to land, lay more than a third of the pane up on the Developer tab.
 */
function checkLandings(seen: Seen[], viewport: number, label: string): void {
  for (const { l, section } of seen) {
    if (section === null) continue;
    const at = `${label}: press ${l.press} onto ${l.name}`;
    expect(l.pageMoved, `${at}: the page moved`).toBeLessThanOrEqual(viewport / 3);
    expect(l.top, `${at}: top`).toBeGreaterThanOrEqual(PANE_TOP - 0.5);
    expect(l.bottom, `${at}: bottom`).toBeLessThanOrEqual(PANE_TOP + viewport + 0.5);
    if (l.stripTop !== null) expect(l.bottom + RING_REACH + 6, `${at}: clear of the strip`).toBeLessThanOrEqual(l.stripTop);
    if (!l.pinned) expect(Math.abs(l.redrawShift), `${at}: the redraw moved the ringed row`).toBeLessThanOrEqual(1);
    /* Pinned at the page's top or end, the row may move, but the plugin alone leaves it on screen. */
    expect(l.placedTop, `${at}: placed top`).toBeGreaterThanOrEqual(PANE_TOP - 0.5);
    expect(l.placedBottom, `${at}: placed bottom`).toBeLessThanOrEqual(PANE_TOP + viewport + 0.5);
  }
}

/** The every-section-open walk's stops, Down then Up, per tab: they depend on the D-pad's moves, not the pane or the scroll. */
const references = new Map<string, { down: string[]; up: string[] }>();

export function everyOpenWalk(t: TabCase): { down: string[]; up: string[] } {
  const known = references.get(t.tabId);
  if (known) return known;
  setAllSections(t.tabId, t.ids, true);
  const w = walk(t, DECK_PANE, "nearest");
  const down = [seeing(w, w.enter()), ...walkSeeing(w, "down")];
  const up = walkSeeing(w, "up");
  w.unmount();
  resetAutoFoldWalk();
  const reference = { down: names(down), up: names(up) };
  references.set(t.tabId, reference);
  return reference;
}

/**
 * Row P105-SECTIONS-AUTO-01 for tab `t` in a pane `viewport` tall under Steam's scroll rule `steam`: with the switch on
 * and the tab as a person arrives on it, Down from the tab bar to the end and back Up stop where the every-section-open
 * walk stops, in order, none twice; after every press the sections drawn open are the rule's; every stop is on screen
 * and clear of the strip, the page moving no more than a third of the pane; and a section opening or closing above
 * the ring never moves the ringed row on screen unless the page is at its top or end.
 */
export function checkAutoFoldWalk(t: TabCase, viewport: number, steam: SteamFocusScroll): void {
  const reference = everyOpenWalk(t);
  switchOn();
  const w = walk(t, viewport, steam);
  const start = openNow(w.container);
  expect(start, "arrives with its first section open (lane C1)").toEqual([t.ids[0]]);
  const down = [seeing(w, w.enter()), ...walkSeeing(w, "down")];
  expect(repeats(down), names(down).join(" | ")).toBe(0);
  expect(names(down)).toEqual(reference.down);
  expect(down.map((s) => [...s.open].sort())).toEqual(expectedOpen(t.ids, start, down, "down"));
  checkLandings(down, viewport, `${t.name} ${steam} down`);

  const up = walkSeeing(w, "up");
  expect(repeats(up), names(up).join(" | ")).toBe(0);
  expect(names(up)).toEqual(reference.up);
  expect(up.map((s) => [...s.open].sort())).toEqual(expectedOpen(t.ids, down[down.length - 1]!.open, up, "up"));
  checkLandings(up, viewport, `${t.name} ${steam} up`);
  /* On the Deck's own pane the page scrolls, so a section above the ring closing (Down) and opening (Up) gave the hold work to do. */
  if (viewport === DECK_PANE) {
    expect(down.some((s) => Math.abs(s.l.held) > 1), "a hold going Down").toBe(true);
    expect(up.some((s) => Math.abs(s.l.held) > 1), "a hold going Up").toBe(true);
  }
  w.unmount();
}
