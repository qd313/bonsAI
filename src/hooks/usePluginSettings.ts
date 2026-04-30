import { useCallback, useEffect, useState } from "react";
import { call } from "@decky/api";
import { type AiCharacterAccentIntensityId } from "../data/aiCharacterAccentIntensity";
import { type ModelPolicyTierId } from "../data/modelPolicy";
import {
  DEFAULT_AI_CHARACTER_ACCENT_INTENSITY,
  DEFAULT_AI_CHARACTER_CUSTOM_TEXT,
  DEFAULT_AI_CHARACTER_ENABLED,
  DEFAULT_AI_CHARACTER_PRESET_ID,
  DEFAULT_AI_CHARACTER_RANDOM,
  DEFAULT_ASK_MODE,
  DEFAULT_CAPABILITIES,
  DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING,
  DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE,
  DEFAULT_ATTACH_PROTON_LOGS_WHEN_TROUBLESHOOTING,
  DEFAULT_INPUT_SANITIZER_USER_DISABLED,
  DEFAULT_LATENCY_WARNING_SECONDS,
  DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS,
  DEFAULT_MODEL_POLICY_TIER,
  DEFAULT_OLLAMA_KEEP_ALIVE,
  DEFAULT_OLLAMA_LOCAL_ON_DECK,
  DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  DEFAULT_SCREENSHOT_ATTACHMENT_PRESET,
  DEFAULT_SHOW_DEBUG_TAB,
  DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT,
  DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED,
  DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
  normalizeLatencyWarningSeconds,
  normalizeRequestTimeoutSeconds,
  normalizeSettings,
  toBonsaiSettingsPayload,
  type AskModeId,
  type BonsaiCapabilities,
  type BonsaiSettings,
  type OllamaKeepAliveDuration,
  type ScreenshotAttachmentPreset,
  type UnifiedInputPersistenceMode,
} from "../utils/settingsAndResponse";

/**
 * Frontend settings load, normalization, and debounced persistence.
 * Keeps RPC out of the main plugin shell component.
 */
export function usePluginSettings() {
  const [latencyWarningSeconds, setLatencyWarningSeconds] = useState<number>(
    normalizeLatencyWarningSeconds(DEFAULT_LATENCY_WARNING_SECONDS)
  );
  const [requestTimeoutSeconds, setRequestTimeoutSeconds] = useState<number>(
    normalizeRequestTimeoutSeconds(DEFAULT_REQUEST_TIMEOUT_SECONDS)
  );
  const [latencyTimeoutsCustomEnabled, setLatencyTimeoutsCustomEnabled] = useState<boolean>(false);
  const [unifiedInputPersistenceMode, setUnifiedInputPersistenceMode] = useState<UnifiedInputPersistenceMode>(
    DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE
  );
  const [screenshotAttachmentPreset, setScreenshotAttachmentPreset] = useState<ScreenshotAttachmentPreset>(
    DEFAULT_SCREENSHOT_ATTACHMENT_PRESET
  );
  const [desktopDebugNoteAutoSave, setDesktopDebugNoteAutoSave] = useState<boolean>(
    DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE
  );
  const [desktopAskVerboseLogging, setDesktopAskVerboseLogging] = useState<boolean>(
    DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING
  );
  const [attachProtonLogsWhenTroubleshooting, setAttachProtonLogsWhenTroubleshooting] = useState<boolean>(
    DEFAULT_ATTACH_PROTON_LOGS_WHEN_TROUBLESHOOTING
  );
  const [presetChipFadeAnimationEnabled, setPresetChipFadeAnimationEnabled] = useState<boolean>(
    DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED
  );
  const [inputSanitizerUserDisabled, setInputSanitizerUserDisabled] = useState<boolean>(
    DEFAULT_INPUT_SANITIZER_USER_DISABLED
  );
  const [capabilities, setCapabilities] = useState<BonsaiCapabilities>(() => ({ ...DEFAULT_CAPABILITIES }));
  const [aiCharacterEnabled, setAiCharacterEnabled] = useState<boolean>(DEFAULT_AI_CHARACTER_ENABLED);
  const [aiCharacterRandom, setAiCharacterRandom] = useState<boolean>(DEFAULT_AI_CHARACTER_RANDOM);
  const [aiCharacterPresetId, setAiCharacterPresetId] = useState<string>(DEFAULT_AI_CHARACTER_PRESET_ID);
  const [aiCharacterCustomText, setAiCharacterCustomText] = useState<string>(DEFAULT_AI_CHARACTER_CUSTOM_TEXT);
  const [aiCharacterAccentIntensity, setAiCharacterAccentIntensity] = useState<AiCharacterAccentIntensityId>(
    DEFAULT_AI_CHARACTER_ACCENT_INTENSITY
  );
  const [askMode, setAskMode] = useState<AskModeId>(DEFAULT_ASK_MODE);
  const [ollamaKeepAlive, setOllamaKeepAlive] = useState<OllamaKeepAliveDuration>(DEFAULT_OLLAMA_KEEP_ALIVE);
  const [showDebugTab, setShowDebugTab] = useState<boolean>(DEFAULT_SHOW_DEBUG_TAB);
  const [modelPolicyTier, setModelPolicyTier] = useState<ModelPolicyTierId>(DEFAULT_MODEL_POLICY_TIER);
  const [modelPolicyNonFossUnlocked, setModelPolicyNonFossUnlocked] = useState<boolean>(false);
  const [modelAllowHighVramFallbacks, setModelAllowHighVramFallbacks] = useState<boolean>(
    DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS
  );
  const [ollamaLocalOnDeck, setOllamaLocalOnDeck] = useState<boolean>(DEFAULT_OLLAMA_LOCAL_ON_DECK);
  const [strategySpoilerMaskingEnabled, setStrategySpoilerMaskingEnabled] = useState<boolean>(
    DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED
  );
  const [strategySpoilerAutoRevealAfterConsent, setStrategySpoilerAutoRevealAfterConsent] = useState<boolean>(
    DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const hydrateFromSettings = useCallback((saved: BonsaiSettings) => {
    const normalized = normalizeSettings(saved);
    setLatencyWarningSeconds(normalized.latency_warning_seconds);
    setRequestTimeoutSeconds(normalized.request_timeout_seconds);
    setLatencyTimeoutsCustomEnabled(normalized.latency_timeouts_custom_enabled);
    setUnifiedInputPersistenceMode(normalized.unified_input_persistence_mode);
    setScreenshotAttachmentPreset(normalized.screenshot_attachment_preset);
    setDesktopDebugNoteAutoSave(normalized.desktop_debug_note_auto_save);
    setDesktopAskVerboseLogging(normalized.desktop_ask_verbose_logging);
    setAttachProtonLogsWhenTroubleshooting(normalized.attach_proton_logs_when_troubleshooting);
    setPresetChipFadeAnimationEnabled(normalized.preset_chip_fade_animation_enabled);
    setInputSanitizerUserDisabled(normalized.input_sanitizer_user_disabled);
    setCapabilities(normalized.capabilities);
    setAiCharacterEnabled(normalized.ai_character_enabled);
    setAiCharacterRandom(normalized.ai_character_random);
    setAiCharacterPresetId(normalized.ai_character_preset_id);
    setAiCharacterCustomText(normalized.ai_character_custom_text);
    setAiCharacterAccentIntensity(normalized.ai_character_accent_intensity);
    setAskMode(normalized.ask_mode);
    setOllamaKeepAlive(normalized.ollama_keep_alive);
    setShowDebugTab(normalized.show_debug_tab);
    setModelPolicyTier(normalized.model_policy_tier);
    setModelPolicyNonFossUnlocked(normalized.model_policy_non_foss_unlocked);
    setModelAllowHighVramFallbacks(normalized.model_allow_high_vram_fallbacks);
    setOllamaLocalOnDeck(normalized.ollama_local_on_deck);
    setStrategySpoilerMaskingEnabled(normalized.strategy_spoiler_masking_enabled);
    setStrategySpoilerAutoRevealAfterConsent(normalized.strategy_spoiler_auto_reveal_after_consent);
  }, []);

  useEffect(() => {
    let cancelled = false;
    call<[], BonsaiSettings>("load_settings")
      .then((saved) => {
        if (cancelled) return;
        const normalized = normalizeSettings(saved);
        setLatencyWarningSeconds(normalized.latency_warning_seconds);
        setRequestTimeoutSeconds(normalized.request_timeout_seconds);
        setLatencyTimeoutsCustomEnabled(normalized.latency_timeouts_custom_enabled);
        setUnifiedInputPersistenceMode(normalized.unified_input_persistence_mode);
        setScreenshotAttachmentPreset(normalized.screenshot_attachment_preset);
        setDesktopDebugNoteAutoSave(normalized.desktop_debug_note_auto_save);
        setDesktopAskVerboseLogging(normalized.desktop_ask_verbose_logging);
        setAttachProtonLogsWhenTroubleshooting(normalized.attach_proton_logs_when_troubleshooting);
        setPresetChipFadeAnimationEnabled(normalized.preset_chip_fade_animation_enabled);
        setInputSanitizerUserDisabled(normalized.input_sanitizer_user_disabled);
        setCapabilities(normalized.capabilities);
        setAiCharacterEnabled(normalized.ai_character_enabled);
        setAiCharacterRandom(normalized.ai_character_random);
        setAiCharacterPresetId(normalized.ai_character_preset_id);
        setAiCharacterCustomText(normalized.ai_character_custom_text);
        setAiCharacterAccentIntensity(normalized.ai_character_accent_intensity);
        setAskMode(normalized.ask_mode);
        setOllamaKeepAlive(normalized.ollama_keep_alive);
        setShowDebugTab(normalized.show_debug_tab);
        setModelPolicyTier(normalized.model_policy_tier);
        setModelPolicyNonFossUnlocked(normalized.model_policy_non_foss_unlocked);
        setModelAllowHighVramFallbacks(normalized.model_allow_high_vram_fallbacks);
        setOllamaLocalOnDeck(normalized.ollama_local_on_deck);
        setStrategySpoilerMaskingEnabled(normalized.strategy_spoiler_masking_enabled);
        setStrategySpoilerAutoRevealAfterConsent(normalized.strategy_spoiler_auto_reveal_after_consent);
      })
      .catch(() => {
        if (cancelled) return;
        setLatencyWarningSeconds(DEFAULT_LATENCY_WARNING_SECONDS);
        setRequestTimeoutSeconds(DEFAULT_REQUEST_TIMEOUT_SECONDS);
        setUnifiedInputPersistenceMode(DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE);
        setLatencyTimeoutsCustomEnabled(false);
        setScreenshotAttachmentPreset(DEFAULT_SCREENSHOT_ATTACHMENT_PRESET);
        setDesktopDebugNoteAutoSave(DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE);
        setDesktopAskVerboseLogging(DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING);
        setAttachProtonLogsWhenTroubleshooting(DEFAULT_ATTACH_PROTON_LOGS_WHEN_TROUBLESHOOTING);
        setPresetChipFadeAnimationEnabled(DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED);
        setInputSanitizerUserDisabled(DEFAULT_INPUT_SANITIZER_USER_DISABLED);
        setCapabilities(DEFAULT_CAPABILITIES);
        setAiCharacterEnabled(DEFAULT_AI_CHARACTER_ENABLED);
        setAiCharacterRandom(DEFAULT_AI_CHARACTER_RANDOM);
        setAiCharacterPresetId(DEFAULT_AI_CHARACTER_PRESET_ID);
        setAiCharacterCustomText(DEFAULT_AI_CHARACTER_CUSTOM_TEXT);
        setAiCharacterAccentIntensity(DEFAULT_AI_CHARACTER_ACCENT_INTENSITY);
        setAskMode(DEFAULT_ASK_MODE);
        setOllamaKeepAlive(DEFAULT_OLLAMA_KEEP_ALIVE);
        setShowDebugTab(DEFAULT_SHOW_DEBUG_TAB);
        setModelPolicyTier(DEFAULT_MODEL_POLICY_TIER);
        setModelPolicyNonFossUnlocked(false);
        setModelAllowHighVramFallbacks(DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS);
        setOllamaLocalOnDeck(DEFAULT_OLLAMA_LOCAL_ON_DECK);
        setStrategySpoilerMaskingEnabled(DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED);
        setStrategySpoilerAutoRevealAfterConsent(DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    const timer = setTimeout(() => {
      call<[BonsaiSettings], BonsaiSettings>(
        "save_settings",
        toBonsaiSettingsPayload({
          latencyWarningSeconds,
          requestTimeoutSeconds,
          latencyTimeoutsCustomEnabled,
          unifiedInputPersistenceMode,
          screenshotAttachmentPreset,
          desktopDebugNoteAutoSave,
          desktopAskVerboseLogging,
          attachProtonLogsWhenTroubleshooting,
          presetChipFadeAnimationEnabled,
          inputSanitizerUserDisabled,
          capabilities,
          aiCharacterEnabled,
          aiCharacterRandom,
          aiCharacterPresetId,
          aiCharacterCustomText,
          aiCharacterAccentIntensity,
          askMode,
          ollamaKeepAlive,
          showDebugTab,
          modelPolicyTier,
          modelPolicyNonFossUnlocked,
          modelAllowHighVramFallbacks,
          ollamaLocalOnDeck,
          strategySpoilerMaskingEnabled,
          strategySpoilerAutoRevealAfterConsent,
        })
      ).catch((err) => {
        console.error("save_settings failed", err);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    attachProtonLogsWhenTroubleshooting,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    askMode,
    ollamaKeepAlive,
    showDebugTab,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    ollamaLocalOnDeck,
    strategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    settingsLoaded,
  ]);

  return {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    attachProtonLogsWhenTroubleshooting,
    presetChipFadeAnimationEnabled,
    inputSanitizerUserDisabled,
    capabilities,
    setCapabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    setAiCharacterEnabled,
    setAiCharacterRandom,
    setAiCharacterPresetId,
    setAiCharacterCustomText,
    setAiCharacterAccentIntensity,
    askMode,
    setAskMode,
    ollamaKeepAlive,
    setOllamaKeepAlive,
    showDebugTab,
    setShowDebugTab,
    modelPolicyTier,
    setModelPolicyTier,
    modelPolicyNonFossUnlocked,
    setModelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    setModelAllowHighVramFallbacks,
    ollamaLocalOnDeck,
    setOllamaLocalOnDeck,
    strategySpoilerMaskingEnabled,
    setStrategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    setStrategySpoilerAutoRevealAfterConsent,
    settingsLoaded,
    setLatencyWarningSeconds,
    setRequestTimeoutSeconds,
    setUnifiedInputPersistenceMode,
    setDesktopDebugNoteAutoSave,
    setDesktopAskVerboseLogging,
    setAttachProtonLogsWhenTroubleshooting,
    setPresetChipFadeAnimationEnabled,
    setInputSanitizerUserDisabled,
    setLatencyTimeoutsCustomEnabled,
    setScreenshotAttachmentPreset,
    hydrateFromSettings,
  };
}
