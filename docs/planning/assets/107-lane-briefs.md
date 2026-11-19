# Plan 107: the lane briefs

One paragraph per lane. Facts were looked up on 2026-11-19 at tip `28306e896` by four read-only helpers; every
helper re-finds them first (rule 1 of [107-helper-rules.md](107-helper-rules.md)). The session adds to each task text:
the tip hash, the copy's path, the scratch folder, and the commit checks. "Deck pass" is the sentence the Deck check
is written from.

Models are the maintainer's for this plan: Haiku 5.5 high for mechanical one-star fixes, Sonnet 5.5 medium or high
for the rest, Opus 5.5 where a lane says so, Fable 5.2 max for the two hard search bugs.

---

## Wave 1: start at go, no pick needed

### A1 — "Ask anyway" shows it was pressed (★ `[ask]`; Sonnet medium)
- **Files owned:** `src/features/answer/transcript/lowMemoryNotice.ts`, `ChatTranscriptHintRows.tsx`, their tests
  (`MainTabChatTranscript.lowMemoryRow.test.tsx`).
- **Cause:** the "already pressed" flag is a plain module variable (`lowMemoryNotice.ts:31`) that nothing redraws
  on; the row only hides once the question starts (`ChatTranscriptHintRows.tsx:72`).
- **Build:** from the press the button reads "Asking…" and ignores presses. It stays mounted and keeps the ring
  (`ChatTranscriptHintRows.tsx:75-79`): do not disable or unmount it.
- **Deck pass:** with the low-memory warning up, A on "Ask anyway" changes its words to "Asking…" within one frame
  and a second A does nothing.

### A2 — Clear keeps the "Was this helpful?" row (★ `[chat]`; Haiku high)
- **Files owned:** `src/features/ask/flow/useBonsaiAskOrchestration.ts` lines 944-974 only, plus one new test file
  beside it.
- **Cause:** Clear sets `lastExchange` to null (`:961`); the Helpful row needs `lastExchange.answer`
  (`MainTabChatTranscript.tsx:1323`, `:1547-1554`; read those two spots only, do not edit that file).
- **Build:** clear `lastExchange` only when a question was in flight; otherwise leave it.
- **Deck pass:** after an answer, A on the question box's Clear empties the box and the row with Helpful, Not
  really and Suggest as a tip is still there.

### A3 — Stop in the middle of an answer cannot wait on a stalled stream (★ `[ask]`; Sonnet high)
- **Files owned:** `py_modules/backend/ask/ollama_stop_service.py`, `py_modules/backend/chats/chat_summary_service.py`,
  tests `tests/test_stop_never_blocks_the_loop.py`, `tests/test_ollama_abort_transport.py`.
- **Cause:** with a reply open, Stop calls `response.close()` on the back end's one event loop
  (`ollama_stop_service.py:108-111`); closing from another thread can wait on the reader's lock
  (`py_modules/backend/core/abort_blocked_read.py:13`). The same shape is in `chat_summary_service.py:312-314`.
- **Build:** shut the socket first (the existing no-wait helper), then do the close on a small thread, in both
  places. A test with a server that stops sending mid-answer: Stop returns in under a second.
- **Deck pass:** unchanged behaviour in normal use (Stop mid-answer ends at once, the partial answer kept).

### A4 — A chat that cannot be read puts you back on the new-chat spot (★ `[chat]`; Sonnet high)
- **Files owned:** `src/features/chats/title/ChatsMenu.tsx`, `src/features/chats/slots/useChatSlots.ts`,
  `src/features/main-tab/MainTab.tsx` (lines 260-275 only), `src/features/chats/title/useChatSwitchActions.ts`, and
  their tests.
- **Cause:** the menu clears the "new chat" flag at the press (`ChatsMenu.tsx:203`); on failure `goBackTo` restores
  the chat underneath (`useChatSlots.ts:389`) and `selectSlot` throws the failure away (`:413`); an effect clears
  the flag again on every chat change (`MainTab.tsx:269`).
- **Build:** pass the failure out and let the two callers put the new-chat spot back after that effect has run;
  reword the message "You are back in the chat you were in" (`useChatSlots.ts:318`) to match.
- **Deck pass:** from the new-chat spot, picking a chat whose file is broken shows the message and leaves the
  header on "New chat".

### D1 — Cancel while a download is still connecting ends at once (★ `[KB]` `[voice]`; Sonnet high; security read)
- **Files owned:** `py_modules/backend/knowledge/rag_corpus_download_service.py`,
  `py_modules/backend/voice/voice_model_download_service.py`, `py_modules/backend/core/` helpers it needs, tests
  `tests/test_rag_corpus_cancel_during_stalled_download.py`, `tests/test_voice_model_download_stalled.py`.
- **Cause:** the open call returns only after the site's first reply, up to 120 s (`tls_ca_fallback.py:89`), and
  the connection is only registered for Cancel afterwards (`rag…:151-153`, `voice…:241-242`). The speech model's
  first choice (curl) already hears Cancel within half a second; only its fallback has the wait.
- **Build:** run the open on a thread that Cancel can walk away from, as `call_unless_cancelled.py` already does for
  the library lookup; the abandoned open dies on its own timeout and its result is thrown away. Covers a dead
  connect and a dead secure handshake alike. Test with a socket that accepts and never answers, and one that never
  accepts.
- **Deck pass:** with the library's site made unreachable, Update then Cancel ends the card within about a second
  with "Download cancelled. Nothing was installed".

### D2 — The library section: "Removing…" and the buttons change together; one true line after a reload (★ `[KB]`; Haiku high, two commits)
- **Files owned:** `src/features/knowledge-library/kbRemoval.ts`, `KnowledgeBaseSection.tsx` (lines 470-480 and
  850-860 only), `KbLibraryResultLines.tsx`, `knowledgeLibraryJob.ts`, and the four `KnowledgeBaseSection.remov*`
  test files.
- **Commit 1, cause:** on success the removal is announced and the line dropped at once (`kbRemoval.ts:43-50`),
  but the buttons follow a status read that is only then started (`KnowledgeBaseSection.tsx:473-479,826`). Fix: on
  the announcement set the section's status to "not installed" in the same update.
- **Commit 2, cause:** the done-line's wording comes from a module variable that a reload resets
  (`knowledgeLibraryJob.ts:44,62`; shown at `KnowledgeBaseSection.tsx:855`). Fix: one neutral line for both cases,
  "✓ Library ready." (the default; mock-up board 6, tab 3 offers the other choice).
- **Deck pass:** A on Remove's last button: the line and the buttons change in the same frame.

### O1 — The Ollama install: progress on the update card, a surer hand-back, every site named (★ `[ollama]` `[ui]` and security gaps 5 and 9; Sonnet high; security read)
- **Files owned:** `py_modules/backend/ollama/ollama_binary_install.py`, `local_ollama_setup_service.py`,
  `local_setup_progress_text.py`, `src/features/ai-connection/ollamaSetupJob.ts`,
  `src/features/downloads/downloadSites.ts`, and their tests.
- **Progress, cause:** curl writes to a file and nothing reads its size (`ollama_binary_install.py:286-291`); only
  stage "pull" turns a percent line into megabytes (`ollamaSetupJob.ts:56-101`). Build: while curl runs, read the
  file's size on each poll and send "Downloading Ollama: N MB of M MB"; take the total from the download's own
  size header (the code already asks curl for the redirect at `:164`), falling back to the 1510 MB estimate
  (`downloadSizes.ts:28`).
- **Gap 5:** one 1.5 s "is it answering" probe decides the hand-back (`local_ollama_setup_service.py:843`, used at
  `:1039`). Probe twice, a second apart, before deciding.
- **Gap 9:** GitHub hands the download to a file site the box does not name (`ollama_binary_install.py:288`;
  `downloadSites.ts:35-39`; `ollamaSetupJob.ts:77`). Name that host in the box and on the card.
- **Deck pass:** during a real update the card shows megabytes going up, and the box names every site contacted.

### V1 — The voice engine build, first set: gaps 1, 3 and 4 (★ `[voice]`; Sonnet high; security read)
- **Files owned:** `py_modules/backend/voice/voice_engine_build_service.py`, `voice_engine_swap.py`, tests
  `tests/test_voice_engine_swap.py`, `tests/test_voice_engine_build_apt_signed.py`.
- **Gap 1:** the old engine is removed before the new one passes its test (`voice_engine_swap.py:80-96`; test at
  `voice_engine_build_service.py:340`, swap at `:304`). Test the staged files before the swap, or keep the old
  ones aside and restore on failure.
- **Gap 3:** the server-only build records whatever is in the folder (`:306,373`). Require the old record to read
  "ok" first, else refuse.
- **Gap 4:** the unsigned-source guard misses `enable` and `with` (`:198`). Add both.
- **Deck pass:** one real build after landing ends with a working microphone and a checked record.

### P1 — Browse models: the D-pad reaches "Type a model name by hand" (★★ `[ollama]` `[ui]`; Opus medium; second opinion)
- **Files owned:** `src/features/models/pull-box/PullModelsCustomTagEntry.tsx`, `PullModelsFiltersStrip.tsx`,
  `pullModelsStripMove.ts`, tests `PullModelsModal.customTagChip.test.tsx`, `pullModelsStripMove.test.ts`.
- **Cause (matches the Deck evidence `workshop:test-evidence/cancel1118-PULL-EARLY.json`):** the close × is given
  the strip's Left move (`PullModelsCustomTagEntry.tsx:137`), which finds nothing to its left and holds
  (`pullModelsStripMove.ts:43-46`), so Left is swallowed.
- **Build:** the × gets only the up, down and right moves; Left steps through the row to Pull and the field. Give
  the field up and down moves if it has none. A walk test: × → Left → Left lands on the field; nothing twice.
- **Deck pass:** after the chip opens its field, Left from the × reaches the field in at most two presses; A on it
  brings Steam's keyboard; a typed name can be pulled.

### KA — Left 4 Dead 2: the pouncing question, then the versus mix-up row (★ `[KB]` ×2; Sonnet high)
- **Files owned:** `py_modules/backend/knowledge/knowledge_base_search.py` (lines 495-575),
  `tests/test_kb_mode_notes_held_back.py`, `tests/test_kb_versus_notes_search.py`. Code only; do not edit note data.
- **Hunter:** the rule that puts a versus note first needs the note's whole title in the question (`:542-548`);
  "pouncing" is in no title. Why "Playing as the Hunter" is not even in the first three is not known: find that
  first (the word search stems "pouncing" to "pounce", and the note's text holds "Pounce"). The test at
  `test_kb_mode_notes_held_back.py:198-199` pins today's behaviour and must change on purpose.
- **Then row `V2-S-L4D2-29`** (expects "Answering combined special attacks in versus").
- **Bar:** no Left 4 Dead 2 row that finds its note today loses it; no other game's row moves; "tips for playing
  as the hunter in versus" still leads with the Hunter note. Measure before and after
  (`python scripts/kb/eval_kb_embed_models.py --arms-only --force-rebuild --no-write-report`, then
  `python scripts/measure_kb_thin_match.py --line-gate out.json --compare earlier.json`). If the bar cannot be met,
  land nothing and report the numbers.
- **Deck pass:** "Any advice for pouncing well when I am on the infected team" attaches a Hunter note first.

### KD — "Load order" and the mod lookup (★ `[KB]`; Sonnet high)
- **Files owned:** `py_modules/backend/knowledge/compat_topic_router.py`, `tests/test_compat_topic_router.py`.
- **Cause:** the single phrase `("load order",)` sends any question to the mods tips (`:152`, reasoning `:139-146`);
  added on purpose in plan 103. It only does harm once the mod lookup (switched off) should answer first.
- **Build:** when the mod lookup is switched on **and** finds a rule for a mod named in the question, the lookup
  wins; otherwise today's routing stands. With the switch off nothing changes: prove both directions in tests.
- **Deck pass:** none while the lookup is off (tests only; say so).

### KE — Older notes the wiki contradicts: one bounded sweep (★ `[KB]`; Sonnet high)
- **Files owned:** `data/kb/strategy_seed.json`, `data/kb/notes/*.json` (the only lane that edits note data).
- **Fact:** no list of sightings still unfixed exists (`docs/roadmap-kb.md:54`); lanes M, M1 and M2 fixed the
  listed ones.
- **Do:** list the games those lanes did not sweep; for each, read five older notes against the game's wiki page
  (`scripts/kb/fetch_wiki_live_pages.py`); fix what the wiki contradicts, one game per commit, each fix naming its
  page; build the library once at the end (`python scripts/kb/build_rag_db.py --seed --out build/knowledge-base`).
- **Report:** games swept, notes read, notes fixed. The entry closes only on the maintainer's word; nothing is
  published.

### KC — Borrowed advice after the honest opening, fifth try (★★★ `[KB]`; **Fable 5.2 max**, the maintainer's call)
- **Files owned:** `py_modules/backend/prompts/ollama_prompts.py`, `py_modules/backend/ask/game_ai_request.py`,
  `py_modules/backend/knowledge/kb_notes_turn_flags.py`, `kb_not_in_notes_notice.py`, and their tests.
- **Where it stands:** two switches, both off: `NOTES_LEFT_OUT_ON` (`ollama_prompts.py:322`) and `NOTES_FENCED_ON`
  (`:327`). Switched on, 25 of 39 real "No close match" questions lose a right note. The narrower trigger in the
  plan (hold notes back only when the question names a thing no found note names) was not built
  (`docs/roadmap-kb-details.md:1811`). Open point: the follow-up memory remembers a held-back note
  (`game_ai_request.py:757-767`; the hold-back is known at line 700).
- **Also yours, because it decides which turns are marked:** the "No close match" line shows over a right note
  when the question shares no word with it (`kb_not_in_notes_notice.py:197`, `:545-563`; "mech suit" scores 0.58
  under the 0.65 line that was set to catch "tame a horse" at 0.6508). Find a rule that frees the right notes
  without freeing the made-up ones, or report the trade in numbers for the maintainer.
- **The bar is not moved:** facts kept 69.5 and 74.0 (noise up to 4.5); to switch on, no borrowed detail in at
  least 5 of 6 made-up-boss answers in two runs with different seeds (`python scripts/kb/eval_kb_answers.py
  --samples 3 --seed-base <N>`); the four device sentences keep their line (3 of 4), the "tonight" sentences 4 of
  4; no new line on right notes (23 of 1,372 today); unmarked-turn fingerprints byte-identical.
- **Outcome:** met → lands switched on with a Deck row (P104-HONEST-03). Not met → lands switched off or not at
  all, the bug stays open, and the report says by how much it missed.

---

## Wave 2: each waits for the lane or measurement named

### V2 — The voice engine build, second set: gaps 2, 7 and 8 (Sonnet high; security read; after V1 lands)
- **Files owned:** `py_modules/backend/voice/voice_engine_record.py`, `voice_whisper_runtime.py`, and the one lock
  it adds in `voice_engine_build_service.py`; tests `tests/test_voice_engine_record.py`,
  `tests/test_voice_engine_checked_before_start.py`.
- **Gap 2:** the trust-once record can race the build's own record (`voice_whisper_runtime.py:162-167`,
  `voice_engine_build_service.py:306`): one shared lock, the verdict re-checked under it.
- **Gap 7:** a deleted record reads as trusted-once (`voice_engine_record.py:134-135`): keep a second "was
  recorded" marker so a missing record with the marker reads "changed".
- **Gap 8:** a whisper-cli found outside the engine folder is not checked (`voice_whisper_runtime.py:104-119`,
  `:143-150`): accept only a path inside the engine folder.

### KB — The new notes crowd the old ones, fifth try (★★ `[KB]`; **Fable 5.2 max**; after KA lands)
- **Files owned:** `py_modules/backend/knowledge/knowledge_base_service.py`,
  `tests/test_knowledge_base_service.py`, `tests/test_kb_ranking_starting_out_demotion.py`.
- **Where it stands:** `CROWDING_CAP_ON = False` (`:770`, third try: +15, −9) and `CROWDING_FIRST_PICK_ON = False`
  (`:791`, fourth try: +12, −3: `V2-C-06`, `V2-P1-YS-04`, `V2-P103-CP77-19`). Cause: a note the word search missed
  is placed one past the end of the word list, so its credit shrinks as the list grows (`:743-753`).
- **The bar is not moved** (D141 call 14, `docs/audit/maintainer-decisions-locked.md:2657-2661`): no test question
  loses its right note; an exact word match still comes first; "No close match" on no new question; the
  meaning-only thirty beats 18. The three protected tests stay green.
- **Extra rows to report on:** the Left 4 Dead 2 rows `V2-PARA-S03`, `V2-BLINDT-19`, `V2-P103-L4D2-13`,
  `V2-P103-L4D2-16` (the "six questions" entry).
- **Outcome:** as KC: met → on, with row P104-CROWDING-01; not met → off or not landed, bug stays open, numbers in
  the report.

### FL — A stopped answer: Down no longer loops (★★ `[ui]`, a come-back; **Opus high**; Fable max reads the measurement and the fix)
- **Waits for:** Deck measurement M-LOOP (block A1).
- **Files owned:** `src/shared/dpad/liveTurnFocusGraph.ts`, `src/features/answer/bubble/buildAnswerBubbleElement.tsx`,
  `src/features/answer/reply-actions/buildReplyActionsElement.tsx`, the focus part of
  `src/features/answer/transcript/MainTabChatTranscript.tsx` (lines 1320-1347), tests
  `MainTabChatTranscript.stoppedNotice.test.tsx`, `liveTurnFocusGraph.test.ts`.
- **What is known:** the cause is not. Candidate: the answer's Down tries Helpful, the reason chips, Keep and Show
  details, then the utility row, which tries Retry first (`liveTurnFocusGraph.ts:353-360`, `:266-269`); Retry sits
  above the answer and is in the loop the Deck saw. In a stopped answer Helpful and Not really are greyed and
  skipped (`buildReplyActionsElement.tsx:412-413`), there is no "Suggest as a tip" (`:420`), and Retry stays live.
  No walk test has a stopped case. The older entry was closed as "not reproduced", not fixed.
- **Build:** only from the measurement. First a walk test that reproduces the measured loop; then the smallest
  change that ends it; then a bounded walk with no stop twice, from the chat name to the question box.
- **Deck pass:** in a chat whose last answer was stopped, Down from the chat name reaches the question box, no
  stop twice, three times in a row, in two chats.

### FT — Developer tab: the last row clears the Open all band (★ `[tabs]`; Opus medium; second opinion)
- **Waits for:** Deck measurement M-TAIL.
- **Files owned:** `src/features/folded-tabs/foldedTabs.ts`, `src/features/developer/developerTabFolds.ts`, tests
  `DeveloperTab.foldedWalk.test.tsx`, `foldAllCover.test.ts`.
- **Cause (in the model only):** the tail is 120 px (`foldedTabs.ts:86`); that row's 255-character help makes a
  strip of about 103 px, plus the 44 px band.
- **Build:** the tail is as tall as the band plus the tallest help strip, for all three folded tabs. Do not shorten
  the help text (a test ties it to the mock-up board's data file).

### FW — Size watchers that answer late (★ `[focus]`; Opus medium; second opinion; **only if measured late**)
- **Waits for:** Deck measurement M-WATCH. If nothing is late, no lane runs and the entry goes to the maintainer as
  "measured, not seen".
- **Files:** `src/features/folded-tabs/TabHelpStrip.tsx:91`, `src/features/downloads/JobCard.tsx:69`,
  `src/features/main-tab/useMainTabColumnFill.ts:124`, `src/features/plugin-shell/useQamPanelHeightGuard.ts:176`.
  Working pattern: `src/features/ask/bar/useAskBarInitialRingClaim.ts:149`; lane F1's change of watcher kind
  (`7484d71f2`, `d4ecd119f`).

---

## Wave 3: each waits for a pick on mock-up board 6

The session reads the page's picks at every check-in and starts the lane whose pick is in. No pick, no build.

| Lane | Board tab | Builds | Model |
|---|---|---|---|
| T1 | 1, the "summed itself up" row | A (row above the answer): Opus medium, second opinion. B (words only): Haiku high | by pick |
| C1 | 2, the cut-off line on the download card | Shorter words in both copies (`statusJob.ts:28`, `ollamaSetupJob.ts:35`): Haiku high. Two lines: Sonnet medium | by pick |
| R1 | 3, Reinstall on a ready voice engine | `VoiceInputSettingsSection.tsx:276-285` | Sonnet medium |
| M1 | 4, community copies of models | `model_policy.py`, the list tag, and (for picks A to C) the name box's shape rule on both sides (`mergePullModelCatalog.ts:27`, `ollama_catalog_service.py:31`), which refuses any name with a slash today; the licence reviewer reads it | Sonnet high |
| M2 | 5, "AI models" in one press | `OllamaTab.tsx:371-417`, `ollamaTabFolds.ts`, `useOllamaTabFocus.ts` | Opus medium, second opinion |
| M3 | 6, the bar's Cancel on Main | `JobBar.tsx`, `AskStripSendButtons.tsx`, `useMainTabAskBarFocus.ts`; Deck measurement M-BAR first | Opus high, second opinion |
| X1 | 7, presses that start or stop something big (security gap 6, the Update press) | `runningJobs.ts`, `TabBodyFocusRoot.tsx`, `JobBar.tsx`; after M3 (same files) | Sonnet high; security read |
| S1 | 8, the small ones | ten chats (only if "cleared" is picked), the Pyro chip | Sonnet medium |
| N1 | 9, words | the AI told when a game has no notes; the Speed-mode option removed; the starter box's paragraph first | Sonnet high |
