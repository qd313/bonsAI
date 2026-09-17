# 37 — The knowledge base, zoomed out (status report, 2026-09-07, fifth pass, wave three landed)

Written from the roadmap, the knowledge-base architecture doc, the answer-quality plan, the locked
decisions, the last eval reports, the last three session plans and the code. Plain language on
purpose. It says where things stand, what each next step would buy a person using the plugin,
roughly what it costs, and what is in the way. Links are at the end, not in the sentences.

**The live list is the roadmap's [Knowledge base and RAG](../roadmap.md#knowledge-base-and-rag)
section.** That is where entries move as work lands. This report is the zoomed-out view behind it and is
updated whenever that section changes shape; the date in the title says when it was last brought in step.

**Stars say how big a job is** — effort and risk together, on the roadmap's scale: `★` easiest up to
`★★★★★★` extreme scope. Every item below carries one, finished or not, and where an item also has a
roadmap line it carries the same stars, so the two files can be read side by side. The one list without
stars is section 6, because what is in the way is not a job anyone can size.

---

## 1. The picture in one paragraph

With one of the twenty-five covered games running, a Strategy or Expert question gets the best one to
five notes from a library of **293 game notes** glued onto the instructions the AI reads, and a
troubleshooting question gets tips from a sheet of **156 Deck tips**. On questions written without looking
at the notes, the search puts the right note in its top three 84 times in a hundred — **that count was
taken before this wave put a floor under the search and has not been measured again since, so it is
owed.** Wave three also found that the two checks behind the answer numbers were themselves wrong, fixed
both, and took the numbers again on the shape that ships today — a Strategy answer about a named thing
now gives the note's own advice first, then the same menu, instead of a short bit of orientation first.
On that shape, the small model on the Deck keeps the notes' facts 79.5 times in a hundred and almost
never contradicts them, 90.7 times in a hundred. **Nobody has read that new shape on the device yet.**
Release `2026.09.08` carries the newest notes, the rewritten troubleshooting tips and a corrected Black
Mesa note, and is live on both places it publishes to. **It is now on the maintainer's Deck too** —
installed from the plugin's own button and checked by asking about the flooded rooms, which came back
correct.

**Coverage was the thing wave two set out to fix.** Of the 72 questions a player might plainly ask about
the twelve games added earlier this month, only 43 had a note behind them a month ago. **64 do now** —
the other eight were written on purpose to have none, and stay blank as a control, so every question that
was meant to have an answer now has one.

## 2. What has been built, in order

| When | Stars | What shipped | What a person noticed |
|---|---|---|---|
| Late July | ★★★★ | Keyword search over per-game cards, a troubleshooting tip sheet, a first "hybrid" | Game questions started arriving with notes attached; Show details said which search ran |
| 5–9 Aug | ★★★★ | The retrieval rework: word search and meaning search genuinely combined, a relevance floor, follow-ups searching the user's words, honest transparency | Fewer irrelevant cards stapled on; the trust label stopped over-claiming |
| 6 Aug | ★★ | Troubleshooting routing widened | Questions that name a topic reach the tip sheet; before, 3 of 40 did |
| 14–16 Aug | ★★★★ | Public corpus on Hugging Face with a GitHub mirror; download, update, remove from the Ollama tab | Anyone can install the library from the plugin |
| 18 Aug | ★★★ | The meaning search searches on its own instead of re-ordering keyword hits; Expert mode gets the full card budget | "How do I kill the big armoured bug boss" finds the Dreadnought card; Expert stops being starved |
| 19–21 Aug | ★★★ | Chip guarantee and Tip badge; 16 structured enemy/item/boss cards for two titles; cards with labelled lines | A game chip always appears when the corpus knows the game; the two sample games answer "how do I deal with X" |
| 28–29 Aug | ★★★ | 107 blind test questions (written without reading the cards), a second relevance signal for the meaning search, ten cards re-typed | The eval became honest; unrelated chatter attaches fewer cards |
| 29–31 Aug | ★★ | 28 new cards: State of Emergency, the Hades weapons, the antlion split, entity cards for Cyberpunk, Fallout 4 and Red Dead, three comparison cards | Corpus 133 → 161 |
| 1–2 Sep | ★★★ | Corpus point release 2026.09.01 published and installed on the Deck; the answer test built and baselined | The Deck finally has the newest 28 cards; the answer side has numbers |
| 2–3 Sep | ★★ | Spoiler fence misfire fixed and measured; prompt budget guard so a long log paste cannot push the instructions out of the model's window | Fewer replies with harmless tactics hidden behind a spoiler box; confirmed 5 of 5 on the Deck |
| 3–5 Sep | ★★ | Deck verifications: Expert mode cards, boss-by-name phrasing, all four coverage readings, wiki credit with date, troubleshooting routing, the seed hint | Six knowledge-base entries moved to Done |
| 6 Sep | ★★★★ | Eleven more games written up from their wikis — 105 cards, each naming the page it came from, the licence and the day it was read | Nothing yet: the cards exist but are not in a release, so no Deck has them |
| 6 Sep | ★★★ | 72 blind search questions and 24 answer-test rows for the twelve new games; the search test gained a weight sweep, per-question card detail, and a second right answer | Nothing yet: measurement plumbing only |
| 6 Sep | ★★★ | Speed mode's remaining meaning-search leak confirmed fixed on the Deck | A Speed question no longer spends about a second on the slower search |
| 7 Sep | ★★★★ | 27 new notes filling the 21 real gaps in the twelve new games, plus topping up the four thinnest of them | Someone asking about Doom 64, Mario Kart 64, Super Mario 64 or Paper Mario mostly gets a real answer now, where before they mostly got nothing |
| 7 Sep | ★★★ | 32 troubleshooting tips rewritten, and the routing that refused a plain "crash" question fixed | "My game keeps crashing" now reaches real advice, where before it reached nothing at all |
| 7 Sep | ★★ | Every note and tip guaranteed to have its meaning index before it can ship | Nothing directly — it stops a half-built library from reaching a Deck quietly |
| 7 Sep | ★★ | The "not in my notes" line | On a Strategy or Expert question about a covered game where nothing matched, one quiet line under the reply now says the answer is the model's own knowledge, not the notes |
| 7 Sep | ★★ | Two bug fixes: raw computer text stopped appearing in a reply, and the panel stopped naming a game after you close it | An answer no longer ends with a line of code; the line under the question box catches up within a couple of seconds of exiting a game |
| 7 Sep | ★★★ | Corpus release `2026.09.07` published (293 notes, 156 tips) | Nothing yet on the Deck — the release is live on both channels but the maintainer's device still runs the 6 September build |
| 15 Sep | ★★ | The spoiler box now opens on a game known only by name and on a name-first boss question, and the prompt matches the risk chip for a game named in the question | Fewer harmless boss tips hidden behind a box, and no more chip saying low over a fenced answer |

Chip work that touches the knowledge base also shipped in this window: corpus chips no longer vanish
after 21 seconds, the rotation no longer favours the top three, and the pinned test-chip batches exist
for QA.

## 3. The numbers today

*(Wave three found that the answer test's own checks were wrong and the search test had been reading a
stale copy of the library, fixed both, and re-measured. Every answer number and every search number
quoted anywhere before that fix — including this report's own earlier passes — is void and is not a fair
comparison against what follows. The figures below are what the fixed checks read on the library that
ships.)*

**Answers — the shape that ships today, tactics-first, the Deck's own model, three runs each, corrected
checks.**

| Check | Reading |
|---|---|
| Facts from the note kept | **79.5 in 100** |
| Never contradicts its note | **90.7 in 100** |
| A note attached whenever one was due | **100 in 100** |
| Branch menu shown when due | **97.1 in 100** |
| Clean on all three runs | **67.2 in 100** |

This is better than the shape it replaced on almost everything a person would notice: more of the note's
facts survive, spoilers are hidden when they should be far more often, and a whole question comes out
clean on all three runs more often, in a reply twelve words shorter at the same speed. The one thing that
moved the wrong way is contradictions — but that is one extra question, not a spread, and both failing
questions are the same topic, the Pikmin 2 day limit, which was already wrong on the old shape too. The
maintainer read this table and took the change on 2026-09-07; it shipped the same evening. **Nobody has
read it on the device yet.**

**Search.** Right note in the top three, on questions nobody tuned against: still reads **84 in 100** —
but that count was taken before this wave put a floor under the search, and has not been taken again
since. It is owed, not confirmed.

**Troubleshooting.** Of 24 plainly-worded problem sentences written by someone who had not seen the
rules, 6 reached the tips before this wave's tip rewrite and 8 after. The tips themselves are much deeper
now — crash went from 2 to 9, sound 1 to 8, picture 1 to 8, performance 2 to 10, controller 6 to 10.
**Since then, both the tip search and the note search gained a floor**, so each can say "none of these
fit" when its best match is too weak to trust, rather than attaching something wrong.

**The Deck.** The note search has kept getting slower since August — the same three questions took 793 to
900 milliseconds in August and 1.1 to 1.2 seconds in early September, about thirty per cent slower — and
that drift over the weeks is still not explained. A written budget of one second now exists with a check,
but the check itself was found this wave to give a false all-clear: it reads 23 to 38 thousandths of a
second when it never has to write an answer, while a real question takes over a second for that same step.
A fix is in progress. **Tested and confirmed 2026-09-12:** the chat model and the meaning-search model were
competing for memory on the Deck. The Deck can only hold one model at a time, so answering a question pushed
the meaning-search model out and the next search paid to load it back in — 732 milliseconds, against 24 when
nothing had evicted it. Raising the limit to two, tried on a spare copy of the setting that never touched
the maintainer's own, kept both models loaded and brought that search back down to 24. This explains the
per-question wait, not the drift over weeks — a constant per-question reload does not by itself explain
readings getting slower over time, so that part is still open, along with whether two models loaded together
is fine with a heavy game running.

**The library.** 293 notes over 25 games, 156 shared Deck tips, **every one of them indexed** — the build
now refuses to finish if any note or tip is missing its meaning index, where it used to only print a
warning. Library version `2026.09.08` — the same 293 notes and 156 tips, plus a corrected Black Mesa
note. 1.39 MB to download. Schema stays at 3, so nothing already installed goes stale.

## 4. What is open right now

**Bugs.**

- ★★★ **Raw computer text can appear in a reply — REOPENED 7 September; the fix built does not cover the
  case that started this.** In Speed mode with a game running and the character voice on, a reply could end
  with a raw line of settings-looking text. The cleanup deliberately leaves anything inside a code box
  alone, but the plugin's own instructions tell the model to put that exact block inside a code box — so
  the one case that needed catching is the one the fix cannot touch.
- ★★ **Unrelated questions still get game cards.** Accepted 27 August; not being worked.
- ★★★ **The panel only learns which game is running when it starts, and never again — cause found 7
  September.** Checked on the Deck and the earlier fix does not hold: exiting a game left the old name
  under the question box for minutes, through closing and reopening the panel. The opposite also happens —
  launching a game with the panel already open went unnoticed for 48 seconds. A plugin restart fixes both
  at once, which is what says the panel reads this only once, at start-up, and never listens for a change.
- ★★★ **The note search has got about thirty per cent slower since August, and the check meant to catch it
  gives a false all-clear.** The same three questions took 793 to 900 milliseconds in August and 1.1 to 1.2
  seconds in early September; the drift over those weeks is still not explained. A written one-second budget
  now exists with a check, but the check itself reads 23 to 38 thousandths of a second, because it never has
  to write an answer, while a real question takes over a second for that same step and would fail the
  budget. A fix is in progress. **Tested 2026-09-12: the chat model and the meaning-search model were
  competing for memory**, because the Deck can only hold one model at a time — answering a question pushed
  the meaning-search model out, and the next search paid 732 thousandths of a second to load it back, against
  24 when nothing had evicted it. Raising the limit to two kept both models loaded and brought that cost back
  to 24. That explains the per-question wait, but not the drift over weeks, and not whether it is fine with a
  game running — both still open.
- ★★★ **Follow-ups remember, step one: the search half works on the device, the answer half does not.**
  Asking about a boss, then a bare "what about the second phase," now looks up the right boss first on the
  device, exactly as built. But the reply named a different boss, because a better-matching wrong note was
  still attached one place below the right one. Ranking the right note first is not enough on its own. A
  call is waiting for the maintainer on how to finish this.
- ★★ **Four questions still get notes about the wrong subject.** Asking Black Mesa how to tame a horse,
  Portal 2 where to buy a house, and about a Hades boss that does not exist all still attach a note.
  Catching these would cost twenty or more correct answers elsewhere in the library, so it is left as is.
  Three of the four now carry a line saying the match was thin.

**Settled, no longer open.**

- **An answer said the opposite of its own note and the check waved it through — FIXED 7 September.** The
  check now reads claims one sentence at a time and treats a word like "too" as a negative the same way
  "not" is.
- **The answer test marked a fact missing when the answer said it in different words — FIXED 7
  September.** Answers that mean the same thing now count as right.
- **The search test had been measuring a stale copy of the library — FIXED 7 September.** It now rebuilds
  its own copy whenever the notes are newer, and refuses to run at all on a stale copy it cannot rebuild.
- **Game notes thrown away on a long question** — fixed and confirmed on the device.
- **Speed mode paying for the slow search** — confirmed fixed on the device.
- **The shipping blend losing to its meaning half** — measured, and held. Numbers are in section 5b and the
  decisions file.
- **A symptom-only troubleshooting question reaching no tips** — held; rewriting the tips was the real job.
  Both the tip search and the note search have since gained a floor so each can say "none of these fit"
  rather than attaching something wrong.
- **The ring can land half hidden behind the Copy or Retry icon — ACCEPTED 7 September.** The only fix is a
  taller question bubble, which costs 18 pixels on every short question. The maintainer looked at that
  trade and chose to leave it as it is.

**Owed on the Deck.**

- ★★★★ **Wave two's own evening — ran 7 September.** Rows **W2-R1** through **W2-R7** in
  [plan 47](47-kb-wave-two-session.md) § 8: installing the release, the twelve new games and the filled
  gaps passed, the troubleshooting tips half-passed (one of eight got the wrong tip), the "not in my notes"
  line failed outright (it had no way to fire), and the two bug fixes both failed on a closer look. **R8**,
  the five optional August rows, was skipped.
- ★★★★ **Wave three's own evening — partly ran 7 September.** Installing the point release and the
  corrected Black Mesa note both passed. Follow-ups remembering half-passed (see Bugs above) and the new
  speed check failed (see Bugs above). Three rows never ran at all: the "no tip for this" line, both
  searches saying "none of these fit," and the "no close match in my notes" line.
- ★★ **The new answer shape needs its first read on the device.** Nobody has heard how the tactics-first
  reply sounds on the Deck yet; see section 3.
- ★★★★ **One question per new game on the device — ran 7 September, search half only.** All twelve
  attached notes about the right game. Fallout: New Vegas still is not installed, so it was asked about by
  name only, which the row allows.
- ★ Five older checks from the August retrieval rework, never run on the device. Worth one evening with
  pinned test chips, or worth closing.
- ★★★ One glossary word, tapped rather than reached with the D-pad.
- ★★★ The download Cancel button, which cannot be checked at all: the download finishes in about a second,
  so there is no window to press it in.
- ★★★ Which way a too-long chip label is cut off. Behind the preset-row work.

**Your calls.** Four were decided on 7 September while wave two was planned (D85): fill the 21 real
note gaps and top up the four thinnest games, keeping the eight deliberate blanks as a control; the "not in
my notes" line reads *"Not in my notes — this answer is from the model's own knowledge."*; the meaning-index
work ships the guarantee and only measures the tie-break; and the ring bug is fixed by the session running
the wave rather than a helper. Four were decided on 6 September: the symptom-only search is held and
rewriting the tips is the real job; leaning the search toward meaning is held until every note is guaranteed
to have its meaning index built; the twelve new games ship with their coverage gap known and accepted; and
about a second to search on the Deck is fine. On 7 September, planning wave three (D86): the Black Mesa
water note, the answer test's scoring, the search test's stale-copy rebuild, the "no tip fits" line, the
held symptom search, and follow-ups remembering were all decided — see the roadmap's "Calls waiting on
you" for the full list. Also on 7 September: tactics-first was taken, on the numbers in section 3.

**Two calls were answered this wave.** The Black Mesa water note was confirmed wrong from the maintainer's
own account of the game, rewritten, and shipped in the `2026.09.08` release — checked on the Deck and
correct. The ring half hidden behind the Copy or Retry icon was looked at and left as it is (see Settled
above). **One new call is open:** how to finish follow-ups remembering, now that the search half works on
the device but the reply can still name the wrong boss when a better-matching wrong note is still
attached. It is being written up for the maintainer.

## 5. Next phases: what each buys, and what it costs

Effort is in focused working days for one session with your calls already in hand, plus the star
scale the roadmap uses. "Buys" is what a person using the plugin would notice, with the evidence
behind the claim where there is any.

### 5a. Finish the answer-quality plan agreed on 1 September (about two to three weeks in total)

| Item (with its stars) | What it buys | Evidence | Cost | In the way |
|---|---|---|---|---|
| ★★ **Fix the two ways the answer test lies** — done 7 September | Every answer number this project has quoted rests on a check that missed a real contradiction and a check that undercounts facts kept; nothing else should be decided from those numbers until this is done | Both found 7 September while taking this wave's own measurements, see the bugs list above | Cheap | Done, see the roadmap's Done list |
| ★★★★ **Make the search test rebuild its own copy of the library** — done 7 September | No search number can be trusted for a decision, including the ones the held weight decision rests on, until the test stops silently reusing a stale copy | Found 7 September: the copy was from 31 August with 161 notes, so every question about the twelve new games scored zero regardless of the real library | Cheap | Done, see the roadmap's Done list |
| ★★ **Prompt diet** — **SHIPPED 6 September** | The small model reads nine tokens of instruction for every token of knowledge; fewer rules means better rule-following and ~340 tokens back in a 4k window. Expect a few points on facts kept and a slightly faster first token | The citation instruction was obeyed once in 89 asks and the UI cannot render it | Done | None. Instructions fell from 6,930 to 5,682 characters; moving the notes next to the question was measured and rejected, because it placed the spoiler warning correctly far less often |
| ★★ **"Not in my notes" line** when a game question matches nothing — **SHIPPED 7 September, Deck check owed (row W2-R5)** | A person can tell an answer from the notes from one out of the model's memory. Does not change the answer; changes trust | Your own May note of a confident, wrong, tidy reply with no notes | Done | None. Wording: *"Not in my notes — this answer is from the model's own knowledge."* Confirming it works the same on the Deck is the only thing left |
| ★★★ **Spoiler tiers setting** — strict / default / open | A strict player stops seeing boss tactics; an open player stops seeing fences at all. Today one rule fits everyone | The tiers are confirmed; the fence fix showed prompt wording moves the misfire rate 24 points | 3 days: settings plumbing (~18 files), a prompt per tier measured on the answer test, a control with a focus entry, Deck QA | Nothing, once the bug session releases the prompt file |
| ★★★ **Follow-ups remember** | "What about the second phase?" gets an answer about the boss you were just asking about. Today the model receives only the newest message and the follow-up searches nothing | Agreed 1 Sep: carry the previous turn's named thing into the search first; chat history later, trimmed to the window | 1 day for the carry-over; 2 more for history within the budget | The 4k window: a Strategy reply can be 900 tokens |
| ★★★ **A troubleshooting question mostly never reaches the tips** — **routing widened and tips rewritten 7 September, still short** | *"My game keeps crashing"* now gets crash advice where before it got nothing. Of 24 fresh problem sentences written blind, 6 reached the tips before this wave and 8 after | Measured 7 September: crash tips went from 2 to 9, controller 6 to 10, and similar gains elsewhere. But the rules still match the exact wording someone imagined rather than the idea behind it | Done for this wave; the rest is unscoped | **What's missing is a way for the search to say "none of these tips fit."** The held meaning-search branch was re-measured on the new tips and stays held: with nothing running it reaches all 24 sentences, but what it attaches is often the wrong tip — the same objection that held it before |
| ★★ **Eval tooling** — weight sweep on the tuning set, per-case output for the shipping blend, rows that may list a second right answer | Nothing a user sees. It is what unblocks the weights decision and stops every card batch reading as a regression | **Shipped 6 September, and the sweep has now been run** — see section 3. No question uses the second-answer option yet | Done | None |
| ★★★ **"Starting out" card kind**, then the Cyberpunk / Fallout / Red Dead orientation cards | A new player gets a "how do I get started" chip and a matching answer; today those three cards read as "What should I know about Choosing a build?" | Your gap-sheet asks on 29 Aug | 1–2 days plus a corpus rebuild and release | Your call on the kind |
| ★★★ **Card style pass** — rewrite the 139 prose cards as labelled short lines | Possibly better fact retention by the 2B model. Facts kept is already 92%, so the ceiling is low; do it only if the answer test says the labelled shape scores better | The six labelled cards kept content accurate 6 of 6 on the Deck, but the labels themselves survived 1 of 6 | 2–3 days of content, a rebuild and a release | Measure first |

### 5b. ★★★★ The retrieval decision (one day of work, then your call)

The four stars are the risk of changing what every question goes through, not the size of the change
itself — the change is one line, and the tooling it needs is the ★★ eval row above.

**Done on 6 September, and the answer was not the one expected.** The sweep ran, the winning balance was
confirmed on the held-back questions, and it was still reverted — it buries a newly added note until its
meaning index is built, it lets the meaning search push aside a note that exactly matches the words
someone typed, and it breaks one case of a locked decision. Numbers and the full reasoning are in section
3 and in the decisions file.

**What would unlock it — and read this carefully, because it is easy to get wrong.** Guaranteeing every note
has its meaning index answers **one of the three objections**, not all three. The other two — a note whose
words exactly match being pushed aside, and one case of the locked topic-preference decision — are untouched
by that trigger. So the guarantee on its own does not deliver the four-to-six points; it removes one blocker
of three.

**The route that could deliver them** is the follow-up the decision itself recommends: leave the balance
alone and change only the tie-break, so meaning wins where there is no strong word match. That targets the
same gap without touching any of the three rules. Wave two ships the guarantee — worth having on its own,
because the corpus build has three separate ways to put unindexed notes on a device and only warns — and
**measures** the tie-break, so the next call comes with numbers rather than a hope. (D85)

### 5c. Corpus phases

| Phase (with its stars) | What it buys | Cost | In the way |
|---|---|---|---|
| ★★★★ **Phase 4 track 3 — per-game Deck tips** | Troubleshooting a covered game gets that game's own quirks (launch options, a known-broken layout) instead of generic tips. Content for seven titles is collected; two verified quirks are from your own Deck | 2–3 days: a schema bump, the builder, ten or so tips, an eval label, a release, a Deck reinstall | The schema bump makes every installed corpus stale until re-downloaded; bundle it with the next release |
| ★★★★ **Phase 5 — entity depth, now across 25 titles** | "How do I deal with X" works for more of the library; chips get variety (a game with only mechanic cards offers one flavour of chip). More cards is also the data the weights decision wants | 3–5 days of content for 40–60 cards, in tranches with a quality read from you after the first; chip vector ranking (the second half of Phase 5) 2–3 days | Whoever writes a card cannot write its blind test question, so authoring and eval rows go in different sessions; every batch lowers "first place" a little until second-answer rows exist |
| ★★★★ **Phase 7 — infrastructure** | Mostly nothing at 266 cards. Three pieces do matter now: **pulling the embedding model as part of installing the library** (a person without it silently gets word search only and loses the whole meaning search; a button and a hint exist, it is not part of the flow); **thumbs-down demote** (a wrong card stops coming back); **packs** (needed before a large catalog). An approximate-nearest-neighbour index buys nothing until the corpus is thousands of cards | Embed pull 1–2 days; demote 3 days; packs 5+ days; index 2–3 days; vision-to-cards a 1–2 day spike first | None for the first two |
| ★★★★ **Online / versus content** | Multiplayer questions (roles, callouts, co-op) get cards; today they get nothing specific | 2–3 weeks: new card kinds, a spoiler table update, Left 4 Dead 2 versus cards, then Counter-Strike 2, from archive dumps only | Source policy and licensing per card; a rebuild |
| ★★★★★ **Community tip contribution** | A reader can turn a good reply into a proposed card with one press | 3–5 days | Unblocked since the public publish |
| ★★★ **Visual maps** | A boss outline with weak points marked, or a dungeon map, in the reply | Research first; weeks | What a map is made of is undecided; authoring sits behind the source policy |
| ★★★★★★ **Phase 8 — catalog corpus** | The thing that changes the product: most people's games get notes instead of the model's memory. Top 1000 Steam, top 100 Deck, an emulated slice | Months. It cannot be hand-written (161 cards took six weeks by hand). Needs an ingestion pipeline from wiki dumps, per-source licensing, a size budget (the docs mention ~5 GB), packs, and the index above | Everything above it, and a source policy |

### 5d. What is near the ceiling, and what is not

The checks that exist on the answer side are close to their ceiling (facts 92%, menu 98%, card
attached 100%). Those checks are shallow: term overlap, a must-not-say list, a fence, a menu. Nothing
measures whether the answer was actually helpful, whether the model's own knowledge was right when no
card matched, or how the character voice changes the answer. Five Deck runs with a voice on lost two
facts to the voice. So the honest reading is: the pipeline delivers the cards and the model keeps
them straight; what remains is coverage, follow-up memory, and the things the test cannot see yet.

## 6. What is blocking, in one list

1. **Wave four now waits on [58 phase 1](58-phase-1-notes-shown-and-wiki-extracts.md).** Two fixes have
   to land first: showing a note's own words under a reply instead of the model's rewrite of it, and
   reading a wiki's own sentences into notes with no AI rewrite. Both phases are waiting on the
   maintainer's answers before either can start. Started 2026-09-17: the drawings, the blind questions
   and the source study have landed; the reader is still being built; the Deck is asleep, so the device
   readings wait on the maintainer.
2. **Wave three's own Deck evening is unfinished.** Three of its checks never ran, and two that did need
   redoing: follow-up questions now look up the right boss but the reply can still name a different one,
   and the new one-second speed check reports a healthy device while a real question runs over budget.
   Nothing about either is decided until this is done. A call is waiting for the maintainer on how to
   finish the follow-up half. The per-question wait itself is now explained (section 3) — the Deck can
   only hold one model at a time — but why the note search has kept getting slower since August, week
   over week, is still unexplained.
3. **Fallout: New Vegas is owned but not installed on the Deck**, so its cards cannot be judged in place
   until it is. That is the only thing blocking the last wave-one device row.
4. **The "no new titles" rule** for Phase 5 is reopened for one tranche only; the catalog stays its own
   phase.
5. **Any schema change is a release that stales every installed corpus.** Per-game tips, a new card
   kind and the style pass all want a rebuild; they should ride one release.
6. **Card authors cannot write blind eval questions.** Content sessions and eval sessions must be
   separate people or separate sessions.
7. **The model and the window.** A 2B model with 4,096 tokens: every extra instruction, card or turn
   of history competes for the same space. Raising the window is an experiment nobody has run.
8. **Coverage and sourcing.** Twenty-five titles, and new content must come from a cleared wiki with
   per-card credit. There is no ingestion pipeline. Nothing in the library was written by a person:
   194 notes are an AI helper's rewrite of a wiki page, 99 notes and all 159 tips are an AI's own
   memory with no page behind them, and the maintainer checked them (counted 2026-09-17).

## 7. Added to the roadmap on 2026-09-05

None of these had a roadmap line before this report. Each is either an agreed decision with no line to
track it, or a gap this read turned up. All of them now sit in the roadmap's knowledge-base section,
carrying the same stars they carry here.

1. ★★–★★★ **Rows for the agreed answer-quality items** that have no roadmap line: the prompt diet, the
   "not in my notes" line, follow-ups remembering, the eval tooling, and the card style pass. All
   five were decided on 1 September and live only in the plan's checklist.
2. ★★ **Pull the embedding model as part of installing the library.** Promote it out of the Phase 7
   umbrella. A person who installs the library but not the embedding model gets word search only,
   which is the weaker half by every measurement, and nothing tells them beyond a one-time hint.
3. ★ **Measure with the character voice on.** The Deck answers in a voice; the answer test runs with
   it off, and the five Deck runs lost two facts to the voice. One switch on the test, then the voice
   presets become measurable like the prompt is.
4. ★★ **A measured context-window experiment.** Raising the window to 8,192 as a Developer experiment
   with a game running, recording memory and time to first token. Agreed as "later, its own call" and
   then never written down.
5. ★★★★ **A bridge between Phase 5 and Phase 8: a first tranche of new titles.** Five to ten games you
   choose. It serves users and it is the data the weights decision is waiting for. Needs the "no new
   titles" rule reopened.
6. ★★★ **One release row for everything that needs a rebuild:** per-game tips, the starting-out kind,
   the style pass. Today they are three separate entries each carrying the same release cost.
7. ★ **Close or retire the five August QA rows** never run on the Deck. Either they are worth one
   evening with pinned chips, or they are superseded by the rows that passed this week.
8. ★★ **A latency budget for a game question.** The slowdown found last night only had a band to fail
   against because one QA row happened to record it. A written budget (embed time plus first token
   with a game running) turns the next regression into a failed check instead of a lucky catch.
9. ★★★ **Deeper answer checks, when there is time:** a small set of questions where the right answer is
   not on any card, scored for "did the model admit it did not know", and a helpfulness read by a
   person on ten replies a month. The current checks cannot see either.

---

## Sources

- [roadmap.md](../roadmap.md) — the Bugs, Verify, Features and Done lanes tagged `[KB]`
- [knowledge-base.md](../knowledge-base.md) — architecture, phase locks, the recall pass
- [30-kb-answer-quality-plan.md](30-kb-answer-quality-plan.md) — the answer-quality plan and its checklist
- [28-phase5-corpus-depth.md](28-phase5-corpus-depth.md), [18-phase4-track3-per-game-compat-tips.md](18-phase4-track3-per-game-compat-tips.md), [17-kb-online-versus-strategy-content.md](17-kb-online-versus-strategy-content.md)
- [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md) — D27, D38, D40b, D41, D45–D54, D65–D69
- [kb-embed-bakeoff-2026-09-06-arms.md](../archive/research/kb-embed-bakeoff-2026-09-06-arms.md) — latest search numbers, on all 266 cards
- [kb-answer-eval-2026-09-06-before-wave1.md](../archive/research/kb-answer-eval-2026-09-06-before-wave1.md) and [kb-answer-eval-2026-09-06-after-wave1-landed.md](../archive/research/kb-answer-eval-2026-09-06-after-wave1-landed.md) — answer numbers either side of the prompt work
- [46-kb-wave-one-session.md](../archive/46-kb-wave-one-session.md) — the wave that produced everything dated 6 September, with its progress log
- [47-kb-wave-two-session.md](47-kb-wave-two-session.md) — wave two, landed: the 27 gap-filling notes, the troubleshooting path widened, two bugs fixed, the index guarantee shipped, the "not in my notes" line, and the `2026.09.07` release
- `runs/plan46-*.json` — the device evidence behind the 6 September Deck readings
- [34-feature-verification-round.md](34-feature-verification-round.md), [35-bugfix-session.md](35-bugfix-session.md), [36-feature-session.md](../archive/36-feature-session.md) — this week's Deck findings and who owns which files
- `data/kb/strategy_seed.json`, `tests/fixtures/kb_eval_v2.json`, `tests/fixtures/kb_answer_eval.json` — counted directly
