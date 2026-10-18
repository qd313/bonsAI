/**
 * Title: Voice input settings section
 *
 * Purpose: The "Voice input" section on the Settings tab. Lets you choose
 * which speech-to-text model powers the microphone button on the Ask bar (a
 * faster, less accurate one, or a slower, more accurate one), shows whether
 * the voice engine is installed and ready, and has a button to install or
 * reinstall it, with a progress line while that runs. If the microphone
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
 * download notice) is unchanged.
 */
import React, { useCallback, useEffect, useState } from "react";
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
import type { BonsaiCapabilityKey } from "../permissions/permissionDeepLink";
import { confirmDownload } from "../downloads/downloadNotice";
import { voiceEngineNotices } from "../downloads/downloadSites";
import { FOCUS_RING_BTN_CLASS, FOCUS_RING_INSET_CLASS, FOCUS_RING_WRAP_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";

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
 * What can go wrong: a failed status or install poll just stops the
 * install spinner rather than throwing, since a flaky network hiccup
 * should not be read as "the install failed."
 *
 * 1. refreshStatus() asks the backend for the engine's current status
 *    (binary/model readiness) on mount and whenever the chosen model
 *    changes.
 * 2. While installBusy is true, a repeating timer polls install progress
 *    every 1.2 seconds — polled rather than pushed from the backend — and
 *    stops itself once the backend reports the install is done or failed.
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
  const [installBusy, setInstallBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const st = await callDeckyWithTimeout<[], VoiceEngineStatus>(
        "get_voice_engine_status",
        [],
        DECKY_RPC_TIMEOUT_MS,
      );
      setEngineStatus(st);
      return st;
    } catch {
      setEngineStatus(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus, voiceSttModel]);

  useEffect(() => {
    if (!installBusy) return;
    const id = window.setInterval(() => {
      void callDeckyWithTimeout<[], VoiceEngineStatus["install"]>(
        "get_voice_install_status",
        [],
        DECKY_RPC_TIMEOUT_MS,
      )
        .then((install) => {
          setEngineStatus((prev) => (prev ? { ...prev, install: install ?? undefined } : prev));
          if (install?.done || install?.phase === "failed" || install?.phase === "done") {
            setInstallBusy(false);
            void refreshStatus();
          }
        })
        .catch(() => setInstallBusy(false));
    }, 1200);
    return () => window.clearInterval(id);
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
    if (!(await confirmDownload(toFetch))) return;
    setInstallBusy(true);
    try {
      const out = await callDeckyWithTimeout<[string], { accepted?: boolean; reason?: string }>(
        "install_voice_engine",
        [voiceSttModel],
        DECKY_RPC_TIMEOUT_MS,
      );
      if (!out?.accepted) {
        setInstallBusy(false);
        toaster.toast({
          title: "Install not started",
          body: out?.reason ?? "Could not start voice engine install.",
          duration: 5000,
        });
        return;
      }
      toaster.toast({
        title: "Installing voice engine",
        body: `Installing whisper-cli and downloading ${voiceSttModel}…`,
        duration: 3000,
      });
    } catch (e: unknown) {
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
  const progress = install?.progress_pct ?? 0;
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
          {installBusy && install?.stage ? (
            <>
              <br />
              {install.stage}
              {progress > 0 ? ` (${progress}%)` : ""}
            </>
          ) : null}
          {install?.error ? (
            <>
              <br />
              <span style={{ color: "#f87171" }}>{install.error}</span>
            </>
          ) : null}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div className="bonsai-settings-focus-btn-host">
          <Focusable
            className={FOCUS_RING_WRAP_CLASS}
            onOKButton={() => void onDownloadModel()}
            {...({ onMoveDown: onMoveDownFromLast } as Record<string, unknown>)}
          >
            <Button
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
      </PanelSectionRow>
    </PanelSection>
  );
};
