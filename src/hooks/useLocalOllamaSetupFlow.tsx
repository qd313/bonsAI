/**
 * Title: The local-on-Deck install and update flow
 *
 * Purpose: Everything that runs when a person installs Ollama on the Deck
 * itself, updates it, or pulls one of the two starting model bundles: the
 * three confirm dialogs (Tier 1 essentials, Tier 2 multimodal, update
 * installed), the Cancel button's RPC, the status-line wording while a
 * setup runs, the poll that reads setup progress every 1.5 seconds, and
 * the effect that runs a connection test automatically once a setup
 * finishes cleanly.
 *
 * Used for: OllamaWhereAiRunsSection, only while "Run AI on this Deck" is
 * on — this is the entire "Local Ollama setup" block of that panel.
 *
 * Solves: Keeps the panel's own file shorter by moving the biggest
 * self-contained concern in it out on its own — nothing outside this flow
 * reads or writes the setup status except the panel's own JSX, which still
 * reads `localSetupStatus` directly (it stays a prop of the panel, not of
 * this hook) to draw the log tail and the phase line.
 *
 * Does not: Own `localSetupStatus`, `localInstallMenuOpen`, or the derived
 * `localSetupBusy` flag — the panel's own JSX renders the log tail, the
 * error line, and the "Install options…" submenu from that state directly,
 * so it stays in the panel and is handed in here as values and a setter.
 * Does not run the connection test itself; it only unblocks the ref the
 * panel's own onTestConnection is stashed behind.
 *
 * Caution: Lifted out of OllamaWhereAiRunsSection on 2026-09-24, from the
 * spot right after the mDNS-discovery hook call and right before the
 * autostart hook call — both stayed exactly where they were, so this hook
 * is called between them, in the same slot in the hook call order.
 */
import { useCallback, useEffect, type MutableRefObject, type RefObject } from "react";
import { toaster } from "@decky/api";
import { showModal, ConfirmModal } from "@decky/ui";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { notifyPullModelCatalogRefresh } from "../utils/pullModelCatalogRefresh";
import { TIER1_ESSENTIALS_TAG, TIER2_MULTIMODAL_TAG } from "../data/deckEssentialsTags";
import { disclosureSummaryForSourceClass } from "../data/modelPolicy";
import type { LocalOllamaSetupStatus } from "../components/OllamaWhereAiRunsSection.types";
import {
  LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS,
  LOCAL_OLLAMA_SETUP_PROFILE_TIER2_MULTIMODAL,
  LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED,
  OLLAMA_MODELS_DISK_HINT,
  LOCAL_SETUP_SIZE_TIER1_ESSENTIALS_GIB,
  LOCAL_SETUP_SIZE_TIER2_MULTIMODAL_GIB,
  LOCAL_SETUP_NETWORK_AND_POWER_HINT,
} from "../components/OllamaWhereAiRunsSection.constants";

/**
 * The three confirm dialogs, the Cancel RPC, the status-line wording, the setup poll, and the
 * auto-test-after-done effect. Every hook below must keep its position — React matches hooks by
 * the order they run in.
 */
export function useLocalOllamaSetupFlow({
  ollamaLocalOnDeck,
  localSetupStatus,
  setLocalSetupStatus,
  localSetupBusy,
  setupAutoTestRanRef,
  lastCompletedSetupProfileRef,
  onApplyTier2MultimodalPolicy,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onTestConnectionRef,
}: {
  ollamaLocalOnDeck: boolean;
  localSetupStatus: LocalOllamaSetupStatus | null;
  setLocalSetupStatus: (v: LocalOllamaSetupStatus | null) => void;
  localSetupBusy: boolean;
  setupAutoTestRanRef: MutableRefObject<boolean>;
  lastCompletedSetupProfileRef: MutableRefObject<string>;
  onApplyTier2MultimodalPolicy?: () => void | Promise<void>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onTestConnectionRef: RefObject<(opts?: { quiet?: boolean }) => Promise<void>>;
}) {
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

  return { formatLocalSetupStageLine, cancelLocalSetup, openLocalSetupConfirm };
}
