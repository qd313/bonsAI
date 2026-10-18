/**
 * Title: A on one of bonsAI's own settings in the Search tab
 *
 * Purpose: What the Search tab does when the person presses A on a row from the "bonsAI settings" group (plan 96,
 * lane N2): switch to the tab the setting lives on, with the shell's own tab switch.
 *
 * Used for: SearchTab.tsx, for the bonsAI settings group's rows.
 *
 * Solves: Keeps "go to this setting" in one place, so a result row only says "jump here".
 *
 * Does not: Open the section or move the ring yet (the next step), or search for anything (bonsaiSettingsIndex.ts).
 */
import type { BonsaiSettingEntry } from "./bonsaiSettingsIndex";
import { switchToTab } from "./searchJumpStore";

/** What the Search tab was showing when the row was pressed, so the way back finds the same place. */
export type BonsaiSettingJumpContext = { word: string; game: string | null; matchKey: string };

/** A on a bonsAI setting: go to its tab. False when the plugin root has not handed the tab switch in. */
export function startBonsaiSettingJump(entry: BonsaiSettingEntry, _context: BonsaiSettingJumpContext): boolean {
  return switchToTab(entry.tab);
}
