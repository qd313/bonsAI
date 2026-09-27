/**
 * Title: Permissions row nav registration tests
 * Purpose: Pin that each Permissions capability row registers a Steam nav holder when mounted and
 *          clears it when unmounted.
 * Used for: PermissionsTab.tsx — the mount/unmount half of PERM-JUMP-01 step 3's redo.
 * Solves: The prior PermissionToggleHost handed permissionJumpRegistry a plain element ref, which
 *         focusOwnerById then called a plain `.focus()` on — a cross-container DOM focus that does
 *         not carry Steam's gamepad ring across a tab switch. Measured on device 2026-09-05
 *         (build 4/517804a, PERM-JUMP-01 step 3): the ring landed on "Back to Main" instead of the
 *         armed toggle. The redo registers each row's own Focusable as a Steam nav node instead
 *         (`navRef` + `registerNavFocus`), the same pattern the chat permission-hint rows already
 *         use — this file is the coverage that the registration itself happens at the right
 *         lifecycle moments; permissionJumpRegistry.test.ts covers what `focusOwnerById` does with
 *         a registered node once one exists.
 * Does not: Prove Steam actually populates the ref on device — that is what the row being a real
 *           Focusable buys, and the Deck check (PERM-JUMP-01) is what confirms it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useState } from "react";

import { PermissionsTab } from "./PermissionsTab";
import type { BonsaiCapabilities } from "../data/bonsaiSettingsSchema";
import * as navFocusRegistry from "../utils/navFocusRegistry";

const ALL_ON: BonsaiCapabilities = {
  filesystem_write: true,
  media_library_access: true,
  steam_logs_read: true,
  steam_web_api: true,
  microphone_access: true,
  internet_downloads: true,
};

function Harness() {
  const [capabilities, setCapabilities] = useState<BonsaiCapabilities>(ALL_ON);
  return <PermissionsTab capabilities={capabilities} setCapabilities={setCapabilities} />;
}

afterEach(() => {
  navFocusRegistry.resetNavFocusRegistry();
});

describe.each([
  ["permissions-row-game-context-read"],
  ["permissions-row-filesystem-write"],
  ["permissions-row-steam-web-api"],
  ["permissions-row-microphone-access"],
] as const)("%s row nav registration", (navId) => {
  it("registers a nav holder on mount and clears it on unmount", () => {
    const spy = vi.spyOn(navFocusRegistry, "registerNavFocus");

    const { unmount } = render(<Harness />);

    const registerCalls = spy.mock.calls.filter(([id]) => id === navId);
    expect(registerCalls.length).toBeGreaterThan(0);
    const [, holder] = registerCalls[registerCalls.length - 1]!;
    expect(holder).not.toBeNull();

    // Steam populates the holder's `.current` once the Focusable is navigable — simulate that,
    // then confirm the transfer function reads straight through the registered handle.
    (holder as { current: unknown }).current = { TakeFocus: vi.fn(() => true) };
    expect(navFocusRegistry.takeNavFocus(navId)).toBe(true);

    unmount();
    // Assert the outcome, not which function did it: the id no longer resolves to anything, so a
    // hop aimed here reports false and its caller falls through. (Was: assert the last call's
    // second argument was null — the old API's shape, which the identity-checked deregistration
    // of 2026-09-05 replaced.)
    expect(navFocusRegistry.takeNavFocus(navId)).toBe(false);

    spy.mockRestore();
  });
});
