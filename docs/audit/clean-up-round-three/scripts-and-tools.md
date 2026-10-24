# Scripts, tools, hooks and the shared test setup: what stays, moves or goes

Written 2026-10-16 by the plan 86 step 2 scripts-and-tools reviewer (Sonnet 5.5 high), from the records of batches
b83 to b92, on `experimental` at `b5ce2768`. The knowledge-library tools (`scripts/build_rag_db.py`, `eval_kb_*`,
`extract_wiki_notes.py`, `fetch_wiki_*`, `measure_kb_*`, `plugin_zip_corpus_guard.py`, `probe_deck_kb_retrieval.py`,
`publish_corpus.py`) and `src/test-harness/kbSwitchWorld.tsx` are another reviewer's; the preview tool's cut list is
another reviewer's too (its files are only marked here).

## In plain words

**What a player notices:** nothing. Everything here is the tooling around the plugin.

**What the maintainer is approving, in four parts:**

1. **About 4,800 lines of scripts and their tests would retire** (18 script files, two of them data files, and 2 test
   files, listed in § 1.3). Most served a clean-up that is finished. **One of them is more than a clean-up tool:** the
   "ratchet" (a script that checks 23 code-health numbers and fails when one gets worse) is also the only thing that
   stops `AGENTS.md`, `CLAUDE.md`, the roadmap and the testing documents from growing past their size ceilings, and it
   also checks for import loops, for calls the screen makes that the back end does not answer, and for copy-pasted
   code. Plan 86 step 7 says retire it. § 1.4 lists its 23 checks one by one so you can keep the few
   that matter. Nothing is retired until you say so.
2. **Five old one-off scripts move to the workshop** (969 lines). **Nothing else moves:** most scripts are named
   by a document, a helper's instructions or a test, and moving them costs edits for no gain.
3. **The preview tool's files are marked** (§ 1.5): the scripts, `src/preview/`, `tests/preview-suite/`, the
   `.decky/preview.json` file. About 3,600 lines in my area.
4. **One shared test setup would save about 1,000 to 1,400 lines, not thousands.** 186 screen test files each write
   their own copy of the fake Decky screen parts; together the copies are about 1,710 lines. 60 of them are word for word the
   same as the setup that already runs for every test, so they can simply be deleted. The rest become one-line calls
   to a few helpers (§ 4).

**Things I found that you did not ask about** (each in its section): the tool server's `env-vars.json` map is written
but nothing reads it; two of the five Claude hook files have wording that may be out of date; the hook that refuses `git push`
has no test; `scripts/sync-versions.mjs` does a job the other version script already does; `bump-version.mjs` calls
both; 17 screen test files and helpers each type in the same Deck pane numbers by hand.

---

## 1. A verdict for every script

"Who runs it" means a real caller (a package.json script, `scripts/verify.py`, a workflow, a git or Claude hook,
another script, a test, a helper's instructions). A document that only describes it is written as "document only".
Evidence lines were checked with `git grep` at `b5ce2768`. The scripts folder has 81 files in my area (92 less the 11
knowledge-library tools).

### 1.1 Stays in `scripts/` (or `scripts/deck/`, `scripts/lib/`)

The Deck helper scripts that already live in `scripts/deck/` stay there. **No script moves into `scripts/deck/`
except `deck-restart-ollama-gpu.sh`:** the PC-side Deck launchers are named by `.claude/agents/deck-driver.md`, by
`AGENTS.md`, by the knowledge pack and by `.gitignore` comments, and a move would break each of those paths with no
gain. The readers' "likely `scripts/deck/`" picks are not taken for that reason.

| Script | Who runs it today | Evidence and notes |
|---|---|---|
| `scripts/verify.py` | `scripts/land_lane.sh:93`, `scripts/deck_overnight_run.mjs:34`, `scripts/lib/deckOvernightRun.mjs:95,232`; the helpers' and runbook text | **The gate itself.** Runs the type check, related tests, `check_headers`, `ratchet`, `growth_limit`, `closed_rows`, `docs_toc` (lines 348 to 361). If the ratchet and growth limit retire, their two `step_optional_script` lines (349, 353) and the comment above them go. `step_optional_script` skips a missing script without failing (lines 280 to 306), so the gate would not break, it would just say "not present yet" until the lines are removed |
| `scripts/check-focus-patterns.mjs` | `package.json:15` (`test:focus`), `.github/workflows/tests.yml` (`pnpm test:focus`), `scripts/land_lane.sh:92`, the bug-lane agent files, `tests/test_check_focus_patterns.py:22` | **The D-pad pattern check.** Stays. Counts five known focus mistakes against `scripts/focus-baseline.json`. After removals, regenerate the baseline with `node scripts/check-focus-patterns.mjs --update` (the file's line 2 says so) instead of editing it: entries at lines 44 to 46 (`SettingsTabUiScaleSection.tsx`) and 66 to 68 (`drgGlossaryTermRegistry.ts`) belong to files that go |
| `scripts/check_focus_patterns.test.mjs`, `scripts/focus-baseline.json` | the test is run by `tests/test_check_focus_patterns.py:22`; the baseline is read by the checker (`:79`) | Stay with the checker. The test writes its own baseline copy and does not read the real one |
| `scripts/check_headers.py` | `scripts/verify.py:348` (`--level full`), `scripts/plain_words_check.py:55` (import), `ratchet.py`, `phase2_map.py` | **The header check.** Stays. Its own header (lines 6 to 8) still calls the full level "the future" pass; verify has run it at full level since 2026-09-14. No test of its own (the focus and docs tests cover other scripts) |
| `scripts/code_line_count.py` | imported by `check_headers.py:34` (called at `:255`), `growth_limit.py:43`, `ratchet.py:63` | **Stays even if the ratchet and growth limit retire,** because `check_headers.py` needs it for its "big file needs a How it works line" rule. Its docstring says "the size limits use it": reword when they go |
| `scripts/closed_rows_check.py` | `scripts/verify.py:357`, `tests/test_closed_rows_check.py:27` | **The closed-rows check.** Stays. Lines 50 to 54 name five files under `docs/archive/` that still exist (the roadmap and testing archives stayed in this repo at step 1) |
| `scripts/docs_toc.py` | `scripts/verify.py:361` (`--check`), `scripts/code_map.py:34` (imports `apply_toc`), `tests/test_docs_toc.py:13` | **The contents-list check.** Stays. Line 64 to 65 name `docs/design-language.md` and `docs/design-tokens.md`: a later doc move must edit that list |
| `scripts/code_map.py` | by hand; `AGENTS.md:73` and `docs/code-clarity.md` describe it | Stays. Writes `docs/code-map.md` on request (the file is no longer saved: `.gitignore:110`). It repeats `collect_app_files` from `check_headers.py` on purpose (its docstring says so) |
| `scripts/run_python_tests.py` | `package.json:14` (`test:py`), `scripts/verify.py:342`, CI through `pnpm test:py` | Stays. It already installs a `pwd` stand-in for the whole run (lines 14 to 21); see § 5 |
| `scripts/build.ps1`, `scripts/build.sh` | by hand; `watch-deploy.*`, `AGENTS.md`, `docs/development.md`, `docs/testing.md`, a Developer-tab sentence in `src/features/folded-tabs/developerTabFolds.ts:126` | Stay. They differ: `build.ps1` seeds the knowledge base and hash-checks every uploaded file, `build.sh` does neither. The upload step is written twice (`build.sh` lines 178 to 187 and 207 to 216). Leave as is |
| `scripts/bump-version.mjs` | `package.json:20` (`version:bump`) | Stays. Spawns two sync scripts (lines 57 and 63); see `sync-versions.mjs` in § 1.3 |
| `scripts/sync-version-from-plugin.mjs`, `scripts/sync_version_from_plugin.test.mjs`, `tests/test_sync_version_from_plugin.py` | `package.json:8,10,12,19` (prebuild, prewatch, pretest, `version:sync`); the test through the Python test | Stay. This script already copies the version into `package.json` too (lines 73 to 79) |
| `scripts/third_party_licenses.mjs` (+ `.test.mjs`, `tests/test_third_party_licenses.py`) | `package.json:9` (`build`) | Stay. Stops the build on a disallowed licence |
| `scripts/stage_zip_extras.py` (+ `tests/test_stage_zip_extras.py`) | `.github/workflows/build-plugin-zip.yml:101`, `scripts/build.sh:235` | Stay |
| `scripts/verify-decky-plugin-zip.sh` (+ `tests/test_verify_decky_plugin_zip.py`) | `.github/workflows/build-plugin-zip.yml:116`, `scripts/build.sh:245`, `scripts/plugin_zip_corpus_guard.py`, the test | Stay. The test may skip on a Windows PC (its bash lookup refuses the WSL launcher, `:46`) |
| `scripts/ensure-git-hooks.mjs` | `package.json:25,26` (`mcp:install-hooks`, `prepare`) | Stays; sets git's `core.hooksPath` |
| `scripts/keep_awake.py` (+ `tests/test_keep_awake.py`) | `AGENTS.md:247`, `CLAUDE.md:48` (document only) | Stays |
| `scripts/land_lane.sh` | `docs/agents/bug-wave-runbook.md:68`, `AGENTS.md`, `docs/lessons-learned.md`; `.gitattributes:4` | Stays. Runs `generate-architecture.mjs --types-only` (`:63`), the focus check (`:92`) and `verify.py` (`:93`). Line 30 hard-codes a default co-author model name that goes stale when the model changes |
| `scripts/worktree.py` | `docs/agents/bug-wave-runbook.md:31`, `docs/lessons-learned.md:52,70` (document only) | Stays. Moving or renaming it breaks those instructions |
| `scripts/deck_send_ask.py` | `.claude/agents/deck-driver.md:29` runs it by path; `AGENTS.md:266` | Stays at its path. Its header names two probe files it was copied from; neither exists now (they are in the workshop) |
| `scripts/deck_overnight_run.mjs` (+ `.test.mjs`), `scripts/lib/deckOvernightRun.mjs`, `scripts/lib/mcpStdioClient.mjs`, `scripts/testFixtures/fakeMcpServer.mjs` | the test is run by hand with `node --test` and by `tests/test_workshop_setting.py:175`; `docs/roadmap-details.md`, `docs/testing.md` | Stay. One chain: run imports `lib/deckOvernightRun.mjs` and `lib/workshop.mjs`; the lib imports `mcpStdioClient.mjs`; the test starts `fakeMcpServer.mjs` by path (`:30`) |
| `scripts/lib/workshop.mjs`, `scripts/lib/workshop.py`, `scripts/workshop.test.mjs`, `tests/test_workshop_setting.py` | `workshop.py`: `scripts/eval_kb_answers.py:95-96`, `scripts/eval_kb_embed_models.py:80-82` and the test (loads by path, `:30`); `workshop.mjs`: the overnight run files and the test | Stay in `scripts/lib/`. Moving either breaks the two eval scripts' path setup and the test's path load |
| `scripts/deck_queue.py` | **nobody**: only `.gitignore:103` (comment); its header holds the commands | **Stays, flagged.** No document, helper file or script names it. Whether the "who is driving the Deck" queue is still used is the maintainer's to say; if not, send it to the workshop |
| `scripts/screenshot-deck.ps1`, `scripts/screenshot-deck.sh`, `scripts/record-deck.ps1`, `scripts/record-deck.sh` | by hand; `.gitignore:87,94`, `docs/development.md`, the knowledge pack's `deck-dev-loop.md`, `screenshot-ingest.md`, `screenshots/README.md` | Stay. The `.ps1` and `.sh` of each pair repeat the whole flow; that is the Windows and Linux form, so it stays. They read `scripts/deck/*.sh` by path, so those four stay in `scripts/deck/` too |
| `scripts/deck/bonsai-capture-common.sh`, `bonsai-capture.sh`, `bonsai-record.sh`, `deck-remote-common.sh` | sourced or bundled by the four launchers above | Stay in `scripts/deck/`. **Trap:** `deck-remote-common.sh:46-52` cuts a guard block out of `bonsai-capture.sh` and `bonsai-record.sh` (their lines 6 to 10) by matching its exact first line; changing that guard text changes what is installed on the Deck |
| `scripts/deck-restart-ollama-gpu.sh` | nobody names it (its header is the only mention) | **Moves to `scripts/deck/`.** Costs nothing: no reader. Run on the Deck; writes a log to a fixed `/tmp` path (lines 42, 46, 52, 53) |
| `scripts/setup-dev.ps1`, `scripts/setup-dev.sh`, `scripts/revert-dev.ps1`, `scripts/revert-dev.sh` | by hand; `build.ps1:41,49`, `build.sh:52,128,230`, `watch-deploy.*`; `docs/development.md`, `docs/troubleshooting.md` | Stay. The two `revert-dev` scripts are not twins: the `.ps1` takes away the Deck's restart rule and deletes every trusted key on the Deck, the `.sh` removes only this PC's key. `setup-dev.ps1:37-42` writes a passwordless-root rule on the Deck |
| `scripts/watch-deploy.ps1`, `scripts/watch-deploy.sh` | by hand; `docs/development.md`, `deck-dev-loop.md` | Stay. `watch-deploy.sh` sets its EXIT trap twice (lines 99 and 107): the first never takes effect |
| `scripts/wipe-bonsai-data.sh` | by hand; `docs/troubleshooting.md:385` | Stays |
| `scripts/setup-ollama.sh` | `tests/test_starter_tag_parity.py:72` reads it as text and checks its model list | Stays; the test is one of the "checks the code's text" kind |
| `scripts/setup_ollama.ps1` | nobody (document only: `docs/development.md:318`) | **Stays, flagged:** it pulls `llama3` (line 38) while the Linux script pulls the starter model `gemma4:e2b-it-qat`. Out of step; fixing or retiring it is a maintainer call (does the Windows PC need it?) |
| `scripts/check_move_commit.py`, `scripts/move_screen_file.mjs`, `scripts/move_screen_file.test.mjs`, `scripts/move_backend_file.py`, `scripts/move_tools_config.json` (+ `tests/test_check_move_commit.py`, `tests/test_move_screen_file.py`, `tests/test_move_backend_file.py`) | `docs/agents/clean-up-helpers.md` (the movers use them in steps 4 and 5); their tests | **Stay until step 5 is done.** The plan's step 7 does not list them. After the moves they have no further job; keeping them for a future move, sending them to the workshop, or retiring them is for the maintainer at step 7. Note: `move_backend_file.py:68-84` repeats the folder lists in `move_tools_config.json:3-13` (a change to the config does not reach the Python mover), and the same Markdown link rewriting is written in both movers |
| `tests/test_seam_contracts.py` | by the Python test run | Stays for now: it pins the names and call shapes the back-end split in steps 4 to 6 must keep. `:159` names `backend.services.vac_check_commands`, which goes with the ban lookup. Re-judge at step 7 |

### 1.2 Moves to the workshop

The workshop layout (its README) has `scripts/` for "old one-off scripts and Deck probes". All five land there.

| Script | Goes to | Who runs it today | Evidence |
|---|---|---|---|
| `scripts/docs_archive.py` (135 lines) | `workshop:scripts/docs_archive.py` | nobody | Header says it served the 2026-09-13 archive pass. Its default index path `docs/archive/INDEX.md` (line 29) does not exist in this repo; the index is now `workshop:archive/INDEX.md` (it exists there). Run as it is, it prints "No index found" |
| `scripts/docs_inventory.py` (315) | `workshop:scripts/docs_inventory.py` | nobody | A triage aid for an earlier documents clean-up (header lines 15 to 17). Nothing names it |
| `scripts/docs_split_check.py` (160) | `workshop:scripts/docs_split_check.py` | nobody | Proved one document split lost no line. Plan 86 splits no document. If a later split happens, fetch it back |
| `scripts/deck-ollama-gpu-probe.sh` | `workshop:scripts/deck-ollama-gpu-probe.sh` | nobody | A one-off Deck measurement; hard-codes the model `gemma4:latest` (line 19). The workshop already holds six similar probes |
| `scripts/lib/deck-ui-capture-remote.sh` (332) | `workshop:scripts/deck-ui-capture-remote.sh` | **nobody; it cannot run as written** | `git grep` finds no mention. Line 9 holds a placeholder (`__BONSAI_ALLOW_STEAMOS_RW__`) that nothing replaces. It is the only place with the X11 desktop screen grab (lines 88 to 163, 305 to 320), which is why it goes to the workshop instead of being deleted |

### 1.3 Retire: proposals for the maintainer, not decisions

**Ask before any of these** (plan 86 step 7). **Step 8 gives the repo a fresh history,** so a deleted script is gone
for good afterwards: for the larger ones I propose copying to `workshop:scripts/retired/` first. Lines are at
`b5ce2768`.

| Script | Plan 86 names it? | Who runs it today | What would break |
|---|---|---|---|
| `scripts/ratchet.py` (1,120 lines) + `scripts/ratchet.json` (227) | yes: "the size ratchet" | `scripts/verify.py:349` (gate, `check --json`); imported by `growth_limit.py:44`, `phase2_map.py:46`, `tests/test_architecture_maps.py:31` | `growth_limit.py` and `phase2_map.py` stop importing (retire them together); `test_architecture_maps.py` fails; `verify.py:349` and its comment go; `docs/agents/bug-wave-runbook.md:46` and `docs/mcp-setup.md:216` mention it; `docs/lessons-learned.md:98-104` is history. `src/components/SettingsTabChatTextSizeRow.tsx:31` names `ratchet.json` in a comment. **It also loses the doc size ceilings and four other guards: § 1.4. Steps 4 to 6 lean on it, so not before step 7** |
| `scripts/growth_limit.py` (342) + `scripts/growth_limits.json` (34) + `tests/test_growth_limit.py` (254) | yes: "growth limit" | `scripts/verify.py:353` | Imports `ratchet`: retire with it. `docs/testing.md` names it. The 800-line cap on app files goes. Six of its limits have no written reason |
| `scripts/phase2_map.py` (884) | yes: "old map counters" | nobody (by hand) | Imports `ratchet` (about 15 helper calls). `remove_dead_exports.mjs:12` and `remove_dead_python.py:12` name it in comments. Its output path `docs/audit/refactor-round-two/phase2` (`:49`) is now in the workshop |
| `scripts/architecture_maps.py` (107) + `tests/test_architecture_maps.py` (99) | yes: "old map" | imported by `ratchet.py:64`; the test | Only the ratchet and phase2 use it (the tool server builds its maps itself, `architectureMaps.ts:55-58`). `docs/mcp-setup.md:216` mentions it. `MAP_FILES` (L39-47) lists `preview-tiers.json`, which the preview removal also touches |
| `scripts/py_import_graph.py` (333) | yes: "old map" | `scripts/architecture_maps.py:36`; the tool server at start-up (`packages/bonsai-mcp/src/architectureMaps.ts:56`) | Its output `py-import-graph.json` is read only by `ratchet.py:515` and `phase2_map.py:53`. If both go, the server's call at `architectureMaps.ts:56`, the map name in `smoke-architecture.mjs:29-37` and `docs/mcp-setup.md:216` go too |
| `scripts/shell_seam.mjs` (57) | yes: "seam counters" | `scripts/ratchet.py:458` | Counts what the main screen hands the tabs: plan 86 step 6c's progress meter, so retire it after 6c. Two comments name it: `src/types/backgroundAsk.ts:243`, `src/features/plugin-shell/settingsLoadedSignal.ts:15`. Its `--write` option writes to `docs/audit/refactor-round-two/phase4` (`:53`), a folder that is now in the workshop |
| `scripts/ts_long_functions.mjs` (198) | yes: "map counters" | `ratchet.py:237-257`, `phase2_map.py:592` | Only the ratchet's and phase2's check for long uncommented functions (at 0 for weeks) |
| `scripts/seam_contract.mjs` (65) | yes: "seam counters" | **nobody** | A one-off for phase 4 of the round-two refactor (header `:6-7`). Nothing breaks |
| `scripts/comment_only_check.py` (245) + `scripts/strip_ts_comments.mjs` (61) | yes: "comment strippers" | **nobody** (no gate, test or script runs `comment_only_check.py`; `strip_ts_comments.mjs` is run only by it, `:72`) | Nothing breaks. Header: written for the merge of a finished refactor phase |
| `scripts/remove_dead_exports.mjs` (225), `scripts/remove_dead_python.py` (160) | no | **nobody** | Both say they were written for plan 51's delete phase (finished 2026-09-15). Nothing breaks. `ts-morph` stays a dependency: the move tools, `shell_seam`, `seam_contract` and `tests/test_move_screen_file.py` use it; it can go only after all of those do |
| `scripts/plain_words_check.py` (263) | no | **nobody** (`docs/code-clarity.md` names it) | Report-only (never fails); built for the header-sweep that finished. Imports `check_headers`, which stays. Weakest case of the list: a judgment call |
| `scripts/sync-versions.mjs` (26) | no | `scripts/bump-version.mjs:63` | **A duplicate, not a leftover:** `sync-version-from-plugin.mjs` already writes the version into `package.json` (its lines 73 to 79). Dropping the file means dropping the spawn block at `bump-version.mjs:62-67` |
| `scripts/reverse-tunnel-deck-ingest.ps1`, `.sh` (65) | no | **nobody**; named in `.env.example:12`, `packages/bonsai-mcp/knowledge/personas/master-debugger.md:85,88,89,288`, `knowledge/workflows/deck-dev-loop.md:107` | **Unknown, ask.** Header and banner say "Cursor debug ingest" (the Cursor tool is being retired). `.mcp.json:17` sets the ingest port to 7684 but the tunnels forward 7682. The Decky Plugin Studio server has its own `deck.startTunnel` (`knowledge/architecture/platform-contract.md`). I lean retire, but I cannot see whether anyone still starts it by hand. If retired: edit the three knowledge-pack mentions and `.env.example:12-13` |

**Packages that become removable when these retire** (check each against the lock file first): `jscpd` and `knip` in
`package.json` (only `ratchet.py:317` and `phase2_map.py:215` run them). **Keep `@vitest/coverage-v8`** (line 55): no
script asks for it, but plan 86 step 5's proof ("coverage does not drop") and the saved baseline use it. `decky-frontend-lib`
(line 56) and `@types/webpack` (line 54) are named by no code (the record says the lock file only; `docs/development.md:398`
links the first as text): candidates to drop, not proven. `tslib` is reached through the rollup plugin: keep.

### 1.4 The ratchet's 23 checks: what each guards, and a suggestion

The plan says retire the ratchet. Before it does, here is what leaves with it. `best` is the last recorded value.

| Check (`scripts/ratchet.json` key) | Best | What it stops | Suggestion |
|---|---|---|---|
| `doc_size_kb_agents` (AGENTS.md), `doc_size_kb_claude` (CLAUDE.md), `doc_size_kb_roadmap`, `_roadmap_kb`, `_roadmap_shelved`, `_roadmap_details`, `_testing` | 21.12 KB (ceiling 26), 2.91 (no ceiling: it may not get bigger than its best), 62.6 (ceiling 100), 14.7 (25), 12.47 (21), 71.25 (100), 114.05 (165) | **The only enforcement of the size ceilings** on the living documents. The shelved-list ceiling went 20 to 21 KB at step 1 (`ratchet.json`) | **Keep** in some form, e.g. a 30-line check in `verify.py` that reads the ceilings from a small file |
| `duplicate_lines_app` (867), `duplicate_lines_be_tests` (1,801) | | Copy-paste, measured with `jscpd`. `docs/agents/bug-wave-runbook.md:46` tells landings to run it; lanes that are clean alone raise it once landed together | **Keep through step 5** (the test merge is meant to lower the tests one); then your call |
| `unused_exports_fe` (21) | | Exports nobody imports, by `knip`. **After step 3's removals this is the quickest way to find what they left behind** | **Keep through step 3 at least** |
| `import_cycles_be`, `import_cycles_fe` | 0, 0 | Import loops. Steps 4 to 6 move every file, so this is when a loop is most likely to appear | Keep through step 6 |
| `fe_calls_with_no_be_method`, `be_methods_with_no_caller` | 0, 1 | The screen calling a back-end method that does not exist, and the reverse. Overlaps the "list of back-end methods" check step 4 runs after each commit | Keep through step 4 |
| `raw_call_sites` | 0 | The screen calling the back end around the one safe wrapper | Cheap; keep if a replacement is easy |
| `shell_props_to_tabs` (215) | | Step 6c's meter for "the main screen hands down less" | Retire after 6c |
| `settings_field_list_repeats` | 0 | Step 6a's meter for "each setting written once" | Retire after 6a (the generator replaces it) |
| `files_over_400_lines` (28) | | The size ratchet the plan names | Retire |
| `fe_long_functions_uncommented`, `be_long_functions_no_docstring`, `be_names_defined_twice` | 0, 0, 0 | Long uncommented functions, same name defined twice | Retire (at 0 since the refactor) |
| `files_without_purpose_header` | 0 | Same job as `check_headers.py`, which stays | Retire |
| `live_docs_mentioning_cursor` | 0 | The retired Cursor tool leaking back into the documents | Retire |

**So the real choice is not "retire or keep" but "when, and which guards are rewritten smaller".** Retiring the
ratchet in step 7 as planned is fine **if** the size ceilings are carried over first. Everything the other scripts of
the group need (`architecture_maps.py`, `py_import_graph.py`, `shell_seam.mjs`, `ts_long_functions.mjs`, `phase2_map.py`,
`growth_limit.py`) retires with it in one go.

### 1.5 The preview tool's scripts (marked; the cut list is another reviewer's)

| File | Who runs it | What else changes with it |
|---|---|---|
| `scripts/run-preview-suite.mjs` (1,082 lines) | `package.json:16,17` (`test:preview`, `test:preview:tier`) | Writes evidence to `docs/test-evidence` (`:24`, now a path that moved to the workshop) and edits `docs/testing-manual.md` and two archive files with `--write` (`:28-30`, `:850-958`). It loads every `.json` under `tests/preview-suite/` and throws when the manifest names a missing scenario (`:486-490`, `:513`): the folder goes whole |
| `scripts/build-preview.mjs` (10) | `package.json:18` (`build:preview`) | Sets `DECKY_PREVIEW`, which no other file in the repo reads. Whether the external Decky Plugin Studio reads it is unknown |
| `package.json:16-18` | | The three preview script lines |
| `src/preview/` (4 files, 359 lines): `previewTestHooks.ts`, `replyLayoutReport.ts`, `replyLayoutReport.test.ts`, `useDeckyPreviewTestHookRegistration.ts` | `src/index.tsx:167` imports the registration and calls it at `:733-749`; `scripts/run-preview-suite.mjs` (comments) | **Check the built bundle:** the registration is a static import guarded only at run time, so the hooks probably ship in every build. The `index.tsx` lines are the screen reviewers' |
| `tests/preview-suite/` (10 JSON files, 2,144 lines) + `README.md` | the runner, by folder scan; `tier-manifest.json` also by `packages/bonsai-mcp/scripts/generate-architecture.mjs:309` | See § 2: removing the folder breaks the full map build until `generatePreviewTiers` goes |
| `.decky/preview.json` (3 lines) | **nobody in this repo** (the file holds one key, `panelRootSelector`) | The record says "goes away (sure)". I would not say sure: the external tool that has the `preview.*` tools may read it from the workspace. Settle by searching the Decky Plugin Studio repo |

---

## 2. The tool server (`packages/bonsai-mcp/`)

**What it is, in a line:** the in-repo tool server (policies, workflows, docs search, architecture maps) that Claude
Code starts from `.mcp.json`. It has 1,399 lines in `src/` and `scripts/`; it is built by `npm run build` there.

**Stays:** the server (`src/index.ts`, `server.ts`, `knowledge.ts`, `paths.ts`, `architectureMaps.ts`), the knowledge
folder, and the three scripts that matter every day:

| Script | Who runs it |
|---|---|
| `scripts/sync-architecture-for-commit.mjs` | `.githooks/pre-commit:9`, on every commit (rewrites and stages `src/types/rpcMethods.ts`) |
| `scripts/validate-knowledge.mjs` | `.githooks/pre-push:7`, `package.json:24` (`mcp:validate`), `packages/bonsai-mcp/package.json`, `validate-mcp.yml:34`, `verify.py --full` |
| `scripts/generate-architecture.mjs` | `--types-only` from the two hook paths, `land_lane.sh:63`, `validate-knowledge.mjs:72`; `--maps-only` from the server's start-up (`architectureMaps.ts:55-58`) |

**Every commit and push depends on one flag.** `generate-architecture.mjs --types-only` is what the pre-commit hook,
the pre-push hook and the validate workflow all run. A change to that path breaks every commit and push at once.

**What the preview removal takes out of it** (verified at `b5ce2768`):

- `generate-architecture.mjs`: `generatePreviewTiers` (L308-312, reads `tests/preview-suite/tier-manifest.json` at
  L309) and its call `writeJson("preview-tiers.json", ...)` (L416). **Order matters:** if `tests/preview-suite/` goes
  first, the full run throws at L416 *after* writing four maps; the server then says the front-end and RPC maps failed
  at start-up and `npm run smoke` fails. The commit and push paths use `--types-only` and are not hit.
- `src/server.ts`: the `bonsai.arch.previewTiers` tool (L266-280).
- `scripts/smoke-architecture.mjs`: L34 (map name), L56 (tool name), L79-80 (the check).
- `src/architectureMaps.ts`: L6, header wording only.
- `scripts/architecture_maps.py` L44 and L6, `tests/test_architecture_maps.py` (loops over `MAP_FILES`), `docs/mcp-setup.md:194,198,216`,
  `packages/bonsai-mcp/README.md:23,33`, `docs/testing-automated.md:29`.
- The knowledge pack's `workflows/tier-qa.md` (about the in-repo preview suite: names `tests/preview-suite/*` and the
  `pnpm run test:preview:tier` commands) goes whole. `workflows/decky-preview.md` and the `preview.*` tool names in
  `server.ts:29-38`, `knowledge.ts:205,234`, `knowledge/policies/decky-plugin-studio.md` and `platform-contract.md`
  describe the **external** Decky Plugin Studio. **They stay** when the in-repo tool goes. Whether `decky-preview.md`
  itself should stay is a question for the preview reviewer: the maintainer's note says the preview "never got past its
  loading screen".

**Unused or never run, in the server:**

| What | Where | Note |
|---|---|---|
| `env-vars.json`, the map | written by `generate-architecture.mjs` (`generateEnvVars`, `writeJson` at L417); listed in `architecture_maps.py:45` and `smoke-architecture.mjs` | **Nothing reads it:** no tool in `server.ts` serves it and no script opens it. Safe to drop with its generator |
| `py-import-graph.json`, the map | `py_import_graph.py`, run at server start-up | Only the ratchet and phase 2 read it (§ 1.3). Drop with them |
| `bonsai.arch.hotspots` tool | `server.ts:242-264` | Reads `hotspots.json` and `test-inventory.json`. Described in `docs/mcp-setup.md:197` and `docs/testing-automated.md:55`. Stays; does the work its docs say |
| `getPersona` (knowledge.ts L156-158), `parseFrontmatter` export (L35), `mcpPackageRoot` (paths.ts L36), `architectureBuildProblems` (architectureMaps.ts L67), `createServer` (server.ts L64) | | The records call these unused exports. The last four are used inside their own file: harmless. `getPersona` has no caller anywhere. A low-value tidy |
| The `autoInjected` option of `formatSessionBootstrap` (knowledge.ts L217, L224-226) | | No caller passes it; the comment says a Cursor hook shares it, and no such hook exists in the repo. Cursor is being retired |
| `meta.title` (knowledge.ts L48, L79) | | Written, never read |
| `"refactor_helpers.py"` entry (generate-architecture.mjs L96) | | Names a file that does not exist; the line is silently dropped (L110-111) |
| `bonsai.report.archive` tool | `server.ts:282-325`; `docs/agents/foss-advocate.md:72`, `docs/agents/security-auditor.md:63` tell the personas to use it | Appends to `docs/audit/subagent-reports.md`, which does not exist now (the tool creates it on first use). Works as written |
| `knowledge/personas/refactor-specialist.md` | not in my records | May go with the refactor rounds; for the session to look at |

---

## 3. Hooks and CI

### 3.1 Claude hooks (`.claude/settings.json` and `.claude/hooks/*`)

`.claude/settings.json` wires five hooks. None of them reads or writes the architecture maps, so step 0's change
touched none of them. The five `cleanup-*` helper files under `.claude/agents/` and `docs/agents/clean-up-helpers.md`
retire with plan 86 at step 7: noted, nothing more.

| Hook | Fires on | What it runs | Test | Stale or loose |
|---|---|---|---|---|
| `model-routing-check.py` | every prompt; every subagent start (wired twice, `settings.json:8,20`) | Adds the plain-language rule; on a fix or lane prompt, adds the routing table | none | The table (line 42) names Haiku 5.5 high for mechanical one-star fixes, and (line 50) "Haiku 4.5 on trial" for read-only lookups. These are two different jobs, so it is not a clash, but whether the Haiku 4.5 trial is still the plan after the move to 5.5 is for the maintainer. The table has no row for the plan 86 helper roles: fine, they retire |
| `bookkeeper-guard.py` | Edit, Write, MultiEdit, NotebookEdit | Refuses a Fable edit to roadmap, testing, changelog or a test file | none | **Stale wording the session reads:** the docstring (`:5`) and the refusal text (`:106`) say the bookkeeper runs on "Sonnet 5 high"; the routing table says Sonnet 5.5 medium since 2026-09-28 |
| `no-push.py` | Bash | Refuses `git push` unless `BONSAI_ALLOW_PUSH=1` | **none** | **The guard that holds this whole plan's "nothing pushed" rule has no test.** `tests/test_spawn_line.py` is the only hook test. A small test (a push is refused; a `git log` is allowed; the switch lets it through) would follow the repo's own lesson "prove a guard by breaking it" |
| `read-range.py` | Read | A reminder (never a block) when a file over 600 lines is read whole | none | None |
| `spawn-line.py` | Agent, Workflow | Stops new lanes when five hours cost too much, weighted by model | `tests/test_spawn_line.py` (loads it by path, `:31-34`) | Docstring `:6` still says "phase 0 of the refactor-round-two plan"; line 8 already carries the plan 86 weights. Cosmetic |

### 3.2 Git hooks (`.githooks/*`, enabled by `scripts/ensure-git-hooks.mjs` through `package.json`'s `prepare`)

| Hook | Runs | Notes |
|---|---|---|
| `pre-commit` | `node packages/bonsai-mcp/scripts/sync-architecture-for-commit.mjs` | Rewrites and stages only `src/types/rpcMethods.ts`. Up to date with step 0 (the comment says so) |
| `pre-push` | `node packages/bonsai-mcp/scripts/validate-knowledge.mjs --check-generated` | Fails when `rpcMethods.ts` no longer matches `main.py` or a knowledge file's front matter is bad. Up to date |

### 3.3 Workflows (`.github/workflows/*`)

| Workflow | Fires on | Runs | Notes |
|---|---|---|---|
| `tests.yml` | push or pull request that changes more than documents | type check, `pnpm test`, `pnpm test:py`, `pnpm test:focus` | Blocking since 2026-08-26. **It does not run `verify.py`, the header check, the closed-rows check or the contents-list check:** those run only in a session. This is not new, and the plan's "keep these checks" does not change it. The comments hold stale counts ("593 tests" line 5, "834" line 6, "1,427" line 123); cosmetic. The vitest run is not affected by the folder moves (`vitest.config.ts` collects `src/**/*.test.{ts,tsx}`) |
| `validate-mcp.yml` | push or pull request touching `packages/bonsai-mcp/**`, `main.py` or `rpcMethods.ts` | `npm ci`, `npm run validate -- --check-generated`, `npm run build` in the tool server folder | Header already says the maps are not saved. No smoke run (matches the smoke script's own header). After the preview removal nothing in it changes |
| `build-plugin-zip.yml` | a `v*` tag, a push to `main` that changes `plugin.json`, or by hand | build, `scripts/stage_zip_extras.py`, `scripts/verify-decky-plugin-zip.sh`, publish a release | Nothing stale. Reads `plugin.json:47`. The release build needs `NOTICE` and `data/` staged: those paths must not move without editing `stage_zip_extras.py` |

**Nothing in the three workflows is stale since step 0.** Step 1's moves did not change a path any of them uses.

---

## 4. The shared test setup (plan 86 § 6 step 5)

### 4.1 What is true today

- `vitest.config.ts` already loads `src/test-harness/setup.ts` for **every** test. That file already does
  `vi.mock("@decky/ui", async () => ({ ...(await import("./fakeDeckyUi")) }))`, mocks `@decky/api`, installs a
  `ResizeObserver` and a `SteamClient`, and clears the fakes after each test (`setup.ts:19-22` for the UI mock).
- `git grep -l 'vi.mock("@decky/ui"' -- src | wc -l` is **189**. Two of the 189 are comments inside the kit files
  (`src/components/earlierListNavStub.tsx`, `src/features/search-tab/searchTabTestKit.tsx`, which write the
  text `vi.mock("@decky/ui", ...)` in a comment). One is `setup.ts` itself. So **186 test files** write their own
  mock. (I read every mock block by script; the blocks add up to about 1,710 lines.)
- The plan's wording says 124 files; today it is 186.

### 4.2 The groups, by what each mock does

| Group | Files | Block lines | What the mock does | What would replace it |
|---|---|---|---|---|
| **A. Plain** | **60** | 63 | Returns `fakeDeckyUi` unchanged: the same thing `setup.ts` already does for every test | **Delete the line.** No new code. Prove by running the 60 files |
| **B. Plain plus a `showModal` that records the box it was given** | 31 | 272 | `{ ...stubs, showModal: (el) => { hoisted.box = el; return { Close, Update }; } }`; the recorded thing varies (`box`, `boxes`, `modal`, `modals`, `shown`) | One helper, `captureShownModals()`, used in `beforeEach` |
| **C. Plain plus the Steam ring Focusable** | 24 | 238 | `Focusable: SteamRingFocusable` (from `steamRing.tsx`), sometimes with `TextField` and a `showModal` capture too | One helper, `useSteamRing()`; `showModal` through B's helper |
| **D. Through a kit that already exists** | 10 | 49 | `deckyUiForSearch()` (`searchTabTestKit.tsx`, 6 files) or `deckyUiWithNavNodes()` (`earlierListNavStub.tsx`, 4 files); already one line each, with one variant in `SearchTab` that wraps the kit | Keep. The two kits move into `src/test-harness/` or stay with their feature (step 4 decides); the nav-node one can be folded into F2 |
| **E. Through the About kit** | 3 | 25 | `aboutDeckyUi.tsx`'s `KeepNavFocusable`, `KeepNavButton`, `StopDropdown` | Keep as is: its header says the shared fakes throw away the move handlers on purpose |
| **F1. Plain plus a Focusable or Button that records its props** | 24 | | `CapturingFocusable` or `CapturingButton`: wrap the fake and push each render's props onto a list | One helper pair, `captureFocusableProps()`, `captureButtonProps()` |
| **F2. Plain plus a Focusable that keeps the move handlers and gives `navRef` a TakeFocus** | 18 | | A hand-written `NavFocusable` (near copies of each other and of `SteamRingFocusable`) | One helper: `useNavKeepingFocusable()`, or use C's `useSteamRing()` where it is the same |
| **F3. Plain plus a confirm box or modal root stand-in** | 9 | | `CapturingConfirmModal` and `CapturingModalRoot` | `captureConfirmModalProps()` |
| **F4. Plain plus a drawn TextField or ToggleField shape** | 4 | | A TextField built as a layout div around an input; a ToggleField | Leave: each is built for one test's question. (F1 to F4 total 1,044 lines for 55 files, roughly 960 of them in F1 to F3) |
| **G. Hand-written, no `fakeDeckyUi` at all** | 3 | 17 | Only `ConfirmModal`/`showModal`, or only `Navigation` and `QuickAccessTab` | Leave: they test code that needs nothing else |

**The files, by group** (paths from `src/`):

**A. Plain, delete the line (60):** `components/DrgGlossaryTermChip.placement.test.tsx`, `components/DrgGlossaryTermChip.test.tsx`, `components/KnowledgeBaseSection.icons.test.tsx`, `components/KnowledgeBaseSection.largeText.test.tsx`, `components/MainTabAskModeMenuPopover.test.tsx`, `components/MainTabBonsaiAiMarkdownChunk.test.tsx`, `components/MainTabChatTranscript.answerFinishStill.test.tsx`, `components/MainTabChatTranscript.closeMatchLine.test.tsx`, `components/MainTabChatTranscript.collapseKeepsRing.test.tsx`, `components/MainTabChatTranscript.coverRevealHandle.test.tsx`, `components/MainTabChatTranscript.cutSpoilerCover.test.tsx`, `components/MainTabChatTranscript.diagnostics.test.tsx`, `components/MainTabChatTranscript.earlierPill.test.tsx`, `components/MainTabChatTranscript.emptySlotPreview.test.tsx`, `components/MainTabChatTranscript.finishKeepsHeaderRing.test.tsx`, `components/MainTabChatTranscript.kbNotesBlock.test.tsx`, `components/MainTabChatTranscript.kbNotesGap.test.tsx`, `components/MainTabChatTranscript.liveConsent.test.tsx`, `components/MainTabChatTranscript.permHintNavRegistration.test.tsx`, `components/MainTabChatTranscript.permissionHintFocus.test.ts`, `components/MainTabChatTranscript.questionFade.test.tsx`, `components/MainTabChatTranscript.readAloud.test.tsx`, `components/MainTabChatTranscript.reasoningFold.test.tsx`, `components/MainTabChatTranscript.reasoningLiveBlock.test.tsx`, `components/MainTabChatTranscript.replyBlock.test.tsx`, `components/MainTabChatTranscript.spoilerCredits.test.tsx`, `components/MainTabChatTranscript.spoilerStaysOpen.test.tsx`, `components/MainTabChatTranscript.stoppedNotice.test.tsx`, `components/MainTabChatTranscript.strategyPanels.test.tsx`, `components/MainTabChatTranscript.streamFinishKeepsRing.test.tsx`, `components/MainTabChatTranscript.troubleshootHintDismiss.test.tsx`, `components/MainTabChatTranscript.turnTitle.test.tsx`, `components/MainTabChatTranscript.vacRowAfterSwitch.test.tsx`, `components/MainTabUnifiedAskBar.cornerRing.test.tsx`, `components/MainTabUnifiedAskBar.hint.test.tsx`, `components/MainTabUnifiedAskBar.noSettingsCard.test.tsx`, `components/MainTabUnifiedAskBar.stopRing.test.tsx`, `components/MainTabUnifiedAskBar.test.tsx`, `components/PermissionDenyAction.test.tsx`, `components/ReplyCopyButton.test.tsx`, `components/StreamMarkdownPieces.test.tsx`, `components/textSizeEverywhere.test.tsx`, `features/chat-slots/ChatSlotRenameModal.test.tsx`, `features/chat-sum-up/SessionSumUpSection.reveal.test.tsx`, `features/chat-title/nameRowSpill.test.tsx`, `features/chat-title/noSavedChatsRow.test.tsx`, `features/chat-title/useChatTitlePublisher.test.tsx`, `features/chat-title/useChatTriggerSwitch.test.tsx`, `features/preset-carousel/presetRowFocusNav.upFromChips.test.tsx`, `features/stream-scramble/ScrambledAnswerText.test.tsx`, `hooks/useReplyFeedbackChips.remount.test.tsx`, `hooks/useVoiceTranscription.test.ts`, `utils/buildReplyActionsElement.ratingKeepsRing.test.tsx`, `utils/buildReplyActionsElement.revealChips.test.tsx`, `utils/buildReplyActionsElement.test.tsx`, `utils/emptyLabelSpoilerMark.test.tsx`, `utils/gluedSpoilerOpener.test.tsx`, `utils/oneLineSpoilerBlock.test.tsx`, `utils/questionBubbleFit.test.tsx`, `utils/revealOpenedDetails.test.tsx`.
(Run step 5 **after** step 3: the two `DrgGlossaryTermChip` tests, `MainTabChatTranscript.readAloud` and `MainTabChatTranscript.vacRowAfterSwitch` belong to removed features and may already be gone or changed.)

**B. showModal capture (31):** `components/KnowledgeBaseSection.downloadSwitch.test.tsx`, `components/KnowledgeBaseSection.installNomicOffer.test.tsx`, `components/KnowledgeBaseSection.remountDownload.test.tsx`, `components/KnowledgeBaseSection.removeBox.test.tsx`, `components/KnowledgeBaseSection.removeSwitch.test.tsx`, `components/KnowledgeBaseSection.removeSwitchHook.test.tsx`, `components/KnowledgeBaseSection.returnFocus.test.tsx`, `components/OllamaWhereAiRunsSection.downloadsOffUpdate.test.tsx`, `components/OllamaWhereAiRunsSection.inPlaceSetup.test.tsx`, `components/OllamaWhereAiRunsSection.starterOffer.test.tsx`, `components/PullModelsModal.removeBoxReturn.test.tsx`, `components/PullModelsModal.removeKeepsPcName.test.tsx`, `components/SettingsTab.clearAllBack.test.tsx`, `features/downloads/downloadNotice.test.tsx`, `features/plugin-shell/useDesktopNoteSaveModal.olderChat.test.tsx`, `features/voice/voiceClearAfterStop.test.tsx`, `features/voice/voiceFinishAtStop.test.tsx`, `features/voice/voiceStartGameFlag.test.tsx`, `features/voice/voiceStartingFeedback.test.tsx`, `hooks/setupAndPullBoxWording.test.tsx`, `hooks/useDisclaimerAndLocalRuntimeGates.firstOpen.test.tsx`, `hooks/useDisclaimerAndLocalRuntimeGates.saveFirst.test.tsx`, `hooks/useDisclaimerAndLocalRuntimeGates.wordCount.test.tsx`, `hooks/useLocalOllamaSetupFlow.inPlace.test.tsx`, `hooks/useMdnsOllamaDiscovery.wording.test.tsx`, `hooks/usePullModelDeleteConfirm.safeFirst.test.tsx`, `hooks/usePullModelSubmitSelected.tier2Box.test.tsx`, `hooks/usePullModelTier2Confirm.safeFirst.test.tsx`, `hooks/usePullModelToggleSelection.safeFirst.test.tsx`, `hooks/useThinkingNoticeGate.test.tsx`, `index.helpChip.test.tsx`.

**C. Steam ring Focusable (24):** `components/DeveloperTab.foldedWalk.test.tsx`, `components/OllamaTab.foldedWalk.test.tsx`, `components/PullModelsFiltersColumn.test.tsx`, `components/SettingsTab.folded.test.tsx`, `components/SettingsTab.foldedWalk.test.tsx`, `components/SettingsTab.textSizeWalk.test.tsx`, `components/SettingsTabScreenshotHeading.test.tsx`, `components/SettingsTabUiScaleHeading.test.tsx`, `components/SettingsTabUiScaleSection.greyedApply.test.tsx`, `features/chat-slots/afterDeleteLastChat.test.tsx`, `features/chat-slots/afterDeleteRebuild.test.tsx`, `features/chat-title/chatsMenuBoxReturn.test.tsx`, `features/chat-title/nameRowIcons.test.tsx`, `features/chat-title/topStrip.test.tsx`, `features/chat-title/topStripHeightLock.test.tsx`, `features/folded-tabs/FoldAllButton.test.tsx`, `features/folded-tabs/FoldedSection.test.tsx`, `features/plugin-shell/TabBodyFocusRoot.heading.test.tsx`, `features/plugin-shell/TabBodyFocusRoot.walk.test.tsx`, `features/user-notes/NoteOfferCard.test.tsx`, `features/user-notes/NotesReadLine.test.tsx`, `features/user-notes/UserNotes.transcript.test.tsx`, `features/user-notes/UserNotes.walk.test.tsx`, `features/user-notes/UserNotesSheet.test.tsx`. (Two UI-scale tests here go with that removal.)

**D. Kit users (10):** `features/search-tab/SearchTab.back.test.tsx`, `SearchTab.jump.test.tsx`, `SearchTab.ringReturn.test.tsx`, `SearchTab.test.tsx`, `SearchTab.unmount.test.tsx`, `SearchTab.walk.test.tsx`; `components/MainTabChatTranscript.earlierByDay.test.tsx`, `MainTabChatTranscript.olderTurnDownToNewer.test.tsx`, `MainTabChatTranscript.searchJump.test.tsx`, `MainTabChatTranscript.streamingSectionStops.test.tsx`.

**E. About kit (3):** `components/AboutLinks.test.tsx`, `components/AboutTab.test.tsx`, `components/AboutTab.walk.test.tsx`.

**F1. Capturing Focusable or Button props (24):** `components/ContextChipLadder.allChips.test.tsx`, `.deckTry2.test.tsx`, `.gridWalk.test.tsx`, `.reveal.test.tsx`, `.ringWalk.test.tsx`, `.stillRow.test.tsx`, `ContextChipLadder.test.tsx`; `components/MainTabChatTranscript.detailsTabs.test.tsx`, `.kbNotesSideways.test.tsx`, `.sessionLadderExit.test.tsx`; `components/MainTabUnifiedAskBar.askUp.test.tsx`, `.boxDown.test.tsx`, `.leftHoldsStill.test.tsx`; `components/PullModelsModal.customTagCancel.test.tsx`, `.customTagChip.test.tsx`, `.gamepadOK.test.tsx`, `.listEnds.test.tsx`, `.listScroll.test.tsx`, `.tryOrder.test.tsx`; `components/PullModelsStarterSetChip.test.tsx`, `components/SessionContextStrip.test.tsx`, `features/chat-sum-up/SessionSumUpSection.deckPlace.test.tsx`, `features/chat-sum-up/SessionTitleOffer.test.tsx`, `features/plugin-shell/TabIndicatorBar.test.tsx`.

**F2. Nav-keeping Focusable (18):** `components/KnowledgeBaseSection.pullHint.test.tsx`, `components/MainTab.askStrip.deck.test.tsx`, `components/MainTab.tabBarDownEarlier.test.tsx`, `components/MainTab.tabBarDownRetry.test.tsx`, `components/MainTabChatTranscript.ratingRowWalk.test.tsx`, `.reasoningBlockStop.test.tsx`, `.retryNotAStop.test.tsx`, `.upWalk.test.tsx`, `components/MainTabEmptyChatHelpChip.test.tsx`, `components/MainTabInjectChipFocus.test.tsx`, `components/OllamaWhereAiRunsSection.cancelRing.test.tsx`, `.walk.test.tsx`, `components/SettingsTab.accentMenuRing.test.tsx`, `features/chat-title/ChatTitleView.test.tsx`, `features/chat-title/ChatsMenu.test.tsx`, `features/chat-title/chatsMenuNewChatAtTen.test.tsx`, `features/details-slot/DetailsSlot.deck.test.tsx`, `utils/buildReasoningFoldElement.walk.test.tsx`.

**F3. Modal stand-in (9):** `components/CancelFirstConfirmModal.test.tsx`, `components/KnowledgeBaseSection.storagePicker.test.tsx`, `components/OllamaModelsHubModal.cancelRestores.test.tsx`, `.renderLoop.test.tsx`, `.returnFocus.test.tsx`, `OllamaModelsHubModal.test.tsx`, `components/SettingsTab.clearBoxes.test.tsx`, `features/chat-slots/useChatSlotDeleteConfirm.test.tsx`, `features/plugin-shell/useOllamaModelsHubModal.openOnce.test.tsx`.

**F4. Drawn TextField or ToggleField (4):** `components/MainTabUnifiedAskBar.boxRing.test.tsx`, `components/steamWordsScaled.test.tsx`, `components/textSizeSurfaces.test.tsx`, `features/folded-tabs/DenseRow.test.tsx`.

**G. Hand-written (3):** `hooks/usePullModelTier2Wording.test.tsx`, `hooks/useSteamSettingsSearch.openPage.test.ts`, `utils/bonsaiReplySurface.test.ts`.

### 4.3 The proposal

**Use the setup file that already exists.** `src/test-harness/setup.ts` stays the one shared setup. Do it in three
layers, smallest risk first, each its own commit and each proved on its own files:

1. **Group A: delete the 60 lines** (`vi.mock("@decky/ui", ...)` and any import only that line used). No new code; the
   global mock is the same function. Saves 63 lines. **Prove by:** running those 60 files; then break it on purpose
   (change one export of `fakeDeckyUi.tsx` and see the files fail).
2. **Groups B, C, F1, F2, F3: a small `deckyUiOverrides` registry** in `src/test-harness/`, consulted at call time by
   `fakeDeckyUi.tsx`'s `showModal`, `Focusable`, `Button`, `ConfirmModal` and `ModalRoot`, and reset in `setup.ts`'s
   `afterEach`. Helpers set it from `beforeEach`: `captureShownModals()`, `captureFocusableProps()`,
   `captureButtonProps()`, `captureConfirmModalProps()`, `useSteamRing()`, `useNavKeepingFocusable()`. The per-file
   `vi.mock` and its `hoisted` holder go; the capture lists live in the registry (reset after each test). About 106
   files, about 1,470 block lines before, about 250 after (the helpers plus a line per test).
   **Risks to watch:** a swapped-in component must keep the same identity from render to render, or a ring walk that
   holds an element loses it; tests that read the captured list across a re-mount; and the 24 C files assert on
   `Focusable`'s real behaviour, so their results must not change. **Prove by:** running the group's files before and
   after, and by making each helper return nothing and checking its group fails.
   The lower-risk fallback: keep one `vi.mock("@decky/ui", () => deckyUiWith({ ... }))` line per file, built from the
   same helpers. About the same saving; it leaves 106 one-line mocks and avoids the render-time swap.
3. **Leave** D, E, F4 and G (20 files, about 130 lines of mock): each is built for one question and already short.

**Honest size:** about 1,710 lines of mock blocks in 186 files, of which about 1,000 to 1,400 go (A 63, B and C about 510,
F1 to F3 about 960; less the new helper code, about 150). The plan's estimate for the whole of step 5 (tests 107,000 to
87,000-93,000 lines) comes mostly from merging test files, not from this.

**A second shared piece the same step could take: the Deck pane numbers.** 17 files each write `const PANE_TOP = ...`
by hand (`24`, `88` or `128`): `components/AboutTab.walk.test.tsx`, `ContextChipLadder.reveal.test.tsx`,
`ContextChipLadder.stillRow.test.tsx`, `DrgGlossaryTermChip.placement.test.tsx`, `MainTab.askStrip.deck.test.tsx`,
`MainTabChatTranscript.streamingSectionStops.test.tsx`, `earlierListTestKit.tsx`,
`features/chat-sum-up/SessionSumUpSection.deckPlace.test.tsx`, `.reveal.test.tsx`,
`features/folded-tabs/TabHelpStrip.test.tsx`, `foldAllCover.test.ts`, `features/search-tab/SearchTab.walk.test.tsx`,
`utils/answerBubbleNavigation.ringOnBubble.test.ts`, `.tallUpFromWord.test.ts`,
`utils/buildReplyActionsElement.revealChips.test.tsx`, and in the harness `foldedTabWalk.tsx` and `tabBodyWalk.tsx`.
`deckAnswerWalk.ts` exports `PANE_TOP = 88` and only `DetailsSlot.deck.test.tsx` and ten answer-walk tests import it.
The 116 px and 80 px Steam paddings are also constants in three harness files. One `deckPane.ts` would give these one
home; the screen and test-merge reviewers decide.

### 4.4 The `src/test-harness/` files and their users

All 19 stay in `src/test-harness/` (the folder is shared test setup, not a feature). Counts from `git grep -l` over
`src`, `tests`, `scripts` and `vitest.config.ts`, excluding the file itself.

| File | Users | Notes |
|---|---|---|
| `setup.ts` | `vitest.config.ts:6` (every test) | The shared setup; see § 4.1. Not coverage-counted (the baseline excludes `src/test-harness/**`) |
| `fakeDeckyUi.tsx` | 178 files under `src` name it by path; imported in `setup.ts`, `earlierListNavStub.tsx:28`, `searchTabTestKit.tsx:18` | The fake Decky screen parts |
| `fakeDeckyRpc.ts` (+ `.test.ts`, 4 checks) | 82 files (79 tests, `setup.ts`, `kbSwitchWorld.tsx`, its own test) | Read-aloud entries to drop with that removal: method names L47-49, canned answers L202-210 (`start_voice_read_aloud`, `stop_voice_read_aloud`, `get_voice_read_aloud_status`). `fetch_ollama_catalog_metadata` (L152) stays; `fetch_pull_model_catalog` (L153-173) is not traced (unknown whether the weekly overlay sits behind it) |
| `rpcFixtures.ts` | 28 | Default settings. Writes a setting (`ollama_local_on_deck: false`, L9) |
| `steamRing.tsx` | 31 | Steam's focus ring stand-in; the base of group C |
| `aboutDeckyUi.tsx` | 3 (`AboutLinks.test.tsx`, `AboutTab.test.tsx`, `AboutTab.walk.test.tsx`) | `columnWhereUnset` is passed by `AboutTab.walk.test.tsx:168` (not unused). Has its own D-pad step walker (L137-208) |
| `confirmBoxProbe.tsx` | 14 | Presses the two-button confirm box |
| `deckAnswerWalk.ts` | 30 importers (26 answer-walk and 4 other tests; plus `deckChipLadderPane.ts`) | **Names the glossary:** import L28, the `word` helper L238-247, `word` in the returned object L321, the registry reset L330. `answerBubbleNavigation.ringFollowsScroll.test.ts` (L36-151), `wordMirror.test.ts:75`, `tallUpFromWord.test.ts:42` and `tallSectionLift.test.ts:98` call `word`: removing it changes those tests. Seven `.claude/agents/bugfix-lane*.md` files (line 39) and `docs/lessons-learned.md:536` name its path; a move edits all eight |
| `deckChipLadderPane.ts` | 2 (`ContextChipLadder.deckTry2`, `.gridWalk`) | |
| `deckyQuickAccessLayout.tsx` | 3 (`topStrip.test.tsx`, `topStripHeightLock.test.tsx`, `index.topStrip.test.tsx`) | |
| `chipRowSimulation.tsx` | 1 (`MainTabPresetAnimatedChips.simulation.test.tsx`) | One user; could follow it into `preset-carousel` in step 4. Stays in the harness folder in the map |
| `foldAllCover.ts` | 4 | |
| `foldedTabWalk.tsx` | 4 (the three `*Tab.foldedWalk` tests; `foldedTabWalk` imports `tabBodyWalk`'s type) | Carries its own copy of the Steam scroll rules |
| `pullModelsListLayout.ts` | 3 | |
| `settingsFoldOpen.ts` | 15 | Two of the 15 are UI-scale tests (`SettingsTabUiScaleHeading`, `SettingsTabUiScaleHidden`) that go with that removal; the helper stays |
| `settledFontSize.ts` | 6 | UI-scale lines to drop: L7 and L9 (comments), L102 (the `ui` branch of the pattern). The text-scale branch stays |
| `tabBodyDeckGeometry.ts` | 3 (`tabBodyWalk.tsx`, two `TabBodyFocusRoot` tests) | Measured Deck positions. **L75 is the "Steam ban lookup" stop** (`[384, 22, ...]`): removing it changes a list the Deck measured, and the Deck has to measure the tab again |
| `tabBodyWalk.tsx` | 8 (6 tests, `foldedTabWalk.tsx`, `tabBodyDeckGeometry.ts`) | `steamScrolls` (L215-226) and `nativeScroll` (L228-235) are the same rule written twice |
| **`renderWithHarness.tsx`** | **none** | **Confirmed unused:** `git grep renderWithHarness` finds only the file itself (code, tests, scripts, `.claude`). One export, four lines. **Delete.** (Also not named in `AGENTS.md`, `docs/`, the changelog or `packages/`) |

Other harness-like files outside this folder (not in my records, listed so step 4 does not lose them):
`src/components/earlierListNavStub.tsx`, `src/components/earlierListTestKit.tsx`, `src/features/chat-slots/afterBoxHarness.tsx`,
`src/features/chat-title/chatTitleTestFixtures.tsx`, `src/features/search-tab/searchTabTestKit.tsx`,
`src/test-harness/kbSwitchWorld.tsx` (2 users).

---

## 5. Back-end test support files

| File | Users | Is it a shared stand-in step 5 builds on? |
|---|---|---|
| `tests/backend_module_stubs.py` | **69 test files** (`git grep -l backend_module_stubs -- tests`, including `tests/plugin_settings_file_harness.py:17` and `tests/user_notes_plugin_harness.py`) | **Yes, the main one.** Installs plain `fcntl`, `decky` and `pwd` stand-ins (idempotent) |
| `tests/plugin_settings_file_harness.py` | 12 test files | Yes: a real plugin object over a throwaway settings file, plus a write and a read helper |
| `tests/fake_ollama_stream.py` | 7 test files | Yes: a streamed Ollama answer. The `_Rsp` classes inside `test_ollama_service.py` (lines 58, 93, 713, 819, 904) and the reader in `test_ollama_reply_limits.py:62` are the slow, broken or stopped variants its own header says it does not cover: **keep** |
| `tests/user_notes_plugin_harness.py` | 2 | Not in my records. Same kind |
| `tests/build_rag_db_loader.py`, `corpus_build_support.py`, `kb_keyword_corpus_support.py`, `rag_corpus_seed_fixtures.py`, `tests/fixtures/` | | The knowledge-library reviewer's |
| `scripts/run_python_tests.py` | | Already installs a `pwd` stand-in for the **whole** run (lines 14 to 21): the per-file `install_pwd_stub()` and `pwd` blocks matter only when one file is run alone. There is no `conftest.py` and no `tests/__init__.py` (it uses `unittest discover`), so a per-file import of the helper is the only way to cover a lone run: keep that pattern |

**What step 5 can still take** (checked file by file; the record's "twelve files write the same stubs by hand" is
partly wrong, see § 8):

- **Five files write a block identical to the shared one** and should call `install_fcntl_and_decky_stubs()`:
  `test_destructive_advice_wiring.py:11-20`, `test_game_ai_request.py:18-27`, `test_background_partial_state.py:~17-28`,
  `test_clear_plugin_data_voice_reset.py:~25-36`, `test_token_stream_request_id_wiring.py:~18-38`.
- **Three are deliberate variants** and stay: `test_chat_slot_ownership.py:19` (its own settings folder),
  `test_preload_ask_model_boot.py:27` (adds `HOME`), `test_ollama_ask_service.py:15` (a logger only, no folder).
- **Four write a `pwd` copy the helper already has:** `test_chat_for_request.py:19-23` and `test_chat_slot_limit.py:19-23`
  write a `pwd` stand-in (replace with `install_pwd_stub()`); `test_terse_mode_prompt.py:22` and
  `test_terse_bare_menu.py:20` set a bare `decky` fallback after the helper has already installed it: the fallback is
  dead. All four are mechanical.
- **The helper's header is out of date:** it says the block was lifted out of "thirteen" files and three more; the
  count above is what is left.

---

## 6. Root config files and `tests/contracts/`

| File | What it is | Who reads it | What a later move or removal must change |
|---|---|---|---|
| `package.json` | Node manifest: build, test and helper commands | pnpm, CI (`tests.yml`, `build-plugin-zip.yml`), `scripts/bump-version.mjs` (via the sync scripts), `tests/test_verify_decky_plugin_zip.py` and `scripts/third_party_licenses.test.mjs` write fixtures | Preview removal: lines 16-18 (`test:preview`, `test:preview:tier`, `build:preview`). If the ratchet retires: devDependencies `jscpd`, `knip` can go. **Keep `@vitest/coverage-v8`** (step 5 proof). `ts-morph` stays until the move tools and `shell_seam`/`seam_contract`/`remove_dead_exports` all retire. Unproven drops: `decky-frontend-lib`, `@types/webpack`. Version is 0.5.0: the script rewrites it |
| `plugin.json` | The Decky plugin manifest (name, version, main, icon) | the Decky loader; `build-plugin-zip.yml:47`; `build.ps1:86,131`, `build.sh:179,208`; `bump-version.mjs:12`; `sync-version-from-plugin.mjs:34`; `move_backend_file.py:642`; `verify-decky-plugin-zip.sh:26,43`; the tool server's `paths.ts:9` (it finds the repo root by this file) | Never moves. A release must keep its version equal to `package.json` and `src/pluginVersion.ts` (generated) |
| `pnpm-workspace.yaml` | Says the repo is one package and lets esbuild's install step run | pnpm on every install (`tests.yml:86`) | Nothing |
| `rollup.config.js` | The front-end build: loads the Decky preset | `rollup -c` (`package.json:9,11`), `build-plugin-zip.yml` through `pnpm run build` | Nothing |
| `tsconfig.json` | Strict checks over `src` | CI type check (`tests.yml:95`), `move_screen_file.mjs:295`, `remove_dead_exports.mjs:40`, `seam_contract.mjs:29`, `shell_seam.mjs:24` | Line 23 excludes `src/v0-drafts`, a folder that does not exist (`.gitignore:98` and a changelog line confirm it was removed long ago): safe to drop. Step 4's folders stay under `src`, so `include` is unchanged |
| `vitest.config.ts` | jsdom, the setup file, `src/**/*.test.{ts,tsx}`, 20 s timeout | `vitest run` (`package.json:13`), CI | Step 4's folder moves need no change (it matches by pattern). Step 5 may add coverage settings; the saved baseline was measured with `@vitest/coverage-v8` and `src/test-harness/**` excluded |
| `.mcp.json`, `mcp.json` | The tool-server entries: Claude Code reads the dotted one (`.mcp.json:2` says so), editors such as Cursor and the Decky Plugin Studio extension read the other (`docs/mcp-setup.md:37-39,137-139`) | `scripts/deck_overnight_run.mjs:55` reads `.mcp.json` | They differ in shape (absolute `c:/Users/still/...` paths vs `${workspaceFolder}`) and nothing checks that they stay in step. A move of `packages/bonsai-mcp/dist/index.js` edits both. If Cursor support is retired, `mcp.json` can go: unknown whether the Decky Plugin Studio extension still needs it |
| `.decky/preview.json` | One key, `panelRootSelector` | nobody in this repo | Goes with the preview removal (see § 1.5; unknown whether the external tool reads it) |

**`tests/contracts/`** holds four fixtures that **both** languages test against, so a table kept by hand in Python and
in TypeScript cannot drift:

| Fixture | Python reader | Screen reader | Removal lines (for the removal lanes) |
|---|---|---|---|
| `settings-defaults.json` | `tests/test_settings_contract.py:18` | `src/data/bonsaiSettingsContract.test.ts:20`, `src/hooks/usePluginSettings.readBack.test.ts:30`; `scripts/phase2_map.py:55,664` (retiring) | Ban lookup: L15 `"steam_web_api": false` (and the comma on L14, or the file stops parsing), L46 `"steam_web_api_key": ""`. UI scale: L55-56 `"ui_scale_auto_enabled"`, `"ui_scale_manual_profile"` |
| `settings-hostile-inputs.json` | `tests/test_settings_hostile_contract.py:19` | `src/data/bonsaiSettingsHostileContract.test.ts:19` | Ban lookup: L218 (`"steam_web_api": false` in the expected list, the case stays), L271-279 (the whole "api key rejects a non-string" case) |
| `spoiler-title-profiles.json` | `tests/test_spoiler_title_profiles_contract.py:25` | `src/data/spoilerTitleProfilesContract.test.ts:26` | none |
| `ask-hook-order.json` | `tests/test_ask_hook_order.py:23` | none (a Python test reads the screen file) | none. Records the order of the Ask hook's 82 hook calls: **step 6c's untangling edits the Ask hook; this file and its test change in the same commit** |

Fifteen files name these paths: four test pairs, `tests/contracts/README.md` (lines 11-13 and 56-65 describe UI scale),
and comment mentions in `settings_service.py:463`, `bonsaiSettingsNormalizers.ts:229,451`, `spoilerTitleProfiles.ts:74`,
`tests/test_spoiler_title_profiles.py:82`. **The folder stays at `tests/contracts/`** (step 4 gives it no feature
folder, because both languages read it by path). **Step 6a changes the first two:** "a script makes the Python table,
the screen table, the two shared check files and the plumbing" from one list of settings, so `settings-defaults.json`
and `settings-hostile-inputs.json` become generated outputs and the paths above must keep working or move in the
same commit.

---

## Open questions for the one running the session

1. **Ratchet, carry-over first or retire as written?** (§ 1.4). The size ceilings for `AGENTS.md`, `CLAUDE.md`, the
   roadmap and the testing documents are enforced only here. Decision wanted before step 7: which of the doc ceilings,
   the import-loop check, the two both-ways method checks and the copy-paste check are rewritten smaller and kept.
2. **Do the move tools stay after step 5?** (`check_move_commit.py`, both movers, their config and three tests: about
   2,400 lines.) The plan does not name them in step 7.
3. **Reverse-tunnel scripts and `.decky/preview.json`: does the outside tool still use them?** Settled by reading the
   Decky Plugin Studio repo (`deck.startTunnel`; whether it reads `.decky/preview.json` or sets `DECKY_PREVIEW`).
4. **`scripts/deck_queue.py`:** is the Deck queue still used by anyone? No file names it.
5. **`scripts/setup_ollama.ps1`:** keep and fix (it pulls `llama3`) or retire?
6. **Group B, C and F helpers for the shared test setup** need one run of each group's files to prove (a deliberate
   break per helper). I did not run any test.
7. **`plain_words_check.py`** is the weakest retire case (report only, a person might run it). Keep or retire?
8. **Does `decky-preview.md` (external tool's workflow) stay when the in-repo preview goes?** (preview reviewer)
9. **The hook wording** ("Sonnet 5 high" in `bookkeeper-guard.py:5,106`; "Haiku 4.5 on trial" at
   `model-routing-check.py:50`) is for the maintainer to confirm before anyone edits a hook.
10. **A test for `no-push.py`** is worth adding (not a retirement, not in the plan). Yes or no?

## Records found wrong

Checked about 40 of the 171 records against the code (I did not read the mechanical check files). Wrong or too sure,
with what is true:

- **b83 `.decky/preview.json`, field "new folder":** said "goes away (sure)". The repo's own code does not read it, but
  the external Decky Plugin Studio tool may; "sure" is too strong. Unknown until its repo is read.
- **b87 `scripts/py_import_graph.py`, Surprises:** said the saved map file "exists at this commit". It is **not tracked**
  (`git ls-files packages/bonsai-mcp/knowledge` lists only the two `.md` files in `architecture/`); step 0 already
  stopped saving it. The "plan 86 says maps are saved today" worry is moot.
- **b87 `scripts/ratchet.py`, "twice: ... `docs/archive/51-refactor-round-two.md` (L319, L403)":** true, and it is a
  stale path (step 1 moved that plan to `workshop:archive/`; the strings are runtime messages, which the step 1
  rewrite left alone). Two message strings to fix if the ratchet stays.
- **b91 `tests/backend_module_stubs.py`, field "unused or twice":** said twelve test files "still write the same
  fcntl, decky or pwd stubs by hand". Counting by `ModuleType("fcntl"|"decky"|"pwd")`: 12 files do write one, but only
  **5** are identical to the shared block; **3** are deliberate variants (own folder, extra `HOME`, no folder);
  **2** write a `pwd` copy the helper already has; **2** set a bare `decky` fallback that can never run. § 5 has the list.
- **b90 `src/test-harness/fakeDeckyUi.tsx`, field "tests":** "174 test files import it". By path, 178 files under `src`
  name it (tests plus the kits and `setup.ts`). Close; not a wrong cut.
- **b90 `src/test-harness/deckAnswerWalk.ts`, field "tests":** "29 test files, 4 unidentified". 30 files import it
  (one is `deckChipLadderPane.ts`), so 29 tests plus the harness file: consistent. I could not name the four; unneeded.
- **b84 `.githooks`/`package.json` records on `mcp:validate` and `generate-architecture.mjs`:** checked, right.
- **b85 `scripts/deck_send_ask.py`:** the script's list was wrong (it counted `.claude/agents/deck-driver.md` as a
  document; the helper runs the script by path). Reader caught it; confirmed.
- **b88 `scripts/verify.py`:** the script's "named in" list had five false hits from `response_verify.py`. Confirmed.

No other record I checked was wrong: confirmed correct were `scripts/check_move_commit.py`, `closed_rows_check.py`,
`code_line_count.py`, `comment_only_check.py` (no live caller), `docs_archive.py` (default index missing), `phase2_map.py`
(output path stale), `sync-versions.mjs` (a duplicate), `renderWithHarness.tsx` (no user), `fakeDeckyRpc.ts` (read-aloud
lines), `tabBodyDeckGeometry.ts` L75, `deckAnswerWalk.ts` glossary lines, `settledFontSize.ts`, `tests/test_seam_contracts.py:159`,
the `settings-defaults.json` and `focus-baseline.json` lines, the preview lines in the tool server, `bookkeeper-guard.py`
wording, and `model-routing-check.py` lines 42 and 50.
