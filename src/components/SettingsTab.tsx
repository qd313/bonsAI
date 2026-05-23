import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
  Button,
  Focusable,
  showModal,
  ConfirmModal,
} from "@decky/ui";
import { toaster } from "@decky/api";
import {
  OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP,
  SCREENSHOT_ATTACHMENT_PRESET_OPTIONS,
  type ScreenshotAttachmentPreset,
  type UnifiedInputPersistenceMode,
  type NamedOllamaHost,
  MAX_NAMED_OLLAMA_HOSTS,
} from "../utils/settingsAndResponse";
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "../data/aiCharacterAccentIntensity";
import { formatAiCharacterSelectionLine } from "../data/characterCatalog";
import { SettingsTabAccentIntensityMenuPopover } from "./SettingsTabAccentIntensityMenuPopover";
import type { DeveloperConnectionStatus } from "./DeveloperTab";
import { ASK_LABEL_COLOR_50 } from "../features/unified-input/constants";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import {
  consumeSettingsTabLocalPending,
  peekSettingsTabLocalPending,
  registerSettingsTabLocalGetter,
  unregisterSettingsTabLocalGetter,
} from "../utils/settingsTabLocalSurvival";

const TEST_CONNECTION_TIMEOUT_SECONDS = 10;
/** Loopback probes may start systemd / ``ollama serve``; Decky RPC must outlive nested waits. */
const LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS = 42000;
const MDNS_DISCOVERY_TIMEOUT_SECONDS = 10;
const MDNS_DISCOVERY_RPC_MS = 18_000;

type MdnsOllamaHost = {
  label: string;
  host: string;
  port: number;
  verified?: boolean;
};

type MdnsDiscoveryResult = {
  ok?: boolean;
  hosts?: MdnsOllamaHost[];
  error?: string;
  hint?: string;
};

const LOCAL_OLLAMA_SETUP_PROFILE_STARTER = "starter";
const LOCAL_OLLAMA_SETUP_PROFILE_TIER1_FOSS_FULL = "tier1_foss_full";
const LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED = "update_installed";

/** Shown in setup modals; align with `refactor_helpers.tier1_foss_recommended_pull_tags` sizes. */
const OLLAMA_MODELS_DISK_HINT =
  "Default model folder on this account: /home/deck/.ollama/models (override with the OLLAMA_MODELS environment variable if you moved the store).";
const LOCAL_SETUP_SIZE_STARTER_GIB =
  "Rough total download: about 5–10 GiB (typical Q4-style weights; exact size varies).";
const LOCAL_SETUP_SIZE_TIER1_FULL_GIB =
  "Rough total download: about 15–40 GiB (11 deduped pulls; shared layers reduce disk vs. adding each size naively; quant varies).";

const LOCAL_SETUP_NETWORK_AND_POWER_HINT = (
  <>
    <div style={{ marginBottom: 8 }}>
      Total time depends heavily on <span style={{ color: "#9ce7ff" }}>Wi‑Fi speed and disk</span>. You may close the
      bonsAI plugin while downloads run as long as Ollama stays up; <span style={{ fontWeight: 700 }}>avoid</span>{" "}
      suspending the Steam Deck, restarting, toggling network off, or powering down until pulls finish.
    </div>
    <div>Use AC power where possible for long Tier‑1 batches.</div>
  </>
);

type LocalOllamaSetupStatus = {
  phase: string;
  stage: string;
  profile: string;
  pull_tags?: string[];
  pull_step?: number;
  total_pull_steps?: number;
  current_tag?: string;
  log_tail?: string[];
  error?: string;
  done?: boolean;
};

type ConnectionStatus = DeveloperConnectionStatus;

const persistenceModeLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Remember everything",
  persist_search_only: "Remember search only",
  no_persist: "Don't remember",
};
const persistenceModeShortLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "All",
  persist_search_only: "Search",
  no_persist: "None",
};
const persistenceModeOptions: UnifiedInputPersistenceMode[] = [
  "persist_all",
  "persist_search_only",
  "no_persist",
];
const persistenceModeDescription: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Restore all typed text when you reopen the plugin.",
  persist_search_only: "Restore only text from Steam settings search.",
  no_persist: "Never restore typed text on reopen.",
};
const screenshotPresetLabel: Record<ScreenshotAttachmentPreset, string> = {
  low: "Save memory",
  mid: "Balanced",
  max: "Best detail",
};

const accentIntensityOutline: Record<AiCharacterAccentIntensityId, string> = {
  subtle: "#eab308",
  balanced: "#f97316",
  heavy: "#b91c1c",
  unleashed: "#a855f7",
};

export type SettingsTabProps = {
  ollamaIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;
  ollamaLocalOnDeck: boolean;
  setOllamaLocalOnDeck: (v: boolean) => void;
  onLastConnectionStatus?: (status: ConnectionStatus | null) => void;

  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  setScreenshotAttachmentPreset: (v: ScreenshotAttachmentPreset) => void;

  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  setUnifiedInputPersistenceMode: (v: UnifiedInputPersistenceMode) => void;

  aiCharacterEnabled: boolean;
  setAiCharacterEnabled: (v: boolean) => void;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  setAiCharacterAccentIntensity: (v: AiCharacterAccentIntensityId) => void;

  showDeveloperTab: boolean;
  setShowDeveloperTab: (v: boolean) => void;

  strategySpoilerMaskingEnabled: boolean;
  setStrategySpoilerMaskingEnabled: (v: boolean) => void;
  strategySpoilerAutoRevealAfterConsent: boolean;
  setStrategySpoilerAutoRevealAfterConsent: (v: boolean) => void;

  onOpenCharacterPicker: () => void;
  onOpenPullModels: () => void;
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onResetSession: () => void;
  /** Reset Decky-persisted settings, runtime data, and browser storage (see confirm copy). */
  onClearAllPluginData: () => void | Promise<void>;
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  ollamaLocalOnDeck,
  setOllamaLocalOnDeck,
  onLastConnectionStatus,
  screenshotAttachmentPreset,
  setScreenshotAttachmentPreset,
  unifiedInputPersistenceMode,
  setUnifiedInputPersistenceMode,
  aiCharacterEnabled,
  setAiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  aiCharacterAccentIntensity,
  setAiCharacterAccentIntensity,
  showDeveloperTab,
  setShowDeveloperTab,
  strategySpoilerMaskingEnabled,
  setStrategySpoilerMaskingEnabled,
  strategySpoilerAutoRevealAfterConsent,
  setStrategySpoilerAutoRevealAfterConsent,
  onOpenCharacterPicker,
  onOpenPullModels,
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onResetSession,
  onClearAllPluginData,
}) => {
  const [deckIp, setDeckIp] = useState<string>("...");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(
    () => peekSettingsTabLocalPending()?.connectionStatus ?? null
  );
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [mdnsDiscovering, setMdnsDiscovering] = useState(false);
  const [mdnsHosts, setMdnsHosts] = useState<MdnsOllamaHost[]>(
    () => peekSettingsTabLocalPending()?.mdnsHosts ?? []
  );
  const [mdnsDiscoveryMessage, setMdnsDiscoveryMessage] = useState<string | null>(
    () => peekSettingsTabLocalPending()?.mdnsDiscoveryMessage ?? null
  );
  const [localSetupStatus, setLocalSetupStatus] = useState<LocalOllamaSetupStatus | null>(null);
  const setupAutoTestRanRef = useRef(false);
  const onTestConnectionRef = useRef<() => Promise<void>>(async () => {});

  const [accentIntensityMenuOpen, setAccentIntensityMenuOpen] = useState(
    () => peekSettingsTabLocalPending()?.accentIntensityMenuOpen ?? false
  );
  const accentIntensityMenuAnchorRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuFirstItemRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuToggleOnceRef = useRef(false);

  const screenshotDimensionNavRef = useRef<HTMLDivElement>(null);
  const ollamaIpConnectionNavRef = useRef<HTMLDivElement>(null);
  const ollamaLocalToggleNavRef = useRef<HTMLDivElement>(null);
  const [localInstallMenuOpen, setLocalInstallMenuOpen] = useState(
    () => peekSettingsTabLocalPending()?.localInstallMenuOpen ?? false
  );

  useLayoutEffect(() => {
    const local = consumeSettingsTabLocalPending();
    if (!local) return;
    setConnectionStatus(local.connectionStatus);
    setMdnsHosts(local.mdnsHosts);
    setMdnsDiscoveryMessage(local.mdnsDiscoveryMessage);
    setAccentIntensityMenuOpen(local.accentIntensityMenuOpen);
    setLocalInstallMenuOpen(local.localInstallMenuOpen);
  }, []);

  useEffect(() => {
    registerSettingsTabLocalGetter(() => ({
      connectionStatus,
      mdnsHosts,
      mdnsDiscoveryMessage,
      accentIntensityMenuOpen,
      localInstallMenuOpen,
    }));
    return () => unregisterSettingsTabLocalGetter();
  }, [
    connectionStatus,
    mdnsHosts,
    mdnsDiscoveryMessage,
    accentIntensityMenuOpen,
    localInstallMenuOpen,
  ]);

  useEffect(() => {
    callDeckyWithTimeout<[], string>("get_deck_ip", [], DECKY_RPC_TIMEOUT_MS)
      .then((ip) => {
        setDeckIp(ip ?? "unknown");
      })
      .catch(() => {
        setDeckIp("unknown");
      });
  }, []);

  const onTestConnection = async () => {
    const target = ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim();
    if (!target) return;
    const loopbackLikelyProbe =
      ollamaLocalOnDeck ||
      /^\s*127\.0\.0\.1\s*(:\s*\d+)?\s*$/i.test(target) ||
      /^\s*localhost\s*(:\s*\d+)?\s*$/i.test(target);
    const rpcDeadlineMs =
      TEST_CONNECTION_TIMEOUT_SECONDS * 1000 +
      (loopbackLikelyProbe ? LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS : 3000);

    setConnectionTesting(true);
    setConnectionStatus(null);
    try {
      const result = await callDeckyWithTimeout<[string, number], ConnectionStatus>(
        "test_ollama_connection",
        [target, TEST_CONNECTION_TIMEOUT_SECONDS],
        rpcDeadlineMs
      );
      setConnectionStatus(result);
      onLastConnectionStatus?.(result);
      if (result.reachable && !ollamaLocalOnDeck) onPersistOllamaIp(target);
    } catch (e: unknown) {
      setConnectionStatus({ reachable: false, error: formatDeckyRpcError(e) });
      onLastConnectionStatus?.({ reachable: false, error: formatDeckyRpcError(e) });
    } finally {
      setConnectionTesting(false);
    }
  };

  onTestConnectionRef.current = onTestConnection;

  const localSetupBusy = localSetupStatus?.phase === "running";

  const runMdnsDiscovery = useCallback(async () => {
    setMdnsDiscovering(true);
    setMdnsDiscoveryMessage(null);
    setMdnsHosts([]);
    try {
      const result = await callDeckyWithTimeout<[number], MdnsDiscoveryResult>(
        "discover_mdns_ollama_hosts",
        [MDNS_DISCOVERY_TIMEOUT_SECONDS],
        MDNS_DISCOVERY_RPC_MS
      );
      const hosts = Array.isArray(result.hosts) ? result.hosts : [];
      if (hosts.length > 0) {
        setMdnsHosts(hosts);
        setMdnsDiscoveryMessage(null);
      } else {
        setMdnsHosts([]);
        setMdnsDiscoveryMessage(
          (result.hint || result.error || "No Ollama services found via mDNS on this network.").trim()
        );
      }
    } catch (e: unknown) {
      setMdnsHosts([]);
      setMdnsDiscoveryMessage(formatDeckyRpcError(e));
    } finally {
      setMdnsDiscovering(false);
    }
  }, []);

  const openMdnsDiscoveryConfirm = useCallback(() => {
    if (ollamaLocalOnDeck || mdnsDiscovering || localSetupBusy) return;
    onBeforeDeckyModal();
    const handle = showModal(
      <ConfirmModal
        strTitle="Find Ollama on LAN (mDNS)"
        strDescription={
          <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}>
            <div style={{ marginBottom: 8 }}>
              This browses your local network for services advertised as{" "}
              <code style={{ color: "#9ce7ff" }}>_ollama._tcp</code> (Bonjour / Avahi). It does not scan IP addresses or
              ports.
            </div>
            <div>
              Stock Ollama on a PC often needs an Avahi or Bonjour publish step — see troubleshooting. You can still
              enter a PC address manually.
            </div>
          </div>
        }
        strOKButtonText="Search"
        strCancelButtonText="Cancel"
        onOK={() => {
          onCompleteDeckyModalClose(() => handle.Close());
          void runMdnsDiscovery();
        }}
        onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
      />
    );
  }, [
    localSetupBusy,
    mdnsDiscovering,
    ollamaLocalOnDeck,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
    runMdnsDiscovery,
  ]);

  const formatLocalSetupStageLine = useCallback((st: LocalOllamaSetupStatus | null) => {
    if (!st || st.phase !== "running") return "";
    const stage = st.stage ?? "";
    if (stage === "pull" && (st.total_pull_steps ?? 0) > 0) {
      const cur = st.current_tag ? ` — ${st.current_tag}` : "";
      return `Pull ${st.pull_step ?? 0}/${st.total_pull_steps}${cur}`;
    }
    const map: Record<string, string> = {
      check: "Checking…",
      install: "Installing Ollama…",
      service: "Starting Ollama service…",
      pull: "Pulling models…",
      complete: "Finishing…",
    };
    return map[stage] || (stage ? `${stage}…` : "Working…");
  }, []);

  const cancelLocalSetup = useCallback(async () => {
    try {
      await callDeckyWithTimeout<[], { cancel_requested?: boolean }>("cancel_local_ollama_setup", [], 8000);
    } catch {
      /* best-effort */
    }
  }, []);

  const openLocalSetupConfirm = useCallback(
    (
      profile:
        | typeof LOCAL_OLLAMA_SETUP_PROFILE_STARTER
        | typeof LOCAL_OLLAMA_SETUP_PROFILE_TIER1_FOSS_FULL
        | typeof LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED
    ) => {
      if (localSetupBusy) return;
      const isStarter = profile === LOCAL_OLLAMA_SETUP_PROFILE_STARTER;
      const isUpdateInstalled = profile === LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED;
      onBeforeDeckyModal();
      const handle = showModal(
        <ConfirmModal
          strTitle={
            isStarter
              ? "Set up starter models?"
              : isUpdateInstalled
                ? "Update Ollama and models?"
                : "Pull full Tier‑1 FOSS set?"
          }
          strDescription={
            <div
              className="bonsai-prose"
              style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}
            >
              {isStarter ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    This downloads two README-sized models (<span style={{ color: "#9ce7ff" }}>text + vision</span>).{" "}
                    {LOCAL_SETUP_SIZE_STARTER_GIB}
                  </div>
                  <div style={{ marginBottom: 8, color: "#c5d4e3" }}>{OLLAMA_MODELS_DISK_HINT}</div>
                  {LOCAL_SETUP_NETWORK_AND_POWER_HINT}
                  <div style={{ marginTop: 8 }}>
                    Install uses the official script; if it fails in this environment, finish in Desktop Konsole and retry
                    here for pulls only.
                  </div>
                </>
              ) : isUpdateInstalled ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    Re-runs the official Ollama installer, then re-pulls each model already installed on this Deck so
                    newer weights are fetched when upstream changed.
                  </div>
                  <div style={{ marginBottom: 8, color: "#c5d4e3" }}>{OLLAMA_MODELS_DISK_HINT}</div>
                  {LOCAL_SETUP_NETWORK_AND_POWER_HINT}
                  <div style={{ marginTop: 8 }}>
                    If nothing is installed yet, the update finishes after the binary refresh — use Starter or Full
                    Tier‑1 FOSS to pull models first.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 8 }}>
                    This pulls the full Tier‑1 FOSS union used by model chains: many consecutive downloads.{" "}
                    {LOCAL_SETUP_SIZE_TIER1_FULL_GIB}
                  </div>
                  <div style={{ marginBottom: 8, color: "#c5d4e3" }}>{OLLAMA_MODELS_DISK_HINT}</div>
                  {LOCAL_SETUP_NETWORK_AND_POWER_HINT}
                  <div style={{ marginTop: 8 }}>
                    Prefer stable Wi‑Fi; plan for long runtimes on slow links.
                  </div>
                </>
              )}
            </div>
          }
          strOKButtonText={
            isStarter
              ? "Start starter setup"
              : isUpdateInstalled
                ? "Start update"
                : "Start full Tier‑1 pull"
          }
          onOK={() => {
            setupAutoTestRanRef.current = false;
            onCompleteDeckyModalClose(() => handle.Close());
            void callDeckyWithTimeout<
              [{ profile: string }],
              {
                accepted?: boolean;
                reason?: string;
              }
            >("start_local_ollama_setup", [{ profile }], 15000)
              .then((out) => {
                if (!out?.accepted) {
                  toaster.toast({
                    title: "Setup not started",
                    body: out?.reason ?? "Unknown error.",
                    duration: 6000,
                  });
                  return;
                }
                toaster.toast({
                  title: "Local Ollama setup started",
                  body: "Pulls continue in the background (Ollama). You may close bonsAI; avoid sleep, reboot, Wi‑Fi off, or power loss until pulls finish.",
                  duration: 6000,
                });
                void callDeckyWithTimeout<[], LocalOllamaSetupStatus>("get_local_ollama_setup_status", [], DECKY_RPC_TIMEOUT_MS)
                  .then(setLocalSetupStatus)
                  .catch(() => {});
              })
              .catch((e: unknown) => {
                toaster.toast({
                  title: "Setup RPC failed",
                  body: formatDeckyRpcError(e),
                  duration: 6000,
                });
              });
          }}
          onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
        />
      );
    },
    [localSetupBusy, onBeforeDeckyModal, onCompleteDeckyModalClose]
  );

  useEffect(() => {
    if (!ollamaLocalOnDeck) {
      setLocalSetupStatus(null);
      setupAutoTestRanRef.current = false;
      return;
    }
    let id: number | undefined;
    const poll = () => {
      void callDeckyWithTimeout<[], LocalOllamaSetupStatus>(
        "get_local_ollama_setup_status",
        [],
        DECKY_RPC_TIMEOUT_MS
      )
        .then(setLocalSetupStatus)
        .catch(() => {});
    };
    poll();
    id = window.setInterval(poll, 1500);
    return () => window.clearInterval(id);
  }, [ollamaLocalOnDeck]);

  useEffect(() => {
    if (!ollamaLocalOnDeck || !localSetupStatus) return;
    if (localSetupStatus.phase === "running") {
      setupAutoTestRanRef.current = false;
      return;
    }
    if (localSetupStatus.phase === "done" && localSetupStatus.done !== false && !setupAutoTestRanRef.current && !(localSetupStatus.error ?? "").trim()) {
      setupAutoTestRanRef.current = true;
      toaster.toast({
        title: "Local Ollama setup complete",
        body: "Running connection test.",
        duration: 4000,
      });
      void onTestConnectionRef.current();
    }
  }, [ollamaLocalOnDeck, localSetupStatus]);

  const toggleAccentIntensityMenu = useCallback(() => {
    if (accentIntensityMenuToggleOnceRef.current) return;
    accentIntensityMenuToggleOnceRef.current = true;
    setAccentIntensityMenuOpen((o) => !o);
    requestAnimationFrame(() => {
      accentIntensityMenuToggleOnceRef.current = false;
    });
  }, []);
  const closeAccentIntensityMenu = useCallback(() => setAccentIntensityMenuOpen(false), []);
  const focusAccentIntensityTrigger = useCallback((): boolean => {
    const btn = accentIntensityMenuAnchorRef.current?.querySelector<HTMLElement>("button.bonsai-accent-intensity-trigger");
    if (!btn) return false;
    btn.focus();
    return true;
  }, []);

  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
      <PanelSection title="Where AI runs">
        <PanelSectionRow>
          <div
            ref={ollamaLocalToggleNavRef}
            className="bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <ToggleField
              label="Run AI on this Deck"
              checked={ollamaLocalOnDeck}
              onChange={(c) => setOllamaLocalOnDeck(c)}
            />
            <div
              className="bonsai-prose"
              style={{
                fontSize: 10,
                color: "#9fb7d5",
                lineHeight: 1.35,
                marginTop: 4,
                userSelect: "none",
              }}
            >
              Off: use a PC on your home network. On: AI runs on this device.
            </div>
          </div>
        </PanelSectionRow>
        {ollamaLocalOnDeck ? (
          <PanelSectionRow>
            <Focusable
              className="bonsai-settings-bleed"
              flow-children="vertical"
              style={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                className="bonsai-prose"
                style={{ fontSize: 11, color: "#b8c6d6", fontWeight: 600, letterSpacing: "0.03em", userSelect: "none" }}
              >
                Local Ollama setup
                {connectionStatus?.reachable && Array.isArray(connectionStatus.models) ? (
                  <span style={{ fontWeight: 400, color: "#9fb7d5", marginLeft: 8 }}>
                    Installed: {connectionStatus.models.length}
                  </span>
                ) : null}
              </div>
              <Focusable flow-children="horizontal" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" }}>
                <Button
                  disabled={localSetupBusy}
                  onClick={() => {
                    onBeforeDeckyModal();
                    onOpenPullModels();
                  }}
                  style={{
                    flex: "1 1 160px",
                    minHeight: 36,
                    minWidth: 0,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "1px solid rgba(56,189,248,0.45)",
                    background: localSetupBusy
                      ? "rgba(14,32,48,0.5)"
                      : "linear-gradient(180deg, rgba(56,189,248,0.15) 0%, rgba(14,116,144,0.28) 100%)",
                    color: "#e0f2fe",
                  }}
                  aria-label="Browse and pull Ollama models"
                >
                  Browse models…
                </Button>
              </Focusable>
              <Focusable flow-children="horizontal" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" }}>
                <Button
                  disabled={localSetupBusy}
                  onClick={() => setLocalInstallMenuOpen((o) => !o)}
                  style={{
                    flex: "1 1 140px",
                    minHeight: 36,
                    minWidth: 0,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: localInstallMenuOpen
                      ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)",
                    color: "#e8eef5",
                  }}
                  aria-expanded={localInstallMenuOpen}
                  aria-label="Install model bundles"
                >
                  Install options…
                </Button>
                <Button
                  disabled={localSetupBusy}
                  onClick={() => openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED)}
                  style={{
                    flex: "1 1 160px",
                    minHeight: 36,
                    minWidth: 0,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "1px solid rgba(56,189,248,0.55)",
                    background: localSetupBusy
                      ? "rgba(14,32,48,0.5)"
                      : "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)",
                    color: "#e0f2fe",
                  }}
                  aria-label="Update AI engine and installed models"
                >
                  Update AI & models
                </Button>
                {localInstallMenuOpen ? (
                  <Focusable
                    flow-children="vertical"
                    style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}
                  >
                    <Button
                      disabled={localSetupBusy}
                      onClick={() => {
                        setLocalInstallMenuOpen(false);
                        openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_STARTER);
                      }}
                      style={{ width: "100%", minHeight: 34, fontSize: 11, fontWeight: 600 }}
                      aria-label="Install starter models"
                    >
                      Install starter models
                    </Button>
                    <Button
                      disabled={localSetupBusy}
                      onClick={() => {
                        setLocalInstallMenuOpen(false);
                        openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_TIER1_FOSS_FULL);
                      }}
                      style={{ width: "100%", minHeight: 34, fontSize: 11, fontWeight: 600 }}
                      aria-label="Install full model set"
                    >
                      Install full model set
                    </Button>
                  </Focusable>
                ) : null}
                {localSetupBusy ? (
                  <Button
                    onClick={() => void cancelLocalSetup()}
                    style={{
                      flex: "0 1 auto",
                      minHeight: 36,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 4,
                      border: "1px solid rgba(248,113,113,0.45)",
                      background: "rgba(48,24,26,0.65)",
                      color: "#fecaca",
                    }}
                    aria-label="Cancel local Ollama setup"
                  >
                    Cancel
                  </Button>
                ) : null}
              </Focusable>
              {(localSetupStatus?.phase === "running" ||
                (localSetupStatus?.log_tail?.length ?? 0) > 0 ||
                localSetupStatus?.phase === "failed" ||
                localSetupStatus?.phase === "cancelled") &&
              localSetupStatus ? (
                <>
                  {localSetupStatus.phase === "running" ? (
                    <div
                      className="bonsai-settings-bleed"
                      style={{
                        fontSize: 11,
                        color: "#9ce7ff",
                        lineHeight: 1.4,
                      }}
                      aria-live="polite"
                    >
                      {formatLocalSetupStageLine(localSetupStatus)}
                    </div>
                  ) : null}
                  {(localSetupStatus.phase === "failed" || localSetupStatus.phase === "cancelled") &&
                  localSetupStatus.error ? (
                    <div
                      className="bonsai-prose bonsai-settings-bleed"
                      style={{ fontSize: 11, color: "tomato", lineHeight: 1.35, whiteSpace: "pre-wrap" }}
                      aria-live="polite"
                    >
                      {localSetupStatus.error}
                    </div>
                  ) : null}
                  {(localSetupStatus.log_tail?.length ?? 0) > 0 ? (
                    <pre
                      className="bonsai-settings-bleed"
                      style={{
                        margin: 0,
                        width: "100%",
                        boxSizing: "border-box",
                        maxHeight: 200,
                        overflowY: "auto",
                        fontFamily: "Consolas, 'Liberation Mono', monospace",
                        fontSize: 10,
                        lineHeight: 1.35,
                        color: "#aab8ca",
                        background: "rgba(8,14,22,0.85)",
                        border: "1px solid rgba(72,98,124,0.35)",
                        borderRadius: 4,
                        padding: "8px 10px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                      tabIndex={0}
                      aria-label="Local Ollama setup log"
                    >
                      {(localSetupStatus.log_tail ?? []).join("\n")}
                    </pre>
                  ) : localSetupBusy ? (
                    <div className="bonsai-prose" style={{ fontSize: 10, color: "#6b7c90", userSelect: "none" }}>
                      Setup is running. Log lines fill in as the installer or <code>ollama pull</code> prints output (first
                      line can take a moment after you confirm).
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="bonsai-prose" style={{ fontSize: 10, color: "#6b7c90", userSelect: "none" }}>
                  Install the official daemon, restart the service if needed, then pull models. Prefer stable Wi‑Fi.
                </div>
              )}
            </Focusable>
          </PanelSectionRow>
        ) : null}
        {!ollamaLocalOnDeck && namedOllamaHosts.length > 0 ? (
          <PanelSectionRow>
            <div style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6 }}>Saved Ollama hosts (LAN)</div>
            <Focusable flow-children="horizontal" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {namedOllamaHosts.map((entry) => (
                <Button
                  key={`${entry.label}-${entry.host}`}
                  onClick={() => {
                    onOllamaIpChange(entry.host);
                    onPersistOllamaIp(entry.host);
                  }}
                  style={{ minHeight: 32, fontSize: 11 }}
                >
                  {entry.label}
                </Button>
              ))}
            </Focusable>
          </PanelSectionRow>
        ) : null}
        {!ollamaLocalOnDeck ? (
          <PanelSectionRow>
            <Button
              disabled={!ollamaIp.trim() || namedOllamaHosts.length >= MAX_NAMED_OLLAMA_HOSTS}
              onClick={() => {
                const host = ollamaIp.trim();
                if (!host) return;
                const label = host.length > 24 ? `${host.slice(0, 21)}…` : host;
                setNamedOllamaHosts((prev) => {
                  const next = prev.filter((h) => h.host !== host);
                  next.push({ label, host });
                  return next.slice(-MAX_NAMED_OLLAMA_HOSTS);
                });
                toaster.toast({ title: "Host saved", body: label, duration: 2500 });
              }}
              style={{ width: "100%", minHeight: 34 }}
            >
              Save current PC address as quick host
            </Button>
          </PanelSectionRow>
        ) : null}
        <PanelSectionRow>
          <div
            ref={ollamaIpConnectionNavRef}
            className="bonsai-settings-connection-host bonsai-settings-bleed"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <Focusable
              className="bonsai-settings-connection-row"
              flow-children="horizontal"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 8,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              {!ollamaLocalOnDeck ? (
                <div
                  style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontVariant: "small-caps",
                      letterSpacing: "0.06em",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#b8c6d6",
                      marginBottom: 2,
                    }}
                  >
                    PC address
                  </div>
                  <TextField
                    label=""
                    value={ollamaIp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOllamaIpChange(e.target.value)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      maxWidth: "100%",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="bonsai-prose"
                  style={{
                    flex: "1 1 auto",
                    fontSize: 11,
                    color: "#b8c6d6",
                    lineHeight: 1.35,
                    paddingBottom: 8,
                  }}
                >
                  Ollama runs on this Deck at <span style={{ color: "#9ce7ff" }}>127.0.0.1:11434</span>
                </div>
              )}
              <Button
                onClick={onTestConnection}
                disabled={connectionTesting || localSetupBusy || (!ollamaLocalOnDeck && !ollamaIp.trim())}
                style={{
                  flex: ollamaLocalOnDeck ? "1 1 100%" : "0 0 auto",
                  alignSelf: "flex-end",
                  marginBottom: 2,
                  minHeight: 38,
                  minWidth: ollamaLocalOnDeck ? 0 : 68,
                  width: ollamaLocalOnDeck ? "100%" : undefined,
                  height: 38,
                  maxWidth: ollamaLocalOnDeck ? "100%" : 68,
                  padding: "0 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                  color: "#e8eef5",
                }}
                aria-label={connectionTesting ? "Testing Ollama connection" : "Test connection to Ollama"}
              >
                {connectionTesting ? "…" : "Test connection"}
              </Button>
              {!ollamaLocalOnDeck ? (
                <Button
                  onClick={openMdnsDiscoveryConfirm}
                  disabled={mdnsDiscovering || connectionTesting || localSetupBusy}
                  style={{
                    flex: "0 0 auto",
                    alignSelf: "flex-end",
                    marginBottom: 2,
                    minHeight: 38,
                    minWidth: 0,
                    height: 38,
                    maxWidth: 88,
                    padding: "0 4px",
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#c8d4e0",
                  }}
                  aria-label={mdnsDiscovering ? "Searching LAN for Ollama" : "Find Ollama on LAN via mDNS"}
                >
                  {mdnsDiscovering ? "…" : "Find LAN"}
                </Button>
              ) : null}
            </Focusable>
            {!ollamaLocalOnDeck ? (
              <div
                className="bonsai-prose"
                style={{
                  fontSize: 10,
                  color: "#6b7c90",
                  lineHeight: 1.35,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                title="Network address of this Steam Deck (informational)"
                aria-live="polite"
              >
                {"This Deck's IP: "}
                <span style={{ color: "#8fa0b4", fontVariantNumeric: "tabular-nums" }}>{deckIp}</span>
              </div>
            ) : null}
          </div>
        </PanelSectionRow>
        {!ollamaLocalOnDeck && mdnsHosts.length > 0 ? (
          <PanelSectionRow>
            <div style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6 }}>Found on LAN (mDNS)</div>
            <Focusable flow-children="vertical" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mdnsHosts.map((entry) => (
                <Focusable
                  key={`${entry.label}-${entry.host}`}
                  flow-children="horizontal"
                  style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                >
                  <Button
                    onClick={() => {
                      onOllamaIpChange(entry.host);
                      onPersistOllamaIp(entry.host);
                      toaster.toast({
                        title: "PC address set",
                        body: entry.host,
                        duration: 2500,
                      });
                    }}
                    style={{ minHeight: 32, fontSize: 11, flex: "1 1 auto" }}
                  >
                    Use {entry.label}
                    {entry.verified ? " ✓" : ""}
                  </Button>
                  <Button
                    disabled={namedOllamaHosts.length >= MAX_NAMED_OLLAMA_HOSTS}
                    onClick={() => {
                      const host = entry.host.trim();
                      const label =
                        entry.label.length > 24 ? `${entry.label.slice(0, 21)}…` : entry.label || host;
                      setNamedOllamaHosts((prev) => {
                        const next = prev.filter((h) => h.host !== host);
                        next.push({ label, host });
                        return next.slice(-MAX_NAMED_OLLAMA_HOSTS);
                      });
                      onOllamaIpChange(host);
                      onPersistOllamaIp(host);
                      toaster.toast({ title: "Host saved", body: label, duration: 2500 });
                    }}
                    style={{ minHeight: 32, fontSize: 10 }}
                  >
                    Save
                  </Button>
                </Focusable>
              ))}
            </Focusable>
          </PanelSectionRow>
        ) : null}
        {!ollamaLocalOnDeck && mdnsDiscoveryMessage ? (
          <PanelSectionRow>
            <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 11, color: "#8fa0b4" }}>
              {mdnsDiscoveryMessage}
            </div>
          </PanelSectionRow>
        ) : null}
        {connectionStatus && (
          <PanelSectionRow>
            {connectionStatus.reachable ? (
              <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#81c784" }}>
                <div>
                  Connected · Ollama v{connectionStatus.version}
                  {connectionStatus.models && connectionStatus.models.length > 0
                    ? ` · ${connectionStatus.models.length} model${connectionStatus.models.length === 1 ? "" : "s"}`
                    : ""}
                </div>
                {connectionStatus.recovery_attempted ? (
                  <div className="bonsai-prose" style={{ fontSize: 10, color: "#7d8fa3", marginTop: 4 }}>
                    Started or woke the local AI service for this check.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 12, color: "tomato" }}>
                Unreachable — {connectionStatus.error}
              </div>
            )}
          </PanelSectionRow>
        )}
      </PanelSection>
      <PanelSection title="Screenshot quality">
        <PanelSectionRow>
          <div
            ref={screenshotDimensionNavRef}
            className="bonsai-prose-host bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13 }}>Screenshot quality</div>
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              For vision questions — lower quality uses less memory.
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {SCREENSHOT_ATTACHMENT_PRESET_OPTIONS.map((option) => {
                const active = option === screenshotAttachmentPreset;
                return (
                  <Button
                    key={`preset-${option}`}
                    onClick={() => setScreenshotAttachmentPreset(option)}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 4px",
                      borderRadius: 4,
                      border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#f0f4f8" : "#9fb0c0",
                      boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                    }}
                    aria-label={`Set screenshot quality to ${screenshotPresetLabel[option]}`}
                  >
                    {screenshotPresetLabel[option]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Remember what I typed">
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {persistenceModeDescription[unifiedInputPersistenceMode]}
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {persistenceModeOptions.map((mode) => {
                const active = mode === unifiedInputPersistenceMode;
                return (
                  <Button
                    key={mode}
                    onClick={() => {
                      setUnifiedInputPersistenceMode(mode);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 4px",
                      borderRadius: 4,
                      border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#f0f4f8" : "#9fb0c0",
                      boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                    }}
                    aria-label={`${persistenceModeLabel[mode]}: ${persistenceModeDescription[mode]}`}
                  >
                    {persistenceModeShortLabel[mode]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Story spoilers (Strategy mode)">
        <PanelSectionRow>
          <ToggleField
            label="Hide spoilers until I tap"
            description="Strategy mode masks spoiler sections until you choose to reveal them."
            checked={strategySpoilerMaskingEnabled}
            onChange={(checked) => setStrategySpoilerMaskingEnabled(checked)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Open spoilers after I opt in on an Ask"
            description="When you consent on an Ask, spoiler sections start expanded (you can still collapse them)."
            checked={strategySpoilerAutoRevealAfterConsent}
            onChange={(checked) => setStrategySpoilerAutoRevealAfterConsent(checked)}
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="AI voice & personality">
        <PanelSectionRow>
          <div
            className="bonsai-settings-ai-character-block"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <ToggleField
              label="AI voice & personality"
              description="Preset, random, or custom character tone in replies."
              checked={aiCharacterEnabled}
              onChange={(checked) => setAiCharacterEnabled(checked)}
            />
            {aiCharacterEnabled && (
              <>
                <Button
                  className="bonsai-ai-character-picker-open"
                  onClick={() => onOpenCharacterPicker()}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    minHeight: 38,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                    color: "#e8eef5",
                    textAlign: "left",
                  }}
                >
                  {formatAiCharacterSelectionLine({
                    random: aiCharacterRandom,
                    presetId: aiCharacterPresetId,
                    customText: aiCharacterCustomText,
                  })}
                </Button>
                <div
                  className={
                    "bonsai-settings-inline-menu-host" +
                    (accentIntensityMenuOpen ? " bonsai-settings-accent-menu-open" : "")
                  }
                  style={{ marginTop: 12, width: "100%", maxWidth: "100%", minWidth: 0, position: "relative" }}
                >
                  <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    Accent intensity
                  </div>
                  <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
                    {
                      AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)
                        ?.shortLabel ?? ""
                    }{" "}
                    — use the menu for full descriptions.
                  </div>
                  <div ref={accentIntensityMenuAnchorRef} style={{ display: "inline-flex", flexShrink: 0, position: "relative" }}>
                    <Button
                      className="bonsai-accent-intensity-trigger"
                      {...({
                        onOKButton: (evt: { stopPropagation: () => void }) => {
                          evt.stopPropagation();
                          toggleAccentIntensityMenu();
                        },
                      } as Record<string, unknown>)}
                      onClick={toggleAccentIntensityMenu}
                      aria-expanded={accentIntensityMenuOpen}
                      aria-haspopup="menu"
                      aria-label={`Accent intensity: ${
                        AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)
                          ?.shortLabel ?? ""
                      }`}
                      style={{
                        minHeight: 26,
                        padding: "4px 8px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        borderRadius: 3,
                        border: `1px solid ${accentIntensityOutline[aiCharacterAccentIntensity]}`,
                        background: "transparent",
                        color: ASK_LABEL_COLOR_50,
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        fontVariant: "small-caps",
                        letterSpacing: 0.1,
                        lineHeight: 1,
                      }}
                    >
                      <span>
                        {AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)
                          ?.shortLabel ?? ""}
                      </span>
                      <span style={{ color: "#7a8fa3", fontSize: 9, lineHeight: 1 }} aria-hidden>
                        ▾
                      </span>
                    </Button>
                    <SettingsTabAccentIntensityMenuPopover
                      open={accentIntensityMenuOpen}
                      firstMenuItemRef={accentIntensityMenuFirstItemRef}
                      selectedId={aiCharacterAccentIntensity}
                      onSelect={(id) => setAiCharacterAccentIntensity(id)}
                      onRequestClose={closeAccentIntensityMenu}
                      onFocusTrigger={focusAccentIntensityTrigger}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Data">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Show Developer tab"
              description="Adds a Developer tab with logs, exports, and advanced tuning. Default off."
              checked={showDeveloperTab}
              onChange={(checked) => setShowDeveloperTab(checked)}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>
      <Focusable
        className="bonsai-settings-cache-row"
        flow-children="horizontal"
        style={{
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "row",
          gap: 8,
        }}
      >
        <Button
          onClick={() => {
            onBeforeDeckyModal();
            const handle = showModal(
              <ConfirmModal
                strTitle="Clear session cache?"
                strDescription="Clears this session from RAM: input, reply, thread, transparency, branches, attachments, timers. Does not change settings.json, Ollama, or image files on disk."
                strOKButtonText="Clear"
                onOK={() => {
                  onResetSession();
                  onCompleteDeckyModalClose(() => handle.Close());
                }}
                onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
              />
            );
          }}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 38,
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
            color: "#e8eef5",
            boxSizing: "border-box",
          }}
        >
          Clear cache...
        </Button>
        <Button
          onClick={() => {
            onBeforeDeckyModal();
            const handle = showModal(
              <ConfirmModal
                strTitle="Clear all plugin data?"
                strDescription={
                  "This resets bonsAI like a fresh install for this device.\n\n" +
                  "It deletes saved settings and permissions, runtime cache and plugin logs under Decky, " +
                  "and clears the Ollama host field, safety disclaimer flag, and unified-input persistence stored in the plugin browser.\n\n" +
                  "It does not delete Desktop logs under bonsAI_logs.\n\n" +
                  "Afterward, set your Ollama host again and re-enable any permissions you need."
                }
                strOKButtonText="Clear all data"
                onOK={() => {
                  void Promise.resolve(onClearAllPluginData()).finally(() => {
                    onCompleteDeckyModalClose(() => handle.Close());
                  });
                }}
                onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
              />
            );
          }}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 38,
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
            color: "#e8eef5",
            boxSizing: "border-box",
          }}
        >
          Clear all data...
        </Button>
      </Focusable>
    </div>
  );
};
