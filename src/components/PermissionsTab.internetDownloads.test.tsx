/**
 * Title: The Internet downloads switch on the Permissions tab
 *
 * Purpose: Pin the screen half of the download permission (plan 71, the maintainer 2026-09-26):
 * a switch beside the Steam and microphone ones, off on a fresh install, forced off and greyed
 * by the kids lock without touching what is saved, and reachable by a permission jump.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_CAPABILITIES, type BonsaiCapabilities } from "../data/bonsaiSettingsSchema";
import { normalizeSettings } from "../data/bonsaiSettingsNormalizers";
import { effectiveCapabilities } from "../hooks/useKidsLock";
import { PERMISSION_TOGGLE_LABELS, resolvePermissionFocusTarget } from "../utils/permissionDeepLink";
import { PermissionsTab } from "./PermissionsTab";

const row = () => document.querySelector('[label="Internet downloads"]');

describe("Internet downloads permission", () => {
  it("is off on a fresh install and in a settings file that never mentions it", () => {
    expect(DEFAULT_CAPABILITIES.internet_downloads).toBe(false);
    expect(normalizeSettings({ capabilities: { microphone_access: true } }).capabilities.internet_downloads).toBe(
      false
    );
  });

  it("shows as its own switch, off by default", () => {
    render(<PermissionsTab capabilities={DEFAULT_CAPABILITIES} setCapabilities={() => {}} />);
    expect(row()).toBeTruthy();
    expect(row()!.hasAttribute("checked")).toBe(false);
    expect(row()!.hasAttribute("disabled")).toBe(false);
  });

  it("is forced off and greyed by the kids lock, without changing what is saved", () => {
    const on: BonsaiCapabilities = { ...DEFAULT_CAPABILITIES, internet_downloads: true };
    render(<PermissionsTab capabilities={on} setCapabilities={() => {}} kidsLockActive />);
    expect(row()!.hasAttribute("checked")).toBe(false);
    expect(row()!.hasAttribute("disabled")).toBe(true);
    expect(effectiveCapabilities(on, true).internet_downloads).toBe(false);
    expect(effectiveCapabilities(on, false).internet_downloads).toBe(true);
  });

  it("can be the target of a permission jump", () => {
    expect(resolvePermissionFocusTarget("internet_downloads")).toBe("internet_downloads");
    expect(PERMISSION_TOGGLE_LABELS.internet_downloads).toBe("Internet downloads");
  });
});
