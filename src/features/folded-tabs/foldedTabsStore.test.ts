/**
 * Title: The folded tabs' memory: which sections are open, and where the ring was
 * Purpose: Pin the store under every folded tab (plan 91 § 2b): a tab's first visit has its first section open
 *          (plan 105, lane C1) and the rest closed; switching tabs gives the first section back, every time;
 *          a jump into one section opens that one in place of the first; opening one leaves the others as they
 *          are; Open all and Close all; the tabs do not share an open set;
 *          the walk's exact set (plan 105), silent when nothing changes;
 *          a listener hears every change; and the section the ring last landed in is kept for the Open all
 *          button's way back. It lives outside React, which is what lets it outlast a rebuilt tab
 *          (FoldedSection.test.tsx mounts and unmounts the real lines over it).
 * Used for: foldedTabsStore.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  allSectionsOpen,
  closeAllFoldedSections,
  foldSectionToReturnTo,
  foldedTabsVersion,
  isSectionOpen,
  openSection,
  rememberFoldSection,
  resetFoldedTabsForTests,
  setAllSections,
  setOpenSections,
  subscribeFoldedTabs,
  toggleSection,
} from "./foldedTabsStore";

const IDS = ["where", "kb", "reply"];

beforeEach(() => resetFoldedTabsForTests());

describe("the folded tabs' store", () => {
  it("a first visit has the first section open and the others closed", () => {
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([true, false, false]);
    expect(allSectionsOpen("ollama", IDS)).toBe(false);
  });

  it("the first section is the first of the list the tab asks with (the ones on screen), not of a longer list", () => {
    const SHOWN = ["diagnostics", "navigation"];
    expect(SHOWN.map((id) => isSectionOpen("developer", SHOWN, id))).toEqual([true, false]);
  });

  it("a tab with no sections has nothing to open and does not fail", () => {
    expect(allSectionsOpen("empty", [])).toBe(true);
    expect(isSectionOpen("empty", [], "x")).toBe(false);
  });

  it("coming back to a tab opens its first section again, whatever was left open or shut", () => {
    toggleSection("ollama", IDS, "reply");
    toggleSection("ollama", IDS, "where");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, false, true]);
    closeAllFoldedSections();
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([true, false, false]);
    setAllSections("ollama", IDS, false);
    closeAllFoldedSections();
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([true, false, false]);
  });

  it("Close all keeps every section shut until the person switches tabs", () => {
    setAllSections("ollama", IDS, false);
    expect(IDS.some((id) => isSectionOpen("ollama", IDS, id))).toBe(false);
  });

  it("a jump into a section opens that section instead of the first, on a tab not yet drawn or drawn only by default", () => {
    openSection("ollama", IDS, "reply");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, false, true]);
    closeAllFoldedSections();
    expect(isSectionOpen("ollama", IDS, "where")).toBe(true);
    openSection("ollama", IDS, "kb");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, true, false]);
  });

  it("once the person has opened or closed anything, a jump adds to what they have", () => {
    toggleSection("ollama", IDS, "reply");
    openSection("ollama", IDS, "kb");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([true, true, true]);
  });

  it("opening a section opens it once, leaves the others as they are, and tells the listeners only when something changed", () => {
    const heard = vi.fn();
    subscribeFoldedTabs(heard);
    openSection("ollama", IDS, "kb");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, true, false]);
    expect(heard).toHaveBeenCalledTimes(1);
    openSection("ollama", IDS, "kb");
    expect(isSectionOpen("ollama", IDS, "kb")).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(isSectionOpen("settings", IDS, "kb")).toBe(false);
  });

  it("toggling one section leaves the others as they are; several can be open", () => {
    toggleSection("ollama", IDS, "reply");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([true, false, true]);
    toggleSection("ollama", IDS, "where");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, false, true]);
    toggleSection("ollama", IDS, "reply");
    expect(IDS.map((id) => isSectionOpen("ollama", IDS, id))).toEqual([false, false, false]);
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

describe("the walk's exact set (setOpenSections, plan 105 'Open sections as you walk')", () => {
  it("opens exactly the sections given, and the tab no longer stands at its start: a Search jump then adds to them", () => {
    expect(setOpenSections("ollama", IDS, new Set(["kb", "reply"]))).toBe(true);
    expect(IDS.filter((id) => isSectionOpen("ollama", IDS, id))).toEqual(["kb", "reply"]);
    openSection("ollama", IDS, "where");
    expect(IDS.filter((id) => isSectionOpen("ollama", IDS, id))).toEqual(["where", "kb", "reply"]);
  });

  it("announces nothing and redraws nothing when those are already the open ones, but still marks the tab as walked", () => {
    const heard = vi.fn();
    const stop = subscribeFoldedTabs(heard);
    const before = foldedTabsVersion();
    /* The start-of-tab default is the first section alone; the same set again changes nothing. */
    expect(setOpenSections("ollama", IDS, new Set(["where"]))).toBe(false);
    expect(heard).not.toHaveBeenCalled();
    expect(foldedTabsVersion()).toBe(before);
    /* No longer standing: a Search jump now adds its section instead of replacing the first one. */
    openSection("ollama", IDS, "reply");
    expect(IDS.filter((id) => isSectionOpen("ollama", IDS, id))).toEqual(["where", "reply"]);
    stop();
  });
});
