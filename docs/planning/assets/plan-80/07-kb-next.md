# Plan 80, step 1 — findings sheet 07: Knowledge base, Next

- **Slice:** `docs/roadmap.md`, Knowledge base and RAG, `### Next` (lines 603 to 669).
- **Date:** 2026-10-03. **Entries:** 15.
- **Verdicts:** true 9, stale 6 (counts or dates out of date), done with proof 0, fixed with no proof 0, unclear 0.
- **Status changes proposed:** none. No entry moves section. Six entries need a number or a sentence corrected (marked stale).
- **Checked against:** locked and archived decisions, testing.md, testing-manual.md, the evidence folder, CHANGELOG.md, the corpus file `data/kb/strategy_seed.json`, and the code.
- **Link prefix:** all decision links below are relative to `docs/roadmap.md`.
- **Hashes:** the coordinator fetched the full history (2,369 commits) mid-task. The one hash in this slice, `db4b3b4a`, was rechecked and resolves.

Corpus counts used below (from `data/kb/strategy_seed.json`, today): 414 notes over 38 games. The original thirteen titles (games 1 to 13) hold 164 notes. By a quick count of notes that carry a "Summary:" or "Weak points:" label, 22 are labelled-line cards.

## Measure answers with the character voice on
- **Title / where:** "Measure answers with the character voice on" — Knowledge base, Next, line 605.
- **Verdict:** true.
- **Proof:** the answer test has the voice switch (`scripts/eval_kb_answers.py:199-228`, the `voice_preset_id` option). Every saved answer report from 2026-09-06 on (nine files in `docs/archive/research/kb-answer-eval-2026-09-0[6-7]*` and `...09-17-plan57-*`) records `voice_preset` as empty, so no voice-on run exists. Plan 48 § 7 planned one (`docs/archive/48-kb-wave-three-session.md`, lines 400-404); nothing in the repo shows it was run.
- **Decision owed?** no decision recorded.
- **Test owed?** yes, one run with the voice on. No evidence exists.
- **Proposed shorter entry:** ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch built.** The answer test can run with the character voice on (since 2026-09-06). No run with it on has been saved. One run is owed. Plan 48 planned it but its report has no voice results.
- **Long notes:** none linked.

## Retire the Developer tab's "Install seed knowledge base" button
- **Title / where:** "Retire the Developer tab's "Install seed knowledge base" button" — line 608.
- **Verdict:** true.
- **Proof:** the button is still in `src/components/DeveloperTab.tsx:290`, and its text at line 282 still says "Public HF/GitHub download is not live yet". The roadmap's own Done notes and `docs/knowledge-base.md` line 3 say the first public push is live (Phase 6, 2026-08-14), so the text is now wrong, which supports retiring it. The "check first" part is still open: no test file names the button, but several Deck focus walks use it as the first control on the Developer tab (`docs/test-evidence/TAB-BAR-04-collapse-into-each-tab.json`, `TAB-BAR-W1a-no-game.json`, `TAB-BAR-W1a-with-game-2.json`, `DEV-CLEAR-CHIPS-01-sweep-no-batch.json`, `SHELL-PAYLOAD-01-developer-sweep.json`). Removing the button changes what those walks land on.
- **Decision owed?** no decision recorded (the roadmap calls it an idea from the maintainer 2026-10-02).
- **Test owed?** no new test; the walks above would need their expected first control updated. No evidence of that exists.
- **Proposed shorter entry:** ★ `[KB]` **Retire the Developer tab's "Install seed knowledge base" button** — **OPEN, an idea from the maintainer 2026-10-02.** It was a stand-in from before the library was published, and its text still says the public download "is not live yet". Several Deck focus walks use it as the first stop on the tab, so check those first.
- **Long notes:** none linked.

## The eval cannot yet prove the meaning search rescues many questions
- **Title / where:** "The eval cannot yet prove the meaning search rescues many questions" — line 611.
- **Verdict:** true.
- **Proof:** the long note ("Eval fixture cannot see a recall failure", `docs/roadmap-details.md:663`) says the slice was 3 before 36 more blind rows landed, and that a fresh count is owed. No evidence file holds a newer count (searched `docs/test-evidence/` and `docs/archive/research/`). The search test still reports the slice (`scripts/eval_kb_embed_models.py:1562` and `:1762`).
- **Decision owed?** no decision recorded in the roadmap line. The long note cites D23 and D37 (blind rows) — not checked further.
- **Test owed?** yes, one run of the search test. No evidence exists.
- **Proposed shorter entry:** ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The questions the word search cannot answer at all numbered 3 when last counted, before 36 more blind rows landed. Re-count on the next search run. No code needed. [Detail](roadmap-details.md#eval-fixture-cannot-see-a-recall-failure).
- **Long notes (`roadmap-details.md:663`):** keep "Goal" (the slice must be big enough to gate a regression) and the last paragraph that says it is largely overtaken, pending one measurement. The "Starting material" and "Needs a maintainer call first" bullets are history (the 15 rows joined v2 under D23) and can go to the archive.

## Card style pass
- **Title / where:** "Card style pass" — line 615.
- **Verdict:** stale (numbers only).
- **Proof:** the entry says 139 prose cards and 16 structured. The corpus today has 414 notes, 22 of them labelled-line cards (quick count on `data/kb/strategy_seed.json`). "Facts kept is already 92%" is from the 2026-09 measurement and was not rechecked. D67 (structured cards: prose accepted) is the related decision.
- **Decision owed?** no. Related, already locked: [D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose).
- **Test owed?** yes, the answer test run that would show whether the labelled shape scores better. No evidence exists.
- **Proposed shorter entry:** ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the prose cards as labelled short lines, the shape the labelled cards already use. Facts kept was 92% when measured, so the ceiling is low. Do it only if the answer test shows the labelled shape scores better. (D67)
- **Long notes:** none linked.

## Deeper answer checks
- **Title / where:** "Deeper answer checks" — line 618.
- **Verdict:** true.
- **Proof:** the answer test has no "I don't know" scoring (no match in `scripts/eval_kb_answers.py`). The Flow L7 note is at `docs/roadmap-details.md:2576`. The 2026-09-26 sighting was not rechecked against its evidence file.
- **Decision owed?** no decision recorded.
- **Test owed?** yes, but this entry is about building new checks, not a Deck check. No evidence exists.
- **Proposed shorter entry:** ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test cannot tell whether a reply was helpful or whether the model admitted not knowing. Add questions no card can answer, scored for an honest "I don't know", and a monthly read of ten replies by a person. **Sighting 2026-09-26:** a plain tip ("raise Render Scale") became advice that contradicts itself. [Detail](roadmap-details.md#flow-l7-findings).
- **Long notes (`roadmap-details.md:2576`, Flow L7 findings):** not read in full; this section is shared with other flows. Helper 9 should decide what stays.

## KB visual maps
- **Title / where:** "KB visual maps" — line 623.
- **Verdict:** true.
- **Proof:** nothing in `src/` draws a map or outline in a reply (replies are markdown only, per the long note `roadmap-details.md:671-678`). The wave-four idea is recorded in `docs/audit/maintainer-decisions-archive.md:4100`.
- **Decision owed?** no decision recorded (the shapes are open: the long note says what a boss outline is made of is undecided).
- **Test owed?** no (research, not built).
- **Proposed shorter entry:** ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source policy and a corpus rebuild. Research first. [Detail](roadmap-details.md#kb-visual-maps).
- **Long notes (`roadmap-details.md:671`):** keep Goal, "Still parked" and "Open" bullets. The plan link points at `planning/17-kb-online-versus-strategy-content.md`, which exists.

## Spoiler coverage as a tiered setting
- **Title / where:** "Spoiler coverage as a tiered setting" — line 627.
- **Verdict:** true.
- **Proof:** no tier setting in the code (searched `src/`, `main.py`, `py_modules/` for a spoiler tier or coverage setting; only the model-policy tier exists, which is unrelated). The tier wording matches D50.
- **Decision owed?** no, already locked: [D50](audit/maintainer-decisions-archive.md#d50--locked-2026-09-01--spoiler-tiers-confirmed).
- **Test owed?** yes, Deck QA once built. No evidence exists (nothing built).
- **Proposed shorter entry:** ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01 (D50).** Strict fences bosses, endings and chapters. Default fences only named story beats and endings. Open fences nothing you asked about. Naming a boss still unlocks it in every tier. About three days, plus Deck QA. [Detail](roadmap-details.md#spoiler-coverage-should-be-a-setting-with-tiers).
- **Long notes:** `roadmap-details.md:632` (keep) and `:529` "User-adjustable spoiler fencing (absorbed into the tiered setting)" — this is the older, absorbed entry; candidate for the archive after helper 9 confirms nothing else links to it.

## A troubleshooting question mostly never reaches the tips
- **Title / where:** "A troubleshooting question mostly never reaches the tips" — line 631.
- **Verdict:** stale (in the long note, not the roadmap line).
- **Proof:** the roadmap line says the "no tip for this" line was retired 2026-09-27. CHANGELOG.md:936 agrees ("The 'No tip for this' line, which could never appear. Retired by the maintainer"). The long note `roadmap-details.md:775-785` still says it "still cannot be made to appear — that is still waiting on the maintainer" and plans "a 'no tip for this' line" as the next step. Those two sentences contradict the roadmap. Commit `db4b3b4a` (2026-09-27, 'Retire the "No tip for this" line under troubleshooting answers') exists and removes the line's text, its decide and append functions and their tests, so the roadmap line is right. Whether the nine-in-ten measurement still holds after the 2026-09-26 fixes was not remeasured: needs a run, no evidence exists.
- **Decision owed?** no, calls already made: [D81](audit/maintainer-decisions-archive.md#d81--open-raised-2026-09-06--the-symptom-only-search-was-built-and-measured-and-it-does-not-do-what-d52-expected) (its heading still reads "OPEN", but its text says "ANSWERED 2026-09-06 — option 1", hold the branch) and [D85](audit/maintainer-decisions-archive.md#d85--locked-2026-09-07--knowledge-base-wave-two-four-calls-answered-before-a-line-of-code).
- **Test owed?** yes, a fresh measurement of how many ordinary problem sentences reach a tip. No evidence exists after 2026-09-07.
- **Proposed shorter entry:** ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Nine of ten ordinary problem sentences ("my game keeps crashing") reached nothing when measured 2026-09-07, because the word "crash" alone is too weak to route a question. The tip cut-off and a false word match were fixed 2026-09-26, and the "no tip for this" line was retired 2026-09-27. Not remeasured since. (D81, D85) [Detail](roadmap-details.md#a-troubleshooting-question-mostly-never-reaches-the-tips).
- **Long notes (`roadmap-details.md:775`):** fix the "Next step" sentence and the "still waiting on the maintainer" sentence. Related older section at `:421` "A troubleshooting question that only describes the symptom reaches no tips" holds the D81 build-and-hold story; keep the outcome, archive the weight-sweep detail (line 409 onward) after helper 9 checks links.

## KB online / versus strategy content
- **Title / where:** "KB online / versus strategy content" — line 636.
- **Verdict:** true.
- **Proof:** the plan file exists (`docs/planning/17-kb-online-versus-strategy-content.md`). The corpus has no Counter-Strike 2 and no multiplayer card kind (game list in `data/kb/strategy_seed.json`; Left 4 Dead 2 is game 3 with its ordinary card kinds). The "discovery locked 2026-08-09" date was not rechecked.
- **Decision owed?** no decision recorded by number.
- **Test owed?** no (not built).
- **Proposed shorter entry:** ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions (roles, callouts, co-op) get nothing specific today. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2, from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md) · [Detail](roadmap-details.md#kb-online--versus-strategy-content-and-rag-phase-5).
- **Long notes (`roadmap-details.md:679`):** keep as is; the heading is shared with "RAG Phase 5", so helper 9 should check which part each roadmap link wants.

## Measure how well the AI reads a screenshot: which game, which area, which boss
- **Title / where:** "Measure how well the AI reads a screenshot: which game, which area, which boss" — line 640.
- **Verdict:** true.
- **Proof:** the answer test attaches no picture (no image or attachment option in `scripts/eval_kb_answers.py`). No scored screenshot set exists in `tests/fixtures/` or `docs/test-evidence/`. Long note at `docs/roadmap-details.md:1678`.
- **Decision owed?** no decision recorded.
- **Test owed?** yes, the whole measurement. No evidence exists.
- **Proposed shorter entry:** ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **OPEN, added 2026-09-25.** Never measured. First build a scored set of real Deck screenshots and run it on each picture model the Deck offers. Then fix where it fails. [Detail](roadmap-details.md#measure-how-well-the-ai-reads-a-screenshot).
- **Long notes (`roadmap-details.md:1678`):** not read in full; keep the goal and the fix list.

## RAG Phase 4: extended retrieval
- **Title / where:** "RAG Phase 4: extended retrieval" — line 645.
- **Verdict:** stale (the entry has a repeated link, and its date claims were only partly rechecked).
- **Proof:** the entry carries the same detail link twice ("Full note: [roadmap-details.md]..." and "[Detail]..."). Chip rows: `docs/testing.md:275` (P78-TIP-CHIP "Done — passed (Deck) 2026-10-01") and `:276` (P78-CHIP-PACE "Done — passed (Deck) 2026-10-01"; the maintainer's own look at the pace is still owed). PHASE4-CHIPS-01 at `testing.md:208` is still Partial: "the fresh look at the widest labels is still owed". "Track 3 passed on the Deck 2026-09-26" and "chip labels fit on 2026-09-26" were not rechecked against evidence files. Not done: nothing marks this entry finished, so PARTIAL stays.
- **Decision owed?** no, already locked: [D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose).
- **Test owed?** yes, the widest-label look (PHASE4-CHIPS-01, `docs/testing.md:208`) and the pace look (P78-CHIP-PACE, `docs/testing.md:276`).
- **Proposed shorter entry:** ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** Chips that show the library exists and the labelled enemy and item cards shipped (D67). A running game's own tip passed on the Deck 2026-09-26. The chip promise passed on the Deck 2026-10-01 (P78-TIP-CHIP, P78-CHIP-PACE). Still owed: the look at the widest chip labels (PHASE4-CHIPS-01) and the maintainer's own look at the pace. [Detail](roadmap-details.md#rag-phase-4-extended-retrieval).
- **Long notes (`roadmap-details.md:689`):** keep the Goal and the Track 1, 2, 3 summaries; the measured paragraphs (the 0-to-15 and 0-to-16 counts, the chip-pool change) can go to the archive, since CHANGELOG.md lines 818-819 already hold them.

## RAG Phase 5: depth on the thirteen titles
- **Title / where:** "RAG Phase 5: depth on the thirteen titles" — line 649.
- **Verdict:** stale (card count).
- **Proof:** the entry says "133 → 161 cards". The original thirteen titles hold 164 notes today (the whole library holds 414 over 38 games), so 161 is out of date by three. The claim "only four titles have no enemy or item cards — Baldur's Gate 3, GTA San Andreas, The Sims 4, Portal 2" still holds: those four (games 4, 9, 10, 12) have no enemy or item notes in `data/kb/strategy_seed.json`. The plan file exists (`docs/planning/28-phase5-corpus-depth.md`).
- **Decision owed?** no decision recorded.
- **Test owed?** no new Deck check named; the entry says content and eval rows go in separate sessions.
- **Proposed shorter entry:** ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to 164 notes. Four still have no enemy or item notes: Baldur's Gate 3, GTA San Andreas, The Sims 4 and Portal 2 (counted 2026-10-03). Next: 40 to 60 enemy and item notes in batches, with a quality read from you after the first. [Plan](planning/28-phase5-corpus-depth.md).
- **Long notes:** the Phase 5 text sits under the "KB online / versus" heading at `roadmap-details.md:679`. Helper 9 should check it.

## RAG Phase 7: retrieval infrastructure
- **Title / where:** "RAG Phase 7: retrieval infrastructure" — line 654.
- **Verdict:** stale (card count, and "mostly nothing at 161 cards").
- **Proof:** "Mostly nothing at 161 cards" — the library now holds 414 notes, so the reasoning for "mostly nothing needed" is older than the data. Design C is recorded in D112 ("The thumbs-down on a wrong note (15): design C", `docs/audit/maintainer-decisions-locked.md`, in the block answered 2026-09-27). "Not built" holds: only the existing reason chips exist (`src/hooks/useReplyFeedbackChips.remount.test.tsx`); no "which note?" row was found in `src/`. The drawing link (claude.ai artifact) cannot be opened from here.
- **Decision owed?** no, already locked: [D112](audit/maintainer-decisions-locked.md#d112--locked-2026-09-25-raised-2026-09-25--plan-70-knowledge-base-wave-four-with-an-automated-deck-test-wave-the-twelve-calls-before-go).
- **Test owed?** no (not built).
- **Proposed shorter entry:** ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** What still matters: a thumbs-down that stops a wrong note coming back (three days), add-on packs before any large catalog (five days or more), and a screenshot feeding the search. **Design C chosen 2026-09-27 (D112):** "Not really" opens the reason chips, plus a "which note?" row only when two or three notes were used. Not built; ready for a feature session. [Detail](roadmap-details.md#rag-phase-7-community-tip-contribution-rag-phase-8).
- **Long notes (`roadmap-details.md:754`):** shared with Community tip contribution and Phase 8. Keep the thumbs-down and packs goals.
- Maintainer to review: with 414 notes and 38 games, does "mostly nothing" still apply to the other Phase 7 parts?

## Community tip contribution
- **Title / where:** "Community tip contribution" — line 660.
- **Verdict:** true.
- **Proof:** no "Suggest as a tip" in `src/`, `main.py` or `py_modules/` (searched). Long note at `docs/roadmap-details.md:754`. "Unblocked" was not rechecked against a decision.
- **Decision owed?** no decision recorded.
- **Test owed?** no (not built).
- **Proposed shorter entry:** ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed note with one press. **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days. [Detail](roadmap-details.md#rag-phase-7-community-tip-contribution-rag-phase-8).
- **Long notes:** same heading as Phase 7 (`roadmap-details.md:754`).

## RAG Phase 8: catalog corpus
- **Title / where:** "RAG Phase 8: catalog corpus" — line 662.
- **Verdict:** true.
- **Proof:** "library is at 38 games" matches `data/kb/strategy_seed.json` (38 games, 414 notes). D111 reopened the no-new-games lock: [heading](audit/maintainer-decisions-locked.md#d111--locked-2026-09-17-raised-2026-09-17--58-phase-1-the-notes-own-words-on-screen-and-wiki-notes-taken-without-rewriting--nine-calls-before-the-build), and `docs/audit/maintainer-decisions-locked.md:1519` says so. The "first ten games from cleared wiki sources" and "source study done" claims were not rechecked. Long note at `docs/roadmap-details.md:1507`.
- **Decision owed?** no, already locked: D111 (link above).
- **Test owed?** no (months of work; nothing to check yet).
- **Proposed shorter entry:** ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's games real notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice. Months of work. **As of 2026-10-03:** the source study is done, and the library is at 38 games and 414 notes. (D111) [Detail](roadmap-details.md#rag-phase-8-catalog-corpus).
- **Long notes (`roadmap-details.md:1507`):** a large section (about 170 lines up to line 1678); keep the goal and the source-policy outcome; helper 9 or the writing step should decide what moves to the KB long-notes file.

## Notes for the review

- **Numbers that moved:** the library is now 414 notes over 38 games. Three entries quote older counts: Card style pass (139 and 16), Phase 5 (161) and Phase 7 (161). One quick count found 22 labelled-line cards, not 16. The label rule I used (a "Summary:" or "Weak points:" line) may undercount; the writing step should recount with the build script's own rule.
- **A contradiction to fix:** the long note under "A troubleshooting question mostly never reaches the tips" (`roadmap-details.md:775-785`) still says the "no tip for this" line is waiting on the maintainer, while the roadmap and CHANGELOG.md:936 say it was retired 2026-09-27.
- **D81's heading** in the archive still says "OPEN, raised 2026-09-06" although its text records the answer ("ANSWERED 2026-09-06 — option 1"). The link in my sheet follows the heading as written. If the heading is changed, the link breaks.
- **Hashes:** `db4b3b4a` rechecked after the full history arrived; it matches the entry.
- **Phase 4 entry** repeats its detail link twice.
- **Not rechecked** (no evidence file found or opened): Phase 4 track 3 "passed on the Deck 2026-09-26", chip labels fit 2026-09-26, the Phase 8 "first ten games" claim, "discovery locked 2026-08-09" for the online content entry, the claude.ai drawing link.
- **No entry looks already fixed**, so none moves to Done or Verify.
