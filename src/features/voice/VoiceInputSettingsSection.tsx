/**
 * Title: Voice input settings section
 *
 * Purpose: The "Voice input" section on the Settings tab. Lets you choose
 * which speech-to-text model powers the microphone button on the Ask bar (a
 * faster, less accurate one, or a slower, more accurate one), shows whether
 * the voice engine is installed and ready, and has a button to install or
 * reinstall it. While an install runs, one job card (downloads/JobCard.tsx, plan 106 lane F3) stands in for that
 * button, with what it is doing, how far, the sites it comes from and the install's first Cancel; the bar at the
 * bottom of the panel shows the same install whenever the card is out of sight. If the microphone
 * permission is off, this section shows a prompt to turn it on instead of
 * letting you install anything.
 *
 * Used for: SettingsTab, inside the folded "Voice input" section (plan 91 § 2b, plan 92 T1): the section
 * line is its title, the two models sit side by side on one row, and the paragraph that used to head the
 * section rides on that row for the help strip at the bottom of the panel.
 *
 * Solves: One place to see and fix voice-engine readiness — installed or
 * not, which model, and any install error — instead of it failing silently
 * the first time someone taps the mic button.
 *
 * Does not: Record audio or turn speech into text. That happens in the Ask
 * bar's mic button and the backend voice service; this section only picks
 * the model and manages the install.
 *
 * Focus: Up from the first row (the permission button while the microphone is off, else the model row)
 * and Down from the install button go to the section's line and the next line, handed in by the tab on a
 * `Focusable` around each, since Decky's Button keeps no move handler. The install button's popup (the
 * download notice) is unchanged. While the card is up its Cancel is the row's one stop: Down goes on to the next
 * line as from the button, Up is Steam's own, and the ring goes to Cancel on the same press as the install button
 * and back to the install button when the install ends (docs/focus-graph.md, "The voice install's card").
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanelSection, PanelSectionRow, Button, Focusable } from "@decky/ui";
import { toaster } from "@decky/api";
import { VOICE_STT_MODEL_OPTIONS, type VoiceSttModelId } from "../settings/bonsaiSettingsSchema";
import { DenseRow } from "../folded-tabs/DenseRow";
import {
  SETTINGS_ROW_HELP,
  VOICE_STT_MODEL_FULL_LABEL,
  VOICE_STT_MODEL_SHORT_LABEL,
} from "../settings/settingsTabFolds";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../shared/deckyCall";
import { PermissionDenyAction } from "../permissions/PermissionDenyAction";
import { bonsaiSettingRowNav } from "../search-tab/bonsaiSettingRowNav";
import type { BonsaiCapabilityKey } from "../permissions/permissionDeepLink";
import { confirmDownload } from "../downloads/downloadNotice";
import { rememberReturnWhileBoxOpens } from "../downloads/rememberReturnWhileBoxOpens";
import { registerModalReturnFocusOwner } from "../../shared/dpad/modalReturnFocusRegistry";
import { JobCard } from "../downloads/JobCard";
import { runningJob, useRunningJob } from "../downloads/runningJobs";
import { VoiceInstallResultLines } from "./VoiceInstallResultLines";
import { helpAttributes } from "../folded-tabs/useHelpStrip";
import { useHandRingOnGone } from "../../shared/dpad/useHandRingOnGone";
import { elementHasGamepadFocus } from "../../shared/dpad/uiDocument";
import { focusInTabBody } from "../../shared/dpad/useTabBodyFocusScroll";
import { voiceEngineNotices } from "../downloads/downloadSites";
import { FOCUS_RING_BTN_CLASS, FOCUS_RING_INSET_CLASS, FOCUS_RING_WRAP_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import {
  beginVoiceInstallJob,
  noteVoiceInstallStatus,
  resumeVoiceInstallJob,
  useVoiceInstallJobReader,
  voiceInstallJobAccepted,
  voiceInstallJobRefused,
  VOICE_INSTALL_JOB,
} from "./voiceInstallJob";
import {
  markVoiceInstallStarted,
  takeVoiceInstallMarker,
  voiceInstallInStartGrace,
  voiceInstallMarkerActive,
} from "./voiceInstallBusyStore";

type VoiceEngineStatus = {
  model_id?: string;
  binary_ready?: boolean;
  model_ready?: boolean;
  ready?: boolean;
  install?: {
    phase?: string;
    stage?: string;
    progress_pct?: number;
    error?: string;
    done?: boolean;
  };
};

type Props = {
  voiceSttModel: VoiceSttModelId;
  setVoiceSttModel: (v: VoiceSttModelId) => void;
  microphoneAccessEnabled: boolean;
  onJumpToPermission?: (capability: BonsaiCapabilityKey) => void;
  /** Up from the section's first row: its line in the folded tab. */
  onMoveUpFromFirst?: () => boolean;
  /** Down from the install button: the next line. */
  onMoveDownFromLast?: () => boolean;
};

/**
 * The whole section: the model picker, the engine status line, and the
 * install/reinstall button.
 *
 * In: the currently chosen model, a callback to change it, whether the
 * microphone permission is on, and a callback to jump to the Permissions
 * tab when it is not.
 * Out: the panel section — a permission prompt if needed, the model list,
 * a status line, and the install button.
 *
 * What can go wrong: a failed install poll reads the status one last time and stops the
 * install spinner rather than throwing, since a flaky network hiccup
 * should not be read as "the install failed."
 *
 * 1. refreshStatus() asks the backend for the engine's current status
 *    (binary/model readiness) on mount and whenever the chosen model
 *    changes. If that status says an install is running, the section
 *    takes it as busy and starts the poll below, so a copy of the
 *    section built after the download box closed still follows the install.
 * 2. While installBusy is true, a repeating timer polls install progress
 *    every 1.2 seconds — polled rather than pushed from the backend — and
 *    stops itself once the backend reports the install is done or failed.
 *    On done it shows one "Voice engine ready" toast. The busy flag starts
 *    from a small module-level marker (voiceInstallBusyStore.ts), because
 *    Steam's download box closing rebuilds the tab and throws away
 *    anything kept in component state.
 * 3. onDownloadModel() first checks the microphone permission — if it is
 *    off, it either jumps to the Permissions tab or shows a toast, and
 *    never starts an install without it. Otherwise it starts the install
 *    and begins the polling above.
 * 4. Renders the permission prompt (if needed), the list of model choices
 *    as buttons, a status line built from the current engine/install
 *    state, and the install button, labeled Install/Reinstall/Installing…
 *    to match.
 */
export const VoiceInputSettingsSection: React.FC<Props> = ({
  voiceSttModel,
  setVoiceSttModel,
  microphoneAccessEnabled,
  onJumpToPermission,
  onMoveUpFromFirst,
  onMoveDownFromLast,
}) => {
  const [engineStatus, setEngineStatus] = useState<VoiceEngineStatus | null>(null);
  const [installBusy, setInstallBusy] = useState(() => voiceInstallMarkerActive());
  /* The running install as the job card shows it (voiceInstallJob.ts); it outlives this copy of the section. */
  const job = useRunningJob(VOICE_INSTALL_JOB);
  useVoiceInstallJobReader(installBusy);
  /* A copy built while an install it did not start goes on (a box closing rebuilt the tab) shows the card at once. */
  useLayoutEffect(() => {
    if (voiceInstallMarkerActive() && !runningJob(VOICE_INSTALL_JOB)) resumeVoiceInstallJob();
  }, []);
  const installNavRef = useRef<{ TakeFocus?: (gamepad?: boolean) => unknown } | null>(null);
  const cancelNavRef = useRef<{ TakeFocus?: (gamepad?: boolean) => unknown } | null>(null);
  const installBtnRef = useRef<HTMLButtonElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  /** The ring onto a stop of this row: Steam's transfer first, then the button's own focus if that did not land it. */
  const take = (node: { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null }, el: HTMLElement | null): void => {
    if (!el) return;
    try {
      node.current?.TakeFocus?.(true);
    } catch {
      /* the check below decides */
    }
    if (!elementHasGamepadFocus(el)) focusInTabBody(el);
  };
  /* The press swaps the install button for the card: a ring on the button goes to Cancel on the same press. */
  const installRowRef = useHandRingOnGone(() => take(cancelNavRef, cancelBtnRef.current));
  /* The install ends and the card goes: a ring on Cancel goes back to the install button. */
  const cancelRowRef = useHandRingOnGone(() => take(installNavRef, installBtnRef.current));

  // resume: false for the read that ends a poll, so a running install seen there does not restart it.
  const refreshStatus = useCallback(async (resume = true) => {
    try {
      const st = await callDeckyWithTimeout<[], VoiceEngineStatus>(
        "get_voice_engine_status",
        [],
        DECKY_RPC_TIMEOUT_MS,
      );
      setEngineStatus(st);
      noteVoiceInstallStatus(st?.install);
      if (resume && st?.install?.phase === "running" && !st.install.done) {
        markVoiceInstallStarted();
        setInstallBusy(true);
      }
      return st;
    } catch {
      setEngineStatus(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus, voiceSttModel]);

  /*
   * An install this copy did not start (the notice's box closed and rebuilt the tab before it began) shows up as a
   * job: this copy then follows it like its own, so the install's result is read when it ends. And whoever ends the
   * job, this copy reads the install's result once more, so a failed or cancelled install says why under the button.
   */
  const sawJobRef = useRef(false);
  /* What this copy last read of the install: a result it already holds needs no second read. */
  const installPhaseRef = useRef<string | undefined>(undefined);
  installPhaseRef.current = engineStatus?.install?.phase;
  useEffect(() => {
    if (job && !installBusy) {
      markVoiceInstallStarted();
      setInstallBusy(true);
    }
    if (job) sawJobRef.current = true;
    else if (sawJobRef.current) {
      sawJobRef.current = false;
      const held = installPhaseRef.current;
      if (held === undefined || held === "running" || held === "idle") void refreshStatus(false);
    }
  }, [job, installBusy, refreshStatus]);

  useEffect(() => {
    if (!installBusy) return;
    // Set when this poll has ended, so a tick that fires before React clears the timer does nothing.
    let ended = false;
    const id = window.setInterval(() => {
      if (ended) return;
      void callDeckyWithTimeout<[], VoiceEngineStatus["install"]>(
        "get_voice_install_status",
        [],
        DECKY_RPC_TIMEOUT_MS,
      )
        .then((install) => {
          setEngineStatus((prev) => (prev ? { ...prev, install: install ?? undefined } : prev));
          noteVoiceInstallStatus(install);
          // A just-started install may still read idle for a moment; that is not the end of it.
          const notYetSeen = install?.phase === "idle" && voiceInstallInStartGrace();
          if (!notYetSeen && (install?.done || install?.phase === "failed" || install?.phase === "done")) {
            ended = true;
            const wasOurs = takeVoiceInstallMarker();
            setInstallBusy(false);
            void refreshStatus(false);
            if (wasOurs && install?.phase === "done") {
              toaster.toast({
                title: "Voice engine ready",
                body: "Voice input is set up and ready to use.",
                duration: 4000,
              });
            }
          }
        })
        .catch(() => {
          if (ended) return;
          ended = true;
          takeVoiceInstallMarker();
          setInstallBusy(false);
          void refreshStatus(false);
        });
    }, 1200);
    return () => {
      ended = true;
      window.clearInterval(id);
    };
  }, [installBusy, refreshStatus]);

  const onDownloadModel = async () => {
    if (!microphoneAccessEnabled) {
      if (onJumpToPermission) {
        onJumpToPermission("microphone_access");
        return;
      }
      toaster.toast({
        title: "Permission required",
        body: "Enable Voice input (microphone) in the Permissions tab first.",
        duration: 4500,
      });
      return;
    }
    // Names only what is still missing; Reinstall (nothing missing) names both.
    const missing = {
      engineReady: Boolean(engineStatus?.binary_ready),
      modelReady: Boolean(engineStatus?.model_ready),
      model: voiceSttModel,
    };
    const notices = voiceEngineNotices(missing);
    const toFetch = notices.length ? notices : voiceEngineNotices({ ...missing, engineReady: false, modelReady: false });
    // The notice's box rebuilds the tab on close; the ring comes back to this button, or to the card's Cancel once it is up.
    if (!(await rememberReturnWhileBoxOpens("voice-install", () => confirmDownload(toFetch)))) return;
    markVoiceInstallStarted();
    setInstallBusy(true);
    beginVoiceInstallJob(missing.engineReady);
    try {
      const out = await callDeckyWithTimeout<[string], { accepted?: boolean; reason?: string }>(
        "install_voice_engine",
        [voiceSttModel],
        DECKY_RPC_TIMEOUT_MS,
      );
      if (!out?.accepted) {
        voiceInstallJobRefused();
        takeVoiceInstallMarker();
        setInstallBusy(false);
        toaster.toast({
          title: "Install not started",
          body: out?.reason ?? "Could not start voice engine install.",
          duration: 5000,
        });
        return;
      }
      voiceInstallJobAccepted();
      toaster.toast({
        title: "Installing voice engine",
        body: `Installing whisper-cli and downloading ${voiceSttModel}…`,
        duration: 3000,
      });
    } catch (e: unknown) {
      voiceInstallJobRefused();
      takeVoiceInstallMarker();
      setInstallBusy(false);
      toaster.toast({
        title: "Download failed",
        body: formatDeckyRpcError(e),
        duration: 5000,
      });
    }
  };

  const binaryReady = Boolean(engineStatus?.binary_ready);
  const modelReady = Boolean(engineStatus?.model_ready);
  const engineReady = binaryReady && modelReady;
  const install = engineStatus?.install;
  const cancelled = install?.phase === "cancelled";
  const installActionLabel = installBusy
    ? "Installing…"
    : engineReady
      ? "Reinstall voice engine"
      : "Install voice engine";

  const permissionRowShown = !microphoneAccessEnabled && Boolean(onJumpToPermission);
  return (
    <PanelSection>
      {permissionRowShown ? (
        <PanelSectionRow>
          <Focusable {...({ onMoveUp: onMoveUpFromFirst } as Record<string, unknown>)}>
            <PermissionDenyAction capability="microphone_access" onJump={onJumpToPermission!} compact />
          </Focusable>
        </PanelSectionRow>
      ) : null}
      <PanelSectionRow>
        <DenseRow kind="choice" label="STT model" help={SETTINGS_ROW_HELP.voiceInput}>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0 }}
              {...(permissionRowShown ? {} : ({ onMoveUp: onMoveUpFromFirst } as Record<string, unknown>))}
              {...({ navRef: bonsaiSettingRowNav("stt-model") } as Record<string, unknown>)}
            >
              {VOICE_STT_MODEL_OPTIONS.map((id) => (
                <Focusable
                  key={id}
                  className={FOCUS_RING_WRAP_CLASS}
                  style={{ flex: 1, minWidth: 0, display: "flex" }}
                  onOKButton={() => setVoiceSttModel(id)}
                >
                  <Button
                    className={`${FOCUS_RING_BTN_CLASS} ${FOCUS_RING_INSET_CLASS}`}
                    onClick={() => setVoiceSttModel(id)}
                    aria-label={VOICE_STT_MODEL_FULL_LABEL[id]}
                    aria-pressed={voiceSttModel === id}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 30,
                      fontSize: textPx(12),
                      padding: "3px 4px",
                      borderRadius: 4,
                      border:
                        voiceSttModel === id
                          ? "1px solid rgba(156, 231, 255, 0.55)"
                          : "1px solid rgba(255,255,255,0.12)",
                      background:
                        voiceSttModel === id
                          ? "rgba(56, 189, 248, 0.12)"
                          : "rgba(255,255,255,0.04)",
                      color: "#e8eef5",
                    }}
                  >
                    {VOICE_STT_MODEL_SHORT_LABEL[id]}
                  </Button>
                </Focusable>
              ))}
            </Focusable>
          </div>
        </DenseRow>
      </PanelSectionRow>
      <PanelSectionRow>
        <div className="bonsai-settings-bleed" style={{ fontSize: textPx(12), color: "#9fb7d5", lineHeight: 1.45 }}>
          Engine: {binaryReady ? "whisper-cli ready" : "whisper-cli not installed"}
          <br />
          Model: {modelReady ? `${voiceSttModel} ready` : `${voiceSttModel} not downloaded`}
          {engineReady && !installBusy ? (
            <>
              <br />
              Voice engine is ready for on-device transcription.
            </>
          ) : null}
          {!engineReady && !installBusy ? (
            <>
              <br />
              Tap Install voice engine below (uses podman on SteamOS).
            </>
          ) : null}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        {job ? (
          <JobCard
            job={job}
            cancelLabel="Cancel the voice install"
            cancelNavRef={cancelNavRef}
            // Down goes on to the next line as it did from the install button; Up is Steam's own.
            onMoveUp={() => false}
            onMoveDown={() => onMoveDownFromLast?.() ?? false}
            cancelRowRef={cancelRowRef}
            cancelButtonRef={(el) => {
              cancelBtnRef.current = el;
              // The restore comes from outside this row (the tab was rebuilt): Steam's own transfer, not a plain focus().
              registerModalReturnFocusOwner("voice-install", el, el ? () => (take(cancelNavRef, el), true) : undefined);
            }}
            help={helpAttributes(job.face.title, "Cancel stops the install. A half-downloaded speech model is not kept.")}
          />
        ) : (
          <div ref={installRowRef} className="bonsai-settings-focus-btn-host">
            <Focusable
              className={FOCUS_RING_WRAP_CLASS}
              onOKButton={() => void onDownloadModel()}
              {...({ onMoveDown: onMoveDownFromLast, navRef: installNavRef } as Record<string, unknown>)}
            >
              <Button
                ref={(el: HTMLDivElement | null) => {
                  installBtnRef.current = el as HTMLButtonElement | null;
                  registerModalReturnFocusOwner("voice-install", el as HTMLElement | null, el ? () => (take(installNavRef, el), true) : undefined);
                }}
                className={`${FOCUS_RING_BTN_CLASS} ${FOCUS_RING_INSET_CLASS}`}
                onClick={() => void onDownloadModel()}
                disabled={installBusy}
                style={{
                  minHeight: 38,
                  fontSize: textPx(12),
                  fontWeight: 600,
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                  color: "#e8eef5",
                }}
              >
                {installActionLabel}
              </Button>
            </Focusable>
          </div>
        )}
      </PanelSectionRow>
      {/* Under the button, while no install runs: the last result and the sites the install comes from. */}
      {job ? null : (
        <PanelSectionRow>
          <VoiceInstallResultLines cancelled={cancelled} errorText={cancelled ? "" : (install?.error ?? "").trim()} />
        </PanelSectionRow>
      )}
    </PanelSection>
  );
};
