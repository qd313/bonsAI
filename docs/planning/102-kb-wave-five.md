# 102 — The knowledge base, wave five: the open bugs, deeper answer checks, two measurements that decide old questions, and enemy and item notes for the thin games, with the Deck alongside

Written 2026-11-02 by the session on the maintainer's PC (Fable 5.1, the maintainer's choice; the routing table would
put Opus 5.5 extra-high here). Sources: the knowledge-base roadmap and its long notes at tip `84e0e64c`, plan 100 and
its report, plan 101's lane list, the lessons file, the bug-wave runbook, and four read-only code lookups by Haiku
helpers, each re-read against the code before a brief was written (§ 8 lists what they corrected). Plain language on
purpose: this file is for the maintainer first.

**Status: READY for "go".** The calls in § 2 are open; "go" alone takes every default. The helper rules and the briefs
are written (the files below). Nothing started; nothing on the Deck touched; the Deck reads unreachable from this PC
right now (§ 4).

**Who runs it:** this chat (Fable 5.1) orchestrates and lands. **Sonnet 5.5 high** lanes build everything that needs a
judgment and write the notes; **Sonnet 5.5 medium** writes the test questions, runs the long measurements and does the
bookkeeping; **Haiku 5.5 high** (on trial, logged in plan 33 § 4d) does the two one-star mechanical fixes; **Opus 5.5
extra-high** fixes the one focus bug, with the Deck measurement from plan 98 in hand and the advisor's read before it
lands. The `deck-driver` (Sonnet 5.5 medium) runs the Deck blocks through the controller rig once the Deck is on; the
`bookkeeper` files every roadmap, testing and changelog change and audits the knowledge-base roadmap before the first
lane starts and after the last one lands. A lane that fails on the Deck twice moves up one tier without asking. The
`advisor` (Fable 5.1 high) is asked at most four times, each logged (§ 7). Never alongside another chat driving the Deck.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1 to 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [docs/roadmap-kb.md](../roadmap-kb.md) and
[its long notes](../roadmap-kb-details.md); [plan 100](100-kb-finish-the-partial-phases.md) §§ 5, 6, 12 and 13 (the
last knowledge-base wave; its briefs and runbooks are the shape copied here).

**Files for this plan (written 2026-11-02):** the helper rules [assets/102-helper-rules.md](assets/102-helper-rules.md)
(plan 100's rules with this wave's changes marked "new"), the briefs [assets/102-lane-briefs.md](assets/102-lane-briefs.md)
(one per lane, with the file and line facts from the lookups), the Deck runbooks `assets/102-runbook-block-R<n>.md`
(written by the session once the Deck's state is read). Evidence files: `plan102-<ROW>.json` in the workshop's
`test-evidence` folder. Handovers: `assets/102-handover-<block>.md`.

---

## 1. One sentence

Fix the four open knowledge-base bugs whose cause is known (a focus trap after Undo, the Sims 4 fire note that
contradicts its neighbour, the test script that writes a report it was told not to, and the picture question that
ignores the running game), build the deeper answer checks the roadmap has carried since September, take the two
measurements that decide two old questions (does the labelled card shape read better; are the new notes crowding the
old ones or is the test stale), give the eight thinnest games enemy and item notes with blind questions written by
someone else, write the missing "can't find my PC" tip and thirty questions that only the meaning search can answer,
and run every owed knowledge-base Deck check the rig can reach, with the roadmap audited before go, current at every
step, and audited again at the end.

## 2. The maintainer's calls (open; "go" takes every default)

Each with the recommendation and the default in brackets. The answers become decision **D139** (D138 is reserved by
plan 101's asset file), written by the bookkeeper in its pre-go audit.

1. **Scope.** In: the Undo focus trap (C), the Sims 4 fire note (B), the test script's report flag (A), the picture
   question's shape and the picture-model sweep (D), the crowding read (E), the deeper answer checks (F), the card-style
   measurement (G), the "can't find my PC" tip (H), the meaning-only questions (I), enemy and item notes for eight thin
   games with their blind questions (N5 to N12, Q2), the before-and-after measurements (X2), and every owed
   knowledge-base Deck row the rig can reach. Out: the online and versus content (plan 17, two to three weeks), the
   marked-screenshot visual map (its picture set has no boss in it yet), the catalog phase, growing the screenshot set
   (your hand in a game). *Recommendation: as listed. Default: as listed.*
2. **The eight thin games' notes.** Ten to fifteen enemy and item notes each, in the labelled short-line shape, for
   Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario: The Thousand-Year Door, Pikmin 2, Doom 64,
   Donkey Kong 64 and Mario Kart 64 (today each has no enemy note and one item note at most; § 8 has the count). Every
   sentence from a page the fetcher read, with its licence printed, from the wiki each game's notes already cite.
   Whoever writes a note never writes its test question (Q2). *Recommendation: all eight lanes at once; nothing lands
   until you have read one game's notes in the chat (plan 100's rule). If you are away when the first lane finishes,
   the session reads them itself with the FOSS reviewer, lands them, and a Verify entry is owed to your eye, as
   Baldur's Gate 3's was. Default: that.*
3. **Four questions the numbers already answered.** Hide more against Default (20.6 against 23.8 covers in a hundred,
   twice, no story cover missed); Hide less (94.4 in a hundred clean on the second run); the made-up question's three
   weak notes (a floor loses more right notes than it clears; the "No close match" line already shows); and the
   category card that outranks the cards inside it (3 in 279 questions, one of them a real case). *Recommendation:
   close all four as measured; the bookkeeper writes each closing with its numbers. Default: close all four.*
4. **The "If you want to cheat" section** (one sighting; 0 in 2 route questions since). *Recommendation: close it as a
   watched sighting (the shelved file). Default: close.*
5. **The picture sentence in the prompt** (landed 2026-10-25; measured no gain; costs every picture turn). Lane D tries
   two other shapes and the four picture models the Deck offers, measured by the scoring script. *Recommendation: lane D
   lands the shape that wins in both of its runs, or, if none wins, recommends in the report whether the sentence stays;
   you confirm. Default: that.*
6. **The "can't find my PC" tip.** None exists (tips 110 and 111 are Steam Frame tips), so two of the 24 plain problem
   sentences still reach nothing. Lane T drafted one in plan 100's report. *Recommendation: write it, marked
   "Researched, unconfirmed", with the router's word pairs and the two fixture rows labelled (lane H). Default: yes.*
7. **The "Needs" clause** on route steps (two Deck tries, no step carried one). *Recommendation: keep it and give it one
   prepared try on the Deck (a branch button first, a route whose steps need an ability); if no step carries a "Needs"
   line again, the clause is dropped in lane M that night. Default: that.*
8. **Models**, as listed above, with one note: Fable orchestrates at your choice; the routing table puts Opus
   extra-high here and Fable only where five- and six-star scope is planned. This wave has none above four stars.
   *Default: as listed.*
9. **The Deck before go.** It reads unreachable from this PC right now (asleep or off the network). On: the Deck on and
   on the home network; Doom 64: Retribution started by hand once and left on Recent Games (the hidden-box row has been
   blocked six times); the Deck's own AI installed; the rig's stop switch armed (it is); the test chat still there.
   *Default: you do these; the session reads the Deck's state at go and runs what it can. The helpers never wait for
   the Deck.*
10. **Push and publish at the end.** The hook refuses a push unless you allow it for the session; the library publish is
    refused from a chat. The night ends with a new library build on this PC (the Sims fix, the eight games' notes),
    ready for your publish after your reads. *Default: nothing pushed or published.*
11. **Budget lines and usage at go:** no new helper past 75 percent of the five-hour window or 90 percent of the week
    (D128). Read now: 4 percent of the five-hour window and 3 percent of the week (resets Wednesday 13:00 UTC). *Default:
    kept; the counters read before every batch.*
12. **Standing rules while you are away** (plan 100's): a fix that fails on the Deck twice moves up one tier; a new one-
    or two-star bug with a known cause gets one helper round of about an hour; anything blocked gets the safest choice
    at once and is raised in the chat and in § 12; never push, publish, merge to main, switch branches in the shared
    folder, type a PIN or password, reload the plugin with a game running. *Default: kept.*
13. **The monthly read by a person** that the deeper answer checks call for. *Recommendation: the answer test gains a
    switch that writes ten replies (question, notes attached, reply) to a workshop file for your read; the first file is
    written tonight. Default: yes.*
14. **Plan 101's research lane** (the mod-knowledge sources and their licences; read-only; needs the web; nothing in the
    repo). It is the first step of the ★★★ mod-knowledge entry in the knowledge-base roadmap and runs on its own.
    *Recommendation: run it as lane J tonight. Default: yes.*

## 3. What a player notices after this session

Once the build reaches their Deck (and, for the notes, once you publish the library); every line reads "should"
until its Deck row passes:

- **Undo under an answer no longer freezes the D-pad.** With a game running, pressing Undo on a thumbs-down and then
  Down keeps moving the ring; today the panel can lose the window's focus there and Down goes dead until Quick Access
  is closed and reopened.
- **The Sims 4 fire answer stops contradicting itself.** The older note said there are no firefighters; the newer one
  says a smoke alarm brings them. Both will say the same thing.
- **"I can't find my PC" reaches a tip** that says to put both on the same home network and open the port.
- **A screenshot question names the running game**, if one of lane D's shapes beats today's (today the AI names another
  game about half the time even when told which game is running).
- **Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario: The Thousand-Year Door, Pikmin 2, Doom 64,
  Donkey Kong 64 and Mario Kart 64 get enemy and item notes**, so "how do I deal with X" has a note to stand on for
  those games too, and their chips get variety.
- **Behind the scenes:** the answer test can now tell whether the AI admits it does not know, the search test can tell
  whether the meaning search rescues questions the word search misses, and two old "measure first" questions (the
  labelled card shape; the crowding) have numbers.

**How much better shape the knowledge base is in afterwards.** Counted from the roadmap at tip `84e0e64c`:

| | Today | After, if everything lands and passes |
|---|---|---|
| Open knowledge-base bugs (not accepted) | 11 (4 of them "the maintainer decides") | 2 to 4 (the picture question and the crowding entry may stay, on the numbers) |
| Calls waiting on you | 6 | 1 or 2 (the Baldur's Gate 3 read; the new notes' read) |
| Half-done entries | 3 (Phase 5, the screenshot measurement, the visual maps) | 3, each with a step closed (Phase 5's eight games, the model sweep, nothing on the maps) |
| Measurements the roadmap owes | 2 (card style; deeper checks) | 0 |
| Games with enemy and item notes in the labelled shape | 7 of 38 | 15 of 38 |
| Deck checks owed on knowledge-base rows | 3 (the Needs line, Hide more on screen, the hidden box) | 0 to 2 (the hidden box needs your Doom 64 launch) |

## 4. Before go

**The maintainer, about ten minutes:**

1. Answer the calls in § 2, or say "go" for the defaults.
2. **The Deck** (call 9): on and on the network, Doom 64 launched by hand once, the Deck's AI installed, the test chat
   there. The session will say what it reads.
3. **This PC:** Ollama is running with the embedding model and the Deck's answering model (read at 2026-11-02: both
   present, plus qwen3.5:4b, llava:7b and gemma4:e4b-it-qat for lane D's sweep). The library build and every
   measurement use it.

**The session's first acts, in this order:**

1. `git status` (other chats' uncommitted files are theirs), the tip hash, the tail of the decisions file (D139 free),
   `deck_status`. Usage counters said in the chat.
2. The baseline: `python scripts/verify.py --full` on the tip, once, in the shared checkout, in the background.
3. Build the library once on the PC (`python scripts/kb/build_rag_db.py --seed --out build/knowledge-base`, every
   meaning vector) and copy it into every lane's copy at `build/knowledge-base`.
4. Cut the wave 1 copies (`python scripts/worktree.py create p102-<lane> --base experimental`), confirm each sits at the
   tip, and start the wave 1 helpers two to three minutes apart (§ 5), each with the rules file plus its brief, the tip
   hash and its copy's path. The bookkeeper's pre-go audit (K0) starts first and lands first. **A ready helper starts
   at once; holding one back is the maintainer's choice alone.**
5. Deck block R0 with a fresh driver at the same time, if the Deck answers (§ 6). The Deck never waits for the helpers.
6. Advisor consult 1 (§ 7) while wave 1 builds.

## 5. The work: what can run in parallel, and what cannot

**The rule for parallel lanes is files, not features.** Two lanes never own the same file. Everything not named as a
wait runs at the same time. At most fifteen helpers at once, started a few minutes apart; each runs only its own tests
at two workers; the full checks run once per landing, in the shared checkout.

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| K0 | The bookkeeper's pre-go audit (§ 5k) | ★ docs | Sonnet 5.5 medium | `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md`, `docs/roadmap-shelved.md`, the knowledge-base rows of `docs/testing.md`, the decisions file | nothing; lands first |
| A | The search-test script honours its no-report flag for the JSON file too (§ 5a) | ★ `[KB]` `[QA]` | Haiku 5.5 high (trial) | `scripts/kb/eval_kb_embed_models.py`, one new test | nothing |
| B | The Sims 4 "Fires" note agrees with the wiki and cites it (§ 5b) | ★ `[KB]` | Haiku 5.5 high (trial) | section 112 of `data/kb/strategy_seed.json` | nothing |
| C | After Undo the panel wins the window's focus back, so Down keeps working (§ 5c) | ★★ `[KB]` focus | Opus 5.5 extra-high; the advisor reads before landing | `src/features/answer/reply-actions/kbDemoteRows.tsx`, `buildReplyActionsElement.tsx` (the Down out of the rows), `src/shared/dpad/replyStopRegistry.ts` if the evidence points there, tests | nothing |
| D | The picture question's shape and the picture-model sweep (§ 5d) | ★★ `[KB]` `[QA]` and step 2 of the ★★★★ measurement | Sonnet 5.5 high | `py_modules/backend/ask/ollama_ask_service.py` (the user message), `py_modules/backend/prompts/ollama_prompts.py` (this lane alone), `scripts/kb/eval_screenshot_reading.py`, their tests | nothing |
| E | The crowding read: the six questions that lost their facts and the five that lost their note, read and diagnosed (§ 5e) | ★★ `[KB]` | Sonnet 5.5 high (a read with a judgment; commits nothing) | nothing in the repo; a report and a proposed fixture patch in the workshop | nothing |
| F | Deeper answer checks: questions no note can answer, scored for an honest "I don't know", plus the ten-reply sample for a person (§ 5f) | ★★★ `[KB]` | Sonnet 5.5 high | `scripts/kb/eval_kb_answers.py`, new cases in `tests/fixtures/kb_answer_eval.json`, `tests/test_eval_kb_answers.py` | nothing |
| G | The card-style measurement: fifteen prose cards rewritten in the labelled shape in a scratch library, the answer test both ways (§ 5g) | ★★★ `[KB]` | Sonnet 5.5 high (commits nothing) | nothing in the repo; the rewrites as a patch and the numbers in the workshop | nothing |
| H | The "can't find my PC" tip, the router's word pairs, the two fixture rows labelled (§ 5h) | ★ `[KB]` | Sonnet 5.5 medium | `data/kb/compat_patterns.json`, `py_modules/backend/knowledge/compat_topic_router.py`, rows `V2-W2-SYM-19` and `-20` of `tests/fixtures/kb_eval_v2.json`, their tests | nothing; lands before I is cut |
| I | Thirty questions only the meaning search can answer (§ 5i) | ★★ `[KB]` | Sonnet 5.5 medium | new rows in `tests/fixtures/kb_eval_v2.json` | H landed (same file) |
| J | Plan 101's research lane: the mod-knowledge sources and their licences (call 14) | ★★ `[KB]` | Sonnet 5.5 high (read-only; the web) | nothing in the repo; a report in the workshop | nothing |
| N5 to N12 | Enemy and item notes for the eight thin games (§ 5n, call 2) | ★★★★ `[KB]` | Sonnet 5.5 high | one new file each under `data/kb/notes/`, with a sources sidecar | nothing to write; nothing lands before the quality read |
| Q2 | Blind search questions for the new notes, from the names only (§ 5q) | ★★ `[KB]` | Sonnet 5.5 medium | new rows in `tests/fixtures/kb_eval_v2.json` | I landed (same file); the names from N5 to N12 |
| X2 | The measurements, before and after, on this PC (§ 5x) | ★★ `[KB]` | Sonnet 5.5 medium (a long job of one checkable kind) | nothing in the repo; report files to the workshop | the library build; its second half waits for the landings |
| M | Bugs found tonight with a known cause | ★ to ★★ | Sonnet 5.5 high (judgment) or medium (mechanical) | as found | as found |

**Wave 1 (fifteen at once):** K0, A, B, C, D, E, F, G, H, J, N5, N6, N7, N8, X2 (first half). **As slots free:** N9,
N10, N11, N12; I after H lands; Q2 after I lands and the note lanes have reported their names; X2's second half after
the landings; M as found.

**Where lanes would collide, and how the order avoids it.** H, I and Q2 all write the search-test fixture: H lands
first (two rows), I is cut after it, Q2 after I. D is the only lane in the prompt file and the only one in the ask
service. F is the only lane in the answer test's script and fixture (E and G read them and run them, never edit them).
A is the only lane in the search-test script (X2 runs it; until A lands, X2 runs it with the report flag on, as every
run so far has). B is the only lane in the seed file; the content lanes each own one new file (plan 98's lane A0 made
that possible). C touches the reply row's files, which nothing else touches tonight. The measurement lanes and the
library build share this PC's AI model: the build runs first, then X2, D, E, F and G run their own measurements at two
or three at a time (the model is one process; the session staggers their starts).

**Bugs bumped above Sonnet, and why.** C is a focus bug: the routing table gives it to Opus extra-high once a device
measurement is in hand, and plan 98's evidence file is that measurement (`document.hasFocus()` read false after the
Down walk from Undo). The advisor reads the diff before it lands; the Deck row is the gate. Nothing else here is screen
plumbing.

### 5a. The search-test script's report flag (A)

`scripts/kb/eval_kb_embed_models.py` writes its JSON report into the workshop's research folder on every run (lines
1847 and 1869 to 1870), and the `--no-write-report` flag (lines 1892 to 1893) gates only the markdown (1872 to 1875).
On 2026-10-25 a lane's run overwrote the session's dated report. The fix: with the flag off, neither file is written and
the console says so. One test with a stand-in research folder. Mechanical, one obvious way, so Haiku (trial).

### 5b. The Sims 4 "Fires" note (B)

Seed section 112 (The Sims 4, "Fires", the maintainer's own words, no source) says there are no firefighters. The new
note 1200 ("Fire", from the Sims wiki page "Fire" at revision 1237114) says a smoke alarm brings firefighters on its
own. On the Deck on 2026-10-26 the fire question drew the older note first. The lane re-reads the wiki page with the
fetcher, quotes the firefighter line, rewrites the first sentence of section 112 to agree, and gives the section the
page as its source (url, licence as the fetcher prints it, revision, today's date). Nothing else in the note changes;
the em dash in it stays. **Check (P102-SIMS-FIRE-01, block R1):** with the night's library installed, "The Sims 4: how
do I stop a fire" attaches notes that agree with each other about firefighters.

### 5c. Undo and the lost window focus (C)

**Measured on the Deck 2026-10-24** (`workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`, with Deep Rock Galactic:
Survivor running): after a thumbs-down mark, a Down walk from Undo ended with the ring on the notes block and Down dead,
`document.hasFocus()` false. Closing and reopening Quick Access cleared it but emptied the question box. **Read in the
code 2026-11-02:** the demote rows land the ring with their own helper (`kbDemoteRows.tsx` lines 186 to 199: Steam's
transfer onto the stop's node, then a plain `focus()`), which never asks the panel's window for its focus back. The
heal plan 97 built (`refocusPanelWindowIfLost` in `navFocusRegistry.ts`) runs inside `takeNavFocus` and in eight other
hops, and the strategy checklist's steps call it before their own transfer (`strategyChecklistNav.ts` line 38); the
reply row's hops do not. The Down out of the rows goes to `downFromDemoteRows` (`buildReplyActionsElement.tsx` line
600) and then `focusRegisteredReplyStop` (`replyStopRegistry.ts` line 191). The fix is the one the evidence supports:
the demote rows' landing asks for the window's focus first, the way the checklist steps do, and whichever hop the
notes-block Down takes does the same if it does not already. A test at the Deck's level, modelled on
`reasoningLine.lostFocus.test.tsx`: with the panel's document reporting no focus, Undo then Down asks the window for
focus and the ring reaches the next stop. **Deck check (P102-UNDO-FOCUS-01, block R1):** Deep Rock Galactic: Survivor
running, a boss question, Not really, Wrong tip, the note; Undo; then Down three times, the ring read after each: every
press moves it and the log shows no dead press; the panel is never closed.

### 5d. The picture question's shape, and the picture models (D)

Today the picture rides on the user message as an image list (`ollama_ask_service.py` lines 333 to 336) and the
running game's name is only in the system text (`ollama_prompts.py` lines 410 to 415, and the sentence of 2026-10-25
at 484 to 496). Measured 2026-10-25: with the game handed over the AI named it 58 and 50 times in a hundred over two
runs (75 the day before), the God of War asks named another game 4 and 6 times in 9. The lane tries two shapes on the
PC with the scoring script (11 labelled pictures, 6 tries each, two runs each): **S1** the game's name in the user
message's own words beside the picture ("This screenshot is from <game>." before the question) with the system
sentence kept; **S2** S1 with the system sentence removed. Then the sweep the roadmap's step 2 asks for: today's shape on
each picture model the Deck offers that this PC holds (gemma4:e2b-it-qat, qwen3.5:4b, llava:7b; gemma4:e4b-it-qat as a
bigger sibling; qwen2.5vl:3b is not pulled, the lane may pull it, about 3 GB). A shape lands only if it beats today's
on "named the game, game handed over" in both runs and does not raise the God of War mix-ups; else nothing lands and
the report says whether the sentence should stay (call 5). The Default spoiler paragraph is pinned byte for byte and
must not change. **Deck check (P102-PICTURE-01, block R1, only if a shape lands):** God of War running, the newest
screenshot attached by the paperclip, "what game is this and where am I": the reply names God of War, two tries.

### 5e. The crowding read (E)

After the 51 notes of plan 100 landed, facts kept fell from 76.3 to 67.2 in a hundred on the answer test and five
held-back search questions lost their note from the first three. Two earlier runs differed by up to 6 points, so the
drop needs a read before it is believed; the maintainer asked for it ("Calls waiting on you"). The lane reads the six
questions that went from 3 of 3 to 0 of 3 (A-P2-01, A-CP77-02, A-FO4-05, A-BG3-01, A-GTAV-01, A-HK-03; the before
report `workshop:archive/research/kb-answer-eval-2026-10-25-p100-default.md`, the after report
`...-p100-needs.md`), re-runs each on today's library (3 samples), reads the replies against the card, and says for
each: a worse answer, a stale expectation (a newer, more specific note now attaches and the test still wants the old
card's words, as the Portal 2 gels case shows: the three gel notes attach and the test wants "orange"), or noise. For
the five search questions it names the notes that took the slots (the per-case tables in
`kb-embed-bakeoff-2026-10-25-p100-before-arms.json` and `-after-arms.json`) and says whether the new note is the better
answer for a player. **Report:** `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md` with one table, and
a patch file beside it with the fixture edits it proposes; nothing committed. The maintainer decides.

### 5f. Deeper answer checks (F)

The answer test cannot tell whether the AI admitted not knowing. The case shape (`eval_kb_answers.py` lines 378 to
391) gains one optional field, `expect_unknown`; the scorer (`run_turn`, 788 to 874) gains two checks: "admitted not
knowing" (the "Not in my notes" or "No close match" footer, or a plain admission in the reply, apostrophes dropped as
the script's own `_norm` does) and "invented a fact about it" (a tactic or a trait stated for the made-up thing as if
real). The summary gains two rows (after line 1415) and the per-case table one column (1445 to 1464); the saved JSON
the same (1864). Eight to ten new cases: three made-up bosses in covered games (the thin-match script's Zorblax and
Grimthak in Deep Rock Galactic: Survivor are two), two real things no note covers, two unknown games in Speed and
Expert (Strategy attaches a genre card by design, so it is not the control), one made-up item; across the three modes.
A `--sample-for-reading 10` switch writes ten random replies (question, notes attached, reply) to the workshop's
research folder for the maintainer's monthly read (call 13). Tests in `tests/test_eval_kb_answers.py`: the admission
matcher both ways, the invented check, the two rows. **Measured on the PC** by the lane: the new cases, 3 samples, the
two rates in the report. No Deck row; the answer test is the check.

### 5g. The card-style measurement (G)

73 of 465 cards use the labelled short-line shape (Summary, Weak points or Uses, Tips); 392 are prose. Of the answer
test's 43 cases that name a card the data resolves, 41 point at prose cards and only 2 at labelled ones, so the test
cannot say today whether the labelled shape reads better. The lane picks fifteen of those prose cards whose case kept
fewer than 3 of 3 facts on 2026-10-25 (A-L4D2-01, A-HADES-02, A-CP77-02, A-FO4-01, A-FO4-05, A-RDR2-01, A-OOT-02,
A-GTAV-01, A-GTAIV-02, A-FNV-02, A-SM64-01, A-MK64-01, A-TTYD-02, A-PIK2-02, A-HK-03 are candidates), rewrites each in
the labelled shape with no new facts (the card's own sentences, re-arranged) in its copy's seed file, builds that to a
scratch library, and runs the answer test on those cases against both libraries, 3 samples, two runs each. Report:
facts kept and contradictions per case both ways, the rewrites as a patch in the workshop. Nothing lands; the
numbers decide whether the style pass (★★★ in Next) is worth doing.

### 5h. The "can't find my PC" tip (H, call 6)

Tip 167, topic `network`, platform `deck`: lane T's text from plan 100 § 14, starting "Researched, unconfirmed:". The
router (`compat_topic_router.py`; the comment at lines 253 to 255 says why no rule exists today) gains word pairs
("can't find" or "cant find" or "cannot find" with "pc" or "computer"; "my computer" with "list"; "same network"), each
written as the existing pairs are. Fixture rows `V2-W2-SYM-19` and `-20` gain `expect_topic` network and
`expect_pattern_id` 167. Tests: the two sentences route; the three questions that must not route still do not; the
router test that reads the whole fixture (`tests/test_compat_topic_router.py` line 301) still passes, so no other
question changed its route. The measuring script's table: 19 of 24 reach a tip and 17 the right one, expected. **Deck
check (P102-FINDPC-01, block R1):** nothing running, "cant find my pc on the network" attaches tip 167.

### 5i. Thirty questions only the meaning search can answer (I)

Only 4 labelled questions get nothing from the word search, too few to gate a regression. Thirty new rows
(`V2-P102-MEAN-01` to `-30`, split holdout, one note each across the games, `meaning_only` true), each a question a
player would type about the note's subject using none of the content words of the note's name or card (a scratch
script lists them from the built library's own word index, and checks each question gets zero word-search hits on its
note). The search test's per-case table already shows the word arm and the blend per question, so lane X2 counts how
many of the thirty the blend rescues. Cut after H lands.

### 5k. The bookkeeper's two audits (K0 at go, K9 at the end)

The pre-go audit fixes the words, in one commit, every change named: the "Where things stand" paragraph (the build on
this PC is 465 notes and 166 tips, unpublished; the sentence "29 of 38 games now have enemy and item notes" is wrong
by the data: every game has at least one note of the enemy or item kind, but only seven have enemy or item cards in the
labelled short-line shape, and the eight games this wave covers are thin, counted from the seed); the ★★★★ entry "What
ships loses to its own meaning half" (today's run on the bigger library: the blend 90.8, the meaning search alone 92.2,
the word search alone 85.6 in the first three on the held-back questions,
`workshop:archive/research/kb-embed-bakeoff-2026-11-02-arms-p102-before.md`, so the claim held; status stays as the
maintainer left it, the words updated); the
"Unrelated questions" entry's Deck line (the junk-phrase fix is in Done now); the calls answered by D139 (the four of
call 3 closed with their numbers, call 4 to the shelved file); D139 appended word for word from § 2; a testing row,
status open, for every check in § 6; every entry five lines; every link resolving. The end-of-session audit does the
same after the last landing and the last Deck block, and checks each entry moved this session names its row and its
evidence file.

### 5n. The eight thin games' notes (N5 to N12, call 2)

Each lane takes one game and writes ten to fifteen enemy and item notes in the labelled short-line shape, one new file
under `data/kb/notes/` plus a sources sidecar naming the page and revision each sentence came from. Section ids: N5
Grand Theft Auto V 1400 to 1499; N6 Grand Theft Auto IV 1500 to 1599; N7 Super Mario 64 1600 to 1699; N8 Paper Mario:
The Thousand-Year Door 1700 to 1799; N9 Pikmin 2 1800 to 1899; N10 Doom 64 1900 to 1999; N11 Donkey Kong 64 2000 to
2099; N12 Mario Kart 64 2100 to 2199 (the seed stops at 467, plan 100's files at 1399; a repeat stops the build).
Sources, as each game's notes already cite them: the GTA wiki (CC BY-SA 3.0) for N5 and N6; the Super Mario Wiki (CC
BY-SA 4.0) for N7, N8, N11 and N12; the Pikmin wiki (CC BY-SA 4.0) for N9; the Doom Wiki (CC BY-SA 4.0) for N10. Every
sentence is read against its page before the lane reports. The session reads one game's notes aloud in the chat for
the maintainer's quality read before any note lands; the other seven wait on that read (call 2 says what happens if
the maintainer is away). **Deck check (P102-THIN-GAMES-01, block R1):** with the night's library installed, one
enemy or item question per game, by name, attaches a note from the new file (eight questions; the row passes on six or
more, and names the misses).

### 5q. Blind questions for the new notes (Q2)

As plan 100's lane Q: two questions per note, from the names, kinds and ids only (never the text), as rows
`V2-P102-<GAME>-<NN>` in the search-test fixture, split holdout. Cut after I lands; the names come from the note lanes'
reports through the session, bracketed parts kept (plan 100 lost ten that way).

### 5x. The measurements (X2, one after another on this PC)

**Before the landings:** (1) the search fixture baseline on today's library (`--arms-only`, the per-question output
kept); (2) the tips reach (the 24 sentences; 17 reach a tip and 15 the right one today); (3) the answer test on first
turns, 3 samples, today's library (facts kept read 67.2 on 2026-10-25). **After the landings:** (4) the search fixture
again with the new library and the new rows (no right note lost; the thirty meaning-only rows: how many the word arm
misses and the blend finds; the new notes' blind questions found in the first three, how many of how many); (5) the
tips reach with tip 167 (19 and 17 expected); (6) the answer test again (facts kept, contradictions, and the new
"admits not knowing" rows once F has landed). Each report to the workshop's research folder with `p102` in its name;
the lane reports numbers only and commits nothing.

## 6. The Deck, in blocks

One driver per block, a fresh one each time with the last handover. Every block starts by reading `deck_status` (the
lease free, the stop switch off), takes the keep-awake lock, reads which screen is live, backs up the settings, reads
the build, and uses only the test chat. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. Evidence
`plan102-<ROW>.json`, one file per check, never overwritten; a screenshot beside every look the maintainer judges.
**Unload the Deck's AI before launching a game; never reload the plugin with a game running.** A check that failed to
produce its case twice gets a prepared setup here or goes to the maintainer's list as "proven by its tests only".

| Block | When | What | Needs |
|---|---|---|---|
| R0 | Minute zero, the build already on the Deck, no deploy | Setup. The knowledge-base smoke pass (plan 98's runbook K0, re-runnable). **The owed rows with prepared setups:** the "Needs" line (P100-NEEDS-01-try3: Strategy, Hollow Knight by name, a branch button first, a route whose steps need an ability); Hide more on screen (P100-HIDE-MORE-SCREEN-01-try2: Brotato, on the no-story list, two boss questions under Hide more; a cover stays shut; no cover drawn in both means "proven by its tests only"); the route steps and the D-pad (P98-ROUTE-01-try3: a chat with one checklist, a second checklist from a branch button, Down from the answer reaches the new list's first step, A reveals it, Up and Down walk the steps); the Undo trap as it is today (P98-DEMOTE-01-game-try2: the exact presses of the plan 98 evidence, the focus read after each Down, so the fix has a baseline); the hidden box on a game known only by name (STRAT-SPOIL-NAME-01) if Doom 64 is on Recent Games; the saved walks through the rating row re-saved for the "Suggest as a tip" stop (owed since plan 100). | Deep Rock Galactic: Survivor; the Deck's AI; Doom 64 launched by hand |
| R1 | After the landings and one deploy with the night's library installed through the Developer tab | One check per landed fix: P102-UNDO-FOCUS-01, P102-SIMS-FIRE-01, P102-FINDPC-01, P102-THIN-GAMES-01, P102-PICTURE-01 (if lane D landed a shape); the look check on each screen touched (QA-LOOK-01-p102); the free-play sweep with and without a game. | the new build |
| RR | The end, final build | The knowledge-base smoke pass again; **put the library back:** Remove, then Download from the published site, the version read back (2026.10.25); settings restored key by key; pinned test chips cleared; the game closed; the Deck's models as at R0. | — |

**A new check the maintainer alone can do** goes onto the checks page, in a "plan 102" group, never left in chat: one
game's notes read in the chat (call 2); the new tip read for truth; the ten-reply sample read once (call 13); the
crowding read's table (lane E) and the card-style numbers (lane G), each with one decision.

## 7. The second opinion (Fable 5.1 high; the routing table's setting)

The `advisor` helper, read-only, one bounded question with the exact files and evidence, one recommendation back. At
most four.

| # | When | The question |
|---|---|---|
| 1 | Before wave 1 is cut | The briefs against the code: does any brief name a cause the code does not have, a file another lane owns, or a Deck pass its tests cannot stand for? |
| 2 | Before landing C | The diff against the focus rules and the Deck row: any plain focus hop across containers? Does a test fail without the change at the Deck's level? Is the heal asked for in the one place the evidence names, not sprinkled? |
| 3 | When any item has failed on the Deck twice | For that batch: what the two failures say, and what to try third. |
| 4 | Before the report | What to tell the maintainer first, what to leave open, which items must not be called done. |

Log, one row per consult: time, the question in one line, the answer in one line, what it changed, the cost.

| Time | Question | Answer | What changed | Cost |
|---|---|---|---|---|
| 2026-11-02 22:58 to 23:02 UTC | Consult 1: do the fifteen wave 1 briefs match the code at `46475a55`? | Ten hold; five need corrections: K0 (count from the seed, not the brief's sentence; the bookkeeper is exempt from rules 21 and the quick-check ban), A (never run the script before the fix or with the report on: its dated file is X2's), C (the Down out of the rows is at line 692, not 598; the registry hop is not healed either), D (the scoring script names its report by the date alone: add a label), the note lanes (the subject lists repeat notes the seed has for Super Mario 64, Pikmin 2, Doom 64 and Donkey Kong 64) | Each correction sent to the running lane as a message and written into the briefs file; the N9 to N12 briefs corrected before they are cut | about 87k tokens, 4 min |

## 8. Things to bring to the maintainer's attention

- **The roadmap's "29 of 38 games have enemy and item notes" is not what the data says.** Counted 2026-11-02 from the
  seed and the four notes files: every one of the 38 games has at least one note of the enemy or item kind, but only
  seven (Deep Rock Galactic: Survivor, Ocarina of Time, State of Emergency, Baldur's Gate 3, GTA San Andreas, The Sims
  4, Portal 2) have enemy or item cards in the labelled short-line shape, and eleven games have no enemy note and one
  item note at most: the eight this wave covers plus Mario Party 1, 2, 3, 6 and 7, Yoshi's Story, Diddy Kong Racing,
  Super Smash Bros. and GTA III. The bookkeeper rewrites the sentence.
- **The ★★★★ "loses to its meaning half" entry: re-measured tonight, and the claim holds.** On the 465-note library,
  held-back questions, the right note in the first three: the shipping blend 90.8 in a hundred, the meaning search alone
  92.2, the word search alone 85.6 (lane X2, `kb-embed-bakeoff-2026-11-02-arms-p102-before.md`). The plan's first draft
  said plan 100's lane X had shown the blend winning (89.0 and 81.8 for the two halves); those figures were mislabelled
  in plan 100's report (the 81.8 is the meaning search on the compat questions). The bookkeeper writes today's numbers
  in; the status and the decision stay yours.
- **The Deck is unreachable from this PC right now** (`deck_status` at 2026-11-02: the Deck does not answer; Ollama
  answers; the rig's board is on COM7 and armed). Block R0 waits for the Deck to be on; the helpers do not.
- **Fable orchestrates at your choice.** The routing table puts Opus extra-high here; this wave has nothing above four
  stars.
- **Forty old repo copies** from plans 98 and 100 are still on disk (`git worktree list`). They do not block new copies.
  Clearing them is a job for the copy script's prune, never git's own remove (lessons § 1); not tonight unless disk
  space forces it.
- **Two lookups corrected the premises.** The thumbs-down trap: the demote rows never go through plan 97's heal (the
  premise said "two places" were healed; the code has nine, none in the reply row). The route steps: the second
  checklist's steps the driver saw as "plain text" were covered steps drawn by design, and the step spots are shared by
  every checklist in a chat (`strategyChecklistNav.ts` lines 19 to 31), so two open checklists could share spots; no
  test covers that case. The route item stays a Deck row with a prepared setup, not a lane, until it is seen clearly.
- **The library needs your publish twice over now:** the 2026-10-26 build (465 notes) never went out, and tonight's
  build adds the Sims fix and about a hundred notes. One publish at the end covers both, after your reads.

## 9. Standing rules while nobody is watching

Plan 100 § 9 in full: the library is never published from the session; a new library reaches the Deck only through the
Developer tab's install route and is put back at the end; a content lane never writes a sentence it cannot point at in
a page the fetcher read; evaluation reports are never committed to this repo; a lane that touches the retrieval service
lands alone, with the fixture check in its landing log; the test chat only. Plus: every roadmap move names the row it
owes, and nothing moves to Done without its evidence file.

## 10. Keeping the PC and the Deck awake

The desktop app keeps this PC awake; the rig's keep-awake lock with `ttlMinutes: 480` renewed by every driver; a
background sleep job before any pause (the scheduled check alone did not wake plan 92's session).

## 11. Paperwork and the reports

- **After every landing:** the bookkeeper moves the entry (Bugs or Next → Deck check owed, naming its row), one commit;
  two lines in § 12, committed.
- **After every Deck block:** a pass moves to Done with its evidence file; a fail goes back with what was seen; the
  testing documents in the same commit; the bookkeeper confirms each evidence file exists; the session spot-checks.
- **New bugs found:** into the roadmap at the next sweep, into the report, and (one- and two-star with a known cause)
  into lane M the same night, about an hour each.
- **The report, at the end,** in § 13: what the maintainer must do next; what a player notices; the code work by area
  (file paths, a technical explanation, what popped up and how it was handled, what the maintainer could have done
  differently); a plain developer guide; what failed and why; what is left and why; the numbers. The status report
  (plan 37) gets a dated paragraph; the checks page gets its group; plan 33 § 4a, § 4b and § 4d get their rows.
- `python scripts/verify.py --full` passes on the tip before the maintainer is asked to push.

## 12. Progress log and questions

- **2026-11-02, the session on the maintainer's PC (Fable 5.1):** the roadmap read; four Haiku lookups (the Undo path,
  the checklist steps, the answer test's control, the picture path), each re-read against the code; the plan, the
  helper rules and the briefs written. Tip `84e0e64c`, tree clean, D139 free (D138 reserved by plan 101). Usage: 4
  percent of the five-hour window, 3 percent of the week. The Deck unreachable; Ollama up with every model lane D needs
  but one. Waiting for the maintainer's "go".
- **2026-11-02, go.** The maintainer said "go" with every default (D139). Tip `46475a55` (the plan files committed first,
  staged by name). Usage at go: 12 percent of the five-hour window, 8 percent of the week. **The two project tool
  servers (the Deck rig and the docs server) dropped out of this chat at go**, so this chat cannot drive the Deck tonight;
  the Deck also read unreachable before they dropped. Block R0's runbook is written for a second chat with the rig
  (`assets/102-runbook-block-R0.md`). Fifteen wave 1 copies cut at `46475a55` (K0, A, B, C, D, E, F, G, H, J, N5 to N8,
  X2), the library copied into the seven that measure; all fifteen helpers started at once, with the measurement lanes
  told to hold their model runs until X2's baseline is done (one model on this PC; queued requests time out). The full
  check started on the tip in the background; advisor consult 1 started.
- **23:10 UTC: consult 1 back** (§ 7); corrections sent. **The ratchet is red at the tip:** `docs/roadmap.md` reads 100.61 KB
  against its 100 KB ceiling (it was 103,513 bytes at `84e0e64c`, before tonight), so every code landing waits for K0, which
  trims it. **Lane B done** (`6ca0e0b1`: the Sims 4 note's first sentence now follows the wiki's line, "firefighters come on
  their own when a smoke alarm is in the room where the fire breaks out", with the page cited; one more commit asked for:
  the glossary entry that repeats the old claim, `data/kb/glossary/own-and-gta-titles.json`). **Lane A done** (`6bb6a130`:
  the write step factored into a helper, two tests, a hand run that left the research folder unchanged). **Lane G's
  rewrites ready** (fifteen cards, the scratch library built, the patch in the workshop; waiting for the model). Lane X2's
  first run wrote the two dated files and renamed them `-p102-before`. Block R0's runbook committed (`196910fb`).
- **23:20 UTC: the baseline is red at the tip, on one thing.** The full check stops at its first step, the ratchet:
  `docs/roadmap.md` is 100.61 KB against its 100 KB ceiling. It crossed the line on 2026-10-26 in plan 100's last docs
  sweep (`46411790`, 101,609 bytes) and grew again on 2026-10-28 (`3ac3e810`, 103,020 bytes); nobody ran the check
  after. K0 trims it as part of its audit; every landing waits for K0; the full check runs again on K0's tip for the real
  baseline. **Lane D's code part done** (`58f75ece`: the scoring script's shape flag, a label suffix, the God of War mix-up
  line, nine tests; the plugin switch itself waits in its copy for the numbers). **Lane E's reading done**, waiting for the
  model: in five of the six cases the same notes attached before and after, three of the six swung between 0 and 3 of 3 on
  the old library across nine runs, and the test's word lists are too narrow in three places; only the Portal 2 gels case
  is a worse answer. Lane N9 started (copy at `196910fb`). Lane B's second commit (`0d836cfb`) fixes the glossary entry.
- **23:40 UTC: lane X2's first half done** (search 80 s, tips 8 s, the answer test 6.5 min): held-back search, right note
  in the first three, the blend 90.8, meaning alone 92.2, word alone 85.6 (so the ★★★★ "loses to its meaning half" claim
  holds; § 8 corrected); tips 17 of 24 reach one, 15 of 22 the right one; **the answer test on the unchanged library read
  facts kept 71.2 against 67.2 on 2026-10-25 and contradictions 94.4 against 96.3: a four-point swing with nothing
  changed.** The model released to lanes E and G. **Lane H done** (three commits, 19 of 24 sentences reach a tip and 17 the
  right one, none wrong; one more commit asked for: the pair must also see network, wifi, lan, list, ollama, address or
  deck, so an in-game "computer terminal" question cannot reach the tip).

## 13. Report

Written at the end.
