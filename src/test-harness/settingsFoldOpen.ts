/**
 * Title: Test helper: the Settings tab's sections, all open or all closed
 * Purpose: The Settings tab folds (plan 91 § 2b, plan 92 T1), and a section's rows are drawn only while it is
 *          open. A test about a row opens the sections first, through the store's own functions, rather than
 *          relying on whatever the store's first-visit default is.
 * Used for: the Settings tab's tests under src/components.
 * Does not: Render anything or assert anything.
 */
import { resetFoldedTabsForTests, setAllSections } from "../features/folded-tabs/foldedTabsStore";
import { SETTINGS_FOLD_TAB, SETTINGS_SECTIONS } from "../features/folded-tabs/settingsTabFolds";

const ALL_IDS = SETTINGS_SECTIONS.map((s) => s.id);

/** Every Settings section open (the store is reset first, so a test starts from nothing carried over). */
export function openAllSettingsSections(): void {
  resetFoldedTabsForTests();
  setAllSections(SETTINGS_FOLD_TAB, ALL_IDS, true);
}

/** Every Settings section closed, set explicitly. */
export function closeAllSettingsSections(): void {
  resetFoldedTabsForTests();
  setAllSections(SETTINGS_FOLD_TAB, ALL_IDS, false);
}
