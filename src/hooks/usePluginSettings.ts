/**
 * Title: Every setting in the plugin — loaded, saved, and kept in step
 *
 * Purpose: This is the one place that owns every setting a person can
 * change anywhere in the plugin — permissions, the Ask model, voice
 * replies, the AI character, timing, and dozens more. It loads them when
 * the plugin opens, hands each one to whichever tab shows it, saves a
 * change back to disk automatically a short moment after it happens, and
 * puts everything back the way it was if Steam throws the plugin's
 * screen away and rebuilds it (which happens every time a popup opens).
 *
 * Used for: The plugin's main screen, which hands each setting and its
 * matching change-function down to the tab that shows it.
 *
 * Solves: Without one owner, two different tabs could each keep their own
 * copy of the same setting and drift apart, or a save from one place
 * could overwrite a save from another. This hook is the only code in the
 * plugin that talks to the backend's load and save calls directly.
 *
 * Does not: Draw any settings screen — see SettingsTab, OllamaTab,
 * PermissionsTab, and DeveloperTab for that. This hook only holds the
 * values and the functions that change them.
 *
 * How it works:
 * 1. One saved value per setting (around fifty of them), each starting
 *    at its own documented default — the same defaults the backend uses,
 *    so a plugin that has never saved anything still behaves correctly.
 * 2. A few pieces of bookkeeping alongside the settings themselves: a
 *    "settings have loaded" flag, a "saving is currently safe" flag (off
 *    at first, so a failed very first load can never overwrite a good
 *    save file with blank defaults), and a couple of counters used to
 *    know whether a save is in flight or has been superseded.
 * 3. Every time this hook runs, it copies the very latest value of every
 *    setting into one plain object kept in a ref. The automatic save
 *    below reads from that ref rather than from the settings themselves,
 *    so it always sends the newest values without needing to be told
 *    about every single one of them by name.
 * 4. A function called `hydrateFromSettings` is the one place that takes
 *    a settings object — freshly loaded, just saved, or restored from a
 *    snapshot — and writes every field into its own saved value.
 *    Everything else in this file that changes settings in bulk funnels
 *    through it.
 * 5. Two more functions, `pauseDebouncedSettingsSave` and
 *    `flushSettingsSnapshotNow`, are for a caller that needs to save
 *    immediately and be sure of the result — such as a settings popup —
 *    rather than waiting for the automatic save below. Pausing first
 *    stops the automatic save from
 *    firing in the middle of an explicit one and racing it.
 * 6. On first open, settings are loaded from the backend. If the plugin
 *    is being rebuilt after a popup closed and has a snapshot waiting to
 *    be restored, that snapshot is used instead of the fresh load — it
 *    holds whatever was being typed or chosen right before the popup
 *    opened. If the load fails outright, every single setting resets to
 *    its default, deliberately and completely, rather than leaving some
 *    fields showing values the plugin just admitted it could not read.
 * 7. Any change to a tracked setting starts a short wait (well under a
 *    second); if nothing else changes before the wait ends, the whole
 *    current snapshot is saved. A change elsewhere that calls the pause
 *    function first cancels a wait already running, so the two paths to
 *    disk cannot both fire for the same change.
 * 8. Everything is handed back together at the end: every setting, every
 *    function that changes one, and the loading/saving controls above.
 *
 * Gotchas:
 * - The list of every setting is written out by hand in about six separate
 *   places in this one file: the starting value for each setting, the
 *   snapshot object copied into a ref, the function that writes a freshly
 *   loaded settings object into state, the reset that runs when a load
 *   fails, the automatic save's own list of what to watch for changes, and
 *   the object this hook hands back at the end. Nothing checks that a
 *   setting added to one of those lists was added to all the others — the
 *   project still builds and runs correctly with one missing from one
 *   list. This has already happened once, quietly, to four settings (reply
 *   language, both model routing orders, and the spoiler auto-reveal
 *   flag): they were left out of the failed-load reset, so a load that
 *   failed right after an earlier successful one left those four still
 *   showing values the plugin had just admitted it could not read, while
 *   every other setting correctly snapped back to its default. See the
 *   comment on the failed-load branch further down in this file for the
 *   full story. A test now guards that one list from drifting again, but
 *   the same kind of miss is still possible in any of the others.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import { type AiCharacterAccentIntensityId } from "../data/aiCharacterAccentIntensity";
import { type ModelPolicyTierId } from "../data/modelPolicy";
import {
  acknowledgePluginDataClearHandled,
  getPluginDataClearedGeneration,
  shouldIgnoreRestoredSettingsSnapshot,
  takeRestoredSettingsSnapshot,
} from "../utils/bonsaiSessionSurvival";
import { DEFAULT_AI_CHARACTER_ACCENT_INTENSITY, DEFAULT_AI_CHARACTER_CUSTOM_TEXT, DEFAULT_AI_CHARACTER_ENABLED, DEFAULT_AI_CHARACTER_PRESET_ID, DEFAULT_AI_CHARACTER_RANDOM, DEFAULT_ASK_MODE, DEFAULT_CAPABILITIES, DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING, DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE, DEFAULT_DESKTOP_APP_LOG_LEVEL, DEFAULT_INPUT_SANITIZER_USER_DISABLED, DEFAULT_LATENCY_WARNING_SECONDS, DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS, DEFAULT_MODEL_POLICY_TIER, DEFAULT_OLLAMA_KEEP_ALIVE, DEFAULT_REPLY_VERBOSITY, DEFAULT_ASK_THINK_EFFORT, type AskThinkEffortId, DEFAULT_REPLY_LANGUAGE, DEFAULT_OLLAMA_LOCAL_ON_DECK, DEFAULT_OLLAMA_LOCAL_AUTOSTART, DEFAULT_PRESET_CHIP_ANIMATION, DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED, DEFAULT_PRESET_SINGLE_CHIP, DEFAULT_REQUEST_TIMEOUT_SECONDS, DEFAULT_SCREENSHOT_ATTACHMENT_PRESET, DEFAULT_SHOW_DEVELOPER_TAB, DEFAULT_SHOW_ONSCREEN_DEBUG_HUD, DEFAULT_DEV_FORCE_SESSION_RAG_CHIPS, DEFAULT_DEV_PRELOAD_ASK_MODEL, DEFAULT_TAB_RESUME_MODE, type TabResumeMode, type NamedOllamaHost, DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED, DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT, DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE, DEFAULT_VOICE_REPLY_MODE, DEFAULT_VOICE_STT_MODEL, type AskModeId, type BonsaiCapabilities, type BonsaiSettings, type BonsaiSettingsSnapshotInput, type DesktopAppLogLevel, type OllamaKeepAliveDuration, type ReplyVerbosityId, type ReplyLanguageId, type PresetChipAnimation, type ScreenshotAttachmentPreset, type UnifiedInputPersistenceMode, type VoiceReplyMode, type VoiceSttModelId, type UiScaleProfileId, DEFAULT_UI_SCALE_AUTO_ENABLED, DEFAULT_UI_SCALE_MANUAL_PROFILE, DEFAULT_USE_LOCAL_KNOWLEDGE_BASE, DEFAULT_RAG_HYBRID_RETRIEVAL_ENABLED, DEFAULT_RAG_CORPUS_PATH, DEFAULT_RAG_CORPUS_VERSION } from "../data/bonsaiSettingsSchema";
import { normalizeLatencyWarningSeconds, normalizeRequestTimeoutSeconds, normalizeSettings } from "../data/bonsaiSettingsNormalizers";
import { diffBonsaiSettingsPayload, toBonsaiSettingsPayload } from "../utils/settingsPayload";
import { saveTabResumeMode } from "../features/plugin-shell/pluginStorage";

/**
 * In: a normalized settings object, in the backend's own field names
 * (`snake_case`, matching settings.json).
 * Out: the same values, renamed to the `camelCase` shape the rest of the
 * frontend — and the session-survival snapshot in particular — expects.
 * Can go wrong: nothing checks that every field made the trip; a setting
 * added to one shape and not the other would simply be missing from the
 * snapshot, silently.
 */
function snapshotFromBonsaiSettings(normalized: BonsaiSettings): BonsaiSettingsSnapshotInput {
  return {
    latencyWarningSeconds: normalized.latency_warning_seconds,
    requestTimeoutSeconds: normalized.request_timeout_seconds,
    latencyTimeoutsCustomEnabled: normalized.latency_timeouts_custom_enabled,
    unifiedInputPersistenceMode: normalized.unified_input_persistence_mode,
    voiceReplyMode: normalized.voice_reply_mode,
    screenshotAttachmentPreset: normalized.screenshot_attachment_preset,
    desktopDebugNoteAutoSave: normalized.desktop_debug_note_auto_save,
    desktopAskVerboseLogging: normalized.desktop_ask_verbose_logging,
    desktopAppLogLevel: normalized.desktop_app_log_level,
    presetChipFadeAnimationEnabled: normalized.preset_chip_fade_animation_enabled,
    presetChipAnimation: normalized.preset_chip_animation,
    presetSingleChip: normalized.preset_single_chip,
    inputSanitizerUserDisabled: normalized.input_sanitizer_user_disabled,
    capabilities: normalized.capabilities,
    aiCharacterEnabled: normalized.ai_character_enabled,
    aiCharacterRandom: normalized.ai_character_random,
    aiCharacterPresetId: normalized.ai_character_preset_id,
    aiCharacterCustomText: normalized.ai_character_custom_text,
    aiCharacterAccentIntensity: normalized.ai_character_accent_intensity,
    askMode: normalized.ask_mode,
    ollamaKeepAlive: normalized.ollama_keep_alive,
    replyVerbosity: normalized.reply_verbosity,
    askThinkEffort: normalized.ask_think_effort,
    replyLanguage: normalized.reply_language,
    showDeveloperTab: normalized.show_developer_tab,
    modelPolicyTier: normalized.model_policy_tier,
    modelPolicyNonFossUnlocked: normalized.model_policy_non_foss_unlocked,
    modelAllowHighVramFallbacks: normalized.model_allow_high_vram_fallbacks,
    textModelRoutingOrder: normalized.text_model_routing_order,
    visionModelRoutingOrder: normalized.vision_model_routing_order,
    ollamaLocalOnDeck: normalized.ollama_local_on_deck,
    ollamaLocalAutostart: normalized.ollama_local_autostart,
    strategySpoilerMaskingEnabled: normalized.strategy_spoiler_masking_enabled,
    strategySpoilerAutoRevealAfterConsent: normalized.strategy_spoiler_auto_reveal_after_consent,
    steamWebApiKey: normalized.steam_web_api_key,
    showOnscreenDebugHud: normalized.show_onscreen_debug_hud,
    devForceSessionRagChips: normalized.dev_force_session_rag_chips,
    devPreloadAskModel: normalized.dev_preload_ask_model,
    devFrozenTestChips: normalized.dev_frozen_test_chips,
    tabResumeMode: normalized.tab_resume_mode,
    namedOllamaHosts: normalized.named_ollama_hosts,
    voiceSttModel: normalized.voice_stt_model,
    uiScaleAutoEnabled: normalized.ui_scale_auto_enabled,
    uiScaleManualProfile: normalized.ui_scale_manual_profile,
    useLocalKnowledgeBase: normalized.use_local_knowledge_base,
    ragHybridRetrievalEnabled: normalized.rag_hybrid_retrieval_enabled,
    ragCorpusPath: normalized.rag_corpus_path,
    ragCorpusVersion: normalized.rag_corpus_version,
  };
}

/**
 * In: nothing.
 * Out: what every setting's snapshot value would be if none had ever
 * been saved — every default, run through the same normalizing and
 * renaming as a real settings load.
 * Can go wrong: nothing — always returns the same values.
 */
function defaultSettingsSnapshot(): BonsaiSettingsSnapshotInput {
  return snapshotFromBonsaiSettings(normalizeSettings({}));
}

/**
 * In: nothing — this hook loads its own data from the backend as soon
 * as it mounts.
 * Out: every setting's current value, every function that changes one,
 * and the loading/saving controls described in the file header above.
 * Can go wrong: the field list above is written out by hand in several
 * places in this file (the saved values, the snapshot ref, the hydrate
 * function, the failed-load reset, and the save's own dependency list);
 * a setting added to one and missed in another will not fail to build,
 * it will just quietly behave wrong in one specific way — see the
 * comment on the failed-load branch further down for a real case of
 * exactly that happening.
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
  const [voiceReplyMode, setVoiceReplyMode] = useState<VoiceReplyMode>(DEFAULT_VOICE_REPLY_MODE);
  const [screenshotAttachmentPreset, setScreenshotAttachmentPreset] = useState<ScreenshotAttachmentPreset>(
    DEFAULT_SCREENSHOT_ATTACHMENT_PRESET
  );
  const [desktopDebugNoteAutoSave, setDesktopDebugNoteAutoSave] = useState<boolean>(
    DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE
  );
  const [desktopAskVerboseLogging, setDesktopAskVerboseLogging] = useState<boolean>(
    DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING
  );
  const [desktopAppLogLevel, setDesktopAppLogLevel] = useState<DesktopAppLogLevel>(
    DEFAULT_DESKTOP_APP_LOG_LEVEL
  );
  const [presetChipFadeAnimationEnabled, setPresetChipFadeAnimationEnabled] = useState<boolean>(
    DEFAULT_PRESET_CHIP_FADE_ANIMATION_ENABLED
  );
  const [presetChipAnimation, setPresetChipAnimation] = useState<PresetChipAnimation>(DEFAULT_PRESET_CHIP_ANIMATION);
  const [presetSingleChip, setPresetSingleChip] = useState<boolean>(DEFAULT_PRESET_SINGLE_CHIP);
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
  const [replyVerbosity, setReplyVerbosity] = useState<ReplyVerbosityId>(DEFAULT_REPLY_VERBOSITY);
  const [askThinkEffort, setAskThinkEffort] = useState<AskThinkEffortId>(DEFAULT_ASK_THINK_EFFORT);
  const [replyLanguage, setReplyLanguage] = useState<ReplyLanguageId>(DEFAULT_REPLY_LANGUAGE);
  const [showDeveloperTab, setShowDeveloperTab] = useState<boolean>(DEFAULT_SHOW_DEVELOPER_TAB);
  const [modelPolicyTier, setModelPolicyTier] = useState<ModelPolicyTierId>(DEFAULT_MODEL_POLICY_TIER);
  const [modelPolicyNonFossUnlocked, setModelPolicyNonFossUnlocked] = useState<boolean>(false);
  const [modelAllowHighVramFallbacks, setModelAllowHighVramFallbacks] = useState<boolean>(
    DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS
  );
  const [textModelRoutingOrder, setTextModelRoutingOrder] = useState<string[]>([]);
  const [visionModelRoutingOrder, setVisionModelRoutingOrder] = useState<string[]>([]);
  const [ollamaLocalOnDeck, setOllamaLocalOnDeck] = useState<boolean>(DEFAULT_OLLAMA_LOCAL_ON_DECK);
  const [ollamaLocalAutostart, setOllamaLocalAutostart] = useState<boolean>(DEFAULT_OLLAMA_LOCAL_AUTOSTART);
  const [strategySpoilerMaskingEnabled, setStrategySpoilerMaskingEnabled] = useState<boolean>(
    DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED
  );
  const [strategySpoilerAutoRevealAfterConsent, setStrategySpoilerAutoRevealAfterConsent] = useState<boolean>(
    DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT
  );
  const [steamWebApiKey, setSteamWebApiKey] = useState<string>("");
  const [showOnscreenDebugHud, setShowOnscreenDebugHud] = useState<boolean>(DEFAULT_SHOW_ONSCREEN_DEBUG_HUD);
  const [devForceSessionRagChips, setDevForceSessionRagChips] = useState<boolean>(
    DEFAULT_DEV_FORCE_SESSION_RAG_CHIPS,
  );
  const [devPreloadAskModel, setDevPreloadAskModel] = useState<boolean>(
    DEFAULT_DEV_PRELOAD_ASK_MODEL,
  );
  const [devFrozenTestChips, setDevFrozenTestChips] = useState<string[]>([]);
  const [tabResumeMode, setTabResumeMode] = useState<TabResumeMode>(DEFAULT_TAB_RESUME_MODE);
  const [namedOllamaHosts, setNamedOllamaHosts] = useState<NamedOllamaHost[]>([]);
  const [voiceSttModel, setVoiceSttModel] = useState<VoiceSttModelId>(DEFAULT_VOICE_STT_MODEL);
  const [uiScaleAutoEnabled, setUiScaleAutoEnabled] = useState<boolean>(DEFAULT_UI_SCALE_AUTO_ENABLED);
  const [uiScaleManualProfile, setUiScaleManualProfile] = useState<UiScaleProfileId>(
    DEFAULT_UI_SCALE_MANUAL_PROFILE
  );
  const [useLocalKnowledgeBase, setUseLocalKnowledgeBase] = useState<boolean>(
    DEFAULT_USE_LOCAL_KNOWLEDGE_BASE
  );
  const [ragHybridRetrievalEnabled, setRagHybridRetrievalEnabled] = useState<boolean>(
    DEFAULT_RAG_HYBRID_RETRIEVAL_ENABLED
  );
  const [ragCorpusPath, setRagCorpusPath] = useState<string>(DEFAULT_RAG_CORPUS_PATH);
  const [ragCorpusVersion, setRagCorpusVersion] = useState<string>(DEFAULT_RAG_CORPUS_VERSION);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  /** When false, debounced ``save_settings`` is skipped so a failed initial load cannot wipe disk with UI defaults. */
  const [settingsPersistEnabled, setSettingsPersistEnabled] = useState(false);

  const settingsSnapshotForDebouncedSaveRef = useRef<BonsaiSettingsSnapshotInput>(defaultSettingsSnapshot());
  /**
   * What the plugin last confirmed is on disk -- set on every load and every save response.
   * The automatic background save below diffs the live snapshot against this rather than
   * sending the whole thing, so a field this ref doesn't know changed (a QA batch hand-written
   * to settings.json, a background corpus download, ...) is left out of the payload and survives
   * the backend's merge instead of being overwritten by a stale belief about it.
   */
  const settingsBaselineRef = useRef<BonsaiSettingsSnapshotInput>(defaultSettingsSnapshot());
  const settingsPersistEpochRef = useRef(0);
  const settingsSaveInFlightRef = useRef(0);
  const pluginDataClearSeenAtMountRef = useRef(getPluginDataClearedGeneration());

  settingsSnapshotForDebouncedSaveRef.current = {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    voiceReplyMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    desktopAppLogLevel,
    presetChipFadeAnimationEnabled,
    presetChipAnimation,
    presetSingleChip,
    inputSanitizerUserDisabled,
    capabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    askMode,
    ollamaKeepAlive,
    replyVerbosity,
    askThinkEffort,
    replyLanguage,
    showDeveloperTab,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    textModelRoutingOrder,
    visionModelRoutingOrder,
    ollamaLocalOnDeck,
    ollamaLocalAutostart,
    strategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    steamWebApiKey,
    showOnscreenDebugHud,
    devForceSessionRagChips,
    devPreloadAskModel,
    devFrozenTestChips,
    tabResumeMode,
    namedOllamaHosts,
    voiceSttModel,
    uiScaleAutoEnabled,
    uiScaleManualProfile,
    useLocalKnowledgeBase,
    ragHybridRetrievalEnabled,
    ragCorpusPath,
    ragCorpusVersion,
  };

  /**
   * Mirror the mode into localStorage so the shell can read it **synchronously** at mount.
   * `resolveInitialTab` decides the opening tab on the first render, and settings only arrive a
   * `load_settings` round trip later — reading it from state there would always be one open
   * behind, or would flash the wrong tab. `settings.json` stays the source of truth; this is a
   * read cache, `bonsai:`-prefixed so *Clear all plugin data* wipes it with everything else.
   */
  useEffect(() => {
    saveTabResumeMode(tabResumeMode);
  }, [tabResumeMode]);

  const hydrateFromSettings = useCallback((saved: BonsaiSettings) => {
    const normalized = normalizeSettings(saved);
    setLatencyWarningSeconds(normalized.latency_warning_seconds);
    setRequestTimeoutSeconds(normalized.request_timeout_seconds);
    setLatencyTimeoutsCustomEnabled(normalized.latency_timeouts_custom_enabled);
    setUnifiedInputPersistenceMode(normalized.unified_input_persistence_mode);
    setVoiceReplyMode(normalized.voice_reply_mode);
    setScreenshotAttachmentPreset(normalized.screenshot_attachment_preset);
    setDesktopDebugNoteAutoSave(normalized.desktop_debug_note_auto_save);
    setDesktopAskVerboseLogging(normalized.desktop_ask_verbose_logging);
    setDesktopAppLogLevel(normalized.desktop_app_log_level);
    setPresetChipAnimation(normalized.preset_chip_animation);
    setPresetSingleChip(normalized.preset_single_chip);
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
    setReplyVerbosity(normalized.reply_verbosity);
    setAskThinkEffort(normalized.ask_think_effort);
    setReplyLanguage(normalized.reply_language);
    setShowDeveloperTab(normalized.show_developer_tab);
    setModelPolicyTier(normalized.model_policy_tier);
    setModelPolicyNonFossUnlocked(normalized.model_policy_non_foss_unlocked);
    setModelAllowHighVramFallbacks(normalized.model_allow_high_vram_fallbacks);
    setTextModelRoutingOrder(normalized.text_model_routing_order);
    setVisionModelRoutingOrder(normalized.vision_model_routing_order);
    setOllamaLocalOnDeck(normalized.ollama_local_on_deck);
    setOllamaLocalAutostart(normalized.ollama_local_autostart);
    setStrategySpoilerMaskingEnabled(normalized.strategy_spoiler_masking_enabled);
    setStrategySpoilerAutoRevealAfterConsent(normalized.strategy_spoiler_auto_reveal_after_consent);
    setSteamWebApiKey(normalized.steam_web_api_key);
    setShowOnscreenDebugHud(normalized.show_onscreen_debug_hud);
    setDevForceSessionRagChips(normalized.dev_force_session_rag_chips);
    setDevPreloadAskModel(normalized.dev_preload_ask_model);
    setDevFrozenTestChips(normalized.dev_frozen_test_chips);
    setTabResumeMode(normalized.tab_resume_mode);
    setNamedOllamaHosts(normalized.named_ollama_hosts);
    setVoiceSttModel(normalized.voice_stt_model);
    setUiScaleAutoEnabled(normalized.ui_scale_auto_enabled);
    setUiScaleManualProfile(normalized.ui_scale_manual_profile);
    setUseLocalKnowledgeBase(normalized.use_local_knowledge_base);
    setRagHybridRetrievalEnabled(normalized.rag_hybrid_retrieval_enabled);
    setRagCorpusPath(normalized.rag_corpus_path);
    setRagCorpusVersion(normalized.rag_corpus_version);
    const snapshot = snapshotFromBonsaiSettings(normalized);
    settingsSnapshotForDebouncedSaveRef.current = snapshot;
    settingsBaselineRef.current = { ...snapshot };
    setSettingsPersistEnabled(true);
  }, []);

  const pauseDebouncedSettingsSave = useCallback(async () => {
    settingsPersistEpochRef.current += 1;
    const deadline = Date.now() + 3000;
    while (settingsSaveInFlightRef.current > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }, []);

  const flushSettingsSnapshotNow = useCallback(async () => {
    await pauseDebouncedSettingsSave();
    settingsSaveInFlightRef.current += 1;
    try {
      const saved = await callDeckyWithTimeout<[BonsaiSettings], BonsaiSettings>("save_settings", [
        toBonsaiSettingsPayload(settingsSnapshotForDebouncedSaveRef.current),
      ]);
      hydrateFromSettings(saved);
      return saved;
    } finally {
      settingsSaveInFlightRef.current -= 1;
    }
  }, [hydrateFromSettings, pauseDebouncedSettingsSave]);

  const syncSettingsFromDisk = useCallback(async () => {
    await pauseDebouncedSettingsSave();
    const saved = await callDeckyWithTimeout<[], BonsaiSettings>("load_settings", []);
    hydrateFromSettings(saved);
    return saved;
  }, [hydrateFromSettings, pauseDebouncedSettingsSave]);

  useEffect(() => {
    let cancelled = false;
    callDeckyWithTimeout<[], BonsaiSettings>("load_settings", [])
      .then((saved) => {
        if (cancelled) return;
        const ignoreRestored = shouldIgnoreRestoredSettingsSnapshot(pluginDataClearSeenAtMountRef.current);
        const restored = ignoreRestored ? null : takeRestoredSettingsSnapshot();
        if (restored) {
          hydrateFromSettings(normalizeSettings(toBonsaiSettingsPayload(restored)));
        } else {
          hydrateFromSettings(saved);
          if (ignoreRestored) {
            acknowledgePluginDataClearHandled();
          }
        }
      })
      .catch(() => {
        /*
         * A failed read shows defaults — all of them, no exceptions (D18, option A, locked
         * 2026-08-27).
         *
         * Four fields used to be missing from this list with nothing saying why: reply language,
         * both model routing orders, and the spoiler auto-reveal flag. They kept whatever was
         * already in state, which is invisible on a first open (state is already at its defaults)
         * but wrong after a read fails *following* a good one — a backend restart with the menu
         * open. Everything else snapped back to defaults while those four kept showing values the
         * plugin had just admitted it could not read, which is the worst of both: a screen telling
         * two stories, and the four still showing user-set values are the ones a user would least
         * suspect.
         *
         * They fell out because this field list is maintained by hand in six places in this file.
         * Fixing that duplication is D14's job and is not scheduled; the test in
         * `usePluginSettings.test.ts` is what stops this particular copy drifting again.
         */
        if (cancelled) return;
        setSettingsPersistEnabled(false);
        setLatencyWarningSeconds(DEFAULT_LATENCY_WARNING_SECONDS);
        setRequestTimeoutSeconds(DEFAULT_REQUEST_TIMEOUT_SECONDS);
        setUnifiedInputPersistenceMode(DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE);
        setVoiceReplyMode(DEFAULT_VOICE_REPLY_MODE);
        setLatencyTimeoutsCustomEnabled(false);
        setScreenshotAttachmentPreset(DEFAULT_SCREENSHOT_ATTACHMENT_PRESET);
        setDesktopDebugNoteAutoSave(DEFAULT_DESKTOP_DEBUG_NOTE_AUTO_SAVE);
        setDesktopAskVerboseLogging(DEFAULT_DESKTOP_ASK_VERBOSE_LOGGING);
        setDesktopAppLogLevel(DEFAULT_DESKTOP_APP_LOG_LEVEL);
        setPresetChipAnimation(DEFAULT_PRESET_CHIP_ANIMATION);
        setPresetSingleChip(DEFAULT_PRESET_SINGLE_CHIP);
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
        setReplyVerbosity(DEFAULT_REPLY_VERBOSITY);
        setAskThinkEffort(DEFAULT_ASK_THINK_EFFORT);
        setReplyLanguage(DEFAULT_REPLY_LANGUAGE);
        setShowDeveloperTab(DEFAULT_SHOW_DEVELOPER_TAB);
        setModelPolicyTier(DEFAULT_MODEL_POLICY_TIER);
        setModelPolicyNonFossUnlocked(false);
        setModelAllowHighVramFallbacks(DEFAULT_MODEL_ALLOW_HIGH_VRAM_FALLBACKS);
        // Empty, matching their `useState` initial value: an order is derived from the models the
        // machine actually has, and there is no static default to fall back to.
        setTextModelRoutingOrder([]);
        setVisionModelRoutingOrder([]);
        setOllamaLocalOnDeck(DEFAULT_OLLAMA_LOCAL_ON_DECK);
        setOllamaLocalAutostart(DEFAULT_OLLAMA_LOCAL_AUTOSTART);
        setStrategySpoilerMaskingEnabled(DEFAULT_STRATEGY_SPOILER_MASKING_ENABLED);
        setStrategySpoilerAutoRevealAfterConsent(DEFAULT_STRATEGY_SPOILER_AUTO_REVEAL_AFTER_CONSENT);
        setSteamWebApiKey("");
        setShowOnscreenDebugHud(DEFAULT_SHOW_ONSCREEN_DEBUG_HUD);
        setDevForceSessionRagChips(DEFAULT_DEV_FORCE_SESSION_RAG_CHIPS);
        setDevPreloadAskModel(DEFAULT_DEV_PRELOAD_ASK_MODEL);
        setDevFrozenTestChips([]);
        setTabResumeMode(DEFAULT_TAB_RESUME_MODE);
        setNamedOllamaHosts([]);
        setVoiceSttModel(DEFAULT_VOICE_STT_MODEL);
        setUiScaleAutoEnabled(DEFAULT_UI_SCALE_AUTO_ENABLED);
        setUiScaleManualProfile(DEFAULT_UI_SCALE_MANUAL_PROFILE);
        setUseLocalKnowledgeBase(DEFAULT_USE_LOCAL_KNOWLEDGE_BASE);
        setRagHybridRetrievalEnabled(DEFAULT_RAG_HYBRID_RETRIEVAL_ENABLED);
        setRagCorpusPath(DEFAULT_RAG_CORPUS_PATH);
        setRagCorpusVersion(DEFAULT_RAG_CORPUS_VERSION);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrateFromSettings]);

  useEffect(() => {
    if (!settingsPersistEnabled) return;
    const epochAtSchedule = settingsPersistEpochRef.current;
    const timer = setTimeout(() => {
      if (settingsPersistEpochRef.current !== epochAtSchedule) return;
      const nextPayload = toBonsaiSettingsPayload(settingsSnapshotForDebouncedSaveRef.current);
      const baselinePayload = toBonsaiSettingsPayload(settingsBaselineRef.current);
      const patch = diffBonsaiSettingsPayload(baselinePayload, nextPayload);
      // Nothing actually changed since the last confirmed disk state -- do not send an empty
      // save, and do not let it reset the baseline to a possibly-stale round trip.
      if (Object.keys(patch).length === 0) return;
      settingsSaveInFlightRef.current += 1;
      callDeckyWithTimeout<[Partial<BonsaiSettings>], BonsaiSettings>("save_settings", [patch])
        .then((saved) => {
          settingsBaselineRef.current = snapshotFromBonsaiSettings(normalizeSettings(saved));
        })
        .catch((err) => {
          console.error("save_settings failed", err);
        })
        .finally(() => {
          settingsSaveInFlightRef.current -= 1;
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    voiceReplyMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    desktopAppLogLevel,
    presetChipFadeAnimationEnabled,
    presetChipAnimation,
    presetSingleChip,
    inputSanitizerUserDisabled,
    capabilities,
    aiCharacterEnabled,
    aiCharacterRandom,
    aiCharacterPresetId,
    aiCharacterCustomText,
    aiCharacterAccentIntensity,
    askMode,
    ollamaKeepAlive,
    replyVerbosity,
    askThinkEffort,
    replyLanguage,
    showDeveloperTab,
    modelPolicyTier,
    modelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    textModelRoutingOrder,
    visionModelRoutingOrder,
    ollamaLocalOnDeck,
    ollamaLocalAutostart,
    strategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    steamWebApiKey,
    showOnscreenDebugHud,
    devForceSessionRagChips,
    devPreloadAskModel,
    devFrozenTestChips,
    tabResumeMode,
    namedOllamaHosts,
    voiceSttModel,
    uiScaleAutoEnabled,
    uiScaleManualProfile,
    useLocalKnowledgeBase,
    ragHybridRetrievalEnabled,
    ragCorpusPath,
    ragCorpusVersion,
    settingsPersistEnabled,
  ]);

  return {
    latencyWarningSeconds,
    requestTimeoutSeconds,
    latencyTimeoutsCustomEnabled,
    unifiedInputPersistenceMode,
    screenshotAttachmentPreset,
    desktopDebugNoteAutoSave,
    desktopAskVerboseLogging,
    desktopAppLogLevel,
    presetChipFadeAnimationEnabled,
    setPresetChipFadeAnimationEnabled,
    presetChipAnimation,
    setPresetChipAnimation,
    presetSingleChip,
    setPresetSingleChip,
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
    replyVerbosity,
    askThinkEffort,
    replyLanguage,
    setReplyVerbosity,
    setAskThinkEffort,
    setReplyLanguage,
    showDeveloperTab,
    setShowDeveloperTab,
    modelPolicyTier,
    setModelPolicyTier,
    modelPolicyNonFossUnlocked,
    setModelPolicyNonFossUnlocked,
    modelAllowHighVramFallbacks,
    textModelRoutingOrder,
    visionModelRoutingOrder,
    setModelAllowHighVramFallbacks,
    setTextModelRoutingOrder,
    setVisionModelRoutingOrder,
    ollamaLocalOnDeck,
    setOllamaLocalOnDeck,
    ollamaLocalAutostart,
    setOllamaLocalAutostart,
    strategySpoilerMaskingEnabled,
    setStrategySpoilerMaskingEnabled,
    strategySpoilerAutoRevealAfterConsent,
    setStrategySpoilerAutoRevealAfterConsent,
    steamWebApiKey,
    setSteamWebApiKey,
    showOnscreenDebugHud,
    devForceSessionRagChips,
    devPreloadAskModel,
    devFrozenTestChips,
    setShowOnscreenDebugHud,
    setDevForceSessionRagChips,
    setDevPreloadAskModel,
    setDevFrozenTestChips,
    tabResumeMode,
    setTabResumeMode,
    namedOllamaHosts,
    setNamedOllamaHosts,
    voiceSttModel,
    setVoiceSttModel,
    uiScaleAutoEnabled,
    setUiScaleAutoEnabled,
    uiScaleManualProfile,
    setUiScaleManualProfile,
    useLocalKnowledgeBase,
    setUseLocalKnowledgeBase,
    ragHybridRetrievalEnabled,
    setRagHybridRetrievalEnabled,
    ragCorpusPath,
    setRagCorpusPath,
    ragCorpusVersion,
    setRagCorpusVersion,
    settingsLoaded,
    setLatencyWarningSeconds,
    setRequestTimeoutSeconds,
    setUnifiedInputPersistenceMode,
    voiceReplyMode,
    setVoiceReplyMode,
    setDesktopDebugNoteAutoSave,
    setDesktopAskVerboseLogging,
    setDesktopAppLogLevel,
    setInputSanitizerUserDisabled,
    setLatencyTimeoutsCustomEnabled,
    setScreenshotAttachmentPreset,
    hydrateFromSettings,
    pauseDebouncedSettingsSave,
    flushSettingsSnapshotNow,
    syncSettingsFromDisk,
  };
}
