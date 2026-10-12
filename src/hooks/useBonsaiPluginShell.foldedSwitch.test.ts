/**
 * Title: A real tab switch closes every folded section; a popup closing over the tab does not
 * Purpose: Pin the maintainer's call of 2026-10-12 at the one place that knows a person switched tabs
 *          (useBonsaiPluginShell): arriving on a folded tab by the bar, by LB or RB (Steam's own switch),
 *          or by Y (which calls the bar's function) shows every section closed. It must NOT close them when
 *          the tab is rebuilt after a popup (a remount is not a switch), when Steam's spurious jump to Main
 *          after a popup is sent back to the tab by the post-popup lock, or when the tab asked for is the
 *          one already showing.
 * Used for: useBonsaiPluginShell.ts, foldedTabsStore.ts (closeAllFoldedSections).
 * Does not: Draw the tab; the sections here are the store's open set, which the real lines read.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBonsaiPluginShell } from "./useBonsaiPluginShell";
import { isSectionOpen, resetFoldedTabsForTests, toggleSection } from "../features/folded-tabs/foldedTabsStore";
import { OLLAMA_FOLD_TAB, OLLAMA_SECTIONS } from "../features/folded-tabs/ollamaTabFolds";
import { saveLastTab } from "../features/plugin-shell/pluginStorage";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";

const IDS = OLLAMA_SECTIONS.map((s) => s.id);
const emptySnapshot = () => ({ currentTab: "ollama", unifiedInput: "" }) as unknown as BonsaiSessionSurvivalSnapshot;
const mountOnOllama = () => {
  saveLastTab(OLLAMA_FOLD_TAB);
  return renderHook(() => useBonsaiPluginShell({ getSessionSnapshot: emptySnapshot }));
};
const openIds = () => IDS.filter((id) => isSectionOpen(OLLAMA_FOLD_TAB, IDS, id));
const openTwo = () => {
  toggleSection(OLLAMA_FOLD_TAB, IDS, "reply");
  toggleSection(OLLAMA_FOLD_TAB, IDS, "models");
};

beforeEach(() => {
  window.localStorage.clear();
  resetFoldedTabsForTests();
});
afterEach(() => vi.useRealTimers());

describe("a real tab switch closes every folded section", () => {
  it("the bar: Ollama with two sections open, to Main and back, shows none open", () => {
    const { result } = mountOnOllama();
    openTwo();
    expect(openIds()).toEqual(["reply", "models"]);
    act(() => result.current.selectTab("main"));
    act(() => result.current.selectTab(OLLAMA_FOLD_TAB));
    expect(result.current.currentTab).toBe(OLLAMA_FOLD_TAB);
    expect(openIds()).toEqual([]);
  });

  it("LB or RB (Steam's own switch): Ollama to Main and back shows none open", () => {
    const { result } = mountOnOllama();
    openTwo();
    act(() => result.current.onTabsShowTab("main"));
    expect(openIds()).toEqual([]);
    toggleSection(OLLAMA_FOLD_TAB, IDS, "kb");
    act(() => result.current.onTabsShowTab(OLLAMA_FOLD_TAB));
    expect(openIds()).toEqual([]);
  });

  it("the way back (the section the ring last landed in) is forgotten with them", async () => {
    const store = await import("../features/folded-tabs/foldedTabsStore");
    const { result } = mountOnOllama();
    store.rememberFoldSection(OLLAMA_FOLD_TAB, "reply");
    act(() => result.current.selectTab("main"));
    expect(store.foldSectionToReturnTo(OLLAMA_FOLD_TAB)).toBeNull();
  });
});

describe("what is not a switch leaves the sections as they are", () => {
  it("asking for the tab already showing changes nothing, by the bar or by Steam", () => {
    const { result } = mountOnOllama();
    openTwo();
    act(() => result.current.selectTab(OLLAMA_FOLD_TAB));
    act(() => result.current.onTabsShowTab(OLLAMA_FOLD_TAB));
    expect(openIds()).toEqual(["reply", "models"]);
  });

  it("the tab being rebuilt after a popup (unmounted and mounted again) keeps them open", () => {
    const first = mountOnOllama();
    openTwo();
    first.unmount();
    const again = mountOnOllama();
    expect(again.result.current.currentTab).toBe(OLLAMA_FOLD_TAB);
    expect(openIds()).toEqual(["reply", "models"]);
  });

  it("the post-popup lock sending Steam's jump to Main back to Ollama keeps them open", () => {
    vi.useFakeTimers();
    const { result } = mountOnOllama();
    openTwo();
    act(() => {
      result.current.characterPickerReturnTabRef.current = OLLAMA_FOLD_TAB;
      result.current.finalizeShowModalAndRestoreActiveTab(() => {});
    });
    act(() => result.current.onTabsShowTab("main"));
    expect(result.current.currentTab).toBe(OLLAMA_FOLD_TAB);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.currentTab).toBe(OLLAMA_FOLD_TAB);
    expect(openIds()).toEqual(["reply", "models"]);
  });

  it("Steam naming the tab already showing after a popup keeps them open", () => {
    vi.useFakeTimers();
    const { result } = mountOnOllama();
    openTwo();
    act(() => {
      result.current.characterPickerReturnTabRef.current = OLLAMA_FOLD_TAB;
      result.current.finalizeShowModalAndRestoreActiveTab(() => {});
    });
    act(() => result.current.onTabsShowTab(OLLAMA_FOLD_TAB));
    expect(openIds()).toEqual(["reply", "models"]);
  });

  it("a restore after a remount, which sets the tab directly, keeps them open", () => {
    const { result } = mountOnOllama();
    openTwo();
    act(() => result.current.setCurrentTab("settings"));
    act(() => result.current.setCurrentTab(OLLAMA_FOLD_TAB));
    expect(openIds()).toEqual(["reply", "models"]);
  });
});
