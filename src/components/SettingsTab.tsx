/**
 * Title: Settings tab
 *
 * Purpose: The Settings tab — screen size, whether the Ask bar remembers
 * what you typed, story spoiler masking, how many suggestion chips show,
 * voice input and voice reply settings, the AI's voice & personality
 * picker, whether the Developer tab is visible, and two buttons for
 * clearing cached data or wiping everything back to a fresh install.
 * Nothing about talking to Ollama lives here — that is the whole Ollama tab.
 *
 * Used for: The Settings tab in index.tsx.
 *
 * Solves: One tab for every general plugin setting that is not about
 * Ollama itself, each section wired into the next so the D-pad has a
 * predictable path all the way down.
 *
 * Does not: Host anything about the Ollama connection, models, or the
 * knowledge base — see OllamaTab for that.
 *
 * How it works:
 *
 *     ┌─ Settings tab ─────────────────────────────────────┐
 *     │ UI scale               <- its own file, see         │
 *     │                           SettingsTabUiScaleSection  │
 *     │ Screenshot quality     <- Save memory / Balanced /   │
 *     │                           Best detail                │
 *     │ Remember what I typed  <- All / Search / None        │
 *     │ Story spoilers         <- hide-until-tap toggle       │
 *     │ Suggestion chips       <- one chip vs two toggle      │
 *     │ Voice input            <- its own file, see           │
 *     │                           VoiceInputSettingsSection   │
 *     │ Voice replies          <- Off / By voice / Always     │
 *     │ AI voice & personality <- toggle + character picker   │
 *     │                           button + accent intensity   │
 *     │                           popover menu                │
 *     │ Data                   <- Show Developer tab toggle   │
 *     │ Clear cache… / Clear all data…  <- two buttons        │
 *     │                                    side by side       │
 *     └───────────────────────────────────────────────────────┘
 *
 * 1. Most rows here are a plain toggle or a horizontal row of buttons built
 *    from a fixed option list, each one reading and writing a setting
 *    directly with no local state of its own.
 * 2. Two settings sections are big enough to live in their own file and are
 *    just dropped in here: SettingsTabUiScaleSection and
 *    VoiceInputSettingsSection.
 * 3. The AI voice & personality block is the one row with real local state:
 *    accentIntensityMenuOpen, tracking whether its own popover menu is
 *    open. toggleAccentIntensityMenu() flips it, guarded against firing
 *    twice for one press — see the gotcha below.
 * 4. That popover's open/closed state survives a remount of this whole tab
 *    (leaving Settings and coming back) through
 *    registerSettingsTabLocalGetter()/consumeSettingsTabLocalPending(),
 *    rather than resetting to closed every time.
 * 5. Clear cache and Clear all data both open a Steam ConfirmModal before
 *    doing anything, and both remember which button to return focus to
 *    once that modal closes.
 *
 * Gotchas: The accent intensity button carries both an onClick and an
 * onOKButton handler pointed at the same toggle, because a plain onClick
 * alone was not enough to catch a gamepad A press reliably elsewhere in
 * this plugin. Both can fire for a single press, so
 * accentIntensityMenuToggleOnceRef guards the toggle from running twice in
 * one press, which would open and immediately close the menu again.
 */
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
import { SCREENSHOT_ATTACHMENT_PRESET_OPTIONS, VOICE_REPLY_MODE_OPTIONS, type ScreenshotAttachmentPreset, type UnifiedInputPersistenceMode, type VoiceReplyMode } from "../data/bonsaiSettingsSchema";
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
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { SettingsTabUiScaleSection } from "./SettingsTabUiScaleSection";
import type { UiScaleProfileId } from "../data/uiScaleProfile";
import type { VoiceSttModelId } from "../data/bonsaiSettingsSchema";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
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
const voiceReplyModeLabel: Record<VoiceReplyMode, string> = {
  off: "Off",
  voice_only: "When I asked by voice",
  always: "Always",
};
const voiceReplyModeShortLabel: Record<VoiceReplyMode, string> = {
  off: "Off",
  voice_only: "By voice",
  always: "Always",
};
const voiceReplyModeDescription: Record<VoiceReplyMode, string> = {
  off: "Answers are read only when you press Read aloud.",
  voice_only: "An answer to a question you asked by voice is read out on its own.",
  always: "Every answer is read out on its own.",
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

  /** When a finished answer is read aloud on its own, without a Read aloud press (D99 call 3). */
  voiceReplyMode: VoiceReplyMode;
  setVoiceReplyMode: (v: VoiceReplyMode) => void;

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

  /** One suggestion chip with the whole column instead of two side by side. Off by default (D43). */
  presetSingleChip: boolean;
  setPresetSingleChip: (v: boolean) => void;

  voiceSttModel: VoiceSttModelId;
  setVoiceSttModel: (v: VoiceSttModelId) => void;
  microphoneAccessEnabled: boolean;
  onJumpToPermission?: (capability: BonsaiCapabilityKey) => void;

  uiScaleAutoEnabled: boolean;
  uiScaleManualProfile: UiScaleProfileId;
  appliedUiScaleProfileId: UiScaleProfileId;
  onApplyUiScale: (autoEnabled: boolean, manualProfile: UiScaleProfileId) => void | Promise<void>;

  onOpenCharacterPicker: () => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onResetSession: () => void;
  onClearAllPluginData: () => void | Promise<void>;


};

/**
 * The whole tab. See "How it works" above for the layout and flow.
 *
 * In: every setting this tab shows plus a setter for each one, the AI
 * character's current selection (to preview it on the picker button), and
 * callbacks to open the character picker, clear the session, wipe all
 * plugin data, and manage a nested Decky modal's focus handoff.
 * Out: the panel sections in the order drawn above.
 *
 * What can go wrong: nothing here talks to the backend directly except the
 * two Clear buttons — everything else is a settings read/write handed
 * straight to the caller.
 */
export const SettingsTab: React.FC<SettingsTabProps> = ({
  screenshotAttachmentPreset,
  setScreenshotAttachmentPreset,
  unifiedInputPersistenceMode,
  setUnifiedInputPersistenceMode,
  voiceReplyMode,
  setVoiceReplyMode,
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
  presetSingleChip,
  setPresetSingleChip,
  voiceSttModel,
  setVoiceSttModel,
  microphoneAccessEnabled,
  onJumpToPermission,
  uiScaleAutoEnabled,
  uiScaleManualProfile,
  appliedUiScaleProfileId,
  onApplyUiScale,
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
  const uiScaleApplyButtonRef = useRef<HTMLButtonElement>(null);

  const focusScreenshotQualityRow = useCallback((): boolean => {
    const host = screenshotDimensionNavRef.current;
    if (!host) return false;
    const target = host.querySelector<HTMLElement>("button:not([disabled])");
    if (!target) return false;
    target.focus();
    return true;
  }, []);

  const focusUiScaleApplyButton = useCallback((): boolean => {
    const btn = uiScaleApplyButtonRef.current;
    if (!btn || btn.disabled) return false;
    btn.focus();
    return true;
  }, []);

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
    <div
      className="bonsai-tab-panel-shell bonsai-tab-panel-shell--tight bonsai-settings-section-stack"
      data-bonsai-tab-panel="settings"
    >
      <SettingsTabUiScaleSection
        uiScaleAutoEnabled={uiScaleAutoEnabled}
        uiScaleManualProfile={uiScaleManualProfile}
        appliedProfileId={appliedUiScaleProfileId}
        onApply={onApplyUiScale}
        applyButtonRef={uiScaleApplyButtonRef}
        onMoveDownFromApply={focusScreenshotQualityRow}
      />
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
              {...({
                onMoveUp: () => focusUiScaleApplyButton(),
              } as unknown as Record<string, unknown>)}
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
      <PanelSection title="Suggestion chips">
        <PanelSectionRow>
          <ToggleField
            label="Show one chip instead of two"
            description="The suggestion row above the question box shows one chip with the whole column, so its label reads more before it needs to scroll. Off shows two chips side by side — the default."
            checked={presetSingleChip}
            onChange={(checked) => setPresetSingleChip(checked)}
          />
        </PanelSectionRow>
      </PanelSection>
      <VoiceInputSettingsSection
        voiceSttModel={voiceSttModel}
        setVoiceSttModel={setVoiceSttModel}
        microphoneAccessEnabled={microphoneAccessEnabled}
        onJumpToPermission={onJumpToPermission}
      />
      <PanelSection title="Voice replies">
        <PanelSectionRow>
          <div className="bonsai-prose-host bonsai-settings-bleed" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div className="bonsai-prose" style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 8, lineHeight: 1.35 }}>
              {voiceReplyModeDescription[voiceReplyMode]}
            </div>
            <Focusable
              flow-children="horizontal"
              style={{ display: "flex", gap: 6, width: "100%", minWidth: 0, maxWidth: "100%", alignItems: "stretch" }}
            >
              {VOICE_REPLY_MODE_OPTIONS.map((mode) => {
                const active = mode === voiceReplyMode;
                return (
                  <Button
                    key={mode}
                    onClick={() => {
                      setVoiceReplyMode(mode);
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
                    aria-label={`${voiceReplyModeLabel[mode]}: ${voiceReplyModeDescription[mode]}`}
                  >
                    {voiceReplyModeShortLabel[mode]}
                  </Button>
                );
              })}
            </Focusable>
          </div>
        </PanelSectionRow>
      </PanelSection>
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
                  ref={(el: HTMLElement | null) =>
                    registerModalReturnFocusOwner("character-picker-settings", el)
                  }
                  onClick={() => {
                    rememberModalReturnFocus("character-picker-settings");
                    onOpenCharacterPicker();
                  }}
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
          ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("settings-clear-cache", el)}
          onClick={() => {
            rememberModalReturnFocus("settings-clear-cache");
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
          ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("settings-clear-all-data", el)}
          onClick={() => {
            rememberModalReturnFocus("settings-clear-all-data");
            const handle = showModal(
              <ConfirmModal
                strTitle="Clear all plugin data?"
                strDescription={
                  "This resets bonsAI like a fresh install for this device.\n\n" +
                  "It deletes saved settings and permissions, runtime cache and plugin logs under Decky, " +
                  "and clears the Ollama host field, safety disclaimer flag, and unified-input persistence stored in the plugin browser.\n\n" +
                  "If Ollama on this Deck was enabled, this also removes downloaded models and the local Ollama install bonsAI set up under your account (~/.ollama and ~/.local/bin/ollama).\n\n" +
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