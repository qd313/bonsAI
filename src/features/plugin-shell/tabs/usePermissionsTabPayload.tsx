/**
 * Title: What draws the Permissions tab
 *
 * Purpose: Runs while a person has the Permissions tab open, where they
 * turn each thing the plugin is allowed to do on the Deck on or off.
 *
 * Used for: The tab bar's always-present Permissions tab.
 *
 * Solves: Nothing beyond keeping this tab's own wiring the same simple
 * shape as every other tab's.
 *
 * Does not: Own or save the permission choices themselves — those come
 * from elsewhere in the plugin and are only passed through here.
 */
import React, { useMemo } from "react";

import { PermissionsTab } from "../../../components/PermissionsTab";

export type UsePermissionsTabPayloadArgs = React.ComponentProps<typeof PermissionsTab>;

/**
 * In: the current permission choices and their setter, plus where to
 * return to if this tab was reached by jumping from a denied permission.
 * Out: the finished Permissions tab element, rebuilt only when one of
 * those values changes.
 * Can go wrong: nothing — this only wires values into the tab component.
 */
export function usePermissionsTabPayload({
  capabilities,
  setCapabilities,
  permissionJumpReturnTab,
  onReturnFromPermissionJump,
  kidsLockActive,
}: UsePermissionsTabPayloadArgs): React.ReactElement {
  return useMemo(
    () => (
      <PermissionsTab
        capabilities={capabilities}
        setCapabilities={setCapabilities}
        permissionJumpReturnTab={permissionJumpReturnTab}
        onReturnFromPermissionJump={onReturnFromPermissionJump}
        kidsLockActive={kidsLockActive}
      />
    ),
    [
      capabilities,
      setCapabilities,
      permissionJumpReturnTab,
      onReturnFromPermissionJump,
      kidsLockActive,
    ],
  );
}
