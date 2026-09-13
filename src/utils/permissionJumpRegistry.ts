/**
 * Title: Permission jump registry
 * Purpose: Remember return tab and pending Permissions focus target across tab switches.
 * Used for: usePermissionJump and PermissionsTab focus restore after a deny-site jump.
 * Solves: Return-tab story and focus targeting without global document queries.
 * Does not: Own tab routing — useBonsaiPluginShell / index.tsx call setCurrentTab.
 */
import type { PermissionFocusTargetId } from "./permissionDeepLink";
import {
  registerNavFocus,
  unregisterNavFocus,
  takeNavFocus,
  type NavFocusId,
  type NavRefHolder,
} from "./navFocusRegistry";

let pendingReturnTab: string | null = null;
let pendingFocusTarget: PermissionFocusTargetId | null = null;

/**
 * Each Permissions row's own registered Steam nav node id (navFocusRegistry.ts). One per capability
 * rather than a single shared id, matching the chat permission-hint rows: two rows could in
 * principle both be candidates in a wider registry, and a per-row id means a row's own registration
 * can never clobber a different row's.
 */
function permissionRowNavFocusId(id: PermissionFocusTargetId): NavFocusId {
  switch (id) {
    case "game_context_read":
      return "permissions-row-game-context-read";
    case "filesystem_write":
      return "permissions-row-filesystem-write";
    case "steam_web_api":
      return "permissions-row-steam-web-api";
    case "microphone_access":
      return "permissions-row-microphone-access";
  }
}

/**
 * Called from PermissionsTab's own `PermissionToggleHost` on mount/unmount — the `navRef` prop on
 * that row's wrapping Focusable. Replaces a plain element ref (`registerPermissionFocusOwner`,
 * removed 2026-09-05): focus jumped here from a different tab, a different navigation container
 * from Steam's point of view, and a DOM `.focus()` on a registered element does not carry Steam's
 * gamepad ring across that boundary — the same failure `chat-perm-hint-*` and
 * `session-context-strip` exist to work around. Measured on device 2026-09-05 (build 4/517804a,
 * PERM-JUMP-01 step 3): the ring landed on "Back to Main" instead of the armed toggle.
 */
export function registerPermissionRowNavFocus(id: PermissionFocusTargetId, holder: NavRefHolder): void {
  registerNavFocus(permissionRowNavFocusId(id), holder);
}

/** Cleanup half of the above. Identity-checked — see `unregisterNavFocus`. */
export function unregisterPermissionRowNavFocus(
  id: PermissionFocusTargetId,
  holder: NavRefHolder
): void {
  unregisterNavFocus(permissionRowNavFocusId(id), holder);
}

/** Arm a jump: remember where to return and which Permissions row should receive focus. */
export function armPermissionJump(returnTab: string, focusTarget: PermissionFocusTargetId): void {
  pendingReturnTab = returnTab;
  pendingFocusTarget = focusTarget;
}

export function peekPermissionJumpReturnTab(): string | null {
  return pendingReturnTab;
}

export function peekPermissionJumpFocusTarget(): PermissionFocusTargetId | null {
  return pendingFocusTarget;
}

export function consumePermissionJumpReturnTab(): string | null {
  const tab = pendingReturnTab;
  pendingReturnTab = null;
  return tab;
}

/**
 * Hand Steam's ring to the armed row's registered nav node, and nothing else — no DOM query, no
 * page search, no `.focus()` of any kind. Reports the truth: `takeNavFocus` is false when the row
 * has not registered yet, when Decky has not populated the ref yet, or when Steam itself declines
 * the move, and every one of those is "try again", not "done".
 *
 * Before this, `focusOwnerById` collected every plausible candidate under the registered element
 * (panel, toggle, button, the element itself) and called a plain `.focus()` on each in turn, then
 * `return true` unconditionally regardless of whether any of them actually landed. Two bugs in one:
 * the loop kept "focusing" candidates after the first real success (each subsequent `.focus()` call
 * moving `activeElement` again with no effect on Steam's ring, which was already lost by then), and
 * the unconditional `true` meant `restorePermissionJumpFocusWithRetry` could never learn that the
 * attempt had failed — so a retry that could have worked never ran.
 */
function focusOwnerById(id: PermissionFocusTargetId): boolean {
  return takeNavFocus(permissionRowNavFocusId(id));
}

/**
 * Focus the armed Permissions row once mounted, retrying at `delaysMs` while it is not yet claimed.
 * Consumes the pending focus target either way once an attempt succeeds or the schedule runs out.
 *
 * Retries purely on `focusOwnerById`'s honest result now, rather than stopping at the first attempt
 * once some registered element merely existed — that gate always passed on the very first (0ms)
 * attempt in practice, since React attaches refs before running effects, so with the old
 * unconditional-`true` `focusOwnerById` the schedule below never actually got a second attempt. A
 * row's nav node can still lag a frame or two behind its DOM mount (Steam populates `navRef.current`
 * on its own timeline), which is exactly what the later delays are for.
 */
export function restorePermissionJumpFocusWithRetry(
  onResult?: (claimed: boolean, attempts: number) => void,
  delaysMs: number[] = [0, 120, 320],
): void {
  const id = pendingFocusTarget;
  if (!id) {
    onResult?.(false, 0);
    return;
  }
  let index = 0;
  const attempt = () => {
    if (pendingFocusTarget !== id) return;
    const claimed = focusOwnerById(id);
    index += 1;
    if (claimed || index >= delaysMs.length) {
      pendingFocusTarget = null;
      onResult?.(claimed, index);
      return;
    }
    window.setTimeout(attempt, delaysMs[index]);
  };
  window.setTimeout(attempt, delaysMs[0]);
}

/** Test-only reset. */
export function resetPermissionJumpRegistry(): void {
  pendingReturnTab = null;
  pendingFocusTarget = null;
}
