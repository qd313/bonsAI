import type { BackgroundRequestStatus } from "../types/backgroundAsk";
import { defaultSettingsFixture, idleBackgroundStatusFixture } from "./rpcFixtures";

export type RpcHandler = (...args: unknown[]) => unknown | Promise<unknown>;

/**
 * Frontend RPC methods invoked from `src/`.
 *
 * **Hand-maintained, and nothing verifies it.** `assertAllFrontendRpcMethodsRegistered`
 * only checks list → handler; it never checks call-site → list or list → `main.py`,
 * so this can silently drift from both. Adding a name here is not what makes a test
 * pass — adding the *handler* below is. Keep it in sync by grepping `src/` for
 * `callDeckyWithTimeout(` and `call<` when you add an RPC.
 */
export const FRONTEND_RPC_METHODS = [
  "load_settings",
  "save_settings",
  "clear_plugin_data",
  "start_background_game_ai",
  "get_session_rag_chip_candidates",
  "merge_pulled_tags_into_routing_orders",
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
  "write_host_clipboard_text",
  "get_input_transparency",
  "save_ask_feedback",
  "list_recent_screenshots",
  "take_steam_screenshot",
  "start_voice_transcription",
  "stop_voice_transcription",
  "get_voice_transcription_status",
  "start_voice_read_aloud",
  "stop_voice_read_aloud",
  "get_voice_read_aloud_status",
  "get_voice_engine_status",
  "install_voice_engine",
  "get_voice_install_status",
  "get_intent_packs",
  "set_intent_pack_enabled",
  "set_kids_lock_state",
  "export_intent_pack",
  "import_intent_pack",
  "remove_intent_pack",
  "get_reply_language_snapshot",
  "get_strategy_checklist_session",
  "save_strategy_checklist_session",
  "clear_strategy_checklist_session",
  "get_rag_corpus_status",
  "start_rag_corpus_download",
  "cancel_rag_corpus_download",
  "update_rag_corpus",
  "remove_rag_corpus",
  "list_chat_slots",
  "get_chat_slot",
  "create_chat_slot",
  "delete_chat_slot",
  "rename_chat_slot",
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
    get_session_rag_chip_candidates: () => ({ ok: false, reason: "kb_off", candidates: [] }),
    merge_pulled_tags_into_routing_orders: () => ({ ok: true, merged: [] }),
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
    write_host_clipboard_text: () => ({ success: true }),
    get_input_transparency: () => ({ ok: true }),
    get_reply_language_snapshot: () => ({
      override: settings.reply_language ?? "follow_system",
      steam_client_language: "english",
      effective: "english",
      display_name: "English",
    }),
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
    take_steam_screenshot: () => ({
      success: true,
      item: {
        path: "/tmp/steam-screenshot-preview.png",
        name: "20260101-120000.png",
        mtime: Date.now() / 1000,
        source: "steam_recent",
        app_id: "1234560",
        size_bytes: 2048,
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
    start_voice_read_aloud: () => ({ ok: true, sentence_count: 1, error: null }),
    stop_voice_read_aloud: () => ({ ok: true, stopped: true }),
    get_voice_read_aloud_status: () => ({
      state: "idle",
      sentence_index: 0,
      sentence_count: 0,
      error: null,
      started_at: null,
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
    set_kids_lock_state: (...args: unknown[]) => ({
      ok: true,
      kids_lock_active: args[0] === true,
    }),
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
    get_strategy_checklist_session: () => null,
    save_strategy_checklist_session: () => ({ ok: true }),
    clear_strategy_checklist_session: () => ({ ok: true }),
    // Knowledge base. The real `get_rag_corpus_status` spreads the backend's
    // download state over the installed/version fields, so a test that wants a
    // running or cancelled download overrides this whole object.
    get_rag_corpus_status: () => ragCorpusStatusFixture(),
    start_rag_corpus_download: () => ({ accepted: true, install_path: "~/.bonsai/rag" }),
    cancel_rag_corpus_download: () => ({ cancel_requested: true }),
    update_rag_corpus: () => ({ ok: true }),
    remove_rag_corpus: () => ({ ok: true }),
    list_chat_slots: () => ({ slots: [] }),
    get_chat_slot: () => ({ ok: false, error: "Slot not found" }),
    create_chat_slot: () => ({
      ok: true,
      slot: {
        id: "slot-test-1",
        label: "New chat",
        created_at: 0,
        updated_at: 0,
        turns: [],
      },
    }),
    delete_chat_slot: () => ({ ok: true }),
    rename_chat_slot: () => ({
      ok: true,
      slot: { id: "slot-test-1", label: "Renamed", created_at: 0, updated_at: 0, turns: [] },
    }),
  };
}

export function ragCorpusStatusFixture(overrides: Record<string, unknown> = {}) {
  return {
    phase: "idle",
    stage: "",
    done: true,
    installed: false,
    corpus_path: "",
    corpus_version: "",
    use_local_knowledge_base: false,
    embeddings_populated: false,
    embed_model_available: true,
    storage_options: {
      internal: { id: "internal", label: "Internal storage", install_path: "~/.bonsai/rag", free_bytes: 64 * 1024 ** 3 },
      sd_card: null,
    },
    ...overrides,
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
