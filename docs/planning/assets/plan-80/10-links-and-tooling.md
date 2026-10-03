# Plan 80, helper 10: links and tooling list

Made 2026-10-03 on branch `experimental`, before anything moved. Read-only: nothing else was edited. Step 5 is checked against this sheet.
Live files = every tracked file except `docs/archive/`, `docs/planning/assets/` and `node_modules`. Plans under `docs/planning/` count as live.

## A. Links from live files into the roadmap files

### A1. Counts

Method: every place a live file writes `roadmap.md`, `roadmap-details.md` or `roadmap-shelved.md` (with or without `docs/` or `archive/` in front), plus every same-file `](#anchor)` link inside the two roadmap files. Anchors were checked against the headings the way GitHub makes them.

| Count | Number |
|---|---|
| Places that name one of the three files (links and plain-text mentions) | 331 |
| Of those, real markdown links `[x](...)` | 189 |
| Links that carry a `#anchor` | 113 (94 from other files, 19 same-file links inside the two roadmap files) |
| Into `roadmap.md` with an anchor | 30 (20 cross-file, 10 same-file) |
| Into `roadmap-details.md` with an anchor | 83 (74 cross-file, 9 same-file) |
| To `roadmap.md` top (no anchor) | 164 |
| To `roadmap-details.md` top (no anchor) | 45 |
| To `docs/archive/roadmap-shelved.md` (no anchor) | 8 (plus 1 bare `roadmap-shelved.md` in the plan 80 file) |

**The plan said 246 links to headings. That number is wrong.** Counted three ways, I get 113 anchored links (94 cross-file plus 19 same-file), which use 74 different anchors (3 of those anchors are already broken). Even counting every plain mention of the files I get 331. I could not find any way to reach 246; step 5 should use 113 (and the grouped list below) as its checklist.

Links that point at a part that will MOVE in step 3 (anchored links only):

- Definitely move: 28 (roadmap section anchors `#knowledge-base-and-rag` and `#shelved`, plus details headings about the knowledge base: retrieval, notes, tips, eval, RAG phases, games added to the notes).
- Judgement (spoiler headings and mixed "Flow" notes that the knowledge base entries link to): 10. Owner to decide.
- Broken today: 10 (list in A4).
- Stay but the target heading is renamed: 3 (`#done-for-v050`).
- Stay put: 62.

Also: 8 of the links to `archive/roadmap-shelved.md` and the plain-text mentions below will need to point at `docs/roadmap-shelved.md` (see A3). Links written in the moving sections: any link whose source line sits inside the roadmap KB or Shelved section is marked `[src moves]`; once that text is in `roadmap-kb.md` or `roadmap-shelved.md`, its relative links (same-folder `roadmap-details.md#x`, `#bugs` and so on) must be re-read, because `#bugs`, `#features`, `#verify` will no longer be in the same file.

### A2. Anchored links, grouped by target anchor

Format: anchor, heading line today, what step 3 does to it, then every link as `file:line`.

#### Into docs/roadmap.md

- `#knowledge-base` (no such heading) — BROKEN today — 2 links: docs/planning/17-kb-online-versus-strategy-content.md:5; docs/planning/17-kb-online-versus-strategy-content.md:5
- `#planned` (no such heading) — BROKEN today — 7 links: docs/development.md:312; docs/planning/10-wake-word-listening-feasibility.md:5; docs/planning/10-wake-word-listening-feasibility.md:534; docs/planning/12-deep-mod-ai-hints-feasibility.md:5; docs/planning/12-deep-mod-ai-hints-feasibility.md:226; docs/planning/12-deep-mod-ai-hints-feasibility.md:408; docs/planning/web-permission-discovery.md:3
- `#bugs` (line 56) — stays — 7 links: docs/audit/decky-realms.md:179; docs/audit/maintainer-decisions-archive.md:2164; docs/design-language.md:51; docs/development.md:312; docs/planning/12-deep-mod-ai-hints-feasibility.md:164; docs/testing.md:21; docs/roadmap.md:24
- `#features` (line 134) — stays — 2 links: docs/testing.md:21; docs/roadmap.md:24
- `#verify` (line 332) — stays — 3 links: docs/testing.md:21; docs/testing.md:331; docs/roadmap.md:24
- `#knowledge-base-and-rag` (line 451) — MOVES (section to roadmap-kb.md) — 4 links: docs/planning/37-rag-status-report.md:8; docs/planning/spoiler-constitution.md:8; docs/roadmap.md:8; docs/roadmap.md:25
- `#shelved` (line 670) — MOVES (section to roadmap-shelved.md) — 2 links: docs/roadmap.md:12; docs/roadmap.md:40
- `#done-for-v050` (line 715) — stays, heading RENAMED in step 4 (new anchor) — 3 links: docs/roadmap.md:33; docs/roadmap.md:336; docs/roadmap.md:459 [src moves]

#### Into docs/roadmap-details.md

- `#verify` (no such heading) — BROKEN today — 1 link: docs/roadmap-details.md:799
- `#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach` (line 15) — stays — 2 links: docs/roadmap-details.md:116; docs/roadmap-details.md:123
- `#ordinary-phrases-attach-game-cards` (line 183) — MOVES (to roadmap-kb-details.md) — 3 links: docs/roadmap-details.md:490; docs/roadmap.md:583 [src moves]; docs/roadmap-details.md:484
- `#terse-mode-speed-answers-in-three-lines` (line 214) — stays — 1 link: docs/roadmap.md:227
- `#the-chat-summary-card-appears-behind-the-dock-until-down-is-pressed` (line 305) — stays — 1 link: docs/roadmap.md:120
- `#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown` (line 324) — stays — 2 links: docs/roadmap.md:128; docs/roadmap.md:129
- `#make-the-preset-chips-look-more-like-chips` (line 348) — stays — 1 link: docs/roadmap.md:398
- `#shipped-qa-owed--why-each-was-built-this-way` (line 365) — stays — 2 links: docs/roadmap-details.md:1284; docs/roadmap-details.md:1301
- `#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against` (line 394) — stays — 1 link: docs/roadmap.md:588 [src moves]
- `#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips` (line 421) — stays — 2 links: docs/roadmap-details.md:478; docs/roadmap.md:580 [src moves]
- `#unrelated-questions-still-get-game-cards-stapled-on-2026-09-02-wording` (line 482) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:583 [src moves]
- `#small-and-cosmetic-as-filed` (line 516) — stays — 1 link: docs/roadmap.md:111
- `#user-adjustable-spoiler-fencing-absorbed-into-the-tiered-setting` (line 529) — JUDGEMENT (mixed or spoiler subject) — 1 link: docs/roadmap.md:630 [src moves]
- `#ask--reply-items-with-short-entries-as-filed` (line 536) — stays — 1 link: docs/roadmap.md:201
- `#deck-health-snapshot-local-reply-tts-on-deck-model-benchmark` (line 560) — stays — 1 link: docs/roadmap.md:289
- `#first-run-ghost-new-chat-label` (line 590) — stays — 1 link: docs/roadmap.md:160
- `#replace-the-bonsai-tab-icon` (line 599) — stays — 1 link: docs/roadmap.md:425
- `#adjustable-text-size-in-settings` (line 610) — stays — 1 link: docs/roadmap.md:229
- `#focus--deck-ui-items-with-short-entries-as-filed` (line 622) — stays — 1 link: docs/roadmap.md:231
- `#spoiler-coverage-should-be-a-setting-with-tiers` (line 632) — JUDGEMENT (mixed or spoiler subject) — 1 link: docs/roadmap.md:630 [src moves]
- `#eval-fixture-cannot-see-a-recall-failure` (line 663) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:614 [src moves]
- `#kb-visual-maps` (line 671) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:626 [src moves]
- `#kb-online--versus-strategy-content-and-rag-phase-5` (line 679) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:639 [src moves]
- `#rag-phase-4-extended-retrieval` (line 689) — MOVES (to roadmap-kb-details.md) — 3 links: docs/roadmap.md:647 [src moves]; docs/roadmap.md:648 [src moves]; docs/roadmap-details.md:1923
- `#rag-phase-7-community-tip-contribution-rag-phase-8` (line 754) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:659 [src moves]
- `#a-troubleshooting-question-mostly-never-reaches-the-tips` (line 775) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:635 [src moves]
- `#permissions--safety-items-as-filed` (line 790) — stays — 1 link: docs/roadmap.md:261
- `#platform--upstream-items-as-filed` (line 803) — stays — 1 link: docs/roadmap.md:263
- `#controller-macro-test-rig-and-live-view` (line 848) — stays — 1 link: docs/roadmap.md:273
- `#the-five-star-and-six-star-platform-items-as-filed` (line 865) — stays — 1 link: docs/roadmap.md:292
- `#headline-first-every-answer-opens-with-one-line-that-stands-alone` (line 1196) — stays — 1 link: docs/roadmap.md:169
- `#give-the-reclaimed-height-to-the-transcript` (line 1213) — stays — 1 link: docs/roadmap.md:198
- `#the-floating-panel-inside-steamvr` (line 1228) — stays — 1 link: docs/roadmap.md:298
- `#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp` (line 1247) — stays — 1 link: docs/roadmap.md:320
- `#named-chat-slots` (line 1306) — stays — 2 links: docs/roadmap-details.md:1330; docs/roadmap.md:431
- `#wrong-subject-notes` (line 1360) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:575 [src moves]
- `#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions` (line 1470) — stays — 1 link: docs/roadmap.md:596 [src moves]
- `#rag-phase-8-catalog-corpus` (line 1507) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:666 [src moves]
- `#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named` (line 1578) — stays — 1 link: docs/roadmap.md:425
- `#measure-how-well-the-ai-reads-a-screenshot` (line 1678) — JUDGEMENT (mixed or spoiler subject) — 1 link: docs/roadmap.md:644 [src moves]
- `#cost-to-a-running-game-second-sighting` (line 1797) — JUDGEMENT (mixed or spoiler subject) — 1 link: docs/roadmap.md:530 [src moves]
- `#no-tip-line-numbers` (line 1814) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap-details.md:786
- `#tip-cut-off-fix` (line 1828) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap-details.md:785
- `#blind-questions-done` (line 1837) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:471 [src moves]
- `#speed-mode-tip-gap` (line 1849) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:565 [src moves]
- `#lan-word-boundary-fix` (line 1857) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap-details.md:785
- `#three-new-games-and-their-notes` (line 1864) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:473 [src moves]
- `#library-format-bump-and-per-game-deck-tips` (line 1884) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap-details.md:717
- `#black-mesas-electrified-water-question` (line 1971) — MOVES (to roadmap-kb-details.md) — 1 link: docs/roadmap.md:570 [src moves]
- `#overnight-runs-first-real-run` (line 2513) — stays — 1 link: docs/roadmap.md:273
- `#flow-l7-findings` (line 2576) — JUDGEMENT (mixed or spoiler subject) — 4 links: docs/roadmap.md:561 [src moves]; docs/roadmap.md:622 [src moves]; docs/roadmap-details.md:747; docs/roadmap-details.md:1956
- `#flow-l10-findings` (line 2679) — JUDGEMENT (mixed or spoiler subject) — 1 link: docs/roadmap-details.md:2831
- `#a-story-game-named-while-a-no-story-game-runs-lost-its-spoiler-covers` (line 2782) — JUDGEMENT (mixed or spoiler subject) — 1 link: docs/roadmap-details.md:2794
- `#what-bonsai-costs-a-running-game` (line 2822) — stays — 1 link: docs/roadmap.md:211
- `#a-strategy-checklist-that-arrives-while-the-panel-is-closed-never-shows-and-after-any-reopen-a-refine-chip-sends-its-follow-up-in-speed-mode` (line 2833) — stays — 2 links: docs/roadmap-details.md:2841; docs/roadmap.md:366
- `#a-faded-ghost-of-the-tab-bar-is-left-drawn-over-the-chip-row-after-touching-the-screen` (line 2847) — stays — 1 link: docs/roadmap.md:109
- `#the-chat-summary-reads-oddly-in-places` (line 2853) — stays — 1 link: docs/roadmap.md:350
- `#when-the-length-limit-cuts-a-choice-menu-the-next-part-of-the-answer-is-lost` (line 2874) — stays — 3 links: docs/roadmap-details.md:2888; docs/roadmap.md:357; docs/roadmap.md:358
- `#the-games-own-chip-never-came-back-and-the-chips-turned-over-too-slowly` (line 2890) — stays — 2 links: docs/roadmap.md:352; docs/roadmap.md:354
- `#after-the-quick-start-is-opened-and-closed-the-help-chip-stayed-and-the-suggestion-chips-never-took-the-row` (line 2901) — stays — 2 links: docs/roadmap.md:371; docs/roadmap.md:373
- `#a-press-that-never-opens-its-box-parental-lock-on-can-leave-a-stale-return-the-ring-here-note-behind` (line 2911) — stays — 1 link: docs/roadmap.md:342
- `#after-the-release-two-clean-ups-behind-the-scenes` (line 2917) — stays — 1 link: docs/roadmap.md:92
- `#the-walk-check-calls-a-stop-hidden-when-a-corner-icon-merely-overlaps-its-box` (line 2923) — stays — 1 link: docs/roadmap.md:67
- `#with-voice-replies-on-when-i-asked-by-voice-a-spoken-questions-answer-may-not-read-itself-aloud` (line 2929) — stays — 1 link: docs/roadmap.md:361
- `#roadmap-clean-up-task-trim-this-file-done-2026-09-15` (line 2935) — stays — 1 link: docs/roadmap.md:3
- `#after-picking-a-setting-from-the-search-list-above-the-question-box-down-cannot-get-past-the-answer` (line 2956) — stays — 1 link: docs/roadmap.md:385

### A3. Links without an anchor

**To docs/roadmap.md top** (164; stay as they are (the file keeps its name)):

- .claude/agents/bookkeeper.md: 21
- .claude/agents/bugfix-lane-opus-high.md: 40
- .claude/agents/bugfix-lane-opus-low.md: 40
- .claude/agents/bugfix-lane-opus-medium.md: 40
- .claude/agents/bugfix-lane-opus-xhigh.md: 40
- .claude/agents/bugfix-lane-sonnet-medium.md: 40
- .claude/agents/bugfix-lane.md: 40
- .claude/agents/feature-lane.md: 38
- .claude/agents/kb-lane.md: 45
- .claude/hooks/bookkeeper-guard.py: 20
- AGENTS.md: 252, 252
- CHANGELOG.md: 327, 338, 345, 353, 385, 393, 547, 553, 559, 565, 571, 579, 584, 591, 598, 629, 865, 867, 875, 1111, 1169, 1189, 1210, 1213, 1213, 1224, 1227, 1228, 1229, 1231, 1233, 1234, 1235, 1236, 1237
- docs/DOCUMENTATION_INDEX.md: 10, 10, 38, 38
- docs/audit/03-friction.md: 68, 69, 77, 190
- docs/audit/decky-realms.md: 179, 192
- docs/audit/maintainer-decisions-archive.md: 288, 315, 502, 502, 2019, 2023
- docs/audit/maintainer-decisions-locked.md: 5, 5, 5, 5
- docs/audit/phase1-map-verification.md: 80
- docs/audit/rag-eval-query-style.md: 72, 72
- docs/audit/refactor-round-two/docs-triage-proposal.md: 54
- docs/design-language.md: 51
- docs/development.md: 312, 312, 314, 314, 354, 354, 364, 364
- docs/knowledge-base.md: 3, 3, 480, 480, 605, 605
- docs/mcp-setup.md: 68, 68, 77, 77
- docs/planning/02-dps-upstream-findings.md: 156, 156
- docs/planning/10-wake-word-listening-feasibility.md: 5, 534, 569, 577, 597
- docs/planning/12-deep-mod-ai-hints-feasibility.md: 5, 164, 226, 408, 428
- docs/planning/17-kb-online-versus-strategy-content.md: 4, 4, 302
- docs/planning/19-controller-macro-test-rig.md: 213
- docs/planning/21-ai-owned-testing-program.md: 355, 355
- docs/planning/37-rag-status-report.md: 394, 394
- docs/planning/74-release-wave-two.md: 134
- docs/planning/web-permission-discovery.md: 3
- docs/test-evidence/README.md: 22, 22
- docs/test-evidence/plan57-QA-AI-models-screen-2-rows.json: 7
- docs/test-evidence/plan57-QA-BRANCH-EXAMPLE-01.json: 7
- docs/test-evidence/plan57-QA-EXPERT-ORDER-01.json: 7
- docs/test-evidence/plan57-QA-GREYED-STEP-OVER-02.json: 7
- docs/test-evidence/plan57-QA-PERM-JUMP-01.json: 7
- docs/test-evidence/plan57-QA-QUESTION-COLLAPSE-RING-01.json: 7
- docs/test-evidence/plan57-QA-cursor-placeholder-offset.json: 7
- docs/test-evidence/plan57-QA-kb-download-two-taps.json: 7
- docs/test-evidence/plan57-QA-main-tab-under-question-box.json: 7
- docs/test-evidence/plan57-QA-up-from-retry.json: 7
- docs/test-evidence/plan57-QA-vision-try-order-writes-settings.json: 7
- docs/test-evidence/plan61-focustrap-try1.json: 3
- docs/test-evidence/plan61-ghostreply-try1.json: 3
- docs/testing-automated.md: 81, 81
- docs/testing-manual.md: 9, 9, 652, 652
- docs/testing.md: 21, 21, 221, 221, 340, 345, 345
- docs/troubleshooting.md: 8, 8, 685, 685
- packages/bonsai-mcp/knowledge/policies/documentation.md: 13
- packages/bonsai-mcp/knowledge/policies/plan-accountability.md: 11
- packages/bonsai-mcp/knowledge/workflows/tier-qa.md: 117, 117
- py_modules/backend/services/knowledge_base_cards.py: 141, 297
- py_modules/backend/services/transparency_service.py: 433
- scripts/archive/measure_kb_batch_verification.py: 14
- scripts/closed_rows_check.py: 49, 152
- scripts/docs_split_check.py: 9, 123
- scripts/probe_deck_ask_row_width.py: 7
- scripts/ratchet.json: 144
- scripts/ratchet.py: 765
- src/components/PullModelsModal.otherInstalledSize.test.tsx: 4
- src/data/uiScaleProfile.test.ts: 82
- src/features/plugin-shell/TabIndicatorBar.test.tsx: 307
- src/styles/sections/gamepadAndPullModels.ts: 62
- tests/test_voice_read_aloud_service.py: 268

**To docs/roadmap-details.md top** (45; stay as they are (file keeps its name, gets shorter)):

- .claude/agents/bookkeeper.md: 50
- .claude/agents/kb-lane.md: 45
- docs/DOCUMENTATION_INDEX.md: 11, 11
- docs/audit/maintainer-decisions-archive.md: 2199, 2199, 2238, 2238, 2477, 2477
- docs/audit/refactor-round-two/docs-triage-proposal.md: 53
- docs/planning/19-controller-macro-test-rig.md: 20
- docs/planning/74-release-wave-two.md: 145
- docs/planning/78-release-wave-five.md: 692
- docs/roadmap-details.md: 490, 2794, 2841, 2888
- docs/roadmap.md: 3, 10, 10, 23, 23, 67, 92, 129, 211, 342, 350, 352, 354, 357, 358, 361, 366, 371, 373, 385, 647 [src moves], 737, 737
- py_modules/backend/services/knowledge_base_search.py: 454
- src/components/KnowledgeBaseSection.tsx: 377
- src/hooks/useHandRingOnGone.ts: 7
- tests/test_chat_slot_ownership.py: 248

**To the shelved file** (9; step 5 must repoint to `docs/roadmap-shelved.md`; the archive file is replaced):

- docs/planning/80-roadmap-check-and-tidy.md: 32, 48, 68
- docs/roadmap.md: 12, 12, 41, 41, 673 [src moves], 673 [src moves]

### A4. Anchors that do not resolve today

- `docs/roadmap.md#planned` at docs/development.md:312 — no `Planned` section exists any more (the roadmap runs Bugs, Features, Verify, Knowledge base, Shelved, Done)
- `docs/roadmap.md#planned` at docs/planning/10-wake-word-listening-feasibility.md:5 — no `Planned` section exists any more (the roadmap runs Bugs, Features, Verify, Knowledge base, Shelved, Done)
- `docs/roadmap.md#planned` at docs/planning/10-wake-word-listening-feasibility.md:534 — no `Planned` section exists any more (the roadmap runs Bugs, Features, Verify, Knowledge base, Shelved, Done)
- `docs/roadmap.md#planned` at docs/planning/12-deep-mod-ai-hints-feasibility.md:5 — no `Planned` section exists any more (the roadmap runs Bugs, Features, Verify, Knowledge base, Shelved, Done)
- `docs/roadmap.md#planned` at docs/planning/12-deep-mod-ai-hints-feasibility.md:226 — no `Planned` section exists any more (the roadmap runs Bugs, Features, Verify, Knowledge base, Shelved, Done)
- `docs/roadmap.md#planned` at docs/planning/12-deep-mod-ai-hints-feasibility.md:408 — no `Planned` section exists any more (the roadmap runs Bugs, Features, Verify, Knowledge base, Shelved, Done)
- `docs/roadmap.md#knowledge-base` at docs/planning/17-kb-online-versus-strategy-content.md:5 — the section is now `Knowledge base and RAG`, so the anchor is `#knowledge-base-and-rag`
- `docs/roadmap.md#knowledge-base` at docs/planning/17-kb-online-versus-strategy-content.md:5 — the section is now `Knowledge base and RAG`, so the anchor is `#knowledge-base-and-rag`
- `docs/roadmap.md#planned` at docs/planning/web-permission-discovery.md:3 — no `Planned` section exists any more (the roadmap runs Bugs, Features, Verify, Knowledge base, Shelved, Done)
- `docs/roadmap-details.md#verify` at docs/roadmap-details.md:799 — this is in the details file but means the roadmap Verify section, so it should be `roadmap.md#verify`

Also stale by quoted title, not by anchor: code comments that tell the reader to look up an entry by its title in the roadmap, where the entry is no longer there today (see C, code comments).

### A5. Live plans that link in (finished or not)

Status read from each plan's own text. Step 5 can choose.

- Finished: `74-release-wave-two.md` ("finished 2026-09-28"); `78-release-wave-five.md` (session part finished 2026-10-01, Deck part still owed).
- Built, in use, or implemented: `21-ai-owned-testing-program.md` (implemented, advisory); `19-controller-macro-test-rig.md` (built, four pieces left, so live).
- Live: `17-kb-online-versus-strategy-content.md` (not started; its two `#knowledge-base` links are broken and point into the part that moves); `80-roadmap-check-and-tidy.md` (this plan; in progress).
- No status line found (looks like a closed study or a reference note; owner call): `02-dps-upstream-findings.md`, `10-wake-word-listening-feasibility.md` (7 links, 5 of them to the missing `#planned`), `12-deep-mod-ai-hints-feasibility.md` (9 links, mostly to the missing `#planned`), `37-rag-status-report.md`, `spoiler-constitution.md`, `web-permission-discovery.md` (discovery docs only; link `#planned` is broken).

## B. Archived documents that link to the roadmap files

One-line "links may be stale" warning goes into each (step 5, call 6). The finished plans from A5 (`74-release-wave-two.md`, `78-release-wave-five.md`) can join the list if the owner chooses.

74 files under `docs/archive/` name one of the files (29 of them with an anchor). Four of them are the roadmap archives themselves: `roadmap-bugs-fixed.md`, `roadmap-done-v0.5.0.md`, `roadmap-completed.md`, `roadmap-details-closed.md`.

01-map.md, 02-readme-redesign-plan.md, 03-lbrb-tab-flicker.md, 04-strategy-spoiler-false-positive.md, 05-plan.md, 05-token-streaming-review.md, 06-doc-triage.md, 06-thinking-blurbs-review.md, 07-mainpy-inventory.md, 07-named-chat-slots-postmortem.md, 08-kids-master-lock-feasibility.md, 08-postmortem.md, 09-prevention.md, 09-steam-frame-companion-feasibility.md, 11-native-qam-tile-feasibility.md, 13-roadmap-feature-ideas.md, 14-kids-master-lock-implementation-plan.md, 15-corpus-licensing-attribution-plan.md, 16-soft-num-predict-thinking-budget.md, 20-frozen-chip-qa-batches.md, 25-ai-character-avatars-handoff.md, 26-thursday-bugfix-sesh.md, 27-named-chat-slots-v2-implementation-plan.md, 28-named-chat-slots-v3-implementation-plan.md, 29-preset-row-three-thirds-plan.md, 30-collapsing-tab-bar.md, 31-deck-verification-round.md, 32-bugfix-session.md, 34-feature-verification-round.md, 35-bugfix-session.md, 46-kb-wave-one-session.md, 47-kb-wave-two-session.md, 48-kb-wave-three-session.md, 51-refactor-round-two.md, 58-phase-1-notes-shown-and-wiki-extracts.md, 58-phase-2-kb-session-wave-four.md, 59-tab-strip-redesign-build.md, 63-bugfix-session-four.md, 70-kb-wave-four-and-deck-test-wave.md, DOCUMENTATION_INDEX.md, README.md, clipboard-spike-2026-08-28.md, major-redesign.md, plans/backlog-implementation-plan.md, plans/post-p0-feature-backlog.md, plans/pull-models-living-catalog-PROMPT.md, rag-retrieval-quality-remediation-implementation-plan.md, rag-retrieval-quality-remediation-plan.md, red-blue-counsel/README.md, red-blue-counsel/bout-2026-04-21.md, red-blue-counsel/persona-blue-team.md, red-blue-counsel/persona-red-team.md, red-blue-counsel/ship-review-template.md, refactor-plan-round-one.md, refactor/refactor-specialist-sweep.md, research/kb-embed-bakeoff-2026-07-31.md, research/rag-sources-research.md, research/steam-input-research.md, research/voice-character-catalog.md, roadmap-bugs-fixed.md, roadmap-completed.md, roadmap-details-closed.md, roadmap-done-v0.5.0.md, roadmap-planning-questions.md, roadmap-shelved.md, session-handoff-2026-08-21.md, spikes/deck-screen-recording.md, spikes/llama-cpp-provider.md, tab_flicker.md, testing-closed-2026.md, testing-full-pre-2026-07-30.md, testing-row-history-2026.md, wave2.md, wave3.md

`docs/planning/assets/` is outside both lists. It holds the findings sheets (this one and `04-verify-bugs.md` so far); they stay as they are.
## C. Tooling that names these files

What each one does today, and what step 5 must change so it also knows `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md` and `docs/roadmap-shelved.md`.

**Guards and checks**

- `.claude/hooks/bookkeeper-guard.py:19-24` (`GUARDED_DOCS`): refuses a Fable edit to the roadmap, testing docs and changelog. It does NOT list `docs/roadmap-details.md` today, so the long notes are unguarded. Step 5: add `docs/roadmap-kb.md`, `docs/roadmap-shelved.md`; owner to decide whether to add both long-notes files (`roadmap-details.md`, `roadmap-kb-details.md`). Line 64 message ("the roadmap, testing docs or changelog") still reads right. Line 9 comment is fine.
- `scripts/closed_rows_check.py:48-55` (`CLOSED_FILES`) and `:151-155` (`done_start`): reads closed entries from the roadmap's `## Done` section (the pattern `^## Done\b` still matches a heading renamed "Done for 0.6.0") and from archive files. Step 5: add `docs/roadmap-kb.md` if it keeps any closed entries (it would need its own Done start, because `done_start` only special-cases `docs/roadmap.md`); add the new trimmed archives `docs/archive/roadmap-trimmed-2026-10-*.md` if they hold closed rows; decide for `docs/roadmap-shelved.md` (parked, so probably none). `tests/test_closed_rows_check.py` has no roadmap names but should get a case for any new file.
- `scripts/docs_split_check.py:8-9, 123`: takes `--before <ref>:<path>` and several `--after` paths. No code change. Step 3 and 5 must run it for the roadmap split with `--after` set to `docs/roadmap.md docs/roadmap-kb.md docs/roadmap-shelved.md` plus the trimmed archives, and the same for the long notes (`roadmap-details.md`, `roadmap-kb-details.md`, archive). Without the archives it fails, because every old line must survive somewhere.
- `scripts/ratchet.py:764-765` (`metric_doc_size_kb_roadmap`) and `:841` (metric table); `scripts/ratchet.json:138-148` (`doc_size_kb_roadmap`: best 90.45 KB, target 40, ceiling 100, advisory). This is the size limit that `verify.py --quick` runs. Step 5: reset `best` after the split (the file will be far under it); add metrics and ceilings for `roadmap-kb.md`, `roadmap-shelved.md` and the two long-notes files, or the new files have no size limit at all. Nothing measures `roadmap-details.md` today. Comments at `ratchet.py:976, 1002` mention the roadmap's growth only in words.
- `scripts/verify.py:33-36, 347-355`: calls ratchet and closed-rows checks. Names no roadmap file; no change, but its docstring line 36 ("testing.md or testing-manual.md") needs no edit.
- `.githooks/pre-commit`, `.githooks/pre-push`, `.github/workflows/`: no mention of any roadmap file. No change.
- `packages/bonsai-mcp/validate-knowledge.mjs` and its `src`/`scripts`: no mention. No change. `packages/bonsai-mcp/knowledge/architecture/test-inventory.json` mentions the two check scripts; generated, never hand-edit.
- `.claude/hooks/model-routing-check.py:33, 47-48, 114`: mentions "the roadmap" in words only (routing rule text). No change needed.

**Helper and agent files**

- `.claude/agents/bookkeeper.md:3, 7, 21, 26, 40, 48-50, 71`: says to read the header of `docs/roadmap.md`, move entries between sections including "Knowledge base and RAG", and move older notes to `docs/roadmap-details.md`. Step 5: name the new files; say KB entries and their long notes now live in `roadmap-kb.md` and `roadmap-kb-details.md`, parked ones in `roadmap-shelved.md`; fix the "five lines an entry" rule's target file per entry type.
- `.claude/agents/kb-lane.md:3, 45`: forbids edits to `docs/roadmap.md`, `docs/roadmap-details.md`. Step 5: add `roadmap-kb.md`, `roadmap-kb-details.md`, `roadmap-shelved.md` to the "do not touch" list.
- `.claude/agents/bugfix-lane.md`, `bugfix-lane-opus-{low,medium,high,xhigh}.md`, `bugfix-lane-sonnet-medium.md` (each line 40, plus description line 3 and lines 19, 41-43, 59), and `feature-lane.md:38`: "You do not touch `docs/roadmap.md`, `docs/testing.md`, ..." Step 5: add the new roadmap files (or say "any roadmap file") to the list. Seven files, same edit.
- `.claude/agents/deck-driver.md:16`: says "roadmap" in words only. No change.

**Guides and indexes**

- `AGENTS.md:252-259, 340`: step 1 of the same-change-set rule names `docs/roadmap.md`; line 340 says lanes never edit "the roadmap". Step 5: name the KB and shelved files in step 1 (where KB entries and parked ones go). Also check the "Which model does which work" table for the bookkeeper's file list.
- `CLAUDE.md:26`: describes the guard as covering "the roadmap, testing docs, changelog". Step 5: reword if the guard list gains files.
- `docs/DOCUMENTATION_INDEX.md:10-13, 24, 38`: lists `roadmap.md` ("Bugs, Verify, themed Backlog" is already out of date) and `roadmap-details.md`. Step 5: add rows for the three new files; fix the description of the roadmap.
- `docs/lessons-learned.md:544`: "It runs Bugs, Features, Verify, Knowledge base, then Done." Step 5: update the shape (Knowledge base moves out; Shelved; Done renamed). Line 548 names the roadmap's Done list: fine. Lines 434, 539: words only.
- `docs/testing.md:21, 331`, `docs/testing-manual.md` (4), `docs/testing-automated.md` (2), `docs/troubleshooting.md` (4), `docs/development.md` (10), `docs/mcp-setup.md` (4), `docs/knowledge-base.md` (6), `docs/design-language.md` (2), `docs/test-evidence/README.md:22`: ordinary links; covered in A. `docs/knowledge-base.md` links most likely point at KB entries that move, so it should read `roadmap-kb.md`.
- Locked decisions and audit docs (`docs/audit/*`): links covered in A; decisions files are records. Only fix live links.

**Knowledge policy files**

- `packages/bonsai-mcp/knowledge/policies/documentation.md:13`: tells agents to update `docs/roadmap.md`, `docs/testing.md`, `docs/troubleshooting.md` when a feature completes. Step 5: add the KB roadmap.
- `packages/bonsai-mcp/knowledge/policies/plan-accountability.md:11`: names the roadmap when plans are drafted. Step 5: say "the roadmap files".
- `packages/bonsai-mcp/knowledge/workflows/tier-qa.md:117`: link `docs/roadmap.md` for priority. No change.

**Code comments (words, not behavior)**

All point at an entry by title; none is a link. Several are already stale because the quoted title is not in the roadmap today:
- `py_modules/backend/services/knowledge_base_cards.py:141, 297` and `transparency_service.py:433`: "The credit line under a reply never names a note..." — not in `docs/roadmap.md` today.
- `knowledge_base_search.py:454`: `roadmap-details.md` "The 'no close match' line reads wrong..." — heading exists at details line 1394 (KB, will move to `roadmap-kb-details.md`).
- `src/components/KnowledgeBaseSection.tsx:377`, `src/hooks/useHandRingOnGone.ts:7`, `KnowledgeBaseSection.pullHint.test.tsx:5`: "Flow L10 findings" (judgement heading).
- `tests/test_chat_slot_ownership.py:248`: details (no title). 
- Already missing from the roadmap: `PullModelsModal.otherInstalledSize.test.tsx:4`, `src/data/uiScaleProfile.test.ts:82`, `tests/test_voice_read_aloud_service.py:268`, `scripts/probe_deck_ask_row_width.py:5-7`; `TabIndicatorBar.test.tsx:307` and `gamepadAndPullModels.ts:62` point at entries still in Bugs/Features. `scripts/archive/measure_kb_batch_verification.py:14`: "knowledge-base bugs".
Step 5: fixing code comments is optional and would touch source files; the owner should decide (recommend: leave, since they were already drifting). The test files are guarded for Fable edits.

## D. Notes for the review

- The 246 figure is wrong; 113 anchored links is the number to check against (A1). The sheet uses "link" for a markdown link and "mention" for plain text such as code comments.
- Entry-level anchors do not exist: roadmap entries are bullets, so only section headings are linkable in `roadmap.md`. All 30 anchored links into it (20 cross-file, 10 same-file) go to a section heading; 9 are to sections that no longer exist (7 to `#planned`, 2 to `#knowledge-base`).
- Moving the knowledge base section breaks (if not repointed) 4 `#knowledge-base-and-rag` links and 2 `#shelved` links, and every `roadmap-details.md#` link whose heading goes to the KB long notes. Section A2 marks each.
- The roadmap's own KB section links to details headings that are not about the knowledge base (the vision measurement note, the running-game cost note, and the Flow L7 and L10 notes). I marked them JUDGEMENT; the owner decides whether they follow the KB entry or stay.
- Spoiler headings are also marked JUDGEMENT. Unlinked details headings that look like KB subjects and would also move under the same rule: "The corpus has no starting out card" (643), "Every question waits about a second while the note search loads" (907), "Searching the notes by meaning costs about a second" (1345), the "no close match" line (1394), "Five checks from the August retrieval rework" (1417), "A suggestion chip pulled from the game's notes shows no Tip mark" (1524), "KB transparency matches what the model got" (1993), "Pull the embedding model..." (2540), "Answer quality, known issue: answers borrow each other's wording" (2810). Not checked line by line.
- The bookkeeper guard does not cover `roadmap-details.md` today. Whether to start guarding it is a call for the owner.
- The size check only measures `roadmap.md` and `testing.md`. After the split, `best` in the ratchet should be reset or the old best (90.45 KB) hides growth in the new files.
- Heading text will change in step 3-4 (the Done rename at least), so any link written to a renamed heading must follow the new GitHub-style anchor.
- Files modified by other chats when I arrived (not touched): `docs/audit/maintainer-decisions-locked.md`, `docs/planning/80-roadmap-check-and-tidy.md`.
- The coordinator's note about newly fetched history: I looked up no commit hashes in this task, so nothing needed re-checking.
