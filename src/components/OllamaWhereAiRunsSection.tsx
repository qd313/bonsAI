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
  type NamedOllamaHost,
  MAX_NAMED_OLLAMA_HOSTS,
} from "../utils/settingsAndResponse";
import type { DeveloperConnectionStatus } from "./DeveloperTab";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import {
  consumeOllamaTabLocalPending,
  peekOllamaTabLocalPending,
  registerOllamaTabLocalGetter,
  unregisterOllamaTabLocalGetter,
} from "../utils/ollamaTabLocalSurvival";
import { notifyPullModelCatalogRefresh } from "../utils/pullModelCatalogRefresh";
import {
  TIER1_ESSENTIALS_TAG,
  TIER2_MULTIMODAL_TAG,
} from "../data/deckEssentialsTags";
import { disclosureSummaryForSourceClass } from "../data/modelPolicy";

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

const LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS = "tier1_essentials";
const LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL = "tier2_multimodal";
const LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED = "update_installed";

/** Shown in setup modals; align with `refactor_helpers.setup_recommended_pull_tags` sizes. */
const OLLAMA_MODELS_DISK_HINT =
  "Default model folder on this account: /home/deck/.ollama/models (override with the OLLAMA_MODELS environment variable if you moved the store).";
const LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB =
  "Rough download: about 3–4 GiB (one FOSS multimodal model — chat, screenshots, Strategy).";
const LOCAL_SETUP_SIZE_TIER2_MULTIMODAL_GIB =
  "Rough download: about 4–5 GiB (one Gemma 4 edge multimodal model).";

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

export type OllamaWhereAiRunsSectionProps = {
  ollamaIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;
  ollamaLocalOnDeck: boolean;
  setOllamaLocalOnDeck: (v: boolean) => void;
  onLastConnectionStatus?: (status: DeveloperConnectionStatus | null) => void;
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onOpenOllamaModelsHub: (opts?: { initialSection?: "policy" | "browse" | "advanced" }) => void;
  /** When user confirms Tier 2 one-model multimodal setup — bump policy tier before pull. */
  onApplyTier2MultimodalPolicy?: () => void | Promise<void>;
};

type ConnectionStatus = DeveloperConnectionStatus;

export const OllamaWhereAiRunsSection: React.FC<OllamaWhereAiRunsSectionProps> = ({
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  ollamaLocalOnDeck,
  setOllamaLocalOnDeck,
  onLastConnectionStatus,
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onOpenOllamaModelsHub,
  onApplyTier2MultimodalPolicy,
}) => {
  const [deckIp, setDeckIp] = useState<string>("...");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(
    () => peekOllamaTabLocalPending()?.connectionStatus ?? null
  );
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [mdnsDiscovering, setMdnsDiscovering] = useState(false);
  const [mdnsHosts, setMdnsHosts] = useState<MdnsOllamaHost[]>(
    () => peekOllamaTabLocalPending()?.mdnsHosts ?? []
  );
  const [mdnsDiscoveryMessage, setMdnsDiscoveryMessage] = useState<string | null>(
    () => peekOllamaTabLocalPending()?.mdnsDiscoveryMessage ?? null
  );
  const [localSetupStatus, setLocalSetupStatus] = useState<LocalOllamaSetupStatus | null>(null);
  const setupAutoTestRanRef = useRef(false);
  const lastCompletedSetupProfileRef = useRef<string>("");
  const onTestConnectionRef = useRef<() => Promise<void>>(async () => {});

  const ollamaIpConnectionNavRef = useRef<HTMLDivElement>(null);
  const ollamaLocalToggleNavRef = useRef<HTMLDivElement>(null);
  const [localInstallMenuOpen, setLocalInstallMenuOpen] = useState(
    () => peekOllamaTabLocalPending()?.localInstallMenuOpen ?? false
  );

  useLayoutEffect(() => {
    const local = consumeOllamaTabLocalPending();
    if (!local) return;
    setConnectionStatus(local.connectionStatus);
    setMdnsHosts(local.mdnsHosts);
    setMdnsDiscoveryMessage(local.mdnsDiscoveryMessage);
    setLocalInstallMenuOpen(local.localInstallMenuOpen);
  }, []);

  useEffect(() => {
    registerOllamaTabLocalGetter(() => ({
      connectionStatus,
      mdnsHosts,
      mdnsDiscoveryMessage,
      localInstallMenuOpen,
    }));
    return () => unregisterOllamaTabLocalGetter();
  }, [
    connectionStatus,
    mdnsHosts,
    mdnsDiscoveryMessage,
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
        | typeof LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS
        | typeof LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL
        | typeof LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED
    ) => {
      if (localSetupBusy) return;
      const isTier1 = profile === LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS;
      const isTier2 = profile === LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL;
      const isUpdateInstalled = profile === LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED;
      const tier2LicenseNote = disclosureSummaryForSourceClass("open_weight");
      onBeforeDeckyModal();
      const handle = showModal(
        <ConfirmModal
          strTitle={
            isTier1
              ? "Install Tier 1 essentials?"
              : isUpdateInstalled
                ? "Update Ollama and models?"
                : "Install Tier 2 one-model multimodal?"
          }
          strDescription={
            <div
              className="bonsai-prose"
              style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45, textAlign: "left" }}
            >
              {isTier1 ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    Pulls <span style={{ color: "#9ce7ff" }}>{TIER1_ESSENTIALS_TAG}</span> — one FOSS model for
                    chat, screenshots, OCR, and Strategy mode. {LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB}
                  </div>
                  <div style={{ marginBottom: 8, color: "#c5d4e3" }}>{OLLAMA_MODELS_DISK_HINT}</div>
                  {LOCAL_SETUP_NETWORK_AND_POWER_HINT}
                  <div style={{ marginTop: 8 }}>
                    Install uses the official script; if it fails in this environment, finish in Desktop Konsole and
                    retry here for pulls only.
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
                    If nothing is installed yet, the update finishes after the binary refresh — use Tier 1 essentials or
                    Tier 2 multimodal to pull a model first.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 8 }}>
                    Pulls <span style={{ color: "#9ce7ff" }}>{TIER2_MULTIMODAL_TAG}</span> (falls back to gemma4:e2b if
                    needed). {LOCAL_SETUP_SIZE_TIER2_MULTIMODAL_GIB}
                  </div>
                  <div style={{ marginBottom: 8, color: "#c5d4e3" }}>
                    bonsAI will switch Model policy to <strong>Tier 2 (open-weight)</strong> so this model is eligible
                    for Ask. {tier2LicenseNote}
                  </div>
                  <div style={{ marginBottom: 8, color: "#c5d4e3" }}>{OLLAMA_MODELS_DISK_HINT}</div>
                  {LOCAL_SETUP_NETWORK_AND_POWER_HINT}
                </>
              )}
            </div>
          }
          strOKButtonText={
            isTier1
              ? "Install Tier 1 essentials"
              : isUpdateInstalled
                ? "Start update"
                : "Install Tier 2 multimodal"
          }
          onOK={() => {
            setupAutoTestRanRef.current = false;
            lastCompletedSetupProfileRef.current = profile;
            onCompleteDeckyModalClose(() => handle.Close());
            const startSetup = () => {
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
                  void callDeckyWithTimeout<[], LocalOllamaSetupStatus>(
                    "get_local_ollama_setup_status",
                    [],
                    DECKY_RPC_TIMEOUT_MS
                  )
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
            };
            if (isTier2 && onApplyTier2MultimodalPolicy) {
              void Promise.resolve(onApplyTier2MultimodalPolicy()).then(startSetup);
            } else {
              startSetup();
            }
          }}
          onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
        />
      );
    },
    [localSetupBusy, onApplyTier2MultimodalPolicy, onBeforeDeckyModal, onCompleteDeckyModalClose]
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
      const wasUpdateInstalled =
        lastCompletedSetupProfileRef.current === LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED ||
        localSetupStatus.profile === LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED;
      if (wasUpdateInstalled) {
        notifyPullModelCatalogRefresh(true);
        void callDeckyWithTimeout<[{ force?: boolean }], { source?: string }>(
          "fetch_pull_model_catalog",
          [{ force: true }],
          DECKY_RPC_TIMEOUT_MS
        ).catch(() => {});
      }
      toaster.toast({
        title: "Local Ollama setup complete",
        body: wasUpdateInstalled ? "Running connection test and refreshing model catalog." : "Running connection test.",
        duration: 4000,
      });
      void onTestConnectionRef.current();
    }
  }, [ollamaLocalOnDeck, localSetupStatus]);

  return (
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
                    onOpenOllamaModelsHub({ initialSection: "browse" });
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
                        openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS);
                      }}
                      style={{ width: "100%", minHeight: 34, fontSize: 11, fontWeight: 600 }}
                      aria-label="Install Tier 1 essentials"
                    >
                      Install Tier 1 essentials
                    </Button>
                    <Button
                      disabled={localSetupBusy}
                      onClick={() => {
                        setLocalInstallMenuOpen(false);
                        openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL);
                      }}
                      style={{ width: "100%", minHeight: 34, fontSize: 11, fontWeight: 600 }}
                      aria-label="Install Tier 2 one-model multimodal"
                    >
                      Install Tier 2 one-model multimodal
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
  );
};
