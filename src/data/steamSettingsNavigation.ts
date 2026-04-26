import { QuickAccessTab } from "@decky/ui";

const SETTINGS_SECTION_URLS: Record<string, string> = {
  system: "steam://open/settings/system",
  security: "steam://open/settings/security",
  internet: "steam://open/settings/internet",
  notifications: "steam://open/settings/notifications",
  display: "steam://open/settings/display",
  power: "steam://open/settings/power",
  audio: "steam://open/settings/audio",
  bluetooth: "steam://open/settings/bluetooth",
  controller: "steam://open/settings/controller",
  keyboard: "steam://open/settings/keyboard",
  customization: "steam://open/settings/customization",
  accessibility: "steam://open/settings/accessibility",
  "friends & chat": "steam://open/settings/friends",
  downloads: "steam://open/settings/downloads",
  cloud: "steam://open/settings/cloud",
  "in game": "steam://open/settings/ingame",
  family: "steam://open/settings/family",
  "remote play": "steam://open/settings/remoteplay",
  storage: "steam://open/settings/storage",
  "game recording": "steam://open/settings/gamerecording",
  home: "steam://open/settings/home",
  library: "steam://open/settings/library",
  store: "steam://open/settings/store",
  developer: "steam://open/settings/developer",
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

export function getSteamSettingsUrl(settingPath: string): string {
  const category = getSettingSection(settingPath);
  return SETTINGS_SECTION_URLS[category] ?? "steam://open/settings";
}

export function getQamTab(settingPath: string): QuickAccessTab {
  const section = getSettingSection(settingPath);
  return QAM_SECTION_TABS[section] ?? QuickAccessTab.Settings;
}
