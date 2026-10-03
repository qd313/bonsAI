# Trimmed from roadmap-kb-details.md

This file holds text trimmed from docs/roadmap-kb-details.md on 2026-10-03 by plan 80 step 4. Links in it may be stale.

## Trimmed from: file header (line 3)

Removed or rewritten lines, word for word:

> Moved out of [roadmap-details.md](roadmap-details.md) word for word on 2026-10-03 (plan 80, step 3). The long notes for the entries in [roadmap-kb.md](roadmap-kb.md), plus knowledge-base notes no entry links to yet.

## Trimmed from: Ordinary phrases attach game cards

Removed or rewritten lines, word for word:

    **Method — and the correction it forced.** The card names are **not readable from the device UI**: *Show details* reports retrieval mode, `Trust tier`, and a corpus section count, but never names what was retrieved, and a `fallback_no_source` tier looks identical whether the payload was the genre fallback or a real game card. An earlier note on this row read that chip as "no cards attached" for *"one sentence"* — **that was wrong**, and the conclusion was only accidentally right. `kb_attached: true` was in the same snapshot the whole time, and `fallback_no_source` is a **trust tier** ([knowledge_base_schema.py:48](../py_modules/backend/services/knowledge_base_schema.py#L48)), not an attachment count. The authoritative source is the Desktop ask trace — `~/Desktop/bonsAI_logs/bonsai-ask-trace-<date>.md`, written when `desktop_ask_verbose_logging` is on ([main.py:2135](../main.py#L2135)) — which dumps the verbatim `--- Local knowledge base ---` block with one `[title / kind: Card] (trust: tier)` header per attached card. **Read the trace, not the panel**, for any card-attachment QA.

## Trimmed from: The shipping retrieval arm loses to the vector half alone on rows nobody tuned against

Removed or rewritten lines, word for word:

  available — so the one split it is legal to tune against said "change nothing" while the gate said otherwise. **Groundwork done:** 51
  blind rows added to `tune`, which had none ([audit/kb-blind-tune-rows-2026-08-29.md](archive/kb-blind-tune-rows-2026-08-29.md)). Run of
  record: [archive/research/kb-embed-bakeoff-2026-08-29-arms.md](archive/research/kb-embed-bakeoff-2026-08-29-arms.md).

## Trimmed from: A troubleshooting question that only describes the symptom reaches no tips

Removed or rewritten lines, word for word:

- ★★ **A troubleshooting question that only describes the symptom reaches no tips** — found 2026-08-28 by the second batch of blind
  holdout rows, before any of them were scored. The compat router reaches a question that **names** a topic and not one that only says
  what is going wrong: *"the game drops me back to the library a few minutes in"* (`V2-BLIND-H55`) never routes, because the word *crash*
  is absent; *"my controller works fine on the desktop but the game doesn't seem to see half my buttons"* (`V2-BLIND-H19`) never routes,
  because the word *input* is absent. **Two of the four blind compat rows miss.** This is the D16 gate doing what it was specified to do —
  word-boundary topic matching replaced the old literal `deck`/`proton` phrase gate — so it is a reach limit rather than a regression, and
  the fix is a maintainer call, not a threshold tweak. Neither row was reworded to make it pass; both are named in the reach pin
  (`tests/test_compat_topic_router.py`). Worth noting the shape: a card-derived question about crashes says *crash*, so this hole was
  invisible until questions were written without reading the cards. Detail:
  [audit/kb-blind-holdout-rows-batch2-2026-08-28.md](archive/kb-blind-holdout-rows-batch2-2026-08-28.md) § 5.


**More history, moved from the roadmap 2026-09-21:**

- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** The fix does reach further: with nothing running, all 24
  fresh plainly-worded problem sentences get into the search, against 8 without it, and *"thank you very much"* still
  attaches nothing. **But what comes back is wrong** — six measured examples, each attaching a tip about something else
  entirely, such as the on-screen keyboard for *"game wont even open"*. A wrong tip is worse than none, which is the same
  objection that held it the first time. **The cause is now clear, and it is the useful part.** The meaning search only
  runs when nothing else finds anything, and that almost never happens: a plain word search across 156 tips nearly always
  finds something by shared words, so it wins first with a poor match and the meaning search never gets a turn. **What is
  missing is not a wider gate — it is a way to say "none of these tips fit."** Until there is one, opening the gate makes
  things worse. The real fix is rewriting the tips, filed as its own entry below. All six wrong tips:
  [detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Trimmed from: Unrelated questions still get game cards stapled on (2026-09-02 wording)

Removed or rewritten lines, word for word:

See also [Ordinary phrases attach game cards](#ordinary-phrases-attach-game-cards) above.

- ★★ **Unrelated questions still get game cards stapled on** — **PARTIAL; the maintainer chose to live with it 2026-08-27.** With a game running,
  *"thank you very much"* still attaches a Nitra card and *"what time is it"* attaches three. Two of the six test phrases were fixed by the D28
  floor change; the other two come from the keyword half, and raising that floor pushes against D25. Confirmed on hardware, card for card.
  The residue is judged acceptable because the model mostly ignores an irrelevant card. Tables, method and the D28 numbers:
  [roadmap-details.md](roadmap-details.md#ordinary-phrases-attach-game-cards).

## Trimmed from: User-adjustable spoiler fencing (absorbed into the tiered setting)

Removed or rewritten lines, word for word:

- ★★ **User-adjustable spoiler fencing** (hide by risk band)
  - **Goal:** Settings control for tap-to-reveal / fence masking by estimated risk band.
  - **Depends on:** spoiler confidence chip; shipped `strategy_spoiler_masking_enabled`.
  - **Related:** [spoiler-constitution.md](planning/spoiler-constitution.md).

## The corpus has no starting out card

- ★★★ **The corpus has no "starting out" card** — found 2026-08-29 by what the gap sheet's free-text answers asked for rather than by what it
  asked about. Every strategy card is about a *thing*: an enemy, an item, an area, a mechanic. The maintainer asked twice for **build and
  early-game guidance** ("pros and cons of different builds, make cards designed around early game, or even character design" — for both
  Cyberpunk 2077 and Fallout 4) and once for **an orientation card pitched at someone who knows a neighbouring game** ("explain this game to
  someone familiar to GTA but not RDR"). Neither shape fits the existing types cleanly. **Open question before any are written:** whether
  this is a new `section_type` (which is a schema and chip-wording change) or lives as `mechanic` with a naming convention. Not smuggled in
  under D39, which was only about four existing cards' kinds.

**Built 2026-09-26 (plan 70, helper E, commit `83cd1d78`).** Settled as its own `section_type`,
`starting_out`. A new player asking a game's suggestion chips now sees "How do I get started in
<game>?" for every title with one, and typing "where do I start" or "how do I get started" reaches
that game's own note the same way "the boss" already reaches a boss note. `scripts/build_rag_db.py`
now refuses to build the library if a note named "Starting out in ..." is not typed `starting_out`,
so a future note left mistyped is caught at build time. All 28 starting-out notes now carry the kind:
the 22 original rows re-typed, plus 6 new ones (Cyberpunk 2077, Fallout 4, Red Dead Redemption 2, and
one each for Brotato, Palworld, Skyrim). No corpus format change was needed for this part, since the
kind is free text.

## Trimmed from: Eval fixture cannot see a recall failure

Removed or rewritten lines, word for word:

  - **Starting material:** the 15 paraphrased questions in [audit/rag-vector-recall-floor-2026-08-18.md](archive/rag-vector-recall-floor-2026-08-18.md) are already written, measured and labelled with the card each one should return. `tests/fixtures/kb_eval_paraphrase_v0.json` (15 rows) exists but the arms run does not read it.
  - **Needs a maintainer call first:** the v2 fixture is approved and the PR2 bake-off was measured against it — new rows change what the numbers mean, so decide whether they join v2, form a v3, or stay a separate reported slice.

## Trimmed from: RAG Phase 4: extended retrieval

Removed or rewritten lines, word for word:

    shared Deck tips, **Tip** badge on game chips only. The chip pool now draws **one kind at a time** rather than filling from the highest-priority kind first: the track 2 cards took Ocarina of Time to six boss cards and its whole pool became six *"How do I beat X?"*, with its items and enemies unreachable and six boss names offered in a carousel a player is only browsing. Enemy and item cards get their own wording (*"How do I deal with X?"*, *"How do I use X?"*). Costs nothing where a title's cards are lopsided — Left 4 Dead 2 files seventeen cards as `mechanic` and returns the same six chips, reordered. On-Deck **PHASE4-CHIPS-01** — **badge direction passed 2026-08-29**: the **Tip** badge lands on the game chip only, never on a shared compat chip or a static seed. **The clipping direction is blocked** by the vanishing-corpus-chip bug in Bugs above, which keeps 5 of the 6 game chips off the screen, so no long label ever renders to measure.

    sections. Measured against the built corpus with the real embedding model: of 18 questions naming or
    describing a new card, **0 reached one before and 15 after** (16 once the type-recall preference was
    narrowed, below). The misses are pure paraphrases sharing no word with the card —
    `what do i do about the big one that tanks everything`, `something keeps grabbing me and sending me
    to the start`. No regression on the six questions that already worked.

pull only runs for questions that do. Being fixed (helper E2) before the library is published — the
maintainer's call. The shared tip's source-page credit line still cannot be checked until a tip actually
shows. Evidence `docs/test-evidence/plan70-R-R4.json`, `plan70-R-R4-try2.json` (+ two screenshots).

question to strategy notes instead. **Deck re-check owed, row R.4 re-check (E2's own text):** with Deep
Rock Galactic: Survivor running, ask "the text on screen looks blurry on my deck" in Strategy, then the
same question reworded in Speed — the Render Scale tip should appear first, with its source page, both
times; with Fallout 4 running, ask about mods and launch options in Speed — the F4SE tip should appear;
then, still on Deep Rock Galactic: Survivor, ask a real strategy question such as "how do I beat the
dreadnought" — the Render Scale tip must NOT appear, and the boss note should.

game. The library itself is still not published (the maintainer runs the push). Full readings in

  Done). The chip labels fit on 2026-09-26. **2026-09-30 (plan 78 helper F, `092517c1`, `5e3e0f7e`):** the promise that one of the game's own chips always shows failed on the Deck 2026-09-26 (`docs/test-evidence/plan70-L6-PHASE4-CHIPS-01.json`). Cause: three of the four chip styles dealt the game's chips only once, and with one chip showing the promised chip sat in a spot that is off screen. Fixed, and the chip promise passed on the Deck 2026-10-01 (rows P78-TIP-CHIP and P78-CHIP-PACE; evidence `docs/test-evidence/plan78-P78-TIP-CHIP-try2.json`); the maintainer's own look at the pace is still owed, under the Verify entry "The game's own chip never came back, and the chips turned over too slowly".

## Trimmed from: A troubleshooting question mostly never reaches the tips

Removed or rewritten lines, word for word:

  that holds with a game running and not with nothing running. Next step: a floor under the tip search so it can say
  none fit, plus a "no tip for this" line. (D81, D85) Planned as wave three ([48](archive/48-kb-wave-three-session.md)).

**Related work landed 2026-09-26 (plan 70, helper C):** the tip cut-off and a false-positive word
match are now fixed (see [Tip cut-off fix](#tip-cut-off-fix), [Lan word-boundary fix](#lan-word-boundary-fix)),
and the "no tip for this" line has real numbers (see [No tip line numbers](#no-tip-line-numbers)), but
still cannot be made to appear — that is still waiting on the maintainer.

## Every question waits about a second while the note search loads

Filed 2026-09-07 as "the note search has got about thirty per cent slower since August"; narrowed 2026-09-12.

**The device readings.** The same three questions, on the Deck: 793 to 900 milliseconds in August, 1078 to 1094
one September evening, 1103 to 1230 the next. The explanation offered at the time — that only the first question
after a quiet spell is slow — does not hold there: three questions asked back to back came back within 16
milliseconds of each other, no faster on the third than the first. A real question measured on 7 September took
1067 milliseconds for the same step.

**What the build machine says the two states cost** (`runs/plan48-embed-eviction-pc.json`, 2026-09-12): searching
the notes costs **1336 milliseconds when the model has to be loaded** and **14 milliseconds when it is already
there**. The Deck's per-question number sits on top of the loading figure, not the resident one. So the Deck
behaves as though the model is loaded from scratch for every question.

**What the build machine could not reproduce, and why that is still useful.** The leading idea was that writing an
answer pushes the search model out of memory. On this PC it does not: after a reply, both models were still
resident and the next search took 24 milliseconds. But this PC has far more memory than a Deck, so the honest
reading is that it never gets low enough to push anything out — which is itself why repeat questions are fast here
and slow there. A negative result here does not clear the Deck.

**What would settle it**, and it is cheap: read what the Deck is holding in memory at three moments — before a
question, after the notes are searched, and after the answer finishes. If the search model is gone after the
answer, the cause is settled. Row **KB-SPEED-02**.

**Two things ruled out.** A fresh process is not the difference (two separate runs of the check both read fast).
And nothing in the plugin throws the search model away: the answering model is asked to stay in memory for five
minutes, and the search model gets Ollama's own five-minute default because the request says nothing
(`ollama_embed_service.py:137`).

**A related risk, not yet a bug.** The search gives up after three seconds and falls back to word matching only,
silently (`knowledge_base_service.py:1620-1624`). A load takes 1.34 seconds on a strong PC. Today's Deck readings
are well under three seconds, but not so far under that a busy moment could not cross it, and a person would get
worse answers with nothing on screen to say why.

## Searching the notes by meaning costs about a second, every time, on the Deck

- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same band as
  the first time this was measured. The maintainer looked at the number and said that is fine — about a second before
  an answer that then takes tens of seconds to write out is not something a person would notice. **The one-second
  target this was measured against is retired.** The related finding still stands: a repeat search is fast on a
  PC (0.05 seconds) but not on the Deck, where the third question here was no faster than the first. **The cause
  is now measured** — the two models pushing each other out of memory, see the step above — and removing it reads
  as cheap; the acceptance above stands until the maintainer says otherwise. (D84) Evidence
  `docs/test-evidence/round34-drg-q*.json`, `docs/test-evidence/plan46-R2-strategy-half.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Trimmed from: Wrong-subject notes

Removed or rewritten lines, word for word:

- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say so,
  found 2026-09-07.** Asking Black Mesa how to tame a horse, asking Portal 2 where to buy a house, and asking about
  a Hades boss that does not exist all still attach a note. The floor added this wave cannot catch these without
  also throwing away twenty or more correct answers elsewhere in the library, so it was left as it is. **Three of
  the four now carry the new "no close match" line** (D88 above), so the answer no longer reads as grounded — but
  the wrong note is still attached and still shapes the reply. *"Where do i buy a house"* gets no line at all,
  because a word in it really does point at a card. Fixing the attachment itself, rather than labelling it, is
  wave-four note-writing work. **Found again 2026-09-18:** a Hades "boss at the end of the first area" question


*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## The "no close match" line reads wrong next to a note the reply used

- ★★ `[KB]` **The "no close match" line reads wrong next to a note the reply used** — **OPEN, found 2026-09-18.**
  The line judges only the first attached note's scores, so on a Hollow Knight boss question it said the answer
  leaned on the model's own knowledge while the reply was actually built on the Broken Vessel note, attached
  second; on a Pikmin 2 question it said the same thing under a reply built on the very note the block showed.
  Either look at the best attached note, not just the first, or word the line as "a thin match" rather than a
  claim the notes were not used. Evidence `docs/test-evidence/plan58p1-M-hk-boss-before.json`,
  `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-04.json`. **Sighting, 2026-09-19, Half-Life 2:** a question the
  notes genuinely do not cover got the warning line for the first time, but a note card naming three notes
  showed underneath it at the same time, contradicting the line. Evidence
  `docs/test-evidence/plan61-W2-R5-hl2-retry3.json`.

**Fixed 2026-09-26 (plan 70, helper B, commit `58f60c0a`).** The check now also reads each attached
note's own text, where the matching word usually lives, not just its title, plus a small tolerance for
plurals. A 104-question sweep after the fix: 1 answer changed, for the better. **Now wired into real
answers (commit `e4c24bdd`)**, tested through the real path: a Hollow Knight-shaped note stops showing
the line, and a note sharing no word still shows it. Row **KB-NOCLOSE-TEXT-01** passed on the Deck 2026-09-28 (plan 74), closed; evidence
`docs/test-evidence/plan74-KB-NOCLOSE-TEXT-01.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Five checks from the August retrieval rework were never run on the Deck

- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or retire.** The corpus
  format gate, the relevance floor, follow-ups searching the user's words, transparency matching what the model got, and
  the Developer kill-switch. Either one evening with pinned test chips, or close them as superseded by the rows that
  passed this week. **Run 2026-09-15: the relevance-floor row is really two checks bundled as one, and they point
  opposite ways.** Its on-topic half is a real regression guard worth keeping. Its off-topic half — an unrelated
  question should attach nothing — fails as written, but that failure is the behaviour the maintainer already accepted
  on 2026-08-27 in the "Unrelated questions still get game cards stapled on" entry above; the row and that entry now
  contradict each other, which is for the maintainer to settle by retiring or rewording one of them. Rows
  **KB-VARIANT-01**, **KB-FLOOR-01**, **KB-FOLLOWUP-01**, **KB-TRANSPARENCY-01**, **KB-KILLSWITCH-01**.
  **Tried again 2026-09-18 with Hades and Half-Life 2 running: KB-FOLLOWUP-01 and KB-TRANSPARENCY-01 stayed
  blocked, and KB-FLOOR-01's already-passed on-topic half could not be freshly confirmed either** — every one
  of them needed a question sent, and the Ask-box freeze above (the three-star focus entry) stopped every
  question from going out. Evidence `docs/test-evidence/plan61-KB-FOLLOWUP-01.json`,
  `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry.json`, `docs/test-evidence/plan61-KB-FLOOR-01-ontopic.json`.
  **Tried again at 12:50: KB-TRANSPARENCY-01 and KB-FLOOR-01's on-topic half stayed blocked** — Half-Life 2
  had dropped off the Recent Games row so it could not be launched, and the pinned test sentences below would
  have stopped the question anyway. **KB-FOLLOWUP-01 and KB-KILLSWITCH-01's Show details half are now blocked
  by that new pinned-chip problem instead of the earlier freeze:** the Megaera question they both depend on
  could not be sent because the pinned test sentence stopped showing and no test sentence may be typed by
  thumb. Evidence `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry2.json`,
  `docs/test-evidence/plan61-KB-FLOOR-01-ontopic-retry2.json`, `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry2.json`,
  `docs/test-evidence/plan61-KB-KILLSWITCH-01-retry2.json`. On 2026-09-19 the maintainer played Half-Life 2
  once more, so it is back on the Recent Games row and these rows can run in the next Deck block.
  **Run again 2026-09-19, this one still cannot close:** **KB-FLOOR-01's on-topic half passes** clean, a
  Half-Life 2 question attached the right note as it should. **KB-KILLSWITCH-01's Show details half now
  passes too** — with the meaning-search switch off, the screen correctly says it is using plain keyword
  search and the game still gets an answer with a note attached; the switch was turned back on and
  confirmed. **KB-FOLLOWUP-01 is a partial:** the follow-up search does find the right note again, but the
  written reply asks which boss is meant instead of using the name it found — the search half passes, the
  reply half does not. **KB-TRANSPARENCY-01 is blocked, not by the Deck this time but by the plugin itself:**
  its log never records which notes were searched or attached, so there is nothing written down to check the
  on-screen note list against. That gap needs either the plugin's own activity log switched on before a
  question is asked, or a line added to the log naming which notes were attached — without one of those,
  this check can never be run as written. **KB-VARIANT-01 is still blocked**, since running it would mean
  replacing the very library under test. So this entry stays open: three of the five checks have real
  answers now, one is blocked by a plugin gap rather than a Deck problem, and one still cannot be run at
  all. Evidence `docs/test-evidence/plan61-KB-FLOOR-01-ontopic-retry3.json`,
  `docs/test-evidence/plan61-KB-KILLSWITCH-01-retry3.json`, `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry3.json`,
  `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry3.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**Update 2026-09-22: four of the five now have real answers.** The transparency check joined them
that night, once the log finally named the attached notes. Only the corpus-format check still cannot
run, since that would mean replacing the library it tests. **Per D116 #7, the corpus-format check is
retired, covered by its own unit tests.** **The follow-up check passed in full on the Deck 2026-09-23:**
Megaera's note came first for both the parent question and its follow-up. The relevance floor stays
half passed — its on-topic half is a real pass, its off-topic half still waits on the maintainer to
retire or reword it against an earlier accepted decision.


## Trimmed from: Hidden spoiler box stays shut on games with no Steam ID and on name-first questions

Removed or rewritten lines, word for word:

  Evidence `docs/test-evidence/plan61-STRAT-SPOIL-FIRST-01.json`. **STRAT-SPOIL-NAME-01 tried 2026-09-18,
  blocked:** Doom 64: Retribution is genuinely installed, but it is not on the Deck's Recent Games row, the
  only list the launch tool can search, so it could not be started; someone needs to play it once by hand
  first. Evidence `docs/test-evidence/plan61-STRAT-SPOIL-NAME-01.json`. From the older **STRAT-SPOIL-DRG-01**
  block: **DRG-01b tried 2026-09-18 with Deep Rock Galactic: Survivor running, blocked** by the same Ask-box
  freeze as the three-star focus entry above (evidence `docs/test-evidence/plan61-DRG-01b.json`); **DRG-01c
  not tried on purpose** (would mean removing the library, out of scope tonight). **HADES-UNNAMED-STREAM-01
  and HADES-UNNAMED-01 (a fourth try) were tried again 2026-09-18 with Hades running and both FAILED**, sent
  cleanly this time with no focus trap at all: the reply came back in plain text with no spoiler box at any
  point, either while streaming or once finished. Both rows now ride on the new three-star bug above (a
  name-withheld boss question comes back with no cover), not on the Ask-box freeze. Evidence
  `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`,
  `docs/test-evidence/plan61-HADES-UNNAMED-01-retry2.json`. **Still owed tonight:** STRAT-SPOIL-NAME-01 (Doom
  64 cannot be launched), DRG-01b (stopped by the focus trap), DRG-01c (left out on purpose). On 2026-09-19
  the maintainer said Doom 64 is not readily available, so STRAT-SPOIL-NAME-01 stays blocked until it is.
  [Plan 54](archive/54-spoiler-rules-gaps.md). **DRG-01b tried again 2026-09-19, still blocked:** Deep Rock
  Galactic: Survivor had fallen off the Recent Games row again, so it could not be launched. Evidence
  `docs/test-evidence/plan61-DRG-01b-retry.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## A suggestion chip pulled from the game's notes shows no Tip mark

- ★ `[chips]` `[KB]` **A suggestion chip pulled from the game's notes shows no Tip mark** — **OPEN, found
  2026-09-18 on the Deck with Half-Life 2 running.** The knowledge base was on, and the suggestion chip
  showed real tips straight from the game's own notes — but the small coloured dot that is supposed to mark
  a chip as coming from the notes never appeared, so a person looking at the chip has no way to tell it is
  a real tip and not a guess. The dot is only meant to light up when a chip is marked as coming from the
  notes; these chips did carry real note content but arrived without that mark, or lost it on the way to
  the chip, so the two checks that decide "is this a note chip" and "should the dot show" are not agreeing
  with each other. Row **CHIP-BUTTON-09**. Evidence `docs/test-evidence/plan61-CHIP-BUTTON-09.json` and its
  two screenshots.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## A follow-up still names the wrong boss one run in three

- ★★★ `[KB]` **A follow-up still names the wrong boss one run in three** — **OPEN, left behind when the follow-up
  fix closed 2026-09-12.** Ask about a boss, then *"what about its second phase"*, and you now get the right boss two
  times in three, where it used to be wrong every time. The remaining third still names the rival boss. DOOM Eternal
  is wrong every time, and no amount of work on the search can close that one. This is the half the shipped fix did
  not cover, kept visible on purpose rather than archived with it. [Numbers](archive/48-kb-wave-three-session.md).
  (D98) **Sighting, 2026-09-19, Hades:** a different shape of the same family — a follow-up question about a
  boss's second phase found the right boss's note again, but the written reply asked which boss was meant
  instead of using her name. Evidence `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry3.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**Measured 2026-09-26 (plan 70, helper K), three ways, by hand (24 second-question answers each, 8 games
× 3 runs):** today's shape scores right 4, wrong 4, asks "which boss?" 10, vague 6; dropping every other
attached note scores 11/0/8/5; sending the previous question and a short version of its answer scores
21/2/1/0 (fixes DOOM Eternal, about 0.6 s slower per follow-up on the PC). The first idea (carry the
subject into the instructions) was already shipped. The maintainer picked sending the previous question
and answer (D112, added 2026-09-26); being switched on now.

**Passed on the Deck 2026-09-26 (plan 70, flow L2), closed, row reworded to "stays on the right boss."**
Four tries, each a new chat: name a boss, then a bare follow-up about its second phase, reworded each
time. All four stayed on the boss already named — nobody was asked which one, nobody named a wrong one.
Two of the four said the boss's name outright (one of those inside a spoiler cover, correctly, since the
player had named her first); the other two only said "her"/"she," without naming anyone, which still
counts as staying right rather than going wrong. Side finding, not a bug: a Hollow Knight follow-up asked
about a second Hornet fight; the reply said the notes don't mention one, which is true — the game does
have a second Hornet fight, the notes just don't cover it. Evidence
`docs/test-evidence/plan70-FOLLOWUP-BOSS-01.json`.


## No tip line numbers

**Numbers in 2026-09-26 (plan 70).** Four cut-offs tried on the topic sorter's pull, measured on 35
tuning questions plus the eight wave-two device sentences, twelve junk phrases and the five hardest:
none made the line appear on any sentence; narrowing the pull changed nothing; removing it lost 6 right
tips (33 → 27 right, 1 → 7 wrong). Why: every hard sentence gets its tip from the plain word search, not
the topic sorter, so the line can only appear if the word search for tips gets its own cut-off — not
built this wave.

**Retired by the maintainer 2026-09-27 (D112 item 14; helper Q, `db4b3b4a`).** The line and its code were
removed; nothing a person sees changes, since it never appeared. "Not in my notes" and "No close match in my
notes" are unchanged, and the check that keeps "Not in my notes" off a tip-sheet turn stays, renamed. Two
finished one-off scripts in `scripts/archive/` still call the removed function; noted only.

## Tip cut-off fix

**Fixed 2026-09-26 (`27fd9aee`).** The tip cut-off's own note said it sat just above the worst junk
phrase's score, but it actually equalled that score, and the check only turns away scores below the
cut-off — so that exact phrase could still get a tip. The cut-off moved from 0.5044 to 0.5050, just
above it; the weakest right tip on the tuning rows scores 0.5804, so no right tip is lost. Proven by a
test that was broken on purpose, failed, then restored
(`test_compat_meaning_floor_rejects_a_score_at_the_old_junk_ceiling`).


## Lan word-boundary fix

**Fixed 2026-09-26 (`ab0a6e40`).** The network topic's "lan" rule matched inside longer words too, so a
question ending in a word like "land," "language" or "lane" could be sorted as a network problem — a
Paper Mario question ending "right before they land" was the one found. Test
`test_lan_does_not_match_inside_a_longer_word`.


## Library format bump and per-game Deck tips

**Built 2026-09-26 (plan 70, helper E).** `compat_patterns` gains an optional per-game column (schema
3 → 4); every installed library goes stale until it downloads the new one. Two safety nets ride with
the bump: `e43fc91d` compares a library manifest's own format number against what this copy of bonsAI
understands and refuses before a single byte downloads, with a plain message asking the person to
update the plugin, if the library is too new; and an old plugin's own download check never looks at
the format number and reads columns by name, so it degrades to the old behaviour instead of crashing.
Five tips ship keyed to one game rather than shared (`ff37ea26`): the maintainer's own Fallout 4
mod-launcher option and GTA San Andreas: The Definitive Edition's DirectX 12 option, exactly as given
from their own Deck, plus two more for Deep Rock Galactic: Survivor and Ocarina of Time, each labelled
"Researched, unconfirmed" since nobody has checked them on real hardware the way the first two are.
Once a game is resolved, its own tips now join the search pool ahead of an equally-good shared tip
(`bbad8e00`), reusing the same preferred-tip weight a routed topic already gets.

**Deck check, plan 70 flow R, 2026-09-26 (build `7379a043`), library `2026.09.26` installed locally
ahead of publishing.** Not published: the maintainer chose to fix the per-game tips first.

- **R.1, installing the library — PASS.** One press on the Developer tab's own install button, no game
  running: the Ollama tab read the new version at once, no errors in the plugin log. Side note, by
  design or not: the install landed on the internal drive rather than the SD card the old library lived
  on, and rewrote the location setting; the old copy stays on the card, unused. Evidence
  `docs/test-evidence/plan70-R-R1.json` (+ screenshot).
- **R.2, the new games and their notes, nothing running — PASS, 5 of 5.** A fresh question for each of
  Brotato, Palworld, Skyrim, Fallout 4 and Red Dead Redemption 2 attached the right note every time,
  each one credited to its real source page. Two small model slips, not note errors: Skyrim's answer
  reversed the order of an instruction the note states correctly, and a Red Dead answer said Dead Eye
  "refills ammo or tonics" when the note says it only refills from tonics. Evidence
  `docs/test-evidence/plan70-R-R2.json`.
- **R.3, the starting-out chip with a game running — PASS, second try.** The first try was blocked by
  Steam itself (a "logged in on another computer" dialog over Left 4 Dead 2, not the plugin's doing) and
  a rig limitation reading a non-Steam shortcut's tile; re-run once the Deck was set offline. With
  Brotato running, its own "How do I get started in Brotato?" chip showed within a second and the answer
  attached "Starting out in Brotato"; with the maintainer's own Palworld shortcut running, its chip
  showed within three seconds too, so the name match works for both a Steam game and a shortcut. The
  runbook's own route (press the chip, then Ask) hit the already-known chip-then-Ask trap, so the
  question was sent with the chip's exact words instead; the owner may prefer to call that half
  unclear rather than passed for that reason. Evidence `docs/test-evidence/plan70-R-R3.json`,
  `plan70-R-R3-try2.json` (+ three screenshots).
- **R.4, per-game Deck tips — FAIL.** See [RAG Phase 4](#rag-phase-4-extended-retrieval): neither Deep
  Rock Galactic: Survivor's Render Scale tip nor Fallout 4's F4SE launch-option tip ever reached an
  answer, because the questions never sorted as troubleshooting in the first place. GTA San Andreas: The
  Definitive Edition was not on the Deck's Recent Games shelf, so its own tip was not tried at all.
- **New bugs found along the way, being fixed:** a hidden stuck selection — walking up from the question
  box can land the D-pad ring on "Save chat to Desktop" while it is fully covered by the dock, dead to
  every press, seen three times (helper F2 fixing); the already-known chip-then-Ask trap reproduced
  again; the Context line briefly names the previous game for about a second after switching games, and
  briefly reads "no active game" for under a second right after reopening the panel; a rotating
  suggestion chip can take a press meant for a different chip than the one actually read; and the
  plugin's own log records nothing about which notes or tips a question chose, which makes a routing
  problem like this one hard to diagnose from the log alone. Evidence
  `docs/test-evidence/plan70-R-R3-try2.json` (the hidden ring and chip-trap screenshots).

**Found while landing E2's tip fix, fixed the same night by the session (`c1ca8b7d`).** A library built
before 2026-09-26 (schema format 3 — the one still on the download sites while the new one waits to
publish) has no per-game column at all; only the build script adds that column, the plugin itself never
adds it to an already-installed library. E2's own tip check ran on every single question regardless, so
against a format-3 library it failed outright and emptied that answer's notes completely — strategy
questions included, not just troubleshooting ones. Caught by three follow-up tests run against the
2026-09-18 library. Fixed by having the shared tip lookup return no tips, rather than fail, when the
column is missing; this also quietly covers the older troubleshooting path, which had the same weakness
whenever a troubleshooting question named a game. New test
`test_a_library_from_before_per_game_tips_still_attaches_strategy_notes` fails without the fix. No Deck
row needed — the Deck itself already carries the newer library, so this could only have bitten someone
on the still-published, older download.

**New bug, found by E2, not fixed: contractions split into a stray letter in keyword search.**
`_fts_match_query` (`py_modules/backend/services/knowledge_base_search.py`) splits words like "there's"
or "can't" so that a bare single letter ("s", "t") is left over and can match a card purely by
coincidence. This runs for every keyword search — notes and the whole tip sheet — except inside the new
per-game tip check, which E2 wrote to avoid it. Needs a measurement across the full question set before
it is touched, since fixing it may move many scores at once, for better or worse. **Fixed the same night
(helper O, `55719a6e`), measured first** — see [Flow L7 findings](#flow-l7-findings).

**Published by the maintainer 2026-09-27, about 00:03,** as the permission check required ("Corpus point
release 2026.09.26" on the Hugging Face dataset; the GitHub release's files updated too). Checked by the
session: both sites' manifests read version 2026.09.26, format 4, identical to the release build, and both
sites' library files match it byte for byte; the Hugging Face credits page matches too.

**R.5, the fresh download from the published site — passed on the Deck 2026-09-27 (flow L9).** The
meaning-search model was removed once and the library removed; the plugin's own Download fetched
2026.09.26 from Hugging Face; the offer "Also download the meaning-search model (about 270 MB)?" appeared,
and the model landed in about 10 seconds; Update did not ask again; the next question read "Retrieval:
Keyword + meaning". Row **KB-NOMIC-OFFER-01** passes. **Still owed:** row **KB-FORMAT-REFUSE-01** — no
library too new for this plugin exists yet to test the refusal with. Evidence `docs/test-evidence/plan70-R5.json`
(+ 2 screenshots).


## Trimmed from: Black Mesa's electrified-water question

Removed or rewritten lines, word for word:

opening tram ride — neither one is the electrified-water note, which does exist in the library. **Asked
again 2026-09-22 with different wording** (a repeat is cached and proves nothing): this time the
electrified-water note itself came first, showing the right note CAN be found, not that the original
wording now finds it. Evidence `docs/test-evidence/plan61-W3-D-blackmesa.json`,
`docs/test-evidence/plan63-BLACKMESA-WATER-NOTES.json`. **Asked again 2026-09-23 with the exact original

## Trimmed from: KB transparency matches what the model got

Removed or rewritten lines, word for word:

**Ran for the first time and passed, 2026-09-22,** once the answer-lines lane added the missing log
line — recorded as impossible every earlier time. **All three attached names confirmed on the Deck
2026-09-23:** a Hollow Knight reply's open notes block named the same three notes, in the same order,
as the log's own search and attach lines. Evidence `docs/test-evidence/plan64-KB-TRANSPARENCY-names.json`.
**The game-running case passed too, 2026-09-23:** with Half-Life 2 running, the open block named
Ravenholm, Combine soldiers and Hunter-Chopper, exactly as the log did. Evidence
`docs/test-evidence/plan64-KB-TRANSPARENCY-running.json`. **Still owed:** a case where a note is dropped
for space. Tried with nothing running, then again 2026-09-23 with a game running and a troubleshooting
question meant to produce a large Proton log — still could not be reproduced: 3 notes searched, 3
attached, none dropped, with a roughly 16,000-character prompt. Evidence
`docs/test-evidence/plan64-KB-TRANSPARENCY-starved.json`, `docs/test-evidence/plan64-KB-TRANSPARENCY-starved-try2.json`.

## Pull the embedding model as part of installing the library

**Built 2026-09-26 (plan 70, helper D).** A person who never pressed the pull button silently got word
search only, the weaker half. Now, right after a fresh install finishes with that model still missing, a
confirm box offers to download it once; Update never asks again.


## Trimmed from: Flow L7 findings

Removed or rewritten lines, word for word:

Long version of the fixes closed and the problems found in plan 70's last Deck block, flow L7
(2026-09-26, 21:52 to 23:43), and the helpers' landings just before it. Moved here to keep the roadmap
under its size limit.

**A running game's own Deck tip now reaches the answer (helper E2, `e1bc0c16`) — passed on the Deck.**
With Deep Rock Galactic: Survivor running, "the text on the screen looks blurry on my deck" in Strategy
put the game's own Render Scale tip first, credited "steamcommunity.com", and the answer named Render
Scale; the same question reworded in Speed attached that one tip only; the control question "how do I
beat the dreadnought boss" attached the Dreadnought note and not the tip. Evidence
`docs/test-evidence/plan70-R4-try3.json` (+ two screenshots). Over Fallout 4 the question could not be
sent (the dead question box below), so it was asked with the game named and nothing running: in Speed
and in Strategy the F4SE tip came first and the answer gave exactly that one launch option. Evidence
`docs/test-evidence/plan70-R4-try4.json` (+ two screenshots). Deep Rock Galactic: Survivor named, nothing
running, "text" wording: the Render Scale tip first again. Evidence `docs/test-evidence/plan70-R4-try6.json`.

**One game's own tip no longer attaches to another game's question (helper P, `aeed48be`) — passed on
the Deck.** The general tip searches now keep shared tips and only the resolved game's own. Measured on
the PC over the 76 troubleshooting test questions: the right tip first 26 → 26, in the top three 35 → 36,
questions with another game's tip in the running 5 → 0. On the Deck, "fallout 4 text looks blurry, and
what launch options do i need" got the F4SE tip and a shared display tip, and Deep Rock Galactic:
Survivor's Render Scale tip did not attach. Evidence `docs/test-evidence/plan70-R4-try5.json` (+ screenshot).

**"No close match in my notes" no longer shows when the game's own tip answered (helper P, `fb805301`) —
passed on the Deck.** Before the fix, the Strategy blurry-text answer ended with that line though the
tip was used (`plan70-R4-try3.json`). After it, the same kind of answer ended without it and the plugin
log showed no error. Evidence `docs/test-evidence/plan70-R4-try6.json` (+ screenshot).

**A tip-answered question no longer sets what the chat is "about" (`9063bbfb`) — held on the Deck.** A
Strategy turn rerouted to the tips used to store the tip's topic ("display") as the chat's follow-up
subject, so the next bare follow-up searched for "display". The test was proven by breaking it. On the
Deck, the bare follow-up "what about the second one" after the Fallout 4 turn showed "display" nowhere,
and the answer asked which thing was meant. Evidence `docs/test-evidence/plan70-R4-try5.json`.

**A tip with a source page shows it in its credit line — reworded, then passed.** The old check asked for
a *shared* tip with a source page. It could never pass with this library: of 164 tips only 3 carry a
source page, and all 3 belong to one game (Deep Rock Galactic: Survivor's Render Scale tip and two
Ocarina of Time tips); the shared tips are the maintainer's own words and carry none. The credit line
itself works: Deep Rock Galactic: Survivor's tip read "steamcommunity.com · bonsAI-maintainer". So the
check now reads "a tip with a source page shows it in its credit line", and passes on that tip. Evidence
`docs/test-evidence/plan70-R4-try3.json`.

**Up from a chip no longer parks the ring on a hidden "Save chat to Desktop" (helper F2, `12ee3dfb`) —
passed on the Deck.** Three tries over Deep Rock Galactic: Survivor on an answered chat and one with
nothing running: each time Up from the chip landed on "Save chat to Desktop" with its words about 10 px
clear of the dock, and Up again moved on. The measurement F2 asked for: the chat pane is 677 px tall and
runs under the 165 px dock; it was already scrolled to its end every time (153.1 of 154), and "Save
chat" is its last row, so the row's bottom sits at the dock's top edge. Over a game the whole panel sits
40 px lower, every box together. A brand-new chat has no "Save chat" row, so Up lands on the chat row.
Three walks saved (`checks/plan70-HIDDEN-RING-recheck-*`). Evidence
`docs/test-evidence/plan70-HIDDEN-RING-recheck.json`.

**Contractions no longer leave a stray letter in keyword search (helper O, `55719a6e`) — measured on the
PC.** Only the ending after an apostrophe is dropped before splitting ("there's" becomes "there", "can't"
becomes "can"), so no single-letter search word is left and nothing new becomes a search word. On the
test questions against a clean library, keyword search alone: tuning questions unchanged (164 of 199
found, 129 first); held-back questions found unchanged (194 of 236), first 143 → 144; wrong answers
unchanged at 42. A first try that deleted every apostrophe was rejected: it turned "what's" into "whats"
and lost one held-back question. No Deck row needed.


**New, open: over Fallout 4 the question box goes dead with no chip pressed.** Every time the panel was
opened over Fallout 4 (4 opens over about 5 minutes), the ring sat in the question box: Down (5 presses
checked) and Right left it there while the page's own focus moved to the Ask or mode button; only Up
worked. Closing and reopening the panel did not clear it while the game ran; with nothing running the
same walk reached Ask at once, and over Deep Rock Galactic: Survivor it worked too. The same shape as the
chip-then-Ask trap, without any chip. Evidence `docs/test-evidence/plan70-R4-try3.json`,
`plan70-R4-try3-fo4-box-down-dead.png`.



**New, open: a game's own tip is labelled "shared".** Show details credits Deep Rock Galactic: Survivor's
Render Scale tip and Fallout 4's F4SE tip as "Shared troubleshooting — <topic>", and since `9063bbfb` the
notes block over a game's own tip reads "From the shared Deck tips". Both should say it is that game's own
tip. The label comes from one fixed wording applied to every tip where tips are turned into cards
(`knowledge_base_cards.py`, `_compat_row_to_card`); fixing it means carrying the tip's game through several
card builders, and tests pin the exact wording of the sources list. Evidence
`docs/test-evidence/plan70-R4-try5.json`, `plan70-R4-try6.json`.


**Not run, owed:** R.5, a fresh download of the library from the published sites plus the
meaning-search model's offer. The library passes its release check and the Deck's copy matches the
release build byte for byte, but Claude Code's permission check refused the push to the public sites,
so it is not published. The maintainer runs
`python scripts/publish_corpus.py --build-dir build/kb-release --hf-clone-dir ../bonsai-knowledge-base --push-hf --push-github`;
R.5 follows. No released plugin can download a library yet (0.4.9 and main have no knowledge base).

## Trimmed from: RAG Phase 4: extended retrieval (link fixed)

Removed or rewritten lines, word for word:

flow R. See [Library format bump and per-game Deck tips](#library-format-bump-and-per-game-deck-tips).
