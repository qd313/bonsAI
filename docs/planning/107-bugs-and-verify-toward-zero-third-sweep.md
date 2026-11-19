# 107 — Bugs and owed checks toward zero: the third sweep (both roadmaps)

Written 2026-11-19 by the planning chat (Fable 5.2), from [roadmap.md](../roadmap.md) and
[roadmap-kb.md](../roadmap-kb.md) at tip `28306e896`, four read-only lookups of the code behind every open entry,
the Deck's state read the same afternoon, and the maintainer's answers in the chat. Plain language on purpose: this
file is for the maintainer first.

**Status: READY, waiting for "go".** Nothing in it is built. Decision number D144 and the row prefix `P107-` are
taken by this plan.

**Who runs it:** a fresh chat on **Fable 5.2 at high effort**, told "Run plan 107" (the maintainer's choice for this
session; the routing table's usual pick is Opus at extra-high). A fresh chat, not the planning chat: the planning
chat already holds a third of a full memory, which makes every later turn dearer. Helpers: Haiku 5.5 high, Sonnet 5.5
medium and high, Opus 5.5 where § 7 says so, Fable 5.2 max for the two hard search bugs and the hard second
opinions.

**Its working files:** the rules every helper reads, [assets/107-helper-rules.md](assets/107-helper-rules.md); one
paragraph per lane with the code facts, [assets/107-lane-briefs.md](assets/107-lane-briefs.md); the mock-up briefs,
[assets/107-mockup-briefs.md](assets/107-mockup-briefs.md). The standing way to run a wave is
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); this plan says only what is different.

**Read first:** [docs/lessons-learned.md](../lessons-learned.md) § 3 and § 4, plan 106 § 13, and
[docs/audit/cancel-and-slow-controls-2026-11-18.md](../audit/cancel-and-slow-controls-2026-11-18.md).

---

## 1. One sentence

Fix every open bug that can be fixed without a new decision, run every owed check the controller rig can reach
(including the ones marked "by hand" that you have now allowed), draw every open decision so you can pick, and end
with both lists as short as honesty allows.

## 2. Where the lists stand, and an honest forecast

| List | Today | What this plan can close by itself | What stays, and why |
|---|---|---|---|
| Main roadmap, Bugs | 19 | up to 12 by itself, and up to 5 more through your picks of 2026-11-19 (§ 4) | one still waits for a pick (tab 5), and half of another (what X does, tab 7); the README clips close only on your yes to the new ones |
| Main roadmap, Verify | 38 | about 22 to 26 | about 8 need your hands (a finger, a locked account, a real fight, your eye); a few can only ever be proven by tests and come to you as a yes-or-no list |
| Knowledge base, Bugs | 7 open, 5 accepted | 2 to 5 | the two hard ones close only if the fifth try meets the bar you set; the accepted five move to their own list |
| Knowledge base, Deck checks | 7 | 3 to 4 | two cannot be produced on a real screen; one needs a game played once by hand |

These are forecasts, not promises. A bug that is not reproduced is not called fixed. A check that could not produce
its case is written "could not run", never "passed". A fix that misses its bar lands switched off or not at all.

## 3. Your answers (2026-11-19, in the chat)

1. **The Deck, by itself, while you are away: yes to all four.** The knowledge library (update, cancel part way,
   remove, then install the newest published one, 2026.11.10: the Deck ends on the newer library); one real Ollama
   update; removing and rebuilding the voice engine; small test downloads of an AI model, deleted after.
2. **A full wipe of bonsAI's data on the Deck: "Yes, near the end."** Everything is backed up first and put back
   after. About 7 GB is downloaded again. This closes the first-time-setup checks by the rig.
3. **"Ask anyway" beside God of War: "Yes, as the very last check."** It may freeze the Deck; everything else is
   finished and put back first.
4. **Checks no real screen can produce: "List them for my yes or no."** The session tries every harder route
   first. Nothing closes without your word.
5. **This PC as a stand-in: "Only reaction checks"** may close on it (a label changing at the press), marked
   "stand-in". Layout and D-pad checks need the Deck.
6. **Which screen: the Deck's own.** You unplug the outside screen's cable before you leave and keep the charger
   in. The outside-screen half of the look check stays owed.
7. **Before you go:** you bring Big Picture to the front on this PC. On renaming a chat with your own controller
   you wrote: "yes i was able to rename a chat successfully". *The session reads this as a pass of the hand check
   (Rename chat, A on the name, Steam's keyboard shows with an outside controller). It is filed as passed by your
   hand only once you confirm that it was with the outside controller and the keyboard came up.* Playing Doom 64:
   Retribution once was not ticked; it stays on your list.
8. **Side jobs:** move the "accepted" bugs to their own list: yes. Refilm the README clips: yes, at the end if time
   is left. A fifth try at the two hard search bugs: yes, in your words "Use fable max worker for the two hard
   search bugs". **Push as we go: not ticked.** Only this plan is pushed; every later commit waits for your word.

## 4. Your picks, and the calls still open

**Drawn, on mock-up board 6:** <https://claude.ai/artifact/QGFsXVuRXkDcH3YDcqjsKv> (open it in a web browser signed
in to claude.ai, not in the Claude app's own panel, or your picks are not saved; notes in
[the board's folder](../demos/mockup-board-6/README.md)). One tab per call. The session builds only what is picked; with no pick,
nothing is built and the entry stays open.

**Picked on 2026-11-19** (read from the page that evening; your notes are quoted word for word). The first
bookkeeping sweep files these under this plan's decision number.

| Tab | The call | Your pick | What it starts |
|---|---|---|---|
| 1 | Where the "summed itself up before this answer" row sits | **A:** above the answer it speaks of | lane T1. The D-pad meets the row on the way down to the answer |
| 2 | The cut-off "Keep the Deck awake…" line on the download card | **A1:** "Keep the Deck awake and online until done." | lane C1, words only |
| 3 | Reinstall on a voice engine that is already there | **B:** Reinstall really removes it and downloads it again (about 650 MB, plus the build's own tools, then a rebuild of some minutes) | lane R1, after the voice safety lanes |
| 3 | The library's line after a reload | **One line for both:** "✓ Library ready." | lane D2, already in wave 1 |
| 4 | Community copies of models (a name with a slash) | **B:** used from the middle level up ("Also try open-weight models"). "Open source only" still passes them over, and says so. The name box takes such names | lane M1, with a licence read and a security read |
| 6 | Reaching the download bar's Cancel on Main with the D-pad | **B:** Down from any stop of the question strip lands on Cancel; Up goes back | lane M3, after its Deck measurement |
| 7 | Update on the Ollama tab starts at one press | **A:** ask first ("Update Ollama?", with the size) | the first half of lane X1. It brings back the box that was taken away on 10 October |
| 8 | Ten chats, then Cancel | **1A:** the question stays in the box | nothing to build: it is built. Filed as your word |
| 8 | The Pyro character's suggestion line | **2A:** on the chip only | lane S1 |
| 8 | "Ask anyway" reads "Asking…" from the press | **Liked**, with the note "Make the button look more like the other buttons in steam os and bonsai, this looks cheap" | lane A1 builds "Asking…" (wave 1). The look is a new call, in the next table |
| 9 | Tell the AI when a game has no notes | **Leave it:** only the player sees the line | nothing to build. The call is closed |

**Still open.** In the chat you wrote that some calls were hard to understand. Three things were at fault and were
put right the same evening: the page could only be driven from a keyboard (it now has tap buttons for the D-pad at
its foot), tab 5 opened an empty grey box on a tap and could not close it, and two calls were written in the
session's own words. The calls below were redrawn or reworded.

| Tab | The call | Where it stands | If you do not pick |
|---|---|---|---|
| 5 | The Ollama tab's "AI models" takes A, Down, A to open | Your note: "This one doesn't work". Redrawn: each choice has a "Show me" button that plays the presses | not built |
| 7 | What X does while a long job runs | Your note: "I don't want x to stop anything". Drawn as a new choice C: X stops nothing, only A on Cancel stops, and the small X beside Cancel goes away | stays as it is. The X half of lane X1 waits, and so does X on Main's bar in lane M3 |
| 8 | The look of the "Ask anyway" button | Two looks drawn: wide and frosted like bonsAI's own buttons (Look A), or wide and flat grey like Steam's (Look B) | keeps today's small look |
| 9 | An unused switch inside the code (the honest answer's Speed option) | Reworded. No screen shows it, so you can skip it | stays, switched off |
| 9 | The box that asks before the first downloads: its explaining sentence comes last | Reworded | stays as it is |

**Not drawn, because nothing on screen changes:**
- **Old backups in the Deck's home folder:** the 208 MB one from plan 100 and six smaller ones from August and
  September. Delete or keep? *[kept until you say]*
- **The Deck's Ollama** is 0.40.16 since the accident of 15 November. The real update in block C moves it to the
  newest version. *[taken as fine: you allowed the update]*
- **The reads only you can do** (ten whole replies; plan 100's wording; two samples of ten notes) are not part of
  this plan.

## 5. What a player notices after this plan

- **Buttons answer at the press:** "Ask anyway" reads "Asking…"; removing the library changes its line and its
  buttons together.
- **Clearing the question box no longer hides "Was this helpful?".**
- **A chat that cannot be opened leaves you where you were,** on the new-chat spot, with a message.
- **Stop and Cancel cannot hang:** Stop in the middle of an answer, and Cancel while a download is still
  connecting to its site, both end within about a second even on a dead network.
- **An Ollama update shows how far it is,** in megabytes, and its box names every site it contacts.
- **In Browse models the D-pad reaches "Type a model name by hand".**
- **In a chat whose last answer was stopped, Down reaches the question box** (if the Deck shows the loop again; see § 7).
- **The voice engine's build is safer** in eight small ways nobody should ever notice.
- **Search:** a Left 4 Dead 2 pouncing question finds the Hunter note; the two hard search bugs get one more try
  against the same bar.
- **From your picks (§ 4):** the download card's line reads whole; the "summed itself up" row sits above the answer
  it speaks of; Reinstall really reinstalls the voice engine; a community copy of an open-source model can be
  downloaded by name and is used from the middle level up; on Main, Down from the question strip reaches the
  download bar's Cancel; Update asks first; the Pyro character's suggestion shows on the chip only.
- Plus whatever you pick of the five calls still open.

## 6. Who does what

| Who | Model | Does |
|---|---|---|
| The one running the session | Fable 5.2, high | Writes the task texts and the Deck checks, reads every change before it lands, lands, reads every Deck failure, keeps the run log. Never writes code; never edits the roadmap or testing files by hand |
| Mechanical one-star fixes | Haiku 5.5, high | Lanes A2 and D2, and the words-only pick (C1). Kept under 100,000 tokens: see below |
| Fixes that need a judgment | Sonnet 5.5, high | Most lanes |
| Small fixes with one clear way, the bookkeeper, the Deck drivers, the runbook writer | Sonnet 5.5, medium | Never Haiku on the Deck |
| D-pad and layout fixes | Opus 5.5, medium (high for the Down loop and the bar on Main) | Only with a Deck measurement in hand |
| The two hard search bugs | Fable 5.2, max | Lanes KB and KC (your call) |
| Security and licence reviewers | Sonnet 5.5, high (model passed by hand) | Read every download, build and install change before it lands |
| Second opinion, ordinary | Fable 5.2, medium | Before each D-pad or layout landing, before the wipe, before the report |
| Second opinion, hard | Fable 5.2, max | The Down loop; the tab-bar ghost; any fix that fails on the Deck twice; any check that could not run twice |
| Mock-ups | Opus 5.5, medium or high; Fable for the important ones or when you ask | Board 6 |

**Keeping Haiku cheap.** Haiku 5.5 costs five times more on any request over 100,000 tokens, and every request
carries everything the helper has read so far. So a Haiku brief names exact files and line ranges, the helper reads
nothing else, and it stops and reports if the job turns out bigger (rule 4 of the helper rules). The session reads
each Haiku helper's size from its log every few minutes with a small script and stops it at 80,000; the job then
goes to Sonnet medium with the helper's notes, and the miss is logged in [plan 33 § 4d](33-model-routing.md).

**The usage lines are yours and unchanged:** no new helper past 75 percent of the five-hour window or 90 percent of
the week; the counters are read before every batch and written in the run log; a ready helper is never held back
for any other reason. Expect two or three five-hour windows; near a line the helpers pause until the reset and the
session says so. **Fable has its own weekly counter** (13 percent at planning time). Running the session on Fable
plus two Fable max workers may use half of it or more. If it passes 75 percent the session tells you and asks
whether a fresh Opus chat should take over from the run log.

At most ten helpers at once (fifteen is the ceiling; ten keeps this PC usable as the stand-in). Starts are
staggered by two minutes. **Every helper start names its model and effort by hand:** the reviewers' files take the
session's model (Fable) if nothing is passed, and the second-opinion helper's file still names the older Fable.

## 7. The fix lanes

Facts, files and pass sentences for each: [assets/107-lane-briefs.md](assets/107-lane-briefs.md).

**Wave 1, at go.** Bookkeeper first (K0, § 11), then:

| Lane | What a person gets | Model | Waits for |
|---|---|---|---|
| A1 | "Ask anyway" shows it was pressed | Sonnet medium | nothing |
| A2 | Clear keeps "Was this helpful?" | Haiku high | nothing |
| A3 | Stop cannot wait on a stalled stream | Sonnet high | nothing |
| A4 | A chat that cannot be read puts you back on the new-chat spot | Sonnet high | nothing |
| D1 | Cancel while a download is still connecting ends at once | Sonnet high, security read | nothing |
| D2 | "Removing…" and the buttons change together; one true library line after a reload | Haiku high | nothing |
| O1 | The update card shows megabytes; a surer hand-back; every site named | Sonnet high, security read | nothing |
| V1 | Voice engine build: three safety gaps | Sonnet high, security read | nothing |
| P1 | Browse models: the D-pad reaches the typed-name field | Opus medium, second opinion | nothing (the Deck evidence matches the code) |
| KA | Left 4 Dead 2: the pouncing question, then one mix-up row | Sonnet high | nothing |
| KD | "Load order" and the mod lookup | Sonnet high | nothing |
| KE | Older notes against the wiki: one bounded sweep | Sonnet high | nothing |
| KC | Borrowed advice after the honest opening, fifth try | **Fable max** | nothing |

**Wave 2, each after what it names.**

| Lane | What | Model | Waits for |
|---|---|---|---|
| V2 | Voice engine build: three more safety gaps | Sonnet high, security read | V1 landed (same files) |
| KB | The new notes crowd the old ones, fifth try | **Fable max** | KA landed (same search path) |
| FL | A stopped answer: Down no longer loops | **Opus high**; Fable max reads the measurement and the fix | Deck measurement in block A1 |
| FT | Developer tab: the last row clears the Open all band | Opus medium, second opinion | Deck measurement in block A1 |
| FW | Size watchers that answer late | Opus medium, second opinion | Deck measurement in block C; **only if something is late** |

**Wave 3, started by your picks of 2026-11-19** (§ 4; the code facts are in the table at the end of the briefs
file).

| Lane | What a person gets | Model | Waits for |
|---|---|---|---|
| C1 | The download card's line reads whole: "Keep the Deck awake and online until done." | Haiku high | O1 landed (same file) |
| S1 | The Pyro character's suggestion shows on the chip only, no longer as the answer's last line | Sonnet medium | nothing |
| M1 | A community copy of an open-source model can be downloaded by name and is used from the middle level up; "Open source only" passes it over and says so | Sonnet high; licence read and security read | P1 and O1 landed (same folder, same site list) |
| R1 | Reinstall really removes the voice engine and its speech model and downloads them again | Sonnet high, security read | V1, V2 and D1 landed (same files) |
| T1 | The "summed itself up" row sits above the answer it speaks of | Opus medium, second opinion | FL landed (same D-pad files) |
| M3 | On Main, Down from the question strip reaches the bar's Cancel | **Opus high**, second opinion | its Deck measurement. Whether X also cancels there waits for your pick on tab 7 |
| X1 | Update asks first | Sonnet high, security read | M3 landed (same files). Its X half waits for your pick on tab 7 |

**Still waiting for a pick:** M2 (tab 5), the X half of X1 (tab 7), the "Ask anyway" button's look (tab 8; a small
lane after A1), N1 (tab 9, the box before the first downloads). The session reads the page at every check-in.

**Given more than a Sonnet helper, and why:**
- **The Down loop in a stopped answer (FL): Opus high and the hard second opinion.** It is a come-back: an entry
  of the same shape was closed in October as "not reproduced", not fixed. The cause is still not known from the
  code. It gets a Deck measurement first, a test that reproduces the measured loop, then the fix.
- **The bar's Cancel on Main (M3): Opus high.** A new D-pad route on the most-used screen.
- **Every other D-pad or layout fix: Opus medium,** per the standing rule that these fail at every tier until
  someone measures on the Deck.
- **The two hard search bugs (KB, KC): Fable max,** your call. Each has missed its bar four times; the bar stays
  where it is.
- **Not bumped, on purpose:** Stop from another thread (A3) and Cancel while connecting (D1) are thread work, but
  the last round's Sonnet high lanes did the same kind well. They move to Opus medium only if the review sends one
  back twice.

**Landing** is one at a time with `scripts/land_lane.sh`, back end before screen, the full checks once per landing.
Lanes that share a file never land back to back without the second being re-read against the first: A1 and FL and
T1 (the chat's transcript file); D2 and R1 (the library section); O1 and V1 with X1; M3 then X1.

## 8. Second opinions (each one bounded question, each logged in § 15)

1. Before go: the briefs read once for contradictions (medium).
2. The Down loop: the Deck measurement, then the fix before it lands (max).
3. The tab-bar ghost: is a touch made through the debug port a fair test, and what does its result prove (max).
4. The checks that could not run twice: is there a prepared setup that produces each case? One consult for the
   list: a section opening above the ring at the tab's end; Cancel in a download's first second; the two
   out-of-focus halves; the note offer after a screen-only reload (max).
5. Before each D-pad or layout landing: P1, FT, FW, and the picked T1-A, M2, M3 (medium).
6. Before the wipe: the backup and put-back steps read once (medium).
7. Any fix that fails its Deck check twice, with the measurement (max).
8. Before the report (medium).

## 9. The Deck, in blocks

One driver at a time, a fresh one per block with the last one's handover note, about fifteen checks a block. The
session writes each block's step list from the rows below and the older step lists
(`workshop:planning/assets/cancel1118-runbook-A.md`, `106-runbook-W1*.md`, `docs/planning/assets/104-runbook-block-*.md`);
a Sonnet medium helper compiles blocks 0, A1 and A2 at go while the first lanes start. Every check says what must be
true before it starts, the exact presses, and what counts as a pass in numbers. A check that depends on what the AI
writes gets two differently worded tries. Evidence goes to the workshop repo, one file per check, a picture for
every look.

**Block 0, setup.** No other chat is driving (lease, newest files under `runs/`, tunnels). Keep-awake hold taken
(§ 13). **The Deck's own screen is the live one** (if the outside screen is still live, every result is marked
"outside screen" and the session says so in the chat). Battery and charger read. Settings folder backed up to the
Deck's home and to this PC. The `bonsai:` keys in Steam's browser saved. Build equals the tip. Ollama's version, the
installed models, the library's version, the notes file and the open chat written in the handover note. A test chat
made and named. Parental lock off. Steam's performance overlay off. Which installed game has no notes in the
library (for row 18).

**Block A1, while the helpers build: measurements and checks that need no answer and no download.**

| # | Row | What |
|---|---|---|
| 1 | M-LOOP | Make a stopped answer (a Strategy question, Stop part way). Read which stops the answer registered. Down twelve times from the chat's name, then from Copy; write every landing. Twice, with different questions. For lane FL |
| 2 | M-TAIL | Developer tab, no test chips pinned, the logging section open: Down onto "Frozen test chips"; its bottom edge against the help strip's top and the band's top, scrolled to the end. For lane FT |
| 3 | P106-OPEN-ALL-UP-01 | Up from "Open all" on Settings and on Ollama with "Open sections as you walk" off |
| 4 | P105-LEFT-TO-MENU-01 | The dock's own copy of "Show details" (a long answer, its own line scrolled out of sight, details closed): two Lefts hold, the third goes out, Right comes back |
| 5 | P105-CUT-QUESTION-01 | The short-question half |
| 6 | P104-DETAILS-REOPEN-01 | On the Deck's own screen: B then A on Show details twenty times; the ring on "Hide details" inside the pane every time |
| 7 | QA-LOOK-01 | The look check on every tab, one picture per tab, for your eye on the checks page |
| 8 | P103-STARTER-BOX-01 | The starter-models box still exists in two places (Browse models, and Install on a Deck with no models). Here: Browse models, "Install the starter set?", Internet downloads off: the title and site lines stay in view, "More below" shows, Down and Up scroll |
| 9 | P105-OLLAMA-BUTTONS-01 (first half) | Internet downloads off, A on Update: the "Turn on internet downloads?" box opens; B closes it; the ring is back on Update |
| 10 | CHIP-BUTTON-05, -06 | Pictures of the chip gap, the help chip and an agent chip for your eye |

**Block A2, while the helpers build: checks that need answers.**

| # | Row | What |
|---|---|---|
| 11 | P106-ENDING-COVER-01 | Two differently worded ending questions; is the opening one short sentence |
| 12 | P106-HEADLINE-NOTES-01 | Keep the note, ask, then remove the note through the notes sheet. The pictures half cannot be run by the rig: your list |
| 13 | CANCEL1118-NOTES | With a **test** note: the switch flips at the press; Remove dims the row at once; Keep reads "Saving…". Your own notes are not touched (the Deck has none today) |
| 14 | Search tab | The notes list: each note's switch reached by the D-pad; a note for another game is not read (the owed half of P90-NOTE-READ) |
| 15 | CANCEL1118-CHATS (rest) | A long test chat placed by script: "Sum up this chat" reads "Summing up" at the press |
| 16 | P105-TEN-CHATS-ASK-01 | Ten test chats, none open: Ask opens the delete list; pick and delete, the question goes to a fresh chat; Cancel leaves the question in the box. Your chats are backed up first and put back after |
| 17 | P103-NOTES-AFTER-AUTO-OPEN-01 | An answer that gets a cover the plugin opens itself, and a notes line; two tries |
| 18 | P107-NO-NOTES-CARD-01 (new) | A question in a game the library has no notes for: no general card, no borrowed words |
| 19 | P105-ANSWER-FOLLOW-01 | A recording of a long answer writing, for the checks page |
| 20 | From second opinion 4 | Whichever prepared setups it finds: the section opening at the tab's end; the screen-only reload |
| 21 | TAB-BAR-GHOST-01 | Only if second opinion 3 says the test is fair: a touch made through the debug port, with a game running; the watcher's log line saved if the ghost shows |

**Block B, after wave 1 has landed: one deploy, then one check per fix** (the pass sentence of each lane), the
free-play sweep on Main with and without a game, and the look check on each tab a fix touched. A failure goes back
to its helper with the measurement; a second failure goes to second opinion 7.

**Block C, the downloads** (Internet downloads on for this block; the state from block 0 put back after).

| # | Row | What |
|---|---|---|
| 22 | CANCEL1118-LIB-CANCEL | Update the library; Cancel part way: the card ends within about a second with "Download cancelled. Nothing was installed"; no half file left |
| 23 | P105-JOB-CARD-ELSEWHERE-01 | During a library download: the bar on Main with no "Cancel X" hint; the library card; the ring's return after a finish. M-BAR for lane M3: Down from Ask, Clear, the mic and the mode button, and Up from the bar. M-WATCH for lane FW: each frame while the bar comes and goes |
| 24 | The "2 jobs" chip | A small model pull and the library download at once: the chip, and the ring's hand-over when it goes |
| 25 | CANCEL1118-LIB-REMOVE | Remove: "Removing the library…" at once, a second Remove ignored, the line and buttons together (lane D2). Then install 2026.11.10 |
| 26 | Lane D1's check | The library's site made unreachable for two minutes (a route that undoes itself): Update, Cancel, the card ends within about a second |
| 27 | Lane P1's check and the made-up name | The typed-name field by D-pad; typing `someone/mistral:7b` shows no open-source label and Pull stays grey (the box refuses a slash); the two release months in the list |
| 28 | CANCEL1118-PULL-EARLY | Only with the setup second opinion 4 finds; else your yes-or-no list |
| 29 | P105-OLLAMA-BUTTONS-01 (second half) and lane O1 | The real Ollama update: megabytes on the card, every site named, the ring back on Update after the finish, the AI still answers. Version before and after written down |
| 30 | CANCEL1118-VOICE-CANCEL and lanes V1, V2 | Remove the voice engine; build; Cancel while it says "Building the voice engine": "Install cancelled." within about 2 s, no container or spare folder left; build again to the end: the microphone works, the record is checked |
| 31 | The speech model hears a stop | Remove one speech model, download it again, stop part way |

**Block R, the README clips** (if time is left; it takes the same lock as the search lanes, since it uses this PC's
AI). The recorder's full-quality setting, the AI on the PC, new wording for every retake, in-panel clips first.
The new clips go on the checks page beside today's. They replace today's only on your yes, so the roadmap entry
stays open until then.

**Block W, the wipe, near the end.** Rehearsed on this PC first (§ 10). The backup and put-back steps are read by
the second opinion before the first press.

| # | Row | What |
|---|---|---|
| 32 | Backup | The settings folder, the chats, the notes, the library folder, the browser keys, the list of models: one archive on the Deck and a copy on this PC, both checked by size and by listing |
| 33 | CANCEL1118-CLEAR-ALL | Settings, Clear all data: the button reads "Clearing…" from the press |
| 34 | P105-FIRST-RUN-STEPS-01 | The whole first-time setup by the rig on the Deck's own screen: the checklist, the switch, OK, the run card with Stop on the empty chat, the totals (about 6.9 GB) |
| 35 | P104-M5-WARNING-FOCUS (other half) | Before installing: ask a question, "The AI is not set up" shows, one Up reaches "Open the Ollama tab" |
| 36 | P103-STARTER-BOX-01 (other path) | Ollama tab, Install on a Deck with no models: "Also install the starter models?" fits the screen |
| 37 | P105-STARTER-VOICE-01 | The starter set builds the voice engine too; the microphone works straight after |
| 38 | The slow-answer line | The first answer after a fresh install is cold and slow: is the "(>60s): prefer GPU" line there, with a picture |
| 39 | Put back | Your settings, chats and notes restored from the archive; the library installed (2026.11.10); compared key by key with block 0's notes; the header shows your chat; the help chip dismissed; chips drawing |

**Block Z, last of all.** The Deck's AI unloaded, God of War started, a question asked: the warning shows; on the
Deck's own screen one Down then one Up puts the ring on "Ask anyway" (the ring part that was unclear); A on it. What
happens is written down as it is. If the Deck freezes, the session stops Deck work and tells you.

**The end.** A smoke test on the final build (one question, one answer, notes attached). The six saved walks saved
again on the final build (P104-WALKS-RESAVE-01) and the two on the Ollama tab. Test chats deleted, test chips
cleared, test model deleted, the game closed, the AI unloaded, Internet downloads as you had it, the hold released.

## 10. This PC as the stand-in

A second driver works here while the first works on the Deck. Results are marked "stand-in". Only reaction checks
may close on it (your answer 5).

- **S0:** Big Picture is the front window (the tools can read that); the tip is deployed here.
- **S1, presses faster than the rig can make:** + pressed twice makes one chat; Paste clipboard pressed twice
  pastes once; Remove pressed twice removes once.
- **S2, labels at the press:** "Clearing…" on Clear all data (this PC's own test data), "Removing the library…",
  "Deleting…", "Summing up".
- **S3, the two blocks plan 105 and 106 could not run:** the first-time setup pressed through with its press
  count; the starter set's "microphone step failed" message (this PC cannot build the voice engine).
- **S4:** the wipe's step list pressed through here before it is run on the Deck.

## 11. Paperwork, new bugs, and the report

**The roadmap is brought up to date after every landing and every Deck block,** by the bookkeeper (Sonnet medium)
from result lists the session copies out of the evidence files; the session spot-checks each of its commits. The
bookkeeper never commits while a landing runs.

**K0, the bookkeeper's first sweep, before any lane:**
- Decision D144: § 3 word for word, and the picks of § 4 with your notes word for word.
- Two calls close on your picks: the open question on the ten-chats entry (the question stays in the box), and the
  knowledge-base call on telling the AI when a game has no notes (it is not told).
- The "accepted" entries move to their own short list in each roadmap file (five in the knowledge-base Bugs list,
  one in its Deck checks), and house rule 3 says so. Nothing is closed or deleted.
- The roadmap and the changelog say community copies "need the unlock before they download". The code does not do
  that. bonsAI's own name box refuses any name with a slash, so such a copy cannot be downloaded through bonsAI at
  all (checked 2026-11-19: the same shape rule on the screen side and the back end). One that is already there (pulled
  by hand, or sitting on the PC when the AI runs on the PC) is listed with no label and passed over when asking,
  until the unlock is on. Both documents are corrected to say this.
- The heavy-game entry's "ring part unclear" is already fixed and passed on the outside screen (16 November); the
  entry says so and names what is left (the Deck's own screen; pressing the button).
- The starter-box row describes a path that no longer exists; it is rewritten for the two that do.
- A testing row for every lane and every new check in § 9.

**A new bug found on the way** is written into the roadmap and the report the same hour and gets one helper round
(about an hour) in this session. A new owed check is run in the next Deck block if the rig can reach it.

**The run log (§ 15)** gets a few lines after every landing and every Deck block and is committed, so a look from
your phone shows where things stand.

**At the end:** `python scripts/verify.py --quick` passes. The report (§ 16) leads with what needs you, then what
was fixed and proven, what failed and why, what was found, what is left, and the yes-or-no list of checks only
tests can prove. With it: the summary of the code work you asked for in AGENTS.md (changed files, the technical
explanation, surprises and how each was handled, what would have made the session easier) and a short guide to how
the plan landed in the code. The checks page gets a "Plan 107" round with pictures side by side.

## 12. What stays yours whatever happens

- **A finger on the screen:** the tab-bar ghost check, unless the made touch settles it.
- **A locked account:** the four kids-lock checks and the two parental-lock halves. The session cannot type a PIN.
  When you are back: you lock the Deck, the session runs about twenty minutes of checks, you unlock it.
- **Doom 64: Retribution played once,** for the spoiler-by-name check.
- **Your eye:** the pictures and recordings on the checks page (the look of each tab, the chips, a long answer
  following, the new README clips), the answer's look while it writes in a real fight, and attaching a picture to a
  question.
- **Y on Main with Steam's keyboard open.**
- **The monthly reads.**

## 13. Keeping both machines awake, and what the session never does

- **This PC** sleeps after one idle hour on mains (read 2026-11-19). At go: `python scripts/keep_awake.py --hours 14`
  in the background, and the app's own keep-awake asked for until the session goes quiet.
- **The Deck:** the rig's keep-awake hold, eight hours at a time, taken again at the start of every block and
  checked by reading it back; released at the end. The battery is read at every block start (the Deck sat on a slow
  charger on 17 November); under 20 percent, Deck work stops and the session says so.
- **A wake-up check every twenty minutes,** so a helper that ends silently is noticed.
- **Another plan is being written the same day** in another chat: plan 108, seven feature plans (108a to 108g:
  smoother D-pad scrolling, keep-alive and smart unload, a spoiler chance for the chat summary, the Steam Input
  layout, finishing the controller rig, the SteamOS share path, wake-word listening). Seen as placeholder files on
  2026-11-19; it holds decision D145. The two plans share one Deck, one PC, one checkout to land in and one usage
  window, and 108a, 108b and 108e touch code this plan fixes (the D-pad walk, the AI's stop and unload, the rig).
  **They must not run at the same time.** This plan goes first unless the maintainer says otherwise; before block 0
  the session checks that no other chat holds the Deck and that no other chat is landing.
- **Never:** push (beyond this plan), merge to main, switch branches in the shared folder, stage everything, type a
  PIN or password, press anything on the Deck outside a written check, publish a library, reload the plugin under
  a running game, delete anything of yours that is not in a backup made that hour.

## 14. Before you say go

1. Unplug the outside screen's cable from the Deck; leave the charger in.
2. On this PC: restart Steam, set it to offline, open Big Picture and leave it as the front window.
3. Open a new chat, pick Fable 5.2 at high effort, and say "Run plan 107".
4. Most picks are in (§ 4). Five calls are still open on mock-up board 6; pick whenever you like, and each pick
   starts its lane at the next check-in.
5. Confirm the rename check (answer 7) and say what to do with the old backups (§ 4).
6. Say which goes first, this plan or plan 108 (the feature plans another chat is drafting). They cannot share
   the Deck or land at the same time.

---

## 15. Run log

*(empty until go)*

## 16. Report

*(written at the end)*
