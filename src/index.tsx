import React, { useState, useMemo, useEffect } from "react";
import { definePlugin, toaster } from "@decky/api";
import { PanelSection, PanelSectionRow, TextField, ButtonItem, Button, Navigation, QuickAccessTab, Focusable } from "@decky/ui";

const SearchIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SETTINGS_DATABASE = [
  // System
  "Settings > System > Select preferred language",
  "Settings > System > Software Updates",
  "Settings > System > OS Update Channel",
  "Settings > System > Steam Client Update Channel",
  "Settings > System > 24-hour clock",
  "Settings > System > Timezone",
  "Settings > System > Enable Developer Mode",
  "Settings > System > Show Switch to Desktop option when not logged in",
  "Settings > System > SteamOS Crash Report",
  "Settings > System > Enable Application Crash Report Collection",
  "Settings > System > Enable Kernel Crash Report Collection",
  "Settings > System > Enable GPU Crash Report Collection",
  "Settings > System > Enable System Info Collection",
  "Settings > System > Enable Driver Crash Report Collection",
  "Settings > System > Run storage device maintenance tasks",
  "Settings > System > Enable updated fan control",
  "Settings > System > Format SD Card",
  "Settings > System > Hardware", 
  "Settings > System > About",

  // Security
  "Settings > Security > On system wake and power up",
  "Settings > Security > When switching to desktop mode",
  "Settings > Security > Change PIN",
  "Settings > Security > Lock Screen",

  // Internet
  "Settings > Internet > Offline Mode",
  "Settings > Internet > Enable Wi-Fi",
  "Settings > Internet > HTTP Proxy",
  "Settings > Internet > Delete Web Browser Data",

  // Notifications
  "Settings > Notifications > Show Notification Toasts",
  "Settings > Notifications > Play a sound when a notification toast is displayed",
  "Settings > Notifications > Client Notifications",
  "Settings > Notifications > Friend Notifications",
  "Settings > Notifications > Flash window when I receive a chat message",
  "Settings > Notifications > Steam Notifications",
  "Settings > Notifications > Family Notifications",

  // Display
  "Settings > Display > Brightness",
  "Settings > Display > Enable Adaptive Brightness",
  "Settings > Display > Automatically Set Resolution",
  "Settings > Display > Automatically Scale User Interface",
  "Settings > Display > Automatically Scale Image",
  "Settings > Display > Schedule Night Mode",
  "Settings > Display > Night Mode Tint",
  "Settings > Display > Enable HDMI CEC Support",
  "Settings > Display > Wake TV when device resumes from sleep",
  "Settings > Display > Status LED Brightness",
  "Settings > Display > Magnifier Scale",
  "Settings > Display > Maximum Game Resolution",
  "Settings > Display > External display safe mode",
  "Settings > Display > Enable HDR",
  "Settings > Display > SDR content brightness (on HDR)",
  "Settings > Display > Use Native Color Temperature",
  "Settings > Display > Adjust Display Colors",

  // Power
  "Settings > Power > Battery Percentage",
  "Settings > Power > Enable battery charging limit",
  "Settings > Power > On battery power, dim after",
  "Settings > Power > When plugged in, dim after",
  "Settings > Power > On battery power, sleep after",
  "Settings > Power > When plugged in, sleep after",
  "Settings > Power > Enable display-off downloads on battery power",
  "Settings > Power > Finish downloads with display off before sleeping",

  // Audio
  "Settings > Audio > Output Device",
  "Settings > Audio > Input Device",
  "Settings > Audio > Enable UI sounds",
  "Settings > Audio > Microphone Volume",
  "Settings > Audio > Echo Cancellation",

  // Bluetooth
  "Settings > Bluetooth > Bluetooth",
  "Settings > Bluetooth > Show all devices",

  // Controller
  "Settings > Controller > Controller Name",
  "Settings > Controller > Identify Controller",
  "Settings > Controller > Game rumble",
  "Settings > Controller > Use Nintendo Button Layout",
  "Settings > Controller > Universal Face Button Glyphs",
  "Settings > Controller > Test Device Inputs",
  "Settings > Controller > Calibration & Advanced Settings",
  "Settings > Controller > Desktop Layout",
  "Settings > Controller > Guide Button Chord Layout",

  // Keyboard
  "Settings > Keyboard > Current Keyboard Theme",
  "Settings > Keyboard > Haptics",
  "Settings > Keyboard > Initial Location (Desktop)",
  "Settings > Keyboard > Initial Location (Overlay)",
  "Settings > Keyboard > Active Keyboards",
  "Settings > Keyboard > Enable Trigger Click",
  "Settings > Keyboard > Trackpad Sensitivity",

  // Customization
  "Settings > Customization > Use as Wake Movie",
  "Settings > Customization > Shuffle startup movie",
  "Settings > Customization > UI Scale",

  // Accessibility
  "Settings > Accessibility > UI Scale",
  "Settings > Accessibility > High Contrast Mode",
  "Settings > Accessibility > Reduce Motion",
  "Settings > Accessibility > Color Filter",
  "Settings > Accessibility > Mono Audio",
  "Settings > Accessibility > Enable Screen Reader",

  // Friends & Chat
  "Settings > Friends & Chat > Display Nickname",
  "Settings > Friends & Chat > Group friends together by game",
  "Settings > Friends & Chat > Hide offline friends in custom categories",
  "Settings > Friends & Chat > Ignore 'Away' status when sorting friends",
  "Settings > Friends & Chat > Sign in to friends when Steam Deck starts",
  "Settings > Friends & Chat > Enable Animated Avatars & Animated Avatar Frames",
  "Settings > Friends & Chat > Compact friends list & chat view",
  "Settings > Friends & Chat > Compact favorite friends area",
  "Settings > Friends & Chat > Dock chats to the friends list",
  "Settings > Friends & Chat > Open a new window for new chats (rather than a tab)",
  "Settings > Friends & Chat > Don't embed images and other media in-line",
  "Settings > Friends & Chat > Remember my open chats",
  "Settings > Friends & Chat > Disable spellcheck in chat message entry",
  "Settings > Friends & Chat > Disable animated room effects",
  "Settings > Friends & Chat > Chat Filtering",
  "Settings > Friends & Chat > Chat Font Size",

  // Downloads
  "Settings > Downloads > Download region",
  "Settings > Downloads > Limit download speed",
  "Settings > Downloads > Updates to installed games",
  "Settings > Downloads > Schedule auto-updates",
  "Settings > Downloads > Allow downloads during gameplay",
  "Settings > Downloads > Throttle downloads while streaming",
  "Settings > Downloads > Display download rates in bits per second",
  "Settings > Downloads > Game File Transfer over Local Network",
  "Settings > Downloads > Allow transfers from this device to",

  // Cloud
  "Settings > Cloud > Enable Steam Cloud",
  "Settings > Cloud > Screenshot Management",

  // In Game
  "Settings > In Game > Main Menu shortcut key(s)",
  "Settings > In Game > Quick Access Menu shortcut key(s)",
  "Settings > In Game > Include Steam UI elements in screenshots",
  "Settings > In Game > Steam Networking",

  // Family
  "Settings > Family > Manage your Steam Family",

  // Remote Play
  "Settings > Remote Play > Enable Remote Play",
  "Settings > Remote Play > Allow Direct Connection (IP sharing)",
  "Settings > Remote Play > Enable Advanced Client Options",

  // Storage
  "Settings > Storage > Internal Drive",
  "Settings > Storage > MicroSD Card",
  "Settings > Storage > Default Storage Drive",

  // Game Recording
  "Settings > Game Recording > Recording Off / Background / Manual",
  "Settings > Game Recording > Shortcut Keys",
  "Settings > Game Recording > Recording Quality",
  "Settings > Game Recording > Maximum frame rate",
  "Settings > Game Recording > Maximum video height",
  "Settings > Game Recording > Audio Recording",

  // Home
  "Settings > Home > Show personalized store content on my Home",
  "Settings > Home > Only show product updates in What's New",

  // Library
  "Settings > Library > Show number of copies in Steam Family library",
  "Settings > Library > Add to Library",

  // Store
  "Settings > Store > Mature Content",
  "Settings > Store > Exclude from my Store",
  "Settings > Store > Discovery Queue Content",
  "Settings > Store > New On Steam Queue Content",
  "Settings > Store > Platform Preference",
  "Settings > Store > Steam Deck Feedback",
  "Settings > Store > Live Broadcasts",

  // Developer
  "Settings > Developer > Enable System Tracing",
  "Settings > Developer > Enable Graphics Profiling",
  "Settings > Developer > Development host pairing",
  "Settings > Developer > Steam Play",
  "Settings > Developer > Enable Wifi Power Management",
  "Settings > Developer > Force WPA Supplicant Wifi backend",
  "Settings > Developer > Reload wifi driver on sleep",
  "Settings > Developer > Enable Wifi debug data collection",
  "Settings > Developer > External display safe mode",
  "Settings > Developer > Allow external display refresh control",
  "Settings > Developer > Force Composite",
  "Settings > Developer > Disable Color Management",
  "Settings > Developer > Use Legacy X11 Desktop Mode",
  "Settings > Developer > Speaker Test",
  "Settings > Developer > Show Advanced Update Channels",
  "Settings > Developer > Force Format SD Card",
  "Settings > Developer > Steam Console",
  "Settings > Developer > CEF Remote Debugging",
  "Settings > Developer > User Password",
  "Settings > Developer > Allow battery limit full range",
  "Settings > Developer > Steam Input Layout Dev Mode",

  // QAM - Quick Settings
  "QAM > Quick Settings > Brightness",
  "QAM > Quick Settings > Audio Volume",
  "QAM > Quick Settings > Microphone Volume",
  "QAM > Quick Settings > Airplane mode",
  "QAM > Quick Settings > Wi-Fi",
  "QAM > Quick Settings > Bluetooth",
  "QAM > Quick Settings > Add Device",
  "QAM > Quick Settings > Night mode",
  "QAM > Quick Settings > Automatically Scale UI",

  // QAM - Performance
  "QAM > Performance > Performance Overlay Level",
  "QAM > Performance > Frame Limit",
  "QAM > Performance > Disable Frame Limit",
  "QAM > Performance > Enable VRR",
  "QAM > Performance > Enable HDR",
  "QAM > Performance > Allow Tearing",
  "QAM > Performance > Half Rate Shading",
  "QAM > Performance > TDP Limit",
  "QAM > Performance > Manual GPU Clock",
  "QAM > Performance > Scaling Mode",
  "QAM > Performance > Scaling Filter",
  "QAM > Performance > Show Perf Overlay in Steam",
  "QAM > Performance > Reset to Default",

  // QAM - Other
  "QAM > Soundtracks > Browse Soundtracks",
  "QAM > Help > Visit Help Site",
  "QAM > Help > View Manual",
  "QAM > Help > Report a Bug",
  "QAM > Help > Replay Guided Tour"
];

class ErrorBoundary extends React.Component<any, { error: any; info?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  componentDidCatch(error: any, info: any) {
    this.setState({ error, info });
    try {
      console.error("React render error", error, info);
    } catch (e) {}
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "white" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Plugin error</div>
          <div style={{ color: "tomato", whiteSpace: "pre-wrap" }}>{String(this.state.error)}</div>
          <pre style={{ color: "gray", whiteSpace: "pre-wrap" }}>{this.state.info?.componentStack ?? ""}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const ErrorCaptureUI: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    const onErr = (e: any) => {
      const msg = e?.error?.stack ?? e?.error?.message ?? e?.message ?? String(e);
      setErrors((p) => [msg, ...p]);
      try {
        console.error("GLOBAL ERROR", e);
      } catch (err) {}
    };

    const onRejection = (e: any) => {
      const reason = e?.reason ?? e;
      const msg = reason?.stack ?? reason?.message ?? String(reason);
      setErrors((p) => ["(unhandledrejection) " + msg, ...p]);
      try {
        console.error("UNHANDLED REJECTION", e);
      } catch (err) {}
    };

    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <div style={{ padding: 16, color: "white" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Settings Search — Debug</div>
      <div style={{ marginBottom: 8 }}>Plugin loaded. Captured runtime errors appear below.</div>
      {errors.length === 0 ? (
        <div style={{ color: "gray" }}>No errors captured yet.</div>
      ) : (
        errors.map((err, i) => (
          <pre key={i} style={{ background: "#111", padding: 8, color: "tomato", whiteSpace: "pre-wrap" }}>
            {err}
          </pre>
        ))
      )}
    </div>
  );
};

type SteamUrlApi = {
  ExecuteSteamURL(url: string): void;
};

const SEARCH_QUERY_STORAGE_KEY = "deckysettingssearch:last-query";

function loadSavedSearchQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SEARCH_QUERY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistSearchQuery(searchQuery: string): void {
  if (typeof window === "undefined") return;
  try {
    if (searchQuery) {
      window.localStorage.setItem(SEARCH_QUERY_STORAGE_KEY, searchQuery);
    } else {
      window.localStorage.removeItem(SEARCH_QUERY_STORAGE_KEY);
    }
  } catch {}
}

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

function isQamSetting(settingPath: string): boolean {
  return settingPath.startsWith("QAM >");
}

const QAM_SECTION_TABS: Record<string, QuickAccessTab> = {
  "quick settings": QuickAccessTab.Settings,
  performance: QuickAccessTab.Perf,
  help: QuickAccessTab.Help,
  soundtracks: QuickAccessTab.Music,
};

function getSettingSection(settingPath: string): string {
  const parts = settingPath.split(">").map((part) => part.trim().toLowerCase());
  return parts[1] ?? "";
}

function getSteamSettingsUrl(settingPath: string): string {
  const category = getSettingSection(settingPath);
  return SETTINGS_SECTION_URLS[category] ?? "steam://open/settings";
}

function getQamTab(settingPath: string): QuickAccessTab {
  const section = getSettingSection(settingPath);
  return QAM_SECTION_TABS[section] ?? QuickAccessTab.Settings;
}

const Content: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState(() => loadSavedSearchQuery());
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [navigationMessage, setNavigationMessage] = useState<string>("");

  useEffect(() => {
    persistSearchQuery(searchQuery);
  }, [searchQuery]);

  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return SETTINGS_DATABASE.filter((setting) =>
      setting.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedIndex(-1);
    setNavigationMessage("");
  };

  const onSettingClick = (settingPath: string, index?: number) => {
    if (index !== undefined) setSelectedIndex(index);
    try {
      if (isQamSetting(settingPath)) {
        const qamTab = getQamTab(settingPath);
        Navigation.OpenQuickAccessMenu(qamTab);
        toaster.toast({ title: "Opening QAM", body: settingPath, duration: 2000 });
        setNavigationMessage(`Opened QAM: ${settingPath}`);
        return;
      }

      const steamUrlApi = SteamClient.URL as unknown as SteamUrlApi;
      const steamUrl = getSteamSettingsUrl(settingPath);
      steamUrlApi.ExecuteSteamURL(steamUrl);
      toaster.toast({ title: "Opening settings", body: settingPath, duration: 2000 });
      setNavigationMessage(`Opened: ${settingPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toaster.toast({ title: "Navigation failed", body: message, duration: 3000 });
      setNavigationMessage(`Navigation failed: ${message}`);
    }
  };

  return (
    <PanelSection title="Search">
      <PanelSectionRow>
        <Focusable
          flow-children="horizontal"
          style={{ display: "flex", width: "100%", gap: 8, alignItems: "stretch" }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextField
              value={searchQuery}
              style={{ width: "100%" }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement>) => {
                if (ev.key === "ArrowDown") {
                  setSelectedIndex((prev) => Math.min(prev + 1, filteredSettings.length - 1));
                  ev.preventDefault();
                }
                if (ev.key === "ArrowUp") {
                  setSelectedIndex((prev) => Math.max(prev - 1, 0));
                  ev.preventDefault();
                }
                if (ev.key === "Enter" && selectedIndex >= 0 && selectedIndex < filteredSettings.length) {
                  onSettingClick(filteredSettings[selectedIndex], selectedIndex);
                }
              }}
            />
          </div>
          <Button
            disabled={!searchQuery.trim()}
            onClick={() => clearSearch()}
            style={{ minWidth: 44, padding: "0 12px" }}
          >
            x
          </Button>
        </Focusable>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ color: "gray", fontSize: 13 }}>Type to filter, use x to clear, then use D-pad/Arrow keys plus Enter to open the matching Settings or QAM tab.</div>
      </PanelSectionRow>

      {navigationMessage && (
        <PanelSectionRow>
          <div style={{ color: "#81c784", fontSize: 13 }}>{navigationMessage}</div>
        </PanelSectionRow>
      )}

      {filteredSettings.length > 0 && (
        <>
          <PanelSectionRow>
            <div style={{ color: "gray", padding: "6px 0", fontSize: 13 }}>Results</div>
          </PanelSectionRow>
          {filteredSettings.map((s, i) => {
            const isQam = isQamSetting(s);
            const isSelected = i === selectedIndex;

            return (
              <PanelSectionRow key={i}>
                <ButtonItem
                  layout="below"
                  onClick={() => onSettingClick(s, i)}
                >
                  <div
                    style={{
                      width: "100%",
                      padding: "10px 8px",
                      borderRadius: 4,
                      border: `1px solid ${isQam ? "rgba(243, 197, 91, 0.22)" : "transparent"}`,
                      color: isSelected ? "white" : isQam ? "#f2cf84" : "#c8c8c8",
                      backgroundColor: isSelected
                        ? isQam
                          ? "rgba(243, 197, 91, 0.24)"
                          : "rgba(255,255,255,0.14)"
                        : isQam
                          ? "rgba(243, 197, 91, 0.08)"
                          : "transparent",
                    }}
                  >
                    {isQam ? `* ${s}` : s}
                  </div>
                </ButtonItem>
              </PanelSectionRow>
            );
          })}
        </>
      )}

      {searchQuery && filteredSettings.length === 0 && (
        <PanelSectionRow>
          <div style={{ color: "gray", padding: "8px 0", fontSize: 14 }}>No results found.</div>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
};

export default definePlugin(() => {
  return {
    name: "DeckySettingsSearch",
    title: "Settings Search",
    content: (
      <ErrorBoundary>
        <ErrorCaptureUI />
        <Content />
      </ErrorBoundary>
    ),
    icon: <SearchIcon />,
    onDismount() {},
  };
});

