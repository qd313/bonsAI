import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ToggleField,
  Button,
  Focusable,
  showModal,
  ConfirmModal,
} from "@decky/ui";
import {
  SCREENSHOT_ATTACHMENT_PRESET_OPTIONS,
  type ScreenshotAttachmentPreset,
  type UnifiedInputPersistenceMode,
} from "../utils/settingsAndResponse";
import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "../data/aiCharacterAccentIntensity";
import { formatAiCharacterSelectionLine } from "../data/characterCatalog";
import { SettingsTabAccentIntensityMenuPopover } from "./SettingsTabAccentIntensityMenuPopover";
import { ASK_LABEL_COLOR_50 } from "../features/unified-input/constants";
import {
  consumeSettingsTabLocalPending,
  peekSettingsTabLocalPending,
  registerSettingsTabLocalGetter,
  unregisterSettingsTabLocalGetter,
} from "../utils/settingsTabLocalSurvival";
import { VoiceInputSettingsSection } from "./VoiceInputSettingsSection";
import type { VoiceSttModelId } from "../utils/settingsAndResponse";

const persistenceModeLabel: Record<UnifiedInputPersistenceMode, string> = {
  persist_all: "Remember everything",
  persist_search_only: "Remember search only",
  no_persist: "Don't remember",
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
  persist_all: "Restore all typed text when you reopen the plugin.",
  persist_search_only: "Restore only text from Steam settings search.",
  no_persist: "Never restore typed text on reopen.",
};
const screenshotPresetLabel: Record<ScreenshotAttachmentPreset, string> = {
  low: "Save memory",
  mid: "Balanced",
  max: "Best detail",
};

const accentIntensityOutline: Record<AiCharacterAccentIntensityId, string> = {
  subtle: "#eab308",
  balanced: "#f97316",
  heavy: "#b91c1c",
  unleashed: "#a855f7",
};

export type SettingsTabProps = {
  screenshotAttachmentPreset: ScreenshotAttachmentPreset;
  setScreenshotAttachmentPreset: (v: ScreenshotAttachmentPreset) => void;

  unifiedInputPersistenceMode: UnifiedInputPersistenceMode;
  setUnifiedInputPersistenceMode: (v: UnifiedInputPersistenceMode) => void;

  aiCharacterEnabled: boolean;
  setAiCharacterEnabled: (v: boolean) => void;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  setAiCharacterAccentIntensity: (v: AiCharacterAccentIntensityId) => void;

  showDeveloperTab: boolean;
  setShowDeveloperTab: (v: boolean) => void;

  strategySpoilerMaskingEnabled: boolean;
  setStrategySpoilerMaskingEnabled: (v: boolean) => void;

  voiceSttModel: VoiceSttModelId;
  setVoiceSttModel: (v: VoiceSttModelId) => void;
  microphoneAccessEnabled: boolean;

  onOpenCharacterPicker: () => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onResetSession: () => void;
  onClearAllPluginData: () => void | Promise<void>;
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  screenshotAttachmentPreset,
  setScreenshotAttachmentPreset,
  unifiedInputPersistenceMode,
  setUnifiedInputPersistenceMode,
  aiCharacterEnabled,
  setAiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  aiCharacterAccentIntensity,
  setAiCharacterAccentIntensity,
  showDeveloperTab,
  setShowDeveloperTab,
  strategySpoilerMaskingEnabled,
  setStrategySpoilerMaskingEnabled,
  voiceSttModel,
  setVoiceSttModel,
  microphoneAccessEnabled,
  onOpenCharacterPicker,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onResetSession,
  onClearAllPluginData,
}) => {
  const [accentIntensityMenuOpen, setAccentIntensityMenuOpen] = useState(
    () => peekSettingsTabLocalPending()?.accentIntensityMenuOpen ?? false
  );
  const accentIntensityMenuAnchorRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuFirstItemRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuToggleOnceRef = useRef(false);
  const screenshotDimensionNavRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const local = consumeSettingsTabLocalPending();
    if (!local) return;
    setAccentIntensityMenuOpen(local.accentIntensityMenuOpen);
  }, []);

  useEffect(() => {
    registerSettingsTabLocalGetter(() => ({
      accentIntensityMenuOpen,
    }));
    return () => unregisterSettingsTabLocalGetter();
  }, [accentIntensityMenuOpen]);

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

  return (
    <div className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack">
      <PanelSection title="Screenshot quality">
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
              <div style={{ color: "#d9d9d9", fontWeight: 600, fontSize: 13 }}>Screenshot quality</div>
            </div>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              For vision questions — lower quality uses less memory.
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
                    aria-label={`Set screenshot quality to ${screenshotPresetLabel[option]}`}
                  >
                    {screenshotPresetLabel[option]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Remember what I typed">
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {persistenceModeDescription[unifiedInputPersistenceMode]}
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
      <PanelSection title="Story spoilers (Strategy mode)">
        <PanelSectionRow>
          <ToggleField
            label="Hide spoilers until I tap"
            description="Strategy mode masks spoiler sections until you choose to reveal them."
            checked={strategySpoilerMaskingEnabled}
            onChange={(checked) => setStrategySpoilerMaskingEnabled(checked)}
          />
        </PanelSectionRow>
      </PanelSection>
      <VoiceInputSettingsSection
        voiceSttModel={voiceSttModel}
        setVoiceSttModel={setVoiceSttModel}
        microphoneAccessEnabled={microphoneAccessEnabled}
      />
      <PanelSection title="AI voice & personality">
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
              label="AI voice & personality"
              description="Preset, random, or custom character tone in replies."
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
      <PanelSection title="Data">
        <PanelSectionRow>
          <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
            <ToggleField
              label="Show Developer tab"
              description="Adds a Developer tab with logs, exports, and advanced tuning. Default off."
              checked={showDeveloperTab}
              onChange={(checked) => setShowDeveloperTab(checked)}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>
      <Focusable
        className="bonsai-settings-cache-row"
        flow-children="horizontal"
        style={{
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "row",
          gap: 8,
        }}
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
            flex: 1,
            minWidth: 0,
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
        <Button
          onClick={() => {
            onBeforeDeckyModal();
            const handle = showModal(
              <ConfirmModal
                strTitle="Clear all plugin data?"
                strDescription={
                  "This resets bonsAI like a fresh install for this device.\n\n" +
                  "It deletes saved settings and permissions, runtime cache and plugin logs under Decky, " +
                  "and clears the Ollama host field, safety disclaimer flag, and unified-input persistence stored in the plugin browser.\n\n" +
                  "It does not delete Desktop logs under bonsAI_logs.\n\n" +
                  "Afterward, set your Ollama host again and re-enable any permissions you need."
                }
                strOKButtonText="Clear all data"
                onOK={() => {
                  void Promise.resolve(onClearAllPluginData()).finally(() => {
                    onCompleteDeckyModalClose(() => handle.Close());
                  });
                }}
                onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
              />
            );
          }}
          style={{
            flex: 1,
            minWidth: 0,
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
          Clear all data...
        </Button>
      </Focusable>
    </div>
  );
};