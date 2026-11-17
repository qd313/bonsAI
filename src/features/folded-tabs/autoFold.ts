/**
 * Title: Sections that open and close as the D-pad walks through them ("Open sections as you walk")
 *
 * Purpose: The Developer switch the maintainer asked for on 2026-11-11 (plan 105, lane C2). While it is on, every
 * landing of the ring in a folded tab decides which sections are open, from where the ring is alone. Walking Down,
 * when the ring reaches the last setting of a section the next section opens too (two open at once); on that
 * section's line and its first setting both stay open; its second setting closes the one left. Walking Up is the
 * mirror. Put as one rule: for the boundary between a section and the one below it, both stay open while the ring
 * is on the upper one's last setting, the lower one's line, or the lower one's first setting; anywhere else only
 * the ring's own section stays open.
 *
 * Used for: useHelpStrip.ts, whose landing watcher calls `foldOnLanding` at every D-pad landing in a folded tab's
 * body; FoldedSection.tsx, which hands each tab's chain in (`rememberFoldChain`) and, after each redraw, lets the
 * ringed control be put back where it was (`applyHeldFoldStop`).
 *
 * Solves: Where the ring is inside a section. The moves between two settings of one section are Steam's own step
 * along the tab's column and pass through no handler of ours, so only the landing can tell. "First setting" and
 * "last setting" are the controls the tab's own chain enters a section on from its line and from the line below
 * (`firstStop` and `lastStop`, the same controls the D-pad lands on), and anything on the same line as one of them
 * (a row of buttons side by side, Update and Remove) counts as that setting, so Left and Right change nothing.
 * Opening or closing a section above the ring would move the ringed control on screen; the landing holds it
 * (holdTabBodyStop in useTabBodyFocusScroll.ts) and puts it back once the change is drawn.
 *
 * Does not: Act on a tap (only the D-pad walks), when the switch is off, or on a landing outside the body (the Open
 * all button, the tab bar). Does not open a section from its own line while another stays open: a section the person
 * closed stays closed as the ring passes it, until the walk reaches the last setting of the section above. Never
 * leaves every section shut (a line that would opens its own). Does not move the ring, and never closes the ring's
 * own section.
 *
 * Gotchas: With the switch on, Open all opens every section only until the ring lands in the list again; then the
 * rule folds them back (the session's call, plan 105 consult 3). Up from the Open all button lands on a section's
 * line, not its last setting, so the line of an open section opens the one above as its first setting does; without
 * that, the walk back up from the button found every section above shut and went line to line (found by the walk
 * test, autoFold.walk.test.tsx).
 */
import { holdTabBodyStop } from "../../shared/dpad/useTabBodyFocusScroll";
import { peekOpenSectionsAsYouWalk } from "../settings/openSectionsAsYouWalkSignal";
import { foldedTabsVersion, isSectionOpen, setOpenSections } from "./foldedTabsStore";

/** Where the ring landed inside section `section`: its line, or a setting that may be its first and/or its last. */
export interface WalkPlace {
  section: string;
  line: boolean;
  first: boolean;
  last: boolean;
}

/**
 * The sections open after a landing at `place`, given the tab's sections in order and the ones open now. A first
 * setting opens the section above, a last setting the one below; the line of an open section opens the one above too
 * (both are open there, as on its first setting, and it is where Up from the Open all button lands); a line never
 * opens its own section, so a section the person closed stays closed. The ring's own section, and the neighbour
 * across the boundary it is next to, are kept if open; every other section closes.
 */
export function sectionsOpenAfterLanding(order: readonly string[], open: ReadonlySet<string>, place: WalkPlace): Set<string> {
  const at = order.indexOf(place.section);
  if (at < 0) return new Set(open);
  const above = order[at - 1];
  const below = order[at + 1];
  const keep = new Set([place.section]);
  const opens = new Set<string>();
  if (above && (place.line || place.first)) keep.add(above);
  if (above && (place.first || (place.line && open.has(place.section)))) opens.add(above);
  if (below && place.last) {
    keep.add(below);
    opens.add(below);
  }
  const after = new Set([...Array.from(open).filter((s) => keep.has(s)), ...opens]);
  /*
   * Never every section shut: from there no landing could open anything again. A line landing that would leave none
   * open opens its own section (on the Deck, Steam's first landing on a tab could be its last line, or a line it went
   * back to from the tab bar, and the walk then found every section shut and opened nothing, plan 105 block D3a).
   */
  if (after.size === 0) after.add(place.section);
  return after;
}

/** Each folded tab's chain, as its sections hand it in. */
/**
 * What the rule needs of one section of a tab's chain: its id and the finders for its first and last settings. A
 * FoldChainSection (FoldedSection.tsx) is one; named here so this file does not import FoldedSection, which imports it.
 */
interface WalkSection {
  id: string;
  firstStop?: () => HTMLElement | null;
  lastStop?: () => HTMLElement | null;
}

const chains = new Map<string, readonly WalkSection[]>();

/** Tab `tab`'s sections, in order, with their first and last settings; returns the removal (which leaves a newer chain alone). */
export function rememberFoldChain(tab: string, chain: readonly WalkSection[]): () => void {
  chains.set(tab, chain);
  return () => {
    if (chains.get(tab) === chain) chains.delete(tab);
  };
}

/**
 * True when `target` is the setting `stop` or on its line: one holds the other, or each one's vertical middle lies
 * inside the other's box (Remove, 313 to 325, beside Update, 297 to 341, on the Deck).
 */
function onSameLine(target: HTMLElement, stop: HTMLElement | null | undefined): boolean {
  if (!stop) return false;
  if (stop === target || stop.contains(target) || target.contains(stop)) return true;
  const a = target.getBoundingClientRect();
  const b = stop.getBoundingClientRect();
  if (a.height <= 0 || b.height <= 0) return false;
  const middle = (r: DOMRect) => (r.top + r.bottom) / 2;
  return (middle(a) >= b.top && middle(a) <= b.bottom) || (middle(b) >= a.top && middle(b) <= a.bottom);
}

/** The control the ring is on, held across the redraw the last change asks for, and the store version it waits for. */
let held: { tab: string; version: number; putBack: () => void } | null = null;

/**
 * A D-pad landing on `target` in section `section` of tab `tab` (useHelpStrip's watcher). With the switch on, open
 * and close sections by the rule; when that changes anything, hold the ringed control so the redraw does not move it.
 */
export function foldOnLanding(tab: string, target: HTMLElement, section: string): void {
  if (!peekOpenSectionsAsYouWalk()) return;
  const chain = chains.get(tab);
  const entry = chain?.find((s) => s.id === section);
  if (!chain || !entry) return;
  const order = chain.map((s) => s.id);
  const line = Boolean(target.closest("[data-bonsai-fold-line]"));
  const place: WalkPlace = {
    section,
    line,
    first: !line && onSameLine(target, entry.firstStop?.()),
    last: !line && onSameLine(target, entry.lastStop?.()),
  };
  const now = new Set(order.filter((id) => isSectionOpen(tab, order, id)));
  const next = sectionsOpenAfterLanding(order, now, place);
  /*
   * Held before the change, as the redraw it causes may run inside setOpenSections itself. A landing that changes
   * nothing leaves an earlier hold alone: one landing can reach here twice (a hop the plan leaves alone is planned
   * again by its own focus event) before the redraw of its change, and that hold must survive.
   */
  const unchanged = now.size === next.size && Array.from(next).every((s) => now.has(s));
  if (!unchanged) held = { tab, version: foldedTabsVersion() + 1, putBack: holdTabBodyStop(target) };
  /* Unchanged, the store announces nothing and nothing redraws; it only notes the tab no longer stands at its start. */
  setOpenSections(tab, order, next);
}

/**
 * After a folded tab of `tab` redraws (FoldedSection's layout effect): if the redraw is the one the last landing's
 * change asked for, put the ringed control back where it was on screen, once. A later change (A on a line, Open all)
 * means the held place no longer applies, and it is dropped.
 */
export function applyHeldFoldStop(tab: string): void {
  if (!held || held.tab !== tab) return;
  const { version, putBack } = held;
  held = null;
  if (foldedTabsVersion() === version) putBack();
}

/** Test seam: no chains, nothing held. */
export function resetAutoFoldForTests(): void {
  chains.clear();
  held = null;
}
