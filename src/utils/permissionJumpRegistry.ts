/**
 * Title: Remembering a jump to the Permissions tab, and finishing it
 *
 * Purpose: When a denied permission shows a "go fix this" link — for example from a chat message
 * explaining that a permission is off — pressing it needs to remember two things across the tab
 * switch that follows: which tab to come back to, and which row on the Permissions tab the
 * controller's highlight should land on once it gets there. This file remembers both, and moves
 * the highlight once the Permissions tab has actually rendered that row.
 *
 * Used for: `usePermissionJump`, and the Permissions tab's own focus restore once it mounts
 * after a jump.
 *
 * Solves: without a shared place to remember "go here, then land there", the target row and the
 * tab to come back to would have to be threaded through props across a tab switch, which the
 * rest of the tab-switching code was not built to carry.
 *
 * Does not: switch tabs itself — `useBonsaiPluginShell` (or `index.tsx`) call `setCurrentTab`.
 * This file only remembers where the jump is going and finishes its last step.
 *
 * Gotchas:
 *   - Landing the highlight on the right Permissions row uses the same `navFocusRegistry.ts`
 *     trick used elsewhere on this screen for moving between separate areas (see that file for
 *     why a plain `.focus()` does not do this) — the target row registers itself there, and this
 *     file's `restorePermissionJumpFocusWithRetry()` takes the ring three times over the following
 *     third of a second — in case the row has not registered yet the instant the tab renders, and
 *     because the tab's own first button takes the ring back about 22ms after the first claim
 *     (timed on the Deck 2026-09-23).
 *   - The earlier version of that retry step (`focusOwnerById`) reported success the moment any
 *     element under the target row was found, whether or not the controller's highlight had
 *     actually moved there — and it kept trying further elements even after one attempt had
 *     already "succeeded". Because that always reported success on the very first try, the
 *     retries described above never actually got a second attempt in practice. Measured on
 *     device 2026-09-05 (build 4/517804a): the highlight landed on the "Back to Main" button
 *     instead of the row that was supposed to be armed.
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
 * Focus the armed Permissions row once mounted, at every one of `delaysMs`, and report once the
 * schedule has run out: whether any attempt claimed the ring, and how many attempts ran. Consumes
 * the pending focus target at the end either way.
 *
 * Every attempt runs, including after one succeeds. A claim does not stay claimed: timed on the
 * Deck 2026-09-23 (plan 64, PERM-JUMP-01), the 0ms attempt put the ring on the armed switch and the
 * tab's own first button, "Back to Main", took it about 22ms later — and the schedule, which
 * stopped at the first success, never took it back. Re-taking a ring the row already holds changes
 * nothing, so the later attempts cost nothing when the first one stuck. The one thing they could
 * undo is a person's own press inside the first third of a second on a tab they have only just
 * seen, which is not a real case. A row's nav node can also lag a frame or two behind its DOM
 * mount (Steam populates `navRef.current` on its own timeline), which the later delays cover too.
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
  let claimedOnce = false;
  const attempt = () => {
    if (pendingFocusTarget !== id) return;
    claimedOnce = focusOwnerById(id) || claimedOnce;
    index += 1;
    if (index >= delaysMs.length) {
      pendingFocusTarget = null;
      onResult?.(claimedOnce, index);
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
