/**
 * Title: Each Steam settings page opens its own page
 * Purpose: Pin what happens when a person picks a settings match on the Search tab: for every one of the 24
 *          Steam Settings pages it opens that page, the way the Deck measurement says that page
 *          opens (a steam:// link for 22 and for Internet under the name "network"; Decky's own
 *          route for Remote Play).
 * Used for: onSettingClick in useSteamSettingsSearch.ts and the controller shortcut in
 *          useExternalNavigationActions.ts, both through steamSettingsNavigation.ts.
 * Solves: "Enable Wi-Fi, Settings > Internet" opened Steam's System page, and Remote Play did
 *         too, because the steam:// link names "internet" and "remoteplay" open System on the Deck
 *         (measured 2026-10-11, build f561c0e5, runs/plan89-STEAM-SETTINGS-PAGES-01).
 * Does not: prove the page that draws; that is the Deck row STEAM-SETTINGS-PAGES-01. The expected
 *         values below come from that measurement, not from reading the table.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  closeSideMenus: vi.fn(),
  openQuickAccessMenu: vi.fn(),
}));

vi.mock("@decky/api", () => ({ toaster: { toast: () => undefined } }));
vi.mock("@decky/ui", () => ({
  Navigation: {
    Navigate: hoisted.navigate,
    CloseSideMenus: hoisted.closeSideMenus,
    OpenQuickAccessMenu: hoisted.openQuickAccessMenu,
    NavigateToExternalWeb: vi.fn(),
  },
  QuickAccessTab: { Settings: 1, Perf: 2, Help: 3, Music: 4 },
}));

import { useSteamSettingsSearch } from "./useSteamSettingsSearch";
import { useExternalNavigationActions } from "../plugin-shell/useExternalNavigationActions";

const executeSteamUrl = vi.fn();

/** Breadcrumb heading -> how the page opened on the Deck (measured, not read from the table). */
type Opener = { url: string } | { route: string };
const MEASURED: Array<[string, Opener]> = [
  ["System", { url: "steam://open/settings/system" }],
  ["Security", { url: "steam://open/settings/security" }],
  ["Internet", { url: "steam://open/settings/network" }],
  ["Notifications", { url: "steam://open/settings/notifications" }],
  ["Display", { url: "steam://open/settings/display" }],
  ["Power", { url: "steam://open/settings/power" }],
  ["Audio", { url: "steam://open/settings/audio" }],
  ["Bluetooth", { url: "steam://open/settings/bluetooth" }],
  ["Controller", { url: "steam://open/settings/controller" }],
  ["Keyboard", { url: "steam://open/settings/keyboard" }],
  ["Customization", { url: "steam://open/settings/customization" }],
  ["Accessibility", { url: "steam://open/settings/accessibility" }],
  ["Friends & Chat", { url: "steam://open/settings/friends" }],
  ["Downloads", { url: "steam://open/settings/downloads" }],
  ["Cloud", { url: "steam://open/settings/cloud" }],
  ["In Game", { url: "steam://open/settings/ingame" }],
  ["Family", { url: "steam://open/settings/family" }],
  ["Remote Play", { route: "/settings/remoteplay" }],
  ["Storage", { url: "steam://open/settings/storage" }],
  ["Game Recording", { url: "steam://open/settings/gamerecording" }],
  ["Home", { url: "steam://open/settings/home" }],
  ["Library", { url: "steam://open/settings/library" }],
  ["Store", { url: "steam://open/settings/store" }],
  ["Developer", { url: "steam://open/settings/developer" }],
];

function pickRow(settingPath: string): void {
  const { result } = renderHook(() =>
    useSteamSettingsSearch({
      setNavigationMessage: vi.fn(),
    }),
  );
  result.current.onSettingClick(settingPath);
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(globalThis, "SteamClient", {
    value: { URL: { ExecuteSteamURL: executeSteamUrl } },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "SteamClient");
});

describe("the settings card opens each Steam settings page its own way", () => {
  it("covers all 24 pages", () => {
    expect(MEASURED).toHaveLength(24);
  });

  it.each(MEASURED)("%s opens its own page", (heading, opener) => {
    pickRow(`Settings > ${heading} > Some row`);
    if ("url" in opener) {
      expect(executeSteamUrl).toHaveBeenCalledTimes(1);
      expect(executeSteamUrl).toHaveBeenCalledWith(opener.url);
      expect(hoisted.navigate).not.toHaveBeenCalled();
    } else {
      expect(hoisted.navigate).toHaveBeenCalledTimes(1);
      expect(hoisted.navigate).toHaveBeenCalledWith(opener.route);
      expect(executeSteamUrl).not.toHaveBeenCalled();
    }
  });

  it("'Enable Wi-Fi' opens the Internet page, not System", () => {
    pickRow("Settings > Internet > Enable Wi-Fi");
    expect(executeSteamUrl).toHaveBeenCalledWith("steam://open/settings/network");
    expect(executeSteamUrl).not.toHaveBeenCalledWith("steam://open/settings/internet");
  });

  it("closes the side menus after opening a page by route", () => {
    pickRow("Settings > Remote Play > Anything");
    expect(hoisted.closeSideMenus).toHaveBeenCalledTimes(1);
  });

  it("falls back to Settings' first page for a name not in the table", () => {
    pickRow("Settings > Nonexistent > Row");
    expect(executeSteamUrl).toHaveBeenCalledWith("steam://open/settings");
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });

  it("keeps the Quick Access menu rows on the tab switch", () => {
    pickRow("QAM > Performance > Frame limit");
    expect(hoisted.openQuickAccessMenu).toHaveBeenCalledTimes(1);
    expect(executeSteamUrl).not.toHaveBeenCalled();
  });

  it("the controller-shortcut button still opens the Controller page by link", () => {
    const { result } = renderHook(() => useExternalNavigationActions());
    result.current.onOpenControllerSettingsForShortcut();
    expect(executeSteamUrl).toHaveBeenCalledWith("steam://open/settings/controller");
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });
});
