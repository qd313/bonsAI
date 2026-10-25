# 100 — The knowledge base: finish the half-done phases, fix the open bugs, build "Suggest as a tip"

Written 2026-10-25 by the planning chat (Fable 5.1 at high, the maintainer's choice) in a **cloud session**, from the
knowledge-base roadmap and its long notes at tip `a03dd48`, plan 98 and its report, the lessons file, the bug-wave
runbook, and six read-only code lookups by Haiku helpers (each checked against the roadmap; three mismatches found,
§ 8). Plain language on purpose: this file is for the maintainer first.

**Status: DRAFT, waiting for the maintainer's calls in § 2.** Nothing started; nothing on the Deck touched (this
session cannot reach the Deck at all, see § 8 first item).

**Who runs it:** this chat, **Fable 5.1 at high**, orchestrates and lands (the maintainer's choice; the routing table
would put an Opus 5.5 extra-high chat here). **Sonnet 5.5 high** lanes build everything that needs a judgment;
**Sonnet 5.5 medium** does the bookkeeping and the fixture rows; **Haiku 5.5 high** (on trial, logged in plan 33 § 4d)
does the two one-star mechanical fixes; **Opus 5.5 medium** builds the one new screen control, as plan 98 did. A lane
that fails twice moves up one tier without asking. A **Fable 5.1 max** second opinion (the `advisor` helper) is asked
at most five times, each logged (§ 7). The `bookkeeper` (Sonnet 5.5 medium) files every roadmap, testing and changelog
change, and audits the knowledge-base roadmap before the first lane starts and after the last one lands.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1, 2 and 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [docs/roadmap-kb.md](../roadmap-kb.md) and
[its long notes](../roadmap-kb-details.md); [plan 98](98-kb-feature-wave-and-deck-test-wave.md) §§ 5, 12 and 13 (the
last knowledge-base wave; its briefs are the shape to copy).

**Files for this plan:** the helper rules `assets/100-helper-rules.md`, the briefs `assets/100-lane-briefs.md` and the
Deck-and-PC runbook for the local follow-up session `assets/100-runbook-local-followup.md` are written once the calls in
§ 2 are answered (the scope decides which briefs exist). Evidence files, when the Deck half runs on the maintainer's PC:
`plan100-<ROW>.json` in the workshop's `test-evidence` folder.

---

## 1. One sentence

Fix the nine open knowledge-base bugs that need no Deck or AI model to fix, finish the troubleshooting-tips wording the
second opinion spelled out, build "Suggest as a tip", close the two half-done phases that have nothing left to build by
your call, write the enemy and item notes for the four thin games if this machine is allowed to read their wikis, keep
the knowledge-base roadmap correct at every step, and leave one written runbook so the Deck checks and the AI
measurements this session cannot run happen in a later session on your PC.

## 2. The maintainer's calls (open)

Each question with the recommendation and the default in brackets. Say the number and your answer; "defaults" takes
every default. They become decision **D137** (D136 was the last; the session re-checks the tail of the decisions file at
go).

1. **Where this runs.** This chat is in the cloud: no Deck, no controller rig, no Ollama, no workshop folder, and the
   game wikis are refused by the environment's network rule. It can build code, tests, content and documents, run every
   repo check, and push. It cannot run a single Deck check or any measurement that asks the AI a question.
   *Recommendation: build here now; the Deck checks and the AI measurements go into one runbook (§ 6) for a follow-up
   session on your PC ("Run plan 100's Deck half"). The other choice is to move the whole plan to your PC and have this
   chat only plan. Default: build here, Deck half later.*
2. **Push.** The repo's hook refuses any push unless you allow it for the session, and the house rule is "never push
   without the maintainer's word". In the cloud, unpushed work vanishes when the container is reclaimed.
   *Recommendation: allow pushes to `experimental` for this session, one push after every landing, so nothing is ever
   more than one landing from safe. Default: no push until you say "push"; the session says so in § 12 each time work
   is at risk.*
3. **Scope.** In: the troubleshooting tips wording (T), the two prompt lines (P), courtesy phrases are not follow-ups (F),
   the route look's revealed steps saved with the ticks (R), Hide more applied on the screen side (V), the Search tab
   landing on the "How much to hide" row (W), the Yoshi's Story note (Y), the thumbs-down follow-ups with a "Lowered
   notes" row (U), "Suggest as a tip" (J), and closing Phases 4 and 7 by call (call 10). In if call 4 allows it: the
   enemy and item notes for the four thin games (N1 to N4) and their blind questions (Q). Out: the card style pass, the
   deeper answer checks, more keyword-blind questions, the online and versus content, the catalog phase, and every bug
   that needs the Deck or the AI model to even look at (the six listed in § 5i). *Recommendation: as listed. Default:
   as listed.*
4. **The four thin games' notes (Phase 5).** Every note sentence must come from a source page the fetcher read, and this
   machine's network rule refuses the wikis (bg3.wiki, gta.fandom.com, sims.fandom.com, theportalwiki.com,
   en.wikipedia.org, archive.org all answered "refused by the proxy"). You can allow them: the cloud environment menu in
   this session's title bar, Edit, Network access, add those hosts under Allowed domains (steps:
   https://code.claude.com/docs/en/cloud-environments#network-access). Baldur's Gate 3's wiki is NonCommercial, so its
   notes stay own-words either way. *Recommendation: allow the hosts if it is two minutes for you; then the four lanes
   run here, and nothing lands until you have read one game's notes (the quality read the Phase 5 plan asks for).
   Default: out of this session; the lanes are written into the follow-up runbook.*
5. **Two new troubleshooting tips** with no tip today: sound going to the TV instead of plugged-in headphones, and menus
   out of place on a TV. Every tip in the sheet is in your own words with no source page. *Recommendation: lane T writes
   both, marked "Researched, unconfirmed" like the four tips that already carry that mark, for your read in the report.
   Default: yes.*
6. **Where a lowered note can be seen and cleared.** Undo shows only under the newest answer, so three marks leave a
   note out for good with nothing to see or clear. *Recommendation: a row in the Knowledge base section (it sits in the
   Ollama tab, beside Remove): "Lowered notes: 3", with Clear and a confirm box, and "Show details" losing its "ranked
   lower by you" tag the moment Undo is pressed. The other shape, a list with one Undo per note, is bigger and waits for
   a Deck measurement. Default: the row.*
7. **The "If you want to cheat" section** seen once in a route answer. *Recommendation: skip; one sighting, and every
   prompt sentence costs every Strategy turn. Watch for a second. Default: skip.*
8. **"Suggest as a tip"** (five stars, kept out of plan 98 until the reply row landed; it has). A button under an answer
   writes a valid note record to your Desktop notes folder and shows a GitHub new-issue link. *Recommendation: in, one
   Sonnet high lane, the security reviewer reads its change (it writes files and builds a link). Default: in.*
9. **Optional lanes if the others finish early:** deeper answer checks (questions no note can answer, scored for an
   honest "I don't know"), and more keyword-blind search questions. *Recommendation: out. Default: out.*
10. **Close two half-done phases by call.** Phase 4 has nothing left to build: its last item is your own eye on the
    widest chip labels, already on your checks page. Phase 7's two leftovers belong elsewhere: add-on packs to the
    catalog phase (Phase 8), a screenshot feeding the search to the screenshot entry. *Recommendation: close both, the
    leftovers moved, not dropped. Default: close both.*
11. **Models**, as you asked, with two notes. Fable high orchestrates and lands (this chat). Sonnet high: T, P, F, R, V,
    J, N1 to N4, M. Sonnet medium: Q, the bookkeeper. Haiku high: W and Y (mechanical one-star fixes, logged). Opus
    medium: U (a new control, as plan 98's D and H). Bump one tier after two failures. The bookkeeper is Sonnet, not
    Haiku: Haiku lost sentences while saying it had not in the blind bookkeeping trial (plan 83). The advisor is Fable at
    max, five consults at most. *Default: as listed.*
12. **Usage figures.** Read both counters (the five-hour window and the week) and say them at go; the cost hook cannot
    read them and was never calibrated. *Default: not read; the session starts no new helper past the budget line
    (call 14) on its own guess.*
13. **Standing rules while you are away** (plan 98's call 13, kept, plus the cloud lines): a fix that fails twice moves
    up one model tier; a new one- or two-star bug gets one helper round of about an hour; anything blocked gets the
    safest choice at once and is written in § 12; never publish the library, never merge to main, never switch branches
    in the shared checkout; push only as call 2 allows. *Default: kept.*
14. **Budget line:** no new helper past 75 percent of the five-hour window or 80 percent of the week (D128). *Default:
    kept.*

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
- **Screenshots: the running game is the game in the picture.** The AI is told so plainly; whether it listens is
  measured in the follow-up session (today it ignored the name 4 times in 9).
- **Yoshi's Story's "Starting out" note stops contradicting itself** (six worlds of four levels).
- If call 4 allows it: **Baldur's Gate 3, GTA San Andreas, The Sims 4 and Portal 2 get enemy and item notes**, so "how
  do I deal with X" has a note to stand on for those games too.

**How much better shape the knowledge base is in afterwards.** Counted from the roadmap at tip `a03dd48`:

| | Today | After this session, if everything lands |
|---|---|---|
| Open bugs (not accepted) | 15 | 6 (five need the Deck or the AI model to look at; one is call 7) |
| Half-done ("PARTIAL") entries | 4 (Phases 4, 5, 7; the screenshot measurement) | 1 or 2 (the screenshot measurement; Phase 5 unless call 4 allows the notes) |
| Five-star features built | 0 | 1 ("Suggest as a tip") |
| Deck checks owed on knowledge-base rows | 2 | about 12 (every fix here owes one; § 6 lists them) |
| AI measurements owed on your PC | 3 | 7 (§ 6) |

The honest reading: this session turns bugs into "Deck check owed" and half-done phases into closed ones, and it
leaves a longer Deck list than it found, because it cannot run one. The follow-up session on your PC clears that list.

## 4. Before go

**The maintainer, about ten minutes:**

1. Answer § 2 (by number, or "defaults").
2. If call 2 is yes: say "pushes allowed". The session then sets the hook's allow switch for itself and never for a
   helper.
3. If call 4 is yes: add the wiki hosts to the environment's Allowed domains (the steps are in call 4), then say so;
   the session re-tests each host before cutting the note lanes.
4. Read the two usage counters and say them (call 12).

**The session's first acts (the first thirty minutes), in this order:**

0. Commit this plan and its asset files, staged by name and nothing else, so every helper's copy carries them.
1. `git status`, the tip hash, the tail of the decisions file (this plan's entry is D137; if taken, the next free
   number, said here). No Deck step: there is no Deck.
2. The baseline on the tip, once, in the shared checkout: the type check, the bundle, the screen tests, the Python tests
   (3,029 passed here in 70 seconds on 2026-10-25), the focus check, then `verify.py --quick`.
3. Build the library once without meaning vectors (`build_rag_db.py --seed`; Ollama is absent, so the build prints
   "Skipping embeddings" and the word search still works) and copy it into every lane's copy. Every helper's rules say
   plainly: no meaning-search number from this machine means anything.
4. Start the **bookkeeper's pre-go audit** (§ 5j) and **wave 1** (§ 5) together, two to three minutes apart; land the
   audit first.
5. Ask the advisor consult 1 (§ 7) while wave 1 builds.

## 5. The work: what can run in parallel, and what cannot

**The rule for parallel lanes is files, not features.** Two lanes never own the same file. Everything not named as a
wait runs at the same time. Up to twelve helpers at once, started a few minutes apart; each runs only its own tests at
two workers; the full checks run once per landing, in the shared checkout.

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| K0 | The bookkeeper's pre-go audit of the knowledge-base roadmap (§ 5j) | ★ docs | Sonnet 5.5 medium | `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md`, the knowledge-base rows of `docs/testing.md` | nothing; lands first |
| T | Troubleshooting tips: five tips get plain words, two new tips, the router's topic words get the same words, the 24 test sentences get their right topic and tip written in, the measuring script reads them (§ 5a) | ★★★ `[KB]` | Sonnet 5.5 high | `data/kb/compat_patterns.json`, `py_modules/backend/knowledge/compat_topic_router.py`, the 24 `V2-W2-SYM` rows of `tests/fixtures/kb_eval_v2.json`, `scripts/measure_kb_floor_holdout.py`, their tests | nothing |
| P | Two prompt lines: the checklist asks for "Needs: …" on a step that needs an item or ability; the picture rules say the running game is the game in the picture (§ 5b) | ★ and ★★ `[KB]` | Sonnet 5.5 high | `py_modules/backend/prompts/ollama_prompts.py`, its tests | nothing (the only lane in the prompt file) |
| F | A courtesy or junk phrase is not a follow-up (§ 5c) | ★ `[KB]` | Sonnet 5.5 high | `py_modules/backend/knowledge/kb_followup_memory.py`, the follow-up region of `py_modules/backend/ask/game_ai_request.py`, their tests | nothing |
| R | The route look: revealed steps saved beside the ticks in the back end's per-game save, cleared with them (§ 5d) | ★ `[KB]` | Sonnet 5.5 high | the five strategy checklist files on the screen side, `py_modules/backend/strategy/strategy_checklist_session_service.py`, `strategy_checklist_rpc.py`, tests | nothing |
| V | Hide more on the screen side: a cover on a no-story game stays shut under Hide more (§ 5e) | ★★ `[KB]` | Sonnet 5.5 high | `src/features/spoilers/unwrapAskedEntitySpoilerFences.ts`, the two answer-bubble files, one pass-through in the transcript and the Main tab payload, tests | nothing; lands before U and J are cut |
| W | The Search tab lands on the "How much to hide" row (§ 5f) | ★ `[KB]` | Haiku 5.5 high (trial); Sonnet medium if it stalls | `src/features/search-tab/bonsaiSettingsIndex.ts`, `src/features/settings/SettingsTabSpoilerTierRow.tsx`, their tests | nothing |
| Y | The Yoshi's Story note (§ 5g) | ★ `[KB]` | Haiku 5.5 high (trial) | section 376 of `data/kb/strategy_seed.json` | nothing |
| U | Thumbs-down follow-ups: the tag clears on Undo; a "Lowered notes: N · Clear" row; the back end lists and clears (§ 5h) | ★★ `[KB]` ui | Opus 5.5 medium; the advisor reads it before landing | `py_modules/backend/knowledge/kb_demote_store.py`, `rag_corpus_rpc.py`, `main.py` (two methods), `src/features/knowledge-library/KnowledgeBaseSection.tsx`, `buildKbNotesBlockElement.tsx`, `src/features/answer/reply-actions/useReplyDemote.ts`, the transcript, tests | V landed (they share the transcript file) |
| J | "Suggest as a tip" (§ 5i, call 8) | ★★★★★ `[KB]` | Sonnet 5.5 high; the security reviewer reads the diff; the advisor before landing | `src/features/answer/reply-actions/buildReplyActionsElement.tsx`, `replyMicroActions.ts`, a new hook, a new `py_modules/backend/notes/kb_tip_suggestion_service.py`, `rag_corpus_rpc.py`, `main.py` (one method, its last commit), tests | V landed; its last commit after U lands |
| N1 to N4 | Enemy and item notes for Baldur's Gate 3, GTA San Andreas, The Sims 4, Portal 2 (call 4) | ★★★★ `[KB]` | Sonnet 5.5 high | one new file each under `data/kb/notes/`, with a sources sidecar | the wikis reachable; nothing lands before your quality read |
| Q | Blind search questions for the new notes (call 4) | ★★ `[KB]` | Sonnet 5.5 medium | new rows in `tests/fixtures/kb_eval_v2.json` | T landed; the entity names from N1 to N4 (names only, never the notes) |
| M | Bugs found this session with a known cause | ★ to ★★ | Sonnet 5.5 high (judgment) or medium (mechanical) | as found | as found |

**Where lanes would collide, and how the order avoids it.** V, U and J all touch the chat transcript file (one
pass-through each): V lands first and is small; U and J are cut from the new tip; U lands before J's last commit,
because both add a plugin method to the same two back-end files. T and Q both write the search-test fixture: Q is cut
after T lands. P is the only lane in the prompt file. R changes the shape of the checklist save, not the plugin
methods. The content lanes each own one new file.

**Bugs bumped above Sonnet, and why.** U adds a new control with its own focus stop (a button beside Remove) and
changes what the notes block draws; plan 98 gave the same kind of work to Opus medium with the advisor's read before
landing, and the Deck row is the gate. Nothing else here is screen plumbing of that kind.

### 5a. Troubleshooting tips (T)

What the second opinion of 2026-10-24 spelled out, nothing more. The five tips (crash drops you to the library; storage
full; crashes at launch; blank or black screen; find the PC) gain the plain words people type, in their own text, so the
word search can find them: "home screen", "closes on its own", "quits", "shuts off"; "not enough space", "no space left",
"can't install"; "won't open", "won't start", "nothing happens when I launch"; "black screen", "goes black"; "can't find
my PC", "my computer is not in the list", "same network". The router's topic words gain the same phrases, so a question
with them is sent to the tip sheet at all. Two new tips (call 5). Then the 24 blind sentences get their right topic and
their right tip written into the fixture (today both are blank, so no gate can run), and the measuring script learns to
read the tip. **Measured here, word search only** (no Ollama): how many of the 24 reach a tip, and how many reach the
right one, before and after; today's 8 of 24 was with the meaning search on, so the two figures are not the same
measure, and the brief says so. **A wrong word match attaches a wrong tip**, which the second opinion called worse than
none: every new word is checked against the 568 fixture questions that must still attach what they attach today.
**Deck check (P100-TIPS-01, local follow-up):** three plain sentences typed with nothing running reach the crash, launch
and storage tips; a boss question attaches no tip.

### 5b. The two prompt lines (P)

One clause in the checklist instruction: a step that needs an item or ability ends with "Needs: <the thing>", in the
exact shape the panel already parses (it draws a "Needs" line only when a step carries one). One line in the picture
rules: when a running game is named, the picture is from that game; name no other. Both are tested as prompt text. Their
effect on answers can only be measured on your PC: the answer test for the first, the screenshot scoring script for the
second (§ 6). **Deck check (P100-NEEDS-01):** a "how do I get to the first boss" question in Hollow Knight by name draws
at least one step with a "Needs" line. **PC measurement (P100-PICTURE-HINT):** the God of War pictures with the game
handed over name God of War more than 5 times in 9.

### 5c. Courtesy phrases are not follow-ups (F)

The lookup corrected the roadmap: the "it" rule does catch "what time is it", but "thank you very much" has no "it" and
never reaches that rule. It repeats the old answer because, on Strategy and Expert turns, the previous question and
answer are handed to the AI whenever the new question names no boss or enemy, with no check at all. The fix: a short
guard before that hand-over and before the remembered subject is added to the search: a question that is a courtesy or
a junk phrase (thanks, hello, ok, a question about the time or the weather, under eight words, no game word) carries
nothing forward and searches nothing. A small list plus a shape rule, tested with the twelve junk phrases the measuring
script already holds, and with "how do I beat it" still counting as a follow-up. **Deck check (P100-THANKS-01, with
Deep Rock Galactic: Survivor running, a fresh chat):** after a boss question, "thank you very much" gets a short reply
with no notes block; "what time is it" the same; "how do I beat it" still answers about the boss.

### 5d. The route look's revealed steps (R)

The lookup corrected the roadmap again: Clear cache and leaving Strategy do **not** forget the revealed steps today;
they clear the ticks and leave the revealed steps in the panel's browser storage, so a route can come back with later
steps open and nothing ticked. Only Clear all data removes them. The fix is the one the roadmap names: the revealed
steps travel in the same per-game save as the ticks (one list, one file, one clear), and the browser-storage copy goes.
**Deck check (P100-ROUTE-SAVE-01):** reveal two steps and tick one; close and reopen: both kept; Clear cache: both
gone together.

### 5e. Hide more on the screen side (V)

The screen opens a cover by itself on a game in its no-story list, unless the cover names a protected note; it never
reads the "How much to hide" setting. Under Hide more the back end already asks for covers on those games, so the screen
undoes the back end's work. The fix: the setting reaches the cover rule (one pass-through), and under Hide more the
no-story rule is skipped; Default and Hide less behave exactly as today (tested byte for byte on the existing cases).
**Deck check (P100-HIDE-MORE-SCREEN-01):** Hide more, a Mario Kart 64 question by name that gets a cover: the cover
stays shut; Default: the same question's cover opens by itself. A spoiler fix is not believed until the Deck shows a
cover (lessons § 3).

### 5f. The Search tab lands on the row (W)

Only three Settings rows register themselves as a jump target today (Text size, the voice model picker, Clear all
data); every other row falls back to its section line, and an existing test pins that for Story spoilers. The fix copies
Text size's one line into the tier row, adds the index entry "How much to hide", and turns that test around. Mechanical,
one obvious way, so Haiku (trial). **Deck check (P100-SEARCH-TIER-01):** search "spoilers", A: the ring lands on the
Default button of the row.

### 5g. The Yoshi's Story note (Y)

Section 376 says "24 levels split across four worlds of six pages" and also "only six levels are played in any one run".
The game has six worlds (pages) of four levels. The brief gives the exact replacement sentence; nothing else in the note
changes; the source page (the Mario wiki) is the one already cited and is unreachable from here, so the brief says the
roadmap entry is the authority. The library is rebuilt by your next publish. **Check (P100-YOSHI-01):** the built
library's section 376 reads the new sentence; on the Deck, after the test-library install, a "how do the worlds work in
Yoshi's Story" question quotes six worlds.

### 5h. Thumbs-down follow-ups (U)

Two bugs, one lane. The "ranked lower by you" tag reads a copy saved with the answer, and Undo changes the store but
never that copy, so the tag stays. Nothing lists or clears lowered notes: no plugin call, no screen control. Build: two
back-end functions (list, clear all) and two plugin methods whose names carry the knowledge base's machine word; the
notes block reads the live state of the mark, so Undo clears the tag on the same answer; a row in the Knowledge base
section beside Remove, "Lowered notes: N", with Clear behind the same confirm-box pattern Remove uses, hidden when N is
0. Focus: a new stop in a section that already has a chain, built the way Remove is. **Deck check (P100-LOWERED-01):**
mark a note, Undo: the tag goes; mark two notes: the row reads 2; Clear: the row hides and both notes come back on a
reworded question.

### 5i. "Suggest as a tip" (J, call 8)

A button in the reply row, shown only under an answer that is finished. A writes a valid note record (the five required
fields of a section: an id in a reserved "suggested" range, the game, the kind, a name, the text; no source; "suggested
by a player" in the text) as a file in the Desktop notes folder the existing Desktop notes permission already guards,
and shows one line: the file name and a GitHub new-issue link with the title filled in. No network call; the Deck has no
browser in the panel, so the link is text to copy or type. The security reviewer reads the change (a file write and a
built link). **Deck check (P100-SUGGEST-01):** the button under an answer; A writes the file (read over SSH); the line
shows; with the Desktop permission off, the line says to enable it.

### 5j. The bookkeeper's two audits (K0 at go, K9 at the end)

The pre-go audit reads every entry in the knowledge-base roadmap against its newest dated note, the testing rows and
the code lookups, and fixes in one commit, every change named in its report: the "Where things stand" paragraph (it
says the library is 2026.09.26; 2026.10.17 has been published since, and a 2026.10.25 build with 351 tap-to-define words
waits for your publish); the route-look entry's symptom (§ 5d); the "thank you" entry's cause (§ 5c); the "Lowered
notes" entry's wording (the Knowledge base section is in the Ollama tab, not Settings); any status word that disagrees
with its newest note; any entry over five lines; every link resolving. The end-of-session audit does the same after the
last landing, and checks each entry moved this session names its row. **The roadmap is current at every step**: the
bookkeeper sweeps after every landing, and § 12 gets two lines, committed (and pushed, call 2).

### 5k. What this session cannot touch, and why (the six bugs that stay open)

Hide more drew fewer covers than Default; Hide less's 90.7 percent no-contradiction rate; the zero-score made-up
question that attaches three notes; the second checklist whose steps the D-pad could not reach; Down dead on the notes
block after Undo with a game running; the "If you want to cheat" section (call 7). Four need the AI model to re-run an
answer test; two need the Deck. All six are written into the follow-up runbook with their exact measurement.

## 6. The Deck and the PC measurements: the follow-up runbook

Nothing here runs in this session. `assets/100-runbook-local-followup.md` is written for a later session on your PC
(an Opus 5.5 extra-high chat in the desktop app, in the repo folder, on `experimental`, saying "Run plan 100's Deck
half"), with a fresh deck-driver per block and the same rules as plan 98 § 6.

| Block | What | Needs |
|---|---|---|
| L0 | Setup; the knowledge-base smoke pass; **the rows owed before this plan:** plan 98's block KS (the spoiler row's ring P98-SPOILER-FOCUS-01, each word underlined once P98-GLOSSARY-FIRST-01, the thumbs-down pictures), the Show details half of KB-SMOKE-02/04, the four stale saved walks re-saved (P98-K1-REPLAYS), the junk phrases in a fresh chat (P98-JUNK-PHRASES-try2), the hidden-spoiler-box row for a game known only by name (STRAT-SPOIL-NAME-01) if you have launched Doom 64 by hand | the Deck's own AI; Deep Rock Galactic: Survivor on Recent Games |
| L1 | One row per fix landed here, after one deploy with the test library: P100-TIPS-01, P100-NEEDS-01, P100-THANKS-01, P100-ROUTE-SAVE-01, P100-HIDE-MORE-SCREEN-01, P100-SEARCH-TIER-01, P100-LOWERED-01, P100-SUGGEST-01, P100-YOSHI-01; the look check on each screen touched; the free-play sweep | the build from this session |
| LR | The smoke pass again; the library put back to the published one; settings restored; the test chat only | — |

**PC measurements (Ollama running, in this order):** the search fixture gate (568 questions attach what they did; the
Yoshi note changed text); the tips reach with the meaning search on (8 of 24 today); the answer test with the "Needs"
clause (facts kept and contradictions against the 2026-10-24 Default run); the screenshot scoring script on the 8
pictures (75 and 42 in 100 today); the zero-score made-up question (does a question with no keyword support attach
nothing, and does any right note get lost if it does not); Hide more against Default on the answer test, a second run
(23 against 29 covers); Hide less's contradiction rate, a second run.

**A new check the maintainer alone can do** goes onto the checks page, in a "plan 100" group: the Lowered notes row by
eye; the Suggest as a tip line by eye; the two new tips read for truth; ten of the plain-word tip edits read against
the tip they sit in; the four games' notes, one game, before anything lands (call 4).

## 7. The second opinion (Fable 5.1 at max, the maintainer's choice)

The `advisor` helper at max effort, read-only, one bounded question with the exact files, one recommendation back. At
most five.

| # | When | The question |
|---|---|---|
| 1 | Before wave 1 is cut | The briefs against the code: does any brief name a cause the code does not have, a file another lane owns, or a Deck pass that its tests cannot stand for? (Plan 98 skipped this consult and corrected four briefs at go by hand.) |
| 2 | Before U's screen half is built | The "Lowered notes" row and the live-state tag: the one shape that fits the Knowledge base section's chain and the focus law, and the test that would fail without it at the level the Deck check looks at. |
| 3 | Before landing U and before landing J | The diff against the focus rules and the Deck row: any plain focus hop across containers? Does a test fail without the change at the Deck's level? For J also: is the file write and the link safe (the security reviewer's read is in hand)? |
| 4 | When any lane has failed twice | For that lane: what the two failures say, and what to try third. |
| 5 | Before the report | What to tell the maintainer first, what to leave open, which items must not be called done (nothing here was seen on a Deck). |

Log, one row per consult: time, the question in one line, the answer in one line, what it changed, the cost.

| Time | Question | Answer | What changed | Cost |
|---|---|---|---|---|

## 8. Things to bring to the maintainer's attention

- **This session cannot reach your Deck, your PC's AI or the workshop.** The two Deck tool servers are started from
  paths on your PC and did not connect here; the Deck is on your home network; Ollama is not installed here; the
  workshop folder is not here, so no evidence file can be written. The "automated QA pass with the controller rig" you
  asked for has to run from your PC. § 6 is written so that session has nothing to work out.
- **The wikis are refused by this environment's network rule**, so the four thin games' notes cannot be sourced here
  unless you allow the hosts (call 4). Every other lane needs nothing outside the repo.
- **Three roadmap entries describe the code wrongly**, found by the lookups: the route look's revealed steps survive
  Clear cache (the entry says they are forgotten); "thank you very much" is not caught by the "it" rule at all (the
  entry says it is); the Knowledge base section is in the Ollama tab (the entry proposes a Settings row). The
  bookkeeper's pre-go audit fixes the words; the fixes in § 5 are built against the code, not the entries.
- **The "Where things stand" paragraph is three weeks stale**: it names the 2026.09.26 library; 2026.10.17 is published
  and a 2026.10.25 build with 351 words waits for your publish command (plan 98 § 13.1).
- **Fable orchestrates here at your choice.** The routing table puts an Opus 5.5 extra-high chat in this seat and
  Fable only where five- and six-star decisions are planned; this plan has one five-star item, so the planning half fits
  and the landing half is above the table.
- **Unpushed work in the cloud is lost when the container is reclaimed** (call 2).
- **Plan 98's block KS is still owed** (three Deck looks, runbook written 2026-10-25); it is folded into block L0.
- **Nothing this session builds is proven on a Deck.** Every entry moves to "Deck check owed", never to Done.
- **Haiku runs on W and Y are logged** in plan 33 § 4d, as the trial requires; a miss that needs Sonnet counts against
  it.

## 9. Standing rules while nobody is watching

Plan 98 § 9 in full (the library is never published from the session; a content lane never writes a sentence it cannot
point at; evaluation reports are never committed; a lane that touches the retrieval service lands alone with the fixture
check in its landing log), plus: no helper ever pushes; the session pushes only as call 2 allows; no meaning-search
number from this machine is quoted anywhere; every roadmap move names the row it owes and says "not yet seen on a Deck".

## 10. Keeping the work safe

There is no PC to keep awake. The risk is the container: push after every landing (call 2), commit § 12 after every
entry, and keep every helper's work on its own branch so a lost copy is a lost folder, not lost commits.

## 11. Paperwork and the reports

- **After every landing:** the bookkeeper moves the entry (Bugs or Next → Deck check owed, naming its row and "not yet
  seen on a Deck"), one commit; two lines in § 12, committed; a push if allowed.
- **New bugs found:** into the roadmap at the next sweep, into the report, and (one- and two-star with a known cause)
  into lane M the same session, about an hour each.
- **The report, at the end,** in § 13: what the maintainer must do next; what a player notices; the code work by area
  (file paths, a technical explanation, what popped up and how it was handled, what the maintainer could have done
  differently); a plain developer guide; what failed and why; what is left and why; the numbers. The status report
  (plan 37) gets a dated paragraph; the checks page gets its group; plan 33 § 4b and § 4d get their rows.
- `python scripts/verify.py --full` passes on the tip before the last push.

## 12. Progress log and questions

- **2026-10-25, cloud session:** plan written. Findings while planning: this container has no Deck, no Ollama, no
  workshop; the wikis are refused by the network rule; the screen-side packages installed in 5 seconds and the Python
  suite passed (3,029 tests, 70 seconds); the type check and bundle were started as a check. Six Haiku lookups mapped
  every lane's files and found the three roadmap-versus-code mismatches in § 8. The fourteen calls in § 2 are open.

## 13. Report

Not yet written.

## 14. Subagent reports and follow-ups

The advisor (Fable max, § 7): every consult logged above. The security reviewer: reads lane J's diff before it lands,
recorded here. The FOSS reviewer: not applicable unless the note lanes run; their sources follow the per-note licence
rule. Focus and layout: lane U carries the advisor's read before landing (consult 3) and its Deck row is the gate.
