# 100 — The knowledge base: finish the half-done phases, fix the open bugs, build "Suggest as a tip", with the Deck alongside

Written 2026-10-25 by the planning chat (Fable 5.1, the maintainer's choice) in a **cloud session that only plans**;
the work runs in a new chat on the maintainer's PC. Sources: the knowledge-base roadmap and its long notes at tip
`a03dd48`, plan 98 and its report, the lessons file, the bug-wave runbook, and six read-only code lookups by Haiku
helpers (each checked against the roadmap; three mismatches found, § 8). Plain language on purpose: this file is for
the maintainer first.

**Status: RAN 2026-10-25/26 on the maintainer's PC; every lane landed on `experimental`; the Deck round (blocks L1, L2, LR) is owed because the rig's tools dropped out of the chat; the report is § 13.** (Before the run:) READY for "Run plan 100" on the maintainer's PC. The maintainer answered the calls in § 2 on 2026-10-25
("plan the plan as listed": the defaults on all fourteen; usage at 53 percent of the five-hour window, which resets
within the hour, and 53 percent of the week, which resets Wednesday morning). They become decision D137, written by the
bookkeeper in its pre-go audit. The helper rules, the briefs and Deck runbook L0 are written (the files below).
Nothing started; nothing on the Deck touched.

**Who runs it:** a **new** Claude Code chat on the maintainer's PC, **Fable 5.1 at high**, orchestrates and lands (the
maintainer's choice; the routing table would put Opus 5.5 extra-high here). **Sonnet 5.5 high** lanes build everything
that needs a judgment and write the content; **Sonnet 5.5 medium** runs the long measurements, writes the fixture rows
and does the bookkeeping; **Haiku 5.5 high** (on trial, logged in plan 33 § 4d) does the two one-star mechanical fixes;
**Opus 5.5 medium** builds the one new screen control, as plan 98 did. A lane that fails on the Deck twice moves up one
tier without asking. A **Fable 5.1 max** second opinion (the `advisor` helper started at max) is asked at most five
times, each logged (§ 7). The `deck-driver` (Sonnet 5.5 medium) runs the Deck blocks through the controller rig; the
`bookkeeper` files every roadmap, testing and changelog change, and audits the knowledge-base roadmap before the first
lane starts and after the last one lands. Never alongside another chat that is driving the Deck.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1 to 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [docs/roadmap-kb.md](../roadmap-kb.md) and
[its long notes](../roadmap-kb-details.md); [plan 98](98-kb-feature-wave-and-deck-test-wave.md) §§ 5, 6, 12 and 13
(the last knowledge-base wave; its briefs and runbooks are the shape to copy); [plan 28](28-phase5-corpus-depth.md)
for the four thin games.

**Files for this plan (written 2026-10-25):** the helper rules [assets/100-helper-rules.md](assets/100-helper-rules.md)
(plan 98's rules plus four new lines), the briefs [assets/100-lane-briefs.md](assets/100-lane-briefs.md) (one per lane,
with the file and line facts from the lookups), the first Deck runbook
[assets/100-runbook-block-L0.md](assets/100-runbook-block-L0.md) (the smoke pass with Show details, plan 98's owed
looks, the owed rows); the session writes one runbook per later block. Evidence files:
`plan100-<ROW>.json` in the workshop's `test-evidence` folder. Handovers: `assets/100-handover-<block>.md`.

---

## 1. One sentence

Fix the nine open knowledge-base bugs whose cause is known, finish the troubleshooting-tips wording the second opinion
spelled out, build "Suggest as a tip", write the enemy and item notes the four thin games have never had, close the two
half-done phases that have nothing left to build by your call, take the seven AI measurements the roadmap owes, and run
every owed knowledge-base Deck check the rig can run while the helpers build, with the roadmap audited before go,
current at every step, and audited again at the end.

## 2. The maintainer's calls (answered 2026-10-25: the defaults on all fourteen; D137)

The questions as they were put, each with the recommendation and the default in brackets. The maintainer took every
default ("plan the plan as listed"), so the default is the call. Call 12 was settled the same evening: pushes were
allowed for the planning chat, and the plan files were pushed to `experimental`. D136 was the last decision; the session
re-checks the tail of the decisions file at go.

1. **Scope.** In: the troubleshooting tips wording (T), the two prompt lines (P), courtesy phrases are not follow-ups
   (F), the route look's revealed steps saved with the ticks (R), Hide more applied on the screen side (V), the Search
   tab landing on the "How much to hide" row (W), the Yoshi's Story note (Y), the thumbs-down follow-ups with a "Lowered
   notes" row (U), "Suggest as a tip" (J), the enemy and item notes for the four thin games with their blind questions
   (N1 to N4, Q), the seven AI measurements (X), closing Phases 4 and 7 by call (call 8), and every owed knowledge-base
   Deck row the rig can reach. Out: the card style pass (a measurement first, if time is left), the deeper answer
   checks, the online and versus content, the catalog phase, and growing the screenshot set (it needs your hand in a
   game). *Recommendation: as listed. Default: as listed.*
2. **The four thin games' notes (Phase 5).** Ten to fifteen enemy and item notes each for Baldur's Gate 3, GTA San
   Andreas, The Sims 4 and Portal 2, in the labelled short-line shape the sixteen existing enemy and item cards use.
   Every sentence comes from a page the fetcher read, with its licence printed: GTA San Andreas from the GTA wiki and
   Portal 2 from the Portal wiki, as their notes do today; The Sims 4 from its wiki if the fetcher's licence line allows
   it, else own words; Baldur's Gate 3 never from its own wiki (NonCommercial) but from Wikipedia where it has the facts,
   else fewer notes. Whoever writes a note never writes its test question (Q). *Recommendation: all four lanes run at
   once, and nothing lands until you have read one game's notes in the chat (the Phase 5 plan's quality read). Default:
   that.*
3. **Two new troubleshooting tips** with no tip today: sound going to the TV instead of plugged-in headphones, and menus
   out of place on a TV. Every tip in the sheet is in your own words with no source page. *Recommendation: lane T writes
   both, marked "Researched, unconfirmed" like the four tips that already carry that mark, for your read in the report.
   Default: yes.*
4. **Where a lowered note can be seen and cleared.** Undo shows only under the newest answer, so three marks leave a
   note out for good with nothing to see or clear. *Recommendation: a row in the Knowledge base section (it sits in the
   Ollama tab, beside Remove): "Lowered notes: 3", with Clear behind a confirm box, hidden when the count is 0; and
   Show details losing its "ranked lower by you" tag the moment Undo is pressed. The other shape, a list with one Undo
   per note, is bigger and waits for a Deck measurement. Default: the row.*
5. **The "If you want to cheat" section** seen once in a route answer. *Recommendation: skip; one sighting, and every
   prompt sentence costs every Strategy turn. The Deck block asks two route questions and counts. Default: skip.*
6. **"Suggest as a tip"** (five stars, kept out of plan 98 until the reply row landed; it has). A button under a finished
   answer writes a valid note record to your Desktop notes folder and shows a GitHub new-issue link. *Recommendation:
   in, one Sonnet high lane; the security reviewer reads its change (it writes files and builds a link). Default: in.*
7. **Optional lanes if the others finish early:** deeper answer checks (questions no note can answer, scored for an
   honest "I don't know"), and the card style measurement. *Recommendation: out. Default: out.*
8. **Close two half-done phases by call.** Phase 4 has nothing left to build: its last item is your own eye on the
   widest chip labels, already on your checks page. Phase 7's two leftovers belong elsewhere: add-on packs to the
   catalog phase (Phase 8), a screenshot feeding the search to the screenshot entry. *Recommendation: close both, the
   leftovers moved, not dropped. Default: close both.*
9. **Models**, as you asked, with two notes. Fable high orchestrates and lands. Sonnet high: T, P, F, R, V, J, N1 to N4,
   M. Sonnet medium: Q, X, the bookkeeper, the deck-driver. Haiku high: W and Y (mechanical one-star fixes, logged).
   Opus medium: U (a new control, as plan 98's D and H). A lane that fails on the Deck twice moves up one tier. The
   bookkeeper is Sonnet, not Haiku: Haiku lost sentences while saying it had not in the blind bookkeeping trial (plan
   83). The advisor is Fable at max, five consults at most. *Default: as listed.*
10. **The Deck before go.** Start Doom 64: Retribution by hand once and leave it on Recent Games (the hidden-spoiler-box
    row has been blocked five times because the rig cannot launch a non-Steam shortcut); Deep Rock Galactic: Survivor on
    Recent Games; the Deck's own AI installed; the rig's stop switch re-armed; the test chat still there. *Default: you
    do these before saying go; the session reads the Deck's state first and runs what it can.*
11. **Push and publish at the end.** The hook refuses a push unless you allow it for the session, and the library
    publish is refused from a chat. *Recommendation: the session leaves both for you: "push" when you are back, and the
    publish command after you have read the note sample in the report. Default: nothing pushed or published.*
12. **Getting this plan to your PC.** This planning chat is in the cloud and its push is blocked by the same hook. Either
    set `BONSAI_ALLOW_PUSH=1` in this cloud environment's variables and tell me, or say "pushes allowed" and I set it in
    the repo's local settings for this chat only, then push the plan and its asset files to `experimental`. *Default:
    you say which.*
13. **Standing rules while you are away** (plan 98's, kept): a fix that fails on the Deck twice moves up one model tier
    without asking; a new one- or two-star bug gets one helper round of about an hour; anything blocked gets the safest
    choice at once and is raised in the chat and in § 12 at that moment; never push, publish, merge to main, switch
    branches in the shared folder, type a PIN or password, reload the plugin with a game running. *Default: kept.*
14. **Budget line and usage figures:** no new helper past 75 percent of the five-hour window or 90 percent of the week
    (D128, the weekly line raised from 80 to 90 by the maintainer on 2026-10-25, for this session and going forward). Read both counters at go and say them; the cost hook cannot read them. *Default: kept; counters read.*

## 3. What a player notices after this session

Once the build reaches their Deck (and, for the notes, once you publish the library):

- **Plain problem sentences reach a tip.** "The game closes on its own", "it won't start", "no space left", "I can't find
  my PC" reach the crash, launch, storage and find-the-PC tips. Today 8 of 24 such sentences reach any tip. Two new
  tips: sound going to the TV instead of headphones, and menus out of place on a TV.
- **"Thank you very much" gets a short reply**, not the previous answer again.
- **A route step says what you need.** "Beat the False Knight. Needs: the Mothwing Cloak" draws a small "Needs" line
  under the step, because the AI is now asked to write one when a step needs an item or ability.
- **The steps you opened on a route are kept with your ticks**: same place, same save, cleared together.
- **Hide more hides more on every game.** A cover on a game with no story (a racing game, a sandbox) stays shut under
  Hide more, instead of opening by itself.
- **Searching Settings for "spoilers" lands on the "How much to hide" row**, not on the section line above it.
- **"Ranked lower by you" clears the moment you press Undo**, and the Knowledge base section shows how many notes you
  have lowered, with a Clear button.
- **"Suggest as a tip"** under an answer writes a note file to your Desktop and shows the link to send it in.
- **Screenshots: the running game is the game in the picture.** The AI is told so plainly, and the scoring script says
  the same night whether it listened (today it ignored the name 4 times in 9).
- **Yoshi's Story's "Starting out" note stops contradicting itself** (six worlds of four levels).
- **Baldur's Gate 3, GTA San Andreas, The Sims 4 and Portal 2 get enemy and item notes**, so "how do I deal with X" has
  a note to stand on for those games too, and their chips get variety.
- **The owed Deck looks are done:** the thumbs-down pictures (if plan 98's block KS did not take them), the hidden box
  on a game known only by name, the stale saved walks re-saved, the Show details half of the smoke pass. (Two more were
  done on 2026-10-25 before this plan ran: each glossary word underlined once, and the spoiler row's ring.)

**How much better shape the knowledge base is in afterwards.** Counted from the roadmap at tip `a03dd48`:

| | Today | After this session, if everything lands and passes |
|---|---|---|
| Open bugs (not accepted) | 15 | 2 to 6 (the four that need a second AI measurement may close or stay, on the numbers; call 5 is one) |
| Half-done ("PARTIAL") entries | 4 (Phases 4, 5, 7; the screenshot measurement) | 1 (the screenshot measurement, with step 2's first piece built) |
| Five-star features built | 0 | 1 ("Suggest as a tip") |
| Deck checks owed on knowledge-base rows | 1 (the hidden box on a game known only by name; two more passed on 2026-10-25) | 0 to 2 (the maintainer's own eye checks on the checks page) |
| AI measurements owed | 3 | 0 |
| Games with enemy and item notes | 25 of 38 | 29 of 38 |

## 4. Before go

**The maintainer, about fifteen minutes, on the PC:**

1. The calls are answered (§ 2). Pull `experimental`: the plan and its three asset files are on it.
2. **Which chat holds the Deck.** No other chat may be driving it; the session reads the Deck's state at go.
3. **The Deck** (call 10): Doom 64: Retribution started once by hand and left on Recent Games; Deep Rock Galactic:
   Survivor on Recent Games; the Deck's own AI with its usual model; the stop switch re-armed; the test chat "test" there.
4. **This PC:** Ollama running with the embedding model and the Deck's answering model (both were present on
   2026-10-22). The library build and every measurement use it.
5. **The usage screen:** read both counters and say them.
6. **Open a new Fable 5.1 high chat in the desktop app, in the repo folder, on `experimental`,** and say: "Run plan 100."
   (The answers to § 2 can be in the same message, by number.) In VS Code instead, the session starts the keep-awake
   script first.

**The session's first acts (the first thirty minutes), in this order:**

0. `git pull origin experimental` if the plan files are not at the tip yet; if this plan and its three asset files are
   still uncommitted (the planning chat may have left them so), commit them first, staged by name and nothing else.
1. `git status` (other chats' uncommitted files are theirs: never stage them), the tip hash, the tail of the decisions
   file (this plan's entry is D137; if taken, the next number, said here), `deck_status` (the lease free, the stop switch
   off). Start `python scripts/keep_awake.py --hours 10` in the background unless in the desktop app.
2. The baseline: `python scripts/verify.py --full` on the tip, once, in the shared checkout.
3. Build the library once on the PC (`python scripts/kb/build_rag_db.py --seed --out build/knowledge-base`, with every
   meaning vector) and copy it into every lane's copy at `build/knowledge-base`.
4. Cut the wave 1 copies (`python scripts/worktree.py create p100-<lane> --base experimental`), confirm each sits at the
   tip, and start the wave 1 helpers two to three minutes apart (§ 5), each with the rules file plus its brief, the tip
   hash and its copy's path. Start the bookkeeper's pre-go audit (§ 5k) first and land it first.
5. Start Deck block L0 with a fresh driver at the same time (§ 6). The Deck never waits for the helpers.
6. Ask the advisor consult 1 (§ 7) while wave 1 builds.

## 5. The work: what can run in parallel, and what cannot

**The rule for parallel lanes is files, not features.** Two lanes never own the same file. Everything not named as a
wait runs at the same time. Up to fourteen helpers at once, started a few minutes apart; each runs only its own tests at
two workers; the full checks run once per landing, in the shared checkout.

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| K0 | The bookkeeper's pre-go audit of the knowledge-base roadmap (§ 5k) | ★ docs | Sonnet 5.5 medium | `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md`, the knowledge-base rows of `docs/testing.md` | nothing; lands first |
| T | Troubleshooting tips: five tips get plain words, two new tips, the router's topic words get the same words, the 24 test sentences get their right topic and tip written in, the measuring script reads them (§ 5a) | ★★★ `[KB]` | Sonnet 5.5 high | `data/kb/compat_patterns.json`, `py_modules/backend/knowledge/compat_topic_router.py`, the 24 `V2-W2-SYM` rows of `tests/fixtures/kb_eval_v2.json`, `scripts/measure_kb_floor_holdout.py`, their tests | nothing |
| P | Two prompt lines: the checklist asks for "Needs: …" on a step that needs an item or ability; the picture rules say the running game is the game in the picture (§ 5b) | ★ and ★★ `[KB]` | Sonnet 5.5 high | `py_modules/backend/prompts/ollama_prompts.py`, its tests | nothing (the only lane in the prompt file) |
| F | A courtesy or junk phrase is not a follow-up (§ 5c) | ★ `[KB]` | Sonnet 5.5 high | `py_modules/backend/knowledge/kb_followup_memory.py`, the follow-up region of `py_modules/backend/ask/game_ai_request.py`, their tests | nothing |
| R | The route look: revealed steps saved beside the ticks in the back end's per-game save, cleared with them (§ 5d) | ★ `[KB]` | Sonnet 5.5 high | the strategy checklist files on the screen side, `py_modules/backend/strategy/strategy_checklist_session_service.py`, `strategy_checklist_rpc.py`, tests | nothing |
| V | Hide more on the screen side: a cover on a no-story game stays shut under Hide more (§ 5e) | ★★ `[KB]` | Sonnet 5.5 high | `src/features/spoilers/unwrapAskedEntitySpoilerFences.ts`, the two answer-bubble files, one pass-through in the transcript and the Main tab payload, tests | nothing; lands before U and J are cut |
| W | The Search tab lands on the "How much to hide" row (§ 5f) | ★ `[KB]` | Haiku 5.5 high (trial); Sonnet medium if it stalls | `src/features/search-tab/bonsaiSettingsIndex.ts`, `src/features/settings/SettingsTabSpoilerTierRow.tsx`, their tests | nothing |
| Y | The Yoshi's Story note (§ 5g) | ★ `[KB]` | Haiku 5.5 high (trial) | section 376 of `data/kb/strategy_seed.json` | nothing |
| N1, N2, N3, N4 | Enemy and item notes for Baldur's Gate 3, GTA San Andreas, The Sims 4, Portal 2 (§ 5i, call 2) | ★★★★ `[KB]` | Sonnet 5.5 high | one new file each under `data/kb/notes/`, with a sources sidecar | nothing to write; nothing lands before your quality read |
| X | The seven AI measurements, one after another on this PC (§ 5j) | ★★ `[KB]` | Sonnet 5.5 medium (a long job of one checkable kind) | nothing in the repo; numbers in its report, report files to the workshop | the library build; its second half waits for T, P and N to land |
| U | Thumbs-down follow-ups: the tag clears on Undo; a "Lowered notes: N · Clear" row; the back end lists and clears (§ 5h) | ★★ `[KB]` ui | Opus 5.5 medium; the advisor reads it before landing | `py_modules/backend/knowledge/kb_demote_store.py`, `rag_corpus_rpc.py`, `main.py` (two methods), `src/features/knowledge-library/KnowledgeBaseSection.tsx`, `buildKbNotesBlockElement.tsx`, `src/features/answer/reply-actions/useReplyDemote.ts`, the transcript, tests | V landed (they share the transcript file) |
| J | "Suggest as a tip" (§ 5i, call 6) | ★★★★★ `[KB]` | Sonnet 5.5 high; the security reviewer reads the diff; the advisor before landing | `src/features/answer/reply-actions/buildReplyActionsElement.tsx`, `replyMicroActions.ts`, a new hook, a new `py_modules/backend/notes/kb_tip_suggestion_service.py`, `rag_corpus_rpc.py`, `main.py` (one method, its last commit), tests | V landed; its last commit after U lands |
| Q | Blind search questions for the new notes, from the entity names only (call 2) | ★★ `[KB]` | Sonnet 5.5 medium | new rows in `tests/fixtures/kb_eval_v2.json` | T landed; the names from N1 to N4 (never the notes) |
| M | Bugs found tonight with a known cause | ★ to ★★ | Sonnet 5.5 high (judgment) or medium (mechanical) | as found | as found |

**Where lanes would collide, and how the order avoids it.** V, U and J all touch the chat transcript file (one
pass-through each): V lands first and is small; U and J are cut from the new tip; U lands before J's last commit,
because both add a plugin method to the same two back-end files. T and Q both write the search-test fixture: Q is cut
after T lands. P is the only lane in the prompt file. R changes the shape of the checklist save, not the plugin
methods. The content lanes each own one new file, which is what plan 98's lane A0 made possible. The measurement lane
and the library build both use this PC's AI model: the build runs first, then X.

**Bugs bumped above Sonnet, and why.** U adds a new control with its own focus stop (a button beside Remove) and
changes what the notes block draws; plan 98 gave the same kind of work to Opus medium with the advisor's read before
landing, and the Deck row is the gate. Nothing else here is screen plumbing of that kind.

### 5a. Troubleshooting tips (T)

What the second opinion of 2026-10-24 spelled out, nothing more. The five tips (crash drops you to the library; storage
full; crashes at launch; blank or black screen; find the PC) gain the plain words people type, in their own text, so the
word search can find them: "home screen", "closes on its own", "quits", "shuts off"; "not enough space", "no space left",
"can't install"; "won't open", "won't start", "nothing happens when I launch"; "black screen", "goes black"; "can't find
my PC", "my computer is not in the list", "same network". The router's topic words gain the same phrases, so a question
with them is sent to the tip sheet at all. Two new tips (call 3). Then the 24 blind sentences get their right topic and
their right tip written into the fixture (today both are blank, so no gate can run), and the measuring script learns to
read the tip. **Measured by lane X before and after:** how many of the 24 reach a tip, and how many reach the right one
(8 and 6 today). **A wrong word match attaches a wrong tip**, which the second opinion called worse than none: every new
word is checked against the fixture questions that must still attach what they attach today. **Deck check
(P100-TIPS-01, block L1):** three plain sentences typed with nothing running reach the crash, launch and storage tips; a
boss question attaches no tip.

### 5b. The two prompt lines (P)

One clause in the checklist instruction: a step that needs an item or ability ends with "Needs: <the thing>", in the
exact shape the panel already parses (it draws a "Needs" line only when a step carries one). One line in the picture
rules: when a running game is named, the picture is from that game; name no other. Both are tested as prompt text, and
lane X measures their effect: the answer test for the first, the screenshot scoring script for the second. **Deck check
(P100-NEEDS-01, block L1):** a "how do I get to the first boss" question in Hollow Knight by name draws at least one
step with a "Needs" line. **PC measurement (P100-PICTURE-HINT):** the God of War pictures with the game handed over
name God of War more than 5 times in 9.

### 5c. Courtesy phrases are not follow-ups (F)

The lookup corrected the roadmap: the "it" rule does catch "what time is it", but "thank you very much" has no "it" and
never reaches that rule. It repeats the old answer because, on Strategy and Expert turns, the previous question and
answer are handed to the AI whenever the new question names no boss or enemy, with no check at all. The fix: a short
guard before that hand-over and before the remembered subject is added to the search: a question that is a courtesy or
a junk phrase (thanks, hello, ok, a question about the time or the weather, under eight words, no game word) carries
nothing forward and searches nothing. A small list plus a shape rule, tested with the twelve junk phrases the measuring
script already holds, and with "how do I beat it" still counting as a follow-up. **Deck check (P100-THANKS-01, block L1,
Deep Rock Galactic: Survivor running, a fresh chat):** after a boss question, "thank you very much" gets a short reply
with no notes block; "what time is it" the same; "how do I beat it" still answers about the boss.

### 5d. The route look's revealed steps (R)

The lookup corrected the roadmap again: Clear cache and leaving Strategy do **not** forget the revealed steps today;
they clear the ticks and leave the revealed steps in the panel's browser storage, so a route can come back with later
steps open and nothing ticked. Only Clear all data removes them. The fix is the one the roadmap names: the revealed
steps travel in the same per-game save as the ticks (one list, one file, one clear), and the browser-storage copy goes.
**Deck check (P100-ROUTE-SAVE-01, block L1):** reveal two steps and tick one; close and reopen: both kept; Clear cache:
both gone together.

### 5e. Hide more on the screen side (V)

The screen opens a cover by itself on a game in its no-story list, unless the cover names a protected note; it never
reads the "How much to hide" setting. Under Hide more the back end already asks for covers on those games, so the screen
undoes the back end's work. The fix: the setting reaches the cover rule (one pass-through), and under Hide more the
no-story rule is skipped; Default and Hide less behave exactly as today (tested on the existing cases). **Deck check
(P100-HIDE-MORE-SCREEN-01, block L1):** Hide more, a Mario Kart 64 question by name that gets a cover: the cover stays
shut; Default: the same question's cover opens by itself. A spoiler fix is not believed until the Deck shows a cover
(lessons § 3); two differently worded questions per tier.

### 5f. The Search tab lands on the row (W)

Only three Settings rows register themselves as a jump target today (Text size, the voice model picker, Clear all
data); every other row falls back to its section line, and an existing test pins that for Story spoilers. The fix copies
Text size's one line into the tier row, adds the index entry "How much to hide", and turns that test around. Mechanical,
one obvious way, so Haiku (trial). **Deck check (P100-SEARCH-TIER-01, block L1):** search "spoilers", A: the ring lands
on the Default button of the row.

### 5g. The Yoshi's Story note (Y)

Section 376 says "24 levels split across four worlds of six pages" and also "only six levels are played in any one run".
The game has six worlds (pages) of four levels. The brief gives the exact replacement sentence; nothing else in the note
changes; the cited Mario wiki page stays the source, re-read by the lane with the fetcher and the date refreshed.
**Check (P100-YOSHI-01):** the built library's section 376 reads the new sentence; on the Deck, after the test-library
install, a "how do the worlds work in Yoshi's Story" question quotes six worlds.

### 5h. Thumbs-down follow-ups (U)

Two bugs, one lane. The "ranked lower by you" tag reads a copy saved with the answer, and Undo changes the store but
never that copy, so the tag stays. Nothing lists or clears lowered notes: no plugin call, no screen control. Build: two
back-end functions (list, clear all) and two plugin methods whose names carry the knowledge base's machine word; the
notes block reads the live state of the mark, so Undo clears the tag on the same answer; a row in the Knowledge base
section beside Remove, "Lowered notes: N", with Clear behind the same confirm-box pattern Remove uses, hidden when N is
0. Focus: a new stop in a section that already has a chain, built the way Remove is. **Deck check (P100-LOWERED-01,
block L2):** mark a note, Undo: the tag goes; mark two notes: the row reads 2; Clear: the row hides and both notes come
back on a reworded question.

### 5i. "Suggest as a tip" (J, call 6) and the four games' notes (N1 to N4, call 2)

**J.** A button in the reply row, shown only under a finished answer. A writes a valid note record (the five required
fields of a section: an id in a reserved "suggested" range, the game, the kind, a name, the text; no source; "suggested
by a player" in the text) as a file in the Desktop notes folder the existing Desktop notes permission already guards,
and shows one line: the file name and a GitHub new-issue link with the title filled in. No network call; the Deck has no
browser in the panel, so the link is text to copy or type. The security reviewer reads the change (a file write and a
built link). **Deck check (P100-SUGGEST-01, block L2):** the button under an answer; A writes the file (read over SSH);
the line shows; with the Desktop permission off, the line says to enable it.

**N1 to N4.** Each lane takes one game and writes ten to fifteen enemy and item notes in the labelled short-line shape
(Summary, Weak points or Uses, Tips), one new file under the notes folder plus a sources sidecar naming the page and
revision each sentence came from. Section ids: N1 1000 to 1099, N2 1100 to 1199, N3 1200 to 1299, N4 1300 to 1399 (the
seed stops at 467; a repeat stops the build). Sources per game are in call 2. Every sentence is read against its page
before the lane reports, line by line, the lesson from the Brotato, Palworld and Skyrim notes. The session reads one
game's notes aloud in the chat for your quality read before any note lands; the other three wait on that read. **Deck
check (P100-FOUR-GAMES-01, block L2):** with the test library installed, a Portal 2 enemy question by name attaches its
new note; the same for one GTA San Andreas item.

### 5j. The seven AI measurements (X, one after another on this PC)

Before the landings: (1) the search fixture gate as a baseline (every question's attached notes, saved); (2) the tips
reach, 24 sentences, with the meaning search on (8 and 6 today); (3) Hide more against Default on the answer test, a
second run (23 against 29 covers on 2026-10-24, not understood); (4) Hide less's no-contradiction rate, a second run
(90.7 percent against 100 on one run); (5) the zero-score made-up question: does a question with no keyword support
attach nothing if the floor says so, and does any right-note question lose a note if it does. After the landings: (6)
the tips reach again, and the fixture gate again with the new notes (no right note lost; the new notes' own questions
found in the first three); (7) the answer test with the "Needs" clause (facts kept and contradictions against the
2026-10-24 Default run) and the screenshot scoring script on the 8 pictures (75 and 42 in 100 today). Each report goes
to the workshop's research folder; the lane only reports numbers; the numbers decide whether the four "measure first"
bugs close or stay.

### 5k. The bookkeeper's two audits (K0 at go, K9 at the end)

The pre-go audit reads every entry in the knowledge-base roadmap against its newest dated note, the testing rows and
the code lookups, and fixes in one commit, every change named in its report: the "Where things stand" paragraph (it
says the library is 2026.09.26; 2026.10.17 has been published since, and a 2026.10.25 build with 351 tap-to-define words
waits for your publish); the route-look entry's symptom (§ 5d); the "thank you" entry's cause (§ 5c); the "Lowered
notes" entry's wording (the Knowledge base section is in the Ollama tab, not Settings); any status word that disagrees
with its newest note; any entry over five lines; every link resolving. The end-of-session audit does the same after the
last landing and the last Deck block, and checks each entry moved this session names its row and its evidence file.
**The roadmap is current at every step**: the bookkeeper sweeps after every landing and every Deck block, and § 12 gets
two lines, committed.

## 6. The Deck, in blocks

One driver per block, a fresh one each time with the last handover. Every block starts by reading `deck_status` (the
lease free, the stop switch off), takes the keep-awake lock, reads which screen is live, backs up the settings, reads
the build, and uses only the test chat "test". Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`.
Evidence `plan100-<ROW>.json`, one file per check, never overwritten; a screenshot beside every look the maintainer
judges from the checks page (plan 98 block KS's rule). **Unload the Deck's AI before launching a game; never reload the
plugin with a game running.**

| Block | When | What | Needs |
|---|---|---|---|
| L0 | Minute zero, the build already on the Deck, no deploy | Setup. **The knowledge-base smoke pass** (plan 98's runbook K0, re-runnable), this time with Show details opened and its notes chip read (the half KB-SMOKE-02/04 still owes). **Plan 98's thumbs-down pictures** (KS.4) if block KS did not take them. **The junk phrases in a fresh chat** (P98-JUNK-PHRASES-try2) with the game running. **The hidden spoiler box on a game known only by name** (STRAT-SPOIL-NAME-01) if Doom 64 is on Recent Games. **The four stale saved walks re-saved** from their own start state (P98-K1-REPLAYS), named one by one. **Two route questions**, differently worded, read for an "If you want to cheat" section (call 5's count). | Deep Rock Galactic: Survivor; the Deck's AI; Doom 64 launched by hand |
| L1 | After the wave 1 landings and one deploy with the test library | One check per landed fix: P100-TIPS-01, P100-NEEDS-01, P100-THANKS-01, P100-ROUTE-SAVE-01, P100-HIDE-MORE-SCREEN-01, P100-SEARCH-TIER-01, P100-YOSHI-01; the look check on each screen touched (QA-LOOK-01); the free-play sweep with and without a game. | the new build |
| L2 | After the wave 2 landings | P100-LOWERED-01, P100-SUGGEST-01, P100-FOUR-GAMES-01; second rounds. | the new build |
| LR | The end, final build | The knowledge-base smoke pass again; every saved knowledge-base walk replayed by name; **put the library back:** Remove, then Download from the published site to the place the settings named at L0, the version read back; settings restored key by key; pinned test chips cleared; the game closed; the Deck's models as at L0. | — |

**A new check the maintainer alone can do** goes onto the checks page, in a "plan 100" group, never left in chat: the
Lowered notes row by eye; the Suggest as a tip line by eye; the two new tips read for truth; ten of the plain-word tip
edits read against the tip they sit in; the widest chip labels (the one Phase 4 item left, call 8); one game's notes
before anything lands (call 2).

## 7. The second opinion (Fable 5.1 at max, the maintainer's choice)

The `advisor` helper at max effort, read-only, one bounded question with the exact files and evidence, one
recommendation back. At most five.

| # | When | The question |
|---|---|---|
| 1 | Before wave 1 is cut | The briefs against the code: does any brief name a cause the code does not have, a file another lane owns, or a Deck pass that its tests cannot stand for? (Plan 98 skipped this consult and corrected four briefs at go by hand.) |
| 2 | Before U's screen half is built | The "Lowered notes" row and the live-state tag: the one shape that fits the Knowledge base section's chain and the focus law, and the test that would fail without it at the level the Deck check looks at. |
| 3 | Before landing U and before landing J | The diff against the focus rules and the Deck row: any plain focus hop across containers? Does a test fail without the change at the Deck's level? For J also: is the file write and the link safe (the security reviewer's read in hand)? |
| 4 | When any item has failed on the Deck twice | For that batch: what the two failures say, and what to try third. |
| 5 | Before the report | What to tell the maintainer first, what to leave open, which items must not be called done. |

Log, one row per consult: time, the question in one line, the answer in one line, what it changed, the cost.

| Time | Question | Answer | What changed | Cost |
|---|---|---|---|---|
| 2026-10-25 21:55 to 22:13 UTC | Consult 1: do the fourteen briefs match the code at `a734d950`? | Ten hold with small word fixes (T, P, W, Y, N1 to N4, X, Q); F, R, U and V need corrections first; J has one wrong cause (Copy is the bubble's corner icon, not a reply-row button) | F: a junk phrase also skips the library search and never updates the remembered subject. R: the state type file added; Clear cache has no screen-side reset, so the test and the Deck check close and reopen the panel first. V: the Copy path's own unwrap added; the carrier files named; a hand-down count may trip. W: the exact two-registry shape written in; the Story spoilers index row retargeted. T: tips 110 and 111 are Steam Frame tips, left alone; new tip ids 165 and 166. N: "sixteen" cards is 101. U and J: the hand-kept fake plugin file added to both. J's button goes in the reply row as its own stop (the session's call). | about 189k tokens, 18 min |
| 2026-10-25 22:58 to 23:08 UTC | Consult 2: the one shape for the "Lowered notes" row and the live-state tag, and the tests that fail without them | The row is one more copy of the Update/Remove shape (a horizontal container, words and one A-only button, no move handlers, no B handler) under the action row, found by Steam's own column flow and skipped when absent; the Reply style line's Up hop checks the Clear button first; the confirm box reuses Remove's pattern and re-arms its return to Remove (or Download) because the Clear row vanishes. The tag reads the demote hook's existing "marked on this answer" state: tag = saved flag true OR in this answer's picked; no undone set (the brief's rule would hide a tag when an earlier mark remains). The walk harness for the Ollama tab is foldedTabWalk, not the answer-pane one. | Lane U's task text for commits 3 and 4 rewritten to this shape; three files granted beyond its list (the Up hop, its threading, the modal return id). The brief's "beside Remove" read as under the row, never a third slot; its tag rule dropped. | about 158k tokens, 10 min |
| 2026-10-25 23:19 to 23:29 UTC | Consult 3a: lane U's diff against the focus rules, before landing | Land it: no plain focus across containers, no move handler on the row, the Up hop is the sanctioned in-body hop and the chain is whole when the row is absent; the box re-arms Remove or Download. Remove is never a Down landing (Right from Update only), as the Deck record agrees. A test fails without each change at the Deck check's level. | The L2 check's walk written as switch → Update → Clear, Right for Remove; the ring read after Cancel (on Clear) and after Clear (on Remove, the row gone); the focus-graph record for the bookkeeper. | about 124k tokens, 9 min |
| 2026-10-26 00:25 to 00:35 UTC | Consult 3b: lane J's five commits against the focus rules and the security list, before landing | Land as they are: the new stop is built like Helpful, every chain reaches it through the registry, no loop; A on Helpful now lands on the button (one more stop, not a regression); the plugin method meets every item of the security list. | The L2 runbook's refusal step changed to a fresh question (the button is inert after a good save) with a focus read after A on Helpful; saved walks through the rating row gain a stop and are re-saved, not failed; one stale sentence in the focus record for the bookkeeper. | about 176k tokens, 10 min |
| 2026-10-26 00:58 to 01:08 UTC | Consult 5: what to tell the maintainer first, what must not be called done, what to leave open | Open with: nothing is Deck-checked and one measurement went the wrong way; hedge every "a player notices" line as "should"; the thank-you fix is the one most likely to fail on the Deck; move the publish gate, the picture sentence and the missing "can't find my PC" tip to the maintainer's list; fix seven claims that ran ahead of the log (the sweep count, the full check, the entry counts, the Hide more rows under Before/After). | Every edit applied to § 13 before it was written in. | about 86k tokens, 9 min |

## 8. Things to bring to the maintainer's attention

- **This plan was written in a cloud chat that could not reach the Deck, your PC's AI, the workshop or the wikis.**
  Every brief was checked against the code by read-only lookups, not by running anything; the session checks them again
  at go, as plan 98 did (four corrections that night).
- **Three roadmap entries describe the code wrongly**, found by the lookups: the route look's revealed steps survive
  Clear cache (the entry says they are forgotten); "thank you very much" is not caught by the "it" rule at all (the
  entry says it is); the Knowledge base section is in the Ollama tab (the entry proposes a Settings row). The
  bookkeeper's pre-go audit fixes the words; the fixes in § 5 are built against the code, not the entries.
- **The "Where things stand" paragraph is a month stale**: it names the 2026.09.26 library; you published 2026.10.25
  (351 tap-to-define words, 414 notes, 164 tips) on 2026-10-25 and both channels read back byte for byte. The
  bookkeeper's pre-go audit rewrites the paragraph.
- **Fable orchestrates at your choice.** The routing table puts an Opus 5.5 extra-high chat in this seat and Fable only
  where five- and six-star decisions are planned; this plan has one five-star item, so the planning half fits and the
  landing half is above the table.
- **The Doom 64 hand launch** (call 10) is the only way the hidden-box row runs; it has been blocked five times.
- **The new library needs your publish.** Four games' notes and the Yoshi fix reach other people's Decks only after the
  publish command runs from your hands; the 2026-10-25 build with the glossary words is still waiting for it too.
- **Baldur's Gate 3's wiki is NonCommercial** and cannot feed notes; its lane may write fewer notes than the others.
- **Plan 98's block KS ran on 2026-10-25:** each glossary word underlined once and the spoiler row's ring both passed
  (the ring needed a second fix: a switch's edge moves must sit on a wrapper, now a lesson). Both rows wait only for a
  docs sweep to Done; the bookkeeper's pre-go audit does it. Whether KS took the thumbs-down pictures is read from its
  handover; block L0 takes them if not.
- **A new chat bug from block KS:** in the test chat, now over 40 questions long, a Strategy question first spent 68
  seconds summing the chat up and then gave up ("Couldn't sum up the chat this time"). Not a knowledge-base bug, but
  every Deck block asks in that chat; the runbook says to record the line as a sighting and carry on, and lane M takes
  it if a cause shows up.
- **The usage-limit restart is not reliable.** If the limit hits while you are away, a "Continue" restarts the session.
- **Haiku runs on W and Y are logged** in plan 33 § 4d, as the trial requires; a miss that needs Sonnet counts against it.

## 9. Standing rules while nobody is watching

Plan 98 § 9 in full: the library is never published from the session; a new library reaches the Deck only through the
Developer tab's install route and is put back at the end; a content lane never writes a sentence it cannot point at in
a page the fetcher read; evaluation reports are never committed to this repo; a lane that touches the retrieval service
lands alone, with the fixture check in its landing log; the test chat only. Plus: every roadmap move names the row it
owes, and nothing moves to Done without its evidence file.

## 10. Keeping the PC and the Deck awake

As plan 98 § 10: the desktop app plus `keep_awake.py` for the PC; the rig's keep-awake lock with `ttlMinutes: 480`
renewed by every driver; the 20-minute wake check plus a background sleep job before any pause.

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
  (plan 37) gets a dated paragraph; the checks page gets its group; plan 33 § 4b and § 4d get their rows.
- `python scripts/verify.py --full` passes on the tip before the maintainer is asked to push.

## 12. Progress log and questions

- **2026-10-25, cloud planning chat:** plan written, then rewritten once the maintainer said the work runs on the PC.
  **About 21:00: the maintainer answered:** "plan the plan as listed" (the defaults on all fourteen), pushes allowed
  for the planning chat, usage 53 percent of the five-hour window (resets within the hour) and 53 percent of the week
  (resets Wednesday morning). The helper rules, the briefs (K0, T, P, F, R, V, W, Y, N1 to N4, X, U, J, Q, the M
  template) and Deck runbook L0 were written and pushed with the plan. Budget note for the session: with the week at
  53 percent and two and a half days to its reset, this wave is likely to spend a large share of what is left; read the
  counter before each wave and start no helper past 90 percent (call 14, raised from 80 by the maintainer). ~~Do not start lanes in the last minutes before
  the five-hour window resets.~~ **Wrong. The session followed it on purpose and it cost twenty minutes (22:00 to 22:20 UTC):** what is left in a window
  is lost at its reset, so a ready helper always starts at once (the maintainer, 22:40 UTC; now a rule in AGENTS.md).
- **2026-10-25, later:** five commits from the maintainer's PC reached `experimental` while this chat planned: the
  library 2026.10.25 published and read back from both channels; block KS run, with the first-mention underlines and the
  spoiler row's ring passed on the Deck (the ring after a second fix, now a lesson about Steam's switch and a wrapper); a
  new chat bug (the summing-up of a long chat gave up); a lesson on settings snapshots that restore themselves. The plan,
  the K0 and W briefs, the helper rules and runbook L0 were corrected for them and the plan commits were put on top.
- **2026-10-25, later still: the maintainer raised the weekly budget line from 80 to 90 percent**, for this session and
  going forward (call 14 amended; the five-hour line stays 75). Written into AGENTS.md, the bug-wave runbook and the
  D128 entry the same evening.
  Findings while planning: the cloud container has no Deck, no Ollama, no workshop, and the wikis are refused by its
  network rule, so it can only plan; the screen-side packages installed and the type check, the bundle and the Python
  suite (3,029 tests, 70 seconds) all passed there, so the tip is green. Six Haiku lookups mapped every lane's files
  and found the three roadmap-versus-code mismatches in § 8. The fourteen calls in § 2 are open.

- **2026-10-25, 21:50 UTC, the session on the maintainer's PC (Fable 5.1 high): go.** Tip `a734d950`, tree clean, D137
  free. Usage at go: 54 percent of the five-hour window (resets 22:19 UTC) and 54 percent of the week. Deck: no live
  lease, rig armed. The full check passed on the tip (255 s). Today's published library build (2026.10.25, every meaning
  vector) was copied into `build/knowledge-base` and into all thirteen wave 1 copies; no rebuild needed. Plan 98's
  thumbs-down pictures exist in the workshop, so L0.4 is skipped. Block L0 and advisor consult 1 started at once.
- **22:00 UTC: K0 landed** as `6d25f6b1` (the top paragraph, the three reworded entries, the two rows to Done, D137
  written; "KB visual maps" set to PARTIAL). Code lanes wait for the window reset and consult 1.

- **22:13 UTC: consult 1 back.** Ten briefs hold, four need corrections (F, R, V, W get them in their task text), one wrong
  cause in J (the Copy button is the bubble's corner icon, so "Suggest as a tip" goes in the reply row as its own stop
  instead; settled when J is cut after V lands). All corrections are in § 7's row. Wave 1 starts at the window reset.

- **22:14 UTC: Deck block L0 done** (handover [assets/100-handover-L0.md](assets/100-handover-L0.md)). Setup PASS; the
  smoke pass with Show details PASS (the third note reads "Boss note (spoiler)" on screen and "False Knight" in the log: a
  hidden-name label, recorded); the four stale walks re-saved and replayed PASS; the junk phrases FAIL twice as expected
  before lane F ("thank you very much" got 93 words of boss advice, "what time is it" attached three notes); the route
  questions: 0 cheat sections in 2, but **neither route question drew a step list** (both answers were one paragraph; a
  sighting for lane P's Deck check and lane M); the chip row showed one chip only ("How to use bonsAI", text fits).
  **Doom 64 was not on Recent Games**, so the hidden-box row could not run (sixth time): the maintainer's hand launch is
  still needed. The Deck is left on Speed, no game, keep-awake until 05:55 UTC, settings backup on the Deck.

- **22:30 UTC: wave 1 started** (T, P, F, R at 22:21; V, W, Y, X at 22:25; N1 to N4 at 22:29), each with its brief plus
  consult 1's corrections. Usage at the start: 71 percent of the old five-hour window at its reset, 57 percent of the week.
- **22:32 UTC: lane P explains the route sighting.** A question typed fresh in Strategy mode gets the branch-menu
  instruction, never the step-list one; the step list (and so the "Needs" line) is asked for only on a follow-up, which a
  branch button sends. So block L0's two plain-paragraph route answers are by design, not a bug, and the "Needs" Deck
  check must press a branch button first; block L1's runbook will say so. Also: the golden fixture fingerprints the whole
  Strategy follow-up prompt, so a deliberate prompt change updates that one hash (the spoiler paragraph stays byte for
  byte); lane P was told to go.

- **22:37 UTC: the budget rule committed** (`bcb6cdbd`, the maintainer's call: a ready helper starts at once; holding
  workers back is the maintainer's choice alone). **Landed:** F (`811fb977`, `426af298`), P (`e1c58a3d`, `ed612062`; the
  Strategy follow-up fingerprint updated on purpose). **Done in their copies, landing in turn:** Y, R (three commits), V
  (two), W (Haiku, one commit after one message), N1 (seven Baldur's Gate 3 notes: Wikipedia has no fight advice, so five
  are lore; **the maintainer read them in the chat and chose to land all seven, with a Verify entry in the knowledge-base
  roadmap for their own read**), N2 (fifteen GTA San Andreas notes, body armor included). Still building: T, N3, N4; X is
  on its Hide more answer run (its first two numbers: 8 of 24 sentences reach a tip, 7 right by hand; search 88.1 in a
  hundred in the first three on the held-back questions). Lane F's note: the chat history itself may still carry the
  boss advice into a thank-you reply; the Deck check decides.

- **23:00 UTC: lane T done** (six commits, one more asked for tip 126 and the one test line that pins it): of the 24
  blind problem sentences, 17 reach a tip (8 before) and 13 reach the right one (5 before); nothing that was right went
  wrong. Two sentences in the new tips go beyond the tips they were built from ("pick the headphones"; "try the crash
  tips"): on the maintainer's read list. No "can't find my PC" tip exists; the lane's proposed text is in its report.
  The lane overwrote one eval report file in the workshop and restored it from the p100 copy (the script writes its JSON
  even with the no-report flag: a one-star bug for lane M). **Lane N3 done** (fifteen Sims 4 notes; licence set to 3.0
  by hand because the fetcher prints it bare). Found: seed note 112 ("Fires") says there are no firefighters in The
  Sims 4; the wiki says they were added in a patch and come when a smoke alarm sees the fire; the two fire notes now
  disagree (lane M).
- **23:00 UTC: lane X, first half (items 1 to 5), all on this PC's model, reports in the workshop's research folder.**
  Search: the right note is in the first three 88.1 times in a hundred on the held-back questions (the blend that
  ships; meaning-only 89.0, keyword 81.8). Tips before T: 8 of 24 reach a tip, 7 right by hand. **Hide more against
  Default, second run:** 20.6 against 23.8 covers per 100 answers (23 against 29 on 2026-10-24); the two Hades story
  rows drew their cover the same under both (3 of 3 and 2 of 3), so Hide more missed no story cover Default kept this
  time; contradictions 92.6 against 88.9 percent clean. **Hide less, second run:** 94.4 percent clean (90.7 before).
  **The zero-score made-up question:** a floor at "no keyword support" clears Zorblax and Grimthak but loses 3 right
  notes; the house and the Bone Hydra questions score about 3.6 to 3.8 and a floor there loses 19 right notes; the
  "No close match" line already shows on all four. The numbers say: no new floor. The bookkeeper writes these into the
  four "measure first" entries at the next sweep.

- **22:56 UTC: landed** Y (`551ca270`), R (three commits, tip `0152f6fa`), V (two commits, tip `eab4f33e`); W landing.
  **Lane N4 done** (fourteen Portal 2 notes). Two things in its brief were wrong: the wiki's api address needs `/w/`
  (`https://theportalwiki.com/w/api.php`), and the wiki rate-limited every page render after a few requests, so the lane
  read the same revisions' text through the wiki's normal query call with a small stand-in script that writes the same
  provenance header; the sidecar names page and revision as usual. **Lane Q done** (102 blind questions, two per note, in
  one commit; a second commit widens the fixture's label test to read the four games' notes files, which it read only
  from the seed before, so every new question would have been a "phantom" even after the notes landed). **Wave 2 cut at
  22:57 UTC** from `eab4f33e`: U (Opus medium; stops after its back-end half for consult 2) and J (Sonnet high; the
  button in the reply row as its own stop; its plugin-method commit waits for U). Consult 2 asked at the same time.
  Runbook L1 written: [assets/100-runbook-block-L1.md](assets/100-runbook-block-L1.md) (the "Needs" check presses a
  branch button first; the test library goes in through the Developer tab after the deploy).

- **23:30 UTC: the wave 1 chain landed** T (tip `ae8c59b6`), N1 (`5e4af55d`), N2 (`dd4df3d1`), N3 (`06b8abd0`), N4
  (`ace6314f`) and Q's two commits; Q's landing then failed the label test on ten GTA rows whose names had lost their
  bracketed part (the session's slip in passing the names on); Q fixed the ten in its copy (`b39818a8`), landing after
  the deploy. **The bookkeeper's wave 1 sweep** landed as `0e2b9b54`: seven entries to Deck check owed naming their rows,
  the Baldur's Gate 3 Verify entry for the maintainer's read, two new Bugs entries (the two Sims 4 fire notes that
  disagree; the eval script that always writes its JSON), nine testing rows, six changelog lines. **Lane U done** (four
  commits); consult 3a read the diff: land it; Remove is never a Down landing (Right from Update only), which the L2 walk
  must say; the focus-graph record needs the new chain (bookkeeper, wave 2 sweep). **The library with the new notes**
  built on this PC: 465 notes, 166 tips, every vector; lane X's second half started on it in a fresh copy. **Deploy for
  block L1 started 23:34 UTC.**

- **23:40 to 00:05 UTC: the Deck path is blocked, and a real find.** The L1 driver started here had no rig tools (the two
  project servers vanished from this chat at about 22:00 UTC and are not listed even as failed); a Deck session cannot be
  started from Remote Control, so the maintainer was asked to type a message from the desktop app, reconnect the servers,
  or open a new chat ("Run plan 100 Deck block L1"; runbook L1 carries every fact that chat needs). Q's label fix landed
  (`b6292ca6`) and the label test passes; the Python suite then showed one more failure: the router's false-positive test,
  because the bare word "storage" routed the two blind Weighted Storage Cube questions (Portal 2) to the storage-full tip,
  exactly the wrong-tip attach the second opinion called worse than none. Lane T replaced the bare rule with pairs
  (`1f11d3a8`; zero of the 706 fixture questions changed their routing); landing, then U.
- **00:10 UTC: lane X, second half (items 6 and 7), on the landed tip's library (465 notes).** **Search:** the right note is
  in the first three 90.8 times in a hundred (88.1 before) on the held-back questions; the 102 new blind questions: 100
  of 102 found in the first three (86 first); the two misses are a Baldur's Gate 3 and a Sims 4 question. Five old
  questions dropped out of the first three (the Portal 2 gels, the BG3 class, an audio tip, two GTA rows): the new notes
  crowd the old ones on the same subject. **Tips:** 17 of 24 reach a tip (8), 15 of 22 reach the right one (5), none a
  wrong one. **The answer test** on first turns: contradictions down (96.3 clean against 88.9), menus up a point, but
  **facts kept fell from 76.3 to 67.2 in a hundred**; six questions went from 3 of 3 to 0 of 3, one (the Portal 2 gels)
  lost its card to the three new gel notes. The "Needs" clause is not in those prompts (first turns only; the two-turn
  pairs drew no checklist at all in 48 turns), so the drop is the library's, not the prompt's; it needs a read, and the
  maintainer's call. **The picture line did not help:** with the game handed over the AI named it 58 and 50 times in a
  hundred over two runs (75 on 2026-10-24); the God of War asks named another game 4 and 6 times in 9 (4 before); two
  runs differ by up to 21 points, so the noise is large, but nothing improved. The screenshot entry stays PARTIAL with
  these numbers; the "measure first" entries get the first-half numbers.

- **00:21 UTC: wave 2 landed.** U (four commits, tip `3a63a5d4`; consult 3a: land) and J (five commits, tip `3ddbb2b5`;
  the security reviewer's read and consult 3b: land; the one ★ finding fixed before landing). Every lane of the plan is
  on `experimental`; the bookkeeper's wave 2 sweep next, then the deploy for block L2. Runbook L2 corrected per consult 3b
  (a fresh question for the refusal half; a focus read after A on Helpful; saved walks through the rating row gain a stop).

- **00:29 UTC: the wave 2 build deployed** (156 files verified; hash `222279568b09`; the seed library's version string
  rolled to 2026.10.26 with the date). **The bookkeeper's wave 2 sweep** landed as `fd1d0ba6` (the two lane U entries and
  "Suggest as a tip" to Deck check owed; the storage rule noted; the measurements written into the four "measure first"
  entries as "the maintainer decides"; a new ★★ Bugs entry for the new notes crowding the old; the focus-graph record
  updated; the knowledge-base roadmap trimmed back under its 25 KB ceiling by moving text to its details file). The
  bookkeeper's caution: two earlier runs on the old library differed by up to 6 points on facts kept, so the 9-point
  drop is a weak signal until the six questions are read. **The FOSS reviewer's read** (§ 14) sent four small sidecar
  fixes back to the note lanes; landing. Runbook L2 now carries the build facts and runs L1's checks first, since L1
  never ran.

- **01:20 UTC: the night closed.** The full check passed on `2f31c81e` (every lane landed; 307.8 s). The four sidecar
  fixes landed (`20faeea5`, `f9aed98a`, `609afcb8`, `86e7dbe7`; no note text changed). The end audit landed as `02b1286b`
  (thirteen entries marked "not run; the rig dropped"; six calls in "Calls waiting on you"; Phases 4 and 7 closed by call 8;
  the status report and plan 33 § 4b updated; the checks page group left as more than mechanical). Consult 5 read the
  report draft and its edits were applied. Usage at close: 87 percent of the five-hour window, 68 percent of the week.
  **Owed:** the Deck round from a chat with the rig (runbook L2 runs L1's checks first), the restore round, the
  maintainer's six reads and six calls, the push, the publish.

- **2026-10-26, 01:09 to 01:50 UTC: the Deck round ran** in its own session on this PC (the maintainer typed from the
  desktop app so it could start), on build `222279568b09` with the night's library installed; stopped by the usage limit
  before the restore. Handover: [assets/100-handover-L2.md](assets/100-handover-L2.md). **PASS:** the Search tab row, the
  Yoshi note (six worlds quoted), the lowered-notes row and tag (the tag shows on the opened note card; Clear emptied the
  file), "Suggest as a tip" (the file written, the refusal line; the saved line sits behind the dock until the ring moves
  down), the route save across a close and reopen, the Portal 2 turret note, the look check, the sweep (no repeat, no lost
  ring; the answer bubble's stop is 96 percent visible behind the dock chip). **FAIL:** the tips check, one of three: "my
  game keeps closing on its own" in the Hollow Knight test chat got three Hollow Knight notes and no tip (the log: "no game
  running or named -- using the chat's own game Hollow Knight"; the closing-on-its-own words are weak like "crash" and the
  chat's own game counts as named); storage and black-screen reached their tips. The thank-you check: "thanks a lot for
  that" and "what is the date today" searched no notes (the fix held there) but the AI wrote 52 and 65 words repeating the
  earlier advice, because the chat's own history still reaches it (lane F's flagged risk); "how do I kill them" was about
  the acid spitters. The four games: Portal 2 PASS; GTA FAIL twice ("in GTA San Andreas what does body armor do" went to
  the chat's own game Portal 2; "Grand Theft Auto San Andreas: how does body armor work" logged "names a game the library
  does not know (grand theft auto)" and searched nothing; the library knows game 9 as "Grand Theft Auto: San Andreas - The
  Definitive Edition"); Sims 4 MEASURED (the new Fire note came, with the older "Fires" note first, and the smoke alarm
  note did not); Baldur's Gate 3 MEASURED. **UNCLEAR:** the "Needs" line (two tries, no step carried one; the AI wrote
  "Acquire Mothwing Cloak dash ability" with no "Needs:"); Hide more on screen (Mario Kart 64 drew no cover in four tries
  under either setting; the tests stand for it); the route save after Clear cache (the file's entry was gone, but Clear
  cache also wiped the open view and routes are not kept in a saved chat, so the "covered again" half could not be seen).
  **Not restored:** the mode chip (Strategy), the Developer tab switch (on), the night's library still installed.

## 13. Report

Written 2026-10-26, 01:20 UTC, by the session (Fable 5.1 high) at the end of the night. **Every lane is built and on the
experimental branch, but none of it has been checked on the Deck:** the rig's tools dropped out of this chat at about
22:00 UTC after the opening round, so every check of the landed work is still owed and nothing below is done. **One
measurement went the wrong way after the 51 new notes landed:** on this PC's answer test the AI kept the note's facts 67
times in a hundred, down from 76 (two earlier runs differed by up to 6 points), so read the six questions that lost their
facts before you publish the library. The new picture sentence in the prompt made no measurable difference. Nothing is
pushed or published. The full check passed on the tip before the end audit's docs commit; a quick check passed after it.

### 13.1 What you must do next

1. **Run the Deck round.** Open a new chat on this PC (or type one message in this chat from the desktop app so it can
   start one) and say: "Run plan 100 Deck block L2." Its runbook ([assets/100-runbook-block-L2.md](assets/100-runbook-block-L2.md))
   carries every fact and runs the first round's checks (block L1) before its own, since that round never ran. The build
   on the Deck is the last code build (`222279568b09`; the four source-record fixes that landed after it change no note
   text, so the Deck's library is the final one); the night's library sits in the Deck's seed folder and goes in through
   the Developer tab. Then the restore round (block LR, plan § 6) puts the published library back and restores every
   setting. Thirteen entries wait on this.
2. **Read six things with your own eyes.** Four you can read now: the seven Baldur's Gate 3 notes (`data/kb/notes/baldurs-gate-3.json`;
   you chose to land them; five are tabletop lore with no fight advice); the two new troubleshooting tips (ids 165 and
   166 in the tip sheet: sound to the TV instead of headphones; menus out of place on a TV), each marked "Researched,
   unconfirmed" and built from existing tips, with two sentences that go beyond them ("pick the headphones"; "try the
   crash tips"); ten of the plain-word tip edits (tips 125, 76, 126, 152, 154); the chip-row pictures (one chip only
   showed). Two have no picture yet, the Lowered notes row and the "Suggest as a tip" line (it says "Saved <file>" without
   naming the Desktop folder or saying to attach the file to the issue); they go on the checks page after the Deck
   round. The roadmap's "Calls waiting on you" block lists all six; the checks page's plan 100 group is still to be made
   (the bookkeeper found it more than a mechanical edit).
3. **Six calls the measurements left** (the entries say "the maintainer decides"): close or keep the Hide more against
   Default entry (20.6 against 23.8 covers per 100, no story cover missed; both runs before anything landed); the Hide
   less entry (94.4 percent clean); the zero-score floor entry (no new floor; the "No close match" line already shows);
   whether the facts-kept drop (76.3 to 67.2 in a hundred after the 51 notes landed; run-to-run noise up to 6 points) is
   real: read the six questions that went from 3 of 3 to 0 of 3 (the Portal 2 gels, Cyberpunk 02, Fallout 4 05, Baldur's
   Gate 3 01, GTA V 01, Hollow Knight 03) in the workshop's research folder, `kb-answer-eval-2026-10-25-p100-needs.md`;
   keep or drop the picture sentence in the prompt (it measured no gain, and every prompt sentence costs every turn with
   a picture); and a "can't find my PC" tip: none exists, so that sentence still reaches nothing; lane T drafted one
   (§ 14). Say whether you want it, marked unconfirmed.
4. **Push** when you are back (`BONSAI_ALLOW_PUSH=1`, then `git push origin experimental`): § 13.7 says the full check
   passed on the final code tip. **Publish the library** only after the Deck round for the four games passes, you have
   read the Baldur's Gate 3 notes, you have decided whether the facts-kept drop is real, and you have said whether the
   older Sims 4 fire note gets fixed first (the two fire notes disagree): `python scripts/kb/build_rag_db.py --seed --out build/knowledge-base`,
   then the publish command from docs/knowledge-base.md. The published library is still 2026.10.25 (414 notes, 164 tips).
5. **Doom 64: Retribution** still needs your hand launch once, left on Recent Games, before the hidden-box row can run
   (blocked six times now).

### 13.2 What a player notices

What the work is built to do; none of it has been seen on the Deck, so read every line as "should". Once the build and
the library reach a Deck: "my game keeps closing on its own", "no space left" and "the screen goes black" should each
reach a tip (17 of 24 such sentences now, 8 before; 15 reach the right tip, 5 before; none a wrong one); two new tips for
TV sound and TV menus, both marked unconfirmed; "thank you very much" and "what time is it" should get a short reply with
no notes, the boss still remembered for "how do I beat it" (this is the fix most likely to fail on the Deck, because the
chat's own history still reaches the AI); the steps you opened on a route are kept with your ticks and cleared with
them; Hide more keeps a cover shut on a game with no story; searching Settings for "spoilers" lands on the "How much to
hide" row; "ranked lower by you" clears the moment you press Undo, and the Knowledge base section shows "Lowered notes:
N" with a Clear button; "Suggest as a tip" under an answer writes a note file to the Desktop and shows the link to send
it in; Yoshi's Story's note says six worlds of four levels; Baldur's Gate 3, GTA San Andreas, The Sims 4 and Portal 2
have enemy and item notes (7, 15, 15, 14; five of Baldur's Gate 3's seven are lore, not fight advice), and 100 of 102
blind questions about them find their note in the first three, though five older questions lost theirs to the new
notes. The route step's "Needs" line and the picture line are in the prompt; the first needs the Deck check (a branch
button must be pressed first), the second measured no gain.

### 13.3 The code work by area

- **Troubleshooting tips (lane T, Sonnet high, 8 commits).** Five tips reworded with the words people type, two new
  tips (165, 166), the router's word lists given the same phrases as pairs, the 24 blind sentences labelled with their
  topic and tip, the measuring script printing "reach the right tip". Found on the way: the bare word "storage" routed
  any question to the storage tips (a Portal 2 cube question got the storage-full tip); it now needs a second word.
  Files: `data/kb/compat_patterns.json`, `py_modules/backend/knowledge/compat_topic_router.py`,
  `scripts/measure_kb_floor_holdout.py`, the fixture, three test files.
- **Two prompt lines (lane P, Sonnet high, 2 commits).** The checklist instruction asks for ". Needs: <thing>" on a step
  that needs an item; the picture rules say the running game is the game in the picture. The whole-prompt fingerprint
  for the Strategy follow-up was updated on purpose (the spoiler paragraph is byte for byte). The prompt grows from 6012
  to 6321 characters on a Strategy follow-up with a picture. Learned: a question typed fresh gets the branch menu,
  never the step list; the step list comes only after a branch button (`strategy_guide_parse.py`), so the opening
  round's two plain paragraphs were by design.
- **Courtesy phrases (lane F, Sonnet high, 2 commits).** `kb_followup_memory.py` gains a whole-phrase junk check;
  `game_ai_request.py` skips the library search, passes no subject or previous answer, and leaves the remembered subject
  alone on a junk turn. Open: the chat history itself may still carry boss advice into a thank-you reply; the Deck check
  decides.
- **The route save (lane R, Sonnet high, 3 commits).** The per-game save gains `revealed` beside `checked_ids`; the panel
  reads opened steps from the checklist state; the browser-storage copy is gone. A reveal travels as a third word on the
  existing toggle callback, so six intermediate files were not touched; widening their type is a clean follow-up.
- **Hide more on screen (lane V, Sonnet high, 2 commits).** The tier travels on the per-turn spoiler facts from the Main
  tab payload through the transcript to the bubble and to Copy; under "strict" the no-story rule is skipped.
- **The Search tab row (lane W, Haiku high, 1 commit).** One holder in two registries; the Story spoilers index row
  retargeted to the tier row; one more test file needed one line (the lane stopped and asked, correctly).
- **The Yoshi note (lane Y, Haiku high, 1 commit).** One sentence, the page re-read, the date refreshed.
- **Thumbs-down follow-ups (lane U, Opus medium, 4 commits).** The store lists and clears; two plugin methods; the tag
  reads the live "marked on this answer" state (tag = saved flag OR in this answer's picks; no undone set, which would
  hide a tag when an earlier mark remains); the "Lowered notes: N" row in a new file, built like Remove, hidden at 0;
  Up from the Reply style line lands on Clear first. Known and not fixed: an older answer's saved tag stays until a new
  question.
- **"Suggest as a tip" (lane J, Sonnet high, 5 commits).** A writer that builds a five-field section record and writes
  it create-only under `Desktop/bonsAI_logs/suggested-tips/` from a name built only from the game slug and the clock; a
  plugin method that checks the Desktop permission first; a button in the reply row as its own stop (the plan's "beside
  Copy" was wrong: Copy is the bubble's corner icon); the stop stands in for the note card's Keep, so A on Helpful now
  lands on it. The security reviewer: sound, one ★ finding (a lone surrogate half left an empty file) fixed before landing.
- **The four games' notes (lanes N1 to N4, Sonnet high).** One file and one sources sidecar per game under
  `data/kb/notes/`; every sentence quoted from its page at a named revision; four sidecar hygiene follow-ups from the
  licence read, which found nothing that blocks publishing. Baldur's Gate 3 could use only Wikipedia (its wiki is
  NonCommercial).
- **The blind questions (lane Q, Sonnet medium, 3 commits).** 102 rows; the fixture's label test now reads the notes
  files; ten names lost their bracketed part on the way from the note lanes to Q (the session's slip) and were fixed.
- **The measurements (lane X, Sonnet medium).** Seven, before and after, reports in the workshop's research folder
  (`*-2026-10-25-p100-*`). Numbers in § 13.6.
- **Bookkeeping.** The pre-go audit (`6d25f6b1`), three sweeps (after the opening round, wave 1, wave 2), the end audit
  (`02b1286b`). The budget rule (AGENTS.md, 'Helper lanes').

### 13.4 What popped up and how it was handled

- **The twenty-minute hold.** The session held twelve ready helpers for the five-hour window's reset, on purpose,
  following the guide's own sentence; the maintainer called it dishonest and set the rule: a ready helper starts at once,
  and holding workers back is their choice alone. Written into AGENTS.md, the runbook, the lessons file (the sequence,
  with the maintainer's words quoted) and the decisions file.
- **The rig's tools vanished from the chat** at about 22:00 UTC (the two project servers gone from the session, not
  even listed as failed). The opening round had already run; every later driver would have been blind; a Deck session
  could not be started from Remote Control. The deploys went out anyway (plain SSH), the runbooks carry every fact, and
  the Deck round waits for a chat with the rig.
- **The guide over its size ceiling.** The first budget-rule commit took AGENTS.md to 26.16 KB and lane P's landing
  failed its quick check on the 26 KB ceiling; the sentence was shortened and a finished plan's aside dropped (25.9 KB).
- **Two fixture slips, both the session's or the briefs'.** The label test read only the seed (fixed by lane Q); ten
  GTA names lost their bracketed part in the hand-over (fixed). And a real find behind them: the bare "storage" rule.
- **The golden fixture.** It fingerprints whole prompts, not only the spoiler paragraph; a deliberate prompt change
  updates one hash. The brief's "must not change" meant the paragraph.
- **Effort reports.** Lanes T and U and one bookkeeper run said they ran at low effort although their helper files set
  high or medium; unverified whether the launcher honours the front-matter effort. Logged in plan 33 § 4b.

### 13.5 What failed and why; what is left

- **The Deck round did not run** (the rig). Owed: the tips check (P100-TIPS-01), the Needs line (P100-NEEDS-01), the
  thank-you reply (P100-THANKS-01), the route save (P100-ROUTE-SAVE-01), Hide more on screen (P100-HIDE-MORE-SCREEN-01),
  the Search tab row (P100-SEARCH-TIER-01), the Yoshi note (P100-YOSHI-01), the look check (QA-LOOK-01-p100), the
  free-play sweep (P100-L1-SWEEP), the Lowered notes row (P100-LOWERED-01), Suggest as a tip (P100-SUGGEST-01), the four
  games' notes (P100-FOUR-GAMES-01), then the restore round (the smoke pass again, the saved walks, the library put back).
- **The hidden box on a game known only by name** could not run for the sixth time (Doom 64 not on Recent Games).
- **The picture line measured no gain** (58 and 50 in a hundred named the game with it handed over, 75 before; the God
  of War mix-ups 4 and 6 in 9, 4 before; noise up to 21 points). The screenshot entry stays PARTIAL.
- **Facts kept fell** 76.3 to 67.2 after the 51 notes landed (noise up to 6 points); five held-back questions lost
  their note from the first three to the new notes on the same subject. A ★★ Bugs entry carries it; your read decides.
- **Not built, by call:** the card style pass, the deeper answer checks, the "If you want to cheat" prompt line (0
  sightings in 2). **Not built, no call covered it:** a "can't find my PC" tip (§ 13.1 item 3).
- **Open bugs found tonight (★):** the two Sims 4 fire notes disagree about firefighters (seed note 112 against the new
  note 1200); the search-test script writes its JSON report even with the no-report flag. Still open from the
  maintainer's own round on 2026-10-25, before this plan ran: the summing-up of a long chat gave up once.

### 13.6 The numbers

| | Before | After |
|---|---|---|
| Of 24 plain problem sentences, reach a tip / the right tip | 8 / 5 | 17 / 15 (0 wrong) |
| Right note in the first three, held-back questions (the blend that ships) | 88.1 in 100 | 90.8 in 100 |
| The 102 blind questions for the new notes, found in the first three | — | 100 of 102 (86 first) |
| Facts kept, first-turn answer test | 76.3 in 100 | 67.2 in 100 (needs a read) |
| No contradiction, first-turn answer test | 88.9 in 100 | 96.3 in 100 |
| Picture test, named the game with it handed over | 75 in 100 | 58 and 50 in 100 (two runs) |
| Library | 414 notes, 164 tips | 465 notes, 166 tips (29 of 38 games with enemy and item notes) |
| Knowledge-base Bugs entries not accepted | 15 | 10 (7 older, 3 new; 4 wait on your call) |
| Half-done entries | 4 | 3 (Phases 4 and 7 closed by your call; Phase 5, the screenshot measurement and the visual maps stay) |
| Entries waiting on a Deck check | 1 | 13 |

Measured before anything landed, both runs (first run 2026-10-24, second 2026-10-25; nothing built tonight touched
them): Hide more against Default drew 20.6 against 23.8 covers per 100 answers (23 against 29 the first time), with no
story cover missed; Hide less was 94.4 in 100 clean of contradiction (90.7 the first time).

Usage: 54 percent of the five-hour window and 54 percent of the week at go; 87 and 68 at 01:15 UTC. The five-hour line
(75 percent) was passed after the last helper had been started; the weekly line (90) was never reached.

### 13.7 The checks on the tip

`python scripts/verify.py --full` passed on `2f31c81e`, the last code tip with every lane landed (307.8 s, every set
green). Two docs-only commits followed (the end audit `02b1286b` and this report); the quick check passed after them.

### 13.8 A plain developer guide to what changed

- A troubleshooting question reaches the tip sheet only when the router finds a topic word pair in it; the pairs live in
  `compat_topic_router.py`, the tips' own words are what the word search indexes, and the 24 blind sentences in the
  fixture now say which tip is right, so `measure_kb_floor_holdout.py` can score them.
- A thank-you, greeting or time/date/weather question is "junk": no library search, no remembered subject, no previous
  answer, and the memory untouched (`kb_followup_memory.is_courtesy_or_junk_phrase`).
- A route's opened steps are part of the per-game checklist save (`revealed`), not browser storage.
- The "How much to hide" setting reaches the screen's cover rule through the per-turn spoiler facts; "strict" skips the
  no-story rule.
- The thumbs-down marks can be listed and cleared (`list_rag_corpus_demotes`, `clear_rag_corpus_demotes`); the tag on
  screen is the saved flag OR a mark made on this answer.
- "Suggest as a tip" is `suggest_rag_corpus_tip`: permission first, a create-only JSON write under the Desktop notes
  folder, a fixed new-issue link with an encoded title.
- Notes for a game can live in their own file under `data/kb/notes/` with a sources sidecar; the builder merges them
  after the seed; the fixture's label test reads them too.

## 14. Subagent reports and follow-ups

**Lane T's proposed Deck network tip (not written, call for the maintainer):** "Researched, unconfirmed: if the Deck
can't find your PC, put both on the same home network. On the PC, Ollama must accept connections from other devices
and port 11434 must pass the firewall; point bonsAI at the PC address followed by :11434." Built only from tips 110
and 111; it would need router pairs ("cant find" with "pc"; "my computer" with "list"; "same network"). Fixture rows
19 and 20 stay unlabelled until a tip exists. **Effort reports:** lanes T and U said they ran at "low" effort and lane
W at "default" although their helper files set high or medium; whether the launcher honours the front-matter effort is
unverified (plan 33 § 4b). The advisor (Fable max, § 7): every consult logged above (five used: 1, 2, 3a, 3b, 5). The security reviewer: reads lane J's diff before it lands,
recorded here. **2026-10-25 23:10 to 23:14 UTC, lane J's three commits read:** the write, the link and the content are
sound; nothing blocks landing. The file name comes only from the game's name and the clock; the folder is a constant
checked before and after links are followed; the file is opened create-only so it never overwrites; the link is one
constant address plus a URL-encoded title. One ★ finding: a lone surrogate half in the text would leave a 0-byte file
behind (a one-line fix, handed to the lane). The plugin method, not yet written, is the only permission guard once
wired; its required shape (the permission check first, home from the plugin's own setting, five string arguments only)
was handed to the lane and the session reads that commit against it before landing. About 78k tokens, 3 min. **The plugin method landed as written** (`0705a8a5`; the session and consult 3b read it against the list: every item
holds). **The FOSS reviewer, 2026-10-26 00:30 to 00:35 UTC, read the four note files and their sidecars:** nothing blocks
publishing; every section carries its four source fields with a versioned licence the library may carry (Wikipedia CC
BY-SA 4.0; the GTA and Sims wikis CC BY-SA 3.0, which the repo's licensing plan, NOTICE.md and D20 already settle for
Fandom's bare line; the Portal wiki CC BY 4.0); no address points at Baldur's Gate 3's NonCommercial wiki. Four small
findings, handed back to the four lanes the same night: the Portal 2 sidecar lacked the licence line and the card lines
(★★, because that lane read the pages with its own script); the GTA sidecar lacked the licence header (★); eleven
quotes across the four sidecars stop one clause short of the words the card uses (★); NOTICE.md lacks rows for
Wikipedia and the Sims wiki (★). About 125k tokens, 4 min. The FOSS reviewer: reads the four note lanes' sidecars for licence (ShareAlike sources are fine; GFDL
and NonCommercial are not), recorded here. Focus and layout: lane U carries the advisor's read before landing (consult
3) and its Deck row is the gate.
