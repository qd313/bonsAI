/**
 * Title: Which folded sections are open, kept outside the tab
 *
 * Purpose: A small memory, outside React, of which sections of a folded tab are open, and which
 * section the ring was last in. A folded tab (plan 91 § 2b) shows each section as one line; A opens
 * or closes it, several can be open at once, and the floating Open all button opens or closes them
 * all and then hands the ring back to the section line it came from.
 *
 * Used for: FoldedSection (open or closed), FoldAllButton (open all, close all, the way back),
 * useHelpStrip (which section the ring last landed in), on the Ollama tab now and the Settings and
 * Developer tabs next.
 *
 * Solves: Closing a Decky popup rebuilds the whole tab behind it (docs/lessons-learned.md § 3). A flag
 * kept inside a component would fold every section shut each time the AI models box, the thinking
 * notice or a knowledge-base question closed, and the ring could not come back to the button it left.
 * Kept here, the open set and the way back outlive any rebuild.
 *
 * Does not: Save anything to disk. The open set lasts while the plugin stays loaded, and a person
 * switching tabs closes it again (the maintainer's call of 2026-10-12, replacing plan 92 § 14, call 3);
 * a new session starts with every section closed. Does not move the ring.
 *
 * Gotchas: A tab's first visit has every section closed; that state is written the first time the tab
 * asks.
 */

interface TabFold {
  open: Set<string>;
}

const tabs = new Map<string, TabFold>();
/** Per tab, the section the ring last landed in (its line or a control inside it). */
const lastSections = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version += 1;
  for (const l of Array.from(listeners)) l();
}

/** The tab's state, made with the first-visit default (every section closed) when it has none yet. */
function tabFold(tab: string, _sections: readonly string[]): TabFold {
  let fold = tabs.get(tab);
  if (!fold) {
    fold = { open: new Set() };
    tabs.set(tab, fold);
  }
  return fold;
}

export function isSectionOpen(tab: string, sections: readonly string[], section: string): boolean {
  return tabFold(tab, sections).open.has(section);
}

/** Open a closed section or close an open one; the others stay as they are. */
export function toggleSection(tab: string, sections: readonly string[], section: string): void {
  const { open } = tabFold(tab, sections);
  if (open.has(section)) open.delete(section);
  else open.add(section);
  changed();
}

export function allSectionsOpen(tab: string, sections: readonly string[]): boolean {
  const { open } = tabFold(tab, sections);
  return sections.every((s) => open.has(s));
}

/** Open every section, or close every one. */
export function setAllSections(tab: string, sections: readonly string[], openAll: boolean): void {
  const fold = tabFold(tab, sections);
  fold.open = new Set(openAll ? sections : []);
  changed();
}

/** The ring landed in `section` (its line or a control in it). Quiet: nothing on screen depends on it. */
export function rememberFoldSection(tab: string, section: string): void {
  lastSections.set(tab, section);
}

/** The section the ring last landed in, or null before any landing. */
export function foldSectionToReturnTo(tab: string): string | null {
  return lastSections.get(tab) ?? null;
}

export function subscribeFoldedTabs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Changes on every open or close: a snapshot for useSyncExternalStore. */
export function foldedTabsVersion(): number {
  return version;
}

/** Test seam: every tab back to its first visit. */
export function resetFoldedTabsForTests(): void {
  tabs.clear();
  lastSections.clear();
  changed();
}
