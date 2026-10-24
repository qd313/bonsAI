/**
 * Title: Steam settings navigation helpers
 * Purpose: Map settings breadcrumb strings to the way each Steam page opens (steam:// link or Decky route) and QAM QuickAccessTab targets.
 * Used for: AI-suggested Steam settings jumps and in-plugin settings search result actions.
 * Solves: Distinguishes QAM tab switches from full Settings app deep links.
 * Does not: List every settings path — see settingsDatabase for the searchable catalog strings.
 */
import { Navigation, QuickAccessTab } from "@decky/ui";

/**
 * How one Steam Settings page is opened. Measured on the Deck 2026-10-11 (build f561c0e5): a
 * steam:// link opens 22 of the 24 pages; Internet needs the name "network" in that link, and
 * Remote Play has no steam:// spelling that works at all, so it opens through Decky's own route.
 */
type SettingsPageTarget =
  | { kind: "steam-url"; url: string }
  | { kind: "route"; path: string };

type SteamUrlApi = {
  ExecuteSteamURL(url: string): void;
};

const url = (name: string): SettingsPageTarget => ({
  kind: "steam-url",
  url: `steam://open/settings/${name}`,
});

const FALLBACK_TARGET: SettingsPageTarget = { kind: "steam-url", url: "steam://open/settings" };

const SETTINGS_SECTION_TARGETS: Record<string, SettingsPageTarget> = {
  system: url("system"),
  security: url("security"),
  // The "internet" link opens System; "network" is the name that reaches the Internet page.
  internet: url("network"),
  notifications: url("notifications"),
  display: url("display"),
  power: url("power"),
  audio: url("audio"),
  bluetooth: url("bluetooth"),
  controller: url("controller"),
  keyboard: url("keyboard"),
  customization: url("customization"),
  accessibility: url("accessibility"),
  "friends & chat": url("friends"),
  downloads: url("downloads"),
  cloud: url("cloud"),
  "in game": url("ingame"),
  family: url("family"),
  // No steam:// spelling opens Remote Play (all tried open System); Decky's route does.
  "remote play": { kind: "route", path: "/settings/remoteplay" },
  storage: url("storage"),
  "game recording": url("gamerecording"),
  home: url("home"),
  library: url("library"),
  store: url("store"),
  developer: url("developer"),
};

const QAM_SECTION_TABS: Record<string, QuickAccessTab> = {
  "quick settings": QuickAccessTab.Settings,
  performance: QuickAccessTab.Perf,
  help: QuickAccessTab.Help,
  soundtracks: QuickAccessTab.Music,
};

/** QAM-only setting routes use tab switching instead of steam:// URLs. */
export function isQamSetting(settingPath: string): boolean {
  return settingPath.startsWith("QAM >");
}

function getSettingSection(settingPath: string): string {
  const parts = settingPath.split(">").map((part) => part.trim().toLowerCase());
  return parts[1] ?? "";
}

/** How to open the Steam Settings page a breadcrumb names; Settings' first page when unknown. */
function getSteamSettingsTarget(settingPath: string): SettingsPageTarget {
  const category = getSettingSection(settingPath);
  return SETTINGS_SECTION_TARGETS[category] ?? FALLBACK_TARGET;
}

/**
 * Open the Steam Settings page a breadcrumb names, the way the table says that page opens.
 * Throws when Steam's own API is missing; callers catch it and toast.
 */
export function openSteamSettingsPage(settingPath: string): void {
  const target = getSteamSettingsTarget(settingPath);
  if (target.kind === "route") {
    Navigation.Navigate(target.path);
    Navigation.CloseSideMenus();
    return;
  }
  (SteamClient.URL as unknown as SteamUrlApi).ExecuteSteamURL(target.url);
}

export function getQamTab(settingPath: string): QuickAccessTab {
  const section = getSettingSection(settingPath);
  return QAM_SECTION_TABS[section] ?? QuickAccessTab.Settings;
}
