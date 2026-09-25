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
| 51-refactor-round-two.md | Finished | 2026-09-15 | — | The plan for the seven-phase clean-up. All seven phases ran between 13 and 15 September 2026. Kept as the record of what was intended; the postmortem holds what actually happened, including the three places this plan turned out to be wrong. |
| refactor-plan-round-one.md | Replaced | 2026-09-15 | — | The first clean-up plan, from the repo root. Its finished items are recorded in it; everything still open was carried into round two, which then finished. |

## Plans moved in on 2026-09-24

Twenty-eight plans from the planning folder, and two drawings that belong to them, following the
list the maintainer approved on 2026-09-24
([audit/planning-folder-review-2026-09-24.md](../audit/planning-folder-review-2026-09-24.md), which
holds the evidence for each). The rule was agreed with it: a plan is put away once its build is
done and every Deck check it still owes is carried by the live roadmap, the test lists, or the
maintainer's checks page. So "Finished" here does not always mean every check passed. The Why
column says which ones did. Before moving, eight of these had their status line corrected to say how
they really ended.

| File | Reason | Archived | Delete after | Why |
|---|---|---|---|---|
| 04-strategy-spoiler-false-positive.md | Replaced | 2026-09-24 | — | Why a spoiler box covered things the player had already named. Plan 54 and the spoiler rulebook carried the fixes on; the problem still open is a roadmap bug. |
| 05-token-streaming-review.md | Finished | 2026-09-24 | — | A review of how answers appear word by word. Both phases built and passed on the Deck; one check owed on testing.md; its open design question is now a roadmap entry. |
| 06-thinking-blurbs-review.md | Finished | 2026-09-24 | — | A review of the short "thinking…" line. Its fixes landed and passed on the Deck under newer test names; one umbrella row stays open on testing.md. |
| 16-soft-num-predict-thinking-budget.md | Finished | 2026-09-24 | — | Stopped long replies being cut off with nothing shown. Built 2026-08-10; four of five checks passed; the fifth has never managed to trigger and is on the roadmap. |
| 23-what-still-needs-a-human.md | Replaced | 2026-09-24 | — | A short page on what a person still has to do. Plan 21 sections 6 and 7 say the same; nothing linked to it. |
| 24-track-a-ci-baseline.md | Finished | 2026-09-24 | — | Put the tests into a check on every push. Live and blocking since 2026-08-26. Fully done; its four deferred tidy-ups are a roadmap entry. |
| 28-named-chat-slots-v3-implementation-plan.md | Finished | 2026-09-24 | — | The third build plan for named chat slots. All 19 commits in; most rows passed; one bug it found is open on the roadmap. |
| 29-preset-row-three-thirds-plan.md | Finished | 2026-09-24 | — | Put two suggestion chips back side by side. Built; halves of two checks still owed, in testing-manual.md. |
| 30-collapsing-tab-bar.md | Finished | 2026-09-24 | — | The thin tab bar that opens when the ring reaches it. Built; the touch check and one opener still owed, in testing-manual.md. Plan 59 later redrew the open strip. |
| 31-deck-verification-round.md | Finished | 2026-09-24 | — | The first Deck checking round's running order and log. Ran 2026-09-03/04; carried on by plan 34. |
| 34-feature-verification-round.md | Finished | 2026-09-24 | — | The second Deck checking round. Ran 2026-09-05/06; its leftovers went to plans 61 and 64. |
| 35-bugfix-session.md | Finished | 2026-09-24 | — | The second bug-fixing session. Every fix passed on the Deck. Fully proven. |
| 40-reasoning-display.md | Replaced | 2026-09-24 | — | The first plan for showing the model's thinking. Its own log says plan 57 is the build plan. |
| 45-settings-shortcut-card.md | Finished | 2026-09-24 | — | The Steam settings card above the question box. Built 2026-09-16; five of seven checks done; rows 06 and 07 are a roadmap Verify entry. Its Done line had claimed nothing was owed (corrected). |
| 47-kb-wave-two-session.md | Finished | 2026-09-24 | — | Knowledge base wave two. Its two failures on the night were fixed and proven later. Fully proven. |
| 48-kb-wave-three-session.md | Finished | 2026-09-24 | — | Knowledge base wave three. Built; two gaps it found (the "No tip" line never firing, a follow-up naming the wrong boss) are roadmap entries. |
| 54-spoiler-rules-gaps.md | Finished | 2026-09-24 | — | Four gaps between the spoiler rulebook and the code. Built; one check waits on a game the maintainer does not have yet. |
| 55-bugfix-session-three.md | Finished | 2026-09-24 | — | The third bug-fixing session. Everything it left owed was closed later. Fully proven; its deferred settings-list clean-up is a roadmap entry. |
| 56-feature-session-four.md | Finished | 2026-09-24 | — | The fourth feature session. Built and mostly proven; the settings card's two rows and half the Spy check still owed on testing.md. |
| 57-reasoning-display-build.md | Finished | 2026-09-24 | — | The build plan for showing the model's thinking. Six of seven rows passed; the last is blocked by a D-pad bug on the roadmap. |
| 58-phase-1-notes-shown-and-wiki-extracts.md | Finished | 2026-09-24 | — | Show a note's own words, and read wikis without rewriting. Built; the library published 2026-09-23; the read-aloud row needs ears. |
| 59-tab-strip-redesign-build.md | Finished | 2026-09-24 | — | The redrawn open tab strip. Built; the maintainer's look at five screenshots and the chat-name dots are still open. |
| 60-chip-button-restyle.md | Finished | 2026-09-24 | — | Suggestion chips as raised buttons. Built; four checks owed in testing-manual.md. |
| 61-automated-verification-session.md | Finished | 2026-09-24 | — | The overnight automated Deck round. Ran 2026-09-18/19; eleven entries closed; what it found is on the roadmap. |
| 62-feature-session-five.md | Finished | 2026-09-24 | — | The fifth feature session. Three of four features proven on the Deck; Read aloud's new shape still owed on testing.md. |
| 63-bugfix-session-four.md | Finished | 2026-09-24 | — | The fourth bug-fixing session. Ran 2026-09-21/22; plan 64 proved most of it; one fix (the chat-name dots) failed later and is a roadmap bug. |
| 64-big-verification-session.md | Finished | 2026-09-24 | — | The big Deck verification night. 23 fixes, 18 proven; the other five and its six calls are on the roadmap or the checks page. |
| 65-trim-docs-split-long-files.md | Finished | 2026-09-24 | — | Made the big documents and long files smaller. Fully proven on the Deck the same night. |
| assets/58-phase-1-block-mockups.html | Finished | 2026-09-24 | — | The drawings of the "From the notes" block for plan 58 phase 1, moved with it. A code comment in useKbNotesFold.ts points here. |
| assets/62-feature-board.html | Finished | 2026-09-24 | — | The repo copy of plan 62's drawing board, moved with it. |

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
