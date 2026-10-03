# Plan 80, step 1 — findings sheet 6: knowledge base, intro text, calls waiting, bugs, Deck check owed

Slice: docs/roadmap.md lines 451 to 603 (from `## Knowledge base and RAG` up to `### Next`). Date: 2026-10-03. Branch checked: experimental.
Entries checked: 11 (intro text, calls waiting, 7 bugs, 2 Deck checks).

Counts: true 4 · stale 7 · unclear 0 · done with proof 0 · fixed with no proof 0.
- **true:** L7 tip bug (add a newer sighting), Speed-mode tip gap, Black Mesa electrified water, Unrelated cards stapled on.
- **stale:** intro text, Calls waiting, Four wrong-subject questions, Symptom-only tips, Shipping blend loses, Hidden spoiler box, The note's own words.

Hashes: the coordinator fetched full history mid-task. Re-checked: `db4b3b4a` (2026-09-27, retire "No tip for this" line), `e1bf3324` (2026-09-26, follow-up naming the wrong boss), `fae4a536` (2026-09-23, both Ollama start paths keep two models), `e4c24bdd` and `e1bc0c16` all resolve and match what the roadmap says. The roadmap writes `fae4a53` (7 characters); it resolves to `fae4a536`.

Decision links below are relative to docs/roadmap.md.

---

## Intro text (lines 451–548: the section's own opening, "Where things stand", "Finding the right note", "The answer the Deck's own model writes", "Do not compare", "Getting to the troubleshooting tips", "Pick up here")
- **Where it sits:** Knowledge base and RAG, lines 451–548.
- **Verdict:** **stale** in several places (each named below).
- **Proof:**
  - "Where things stand (2026-09-18)" leads with 372 notes, 35 games, 159 tips. The same paragraph later says 2026.09.26 (38 games, 414 notes, 164 tips) was published 2026-09-27. Plan 70 says "The library 2026.09.26 is published and checked on the Deck" (docs/archive/70-kb-wave-four-and-deck-test-wave.md line 9, lines 480 and 505–508). The heading date and the lead numbers are old; the newest numbers are buried at the end.
  - "Pick up here" item 3, "Decide how to finish follow-ups… The options for finishing it still need writing up": D86 item 10 locked "Follow-ups remember: Strategy and Expert only" (decisions-archive line ~4008), and commits since show it built and fixed: `e1bf3324` (2026-09-26, "Turn on the fix for a follow-up naming the wrong boss"), `05855c05` "Earlier answers are kept on every follow-up". This item reads as a call still owed; it is not. The item also contradicts "Calls waiting on you: None right now".
  - Item 4 and item 5 are true and have evidence (plan48-R6-deck-model-eviction.json, plan64-FOLLOWUP-MEMORY-EVICTION.json). Item 5 "Still open: the drift from August to September" is unchanged and has no newer evidence.
  - "Same rules as the lists above": says a fix moves "to Done" and links `#done-for-v050`; plan 80 renames that section (call 7), so the link will need fixing.
  - The retrieval and answer numbers (85.3, 76.6/94.4/100/98.6/60.7) are 2026-09-18 and 2026-09-07 readings on the 2026.09.18 library. They were not re-measured on 2026.09.26 in anything I found. They are honest as dated, but they are not "where things stand" now.
  - Links checked: knowledge-base.md, planning/30-kb-answer-quality-plan.md, planning/37-rag-status-report.md, archive/48, archive/47, archive/58-phase-1, archive/70 all exist. Both evidence files exist.
- **Decision owed?** No. Related: D112 (plan 70 calls) `audit/maintainer-decisions-locked.md#d112--locked-2026-09-25-raised-2026-09-25--plan-70-knowledge-base-wave-four-with-an-automated-deck-test-wave-the-twelve-calls-before-go`.
- **Test owed?** The Deck's copy of 2026.09.26 is already checked (plan 70, flow L9). No new test owed by the intro itself.
- **Proposed shorter text** (the whole intro could shrink to about 12 lines):
  > Everything about the game notes and the search that feeds them. Read first: [status report](planning/37-rag-status-report.md). Architecture: [knowledge-base.md](knowledge-base.md). Answer-quality plan: [plan 30](planning/30-kb-answer-quality-plan.md).
  > **Where things stand (2026-10-03).** The library on the Deck and on both download sites is 2026.09.26: 38 games, 414 notes, 164 Deck tips (published 2026-09-27, checked on the Deck). Search puts the right note in the top three 85.3 times in a hundred on questions nobody tuned against, measured 2026-09-18 on the older library. The Deck's own model keeps the note's facts 76.6 times in a hundred. Do not compare either with figures from before wave three: both checks had faults. [Wave three's report](archive/48-kb-wave-three-session.md).
  > **Still short:** getting to the troubleshooting tips (6 of 24 plain sentences reached a tip before the tip rewrite, 8 after). [Detail](roadmap-details.md#getting-to-the-troubleshooting-tips) is not a heading today; park it with the KB notes.
- **Long notes:** the intro links to `#blind-questions-done` (line 1837), `#three-new-games-and-their-notes` (1864), `#cost-to-a-running-game-second-sighting` (1797). All three headings exist. Keep the cost-to-a-running-game note (it is the proof for "safety check stays unbuilt"). The other two can go to the archive once the intro is cut.
- **What can be cut from the intro** (all of it already lives elsewhere): the ten-games paragraph (2026-09-18) and the "Published 2026-09-23" sentence (superseded by 2026.09.26); the "Wave two's own evening" and "Library point release 2026-09-07" paragraphs (in archive/47, archive/48 and the 2026-09-07 Black Mesa evidence file plan48-R5-blackmesa-corrected-note.json); "Pick up here" items 1, 2, 6, 7 (all struck through or done: item 1 evidence is the retirement commit `db4b3b4a`); item 3 (settled, see above).

## Calls waiting on you
- **Where it sits:** line 549.
- **Verdict:** **stale** (small).
- **Proof:** the text says "the knowledge-base ones from this month are D81 to D88". "This month" was September; it is October now. Those calls (D81 to D88) are all answered. Headings of D81 and D82 still say "OPEN" although each ends with "ANSWERED 2026-09-06" (decisions-archive line 3783 and decisions-locked line 348), which makes the claim "None right now" look wrong to a reader following the links. Separately, **D41 is a knowledge-base decision whose heading and body are still open** (decisions-locked line 115: "A card named after a category outranks the cards inside it"; recommended first step is to measure the shipping search per question). It is not listed here. Also, D75 (model speed readout) is open but is not a knowledge-base entry.
- **Decision owed?** D41 is the one open. Link: `audit/maintainer-decisions-locked.md#d41--open-raised-2026-08-31--a-card-named-after-a-category-outranks-the-cards-inside-it`. Answered KB calls to link if wanted: D81 `audit/maintainer-decisions-archive.md#d81--open-raised-2026-09-06--the-symptom-only-search-was-built-and-measured-and-it-does-not-do-what-d52-expected`, D82 `audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose`.
- **Test owed?** No.
- **Proposed shorter entry:**
  > None right now. One older call still reads open: [D41](audit/maintainer-decisions-locked.md#d41--open-raised-2026-08-31--a-card-named-after-a-category-outranks-the-cards-inside-it) (first step is to measure the shipping search, not a call yet). Every call already made is in [the locked decisions file](audit/maintainer-decisions-locked.md).
  (Owner to decide whether D41 belongs here; see Notes.)
- **Long notes:** none.

## A game's own tip is found only by its own words
- **Where it sits:** Bugs (KB), line 557 area (first bullet, line 559).
- **Verdict:** **true**.
- **Proof:** long note `roadmap-details.md#flow-l7-findings` (heading line 2576) says "The words on screen look blurry" keyword score 2.0 against the 4.0 cut-off; "text … looks blurry" scores 6.9. Code still keyword-only on purpose: `py_modules/backend/services/knowledge_base_service.py` lines 999–1004 ("Keyword only, deliberately… Left for a future lane"). **Newer sighting the entry lacks:** `docs/test-evidence/plan72-F3-TIP.json` (Deck, 2026-09-27) asked "the words on screen look blurry on my deck, what should i change" with Deep Rock Galactic: Survivor named, nothing running, and the Render Scale tip did not come: the panel showed the game's Praetorian note, verdict UNCLEAR. A close wording ("the text in this game looks blurry") passed (plan72-F4-TIP.json). No commit since has changed the matching.
- **Decision owed?** No decision recorded.
- **Test owed?** No test row names it. Evidence of the miss exists (plan72-F3-TIP.json). Nothing to run until a fix lands.
- **Proposed shorter entry:**
  > ★ `[KB]` **A game's own tip is found only by its own words** — **OPEN, found 2026-09-26, seen again 2026-09-27.** "The words on screen look blurry" misses the Render Scale tip that "the text looks blurry" finds. The tip search reads words only; a search by meaning was measured and left for later. Evidence `docs/test-evidence/plan72-F3-TIP.json`. [Detail](roadmap-details.md#flow-l7-findings)
- **Long notes:** `Flow L7 findings` (line 2576) is one long note holding many closed findings. Must stay: the paragraph beginning "**New, open: a game's own tip is found only by its own words.**" (about line 2660) and "**New sightings, open:**". The paragraphs beginning "A running game's own Deck tip now reaches the answer", "One game's own tip no longer attaches", "No close match in my notes no longer shows", "A tip-answered question no longer sets", and "A tip with a source page shows it" are passed fixes with evidence; they can go to the archive (they are covered by Done).

## In Speed mode, the meaning check on troubleshooting tips never runs
- **Where it sits:** Bugs (KB), line 562.
- **Verdict:** **true.**
- **Proof:** the code line named is right: `knowledge_base_service.py:1121` reads `and not speed_mode` (the same guard also sits at line 1178). D62 item 2 (decisions-archive, heading line 3124) chose it and sketched the fallback. No commit since touches it.
- **Decision owed?** No (decision made). Link: `audit/maintainer-decisions-archive.md#d62--locked-2026-09-05-raised-2026-09-05--the-second-bug-fixing-session-four-calls-before-go`.
- **Test owed?** No; it is accepted. No evidence exists, and none is needed.
- **Proposed shorter entry:**
  > ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** The maintainer chose this on 2026-09-05 to save about a second per Speed question ([D62](audit/maintainer-decisions-archive.md#d62--locked-2026-09-05-raised-2026-09-05--the-second-bug-fixing-session-four-calls-before-go) item 2). A stray word match can attach a wrong tip. A fix would run the meaning search only when the word hits are thin; that needs a cut-off picked and measured. [Detail](roadmap-details.md#speed-mode-tip-gap)
- **Long notes:** `Speed mode tip gap` (line 1849) is short and fully needed. Keep as is.

## Black Mesa's electrified-water question attaches two unrelated early-game notes instead of its own
- **Where it sits:** Bugs (KB), line ~566.
- **Verdict:** **true.**
- **Proof:** `docs/test-evidence/plan64-BLACKMESA-WATER.json` (2026-09-23, exact words: right note attached, two generic notes still first) and `plan64-BLACKMESA-WATER-running.json` (no change with the game running). Ranking test 2026-09-26 recorded in the long note (46 to 41 of 57). No newer Black Mesa water run exists in docs/test-evidence; no commit message mentions the question since.
- **Decision owed?** No decision recorded.
- **Test owed?** Nothing to re-run until a fix exists. Latest evidence is the plan64 pair.
- **Proposed shorter entry:**
  > ★★ `[KB]` **Black Mesa's electrified-water question names two unrelated early-game notes** — **OPEN, found 2026-09-19.** The answer is right and the real water note now attaches, but two generic notes still come first. Ranking general notes lower was measured 2026-09-26 and made answers worse, so it stays off. Evidence `docs/test-evidence/plan64-BLACKMESA-WATER.json`. [Detail](roadmap-details.md#black-mesas-electrified-water-question)
- **Long notes:** `Black Mesa's electrified-water question` (line 1971): keep the first paragraph's finding, the 2026-09-23 exact-words result, and the 2026-09-26 measurement. The 2026-09-22 "different wording" run can go to the archive (its evidence file plan63-BLACKMESA-WATER-NOTES.json stays in test-evidence).

## Four questions still get notes about the wrong subject
- **Where it sits:** Bugs (KB), line ~570.
- **Verdict:** **stale.** "Three of the four now say so" is contradicted on the Deck.
- **Proof:** `docs/test-evidence/plan70-NO-CLOSE-MATCH-HK-02.json` (2026-09-26, after `e4c24bdd` wired the line in): the Black Mesa horse-taming question showed **no** "no close match" line, on screen or in the saved chat; the row is marked FAIL for that half. The long note (roadmap-details.md line 1360, "Checked 2026-09-26") says it sat at 0.6508 against a 0.65 cut-off, "on the edge", and that the Portal 2 house question "gets no line at all" by design. So at most the Hades-boss case reliably carries the line; the entry's count of three is not shown anywhere. Also: the entry lists three questions but says "four"; the fourth is not named in the roadmap or the long note's own list.
- **Decision owed?** The line itself is D88: `audit/maintainer-decisions-archive.md#d88--locked-2026-09-07--the-not-in-my-notes-line-keys-off-how-good-the-match-was-not-just-whether-one-attached`. The cut-off is D87: `audit/maintainer-decisions-archive.md#d87--locked-2026-09-07--the-none-of-these-fit-floor-covers-the-notes-as-well-as-the-tips`. No decision on fixing the wrong attachment itself.
- **Test owed?** A Deck re-run on the horse question would settle the count. Latest evidence is the file above; no row exists for it.
- **Proposed shorter entry:**
  > ★★ `[KB]` **Questions with no real answer in the notes still get notes about the wrong subject** — **OPEN, found 2026-09-07, seen again 2026-09-26.** Black Mesa horse taming, Portal 2 house buying and a Hades boss that does not exist all still attach a note. The "no close match" line is meant to warn, but on the Deck on 2026-09-26 it did not show for the horse question (on the cut-off). Catching these costs twenty or more right answers elsewhere. Evidence `docs/test-evidence/plan70-NO-CLOSE-MATCH-HK-02.json`. [Detail](roadmap-details.md#wrong-subject-notes)
- **Long notes:** `Wrong-subject notes` (line 1360) starts with a copy of the old roadmap entry. Cut that copy (it repeats the entry). Keep "**Found again 2026-09-18**", "**Sighting, 2026-09-26 (plan 70, flow L1)**", "**Checked 2026-09-26 (plan 70, flow L2)**" and "**Measured the same day**".

## A troubleshooting question that only describes the symptom reaches no tips
- **Where it sits:** Bugs (KB), line ~576.
- **Verdict:** **stale** (small): one half of the cause statement is outdated.
- **Proof:** the entry says what is missing is a way to say "none of these fit" / the real fix is rewriting the tips. Both have since been done: 32 tips rewritten 2026-09-07 and a tip floor built (`COMPAT_MEANING_FLOOR = 0.5050`, `knowledge_base_service.py:390`, applied at line ~1327; CHANGELOG line 529). The held branch was not re-measured with the floor; no evidence of a re-run. The Next list has its own entry, "A troubleshooting question mostly never reaches the tips" (roadmap line ~631), which the entry points at as "its own entry below". The two entries overlap.
- **Decision owed?** Answered. D52 `audit/maintainer-decisions-archive.md#d52--locked-2026-09-01--symptom-only-troubleshooting-questions-get-a-meaning-search-only-when-no-topic-routed`, D81 (link under Calls waiting on you above). Roadmap also cites D85: `audit/maintainer-decisions-archive.md#d85--locked-2026-09-07--knowledge-base-wave-two-four-calls-answered-before-a-line-of-code`.
- **Test owed?** Evidence of the 2026-09-07 miss: `docs/test-evidence/plan47-R4-problems-reach-tips.json` (named in the long note; not opened by me, exists check below). A re-measure with the floor would be a PC-side run, not a Deck check.
- **Proposed shorter entry:**
  > ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back 2026-09-06 (D81).** "The game drops me back to the library" reaches no crash tip, because the tip search needs a topic word. The held fix (a meaning search) attached wrong tips, six measured. The tips were rewritten and a "none of these fit" floor now exists, but the held fix has not been re-measured with it. Overlaps the entry of the same subject in Next. [Detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips)
- **Long notes:** heading line 421. Keep "Built, measured, held back — 2026-09-06 (D81)" and "Re-measured 2026-09-07… stays held" and "And the cause is now clear". Cut "**More history, moved from the roadmap 2026-09-21**" (an old copy of the roadmap entry, nearly word for word) and the first bullet's block (the 2026-08-28 finding can be a two-line summary).

## Unrelated questions still get game cards stapled on
- **Where it sits:** Bugs (KB), line ~584.
- **Verdict:** **true.**
- **Proof:** long note `roadmap-details.md#ordinary-phrases-attach-game-cards` (line 183): "thank you very much" still attaches Nitra on the Deck 2026-08-23; maintainer call 2026-08-27 "live with the residual attachments", research-first. The entry also links `#unrelated-questions-still-get-game-cards-stapled-on-2026-09-02-wording` which exists (line 482). The floors in the code are as the note says (`BM25_RELEVANCE_FLOOR` and `VECTOR_RECALL_FLOOR`, knowledge_base_service.py ~line 148; the later meaning floor, line ~380, is what actually cut the "what time is it" type junk, see CHANGELOG line 529: "A note or a tip stops getting stapled onto a question it does not answer, most of the time"). **Careful:** that changelog line suggests the entry may now be partly cured for the "what time is it" kind; I found no Deck run of "thank you very much" after 2026-08-23, so I cannot say it is.
- **Decision owed?** Related: D28 `audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be`. The 2026-08-27 call is recorded only in the long note.
- **Test owed?** A re-run of "thank you very much" with a game running would show whether the later floors cured it. No evidence file exists for that.
- **Proposed shorter entry:**
  > ★★ `[KB]` **Unrelated questions can still get a game card stapled on** — **ACCEPTED 2026-08-27.** With a game running, "thank you very much" still attached a card on the Deck on 2026-08-23. Raising the word floor costs real matches and the model mostly ignores a card that does not fit. Later floors (2026-09) may have cured some phrases; no Deck re-run since. [D28](audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be) · [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards)
- **Long notes:** heading line 183 holds a long measured table and the Deck table. Keep the two tables and the 2026-08-27 maintainer call; the "Method — and the correction it forced" paragraph can go to the archive. The linked "2026-09-02 wording" heading (line 482) is an old copy of the entry and can go to the archive.

## What ships loses to its own meaning half on questions nobody tuned against
- **Where it sits:** Bugs (KB), line ~586.
- **Verdict:** **stale.** The condition the maintainer set for lifting the hold has been met.
- **Proof:** D82's answer: not until "every note is guaranteed to have its meaning index before it can be searched" (decisions-locked line ~418). The guarantee exists since 2026-09-07: `scripts/build_rag_db.py` lines 713–746 refuse to finish a library with a missing index unless told otherwise; tests `tests/test_build_rag_embedding_guarantee.py` and `tests/test_publish_corpus_embedding_guarantee.py`. The roadmap still reads "Not lifted until every note is guaranteed…". The weights are still even and the lean was not retried (no commit found), so the hold itself still stands, and D82 says two other objections still need answering. So the entry is true as a hold, stale as a reason. Also the numbers in D82 are from a 266-note library; the library is now 414 notes.
- **Decision owed?** The call is made but its lifting is the owner's: D82 `audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose`; D68 `audit/maintainer-decisions-archive.md#d68--locked-2026-09-05-raised-the-same-day--the-blend-weights-run-the-sweep-now-and-decide-from-it`; D38 (deferred) `audit/maintainer-decisions-locked.md#d38--deferred-at-the-maintainers-request-raised-2026-08-29--what-ships-is-beaten-by-half-of-itself-on-the-blind-rows-how-should-that-be-acted-on`. Whether to re-measure and reconsider now is a call for the maintainer.
- **Test owed?** A PC-side re-run of the weight sweep on the 414-note library would be the evidence; none exists. No Deck check.
- **Proposed shorter entry:**
  > ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided 2026-09-06.** Leaning the search toward meaning finds the right note first a little more often, but it would bury a new note with no meaning index yet. That reason is gone since 2026-09-07 (every note is now guaranteed an index), but two other objections stand, and nothing has been re-measured on the bigger library. Weights stay even. [D82](audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose) · [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against)
- **Long notes:** heading line 394. Keep the first bullet's finding (83.7 vs 79.3 and the "tie on tune, loses on holdout" shape) and "The weight sweep ran, and the change was reverted — 2026-09-06 (D82)". The "Groundwork done" sentence and the run-of-record links can go to the archive.

## Hidden spoiler box stays shut on games with no Steam ID and on name-first questions
- **Where it sits:** Deck check owed, line ~592.
- **Verdict:** **stale** (missing the newest note; the status itself is right).
- **Proof:** newest evidence is `docs/test-evidence/plan79-STRAT-SPOIL-NAME-01.json` (2026-10-02): "COULD NOT RUN - none of the five games is on the Recent Games row (fourth time); proven by its tests only." The roadmap's newest note is the 2026-09-30 plan 77 one. DRG-01b passed: `docs/test-evidence/plan64-DRG-01b.json` (2026-09-23); STRAT-SPOIL-TEXT-01 and STRAT-SPOIL-FIRST-01 passed (plan61-STRAT-SPOIL-FIRST-01.json). Row text in docs/testing-manual.md lines 424–441 and docs/testing.md line 196 ("Partial") also lack the 2026-10-02 try. **Row search:** `git grep -n STRAT-SPOIL-NAME-01 -- docs` finds it open in testing-manual.md line 424 (unticked), in testing.md row at line 196, and in this entry. DRG-01c is still unticked in testing-manual.md line 420 ("Not tried", on purpose) and is not mentioned in this entry. Also the entry's own text says "landed 2026-09-15, four commits" but names none.
- **Decision owed?** No decision recorded. Related, answered: plan 54 (archive/54-spoiler-rules-gaps.md) holds its calls.
- **Test owed?** Yes: STRAT-SPOIL-NAME-01 (testing-manual.md line 424, testing.md line 196). Blocked on getting one of Doom 64, Super Mario 64, Mario Kart 64 or Pikmin 2 onto the Deck's Recent Games row (a maintainer chore). Evidence of the blocked tries: plan61-STRAT-SPOIL-NAME-01.json, plan77-STRAT-SPOIL-NAME-01.json, plan79-STRAT-SPOIL-NAME-01.json. DRG-01c also owed (not tried on purpose; it means removing the library).
- **Proposed shorter entry:**
  > ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY, landed 2026-09-15, unit-tested.** A game known only by name now opens its box, and naming the boss up front keeps the answer in plain text. Passed on the Deck: the name-first half (STRAT-SPOIL-FIRST-01, 2026-09-18) and the no-library half (DRG-01b, 2026-09-23). **Still owed:** STRAT-SPOIL-NAME-01 could not run four times, last 2026-10-02: none of its games is on Recent Games. Evidence `docs/test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. [Detail](roadmap-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)
- **Long notes:** heading line 1470. Keep the first paragraph, the pass results and the "still blocked" line; older "tried 2026-09-18/19, blocked" sentences (lines ~1479–1496) can go to the archive. The 2026-09-18 note that the matching row "needs a re-run before it can be called a pass" (testing-manual.md line ~432) is worth keeping in the row.

## The note's own words under the reply
- **Where it sits:** Deck check owed, line ~599.
- **Verdict:** **stale.** Most of the rows it calls owed have passed and been closed.
- **Proof:** docs/testing-manual.md line 591: "Rows 01, 02, 03, 05, 06 and TEN-GAMES-01 passed on the Deck and moved to testing-manual-closed-2026.md" (confirmed: NOTES-BLOCK-06 at docs/archive/testing-manual-closed-2026.md line 245, TEN-GAMES-01 at line 246). NOTES-BLOCK-02 passed 2026-09-26: `docs/test-evidence/plan70-NOTES-BLOCK-02.json`. Evidence for the others: `plan58p1-QA-NOTES-BLOCK-01.json`, `-03.json`, `-05.json`, `-06-fixbuild-07f1299.json`, `plan58p1-QA-TEN-GAMES-01.json`. **Still owed (testing-manual.md lines 596–598):** NOTES-BLOCK-04 (NOT RUNNABLE 2026-09-18, no question attaches nothing: `plan58p1-QA-NOTES-BLOCK-04.json`), NOTES-BLOCK-07 (needs a person listening, not run: ⏳ still owed), and NOTES-BLOCK-LADDER (UNCLEAR 2026-09-23 and again 2026-09-26: blocks carry no chip ladder; the session suggests retiring that half, maintainer's call: `plan64-NOTES-BLOCK-LADDER.json`, `plan70-NOTES-BLOCK-LADDER.json`). The roadmap text says "VERIFY, third run 2026-09-19 … the only stop still missing is the chip ladder inside the open block", which is older than these. No row for this feature is in docs/testing.md.
- **Decision owed?** Yes, small: retire the chip-ladder half of NOTES-BLOCK-LADDER? No decision recorded.
- **Test owed?** Yes: NOTES-BLOCK-04, NOTES-BLOCK-07, NOTES-BLOCK-LADDER, all in docs/testing-manual.md (lines 596–598); evidence above.
- **Proposed shorter entry:**
  > ★★ `[KB]` **The note's own words under the reply** — **VERIFY, fixed and re-run 2026-09-19 and 2026-09-26.** Rows 01, 02, 03, 05, 06 and TEN-GAMES-01 passed on the Deck and are closed. **Still owed:** NOTES-BLOCK-04 (no question could be found that attaches nothing), NOTES-BLOCK-07 (needs a person listening to confirm the block is never read aloud) and NOTES-BLOCK-LADDER (no block has had a chip ladder to test; retiring that half is the maintainer's call). Rows in [testing-manual.md](testing-manual.md).
- **Long notes:** none linked.

---

## Notes for the review

**Disagreements between docs/planning/37-rag-status-report.md and these entries.** The report's title says 2026-09-25 and it was never brought fully in step after plan 70.
1. **Report § 4 "What is open right now" is a 2026-09-07 snapshot.** Its Bugs list (raw computer text reopened; panel learns the game only at start-up; the note search about 30 per cent slower with a speed check that gives a false all-clear, "a fix is in progress"; follow-ups with "a call waiting"; four wrong-subject questions) does not match the roadmap. The roadmap says the speed check was fixed (547, 23 and 28 thousandths against a one-second budget on 2026-09-15), the wrong-boss follow-up is fixed and proven (`e1bf3324`), and "Calls waiting: None". The report still says "A fix is in progress" and "One new call is open".
2. **The report's bugs list lacks four roadmap bugs:** the L7 tip bug, the Speed-mode tip gap, Black Mesa electrified water and the shipping-blend hold (it has the last only as "Settled", the roadmap lists it under Bugs as ACCEPTED).
3. **Library numbers.** Report § 1 and § 3 lead with 372 notes, 35 games, 159 tips; the "Update 2026-09-26" paragraph gives 414/38 and says "Not yet built, published or read back on the Deck". The roadmap says it was published 2026-09-27 and Deck-checked (plan 70, flow L9). Report is the stale one.
4. **Answer numbers differ on purpose, not by error:** report § 3 table is 79.5 / 90.7 / 100 / 97.1 / 67.2 (three runs, earlier set); the roadmap intro quotes 76.6 / 94.4 / 100 / 98.6 / 60.7 over 61 questions. Neither says which is newer. I did not find the evidence file for either set; the owner should pick one.
5. **Report says "Nobody has read the new shape on the device yet"** (§ 3); the roadmap says it passes its Deck check. The report's § 4 "Owed on the Deck" repeats wave-two/three rows (W2-R1 to R8, W3) that the roadmap no longer lists.
6. **Wrong-subject count.** Report and roadmap both say three of four now carry the line; the 2026-09-26 Deck run (plan70-NO-CLOSE-MATCH-HK-02.json) contradicts it for the horse question.
7. **Report says "Black Mesa speed… A fix is in progress"** where the roadmap's intro item 2 says fixed.

**Things that need the maintainer.**
- **D41** ("A card named after a category outranks the cards inside it") is an open knowledge-base call that appears nowhere in the roadmap. Say whether it should be listed under Calls waiting, closed, or left.
- **D81 and D82 headings still say "OPEN"** though each body ends "ANSWERED 2026-09-06" (the closing note at decisions-locked line 1763 says five decisions were kept open "for doubt"). Linking to those headings will look like an open call. The slug for each keeps the word "open". Suggest the heading words be changed in the decisions file (a maintainer-decisions edit; not mine).
- **NOTES-BLOCK-LADDER:** retire the chip-ladder half? (Session suggestion in the row, maintainer's call.)
- **Weight sweep:** the D82 trigger is met. Whether to re-measure on the 414-note library is a call.

**Odd things.**
- Wrong-subject entry says "Four questions" and names three.
- Intro item 5 says "(fae4a53)"; the real hash is `fae4a536`.
- STRAT-SPOIL-NAME-01 is only blocked by a chore (put one emulated game on Recent Games); it has now failed to run four times (2026-09-15, 09-18, 09-30, 10-02).
- The intro's "Same rules as the lists above" line links `#done-for-v050`, which plan 80 renames.
- No evidence file for the intro's search figure (85.3) or answer figures was opened by me; the claims are copied as dated.
- `docs/test-evidence/plan47-R4-problems-reach-tips.json` exists (checked); I did not read it.

**Test-row ID search (rule for closing).** No row is proposed to close, so nothing to close everywhere; the rows still open are STRAT-SPOIL-NAME-01 (testing-manual.md:424, testing.md:196), DRG-01c (testing-manual.md:420), NOTES-BLOCK-04, -07, -LADDER (testing-manual.md:596–598).
