"""Title: Back-end seam contracts

Purpose: Pin the exact names and call shapes the big back-end files hand out, so a
         refactor that moves code behind them cannot quietly change what comes out.
Used for: Phase 4 of the round-two refactor, which splits several of these files.
Solves: Python has no compiler, so a renamed argument or a dropped function is only
        found when someone uses the plugin. This fails in the test run instead.
Does not: Say anything about what these functions do. It checks the shape of the
          doorway, not the room behind it.

Frozen 2026-09-14. Adding a new name to one of these files is fine and needs no change
here. Renaming, removing, or changing the arguments of a name below is a change to a
contract other files depend on: update this file in the same commit, on purpose, and
say so in the commit message.

What is NOT pinned here, deliberately: names only a test imports. Those are recorded in
docs/audit/refactor-round-two/phase4-seams.md so a split knows they exist, but pinning
them would make rewriting a test look like breaking a contract.
"""

import importlib
import inspect
import unittest

# module -> name -> the call shape it had when frozen (None for a class or a value)
FROZEN: dict[str, dict[str, str | None]] = {
    # the knowledge base
    "backend.services.knowledge_base_service": {
        "HYBRID_FTS_SHORTLIST_K": None,  # value
        "KnowledgeCard": None,  # class
        "VECTOR_RECALL_FLOOR": None,  # value
        "VECTOR_RECALL_K": None,  # value
        "_budget_for_mode": "(ask_mode: 'str') -> 'tuple[int, int]'",
        "_dot_similarity": "(a: 'list[float]', b: 'list[float]') -> 'float'",
        "_expand_query": "(question: 'str', app_name: 'str', *, game_resolved: 'bool' = False) -> 'str'",
        "_fuse_cards_by_rrf": "(cards: 'list[KnowledgeCard]', query_vector: 'list[float]', vectors_by_id: 'dict[int, list[float]]', *, top_k: 'int', recall_cards: 'Optional[list[KnowledgeCard]]' = None, preferred_ids: 'Optional[set[int]]' = None) -> 'list[KnowledgeCard]'",
        "_resolve_game_id": "(conn: 'sqlite3.Connection', *, app_id: 'str', app_name: 'str', shortcut_name: 'str', text_resolved_title: 'str' = '') -> 'tuple[Optional[int], str]'",
        "_search_compat_patterns": "(conn: 'sqlite3.Connection', *, query: 'str', top_k: 'int') -> 'list[KnowledgeCard]'",
        "_search_sections": "(conn: 'sqlite3.Connection', *, game_id: 'Optional[int]', query: 'str', top_k: 'int', min_relevance: 'float' = 1.0) -> 'list[KnowledgeCard]'",
        "_vector_recall_sections": "(conn: 'sqlite3.Connection', *, game_id: 'int', query_vector: 'list[float]', top_k: 'int', min_similarity: 'float', exclude_ids: 'set[int]') -> 'tuple[list[KnowledgeCard], dict[int, list[float]]]'",
        "close_connection": "(db_path: 'str') -> 'None'",
        "kb_coverage_to_transparency": "(summary: 'KbCoverageSummary') -> 'dict[str, Any]'",
        "lookup_game_genres": "(settings: 'dict', app_id: 'str') -> 'str'",
        "resolve_title_from_question": "(settings: 'dict', question: 'str') -> 'str'",
        "retrieve_knowledge_context": "(settings: 'dict', *, ask_mode: 'str', question: 'str', app_id: 'str', app_name: 'str', shortcut_name: 'str' = '', text_resolved_title: 'str' = '', domain: 'str', pc_ip: 'str' = '') -> 'KnowledgeRetrievalResult'",
        "session_rag_chip_candidates_to_rpc": "(result: 'SessionRagChipCandidatesResult') -> 'dict[str, Any]'",
        "should_retrieve_knowledge": "(*, use_local_knowledge_base: 'bool', ask_mode: 'str', question: 'str', app_id: 'str', app_name: 'str', text_resolved_title: 'str' = '') -> 'tuple[bool, str]'",
        "stack_context_blocks": "(*, proton_text: 'str', knowledge_text: 'str', max_total_bytes: 'int' = 102400) -> 'StackedContext'",
        "suggest_chip_candidates": "(settings: 'dict', *, app_id: 'str', app_name: 'str', shortcut_name: 'str' = '') -> 'SessionRagChipCandidatesResult'",
        "summarize_kb_coverage": "(settings: 'dict', *, app_id: 'str', app_name: 'str', shortcut_name: 'str' = '') -> 'KbCoverageSummary'",
    },
    # prompt building
    "backend.services.ollama_prompts": {
        "FOLLOWUP_SUBJECT_NOTE_TEMPLATE": None,  # value
        "_user_asks_resolution_relevant_performance": "(question: str) -> bool",
        "append_deck_tdp_sysfs_grounding": "(system_text: str, *, read_tdp: bool = False, cap_w: Optional[int] = None, grounding_requested: bool = False) -> str",
        "build_reply_followup_context_block": "(chip_id: str, parent_question: str, parent_answer: str) -> str",
        "build_system_prompt": "(question: str, app_id: str, app_name: str, normalized_attachments: list, prepared_images: list, lookup_app_name: Callable[[str], str], lookup_screenshot_vdf_metadata: Callable[[str], dict], ask_mode: str = 'speed', early_context_suffix: str = '', followup_subject: str = '', strategy_spoiler_consent: bool = False, strategy_spoiler_asked_entity: str = '', strategy_spoiler_kb_entity_match: bool = False, strategy_domain_guidance: bool = False, character_roleplay_on: bool = False, strategy_checklist_state: Optional[dict] = None, reply_verbosity: str = 'balanced', reply_language: str = 'english', knowledge_block_placement: str = 'early') -> str",
        "extract_strategy_asked_entity": "(question: str, *, known_entities=()) -> str",
        "format_ai_response": "(text: str, normalized_attachments: list, prepared_images: list, attachment_errors: list) -> str",
        "kb_card_names": "(kb_text: str) -> list[str]",
        "kb_text_covers_asked_entity": "(kb_text: str, entity: str) -> bool",
        "question_matches_troubleshooting_log_context": "(question: str) -> bool",
        "sanitize_reply_followup": "(raw: Any) -> Optional[dict]",
        "user_asks_ollama_bonsai_host_or_latency": "(question: str) -> bool",
        "user_consents_strategy_spoilers": "(question: str) -> bool",
        "user_wants_power_or_performance_topic": "(question: str) -> bool",
    },
    # whisper runtime basics
    "backend.services.voice_whisper_runtime": {
        "CHANNELS": None,  # value
        "SAMPLE_RATE": None,  # value
        "SAMPLE_WIDTH": None,  # value
        "WHISPER_THREADS": None,  # value
        "_pcm_to_wav_bytes": "(pcm: 'bytes') -> 'bytes'",
        "_sanitize_whisper_transcript": "(text: 'str') -> 'str'",
        "voice_bin_dir": "(plugin_root: 'str', settings_dir: 'str') -> 'str'",
        "voice_whisper_cli_path": "(plugin_root: 'str', settings_dir: 'str') -> 'str'",
        "voice_whisper_runtime_env": "(plugin_root: 'str', settings_dir: 'str') -> 'dict[str, str]'",
        "voice_whisper_server_path": "(plugin_root: 'str', settings_dir: 'str') -> 'str'",
        "whisper_binary_usable": "(plugin_root: 'str', settings_dir: 'str') -> 'Optional[str]'",
        "whisper_server_binary_usable": "(plugin_root: 'str', settings_dir: 'str') -> 'Optional[str]'",
    },
    # voice capture
    "backend.services.voice_transcription_service": {
        "VoiceTranscriptionSession": None,  # class
        "download_voice_model": "(plugin_root: 'str', settings_dir: 'str', model_id: 'str', state: 'dict[str, Any]', cancel_event: 'threading.Event', on_stage: 'Optional[Callable[[str, dict[str, Any]], None]]' = None) -> 'None'",
        "engine_readiness": "(plugin_root: 'str', settings_dir: 'str', model_id: 'str') -> 'dict[str, Any]'",
        "env_for_audio_capture": "() -> 'dict[str, str]'",
        "install_whisper_cli": "(plugin_root: 'str', settings_dir: 'str', state: 'dict[str, Any]', cancel_event: 'threading.Event', on_stage: 'Optional[Callable[[str, dict[str, Any]], None]]' = None) -> 'None'",
        "new_voice_install_state": "() -> 'dict[str, Any]'",
        "new_voice_transcription_state": "() -> 'dict[str, Any]'",
        "sanitize_voice_stt_model": "(value: 'Any') -> 'str'",
    },
    # the whisper server
    "backend.services.voice_whisper_daemon": {
        "force_whisper_engine_stop": "() -> 'None'",
        "get_whisper_engine": "() -> \"'WhisperEngine'\"",
    },
    # ask command text rules
    "backend.services.ask_command_text": {
        "normalize_ask_command_input": "(text: 'str', *, allow_leading_slash: 'bool' = False) -> 'str'",
        "strip_optional_leading_slash": "(text: 'str') -> 'str'",
    },
    # local ask commands
    "backend.services.ask_local_commands": {
        "detect_local_ask_commands": "(text: 'str') -> 'LocalAskCommandKinds'",
    },
}


class SeamContractTests(unittest.TestCase):
    def test_every_frozen_name_is_still_there(self):
        for module_path, names in FROZEN.items():
            module = importlib.import_module(module_path)
            for name in names:
                with self.subTest(module=module_path, name=name):
                    self.assertTrue(
                        hasattr(module, name),
                        f"{module_path} no longer hands out {name}. Other files import it. "
                        f"If the move was on purpose, update FROZEN in the same commit.",
                    )

    def test_every_frozen_function_has_the_same_call_shape(self):
        for module_path, names in FROZEN.items():
            module = importlib.import_module(module_path)
            for name, frozen_signature in names.items():
                if frozen_signature is None:
                    continue
                with self.subTest(module=module_path, name=name):
                    obj = getattr(module, name, None)
                    if obj is None:
                        continue  # the test above reports this properly
                    self.assertEqual(
                        str(inspect.signature(obj)),
                        frozen_signature,
                        f"{module_path}.{name} is called differently than when it was frozen. "
                        f"Callers outside this file rely on the old shape.",
                    )

    def test_the_two_back_end_import_loops_stay_broken(self):
        """The Ask command ring and the voice pair were untangled on 2026-09-14.

        Both were broken by giving the shared pieces a file of their own. The leaf
        files below must not import the files that import them, or the loop is back.
        """
        leaves = {
            "backend.services.ask_command_text": (
                "backend.services.ask_local_commands",
                "backend.services.input_sanitizer_service",
                "backend.services.shortcut_setup_commands",
                "backend.services.vac_check_commands",
            ),
            "backend.services.voice_whisper_runtime": (
                "backend.services.voice_transcription_service",
                "backend.services.voice_whisper_daemon",
            ),
        }
        for leaf, must_not_import in leaves.items():
            source = inspect.getsource(importlib.import_module(leaf))
            for forbidden in must_not_import:
                with self.subTest(leaf=leaf, forbidden=forbidden):
                    self.assertNotIn(
                        forbidden,
                        source,
                        f"{leaf} imports {forbidden}, which imports it back. "
                        f"That is the loop this file exists to prevent.",
                    )


if __name__ == "__main__":
    unittest.main()
