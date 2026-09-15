/**
 * Title: Turning the settings on screen into the message that saves them
 *
 * Purpose: The Settings tab holds every setting under a screen-side name, spelled
 * the way screen code spells things. The back end that writes them to disk knows
 * the same settings under different names, spelled its own way. This file is the
 * translation between the two, and it is the only place that translation is
 * written down. Hand it everything the screen currently has and it hands back the
 * one object the back end is expecting, with all fifty-odd settings renamed.
 *
 * Used for: every save. That is the Save the user presses in Settings, and also
 * the saves that happen on their own the moment something is picked -- choosing an
 * AI character, or granting a permission. Those pass a second argument holding
 * just the setting that changed, which is laid over the top of the rest, so the
 * save carries the new value without waiting for the screen to catch up.
 *
 * Solves: without this, every place that saves would spell all fifty names out
 * for itself. Adding a setting would mean remembering every one of those places,
 * and forgetting one does not break anything visibly -- that setting just quietly
 * stops being saved from one screen while working fine from another.
 *
 * Does not: check anything. Whatever the screen hands over is what gets sent. The
 * one exception is the Steam web key, which is trimmed and cut to its maximum
 * length here because an over-long key is rejected further down with a message
 * that does not say why. Reading settings back the other way, and filling in
 * anything an older saved file is missing, is a different file
 * (bonsaiSettingsNormalizers).
 *
 * Gotchas:
 *   - Adding a setting cannot be forgotten *here*, and that is worth knowing
 *     because it is unusual in this area: every field is required, so leaving a
 *     line out fails the type check immediately. The places a new setting does
 *     get quietly forgotten are the several hand-written lists in the settings
 *     hook, not this file.
 *   - The second argument wins outright. A value passed in it overrides the
 *     screen's own value for that setting, which is the point -- the screen has
 *     not been told about the change yet -- but it means passing a stale one here
 *     saves the stale one.
 */
import {
  STEAM_WEB_API_KEY_MAX_LEN,
  type BonsaiSettings,
  type BonsaiSettingsSnapshotInput,
} from "../data/bonsaiSettingsSchema";

/** Build the object the back end expects. The second argument, when given, is laid over the top -- that is how picking a character or granting a permission saves straight away. */
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
    ollama_local_autostart: input.ollamaLocalAutostart,
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
