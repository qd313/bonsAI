# Folder map: the knowledge library, the Search tab and the notes

Written 2026-10-16 by the plan 86 step 2 knowledge-library, Search tab and notes reviewer (Sonnet 5.5 high), from the
records of batches b49 to b62 (189 files), on `experimental` at `b5ce2768`. The line-by-line map is
`folder-map-knowledge-search-notes.tsv` (one `from<TAB>to` line per file). The glossary move has its own file,
`glossary-move.md`.

## In plain words

Nothing a player sees changes in this part of the plan. The map says where 189 files go when step 4 gives every
feature its own folder: the knowledge library's screen and back-end code, the Search tab, the player's notes and
desktop notes, the intent packs, the scripts that build and check the library, and their tests.

What the maintainer is approving:

- **103 files stay where they are** (the Search tab and notes folders already exist; most Python tests stay flat,
  see section 2).
- **81 files move**: back-end code to `backend/knowledge/` (18 files), `backend/notes/` (6) and a new small
  `backend/search/` (2); the library's screen files to `src/features/knowledge-library/` (29); the glossary's screen
  files to a new `src/features/glossary/` (8); the library scripts to `scripts/kb/` (8); a few strays to
  `src/features/user-notes/` (3), `src/features/search-tab/` (3), `src/features/developer/` (2) and
  `src/shared/focus/` (2).
- **5 files go**: the glossary's built-in word list and its Python test (the glossary move), a superseded test data
  file, and two finished measurement scripts that go to the workshop repo.
- **Two scripts' fates are real calls**, not just moves: two one-off measuring scripts to the workshop, and the
  library test data file nobody reads. Section 3 gives a verdict for every library script.
- **Two things the plan did not know about the Python tests**: the test runner silently skips any test folder
  without an `__init__.py`, and some tests import each other by bare file name, which stops working from a
  folder. Moving Python tests into folders is riskier than moving the screen's tests. So the map keeps the
  Python tests flat and lists the folders they would take if the maintainer wants them moved (section 2).

## 1. The folder map, by area

Every file is in the `.tsv`. New folders this map asks for that the kit's list lacked: `backend/search/` (the
intent packs behind the Search tab's settings search), `src/features/glossary/` (the chip and its helpers).

### 1.1 Back end (`py_modules/backend/services/` to packages)

| To | Files |
|---|---|
| `backend/knowledge/` | `compat_topic_router.py`, `kb_attached_notes.py`, `kb_followup_memory.py`, `kb_not_in_notes_notice.py`, `kb_notes_footers.py`, `kb_other_game_named.py`, `knowledge_base_cards.py`, `knowledge_base_chips.py`, `knowledge_base_game_match.py`, `knowledge_base_game_tip.py`, `knowledge_base_notes_search.py`, `knowledge_base_schema.py`, `knowledge_base_search.py`, `knowledge_base_service.py`, `rag_corpus_download_service.py`, `rag_corpus_local_install.py`, `rag_corpus_rpc.py`, `rag_corpus_status.py` (18). The new `knowledge_base_glossary.py` joins them |
| `backend/notes/` | `desktop_note_service.py`, `user_note_commands.py`, `user_note_offer.py`, `user_notes_for_ask.py`, `user_notes_rpc.py`, `user_notes_service.py` (6) |
| `backend/search/` (new) | `intent_pack_rpc.py`, `intent_pack_service.py` (2) |

Reasoning where a record's pick was unsure:

- `user_note_commands.py` goes with the notes, not `backend/commands/` (the record's pick): it only spots the
  word "remember" in the Ask box and hands the words to the notes code. Its screen twin
  (`src/utils/localOnlyAskCommands.ts` L66, `isNoteCommand`) is a deliberate copy so an empty AI address does
  not block the line (the file's header says so). Kept on purpose.
- `desktop_note_service.py` is the odd one: one file writes the saved desktop note (a notes thing), the daily
  chat log and the app log and Ask trace (a Developer thing). Splitting it is a change, not a move, so it goes
  whole to `backend/notes/`. Its first user is still `media_desktop_rpc.py`.
- `kb_other_game_named.py` is used by the chat code (`chat_memory_service.py`, `chat_own_game_title.py`,
  `chat_summary_tidy.py`) and the library's game choice. It goes to `backend/knowledge/`; the chat package imports
  it from there. Unsure (the record was too).
- `intent_pack_*`: the packs only widen the Search tab's settings search (`src/utils/intentPackSearch.ts`), and the
  plugin-wide kit lists no home for them. `backend/search/` is my split; `backend/settings/` (the record's pick) is
  the other fit. Only two lines of the map change if the answer differs.
- File names inside the packages stay as they are (`knowledge_base_service.py` in `backend/knowledge/` stutters, but
  tests patch these modules by dotted name in hundreds of places; a rename would be another change).

### 1.2 Scripts (`scripts/`)

| To | Files |
|---|---|
| `scripts/kb/` | `build_rag_db.py`, `publish_corpus.py`, `eval_kb_answers.py`, `eval_kb_embed_models.py`, `extract_wiki_notes.py`, `fetch_wiki_dump_pages.py`, `fetch_wiki_live_pages.py`, `probe_deck_kb_retrieval.py` |
| stays in `scripts/` | `plugin_zip_corpus_guard.py` (a release gate: `stage_zip_extras.py` L44-45 loads it, `verify-decky-plugin-zip.sh` L91 runs it) |
| workshop (`-`) | `measure_kb_floor_holdout.py`, `measure_kb_thin_match.py` |

Verdict for each script and who runs it today: section 3.

### 1.3 Screen (`src/`)

| To | Files |
|---|---|
| `src/features/knowledge-library/` | `KnowledgeBaseSection.tsx` and its 17 test files, `KnowledgeBaseButtonLabel.tsx`, `RagCorpusStoragePickerModal.tsx`, `useKbNotesFold.ts`, `buildKbNotesBlockElement.tsx`, `kbCloseMatchLineAgrees.ts` and test, `kbDownloadMarker.ts`, `kbLibrarySignal.ts`, `kbNoteUsedByAnswer.ts`, its test and its `.fixtures.json` (29 files) |
| `src/features/glossary/` (new) | `GlossaryTermChip.tsx` (from `components/DrgGlossaryTermChip.tsx`) with two tests, `glossaryTermMatch.ts` and test, `glossaryAsk.ts` and test, `glossaryTooltipPlacement.ts` (from the `drg...` names; renames ride along because the move tool can rename a file) |
| `src/shared/focus/` | `glossaryTermRegistry.ts` (the chip stop list; becomes part of the one shared D-pad helper in step 6b), `settleRing.ts` (a ring-landing helper that the chat's "earlier turns" pill also uses) |
| `src/features/user-notes/` | `DesktopNoteSaveModal.tsx`, `useDesktopNoteSaveModal.tsx` and its test (from `components/` and `plugin-shell/`), plus the 14 files already there |
| `src/features/search-tab/` | the 31 files already there, plus `useIntentPacks.ts` (from `hooks/`), `intentPackSearch.ts` and test (from `utils/`) |
| `src/features/developer/` | `knowledgeBaseDev.ts` (the seed-library folder, read only by the Developer tab's actions), `saveReplyToDesktopNote.ts` (a debug autosave; the record's other fit was chats) |
| stays | `src/features/downloads/*` (3 files, shared by four features and already in its own folder), `src/test-harness/kbSwitchWorld.tsx` (test stand-in, only used by two library tests) |
| goes (`-`) | `src/data/drgGlossaryTerms.ts` (glossary move) |

### 1.4 Tests and data

| To | Files |
|---|---|
| stay flat in `tests/` | all 46 Python test and helper files in the list (section 2 says why, and what folders they would take) |
| `-` (goes) | `tests/test_ollama_prompts_drg_glossary.py` (replaced by `tests/test_ollama_prompts_glossary.py`, see the glossary file) |
| `tests/fixtures/` stays | `kb_answer_eval.json`, `kb_eval_v0.json`, `kb_eval_v2.json` (read by the eval scripts and four tests), `kb_eval_es_probe_v0.json` (read by `eval_kb_embed_models.py` L1712) |
| `-` (retire to the workshop) | `tests/fixtures/kb_eval_paraphrase_v0.json`: no code reads it (checked: `git grep` finds only provenance notes inside `kb_eval_v2.json`, L3209 on); its own description says it is superseded and its 15 rows are already in `kb_eval_v2.json` as the `V2-PARA-*` rows. Copy to `../bonsAI-workshop/data/` first |
| stay in `data/` | `data/kb/strategy_seed.json`, `data/kb/compat_patterns.json` (the library's source; never staged into the plugin zip), `data/intent-packs/deck-basics.json` (staged; loaded by `intent_pack_service.py` L228 from the pack id) |

## 2. Python tests: flat, and why

The brief and the kit suggest `tests/<package>/` for Python tests. I checked how the tests run and I recommend
against it unless the maintainer wants it:

- **Discovery skips folders without `__init__.py`.** `scripts/run_python_tests.py` (L22) runs `unittest`
  discovery on `tests/` with pattern `test_*.py`. Since Python 3.11 discovery enters a sub-folder only when it
  holds an `__init__.py`. A moved test with no `__init__.py` beside it simply stops running, and nothing
  fails. (Step 5's comparison of test names would catch it, but late.) The move tools create `__init__.py` for
  back-end packages; I did not find that they do it for test folders.
- **Tests import each other by bare file name.** `tests/test_kb_own_game_tip_label.py` L32 and
  `tests/test_kb_game_tip_meaning.py` L42 do `import test_knowledge_base_service as kb_service_tests`;
  `tests/test_user_note_offer_on_reply.py` L17 does `from test_user_notes_in_ask import _FakePlugin`;
  `tests/test_user_notes_rpc.py` L20 does `from test_plugin_data_reset import _Logger, _sanitize`. A bare name
  resolves only for files at the top of `tests/`. The shared helper modules (`backend_module_stubs`,
  `corpus_build_support`, `user_notes_plugin_harness`, ...) stay at the top, so importing them from a folder is
  fine.
- **Three of the tests that would move count folders up from `__file__`** (`parents[1]`): `test_compat_topic_router`,
  `test_knowledge_base_service`, `test_rag_corpus_download`. The move tools rewrite written paths, not a count.
  (Fifteen more files do the same, but they test scripts and stay at the top in any case:
  `build_rag_db_loader`, `kb_keyword_corpus_support`, `test_build_rag_reproducible`, `test_build_rag_embedding_guarantee`,
  `test_source_attribution`, `test_publish_corpus_*` (two), `test_probe_deck_kb_retrieval`,
  `test_plugin_zip_corpus_guard`, `test_eval_kb_*` (three), `test_extract_wiki_notes`, `test_fetch_wiki_*` (two).)

If the maintainer wants folders anyway, the choice per file is below. The preparation is one commit of changes (not
moves) before the move: add `__init__.py` to each new test folder, turn the bare-name imports above into package
imports, and replace the three folder counts with a search for the folder that holds `main.py`.

| Folder | Files |
|---|---|
| `tests/knowledge/` | `test_compat_topic_router`, `test_knowledge_base_chip_pool_size`, `test_knowledge_base_notes_search`, `test_knowledge_base_schema`, `test_knowledge_base_schema_compat_app_id`, `test_knowledge_base_service`, `test_rag_corpus_cancel_state`, `test_rag_corpus_download`, `test_rag_corpus_local_install`, `test_rag_corpus_remove_guard`, `test_rag_corpus_saves_before_done`, `test_rag_corpus_status`, `test_remove_rag_corpus_settings`, `test_update_rag_corpus_reports` |
| `tests/notes/` | `test_desktop_note_service`, `test_user_note_command`, `test_user_note_offer`, `test_user_notes_in_ask`, `test_user_notes_rpc`, `test_user_notes_service`, `test_user_note_offer_on_reply`; `user_notes_plugin_harness.py` stays at the top |
| `tests/search/` | `test_intent_pack_service`, `test_intent_pack_store_lock` |
| stay at the top | the script tests (`test_build_rag_*`, `test_eval_kb_*`, `test_extract_wiki_notes`, `test_fetch_wiki_*`, `test_publish_corpus_*`, `test_probe_deck_kb_retrieval`, `test_plugin_zip_corpus_guard`, `test_source_attribution`) and the shared helpers |
| the odd two | `test_session_rag_chip_candidates_rpc` (tests `main.py`'s `Plugin`) and `test_transparency_kb_retrieval` (`transparency_service`, no package) stay at the top |

## 3. A verdict for each knowledge-library script

Counts: who runs it today is from `git grep` outside `docs/`.

| Script | Verdict | Who runs it today |
|---|---|---|
| `build_rag_db.py` | **stays, moves to `scripts/kb/`** | The maintainer, by hand, to make the library for release; `scripts/build.ps1` L75 runs it on every Deck deploy (`--seed`); the library helper's brief (`.claude/agents/kb-lane.md` L36); about 12 tests load it by path |
| `publish_corpus.py` | **stays, `scripts/kb/`** | The maintainer, by hand, to check and publish a library (nothing leaves the machine without the flag). Loaded by path by `extract_wiki_notes.py` L152 (its licence list). Two tests |
| `eval_kb_answers.py` | **stays, `scripts/kb/`** | The maintainer and library helpers, by hand, to score real answers against a built library. It imports the plugin's own prompt code, which is why it belongs in this repo. Two tests load it. It writes its JSON into the repo's `build/kb-answer-eval` (L103, L1836) while its report goes to the workshop: change in a later clean-up, not a move |
| `eval_kb_embed_models.py` | **stays, `scripts/kb/`** | The maintainer, by hand, for search measurements; four tests load it. Imports the plugin's search and embedding code and sets `RRF_W_FTS` and `RRF_W_VEC` on the service module while it runs. Its reports go to the workshop |
| `extract_wiki_notes.py` | **stays, `scripts/kb/`** | The maintainer and note-writing helpers, by hand, when a game's notes are added; one test loads it. Last changed the day of the freeze (`8ecea453`) |
| `fetch_wiki_dump_pages.py`, `fetch_wiki_live_pages.py` | **stay, `scripts/kb/`** | The same people, by hand, the step before `extract_wiki_notes.py`; one test each. `extract_wiki_notes.py` reads the manifest files they write |
| `probe_deck_kb_retrieval.py` | **stays, `scripts/kb/`** (not `scripts/deck/`) | The maintainer, by hand: `ssh deck@... 'python3 -' < scripts/probe_deck_kb_retrieval.py`. It runs *on* the Deck and imports the plugin's library code from there; the Deck-tools folder is for tools that drive the Deck from the PC. One test. Its documented command line changes by one folder |
| `measure_kb_floor_holdout.py`, `measure_kb_thin_match.py` | **move to the workshop** (`../bonsAI-workshop/scripts/`) | Nobody. No script, test or document runs them; the header of each says "the maintainer runs it by hand" for a decision that is finished (plan 48's floor and the thin-match warning, 2026-09-07). Both still work (the fields they read exist, `knowledge_base_service.py` L450-460). They duplicate each other (the four device questions, the fixture path, the card-header pattern). Two code comments cite them as evidence (`knowledge_base_service.py` L389, `kb_not_in_notes_notice.py` L158): write those as `workshop:scripts/...` when the files go |
| `plugin_zip_corpus_guard.py` | **stays in `scripts/`** | The release build: `stage_zip_extras.py` L44-45, `verify-decky-plugin-zip.sh` L91, `build.sh` L235/L245. One test |

Not retired: nothing in this list is only for a removed feature or a past clean-up. The two measuring scripts are
history, not retired work.

## 4. What a move must also update (found by `git grep`, outside the import graph)

The move tools rewrite imports, dotted names in `patch(...)` strings, and a repo path written whole in comments,
documents, Python tests, scripts and JSON. They do **not** follow a path built from pieces, a count of folders up
from `__file__`, or a name looked up at run time. These need a change commit before the move (so the move
commit is only a move), written as one whole path string where possible:

**Moving the scripts to `scripts/kb/`** (8 scripts):

- Each script finds the repo by counting folders: `build_rag_db.py` L30, `eval_kb_answers.py` L80,
  `eval_kb_embed_models.py` L45, `publish_corpus.py` L46, `extract_wiki_notes.py` L46, and the ones that
  build `ROOT` the same way (`measure_*` go away). One level deeper breaks each. Fix first: search upward for the
  folder holding `main.py`.
- Scripts that name each other in pieces: `publish_corpus.py` L75 (`REPO_ROOT / "scripts" / "build_rag_db.py"`),
  `eval_kb_embed_models.py` L79 (`scripts/lib`, the workshop helper), L272 (a list of files a saved library copy
  depends on; a wrong path there is a silent "stale"), L350 (runs `build_rag_db.py`);
  `eval_kb_answers.py` L95 (`scripts/lib`); `extract_wiki_notes.py` L152 (`scripts/publish_corpus.py`).
- Tests that load a script by path: `tests/build_rag_db_loader.py` L22, `corpus_build_support.py` L69,
  `test_build_rag_embedding_guarantee.py` L30, `test_build_rag_reproducible.py` L25, `test_rag_corpus_download.py`
  L37, `test_source_attribution.py` L102, `test_publish_corpus_embedding_guarantee.py` L29 (`_load_module`),
  `test_publish_corpus_release_latest.py` L24-26 (puts `scripts/` on the path and imports by name; this one breaks
  loudly), `test_eval_kb_arms.py` L31, `test_eval_kb_tie_break.py` L33, `test_extract_wiki_notes.py` L31-32,
  `test_fetch_wiki_dump_pages.py` L27-28, `test_fetch_wiki_live_pages.py` L26-27,
  `test_probe_deck_kb_retrieval.py` L24-35; outside this area, `test_ollama_embed_service.py` L95 and
  `test_workshop_setting.py` L113 (`_load_script`, used for the two eval scripts at L135, L145, L154).
- Files that name a script in a command: `scripts/build.ps1` L75 (runs `build_rag_db.py`),
  `.claude/agents/kb-lane.md` L36, `docs/knowledge-base.md`, `docs/testing.md`, `docs/troubleshooting.md`
  (documents; the tool fixes written paths in documents). `CHANGELOG.md` names the scripts too; the tool is
  told to leave it (`--leave CHANGELOG.md`).
- `scripts/plugin_zip_corpus_guard.py` does not move. `scripts/move_tools_config.json` needs **no** change (its
  generated and history lists do not name any of these files). `tests/contracts/*.json` name only the library
  *settings* (`rag_corpus_path`, `rag_corpus_version`, `use_local_knowledge_base`), not paths. No workflow in
  `.github/` names any of these scripts.

**Moving the back-end files to packages:**

- Imports and `patch("backend.services.knowledge_base_service....")` strings are rewritten by
  `move_backend_file.py`. Check by hand what it lists as "check by hand": tests that reach a moved name by
  `patch.object(module, ...)` or by a plain assignment (`eval_kb_embed_models.py` L971-999, L1161-1186 sets
  `RRF_W_FTS` and `RRF_W_VEC` on `knowledge_base_service`; `knowledge_base_search.py` L25 and
  `knowledge_base_service.py` L673 explain it). docs/lessons-learned.md, section 2: search for all three forms.
- `tests/test_seam_contracts.py` L28-57 (a frozen list of 22 names read from `knowledge_base_service`) must keep
  importing them from the new place.
- `intent_pack_service.py` L85 finds the plugin root with `parents[3]`; `backend/search/` is the same depth as
  `backend/services/`, so nothing changes.
- `tests/test_chat_summary_service.py` L80 imports `normalize_alias` from `kb_other_game_named.py`, which only
  re-uses it from `knowledge_base_schema.py`; after the move the same import works, but the line is the one to
  look at if anything about the helper moves.
- `scripts/stage_zip_extras.py` L30 and `intent_pack_service.py` name the intent-pack data file; both paths stay.

**Moving the screen files:**

- `tests/test_rag_update_deadline.py` L26 reads `src/components/KnowledgeBaseSection.tsx` as text, built from pieces
  (`ROOT / "src" / "components" / ...`): it must be edited by hand when the section moves. This is the one
  tool-invisible path in this area.
- `tests/test_kb_notice.py` L57 asserts that `data/kb/NOTICE.md` names `src/utils/kbNoteUsedByAnswer.fixtures.json`;
  the written path in both files is rewritten together by the tool. Check after.
- Four library tests mock the download notice by its path string
  (`KnowledgeBaseSection.downloadNotice.test.tsx` L14, `downloadSwitch` L22, `noticeReturnFocus` L20,
  `remountDownload` L24) and six more outside this area do too (`setupAndPullBoxWording`, `usePullModelDownloadNotice`,
  `usePullModelTier2Wording`, `usePullModelSubmitSelected.tier2Box`, `useLocalOllamaSetupFlow.inPlace`,
  `OllamaWhereAiRunsSection.noBoxNoteReturn`); `downloads/` does not move, so these are unaffected.
- `kbNoteUsedByAnswer.test.ts` and `kbCloseMatchLineAgrees.test.ts` read their fixture with
  `resolve(__dirname, "kbNoteUsedByAnswer.fixtures.json")`; the fixture moves with them, so this holds.
  `MainTabChatTranscript.closeMatchLine.test.tsx` L30 also reads that fixture by import path (the tool rewrites it).
- `scripts/focus-baseline.json` L66 is keyed by `src/utils/drgGlossaryTermRegistry.ts`: the key must follow the
  file (and every other moved key in that file from other areas).
- The generated files (`packages/bonsai-mcp/knowledge/architecture/*.json`, `docs/code-map.md`,
  `src/types/rpcMethods.ts`) are rebuilt, not edited. Several records said a move must edit
  `test-inventory.json`: it must not (kit note).

## 5. Test files to merge, by topic (step 5)

Proposals only; each keeps every test name (step 5 compares names).

**Library section, screen (17 files, one component, about 4,000 lines in all, to about 5 files):**

| Merged file | From |
|---|---|
| `KnowledgeBaseSection.download.test.tsx` | `downloadNotice`, `downloadSwitch`, `remountDownload`, `test` (cancel), `update` |
| `KnowledgeBaseSection.remove.test.tsx` | `removeBox`, `removeSwitch`, `removeSwitchHook` |
| `KnowledgeBaseSection.modelHint.test.tsx` | `httpsHost`, `installNomicOffer`, `nomicPull`, `pullHint` (the meaning-search model's pull; the models reviewer may want these next to the models box tests) |
| `KnowledgeBaseSection.focus.test.tsx` | `noticeReturnFocus`, `returnFocus`, `storagePicker` |
| `KnowledgeBaseSection.look.test.tsx` | `icons`, `largeText` |

Careful: `vi.mock` is hoisted per file, so merged files must agree on one mock of the download notice and of the
back end (four of the five source files mock it today in slightly different ways). `kbSwitchWorld.tsx` serves two
of them (`downloadSwitch`, `removeSwitchHook`); keep it a shared stand-in.

**Search tab (6 files, to 3):** `SearchTab.back` + `SearchTab.jump` + `SearchTab.ringReturn` + `SearchTab.unmount`
(all about leaving and coming back) into one; `SearchTab.test` and `SearchTab.walk` stay. All six repeat the same
back-end stand-in block (`listChatSlotQuestions`, `listUserNotes`, `saveUserNote`, `searchRagCorpusNotes`: back L15-18,
jump L16-19, ringReturn L16-19, test L20-23, unmount L14-17, walk L19-22). A shared stand-in is not a plain
imported constant, because `vi.mock` is hoisted; use a factory that imports one module (the way the files already
write `vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"))`). `searchTabTestKit.tsx` is where it
goes. Two copies of `pressA` (`SearchTab.test` L39-44, `jump` L35-40, `ringReturn` L85-90) go there too.

**Notes (screen):** `UserNotes.transcript.test.tsx` + `UserNotes.walk.test.tsx` into one; the other four stay.

**Python, library and notes:**

| Merged file | From |
|---|---|
| `test_build_rag_seed_rules.py` | `test_build_rag_compat_app_id`, `test_build_rag_starting_out_validator`, `test_build_rag_reproducible`, and the new `test_build_rag_glossary` |
| `test_publish_corpus.py` | `test_publish_corpus_embedding_guarantee`, `test_publish_corpus_release_latest` |
| `test_eval_kb_search.py` | `test_eval_kb_arms`, `test_eval_kb_tie_break` |
| `test_fetch_wiki_pages.py` | `test_fetch_wiki_dump_pages`, `test_fetch_wiki_live_pages` |
| `test_knowledge_base_schema.py` | itself plus `test_knowledge_base_schema_compat_app_id` |
| `test_rag_corpus_download_state.py` | `test_rag_corpus_cancel_state`, `test_rag_corpus_saves_before_done` (both are about the shared download state object) |
| split, not merge | `test_knowledge_base_service.py` (3,123 lines): by topic, as its own record lists (when to search; game title; tip routing; card block and trust; chip pool; vector recall and floors; rank fusion; query words; shipped tip text). Two other tests import it as a module (`test_kb_own_game_tip_label.py` L32, `test_kb_game_tip_meaning.py` L42): keep a module of that name or change those |

**Shared set-up:** five test files each carry their own loader of the build script
(`test_build_rag_reproducible.py` L24-30, `test_build_rag_embedding_guarantee.py` L29-35,
`test_rag_corpus_download.py` L36-42, `test_source_attribution.py` L102-106 inline,
`test_publish_corpus_embedding_guarantee.py` L28-35), although `tests/build_rag_db_loader.py` exists to do it and its
own header says the copies were removed. Likewise `tests/rag_corpus_seed_fixtures.py` says its seed payload was
shared, while `test_build_rag_reproducible.py` L36-50 still writes its own near-copy. Both are step 5 work.

## 6. Tests that check the code's text instead of what it does

In this area's 189 files: **none**. I searched every test file here for reads of source (`read_text`,
`readFileSync`, `?raw`): the hits read data (the library's seed files, the eval fixture, temp files), not code.
Next to this area:

- `tests/test_rag_update_deadline.py` L26-28: reads `src/components/KnowledgeBaseSection.tsx` and pulls
  `RAG_UPDATE_RPC_TIMEOUT_MS` out with a pattern (L187 of the section). It checks that the screen's waiting time is
  longer than the back end's worst case. A behaviour test is possible only by exporting the number from the
  section; the clearest fix is to move the number into one shared constants file both sides read (the back end
  reads a JSON, for instance). Until then this test is also the one tool-invisible path in section 4.
- `tests/test_download_sites_match_backend.py` L29-30: reads `downloadSites.ts` for its addresses (pattern
  `_SITE = "https://..."`) and compares them with the back end's. Same shape; `downloadSites.ts` does not move.
- `tests/test_ask_hook_order.py` is cited by `useKbNotesFold.ts` L10-13 as the reason hook order matters, but the
  test names the transcript, not that hook (a stale pointer, not a code-text test of this area).

## 7. Unused and written-twice findings confirmed

"Confirmed" means I re-ran the check; the others are from the record and marked.

**Confirmed unused:**

| What | Where | Note |
|---|---|---|
| `corpus_has_usable_vectors`, `corpus_section_vectors_fully_indexed`, `corpus_compat_vectors_fully_indexed` | `knowledge_base_schema.py` L594-601, L529-547, L550-563 | Test-only (`tests/test_knowledge_base_schema.py` L71-86, L90-177). The "fully indexed" pair says "nothing reads it yet" (L538) and is meant for a future ranking change. **Allowed to stay**; retiring them removes about 10 tests by name |
| The two library migrations `_migrate_compat_patterns_v2` and `_v4` | `knowledge_base_schema.py` L373-410, L413-433, called from `apply_schema` L439-440 | Their docstrings say "when opening an older corpus.db", but `apply_schema` is called only by `scripts/build_rag_db.py` L728 on a database it has just emptied, and by tests; the plugin never runs it on an installed library (the lesson in docs/lessons-learned.md, section 2). So in production they only ever see tables that already have the columns. The test that pins them is `test_knowledge_base_schema_compat_app_id.py::test_an_older_database_gets_the_column_added_not_a_crash`. **Allowed to stay** (harmless); a candidate for a dead-code pass, not for this plan |
| `resolve_bonsai_notes_dir` (an old-name alias "for one release") | `desktop_note_service.py` L135 | Test-only (`tests/test_desktop_note_service.py` L15, L37-38). Removing it removes that one test |
| `write_attributions` | `build_rag_db.py` L285-290 | Test-only; `build_corpus` writes the same file inline at L776. Both exist, so either the test or the inline write could use the function |
| `import os` | `build_rag_db.py` L20 | Never used |
| `urllib.error.URLError` used with no `import urllib.error` | `build_rag_db.py` L636 | Works only because `urllib.request` loads it; add the import |
| `import shutil as _shutil` and `_ = _shutil` | `rag_corpus_download_service.py` L147, L167 | Do nothing (`shutil` at L42 is used) |
| `MANIFEST_MIRROR_COUNT` | `rag_corpus_download_service.py` L107 | Read only by `tests/test_rag_update_deadline.py`; the mirror loop (L122) names its two mirrors by hand |
| `logs` and the never-set `cancel` event | `rag_corpus_local_install.py` L95-99 | The install's log lines are dropped; the cancel path cannot fire |
| `_aggregate_english` | `eval_kb_embed_models.py` L795 | No caller anywhere |
| `"centre"` in the exempt set, then removed again | `knowledge_base_game_match.py` L210-212 | Net effect nothing; the rule still maps it |
| `os`, `subprocess`, `sys` imports | `tests/test_knowledge_base_service.py` L2-4 | Never used |
| `game_ids` parameter | `tests/kb_keyword_corpus_support.py` L28 | No caller passes it (the only caller takes the whole library) |
| `onMoveDownFromRemove` | prop type `KnowledgeBaseSection.tsx` L175; passed at `OllamaTab.tsx` L276 | Never read by the section. Removing it changes two files (the second is the Ollama tab's) |
| `OLLAMA_PROGRAM_NOTICE` | `downloadSites.ts` L28-32 | Named nowhere else |
| `resetSearchSaved` | `searchTabStore.ts` L40-42 | Test-only |
| the pack actions `setPackEnabled`, `exportPack`, `importPack`, `removePack` | `src/hooks/useIntentPacks.ts` L134-208 | No caller anywhere in `src/`; only RPC stubs in `fakeDeckyRpc.ts` L220-247. The four back-end calls they would use (`set_intent_pack_enabled`, `export_intent_pack`, `import_intent_pack`, `remove_intent_pack`, `main.py` L1032-1049) therefore have no screen user either; tests reach them through `main.py` (`test_intent_pack_store_lock.py`). The pack-management screen is gone (a `CHANGELOG.md` line names a file that does not exist). **Allowed to stay**: export and import of packs may still be wanted by a maintainer; it is a decision, not a find to act on |
| `kb_eval_paraphrase_v0.json` | `tests/fixtures/` | No reader (see 1.4) |
| `SearchStop.tsx` header names a "SearchWords" file | L10 | A comment about a file that does not exist (`SearchFindBox.tsx` draws the word buttons) |
| types used only in their own file (`SearchIndex`, `SearchJumpArgs`, `NoteEditModalProps`, `NoteOfferCardProps`, `NotesRead`, `UserNotesSheetProps`, `OfferRecord`, `NotesModalHooks`, `NoteCallResult`, `DesktopNoteSaveModalProps`, `DrgGlossaryTermChipProps`) | each file | Exported but imported nowhere. Harmless; a dead-export remover would drop the `export` word |

**Written twice, confirmed:** the build script's loader (five tests, section 5); the Search tab's back-end stand-in
block and `pressA` (section 5); the 200-character note limit as `NOTE_TEXT_LIMIT` (`user_note_offer.py` L33) and
`MAX_NOTE_TEXT_LEN` (`user_notes_service.py` L42) (same number, two names; the offer file's own comment points at the
other); the same two lines in `append_not_in_notes_notice` (`kb_not_in_notes_notice.py` L73) and
`append_no_close_match_notice` (L488) (only the footer text differs; no comment says it is on purpose); the device
questions, fixture path and card-header pattern in the two `measure_kb_*` scripts (both go to the workshop, so
nothing to do here).

**Kept on purpose (the code says so):** `user_note_commands.py` and `localOnlyAskCommands.ts` `isNoteCommand`;
`kb_followup_memory.py` L370 copy of `_BLOCK_SENTINEL`; `knowledge_base_service.py` names kept for tests (its header,
L31-36) and `DEMOTE_STARTING_OUT_NOTES` (off by design, switched on only by one test file: any dead-code pass must
leave it); `compat_topic_router.known_compat_topics` (used by a drift test); `userNotesStore.ts` test-only
exports (`resetUserNotesStore`, `simulateScreenReload`, marked "Test-only").

**From the records, not re-checked (near-copies or small):** the 10-column notes query written three times
(`knowledge_base_search.py` L292, L489; `knowledge_base_service.py` L631); the query embedding call twice in
`knowledge_base_service.py` (L903, L1135); the settings-folder and store-lock lines in each of three functions of
`user_notes_rpc.py`; `keepNote` and `switchNote` in `useUserNotes.ts` (L47-50, L57-60); the four-direction mapping in
`NoteOfferCard.tsx` L101-109 and `NotesReadLine.tsx` L157-163; the `get_rag_corpus_status` call written out twice
in `KnowledgeBaseSection.tsx` (L350, L426); `_term_owner_map` and `_merge_entry_terms` owners in
`intent_pack_service.py` (L347-375); `_KB_NOTE_HEADER_RE` and the card-header patterns in
`kb_attached_notes.py` L50 and `kb_followup_memory.py` L371. None is marked on purpose; none is worth a change in
this plan.

**Stale words worth fixing when the file is next touched:** `kb_attached_notes.py` L268-273 says a `main.py` line
is still missing, but `main.py` L689-694 now does it; `eval_kb_answers.py` L7-9 says four checks, the code runs six
(`run_turn` L858-866); `knowledgeBaseDev.ts` says `KnowledgeBaseSection` uses it, only the Developer tab does;
`downloadSites.ts` L45 says the section shows a size it reads from this file.

## 8. Untangling targets in this area

**Places a setting is written** (the plan's step 6a list): the library's three settings
`use_local_knowledge_base`, `rag_corpus_path`, `rag_corpus_version` are written in six places here:
`rag_corpus_rpc.py` L105-107 (a finished download), L201-203 (Remove, cleared), L213-214 (a local install);
`rag_corpus_local_install.py` L134-138 (handed back as `settings_to_save`); `KnowledgeBaseSection.tsx` L817 (the
switch, through `setUseLocalKnowledgeBase`) and L407 (from the library-change listener); `kbLibrarySignal.ts`
L40-43 (the pending session note, not the saved file); `src/test-harness/kbSwitchWorld.tsx` L95-133 (a fake file, test
only). `downloadNotice.tsx` L141-148 writes `capabilities.internet_downloads` (a setting of the Permissions
tab, listed by that reviewer). Notes: `userNotesStore.ts` L88 writes a device-storage list of handled offers, which
is not a setting. `eval_kb_answers.py` L216-229 names settings one by one for its own test folder only.

**D-pad helpers and who uses them** (list for step 6b): `KnowledgeBaseSection.tsx` has its own list
(L290-346: `focusPrimaryBtn`, `focusCancelBtn`, `focusNomicBtn`, `focusActionRow`, `focusBelowToggle`) plus
`focusInTabBody`, `tryMoveUpWithPanelScroll`, `useHandRingOnGone`, `elementHasGamepadFocus`;
`buildKbNotesBlockElement.tsx` has its own header registry (L215-224, L302-313) and `focusPerTurnRow`;
the Search tab has `searchNav.ts` (the pure rule, L48-64) and `useSearchNav.ts` (its stop list, which uses
`navFocusRegistry` `takeNavFocus` L158 and `chatTranscriptNavHelpers` `takeHolderFocus` L125) with the stops spread by
`SearchStop.tsx` and drawn by `GameNoteSheet`, `SearchFindBox`, `SearchGameRow`, `SearchNotesList`, `SearchResults`;
`SearchTab.tsx` L217-225 has the row order; `SearchBackLine.tsx` L53-68 has its own four handlers and
`takeAboveTheChat`; `settleRing.ts` listens for presses itself (L42-50) and is used by `useEarlierTurnsPill.ts` L29;
`NoteOfferCard.tsx` and `NotesReadLine.tsx` use `replyStopRegistry` and each writes the same four-direction mapping;
`UserNotesSheet.tsx` L139-156 has its own column and moves; the glossary chip and `glossaryTermRegistry` (see
`glossary-move.md` section 3.4).

**Hand-downs from the main screen** (step 6c), counted by the readers: `KnowledgeBaseSection` gets 13 things
(L146-176; one, `onMoveDownFromRemove`, is never read); `buildKbNotesBlockElement` 8 (L272-287);
`SearchTab` 5 (`active`, `isAsking`, `intentPackIndex`, `onSettingClick`, `onOpenChat`; L63-72);
`downloadNotice` 6 from the plugin root (L84-96); `useUserNotesBridge` 3 (L21-25); `NoteOfferCard` 3
(`replyKey`, `onMoveUpOut`, `onMoveDownOut`; L173-177); `NotesReadLine` 2; `rag_corpus_rpc.py` takes the whole
plugin object (9 members used, L55-247).

## 9. Cuts that belong to other reviewers (found here)

- **Ban lookup:** `desktop_note_service.py` L75, the `"steam_web_api"` entry in the redaction list (the generic
  `"api_key"` beside it stays). Tests: `tests/test_desktop_note_service.py` L212 and L220 (the redaction test's
  field and its assertion; the test needs a different example field, not a deletion);
  `tests/test_user_note_command.py` L56-57 (two checks that `bonsai:vac-check` is a local command) and L163-164
  (the `vac_check` route used as the "other route" example; it needs another example). Also seen outside the list:
  `src/utils/localOnlyAskCommands.ts` L39-41 and L55-58 hold the `bonsai:vac-check` prefix.
- **UI scale:** `SearchBackLine.tsx` L24 (import), L33 (2 calls), L39 (2), L40 (1); `searchTabStyles.ts` L19
  (import) and 57 calls on 50 lines: L36, L37, L40, L59, L62, L72-75, L94, L98, L99, L105, L107-109, L122, L123,
  L135, L141-143, L151, L173, L174, L180, L181, L187, L190, L192, L199, L200, L214, L215, L223-225, L239, L266-268,
  L274-277, L285, L290, L298, L311, L312 (the reader's list missed L277; calls with two or three on a line:
  L37, L40, L123, L200, L224, L311). `uiTextPx` (L20) stays. No other file in this area calls `uiScalePx`.
- **Read aloud:** none of this area's code is read aloud. `kbCloseMatchLineAgrees.ts` L11 names "the read-aloud
  text" in its header only; the read-aloud line is `MainTabChatTranscript.tsx` L911 (outside), which feeds this
  file's text. The file stays.
- **Catalog refresh, preview tool:** nothing in this area.
- **Main screen and settings lists:** section 8.
- **`OllamaTab.tsx` L276:** the unused `onMoveDownFromRemove` prop.

## Open questions for the one running the session

1. **Python tests: flat or in folders?** I kept them flat (section 2). If the maintainer wants folders, the
   preparation commit (an `__init__.py` per folder, the four bare-name imports and the three folder counts) comes first. What settles it: a
   decision; the cost of "flat" is only that `tests/` stays one long list of 227 files.
2. **`backend/search/` for the intent packs**, or `backend/settings/`? And is the pack manager (four back-end calls
   and four hook actions, no screen user) wanted? Section 7.
3. **Glossary folders:** `src/features/glossary/` as a new folder and the registry in `src/shared/focus/`. If the
   answer reviewer maps the answer's parts to one folder, the chip may go there instead.
4. **`KnowledgeBaseSection` and the models box:** the section holds the meaning-search model's pull button and four
   tests about it (`nomicPull`, `installNomicOffer`, `pullHint`, `noticeReturnFocus`). They are mapped with the
   library. The models reviewer may want them with the models box; that is a split of the file, not a move.
5. **`desktop_note_service.py` mixes** the desktop note (notes) with the app log and Ask trace (developer). I moved it
   whole to `backend/notes/`; a split would be a change for step 6 or later.
6. **Two measuring scripts to the workshop** (`measure_kb_floor_holdout.py`, `measure_kb_thin_match.py`) and one
   test data file (`kb_eval_paraphrase_v0.json`): confirm. Two code comments cite the scripts; they would read
   `workshop:scripts/...`.
7. **A dead-code pass for the schema's two migrations and four helpers** is available (section 7); I did not
   count it as part of this plan.
8. **Files from other batches that touch these:** `src/components/OllamaTab.tsx` L276 (unused prop),
   `src/utils/localOnlyAskCommands.ts` (ban lookup prefix and a copy of the note-command check),
   `src/components/MainTabChatTranscript.tsx` L911 (read aloud line fed by `kbCloseMatchLineAgrees`), and
   `src/index.tsx` L786 (hands the whole `useIntentPacks` object on; only `refresh` and `index` are read).

## Records found wrong

Checked about 60 of the 189 records against the code (every record that drives a cut or a verdict, every
glossary file, and a sample of the rest). Four were wrong in a field that matters, and two were right but
incomplete:

| Batch | File | Field | Said | True |
|---|---|---|---|---|
| b55 | `src/components/DrgGlossaryTermChip.tsx` | removal, new folder | `glossary: whole file`, `goes away` | the chip stays; only a type import and comments change (the reviewer kit's reading) |
| b59 | `drgGlossaryAsk.ts`, `drgGlossaryAsk.test.ts`, `drgGlossaryTermMatch.ts`, `drgGlossaryTermMatch.test.ts`, `drgGlossaryTermRegistry.ts`, `drgGlossaryTooltipPlacement.ts` | removal, new folder | whole file, goes away | all stay: the matcher and the ask question change a little, the other four do not change in step 3. Only `src/data/drgGlossaryTerms.ts` (b56, right) and `tests/test_ollama_prompts_drg_glossary.py` (b61, right) go |
| b57 | `src/features/search-tab/searchTabStyles.ts` | removal (ui-scale) | 56 calls on 49 lines, list without L277 | 57 calls on 50 lines; L277 was missed (list in section 9) |
| b50 | `knowledge_base_schema.py` | surprises | "possible bug: the FTS rebuild branch of the v2 migration never runs from `apply_schema`" | true as far as it goes, but the bigger fact is that `apply_schema` never runs on an installed library at all, so neither migration runs in production (section 7) |
| b61 | `tests/test_ollama_prompts_drg_glossary.py` | removal | whole file goes | goes, but is replaced by a test of the new clause; the five old test names are listed in `glossary-move.md` |
| b59 | `src/hooks/useIntentPacks.ts` | users | the four pack actions have no caller | confirmed; incomplete: the four back-end calls behind them have no screen user either (section 7) |

Records that held up when I checked them against the code: b49 `desktop_note_service.py`,
`intent_pack_service.py`, `intent_pack_rpc.py`, `deck-basics.json`; b50 `knowledge_base_game_match.py`,
`knowledge_base_notes_search.py`; b51 `rag_corpus_download_service.py`, `rag_corpus_local_install.py`,
`rag_corpus_rpc.py`; b52 `build_rag_db.py`, `eval_kb_answers.py`, `user_note_commands.py`; b53
`eval_kb_embed_models.py`; b54 `extract_wiki_notes.py`, `plugin_zip_corpus_guard.py`; b55 `publish_corpus.py`;
b56 `KnowledgeBaseSection.tsx`, `downloadSites.ts`, `SearchBackLine.tsx` (six mentions, as the reader counted; the
script's seven was the wrong number), `drgGlossaryTerms.ts`; b57 the five `SearchTab.*.test.tsx` stand-in blocks,
`searchTabStore.ts`; b58 `useUserNotes.ts`, `NoteOfferCard.tsx`, `userNotesStore.ts`, `SearchStop.tsx` (the
"SearchWords" comment); b59 `tests/build_rag_db_loader.py`; b60 the five loader copies,
`kb_keyword_corpus_support.py`, `test_desktop_note_service.py`; b61 `test_knowledge_base_service.py` (unused
imports), `test_user_note_command.py`; b62 the three fixture files and the two test-to-test imports.
