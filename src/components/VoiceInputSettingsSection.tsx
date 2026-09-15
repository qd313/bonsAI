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
 * Used for: SettingsTab, when voice input is available on this device and
 * the backend's voice engine (whisper.cpp) exists.
 *
 * Solves: One place to see and fix voice-engine readiness — installed or
 * not, which model, and any install error — instead of it failing silently
 * the first time someone taps the mic button.
 *
 * Does not: Record audio or turn speech into text. That happens in the Ask
 * bar's mic button and the backend voice service; this section only picks
 * the model and manages the install.
 */
import React, { useCallback, useEffect, useState } from "react";
import { PanelSection, PanelSectionRow, Button, Focusable } from "@decky/ui";
import { toaster } from "@decky/api";
import { VOICE_STT_MODEL_OPTIONS, type VoiceSttModelId } from "../data/bonsaiSettingsSchema";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import { PermissionDenyAction } from "./PermissionDenyAction";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";

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

const MODEL_LABELS: Record<VoiceSttModelId, string> = {
  "tiny.en": "tiny.en (fastest — recommended on Deck)",
  "base.en": "base.en (more accurate, slower)",
};

type Props = {
  voiceSttModel: VoiceSttModelId;
  setVoiceSttModel: (v: VoiceSttModelId) => void;
  microphoneAccessEnabled: boolean;
  onJumpToPermission?: (capability: BonsaiCapabilityKey) => void;
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

  return (
    <PanelSection title="Voice input">
      <PanelSectionRow>
        <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
          Local speech-to-text for the Ask bar mic button. Enable the microphone permission in Permissions
          first. Audio is processed on-device and never saved.
        </div>
      </PanelSectionRow>
      {!microphoneAccessEnabled && onJumpToPermission ? (
        <PanelSectionRow>
          <PermissionDenyAction
            capability="microphone_access"
            onJump={onJumpToPermission}
            compact
          />
        </PanelSectionRow>
      ) : null}
      <PanelSectionRow>
        <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#dce8f4" }}>STT model</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {VOICE_STT_MODEL_OPTIONS.map((id) => (
              <Focusable key={id} onOKButton={() => setVoiceSttModel(id)}>
                <Button
                  onClick={() => setVoiceSttModel(id)}
                  style={{
                    textAlign: "left",
                    justifyContent: "flex-start",
                    fontSize: 12,
                    padding: "8px 10px",
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
                  {MODEL_LABELS[id]}
                </Button>
              </Focusable>
            ))}
          </div>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
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
          <Focusable onOKButton={() => void onDownloadModel()}>
            <Button
              className="bonsai-settings-focus-btn"
              onClick={() => void onDownloadModel()}
              disabled={installBusy}
            style={{
              minHeight: 38,
              fontSize: 12,
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
