/**
 * Title: The list of things the screen is allowed to ask the back end for
 *
 * Purpose: The plugin has two halves. The screen half runs in Steam's own
 * interface; the back end half runs as a separate program and does the work that
 * needs a real computer -- talking to the AI, reading files, running commands. The
 * screen asks the back end for something by naming it, and this is the complete
 * list of names it may use. Writing a name that is not on this list stops the
 * build straight away.
 *
 * Used for: almost every request the screen makes. They nearly all go through one
 * function, and that function will not accept a name from outside this list. Four
 * calls deliberately go direct instead and are not checked against it -- wiping
 * plugin data, installing the knowledge base from a local folder, and starting and
 * stopping voice recording. A separate check counts those four and fails if a
 * fifth appears.
 *
 * Solves: the name used to be an ordinary piece of text, so a typo, or a name that
 * was correct until somebody renamed it at the other end, looked perfectly fine
 * and only went wrong when a person tried to use the feature on their Deck.
 *
 * Does not: say anything about what you send with the request or what comes back.
 * Only the name is checked here.
 *
 * Gotchas:
 *   - **Nothing you write in this file survives.** It is built from scratch on
 *     every commit by reading the back end, so a hand edit disappears the next
 *     time anybody commits. To add a name, add the thing it names in main.py and
 *     this file catches up on its own. To change this description, change the
 *     template it is printed from, in
 *     packages/bonsai-mcp/scripts/generate-architecture.mjs.
 *   - The count below is written as a comment rather than as a value anything can
 *     read. Nothing would use it, and an unused value fails one of the checks.
 *
 * 65 names at the time this was written.
 */
export type BonsaiRpcMethod =
  | "abort_background_game_ai"
  | "append_app_log"
  | "append_desktop_chat_event"
  | "append_desktop_debug_note"
  | "apply_ollama_local_autostart"
  | "ask_game_ai"
  | "ask_ollama"
  | "cancel_local_ollama_setup"
  | "cancel_rag_corpus_download"
  | "clear_plugin_data"
  | "clear_strategy_checklist_session"
  | "create_chat_slot"
  | "dbg_fe_log"
  | "delete_chat_slot"
  | "delete_ollama_model"
  | "discover_mdns_ollama_hosts"
  | "export_intent_pack"
  | "fetch_ollama_catalog_metadata"
  | "fetch_pull_model_catalog"
  | "forget_background_game_ai"
  | "forget_game_ai_carried_context"
  | "get_background_game_ai_status"
  | "get_chat_slot"
  | "get_deck_ip"
  | "get_input_transparency"
  | "get_intent_packs"
  | "get_local_ollama_setup_status"
  | "get_ollama_local_autostart_status"
  | "get_rag_corpus_status"
  | "get_reply_language_snapshot"
  | "get_session_rag_chip_candidates"
  | "get_strategy_checklist_session"
  | "get_voice_engine_status"
  | "get_voice_install_status"
  | "get_voice_read_aloud_status"
  | "get_voice_transcription_status"
  | "import_intent_pack"
  | "install_rag_corpus_local"
  | "install_voice_engine"
  | "list_chat_slots"
  | "list_recent_screenshots"
  | "load_settings"
  | "merge_pulled_tags_into_routing_orders"
  | "pull_ollama_models"
  | "read_host_clipboard_text"
  | "remove_intent_pack"
  | "remove_rag_corpus"
  | "rename_chat_slot"
  | "save_ask_feedback"
  | "save_settings"
  | "save_strategy_checklist_session"
  | "set_intent_pack_enabled"
  | "set_kids_lock_state"
  | "start_background_game_ai"
  | "start_local_ollama_setup"
  | "start_rag_corpus_download"
  | "start_voice_read_aloud"
  | "start_voice_transcription"
  | "stop_voice_read_aloud"
  | "stop_voice_transcription"
  | "sum_up_chat_slot"
  | "take_steam_screenshot"
  | "test_ollama_connection"
  | "update_rag_corpus"
  | "write_host_clipboard_text";
