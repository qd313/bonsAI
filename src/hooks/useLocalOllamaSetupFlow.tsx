/**
 * Title: The local-on-Deck install and update flow
 *
 * Purpose: Everything that runs when a person installs Ollama on the Deck
 * itself or updates it: the press behind "Install Ollama" / "Update AI &
 * models", which runs in place on the tab with no box (only on a Deck with no
 * models, one box asks the real question, whether to also install the starter
 * models), the Cancel button's RPC, the status-line wording while a setup
 * runs, the poll that reads setup progress every 1.5 seconds, and the effect
 * that runs a connection test automatically once a setup finishes cleanly.
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
 * Does not: Own `localSetupStatus` or the derived `localSetupBusy` flag —
 * the panel's own JSX renders the log tail and the error line from that
 * state directly, so it stays in the panel and is handed in here as values
 * and a setter. The starter models' words and the call that starts a setup
 * live in localOllamaStarterSet.tsx, shared with Browse models.
 * Does not run the connection test itself; it only unblocks the ref the
 * panel's own onTestConnection is stashed behind.
 *
 * Caution: Lifted out of OllamaWhereAiRunsSection on 2026-09-24, from the
 * spot right after the mDNS-discovery hook call and right before the
 * autostart hook call — both stayed exactly where they were, so this hook
 * is called between them, in the same slot in the hook call order.
 */
import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { toaster } from "@decky/api";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../utils/deckyCall";
import { notifyPullModelCatalogRefresh } from "../utils/pullModelCatalogRefresh";
import type { LocalOllamaSetupStatus } from "../components/OllamaWhereAiRunsSection.types";
import {
  LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS,
  LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED,
} from "../components/OllamaWhereAiRunsSection.constants";
import { startLocalOllamaSetup, starterSetBoxBody, starterSetNotices } from "./localOllamaStarterSet";
import { rememberReturnWhileBoxOpens } from "../utils/rememberReturnWhileBoxOpens";
import type { ModalReturnFocusId } from "../features/plugin-shell/modalReturnFocusRegistry";
import { confirmDownload } from "../features/downloads/downloadNotice";

/**
 * The starter-models question, the in-place run, the Cancel RPC, the status-line wording, the setup poll, and the
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
  onTestConnectionRef,
}: {
  ollamaLocalOnDeck: boolean;
  localSetupStatus: LocalOllamaSetupStatus | null;
  setLocalSetupStatus: (v: LocalOllamaSetupStatus | null) => void;
  localSetupBusy: boolean;
  setupAutoTestRanRef: MutableRefObject<boolean>;
  lastCompletedSetupProfileRef: MutableRefObject<string>;
  /** No longer used here: the setup box is the download notice, which takes the shell's own box hooks. */
  onBeforeDeckyModal: () => void;
  /** No longer used here, as above. */
  onCompleteDeckyModalClose: (close: () => void) => void;
  onTestConnectionRef: RefObject<(opts?: { quiet?: boolean }) => Promise<void>>;
}) {
  const formatLocalSetupStageLine = useCallback((st: LocalOllamaSetupStatus | null) => {
    if (!st || st.phase !== "running") return "";
    const stage = st.stage ?? "";
    if (stage === "pull" && (st.total_pull_steps ?? 0) > 0) {
      const cur = st.current_tag ? ` — ${st.current_tag}` : "";
      const progress = st.progress_text ? ` · ${st.progress_text}` : "";
      return `Pull ${st.pull_step ?? 0}/${st.total_pull_steps}${cur}${progress}`;
    }
    const map: Record<string, string> = {
      check: "Checking…",
      install: "Installing Ollama…",
      restart: "Restarting Ollama so the new version is the one running…",
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

  /*
   * Update AI & models and the first-time Install run right here on the tab: no download box. The
   * line under the button shows the run (OllamaSetupStatusLine.tsx), read from the back end's status.
   * A refused start (downloads off, kids lock, a run already going) leaves the back end's status idle,
   * so the reason is kept here and shown as a failed line until a run starts; the poll would
   * otherwise wipe it 1.5 seconds later.
   */
  const refusalRef = useRef("");

  const runLocalSetupInPlace = useCallback(
    (
      profile: typeof LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED,
      returnId: ModalReturnFocusId,
      opts?: { offerStarterModels?: boolean }
    ) => {
      if (localSetupBusy) return;
      void (async () => {
        // A Deck with no models: one box asks whether to also install the starter models, with the
        // ring on "Not now". Declining (or B) installs the engine only, as before.
        let chosen: string = profile;
        if (opts?.offerStarterModels) {
          const wantsStarter = await rememberReturnWhileBoxOpens(returnId, () =>
            confirmDownload(starterSetNotices(), {
              always: true,
              title: "Also install the starter models?",
              body: starterSetBoxBody(true),
              actionLabel: "Install Ollama and the starter models",
            })
          );
          if (wantsStarter) chosen = LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS;
        }
        refusalRef.current = "";
        setupAutoTestRanRef.current = false;
        lastCompletedSetupProfileRef.current = chosen;
        startLocalOllamaSetup(chosen, setLocalSetupStatus, (reason) => {
          refusalRef.current = reason;
        });
      })();
    },
    [localSetupBusy]
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
        .then((st) => {
          if (st.phase !== "idle") refusalRef.current = "";
          setLocalSetupStatus(
            st.phase === "idle" && refusalRef.current
              ? { ...st, phase: "failed", error: refusalRef.current, done: true }
              : st
          );
        })
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
      // A custom pull joins the saved try order in the back end, where the download ends
      // (ollama_local_setup_rpc); this screen only saw the finish while it stayed open.
      toaster.toast({
        title: "Local Ollama setup complete",
        body: wasUpdateInstalled ? "Running connection test and refreshing model catalog." : "Running connection test.",
        duration: 4000,
      });
      void onTestConnectionRef.current();
    }
  }, [ollamaLocalOnDeck, localSetupStatus]);

  return { formatLocalSetupStageLine, cancelLocalSetup, runLocalSetupInPlace };
}
