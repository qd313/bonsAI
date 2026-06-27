import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { defaultSettingsFixture, idleBackgroundStatusFixture } from "./rpcFixtures";

export type RpcHandler = (...args: unknown[]) => unknown | Promise<unknown>;

/** Frontend RPC methods invoked from `src/` (keep in sync with grep / main.py). */
export const FRONTEND_RPC_METHODS = [
  "load_settings",
  "save_settings",
  "clear_plugin_data",
  "start_background_game_ai",
  "get_background_game_ai_status",
  "abort_background_game_ai",
  "test_ollama_connection",
  "discover_mdns_ollama_hosts",
  "fetch_ollama_catalog_metadata",
  "fetch_pull_model_catalog",
  "pull_ollama_models",
  "delete_ollama_model",
  "start_local_ollama_setup",
  "get_local_ollama_setup_status",
  "cancel_local_ollama_setup",
  "get_deck_ip",
  "append_app_log",
  "append_desktop_debug_note",
  "append_desktop_chat_event",
  "read_host_clipboard_text",
  "get_input_transparency",
  "save_ask_feedback",
  "list_recent_screenshots",
  "capture_screenshot",
  "start_voice_transcription",
  "stop_voice_transcription",
  "get_voice_transcription_status",
  "get_voice_engine_status",
  "install_voice_engine",
  "get_voice_install_status",
  "get_intent_packs",
  "set_intent_pack_enabled",
  "export_intent_pack",
  "import_intent_pack",
  "remove_intent_pack",
] as const;

export type FrontendRpcMethod = (typeof FRONTEND_RPC_METHODS)[number];

function intentPacksFixture() {
  return {
    schema_version: 1,
    summaries: [
      {
        id: "deck-basics",
        label: "Deck basics",
        enabled: true,
        source: "bundled",
        entry_count: 1,
      },
    ],
    packs: [
      {
        id: "deck-basics",
        label: "Deck basics",
        enabled: true,
        source: "bundled",
        updated_at: "2026-06-27",
        entries: [
          {
            target: "Settings > Internet > Enable Wi-Fi",
            aliases: ["wifi"],
            synonyms: ["wireless"],
            expansions: ["network"],
          },
        ],
      },
    ],
  };
}

function defaultHandlers(): Record<string, RpcHandler> {
  const settings = defaultSettingsFixture();
  return {
    load_settings: () => settings,
    save_settings: (...args: unknown[]) => {
      const payload = args[0];
      if (payload && typeof payload === "object") {
        return { ...settings, ...(payload as Record<string, unknown>) };
      }
      return settings;
    },
    clear_plugin_data: () => ({ ok: true }),
    get_background_game_ai_status: () => idleBackgroundStatusFixture(),
    start_background_game_ai: () => ({ accepted: true, status: "pending" as const }),
    abort_background_game_ai: () => ({ ok: true }),
    test_ollama_connection: () => ({ reachable: true, version: "0.5.0", models: ["qwen2.5:1.5b"] }),
    discover_mdns_ollama_hosts: () => ({ ok: true, hosts: [] as Array<{ label: string; host: string; port: number }> }),
    get_deck_ip: () => "192.168.1.100",
    get_local_ollama_setup_status: () => ({ phase: "idle", stage: "", profile: "", done: true }),
    start_local_ollama_setup: () => ({ accepted: true }),
    cancel_local_ollama_setup: () => ({ cancel_requested: true }),
    append_app_log: () => ({ success: true }),
    append_desktop_debug_note: () => ({ success: true }),
    append_desktop_chat_event: () => ({ success: true }),
    read_host_clipboard_text: () => ({ ok: true, text: "" }),
    get_input_transparency: () => ({ ok: true }),
    save_ask_feedback: () => ({ ok: true }),
    fetch_ollama_catalog_metadata: () => ({ tags: {} }),
    fetch_pull_model_catalog: () => ({
      source: "live",
      updated_at: "2026-06-11",
      fetched_at: Math.floor(Date.now() / 1000),
      entries: [
        {
          tag: "qwen3:2b",
          params: "2B",
          sizeGb: 1.6,
          releasedYm: "2025-04",
          license: "Apache 2.0",
          licenseClass: "foss",
          group: "smallest",
          tags: ["chat", "strategy"],
          rating: 5,
          blurb: "Lightweight Qwen 3 reasoning — good speed/strategy balance on Deck.",
        },
      ],
      removed_tags: [],
      overrides: {},
    }),
    pull_ollama_models: () => ({ accepted: true }),
    delete_ollama_model: () => ({ ok: true }),
    list_recent_screenshots: () => ({ success: true, items: [] }),
    capture_screenshot: () => ({
      success: true,
      item: {
        path: "/tmp/bonsai-capture-preview.png",
        name: "bonsai-capture-preview.png",
        mtime: Date.now() / 1000,
        source: "capture",
        app_id: "",
        size_bytes: 1024,
      },
    }),
    start_voice_transcription: () => ({ accepted: true }),
    stop_voice_transcription: () => ({
      stopped: true,
      status: "stopped",
      finalized_transcript: "",
      partial_transcript: "",
    }),
    get_voice_transcription_status: () => ({
      status: "idle",
      recording: false,
      streaming: false,
      partial_transcript: "",
      finalized_transcript: "",
    }),
    get_voice_engine_status: () => ({
      model_id: "tiny.en",
      binary_ready: true,
      model_ready: true,
      ready: true,
      install: { phase: "idle", done: true },
    }),
    install_voice_engine: () => ({ accepted: true, model_id: "tiny.en" }),
    get_voice_install_status: () => ({ phase: "idle", done: true }),
    get_intent_packs: () => intentPacksFixture(),
    set_intent_pack_enabled: (...args: unknown[]) => {
      const enabled = args[1] === true;
      const fixture = intentPacksFixture();
      const packId = String(args[0] ?? "");
      fixture.packs = fixture.packs.map((p) => (p.id === packId ? { ...p, enabled } : p));
      fixture.summaries = fixture.summaries.map((s) => (s.id === packId ? { ...s, enabled } : s));
      return { ok: true, ...fixture };
    },
    export_intent_pack: () => ({
      ok: true,
      json: JSON.stringify(intentPacksFixture().packs[0], null, 2),
    }),
    import_intent_pack: (...args: unknown[]) => {
      const payload = args[0];
      const confirm =
        payload && typeof payload === "object" && (payload as { confirm?: boolean }).confirm === true;
      return {
        ok: true,
        dry_run: !confirm,
        pack: intentPacksFixture().packs[0],
        conflicts: [],
        stats: { added_entries: 0, merged_entries: 0, conflicts: 0 },
        ...(confirm ? intentPacksFixture() : {}),
      };
    },
    remove_intent_pack: () => ({ ok: false, error: "Bundled packs cannot be removed (disable instead)" }),
  };
}

let handlers: Record<string, RpcHandler> = defaultHandlers();
let callLog: Array<{ method: string; args: unknown[] }> = [];

export function resetFakeDeckyRpc(): void {
  handlers = defaultHandlers();
  callLog = [];
}

export function setRpcHandler(method: string, handler: RpcHandler): void {
  handlers[method] = handler;
}

export function getRpcCallLog(): ReadonlyArray<{ method: string; args: unknown[] }> {
  return callLog;
}

export async function dispatchFakeRpc(method: string, args: unknown[]): Promise<unknown> {
  callLog.push({ method, args: [...args] });
  const handler = handlers[method];
  if (!handler) {
    throw new Error(`[fakeDeckyRpc] unhandled method: ${method}`);
  }
  return await handler(...args);
}

export function assertAllFrontendRpcMethodsRegistered(): void {
  const missing = FRONTEND_RPC_METHODS.filter((m) => !(m in defaultHandlers()));
  if (missing.length > 0) {
    throw new Error(`[fakeDeckyRpc] missing default handlers: ${missing.join(", ")}`);
  }
}

export function setBackgroundStatusFixture(status: BackgroundRequestStatus): void {
  setRpcHandler("get_background_game_ai_status", () => status);
}
