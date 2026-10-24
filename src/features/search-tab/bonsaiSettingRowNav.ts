/**
 * Title: The nav node of a bonsAI setting's row, for the Search tab's jump
 *
 * Purpose: One module-level holder per setting row (by the row id in bonsaiSettingsIndex.ts). A row that can take
 * Steam's ring from outside its tab hands its holder to its `Focusable` as `navRef`; Steam fills it in when the row
 * mounts and empties it when the row goes, and bonsaiSettingJump.ts hands the ring to it by Steam's own transfer.
 *
 * Used for: SettingsTabChatTextSizeRow.tsx, VoiceInputSettingsSection.tsx and SettingsTabDataSection.tsx (one line
 * each, the `navRef`), and bonsaiSettingJump.ts (the ring).
 *
 * Solves: Lets a row say "the Search tab may put the ring here" in one line, with nothing to register or clean up
 * (the Back line's pattern, searchJumpStore.ts's `searchBackNav`), and keeps the jump's own imports out of the tabs.
 *
 * Does not: Move the ring, or know which tab or section the row is in (the index does).
 */
import type { NavRefHolder } from "../../shared/dpad/navFocusRegistry";

const rowNavs = new Map<string, NavRefHolder>();

/**
 * The nav node of a row by its id in the index: the holder the row gives its `Focusable` as `navRef`. Made on
 * first ask and kept for good, so asking twice for the same row hands back the same holder.
 */
export function bonsaiSettingRowNav(row: string): NavRefHolder {
  let holder = rowNavs.get(row);
  if (!holder) {
    holder = { current: null };
    rowNavs.set(row, holder);
  }
  return holder;
}

/** Every holder emptied; for the tests. */
export function clearBonsaiSettingRowNavs(): void {
  rowNavs.forEach((h) => {
    h.current = null;
  });
}
