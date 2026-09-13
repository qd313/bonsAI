# What is in this folder

This folder holds write-ups and scripts that are no longer needed day to day, kept so the
history is still there if someone wants to read it. Nothing in here is deleted. A file only
leaves this folder if it is listed below with a delete-after date, and only after that date, and
only by a person choosing to do it — nothing removes files automatically.

Everything already in this folder before 2026-09-13 was archived earlier, in an older clean-up
round, and is not covered by the table below.

This table covers only the files moved in on 2026-09-13, following the sorting list the
maintainer approved (`docs/audit/refactor-round-two/docs-triage-proposal.md`). One row per file.

- **Finished** — the work it describes is done. No delete date; it stays as a record.
- **Replaced** — a newer write-up covers the same ground now. No delete date; it stays as a record.
- **Abandoned** — the work described never happened, or was dropped. These get a delete-after
  date, ninety days out, because there is nothing to keep a record of.

## Write-ups

| File | Reason | Archived | Delete after | Why |
|---|---|---|---|---|
| 00-phase0.md | Finished | 2026-09-13 | — | Record of the very first step of the earlier clean-up round, already done. |
| 01-map.md | Replaced | 2026-09-13 | — | An old, hand-made map of the code. Replaced by the code map and file-dependency list the project now builds automatically. |
| 01-qa-automation-plan.md | Finished | 2026-09-13 | — | Early thinking on what testing work an AI could take over. Its ideas were carried into later, more detailed plans. |
| 02-hotspots.md | Replaced | 2026-09-13 | — | An old, hand-made list of the messiest files. Replaced by the size ranking the project now builds automatically. |
| 02-readme-redesign-plan.md | Abandoned | 2026-09-13 | 2026-12-12 | A plan to rewrite the project's front-page readme file. The readme is almost exactly the same length today as when this plan was written, so the rewrite never happened. |
| 03-lbrb-tab-flicker.md | Finished | 2026-09-13 | — | Investigation into a screen-flicker bug when switching tabs. The bug is fixed and confirmed working. |
| 04-coverage.md | Finished | 2026-09-13 | — | A one-time check of what already had test coverage, from the earlier clean-up round. |
| 05-plan.md | Replaced | 2026-09-13 | — | The ranked to-do list from the first clean-up round. Replaced by this project's own plan for the second clean-up round. |
| 06-doc-triage.md | Replaced | 2026-09-13 | — | An earlier pass at deciding which write-ups to keep, from six weeks ago. Replaced by the newer sorting list this pass followed. |
| 07-mainpy-inventory.md | Finished | 2026-09-13 | — | A one-time inventory of the largest code file, from the earlier clean-up round. |
| 07-named-chat-slots-postmortem.md | Replaced | 2026-09-13 | — | The review that first proposed redoing the named-chat-slots feature. Replaced by the final, already-built version of that redesign. |
| 08-kids-master-lock-feasibility.md | Replaced | 2026-09-13 | — | The early feasibility check for a parental-lock feature. Replaced by the build plan that was actually carried out. |
| 08-postmortem.md | Finished | 2026-09-13 | — | The writeup of what went well and badly in the earlier clean-up round. |
| 09-prevention.md | Finished | 2026-09-13 | — | Follow-up notes on avoiding the earlier round's mistakes next time. |
| 09-steam-frame-companion-feasibility.md | Replaced | 2026-09-13 | — | An early feasibility study for a companion app on the upcoming Steam Frame headset. Replaced by the newer writeup covering all nine planned headset features. |
| 13-roadmap-feature-ideas.md | Finished | 2026-09-13 | — | A batch of feature ideas, all of which were already copied onto the live roadmap. |
| 14-kids-master-lock-implementation-plan.md | Finished | 2026-09-13 | — | The build plan for a parental-lock feature. Shipped. |
| 15-corpus-licensing-attribution-plan.md | Finished | 2026-09-13 | — | The plan for giving proper credit to knowledge-base sources. Done. |
| 20-frozen-chip-qa-batches.md | Finished | 2026-09-13 | — | A one-time list of test questions written for a specific bug-fixing day, long past. |
| 22-xinput-near-miss-and-button-map.md | Finished | 2026-09-13 | — | The story of a wrong turn taken while building the controller test rig, kept so nobody repeats it. The rig works now. |
| 25-ai-character-avatars-handoff.md | Finished | 2026-09-13 | — | Intake notes for the small character-pictures feature. Shipped. |
| 26-thursday-bugfix-sesh.md | Finished | 2026-09-13 | — | The plan for one specific bug-fixing session that already happened. |
| 27-named-chat-slots-v2-implementation-plan.md | Replaced | 2026-09-13 | — | The second build plan for named chat slots. Replaced by the third and final build plan, which reversed some of its calls. |
| 27b-named-chat-slots-design-handback.md | Replaced | 2026-09-13 | — | A message sent back to the design tool about the second build plan. Replaced by the third and final build plan. |
| 32-bugfix-session.md | Finished | 2026-09-13 | — | The plan for another bug-fixing session. All of its bugs were closed and checked on the Deck. |
| 36-feature-session.md | Finished | 2026-09-13 | — | The plan for a feature-building session run alongside another one. Its work is done and no longer referenced anywhere. |
| 40-new-titles-from-the-library.md | Finished | 2026-09-13 | — | The plan for adding a first batch of new games to the knowledge base. Almost entirely done and already filed under finished work. |
| 44-reply-block-rework.md | Finished | 2026-09-13 | — | Plan for three small changes to the row of buttons under a finished answer. Built and confirmed working on the Deck. |
| 46-kb-wave-one-session.md | Finished | 2026-09-13 | — | The plan for the first wave of knowledge-base improvements. Shipped, followed by two more waves. |
| clipboard-spike-2026-08-28.md | Finished | 2026-09-13 | — | A one-day test of whether the plugin could copy text to the clipboard. Answered. |
| corpus-gap-answers-2026-08-29.md | Finished | 2026-09-13 | — | The maintainer's answers to a list of gaps in the knowledge-base content. Answered. |
| design/handoffs/ai-character-avatars/README.md | Finished | 2026-09-13 | — | The design handoff for the small character pictures shown by the AI's replies. That feature has shipped. Kept under its own feature folder here so it does not clash with another README of the same name. |
| design/handoffs/glance-view/README.md | Abandoned | 2026-09-13 | 2026-12-12 | A design for showing just the answer, alone, in big text. The maintainer parked this: too big a change for what it gains. Kept under its own feature folder here so it does not clash with another README of the same name. |
| desktop-mode-discovery.md | Finished | 2026-09-13 | — | Notes from exploring what changes when Steam switches to desktop mode. Finished. |
| focus-rule-review-2026-09-11.md | Finished | 2026-09-13 | — | A check of a D-pad navigation rule file against the real code. Completed. |
| kb-blind-holdout-rows-2026-08-28.md | Finished | 2026-09-13 | — | A record of adding twenty test questions to grade the knowledge base blind. Done. |
| kb-blind-holdout-rows-batch2-2026-08-28.md | Finished | 2026-09-13 | — | A second batch of thirty-six blind test questions. Done. |
| kb-blind-tune-rows-2026-08-29.md | Finished | 2026-09-13 | — | Fifty-one more blind test questions for a different slice of the test set. Done. |
| kb-card-name-collisions-2026-08-31.md | Finished | 2026-09-13 | — | A check for knowledge-base entries with clashing names. Checked. |
| kb-eval-after-depth-2026-08-31.md | Finished | 2026-09-13 | — | A measurement of how new knowledge-base entries changed search results. Measured. |
| kb-second-signal-2026-08-28.md | Finished | 2026-09-13 | — | The record of adding a second ranking signal to knowledge-base search. Shipped and measured. |
| major-redesign.md | Finished | 2026-09-13 | — | The plan for flipping the main screen so the conversation sits above the question box, and for named chat slots. Both parts of this have shipped; a few on-device checks are tracked on the live roadmap instead. |
| rag-compat-topic-preference-2026-08-18.md | Finished | 2026-09-13 | — | A measurement behind a troubleshooting-topic matching fix. Measured. |
| rag-pr2-signoff.md | Finished | 2026-09-13 | — | The maintainer's formal sign-off on a knowledge-base quality fix. Signed off. |
| rag-retrieval-quality-remediation-implementation-plan.md | Finished | 2026-09-13 | — | The build plan for a round of search-quality fixes. Marked closed by its own header. |
| rag-vector-recall-floor-2026-08-18.md | Finished | 2026-09-13 | — | A measurement behind a search-quality fix. Measured. |
| roadmap-planning-questions.md | Finished | 2026-09-13 | — | A list of thirteen open planning questions from weeks ago. Every one now has a written answer linked beside it. |
| session-handoff-2026-08-21.md | Finished | 2026-09-13 | — | Handover notes between two work sessions on the knowledge base, from weeks ago. |
| spoiler-dpad-01-keydown-dead-code-2026-08-27.md | Finished | 2026-09-13 | — | Proof that a certain button-press shortcut never actually ran. Proven. |
| tab_flicker.md | Finished | 2026-09-13 | — | A second writeup of the same tab-switch flicker bug covered by 03-lbrb-tab-flicker.md. The bug is fixed. |
| upstream-steam-qam-width-2026-08-12.md | Finished | 2026-09-13 | — | A note about a width limit built into Steam's own menu. Recorded. |
| wave1.md | Finished | 2026-09-13 | — | A report on four pieces of work landing together, from over a month ago. |
| wave2.md | Finished | 2026-09-13 | — | A report on two pieces of work landing together, from over a month ago. |
| wave3.md | Finished | 2026-09-13 | — | A report on three pieces of work landing together, from over a month ago. |
| wave4.md | Finished | 2026-09-13 | — | A report on one more piece of work landing, from over a month ago. |

## Helper scripts

Moved into `scripts/archive/`. Same three reasons, same rules on delete dates.

| File | Reason | Archived | Delete after | Why |
|---|---|---|---|---|
| gen_compat_patterns.py | Finished | 2026-09-13 | — | A one-off tool that generated the starter troubleshooting-tips data. That data is already generated and saved. |
| measure_kb_batch_verification.py | Finished | 2026-09-13 | — | Checked one specific batch of test questions before the maintainer approved pinning them. That batch is done. |
| probe_card_name_collisions.py | Finished | 2026-09-13 | — | Checked the knowledge base for clashing card names. Done, answer filed. |
| probe_deck_followup_memory.py | Finished | 2026-09-13 | — | Answered one specific question about a memory feature. Answered. |
| probe_deck_step12_extractions.py | Finished | 2026-09-13 | — | A one-off check during a specific step of the earlier clean-up round. That step is done. |
| probe_deck_tab_bar.py | Finished | 2026-09-13 | — | Measured the tab bar's size for a bug that is now fixed. |
| probe_deck_tab_strip.py | Finished | 2026-09-13 | — | Measured tab-strip styling for a bug that is now fixed. |
| probe_deck_tab_switch.py | Finished | 2026-09-13 | — | Measured tab-switching for a bug that is now fixed. |
| probe_pc_embed_eviction.py | Finished | 2026-09-13 | — | A one-off measurement from a knowledge-base wave that has since landed. |
| qa_wave3_pc_side.py | Finished | 2026-09-13 | — | The computer half of testing for a knowledge-base wave that has since landed. |
| tmp_whisper_hallucination_probe.py | Abandoned | 2026-09-13 | 2026-12-12 | A scratch file for testing voice-recognition mistakes. It has no name, no header, and nothing else in the project points to it — it looks like a leftover that should have been deleted at the time. |

## Checking for files past their delete date

Run `python scripts/docs_archive.py list-overdue` to see which rows above (if any) have passed
their delete-after date. It only prints a list — nothing is deleted automatically. A person
decides what to do with what it prints.
