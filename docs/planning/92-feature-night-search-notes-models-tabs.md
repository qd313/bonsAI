# Plan 92: the session that builds plans 90 and 91, with the rig checking as the work lands

**Status:** READY 2026-10-12. Planned on Fable 5.1 in a cloud session that could not reach the Deck; the maintainer's
calls are in
([D129](../audit/maintainer-decisions-locked.md#d129--locked-2026-10-12-raised-2026-10-12--plans-90-to-92-the-search-tab-your-notes-the-models-box-column-and-the-denser-tabs-the-calls)).
**A separate Opus 5.5 extra-high chat runs it, on the maintainer's PC, after plan 89 has finished.** Nothing is built
and nothing has been pressed. The standing way of running a night like this is
[the bug-wave runbook](../agents/bug-wave-runbook.md); this page says only what is different this time. The two
feature plans say what is built: [plan 90](90-search-tab-and-your-notes.md) (the Search tab and your notes) and
[plan 91](91-models-filter-column-and-denser-tabs.md) (the models box column and the denser tabs).

**To start the session, paste this into a new Opus 5.5 extra-high session on the `experimental` branch, once plan 89
is finished and pushed:**

> Run plan 92. Read docs/planning/92-feature-night-search-notes-models-tabs.md, then plans 90 and 91,
> docs/agents/bug-wave-runbook.md and docs/lessons-learned.md (sections 1, 3, 4 and 5). Confirm plan 89 is finished
> and pushed, the Deck and this PC's stand-in are free, and the rig is armed, then go. Plain language in everything you
> write to me.

## 0. Before go: what must be true

1. **Plan 89 is finished** and its report is in, the Deck is put back, and every commit from that night is on GitHub
   (`git fetch` shows nothing newer than the local tip and nothing local that is not pushed). This planning was done
   against `32f48643`; the session's own tip will be later. **Step one of block 0 re-checks every file map in plans
   90 and 91 against that tip** and writes any difference into § 13.
2. The maintainer has said go, the Deck and the stand-in are free, the rig's stop switch is off (`deck_status`), and
   no other chat holds a link to the Deck.
3. The shared checkout is clean at the tip and `python scripts/verify.py --quick` passes there.
4. The app's usage figure is read and written into § 13 (the rules in § 5).
5. Keep-awake held on this PC and on the Deck for eight hours.

## 1. The short version

- **Four features**, all drawn and picked by the maintainer in October: your own notes that Ask reads, a Search tab
  that also holds them (with the Steam settings search moved there), the models box's filters in a column, and the
  other tabs folded to about a quarter of their height.
- **About ten editing helpers** across the two plans, four at once at go, the rest as measurements and earlier lanes
  land. Two lanes are Opus high because they are focus and layout work (the column, the shared fold); the rest are
  Sonnet high. Reading jobs go to Haiku high.
- **The rig works the whole time:** measurements the Opus lanes wait for in the first hour, then whatever the roadmap's
  Verify list still owes that the rig can reach, then one check per landed piece after each landing batch, then the
  sweeps. A new bug found on the way goes to the roadmap and the report and gets one helper round of about an hour.
- **The roadmap is current at every step** (the bookkeeper, after every landing and every Deck pass), and work is
  pushed to `experimental` after each landing batch that passes the quick check (call 6).
- **In the morning:** a published report leading with what only the maintainer can do, the end-of-session code
  summary and the plain-language developer guides the maintainer asked for, the roadmap audited, the Deck and the
  stand-in put back.
- **Rough time: 12 to 16 hours.** This is two features more than plan 87 carried, with more focus work. § 12 marks a
  clean stopping point after the first landing batch and its Deck block, so the session can run as two nights.

## 2. The maintainer's calls (2026-10-12, D129)

1. **Who plans, who runs:** the planning on Fable 5.1 (this cloud session); a separate Opus 5.5 extra-high chat runs
   the plan on the maintainer's PC, after plan 89 is finished and pushed.
2. **Three plans:** 90 (the Search tab and your notes), 91 (the models box column and the denser tabs), 92 (this one,
   the session).
3. **The Search tab sits left of Main, and Search ships in this session**, not at 0.7.0 as the roadmap had it. This
   replaces plan 87's rule that Main is always the far-left tab (D127, call 2).
4. **Y:** if the rig finds Y is already taken on the Main tab, or the press never reaches the plugin, there is no
   shortcut; the tab alone is the way in.
5. **How a note is heard:** a small word rule on the question's own text, no extra trip to the AI. Typing "remember …"
   opens the same card. Saying it into the mic stays out.
6. **Pushing:** the session may push to `experimental` when needed. Never to `main`. The maintainer still publishes
   releases.
7. **Earlier answers the same day:** the Search tab's notes are the stash's notes, one storage, one editor (the
   roadmap's own words: every note lives on the Search tab); notes are per game as well as for every game; the
   stash's phase 1 only (the live session bundle, phase 2, stays on the backlog); the Steam settings search moves
   from the Main tab to the Search tab; no version bump in this session; the Deck is driven through the rig as part
   of the session, not only the preview.
8. **Two defaults the maintainer did not object to:** the knowledge library's game notes are searchable on the Search
   tab when the library is installed; the three chips from today's Filters row move to the bottom of the new column.

## 3. What was found while planning (2026-10-12, a cloud session on the GitHub copy)

- **GitHub's `experimental` stops at 19:23 on 2026-10-11**, half an hour into plan 89's night. Everything after that
  is on the maintainer's PC until pushed. Three plan 89 lanes land on this plan's files: text size on every tab (the
  font sizes in most screen files), the Settings walk scroll fix (the tab body's scroll plan), and the Steam
  settings page names. Plans 90 and 91 say where.
- **The baseline on that tip, in the cloud:** typecheck passes; all 4,117 screen tests pass, but the run ends with
  one stray timer error after the last test; all 2,524 Python tests pass; the quick check passes. The stray error
  looks like the load-sensitive timing the lessons file already warns about; the session re-runs the baseline on
  this PC before any copy is cut and records what it sees.
- **Nothing in the code uses Y today.** The press's framework name is OPTIONS (number 4); the A and B helpers are the
  pattern. What Steam itself does with Y on the Quick Access page is unknown: measured first (M-Y).
- **The find box's keyboard.** A plain Steam text field in the panel can leave the D-pad dead after the keyboard
  closes (deck-driver rule 1). Plan 90 makes word buttons the first path and checks the typed path once.
- **Seven tabs.** With the Developer tab on, the Search tab makes seven in a 300-point bar drawn with fixed places.
  Measured first (M-B); the side icons shrink one step if needed.
- **Two files are at their growth limits** where these features land: the models box (935 code lines) and the chat
  transcript (1,104). Both plans route new code into new files and say so in the briefs.
- **The "Search only" choice of "Remember what I typed"** was already retired on the back end (older settings files
  still load); only the screen's last mentions remain. Less to remove than the roadmap suggested.
- **The models box's Date column** is the default casualty of the new column; measured first (M-A).
- **Plan 86** (the clean-up, waiting for its go) removes UI scale and reshapes the settings plumbing; its Settings-tab
  steps need a re-check against plan 91's layout before it starts. The bookkeeper adds that note to plan 86.
- **The bookkeeper agent type** may not be loaded in the Opus session (plan 87 found this); a general helper given the
  bookkeeper file as its instructions does the same job.

## 4. The lanes, in batches

| Lane | Plan | What | Model | Starts |
|---|---|---|---|---|
| N1 | 90 | The notes store, the three methods, Ask reading the notes, the Show details record | Sonnet high | at go |
| N4 | 90 | The game-notes search method over the knowledge library | Sonnet high | at go |
| N3 | 90 | The Search tab, first half: the tab, the game row, the find box and word buttons, the four groups (chats without the jump), the notes list, the settings search moved and the Main tab's card removed | Sonnet high (Opus reviews at landing) | at go |
| T3 | 91 | The About tab: one line per row, the links beside the smaller QR | Sonnet high | at go |
| M1 | 91 | The models box's filters column | Opus high | after M-A |
| T0 | 91 | The shared fold, strip and floating button, proven on the Ollama tab | Opus high | after M-B |
| N2 | 90 | The offer card, the "Read N of your notes" line, the notes sheet, the word rule and the "remember …" command | Sonnet high | after N1 lands |
| N3b | 90 | The jump into a chat and the way back; Y | Sonnet high; steps up to Opus high after one Deck failure | after N3 lands and M-Y |
| T1 | 91 | Settings folded | Sonnet high | after T0 lands |
| T2 | 91 | Developer folded | Sonnet high | after T0 lands |

Ten editing lanes in all; four at once at go, at most six at once later. The cap is fifteen (D128, call 16). Each
brief is checked against its plan's section and against the code at the tip before it is sent ([lessons § 4](../lessons-learned.md):
a brief that names an example the data does not hold wastes a helper).

**Written before the first lane starts, by the one running the session:** the contract between N1 and the screen lanes
(plan 90 § 3a and § 3b, the field names and the three method names), copied into N1's, N2's and N3's briefs word for
word, so N3 can draw the notes list against it before N1 lands. A lane that needs to change a name stops and says so.

## 5. Who does what: models, effort, how many at once, the budget

| Work | Model and effort | At once |
|---|---|---|
| Running the session: the contract, briefs, reviews, landing, the Deck runbooks, reading failures, the reports | Opus 5.5 extra-high, a new chat | 1 |
| Features with a choice in them (N1, N4, N3, T3, N2, N3b, T1, T2) | Sonnet 5.5 high (`feature-lane`) | up to 6 |
| The two focus-and-layout pieces (M1, T0) | Opus 5.5 high (`feature-lane` with model opus, effort high, or `bugfix-lane-opus-high`) | 2 |
| Reading and reporting facts: the owed-checks list from the roadmap's Verify list, a first look at each finished lane's change, summaries of evidence files, the label searches | Haiku 5.5 high, each job under about 100,000 tokens | as needed, never editing |
| Bookkeeping: roadmap, testing rows, changelog, the plan 86 note, the progress logs | the bookkeeper, Sonnet 5.5 medium (or a general helper given `.claude/agents/bookkeeper.md` as its instructions); every status names its evidence | 1 |
| Deck checks | the `deck-driver`, Sonnet 5.5 medium, a fresh one per block | 1 on the Deck, 1 on the stand-in |

**The ladder, when a helper's work is not good enough:** Sonnet high → Opus medium → Opus high, one step at a time,
after a failed landing review or a Deck failure with a measurement in hand. Each step goes in § 13; every Haiku run in
plan 33 § 4d.

**Rules that go with it:**

- **Helpers run only the tests for what they touched while they work.** The full suites run at landing.
- **Before every new batch, read the app's own usage figure.** Start nothing new past 80 percent of the week or 75
  percent of the five-hour window (D128, call 18); resume stopped helpers by message after a reset.
- **Pushing (call 6):** after each landing batch that passes the quick check, and at the end: `git pull` first if
  GitHub moved, then `BONSAI_ALLOW_PUSH=1 git push origin experimental`. The push hook refuses a push without that
  variable on purpose. Never `main`, never a force push, never a push while a landing is running.
- **Notifications:** one after every landing batch, one when truly blocked, one for the morning report. Check in the
  app that phone notifications are on before go (plan 87 found them off).
- **No merge to main, no branch switch in the shared folder, nothing staged with `-A`, no PIN or password typed, no
  press on the Deck outside a written check.**

## 6. Landing

One at a time with `scripts/land_lane.sh`, back end before screen changes, `LAND_COAUTHOR` set to Opus. Order within
each batch: N1, N4, T3, N3; then M1, T0; then N2, T1, T2, N3b; then second rounds.

**One owner per shared file per round:** the chat transcript and the reply rows belong to N2; the Ask bar and the
settings-card hooks to N3; the tab titles, the tab bar and the plugin root's tab rows to N3 until it lands, then to
N3b; the models box files to M1; the Ollama tab and the scroll-plan files to T0; the Settings tab to T1; the Developer
tab to T2; the About tab to T3; `main.py` to N1 first (its methods land before N4's and N3's are picked, so the three
method blocks do not clash: N4 and N3 add theirs beside the knowledge-base and chat-slot methods, N1 beside the
chat-slot ones; the one running the session resolves the one-line placement clash by hand if the pick stops). A lane
that needs a file outside its list stops and says so; a follow-up lane is cut from the new tip only after the first
lane's commits have landed.

After every landing batch: the bookkeeper's sweep (the feature's entry to Verify naming its rows), this plan's log,
the push, and the notification.

## 7. The Deck, in blocks

Standing rules as in the runbook: one driver at a time per machine, a fresh driver per block, every Deck command
exactly `ssh deck@192.168.86.52 '<command>'`, evidence files `plan92-<ROW>.json` in `docs/test-evidence/` (the rows
are named in plans 90 § 5 and 91 § 5), every file stamped with the build and the machine. If a deploy is refused:
"run setup-dev". **The Deck's AI is unloaded before any game check.** Every walk that passes is saved with
`deck_saveCheck` under its row's name.

- **Block 0, setup (about 40 minutes):** confirm nothing else drives either machine; keep both awake; read which Deck
  screen is live (its own, or the plugged-in monitor; the layout numbers in plans 90 and 91 are for the Deck's own
  screen); back up the Deck's settings and saved chats to `~/p92-backup`; note the build on the Deck and deploy the
  tip; record how Ollama runs and that no model is loaded; **make two test chats on the Deck, one with a question
  about Hollow Knight and one about Half-Life 2** (the Search tab's game row and the jump need chats from two games;
  the ten-chat limit may mean dropping one of the maintainer's chats: back up first and put it back at the end);
  parental lock off; test chips clear. Re-check both plans' file maps at the tip and write the differences into § 13.
  Baseline quick check green at the tip before any copy is cut.
- **Block 1, measurements (about 60 minutes), while batch 1 builds:**
  - **M-A, the models box:** on the Deck's own screen, the box's inner width and height, the model list's box, each
    table column's width and the Model column's text cut-off, how many rows show, the Filters row's height, where
    the ring opens. Row **P92-M-MODELS-BOX**.
  - **M-B, the five other tabs:** heights top to bottom after plan 89's text-size change, the first control's place,
    the pane's visible height and its bottom band, a Steam button's fill colour sampled on the Ollama tab, and the
    tab bar with seven tabs drawn (Developer on) if N3's tab has landed on the stand-in by then, else noted as owed to
    block 3. Row **P92-M-OTHER-TABS**.
  - **M-Y, the Y button:** with a page-side logger reading the plugin's button events, press Y on the Main tab with
    the ring on the question box, on a suggestion chip, on the tab bar and on an answer; record what Steam does and
    whether the press reaches the plugin. Row **P92-M-Y**.
- **Block 2, owed checks while the helpers build (about 90 minutes):** read the roadmap's Verify list at go (a Haiku
  reader compiles the exact steps) and run whatever plan 89 left that the rig can reach without the maintainer. From
  the list as it stood on 2026-10-12: the slot's "same stops both ways" (P87-B1-SLOT-SAME-STOPS) with a prepared long
  answer; the tall-section walk re-recorded (plan64-TALL-SECTION-01); the AI's own suggestion chip (P87-INJECT-CHIP)
  with a prepared Pyro answer; the 24 Steam settings pages (STEAM-SETTINGS-PAGES-01; after N3 lands this check runs
  from the Search tab instead); the long chips' two open halves (P79-LONG-CHIPS); the free-play sweep as a baseline.
  Anything plan 89 already settled is skipped and the list says so.
- **Block 3, after batch 1 lands (one deploy):** About (P91-ABOUT-ROWS, P91-ABOUT-LINKS); the Search tab's first half
  (P90-SEARCH-TAB-WALK, P90-SEARCH-WORDS, P90-SEARCH-GAMES, P90-SEARCH-SETTINGS); the tab bar with seven tabs if M-B
  owed it; the notes store has no screen of its own yet, so its Deck check waits for N2. **This is the clean stopping
  point if the session runs as two nights** (§ 12).
- **Block 4, after batch 2 lands (one deploy):** the models column (P91-MODELS-COLUMN-WALK, -FILTERS, -DONE-KEEPS,
  -WIDTH) walked one press at a time with focus read after each (deck-driver rule 9: the models box is the strict
  case); the Ollama fold (P91-FOLD-OLLAMA, P91-STRIP, P91-FOLD-ALL-BUTTON).
- **Block 5, after batch 3 lands (one deploy):** the notes (P90-NOTE-CARD, P90-NOTE-LINE, P90-NOTES-SHEET,
  P90-NOTE-READ) in the Hollow Knight test chat; the game-notes search (P90-SEARCH-KB) with the library installed and
  then removed and put back; the jump and the way back (P90-SEARCH-JUMP-BACK); Y (P90-SEARCH-Y, or its "no shortcut
  by design" reading from M-Y); Settings and Developer folded (P91-FOLD-SETTINGS, P91-FOLD-DEVELOPER);
  Permissions unchanged (P91-PERMISSIONS-SAME).
- **Block 6, second rounds and the sweeps:** fixes from failures; the free-play sweep with and without a game (every
  Main-tab change owes it: the card, the line, the card's removal, Y); the saved walks through the models box and the
  other tabs re-recorded on the final build (plan 91 § 5 lists them); the smoke test.
- **Block 7, the end:** put back every setting from the backup, the maintainer's chats, the normal build; delete the
  two test chats and any test notes; clear the pinned test chips; close any game; release the keep-awake on both
  machines. The handover note says where everything stands.

## 8. The stand-in (this PC), in blocks

This PC's Steam Big Picture with Decky Loader for Windows, `machine: "this-pc"` on every call; Steam offline and in
front; presses land about 10 seconds late and it cannot take screenshots (plan 87's lesson), so it gets only what the
Deck should not wait for. A stand-in pass is never a Deck pass.

- **S0, setup:** check it is ready and the plugin opens; deploy the tip; a short free-play sweep as the baseline.
- **S1, after each landing batch, before the Deck's block:** deploy there first and walk the new tab, the folded tabs
  and the models column once for gross regressions (a dead press, a stop twice, a tab that will not open). A failure
  here goes straight back to its lane without waiting for the Deck.
- **S2, the wipe (only here, never on the Deck):** after batch 3 lands, Clear all plugin data, then: the Search tab
  lists no notes and the notes file is gone (P90-NOTES-WIPE); the first-run flow still reaches the help chip; a fresh
  install shows the folded tabs with their first section open.
- **S3:** the free-play sweep on the final build.
- **If a stand-in press ever lands in the wrong window, stop the stand-in and carry on with the Deck alone.**

## 9. Prepared setups

- **Two test chats across two games** (block 0), so the game row has two games and the jump has a chat to jump into
  that is not the open one. Questions go in through the send-question script, never by thumb.
- **Test notes** are made through the card itself (the real path) in block 5; one is also made for every game. All are
  removed in block 7.
- **The stand-in AI** (plan 81's way, rebuilt in the scratch folder, never committed) if block 2's prepared answers
  need it (the long answer, the tall section, the Pyro chip). The notes checks do not need it: P90-NOTE-READ reads the
  app log and the Show details chip, not the answer's words.
- **The knowledge library** stays installed; P90-SEARCH-KB removes it once through the plugin's own Remove button and
  installs it back from the local copy (the Developer tab's seed install) rather than downloading.

## 10. New bugs, and the roadmap

- **A bug found during the night** goes to the roadmap (the bookkeeper, with the evidence file) and the report, and
  gets one helper round of about an hour (Sonnet high; Haiku high if it is a one-star wording fix). Not fixed within
  the hour: it stays on the roadmap with what was learned, and the report says so. Nothing is quietly dropped.
- **The roadmap is current after every landing and every Deck pass.** A feature moves from Features to Verify at
  landing, naming its rows; to Done on its Deck passes, naming its evidence; a Deck failure goes back with what was
  seen; the testing documents change in the same commit. Result lists are copied from the evidence file's own words;
  the session spot-checks each bookkeeper commit against the evidence.

## 11. Paperwork, the two reports, and running unattended

- **Testing rows:** every row in plans 90 § 5 and 91 § 5 is added to `docs/testing.md` at its lane's landing with the
  pass sentence, and the focus-graph checklist in `docs/testing-manual.md` gets one block per new control (the
  column, the fold line, the strip, the floating button, the Search tab's row, box, words, list and Back line, the
  card, the line, the sheet, Y).
- **The changelog** gets a plain line per feature under the next version's heading; no version bump (call 7).
- **The progress log** (§ 13) gets a few lines after every landing batch and every block, committed and pushed.
- **A question for the maintainer** goes in § 14 with the safest choice taken meanwhile.
- **The 20-minute scheduled check** restarts the session after a usage stop; a message from the maintainer also wakes
  it; the lessons say not to count on the schedule alone.
- **In the morning, three things are written for the maintainer** (the note at the top of AGENTS.md asks for the
  last two by name):
  1. **The published report**, leading with what only the maintainer can do, then what was built and proven, what
     failed and why, what was found, and what is left; the maintainer's checks page brought up to date.
  2. **The end-of-session summary of the actual code work:** the files changed per lane with their paths, the
     technical explanation of each piece, the unexpected things that came up and how they were handled, and anything
     the maintainer could have done differently to make the session easier.
  3. **One plain-language developer guide per feature plan**, written into plans 90 and 91 as a section: how each
     feature is built in the codebase and where, so a person can change it later without reading the night's log.
- The roadmap audited (Features, Bugs and Verify against Done), the quick check green, the final push made.

## 12. The time, and the clean stopping point

| Part | About |
|---|---|
| The Opus chat reads the three plans, re-checks the file maps, cuts four copies, writes the contract and the briefs | 1 hour |
| Block 0 and block 1 | 1.5 hours |
| Batch 1 helpers (N1, N4, N3, T3), in parallel with blocks 1 and 2 | 1.5 to 2 hours, then 45 minutes to land four |
| Block 2 | 1.5 hours, overlapping |
| Block 3 | 1 hour |
| Batch 2 helpers (M1, T0, the two Opus lanes) | 2 to 3 hours, then 30 minutes to land |
| Batch 3 helpers (N2, N3b, T1, T2), started as their gates clear | 2 hours, then 45 minutes to land |
| Blocks 4 and 5 | 2.5 to 3 hours |
| Block 6 and 7, paperwork, the reports | 2 hours |
| **Whole session** | **12 to 16 hours** |

**The clean stopping point** is after block 3: the notes store, the game-notes method, the About tab and the Search
tab's first half are landed, checked and pushed, the roadmap is current, and no helper is mid-work. If the session
runs as two nights, night one ends there and night two opens with M-A and M-B re-read (a new build may have moved
nothing, but the measurement is cheap) and the two Opus lanes.

What can stretch it: the five-hour usage window and the weekly line (§ 5), the jump lane needing a second Deck round,
the fold lane's strip needing a second round against Steam's own scroll, and the models box walk, which is slow by
rule (one press at a time with focus read after each).

## 13. Progress log

- **2026-10-12 (cloud, Fable 5.1):** planned; the three plans and D129 written against `32f48643`; the roadmap's four
  entries marked as planned by the bookkeeper. Plan 89 still running on the maintainer's PC; nothing built, nothing
  pressed.

## 14. Questions for the maintainer (the safest choice taken meanwhile)

1. **The Date column** in the models box goes to make room for the filters column. *Meanwhile:* it goes, unless M-A
   shows the list fits every column with the Model column no narrower than today.
2. **Clear in the filters column** resets the Good for and Show filters only. *Meanwhile:* the licence pick is left
   alone; the drawing reset it.
3. **Which sections open at first on a folded tab.** *Meanwhile:* the first section open, the rest closed, remembered
   for the session only (saving it to disk is a new setting, about 18 files of plumbing).
4. **The typed find box** on the Search tab, if Steam's keyboard leaves it dead. *Meanwhile:* the word buttons are
   the first path; the typed path is checked once; a second round swaps in the question box's two-layer field.
5. **The offer rule's phrases.** *Meanwhile:* the list in plan 90 § 2a, pinned by twenty tests; new phrases found on
   the Deck go in the report as wording to add.
6. **Seven tabs in the bar** (Developer on). *Meanwhile:* the side icons shrink one step; the current tab's name never
   does.
7. **The strip covering the bottom of the list** while it shows. *Meanwhile:* by design, as drawn; only the ringed
   row is kept clear.
8. Anything a block or a lane raises during the session is added here.

## 15. For the lessons file, at the end

If anything would change the runbook, add it to [lessons-learned.md § 4](../lessons-learned.md): whether planning in a
cloud session against the GitHub copy, while a night ran on the PC, cost anything at the re-check; whether four
screen lanes at once on top of a fresh text-size change caused clashes; whether the shared fold pieces held up
across three tabs; and the budget reads at each batch.
