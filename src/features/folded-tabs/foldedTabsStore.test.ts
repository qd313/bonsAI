/**
 * Title: The folded tabs' memory: which sections are open, and where the ring was
 * Purpose: Pin the store under every folded tab (plan 91 § 2b): a tab's first visit has every section closed;
 *          opening one leaves the others as they are; Open all and Close all; the tabs do not share an open set;
 *          a listener hears every change; and the section the ring last landed in is kept for the Open all
 *          button's way back. It lives outside React, which is what lets it outlast a rebuilt tab
 *          (FoldedSection.test.tsx mounts and unmounts the real lines over it).
 * Used for: foldedTabsStore.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  allSectionsOpen,
  foldSectionToReturnTo,
  foldedTabsVersion,
  isSectionOpen,
  rememberFoldSection,
  resetFoldedTabsForTests,
  setAllSections,
  subscribeFoldedTabs,
  toggleSection,
} from "./foldedTabsStore";

const IDS = ["where", "kb", "reply"];

beforeEach(() => resetFoldedTabsForTests());

describe("the folded tabs' store", () => {
  it("a first visit has no section open", () => {
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, false, false]);
    expect(allSectionsOpen("ollama", IDS)).toBe(false);
  });

  it("toggling one section leaves the others as they are; several can be open", () => {
    toggleSection("ollama", IDS, "reply");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, false, true]);
    toggleSection("ollama", IDS, "where");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([true, false, true]);
    toggleSection("ollama", IDS, "reply");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([true, false, false]);
  });

  it("opens or closes every section at once", () => {
    setAllSections("ollama", IDS, true);
    expect(allSectionsOpen("ollama", IDS)).toBe(true);
    setAllSections("ollama", IDS, false);
    expect(IDS.some((id) => isSectionOpen("ollama", IDS, id))).toBe(false);
  });

  it("keeps each tab's open set to itself", () => {
    setAllSections("settings", IDS, true);
    expect(allSectionsOpen("ollama", IDS)).toBe(false);
  });

  it("tells its listeners of every change, with a new version each time", () => {
    const heard = vi.fn();
    const stop = subscribeFoldedTabs(heard);
    const before = foldedTabsVersion();
    toggleSection("ollama", IDS, "kb");
    setAllSections("ollama", IDS, true);
    expect(heard).toHaveBeenCalledTimes(2);
    expect(foldedTabsVersion()).toBe(before + 2);
    stop();
    toggleSection("ollama", IDS, "kb");
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("keeps the section the ring last landed in, per tab", () => {
    expect(foldSectionToReturnTo("ollama")).toBeNull();
    rememberFoldSection("ollama", "kb");
    rememberFoldSection("settings", "data");
    expect(foldSectionToReturnTo("ollama")).toBe("kb");
  });
});
