import React, { useCallback, useEffect, useRef, useState } from "react";
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
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP,
  SCREENSHOT_ATTACHMENT_PRESET_OPTIONS,
  type OllamaKeepAliveDuration,
  type ScreenshotAttachmentPreset,
  type UnifiedInputPersistenceMode,
} from "../utils/settingsAndResponse";
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "../data/aiCharacterAccentIntensity";
import { formatAiCharacterSelectionLine } from "../data/characterCatalog";
import { SettingsTabConnectionTimeoutSlider } from "./SettingsTabConnectionTimeoutSlider";
import { SettingsTabOllamaKeepAliveSlider } from "./SettingsTabOllamaKeepAliveSlider";
import { SettingsTabAccentIntensityMenuPopover } from "./SettingsTabAccentIntensityMenuPopover";
import { ASK_LABEL_COLOR_50 } from "../features/unified-input/constants";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";

const TEST_CONNECTION_TIMEOUT_SECONDS = 10;
/** Loopback probes may start systemd / ``ollama serve``; Decky RPC must outlive nested waits. */
const LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS = 42000;

const LOCAL_OLLAMA_SETUP_PROFILE_STARTER = "starter";
const LOCAL_OLLAMA_SETUP_PROFILE_TIER1_FOSS_FULL = "tier1_foss_full";

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

type ConnectionStatus = {
  reachable: boolean;
  version?: string;
  models?: string[];
  /** Ollama /api/ps while models are loaded (size_vram vs size ≈ GPU-visible weight share). */
  ps_loaded?: Array<{
    name: string;
    size_bytes: number;
    size_vram_bytes: number;
    vram_weight_share_pct_appx: number | null;
  }>;
  error?: string;
  /** Backend attempted to wake localhost Ollama (Connection Test loopback failure path). */
  recovery_attempted?: boolean;
  recovery_succeeded_before_retry?: boolean | null;
};

const persistenceModeLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Persist all text",
  persist_search_only: "Persist search-only",
  no_persist: "No persistence",
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
  persist_all: "Restore all unified input text, including AI prompts.",
  persist_search_only: "Restore only text that matches settings search results.",
  no_persist: "Never restore unified input text on reopen.",
};
const screenshotPresetLabel: Record<ScreenshotAttachmentPreset, string> = {
  low: "Low",
  mid: "Mid",
  max: "Max",
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

  latencyWarningSeconds: number;
  requestTimeoutSeconds: number;
  latencyTimeoutsCustomEnabled: boolean;
  setLatencyTimeoutsCustomEnabled: (v: boolean) => void;
  setLatencyWarningSeconds: (v: number) => void;
  setRequestTimeoutSeconds: (v: number) => void;

  ollamaKeepAlive: OllamaKeepAliveDuration;
  setOllamaKeepAlive: (v: OllamaKeepAliveDuration) => void;

  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  setScreenshotAttachmentPreset: (v: ScreenshotAttachmentPreset) => void;

  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  setUnifiedInputPersistenceMode: (v: UnifiedInputPersistenceMode) => void;

  presetChipFadeAnimationEnabled: boolean;
  setPresetChipFadeAnimationEnabled: (v: boolean) => void;

  aiCharacterEnabled: boolean;
  setAiCharacterEnabled: (v: boolean) => void;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  setAiCharacterAccentIntensity: (v: AiCharacterAccentIntensityId) => void;

  showDebugTab: boolean;
  setShowDebugTab: (v: boolean) => void;
  desktopDebugNoteAutoSave: boolean;
  setDesktopDebugNoteAutoSave: (v: boolean) => void;
  desktopAskVerboseLogging: boolean;
  setDesktopAskVerboseLogging: (v: boolean) => void;

  onOpenCharacterPicker: () => void;
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
  latencyWarningSeconds,
  requestTimeoutSeconds,
  latencyTimeoutsCustomEnabled,
  setLatencyTimeoutsCustomEnabled,
  setLatencyWarningSeconds,
  setRequestTimeoutSeconds,
  ollamaKeepAlive,
  setOllamaKeepAlive,
  screenshotAttachmentPreset,
  setScreenshotAttachmentPreset,
  unifiedInputPersistenceMode,
  setUnifiedInputPersistenceMode,
  presetChipFadeAnimationEnabled,
  setPresetChipFadeAnimationEnabled,
  aiCharacterEnabled,
  setAiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  aiCharacterAccentIntensity,
  setAiCharacterAccentIntensity,
  showDebugTab,
  setShowDebugTab,
  desktopDebugNoteAutoSave,
  setDesktopDebugNoteAutoSave,
  desktopAskVerboseLogging,
  setDesktopAskVerboseLogging,
  onOpenCharacterPicker,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onResetSession,
  onClearAllPluginData,
}) => {
  const [deckIp, setDeckIp] = useState<string>("...");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [localSetupStatus, setLocalSetupStatus] = useState<LocalOllamaSetupStatus | null>(null);
  const setupAutoTestRanRef = useRef(false);
  const onTestConnectionRef = useRef<() => Promise<void>>(async () => {});

  const [accentIntensityMenuOpen, setAccentIntensityMenuOpen] = useState(false);
  const accentIntensityMenuAnchorRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuFirstItemRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuToggleOnceRef = useRef(false);

  const ollamaKeepAliveThumbHostRef = useRef<HTMLDivElement>(null);
  const screenshotDimensionNavRef = useRef<HTMLDivElement>(null);
  const ollamaIpConnectionNavRef = useRef<HTMLDivElement>(null);
  const ollamaLocalToggleNavRef = useRef<HTMLDivElement>(null);
  const latencyWarningThumbHostRef = useRef<HTMLDivElement>(null);

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
      if (result.reachable && !ollamaLocalOnDeck) onPersistOllamaIp(target);
    } catch (e: unknown) {
      setConnectionStatus({ reachable: false, error: formatDeckyRpcError(e) });
    } finally {
      setConnectionTesting(false);
    }
  };

  onTestConnectionRef.current = onTestConnection;

  const localSetupBusy = localSetupStatus?.phase === "running";

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
    (profile: typeof LOCAL_OLLAMA_SETUP_PROFILE_STARTER | typeof LOCAL_OLLAMA_SETUP_PROFILE_TIER1_FOSS_FULL) => {
      if (localSetupBusy) return;
      const isStarter = profile === LOCAL_OLLAMA_SETUP_PROFILE_STARTER;
      onBeforeDeckyModal();
      const handle = showModal(
        <ConfirmModal
          strTitle={isStarter ? "Set up starter models?" : "Pull full Tier‑1 FOSS set?"}
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
          strOKButtonText={isStarter ? "Start starter setup" : "Start full Tier‑1 pull"}
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

  const focusScreenshotMaxDimensionFromSlider = useCallback((): boolean => {
    const root = screenshotDimensionNavRef.current;
    if (!root) return false;
    const btn = root.querySelector<HTMLElement>('button[aria-label^="Set screenshot attachment"]');
    if (!btn) return false;
    btn.focus();
    return true;
  }, []);
  const focusOllamaKeepAliveThumb = useCallback((): boolean => {
    const host = ollamaKeepAliveThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);
  /** When local Ollama is on, timeout slider D-pad up should not focus a disabled IP field. */
  const focusOllamaRoutingFromTimeoutSlider = useCallback((): boolean => {
    if (ollamaLocalOnDeck) {
      const root = ollamaLocalToggleNavRef.current;
      if (!root) return false;
      const toggle = root.querySelector<HTMLElement>('button[role="switch"], [role="switch"], button');
      if (!toggle) return false;
      toggle.focus();
      return true;
    }
    const root = ollamaIpConnectionNavRef.current;
    if (!root) return false;
    const field = root.querySelector<HTMLElement>("input, textarea");
    if (!field) return false;
    field.focus();
    return true;
  }, [ollamaLocalOnDeck]);
  const focusSoftWarningFromScreenshot = useCallback((): boolean => {
    const host = latencyWarningThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
      <PanelSection title="Connection">
        <PanelSectionRow>
          <div
            ref={ollamaLocalToggleNavRef}
            className="bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <ToggleField
              label="Ollama on this Deck (local)"
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
              Off: use a PC on your LAN. On: Ollama runs on this device at {OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP}.
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
              </div>
              <Focusable flow-children="horizontal" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" }}>
                <Button
                  disabled={localSetupBusy}
                  onClick={() => openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_STARTER)}
                  style={{
                    flex: "1 1 140px",
                    minHeight: 36,
                    minWidth: 0,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: localSetupBusy
                      ? "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)",
                    color: "#e8eef5",
                  }}
                  aria-label="Set up starter Ollama models"
                >
                  Starter (README)
                </Button>
                <Button
                  disabled={localSetupBusy}
                  onClick={() => openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_TIER1_FOSS_FULL)}
                  style={{
                    flex: "1 1 160px",
                    minHeight: 36,
                    minWidth: 0,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "1px solid rgba(251,146,60,0.45)",
                    background: localSetupBusy
                      ? "rgba(48,32,14,0.5)"
                      : "linear-gradient(180deg, rgba(251,146,60,0.22) 0%, rgba(120,53,15,0.35) 100%)",
                    color: "#fef3c7",
                  }}
                  aria-label="Pull full Tier-1 FOSS model set"
                >
                  Full Tier‑1 FOSS
                </Button>
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
              <div
                style={{
                  flex: "0 1 172px",
                  width: 172,
                  maxWidth: "172px",
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
                  OLLAMA IP ADDRESS
                </div>
                <TextField
                  label=""
                  value={ollamaIp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOllamaIpChange(e.target.value)}
                  disabled={ollamaLocalOnDeck}
                  style={{
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    ...(ollamaLocalOnDeck ? { opacity: 0.55 } : undefined),
                  }}
                />
              </div>
              <Button
                onClick={onTestConnection}
                disabled={connectionTesting || localSetupBusy || (!ollamaLocalOnDeck && !ollamaIp.trim())}
                style={{
                  flex: "1 1 auto",
                  alignSelf: "flex-end",
                  marginBottom: 2,
                  minHeight: 38,
                  minWidth: 0,
                  height: 38,
                  maxWidth: 68,
                  padding: "0 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                  color: "#e8eef5",
                }}
                aria-label={connectionTesting ? "Testing Ollama connection" : "Test connection to Ollama"}
              >
                {connectionTesting ? "…" : "Test"}
              </Button>
            </Focusable>
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
          </div>
        </PanelSectionRow>
        {connectionStatus && (
          <PanelSectionRow>
            {connectionStatus.reachable ? (
              <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#81c784" }}>
                <div>Connected — Ollama v{connectionStatus.version}</div>
                {connectionStatus.recovery_attempted ? (
                  <div className="bonsai-prose" style={{ fontSize: 10, color: "#7d8fa3", marginTop: 4 }}>
                    Started or woke the local Ollama listener for this check.
                  </div>
                ) : null}
                {connectionStatus.ps_loaded && connectionStatus.ps_loaded.length > 0 ? (
                  <div className="bonsai-prose" style={{ color: "#b8dfe8", marginTop: 6, lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Loaded now (GET /api/ps) — approximate GPU-visible weight share
                    </div>
                    {connectionStatus.ps_loaded.map((m) => (
                      <div key={m.name} style={{ marginBottom: 6 }}>
                        <span style={{ color: "#9ce7ff" }}>{m.name}</span>
                        {m.vram_weight_share_pct_appx != null ? (
                          <>
                            {": "}
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                              ~{m.vram_weight_share_pct_appx}% in GPU-visible VRAM ({m.size_vram_bytes} / {m.size_bytes}
                              B)
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#9fb7d5" }}>: (no size split from Ollama)</span>
                        )}
                        {(m.size_vram_bytes === 0 ||
                          (m.vram_weight_share_pct_appx != null && m.vram_weight_share_pct_appx <= 0)) && (
                          <div style={{ fontSize: 10, color: "#7d8fa3", marginTop: 4 }}>
                            Ollama reports no GPU-visible weight bytes here (<span style={{ color: "#9ce7ff" }}>size_vram</span>{" "}
                            0 vs <span style={{ color: "#9ce7ff" }}>size</span>) — weights usually sit on CPU/system RAM
                            offload, not a bonsAI bug.
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: "#7d8fa3", marginTop: 6 }}>
                      Low % with very long generations often means CPU-heavy offload. Press Test during an active Ask (model
                      still loaded). Empty list here means nothing resident in Ollama memory yet.
                    </div>
                  </div>
                ) : (
                  <div className="bonsai-prose" style={{ color: "#7d8fa3", fontSize: 10, marginTop: 6, lineHeight: 1.38 }}>
                    /api/ps: no models loaded in Ollama memory right now — tap Test during generation to see size vs
                    size_vram.
                  </div>
                )}
                {connectionStatus.models && connectionStatus.models.length > 0 && (
                  <div
                    className="bonsai-prose"
                    style={{
                      color: "#9fb7d5",
                      marginTop: 4,
                      maxHeight: 88,
                      overflowY: "auto",
                      lineHeight: 1.35,
                    }}
                  >
                    Installed tags: {connectionStatus.models.join(", ")}
                  </div>
                )}
              </div>
            ) : (
              <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 12, color: "tomato" }}>
                Unreachable — {connectionStatus.error}
              </div>
            )}
          </PanelSectionRow>
        )}
      </PanelSection>
      <PanelSection title="Ollama host">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Custom timeouts"
              checked={latencyTimeoutsCustomEnabled}
              onChange={(c) => setLatencyTimeoutsCustomEnabled(c)}
            />
          </div>
        </PanelSectionRow>
        {!latencyTimeoutsCustomEnabled ? (
          <PanelSectionRow>
            <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 12, color: "#cdd9e6", lineHeight: 1.4 }}>
              Default:{" "}
              <span style={{ color: "#ffd299", fontWeight: 700 }}>Warning {DEFAULT_LATENCY_WARNING_SECONDS}s</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}> | </span>
              <span style={{ color: "#9ce7ff", fontWeight: 700 }}>Timeout {DEFAULT_REQUEST_TIMEOUT_SECONDS}s</span>
            </div>
          </PanelSectionRow>
        ) : (
          <PanelSectionRow>
            <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.35, marginBottom: 6 }}>
                <div>
                  <span style={{ color: "#ffd299", fontWeight: 700 }}>Warning</span>
                  {" = slow-reply nudge"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: "#9ce7ff", fontWeight: 700 }}>Timeout</span>
                  {" = abort if still busy"}
                </div>
              </div>
              <SettingsTabConnectionTimeoutSlider
                warningSec={latencyWarningSeconds}
                timeoutSec={requestTimeoutSeconds}
                onChange={(w, t) => {
                  setLatencyWarningSeconds(w);
                  setRequestTimeoutSeconds(t);
                }}
                warningThumbHostRef={latencyWarningThumbHostRef}
                onMoveDownFromThumb={focusOllamaKeepAliveThumb}
                onMoveUpFromTimeoutThumb={focusOllamaRoutingFromTimeoutSlider}
              />
            </div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div
              style={{
                fontVariant: "small-caps",
                letterSpacing: "0.06em",
                fontSize: 11,
                fontWeight: 600,
                color: "#b8c6d6",
                marginBottom: 4,
              }}
            >
              VRAM: Ollama keep_alive
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
              Time to keep model loaded in VRAM after a prompt
            </div>
            <SettingsTabOllamaKeepAliveSlider
              value={ollamaKeepAlive}
              onChange={setOllamaKeepAlive}
              thumbHostRef={ollamaKeepAliveThumbHostRef}
              onMoveUp={
                latencyTimeoutsCustomEnabled
                  ? () => focusSoftWarningFromScreenshot()
                  : () => focusOllamaRoutingFromTimeoutSlider()
              }
              onMoveDown={() => focusScreenshotMaxDimensionFromSlider()}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Screenshots">
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
              <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13 }}>Attachment quality (vision)</div>
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              Downscale image attachments to save memory.
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
                    {...({
                      onMoveUp: () => focusOllamaKeepAliveThumb(),
                    } as Record<string, unknown>)}
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
                    aria-label={`Set screenshot attachment to ${option}`}
                  >
                    {screenshotPresetLabel[option]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Saved text">
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Ask / search persistence</div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {persistenceModeLabel[unifiedInputPersistenceMode]} — what reloads when you reopen the plugin.
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
      <PanelSection title="Main tab">
        <PanelSectionRow>
          <ToggleField
            label="Preset chip fade animation"
            description="Off: no crossfade when suggestion chips update (re-seed after Ask unchanged)."
            checked={presetChipFadeAnimationEnabled}
            onChange={(checked) => setPresetChipFadeAnimationEnabled(checked)}
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Character">
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
              label="AI characters"
              description="Preset, random, or custom voice in system prompt."
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
      <PanelSection title="Advanced">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Show Debug tab"
              description="Add Debug tab: logs, errors, Steam Input jump. Default off."
              checked={showDebugTab}
              onChange={(checked) => setShowDebugTab(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Auto-save chat to Desktop notes"
              description="Append Q+A to Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md (UTC). Needs Filesystem writes."
              checked={desktopDebugNoteAutoSave}
              onChange={(checked) => setDesktopDebugNoteAutoSave(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Verbose Ask logging to Desktop notes"
              description="Append full Ollama trace (prompts, model, replies) to bonsai-ask-trace-*.md. Needs Filesystem writes; can be large/sensitive. Latest trace also on Main → Input handling."
              checked={desktopAskVerboseLogging}
              onChange={(checked) => setDesktopAskVerboseLogging(checked)}
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
                  "It does not delete Desktop notes under BonsAI_notes.\n\n" +
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
