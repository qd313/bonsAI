# 100 — The knowledge base: finish the half-done phases, fix the open bugs, build "Suggest as a tip", with the Deck alongside

Written 2026-10-25 by the planning chat (Fable 5.1, the maintainer's choice) in a **cloud session that only plans**;
the work runs in a new chat on the maintainer's PC. Sources: the knowledge-base roadmap and its long notes at tip
`a03dd48`, plan 98 and its report, the lessons file, the bug-wave runbook, and six read-only code lookups by Haiku
helpers (each checked against the roadmap; three mismatches found, § 8). Plain language on purpose: this file is for
the maintainer first.

**Status: READY for "Run plan 100" on the maintainer's PC.** The maintainer answered the calls in § 2 on 2026-10-25
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
  counter before each wave and start no helper past 90 percent (call 14, raised from 80 by the maintainer). Do not start lanes in the last minutes before
  the five-hour window resets.
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

## 13. Report

Not yet written.

## 14. Subagent reports and follow-ups

The advisor (Fable max, § 7): every consult logged above. The security reviewer: reads lane J's diff before it lands,
recorded here. The FOSS reviewer: reads the four note lanes' sidecars for licence (ShareAlike sources are fine; GFDL
and NonCommercial are not), recorded here. Focus and layout: lane U carries the advisor's read before landing (consult
3) and its Deck row is the gate.
