/**
 * Title: The Developer tab's "Open sections as you walk" switch (plan 105, lane C2)
 * Purpose: Pin the switch at the level a screen test reaches: it is a row of the Navigation section, after "Tab to
 *          open on", off on a fresh install, with its words on the row for the help strip; it shows the value the
 *          settings hook published and a press hands the new value to the change function published with it (no
 *          prop carries either: openSectionsAsYouWalkSignal.ts says why); and it is a D-pad stop of its own.
 * Used for: DeveloperTab.tsx, developerRowsLogging.tsx, openSectionsAsYouWalkSignal.ts.
 * Does not: Test what the switch does to a walk (autoFold.walk tests do) or that the setting saves
 *           (usePluginSettings.test.ts does).
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toggles = vi.hoisted(() => ({ byLabel: new Map<string, Record<string, unknown>>() }));
vi.mock("@decky/ui", async () => {
  const stubs = (await import("../../test-harness/fakeDeckyUi")) as unknown as Record<string, unknown>;
  const Real = stubs.ToggleField as React.ComponentType<Record<string, unknown>>;
  const wordsOf = stubs.wordsOf as (n: unknown) => string;
  return {
    ...stubs,
    ToggleField: (p: Record<string, unknown>) => {
      toggles.byLabel.set(wordsOf(p.label), p);
      return <Real {...p} />;
    },
  };
});

import { DeveloperTab, type DeveloperTabProps } from "./DeveloperTab";
import { developerProps } from "../../test-harness/ringTestProps";
import { resetFoldedTabsForTests, setAllSections, toggleSection } from "../folded-tabs/foldedTabsStore";
import { DEVELOPER_FOLD_TAB, DEVELOPER_ROW_HELP, DEVELOPER_ROW_LABELS, DEVELOPER_SECTIONS } from "./developerTabFolds";
import { HELP_TEXT_ATTR } from "../folded-tabs/useHelpStrip";
import {
  publishOpenSectionsAsYouWalk,
  resetOpenSectionsAsYouWalkForTests,
} from "../settings/openSectionsAsYouWalkSignal";

const SECTION_IDS: string[] = DEVELOPER_SECTIONS.map((s) => s.id);
const LABEL = "Open sections as you walk";

function props(): DeveloperTabProps {
  return { ...developerProps(), filesystemWrite: true, onInstallSeedKnowledgeBase: async () => {} };
}

/** The Navigation section's rows, in order, by the name each carries for the strip (a choice row's buttons carry it too). */
function navigationRowNames(container: HTMLElement): string[] {
  const section = container.querySelector('[data-bonsai-fold-section="navigation"]')!;
  const names = Array.from(section.querySelectorAll<HTMLElement>("[data-bonsai-help-label]")).map(
    (el) => el.getAttribute("data-bonsai-help-label") ?? "",
  );
  return names.filter((n, i) => n !== names[i - 1]);
}

beforeEach(() => {
  resetFoldedTabsForTests();
  resetOpenSectionsAsYouWalkForTests();
  toggles.byLabel.clear();
  setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
  toggleSection(DEVELOPER_FOLD_TAB, SECTION_IDS, "navigation");
});
afterEach(() => cleanup());

describe("the Open sections as you walk switch", () => {
  it("is the Navigation section's second row, after Tab to open on, with its words on the row for the strip", () => {
    const { container } = render(<DeveloperTab {...props()} />);
    expect(navigationRowNames(container)).toEqual([DEVELOPER_ROW_LABELS.tabToOpenOn, LABEL]);
    const row = container.querySelector<HTMLElement>(`[data-bonsai-help-label="${LABEL}"]`)!;
    expect(row.getAttribute(HELP_TEXT_ATTR)).toBe(DEVELOPER_ROW_HELP.openSectionsAsYouWalk);
    expect(DEVELOPER_ROW_HELP.openSectionsAsYouWalk).toMatch(/Off by default\.$/);
  });

  it("is off on a fresh install, before the settings hook has published anything", () => {
    render(<DeveloperTab {...props()} />);
    expect(toggles.byLabel.get(LABEL)?.checked).toBe(false);
  });

  it("shows what the settings hook published, and a press hands the new value to the published change function", () => {
    const change = vi.fn();
    act(() => publishOpenSectionsAsYouWalk(true, change));
    render(<DeveloperTab {...props()} />);
    expect(toggles.byLabel.get(LABEL)?.checked).toBe(true);
    act(() => (toggles.byLabel.get(LABEL)!.onChange as (v: boolean) => void)(false));
    expect(change).toHaveBeenCalledWith(false);
    /* A newer value from the hook redraws the switch. */
    act(() => publishOpenSectionsAsYouWalk(false, change));
    expect(toggles.byLabel.get(LABEL)?.checked).toBe(false);
  });

  it("closed, the Navigation line's summary is still the drawn one: the switch is left out so the line stays short", () => {
    act(() => publishOpenSectionsAsYouWalk(true, () => {}));
    setAllSections(DEVELOPER_FOLD_TAB, SECTION_IDS, false);
    const { container } = render(<DeveloperTab {...props()} />);
    const line = container.querySelector('[data-bonsai-fold-line="navigation"]')!;
    expect(line.querySelector(".bonsai-fold-line__summary")!.textContent).toBe("Tab to open on: B · Resume");
  });
});
