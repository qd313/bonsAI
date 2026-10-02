/**
 * Title: Every setting survives a save and a fresh load (read-back test)
 *
 * Purpose: Change EVERY setting the plugin carries to a value that is not its starting value, let
 * the settings hook save it, start a brand new copy of the hook that loads what was saved, and
 * check every setting came back exactly as it was set.
 * Used for: Guarding `usePluginSettings.ts` (and `settingsPayload.ts`, which it saves through)
 * against a setting that is carried in one place and forgotten in another. Such a setting looks
 * fine until the plugin restarts, then quietly goes back to its starting value.
 * Solves: The list of settings is written out by hand in more than one place and no type catches
 * every slip. This test does not trust any of those lists: the list of settings comes from the
 * fresh-install file both languages share (`tests/contracts/settings-defaults.json`).
 * Does not: Check the back end's own rules about a value (the Python tests do), or the screens.
 *
 * How it works: `NON_DEFAULT` holds one valid value per setting, in the back end's own names. The
 * first test checks that table against the contract file (a setting with no row, a row for a
 * setting that does not exist, or a row equal to the starting value all fail). The other tests
 * run the real hook against a stand-in back end that merges each save over its "disk" the way the
 * real one does, once through the automatic 400 ms save and once through the whole-copy save.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";
import { usePluginSettings } from "./usePluginSettings";
import { dispatchFakeRpc, getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

const CONTRACT = JSON.parse(
  readFileSync(resolve(__dirname, "../../tests/contracts/settings-defaults.json"), "utf8"),
) as Record<string, unknown>;

/**
 * One valid, non-starting value for every setting. Some pairs must agree to survive the back end's
 * own rules: the fade flag follows the chip animation, the "non-open" model tier needs its
 * acknowledgement, the screen-size settings only stick with the Developer tab on, and the warning
 * time stays under the timeout.
 */
const NON_DEFAULT: Record<string, unknown> = {
  ai_character_accent_intensity: "heavy",
  ai_character_custom_text: "Speak like a tired lighthouse keeper.",
  ai_character_enabled: true,
  ai_character_preset_id: "cp2077_jackie",
  ai_character_random: false,
  ask_mode: "expert",
  ask_think_effort: "high",
  capabilities: {
    filesystem_write: true,
    internet_downloads: true,
    media_library_access: true,
    microphone_access: true,
    steam_logs_read: true,
    steam_web_api: true,
  },
  desktop_app_log_level: "verbose",
  desktop_ask_verbose_logging: true,
  desktop_debug_note_auto_save: true,
  dev_force_session_rag_chips: true,
  dev_frozen_test_chips: ["marker question one", "marker question two"],
  dev_preload_ask_model: true,
  input_sanitizer_user_disabled: true,
  latency_timeouts_custom_enabled: true,
  latency_warning_seconds: 120,
  model_allow_high_vram_fallbacks: true,
  model_policy_non_foss_unlocked: true,
  model_policy_tier: "non_foss",
  named_ollama_hosts: [{ label: "Living room PC", host: "192.168.1.20:11434" }],
  ollama_keep_alive: "30m",
  ollama_local_autostart: true,
  ollama_local_on_deck: true,
  preset_chip_animation: "decode",
  preset_chip_fade_animation_enabled: false,
  preset_single_chip: true,
  rag_corpus_path: "/run/media/deck/sd/.bonsai/rag",
  rag_corpus_version: "2026.10.02",
  rag_hybrid_retrieval_enabled: false,
  reply_language: "german",
  reply_verbosity: "detailed",
  request_timeout_seconds: 300,
  screenshot_attachment_preset: "max",
  show_developer_tab: true,
  show_onscreen_debug_hud: true,
  steam_web_api_key: "ABCDEF0123456789",
  strategy_spoiler_auto_reveal_after_consent: true,
  strategy_spoiler_masking_enabled: false,
  stream_scramble_color: "cyan",
  stream_scramble_enabled: true,
  stream_scramble_settle_ms: 900,
  stream_scramble_style: "tail",
  tab_resume_mode: "always_main",
  text_model_routing_order: ["gemma4:e2b-it-qat", "qwen2.5:7b"],
  ui_scale_auto_enabled: false,
  ui_scale_manual_profile: "couch",
  unified_input_persistence_mode: "persist_all",
  use_local_knowledge_base: true,
  vision_model_routing_order: ["llava:7b"],
  voice_reply_mode: "always",
  voice_stt_model: "base.en",
};

const camel = (wireKey: string) => wireKey.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const setterName = (wireKey: string) => {
  const c = camel(wireKey);
  return `set${c.charAt(0).toUpperCase()}${c.slice(1)}`;
};

/** A stand-in back end: every save merges over what is on "disk", like the real `save_settings`. */
function installDisk(): { current: () => Record<string, unknown> } {
  let disk: Record<string, unknown> = { ...CONTRACT };
  setRpcHandler("load_settings", () => disk);
  setRpcHandler("save_settings", (...args: unknown[]) => {
    disk = { ...disk, ...((args[0] as Record<string, unknown>) ?? {}) };
    return disk;
  });
  return { current: () => disk };
}

describe("every setting survives a save and a fresh load", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>,
    );
  });

  it("the test table covers exactly the settings in the fresh-install file, each with a non-starting value", () => {
    const wireKeys = Object.keys(CONTRACT);
    expect(wireKeys.length).toBeGreaterThan(40);
    expect(Object.keys(NON_DEFAULT).sort()).toEqual([...wireKeys].sort());
    for (const key of wireKeys) {
      expect(JSON.stringify(NON_DEFAULT[key]), `"${key}" must differ from its starting value`).not.toBe(
        JSON.stringify(CONTRACT[key]),
      );
    }
  });

  const readBackThrough = (how: "the automatic save" | "the whole-copy save") =>
    it(`every setting read back on a fresh hook equals what was set, saved through ${how}`, async () => {
      const disk = installDisk();
      const first = renderHook(() => usePluginSettings());
      await waitFor(() => expect(first.result.current.settingsLoaded).toBe(true));
      // Starts at the fresh-install values, so each change below is a real change.
      for (const key of Object.keys(CONTRACT)) {
        expect((first.result.current as Record<string, unknown>)[camel(key)], key).toEqual(CONTRACT[key]);
      }

      act(() => {
        for (const key of Object.keys(CONTRACT)) {
          const setter = (first.result.current as Record<string, unknown>)[setterName(key)];
          expect(typeof setter, `the hook has no ${setterName(key)} for "${key}"`).toBe("function");
          (setter as (v: unknown) => void)(NON_DEFAULT[key]);
        }
      });

      if (how === "the automatic save") {
        await act(async () => {
          await new Promise((r) => setTimeout(r, 500));
        });
      } else {
        await act(async () => {
          await first.result.current.flushSettingsSnapshotNow();
        });
      }
      expect(getRpcCallLog().some((c) => c.method === "save_settings")).toBe(true);

      // What is on "disk" is what was set, in the back end's own names.
      for (const key of Object.keys(CONTRACT)) {
        expect(disk.current()[key], `saved "${key}"`).toEqual(NON_DEFAULT[key]);
      }

      // A brand new hook, as after a restart, loads it back.
      first.unmount();
      const second = renderHook(() => usePluginSettings());
      await waitFor(() => expect(second.result.current.settingsLoaded).toBe(true));
      for (const key of Object.keys(CONTRACT)) {
        expect((second.result.current as Record<string, unknown>)[camel(key)], `read back "${key}"`).toEqual(
          NON_DEFAULT[key],
        );
      }
    });

  readBackThrough("the automatic save");
  readBackThrough("the whole-copy save");
});
