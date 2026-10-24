/**
 * Title: A on one of bonsAI's own settings in the Search tab: the jump there, and B back
 *
 * Purpose: What happens when the person presses A on a row of the "bonsAI settings" group (plan 96, lane N2):
 * the tab the setting lives on is shown (the shell's own tab switch), the folded section it sits in is opened,
 * and Steam's ring goes onto the setting's row, or onto its section's line when the row cannot take the ring.
 * B from there (useSearchShortcut.ts) comes back to the Search tab with the same word, game and match, the way
 * the Back line over a chat does. A Permissions entry arms the existing permission jump instead, which lands the
 * ring on the switch when the tab is drawn, with the Search tab as the tab to come back to.
 *
 * Used for: SearchTab.tsx (A on a row) and useSearchShortcut.ts (B, and the end of the jump).
 *
 * Solves: Nothing opened a given section and landed the ring on a given row: the only jump into one of
 * bonsAI's own rows was the permission jump. This is the same shape (remember where we are going, switch, then
 * take the ring once the tab has drawn, retried because Steam moves it as the tab settles), kept as a sibling
 * rather than folded into the permission registry so the permission jump's tests and device checks stay as
 * they were.
 *
 * Does not: Search, or draw anything. Does not move the ring across containers any other way than Steam's own
 * transfer onto a registered nav node (`takeHolderFocus`, `takeFoldLine`): no page search, no plain `focus()`.
 *
 * Gotchas:
 *   - The shell's tab switch closes every folded section, so the section is opened after the switch, never before.
 *   - A closed section does not draw its rows, so the row's nav node is not there until the section is open and
 *     drawn; the ring is tried at 100, 220, 420 and 700 ms after the press. The row is tried every time (so a
 *     claim Steam undid is made again); the section's line is the fallback, from the third try on, only when the
 *     row has never taken the ring. The first look comes after 100 ms because the shell's own arrival code puts
 *     the page back at its top at 0, 16 and 80 ms, which would undo the scroll a landing makes.
 *   - A row's nav node is a module-level holder (bonsaiSettingRowNav.ts), the Back line's pattern: the row hands
 *     it to its `Focusable` as `navRef`, Steam fills it in on mount and empties it on unmount, so there is
 *     nothing to register or unregister.
 */
import { takeHolderFocus } from "../../shared/dpad/chatTranscriptNavHelpers";
import { openSection } from "../folded-tabs/foldedTabsStore";
import { takeFoldLine } from "../folded-tabs/FoldedSection";
import type { PermissionFocusTargetId } from "../permissions/permissionDeepLink";
import { armPermissionJump, consumePermissionJumpReturnTab } from "../permissions/permissionJumpRegistry";
import { bonsaiSectionIds, type BonsaiSettingEntry } from "./bonsaiSettingsIndex";
import { bonsaiSettingRowNav, clearBonsaiSettingRowNavs } from "./bonsaiSettingRowNav";
import { hasTabSwitch, returnToSearchTab, switchToTab } from "./searchJumpStore";

/** What the Search tab was showing when the row was pressed, so the way back finds the same place. */
export type BonsaiSettingJumpContext = { word: string; game: string | null; matchKey: string };

/** The waits, in ms after the press, at which the ring is tried: the first after the shell's page-to-top looks (80 ms). */
const RING_TRIES_MS = [100, 220, 420, 700];
/** From this try on (the third), a row that has never taken the ring is given up on and the section's line takes it. */
const LINE_FROM_TRY = 2;

type LiveJump = { entry: BonsaiSettingEntry; context: BonsaiSettingJumpContext };

let live: LiveJump | null = null;
let timers: number[] = [];

function cancelRingTries(): void {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
}

/** Try the ring now and at each later wait, for `jump`; a jump that has ended or been replaced stops trying. */
function scheduleRing(jump: LiveJump): void {
  cancelRingTries();
  const { entry } = jump;
  const holder = bonsaiSettingRowNav(entry.row);
  let claimed = false;
  RING_TRIES_MS.forEach((ms, i) => {
    timers.push(
      window.setTimeout(() => {
        if (live !== jump) return;
        if (takeHolderFocus(holder)) claimed = true;
        else if (!claimed && i >= LINE_FROM_TRY && entry.section) takeFoldLine(entry.tab, entry.section);
      }, ms),
    );
  });
}

/** The jump that is live (the setting's tab and the match that started it), or null. */
export function liveBonsaiSettingJump(): { tab: string; matchKey: string } | null {
  return live ? { tab: live.entry.tab, matchKey: live.context.matchKey } : null;
}

/** The jump is over (B, or the person went to another tab): stop trying the ring and forget it. */
export function endBonsaiSettingJump(): void {
  if (!live) return;
  const wasPermission = live.entry.tab === "permissions";
  live = null;
  cancelRingTries();
  if (wasPermission) consumePermissionJumpReturnTab();
}

/**
 * A on a bonsAI setting: show its tab, open its section, take the ring. False when the plugin root has not
 * handed in the tab switch (nothing is armed then). A jump already live is replaced.
 */
export function startBonsaiSettingJump(entry: BonsaiSettingEntry, context: BonsaiSettingJumpContext): boolean {
  if (!hasTabSwitch()) return false;
  endBonsaiSettingJump();
  const jump: LiveJump = { entry, context };
  live = jump;
  if (entry.tab === "permissions") {
    /* The Permissions tab lands the ring itself when it draws (PermissionsTab's mount effect), from what is armed here. */
    armPermissionJump("search", entry.row as PermissionFocusTargetId);
  }
  switchToTab(entry.tab);
  if (entry.tab !== "permissions") {
    if (entry.section) openSection(entry.tab, bonsaiSectionIds(entry.tab), entry.section);
    scheduleRing(jump);
  }
  return true;
}

/** B from the setting's tab: end the jump and go back to the Search tab, on the same word, game and match. False when no jump is live. */
export function backFromBonsaiSettingJump(): boolean {
  const jump = live;
  if (!jump) return false;
  endBonsaiSettingJump();
  return returnToSearchTab(jump.context);
}

/** Back to a fresh state, and the row holders emptied; for the tests. */
export function resetBonsaiSettingJump(): void {
  live = null;
  cancelRingTries();
  clearBonsaiSettingRowNavs();
}
