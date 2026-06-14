import React from "react";
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
  DESKTOP_APP_LOG_LEVEL_OPTIONS,
  STEAM_WEB_API_KEY_MAX_LEN,
  type DesktopAppLogLevel,
} from "../utils/settingsAndResponse";

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

  bonsaiTokenStreamingEnabled: boolean;
  setBonsaiTokenStreamingEnabled: (v: boolean) => void;
  showOnscreenDebugHud: boolean;
  setShowOnscreenDebugHud: (v: boolean) => void;
};

/**
 * Opt-in power-user tab: diagnostics, logging, and integrations.
 */
export const DeveloperTab: React.FC<DeveloperTabProps> = ({
  capturedErrors,
  onClearErrors,
  onSteamInputPhase1Jump,
  lastConnectionStatus,
  desktopDebugNoteAutoSave,
  setDesktopDebugNoteAutoSave,
  desktopAskVerboseLogging,
  setDesktopAskVerboseLogging,
  desktopAppLogLevel,
  setDesktopAppLogLevel,
  filesystemWrite,
  setPresetChipFadeAnimationEnabled,
  presetChipAnimation,
  setPresetChipAnimation,
  steamWebApiKey,
  setSteamWebApiKey,
  bonsaiTokenStreamingEnabled,
  setBonsaiTokenStreamingEnabled,
  showOnscreenDebugHud,
  setShowOnscreenDebugHud,
}) => {
  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
      <PanelSection title="Diagnostics">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="On-screen debug HUD"
              description="Shows a small translucent log at the bottom of the plugin (focus, tab changes, ingest). Off by default so Settings and connection UI stay readable."
              checked={showOnscreenDebugHud}
              onChange={(checked) => setShowOnscreenDebugHud(checked)}
            />
          </div>
        </PanelSectionRow>
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
    </div>
  );
};