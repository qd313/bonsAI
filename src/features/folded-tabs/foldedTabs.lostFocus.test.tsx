/**
 * Title: Down from every open section line of the Ollama and Developer tabs while the panel's page has lost focus (plan 97)
 * Purpose: The Ollama and Developer tabs' twin of SettingsTab.lostFocus.test.tsx (row P97-L14-SECTIONS): with the
 *          panel's page out of the browser's focus, a section line's Down into its open section was a plain focus()
 *          that moved the page's focus and left Steam's ring on the line, while the line reported the press handled.
 *          Each real tab is drawn, every section open, inside a page whose focus a test takes away
 *          (lostFocusPanel.tsx), and Down is pressed from each line the way Steam calls it.
 * Used for: useOllamaTabFocus.ts and useDeveloperTabFocus.ts (each section's entry, now an honest hop), with
 *           FoldedSection.tsx (a line declines when its entry could not move the ring).
 * Solves: After every press the ring has left the line for a control inside its section, by Steam's own step down
 *         the column when the plugin declined, and the ring and the page's focus agree. With focus present, the
 *         same press lands on the same control.
 * Does not: Scroll or measure; the folded walks with Steam's scroll are the tabs' foldedWalk tests, unchanged.
 */
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { mountPanelPage, type PanelPage } from "../../test-harness/lostFocusPanel";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { developerProps, ollamaProps } from "../../test-harness/ringTestProps";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../test-harness/lostFocusPanel");
  const Focusable = withPanelNav(stubs.Focusable);
  /* Steam's switch row: a stop of its own (Decky stamps tabindex on it), keeping the move handlers it is given. */
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _c, onChange: _o, description: _d, disabled: _x, ...rest } = p;
    return <Focusable {...rest} focusable tabIndex={0} aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable, ToggleField, Button: withPanelNav(stubs.Button) };
});

import { OllamaTab } from "../ai-connection/OllamaTab";
import { OLLAMA_FOLD_TAB, OLLAMA_SECTIONS } from "../ai-connection/ollamaTabFolds";
import { DeveloperTab } from "../developer/DeveloperTab";
import { DEVELOPER_FOLD_TAB, DEVELOPER_SECTIONS } from "../developer/developerTabFolds";
import { resetFoldedTabsForTests, setAllSections } from "./foldedTabsStore";

const STEAM_STOPS = "[tabindex], button, input";

type Case = { name: string; tab: string; ids: string[]; draw: () => React.ReactElement };
const CASES: Case[] = [
  { name: "Ollama", tab: OLLAMA_FOLD_TAB, ids: OLLAMA_SECTIONS.map((s) => s.id), draw: () => <OllamaTab {...ollamaProps()} /> },
  {
    name: "Developer",
    tab: DEVELOPER_FOLD_TAB,
    ids: DEVELOPER_SECTIONS.map((s) => s.id),
    draw: () => <DeveloperTab {...developerProps()} />,
  },
];

let page: PanelPage;

/** Steam's stops, top to bottom, innermost only: what its own step down the column walks. */
function steamStops(): HTMLElement[] {
  const found = Array.from(page.host.querySelectorAll<HTMLElement>(STEAM_STOPS));
  return found.filter((el) => !el.querySelector(STEAM_STOPS));
}
function nextBelow(from: HTMLElement): HTMLElement | null {
  const list = steamStops();
  return list[list.indexOf(from) + 1] ?? null;
}

beforeEach(() => {
  resetNavFocusRegistry();
  page = mountPanelPage();
});
afterEach(() => {
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

describe.each(CASES)("the $name tab: Down from an open section's line with the page's focus gone", ({ tab, ids, draw }) => {
  it("lands inside that section every time, the ring and the page's focus together, as it does with focus", () => {
    resetFoldedTabsForTests();
    setAllSections(tab, ids, true);
    render(draw(), { container: page.host });
    const lines = Array.from(page.host.querySelectorAll<HTMLElement>(".bonsai-fold-line"));
    /* Decky stamps tabindex on the nodes Steam navigates; the stub does not: the lines, and the Reply style
       slider's knob (the Focusable inside its thumb host, as OllamaTab.foldedWalk.test.tsx reads it). */
    lines.forEach((el) => el.setAttribute("tabindex", "0"));
    page.host.querySelectorAll<HTMLElement>("[data-bonsai-reply-verbosity-thumb] > *").forEach((el) => el.setAttribute("tabindex", "0"));
    expect(lines.length).toBeGreaterThan(1);

    for (const line of lines) {
      const body = line.closest(".bonsai-fold-section")?.querySelector(".bonsai-fold-body");
      if (!body) continue;
      const label = line.getAttribute("aria-label");

      page.setFocused(true);
      act(() => page.steamMove(line));
      act(() => {
        page.press("onMoveDown", nextBelow);
      });
      const withFocus = page.ring();

      act(() => page.steamMove(line));
      page.setFocused(false);
      act(() => {
        page.press("onMoveDown", nextBelow);
      });

      expect(page.ring() !== line, `${label}: the ring stayed on the line`).toBe(true);
      expect(body.contains(page.ring()), `${label}: the ring left the section`).toBe(true);
      expect(page.active() === page.ring(), `${label}: the page's focus left the ring`).toBe(true);
      const desc = (el: HTMLElement | null) => (el ? `${el.tagName}.${el.className}[${el.getAttribute("aria-label")}]` : "none");
      expect(page.ring() === withFocus, `${label}: ${desc(page.ring())} vs with focus ${desc(withFocus)}`).toBe(true);
    }
  });
});
