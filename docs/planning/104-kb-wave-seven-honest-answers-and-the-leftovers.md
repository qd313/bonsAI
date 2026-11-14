# 104 — The knowledge base, wave seven: honest answers finished, the wave-six leftovers fixed, notes for two more games, the older notes cleaned, a fairer search, chips that follow your question, more versus notes, load-order data for mods, a warning before the Deck runs out of memory, and Deck checks that run in one call

Written 2026-11-14 by the planning chat on the maintainer's PC (Fable, at max effort while planning; the maintainer's
choice). Sources: the knowledge-base roadmap and the main roadmap at tip `d58e3155`, plan 103 and its report (the shape
copied here), plans 17, 37 and 101, the lessons file, the bug-wave runbook, the Deck tools project at version 0.3.12,
and ten read-only lookups by Sonnet helpers, each checked against the code before a brief was written (§ 8 lists what
they corrected). Plain language on purpose: this file is for the maintainer first.

**Status: READY, waiting for "go".** The maintainer answered ten questions in the chat on 2026-11-14 (§ 2, calls 1 to
10). Calls 11 to 31 are open and "go" takes every default. Nothing is started. Nothing on the Deck was touched (the
planning chat only read its state).

**Who runs it:** a fresh **Opus 5.5 chat at extra-high**, told "Run plan 104" (the maintainer's choice for this wave; it
is also what the routing table says). It reads every change and lands it; it writes no code and no roadmap rows. The
briefs are already written. **Sonnet 5.5 high** helpers write the notes and build everything that needs a judgment;
**Sonnet 5.5 medium** helpers write the test questions, run the measurements, do the mechanical fixes, drive the Deck
and keep the books; **Opus 5.5 extra-high** helpers take the two D-pad and layout jobs, each with a Deck measurement in
hand first; **Fable at max** is the second opinion, asked at most six times (§ 7). Up to fifteen helpers at once,
refilled as slots free. The whole setup is one table in § 4.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1 to 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [docs/roadmap-kb.md](../roadmap-kb.md) and
[its long notes](../roadmap-kb-details.md); [plan 103](103-kb-wave-six-finish-the-half-done-phases.md) §§ 12 and 13
(the last wave: what it left, and the lessons this plan is built on).

**Files for this plan (written 2026-11-14):** the helper rules [assets/104-helper-rules.md](assets/104-helper-rules.md),
the briefs [assets/104-lane-briefs.md](assets/104-lane-briefs.md) (one per helper), the first Deck runbook
[assets/104-runbook-block-D0.md](assets/104-runbook-block-D0.md); the session writes one runbook per later block.
Evidence files: `plan104-<ROW>.json` in the workshop's `test-evidence` folder. Handovers:
`workshop:planning/assets/104-handover-<block>.md`. The Deck driver's own rules file
(`.claude/agents/deck-driver.md`) was brought up to date with the tools as part of this plan (§ 6).

---

## 1. One sentence

Finish what wave six left half done: make the AI honest when its notes do not cover a question (and stop it borrowing
advice from notes about something else), say plainly when a game has no notes at all, give Half-Life 2 and Black Mesa
their notes so the "notes for every game" entry can close, fix every open knowledge-base bug a helper can act on
(the search mix-ups, the answer-screen leftovers, the older notes), clear every knowledge-base Deck check that is still
owed, add the three pieces the maintainer picked (chips that follow the question, more Left 4 Dead 2 versus notes,
load-order data for mods with a typed lookup on trial), put a warning in front of the question that froze the Deck, and
make the Deck checks themselves faster, with the knowledge-base roadmap audited before go, current at every step, and
audited again at the end.

## 2. The maintainer's calls

**Answered in the chat on 2026-11-14 (they become decision D141; D140 was the last, D138 is reserved by plan 101, D142
belongs to plan 105):**

1. **Bugs from the main roadmap: the freeze fix and five small ones.** The check before the AI loads (three stars); a
   long chat not summed up with nothing said; the summed-up note with no D-pad stop; the tall "What the AI remembers"
   card on the Session tab; the cut second suggestion chip; the first-start "turn on Internet downloads" message. The
   README refilm and the tab-sections bug stay out.
2. **A second chat is planning the rest of the main roadmap (plan 105). It does not run now. This session is the main
   one.** The two chats agreed the numbers (104, D141 and rows `P104-` here; 105, D142 and `P105-` there) and which
   entries are whose. If plan 105 starts running while this one still is, the sharing rules in § 9 apply.
3. **What the rig may do on the Deck without asking again: all four.** Install this session's library for the checks
   and put the published one back at the end; delete saved chats that the test drivers made, never one of the
   maintainer's; place test pictures and remove them at the end; delete the two old settings backups in the Deck's
   home folder (each holds a copy of the Steam key).
4. **Run length: until the list is done or the week reaches 90 percent.** When a five-hour window passes 75 percent the
   session stops starting helpers, waits, and picks up by itself at the reset.
5. **The Deck is held awake for the whole session**, on its charger, and the hold is released at the end.
6. **Three bigger pieces join:** suggestion chips that keep the closest notes in front; more Left 4 Dead 2 versus
   notes; load-order data for mods (Fallout 4 and Skyrim). **Not this wave:** the add-on pack trial.
7. **A game with no notes: a small line under every answer**, drawn by the plugin, in every mode, Speed included.
8. **Half-Life 2 and Black Mesa notes come from the Half-Life wiki on Fandom**, because their own wiki is still down:
   Half-Life 2 from Fandom; Black Mesa from the pages of its own wiki that were saved on this PC in September, plus
   Fandom only where a page speaks about Black Mesa itself.
9. **Low memory: warn, then let the player ask anyway.** bonsAI loads nothing, shows a warning, and offers a way to
   send the question regardless.
10. **Mod data: the data plus a typed lookup, on trial.** A question that names a mod gets that mod's rule attached,
    worded as what LOOT's list says. It lands switched on only if it finds the right rule for 9 of 10 named mods and
    never claims two mods work together; otherwise it lands switched off.

**Open, each with its default in brackets ("go" takes every default):**

11. **Models and efforts** as in § 4. One note: the bookkeeper is Sonnet medium, not Haiku. Haiku was tried on
    bookkeeping in plan 83 and fell short, and a wrong roadmap is the one thing this wave must not have. *[As listed.]*
12. **The honest "I don't know" stays switched on while its fix is built.** The fix (§ 5a) lands switched on only if,
    on this PC, a made-up boss gets no borrowed detail in at least 5 of 6 answers in both of two runs, and ordinary
    answers keep their facts within the test's own noise (two points). *[That rule. If neither version passes, both
    land switched off with their numbers and the call is yours.]*
13. **The honest opening in Speed mode** (built last wave, off). *[Measured again once the fix is in. It is switched on
    only if a made-up boss is no longer written about as real in at least 5 of 6 Speed answers and ordinary Speed
    answers keep their facts. Either way you confirm or revert with the numbers.]*
14. **The crowding fix, third try** (older questions losing their note as games gain notes). The cause is known now:
    every game's "Starting out" note gets lifted past a note the word search really found. *[One more try with those
    notes left out of the lift. It lands switched on only by the strict rule: no test question loses its right note,
    an exact word match still comes first, "No close match" shows on no new question. If it only wins on balance, it
    lands switched off and the trade comes to you with the table.]*
15. **Two notes share the name "Radscorpions"** (Fallout 4, Fallout: New Vegas). Every search stays inside one game, so
    they never meet; a rename would break five test rows. *[Closed as accepted.]*
16. **The visual maps entry** (the marked screenshot). Last wave's call said it closes either way once the marks test
    has run; the test ran and missed its bar (2.95 of 10 against 7). *[Moved to the parked list with its numbers and
    the bar that reopens it.]*
17. **The screenshot measurement entry.** Its own finish line from plan 103 is met (52 pictures, every picture model
    measured, the two best timed on the Deck, the picture's own guess measured twice). *[Closed as measured. The
    picture's guess stays switched off; its one owed Deck row stays on the list.]*
18. **Phase 5 (notes for every game) closes** when the Half-Life 2 and Black Mesa notes and their test questions are
    in and the Deck row passes. Hades stays without notes (your call of 10 November), so the count ends at 37 of 38.
    *[That finish line.]*
19. **The versus entry** after this wave has only Counter-Strike 2 left, which stays out. *[It stays PARTIAL with that
    one line, until you say close it.]*
20. **Reads: two samples of ten.** One across the new notes (Half-Life 2, Black Mesa, versus) and one from the older
    notes this wave rewrites. A separate checker reads every sentence of the final text against its page and the
    licence reviewer reads every file first. *[On the checks page; the library is published only after your read.]*
21. **The low-memory limit** is set from the Deck's own readings (block D0 reads free memory idle, with the AI loaded,
    with a light game and with a heavy game; no question is asked over a heavy game). The warning's words and the
    "Ask anyway" button go on the checks page for your eye. *[The session picks the limit from the readings and the
    second opinion reads it.]*
22. **Chips.** *[After an answer, the two chips you see are the two notes closest to what you asked; each spot's next
    two chips also come from the closest notes (about half a minute in all); then the usual rotation. A recording goes
    on the checks page.]*
23. **Checking the first-start fix needs a first start.** *[The rig stages one without wiping anything: it moves the
    settings file and the Ollama program aside, checks, and puts both back in the same block, verified. "Clear all
    data" is never used. If you would rather do this check by hand, say so and it goes on the checks page.]*
24. **Push and publish.** *[Nothing pushed, nothing published. At the end: "push" from you, and one library publish
    after your two samples. That publish also removes the Left 4 Dead 2 note "Fallen Survivor" from the public
    library.]*
25. **Standing rules while you are away** (plan 103's): a fix that fails on the Deck twice moves up one model tier
    without asking; a new one- or two-star bug with a known cause gets one helper round of about an hour; anything
    blocked gets the safest choice at once and is raised in the chat and in § 12; never push, publish, merge to main,
    switch branches in the shared folder, type a PIN or password, reload the plugin with a game running. *[Kept.]*
26. **Budget lines.** No new helper past 75 percent of the five-hour window or 90 percent of the week (D128), and the
    counters are read before every batch of helpers. Read when planning ended (2026-11-14, about 15:30 EST): 68
    percent of the five-hour window (it resets at 15:40 EST), 15 percent of the week (resets Wednesday 18 November,
    08:00 EST), and Fable's own weekly counter at 20 percent. They were 3, 6 and 8 when planning began; the plan 105
    planning chat drew on the same counters in those two hours. *[Kept. With Opus running the session, only the
    second opinion draws on Fable's counter.]*
27. **Gaps in the Deck tools project** found on the way. *[Written into the findings log, and drafted as issues in a
    workshop file for you to post. Nothing is posted from the session.]*
28. **If plan 105 starts while this runs.** *[The sharing rules in § 9: one Deck queue, one landing at a time, one
    writer per roadmap file, and the usage counters read before every batch by both.]*
29. **A deploy at minute zero**, so the Deck runs the back-end crash fix of 11 November before anything is checked.
    *[Yes, unless the Deck already has it. Nothing is running on the Deck when it happens.]*
30. **The mod lookup's wording.** *[Every line it adds starts "LOOT's list of <date> says"; it never says a mod is
    safe, and never says two mods work together. The licence reviewer reads it before it lands.]*
31. **The Session tab's "What the AI remembers" card.** It is 669 px tall on a pane that shows about 300. *[A fixed
    height that fits; its text scrolls inside with Down and Up, with a "More below" line, the way the two-button boxes
    have worked since last wave. Plan 105's draft suggested another look for the same card: about ten lines and a
    "Show all" button. Say so if you prefer that one. A picture goes on the checks page either way.]*

## 3. What a player notices after this session

Once the build reaches their Deck (and, for the notes, once the library is published); every line reads "should" until
its Deck row passes:

- **Half-Life 2 and Black Mesa have enemy and item notes**, so 37 of the 38 games do.
- **When the game you are playing has no notes at all, every answer says so** in a small line under it, in every mode.
  Today nothing says so, and that is most people's games.
- **When the notes do not cover a question, the AI says so and stops there**, instead of hanging advice from a
  different boss's notes on it.
- **Left 4 Dead 2:** "how to beat tank" gets the Tank note in Speed mode too; a plain question no longer leans on a
  versus note; a question asked from the infected side leads with the infected note. Ten to fifteen more versus notes.
- **A question that names a mod** in Fallout 4 or Skyrim gets what LOOT's list says about it (if the trial passes).
- **After an answer, the suggestion chips you see first are about what you just asked.**
- **Asking with a heavy game running no longer freezes the Deck:** bonsAI warns first and waits for "Ask anyway".
- **Screen fixes:** reopening Show details keeps the ring in view; a hidden answer's "notes were used" line is no
  longer behind the dock; the summed-up note is a real D-pad stop; the Session tab's memory card fits; the first start
  no longer says "turn on Internet downloads" when they are on.
- **Better notes:** the Deathclaw note explains its variants; the defibrillator note says where the item turns up;
  about 25 sentences the wikis contradict are corrected; 22 "Weak points" lines that named no weakness are fixed; the
  twelve older notes files no longer rest any line on a game's own text.
- **Behind the scenes:** one call runs a whole list of questions on the Deck; the answer test counts honest answers
  and borrowed advice; the wiki reader says so when a wiki is down instead of reporting an empty page as fine; the
  log says so when a long chat needed no new summary.

**How much better shape the knowledge base is in afterwards.** Counted at tip `d58e3155`:

| | Today | After, if everything lands and passes |
|---|---|---|
| Half-done (PARTIAL) entries under "Next" | 5 (honest answers, visual maps, versus, the screenshot measurement, Phase 5) | 1: versus, with only Counter-Strike 2 left |
| Open knowledge-base bugs (not accepted) | 10 | 0 to 2 |
| Knowledge-base fixes still owing a Deck check | 7 | 0 to 3 (the two "panel out of focus" halves may stay proven by tests only) |
| Calls waiting on you | 7 | 2 older reads, 2 samples of ten, and the "confirm or revert" calls that arrive with numbers |
| Games with enemy and item notes in the labelled shape | 35 of 38 | 37 of 38 (Hades stays out, your call) |
| Notes in the library | 890 | about 920 to 930 |
| Notes files whose quotes are sorted by where they sit on the page | 21 of 33 | all |
| Search test questions | 1,556 | about 1,640 |
| Answers that say "no notes for this game" when that is true | never | always, in every mode |
| One question checked on the Deck | about 6 tool calls and 40 seconds | one call for a whole list |
| The six main-roadmap bugs taken along | open | five fixed and checked, or closed with their reason; the cut chip measured, and its new look left to plan 105 |

What stays for later, on purpose: the catalog phase (Phase 8) and its add-on packs, Counter-Strike 2, the device side of
mod knowledge (plan 101), the marked screenshot (it waits for a better picture model), and the rest of the main roadmap
(plan 105).

## 4. Before go, and the exact setup

**The maintainer, about ten minutes:**

1. **Open a fresh chat, pick Opus 5.5 and extra-high in the model picker, and tell it "Run plan 104".** This planning
   chat is Fable at max with a long history; it cannot change its own model, and every one of its turns would be paid
   for out of Fable's own weekly counter. The four files hold everything the new chat needs.
2. **The Deck:** on, on its charger, on its own screen, on the home network, nothing running. It is all of those right
   now. Leave it to the rig while the session runs; if you need it, say so and the session hands it over at the next
   block boundary.
3. **Close any other window that has the Deck tools loaded**, the plan 105 planning chat included once it is idle. One
   of them holds the tools' debug port right now (§ 6). Only one chat may drive the Deck.
4. **Turn phone alerts on in the app** if you want to hear when something is truly blocked. They were off last wave
   and "the Deck is stuck" never reached you.
5. **This PC** stays on. Its AI is running with every model the measurements need (checked 2026-11-14).

**The exact setup:**

| Seat | Runs as | Model and effort | Notes |
|---|---|---|---|
| Runs the session: reading every change, landing, the Deck's failures, the runbooks after D0 | the fresh chat | Opus 5.5, extra-high | writes no code and no roadmap rows itself |
| Note lanes, feature lanes, fixes that need a judgment | `kb-lane`, `feature-lane`, `bugfix-lane` | Sonnet 5.5, high | each in its own copy of the repo; one change per commit |
| Test questions, measurements, mechanical fixes | `kb-lane` or `bugfix-lane-sonnet-medium` | Sonnet 5.5, medium | a measurement lane commits nothing |
| The two D-pad and layout lanes (F1, F2) | `bugfix-lane-opus-xhigh` | Opus 5.5, extra-high | only after block D0's measurement; the second opinion reads F1 before it lands |
| The bookkeeper | a general helper given `.claude/agents/bookkeeper.md` as its instructions (the bookkeeper type does not load in the app's chat) | Sonnet 5.5, medium | works in its own copy, landed like a lane; every status it changes names its evidence file |
| The Deck driver | `deck-driver` | Sonnet 5.5, medium | one at a time; a fresh one per block part, with the last handover |
| The checker, the licence reviewer, the security reviewer | a general helper, `foss-advocate`, `security-auditor` | Sonnet 5.5, high | the two reviewer files say "inherit", so the model is passed by hand |
| The second opinion | `advisor` | Fable, max | read-only; at most six consults, each logged in § 7; its file names an older Fable, so the model is passed by hand |
| Read-only lookups | a general helper | Sonnet 5.5, medium | whoever asked confirms with a search |

Every helper is started with its model and effort passed by hand. At most fifteen helpers at once, the Deck driver and
the second opinion counted in, started two to three minutes apart. A helper runs only its own tests at two workers; the
full checks run once per landing, in the shared checkout. **A ready helper starts at once; holding one back is the
maintainer's choice alone.** The three usage counters are read, and said in the chat, before every batch.

**When a helper is moved up to Opus:** the two D-pad and layout lanes from the start (the record says those fail at
every tier without a Deck measurement, and Opus with one passes); any fix that has failed on the Deck twice, one tier
up, with the measurement in hand; and a Sonnet lane that reports after an hour that it cannot find the cause of a
three-star item. Nothing else: going up because a fix feels hard is what the record says does not help.

**The session's first acts, in this order:**

0. This plan, its three asset files and the driver's rules file were committed by the planning chat on 2026-11-14, at
   the maintainer's word. Confirm they are on the tip: every helper reads them from its own copy.
1. `git status` (other chats' files are theirs), the tip hash, the tail of the decisions file (D141 free),
   `deck_status`, `deck_queue.py list`, the three usage counters said in the chat.
2. The baseline: `python scripts/verify.py --full` on the tip, once, in the shared checkout, in the background.
3. Build the library once (`python scripts/kb/build_rag_db.py --seed --out build/knowledge-base`) and copy it into
   every copy that measures.
4. **Deploy at minute zero** (call 29): read the build on the Deck; if it does not carry the 11 November crash fix,
   deploy the tip with `scripts/build.ps1` from the shared checkout, with nothing running on the Deck.
5. Cut wave A's copies (`python scripts/worktree.py create p104-<lane> --base experimental`), confirm each sits at the
   tip, and start the helpers: the bookkeeper's audit (K0) first, the rest two to three minutes apart, each with the
   rules file, its brief, the tip hash and its copy's path.
6. Deck block D0 with a fresh driver at the same time (§ 6). The Deck never waits for the helpers.
7. Second-opinion consult 1 (§ 7) while wave A builds; its corrections go to the running helpers as messages.

## 5. The work: what can run in parallel, and what cannot

**The rule for parallel lanes is files, not features.** Two lanes never own the same file at the same time. Everything
not named as a wait runs at once. Almost all of this wave can run side by side: of 36 lanes, 21 need nothing but a
free slot (13 of them start in the first minutes), the other 15 each wait for one or two earlier lanes or for the
Deck's first readings, and only the Deck checks run strictly one after another. The full briefs are in
[assets/104-lane-briefs.md](assets/104-lane-briefs.md); this section is the map.

### The lanes

**Groundwork (wave A):**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| K0 | The bookkeeper's audit before anything lands: make room in the roadmap files, write D141, apply the corrections planning found, one open testing row per check (§ 5k) | ★ docs | Sonnet medium | the roadmap files, the testing rows, the decisions file | nothing; lands first, and every landing waits for it |
| T1 | One call runs a whole list of questions on the Deck: type, send, wait for the answer, read back, one evidence file per row; the read-back also gives note numbers and earlier turns | ★★ `[QA]` | Sonnet high | one new script, the read-back script, their tests | nothing; block D0 tries it |
| T2 | The answer test counts "said so in its own words" properly, and gains a count of borrowed advice | ★ `[QA]` | Sonnet high | the answer test's script, tests and fixture | nothing |
| T3 | The look check stops calling a long chip label that is scrolling "cut words" | ★ `[ui]` `[QA]` | Sonnet medium | the look check script | block D0's reading |
| T4 | The wiki reader says "failed" when a wiki is down, instead of "ok" with an empty page | ★ `[KB]` `[QA]` | Sonnet medium | the wiki reader and its tests | nothing |
| X0 | The numbers before anything changes (search, the plugin's own search, tips, answers twice) | ★★ `[KB]` | Sonnet medium | nothing in the repo | the library build |

**Honest answers and search:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| H1 | Borrowed advice: on a turn the plugin marks "notes do not cover this", the loosely matching notes are kept away from the AI or fenced off; two versions measured; then the Speed option measured again (§ 5a) | ★★★ `[KB]` | Sonnet high; the second opinion reads the wording and the numbers | the request file, the prompt file, the turn-facts file, their tests | T2 landed before it measures |
| H2 | "No notes for this game": a small line under every answer when the library holds nothing for the game, in every mode (§ 5b) | ★★ `[KB]` | Sonnet high | the two footer files, the other-game list, their tests | nothing |
| V4 | The three Left 4 Dead 2 mix-ups: Speed mode leads with the note the question names; a plain question does not attach a versus note beside the ordinary one; a question from the infected side leads with the infected note | ★ `[KB]`, the search path (lands alone) | Sonnet high | the search file, the Speed-mode merge in the service file | nothing |
| R1 | The crowding fix, third try: "Starting out" notes left out of the lift (§ 5c) | ★★ `[KB]`, the search path (lands alone) | Sonnet high; the second opinion reads the numbers | the blend function and its constants | X0's baseline; V4 landed |

**Notes:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| N1, N2 | Enemy and item notes for Half-Life 2 and for Black Mesa, one lane each (§ 5d) | ★★★★ `[KB]` | Sonnet high | one new notes file each, with its sources list; N1 also the credits file | nothing to write; lands after the checker and the licence reviewer |
| V5 | Ten to fifteen more Left 4 Dead 2 versus notes | ★★★★ entry, this step ★★★ | Sonnet high | the versus notes file | nothing to write; lands after V4, the checker and the licence reviewer |
| M1 | The two notes the maintainer asked for (Deathclaw variants, where the defibrillator turns up) and the open contradicted points | ★ `[KB]` | Sonnet high | the seed file, five notes files | nothing |
| M2 | The older sightings: about eighteen seed notes their wiki pages contradict | ★ `[KB]` | Sonnet high | the seed file | M1 landed (one helper at a time in the seed) |
| W1 | "Weak points" lines that name no weakness, in the five wave-six files that have them | ★ `[KB]` | Sonnet high | five notes files | nothing |
| S1 to S4 | The twelve older notes files: every quote sorted by where it sits on its page, every line that rests on a game's own text rewritten or dropped (§ 5e) | ★ `[KB]` | Sonnet high, four lanes | three older notes files each, with their sources lists | nothing |
| Q1, Q2, Q3 | Blind test questions: for the two games' notes; for the versus notes; for twelve named mods | ★★ `[KB]` | Sonnet medium | one new question file each | Q1 and Q2: their notes landed (names only); Q3: nothing |
| CH1 to CH3 | The checker: every sentence of the final text against its page, by someone who did not write it; picks the two samples of ten | ★★ `[KB]` | Sonnet high | nothing (reads and reports) | each note lane's report |
| X1, X2 | The numbers after the search and honesty landings, and on the final library | ★★ `[KB]` | Sonnet medium | nothing in the repo | the landings |

**Screen, chips and the main-roadmap bugs:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| G1 | The low-memory warning: before the AI loads on the Deck, read free memory; if it is short, load nothing, warn, and offer "Ask anyway" (§ 5f) | ★★★ `[ask]` `[ollama]` | Sonnet high; the session and the security reviewer read it; the second opinion reads the limit | a new module, the stretch of the ask service before the first model call, one new plugin method, the hint row on the answer screen | nothing to build; its limit waits for block D0's readings |
| F1 | The answer screen's D-pad: the ring above the pane after reopening Show details; the "notes were used" line behind the dock; a Steam stop for the summed-up note (§ 5g) | ★★, ★, ★ `[focus]` `[ui]` | Opus extra-high; the second opinion reads it | the reply actions file, the details panel, the pane's scroll helpers, the summed-up note, the notes line builder, call sites in the transcript file | block D0's measurements; G1 landed |
| F2 | The Session tab's "What the AI remembers" card fits above the dock | ★ `[ui]` | Opus extra-high | the Session section and its style rules | block D0's measurement |
| C2 | Chips keep the closest notes in front after an answer | ★★★ `[KB]` `[chips]` | Sonnet high | the chips folder on the screen side | nothing |
| B1 | First start: "Install Ollama" no longer says "turn on Internet downloads" when they are on | ★★ `[ollama]` `[perms]` | Sonnet high; the session reads it (settings plumbing) | the settings hook, the download notice, the local set-up flow | nothing |
| B2 | A long chat that gets no new summary leaves a line in the log saying why (the other planning chat's lookup found no fault: none was due) | ★ `[chat]` | Sonnet medium | the chat summary files | block D0's log reading; G1 landed |

**Mods:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| L1 | Load-order data: LOOT's free-to-use rule lists for Fallout 4 and Skyrim, pinned to a dated copy, built into the library as its own table, with a reader and tests (§ 5h) | ★★★ `[KB]` | Sonnet high; the licence reviewer reads it | the library builder (one new table), the schema file, a new reader, a new data folder | nothing |
| L2 | The typed lookup, on trial: a question naming a mod gets that mod's rule attached | ★★★ `[KB]` | Sonnet high; the licence and security reviewers read it | a new module, one call site in the service file | L1 landed; R1 landed or turned down |

### Waves, and the clean stopping points

- **Wave A, at go (fifteen at once):** K0, T1, T2, T4, X0, H2, V4, N1, N2, M1, S1, G1, L1, the Deck driver for block
  D0, and the second opinion's consult 1. **Stopping point A:** the groundwork is landed; the "no notes" line, the
  versus mix-ups, the low-memory warning and the load-order data are landed or measured; the two games' notes are
  written and with the checker; the Deck's owed rows and measurements have run.
- **Wave B, as slots free:** S2, S3, S4, W1, V5, C2, B1, H1 (once T2 has landed), R1 (once V4 has landed), F1, F2, B2
  and T3 (once block D0 has measured), M2, CH1, Q1, Q2, L2, Q3, X1; deploy 1 and block D1; deploy 2 and block D2.
  **Stopping point B:** the honest-answer fix and the crowding fix are landed or turned down on their numbers; the
  screen fixes and the main-roadmap bugs are on the Deck and checked; every notes lane has landed or is in its last
  check.
- **Wave C:** CH2, CH3, the last fix rounds, X2, the final library, deploy 3, blocks D3 and DR, the end audit (K9),
  the checks page, the report. **Stopping point C: done.**

Each stopping point gets five lines in the chat and in § 12: what landed, what the Deck showed, the three usage
counters, what is next, anything waiting on the maintainer.

### Where lanes would collide, and how the order avoids it

- **The request file** is one line under its size limit. H1 owns it all session, and its first commit moves a piece
  out to make room. Nobody else adds a line there: G1's "Ask anyway" goes through a small method of its own, and L2's
  call site is in the service file.
- **The prompt file** has one owner: H1. H2 writes no prompt sentence (the maintainer chose the plugin's own line).
- **The search path** (the search file and the service file): V4 first, alone; then R1, re-based and measured again on
  the new tip, alone; then L2's one call site. Each lands with the fixture check in its landing log.
- **The transcript file:** G1's hint row first (wave A); F1 is cut after G1 has landed.
- **The chat summary files:** G1 adds one line at the top of the background sum-up; B2 is cut after G1 has landed.
- **The seed file:** M1, then M2, one helper at a time. **Every other notes lane owns its own files** (the table in
  the briefs says which); no two lanes share a notes file.
- **The answer test:** T2 is the only lane that edits it; everyone else runs it.
- **The library builder:** L1 is the only lane that edits it; the note lanes only run it.
- **The roadmap, testing and changelog files:** the bookkeeper only.
- **This PC's AI model is one process.** The measuring lanes (X0, T2, H1, R1, L2, X1, X2) run one measurement at a
  time and queue; the session staggers them. The note lanes do not need it except for one test build each.

### Work bumped above Sonnet, and why

F1 and F2 are D-pad and layout work: the routing table gives those to Opus extra-high once a Deck measurement is in
hand. F1 has two evidence files with the measured positions from last wave and gets one more reading from block D0
(what holds the ring at the moment the panel reopens). F2 gets its card measured first. G1's hint row reuses a row the
answer screen already has (the "Open the Ollama tab" row), so it stays with Sonnet, and the session reads it against
the focus rules. R1 and H1 change what every question goes through, so the second opinion reads their numbers before
they land, though each change is small.

### 5a. Borrowed advice (H1)

**Read in the code 2026-11-14:** the plugin works out whether a turn will get the "No close match" line before the AI
writes, and on those turns it adds one sentence telling the AI to say its notes do not cover the question. But the
loosely matching notes are still handed to the AI on that same turn, and the instructions still say "ground your
answer in the attached notes". Two orders that pull against each other: the AI opens honestly and then uses the notes
anyway. That is where "Grimthak" got the Dreadnought's weak points.

The lane builds two versions behind switches and measures both: **leave the notes out** on a marked turn (the AI never
sees them, and the screen does not claim they were used), or **fence them** (they stay, with one sentence saying they
are about other things and may be used only if they name what was asked). A cost to measure honestly: about one marked
turn in seventeen has the right note attached anyway, and leaving the notes out loses that help. The landing rule is
call 12. Then the Speed option is measured again with the winner in place (call 13).
**Deck check (P104-HONEST-03):** three made-up names, each worded once: every reply opens by saying the notes do not
cover it and gives no detail about the made-up thing; a real boss question reads as before.

### 5b. "No notes for this game" (H2)

**Read in the code:** the two honest lines the plugin can add ("Not in my notes", "No close match") only exist for
games the library holds. For any other game the plugin already knows it holds nothing (Show details says "none for
this game"), and says nothing under the answer. The lane adds a third line, in the same quiet style as the other two,
in every mode: with a game running that the library does not hold, and with nothing running when the question names a
well-known game the library does not hold. Not on a thank-you, and not on a Deck troubleshooting question (tips are
not about one game). The proposed words, for your eye on the checks page: *"No notes for this game — this answer is
from the model's own knowledge."* **Deck check (P104-NO-NOTES-LINE-01):** Stardew Valley running, one question in Speed
and one in Strategy: both answers end with the line; Hollow Knight: no such line.

### 5c. The crowding fix, third try (R1)

Wave six built the fix twice and turned it down twice; the second time it also found why it costs: every game's
"Starting out" note sits high in the meaning search and the fix lifts it past a note the word search really found.
The patch is kept on a branch. This lane takes it, leaves "Starting out" notes out of the lift unless the question
asks how to start, also tries the older "rank Starting out notes last" switch alone and together, and measures all
three on the search test and on the plugin's own search. Today's numbers to beat: the thirty meaning-only questions
find their note 18 times; last try's version gained 16 and lost 23 on the plugin's own search. The landing rule is
call 14. **Deck check (P104-CROWDING-01, only if it lands):** two of the crowded-out questions, by name, attach their
right note.

### 5d. Notes for two games, more versus notes, and the note fixes (N1, N2, V5, M1, M2, W1)

Last wave's main lesson is built into every notes brief from the start: **write from a fact list, never from the
wiki's sentence; sort every quote by where it sits on the page and use only the editors' own words; have the final
text fact-checked by someone who did not write it.** Whoever writes a note never writes its test question.

- **Half-Life 2 (N1):** ten to fifteen notes from the Half-Life wiki on Fandom, which answers today and prints a
  licence the library already uses for four other wikis. The game already has nine older notes; the lane adds, never
  repeats.
- **Black Mesa (N2):** eight to twelve notes from the 29 pages of its own wiki saved on this PC on 5 September (each
  with its revision and licence), plus Fandom only where a page speaks about Black Mesa itself, because most Fandom
  pages describe the 1998 game. If fewer than eight notes can be stood on a page, the lane writes fewer and says so.
- **More versus notes (V5):** ten to fifteen for Left 4 Dead 2, on subjects the first fifteen do not cover, finales
  left out as before. They land only after the mix-up fix (V4), and the numbers before and after say what they cost:
  last time the first versus notes took two older answers.
- **The maintainer's two notes (M1):** the Deathclaw's page does list variants, the levels they appear at and how they
  differ, so the note gains them. The defibrillator's page gives no chapter-by-chapter list: it says about one a
  level, with No Mercy and The Sacrifice as exceptions. The lane reads the campaign pages too; if they do not say
  either, the note says what the wiki does say and the report says so.
- **Contradicted sentences (M1, M2) and "Weak points" lines (W1):** each is checked against its page fetched again,
  and corrected or left with a reason. The count from the data: 22 of 184 "Weak points" lines name no weakness.

**Deck check (P104-NOTES-HL2-BM-01, block D3):** with the session's library installed, two questions per game, each
naming a subject from the new file, attach a note from it. **And P103-NOTES-23-01 again** for the three games it
missed. Reading its evidence showed the misses were mostly the check's own questions: they asked about subjects only
the older notes hold (a Deathclaw, a Marauder). The re-run asks about subjects the new files hold.

### 5e. The older notes cleaned (S1 to S4)

A wiki's licence covers what its editors wrote, not the game text they quote. Last wave sorted every quote in its 21
new files by where it sits on the page (a description box, a quote block, an attribution line) and replaced every line
that rested on game text. The twelve files from plans 100 and 102 never had that: 1,646 quotes, and about 150 pages to
fetch again because only a few were kept. Four lanes take three files each, sort, rewrite or drop, and a checker who
did not do the rewriting reads the final text against the pages. The "Weak points" lines in these files that name no
weakness are fixed in the same pass. One sample of ten rewritten notes goes to the maintainer (call 20).

### 5f. The low-memory warning (G1)

**What happened on 9 November:** a question was asked with God of War running. The AI needs about 5.8 GB to load; the
game left about 3.5 GB; the Deck's free memory fell under 1 GB and it froze. Nothing in the plugin reads free memory
today.

**What the lane builds (the maintainer's call 9):** when the AI is on this Deck and the model is not already loaded,
the plugin reads free memory and the model's size before loading. If loading would leave less than the limit, it loads
nothing and answers with a warning: how much is free, how much the AI needs, what would help (close the game, pick a
smaller model, use the AI on a PC), and that asking anyway may freeze the Deck. Under the warning is an "Ask anyway"
row, built the way the answer screen's "Open the Ollama tab" row already is. Pressing it sends the same question once
with the check skipped. The background summing-up of a long chat skips itself quietly when memory is short; it has no
"anyway". The AI on a PC is never checked.

**The limit** comes from block D0's readings (call 21), and the second opinion reads it: too low and the freeze stays
possible without a warning; too high and people are warned for nothing.
**Deck checks:** P104-MEMORY-01 (a heavy game running: the warning shows, nothing loads, free memory does not drop,
"Ask anyway" takes the ring and is **not** pressed); P104-MEMORY-02 (a light game: no warning, an ordinary answer);
P102-PICTURE-01 (the picture row owed since plan 102, with a light game). "Ask anyway" itself is pressed only with a
light game and the limit raised for the test, so the path is proven without risking the freeze.

### 5g. The answer screen and the Session card (F1, F2)

- **The ring above the pane (F1).** When Show details reopens, the pane scrolls so the panel clears the dock, and is
  held back by where the ring is. If nothing holds the ring at that instant, nothing holds the scroll back, and a tall
  panel (the Session tab) pushes the "Hide details" line off the top. Seen 4 of 6 times last wave, never with the
  short panel. Block D0 reads what holds the ring at that moment; the fix follows the reading.
- **The "notes were used" line behind the dock (F1).** Only the control that has the ring is lifted clear of the dock.
  The line sits just under "Show details" and is not a stop, so it stays behind. The lift learns to leave room for it.
- **The summed-up note (F1).** The plugin treats it as a stop, but Steam has no stop for it, so with the panel out of
  focus three older paths claim a press that moves nothing. It gets a Steam stop the way the notes line has one.
- **The Session card (F2).** "What the AI remembers" has no height limit: 669 px on a pane that shows about 300. It
  gets a fixed height and scrolls its text, the way the two-button boxes do since last wave.
- **The cut chip** is probably not a fault: the label looks cut because a long label was caught mid-scroll. Block D0
  confirms and lane T3 teaches the look check. How the chip should look instead is plan 105's, drawn first (your call
  in that chat: keep the sliding, fade the cut ends, stop the row short of the screen's edges).

Their Deck rows are in § 6.

### 5h. Load-order data and the typed lookup (L1, L2)

LOOT, the load-order tool many players use, publishes its rule lists under a licence with no conditions (CC0). Plan
101's research measured them: 464 Fallout 4 entries and 1,243 Skyrim entries carry a rule (needs this, load after
that, does not work with the other), about 100 KB in all once packed. Nexus Mods pages are never read or copied.

- **L1** pins a dated copy of each list, keeps the entries that carry a rule (English messages, no links), and builds
  them into the library as their own table, the way the glossary is: an older plugin simply does not see it. A reader
  in the back end finds a mod's entry by its file name or its plain name. A script on this PC takes a load-order file
  and prints what the data says about it, which is the check plan 101's unbuilt half will make on the Deck.
- **L2, on trial (call 10):** when a question in Fallout 4 or Skyrim names a mod the table holds, that mod's rule is
  attached like a note, worded as "LOOT's list of <date> says". Measured on ten or more named-mod questions written by
  someone else: the right rule attached for at least 9 of 10, and in twenty answers no claim that two mods work
  together. Under that, it lands switched off.

**Deck check (P104-MODS-LOOKUP-01, only if L2 lands switched on):** two Skyrim questions naming a mod attach its rule;
a question naming no mod attaches none.

### 5k. The bookkeeper: before, during and after

**Before (K0, the first thing to land).** The knowledge-base roadmap is at 24.97 KB of its 25 KB limit, the testing
file at 164.95 of 165, the parked list at 20.00 of 20. So the first job is to make room: older dated text moves, word
for word, to the long-notes file and the testing archive. Then: D141 written into the decisions file from § 2; the
answered calls taken off the waiting list; the six corrections the planning audit found (§ 8) and the readings from
the lookups; the knowledge-base entry that still sits on the main roadmap moved over; the three paper closings (calls
15 to 17); one open testing row per check in § 6. The audit that found those six corrections checked about seventy
other claims in the file (every commit, every evidence file, every row, every link) and found them right.

**During.** After every landing chain and every Deck block the bookkeeper gets the session's result list and moves the
entries, one commit, in its own copy, landed like a lane. A landed fix moves to "Deck check owed" naming its row; a
Deck pass moves to Done naming its evidence file; a fail goes back with what was seen. The session spot-checks every
sweep against the evidence files. **The roadmap is current at every stopping point**, so a look from a phone shows
where each entry stands. A new bug or a new owed check found on the way goes in at the next sweep.

**After (K9).** The same audit as K0 once the last landing and the last Deck block are in: every entry moved this
session names its row and its evidence; every number in "Where things stand" is counted from the data that day, not
carried over; the entries read as calls 15 to 19 say; every roadmap file is under its limit.

## 6. The Deck: rolling blocks, and the state of the Deck tools

**The Deck tools project** (Decky Plugin Studio, the controller rig's software, its own repo): version 0.3.12, released
2026-11-04, on its main branch with nothing uncommitted and nothing unpushed, and no work since that day. 49 tools, 850
tests; the one test that failed now and then has a name now (a press-deadline test that loses a race when the PC is
busy, about 3 runs in 11). Two issues are open there, both old. Read from the planning chat on 2026-11-14: the Deck
answers, this PC's AI answers, the controller board is on COM7 running the newest program, the stop switch is armed,
and nobody holds the Deck. One of its nine self-checks fails: another chat's copy of the tools holds the debug port
(§ 4, step 3).

**What still costs time, read from last wave's Deck handovers:** tool results too big for a driver's working memory
(typing, walks, opening the plugin and sweeps can each return tens of thousands of characters), which is why most
blocks needed three drivers; waiting for an answer with a 60-second default; a game and the AI together using all the
memory; the first press after an answer being swallowed because nothing holds the ring; and rows that could not
produce their case. None of last wave's six asks to the tools project has been built, and about twenty findings in the
findings log were never filed there.

**What this plan does about speed and quality:**

- **One call for a whole list of questions.** Lane T1 writes a script that types each question, sends it, waits for
  the log to say the answer is done (with a long limit), reads back the notes, the lines and the covers, and saves one
  evidence file per row, returning a few lines instead of pages. Block D0 tries it against the old way.
- **The driver's own rules now match the tools.** Three of its seventeen rules were out of date (how a question is
  sent, how a game is launched, the "opening fails once" rule) and it had no rule about keeping results small. The
  file is updated with this plan; a fresh chat loads it.
- **Checks as the work lands:** up to four deploys, each followed by a block; a fresh driver per block part with a
  short row list and the last handover.
- **The Deck held awake all session** (call 5), so a night block cannot be lost to sleep again; if Steam's "suspending"
  overlay sticks, one planned sleep and wake clears it.
- **The freeze rules stay:** free memory read before every question and every launch; no question while a heavy game
  runs; stop at two timeouts.
- **The "panel out of focus" state has a recipe now.** Two owed rows have never been checked in that state because the
  Deck never showed it. Old evidence files hold a way that did produce it: a game up for eleven minutes or more, the
  paperclip's screenshot route, then Quick Access reopened. Block D0 tries it.
- **Still a limit:** the rig cannot touch the screen and cannot play. A check that needs a finger or a boss on screen
  stays on the checks page.

**What would help beyond this plan, in the tools project itself** (a change there loads only into a chat started
afterwards, so it cannot help a session already running): a "short result" switch on the four chatty tools; typing
that takes the ring by itself and a wait that knows an answer has finished; time limits on the deploy's copy steps; a
game exit that does not depend on Steam's debug page; the flaky test fixed. A short session in that repo before "go"
would let this session load the better tools. It is offered as its own task, and this plan does not depend on it.

**The blocks.** One driver per block part, a fresh one each time. Every block starts by reading `deck_status` and the
Deck queue, takes or renews the keep-awake hold, reads which screen is live, reads the build and the library, and uses
one test chat. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. One evidence file per check, never
overwritten, a picture beside every look the maintainer judges. **Unload the Deck's AI before launching a game; never
reload the plugin with a game running.** A question is worded once and never repeated word for word.

| Block | When | What |
|---|---|---|
| D0a | Minute zero, after the deploy | Setup; the two old settings backups deleted (P104-D0-BACKUPS); the test chats sorted and one clean test chat started (P104-D0-CHATS); the smoke pass (P104-D0-SMOKE); **the crash fix of 11 November** (P104-KB-THREADS-01); **free-memory readings** idle, with the AI loaded, with a light game, with a heavy game, no question asked over a game (P104-M-MEMORY); the question-list script tried against the old way as soon as T1 has landed (P104-D0-RUNNER) |
| D0b | Right after, a fresh driver | **Measurements the lanes wait for:** Show details closed and reopened on the Session tab, three tries, reading what holds the ring (P104-M-REOPEN); the "notes were used" line's position with the ring on Show details (P104-M-CAPTION); the summed-up note in a summed-up chat (P104-M-SUMMARY-NOTE); the Session card's size and whether its lower half can be reached (P104-M-SESSION-CARD); the second chip's label, two pictures three seconds apart (P104-M-CHIP-CUT); one question in the long test chat for the summing-up's log lines (P104-M-SUMUP-LOG). **Owed rows:** P103-NOTES-AFTER-AUTO-OPEN-01; STRAT-SPOIL-NAME-01 with new wording |
| D0c | After D0b, a fresh driver | **The out-of-focus recipe** (P104-M-LOSTFOCUS): a light game up for eleven minutes, the paperclip route, Quick Access reopened, the page's focus read. If it reads "no focus": P103-DETAILS-STRIP-01's owed half and P102-UNDO-FOCUS-01 in that state. If not, both stay "proven by tests only" and go on the maintainer's list for good. Also P103-DETAILS-STRIP-01's in-focus leftovers (two fresh chats, an older answer, a covered answer) |
| D1 | After wave A's landings and deploy 1 | One check per landed item: P104-NO-NOTES-LINE-01; P104-VERSUS-SPEED-01, P104-VERSUS-TANK-01, P104-VERSUS-HUNTER-01; P104-MEMORY-01 and -02; P102-PICTURE-01; the look check on each tab touched; the free-play sweep with and without a light game |
| D2 | After wave B's landings and deploy 2 | P104-HONEST-03; P104-DETAILS-REOPEN-01; P104-COVERED-CAPTION-01; P104-SUMMARY-NOTE-STOP-01; P104-SESSION-CARD-01; P104-CHIPS-CLOSEST-01 with a recording (P103-CHIP-ORDER-01 closes on it); P104-FIRST-RUN-01 (the staged first start, call 23); P104-SUMUP-02 (the same reading also answers the older row P103-SUMUP-01 on the main roadmap's Verify list); P104-CROWDING-01 if R1 landed; the look check; the sweep |
| D3 | The final library and deploy 3 | P104-NOTES-HL2-BM-01; P103-NOTES-23-01 again for the three games it missed; P104-VERSUS-02 (the new versus notes; a last-map question does not give the ending away); P104-MODS-LOOKUP-01 if L2 is on; the six saved knowledge-base walks saved again on the final build |
| DR | The end | The smoke pass again; **put everything back:** the published library (Remove, then Download; the version read back as 2026.11.10), every setting key by key, the placed pictures removed, pinned test chips cleared, the game closed, the drivers' test chats deleted, this plan's own settings backup deleted once the put-back is verified, the keep-awake hold released, the Deck queue closed |

**A check only the maintainer can do** goes on the checks page in a "Plan 104" group, with its pictures beside it,
never left in the chat: the two samples of ten; the "no notes for this game" line's words; the low-memory warning and
its "Ask anyway" row; the chips recording; the Session card's look; any row that needed a finger.

## 7. The second opinion (Fable at max)

The `advisor` helper, read-only: one bounded question with the exact files and evidence, one recommendation back. At
most six.

| # | When | The question |
|---|---|---|
| 1 | As wave A starts | The briefs against the code: does any brief name a cause the code does not have, a file another lane owns, or a Deck pass its tests cannot stand for? |
| 2 | Before H1 lands | Leave the notes out, or fence them: which, given both tables of numbers, and does it make the AI honest without making it timid on questions the notes do cover? |
| 3 | When R1 has its numbers | Does the third version pass the strict rule; if it only wins on balance, is the trade worth putting to the maintainer, or is it time to accept the bug? |
| 4 | Before F1 lands | The change against the focus rules and the Deck readings: any plain hop across containers; does a test fail without the change at the level the Deck looks at; can any walk loop? |
| 5 | Before G1's limit is set | The Deck's memory readings and the proposed limit: where does it warn for nothing, and where does it miss a real freeze? |
| 6 | Before the report | What to tell the maintainer first, what to leave open, which items must not be called done. |

A fix that has failed on the Deck twice also earns one consult, out of the same six: what the two failures say, and
what to try third. Log, one row per consult: time, the question in one line, the answer in one line, what it changed,
the cost.

| Time | Question | Answer | What changed | Cost |
|---|---|---|---|---|
| | | | | |

## 8. Things to bring to the maintainer's attention

- **Pick the model before "go".** This planning chat is Fable at max and cannot switch itself. The run needs a fresh
  chat on Opus 5.5 at extra-high (§ 4, step 1).
- **Plan 105 is being planned in another chat today**, for the rest of the main roadmap. Its prompt asks for the Bugs
  and Verify lists of both roadmaps near zero and for the Deck all session, so the two chats have agreed who owns
  what: the knowledge-base roadmap and six main-roadmap bugs here, everything else there. It does not run now. If it
  starts while this is still going, the rules in § 9 keep them apart, and both draw on the same usage counters.
  Plan 105's file still carries its own versions of three of this plan's six entries (the first start, the long
  chat, the Session card) and a lane for the summed-up note. Because 104 runs first and 105 opens with a fresh audit,
  whatever 104 closes drops out of 105. Two things came the other way: its lookup found the long chat's missing
  summary is no fault (none was due), which shrank lane B2; and the Session card is the one place where the two
  drafts disagree on the look (call 31). **Later the same afternoon** the plan 105 chat wrote that it had removed all
  of this plan's entries and Deck rows from its own plan, so no overlap is left. Two notes for it, since it reads
  this file: the cut chip's entry is not closed here (the look check's false alarm is fixed by plan 104; the softer
  look is plan 105's); and this plan's block D2 also answers the main roadmap's older row P103-SUMUP-01, so plan 105
  need not run that row if this plan's report shows it.
- **The roadmap files are full again.** The knowledge-base roadmap has 0.03 KB of room, the testing file 0.05, the
  parked list none. The bookkeeper's first job is to move older text out, word for word. Every landing waits for it.
- **What the audit of the knowledge-base roadmap found (K0 applies all of it before anything lands):** the count of
  blind questions is worded wrongly (620 rows in 21 files today, of which 584 are for the 20 games); "22 pictures show
  a boss" cannot be reproduced from the file (24 name a boss or an enemy); "every Deck check has run or is named here"
  is no longer true, because the crash fix of 11 November owes a row the file never mentions; that fix's entry sits on
  the main roadmap though it is knowledge-base work; one decision's heading says "open" where the roadmap says
  "accepted"; and the file needs about 3 KB moved out. Nothing else was wrong in about seventy checks.
- **What the lookups corrected:** the freeze entry says "about 770 MB free" and "the second try timed out"; the
  evidence files say 970 MB at the lowest reading and that both tries timed out. The "summed-up note has no D-pad
  stop" entry is half right: the plugin has a stop for it, Steam does not. The cut chip is probably a long label
  caught mid-scroll. Last wave's "17 of 20 games" Deck result was mostly the check's own questions: they asked about
  subjects only the older notes hold. The two records of the "six Left 4 Dead 2 rows" disagree on one row; K0 settles
  which is right. The crowding fix's landing rule quoted an old number (23 of 30; it is 18 today).
- **The wiki for Half-Life 2 and Black Mesa is still down**, and the wiki reader reported its empty pages as "ok". The
  notes come from Fandom (call 8), and lane T4 makes the reader say "failed".
- **Leaving the notes out on a marked turn has a price.** On about one such turn in seventeen the right note was
  attached anyway; the AI would lose it. That is why two versions are measured and the second opinion reads both.
- **"Warn, then ask anyway" keeps the freeze possible** for someone who presses on. The warning says so in plain
  words, and the check proves the warning, not the freeze: "Ask anyway" is never pressed with a heavy game running.
- **The crowding fix may fail a third time.** Then the honest choices are to accept the bug or to take the trade; the
  table comes to you either way (call 14).
- **The mod lookup is new ground.** Plan 101 designed the data to be used once the plugin can read a mod folder. Using
  it for a typed question is this plan's own addition, on trial, behind a bar (call 10), and worded as LOOT's list.
- **The first versus notes cost two older answers.** The new ones land after the mix-up fix and are measured the same
  way; if they cost answers again the report says which.
- **Publishing the library is yours, after two samples of ten.** The public library still holds the "Fallen Survivor"
  note you asked to remove; it leaves at this publish.
- **Moving the settings file aside on your Deck** is how the first-start fix gets checked (call 23). It is put back in
  the same block. Say "by hand" if you would rather not.
- **The driver's rules file changed** (`.claude/agents/deck-driver.md`): four rules brought in line with the tools.
  It was committed with this plan; say so if you want it put back as it was.
- **153 copies of the repo are on disk** and this wave adds about forty; the disk has 114 GB free. Clearing the old
  ones is a job for the copy script's own prune, never git's, and not for this session.
- **Ten notes you left on the checks page in October** are still unanswered (plan 103's report lists them). They are
  main-roadmap matters, so they are plan 105's to start from.
- **Time and usage.** About 80 helper runs and about a dozen Deck block parts. A five-hour window is worth about 25
  runs, so three to four windows: a day to a day and a half with the waits. The week's counter should end near 50 to
  55 percent (15 now); it resets Wednesday morning. Plan 105 then draws on what is left of the same week.

## 9. Standing rules while nobody is watching

Plan 103 § 9 in full: the library is never published from the session; a new library reaches the Deck only through the
Developer tab's install route and the published one is put back at the end; a note lane never writes a sentence it
cannot point at in a page the reader fetched; evaluation reports are never committed to this repo; a lane that touches
the search path lands alone, with the fixture check in its landing log; one test chat only; every roadmap move names
the row it owes, and nothing moves to Done without its evidence file; nothing personal leaves the Deck; a driver
deletes a saved chat only when its first question matches a runbook or an evidence file word for word.

New this wave:

- **Never a question over a heavy game.** The low-memory warning is checked by reading that it showed and that nothing
  loaded. "Ask anyway" is pressed only with a light game.
- **Staging a first start** moves two things aside and nothing else, writes both into the handover's put-back list
  before moving them, and puts them back in the same block.
- **This plan's own settings backup is deleted at the end**, once the put-back has been checked, so no copy of the
  Steam key is left in the Deck's home folder this time.
- **Sharing with plan 105, if it starts running:** before every Deck block, a line in the Deck queue
  (`python scripts/deck_queue.py add`), started only when no lease shows and the queue hands the row out, closed with
  the build, the library and the hold's state; blocks under forty minutes, taken in turn. Before every landing, the
  landing lock (`mkdir` on `bonsai-landing.lock` inside the repo's git folder; it fails while the other chat lands),
  removed when the landing's checks finish. One writer per roadmap file: the knowledge-base roadmap is this plan's,
  the main roadmap passes to plan 105's bookkeeper from the moment it starts, and this plan's results for its six
  main-roadmap entries are handed over in a file. Docs conflicts are settled by hand, never by taking one side whole.
  Both chats read the usage counters before every batch.

## 10. Keeping the PC and the Deck awake, and usage pauses

The desktop app keeps this PC awake. The rig's keep-awake hold is taken for eight hours at the first block and renewed
at the start of every later block, and released only by block DR (call 5). If Steam's "suspending" overlay shows and
buttons do not clear it: release the hold, one planned sleep and wake of sixty seconds, take the hold again. Before a
planned pause for a usage window the session leaves a background timer running that ends at the reset, so its
finishing wakes the chat. § 12 keeps a pick-up list current: the tip, what has landed, the helpers in flight with
their branch names, and the next three acts, so this chat after a pause, or a new chat, can carry on with nothing
planned again.

## 11. Paperwork and the reports

- **After every landing chain and every Deck block:** the bookkeeper's sweep (§ 5k), one commit; a few lines in § 12,
  committed.
- **New bugs and new checks found on the way:** into the roadmap at the next sweep, into the report, and (one- and
  two-star, cause known) into a helper round the same session, about an hour each. A bug that resists is written up
  and left open. The briefs file has a template for these.
- **At every stopping point:** the five lines of § 5, "Waves".
- **At the end, two write-ups, as AGENTS.md asks.** In § 13: what the maintainer must do next; what a player notices;
  the code work by area (file paths, a technical explanation, what popped up and how it was handled, what the
  maintainer could have done differently); a plain developer guide to what was built; what failed and why; what is
  left and why; the numbers. The status report (plan 37) gets a dated paragraph; the checks page gets its group; plan
  33 gets its rows; the Deck tools findings go into `docs/mcp-setup.md` and the drafted issues into the workshop.
- `python scripts/verify.py --full` passes on the final tip before the maintainer is asked to push.

## 12. Progress log and questions

- **2026-11-14, afternoon (the planning chat, Fable at max):** both roadmaps and plan 103 read; ten read-only lookups
  by Sonnet helpers (the honest-answer path; the search blend and the versus rule; five answer-screen problems; the
  memory freeze, the crash fix and the first-start bug; the next step of each big entry; the Deck tooling and last
  wave's handovers; an audit of the knowledge-base roadmap; note sources and the older notes; plan 101's load-order
  design; the exact Deck recipes), their file and line claims checked against the code for every lane that builds;
  the data counted by script (38 games, 890 notes in the seed and 33 files, 185 tips). The maintainer answered ten
  questions in three rounds (§ 2, calls 1 to 10). The plan, the helper rules, the briefs and the first Deck runbook
  written; the Deck driver's rules file brought up to date. Read, not changed: the Deck (reachable, armed, no lease,
  nothing running); the Deck tools (0.3.12, clean, one self-check failing on the debug port); this PC's AI (every
  model present); the live wiki reader against three wikis (pages saved only in the planning chat's scratch folder).
  The other planning chat (plan 105) read this plan's files, took 105 and D142, and wrote the same split into its
  own plan file, with "104 first, then 105" as the maintainer's call there. Its messages reached this chat; this
  chat's messages to it were held and never arrived, so the two plan files are the record of the split. Tip `d58e3155`, in
  step with GitHub, D141 free. Usage when planning ended (about 15:30 EST): 68 percent of the five-hour window
  (resets 15:40 EST), 15 percent of the week, Fable's own counter 20 percent (3, 6 and 8 when planning began; both
  planning chats drew on them). The five plan files were committed that afternoon at the maintainer's word (the first
  commit after `d58e3155`); plan 105's files and two mock-up folders in the same checkout are the other chat's and
  were left alone. Waiting for "go".

**Questions for the maintainer (the safest choice is taken meanwhile):** none yet.

**Pick-up list:** not started. A chat told "Run plan 104" begins at § 4, "The session's first acts".

## 13. Report

Written at the end by the chat that ran the session, in the shape of plan 103 § 13.

## 14. Subagent reports and follow-ups

The second opinion (§ 7): every consult logged above, with what it changed. The licence reviewer: reads every new or
rewritten notes file, the load-order data and the lookup's wording before they land; its findings and the lanes' fixes
are recorded here. The security reviewer: reads T1's script (it reaches the Deck over SSH), G1 (it reads the Deck's
memory and adds a plugin method), B1 (permissions) and L1 with L2 (a new table and a new path from a typed question to
it). Focus and layout: F1 carries the second opinion's read before landing, and F1, F2 and G1's hint row carry their
Deck rows as the gate.
