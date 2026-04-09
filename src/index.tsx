import React, { useState, useMemo, useEffect, useRef } from "react";
import { definePlugin, toaster, call } from "@decky/api";
import { PanelSection, PanelSectionRow, TextField, ButtonItem, Button, Navigation, QuickAccessTab, Focusable, Router, showModal, ConfirmModal, Tabs } from "@decky/ui";
import { PcIp, HostIp } from "./config";

function splitResponseIntoChunks(text: string): string[] {
  const byParagraph = text.split(/\n\n+/).filter(p => p.trim());
  if (byParagraph.length > 1) return byParagraph;

  const byLine = text.split(/\n/).filter(l => l.trim());
  if (byLine.length > 1) return byLine;

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 300) {
    let cut = rest.lastIndexOf(". ", 300);
    if (cut < 100) cut = rest.lastIndexOf(" ", 300);
    if (cut < 100) cut = 300;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest.trim()) chunks.push(rest.trim());
  return chunks.length > 0 ? chunks : [text];
}

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

type PresetPrompt = { text: string; category: string };

const PRESET_PROMPTS: PresetPrompt[] = [
  { text: "Optimize for battery life", category: "battery" },
  { text: "Max performance for this game", category: "performance" },
  { text: "Lower TDP for 2D/indie games", category: "battery" },
  { text: "Balance FPS and battery", category: "battery" },
  { text: "Reduce fan noise", category: "thermal" },
  { text: "What settings should I use?", category: "general" },
  { text: "Set TDP to minimum for menu/idle", category: "battery" },
  { text: "Best settings for 60fps", category: "performance" },
  { text: "Best settings for 30fps with max battery", category: "battery" },
  { text: "Is this game Deck verified?", category: "general" },
  { text: "Why is my game crashing?", category: "troubleshooting" },
  { text: "Recommended controller layout?", category: "controls" },
  { text: "How do I fix stuttering?", category: "troubleshooting" },
  { text: "Optimize for online multiplayer", category: "performance" },
  { text: "Set GPU clock for this game", category: "performance" },
  { text: "Best FSR settings for this game", category: "performance" },
  { text: "How to reduce input lag?", category: "controls" },
  { text: "Recommended TDP for this game?", category: "performance" },
];

const FOLLOW_UP_CATEGORIES: Record<string, string[]> = {
  performance: ["performance", "thermal", "battery"],
  battery: ["battery", "performance", "thermal"],
  thermal: ["thermal", "battery", "performance"],
  controls: ["controls", "troubleshooting", "general"],
  troubleshooting: ["troubleshooting", "performance", "general"],
  general: ["general", "performance", "battery"],
};

function getRandomPresets(count: number): PresetPrompt[] {
  const pool = [...PRESET_PROMPTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function getContextualPresets(lastCategory: string, count: number): PresetPrompt[] {
  const related = FOLLOW_UP_CATEGORIES[lastCategory] ?? Object.keys(FOLLOW_UP_CATEGORIES);
  const picked: PresetPrompt[] = [];
  const used = new Set<string>();

  for (const cat of related) {
    if (picked.length >= count) break;
    const candidates = PRESET_PROMPTS.filter((p) => p.category === cat && !used.has(p.text));
    if (candidates.length === 0) continue;
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    picked.push(choice);
    used.add(choice.text);
  }

  while (picked.length < count) {
    const remaining = PRESET_PROMPTS.filter((p) => !used.has(p.text));
    if (remaining.length === 0) break;
    const choice = remaining[Math.floor(Math.random() * remaining.length)];
    picked.push(choice);
    used.add(choice.text);
  }

  return picked;
}

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["battery", ["battery", "power", "tdp", "watt", "charge", "idle"]],
  ["performance", ["fps", "performance", "speed", "framerate", "frame rate", "fsr", "resolution"]],
  ["thermal", ["fan", "thermal", "temp", "heat", "cool", "noise"]],
  ["controls", ["controller", "layout", "input", "button", "joystick", "trackpad"]],
  ["troubleshooting", ["crash", "stutter", "fix", "error", "bug", "issue", "problem", "lag"]],
];

function detectPromptCategory(question: string): string {
  const lower = question.toLowerCase().replace(/\s+for\s+\S.*$/, "");

  const exact = PRESET_PROMPTS.find((p) => p.text.toLowerCase() === lower);
  if (exact) return exact.category;

  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "general";
}

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

type SteamUrlApi = {
  ExecuteSteamURL(url: string): void;
};

const SEARCH_QUERY_STORAGE_KEY = "bonsai:last-query";

type AppliedResult = {
  tdp_watts: number | null;
  gpu_clock_mhz: number | null;
  errors: string[];
};

type ConnectionStatus = {
  reachable: boolean;
  version?: string;
  models?: string[];
  error?: string;
};

function formatDeckyRpcError(e: unknown): string {
  if (e instanceof Error) {
    const traceback = (e as Error & { traceback?: string }).traceback;
    const base = e.message || String(e);
    return traceback ? `${base}\n\n${traceback}` : base;
  }
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = [o.message, o.error].find((x) => typeof x === "string");
    const tb = typeof o.traceback === "string" ? o.traceback : "";
    if (typeof msg === "string") {
      return tb ? `${msg}\n\n${tb}` : msg;
    }
  }
  return String(e);
}

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

const DISCLAIMER_STORAGE_KEY = "bonsai:disclaimer-accepted";
// TODO: Replace with the real bonsAI GitHub issues URL
const GITHUB_ISSUES_URL = "https://github.com/YOUR_USER/BonsAI/issues";
const GITHUB_REPO_URL = GITHUB_ISSUES_URL.replace(/\/issues$/, "");

function hasAcceptedDisclaimer(): boolean {
  try {
    return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "1";
  } catch { return false; }
}

function markDisclaimerAccepted(): void {
  try { window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "1"); } catch {}
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
  const [currentTab, setCurrentTab] = useState("main");

  // --- Search state ---
  const [questionFocused, setQuestionFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => loadSavedSearchQuery());
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [navigationMessage, setNavigationMessage] = useState<string>("");

  useEffect(() => {
    persistSearchQuery(searchQuery);
  }, [searchQuery]);

  // --- AI state ---
  const [ollamaIp, setOllamaIp] = useState(PcIp);
  const [ollamaQuestion, setOllamaQuestion] = useState("");
  const [ollamaResponse, setOllamaResponse] = useState("");
  const [ollamaContext, setOllamaContext] = useState<{ app_id: string; app_context: "active" | "none" } | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [lastApplied, setLastApplied] = useState<AppliedResult | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<PresetPrompt[]>(() => getRandomPresets(3));
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);

  // --- Debug state (lifted from former ErrorCaptureUI) ---
  const [capturedErrors, setCapturedErrors] = useState<string[]>([]);

  // --- Settings tab state ---
  const [deckIp, setDeckIp] = useState<string>("...");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connectionTesting, setConnectionTesting] = useState(false);

  // --- Global error capture (always active regardless of tab) ---
  useEffect(() => {
    const onErr = (e: any) => {
      const msg = e?.error?.stack ?? e?.error?.message ?? e?.message ?? String(e);
      setCapturedErrors((p) => [msg, ...p]);
      try {
        console.error("GLOBAL ERROR", e);
      } catch (err) {}
    };

    const onRejection = (e: any) => {
      const reason = e?.reason ?? e;
      const msg = reason?.stack ?? reason?.message ?? String(reason);
      setCapturedErrors((p) => ["(unhandledrejection) " + msg, ...p]);
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

  // --- Fetch Deck IP on mount ---
  useEffect(() => {
    call<[], string>("get_deck_ip").then((ip) => {
      setDeckIp(ip ?? "unknown");
    }).catch(() => {
      setDeckIp("unknown");
    });
  }, []);

  // --- Slow-response warning timer ---
  useEffect(() => {
    if (!isAsking) {
      setShowSlowWarning(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowWarning(true), 20_000);
    return () => clearTimeout(timer);
  }, [isAsking]);

  // --- Disclaimer modal on first open ---
  useEffect(() => {
    if (!hasAcceptedDisclaimer()) {
      showModal(
        <ConfirmModal
          strTitle="bonsAI - Beta Notice"
          strDescription={
            "Welcome to bonsAI!\n\n" +
            "This plugin is currently in beta. Some features may not work as expected, " +
            "and AI-generated recommendations \u2014 especially TDP and performance changes \u2014 " +
            "should be verified before relying on them.\n\n" +
            "bonsAI modifies system hardware settings based on AI suggestions. " +
            "Use at your own risk.\n\n" +
            "To report bugs or request features, visit:\n" +
            GITHUB_ISSUES_URL + "\n\n" +
            "By continuing, you acknowledge this is experimental software."
          }
          strOKButtonText="Got it"
          bAlertDialog={true}
          onOK={() => { markDisclaimerAccepted(); }}
        />
      );
    }
  }, []);

  // --- Question overlay alignment ---
  const questionWrapRef = useRef<HTMLDivElement>(null);
  const questionOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = questionWrapRef.current;
    const input = wrap?.querySelector("input");
    const overlay = questionOverlayRef.current;
    
    if (wrap && input && overlay) {
      input.style.minHeight = "72px";
      input.style.opacity = "0";
  
      wrap.style.position = "relative";
  
      const inputRect = input.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
  
      overlay.style.position = "absolute";
      overlay.style.top = `${inputRect.top - wrapRect.top}px`;
      overlay.style.left = `${inputRect.left - wrapRect.left}px`;
      overlay.style.width = `${inputRect.width}px`;
      overlay.style.height = `${inputRect.height}px`;
  
      overlay.style.marginTop = "0px";
      overlay.style.minHeight = "auto";
    }
  });

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

  const onAskOllama = async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((r) => setTimeout(r, 50));

    const q = ollamaQuestion.trim();
    const ip = ollamaIp.trim();
    if (!q || !ip) return;

    const runningApp = Router.MainRunningApp;
    const appId = runningApp?.appid?.toString() ?? "";
    const appName = runningApp?.display_name ?? "";

    setIsAsking(true);
    setOllamaResponse("Thinking...");
    setLastApplied(null);
    setElapsedSeconds(null);
    try {
      console.log(`[bonsAI] deck=${HostIp} -> pc=${ip} game=${JSON.stringify(appName)}(${appId}) question=${JSON.stringify(q)}`);

      const data = await call<
        [{ question: string; PcIp: string; appId: string; appName: string }],
        {
          success: boolean;
          response: string;
          app_id: string;
          app_context: string;
          applied?: AppliedResult | null;
          elapsed_seconds?: number;
        }
      >("ask_game_ai", { question: q, PcIp: ip, appId, appName });

      let responseText = data.response ?? "No response text.";
      if (data.applied) {
        const parts: string[] = [];
        if (data.applied.tdp_watts != null) parts.push(`TDP: ${data.applied.tdp_watts}W`);
        if (data.applied.gpu_clock_mhz != null) parts.push(`GPU: ${data.applied.gpu_clock_mhz} MHz`);
        if (parts.length > 0) responseText += `\n\n[Applied: ${parts.join(", ")}]`;
        if (data.applied.errors?.length) responseText += `\n[Errors: ${data.applied.errors.join("; ")}]`;
      }
      setOllamaResponse(responseText);
      setLastApplied(data.applied ?? null);
      setElapsedSeconds(data.elapsed_seconds ?? null);
      setOllamaContext({
        app_id: data.app_id ?? "",
        app_context: data.app_context === "active" ? "active" : "none",
      });

      const category = detectPromptCategory(q);
      setSuggestedPrompts(getContextualPresets(category, 3));
    } catch (e: unknown) {
      setOllamaResponse(`Error: ${formatDeckyRpcError(e)}`);
      setLastApplied(null);
      setOllamaContext(null);
    } finally {
      setIsAsking(false);
    }
  };

  const onTestConnection = async () => {
    const ip = ollamaIp.trim();
    if (!ip) return;
    setConnectionTesting(true);
    setConnectionStatus(null);
    try {
      const result = await call<[string], ConnectionStatus>(
        "test_ollama_connection", ip
      );
      setConnectionStatus(result);
    } catch (e: unknown) {
      setConnectionStatus({ reachable: false, error: formatDeckyRpcError(e) });
    } finally {
      setConnectionTesting(false);
    }
  };

  // =====================================================================
  // TAB CONTENT
  // =====================================================================

  const mainTab = (
    <>
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

      <PanelSection title="Ask Ollama (AI)">
        <PanelSectionRow>
          <div
            ref={questionWrapRef}
            style={{ width: "100%" }}
            onFocus={() => setQuestionFocused(true)}
            onBlur={() => setQuestionFocused(false)}
          >
            <TextField
              label="Question"
              value={ollamaQuestion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOllamaQuestion(e.target.value)}
              onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement>) => {
                if (ev.key === "Enter" && !isAsking && ollamaQuestion.trim() && ollamaIp.trim()) {
                  ev.preventDefault();
                  (ev.currentTarget as HTMLElement).blur();
                  onAskOllama();
                }
              }}
            />
            <div
              ref={questionOverlayRef}
              style={{
                pointerEvents: "none",
                background: "#23262e",
                borderRadius: 4,
                border: questionFocused ? "2px solid #59bf40" : "2px solid transparent",
                color: ollamaQuestion ? "white" : "#8b929a",
                fontSize: 14,
                lineHeight: "1.4",
                padding: "10px 16px",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {ollamaQuestion || "Type your question..."}
            </div>
          </div>
        </PanelSectionRow>
        {suggestedPrompts.map((p, i) => (
          <PanelSectionRow key={`preset-${i}`}>
            <ButtonItem
              layout="below"
              onClick={() => {
                const gameName = Router.MainRunningApp?.display_name ?? "";
                setOllamaQuestion(gameName ? `${p.text} for ${gameName}` : p.text);
              }}
            >
              <div style={{
                fontSize: 11,
                color: "#8fa8ba",
                padding: 0,
                margin: "-8px 0",
              }}>
                {p.text}
              </div>
            </ButtonItem>
          </PanelSectionRow>
        ))}
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onAskOllama} disabled={isAsking || !ollamaQuestion.trim() || !ollamaIp.trim()}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              {isAsking ? "Asking..." : "Ask"}
            </span>
          </ButtonItem>
        </PanelSectionRow>
        {isAsking && showSlowWarning && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12, padding: "6px 0" }}>
              This is taking a while... If responses are consistently slow, verify Ollama is using your GPU, not CPU. CPU inference is dramatically slower.
            </div>
          </PanelSectionRow>
        )}
        {ollamaResponse && splitResponseIntoChunks(ollamaResponse).map((chunk, i, arr) => (
          <PanelSectionRow key={`ai-chunk-${i}`}>
            <Focusable
              onActivate={() => {}}
              noFocusRing={false}
              style={{
                color: "white",
                padding: "8px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: i === 0 && arr.length === 1 ? 4
                  : i === 0 ? "4px 4px 0 0"
                  : i === arr.length - 1 ? "0 0 4px 4px"
                  : 0,
                whiteSpace: "pre-wrap",
                fontSize: "12px",
                lineHeight: "1.4",
                marginTop: i > 0 ? -8 : 0,
                marginBottom: i === arr.length - 1 ? 80 : 0,
              }}
            >
              {chunk}
            </Focusable>
          </PanelSectionRow>
        ))}
        {!isAsking && elapsedSeconds != null && elapsedSeconds > 20 && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12 }}>
              Response took {elapsedSeconds}s — verify Ollama is using your GPU, not CPU. CPU inference is dramatically slower.
            </div>
          </PanelSectionRow>
        )}
        {lastApplied && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12 }}>
              Applied to system successfully. If QAM Performance sliders look stale, close and reopen the QAM Performance tab to verify reflected values.
            </div>
          </PanelSectionRow>
        )}
        {ollamaContext && (
          <PanelSectionRow>
            <div style={{ color: "#9fb7d5", fontSize: 13 }}>
              {ollamaContext.app_context === "active" && ollamaContext.app_id
                ? `Context: active game AppID ${ollamaContext.app_id}`
                : "Context: no active game detected"}
            </div>
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );

  const settingsTab = (
    <PanelSection title="Connection">
      <PanelSectionRow>
        <TextField
          label="PC IP Address"
          value={ollamaIp}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOllamaIp(e.target.value)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 13 }}>
          <span style={{ color: "gray" }}>Deck IP</span>
          <span style={{ color: "#c8c8c8" }}>{deckIp}</span>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onTestConnection}
          disabled={connectionTesting || !ollamaIp.trim()}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {connectionTesting ? "Testing..." : "Test Connection"}
          </span>
        </ButtonItem>
      </PanelSectionRow>
      {connectionStatus && (
        <PanelSectionRow>
          {connectionStatus.reachable ? (
            <div style={{ fontSize: 12, color: "#81c784" }}>
              <div>Connected — Ollama v{connectionStatus.version}</div>
              {connectionStatus.models && connectionStatus.models.length > 0 && (
                <div style={{ color: "#9fb7d5", marginTop: 4 }}>
                  Models: {connectionStatus.models.join(", ")}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "tomato" }}>
              Unreachable — {connectionStatus.error}
            </div>
          )}
        </PanelSectionRow>
      )}
    </PanelSection>
  );

  const debugTab = (
    <PanelSection title="Debug Log">
      <PanelSectionRow>
        <div style={{ fontSize: 13, color: "gray", marginBottom: 4 }}>
          Captured runtime errors appear below.
        </div>
      </PanelSectionRow>
      {capturedErrors.length > 0 && (
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={() => setCapturedErrors([])}
          >
            <span style={{ fontSize: 12 }}>Clear ({capturedErrors.length})</span>
          </ButtonItem>
        </PanelSectionRow>
      )}
      {capturedErrors.length === 0 ? (
        <PanelSectionRow>
          <div style={{ color: "gray", fontSize: 13 }}>No errors captured.</div>
        </PanelSectionRow>
      ) : (
        capturedErrors.map((err, i) => (
          <PanelSectionRow key={`err-${i}`}>
            <Focusable
              onActivate={() => {}}
              noFocusRing={false}
              style={{
                background: "#111",
                padding: 8,
                color: "tomato",
                whiteSpace: "pre-wrap",
                fontSize: 11,
                lineHeight: "1.3",
                borderRadius: 4,
                wordBreak: "break-word",
              }}
            >
              {err}
            </Focusable>
          </PanelSectionRow>
        ))
      )}
    </PanelSection>
  );

  const aboutTab = (
    <PanelSection title="About bonsAI">
      <PanelSectionRow>
        <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
          bonsAI
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: 12, color: "#c8c8c8", lineHeight: "1.5" }}>
          Backend Ollama Node for Steam (A.I.) — an AI assistant embedded in the
          Steam Deck Quick Access Menu. Ask questions, get game-specific
          performance recommendations, and apply TDP/GPU changes directly from
          the QAM.
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: 12, color: "#f2cf84", lineHeight: "1.5" }}>
          This plugin is in beta. AI-generated recommendations — especially TDP
          and performance changes — should be verified before relying on them.
          bonsAI modifies system hardware settings based on AI suggestions. Use
          at your own risk.
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => {
            try {
              Navigation.NavigateToExternalWeb(GITHUB_REPO_URL);
            } catch {
              toaster.toast({ title: "GitHub", body: GITHUB_REPO_URL, duration: 4000 });
            }
          }}
        >
          <span style={{ fontSize: 13 }}>GitHub Repository</span>
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => {
            try {
              Navigation.NavigateToExternalWeb(GITHUB_ISSUES_URL);
            } catch {
              toaster.toast({ title: "Report a Bug", body: GITHUB_ISSUES_URL, duration: 4000 });
            }
          }}
        >
          <span style={{ fontSize: 13 }}>Report a Bug / Request a Feature</span>
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );

  return (
    <div className="bonsai-scope">
      <style>{`
        .bonsai-scope .Panel.Focusable {
          height: auto !important;
        }
        .bonsai-scope .Panel.Focusable > div {
          position: relative !important;
          top: 0 !important;
        }
        .bonsai-scope [class*="TabContentsScroll"] {
          padding-top: 40px !important;
        }
      `}</style>
      <Tabs
        activeTab={currentTab}
        onShowTab={(tabID: string) => { setCurrentTab(tabID); }}
        tabs={[
          { id: "main", title: "bonsAI", content: mainTab },
          { id: "settings", title: "Settings", content: settingsTab },
          { id: "debug", title: "Debug", content: debugTab },
          { id: "about", title: "About", content: aboutTab },
        ]}
      />
    </div>
  );
};

const Root: React.FC = () => (
  <ErrorBoundary>
    <Content />
  </ErrorBoundary>
);

export default definePlugin(() => {
  return {
    name: "bonsAI",
    title: "Decky Settings Search",
    content: <Root />,
    icon: <SearchIcon />,
    onDismount() {},
  };
});
