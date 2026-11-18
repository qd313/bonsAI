/**
 * Title: Which folded sections are open, kept outside the tab
 *
 * Purpose: A small memory, outside React, of which sections of a folded tab are open, which
 * section the ring was last in, and whether it reached the Open all button from the tab's end. A folded tab (plan 91 § 2b) shows each section as one line; A opens
 * or closes it, several can be open at once, and the floating Open all button opens or closes them
 * all and then hands the ring back to the section line it came from.
 *
 * Used for: FoldedSection (open or closed), FoldAllButton (open all, close all, the way back),
 * useHelpStrip (which section the ring last landed in), on the Ollama tab now and the Settings and
 * Developer tabs next, bonsaiSettingJump.ts (opening the section a Search result points into), and
 * autoFold.ts (the sections the walk keeps open while "Open sections as you walk" is on).
 *
 * Solves: Closing a Decky popup rebuilds the whole tab behind it (docs/lessons-learned.md § 3). A flag
 * kept inside a component would fold every section shut each time the AI models box, the thinking
 * notice or a knowledge-base question closed, and the ring could not come back to the button it left.
 * Kept here, the open set and the way back outlive any rebuild.
 *
 * Does not: Save anything to disk. The open set lasts while the plugin stays loaded, and a person
 * switching tabs puts it back to the start (the maintainer's call of 2026-10-12, replacing plan 92 § 14,
 * call 3); a new session starts the same way. Does not move the ring.
 *
 * Gotchas: A tab's first visit, and every return to it after a tab switch, has its first section open and
 * the rest shut (plan 105, lane C1; the first section is the first of the list the tab asks with, so on the
 * Developer tab it is the first one on screen). That state is written the first time the tab asks. A jump from
 * the Search tab (openSection) opens its own section in place of that default, not beside it.
 */

interface TabFold {
  open: Set<string>;
  /** True while `open` is only the start-of-tab default; the person has not opened or closed anything yet. */
  standing: boolean;
}

const tabs = new Map<string, TabFold>();
/** Per tab, the section the ring last landed in (its line or a control inside it). */
const lastSections = new Map<string, string>();
/** Per tab, true when the ring last reached the Open all button Down from the tab's end, false when Right from a line. */
const foldAllFromEnd = new Map<string, boolean>();
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version += 1;
  for (const l of Array.from(listeners)) l();
}

/** The tab's state, made with the start-of-tab default (its first section open, the rest shut) when it has none yet. */
function tabFold(tab: string, sections: readonly string[]): TabFold {
  let fold = tabs.get(tab);
  if (!fold) {
    fold = { open: new Set(sections.slice(0, 1)), standing: true };
    tabs.set(tab, fold);
  }
  return fold;
}

export function isSectionOpen(tab: string, sections: readonly string[], section: string): boolean {
  return tabFold(tab, sections).open.has(section);
}

/** Open a closed section or close an open one; the others stay as they are. */
export function toggleSection(tab: string, sections: readonly string[], section: string): void {
  const fold = tabFold(tab, sections);
  fold.standing = false;
  if (fold.open.has(section)) fold.open.delete(section);
  else fold.open.add(section);
  changed();
}

/**
 * Open a section and leave it open if it already is (the Search tab's jump to a setting). Where the person has not
 * opened or closed anything since the tab started over, the jump's section is the one open, in place of the first
 * section; after that, the others stay as they are.
 */
export function openSection(tab: string, _sections: readonly string[], section: string): void {
  const fold = tabs.get(tab);
  if (!fold || fold.standing) {
    tabs.set(tab, { open: new Set([section]), standing: false });
    changed();
    return;
  }
  if (fold.open.has(section)) return;
  fold.open.add(section);
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
  fold.standing = false;
  changed();
}

/**
 * Exactly the sections in `open` open, the rest shut: the walk's rule (autoFold.ts, "Open sections as you walk").
 * The tab no longer stands at its start. When those are already the open ones, nothing is announced and nothing
 * redraws; returns whether anything changed.
 */
export function setOpenSections(tab: string, sections: readonly string[], open: ReadonlySet<string>): boolean {
  const fold = tabFold(tab, sections);
  fold.standing = false;
  if (fold.open.size === open.size && Array.from(open).every((s) => fold.open.has(s))) return false;
  fold.open = new Set(open);
  changed();
  return true;
}

/**
 * A person switched tabs (the bar, LB or RB, Y): every folded tab starts over, so it opens with its first section
 * open the next time it is drawn, whatever was open when they left; and the section to return to is forgotten.
 * The one caller is the plugin shell, which alone knows a switch from a popup closing and the tab being rebuilt;
 * a rebuilt tab never comes through here.
 */
export function closeAllFoldedSections(): void {
  tabs.clear();
  lastSections.clear();
  foldAllFromEnd.clear();
  changed();
}

let presses = 0;

/**
 * A person pressed something on a section line (Down, Up, Right, A). The arrival code (foldedTabArrival) stops
 * putting the ring on the first line once this has changed since the switch: a ring Steam placed on arrival
 * is not the person's, but anything after a press is.
 */
export function notePersonPress(): void {
  presses += 1;
}

/** How many presses have been noted so far. */
export function personPressCount(): number {
  return presses;
}

/** The ring landed in `section` (its line or a control in it). Quiet: nothing on screen depends on it. */
export function rememberFoldSection(tab: string, section: string): void {
  lastSections.set(tab, section);
}

/** The section the ring last landed in, or null before any landing. */
export function foldSectionToReturnTo(tab: string): string | null {
  return lastSections.get(tab) ?? null;
}

/** The ring is going onto the Open all button: Down from the tab's end (`fromEnd`), or Right from a line. Quiet. */
export function noteFoldAllArrival(tab: string, fromEnd: boolean): void {
  foldAllFromEnd.set(tab, fromEnd);
}

/** True when the ring last reached the Open all button Down from the tab's end (Up then goes back into that section). */
export function foldAllCameFromEnd(tab: string): boolean {
  return foldAllFromEnd.get(tab) === true;
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
  foldAllFromEnd.clear();
  changed();
}
