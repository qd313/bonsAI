import React, { useCallback, useRef } from "react";
import {
  Button,
  ButtonItem,
  Focusable,
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
} from "@decky/ui";
import {
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  DESKTOP_APP_LOG_LEVEL_OPTIONS,
  RESPONSE_VERIFY_MODEL_MAX_LEN,
  STEAM_WEB_API_KEY_MAX_LEN,
  type DesktopAppLogLevel,
  type OllamaKeepAliveDuration,
} from "../utils/settingsAndResponse";
import { MODEL_POLICY_SETTINGS_INTRO, type ModelPolicyTierId } from "../data/modelPolicy";
import { SettingsTabConnectionTimeoutSlider } from "./SettingsTabConnectionTimeoutSlider";
import { SettingsTabOllamaKeepAliveSlider } from "./SettingsTabOllamaKeepAliveSlider";

const desktopAppLogLevelLabel: Record<DesktopAppLogLevel, string> = {
  off: "Off",
  default: "Default",
  verbose: "Verbose",
};
const desktopAppLogLevelDescription: Record<DesktopAppLogLevel, string> = {
  off: "No app activity log file on Desktop.",
  default: "Summary events (connection tests, asks, settings changes).",
  verbose: "Default events plus RPC details, setup log lines, and frontend errors.",
};

export type DeveloperConnectionStatus = {
  reachable: boolean;
  version?: string;
  models?: string[];
  ps_loaded?: Array<{
    name: string;
    size_bytes: number;
    size_vram_bytes: number;
    vram_weight_share_pct_appx: number | null;
  }>;
  error?: string;
  recovery_attempted?: boolean;
};

export type DeveloperTabProps = {
  capturedErrors: string[];
  onClearErrors: () => void;
  onSteamInputPhase1Jump?: () => void;
  lastConnectionStatus?: DeveloperConnectionStatus | null;

  latencyWarningSeconds: number;
  requestTimeoutSeconds: number;
  latencyTimeoutsCustomEnabled: boolean;
  setLatencyTimeoutsCustomEnabled: (v: boolean) => void;
  setLatencyWarningSeconds: (v: number) => void;
  setRequestTimeoutSeconds: (v: number) => void;

  ollamaKeepAlive: OllamaKeepAliveDuration;
  setOllamaKeepAlive: (v: OllamaKeepAliveDuration) => void;

  desktopDebugNoteAutoSave: boolean;
  setDesktopDebugNoteAutoSave: (v: boolean) => void;
  desktopAskVerboseLogging: boolean;
  setDesktopAskVerboseLogging: (v: boolean) => void;
  desktopAppLogLevel: DesktopAppLogLevel;
  setDesktopAppLogLevel: (v: DesktopAppLogLevel) => void;
  filesystemWrite: boolean;
  attachProtonLogsWhenTroubleshooting: boolean;
  setAttachProtonLogsWhenTroubleshooting: (v: boolean) => void;

  presetChipFadeAnimationEnabled: boolean;
  setPresetChipFadeAnimationEnabled: (v: boolean) => void;
  presetChipAnimation: import("../utils/settingsAndResponse").PresetChipAnimation;
  setPresetChipAnimation: (v: import("../utils/settingsAndResponse").PresetChipAnimation) => void;

  steamWebApiKey: string;
  setSteamWebApiKey: (v: string) => void;

  modelPolicyTier: ModelPolicyTierId;
  modelPolicyNonFossUnlocked: boolean;
  setModelPolicyNonFossUnlocked: (v: boolean) => void;
  modelAllowHighVramFallbacks: boolean;
  setModelAllowHighVramFallbacks: (v: boolean) => void;
  onSelectModelPolicyTier: (t: ModelPolicyTierId) => void;
  onReadModelPolicy: () => void;
  bonsaiTokenStreamingEnabled: boolean;
  setBonsaiTokenStreamingEnabled: (v: boolean) => void;
  responseVerifyEnabled: boolean;
  setResponseVerifyEnabled: (v: boolean) => void;
  responseVerifySecondPass: boolean;
  setResponseVerifySecondPass: (v: boolean) => void;
  responseVerifyModel: string;
  setResponseVerifyModel: (v: string) => void;
};

/**
 * Opt-in power-user tab: diagnostics, logging, connection tuning, integrations, and model routing advanced.
 */
export const DeveloperTab: React.FC<DeveloperTabProps> = ({
  capturedErrors,
  onClearErrors,
  onSteamInputPhase1Jump,
  lastConnectionStatus,
  latencyWarningSeconds,
  requestTimeoutSeconds,
  latencyTimeoutsCustomEnabled,
  setLatencyTimeoutsCustomEnabled,
  setLatencyWarningSeconds,
  setRequestTimeoutSeconds,
  ollamaKeepAlive,
  setOllamaKeepAlive,
  desktopDebugNoteAutoSave,
  setDesktopDebugNoteAutoSave,
  desktopAskVerboseLogging,
  setDesktopAskVerboseLogging,
  desktopAppLogLevel,
  setDesktopAppLogLevel,
  filesystemWrite,
  attachProtonLogsWhenTroubleshooting,
  setAttachProtonLogsWhenTroubleshooting,
  setPresetChipFadeAnimationEnabled,
  presetChipAnimation,
  setPresetChipAnimation,
  steamWebApiKey,
  setSteamWebApiKey,
  modelPolicyTier,
  modelPolicyNonFossUnlocked,
  setModelPolicyNonFossUnlocked,
  modelAllowHighVramFallbacks,
  setModelAllowHighVramFallbacks,
  onSelectModelPolicyTier,
  onReadModelPolicy,
  bonsaiTokenStreamingEnabled,
  setBonsaiTokenStreamingEnabled,
  responseVerifyEnabled,
  setResponseVerifyEnabled,
  responseVerifySecondPass,
  setResponseVerifySecondPass,
  responseVerifyModel,
  setResponseVerifyModel,
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

  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
      <PanelSection title="Diagnostics">
        {onSteamInputPhase1Jump ? (
          <PanelSectionRow>
            <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#9fb7d5", marginBottom: 6 }}>
              Experimental: opens per-game controller configuration for the running game. Requires a focused/running
              title.
            </div>
            <ButtonItem layout="below" onClick={onSteamInputPhase1Jump}>
              Jump to Steam Input (running game)
            </ButtonItem>
          </PanelSectionRow>
        ) : null}
        <PanelSectionRow>
          <div style={{ fontSize: 13, color: "gray", marginBottom: 4 }}>
            Captured runtime errors appear below.
          </div>
        </PanelSectionRow>
        {capturedErrors.length > 0 ? (
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={onClearErrors}>
              <span style={{ fontSize: 12 }}>Clear ({capturedErrors.length})</span>
            </ButtonItem>
          </PanelSectionRow>
        ) : null}
        {capturedErrors.length === 0 ? (
          <PanelSectionRow>
            <div style={{ color: "gray", fontSize: 13 }}>No errors captured.</div>
          </PanelSectionRow>
        ) : (
          capturedErrors.map((err, i) => (
            <PanelSectionRow key={`err-${i}`}>
              <Focusable
                onActivate={() => {}}
                noFocusRing={false}
                style={{
                  background: "#111",
                  padding: 8,
                  color: "tomato",
                  whiteSpace: "pre-wrap",
                  fontSize: 11,
                  lineHeight: "1.3",
                  borderRadius: 4,
                  wordBreak: "break-word",
                }}
              >
                {err}
              </Focusable>
            </PanelSectionRow>
          ))
        )}
        {lastConnectionStatus?.reachable && lastConnectionStatus.ps_loaded && lastConnectionStatus.ps_loaded.length > 0 ? (
          <PanelSectionRow>
            <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 11, color: "#b8dfe8", lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#9fb7d5" }}>
                Last connection test — loaded models (GPU share)
              </div>
              {lastConnectionStatus.ps_loaded.map((m) => (
                <div key={m.name} style={{ marginBottom: 6 }}>
                  <span style={{ color: "#9ce7ff" }}>{m.name}</span>
                  {m.vram_weight_share_pct_appx != null ? (
                    <>
                      {": "}
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        ~{m.vram_weight_share_pct_appx}% in GPU-visible VRAM ({m.size_vram_bytes} / {m.size_bytes} B)
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "#9fb7d5" }}>: (no size split from Ollama)</span>
                  )}
                </div>
              ))}
            </div>
          </PanelSectionRow>
        ) : null}
      </PanelSection>

      <PanelSection title="Logging & exports">
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              App activity logging to Desktop
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {desktopAppLogLevelDescription[desktopAppLogLevel]} Writes{" "}
              <span style={{ color: "#9ce7ff" }}>bonsai-app-YYYY-MM-DD.log</span> under Desktop/bonsAI_logs/.
              {!filesystemWrite ? (
                <span style={{ display: "block", marginTop: 6, color: "#fbbf24" }}>
                  Enable Save files to Desktop in Permissions to save logs.
                </span>
              ) : null}
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {DESKTOP_APP_LOG_LEVEL_OPTIONS.map((level) => {
                const active = level === desktopAppLogLevel;
                return (
                  <Button
                    key={level}
                    onClick={() => setDesktopAppLogLevel(level)}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 4px",
                      borderRadius: 4,
                      border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#e0f2fe" : "#9fb0c0",
                    }}
                    aria-label={`${desktopAppLogLevelLabel[level]}: ${desktopAppLogLevelDescription[level]}`}
                  >
                    {desktopAppLogLevelLabel[level]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Auto-save chat to Desktop notes"
              description="Append Q+A to Desktop/bonsAI_logs/bonsai-chat-YYYY-MM-DD.md (UTC). Needs Save files to Desktop."
              checked={desktopDebugNoteAutoSave}
              onChange={(checked) => setDesktopDebugNoteAutoSave(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Verbose Ask logging to Desktop notes"
              description="Full Ollama trace to bonsai-ask-trace-*.md under Desktop/bonsAI_logs. Can be large/sensitive."
              checked={desktopAskVerboseLogging}
              onChange={(checked) => setDesktopAskVerboseLogging(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Preset suggestions</div>
            <Focusable flow-children="horizontal" style={{ display: "flex", gap: 6, width: "100%" }}>
              {(["fade", "carousel", "static"] as const).map((mode) => (
                <Button
                  key={mode}
                  onClick={() => {
                    setPresetChipAnimation(mode);
                    setPresetChipFadeAnimationEnabled(mode === "fade");
                  }}
                  style={{
                    flex: 1,
                    minHeight: 32,
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border:
                      mode === presetChipAnimation
                        ? "1px solid rgba(56,189,248,0.55)"
                        : "1px solid rgba(255,255,255,0.12)",
                    background:
                      mode === presetChipAnimation
                        ? "linear-gradient(180deg, rgba(56,189,248,0.22) 0%, rgba(14,116,144,0.35) 100%)"
                        : "rgba(255,255,255,0.04)",
                    color: mode === presetChipAnimation ? "#e0f2fe" : "#9fb0c0",
                  }}
                  aria-label={`Preset animation: ${mode}`}
                >
                  {mode}
                </Button>
              ))}
            </Focusable>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Token streaming (experimental)"
              description="Render Ollama replies as they stream. TDP banners, strategy branches, model-policy disclosure, and spoilers still apply at the end of the reply."
              checked={bonsaiTokenStreamingEnabled}
              onChange={(checked) => setBonsaiTokenStreamingEnabled(checked)}
            />
          </div>
        </PanelSectionRow>
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
                setResponseVerifyModel(
                  e?.target?.value?.slice(0, RESPONSE_VERIFY_MODEL_MAX_LEN) ?? ""
                )
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

      <PanelSection title="Integrations">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Steam Web API key</div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
              For the <span style={{ color: "#9ce7ff" }}>bonsai:vac-check</span> command. Enable Steam ban lookup in
              Permissions. Stored on this device.
            </div>
            <TextField
              label=""
              value={steamWebApiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value.slice(0, STEAM_WEB_API_KEY_MAX_LEN);
                setSteamWebApiKey(v);
              }}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Model routing (advanced)">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.45, marginBottom: 10 }}>
              {MODEL_POLICY_SETTINGS_INTRO}
            </div>
            <ToggleField
              label="Allow non-FOSS and unclassified Ollama tags (Tier 3)"
              description="Required for Tier 3 / Any installed model. Turn off to fall back from Tier 3 to open-weight."
              checked={modelPolicyNonFossUnlocked}
              onChange={(checked) => {
                setModelPolicyNonFossUnlocked(checked);
                if (!checked && modelPolicyTier === "non_foss") {
                  onSelectModelPolicyTier("open_weight");
                }
              }}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Allow high-VRAM model fallbacks"
              description="Adds large-model tags after the ~16GB-friendly chain. Can OOM or load slowly."
              checked={modelAllowHighVramFallbacks}
              onChange={(checked) => setModelAllowHighVramFallbacks(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <Button onClick={onReadModelPolicy}>Read model policy (README)…</Button>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};