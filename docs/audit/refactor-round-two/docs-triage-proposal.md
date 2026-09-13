# Clean-up proposal: which write-ups and helper scripts to keep

This is a proposal only. Nothing has been moved, archived, or deleted. It is a list for the
maintainer to read once and approve, so a later pass can do the actual tidying without asking
"can this go?" file by file.

It covers every write-up under the docs folder (except what is already tucked away in the
archive folder), and every helper script under the scripts folder. It does not cover the
roadmap, the two testing write-ups, or the changelog — those stay exactly as they are and are
only mentioned here for context.

**How this list was made:** a small checking tool, written for this same proposal, reads every
file and reports its size, its first line, when it was last changed,
how many other files still mention it by name, and whether it says things like "shipped" or
"superseded" about itself. That gave a first-pass sorting. Anywhere that table left in doubt, the
file itself was opened and read, and cross-checked against the live roadmap to see whether the
work it describes is still open or already finished. A date on a file means nothing by itself —
every one of these was touched within the last six weeks — so the sorting below is based on
what each file says and whether anything still points at it, not on how old it is.

## The counts

| | Keep (still current, or work unfinished) | Put away (work finished) | Put away (a newer write-up replaced it) | Put away, then delete later (never happened, or dropped) | Needs a quick answer |
|---|---|---|---|---|---|
| **Write-ups** (121) | 66 | 44 | 9 | 2 | 0 |
| **Scripts** (74) | 63 | 10 | 0 | 1 | 0 |

Putting away the "work finished," "replaced," and "dropped" groups removes about **943 KB** of
reading and old code out of about **4,068 KB** total — roughly one KB out of every four. Nothing
in the "keep" or "needs a quick answer" groups is touched.

Below, each line names one file and says in a sentence why it landed where it did. Where a
write-up was replaced by a newer one, that newer one is named.

---

## Write-ups to keep

These still describe how the project works today, or point at work that is not finished yet.
Nothing to decide here — listed so the full picture is in one place.

**Reference guides, used every day:**

- `DOCUMENTATION_INDEX.md` — the map of what is in the docs folder and who each thing is for.
- `code-clarity.md` — the house style for how a code file should describe itself at the top.
- `code-map.md` — a map of the code, rebuilt automatically so it never goes stale.
- `design-language.md` — the visual rules every on-screen change has to follow.
- `design-tokens.md` — the exact sizes and colors those visual rules point to.
- `development.md` — the main guide for setting up a computer to build and test the plugin.
- `glossary.md` — plain-word definitions of terms used across the other write-ups.
- `knowledge-base.md` — the full design of the offline knowledge base feature, kept current as it grows.
- `mcp-setup.md` — how the two helper tools this project's AI sessions use are set up.
- `roadmap-details.md` — the long version of every open item on the live roadmap. Updated constantly.
- `roadmap.md` — the live list of what is broken, planned, or being tested. Updated constantly.
- `test-evidence/README.md` — explains what the hundreds of saved test screenshots and recordings actually are.
- `testing-automated.md` — the list of automatic checks every change has to pass.
- `testing-manual.md` — the checklist of things a person has to check by hand on the actual Deck. Updated constantly.
- `testing.md` — the master list of test results. Updated constantly.
- `troubleshooting.md` — the help text and troubleshooting tips shown to a person using the plugin.

**Facts worth remembering, still true today:**

- `audit/decky-realms.md` — explains a lasting quirk of the Deck's plugin system: the plugin's own code and the on-screen page it draws are two separate things. Still catches people out.
- `audit/decky-tab-strip-classes.md` — records that a highlight style Steam appears to use on its tabs does not actually exist on a real Deck. Still a trap for that area of the screen.
- `audit/maintainer-decisions-locked.md` — the master list of every call the maintainer has made. Still being added to.
- `audit/phase1-map-verification.md` — the story of two features that were wired up but silently never worked, kept as a standing lesson.
- `audit/rag-eval-query-style.md` — the house rules for writing test questions for the knowledge base.
- `audit/03-friction.md` — the measurement showing one small settings change touches about thirty places in the code. Still the number people quote when explaining why settings changes are slow.

**This clean-up project, still in progress:**

- `audit/refactor-round-two/ledger.md` — the running tally of what this clean-up project has cost so far.
- `audit/refactor-round-two/session-notes.md` — handover notes for whoever picks up this project next.
- `audit/refactor-round-two/worker-brief-template.md` — the template used to write instructions for each worker on this project, including the one that wrote this page.
- `planning/51-refactor-round-two.md` — the plan for this very clean-up project. This page is part of carrying it out.

**Plans and studies for work that is not finished:**

- `planning/04-strategy-spoiler-false-positive.md` — the investigation behind a still-open bug where spoiler warnings sometimes show up wrongly.
- `planning/05-token-streaming-review.md` — review of how answers stream onto the screen; part of it was built, part is still on the shelf and tracked as unfinished.
- `planning/06-thinking-blurbs-review.md` — review of the short "thinking" notes shown while the AI works; most landed, a few small ideas are still open.
- `planning/10-wake-word-listening-feasibility.md` — the feasibility study for saying a wake word to start listening. Feature not built yet; this is still the reference.
- `planning/11-native-qam-tile-feasibility.md` — feasibility study for giving bonsAI its own entry in Steam's quick menu. Not built yet.
- `planning/12-deep-mod-ai-hints-feasibility.md` — feasibility study for AI hints that are aware of installed game mods. Not built yet.
- `planning/16-soft-num-predict-thinking-budget.md` — the rulebook for how long the AI is allowed to keep "thinking" before answering. Still in force.
- `planning/17-kb-online-versus-strategy-content.md` — plan for adding online multiplayer content to the knowledge base. Not started yet.
- `planning/19-controller-macro-test-rig.md` — the design for a robot controller rig that presses real buttons for automated testing. Still describes the rig in use today.
- `planning/21-ai-owned-testing-program.md` — the plan for having an AI run its own tests end to end, without a person at the Deck. Still the guiding plan.
- `planning/28-named-chat-slots-v3-implementation-plan.md` — the final build plan for named chat slots. Built, but still being checked on the Deck.
- `planning/28-phase5-corpus-depth.md` — plan for adding more depth to the games already in the knowledge base. Still open work.
- `planning/29-preset-row-three-thirds-plan.md` — plan for the row of suggestion chips above the question box. Built, with a couple of checks still owed.
- `planning/30-collapsing-tab-bar.md` — plan for the tab bar that hides itself when not needed. Built, with a few on-screen checks still owed.
- `planning/30-kb-answer-quality-plan.md` — the plan for making the knowledge base's answers better. Still guiding that work.
- `planning/31-deck-verification-round.md` — the run-order for a round of on-Deck testing. A later round still points back to its results.
- `planning/33-model-routing.md` — today's rule for which AI model, and how much effort, to use for a given job. This is the current policy.
- `planning/34-feature-verification-round.md` — a later round of on-Deck checks, still tracking what is closed and what is owed.
- `planning/35-bugfix-session.md` — plan for a bug-fixing session; still linked from the live bug list as the source of one fix that is under discussion.
- `planning/37-rag-status-report.md` — a plain-language summary of where the whole knowledge-base project stands, rewritten after each wave of work.
- `planning/38-toast-answer-lines.md` — plan for showing the first line of an answer in the notification popup. Not built yet.
- `planning/39-connection-doctor.md` — plan for a one-button connection health check. Not built yet.
- `planning/40-reasoning-display.md` — plan for showing the AI's reasoning and giving it a second use. Not built yet.
- `planning/41-deck-model-survey.md` — results of comparing different AI models on the Deck. Still the comparison used to choose models today.
- `planning/42-read-aloud-feasibility.md` — the study that led to the read-aloud feature shipping. Still cited as the reason a related, bigger voice feature is on the list.
- `planning/43-model-speed-readout.md` — plan for a one-time "how fast is this model here" reading. Not built yet.
- `planning/45-settings-shortcut-card.md` — plan for moving the Steam settings shortcuts higher on the screen. Not built yet.
- `planning/47-kb-wave-two-session.md` — plan for the second wave of knowledge-base work. Shipped, but one on-Deck evening check is still owed.
- `planning/48-kb-wave-three-session.md` — plan for the third wave of knowledge-base work. Still has open threads.
- `planning/49-steam-frame-features.md` — nine possible features for the upcoming Steam Frame headset. Several are still open items on the list.
- `planning/50-steamvr-pc-setup.md` — steps for testing headset features on a regular PC before the headset exists. Still the setup guide in use.
- `planning/52-frame-features-second-look.md` — a closer look at three of the headset features. Still open items.
- `planning/53-steamvr-bench-findings.md` — results from testing headset ideas on a PC. The programs it describes are meant to be run again later.
- `planning/assets/53-headline-count-2026-09-12.md` — supporting numbers for an open feature about giving every answer a one-line summary first.
- `planning/spoiler-constitution.md` — the rulebook for when the AI should hide spoilers. Actively used to settle spoiler bugs.
- `planning/web-permission-discovery.md` — early notes for an opt-in "let the AI search the web" feature. Still open, still the only writeup.

## Write-ups to put away: the work is finished

Each of these describes something that was measured, decided, or built, and that has now
happened. Putting them away means moving them into the archive folder — nothing is deleted, and
they stay available to read if someone needs the history.

- `audit/00-phase0.md` — record of the very first step of the earlier clean-up round, already done.
- `audit/04-coverage.md` — a one-time check of what already had test coverage, from that earlier round.
- `audit/07-mainpy-inventory.md` — a one-time inventory of the largest code file, from that earlier round.
- `audit/08-postmortem.md` — the writeup of what went well and badly in that earlier round.
- `audit/09-prevention.md` — follow-up notes on avoiding that round's mistakes next time.
- `audit/clipboard-spike-2026-08-28.md` — a one-day test of whether the plugin could copy text to the clipboard. Answered.
- `audit/corpus-gap-answers-2026-08-29.md` — the maintainer's answers to a list of gaps in the knowledge-base content. Answered.
- `audit/desktop-mode-discovery.md` — notes from exploring what changes when Steam switches to desktop mode. Finished.
- `audit/focus-rule-review-2026-09-11.md` — a check of a D-pad navigation rule file against the real code. Completed.
- `audit/kb-blind-holdout-rows-2026-08-28.md` — a record of adding twenty test questions to grade the knowledge base blind. Done.
- `audit/kb-blind-holdout-rows-batch2-2026-08-28.md` — a second batch of thirty-six blind test questions. Done.
- `audit/kb-blind-tune-rows-2026-08-29.md` — fifty-one more blind test questions for a different slice of the test set. Done.
- `audit/kb-card-name-collisions-2026-08-31.md` — a check for knowledge-base entries with clashing names. Checked.
- `audit/kb-eval-after-depth-2026-08-31.md` — a measurement of how new knowledge-base entries changed search results. Measured.
- `audit/kb-second-signal-2026-08-28.md` — the record of adding a second ranking signal to knowledge-base search. Shipped and measured.
- `audit/rag-compat-topic-preference-2026-08-18.md` — a measurement behind a troubleshooting-topic matching fix. Measured.
- `audit/rag-pr2-signoff.md` — the maintainer's formal sign-off on a knowledge-base quality fix. Signed off.
- `audit/rag-vector-recall-floor-2026-08-18.md` — a measurement behind a search-quality fix. Measured.
- `audit/session-handoff-2026-08-21.md` — handover notes between two work sessions on the knowledge base, from weeks ago.
- `audit/spoiler-dpad-01-keydown-dead-code-2026-08-27.md` — proof that a certain button-press shortcut never actually ran. Proven.
- `audit/upstream-steam-qam-width-2026-08-12.md` — a note about a width limit built into Steam's own menu. Recorded.
- `design/handoffs/ai-character-avatars/README.md` — the design handoff for the small character pictures shown by the AI's replies. That feature has shipped.
- `planning/01-qa-automation-plan.md` — early thinking on what testing work an AI could take over. Its ideas were carried into later, more detailed plans.
- `planning/03-lbrb-tab-flicker.md` — investigation into a screen-flicker bug when switching tabs. The bug is fixed and confirmed working.
- `planning/13-roadmap-feature-ideas.md` — a batch of feature ideas, all of which were already copied onto the live roadmap.
- `planning/14-kids-master-lock-implementation-plan.md` — the build plan for a parental-lock feature. Shipped.
- `planning/15-corpus-licensing-attribution-plan.md` — the plan for giving proper credit to knowledge-base sources. Done.
- `planning/20-frozen-chip-qa-batches.md` — a one-time list of test questions written for a specific bug-fixing day, long past.
- `planning/22-xinput-near-miss-and-button-map.md` — the story of a wrong turn taken while building the controller test rig, kept so nobody repeats it. The rig works now.
- `planning/25-ai-character-avatars-handoff.md` — intake notes for the small character-pictures feature. Shipped.
- `planning/26-thursday-bugfix-sesh.md` — the plan for one specific bug-fixing session that already happened.
- `planning/32-bugfix-session.md` — the plan for another bug-fixing session. All of its bugs were closed and checked on the Deck.
- `planning/36-feature-session.md` — the plan for a feature-building session run alongside another one. Its work is done and no longer referenced anywhere.
- `planning/40-new-titles-from-the-library.md` — the plan for adding a first batch of new games to the knowledge base. Almost entirely done and already filed under finished work.
- `planning/44-reply-block-rework.md` — plan for three small changes to the row of buttons under a finished answer. Built and confirmed working on the Deck.
- `planning/46-kb-wave-one-session.md` — the plan for the first wave of knowledge-base improvements. Shipped, followed by two more waves.
- `planning/tab_flicker.md` — a second writeup of the same tab-switch flicker bug covered above. The bug is fixed.
- `rag-retrieval-quality-remediation-implementation-plan.md` — the build plan for a round of search-quality fixes. Marked closed by its own header.
- `wave1.md` — a report on four pieces of work landing together, from over a month ago.
- `wave2.md` — a report on two pieces of work landing together, from over a month ago.
- `wave3.md` — a report on three pieces of work landing together, from over a month ago.
- `wave4.md` — a report on one more piece of work landing, from over a month ago.

## Write-ups to put away: a newer one replaced it

- `audit/01-map.md` — an old, hand-made map of the code. **Replaced by:** the code map and the file-dependency list the project now generates automatically.
- `audit/02-hotspots.md` — an old, hand-made list of the messiest files. **Replaced by:** the size ranking the project now generates automatically.
- `audit/05-plan.md` — the ranked to-do list from the first clean-up round. **Replaced by:** this project's own plan for the second clean-up round.
- `audit/06-doc-triage.md` — an earlier pass at deciding which write-ups to keep, from six weeks ago. **Replaced by:** this page.
- `planning/07-named-chat-slots-postmortem.md` — the review that first proposed redoing the named-chat-slots feature. **Replaced by:** the final, already-built version of that redesign (plan 28).
- `planning/08-kids-master-lock-feasibility.md` — the early feasibility check for a parental-lock feature. **Replaced by:** the build plan that was actually carried out (plan 14).
- `planning/09-steam-frame-companion-feasibility.md` — an early feasibility study for a companion app on the upcoming Steam Frame headset. **Replaced by:** the newer writeup covering all nine planned headset features (plan 49).
- `planning/27-named-chat-slots-v2-implementation-plan.md` — the second build plan for named chat slots. **Replaced by:** the third and final build plan, which reversed some of its calls (plan 28).
- `planning/27b-named-chat-slots-design-handback.md` — a message sent back to the design tool about that second build plan. **Replaced by:** the third and final build plan (plan 28).

## Write-ups to put away, then delete after 90 days: never happened, or dropped

- `design/handoffs/glance-view/README.md` — a design for showing just the answer, alone, in big text. The maintainer parked this: too big a change for what it gains.
- `planning/02-readme-redesign-plan.md` — a plan to rewrite the project's front-page readme file. The readme is almost exactly the same length today as when this plan was written, so the rewrite never happened.

---

## Helper scripts

Same four groups, for every file under the scripts folder.

**Keep (63):** the large majority. Nothing to decide on any of these — listed so the full
picture is in one place.

- `build-preview.mjs` — builds the plugin for the in-editor preview tool.
- `build.ps1` — the Windows version of the main build-and-send-to-Deck command.
- `build.sh` — the main build-and-send-to-Deck command.
- `build_model_bakeoff_report.py` — turns AI-model comparison data into a readable report.
- `build_rag_db.py` — builds the knowledge-base file that ships to the Deck.
- `bump-version.mjs` — bumps the version number everywhere it needs to change together.
- `check-focus-patterns.mjs` — checks that every on-screen control can still be reached with a controller D-pad.
- `check_headers.py` — checks that every code file explains itself at the top.
- `code_map.py` — builds the up-to-date map of the code.
- `cursor-deck-log-capture.example.ps1` — example script for forwarding the Deck's logs to a computer.
- `deck-ollama-gpu-probe.sh` — checks whether the Deck's AI engine is using the right graphics settings.
- `deck-restart-ollama-gpu.sh` — restarts the Deck's AI engine with Deck-friendly graphics settings.
- `deck/bonsai-capture-common.sh` — shared code the screenshot and recording tools both use.
- `deck/bonsai-capture.sh` — takes a screenshot of the Deck's screen for testing.
- `deck/bonsai-record.sh` — records a video of the Deck's screen for testing.
- `deck/deck-remote-common.sh` — shared code the remote screenshot and recording helpers use.
- `deck_queue.py` — makes sure only one helper drives the Deck at a time.
- `deck_send_ask.py` — types a test question into the Deck's question box without pressing ask.
- `ensure-git-hooks.mjs` — makes sure a computer is using this project's save-time checks.
- `eval_kb_answers.py` — grades how good the knowledge base's answers are.
- `eval_kb_embed_models.py` — compares different search-matching models for the knowledge base.
- `fetch_wiki_dump_pages.py` — pulls game-wiki pages from a bulk download for the knowledge base.
- `fetch_wiki_live_pages.py` — pulls game-wiki pages live from the web for the knowledge base.
- `focus-baseline.json` — the saved baseline the D-pad reachability checker compares against.
- `lib/deck-ui-capture-remote.sh` — the shared low-level code the Deck screenshot tools call into.
- `measure_kb_floor_holdout.py` — measures a knowledge-base quality cutoff against held-back test questions.
- `measure_kb_thin_match.py` — measures how the knowledge base handles thin, barely-matching questions.
- `plugin_zip_corpus_guard.py` — checks the release file does not accidentally ship extra knowledge-base data.
- `probe_deck_ask_row_width.py` — measures the exact width of the question box on the Deck's screen.
- `probe_deck_kb_retrieval.py` — the tool used to check what the knowledge base actually attaches to an answer; still the method several test rows rely on.
- `probe_deck_read_aloud.py` — checks the read-aloud feature on the Deck.
- `probe_deck_rpc_surface.py` — lists every command the front screen can call on the back end, to catch typos.
- `probe_deck_steam_library.py` — reads a person's Steam game library from the Deck.
- `publish_corpus.py` — publishes a finished knowledge-base file.
- `py_import_graph.py` — maps which back-end code files depend on which.
- `ratchet.json` — the saved best-ever numbers the code-quality checker compares against.
- `ratchet.py` — checks that a list of code-health numbers never gets worse.
- `record-deck.ps1` — the Windows version of the screen-recording tool.
- `record-deck.sh` — records the Deck's screen to a file.
- `reverse-tunnel-deck-ingest.ps1` — the Windows version of the tool that pipes Deck logs back to a computer.
- `reverse-tunnel-deck-ingest.sh` — pipes Deck logs back to a computer.
- `revert-dev.ps1` — the Windows version of the tool to undo a test deploy to the Deck.
- `revert-dev.sh` — undoes a test deploy to the Deck.
- `run-preview-suite.mjs` — runs the automated on-screen test scenarios.
- `run_python_tests.py` — runs the back-end test suite the same way the Deck would load it.
- `screenshot-deck.ps1` — the Windows version of the Deck screenshot tool.
- `screenshot-deck.sh` — takes and saves a Deck screenshot.
- `setup-dev.ps1` — the Windows version of the one-time developer setup.
- `setup-dev.sh` — one-time setup for a new developer's computer.
- `setup-ollama.sh` — installs the Deck's local AI engine.
- `setup_ollama.ps1` — the Windows helper for the same install.
- `steamvr_bench/card_bench.py` — tests a notification-style panel in a virtual-reality scene; meant to be run again for future headset work.
- `steamvr_bench/panel_bench.py` — tests a floating panel in a virtual-reality scene; meant to be run again for future headset work.
- `steamvr_bench/pc_host_probe.py` — tests running the plugin's back end on a regular computer instead of a Deck; meant to be run again.
- `sync-version-from-plugin.mjs` — copies the version number into the front-screen code.
- `sync-versions.mjs` — keeps two version-number files in step with each other.
- `ts_long_functions.mjs` — flags front-screen code files that have grown too long.
- `verify-decky-plugin-zip.sh` — checks a release file is packaged correctly before it ships.
- `verify.py` — the one command every change has to pass before it is saved.
- `watch-deploy.ps1` — the Windows version of the tool that auto-sends changes to the Deck as they happen.
- `watch-deploy.sh` — auto-sends changes to the Deck as they happen.
- `wipe-bonsai-data.sh` — clears out a Deck's saved settings and logs for a clean test.
- `worktree.py` — lists and clears away the extra copies of the project other helpers create.

**Put away, work finished (10):**

- `gen_compat_patterns.py` — a one-off tool that generated the starter troubleshooting-tips data. That data is already generated and saved.
- `measure_kb_batch_verification.py` — checked one specific batch of test questions before the maintainer approved pinning them. That batch is done.
- `probe_card_name_collisions.py` — checked the knowledge base for clashing card names. Done, answer filed.
- `probe_deck_followup_memory.py` — answered one specific question about a memory feature. Answered.
- `probe_deck_step12_extractions.py` — a one-off check during a specific step of the earlier clean-up round. That step is done.
- `probe_deck_tab_bar.py` — measured the tab bar's size for a bug that is now fixed.
- `probe_deck_tab_strip.py` — measured tab-strip styling for a bug that is now fixed.
- `probe_deck_tab_switch.py` — measured tab-switching for a bug that is now fixed.
- `probe_pc_embed_eviction.py` — a one-off measurement from a knowledge-base wave that has since landed.
- `qa_wave3_pc_side.py` — the computer half of testing for a knowledge-base wave that has since landed.

**Put away, then delete after 90 days (1):**

- `tmp_whisper_hallucination_probe.py` — a scratch file for testing voice-recognition mistakes. It has no name, no header, and nothing else in the project points to it — it looks like a leftover that should have been deleted at the time.

No scripts fall in "replaced by a newer one," and none needed a "not sure."

---

## The saved device-test result files

There is a folder of 464 small files, each a saved result from one past on-Deck test. They
piled up because of a bug: the testing tool used to save one of these on every single run,
whether anyone wanted it kept or not. That bug is already fixed — only a run someone deliberately
names gets saved from now on — but the 464 old ones are still sitting in the project.

Checking both testing write-ups for every mention of one of these files by name (including the
handful of rows that name a whole group at once, like "every file starting with a certain test
ID"), **154 of the 464 are actually pointed to by a row** in one of the two testing write-ups.
The other **310 are not linked from anywhere** — nothing would break if they left the project.

Recommendation: keep the 154 that a row still cites, and remove the other 310.

---

## The six that needed an answer — all settled

These six could not be called from reading them alone, so each was checked against the project
itself rather than put to the maintainer. All six are answered; the counts above include them.
Two turned out to be finished and can be put away. Four describe work that is genuinely still
open and stay where they are.

**Put away — the work is finished:**

- The big main-screen redesign. Both halves shipped, not just the chat slots: the screen was
  flipped so the conversation sits above the quick-reply buttons and the typing box, and that is
  how the code builds it today. A few on-device checks for it are still open, but those live on
  the roadmap, not here.
- The list of planning questions. Every one of its thirteen questions already has a written
  answer linked beside it. Four of those answers were only partly acted on, but that is
  unfinished follow-through, tracked elsewhere — not a question still waiting.

**Keep — still true, or the work is still stuck:**

- The bugs found in the Deck tooling this project uses but does not own. None of them have been
  fixed. Some later, different bugs in the same tooling were fixed and confirmed working, which
  is easy to mistake for these being done. They are not.
- Per-game troubleshooting tips. Still stuck on the same thing: what the plugin stores has no way
  to say a tip belongs to one particular game, and that has not changed.
- The list of testing jobs that still need a person. It holds up, because it is a list of kinds
  of work rather than tasks — buying and installing a game, judging whether an answer about a
  game is actually right, deciding what to build next. None of those became automatic.
- The note that the automatic checks only warn. Still true. When code is pushed the tests run and
  report red or green, but a red result does not stop the change going in.
