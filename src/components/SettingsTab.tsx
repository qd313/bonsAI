import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
  Button,
  Focusable,
  showModal,
  ConfirmModal,
} from "@decky/ui";
import {
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  SCREENSHOT_ATTACHMENT_PRESET_OPTIONS,
  type OllamaKeepAliveDuration,
  type ScreenshotAttachmentPreset,
  type UnifiedInputPersistenceMode,
} from "../utils/settingsAndResponse";
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "../data/aiCharacterAccentIntensity";
import { formatAiCharacterSelectionLine } from "../data/characterCatalog";
import { SettingsTabConnectionTimeoutSlider } from "./SettingsTabConnectionTimeoutSlider";
import { SettingsTabOllamaKeepAliveSlider } from "./SettingsTabOllamaKeepAliveSlider";
import { SettingsTabAccentIntensityMenuPopover } from "./SettingsTabAccentIntensityMenuPopover";
import { ASK_LABEL_COLOR_50 } from "../features/unified-input/constants";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";

const TEST_CONNECTION_TIMEOUT_SECONDS = 10;

type ConnectionStatus = {
  reachable: boolean;
  version?: string;
  models?: string[];
  error?: string;
};

const persistenceModeLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Persist all text",
  persist_search_only: "Persist search-only",
  no_persist: "No persistence",
};
const persistenceModeShortLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "All",
  persist_search_only: "Search",
  no_persist: "None",
};
const persistenceModeOptions: UnifiedInputPersistenceMode[] = [
  "persist_all",
  "persist_search_only",
  "no_persist",
];
const persistenceModeDescription: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Restore all unified input text, including AI prompts.",
  persist_search_only: "Restore only text that matches settings search results.",
  no_persist: "Never restore unified input text on reopen.",
};
const screenshotPresetLabel: Record<ScreenshotAttachmentPreset, string> = {
  low: "Low",
  mid: "Mid",
  max: "Max",
};

const accentIntensityOutline: Record<AiCharacterAccentIntensityId, string> = {
  subtle: "#eab308",
  balanced: "#f97316",
  heavy: "#b91c1c",
  unleashed: "#a855f7",
};

export type SettingsTabProps = {
  ollamaIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;

  latencyWarningSeconds: number;
  requestTimeoutSeconds: number;
  latencyTimeoutsCustomEnabled: boolean;
  setLatencyTimeoutsCustomEnabled: (v: boolean) => void;
  setLatencyWarningSeconds: (v: number) => void;
  setRequestTimeoutSeconds: (v: number) => void;

  ollamaKeepAlive: OllamaKeepAliveDuration;
  setOllamaKeepAlive: (v: OllamaKeepAliveDuration) => void;

  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  setScreenshotAttachmentPreset: (v: ScreenshotAttachmentPreset) => void;

  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  setUnifiedInputPersistenceMode: (v: UnifiedInputPersistenceMode) => void;

  presetChipFadeAnimationEnabled: boolean;
  setPresetChipFadeAnimationEnabled: (v: boolean) => void;

  aiCharacterEnabled: boolean;
  setAiCharacterEnabled: (v: boolean) => void;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  setAiCharacterAccentIntensity: (v: AiCharacterAccentIntensityId) => void;

  showDebugTab: boolean;
  setShowDebugTab: (v: boolean) => void;
  desktopDebugNoteAutoSave: boolean;
  setDesktopDebugNoteAutoSave: (v: boolean) => void;
  desktopAskVerboseLogging: boolean;
  setDesktopAskVerboseLogging: (v: boolean) => void;

  onOpenCharacterPicker: () => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onResetSession: () => void;
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  latencyWarningSeconds,
  requestTimeoutSeconds,
  latencyTimeoutsCustomEnabled,
  setLatencyTimeoutsCustomEnabled,
  setLatencyWarningSeconds,
  setRequestTimeoutSeconds,
  ollamaKeepAlive,
  setOllamaKeepAlive,
  screenshotAttachmentPreset,
  setScreenshotAttachmentPreset,
  unifiedInputPersistenceMode,
  setUnifiedInputPersistenceMode,
  presetChipFadeAnimationEnabled,
  setPresetChipFadeAnimationEnabled,
  aiCharacterEnabled,
  setAiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  aiCharacterAccentIntensity,
  setAiCharacterAccentIntensity,
  showDebugTab,
  setShowDebugTab,
  desktopDebugNoteAutoSave,
  setDesktopDebugNoteAutoSave,
  desktopAskVerboseLogging,
  setDesktopAskVerboseLogging,
  onOpenCharacterPicker,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onResetSession,
}) => {
  const [deckIp, setDeckIp] = useState<string>("...");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connectionTesting, setConnectionTesting] = useState(false);

  const [accentIntensityMenuOpen, setAccentIntensityMenuOpen] = useState(false);
  const accentIntensityMenuAnchorRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuFirstItemRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuToggleOnceRef = useRef(false);

  const ollamaKeepAliveThumbHostRef = useRef<HTMLDivElement>(null);
  const screenshotDimensionNavRef = useRef<HTMLDivElement>(null);
  const ollamaIpConnectionNavRef = useRef<HTMLDivElement>(null);
  const latencyWarningThumbHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    callDeckyWithTimeout<[], string>("get_deck_ip", [], DECKY_RPC_TIMEOUT_MS)
      .then((ip) => {
        setDeckIp(ip ?? "unknown");
      })
      .catch(() => {
        setDeckIp("unknown");
      });
  }, []);

  const onTestConnection = async () => {
    const ip = ollamaIp.trim();
    if (!ip) return;
    setConnectionTesting(true);
    setConnectionStatus(null);
    try {
      const result = await callDeckyWithTimeout<[string, number], ConnectionStatus>(
        "test_ollama_connection",
        [ip, TEST_CONNECTION_TIMEOUT_SECONDS],
        TEST_CONNECTION_TIMEOUT_SECONDS * 1000 + 3000
      );
      setConnectionStatus(result);
      if (result.reachable) onPersistOllamaIp(ip);
    } catch (e: unknown) {
      setConnectionStatus({ reachable: false, error: formatDeckyRpcError(e) });
    } finally {
      setConnectionTesting(false);
    }
  };

  const toggleAccentIntensityMenu = useCallback(() => {
    if (accentIntensityMenuToggleOnceRef.current) return;
    accentIntensityMenuToggleOnceRef.current = true;
    setAccentIntensityMenuOpen((o) => !o);
    requestAnimationFrame(() => {
      accentIntensityMenuToggleOnceRef.current = false;
    });
  }, []);
  const closeAccentIntensityMenu = useCallback(() => setAccentIntensityMenuOpen(false), []);
  const focusAccentIntensityTrigger = useCallback((): boolean => {
    const btn = accentIntensityMenuAnchorRef.current?.querySelector<HTMLElement>("button.bonsai-accent-intensity-trigger");
    if (!btn) return false;
    btn.focus();
    return true;
  }, []);

  const focusScreenshotMaxDimensionFromSlider = useCallback((): boolean => {
    const root = screenshotDimensionNavRef.current;
    if (!root) return false;
    const btn = root.querySelector<HTMLElement>('button[aria-label^="Set screenshot attachment"]');
    if (!btn) return false;
    btn.focus();
    return true;
  }, []);
  const focusOllamaKeepAliveThumb = useCallback((): boolean => {
    const host = ollamaKeepAliveThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);
  const focusOllamaIpFromTimeoutSlider = useCallback((): boolean => {
    const root = ollamaIpConnectionNavRef.current;
    if (!root) return false;
    const field = root.querySelector<HTMLElement>("input, textarea");
    if (!field) return false;
    field.focus();
    return true;
  }, []);
  const focusSoftWarningFromScreenshot = useCallback((): boolean => {
    const host = latencyWarningThumbHostRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("[tabindex], button");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
      <PanelSection title="Connection">
        <PanelSectionRow>
          <div
            ref={ollamaIpConnectionNavRef}
            className="bonsai-settings-connection-host bonsai-settings-bleed"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <Focusable
              className="bonsai-settings-connection-row"
              flow-children="horizontal"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 8,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  flex: "0 1 172px",
                  width: 172,
                  maxWidth: "172px",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontVariant: "small-caps",
                    letterSpacing: "0.06em",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#b8c6d6",
                    marginBottom: 2,
                  }}
                >
                  OLLAMA IP ADDRESS
                </div>
                <TextField
                  label=""
                  value={ollamaIp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOllamaIpChange(e.target.value)}
                  style={{ width: "100%", minWidth: 0, maxWidth: "100%" }}
                />
              </div>
              <Button
                onClick={onTestConnection}
                disabled={connectionTesting || !ollamaIp.trim()}
                style={{
                  flex: "1 1 auto",
                  alignSelf: "flex-end",
                  marginBottom: 2,
                  minHeight: 38,
                  minWidth: 0,
                  height: 38,
                  maxWidth: 68,
                  padding: "0 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                  color: "#e8eef5",
                }}
                aria-label={connectionTesting ? "Testing Ollama connection" : "Test connection to Ollama"}
              >
                {connectionTesting ? "…" : "Test"}
              </Button>
            </Focusable>
            <div
              className="bonsai-prose"
              style={{
                fontSize: 10,
                color: "#6b7c90",
                lineHeight: 1.35,
                userSelect: "none",
                pointerEvents: "none",
              }}
              title="Network address of this Steam Deck (informational)"
              aria-live="polite"
            >
              {"This Deck's IP: "}
              <span style={{ color: "#8fa0b4", fontVariantNumeric: "tabular-nums" }}>{deckIp}</span>
            </div>
          </div>
        </PanelSectionRow>
        {connectionStatus && (
          <PanelSectionRow>
            {connectionStatus.reachable ? (
              <div className="bonsai-settings-bleed" style={{ fontSize: 12, color: "#81c784" }}>
                <div>Connected — Ollama v{connectionStatus.version}</div>
                {connectionStatus.models && connectionStatus.models.length > 0 && (
                  <div
                    className="bonsai-prose"
                    style={{
                      color: "#9fb7d5",
                      marginTop: 4,
                      maxHeight: 88,
                      overflowY: "auto",
                      lineHeight: 1.35,
                    }}
                  >
                    Models: {connectionStatus.models.join(", ")}
                  </div>
                )}
              </div>
            ) : (
              <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: 12, color: "tomato" }}>
                Unreachable — {connectionStatus.error}
              </div>
            )}
          </PanelSectionRow>
        )}
      </PanelSection>
      <PanelSection title="Ollama host">
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
                onMoveUpFromTimeoutThumb={focusOllamaIpFromTimeoutSlider}
              />
            </div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div
              style={{
                fontVariant: "small-caps",
                letterSpacing: "0.06em",
                fontSize: 11,
                fontWeight: 600,
                color: "#b8c6d6",
                marginBottom: 4,
              }}
            >
              VRAM: Ollama keep_alive
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
              Time to keep model loaded in VRAM after a prompt
            </div>
            <SettingsTabOllamaKeepAliveSlider
              value={ollamaKeepAlive}
              onChange={setOllamaKeepAlive}
              thumbHostRef={ollamaKeepAliveThumbHostRef}
              onMoveUp={
                latencyTimeoutsCustomEnabled
                  ? () => focusSoftWarningFromScreenshot()
                  : () => focusOllamaIpFromTimeoutSlider()
              }
              onMoveDown={() => focusScreenshotMaxDimensionFromSlider()}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Screenshots">
        <PanelSectionRow>
          <div
            ref={screenshotDimensionNavRef}
            className="bonsai-prose-host bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13 }}>Attachment quality (vision)</div>
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              Downscale image attachments to save memory.
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {SCREENSHOT_ATTACHMENT_PRESET_OPTIONS.map((option) => {
                const active = option === screenshotAttachmentPreset;
                return (
                  <Button
                    key={`preset-${option}`}
                    {...({
                      onMoveUp: () => focusOllamaKeepAliveThumb(),
                    } as Record<string, unknown>)}
                    onClick={() => setScreenshotAttachmentPreset(option)}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 4px",
                      borderRadius: 4,
                      border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#f0f4f8" : "#9fb0c0",
                      boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                    }}
                    aria-label={`Set screenshot attachment to ${option}`}
                  >
                    {screenshotPresetLabel[option]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Saved text">
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Ask / search persistence</div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {persistenceModeLabel[unifiedInputPersistenceMode]} — what reloads when you reopen the plugin.
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {persistenceModeOptions.map((mode) => {
                const active = mode === unifiedInputPersistenceMode;
                return (
                  <Button
                    key={mode}
                    onClick={() => {
                      setUnifiedInputPersistenceMode(mode);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 4px",
                      borderRadius: 4,
                      border: active ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.12)",
                      background: active
                        ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)"
                        : "rgba(255,255,255,0.04)",
                      color: active ? "#f0f4f8" : "#9fb0c0",
                      boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
                    }}
                    aria-label={`${persistenceModeLabel[mode]}: ${persistenceModeDescription[mode]}`}
                  >
                    {persistenceModeShortLabel[mode]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Main tab">
        <PanelSectionRow>
          <ToggleField
            label="Preset chip fade animation"
            description="Off: no crossfade when suggestion chips update (re-seed after Ask unchanged)."
            checked={presetChipFadeAnimationEnabled}
            onChange={(checked) => setPresetChipFadeAnimationEnabled(checked)}
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Character">
        <PanelSectionRow>
          <div
            className="bonsai-settings-ai-character-block"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <ToggleField
              label="AI characters"
              description="Preset, random, or custom voice in system prompt."
              checked={aiCharacterEnabled}
              onChange={(checked) => setAiCharacterEnabled(checked)}
            />
            {aiCharacterEnabled && (
              <>
                <Button
                  className="bonsai-ai-character-picker-open"
                  onClick={() => onOpenCharacterPicker()}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    minHeight: 38,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                    color: "#e8eef5",
                    textAlign: "left",
                  }}
                >
                  {formatAiCharacterSelectionLine({
                    random: aiCharacterRandom,
                    presetId: aiCharacterPresetId,
                    customText: aiCharacterCustomText,
                  })}
                </Button>
                <div
                  className={
                    "bonsai-settings-inline-menu-host" +
                    (accentIntensityMenuOpen ? " bonsai-settings-accent-menu-open" : "")
                  }
                  style={{ marginTop: 12, width: "100%", maxWidth: "100%", minWidth: 0, position: "relative" }}
                >
                  <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    Accent intensity
                  </div>
                  <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6, lineHeight: 1.35 }}>
                    {
                      AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)
                        ?.shortLabel ?? ""
                    }{" "}
                    — use the menu for full descriptions.
                  </div>
                  <div ref={accentIntensityMenuAnchorRef} style={{ display: "inline-flex", flexShrink: 0, position: "relative" }}>
                    <Button
                      className="bonsai-accent-intensity-trigger"
                      {...({
                        onOKButton: (evt: { stopPropagation: () => void }) => {
                          evt.stopPropagation();
                          toggleAccentIntensityMenu();
                        },
                      } as Record<string, unknown>)}
                      onClick={toggleAccentIntensityMenu}
                      aria-expanded={accentIntensityMenuOpen}
                      aria-haspopup="menu"
                      aria-label={`Accent intensity: ${
                        AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)
                          ?.shortLabel ?? ""
                      }`}
                      style={{
                        minHeight: 26,
                        padding: "4px 8px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        borderRadius: 3,
                        border: `1px solid ${accentIntensityOutline[aiCharacterAccentIntensity]}`,
                        background: "transparent",
                        color: ASK_LABEL_COLOR_50,
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        fontVariant: "small-caps",
                        letterSpacing: 0.1,
                        lineHeight: 1,
                      }}
                    >
                      <span>
                        {AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)
                          ?.shortLabel ?? ""}
                      </span>
                      <span style={{ color: "#7a8fa3", fontSize: 9, lineHeight: 1 }} aria-hidden>
                        ▾
                      </span>
                    </Button>
                    <SettingsTabAccentIntensityMenuPopover
                      open={accentIntensityMenuOpen}
                      firstMenuItemRef={accentIntensityMenuFirstItemRef}
                      selectedId={aiCharacterAccentIntensity}
                      onSelect={(id) => setAiCharacterAccentIntensity(id)}
                      onRequestClose={closeAccentIntensityMenu}
                      onFocusTrigger={focusAccentIntensityTrigger}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Advanced">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Show Debug tab"
              description="Add Debug tab: logs, errors, Steam Input jump. Default off."
              checked={showDebugTab}
              onChange={(checked) => setShowDebugTab(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Auto-save chat to Desktop notes"
              description="Append Q+A to Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md (UTC). Needs Filesystem writes."
              checked={desktopDebugNoteAutoSave}
              onChange={(checked) => setDesktopDebugNoteAutoSave(checked)}
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Verbose Ask logging to Desktop notes"
              description="Append full Ollama trace (prompts, model, replies) to bonsai-ask-trace-*.md. Needs Filesystem writes; can be large/sensitive. Latest trace also on Main → Input handling."
              checked={desktopAskVerboseLogging}
              onChange={(checked) => setDesktopAskVerboseLogging(checked)}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>
      <div
        className="bonsai-settings-cache-row"
        style={{ width: "100%", minWidth: 0, maxWidth: "100%", boxSizing: "border-box", alignSelf: "stretch" }}
      >
        <Button
          onClick={() => {
            onBeforeDeckyModal();
            const handle = showModal(
              <ConfirmModal
                strTitle="Clear session cache?"
                strDescription="Clears this session from RAM: input, reply, thread, transparency, branches, attachments, timers. Does not change settings.json, Ollama, or image files on disk."
                strOKButtonText="Clear"
                onOK={() => {
                  onResetSession();
                  onCompleteDeckyModalClose(() => handle.Close());
                }}
                onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
              />
            );
          }}
          style={{
            width: "100%",
            minHeight: 38,
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
            color: "#e8eef5",
            boxSizing: "border-box",
          }}
        >
          Clear cache...
        </Button>
      </div>
    </div>
  );
};
