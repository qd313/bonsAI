/**
 * Title: The Internet downloads permission, handed to the first-time setup popup's tests
 *
 * Purpose: What the plugin root does for the popup in the plugin: hands the download notice the permission as it is
 * (on or off), whether Steam's parental lock holds it off, and the screen's setter, here a spy.
 *
 * Used for: the FirstRunWhereAiRunsModal tests.
 *
 * Solves: Kept out of firstRunPopupTestKit.tsx, which the tests' @decky/ui stand-in loads: the download notice
 * imports @decky/ui itself, and loading it from inside that stand-in would wait on itself forever.
 *
 * Does not: Save anything; the popup's own save goes through the fake back end.
 */
import { vi } from "vitest";

import { setDownloadPermissionBridge } from "../../downloads/downloadNotice";
import { DEFAULT_CAPABILITIES } from "../../settings/bonsaiSettingsSchema";

/** The permission as the plugin root hands it over; returns the screen's setter, a spy. */
export function permissionBridge(enabled: boolean, kidsLockActive = false) {
  const setCapabilities = vi.fn();
  setDownloadPermissionBridge({
    enabled,
    kidsLockActive,
    capabilities: { ...DEFAULT_CAPABILITIES, internet_downloads: enabled },
    setCapabilities,
    onBeforeDeckyModal: vi.fn(),
    onCompleteDeckyModalClose: (close: () => void) => close(),
  });
  return setCapabilities;
}
