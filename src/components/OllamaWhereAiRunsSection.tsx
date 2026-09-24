/**
 * Title: Where AI runs section
 *
 * Purpose: The "Where AI runs" panel at the top of the Ollama tab, where
 * you choose whether the AI runs on this Deck itself or on a PC somewhere
 * on your home network — and everything involved in setting that up:
 * installing or updating Ollama on the Deck, picking a starting model
 * bundle to pull, finding a PC's Ollama on the network automatically, and
 * testing the connection either way.
 *
 * Used for: OllamaTab, the first section drawn.
 *
 * Solves: One place that owns both halves of "which machine answers" — the
 * Deck-local install-and-setup flow, and the LAN-host find-and-connect
 * flow — since only one of the two ever shows at a time, depending on the
 * toggle.
 *
 * Does not: Pull, browse, or manage individual models one at a time, or
 * decide the try-order between them — that is PullModelsModal and the
 * model routing panels. This section only offers two starting bundles
 * (Tier 1 essentials, Tier 2 multimodal) and an update-everything option.
 *
 * How it works:
 *
 *     ┌─ Where AI runs ──────────────────────────────────┐
 *     │ [ Run AI on this Deck ]         toggle              │
 *     │ [ Start the AI with the Deck ]  toggle (autostart)  │
 *     │  — if Run-on-Deck is ON —                            │
 *     │ [ Install Ollama / Update AI & models ]              │
 *     │ [ Browse models… ]                                   │
 *     │ [ Install options… ] -> Tier 1 / Tier 2 / Cancel     │
 *     │ setup log / status line                              │
 *     │  — if Run-on-Deck is OFF —                            │
 *     │ Saved Ollama hosts (LAN)  <- quick-pick buttons      │
 *     │ Save current PC address as quick host                │
 *     │ PC address [______]  [Test connection] [Find LAN]    │
 *     │ This Deck's IP: …                                    │
 *     │ Found on LAN (mDNS)  <- Use / Save per host          │
 *     │ Connected · Ollama vX · N models  /  Unreachable     │
 *     └────────────────────────────────────────────────────────┘
 *
 * 1. onTestConnection() probes whichever host is currently selected — this
 *    Deck's own loopback address, or the typed PC address — and records
 *    the result; it auto-runs once, quietly, on mount, so the
 *    Install/Update button already knows whether Ollama is reachable
 *    before anyone presses Test.
 * 2. openLocalSetupConfirm() asks first, then starts one of three setup
 *    profiles (Tier 1 essentials, Tier 2 multimodal, or Update installed).
 *    Tier 2 also switches the model policy tier first, since the model it
 *    installs needs that tier to be usable at Ask time.
 * 3. While a local setup runs, a poll every 1.5 seconds reads its status
 *    and fills in the log tail on screen; once it reports done with no
 *    error, a separate effect runs the connection test again automatically
 *    and, if this was an update, refreshes the model catalog.
 * 4. runMdnsDiscovery() searches the local network for other Ollama
 *    services advertised over mDNS/Bonjour — only offered when Ask is not
 *    already pointed at this Deck.
 * 5. Any host found this way, or a manually typed PC address, can be saved
 *    as one of a short list of named quick-pick buttons (namedOllamaHosts)
 *    so an address used before never needs retyping.
 *
 * Gotchas:
 * - The Deck-local setup buttons form one fixed vertical chain — toggle →
 *   Start-at-boot toggle → Install/Update → Browse → Install options →
 *   Test connection — and Up/Down on every one of them is wired by hand to
 *   match it, because Steam's own automatic layout guess does not follow
 *   it correctly here.
 * - The "Browse models…" button on this panel registers itself as the
 *   return-focus target for the models hub modal. A second, less-used
 *   entry point to the same hub exists on the main Ollama tab but is not
 *   wired the same way — only this one needs to be, since it is the one
 *   people actually press, and its absence here was invisible until it
 *   was checked on the Deck.
 * - A connection test against this Deck's own loopback address gets a much
 *   longer timeout than a LAN test, because probing it can itself start
 *   the Ollama service if it was not already running.
 *
 * The result shapes and the props type live in OllamaWhereAiRunsSection.types.ts; the fixed
 * numbers and canned modal copy live in OllamaWhereAiRunsSection.constants.tsx.
 */
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
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP, MAX_NAMED_OLLAMA_HOSTS } from "../data/bonsaiSettingsSchema";
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
import { tryMoveUpWithPanelScroll } from "../utils/settingsPanelScroll";
import { disclosureSummaryForSourceClass } from "../data/modelPolicy";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
import { useOllamaLocalAutostart } from "../hooks/useOllamaLocalAutostart";
import { useMdnsOllamaDiscovery } from "../hooks/useMdnsOllamaDiscovery";
import type {
  MdnsOllamaHost,
  LocalOllamaSetupStatus,
  OllamaLocalAutostartStatus,
  ConnectionStatus,
} from "./OllamaWhereAiRunsSection.types";
import type { OllamaWhereAiRunsSectionProps } from "./OllamaWhereAiRunsSection.types";
import {
  TEST_CONNECTION_TIMEOUT_SECONDS,
  LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS,
  LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS,
  LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL,
  LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED,
  OLLAMA_MODELS_DISK_HINT,
  LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB,
  LOCAL_SETUP_SIZE_TIER2_MULTIMODAL_GIB,
  LOCAL_SETUP_NETWORK_AND_POWER_HINT,
} from "./OllamaWhereAiRunsSection.constants";

export type { OllamaWhereAiRunsSectionProps } from "./OllamaWhereAiRunsSection.types";

/**
 * The whole panel. See "How it works" above for the layout and flow.
 *
 * In: the current host settings (local-on-Deck, autostart, the typed PC
 * address, saved LAN hosts), callbacks to change and persist each of them,
 * a callback reporting the last connection test result up to the parent,
 * callbacks for opening the models hub and nested-modal focus handoff, and
 * a couple of optional refs/callbacks so the section above or below can
 * hand the D-pad in and out cleanly.
 * Out: the panel section described above.
 *
 * What can go wrong: every backend call here (connection test, local
 * setup, mDNS discovery, autostart toggle) is wrapped so a failure shows a
 * toast or a status line rather than leaving a button stuck in a busy
 * state forever.
 */
export const OllamaWhereAiRunsSection: React.FC<OllamaWhereAiRunsSectionProps> = ({
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  ollamaLocalOnDeck,
  setOllamaLocalOnDeck,
  ollamaLocalAutostart,
  setOllamaLocalAutostart,
  onLastConnectionStatus,
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onOpenOllamaModelsHub,
  onApplyTier2MultimodalPolicy,
  onMoveDownFromConnectionRow,
  connectionTestBtnRef,
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
  const [localInstallMenuOpen, setLocalInstallMenuOpen] = useState(
    () => peekOllamaTabLocalPending()?.localInstallMenuOpen ?? false
  );
  const setupAutoTestRanRef = useRef(false);
  const lastCompletedSetupProfileRef = useRef<string>("");
  const onTestConnectionRef = useRef<(opts?: { quiet?: boolean }) => Promise<void>>(async () => {});
  /*
   * Which mode -- Ollama on this Deck (true) or on the network (false) -- the automatic probe last
   * ran for; null before the first. Keyed on the mode rather than "ran once" because after a plugin
   * reload this tab can mount before settings arrive, while `ollamaLocalOnDeck` still reads its
   * default false: the one probe then went to the saved network address (or the "192.168.1."
   * placeholder), failed, and the tab showed "Could not reach Ollama" and offered Install Ollama
   * with Ollama answering on this Deck the whole time (plugin log 2026-09-23 21:44:45, "Name or
   * service not known"). When settings land and the mode flips, the probe runs again for it.
   */
  const autoProbeModeRef = useRef<boolean | null>(
    peekOllamaTabLocalPending()?.connectionStatus != null ? ollamaLocalOnDeck : null
  );
  /** Only the newest probe may set the status: an older one finishing late must not overwrite it. */
  const probeSeqRef = useRef(0);
  const [autostartStatus, setAutostartStatus] = useState<OllamaLocalAutostartStatus | null>(null);
  const [autostartBusy, setAutostartBusy] = useState(false);

  const ollamaIpConnectionNavRef = useRef<HTMLDivElement>(null);
  const ollamaLocalToggleNavRef = useRef<HTMLDivElement>(null);
  const ollamaAutostartToggleNavRef = useRef<HTMLDivElement>(null);
  const installUpdateBtnRef = useRef<HTMLButtonElement | null>(null);
  const browseModelsBtnRef = useRef<HTMLButtonElement | null>(null);
  const installOptionsBtnRef = useRef<HTMLButtonElement | null>(null);
  const tier1EssentialsBtnRef = useRef<HTMLButtonElement | null>(null);
  const tier2MultimodalBtnRef = useRef<HTMLButtonElement | null>(null);

  const focusLocalToggle = useCallback((): boolean => {
    const host = ollamaLocalToggleNavRef.current;
    const target = host?.querySelector<HTMLElement>("[tabindex], button, input");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusAutostartToggle = useCallback((): boolean => {
    const host = ollamaAutostartToggleNavRef.current;
    // focus-patterns-allow: element-scoped query on this component's own wrapper ref, same sanctioned pattern as focusLocalToggle two blocks above.
    const target = host?.querySelector<HTMLElement>("[tabindex], button, input");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusInstallUpdateBtn = useCallback((): boolean => {
    installUpdateBtnRef.current?.focus();
    return Boolean(installUpdateBtnRef.current);
  }, []);

  const focusBrowseModelsBtn = useCallback((): boolean => {
    browseModelsBtnRef.current?.focus();
    return Boolean(browseModelsBtnRef.current);
  }, []);

  const focusInstallOptionsBtn = useCallback((): boolean => {
    installOptionsBtnRef.current?.focus();
    return Boolean(installOptionsBtnRef.current);
  }, []);

  const focusTier1Btn = useCallback((): boolean => {
    tier1EssentialsBtnRef.current?.focus();
    return Boolean(tier1EssentialsBtnRef.current);
  }, []);

  const focusTier2Btn = useCallback((): boolean => {
    tier2MultimodalBtnRef.current?.focus();
    return Boolean(tier2MultimodalBtnRef.current);
  }, []);

  const focusConnectionTestBtn = useCallback((): boolean => {
    connectionTestBtnRef?.current?.focus();
    return Boolean(connectionTestBtnRef?.current);
  }, [connectionTestBtnRef]);

  /**
   * Local Deck setup vertical chain: toggle → Start-at-boot toggle → Install/Update → Browse →
   * Install options → Test. The startup-entry toggle sits right under "Run AI on this Deck" in
   * both branches (local install UI shown or not), so both the "on" install-menu fallback and the
   * "off" plain fallback land on it rather than back on the first toggle.
   */
  const handleMoveUpFromConnection = useCallback((): boolean => {
    if (ollamaLocalOnDeck) {
      if (localInstallMenuOpen && focusTier2Btn()) return true;
      if (focusInstallOptionsBtn()) return true;
    }
    return tryMoveUpWithPanelScroll(ollamaIpConnectionNavRef.current, focusAutostartToggle);
  }, [focusAutostartToggle, focusInstallOptionsBtn, focusTier2Btn, localInstallMenuOpen, ollamaLocalOnDeck]);

  const handleMoveUpFromLocalToggle = useCallback((): boolean => {
    return tryMoveUpWithPanelScroll(ollamaLocalToggleNavRef.current);
  }, []);

  const handleMoveDownFromLocalToggle = useCallback((): boolean => {
    return focusAutostartToggle();
  }, [focusAutostartToggle]);

  const handleMoveUpFromAutostartToggle = useCallback((): boolean => {
    return focusLocalToggle();
  }, [focusLocalToggle]);

  const handleMoveDownFromAutostartToggle = useCallback((): boolean => {
    if (ollamaLocalOnDeck && focusInstallUpdateBtn()) return true;
    return focusConnectionTestBtn();
  }, [focusConnectionTestBtn, focusInstallUpdateBtn, ollamaLocalOnDeck]);

  useLayoutEffect(() => {
    const local = consumeOllamaTabLocalPending();
    if (!local) return;
    setConnectionStatus(local.connectionStatus);
    setMdnsHosts(local.mdnsHosts);
    setMdnsDiscoveryMessage(local.mdnsDiscoveryMessage);
    setLocalInstallMenuOpen(local.localInstallMenuOpen);
    if (local.connectionStatus != null) {
      autoProbeModeRef.current = ollamaLocalOnDeck;
    }
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

  const onTestConnection = async (opts?: { quiet?: boolean }) => {
    const quiet = opts?.quiet === true;
    const target = ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim();
    if (!target) return;
    const loopbackLikelyProbe =
      ollamaLocalOnDeck ||
      /^\s*127\.0\.0\.1\s*(:\s*\d+)?\s*$/i.test(target) ||
      /^\s*localhost\s*(:\s*\d+)?\s*$/i.test(target);
    const rpcDeadlineMs =
      TEST_CONNECTION_TIMEOUT_SECONDS * 1000 +
      (loopbackLikelyProbe ? LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS : 3000);

    const seq = ++probeSeqRef.current;
    if (!quiet) {
      setConnectionTesting(true);
      setConnectionStatus(null);
    }
    try {
      const result = await callDeckyWithTimeout<[string, number], ConnectionStatus>(
        "test_ollama_connection",
        [target, TEST_CONNECTION_TIMEOUT_SECONDS],
        rpcDeadlineMs
      );
      if (seq !== probeSeqRef.current) return;
      setConnectionStatus(result);
      onLastConnectionStatus?.(result);
      if (result.reachable && !ollamaLocalOnDeck) onPersistOllamaIp(target);
    } catch (e: unknown) {
      if (seq !== probeSeqRef.current) return;
      const failed = { reachable: false, error: formatDeckyRpcError(e) };
      setConnectionStatus(failed);
      onLastConnectionStatus?.(failed);
    } finally {
      if (!quiet) setConnectionTesting(false);
    }
  };

  onTestConnectionRef.current = onTestConnection;

  // Auto-probe on mount, and again when the on-Deck / network mode changes, so the Install/Update
  // label reflects reachability without Test connection. Typing a new host still waits for an
  // explicit Test connection.
  useEffect(() => {
    if (autoProbeModeRef.current === ollamaLocalOnDeck) return;
    const target = ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim();
    if (!target) return;
    autoProbeModeRef.current = ollamaLocalOnDeck;
    void onTestConnectionRef.current({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the mode alone, on purpose
  }, [ollamaLocalOnDeck]);

  const localSetupBusy = localSetupStatus?.phase === "running";
  const ollamaEngineReady = Boolean(connectionStatus?.reachable);

  const { openMdnsDiscoveryConfirm } = useMdnsOllamaDiscovery({
    mdnsDiscovering,
    setMdnsDiscovering,
    setMdnsHosts,
    setMdnsDiscoveryMessage,
    ollamaLocalOnDeck,
    localSetupBusy,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
  });

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
      const pulled = localSetupStatus.pull_tags?.filter(Boolean) ?? [];
      if (localSetupStatus.profile === "custom" && pulled.length > 0) {
        // Appends the pulled tags to the saved try orders. A no-op when the user
        // has no saved order, because the derived one already includes anything
        // just installed. Logged rather than swallowed so failures stay visible
        // on-device.
        void callDeckyWithTimeout<[string[]], { ok?: boolean }>(
          "merge_pulled_tags_into_routing_orders",
          [pulled],
          DECKY_RPC_TIMEOUT_MS
        ).catch((e) => {
          console.error(
            "[bonsAI] merge_pulled_tags_into_routing_orders failed; pulled tags not merged into model routing order:",
            formatDeckyRpcError(e)
          );
        });
      }
      toaster.toast({
        title: "Local Ollama setup complete",
        body: wasUpdateInstalled ? "Running connection test and refreshing model catalog." : "Running connection test.",
        duration: 4000,
      });
      void onTestConnectionRef.current();
    }
  }, [ollamaLocalOnDeck, localSetupStatus]);

  const { handleToggleAutostart } = useOllamaLocalAutostart({
    setAutostartStatus,
    setAutostartBusy,
    setOllamaLocalAutostart,
  });

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
              {...({
                onMoveUp: () => handleMoveUpFromLocalToggle(),
                onMoveDown: () => handleMoveDownFromLocalToggle(),
              } as unknown as Record<string, unknown>)}
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
        <PanelSectionRow>
          <div
            ref={ollamaAutostartToggleNavRef}
            className="bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <ToggleField
              label="Start the AI with the Deck"
              checked={ollamaLocalAutostart}
              disabled={autostartBusy}
              onChange={(c) => handleToggleAutostart(c)}
              {...({
                onMoveUp: () => handleMoveUpFromAutostartToggle(),
                onMoveDown: () => handleMoveDownFromAutostartToggle(),
              } as unknown as Record<string, unknown>)}
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
              Starts the local AI when the Deck starts, and lets it keep the answering part and
              the note-searching part in memory at once — so questions come back about seven
              tenths of a second sooner.
            </div>
            {autostartStatus?.reason ? (
              <div
                className="bonsai-prose"
                style={{ fontSize: 10, color: "#8fa0b4", lineHeight: 1.35, marginTop: 4, userSelect: "none" }}
                aria-live="polite"
              >
                {autostartStatus.reason}
              </div>
            ) : autostartStatus?.installed ? (
              <div
                className="bonsai-prose"
                style={{ fontSize: 10, color: "#8fa0b4", lineHeight: 1.35, marginTop: 4, userSelect: "none" }}
                aria-live="polite"
              >
                Set up and answering questions.
              </div>
            ) : null}
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
                  ref={(el) => {
                    installUpdateBtnRef.current = el as HTMLButtonElement | null;
                  }}
                  className="bonsai-settings-focus-btn"
                  disabled={localSetupBusy}
                  onClick={() => openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED)}
                  {...({
                    onMoveUp: () => focusAutostartToggle(),
                    onMoveDown: () => focusBrowseModelsBtn(),
                  } as unknown as Record<string, unknown>)}
                  style={{
                    flex: "1 1 100%",
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
                  aria-label={
                    ollamaEngineReady
                      ? "Update AI engine and installed models"
                      : "Install Ollama on this Deck"
                  }
                >
                  {ollamaEngineReady ? "Update AI & models" : "Install Ollama"}
                </Button>
              </Focusable>
              {!ollamaEngineReady || localSetupBusy ? (
                <div
                  className="bonsai-prose"
                  style={{
                    fontSize: 10,
                    color: "#9fb7d5",
                    lineHeight: 1.4,
                    userSelect: "none",
                  }}
                >
                  {localSetupBusy
                    ? "Install in progress — first-time setup can take up to 5 minutes. Keep Wi‑Fi on and avoid sleep or reboot until it finishes."
                    : "First-time Install Ollama can take up to 5 minutes (download and setup). Use stable Wi‑Fi and AC power where possible."}
                </div>
              ) : null}
              <Focusable flow-children="horizontal" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" }}>
                <Button
                  ref={(el) => {
                    browseModelsBtnRef.current = el as HTMLButtonElement | null;
                    // This is the button users actually press to reach the models hub; the one on
                    // OllamaTab is a second, less-used entry point. Wiring only that one is why
                    // the 2026-08-04 focus log showed armedId: null for this modal.
                    registerModalReturnFocusOwner("ollama-models-hub", el as HTMLElement | null);
                  }}
                  disabled={localSetupBusy}
                  onClick={() => {
                    rememberModalReturnFocus("ollama-models-hub");
                    onBeforeDeckyModal();
                    onOpenOllamaModelsHub({ initialSection: "browse" });
                  }}
                  {...({
                    onMoveUp: () => focusInstallUpdateBtn(),
                    onMoveDown: () => focusInstallOptionsBtn(),
                  } as unknown as Record<string, unknown>)}
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
                  ref={(el) => {
                    installOptionsBtnRef.current = el as HTMLButtonElement | null;
                  }}
                  disabled={localSetupBusy}
                  onClick={() => setLocalInstallMenuOpen((o) => !o)}
                  {...({
                    onMoveUp: () => focusBrowseModelsBtn(),
                    onMoveDown: () =>
                      localInstallMenuOpen ? focusTier1Btn() : focusConnectionTestBtn(),
                  } as unknown as Record<string, unknown>)}
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
                {localInstallMenuOpen ? (
                  <Focusable
                    flow-children="vertical"
                    style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}
                  >
                    <Button
                      ref={(el) => {
                        tier1EssentialsBtnRef.current = el as HTMLButtonElement | null;
                      }}
                      disabled={localSetupBusy}
                      onClick={() => {
                        setLocalInstallMenuOpen(false);
                        openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS);
                      }}
                      {...({
                        onMoveUp: () => focusInstallOptionsBtn(),
                        onMoveDown: () => focusTier2Btn(),
                      } as unknown as Record<string, unknown>)}
                      style={{ width: "100%", minHeight: 34, fontSize: 11, fontWeight: 600 }}
                      aria-label="Install Tier 1 essentials"
                    >
                      Install Tier 1 essentials
                    </Button>
                    <Button
                      ref={(el) => {
                        tier2MultimodalBtnRef.current = el as HTMLButtonElement | null;
                      }}
                      disabled={localSetupBusy}
                      onClick={() => {
                        setLocalInstallMenuOpen(false);
                        openLocalSetupConfirm(LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL);
                      }}
                      {...({
                        onMoveUp: () => focusTier1Btn(),
                        onMoveDown: () => focusConnectionTestBtn(),
                      } as unknown as Record<string, unknown>)}
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
                ref={(el) => {
                  if (connectionTestBtnRef) connectionTestBtnRef.current = el as HTMLButtonElement | null;
                }}
                onClick={() => void onTestConnection()}
                disabled={connectionTesting || localSetupBusy || (!ollamaLocalOnDeck && !ollamaIp.trim())}
                {...({
                  onMoveUp: () => handleMoveUpFromConnection(),
                  onMoveDown: onMoveDownFromConnectionRow,
                } as unknown as Record<string, unknown>)}
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
