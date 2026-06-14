import React, { useCallback, useRef } from "react";
import { Button, PanelSection, PanelSectionRow, TextField, ToggleField } from "@decky/ui";
import {
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  RESPONSE_VERIFY_MODEL_MAX_LEN,
  type OllamaKeepAliveDuration,
} from "../utils/settingsAndResponse";
import { MODEL_POLICY_TIER_LABELS_PLAIN, type ModelPolicyTierId } from "../data/modelPolicy";
import type { DeveloperConnectionStatus } from "./DeveloperTab";
import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { SettingsTabConnectionTimeoutSlider } from "./SettingsTabConnectionTimeoutSlider";
import { SettingsTabOllamaKeepAliveSlider } from "./SettingsTabOllamaKeepAliveSlider";
import type { NamedOllamaHost } from "../utils/settingsAndResponse";

export type OllamaTabProps = {
  ollamaIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;
  ollamaLocalOnDeck: boolean;
  setOllamaLocalOnDeck: (v: boolean) => void;
  onLastConnectionStatus?: (status: DeveloperConnectionStatus | null) => void;
  lastConnectionStatus?: DeveloperConnectionStatus | null;
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onOpenOllamaModelsHub: (opts?: { initialSection?: "policy" | "browse" | "advanced" }) => void;

  responseVerifyEnabled: boolean;
  setResponseVerifyEnabled: (v: boolean) => void;
  responseVerifySecondPass: boolean;
  setResponseVerifySecondPass: (v: boolean) => void;
  responseVerifyModel: string;
  setResponseVerifyModel: (v: string) => void;

  latencyWarningSeconds: number;
  requestTimeoutSeconds: number;
  latencyTimeoutsCustomEnabled: boolean;
  setLatencyTimeoutsCustomEnabled: (v: boolean) => void;
  setLatencyWarningSeconds: (v: number) => void;
  setRequestTimeoutSeconds: (v: number) => void;
  ollamaKeepAlive: OllamaKeepAliveDuration;
  setOllamaKeepAlive: (v: OllamaKeepAliveDuration) => void;

  modelPolicyTier: ModelPolicyTierId;
};

export const OllamaTab: React.FC<OllamaTabProps> = ({
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  ollamaLocalOnDeck,
  setOllamaLocalOnDeck,
  onLastConnectionStatus,
  lastConnectionStatus,
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onOpenOllamaModelsHub,
  responseVerifyEnabled,
  setResponseVerifyEnabled,
  responseVerifySecondPass,
  setResponseVerifySecondPass,
  responseVerifyModel,
  setResponseVerifyModel,
  latencyWarningSeconds,
  requestTimeoutSeconds,
  latencyTimeoutsCustomEnabled,
  setLatencyTimeoutsCustomEnabled,
  setLatencyWarningSeconds,
  setRequestTimeoutSeconds,
  ollamaKeepAlive,
  setOllamaKeepAlive,
  modelPolicyTier,
}) => {
  const latencyWarningThumbHostRef = useRef<HTMLDivElement>(null);
  const ollamaKeepAliveThumbHostRef = useRef<HTMLDivElement>(null);

  const focusOllamaKeepAliveThumb = useCallback((): boolean => {
    const host = ollamaKeepAliveThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusLatencyWarningThumb = useCallback((): boolean => {
    const host = latencyWarningThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const installedCount =
    lastConnectionStatus?.reachable && Array.isArray(lastConnectionStatus.models)
      ? lastConnectionStatus.models.length
      : null;

  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
      <OllamaWhereAiRunsSection
        ollamaIp={ollamaIp}
        onOllamaIpChange={onOllamaIpChange}
        onPersistOllamaIp={onPersistOllamaIp}
        ollamaLocalOnDeck={ollamaLocalOnDeck}
        setOllamaLocalOnDeck={setOllamaLocalOnDeck}
        onLastConnectionStatus={onLastConnectionStatus}
        namedOllamaHosts={namedOllamaHosts}
        setNamedOllamaHosts={setNamedOllamaHosts}
        onBeforeDeckyModal={onBeforeDeckyModal}
        onCompleteDeckyModalClose={onCompleteDeckyModalClose}
        onOpenOllamaModelsHub={onOpenOllamaModelsHub}
      />

      <PanelSection title="Response verification">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Response verify (rules)"
              description="After Ollama, run lightweight rules (e.g. invented AppID without game context). May append a short caution line; logs avoid raw user text."
              checked={responseVerifyEnabled}
              onChange={(checked) => setResponseVerifyEnabled(checked)}
            />
            <ToggleField
              label="Response verify second pass (model)"
              description="When rules fail (or rules are off), ask the verifier model below via Ollama. Requires a pulled tag on the active host."
              checked={responseVerifySecondPass}
              onChange={(checked) => setResponseVerifySecondPass(checked)}
            />
            <TextField
              label="Verifier model tag"
              description="Ollama tag for the second pass (e.g. qwen2.5:3b). Leave empty to disable the model call."
              value={responseVerifyModel}
              onChange={(e) =>
                setResponseVerifyModel(e?.target?.value?.slice(0, RESPONSE_VERIFY_MODEL_MAX_LEN) ?? "")
              }
              disabled={!responseVerifySecondPass}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Connection tuning">
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
              />
            </div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Keep models loaded</div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
              How long Ollama keeps the model in memory after a prompt (VRAM on the host).
            </div>
            <SettingsTabOllamaKeepAliveSlider
              value={ollamaKeepAlive}
              onChange={setOllamaKeepAlive}
              thumbHostRef={ollamaKeepAliveThumbHostRef}
              onMoveUp={latencyTimeoutsCustomEnabled ? focusLatencyWarningThumb : undefined}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Models & routing">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%", minWidth: 0 }}>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#8fa0b4", lineHeight: 1.35, marginBottom: 8 }}>
              Policy tiers, installed models, pull/delete, and advanced routing.
              {installedCount != null ? (
                <span style={{ display: "block", marginTop: 4, color: "#9fb7d5" }}>
                  Installed on host: {installedCount} model{installedCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <Button
              onClick={() => onOpenOllamaModelsHub({ initialSection: "policy" })}
              style={{
                width: "100%",
                minHeight: 36,
                fontSize: 12,
                fontWeight: 600,
                textAlign: "left",
              }}
              aria-label="Open AI models hub"
            >
              Open AI models… — {MODEL_POLICY_TIER_LABELS_PLAIN[modelPolicyTier]}
            </Button>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};
