# Back end: folder map, test merges and clean-up findings

Written 2026-10-16 by the plan 86 step 2 back-end reviewer (Sonnet 5.5 high), from the records of batches b63 to b82
(273 files), on `experimental` at `b5ce2768`. The map itself is `folder-map-back-end.tsv` next to this file.

## In plain words

**For a player: nothing changes.** This is a tidy-up of where the plugin's Python files sit. Not one line of behaviour
moves.

**For the maintainer, what you are approving:**

- The 108 files in one folder (`py_modules/backend/services/`) go into 14 folders of 2 to 25 files each (plus two
  folders, `knowledge` and `notes`, that another reviewer fills). The old folder disappears. The seven loose files
  beside it (`ollama_urls.py`, `constants.py` and friends) go into the same folders. After the move the back-end root
  holds only `__init__.py` and the two clipboard shell scripts.
- One choice differs from the proposed list: a new folder, `answer/`, for the files that read and check what the AI
  sends back (eight files). Without it, `ask/` would hold 21 files and four of them (the reply stream reader, the
  reply checker, the Show details record, the feedback log) had no home that fit.
- **The Python tests stay where they are, in one flat `tests/` folder.** Moving them into folders would break how the
  test runner finds them and how they borrow from each other, the move tool cannot move them anyway, and step 5
  merges 159 files into about 50 first (section "Python tests").
- Four test files, one data file and four source files go away with the removals, not in this move (they are marked
  `-` in the map).
- The move would create **no import loops**. Every new folder's `__init__.py` must hold only its explanation, never
  an import; that one rule is what keeps it so.
- Things a person must change by hand around the move: one line in the zip check script (it counts files in the old
  folder, and must change **before** the first move commit), one line in the tool server's map builder, and the two
  sentences in AGENTS.md that name the old folder.

Size of the finding list: about 60 unused imports and re-exports (8 in `main.py`, about 16 in one file, 24 in
another), 5 places where the same code is written two or three times and is worth fixing, 8 test files that read
source text as text (only one reads Python source; the rest compare a list with the screen's TypeScript), and 10
repeated test set-ups that a shared helper would replace.

## The package split

### The packages, the proposed list changed where the code says otherwise

Numbers are files and lines in my area at `b5ce2768`, counted after the four service files that go in step 3 are left out (they are marked `-` in the map).
Every file keeps its own name (the move tool changes the folder only). The `ollama_` prefix inside `ollama/` is
redundant but is left: renaming is a separate, later change.

| Package (`py_modules/backend/`) | What it holds | Files (mine) |
|---|---|---|
| `core/` (5 files, 426 lines) | Small helpers every feature uses and none owns. It imports nothing else in the back end, so it is the bottom layer. | `constants` (from the root), `tls_ca_fallback` (from the root), `capabilities`, `async_background_job`, `async_task_lifecycle` |
| `ollama/` (25 files, 5,931 lines) | Where the AI runs: addresses, connection checks, finding, installing and removing Ollama on the Deck, installed and downloadable models, the try order, keep-alive, start-up warm-up, the room the model has (token accounting). | `ollama_connectivity`, `ollama_reply_limits`, `ollama_routing`, `ollama_urls` (all four from the root), `local_ollama_setup_service`, `local_ollama_teardown_service`, `local_setup_progress_text`, `model_policy`, `network_service`, `ollama_catalog_service`, `ollama_connection_test`, `ollama_health_probe`, `ollama_keep_alive_rule`, `ollama_local_autostart_service`, `ollama_local_setup_rpc`, `ollama_locate`, `ollama_mdns_discovery_service`, `ollama_pc_models`, `ollama_preload_service`, `ollama_pull_resume_service`, `ollama_server_restart`, `ollama_try_order_prune`, `starter_set_extras`, `starter_speech_models`, `token_accounting_service` |
| `ask/` (13 files, 4,640 lines) | Building one question and sending it: the request builder, the model call and its stream, Stop, size budgets, Proton log lines, the state of an answer running in the background. | `game_ai_request`, `ask_payload`, `background_request_state`, `ollama_service`, `ollama_ask_service`, `ollama_ask_budgets`, `ollama_ask_extras`, `ollama_chat_stream`, `ollama_stop_service`, `ollama_stream_failures`, `ollama_window_fit`, `prompt_budget_service`, `proton_troubleshooting_logs` |
| `answer/` (8 files, 3,304 lines) **new** | What comes back: reading the status tags in the stream, rule checks on the finished reply, repair when an answer is cut and continued, the Show details record, the feedback log. | `bonsai_stream_tags`, `response_verify`, `soft_continue_repeat_trim`, `soft_continue_spoiler_join`, `transparency_service`, `feedback_service`, `destructive_advice_guard`, `terse_bare_menu` |
| `prompts/` (5 files, 1,689 lines) | The AI's instructions and reply shaping. | `ollama_prompts`, `ask_topic_instructions`, `reply_style_blocks`, `reply_language_service`, `reply_followup_blocks` |
| `commands/` (5 files, 428 lines) | Ask-box commands answered on the spot, and the input clean-up lane that decides whether a question is a command. | `ask_command_text`, `ask_local_commands`, `ask_local_command_handlers`, `shortcut_setup_commands`, `input_sanitizer_service` |
| `chats/` (11 files, 3,398 lines) | Saved chats: slots, chat memory, summaries, the sum-up job, the turn recorder. | `chat_slot_service`, `chat_slot_rpc`, `chat_memory_service`, `chat_memory_step`, `chat_turn_recorder`, `chat_own_game_title`, `chat_sum_up_job`, `chat_summary_plan`, `chat_summary_service`, `chat_summary_tidy`, `chat_summary_title` |
| `spoilers/` (5 files, 1,632 lines) | Spoiler policy: risk scoring, per-game profiles, empty-label marks, the strategy spoiler policy, which boss or enemy the player named. | `strategy_spoiler_policy`, `spoiler_risk_service`, `spoiler_title_profiles`, `spoiler_empty_label_marks`, `strategy_entity_extraction` |
| `strategy/` (4 files, 1,085 lines) | Strategy-guide replies: reading menus and checklists out of a reply, the checklist's saved session, the branch-menu example guard. | `strategy_guide_parse`, `strategy_checklist_session_service`, `strategy_checklist_rpc`, `branch_menu_example_guard` |
| `characters/` (2 files, 634 lines) | AI characters. | `ai_character_service`, `spy_confession_service` |
| `voice/` (9 files, 2,887 lines) | Speaking a question: capture, speech engine, model download, the listening loop. (Read aloud goes in step 3.) | `voice_transcription_service`, `voice_audio_capture_service`, `voice_engine_build_service`, `voice_level_gate`, `voice_model_download_service`, `voice_rpc`, `voice_transcript_decode_service`, `voice_whisper_daemon`, `voice_whisper_runtime` |
| `settings/` (2 files, 843 lines) | The settings file and the wipe of all plugin data. | `settings_service`, `plugin_data_reset` |
| `media/` (3 files, 1,377 lines) | Screenshots and the clipboard, plus the one grab-bag RPC file the screen's small buttons call. | `screenshot_media`, `clipboard_service`, `media_desktop_rpc` |
| `power/` (2 files, 272 lines) | Power (TDP) reading and reply parsing. | `tdp_intent` (from the root), `tdp_service` |
| `knowledge/` (name only) | The other reviewer's. **One of my files lands here:** `ollama_embed_service`. | (see "Hand-off" below) |
| `notes/` (name only) | The other reviewer's. None of my files lands here. | - |

Total: 14 packages of mine plus the two named ones. The largest is `ollama/` (25 files); that is one quarter of what
`services/` is today.

### Why I changed the proposed list

1. **`answer/` is new.** The proposed list had no back-end folder for the reply that comes back. The readers
   flagged it twice (`feedback_service`, `transparency_service`), and the code agrees: these eight files read the
   model's output (`bonsai_stream_tags` L1-993 hides half-written status tags; `response_verify` checks a finished
   reply; the two `soft_continue_*` files repair a reply that was cut and continued; `destructive_advice_guard` and
   `terse_bare_menu` shape the reply; `transparency_service` and `feedback_service` record what happened to it).
   None of them builds a question. `ask/` then holds only the "make a question and send it" half, 13 files.
2. **The seven loose root files all move.** The proposed list said they may stay. I move them because
   leaving them would give `backend/` a root with seven files of three different features beside 15 folders;
   none of them uses `__file__`, so no path depth changes (checked: only `clipboard_service.py:27`,
   `intent_pack_service.py:85` and `ollama_local_setup_rpc.py:151` use `__file__`, all three move to a folder of the
   same depth as today).
3. **Readers' picks I overrode (11 of the 97 service files; the other 86 are as the readers said), each with the
   reason.** The eight that went to `answer/` (`bonsai_stream_tags`, `response_verify`, both `soft_continue_*`,
   `destructive_advice_guard`, `terse_bare_menu`, `transparency_service`, `feedback_service`) are explained in point 1;
   the rest:
   - `reply_followup_blocks`: readers said `ask/`. It is prompt text for the refine chips (`sanitize_reply_followup`,
     `build_reply_followup_context_block`), imports nothing, and its only prompt-side importer is `ollama_prompts`.
     Put in `prompts/`.
   - `chat_own_game_title`: readers said `ask/`. It takes a chat and works out its game; its two users are the Ask
     flow and the Ask-box commands, and it imports only the knowledge helper. Put in `chats/`.
   - `input_sanitizer_service`: readers said `ask/`. Its docstring, tests (`topic: input sanitizer commands and lane
     decisions`) and importers (`ask_local_commands`, `ask_local_command_handlers`) are all Ask-box commands. Put in
     `commands/`; this also removes an `ask`/`commands` loop.
   - `response_verify`: readers said `spoilers/` (unsure). It holds three jobs, all checks on a finished reply, and
     its callers are `game_ai_request.py` and `ollama_ask_service.py` plus the two `soft_continue_*` files. Put in
     `answer/`.
   - `soft_continue_spoiler_join` (readers: `spoilers/`) and `soft_continue_repeat_trim` (readers: `ask/`): they
     import each other's helpers and their tests import each other (`tests/test_soft_continue_repeat_trim.py:24`).
     They belong together; both go to `answer/`.
   - `terse_bare_menu` and `destructive_advice_guard` (readers: `prompts/`): both read the reply, neither writes
     instructions. Put in `answer/`.
   - Settled, not overridden: `token_accounting_service` (readers: unsure between `ollama/` and `core/`): it learns how large the model's
     room is and imports only `ollama_reply_limits`. Put in `ollama/`.
   - `ollama_embed_service` (readers: `knowledge/`, likely): kept there. It is the meaning-search call and the
     knowledge-library tools import it (`scripts/build_rag_db.py:52`, `scripts/eval_kb_embed_models.py:101`). See
     the hand-off below.
4. **Not split: `ollama/` into `ollama/` and `models/`.** The models half and the connection half import each
   other (`local_ollama_setup_service` imports `ollama_routing` and `starter_set_extras`, while `ollama_pc_models`,
   `ollama_try_order_prune` and `ollama_local_setup_rpc` import `local_ollama_setup_service`). Splitting would add a
   new two-way pair for no gain.
5. **Kept on purpose:** `media_desktop_rpc.py` (276 lines) is a grab-bag RPC file (screenshots, clipboard,
   Desktop log files, feedback, language reads, details). Its own docstring at `main.py:32` names it that way. It
   stays whole in `media/`; splitting it is a change, not a move.
6. **The two clipboard shell scripts stay at `py_modules/backend/scripts/`.** `clipboard_service.py:27-29` finds them
   as `<its folder>/../scripts/`. After the move that is still `py_modules/backend/scripts/`, because `media/` sits
   at the same depth as `services/` did. Moving them into `media/` would force a code edit and risk the file
   permissions the zip keeps.

### What stays at `py_modules/backend/`

- `__init__.py`: the package marker; its docstring says "every service behind it, under services/" and needs one
  hand edit after the move (a comment change in its own commit; the mover does not move or edit `__init__.py`).
- `scripts/` with the two `.sh` files (above).
- Nothing else. `main.py` and `decky.pyi` stay at the repo root (Decky needs them there: `plugin.json:7`,
  `scripts/build.sh:179`, `scripts/build.ps1:86`).
- `py_modules/backend/services/__init__.py` is removed in the last commit of step 4 (the mover refuses to touch
  `__init__.py` files: `scripts/move_backend_file.py:214`), once the folder holds nothing else. Marked `-` in the map.

### Hand-off with the knowledge and notes reviewers

My files that import theirs (these stay valid whichever way they place them; the mover rewrites the import lines):

| My file | Imports (their file) |
|---|---|
| `game_ai_request.py` | `kb_attached_notes`, `kb_followup_memory`, `kb_notes_footers`, `knowledge_base_service`, `user_note_offer`, `user_notes_for_ask` |
| `ask_local_command_handlers.py` | `knowledge_base_game_match`, `user_note_commands`, `user_note_offer` |
| `ask_local_commands.py` | `user_note_commands` |
| `chat_memory_service.py`, `chat_summary_tidy.py` | `kb_other_game_named`, `knowledge_base_schema` |
| `chat_own_game_title.py` | `kb_other_game_named` |
| `chat_memory_step.py`, `chat_summary_service.py` | `knowledge_base_game_match` (inside a function) |
| `transparency_service.py` | `knowledge_base_cards` |
| `ollama_embed_service.py` | `knowledge_base_schema` (the constant `DEFAULT_EMBEDDING_MODEL`) |
| `media_desktop_rpc.py` | `desktop_note_service` |
| `plugin_data_reset.py` | `rag_corpus_download_service` (inside a function) |

Their files that import mine: `knowledge_base_service` imports `ollama_embed_service`, `ollama_keep_alive_rule`,
`ollama_prompts`; `rag_corpus_status` imports `constants` and `ollama_embed_service`; `rag_corpus_rpc` imports
`async_background_job` and `capabilities`; `rag_corpus_download_service` imports `tls_ca_fallback`. None of the notes
files imports a file of mine.

**Decide once:** `ollama_embed_service` goes to `knowledge/` in my map. If the knowledge reviewer puts it in
`ollama/`, change one line in each map. Also: the knowledge reviewer's map (`folder-map-knowledge-search-notes.tsv`) puts `intent_pack_rpc` and
`intent_pack_service` in a third folder, `backend/search/`, and `desktop_note_service` and `user_note_commands` in
`notes/`. My table above only names `knowledge/` and `notes/`; the hand-off lists are still right, and the import
check in "Import cycles" was run with intent packs counted as `notes/` (no effect: nothing of mine imports them,
and they import nothing of mine). `ollama_embed_service` is not in the knowledge reviewer's map.

### Order of the move commits

The tool takes whole batches, so any order works. Leaf-first is easiest to read in a review: `core`, `characters`,
`power`, `strategy`, `prompts`, `spoilers`, `answer`, `ollama`, `voice`, `media`, `settings`, `commands`, `chats`, `ask`;
the root files go with their package. Run `check_move_commit.py` after each. The two filters in "What a move must also
update" come first.

## Import cycles and import order

**Today:** `scripts/py_import_graph.py` reports no loops. I checked with my own read of every import line in
`py_modules/backend/**` (130 modules plus the two `__init__.py` files): no loop, counting the 16 imports that sit
inside a function as well as the ones at the top.

**After the split:** a move changes where a file sits, not what it imports, so the file-to-file graph is exactly the
same and still has no loop. A loop could only come from a package's `__init__.py`, and only if it imported its members:
`import backend.chats.chat_slot_service` first runs `backend/chats/__init__.py`, and if that imported `ask`, which
imports back into `chats`, a half-built module would be handed out. **Rule: every new `__init__.py` holds only its
headed explanation, no imports, no `__all__`.** That is what the move tool writes, so nothing needs adding but the
`Purpose` sentence (the tool's `--purpose` option). Suggested sentences are the "What it holds" column above, in plain
words, one sentence each.

**Folders that import each other** (not a loop, and harmless with empty `__init__.py`, but the honest picture; each
pair is one to four files, the number is how many import lines go each way):

| Pair | Cause |
|---|---|
| `ask` / `chats` (9 and 3) | A chat summary is a model call using the Ask pipeline's pieces; the Ask flow reads chat memory. Inherent. |
| `ask` / `ollama` (18 and 1) | `ollama_connection_test` calls `ollama_service` to send a tiny test question. |
| `ask` / `prompts` (4 and 1) | `reply_language_service` takes `steam_roots_for_home` from `proton_troubleshooting_logs` (a shared helper in the wrong file; see "written twice"). |
| `prompts` / `spoilers` (2 and 2) | `ollama_prompts` uses the spoiler policy wording; `spoiler_risk_service` uses prompt constants. |
| `settings` / `ollama` (3 and 1) | `settings_service` reads `model_policy` and, inside functions, `ollama_routing` and `ollama_catalog_service`; `ollama_keep_alive_rule` reads one setting. Step 6a (one list of settings) removes most of it. |
| `voice` / `ollama` (4 and 1) | Four voice files take a private helper `_env_for_host_system_tools` out of `local_ollama_setup_service` (`voice_audio_capture_service.py:38`, `voice_model_download_service.py:40`, `voice_transcription_service.py:117`, `voice_whisper_runtime.py:43`); `starter_speech_models` imports `voice_model_download_service`. |
| `knowledge` / `ollama` (5 and 1) | `ollama_embed_service` calls Ollama; `ollama_local_setup_rpc` imports `ollama_embed_service`. |
| `core` | None imports back. Nothing in `core` imports another back-end folder. |

Two cheap fixes would remove two of those pairs (`voice`/`ollama` and `ask`/`prompts`), both later changes, not part of
the move: lift the clean-environment helper (written four times, see below) into `core/`, and lift
`steam_roots_for_home` into `core/`.

## Python tests

**Recommendation: stay flat in `tests/`.** Reasons, each checked:

1. `scripts/run_python_tests.py:22` finds tests with `loader.discover(tests, pattern="test_*.py")`. unittest enters a
   subfolder only if it holds an `__init__.py`, and then names the modules `<folder>.test_x` with `tests/` as the
   import root. A folder called `settings`, `media`, `voice` or `ask` would then be a top-level import name inside the
   test process. Every test id would change too, and step 5's proof ("the list of test names before and after
   matches") would have to learn to ignore the folder.
2. **The move tool cannot move a test.** `scripts/move_backend_file.py:210-211` refuses any source that is not a
   `.py` file under `py_modules/backend/`. Moving tests would need a new tool or 159 hand moves.
3. **The test files borrow from each other and from eight helper modules by bare name** (below). Bare names work
   only because `tests/` is the import root; they keep working while the files stay together.
4. Step 5 merges these 159 into about 50 files by topic (section below). Folders add nothing then: ten
   `test_voice_*.py` files become three.

If folders are wanted after step 5, the same 50 files can go into `tests/<package>/` in one scripted pass; I would
not do it now.

### Test files that import other test files by bare name

Found with `git grep` for `from test_x import` and `import test_x as`. A move does nothing to them (tests stay).
What matters is step 5: the file a test borrows from must either end up in the same merged file (the import becomes
plain code) or be lifted into a helper first.

| Importer (line) | Borrows from | What it takes | Same merge group? |
|---|---|---|---|
| `test_chat_can_sum_up.py:13` | `test_chat_sum_up_job` | `ChatSlotJobTestCase`, `_seed_chat` | No: lift into a helper |
| `test_chat_summary_title.py:42` | `test_chat_sum_up_job` | same two | Yes |
| `test_ollama_keep_alive_rule.py:22` | `test_chat_sum_up_job` | same two | No: lift into the same helper |
| `test_chat_memory_borrowed_wording.py:16` | `test_game_ai_request` | `_FakePlugin` (it also installs the decky stand-in) | No: shared fake plugin helper |
| `test_chat_memory_running_game.py:15` | `test_chat_memory_borrowed_wording` | `_Log`, `_library_title` | Yes |
| `test_forget_game_ai_carried_context.py:37` | `test_strategy_checklist_store_lock` | `_checklist_payload` | No: lift |
| `test_game_ai_request_followup_finishes.py:28` | `test_game_ai_request_followup_memory` | fake plugin and helpers | Yes |
| `test_game_ai_request_strategy_followup_prompt.py:36` | `test_game_ai_request_followup_finishes` | fake plugin and helpers | Yes |
| `test_game_ai_request_story_game_button_followup.py:35` | `test_game_ai_request_story_game_named` | fake plugin and helpers | No: shared fake plugin helper |
| `test_ollama_ask_media_permission.py:16` | `test_ollama_ask_service` | `_FakePlugin` | Yes |
| `test_ollama_keep_alive_rule.py:21`, `:169` | `test_ollama_ask_service`; `test_destructive_advice_wiring` (inside a function) | `_FakePlugin`; `_FakePlugin as WiringPlugin` | First yes, second no |
| `test_soft_continue_repeat_trim.py:24` | `test_soft_continue_spoiler_join` | the whole module (`as hidden_block_join_tests`) | Yes |
| `test_tdp_suggestion_needs_power_talk.py:14` | `test_game_ai_request` | `_FakePlugin`, `_run` | No: shared helper |
| `test_voice_trailing_silence.py:35` | `test_voice_whole_recording` | recording stand-ins | Yes |
| `test_voice_whole_recording.py:45` | `test_voice_quiet_speaker` | `Recording as QuietRecording` | Yes |
| `test_voice_transcription_service.py:33` (inside a function) | `test_settings_contract` | `PLUGIN_SANITIZE_ARGS` | No: keep the file name `test_settings_contract.py`, the import stays valid |
| `test_kb_game_tip_meaning.py:42`, `test_kb_own_game_tip_label.py:32` | `test_knowledge_base_service` | whole module | The knowledge reviewer's files |
| `test_user_note_offer_on_reply.py:17` | `test_user_notes_in_ask` | `_FakePlugin` | The notes reviewer's files |
| `test_user_notes_rpc.py:20` | `test_plugin_data_reset` (mine) | `_Logger`, `_sanitize` | Keep the file name `test_plugin_data_reset.py` |

### The eight shared test helper modules

`tests/backend_module_stubs.py`, `plugin_settings_file_harness.py`, `user_notes_plugin_harness.py`,
`fake_ollama_stream.py`, `corpus_build_support.py`, `kb_keyword_corpus_support.py`, `rag_corpus_seed_fixtures.py`,
`build_rag_db_loader.py` sit in batch b91 (another reviewer); none of them moves, because tests stay flat. They are
imported by bare name by about 65 test files (`backend_module_stubs`) and 12 (`plugin_settings_file_harness`).

## What a move must also update

### Done by the move tool (`scripts/move_backend_file.py`), so not hand-edited

- Every import: 174 test files and 92 other files (`main.py`, `py_modules`, `scripts`) name `backend.services`; the tool reads them with the parser, so
  function-level imports (such as `main.py:453-454`, `:542`, `:568`, `:925`, `:2281`) and `from backend.services import
  x, y` lists are handled. No file in `py_modules/backend` uses a relative import (checked), so none is missed.
- Every `patch("backend.services.x...")` string: 258 lines in 40 test files, for example
  `tests/test_chat_slot_questions.py:21` (`"backend.services.game_ai_request._chat_own_game_title"`) and the 41
  patches of `backend.services.ollama_service.urllib` (`tests/test_ollama_service.py` and three others). `patch.object`
  on an imported module needs nothing (it follows the import). The three `patch.object(main, ...)` calls in tests
  (9 lines) patch names already imported into `main` and are unaffected.
- Full-path, short-path and dotted mentions in comments and documents: the nine `src/` files that name back-end files
  in comments (`src/data/bonsaiSettingsNormalizers.ts:222`, `characterCatalog.ts:7`, `deckEssentialsTags.ts:21`,
  `modelPolicy.ts:22`, `spoilerTitleProfiles.ts:28`, `src/utils/localOnlyAskCommands.ts:23`, `ollamaAddress.test.ts:19`,
  `ollamaAddress.ts:11,16`, `stripSoftContinueCue.ts:23,29`), `bin/README.md:12`, `docs/development.md`,
  `docs/code-clarity.md`, `docs/knowledge-base.md`, `docs/troubleshooting.md`, `scripts/stage_zip_extras.py:30`,
  `scripts/verify-decky-plugin-zip.sh:58-60` (the two `need_file` paths) and the scripts' imports:
  `scripts/build_rag_db.py:36,52,53`, `scripts/eval_kb_answers.py:90-92,1176,1623,1624,1659`,
  `scripts/eval_kb_embed_models.py:84,98,101,110`, `scripts/measure_kb_floor_holdout.py:35`,
  `scripts/measure_kb_thin_match.py:45`, `scripts/probe_deck_kb_retrieval.py:45,48,49`,
  `scripts/publish_corpus.py:51`. Of the six names plan 86 § 11 lists for the knowledge-library tools, mine are
  `ollama_embed_service` (`knowledge/`), `ollama_prompts` (`prompts/`), `ollama_service` (`ask/`),
  `transparency_service` (`answer/`) and `ai_character_service` (`characters/`); `knowledge_base_schema` is the
  other reviewer's. The tools also import `game_ai_request` (`ask/`, `eval_kb_answers.py:1623`),
  `ollama_connectivity` and `ollama_urls` (`ollama/`, `probe_deck_kb_retrieval.py:48-49`).
- Not touched on purpose: `CHANGELOG.md`, `docs/code-map.md`, `src/types/rpcMethods.ts`, the generated map files
  and the history folders (`docs/archive`, `docs/planning`, `docs/audit`, `docs/test-evidence`).

### Not done by the tool: by hand, in separate commits that are not move commits

1. **`scripts/verify-decky-plugin-zip.sh:65-68`** counts `py_modules/backend/services/*.py` and fails below 3. The
   first move that leaves `services/` with fewer than three files turns the zip check red, and
   `tests/test_verify_decky_plugin_zip.py:38-40` builds a stand-in zip with exactly three files in that folder
   (`__init__`, `ollama_service`, `settings_service`; the tool renames the last two). Change the glob to
   `py_modules/backend/*/*.py` and keep the stand-in at three files across folders, **before the first move commit**.
   The two `need_file` lines at `:58-59` the tool does rewrite.
2. **`packages/bonsai-mcp/scripts/generate-architecture.mjs:106`** builds the folder to size-rank from parts
   (`path.join(REPO_ROOT, "py_modules", "backend", "services")`); the tool only warns. After the move the list of
   biggest back-end files would be empty. Point it at `py_modules/backend`. Lines `:97-98` (two full-path keys) the
   tool rewrites. Also `:96` and `:108` name `refactor_helpers.py`, which does not exist (dead entries; the scripts
   reviewer's call).
3. **`packages/bonsai-mcp/knowledge/architecture/platform-contract.md:39`** (hand-written, tracked) names the folder
   as a whole.
4. **Sentences in documents that name the folder as a whole** (the tool cannot rewrite a folder to many): `AGENTS.md:69`
   (a table row) and `:81` (`from backend.services.X import ...`, the answer to "why do imports read like this";
   after the move it reads `from backend.<package>.X import ...`), `docs/development.md:25`, `:247`, `:378`,
   `py_modules/backend/__init__.py` docstring ("under services/"). Step 7, and AGENTS.md is the session's.
5. **Roadmap and testing documents the tool will edit** (`docs/roadmap-details.md:189,198,214`,
   `docs/roadmap-kb-details.md:35`, `docs/roadmap-kb.md:76`, `docs/testing.md`, `docs/testing-automated.md`): the
   helper rules (`docs/agents/clean-up-helpers.md` rule 9) say never edit those. The edits are paths only; the session
   decides whether the mover may make them or the bookkeeper applies them afterwards. Note the line anchors in
   `roadmap-details.md` (`#L967`, `#L908`, `#L1317`) are already out of date and stay so.
6. **Tests that name a source file by path** (moves of the screen files in step 4 will hit these, not mine):
   `tests/test_ask_hook_order.py:22-23` and `tests/contracts/ask-hook-order.json` (seven hook file paths),
   `test_accent_intensity_parity.py:16`, `test_character_catalog_parity.py:16`, `test_download_sites_match_backend.py:29`,
   `test_rag_update_deadline.py:26`, `test_starter_set_extras.py:49`, `test_starter_tag_parity.py:31,38,72`.
   Tests that load a script by path: `test_ollama_embed_service.py:95` (`scripts/eval_kb_embed_models.py`); that script
   moves in the knowledge-tool step.
7. Not affected, checked: `plugin.json:7` (`main.py` only), the release workflow (names no back-end path;
   `.github/workflows/build-plugin-zip.yml:97` is a comment), `scripts/build.sh:180,209` and `scripts/build.ps1:88`
   (copy all of `py_modules`), `scripts/check_headers.py`, `scripts/ratchet.py`, `scripts/growth_limit.py`,
   `scripts/code_map.py` (all walk `py_modules` by recursion), `scripts/stage_zip_extras.py` (data folder only),
   `tests/test_check_move_commit.py` and `tests/test_move_backend_file.py` (stand-in trees only; the second is already
   on the tool's skip list, `scripts/move_backend_file.py:83`).
8. **Feeding the map to the tool:** `parse_moves` refuses a `from<TAB>-` line and `resolve_moves` refuses any source
   that is not a `.py` under `py_modules/backend/` or whose target equals its source (`:210-228`). So the session gives
   the tool a filtered map: `awk -F'\t' '$1 ~ /^py_modules\/backend\/.*\.py$/ && $2 != "-" && $1 != $2' folder-map-back-end.tsv`
   (that is 93 service lines and the seven root lines, 100 moves, once step 3 has removed its four service files).
   Run it per package.

## Test files to merge, by topic

Step 5. Done by topic, not by size: each group has one subject and, where marked, already borrows from itself.
Before merging a group, read its module-level set-up (stubs, `patch` at the top) so two files with different
stand-ins are not forced into one. The 137 files outside the knowledge group (159, less the four that go with the removals and the
18 listed last) become about 50; the 18 are listed for completeness and the knowledge reviewer merges them.

| Merged file | From | Lines, tests |
|---|---|---|
| `test_background_answer_state.py` | `background_request_state`, `background_status_ask_mode`, `background_partial_state` | 1,054 / 62 |
| `test_background_stop_and_clear.py` | `background_abort_busy`, `background_forget_on_clear`, `forget_game_ai_carried_context`, `delete_chat_forgets_answer` | 726 / 23 |
| `test_chat_memory.py` | `chat_memory_service`, `chat_memory_borrowed_wording`, `chat_memory_running_game` | 661 / 44 |
| `test_chat_slot_store.py` | `chat_slot_service`, `chat_slot_limit`, `chat_slot_questions`, `chat_can_sum_up` | 1,127 / 71 |
| `test_chat_slot_turns.py` | `chat_slot_ownership`, `chat_for_request` | 546 / 19 |
| `test_chat_summaries.py` | `chat_sum_up_job`, `chat_summary_service`, `chat_summary_tidy`, `chat_summary_title` | 1,297 / 81 |
| `test_game_ai_request.py` | `game_ai_request`, `game_ai_request_chat_own_game`, `destructive_advice_wiring` | 1,039 / 50 |
| `test_game_ai_request_followup.py` | `..._followup_memory`, `..._followup_finishes`, `..._story_game_button_followup`, `..._strategy_followup_prompt` | 1,184 / 35 |
| `test_game_ai_request_spoilers.py` | `..._spoiler_cover`, `..._story_game_named`, `live_spoiler_cover_replay` | 847 / 23 |
| `test_ollama_ask_service.py` | `ollama_ask_service`, `ollama_ask_media_permission`, `ollama_keep_alive_rule` | 1,356 / 44 |
| `test_ollama_stop.py` | `ollama_abort_transport`, `ollama_stop_keeps_model_loaded`, `token_stream_request_id_wiring` | 448 / 29 |
| `test_token_and_prompt_budgets.py` | `token_accounting_service`, `prompt_budget_service`, `ollama_ask_budgets` | 672 / 50 |
| `test_ollama_prompts.py` | `ollama_prompts_branch_example`, `..._followup_subject`, `..._stream_instruction`, `strategy_deck_itself_carveout`, `power_question_instructions`, `spoiler_label_wording`, `reply_followup` | 637 / 35 |
| `test_terse_mode.py` | `terse_mode_prompt`, `terse_bare_menu` | 647 / 51 |
| `test_reply_language.py` | `reply_language_service`, `reply_language_snapshot_rpc` | 148 / 10 |
| `test_local_ollama_setup.py` | `local_ollama_setup_service`, `local_ollama_teardown`, `local_setup_progress_text`, `local_ollama_loopback`, `ollama_locate`, `ollama_update_restart` | 741 / 47 |
| `test_ollama_local_autostart.py` | `ollama_local_autostart_service`, `ollama_local_autostart_rpc` | 364 / 20 |
| `test_model_try_order.py` | `model_routing_order`, `merge_pulled_tags_rpc`, `pulled_model_joins_try_order`, `delete_model_cleans_routing_orders`, `deck_try_order_cleanup_keeps_pc_names`, `models_look_prunes_saved_try_orders` | 966 / 68 |
| `test_model_policy_and_selection.py` | `model_policy`, `model_selection`, `backend_helpers` | 373 / 48 |
| `test_model_catalog_and_pulls.py` | `ollama_catalog_service`, `fetch_ollama_catalog_metadata_local_sizes`, `ollama_pull_registry`, `ollama_pull_resume`, `pull_model_catalog_parity` | 618 / 30 |
| `test_ollama_connection.py` | `ollama_connection_test`, `ollama_health_probe`, `ollama_https_refused`, `ollama_mdns_discovery_service`, `ollama_reply_limits`, `tls_ca_fallback` | 1,139 / 92 |
| `test_ollama_preload.py` | `ollama_preload`, `preload_ask_model_boot` | 412 / 28 |
| `test_voice_listening.py` | `voice_quiet_speaker`, `voice_whole_recording`, `voice_trailing_silence` | 939 / 45 |
| `test_voice_rpc.py` | `voice_rpc_logs`, `voice_session_status`, `voice_start_refused_while_downloading`, `voice_capture_target_override` | 482 / 27 |
| `test_voice_engine.py` | `voice_transcription_service`, `voice_whisper_daemon`, `voice_model_download_pinned` | 633 / 47 |
| `test_settings_contract.py` | `settings_contract`, `settings_hostile_contract` | 125 / 5 |
| `test_settings_service.py` | `settings_service`, `settings_save_lock` | 896 / 43 |
| `test_plugin_data_reset.py` | `plugin_data_reset`, `clear_plugin_data_voice_reset` | 420 / 13 |
| `test_capabilities.py` | `capabilities`, `internet_downloads_permission` | 220 / 16 |
| `test_spoiler_profiles.py` | `spoiler_risk_service`, `spoiler_title_profiles`, `spoiler_title_profiles_contract` | 527 / 42 |
| `test_spoiler_policy.py` | `strategy_spoiler_policy`, `asked_entity_extraction`, `empty_label_spoiler_mark` | 764 / 86 |
| `test_soft_continue.py` | `soft_continue_repeat_trim`, `soft_continue_spoiler_join`, `stopped_answer_cut_in_hidden_block` | 602 / 50 |
| `test_reply_checks.py` | `response_verify`, `destructive_advice_guard` | 687 / 72 |
| `test_strategy_checklist.py` | `strategy_checklist_session_service`, `strategy_checklist_store_lock` | 148 / 5 |
| `test_strategy_guide_parse.py` | `strategy_guide_parse`, `strategy_guide_parse_drift` | 428 / 36 |
| `test_power.py` | `tdp_service`, `tdp_suggestion_needs_power_talk`, `pyro_asshole_safety` | 216 / 12 |
| `test_ai_characters.py` | `ai_character_service`, `spy_confession_service` | 444 / 38 |
| `test_commands.py` | `shortcut_setup_commands`, `shortcut_setup_developer_gate`, `input_sanitizer_service` | 137 / 12 |
| `test_ask_feedback.py` | `feedback_service`, `save_ask_feedback_rpc` | 127 / 7 |
| `test_screen_backend_parity.py` | `accent_intensity_parity`, `character_catalog_parity`, `download_sites_match_backend`, `starter_tag_parity`, `starter_set_extras` | 490 / 30 |
| (knowledge reviewer) | `game_ai_request_kb_attached_notes`, `kb_attach_log_line`, `kb_choice_log_line`, `kb_followup_memory`, `kb_game_tip_meaning`, `kb_no_close_match_lexical`, `kb_not_in_notes_notice`, `kb_not_in_notes_wiring`, `kb_notice`, `kb_other_game_named`, `kb_own_game_tip_label`, `kb_per_game_compat_pull`, `kb_ranking_starting_out_demotion`, `kb_starting_out_rescue`, `kb_typed_game_name_search`, `ollama_embed_service`, `embed_availability_after_pull`, `rag_update_deadline` | 4,208 / 251 |

**Stay as single files** (one subject, already one file; two are too big and should be split, not merged):
`test_append_app_log_rpc`, `test_ask_hook_order` (screen-side hook order, see below), `test_async_task_lifecycle`,
`test_bonsai_stream_tags` (718 lines), `test_clipboard_service`, `test_proton_troubleshooting_logs`,
`test_screenshot_media`, `test_transparency_service`. **`test_ollama_service.py` (2,624 lines, 109 tests)** and
`test_ollama_ask_service.py` are the two oversize files: split `test_ollama_service` by its own topics (streamed
chat; soft continue; thinking capture; prompt building per mode; room sizing) rather than merging anything into it.
`tests/test_pull_model_catalog_parity.py` keeps its name only for now: it checks model licence labels against
`model_policy` (imports `model_policy` only) and survives the weekly-refresh removal; the name then misleads.

**Go with the removals, not merged:** `test_steam_vac_service`, `test_voice_read_aloud_rpc`,
`test_voice_read_aloud_service`, `test_pull_model_catalog_merge`.

## Shared stand-ins for the back-end tests

The ratchet `duplicate_lines_be_tests` is at 1,801 copy-pasted lines against a target of 700 (`scripts/ratchet.json`
~L49); the items below are the biggest known sources. Every count is a `git grep` over `tests/`.

| Repeated set-up | Where it is written out | Shared helper that replaces it |
|---|---|---|
| **A stand-in `Plugin` for `run_game_ai_request`**: settings dict, `load_settings`, `_try_handle_sanitizer_keyword_command` returning nothing, `_persist_input_transparency`, a fake `ask_ollama` that records its arguments, `DEFAULT_REQUEST_TIMEOUT_SECONDS = 45` | 11 files define their own class: `test_destructive_advice_wiring.py:25`, `test_game_ai_request.py:87`, `test_game_ai_request_chat_own_game.py:87`, `..._followup_memory.py:40`, `..._kb_attached_notes.py:239`, `..._spoiler_cover.py:56`, `..._story_game_named.py:121`, `test_kb_choice_log_line.py:100`, `test_kb_not_in_notes_wiring.py:28`, `test_pyro_asshole_safety.py:13`, `test_user_notes_in_ask.py:218`; three more subclass one (`_BaseFakePlugin` in `..._followup_finishes.py:45`, `_CapturingPlugin` in `..._strategy_followup_prompt.py:49`, `_ChatPlugin` in `..._story_game_button_followup.py:71`); four others import another file's copy (see the import table) | `tests/game_ai_request_harness.py`: `FakeAskPlugin(settings, chat=None)` plus `base_ask_settings()` |
| **The `_run(plugin, question, ...)` wrapper** around `asyncio.run(run_game_ai_request(...))` | `test_destructive_advice_wiring.py:46`, `test_game_ai_request.py:123`, `..._chat_own_game.py:137`, `..._followup_memory.py:66`, `..._kb_attached_notes.py:290`, `..._spoiler_cover.py:88`, `test_kb_not_in_notes_wiring.py:49` | `run_request(plugin, question, **kw)` in the same helper |
| **The base ask-settings dict** (`"latency_timeouts_custom_enabled": False`, `"input_sanitizer_user_disabled": False`, `"capabilities": {}`) | 14 files | `base_ask_settings(**overrides)` in the same helper |
| **`patch("...game_ai_request.should_retrieve_knowledge")` and `retrieve_knowledge_context`** (patched once per class, then re-set per test) | 7 and 10 files; 64 and 30 patch lines | a mixin `KnowledgeSearchStubbed` in the same helper |
| **Stand-in `decky`, `fcntl` and `pwd` modules written inline** although `backend_module_stubs.py` exists | decky inline: `test_background_partial_state.py:19`, `test_chat_slot_ownership.py:18`, `test_clear_plugin_data_voice_reset.py:27`, `test_destructive_advice_wiring.py:11`, `test_forget_game_ai_carried_context.py:22`, `test_game_ai_request.py:18`, `test_ollama_ask_service.py:14`, `test_preload_ask_model_boot.py:26`, `test_token_stream_request_id_wiring.py:29` (and a bare fallback in `test_terse_bare_menu.py:19`, `test_terse_mode_prompt.py:21`); fcntl inline in five of the same; pwd inline in `test_chat_for_request.py:22`, `test_chat_slot_limit.py:20` | `backend_module_stubs.install_fcntl_and_decky_stubs(settings_dir=..., home=...)`: the file's own header says these differ on purpose (`HOME`, a different settings folder, no `DECKY_PLUGIN_SETTINGS_DIR`), so give the function those options instead of leaving the copies |
| **A `Plugin` on a throwaway settings folder** | the mixin exists (`plugin_settings_file_harness.py`, 12 users) but five still patch by hand: `test_append_app_log_rpc.py:33`, `test_preload_ask_model_boot.py:51`, `test_reply_language_snapshot_rpc.py:40`, `test_settings_save_lock.py:27` (and `test_session_rag_chip_candidates_rpc.py:30`, not mine); three more patch a different path getter in the same shape (`test_forget_game_ai_carried_context.py:44-62`, `test_strategy_checklist_store_lock.py:28-46`, `test_intent_pack_store_lock.py`); a third copy is `user_notes_plugin_harness.py` (2 users) | extend `PluginSettingsFileMixin` with an optional list of other path getters to patch; fold `PluginOnATempFolder` into it |
| **`ChatSlotJobTestCase` and `_seed_chat`** (a chat store on a temp folder with a seeded chat) | defined in `test_chat_sum_up_job.py`, imported by three files (`test_chat_can_sum_up.py:13`, `test_chat_summary_title.py:42`, `test_ollama_keep_alive_rule.py:22`) | `tests/chat_slot_harness.py` |
| **A fake logger** (`info`/`warning`/`error`/`exception` recording or ignoring) | `test_ollama_preload.py:22`, `test_plugin_data_reset.py:16`, `test_settings_service.py:15`, `test_chat_memory_borrowed_wording.py:46` (`_Log`), plus two in files not mine (`test_rag_corpus_remove_guard.py:27`, `test_rag_corpus_saves_before_done.py:23`) | one `FakeLogger` in `backend_module_stubs.py` |
| **A fake HTTP reply that works in a `with` block and has `read()`** | `test_ollama_abort_transport.py:32`, `test_ollama_embed_service.py:124,144,178`, `test_ollama_health_probe.py:24,29`, `test_ollama_preload.py:46`, `test_ollama_pull_registry.py:97`, `test_voice_model_download_pinned.py:131` (and `test_steam_vac_service.py:24`, removed in step 3) | `tests/fake_http.py` next to `fake_ollama_stream.py` (that file already has `ndjson_response`) |
| **Putting `REPO_ROOT` and `py_modules` on `sys.path` by hand** (the test runner already does) | `test_fetch_ollama_catalog_metadata_local_sizes.py:30`, `test_local_ollama_setup_service.py:17`, `test_models_look_prunes_saved_try_orders.py:25` | delete the three blocks, or one line in `backend_module_stubs.py` for a lone `python -m unittest` run |

None of these helpers exists yet; the first row is the largest single cut (about 11 copies of a 20-line class).

## Tests that check the code's text instead of what it does

Found by searching all 159 for `read_text`, `open(`, `inspect.getsource`, `ast.parse`, `__file__`; the readers
found the same eight (b-batch records) and nothing was missed. All but one compare a list or a constant between the
screen's TypeScript and the back end's Python, which cannot import each other.

| File:line | Reads | Verdict |
|---|---|---|
| `test_accent_intensity_parity.py:17-24` | `src/data/aiCharacterAccentIntensity.ts`; regex pulls `AI_CHARACTER_ACCENT_INTENSITY_IDS` | Cross-language list. Keep, or turn both sides into a shared JSON file under `tests/contracts/` the way `settings-defaults.json` already works |
| `test_character_catalog_parity.py:16-18` | `src/data/characterCatalog.ts`; regex for `{ id: "...", label:` rows | Same |
| `test_download_sites_match_backend.py:33` | `src/features/downloads/downloadSites.ts`; regex for `_SITE = "https://..."` | Same |
| `test_download_sites_match_backend.py:55-56` | the Python source of `local_ollama_setup_service` (`Path(setup.__file__).read_text`), asserts the text `base = "https://ollama.com/download"` | **The one real code-text test.** A behaviour version needs the base URL lifted to a module constant first (a small code change); the tool says so, not me |
| `test_starter_set_extras.py:49-51` | `src/data/deckEssentialsTags.ts`; two regexes (`STARTER_NOTE_SEARCH_TAG`, `STARTER_SPEECH_MODELS`) | Cross-language, keep |
| `test_starter_tag_parity.py:31-32,38-39,60-65` | `src/data/deckEssentialsTags.ts`, `src/utils/modelRoutingOrder.ts` (regexes for tags and the two seed lists) | Cross-language, keep |
| `test_starter_tag_parity.py:72-73` | `scripts/setup-ollama.sh`; regex for `MODELS=(...)`, and `assertNotIn("qwen2.5vl", script)` | Text of a shell script; keep until that script is the only place the starter tag lives |
| `test_ask_hook_order.py:30-34,56,65,99` | `src/hooks/useBonsaiAskOrchestration.ts` and seven sub-hook files, by a pattern that finds hook calls, compared with `tests/contracts/ask-hook-order.json` | Checks the order of calls written in a TypeScript file. It is a screen test living in the Python folder; it belongs to step 6c (the main screen hands down less) and the screen reviewer. Not mine to change |
| `test_rag_update_deadline.py:26-27` | `src/components/KnowledgeBaseSection.tsx`; regex for `RAG_UPDATE_RPC_TIMEOUT_MS` | Knowledge reviewer's; cross-language |
| `test_kb_notice.py:31` | `data/kb/NOTICE.md` (a licence document, not code) | Knowledge reviewer's |

Not text checks, but look at the shape of the code: `test_token_stream_request_id_wiring.py:24,42` (`inspect.signature`
of two functions) and `test_rag_update_deadline.py:34-36` (parameter names of `fetch_remote_manifest`). Calling the
function with the argument is the behaviour version. `test_ollama_embed_service.py:95` loads
`scripts/eval_kb_embed_models.py` by path and calls two of its functions: behaviour, but tied to that script's path.

## Unused and written twice

The readers wrote about 90 findings in my area. I checked 33 with `git grep`, a read of the import lines
(`ast`, every tracked `.py`), or by reading the lines. **Confirmed and worth acting on** (W) or **confirmed, leave** (L):

**Unused names**

| W/L | Finding | File:line |
|---|---|---|
| W | Eight names imported and never used: `base64`, `Tuple`, `normalize_ask_checklist_state` (the readers missed this one), `clamp_int`, `sanitize_ask_mode`, `sanitize_unified_input_persistence_mode`, `coerce_payload_bool`, `sanitize_attachments`. No test or script reads them off `main` (checked `main.<name>`). | `main.py:92, :98, :126, :152, :154, :156, :197, :199` |
| W | Imported and unused: `Optional`; `re`; `tag_in_names`; `voice_whisper_server_path` (none read off the file by anyone) | `async_background_job.py:23`; `settings_service.py:73`; `ollama_pc_models.py:43`; `voice_whisper_daemon.py:50` |
| W | `ollama_service.py` imports `re`, `shutil`, `urllib.error`, `urlparse`, `normalize_ollama_base` and eleven re-exports nobody reads off it (`MIN_VISIBLE_NUM_PREDICT`, `OLLAMA_CHAT_READ_CHUNK`, `REASONING_LIVE_CHARS`, `_is_thinking_unsupported_error`, `_installed_sizes`, `best_effort_abort_ollama_inference`, `try_ollama_cli_stop_model`, `try_sigterm_linux_ollama_runner_procs`, `_guess_ollama_cli_paths`, `_is_loopback_ollama_base`, `_ollama_http_base_from_pc_ip_field`). **Keep `time` and `urllib.request`: 41 `patch("...ollama_service.urllib...")` strings and five `ollama_service.time` patches use them.** | `ollama_service.py:101-143` |
| W | `voice_transcription_service.py` re-exports 29 names "so nothing else had to change"; 22 are read by nobody (full list in the b74 record); `asyncio` and `deque` are unused. `_link_versioned_sonames`, `_pcm_rms`, `_runtime_dir_usable`, `_parse_whisper_stdout` are read by `tests/test_voice_transcription_service.py`, `download_voice_model` and `new_voice_install_state` by `voice_rpc.py` and `main.py`, and `env_for_audio_capture` only by read aloud (it goes with it); those stay. | `voice_transcription_service.py:108-177` |
| W | `game_ai_request.py` re-imports three names from `kb_attached_notes` "so tests can reach them"; no test or script does | `game_ai_request.py:150-153` (`_KB_NOTE_HEADER_RE`, `_KB_NOTE_OMITTED_TAIL_RE`, `_kb_note_source_host`) |
| W | `tier1_foss_recommended_pull_tags` is defined twice and called nowhere | `local_ollama_setup_service.py:538`; `ollama_routing.py:227` (the note at `ollama_routing.py:41` says it is kept for an old caller that no longer exists) |
| W | After the ban-lookup removal the `capability_enabled` import has no use left | `ask_local_command_handlers.py:24` (only use `:90`) |
| L | `maybe_append_verifier_notice` (no caller), `run_verifier_second_pass` (one test, `tests/test_ollama_reply_limits.py:224`) | `response_verify.py:567`, `:111` |
| L | `smallest_known_window_tokens` (docstring says it is for a later step), `WINDOW_RELOAD_SECONDS_IDLE` (named in a docstring only) | `token_accounting_service.py:173,67` |
| L | `is_unloading` never called; `daemon_available` only tests call it | `ollama_pull_resume_service.py:41`; `voice_whisper_daemon.py:248` |
| L | `chat_turns_for_request` is a plain method (not an RPC) that only one test calls | `main.py:2266-2273`; `tests/test_chat_for_request.py:90` |
| L | `decky.pyi` declares 13 loader names that no file reads (`USER`, `DECKY_VERSION`, `migrate_*`, `emit`, ...). It is a stub of the loader's own module, so unused entries are expected |
| L | Parameters thrown away on purpose: `mode` in `_text_safe_chain` and `_vision_safe_chain` (`del mode`), `ask_mode` in `build_reply_verbosity_block` ("reserved for per-mode overrides later") | `ollama_routing.py:236-243`; `reply_style_blocks.py:164,179` |
| L | `build_roleplay_system_suffix`: no production caller, tests call it 21 times | `ai_character_service.py:553` |
| L | `select_ollama_models`, `BLOCKED_PULL_CATALOG_TAGS`, `TEXT_MODELS_BY_MODE`: tests only (the file's own header says "kept for tests") | `ollama_routing.py:255,178,247` |
| L | `fence_segment_is_closed`, `fence_opener_is_spoiler`: tests only | `strategy_spoiler_policy.py:525-543` |

**Written twice**

| W/L | Finding | Where |
|---|---|---|
| W | **The "environment without the loader's library overrides" is written four times**, one of them as a private function that voice reaches into: `_env_for_host_system_tools` (with `_LD_STRIP_KEYS`), `_LD_KEYS` plus `_host_env`, `clean_env` | `local_ollama_setup_service.py:114-131`; `ollama_server_restart.py:76-82` (its own comment says "the same rule"); `tdp_service.py:62-67` (used by `clipboard_service`, and `main.py:1054` wraps it); `voice_*` files import the first, see the cycles table |
| W | `_path_within_home` written three times; only one carries a comment saying so | `local_ollama_teardown_service.py:54`; `ollama_local_autostart_service.py:65` ("mirrors", kept on purpose); `plugin_data_reset.py:36` (no comment; and `:89-93` checks the same thing by text prefix) |
| W | Drop-the-suggested-title comprehension written twice | `chat_slot_service.py:761` and `:803` (**the readers' third copy "chat_summary_service.py:838" does not exist**; that file has 523 lines) |
| W | The model-folder removal body written twice in one file and once more in a removed file | `voice_model_download_service.py:204-208` and `:310-314`; the third (`voice_read_aloud_service.py:204-210`) goes with read aloud |
| W | The thinking-phase "publish" call with five identical arguments, three times | `ollama_ask_service.py:153-162`, `:355-363`, `:407-415` |
| L | `is_loopback_ollama_host` and `is_loopback_ollama_base` answer differently for `127.0.0.2` (not a copy); the wrappers around them are one-liners | `ollama_connectivity.py:33,45`; `local_ollama_setup_service.py:520`; `ollama_stop_service.py:46-55` |
| L | Starter tag `"gemma4:e2b-it-qat"` is written as text in the message, list entries and a constant | `ollama_routing.py:71,100,140,537` (also checked on the screen by `test_starter_tag_parity.py`) |
| L | Written in two languages on purpose, with "keep in sync" comments and a parity test: `sanitize_thinking_summary`, Steam language list, spoiler title lists, fence reader | `bonsai_stream_tags.py:152-163`, `reply_language_service.py:23-56`, `spoiler_title_profiles.py`, `response_verify.py:208-233` |

Not checked (readers' claims I did not verify): the near-copies inside `ollama_prompts.build_system_prompt` (L560-749),
the four-times answer dict in `ask_local_command_handlers`, and the repeated recovery fields in
`ollama_connection_test.py`. Those are code changes for later, not for this plan's moves.

## Open questions for the one running the session

1. **Tests flat or in folders.** I recommend flat (reasons above). Say if you want folders after step 5.
2. **`answer/` is a new folder** the proposed list did not have. Approve, or tell me which folder its eight files
   go to instead (the other fit is `ask/`, which then holds 21 files).
3. **`ollama_embed_service` goes to `knowledge/`** in my map; the knowledge reviewer must agree. Also the attribution
   helpers in `transparency_service.py` (`source_display_name`, `build_attribution_entries` at L410-510) are imported
   by `scripts/build_rag_db.py:53`; the library build tool then depends on the `answer/` folder. Moving those functions
   to `knowledge/` is a code change for the knowledge-tool step, not a move.
4. **Whole-file removal marks (`-`):** `pull_model_catalog_service.py` and `data/pull-model-catalog-overlay.json` are
   marked `-`. The overlay file is read only through the remote address in the service (`:41`); the screen entry
   point is the `fetch_pull_model_catalog` RPC (`main.py:1214-1216`, `ollama_local_setup_rpc.py:533-560` and its
   import at `:66-68`). The reader of `data/pull-model-catalog-overlay.json` left it as "unsure"; I treated it as part of
   the removal. The weekly-refresh reviewer should confirm that the "on-open catalog call" the plan keeps is
   `ollama_catalog_service.fetch_ollama_catalog_metadata`, not `fetch_pull_model_catalog`.
5. **The zip check glob** (`scripts/verify-decky-plugin-zip.sh:65-68`) must change before the first move commit; I list
   it with the other by-hand edits, but it has an order requirement the plan does not mention.
6. **Rule 9 versus the move tool**: the tool will edit roadmap and testing documents (paths only). Who applies those?
7. **Notes for the other reviewers:**
   - Read-aloud list: `env_for_audio_capture` (`voice_transcription_service.py:153`, defined in
     `voice_audio_capture_service.py`) has no other user once `voice_read_aloud_service.py` goes; the second class
     in `tests/test_voice_read_aloud_rpc.py` (L83-94) tests main's Clear and unload hooks; `main.py:30` docstring words.
   - Ban-lookup list: besides `main.py` (L236, L744-751, L823-824, L1266, L1299, L1464-1467, L1762-1780) there are
     leftovers in `tests/test_chat_slot_ownership.py:243-298`, `tests/test_background_request_state.py:205`,
     `tests/test_chat_summary_tidy.py:113`, `tests/test_user_note_command.py:56-57,163-164`,
     `tests/test_settings_service.py:67`, `tests/test_desktop_note_service.py:212-220`;
     `capabilities.py:76,122` (`steam_web_api`); `settings_service.py:512` (`steam_web_api_key`).
   - Settings places in my area: `settings_service.py` (`_SIMPLE_FIELDS` table around L494-512), `main.py:744`
     (the redact set), `capabilities.py:76`, `tests/contracts/settings-defaults.json:60`,
     `tests/contracts/settings-hostile-inputs.json:532-544`, `tests/test_settings_contract.py`,
     `tests/test_settings_hostile_contract.py`, `tests/test_settings_service.py`. `settings_service.py:494-496` holds
     the UI scale settings (`ui_scale_auto_enabled`, `ui_scale_manual_profile`) for the UI scale lane, and `:507`
     `voice_reply_mode` for read aloud.
   - Weekly refresh: `tests/test_internet_downloads_permission.py:31,100,132` use `pull_model_catalog_service` and
     the RPC; that file is mine in the merge map, so the lane edits it, not deletes it.
8. **Hand-down count** for the main screen reviewer: the back end side is `main.py`'s 55 one-line hand-offs
   (`main.py:973-2319`, b63 record), not checked by me.

## Records found wrong

Checked about 50 of the 273 records against the code in content (38 code files, among them every file that carries a
finding I list above, the removal lines of `main.py` L236 to L2319, and a dozen test files), and every record by
script: the "checks code text" field of all 159 test records against a search of the files, and 409 `file:line`
citations for existence (29 of them also for the cited name). Seven wrong or incomplete:

| Batch | File | Field | Said | True |
|---|---|---|---|---|
| b66 | `chat_slot_service.py` and `chat_summary_service.py` | unused or twice | the drop-the-title-offer comprehension is also at `chat_summary_service.py:838` | that file has 523 lines; the comprehension exists twice, `chat_slot_service.py:761` and `:803` |
| b72 | `strategy_checklist_session_service.py` | users | cites `py_modules/backend/main.py:123` | `main.py` is at the repo root; the import is `main.py:123-126` |
| b63 | `main.py` | unused or twice | seven unused imports (L92, 98, 152, 154, 156, 197, 199) | eight: `normalize_ask_checklist_state` (L126) is also unused |
| b63 | `main.py` | unused or twice | `chat_turns_for_request` called from `tests/test_chat_for_request.py:85` and `:90` | `:85` is the test's name; the call is `:90` |
| b63 | `data/pull-model-catalog-overlay.json` | removal | `none. Unsure` | belongs with the weekly refresh removal (marked `-` here; see open question 4) |
| b64, b71, b69, b74 | `async_background_job.py`, `settings_service.py`, `ollama_pc_models.py`, `voice_whisper_daemon.py` | unused or twice | `none` or not listed | each has one unused import: `Optional` (L23), `re` (L73), `tag_in_names` (L43), `voice_whisper_server_path` (L50) |
| b67 | `local_ollama_setup_service.py` | unused or twice | `tier1_foss_recommended_pull_tags` is unused, "the only other copy is ollama_routing.py:227" | that copy is unused too (both go) |

The packages the readers chose were right for 86 of the 97 service files; the 11 I changed are listed under "Why I
changed the proposed list" (`bonsai_stream_tags`, `chat_own_game_title`, `destructive_advice_guard`,
`feedback_service`, `input_sanitizer_service`, `reply_followup_blocks`, `response_verify`, both `soft_continue_*`,
`terse_bare_menu`, `transparency_service`).
