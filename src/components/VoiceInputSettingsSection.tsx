import React, { useCallback, useEffect, useState } from "react";
import { PanelSection, PanelSectionRow, Button, Focusable } from "@decky/ui";
import { toaster } from "@decky/api";
import {
  VOICE_STT_MODEL_OPTIONS,
  type VoiceSttModelId,
} from "../utils/settingsAndResponse";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";

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
};

export const VoiceInputSettingsSection: React.FC<Props> = ({
  voiceSttModel,
  setVoiceSttModel,
  microphoneAccessEnabled,
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

  const ready = Boolean(engineStatus?.ready);
  const binaryReady = Boolean(engineStatus?.binary_ready);
  const modelReady = Boolean(engineStatus?.model_ready);
  const install = engineStatus?.install;
  const progress = install?.progress_pct ?? 0;

  return (
    <PanelSection title="Voice input">
      <PanelSectionRow>
        <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
          Local speech-to-text for the Ask bar mic button. Enable the microphone permission in Permissions
          first. Audio is processed on-device and never saved.
        </div>
      </PanelSectionRow>
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
          {!ready && !installBusy ? (
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
        <Focusable onOKButton={() => void onDownloadModel()}>
          <Button
            onClick={() => void onDownloadModel()}
            disabled={installBusy || ready}
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
            {ready ? "Voice engine ready" : installBusy ? "Installing…" : "Install voice engine"}
          </Button>
        </Focusable>
      </PanelSectionRow>
    </PanelSection>
  );
};
