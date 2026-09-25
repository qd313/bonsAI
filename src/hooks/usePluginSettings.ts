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
 * 1. Every setting (around fifty of them) lives in one React state object,
 *    `settings`, typed `BonsaiSettingsSnapshotInput`. `SETTINGS_FIELD_BACKEND_KEY`
 *    is the one place that names all fifty — camelCase key on the left, the
 *    name `settings.json` uses on the right — and TypeScript refuses to
 *    compile if a field from the type is missing from that table. Everything
 *    below (the starting values, loading, saving, and the individually named
 *    `setSomething` functions every tab already calls) is generated from that
 *    one table plus `settings` itself, rather than written out by hand again.
 * 2. A few pieces of bookkeeping alongside the settings themselves: a
 *    "settings have loaded" flag, a "saving is currently safe" flag (off
 *    at first, so a failed very first load can never overwrite a good
 *    save file with blank defaults), and a couple of counters used to
 *    know whether a save is in flight or has been superseded.
 * 3. Every time this hook runs, it copies the very latest settings object
 *    into a ref. The automatic save below reads from that ref rather than
 *    from `settings` itself, so it always sends the newest values without
 *    re-subscribing to fifty individual pieces of state.
 * 4. A function called `hydrateFromSettings` is the one place that takes
 *    a settings object — freshly loaded, just saved, or restored from a
 *    snapshot — and writes every field into `settings` in one call.
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
 *    its default in one `setSettings(defaultSettingsSnapshot())` call,
 *    deliberately and completely, rather than leaving some fields showing
 *    values the plugin just admitted it could not read.
 * 7. Any change to a tracked setting starts a short wait (well under a
 *    second); if nothing else changes before the wait ends, only the
 *    fields that actually changed since the last confirmed disk state are
 *    sent (see `diffBonsaiSettingsPayload` in `settingsPayload.ts`) — not
 *    a full copy of every setting. A change elsewhere that calls the pause
 *    function first cancels a wait already running, so the two paths to
 *    disk cannot both fire for the same change.
 * 8. Everything is handed back together at the end: every setting, every
 *    function that changes one, and the loading/saving controls above —
 *    built by spreading `settings` and the generated setters, not by
 *    naming all fifty again. `settings` itself is also handed back once
 *    more as `settingsSnapshot`, so a caller that needs the whole object
 *    (the session-survival snapshot) can take it as-is instead of copying
 *    every field into its own object by hand.
 *
 * Gotchas:
 * - The list of every setting used to be written out by hand in about six
 *   separate places in this one file: the starting value for each setting,
 *   the snapshot object copied into a ref, the function that writes a
 *   freshly loaded settings object into state, the reset that ran when a
 *   load failed, the automatic save's own list of what to watch for
 *   changes, and the object this hook hands back at the end. Nothing
 *   checked that a setting added to one of those lists was added to all
 *   the others, and the project still built and ran correctly with one
 *   missing from one list. That happened once, quietly, to four settings
 *   (reply language, both model routing orders, and the spoiler
 *   auto-reveal flag): they were left out of the failed-load reset, so a
 *   load that failed right after an earlier successful one left those four
 *   still showing values the plugin had just admitted it could not read,
 *   while every other setting correctly snapped back to its default.
 *   `SETTINGS_FIELD_BACKEND_KEY` below is now the one place a setting's
 *   name is written down in this file; every one of those six spots reads
 *   from it (or from `settings` as a whole) instead of repeating it, and a
 *   field missing from the table fails to compile rather than shipping
 *   with one silently-wrong path — see `usePluginSettings.test.ts` for the
 *   behavioral test that also guards this at runtime.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { callDeckyWithTimeout } from "../utils/deckyCall";
import {
  acknowledgePluginDataClearHandled,
  getPluginDataClearedGeneration,
  shouldIgnoreRestoredSettingsSnapshot,
  takeRestoredSettingsSnapshot,
} from "../utils/bonsaiSessionSurvival";
import { type BonsaiSettings, type BonsaiSettingsSnapshotInput } from "../data/bonsaiSettingsSchema";
import { normalizeSettings } from "../data/bonsaiSettingsNormalizers";
import { diffBonsaiSettingsPayload, toBonsaiSettingsPayload } from "../utils/settingsPayload";
import { saveTabResumeMode } from "../features/plugin-shell/pluginStorage";

/**
 * THE one field list left in this file: every key of `BonsaiSettingsSnapshotInput` (the
 * camelCase shape screen code uses), paired with the key `BonsaiSettings` uses for the same
 * setting on disk (`settingsPayload.ts`'s snake_case shape). `Record<keyof
 * BonsaiSettingsSnapshotInput, keyof BonsaiSettings>` means TypeScript refuses to compile this
 * file if a field is added to the type and forgotten here — the five other lists this hook used
 * to repeat by hand (state, ref snapshot, hydrate, failed-load reset, debounce deps, the returned
 * object) are all generated from this table plus `settings` at runtime, so there is nowhere left
 * for one setting to quietly go missing from just one of them.
 */
const SETTINGS_FIELD_BACKEND_KEY: Record<keyof BonsaiSettingsSnapshotInput, keyof BonsaiSettings> = {
  latencyWarningSeconds: "latency_warning_seconds",
  requestTimeoutSeconds: "request_timeout_seconds",
  latencyTimeoutsCustomEnabled: "latency_timeouts_custom_enabled",
  unifiedInputPersistenceMode: "unified_input_persistence_mode",
  voiceReplyMode: "voice_reply_mode",
  screenshotAttachmentPreset: "screenshot_attachment_preset",
  desktopDebugNoteAutoSave: "desktop_debug_note_auto_save",
  desktopAskVerboseLogging: "desktop_ask_verbose_logging",
  desktopAppLogLevel: "desktop_app_log_level",
  presetChipFadeAnimationEnabled: "preset_chip_fade_animation_enabled",
  presetChipAnimation: "preset_chip_animation",
  presetSingleChip: "preset_single_chip",
  inputSanitizerUserDisabled: "input_sanitizer_user_disabled",
  capabilities: "capabilities",
  aiCharacterEnabled: "ai_character_enabled",
  aiCharacterRandom: "ai_character_random",
  aiCharacterPresetId: "ai_character_preset_id",
  aiCharacterCustomText: "ai_character_custom_text",
  aiCharacterAccentIntensity: "ai_character_accent_intensity",
  askMode: "ask_mode",
  ollamaKeepAlive: "ollama_keep_alive",
  replyVerbosity: "reply_verbosity",
  askThinkEffort: "ask_think_effort",
  replyLanguage: "reply_language",
  showDeveloperTab: "show_developer_tab",
  modelPolicyTier: "model_policy_tier",
  modelPolicyNonFossUnlocked: "model_policy_non_foss_unlocked",
  modelAllowHighVramFallbacks: "model_allow_high_vram_fallbacks",
  textModelRoutingOrder: "text_model_routing_order",
  visionModelRoutingOrder: "vision_model_routing_order",
  ollamaLocalOnDeck: "ollama_local_on_deck",
  ollamaLocalAutostart: "ollama_local_autostart",
  strategySpoilerMaskingEnabled: "strategy_spoiler_masking_enabled",
  strategySpoilerAutoRevealAfterConsent: "strategy_spoiler_auto_reveal_after_consent",
  steamWebApiKey: "steam_web_api_key",
  showOnscreenDebugHud: "show_onscreen_debug_hud",
  devForceSessionRagChips: "dev_force_session_rag_chips",
  devPreloadAskModel: "dev_preload_ask_model",
  devFrozenTestChips: "dev_frozen_test_chips",
  tabResumeMode: "tab_resume_mode",
  namedOllamaHosts: "named_ollama_hosts",
  voiceSttModel: "voice_stt_model",
  uiScaleAutoEnabled: "ui_scale_auto_enabled",
  uiScaleManualProfile: "ui_scale_manual_profile",
  useLocalKnowledgeBase: "use_local_knowledge_base",
  ragHybridRetrievalEnabled: "rag_hybrid_retrieval_enabled",
  ragCorpusPath: "rag_corpus_path",
  ragCorpusVersion: "rag_corpus_version",
};

const SETTINGS_FIELD_KEYS = Object.keys(SETTINGS_FIELD_BACKEND_KEY) as (keyof BonsaiSettingsSnapshotInput)[];

/**
 * In: a normalized settings object, in the backend's own field names
 * (`snake_case`, matching settings.json).
 * Out: the same values, renamed to the `camelCase` shape the rest of the
 * frontend — and the session-survival snapshot in particular — expects.
 * Can go wrong: nothing on its own — it walks every key
 * `SETTINGS_FIELD_BACKEND_KEY` names, and that table cannot itself be
 * missing a field without failing to compile.
 */
function snapshotFromBonsaiSettings(normalized: BonsaiSettings): BonsaiSettingsSnapshotInput {
  const out = {} as Record<string, unknown>;
  for (const key of SETTINGS_FIELD_KEYS) {
    out[key] = normalized[SETTINGS_FIELD_BACKEND_KEY[key]];
  }
  return out as unknown as BonsaiSettingsSnapshotInput;
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

/** One setter per field, named the way every tab already calls it (`setLatencyWarningSeconds`, …). */
type SettingsFieldSetters = {
  [K in keyof BonsaiSettingsSnapshotInput as `set${Capitalize<string & K>}`]: Dispatch<
    SetStateAction<BonsaiSettingsSnapshotInput[K]>
  >;
};

function capitalize(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * In: nothing — this hook loads its own data from the backend as soon
 * as it mounts.
 * Out: every setting's current value, every function that changes one,
 * and the loading/saving controls described in the file header above.
 * Can go wrong: `SETTINGS_FIELD_BACKEND_KEY` above is the one place a
 * setting's two names are written down; everything in this function reads
 * from it or from `settings` as a whole, so there is no second hand-written
 * list here left to drift from it.
 */
export function usePluginSettings() {
  const [settings, setSettings] = useState<BonsaiSettingsSnapshotInput>(defaultSettingsSnapshot);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  /** When false, debounced ``save_settings`` is skipped so a failed initial load cannot wipe disk with UI defaults. */
  const [settingsPersistEnabled, setSettingsPersistEnabled] = useState(false);

  const settingsSnapshotForDebouncedSaveRef = useRef<BonsaiSettingsSnapshotInput>(settings);
  /**
   * What the plugin last confirmed is on disk -- set on every load and every save response.
   * The automatic background save below diffs the live snapshot against this rather than
   * sending the whole thing, so a field this ref doesn't know changed (a QA batch hand-written
   * to settings.json, a background corpus download, ...) is left out of the payload and survives
   * the backend's merge instead of being overwritten by a stale belief about it.
   */
  const settingsBaselineRef = useRef<BonsaiSettingsSnapshotInput>(settings);
  const settingsPersistEpochRef = useRef(0);
  const settingsSaveInFlightRef = useRef(0);
  const pluginDataClearSeenAtMountRef = useRef(getPluginDataClearedGeneration());

  settingsSnapshotForDebouncedSaveRef.current = settings;

  /**
   * One generic setter that every per-field `setSomething` below delegates to. Supports a plain
   * value or a React-style functional update (`setSomething(prev => ...)`, which a few callers —
   * `PermissionsTab`'s capability toggles, `OllamaWhereAiRunsSection`'s named-host list — rely on),
   * because it stands in for what used to be forty-eight independent `useState` setters.
   */
  const setSettingsField = useCallback(
    <K extends keyof BonsaiSettingsSnapshotInput>(
      key: K,
      value: BonsaiSettingsSnapshotInput[K] | ((prev: BonsaiSettingsSnapshotInput[K]) => BonsaiSettingsSnapshotInput[K])
    ) => {
      setSettings((prev) => {
        const nextValue =
          typeof value === "function"
            ? (value as (prev: BonsaiSettingsSnapshotInput[K]) => BonsaiSettingsSnapshotInput[K])(prev[key])
            : value;
        if (Object.is(nextValue, prev[key])) return prev;
        return { ...prev, [key]: nextValue };
      });
    },
    []
  );

  /** `{ setLatencyWarningSeconds, setAskMode, ... }` -- one per field, built off `SETTINGS_FIELD_KEYS`. */
  const fieldSetters = useMemo<SettingsFieldSetters>(() => {
    const out: Record<string, (value: unknown) => void> = {};
    for (const key of SETTINGS_FIELD_KEYS) {
      out[`set${capitalize(key)}`] = (value: unknown) =>
        setSettingsField(key, value as BonsaiSettingsSnapshotInput[typeof key]);
    }
    return out as unknown as SettingsFieldSetters;
  }, [setSettingsField]);

  /**
   * Mirror the mode into localStorage so the shell can read it **synchronously** at mount.
   * `resolveInitialTab` decides the opening tab on the first render, and settings only arrive a
   * `load_settings` round trip later — reading it from state there would always be one open
   * behind, or would flash the wrong tab. `settings.json` stays the source of truth; this is a
   * read cache, `bonsai:`-prefixed so *Clear all plugin data* wipes it with everything else.
   */
  useEffect(() => {
    saveTabResumeMode(settings.tabResumeMode);
  }, [settings.tabResumeMode]);

  const hydrateFromSettings = useCallback((saved: BonsaiSettings) => {
    const normalized = normalizeSettings(saved);
    const snapshot = snapshotFromBonsaiSettings(normalized);
    setSettings(snapshot);
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

  /**
   * The payload for a save a popup makes itself (the AI models screen's Done, the try order, the
   * AI character, UI scale): what changed on screen since the last confirmed disk state, plus the
   * popup's own patch. Same rule as the automatic save below, for the same reason — a full copy
   * writes this screen's stale belief about fields the back end changed on its own. Measured on
   * the Deck (docs/test-evidence/plan64-ROUTING-MERGE-01-top.json): Done on the AI models screen
   * wrote the knowledge base location back to the folder a download had just replaced, and the
   * tab offered to download the library again.
   */
  const buildChangedSettingsPayload = useCallback(
    (patch?: Partial<BonsaiSettings>): Partial<BonsaiSettings> => {
      const changed = diffBonsaiSettingsPayload(
        toBonsaiSettingsPayload(settingsBaselineRef.current),
        toBonsaiSettingsPayload(settingsSnapshotForDebouncedSaveRef.current),
      );
      return patch ? { ...changed, ...patch } : changed;
    },
    [],
  );

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
         * Four fields used to be missing from this reset with nothing saying why: reply
         * language, both model routing orders, and the spoiler auto-reveal flag. They kept
         * whatever was already in state, which is invisible on a first open (state is already at
         * its defaults) but wrong after a read fails *following* a good one — a backend restart
         * with the menu open. Everything else snapped back to defaults while those four kept
         * showing values the plugin had just admitted it could not read, which is the worst of
         * both: a screen telling two stories, and the four still showing user-set values are the
         * ones a user would least suspect.
         *
         * They fell out because this used to be a sixth hand-maintained copy of the field list in
         * this file. It is not anymore: this reset and the successful-load path both call
         * `setSettings` with a complete `BonsaiSettingsSnapshotInput` built from
         * `SETTINGS_FIELD_BACKEND_KEY`, so a field missing from one and not the other is no
         * longer an available mistake to make.
         */
        if (cancelled) return;
        setSettingsPersistEnabled(false);
        setSettings(defaultSettingsSnapshot());
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
  }, [settings, settingsPersistEnabled]);

  return {
    ...settings,
    ...fieldSetters,
    settingsLoaded,
    hydrateFromSettings,
    pauseDebouncedSettingsSave,
    buildChangedSettingsPayload,
    flushSettingsSnapshotNow,
    syncSettingsFromDisk,
    /**
     * The same object already spread onto this return value above, handed back once more under
     * its own name so a caller that needs every setting as one `BonsaiSettingsSnapshotInput` (the
     * session-survival snapshot) can take it directly instead of rebuilding it field by field.
     */
    settingsSnapshot: settings,
  };
}
