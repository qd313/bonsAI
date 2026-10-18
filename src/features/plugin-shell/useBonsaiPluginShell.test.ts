import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBonsaiPluginShell } from "./useBonsaiPluginShell";
import {
  LAST_TAB_AT_STORAGE_KEY,
  LAST_TAB_STORAGE_KEY,
  TAB_RESUME_MODE_STORAGE_KEY,
} from "../../shared/storageKeys";
import { TAB_RESUME_RECENT_WINDOW_MS } from "../settings/bonsaiSettingsSchema";
import {
  loadLastTab,
  loadTabResumeMode,
  resolveResumeTab,
  saveLastTab,
  saveTabResumeMode,
} from "./pluginStorage";
import type { BonsaiSessionSurvivalSnapshot } from "../../utils/bonsaiSessionSurvival";

const emptySnapshot = () => ({ currentTab: "main", unifiedInput: "" }) as unknown as BonsaiSessionSurvivalSnapshot;

const mount = () =>
  renderHook(() => useBonsaiPluginShell({ getSessionSnapshot: emptySnapshot }));

describe("last-tab persistence (D15 option B)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("storage helpers", () => {
    it("returns null when nothing was ever stored", () => {
      expect(loadLastTab()).toBeNull();
    });

    it("round-trips a tab id", () => {
      saveLastTab("ollama");
      expect(loadLastTab()).toBe("ollama");
    });

    it("trims stored whitespace rather than returning a tab id that matches nothing", () => {
      window.localStorage.setItem(LAST_TAB_STORAGE_KEY, "  settings  ");
      expect(loadLastTab()).toBe("settings");
    });

    it("treats a blank stored value as absent", () => {
      window.localStorage.setItem(LAST_TAB_STORAGE_KEY, "   ");
      expect(loadLastTab()).toBeNull();
    });

    it("clears the key when saving an empty tab id", () => {
      saveLastTab("about");
      saveLastTab("");
      expect(window.localStorage.getItem(LAST_TAB_STORAGE_KEY)).toBeNull();
    });

    it("uses a bonsai: prefixed key so Clear all plugin data wipes it", () => {
      // clearBonsaiBrowserStorage removes every bonsai:* key; a differently-named key would survive
      // a data clear and silently reopen the user on a tab from before the wipe.
      expect(LAST_TAB_STORAGE_KEY.startsWith("bonsai:")).toBe(true);
    });
  });

  describe("shell wiring", () => {
    it("opens on Main when nothing is stored", () => {
      const { result } = mount();
      expect(result.current.currentTab).toBe("main");
    });

    it("resumes the stored tab on mount", () => {
      saveLastTab("ollama");
      const { result } = mount();
      expect(result.current.currentTab).toBe("ollama");
    });

    it("persists the tab as soon as it changes", () => {
      const { result } = mount();
      act(() => result.current.setCurrentTab("settings"));
      expect(loadLastTab()).toBe("settings");
    });

    it("a tab change survives a remount, which is the whole point", () => {
      const first = mount();
      act(() => first.result.current.setCurrentTab("permissions"));
      first.unmount();

      const second = mount();
      expect(second.result.current.currentTab).toBe("permissions");
    });

    it("persists Main too, so returning to Main is remembered as a choice", () => {
      saveLastTab("about");
      const { result } = mount();
      act(() => result.current.setCurrentTab("main"));
      expect(loadLastTab()).toBe("main");
    });

    it("records the tab reached through the tab strip, not just direct setState", () => {
      const { result } = mount();
      act(() => result.current.onTabsShowTab("about"));
      expect(loadLastTab()).toBe("about");
    });
  });
});

describe("tab resume mode (D15 A/B/C behind one Developer control)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("the mirrored mode", () => {
    it("reads as option B when nothing was mirrored, matching the locked default", () => {
      expect(loadTabResumeMode()).toBe("resume");
    });

    it("falls back to option B rather than trusting a hand-edited value", () => {
      window.localStorage.setItem(TAB_RESUME_MODE_STORAGE_KEY, "always-main");
      expect(loadTabResumeMode()).toBe("resume");
    });

    it("round-trips each of the three stops", () => {
      for (const mode of ["always_main", "resume", "resume_recent"] as const) {
        saveTabResumeMode(mode);
        expect(loadTabResumeMode()).toBe(mode);
      }
    });

    it("uses a bonsai: prefixed key so Clear all plugin data wipes the mirror too", () => {
      // Surviving a wipe would reopen the user under a mode that settings.json no longer holds.
      expect(TAB_RESUME_MODE_STORAGE_KEY.startsWith("bonsai:")).toBe(true);
      expect(LAST_TAB_AT_STORAGE_KEY.startsWith("bonsai:")).toBe(true);
    });
  });

  describe("option A — always_main", () => {
    it("ignores a stored tab", () => {
      saveLastTab("ollama");
      saveTabResumeMode("always_main");
      expect(resolveResumeTab("main")).toBe("main");
      expect(mount().result.current.currentTab).toBe("main");
    });

    it("still records the tab, so switching back to B resumes without another tab change", () => {
      saveTabResumeMode("always_main");
      const { result } = mount();
      act(() => result.current.setCurrentTab("settings"));
      saveTabResumeMode("resume");
      expect(resolveResumeTab("main")).toBe("settings");
    });
  });

  describe("option B — resume", () => {
    it("resumes however old the stored tab is", () => {
      saveLastTab("ollama");
      window.localStorage.setItem(LAST_TAB_AT_STORAGE_KEY, String(Date.now() - 30 * 86_400_000));
      saveTabResumeMode("resume");
      expect(resolveResumeTab("main")).toBe("ollama");
    });
  });

  describe("option C — resume_recent", () => {
    it("resumes inside the window", () => {
      saveLastTab("ollama");
      saveTabResumeMode("resume_recent");
      expect(resolveResumeTab("main")).toBe("ollama");
      expect(mount().result.current.currentTab).toBe("ollama");
    });

    it("falls back to Main once the window has passed", () => {
      saveLastTab("ollama");
      window.localStorage.setItem(
        LAST_TAB_AT_STORAGE_KEY,
        String(Date.now() - TAB_RESUME_RECENT_WINDOW_MS - 1000),
      );
      saveTabResumeMode("resume_recent");
      expect(resolveResumeTab("main")).toBe("main");
      expect(mount().result.current.currentTab).toBe("main");
    });

    it("treats a tab stored without a timestamp as expired", () => {
      // Only an upgrade from a build before this change can produce that pair; an unknown age
      // resolving to Main is the predictable half of the guess.
      window.localStorage.setItem(LAST_TAB_STORAGE_KEY, "settings");
      saveTabResumeMode("resume_recent");
      expect(resolveResumeTab("main")).toBe("main");
    });

    it("re-stamps the window on every tab change, so an active session keeps resuming", () => {
      window.localStorage.setItem(
        LAST_TAB_AT_STORAGE_KEY,
        String(Date.now() - TAB_RESUME_RECENT_WINDOW_MS - 1000),
      );
      saveTabResumeMode("resume_recent");
      const { result } = mount();
      act(() => result.current.setCurrentTab("settings"));
      expect(resolveResumeTab("main")).toBe("settings");
    });
  });

  it("clearing the stored tab clears its timestamp with it", () => {
    saveLastTab("about");
    saveLastTab("");
    expect(window.localStorage.getItem(LAST_TAB_AT_STORAGE_KEY)).toBeNull();
  });
});

describe("selectTab (plan 30: a tab chosen on bonsAI's own bar)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("switches the tab and clears the post-picker lock, so a later Steam switch is not redirected", () => {
    const { result } = mount();
    // Arm the lock the way a closing picker does: return to Settings, not Main.
    act(() => result.current.prepareModalWithReturnTab("settings"));
    act(() => result.current.finalizeShowModalAndRestoreActiveTab(() => {}));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.currentTab).toBe("settings");
    // While the lock is live, Steam reporting Main is the spurious jump it exists to block.
    act(() => result.current.onTabsShowTab("main"));
    expect(result.current.currentTab).toBe("settings");
    // A press on our bar is a deliberate choice: it lands, and it ends the lock.
    act(() => result.current.selectTab("ollama"));
    expect(result.current.currentTab).toBe("ollama");
    act(() => result.current.onTabsShowTab("main"));
    expect(result.current.currentTab).toBe("main");
  });

  it("persists the chosen tab like any other change", () => {
    const { result } = mount();
    act(() => result.current.selectTab("about"));
    expect(loadLastTab()).toBe("about");
  });
});
