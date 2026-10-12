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
import { registerNavFocus, resetNavFocusRegistry } from "../utils/navFocusRegistry";
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

/** Steam's pane around a drawn Ollama body (one fold line in it), with a scroll position a test can set and read. */
function drawOllamaPane(scrollTop: number) {
  let top = scrollTop;
  const pane = document.createElement("div");
  pane.className = "TabContentsScroll_abc123";
  Object.defineProperty(pane, "scrollTop", { configurable: true, get: () => top, set: (v: number) => (top = v) });
  const body = document.createElement("div");
  body.setAttribute("data-bonsai-tab-body", OLLAMA_FOLD_TAB);
  const line = document.createElement("div");
  line.setAttribute("data-bonsai-fold-line", "where");
  body.appendChild(line);
  pane.appendChild(body);
  document.body.appendChild(pane);
  return { scrollTop: () => top, remove: () => pane.remove() };
}

describe("the page starts at its top on a real switch, and only then", () => {
  let dom: ReturnType<typeof drawOllamaPane>;
  beforeEach(() => {
    dom = drawOllamaPane(330);
  });
  afterEach(() => dom.remove());

  it("the bar and Steam's LB/RB put the page of the folded tab at 0", () => {
    const { result } = renderHook(() => useBonsaiPluginShell({ getSessionSnapshot: emptySnapshot }));
    act(() => result.current.selectTab(OLLAMA_FOLD_TAB));
    expect(dom.scrollTop()).toBe(0);
    dom.remove();
    dom = drawOllamaPane(330);
    act(() => result.current.onTabsShowTab("main"));
    act(() => result.current.onTabsShowTab(OLLAMA_FOLD_TAB));
    expect(dom.scrollTop()).toBe(0);
  });

  it("a tab rebuilt after a popup (mounted again on Ollama) keeps the page where it is", () => {
    mountOnOllama();
    expect(dom.scrollTop()).toBe(330);
  });

  it("the post-popup lock sending Steam's jump to Main back to Ollama keeps the page where it is", () => {
    vi.useFakeTimers();
    const { result } = mountOnOllama();
    act(() => {
      result.current.characterPickerReturnTabRef.current = OLLAMA_FOLD_TAB;
      result.current.finalizeShowModalAndRestoreActiveTab(() => {});
    });
    act(() => result.current.onTabsShowTab("main"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(dom.scrollTop()).toBe(330);
  });

  it("asking for the tab already showing keeps the page where it is", () => {
    const { result } = mountOnOllama();
    act(() => result.current.selectTab(OLLAMA_FOLD_TAB));
    expect(dom.scrollTop()).toBe(330);
  });
});

describe("after Steam's shoulder switch the ring lands on the first section line; the bar leaves it alone", () => {
  let dom: ReturnType<typeof drawOllamaPane>;
  let take: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    dom = drawOllamaPane(0);
    take = vi.fn(() => true);
    registerNavFocus(`fold-line:${OLLAMA_FOLD_TAB}:where`, { current: { TakeFocus: take } });
  });
  afterEach(() => {
    resetNavFocusRegistry();
    dom.remove();
  });

  it("LB or RB to the folded tab, with the ring on nothing inside it: the first line takes the ring", () => {
    const { result } = renderHook(() => useBonsaiPluginShell({ getSessionSnapshot: emptySnapshot }));
    act(() => result.current.onTabsShowTab(OLLAMA_FOLD_TAB));
    expect(take).toHaveBeenCalledTimes(1);
  });

  it("a bar press (or Y) to the folded tab leaves the ring alone", () => {
    const { result } = renderHook(() => useBonsaiPluginShell({ getSessionSnapshot: emptySnapshot }));
    act(() => result.current.selectTab(OLLAMA_FOLD_TAB));
    expect(take).not.toHaveBeenCalled();
  });

  it("the tab rebuilt after a popup, or the lock's redirect, does not take the ring", () => {
    vi.useFakeTimers();
    const { result } = mountOnOllama();
    act(() => {
      result.current.characterPickerReturnTabRef.current = OLLAMA_FOLD_TAB;
      result.current.finalizeShowModalAndRestoreActiveTab(() => {});
    });
    act(() => result.current.onTabsShowTab("main"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(take).not.toHaveBeenCalled();
  });
});
