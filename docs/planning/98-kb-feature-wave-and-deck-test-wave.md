# 98 — The knowledge base: a feature wave, with an automated Deck test wave alongside

Written 2026-10-22 (evening) by the planning chat (Fable 5.1 at max, the maintainer's choice) on the maintainer's PC,
from the knowledge-base roadmap and its long notes as filed at tip `b48241a8`, the architecture doc, the status
report, the lessons file, the bug-wave runbook, plan 70 (the last knowledge-base wave with a Deck test wave) and plan 97
(the last bug sweep). Plain language on purpose: this file is for the maintainer first.

**Status: PLANNED, ready for go; nothing started.** The maintainer answered the calls in § 2 on 2026-10-22 at about
21:15: the defaults on all fourteen. They become decision D135 (135 was free; D134 was the last), written by the
bookkeeper in the session's first sweep. The briefs, the helper rules and the first Deck runbook are written (see the
files below), so the session can start helpers and the Deck in its first half hour.

**Who runs it:** a **new** Claude Code chat on **Opus 5.5 at extra-high** orchestrates and lands (this planning chat is
Fable and cannot switch its own model). **Sonnet 5.5 high** lanes build the features and the content; **Sonnet 5.5
medium** runs the long measurements; **Opus 5.5 medium** lanes build the two screen-side controls and the one recurring
retrieval bug; **Haiku 5.5 high** (on trial, logged) does the two mechanical bits. A **Fable 5.1 max** second opinion
(the `advisor` helper started at max effort) is asked at most five times, each logged (§ 7). The `deck-driver` runs the
Deck blocks; the `bookkeeper` files every roadmap, testing and changelog change. Never alongside another chat that is
driving the Deck.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1 to 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [docs/knowledge-base.md](../knowledge-base.md);
[docs/roadmap-kb.md](../roadmap-kb.md) and [its long notes](../roadmap-kb-details.md); plan 70's report and lessons
(`workshop:archive/70-kb-wave-four-and-deck-test-wave.md` §§ 11 and 12); plan 97 §§ 8 to 12 for the shape of a night.

**Files for this plan (written 2026-10-22):** the helper rules [assets/98-helper-rules.md](assets/98-helper-rules.md)
(plan 97's rules plus the knowledge-base lines), the briefs [assets/98-lane-briefs.md](assets/98-lane-briefs.md), the
first Deck runbook [assets/98-runbook-block-K0.md](assets/98-runbook-block-K0.md) (the knowledge-base smoke pass,
re-runnable on any build, plus the readings and the owed rows); the session writes one runbook per later block. Evidence files: `plan98-<ROW>.json`
in the workshop's `test-evidence` folder. Handovers: `assets/98-handover-<block>.md`.

---

## 1. One sentence

Build the knowledge-base features that are ready to build (glossary words for every game, the spoiler tiers setting, a
thumbs-down that stops a wrong note coming back, the route look for the strategy checklist, the first screenshot
measurement), take the four measurements the roadmap has owed for weeks, nail down the wrong-subject-notes family with a
second opinion and fix it, and run every owed knowledge-base Deck check the rig can run while the helpers build, with the
roadmap current at every step and a report at the end.

## 2. The maintainer's calls (answered 2026-10-22, about 21:15: the defaults on all fourteen; D135)

The questions as they were put, each with the recommendation and the default in brackets. The maintainer took every
default, so the default is the call. One refinement on call 9: the character preset is Ali G (`alig_ali_g`), the
maintainer's own pick for the same measurement on 2026-09-06 (D80, item 2), rather than the first in the list.

1. **Scope.** In: the glossary words for every game (G), the spoiler tiers setting (B), the thumbs-down demote in the
   drawn option C (C and D), the route look for the strategy checklist (H), the screenshot scoring set, step 1 only (I
   and Deck block K2), the four owed measurements (F), the wrong-subject-notes family with a second opinion first (L),
   and every owed knowledge-base Deck row the rig can reach. Out unless you say so: "Suggest as a tip" (J, five stars;
   it shares a file with D, so it can only follow D), new enemy and item notes for the four thin games (N, needs your
   quality read after the first batch), the online and versus content (weeks), the catalog phase, the screenshot
   improvements (step 2), the card style pass (a measurement only, if time is left). *Recommendation: as listed.
   Default: as listed.*
2. **Run before or after the 0.6.0 merge?** Another chat is planning the merge of `experimental` into `main` and the
   bump to 0.6.0 tonight. The features here are new surface on a branch that has had two weeks of bug sweeps. *Recommendation:
   the merge first, then this wave on `experimental` (the Deck checks, the measurements and the library content do not
   touch the plugin and can run any time). Default: this plan waits for your word on the order.*
3. **The wrong-subject notes bug** (a Portal 2 house question or a made-up boss gets a note about something else; the
   "No close match" line sometimes skipped). It was kept out of plan 97. *Recommendation: in, with the Fable second
   opinion naming the cause and the one fix shape first, and a hard rule: on the 287 fixture questions with a known
   right note, no right note may be lost and the line may not appear on any of them. Default: in.*
4. **The Developer tab's "Install seed knowledge base" button.** Your idea was to retire it. It is also the only way,
   with no SSH edit, to put an unpublished library on the Deck: every deploy carries a freshly built library to the
   Deck's settings folder, and that button installs it. This session needs that route twice (the glossary words, and the
   "newer than published" wording check). *Recommendation: keep it this session, fix its stale "not live yet" text to
   "Install the library built with this plugin (for testing)", and retire it in a later session once a replacement
   route exists. Default: keep and fix the text (lane E, landed last).*
5. **Spoiler tiers.** Three tiers as confirmed in D50: strict (hides bosses, endings and chapters), default (hides only
   named story beats and endings, today's behaviour), open (hides nothing you asked about). Naming a boss still unlocks
   it in every tier. Where: Settings, in the Story spoilers section, as a three-way choice row like Text size. It
   applies everywhere the spoiler rule runs today (Strategy, and Speed or Expert turns with notes attached).
   *Recommendation: the three names on the row read "Hide more", "Default", "Hide less". Default: those names.*
6. **Thumbs-down (option C).** When an answer used a note, "Not really" adds three reasons to the row (Wrong tip,
   Outdated, Wrong edition) beside the five that exist; when two or three notes were used, picking one of the three asks
   "Which note was it?" (each note, and Both). The note is ranked lower on later questions; after three downs it stops
   coming back; Undo on the confirmation line. Show details tags a lowered note "ranked lower by you". *Recommendation:
   three downs to exclude; the tag shown. Default: both.*
7. **The route look** (the mock-up board, tab 5, your pick C: "the best implementation of the strategy checklist").
   The checklist the AI already writes is drawn as a route: one stop per step, the next stop open, later stops covered,
   A on a covered stop shows it, ticks kept as today. *Recommendation: every checklist with three or more steps gets the
   route look, rather than guessing which questions are "how do I get to…" questions. Default: every checklist.*
8. **The screenshot set.** About an hour of Deck time: launch the games on the Recent Games row one by one (God of War,
   Hollow Knight, Black Mesa, Half-Life 2 and Deep Rock Galactic: Survivor were there on 2026-10-22), take the title
   screen, a menu, a play scene and the pause menu of each, 20 to 30 pictures in all, labelled by the session. The scoring
   script runs on the PC with the Deck's own picture model. Numbers only this session; nothing in the answer changes.
   *Recommendation: yes. Default: yes.*
9. **The answer test with the character voice on:** which character preset, the one you use on your Deck? *Default: the
   first preset in the list, and the run says which.*
10. **Second opinions:** at most five Fable consults (plan 97 used two of five). *Default: five.*
11. **Two Deck rows to close by a call:** the notes block's chip-ladder row (blocks carry no chip ladder by design now;
    asked twice before) → retire its chip half; the Palworld and Skyrim spoiler-box half of the new-games row (the AI
    wrote no hidden block in two tries each) → close as proven by its tests only. *Default: both as recommended.*
12. **Push and publish at the end.** The hook refuses a push unless you allow it for the session, and the library
    publish (the Hugging Face and GitHub upload) is refused from a chat. *Recommendation: the session leaves both for
    you: "push" when you are back, and `python scripts/kb/publish_corpus.py --push-hf --push-github` after you have
    read the glossary sample in the report. Default: nothing pushed or published.*
13. **Standing rules while you are away** (plan 97's, kept): a fix that fails on the Deck twice moves up one model tier
    without asking; a new one- or two-star bug gets one helper round of about an hour; anything blocked gets the safest
    choice at once and is raised in the chat and in § 12 at that moment; never push, publish, merge to main, switch
    branches in the shared folder, type a PIN or password, reload the plugin with a game running. *Default: kept.*
14. **Budget line:** no new helper past 75 percent of the five-hour window or 80 percent of the week (D128). At the time
    of writing: 16 percent of the five-hour window (it resets at 21:30 tonight), 14 percent of the week (resets Wednesday
    28 October at 9 in the morning), the Fable share at 5 percent. *Default: kept.*

## 3. What a player notices after this session

- Underlined words you can tap to define appear in answers about every game in the library, not only Deep Rock
  Galactic: Survivor (once the new library is published and downloaded).
- Settings gains a Story spoilers choice: hide more, the default, or hide less. A strict player stops seeing boss
  tactics in plain text; an open player stops seeing covers.
- Under an answer that used a note, "Not really" lets you say the note was wrong, outdated or for the wrong edition,
  and which note it was. That note stops coming back for questions like it.
- A Strategy checklist is drawn as a route: the next stop open, later stops covered until you reveal them.
- A made-up boss or an off-subject question no longer drags in a note about something else, or at least says plainly
  that the match was thin (the exact shape depends on the second opinion and the measurement).
- "Update knowledge base" with a newer library than the published one says "You have …; the published library is ….
  Nothing to do." and downloads nothing (the owed wording check).
- The numbers behind four open roadmap entries are finally taken, so the next calls come with figures rather than hopes.
- A first measurement of how well the Deck's AI reads a screenshot: out of the pictures tried, how often it named the
  game, the area and the boss.

## 4. Before go

**The maintainer, about fifteen minutes:**

1. **Which chat holds the Deck.** At 20:44 tonight the rig's lease was held by another chat (a deploy), and the shared
   checkout had that chat's uncommitted work in two files. By 21:00 that chat had committed its fixes (`b9200192`) and
   handed the Deck over, and the merge chat's plan is plan 99 (uncommitted). This plan's chat must still read
   `deck_status` at go and must not start its Deck block while another chat drives the Deck.
2. **Start Doom 64: Retribution once** (or Super Mario 64, Mario Kart 64 or Pikmin 2): launch, reach the menu, quit.
   The hidden-spoiler-box row for a game known only by name has been blocked four times because none of its games is
   on the Recent Games row, the only list the rig can launch from. Two minutes, and the row runs tonight.
3. **The Deck:** on its own screen (say if not); Deep Rock Galactic: Survivor on Recent Games; the Deck's own AI
   installed with its usual model; the rig's stop switch re-armed; the test chat "test" still there (plan 97 left it).
4. **This PC:** Ollama running with `nomic-embed-text` and `gemma4:e2b-it-qat` (both present on 2026-10-22). The library
   build and every measurement use it.
5. **The usage screen:** read both counters and say them, as plan 97 did.
6. **Open a new Opus 5.5 extra-high chat in the desktop app, in the repo folder, on `experimental`,** and say:
   "Run plan 98." (The answers to § 2 can be in the same message, by number.)

**The session's first acts (the first thirty minutes), in this order:**

0. If this plan and its three asset files are still uncommitted (the planning chat left them so), commit them first,
   staged by name and nothing else: every helper reads the plan from its own copy of the repo, so the plan must be in
   the tip the copies are cut from.
1. `git status` (other chats' uncommitted files are theirs: never stage them), the tip hash, the tail of the decisions
   file (this plan's entry is D135; if another session took 135, take the next number and say so here), `deck_status`
   (the lease must be free and the stop switch off). Start `python scripts/keep_awake.py --hours 10` in the background.
2. The baseline: `python scripts/verify.py --full` on the tip, once, in the shared checkout.
3. Build the library once on the PC (`python scripts/kb/build_rag_db.py --seed --out build/knowledge-base`, one to two
   minutes) and copy it into every knowledge-base lane's copy at `build/knowledge-base`.
4. Cut the wave 1 copies (`python scripts/worktree.py create p98-<lane> --base experimental`), confirm each sits at
   the tip, and start the wave 1 helpers two to three minutes apart (§ 5), each with the rules file plus its brief, the
   tip hash and its copy's path. Read the usage figure first.
5. Start Deck block K0 with a fresh driver at the same time (§ 6). The Deck never waits for the helpers.
6. Hand the bookkeeper the first sweep: the D135 entry appended to the decisions file (its text is § 2 with the
   answers), the two rows closed by call 11, and the plan's status line.

## 5. The work: what can run in parallel, and what cannot

**The rule for parallel lanes is files, not features.** Two lanes never own the same file. The table says what each lane
owns and what it must wait for; everything not named as a wait runs at the same time. Up to ten helpers at once, started
a few minutes apart; each runs only its own tests at two workers; the full checks run once per landing.

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| A0 | The library builder also reads every file in `data/kb/glossary/` and `data/kb/notes/`, so content lanes never share one file; and a glossary row may name its game by the library's own id, so the eighteen games with no Steam id can have words at all | ★ `[KB]` | Sonnet 5.5 medium (two refusal rules with tests in both directions; too much judgment for the Haiku trial) | `scripts/kb/build_rag_db.py`, its tests | nothing |
| G1, G2, G3 | Glossary words for every game, three batches of about twelve games each (§ 5a) | ★★ `[KB]` | Sonnet 5.5 high | one new file each under `data/kb/glossary/`, plus a sidecar naming the note each word came from | nothing to write; A0 landed before the library is built |
| B | The spoiler tiers setting (§ 5b) | ★★★ `[KB]` settings | Sonnet 5.5 high; Opus extra-high reads it at landing (settings plumbing) | `py_modules/backend/spoilers/strategy_spoiler_policy.py`, the risk chip, the settings service and the screen's settings tables, a choice row in Settings copied from Text size, one pass-through each in the request file and the prompt file, tests | nothing |
| C | Thumbs-down, the back end: each attached note's id reaches the screen, a demote store, the rank penalty, the exclusion after three, undo (§ 5c) | ★★★ `[KB]` | Sonnet 5.5 high | a new `kb_demote_store.py`, one call in the fusion, the attached-notes payload, the feedback log, one new plugin method, tests | nothing (lands before L is cut) |
| D | Thumbs-down, the screen: option C's rows and the "ranked lower by you" tag (§ 5c) | ★★★ `[KB]` ui | Opus 5.5 medium | the reply-actions files, the notes block's tag, tests | the field names agreed with C in both briefs; lands after C |
| H | The route look for the strategy checklist (§ 5d) | ★★★ `[KB]` ui | Opus 5.5 medium | the strategy checklist's five files (panel, state, saving, session, nav), tests; no prompt change this session | nothing |
| I | The screenshot reading measurement: the scored set's format, the scoring script, the report shape (§ 5e) | ★★ this session (★★★★ whole) `[KB]` `[QA]` | Sonnet 5.5 high | a new `scripts/kb/eval_screenshot_reading.py`, a labels file under `tests/fixtures/`, tests | Deck block K2's pictures to run on |
| F | The four measurements, one after another (§ 5f) | ★★ `[KB]` | Sonnet 5.5 medium (a long job of one checkable kind) | nothing in the repo; numbers in its report, report files to the workshop | the library build |
| L | The wrong-subject-notes family: the fix the second opinion names (§ 5g) | ★★ `[KB]`, recurring | Opus 5.5 medium, after Fable consult 1 | `kb_not_in_notes_notice.py`, the attach region of `knowledge_base_service.py`, tests | block K0's readings, consult 1, C landed |
| J | "Suggest as a tip" (§ 5h) | ★★★★★ `[KB]` | Sonnet 5.5 high | the reply-actions row (after D), a new back-end writer, one plugin method | D landed; call 1 |
| N1, N2, Q | Enemy and item notes for the four thin games (two writers) and their blind questions (one lane that never reads the notes) | ★★★★ `[KB]` | Sonnet 5.5 high (N), Sonnet 5.5 medium (Q) | one new file each under `data/kb/notes/`; Q owns the search-test fixture | A0 landed; call 1; your quality read after the first batch |
| E | The seed button: fix its text (default) or retire it (call 4) | ★ `[KB]` | Haiku 5.5 high or Sonnet 5.5 medium | the Developer tab's diagnostics rows and their tests; two saved Deck walks re-saved | the last Deck block (the button is the library's test route) |
| M | Bugs found tonight with a known cause | ★ to ★★ | Sonnet 5.5 high (judgment) or medium (mechanical) | as found | as found |

**Where lanes would collide, and how the order avoids it.** C and L both touch the retrieval service: C lands first and
L is cut from the new tip. D and J both touch the reply row: D first. B's wording lives in the spoiler policy file; H
changes no prompt text this session (a "what you need" clause in the prompt is a named follow-up), so B is the only
lane in the prompt file. The glossary and note lanes each own one new file, which is the whole
point of A0. The measurement lane and the library build both use this PC's AI model: the build runs first, then F; a
lane that needs the model for a correctness check (C's fixture run) may use it at the same time, since those checks do
not time anything.

**Bugs bumped above Sonnet, and why.** The wrong-subject family (L) has been measured three times and every floor move
cost right answers; it gets the Fable second opinion first and an Opus medium lane. The two new controls (D, H) are
screen and focus work and go to Opus medium, with the advisor's read before they land. The spoiler tiers (B) stay on
Sonnet high but the landing is Opus extra-high's read, because it is settings plumbing. The troubleshooting-reach entry
gets a measurement (F) and then, only if a fix shape is worth building this session, a Fable consult before any lane.

### 5a. Glossary words for every game (G1 to G3)

Today two words exist, both for Deep Rock Galactic: Survivor. Each lane takes about twelve of the 38 games and writes
six to ten words per game: the term, its other forms, a one-line peek and a short full text. **Every sentence comes from
that game's own notes in the library (or the Deck tip sheet), with no outside facts** — the lesson from the Brotato,
Palworld and Skyrim notes, where rewording from memory added nine small invented claims. The sidecar names the note
each word was drawn from, and the session spot-checks one word in ten against its note. Words a player would meet in an
answer: mechanics, currencies, enemy classes, mode names, the game's own jargon. No character names from story-protected
games (the glossary is not fenced). The builder refuses a row for a game the library does not hold, so a typo in a game
id fails the build rather than ships.

Batches (by title, the same order as the library's note counts): G1 the Steam titles with wiki sources (Left 4 Dead 2,
Fallout 4, Skyrim, Black Mesa, Hollow Knight, DOOM Eternal, Cyberpunk 2077, Fallout: New Vegas, Brotato, Palworld,
Half-Life 2, Portal 2); G2 the "own words" and GTA titles (Ocarina of Time, Hades, Red Dead Redemption 2, State of
Emergency, GTA San Andreas, GTA V, GTA IV, GTA III, The Sims 4, Baldur's Gate 3, Deep Rock Galactic: Survivor's missing
words); G3 the Nintendo titles (Pikmin 2, the three Smash and Mario Party games, Mario Kart 64, Paper Mario, Donkey
Kong 64, Super Mario 64, Diddy Kong Racing, Yoshi's Story, Doom 64).

**Deck check (P98-GLOSSARY-02):** with the new library installed through the Developer tab, a Strategy question about
Hollow Knight (named, not running) draws at least one underlined word; A on it opens the peek; B closes it; the saved
walk `P86-GLOSSARY-WALK` replays. Then the same on a game from G3 by name.

### 5b. The spoiler tiers setting (B)

One setting, `spoiler_tier`, with the values strict, default and open, default "default". The policy paragraph the AI
reads gets one wording per tier; rule 7 of the spoiler constitution (naming a boss unlocks it) holds in every tier; the
risk chip reads the tier. The settings plumbing follows the Text size row exactly (one row per language in the simple
tables, the read-back test, the fresh-install payload and the hostile-inputs fixture). Measured before landing with the
answer test on the PC: the default tier's numbers are identical to today's (same prompt), strict fences more of the boss
rows, open fences none. **Deck check (P98-SPOILER-TIER):** the row takes Left and Right and keeps its value after close
and reopen; a Hades question that does not name the boss is covered under strict and plain under open (two differently
worded questions, covers counted on screen).

### 5c. Thumbs-down that stops a wrong note coming back (C and D)

The drawn option C ([the drawing](https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43), D112 item 8). Back end (C): each
attached note's id travels with the notes the screen already gets; a small file beside the feedback log keeps one entry
per demoted note (count, reasons, when); a demoted note's fused score is lowered so it ranks below any close rival, and
a note with three downs is left out; undo removes the entry; one new plugin method records or undoes a demote. Measured
on the PC: with no demotes the 287 fixture questions attach exactly what they attach today; with one demote on the
right note of a question, that note ranks last among the attached; with three, it is absent. Screen (D): the three new
reasons appear only when the answer used a note; the "which note?" row only for two or three notes; B goes back one
row; the confirmation line names the note and offers Undo; Show details tags a lowered note. The focus chain is the
chip row the reply already has, one row deeper. **Deck check (P98-DEMOTE-01):** Deep Rock Galactic: Survivor running,
a boss question that attaches two notes; Not really → Wrong tip → the first note → the confirmation names it; a second,
differently worded boss question no longer lists that note first; Undo, and a third question lists it again.

### 5d. The route look (H)

The checklist the AI already writes after a Strategy answer is drawn as a line of stops: the next stop open, later
stops covered the way a spoiler cover is, A on a covered stop reveals it, ticks kept as today (the tick fix from plan 96
holds: every stop has its own nav node). A "what you need" line per stop is drawn only when the checklist item's own text
carries one; asking the AI for that line in the prompt is a follow-up, not this session's change. Built from the mock-up
board's tab 5, option C, at the Deck's size. **Deck check (P98-ROUTE-01):** a "how do I get to the first boss" question in Hollow Knight by name draws
the route; Down walks the stops; A on a covered stop reveals it; a tick survives close and reopen; the walk is saved.

### 5e. The screenshot reading measurement (I, with Deck block K2)

Step 1 of the roadmap entry only: a labelled set and a scoring script. Block K2 takes the pictures; the session labels
each with the game, the scene (title, menu, play, pause) and the boss or enemy if any; the script asks the Deck's
picture model about each picture the way the plugin does ("what game and where is this?"), reads the reply and marks
right game, right area, right boss, and "said it did not know" as its own better-than-wrong result, with the time to
the first word. It runs on the PC with the Deck's model tag. The report gives three plain figures out of a hundred per
model. Nothing in the plugin changes this session; the pictures live in the workshop, never in the repo.

### 5f. The four measurements (F, one after another on this PC)

1. **The keyword-blind slice of the search test:** how many labelled questions the word search cannot answer at all now
   that 36 more blind rows exist (last count 3). No code.
2. **The troubleshooting reach:** the 24 fresh plainly-worded problem sentences from 2026-09-07 against today's tip sheet,
   with and without the held meaning-search branch (`lane/kb-symptom-search`, rebuilt on today's tip in a scratch copy):
   how many reach a tip, and how many of those tips are right, read by hand. The result decides whether consult 2 is
   asked.
3. **The answer test with the character voice on** (Ali G, the maintainer's own pick on 2026-09-06): facts kept and
   contradictions against the voice-off baseline from the same evening.
4. **If time allows, D41:** question by question, how often a note named after a category outranks the notes inside it.

Each report goes to the workshop's research folder, written by the session after landing; the lane only reports numbers.

### 5g. The wrong-subject family (L, after consult 1)

What is known, in one place for the consult: every note search inside one game finds something; the meaning floor
(0.523) is the highest value that loses no right note; raising it to catch the four device sentences costs twenty or
more right notes; the "No close match" line keys off two signals (no keyword support and a thin meaning score under
0.65, or no word of the question in any attached note); the 2026-10-22 failure was two weak Dreadnought notes attached
for a made-up boss and judged close enough. Block K0 takes fresh readings of four such questions with the log's attach
line. The consult names the cause and one fix shape (a third signal, a made-up-name check, a rule on the number of
weak notes, or something else), and the measurement that gates it: on the 287 fixture questions with a right note,
none lost and no line added; the four device sentences caught. L builds that one shape. **Deck check (P98-NOTES-BLOCK-04):**
the same four questions, Strategy, Deep Rock Galactic: Survivor running: no block for the made-up subjects, the line
shown; a real boss question unchanged.

### 5h. "Suggest as a tip" (J, only if call 1 says so)

A button in the reply row that writes a valid note record (the nine fields, no source, "suggested by a player" in
the text) to the Desktop notes folder and shows a GitHub new-issue link the person can type later. Needs the Desktop
notes permission that already exists. Three to five days in the roadmap's estimate; one lane's day here for the first
cut. The security reviewer reads its diff (it writes files and builds a link).

## 6. The Deck, in blocks

One driver per block, a fresh one each time with the last handover. Every block starts by reading `deck_status` (the
lease free, the stop switch off), takes the keep-awake lock, reads which screen is live, backs up the settings, reads
the build, and uses only the test chat "test". Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`.
Evidence `plan98-<ROW>.json`, one file per check, never overwritten. **Unload the Deck's AI before launching a game;
never reload the plugin with a game running.**

| Block | When | What | Needs |
|---|---|---|---|
| K0 | Minute zero, the build already on the Deck, no deploy | Setup. **The knowledge-base smoke pass** (re-runnable; its runbook is kept): one Strategy question with Deep Rock Galactic: Survivor running attaches notes and the notes block opens; Show details names them. **The readings consult 1 needs:** four made-up-subject questions (two made-up bosses, "how do I buy a house in this game", a Hades boss that does not exist with Hades named), each recorded with the attached notes, the line, the block and the log's attach line. **Owed rows:** the two junk phrases ("thank you very much", "what time is it") with the game running (the accepted entry's re-run); the widest chip labels over two minutes of chip turnover (PHASE4-CHIPS-01); the time budget probe three times with a short reply first; **the "newer than published" wording** (P97-L9-KB-UPDATE): read the installed library's version and place, and the version in the Deck's seed folder (`~/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json`; `scripts/build.ps1` refreshes it on every deploy it makes, dated the day it ran, but the rig's own deploy tool may not). If the seed is newer than the published 2026.10.17, press "Install seed knowledge base" on the Developer tab, then "Update knowledge base": the line must read "You have …; the published library is …. Nothing to do." and nothing downloads. If the seed is not newer, this check moves to block K1, after the night's first `build.ps1` deploy; the hidden-spoiler-box row for a game known only by name (STRAT-SPOIL-NAME-01) if Doom 64 is on Recent Games. | Deep Rock Galactic: Survivor; the Deck's AI |
| K2 | After K0, while helpers build | The screenshot set: for each game on Recent Games, launch (AI unloaded first), the title screen, a menu, 60 to 90 seconds of play then a play scene, the pause menu; one file per picture with the game, the scene and the time; the plugin's own screenshot picker is not used. Close each game and confirm its process is gone. | the games on Recent Games |
| K1 | After the first landings and one deploy | One check per landed feature (§ 5a to 5d rows), the glossary and KB saved walks replayed, the free-play sweep with and without a game. | the new build |
| K3 | After the wave 2 landings | L's row, J's and E's if they ran, second rounds. | the new build |
| KR | The end, final build | The knowledge-base smoke pass again; every saved knowledge-base walk replayed; **put the library back:** Remove, then Download from the published site to the same place it was (the storage question answers the place the settings named at K0), the version read back; settings restored key by key; pinned test chips cleared; the game closed; the Deck's models as at K0. | — |

**A new check the maintainer alone can do** goes onto the checks page, in a "Thursday 23 October (plan 98)" group,
never left in chat: tap a glossary word in a second game's reply by touch; the spoiler tier row by eye; the thumbs-down
flow once by hand; the route look by eye; ten of the screenshot labels against what they see.

## 7. The second opinion (Fable 5.1 at max, on trial)

The `advisor` helper at max effort, read-only, one bounded question with the exact files and evidence, one
recommendation back. At most five (call 10). Each costs about three Opus turns, so every question is answerable from
named files.

| # | When | The question |
|---|---|---|
| 1 | After block K0's four readings | Given the notice file's measured rules, the meaning floor's comment, and the evidence files from 2026-09-26, 2026-10-03, 2026-10-14 and 2026-10-22 plus tonight's four: what is the root cause of a made-up subject still attaching a note and skipping the line, and which one fix shape should L build, gated by "no right note lost on the 287"? |
| 2 | Only if F's troubleshooting numbers show the held branch still attaches wrong tips | Is there a fix shape worth building this session (a "none of these fit" signal for the tip sheet), or does the entry stay a tip-rewriting job? |
| 3 | Before landing D and before landing H | The diff against the focus rules and the Deck row: does a test fail without the change at the level the Deck check looks at? Any plain focus hop across containers? |
| 4 | When any item has failed on the Deck twice | For that batch: what the two failures say, and what to try third. |
| 5 | Before the report | What to tell the maintainer first, what to leave open, which items must not be called done. |

Log, one row per consult: time, the question in one line, the answer in one line, what it changed, the cost.

| Time | Question | Answer | What changed | Cost |
|---|---|---|---|---|

## 8. Things to bring to the maintainer's attention

- **This chat cannot run the session.** It is on Fable; the implementation needs a new chat on Opus 5.5 extra-high.
- **Three chats were open in this folder tonight.** One drove the Deck (its fixes committed at 21:00, `b9200192`, the
  Deck handed over); one plans the 0.6.0 merge as plan 99; this one plans. The Deck takes one driver at a time, and a
  release and a feature wave on the same branch on the same night is a risk nobody has measured. Call 2 asks for the
  order.
- **The seed button is load-bearing for testing** (call 4). Retiring it before a replacement exists removes the only way
  a session can put an unpublished library on the Deck without an SSH edit that the permission check may refuse.
- **The new library needs your publish.** Glossary rows (and any new notes) reach other people's Decks only after
  `publish_corpus.py` runs from your hands. No format bump is needed, so nothing installed goes stale.
- **Baldur's Gate 3's wiki is NonCommercial** and cannot feed notes under the library's licence; if the four-games notes
  are in, its notes stay own-words, as its eight existing ones are.
- **The usage-limit restart is not reliable.** If the limit hits while you are away, a "Continue" from you restarts the
  session; it leaves a background job running before any pause so its finish wakes the chat.
- **48 old helper copies** from plans 96 and 97 sit under `.claude/worktrees`; all their work has landed. Prune them
  with the helper's own prune (it unlinks first) when convenient; nothing here needs it.
- **The chip-pace look and the widest-label look** are still yours after this session; the rig can only measure sizes.

## 9. Standing rules while nobody is watching

Plan 97's § 10 in full, plus for the knowledge base: the library is never published from the session; a new library
reaches the Deck only through the Developer tab's install route and is put back at the end; a content lane never writes
a sentence it cannot point at in a note or a tip; evaluation reports are never committed to this repo; a lane that
touches the retrieval service lands alone, with the fixture check in its landing log; the test chat only.

## 10. Keeping the PC and the Deck awake

As plan 97 § 11: the desktop app plus `keep_awake.py` for the PC; the rig's keep-awake lock with `ttlMinutes: 480`
renewed by every driver; the 20-minute wake check plus a background sleep job before any pause.

## 11. Paperwork and the reports

- **After every landing:** the bookkeeper moves the entry (Bugs or Next → Deck check owed, naming its row), one commit;
  two lines in § 12, committed.
- **After every Deck block:** a pass moves to Done with its evidence file; a fail goes back with what was seen; the
  testing documents in the same commit; the bookkeeper confirms each evidence file exists; the session spot-checks.
- **The roadmap is current at every step**, so a look from a phone shows where each entry stands.
- **New bugs and new checks** found tonight: into the roadmap at the next sweep, into the report, and (one- and two-star
  with a known cause) into a helper round the same night.
- **The report, at the end,** in § 13: what the maintainer must do next; what a player notices; the code work by area
  (file paths, a technical explanation, what popped up and how it was handled, what the maintainer could have done
  differently, as AGENTS.md asks); a plain developer guide; what failed and why; what is left and why; the numbers.
  The status report (plan 37) gets a dated paragraph; the checks page gets its group.
- `python scripts/verify.py --full` passes on the tip before the maintainer is asked to push.

## 12. Progress log and questions

- **2026-10-22, evening:** written on the maintainer's PC by the planning chat. Nothing started; nothing on the Deck
  touched. The fourteen calls in § 2 are open. Findings while planning: another chat held the Deck's deploy lease at
  20:44 and has uncommitted work in `src/features/plugin-shell/useTabMarker.ts` and `src/styles/confirmBoxButtons.ts`;
  a third chat is planning the 0.6.0 merge; the glossary file holds two words, both for one game; the transparency
  payload carries no note ids yet (the thumbs-down needs them, lane C adds them); `scripts/build.ps1` copies a freshly built
  library to the Deck's settings folder on every deploy it makes, which is what the Developer tab's install button
  installs (whether the rig's own deploy tool does the same is not known; block K0 reads the folder's version first).
- **2026-10-22, 21:05:** the merge chat reports the Deck chat's fixes committed (`b9200192`) and the Deck handed over;
  the shared checkout holds only the two plan files (98 and 99). The merge chat has noted that nothing here must land
  before 0.6.0 and that the library publish is a separate upload with no format change.
- **2026-10-22, about 21:15:** the maintainer took the defaults on all fourteen calls. The helper rules, the briefs
  (A0, G1 to G3, B, C, D, H, I, F, L's fixed part, E, the M template) and Deck runbook K0 are written. Two things
  learned while writing them: glossary rows today can only name a game by its Steam id, so the eighteen games without
  one (the Nintendo titles, State of Emergency) could not have words at all until lane A0 lets a row name the library's
  own id; and lane H changes no prompt text, so the prompt file has one lane (B) and no collision. Files uncommitted;
  the session commits them first (§ 4, step 0).

## 13. Report

Written at the end, in the shape § 11 names.

## 14. Subagent reports and follow-ups

The advisor (Fable, § 7): every consult logged above; whether each changed the outcome is said in the row. The
security reviewer: asked to read lane J's diff if J runs (it writes files and builds a link), recorded here. The FOSS
reviewer: not applicable; no new dependency or licence surface, except the library's own sources, which follow the
existing per-note licence rule. Focus and layout: lanes D and H carry the advisor's read before landing (consult 3) and
their Deck rows are the gate.
