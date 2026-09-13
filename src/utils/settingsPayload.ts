/**
 * Title: Settings payload builder
 * Purpose: Map frontend settings snapshot input into the backend BonsaiSettings RPC payload shape.
 * Used for: usePluginSettings save path and immediate patch saves (character picker, permissions).
 * Solves: One canonical object for set_settings without duplicating field mapping in callers.
 * Does not: Validate or normalize raw RPC responses — see bonsaiSettingsNormalizers;
 *   or format assistant reply text — see appliedTuningText.
 */
import {
  STEAM_WEB_API_KEY_MAX_LEN,
  type BonsaiSettings,
  type BonsaiSettingsSnapshotInput,
} from "../data/bonsaiSettingsSchema";

/** Build the backend `BonsaiSettings` object; optional `patch` for immediate saves (character picker, permissions). */
export function toBonsaiSettingsPayload(
  input: BonsaiSettingsSnapshotInput,
  patch?: Partial<BonsaiSettings>,
): BonsaiSettings {
  const base: BonsaiSettings = {
    latency_warning_seconds: input.latencyWarningSeconds,
    request_timeout_seconds: input.requestTimeoutSeconds,
    latency_timeouts_custom_enabled: input.latencyTimeoutsCustomEnabled,
    unified_input_persistence_mode: input.unifiedInputPersistenceMode,
    voice_reply_mode: input.voiceReplyMode,
    screenshot_attachment_preset: input.screenshotAttachmentPreset,
    desktop_debug_note_auto_save: input.desktopDebugNoteAutoSave,
    desktop_ask_verbose_logging: input.desktopAskVerboseLogging,
    desktop_app_log_level: input.desktopAppLogLevel,
    preset_chip_fade_animation_enabled: input.presetChipAnimation === "fade",
    preset_chip_animation: input.presetChipAnimation,
    preset_single_chip: input.presetSingleChip,
    input_sanitizer_user_disabled: input.inputSanitizerUserDisabled,
    capabilities: input.capabilities,
    ai_character_enabled: input.aiCharacterEnabled,
    ai_character_random: input.aiCharacterRandom,
    ai_character_preset_id: input.aiCharacterPresetId,
    ai_character_custom_text: input.aiCharacterCustomText,
    ai_character_accent_intensity: input.aiCharacterAccentIntensity,
    ask_mode: input.askMode,
    ollama_keep_alive: input.ollamaKeepAlive,
    reply_verbosity: input.replyVerbosity,
    ask_think_effort: input.askThinkEffort,
    reply_language: input.replyLanguage,
    show_developer_tab: input.showDeveloperTab,
    model_policy_tier: input.modelPolicyTier,
    model_policy_non_foss_unlocked: input.modelPolicyNonFossUnlocked,
    model_allow_high_vram_fallbacks: input.modelAllowHighVramFallbacks,
    text_model_routing_order: input.textModelRoutingOrder,
    vision_model_routing_order: input.visionModelRoutingOrder,
    ollama_local_on_deck: input.ollamaLocalOnDeck,
    strategy_spoiler_masking_enabled: input.strategySpoilerMaskingEnabled,
    strategy_spoiler_auto_reveal_after_consent: input.strategySpoilerAutoRevealAfterConsent,
    steam_web_api_key: input.steamWebApiKey.trim().slice(0, STEAM_WEB_API_KEY_MAX_LEN),
    show_onscreen_debug_hud: input.showOnscreenDebugHud,
    dev_force_session_rag_chips: input.devForceSessionRagChips,
    dev_preload_ask_model: input.devPreloadAskModel,
    tab_resume_mode: input.tabResumeMode,
    named_ollama_hosts: input.namedOllamaHosts,
    dev_frozen_test_chips: input.devFrozenTestChips,
    voice_stt_model: input.voiceSttModel,
    ui_scale_auto_enabled: input.uiScaleAutoEnabled,
    ui_scale_manual_profile: input.uiScaleManualProfile,
    use_local_knowledge_base: input.useLocalKnowledgeBase,
    rag_hybrid_retrieval_enabled: input.ragHybridRetrievalEnabled,
    rag_corpus_path: input.ragCorpusPath,
    rag_corpus_version: input.ragCorpusVersion,
  };
  return patch ? { ...base, ...patch } : base;
}
