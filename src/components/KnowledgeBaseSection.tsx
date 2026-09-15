/**
 * Title: Knowledge base section
 *
 * Purpose: The "Knowledge base (offline)" panel on the Ollama tab. A
 * toggle turns on grounding Strategy and troubleshooting answers with a
 * downloaded set of offline strategy cards; below it, a status line and a
 * button that reads Download, Update, or Downloading… depending on what is
 * already installed, next to Cancel (while a download runs) or Remove
 * (once something is installed). Starting a fresh download first opens a
 * small picker for internal storage or an SD card.
 *
 * Used for: OllamaTab, directly below the connection section.
 *
 * Solves: One place for every knowledge-base action — download, update,
 * cancel, remove, and picking where it lives on disk — with its own D-pad
 * path in and out.
 *
 * Does not: Actually use the knowledge base when answering a question —
 * that is knowledge_base_service on the Python side. This file only
 * installs, updates, and removes the corpus on disk.
 *
 * How it works:
 *
 *     ┌─ Knowledge base (offline) ────────────────────┐
 *     │ [ Use local knowledge base ]  toggle            │
 *     │ status: Installed vX / Not installed             │
 *     │   (+ nomic-embed-text hint/button when needed)   │
 *     │ [ Download / Update ]   [ Cancel / Remove ]      │  <- two-button row
 *     └────────────────────────────────────────────────────┘
 *
 * 1. refreshStatus() polls the backend for corpus status once on mount and
 *    whenever ragCorpusVersion changes, then again every 1.5 seconds while
 *    a download is running, stopping itself once the backend reports
 *    done, failed, or cancelled.
 * 2. Toggling "Use local knowledge base" only flips the setting — it does
 *    not start a download by itself.
 * 3. Pressing the primary button calls openStoragePicker() when nothing is
 *    installed yet (choose internal storage or an SD card, then
 *    startDownload()), or runUpdate() once a corpus is already installed.
 * 4. The second button slot is whichever of three things fits the current
 *    state: Cancel (cancelDownload()) while a download runs, Remove
 *    (confirmRemove(), which asks first) once something is installed, or
 *    nothing at all otherwise — deliberately, so the row always has at
 *    least one focusable stop while a download is in progress.
 * 5. An optional nomic-embed-text hint appears once the corpus is
 *    installed and vectorized but the embedding model is not yet on the
 *    Ask host; pullNomicEmbed() only offers a one-press fix when Ask is
 *    routed to this Deck's own Ollama, since the pull command always
 *    targets this Deck.
 *
 * Gotchas:
 * - The version shown prefers whatever the status poll just reported over
 *   the version this component mounted with, because nothing re-reads
 *   settings.json into the frontend after an update finishes — the
 *   ragCorpusVersion prop alone would go stale the moment Update succeeds.
 * - A cancelled download still leaves the backend's error field set (it is
 *   just the text of the exception that unwound the transfer), so a
 *   cancellation gets its own neutral message instead of showing red as if
 *   something failed.
 * - Down from the toggle has to check whether the nomic hint's button is
 *   showing before falling through to the action row — otherwise the
 *   D-pad would skip straight over that button to Download/Update.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, ConfirmModal, Focusable, PanelSection, PanelSectionRow, ToggleField, showModal } from "@decky/ui";
import { toaster } from "@decky/api";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { tryMoveUpWithPanelScroll } from "../utils/settingsPanelScroll";
import { SETTINGS_GLASS_BTN, SETTINGS_GLASS_BTN_DANGER } from "../styles/settingsGlassButton";

type RagStorageOption = {
  id?: string;
  label?: string;
  install_path?: string;
  mount?: string;
  free_bytes?: number;
};

type RagCorpusStatus = {
  phase?: string;
  stage?: string;
  progress_pct?: number;
  bytes_downloaded?: number;
  bytes_total?: number;
  error?: string;
  done?: boolean;
  installed?: boolean;
  corpus_path?: string;
  corpus_version?: string;
  use_local_knowledge_base?: boolean;
  embeddings_populated?: boolean;
  embed_model_available?: boolean;
  log_tail?: string[];
  storage_options?: {
    internal?: RagStorageOption;
    sd_card?: RagStorageOption | null;
  };
};

type Props = {
  useLocalKnowledgeBase: boolean;
  setUseLocalKnowledgeBase: (v: boolean) => void;
  ragCorpusVersion: string;
  ollamaIp: string;
  /**
   * Whether Ask routes to the Deck's own Ollama. `pull_ollama_models` always pulls to this
   * Deck and takes no host, so the Pull button can only fix the missing model when the
   * embed host *is* the Deck. Routing to a LAN box makes the button a no-op on the wrong
   * machine, so we explain instead of offering it.
   */
  ollamaLocalOnDeck: boolean;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  toggleHostRef?: React.RefObject<HTMLDivElement | null>;
  downloadBtnRef?: React.RefObject<HTMLButtonElement | null>;
  removeBtnRef?: React.RefObject<HTMLButtonElement | null>;
  /**
   * Cancel shares the action row's second slot with Remove and only exists while a
   * download runs. The parent needs its own handle because both other buttons are
   * disabled then, so a ref to either one focuses nothing.
   */
  cancelBtnRef?: React.RefObject<HTMLButtonElement | null>;
  onMoveUpToConnection?: () => boolean;
  onMoveDownFromRemove?: () => boolean;
};

const KB_UNAVAILABLE_SESSION_KEY = "bonsai_kb_unavailable_warned";
const KB_FAILURE_TOAST_KEY = "bonsai_kb_failure_toast";
const KB_NOMIC_HINT_SESSION_KEY = "bonsai_kb_nomic_hint_warned";
/** Shared row height so Update (long label) and Remove match on Deck (stretch alone fails on Decky Button). */
const KB_ACTION_ROW_MIN_HEIGHT = 44;

const deckNav = (handlers: Record<string, () => boolean | void>) =>
  handlers as unknown as Record<string, unknown>;

const formatFreeGb = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "unknown free space";
  return `~${Math.round(bytes / (1024 * 1024 * 1024))} GB free`;
};

type StoragePickerModalProps = {
  internal: RagStorageOption;
  sdCard: RagStorageOption | null | undefined;
  onPick: (installPath: string, storage: string) => void;
  onClose: () => void;
};

const RagCorpusStoragePickerModal: React.FC<StoragePickerModalProps> = ({
  internal,
  sdCard,
  onPick,
  onClose,
}) => (
  <ConfirmModal
    strTitle="Choose download location"
    strDescription={
      <div className="bonsai-prose" style={{ fontSize: 12, lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
        <div style={{ marginBottom: 10 }}>
          Wiki-derived strategy cards and compat notes (small — well under 5 MB). No Ask text is uploaded.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="bonsai-settings-focus-btn-host" style={{ width: "100%" }}>
            <Focusable onOKButton={() => onPick(internal.install_path ?? "~/.bonsai/rag", "internal")}>
              <Button
                className="bonsai-settings-focus-btn"
                onClick={() => onPick(internal.install_path ?? "~/.bonsai/rag", "internal")}
                style={{ ...SETTINGS_GLASS_BTN, width: "100%" }}
              >
                Internal storage ({formatFreeGb(internal.free_bytes)})
              </Button>
            </Focusable>
          </div>
          {sdCard?.install_path ? (
            <div className="bonsai-settings-focus-btn-host" style={{ width: "100%" }}>
              <Focusable onOKButton={() => onPick(sdCard.install_path!, "sd_card")}>
                <Button
                  className="bonsai-settings-focus-btn"
                  onClick={() => onPick(sdCard.install_path!, "sd_card")}
                  style={{ ...SETTINGS_GLASS_BTN, width: "100%" }}
                >
                  SD card ({formatFreeGb(sdCard.free_bytes)})
                </Button>
              </Focusable>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.35 }}>
              No SD card detected. Insert a microSD formatted for Steam Deck storage, then try again.
            </div>
          )}
        </div>
      </div>
    }
    bAlertDialog={true}
    strOKButtonText="Close"
    onOK={onClose}
  />
);

/**
 * The whole panel. See "How it works" above for the flow.
 *
 * In: whether the knowledge base is on and a setter for it, the corpus
 * version the caller last knew about, the Ollama host address and whether
 * it is this Deck's own local Ollama, callbacks for nested-modal focus
 * handoff, and a handful of optional refs/Up-Down callbacks so neighbouring
 * sections can hand the D-pad in and out cleanly.
 * Out: the panel section described above.
 *
 * What can go wrong: every backend call here (download, update, cancel,
 * remove, the nomic pull) is wrapped so a failure shows a toast and clears
 * its own busy flag rather than leaving a button stuck disabled forever.
 */
export const KnowledgeBaseSection: React.FC<Props> = ({
  useLocalKnowledgeBase,
  setUseLocalKnowledgeBase,
  ragCorpusVersion,
  ollamaIp,
  ollamaLocalOnDeck,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  toggleHostRef,
  downloadBtnRef: downloadBtnRefProp,
  removeBtnRef: removeBtnRefProp,
  cancelBtnRef: cancelBtnRefProp,
  onMoveUpToConnection,
  onMoveDownFromRemove,
}) => {
  const [status, setStatus] = useState<RagCorpusStatus | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [nomicPullBusy, setNomicPullBusy] = useState(false);
  /** Set once a pull is accepted; polls status until the model shows up, then stops. */
  const [nomicPullStarted, setNomicPullStarted] = useState(false);
  const primaryBtnRefLocal = useRef<HTMLButtonElement | null>(null);
  const removeBtnRef = useRef<HTMLButtonElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const nomicBtnRef = useRef<HTMLButtonElement | null>(null);
  const toggleHostRefLocal = useRef<HTMLDivElement | null>(null);
  const toggleHost = toggleHostRef ?? toggleHostRefLocal;

  const focusPrimaryBtn = useCallback(() => {
    downloadBtnRefProp?.current?.focus();
    primaryBtnRefLocal.current?.focus();
    return true;
  }, [downloadBtnRefProp]);

  const focusKbToggle = useCallback((): boolean => {
    const host = toggleHost.current;
    const target = host?.querySelector<HTMLElement>("[tabindex], button, input");
    if (!target) return false;
    target.focus();
    return true;
  }, [toggleHost]);

  const focusRemoveBtn = useCallback((): boolean => {
    removeBtnRef.current?.focus();
    return Boolean(removeBtnRef.current);
  }, []);

  const focusCancelBtn = useCallback((): boolean => {
    cancelBtnRef.current?.focus();
    return Boolean(cancelBtnRef.current);
  }, []);

  const focusNomicBtn = useCallback((): boolean => {
    nomicBtnRef.current?.focus();
    return Boolean(nomicBtnRef.current);
  }, []);

  /**
   * Down from the toggle: while a download runs the primary button is disabled and
   * Remove is not rendered, so Cancel is the only stop the row has.
   */
  const focusActionRow = useCallback((): boolean => {
    if (downloadBusy && focusCancelBtn()) return true;
    return focusPrimaryBtn();
  }, [downloadBusy, focusCancelBtn, focusPrimaryBtn]);

  /** Down from the toggle: the nomic pull button sits between it and the action row
   * whenever the hint is showing, so it must be offered focus first. */
  const focusBelowToggle = useCallback(
    (showNomic: boolean): boolean => {
      if (showNomic && focusNomicBtn()) return true;
      return focusActionRow();
    },
    [focusActionRow, focusNomicBtn],
  );

  const handleMoveUpFromToggle = useCallback((): boolean => {
    return tryMoveUpWithPanelScroll(toggleHost.current, () => onMoveUpToConnection?.() ?? false);
  }, [onMoveUpToConnection, toggleHost]);

  const refreshStatus = useCallback(async () => {
    try {
      const st = await callDeckyWithTimeout<
        [{ pc_ip: string }],
        RagCorpusStatus
      >(
        "get_rag_corpus_status",
        [{ pc_ip: ollamaIp.trim() }],
        DECKY_RPC_TIMEOUT_MS,
      );
      setStatus(st);
      if (
        useLocalKnowledgeBase &&
        st &&
        !st.installed &&
        !sessionStorage.getItem(KB_UNAVAILABLE_SESSION_KEY)
      ) {
        sessionStorage.setItem(KB_UNAVAILABLE_SESSION_KEY, "1");
        toaster.toast({
          title: "Knowledge base unavailable",
          body: "Strategy cards are off until you download the corpus or turn off Use local knowledge base.",
          duration: 6000,
        });
      }
      if (
        useLocalKnowledgeBase &&
        st?.installed &&
        st.embeddings_populated &&
        st.embed_model_available === false &&
        !sessionStorage.getItem(KB_NOMIC_HINT_SESSION_KEY)
      ) {
        sessionStorage.setItem(KB_NOMIC_HINT_SESSION_KEY, "1");
        toaster.toast({
          title: "Keyword + meaning search",
          body: "Pull nomic-embed-text below for better strategy retrieval.",
          duration: 8000,
        });
      }
      return st;
    } catch {
      setStatus(null);
      return null;
    }
  }, [useLocalKnowledgeBase, ollamaIp]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus, ragCorpusVersion]);

  useEffect(() => {
    if (!downloadBusy) return;
    const id = window.setInterval(() => {
      void callDeckyWithTimeout<[{ pc_ip: string }], RagCorpusStatus>(
        "get_rag_corpus_status",
        [{ pc_ip: ollamaIp.trim() }],
        DECKY_RPC_TIMEOUT_MS,
      )
        .then((st) => {
          setStatus(st);
          if (st?.phase === "failed" && (st.error ?? "").trim()) {
            const errKey = `${st.error}|${st.stage ?? ""}`;
            if (sessionStorage.getItem(KB_FAILURE_TOAST_KEY) !== errKey) {
              sessionStorage.setItem(KB_FAILURE_TOAST_KEY, errKey);
              toaster.toast({
                title: "Knowledge base download failed",
                body: st.error,
                duration: 12000,
              });
            }
          }
          if (st?.done || st?.phase === "failed" || st?.phase === "done" || st?.phase === "cancelled") {
            setDownloadBusy(false);
            void refreshStatus();
          }
        })
        .catch(() => setDownloadBusy(false));
    }, 1500);
    return () => window.clearInterval(id);
  }, [downloadBusy, refreshStatus, ollamaIp]);

  /** The download ending is what clears Cancel's own pending state, however it ended. */
  useEffect(() => {
    if (!downloadBusy) setCancelBusy(false);
  }, [downloadBusy]);

  /**
   * A pull happens in the setup service, which reports nothing back here. Poll the status
   * that already knows the answer -- `embed_model_available` flips true once the model is
   * on the Ask host -- so the button stops saying "Pulling…" on its own rather than
   * stranding the user at a disabled control with no end state.
   */
  useEffect(() => {
    if (!nomicPullStarted) return;
    const id = window.setInterval(() => {
      void refreshStatus().then((st) => {
        if (st?.embed_model_available === true) {
          setNomicPullStarted(false);
          setNomicPullBusy(false);
        }
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, [nomicPullStarted, refreshStatus]);

  const startDownload = async (installPath: string, storage: string) => {
    setDownloadBusy(true);
    try {
      const out = await callDeckyWithTimeout<
        [{ install_path: string; storage: string }],
        { accepted?: boolean; reason?: string }
      >("start_rag_corpus_download", [{ install_path: installPath, storage }], 15000);
      if (!out?.accepted) {
        setDownloadBusy(false);
        toaster.toast({
          title: "Download not started",
          body: out?.reason ?? "Could not start knowledge base download.",
          duration: 8000,
        });
        return;
      }
      toaster.toast({
        title: "Downloading knowledge base",
        body: "Offline strategy corpus — small download, should finish quickly.",
        duration: 6000,
      });
    } catch (e: unknown) {
      setDownloadBusy(false);
      const msg = formatDeckyRpcError(e);
      toaster.toast({ title: "Download failed", body: msg, duration: 8000 });
    }
  };

  /**
   * Explicit, user-pressed pull — never automatic. pull_ollama_models only pulls onto
   * this Deck's own local Ollama (gated server-side on "Ollama on this Deck"); a LAN/PC
   * Ollama host can't be pulled onto remotely, so that case surfaces as a plain rejection
   * reason rather than a client-side pre-check duplicating the server's gate.
   */
  const pullNomicEmbed = () => {
    if (nomicPullBusy) return;
    setNomicPullBusy(true);
    void callDeckyWithTimeout<[string[]], { accepted?: boolean; reason?: string }>(
      "pull_ollama_models",
      [["nomic-embed-text"]],
      DECKY_RPC_TIMEOUT_MS,
    )
      .then((out) => {
        if (out?.accepted) {
          // Leave the button disabled and reading "Pulling…". The pull runs in the model
          // setup service, not here, so resolving this RPC only means it was accepted --
          // clearing busy now made the button snap back to "Pull nomic-embed-text" a
          // moment after pressing it, which reads as "nothing happened". The poll below
          // clears it for real: once the model lands, embed_model_available flips true
          // and the whole hint unmounts.
          setNomicPullStarted(true);
          toaster.toast({
            title: "Pulling nomic-embed-text",
            body: "Watch progress in Ollama → Where AI runs.",
            duration: 6000,
          });
          return;
        }
        setNomicPullBusy(false);
        toaster.toast({
          title: "Pull not started",
          body: out?.reason ?? "Setup busy, or Ollama isn't running on this Deck.",
          duration: 8000,
        });
      })
      .catch((e) => {
        setNomicPullBusy(false);
        toaster.toast({ title: "Pull failed", body: formatDeckyRpcError(e), duration: 8000 });
      });
  };

  /**
   * Asks the backend to set its cancel event. The download does not stop here — the
   * poll above sees `phase: "cancelled"` a beat later and clears `downloadBusy`, which
   * is also what returns this button to Remove (or to nothing, if nothing is installed).
   */
  const cancelDownload = () => {
    if (cancelBusy) return;
    setCancelBusy(true);
    void callDeckyWithTimeout<[], { cancel_requested?: boolean }>(
      "cancel_rag_corpus_download",
      [],
      DECKY_RPC_TIMEOUT_MS,
    )
      .then(() => {
        toaster.toast({
          title: "Cancelling download",
          body: "Stopping the knowledge base download. Partial files are discarded.",
          duration: 5000,
        });
      })
      .catch((e) => {
        setCancelBusy(false);
        toaster.toast({ title: "Cancel failed", body: formatDeckyRpcError(e), duration: 8000 });
      });
  };

  const openStoragePicker = () => {
    onBeforeDeckyModal();
    const internal = status?.storage_options?.internal ?? { install_path: "~/.bonsai/rag" };
    const sdCard = status?.storage_options?.sd_card;
    const handle = showModal(
      <RagCorpusStoragePickerModal
        internal={internal}
        sdCard={sdCard}
        onPick={(installPath, storage) => {
          onCompleteDeckyModalClose(() => handle.Close());
          void startDownload(installPath, storage);
        }}
        onClose={() => onCompleteDeckyModalClose(() => handle.Close())}
      />,
    );
  };

  const runUpdate = () => {
    void callDeckyWithTimeout<[], { ok?: boolean; updated?: boolean; version?: string; error?: string }>(
      "update_rag_corpus",
      [],
      DECKY_RPC_TIMEOUT_MS,
    )
      .then((out) => {
        if (!out?.ok) {
          toaster.toast({ title: "Update failed", body: out?.error ?? "Unknown error", duration: 8000 });
          return;
        }
        if (out.updated === false) {
          toaster.toast({
            title: "Already up to date",
            body: out.version ? `Version ${out.version} is the latest.` : "No update available.",
            duration: 4000,
          });
          return;
        }
        toaster.toast({
          title: "Update found",
          body: out.version ? `Downloading version ${out.version}…` : "Downloading the latest corpus…",
          duration: 4000,
        });
        setDownloadBusy(true);
      })
      .catch((e) => toaster.toast({ title: "Update failed", body: formatDeckyRpcError(e), duration: 8000 }));
  };

  const confirmRemove = () => {
    onBeforeDeckyModal();
    const handle = showModal(
      <ConfirmModal
        strTitle="Remove knowledge base?"
        strDescription={
          <div className="bonsai-prose" style={{ fontSize: 12, lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
            Deletes the offline corpus from disk and turns off <strong>Use local knowledge base</strong>. Strategy
            cards will stop grounding until you download again.
          </div>
        }
        strOKButtonText="Remove"
        strCancelButtonText="Cancel"
        onOK={() => {
          onCompleteDeckyModalClose(() => handle.Close());
          void callDeckyWithTimeout<[], { ok?: boolean }>("remove_rag_corpus", [], DECKY_RPC_TIMEOUT_MS)
            .then(() => {
              setUseLocalKnowledgeBase(false);
              void refreshStatus();
              toaster.toast({ title: "Knowledge base removed", body: "Corpus deleted from disk.", duration: 3000 });
            })
            .catch((e) =>
              toaster.toast({ title: "Remove failed", body: formatDeckyRpcError(e), duration: 5000 }),
            );
        }}
        onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
      />,
    );
  };

  const installed = status?.installed === true;
  /**
   * Prefer the version the backend just reported over the one this component was mounted
   * with. `ragCorpusVersion` is plugin-settings state: an Update writes the new version to
   * settings.json on the backend, but nothing re-reads settings into the frontend, so that
   * prop keeps its mount-time value and the label reads as though the Update did nothing.
   * `status.corpus_version` comes from the poll that already runs while a download is busy.
   */
  const displayedVersion = (status?.corpus_version ?? "").trim() || ragCorpusVersion;
  const progress =
    downloadBusy && status?.bytes_total
      ? `${status.progress_pct ?? 0}% (${Math.round((status.bytes_downloaded ?? 0) / (1024 * 1024))} / ${Math.round(
          (status.bytes_total ?? 0) / (1024 * 1024),
        )} MB)`
      : null;
  const showNomicHint =
    useLocalKnowledgeBase &&
    installed &&
    status?.embeddings_populated === true &&
    status?.embed_model_available === false;
  /**
   * Only offer the button when pressing it could actually help. `pull_ollama_models`
   * pulls to this Deck and takes no host, so when Ask routes to a LAN box the button
   * would install the model on the wrong machine and the hint would never clear.
   */
  const showNomicPullBtn = showNomicHint && ollamaLocalOnDeck;

  const onPrimaryClick = installed ? runUpdate : openStoragePicker;
  /**
   * A cancelled download still sets `error` on the backend state — it is the text of
   * the exception that unwound the transfer. Showing that in red reads as a failure the
   * user did not cause, so a cancel gets its own neutral line instead.
   */
  const wasCancelled = status?.phase === "cancelled";
  const errorText = wasCancelled ? "" : (status?.error ?? "").trim();

  return (
    <PanelSection title="Knowledge base (offline)">
      <PanelSectionRow>
        <div ref={toggleHost} className="bonsai-settings-bleed" style={{ width: "100%" }}>
          <ToggleField
            label="Use local knowledge base"
            description="Ground Strategy and troubleshooting Asks with downloaded offline cards (keyword or Keyword + meaning search)."
            checked={useLocalKnowledgeBase}
            onChange={(checked) => setUseLocalKnowledgeBase(checked)}
            {...deckNav({
              onMoveUp: () => handleMoveUpFromToggle(),
              onMoveDown: () => focusBelowToggle(showNomicPullBtn),
            })}
          />
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.4 }}>
          {installed ? (
            <>
              <span style={{ color: "#7dcea0", fontWeight: 600 }}>Installed</span>
              {displayedVersion ? ` — version ${displayedVersion}` : null}
              {status?.corpus_path ? (
                <span style={{ display: "block", marginTop: 4, color: "#8fa0b4" }}>{status.corpus_path}</span>
              ) : null}
            </>
          ) : (
            <>
              <span style={{ color: "#ffd299" }}>Not installed — download to enable grounded strategy help.</span>
            </>
          )}
          {showNomicHint ? (
            <div style={{ marginTop: 6 }}>
              <span style={{ display: "block", color: "#ffd299" }}>
                {showNomicPullBtn ? (
                  <>
                    Install <strong>nomic-embed-text</strong> in Ollama for Keyword + meaning search.
                  </>
                ) : (
                  <>
                    Install <strong>nomic-embed-text</strong> on {ollamaIp || "the Ollama host"} for
                    Keyword + meaning search — Ask runs there, so it needs the model. Pulling here
                    would only install it on this Deck.
                  </>
                )}
              </span>
              {showNomicPullBtn ? (
              <div className="bonsai-settings-focus-btn-host" style={{ marginTop: 6, maxWidth: 220 }}>
                <Focusable
                  onOKButton={pullNomicEmbed}
                  style={{ width: "100%", display: "flex", alignItems: "stretch" }}
                >
                  <Button
                    ref={(el) => {
                      nomicBtnRef.current = el as HTMLButtonElement | null;
                    }}
                    className="bonsai-settings-focus-btn"
                    onClick={pullNomicEmbed}
                    disabled={nomicPullBusy}
                    style={{
                      ...SETTINGS_GLASS_BTN,
                      width: "100%",
                      minHeight: KB_ACTION_ROW_MIN_HEIGHT,
                      height: KB_ACTION_ROW_MIN_HEIGHT,
                      boxSizing: "border-box",
                      fontSize: 11,
                    }}
                    {...deckNav({
                      onMoveUp: () => focusKbToggle(),
                      onMoveDown: () => focusActionRow(),
                    })}
                  >
                    {nomicPullStarted
                      ? "Pulling… (Ollama → Where AI runs)"
                      : nomicPullBusy
                        ? "Starting…"
                        : "Pull nomic-embed-text"}
                  </Button>
                </Focusable>
              </div>
              ) : null}
            </div>
          ) : null}
          {progress ? <span style={{ display: "block", marginTop: 6 }}>{progress}</span> : null}
          {wasCancelled && !downloadBusy ? (
            <span style={{ display: "block", marginTop: 6, color: "#9fb7d5" }}>
              Download cancelled. Nothing was installed — start it again whenever you like.
            </span>
          ) : null}
          {errorText ? (
            <span style={{ display: "block", marginTop: 6, color: "#ff9b9b" }}>{errorText}</span>
          ) : null}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <Focusable
          flow-children="horizontal"
          className="bonsai-settings-bleed"
          style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: 8, width: "100%" }}
        >
          {/* Pattern C: pair is one horizontal row — Up/Down both exit vertically; Left/Right stay in-row. */}
          <div
            className="bonsai-settings-focus-btn-host"
            style={{ flex: "1.6 1 0", minWidth: 0, display: "flex", alignItems: "stretch" }}
          >
            <Focusable onOKButton={onPrimaryClick} style={{ width: "100%", display: "flex", alignItems: "stretch" }}>
              <Button
                ref={(el) => {
                  const btn = el as HTMLButtonElement | null;
                  if (downloadBtnRefProp) downloadBtnRefProp.current = btn;
                  primaryBtnRefLocal.current = btn;
                }}
                className="bonsai-settings-focus-btn"
                onClick={onPrimaryClick}
                disabled={downloadBusy}
                style={{
                  ...SETTINGS_GLASS_BTN,
                  width: "100%",
                  minHeight: KB_ACTION_ROW_MIN_HEIGHT,
                  height: KB_ACTION_ROW_MIN_HEIGHT,
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                }}
                {...deckNav({
                  onMoveUp: () => (showNomicPullBtn ? focusNomicBtn() : focusKbToggle()),
                  onMoveDown: () => onMoveDownFromRemove?.() ?? false,
                  onMoveRight: () =>
                    downloadBusy ? focusCancelBtn() : installed ? focusRemoveBtn() : false,
                })}
              >
                {downloadBusy
                  ? "Downloading…"
                  : installed
                    ? "Update knowledge base"
                    : "Download knowledge base"}
              </Button>
            </Focusable>
          </div>
          {/*
            Second slot, one of three states. While a download runs it is Cancel, and that
            matters for more than the feature: the primary button is disabled then, so
            without Cancel the whole row has no focusable stop and the D-pad cannot enter
            it at all.
          */}
          {downloadBusy ? (
            <div
              className="bonsai-settings-focus-btn-host"
              style={{ flex: "0.9 1 0", minWidth: 72, display: "flex", alignItems: "stretch" }}
            >
              <Focusable onOKButton={cancelDownload} style={{ width: "100%", display: "flex", alignItems: "stretch" }}>
                <Button
                  ref={(el) => {
                    const btn = el as HTMLButtonElement | null;
                    cancelBtnRef.current = btn;
                    if (cancelBtnRefProp) {
                      cancelBtnRefProp.current = btn;
                    }
                  }}
                  className="bonsai-settings-focus-btn"
                  onClick={cancelDownload}
                  disabled={cancelBusy}
                  style={{
                    ...SETTINGS_GLASS_BTN_DANGER,
                    flex: "1 1 auto",
                    width: "100%",
                    minHeight: KB_ACTION_ROW_MIN_HEIGHT,
                    height: KB_ACTION_ROW_MIN_HEIGHT,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  {...deckNav({
                    onMoveUp: () => focusKbToggle(),
                    onMoveDown: () => onMoveDownFromRemove?.() ?? false,
                    // Left goes nowhere on purpose: the primary button is disabled while
                    // downloading, so yielding would drop focus out of the section.
                    onMoveLeft: () => true,
                  })}
                >
                  {cancelBusy ? "Cancelling…" : "Cancel"}
                </Button>
              </Focusable>
            </div>
          ) : installed ? (
            <div
              className="bonsai-settings-focus-btn-host"
              style={{ flex: "0.9 1 0", minWidth: 72, display: "flex", alignItems: "stretch" }}
            >
              <Focusable onOKButton={confirmRemove} style={{ width: "100%", display: "flex", alignItems: "stretch" }}>
                <Button
                  ref={(el) => {
                    const btn = el as HTMLButtonElement | null;
                    removeBtnRef.current = btn;
                    if (removeBtnRefProp) {
                      removeBtnRefProp.current = btn;
                    }
                  }}
                  className="bonsai-settings-focus-btn"
                  onClick={confirmRemove}
                  disabled={downloadBusy}
                  style={{
                    ...SETTINGS_GLASS_BTN_DANGER,
                    flex: "1 1 auto",
                    width: "100%",
                    minHeight: KB_ACTION_ROW_MIN_HEIGHT,
                    height: KB_ACTION_ROW_MIN_HEIGHT,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  {...deckNav({
                    onMoveUp: () => focusKbToggle(),
                    onMoveLeft: () => focusPrimaryBtn(),
                    onMoveDown: () => onMoveDownFromRemove?.() ?? false,
                  })}
                >
                  Remove
                </Button>
              </Focusable>
            </div>
          ) : null}
        </Focusable>
      </PanelSectionRow>
    </PanelSection>
  );
};
