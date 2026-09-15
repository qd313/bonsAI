/**
 * Title: Jumping straight to the permission that was just denied
 *
 * Purpose: When something is blocked because a permission is off, this is
 * what takes the person straight to the matching switch on the Permissions
 * tab — instead of just dropping them on that tab and leaving them to find
 * the right row themselves — and remembers which tab to bring them back to
 * afterward.
 *
 * Used for: index.tsx, everywhere a denied permission needs to send the
 * person to turn it on.
 *
 * Solves: Two things that have to work together without interfering with
 * each other: remembering which tab to return to, and putting the focus
 * ring on the right switch once the Permissions tab is showing — both
 * while the tab bar's own after-popup-close protections are still in
 * effect.
 *
 * Does not: Draw the "this needs a permission" message itself — see
 * PermissionDenyAction and wherever each individual feature wires this
 * hook in.
 */
import { useCallback, useState } from "react";

import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { resolvePermissionFocusTarget } from "../utils/permissionDeepLink";
import { armPermissionJump, consumePermissionJumpReturnTab } from "../utils/permissionJumpRegistry";

export type UsePermissionJumpArgs = {
  currentTab: string;
  setCurrentTab: (tabId: string) => void;
};

export function usePermissionJump({ currentTab, setCurrentTab }: UsePermissionJumpArgs) {
  const [permissionJumpReturnTab, setPermissionJumpReturnTab] = useState<string | null>(null);

  const jumpToPermission = useCallback(
    (capability: BonsaiCapabilityKey) => {
      const focusTarget = resolvePermissionFocusTarget(capability);
      armPermissionJump(currentTab, focusTarget);
      setPermissionJumpReturnTab(currentTab);
      setCurrentTab("permissions");
    },
    [currentTab, setCurrentTab],
  );

  const returnFromPermissionJump = useCallback(() => {
    const back = consumePermissionJumpReturnTab();
    setPermissionJumpReturnTab(null);
    if (back) setCurrentTab(back);
  }, [setCurrentTab]);

  return {
    jumpToPermission,
    returnFromPermissionJump,
    permissionJumpReturnTab,
  };
}
