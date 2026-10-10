# Plan 87 — Six features, every bug the rig can reach, and the checks run on two machines at once

**Status: WRITTEN 2026-10-09, about 23:15. Waiting for "go" in a fresh Opus 5.5 extra-high session.** Nothing is
built. The maintainer is asleep while this runs and will look in from a phone.

Asked for by the maintainer on 2026-10-09, late evening: six features, "all of the bugs, or as many as you can fit",
and "as many of the checks as you can close on your own", with many helpers side by side, the Deck free for the
night, and this PC's own stand-in Deck used as a second test machine if it can be. Planned on Fable 5.1 (the
maintainer's pick); run on Opus 5.5 extra-high. How a bug session runs is in
[the runbook](../agents/bug-wave-runbook.md); this plan says only what is particular to tonight. The maintainer's
calls are in the decisions file as D127.

**To start the session, paste this into a new Opus 5.5 extra-high session on the `experimental` branch:**

> Run plan 87. Read docs/planning/87-features-bugs-and-two-test-machines.md, docs/agents/bug-wave-runbook.md and
> docs/lessons-learned.md (sections 1, 3 and 4). Confirm the Deck and this PC's stand-in are free and the mock-up
> session has stopped, then go. Plain language in everything you write to me.

## 1. The short version

- **Six features** from the maintainer: the Main tab named "bonsAI" in small caps; no more silent loss of the
  oldest chat (the limit rises to ten and you pick which chat goes); the Show details chips packed into a grid
  walked in four directions; the tab bar in a fixed order with Main at the far left and About at the far right;
  a + and a delete icon at the two ends of the chat's name row; and a Text size row in Settings for the words in
  the chat.
- **Bugs: 22 on the main list and one in the knowledge-base file.** Fifteen the session or the rig can act on
  tonight, two of them with a likely cause already in hand (§ 3). Four are calls the maintainer chose to leave
  open. Three stay the maintainer's by hand.
- **Verify: 21 entries.** About nine the rig can try tonight. Ten need the maintainer. Two can only be proved by
  their tests.
- **Helpers:** Sonnet 5.5 high for anything with a choice in it, Haiku 5.5 high for mechanical fixes and for the
  reading, up to ten editing at once, Haiku readers in small batches beside them. The one running the session is
  Opus 5.5 extra-high and writes no code itself.
- **Two test machines:** the real Deck, and this PC running Steam Big Picture with Decky Loader for Windows (the
  stand-in `this-pc`). The stand-in takes first-pass D-pad walks and the fresh-install check; the Deck is the final
  word on everything, and only a Deck pass moves an entry to Done.
- **In the morning:** a report leading with anything only the maintainer can do, every feature and bug either
  proven on the Deck or back on the roadmap with what was learned, the roadmap current at every step, the Deck
  and the stand-in put back, and a section for the lessons file on how a session this size went.

## 2. The maintainer's calls (2026-10-09, D127)

1. **Scope:** every bug a session or the rig can act on, the one open knowledge-base bug included, the six
   features, and every check the rig can close.
2. **The three "mock-ups first" items are built from the plan's reading tonight**, one commit each so any can be
   backed out, with alternatives drawn for the morning:
   - **Tab bar:** today's look, but the tabs before the current one are drawn on its left and the tabs after it on
     its right, never wrapping round, so Main is always at the far left and About at the far right. **LB on Main
     still jumps to About** (the buttons wrap; only the drawing stops moving).
   - **The + and delete icons** sit at the two ends of the chat's name row as quick actions: + makes a new chat,
     the delete icon opens the usual "Delete chat?" box. The chats menu keeps both actions too.
   - **Chips grid:** the seven Show details chips packed by their measured widths into as many rows as fit the
     column; Left and Right move within a row, Up and Down between rows; the open chip's details sit under the
     whole grid.
   - **Ollama:** the Update button and the first-time Install both run in place, with a progress line and a done or
     failed line under the button, no popup. The starter-pack choice stays on the tab as it is (plan's default).
3. **Text size:** a new, simpler "Text size" row in Settings with small, normal and large, scaling only the words
   in the chat (questions, answers, the Show details text; not the tab bar, the chat's name, the chips or the
   settings), built on its own so plan 86 can still remove UI scale. The hidden UI scale section is left alone,
   but its doubled heading is fixed anyway (plan's default on the scope).
4. **"bonsAI" in small caps** is the Main tab's name in the tab bar at the top, where it now says "Main". That
   label only.
5. **New chat at the limit:** the limit rises from eight to **ten**, and at ten, New chat lets you **pick which chat
   to drop**. The pick opens the usual "Delete chat?" box, opening on Cancel, so one slip cannot lose a chat;
   Delete then makes the new chat (plan's default on the two-press shape).
6. **The chip boxes' last lines behind the question box:** the details must stay readable, with a smooth scroll,
   even if the row moves a little. This also closes "walking the chips does not keep the details in view".
7. **The two reload-under-a-game entries and the sentence readable before its cover:** left open.
8. **Up at the bottom of the About tab:** the maintainer reached it by **D-pad only**. The rig retries that route
   on the Deck's own screen.
9. **The settings card jump:** the lane reports what Steam allows; no change if a link cannot scroll to a setting.
10. **This PC as a second Deck: yes.** The maintainer put Steam here in offline mode and opened Big Picture.
11. **A pretend microphone:** one lane tries, for at most 90 minutes, to feed a recorded sentence into the Deck's
    audio so the rig can test speech. "This may be something only I can verify."
12. **Budget line:** stop starting new helpers at 60 percent of the weekly limit. The five-hour rule stays at 75
    percent; helpers resume by message after the reset.
13. **Notifications:** a phone notification after every landing batch, when something is truly blocked, and for
    the morning report.
14. **Prepared setups:** the session may pull a small model onto this PC's Ollama for the "moving a place keeps the
    other machine's names" check. "Clear all plugin data" runs only on the stand-in, never on the Deck.
15. **The mock-up session** will be stopped by the maintainer before this one starts.
16. **The session runs in a new Opus 5.5 extra-high session.**
17. **No cloud helpers tonight.** Everything runs on this PC.

## 3. What was found while planning (2026-10-09, 22:30 to 23:00)

- **The Update Ollama button replaces the program file but never restarts the server.** On the Deck the Ollama
  file is the new 0.40.2 (written 2026-10-08 at 14:18, the maintainer's press), but the Ollama that answers has
  been running for three days and is still 0.34.1. The plugin shows the running server's version. Fix: after a
  successful update, stop whatever started the server (the plugin's own start, or the autostart unit) and start it
  again, then show the new version.
- **base.en was tried on a half-downloaded model.** Its model file finished downloading at 19:42 tonight, the same
  minute the maintainer pressed the mic with base.en (19:42:30, ten seconds, no words). The file is now complete
  (148 MB). The engine may simply work now; the rig checks that it loads and decodes. The plugin should refuse to
  record, with a plain line, while a model is still downloading.
- **The Deck has a monitor plugged in as well as its own screen** (both report connected). Block 0 reads which
  one is live before any measurement; plan 84's numbers are for the Deck's own screen.
- **The Deck's memory:** 14.8 GB in all, about 2 GB free, 11 GB available, with no game running.
- **Steam on this PC is in Big Picture and offline** (the maintainer, 23:05). The stand-in opened and walked bonsAI
  with its virtual controller on 2026-10-08. Known rough edge: opening the plugin there can meet a first-run box
  that takes the ring.
- **Usage at planning time:** weekly 25 percent (resets Wednesday 2026-10-14), five-hour window 4 percent. The spawn
  guard hook is uncalibrated, so it never blocks, and it never sees helpers' own transcripts; the session reads the
  app's own usage figure instead (§ 5).
- **The mock-up board session committed twice tonight** (22:36 and 22:50); it will be stopped before "go".
- **Plan 86** (waiting for its go) removes UI scale. Tonight's Text size row is built apart from it on purpose.

## 4. The lists

### 4a. Bugs: what happens to each

| | Bug, as a player sees it | Stars | Measured first? | Who |
|---|---|---|---|---|
| B1 | The slot above the question box swaps between the Show details line and chips between an Up walk and a Down walk | ★ | Yes, M5 | Sonnet high lane after M5 |
| B2 | Going back up the chips after Developer details, the row slips 10 px once | ★ | Yes, M3 | Folded into the chips grid lane (F3) |
| B3 | Some chips' boxes end behind the question box | ★ | Yes, M3 | Folded into F3 (call 6: details stay readable) |
| B4 | The README's install link gives "not found" | ★ | No | Haiku high: the library's publish script marks its release as never the latest. The GitHub setting half stays the maintainer's |
| B5 | A continued answer repeats whole paragraphs across the join | ★ | The rig records a baseline with the stand-in AI | Sonnet high lane |
| B6 | Picking a setting from the settings card opens the right page but does not scroll to the setting | ★ | No | Sonnet high lane, short; reports what Steam allows (call 9) |
| B7 | Decky's back button changes size with the chat title's length | ★ | Yes, M1 | Folded into the name row lane (F5) |
| B8 | The UI scale section says "UI scale" twice | ★ | No | Folded into the Text size lane (F6) |
| B9 | On some tabs the top cannot be scrolled into view before focus jumps to the tab bar | ★★ | Yes, M4 | Sonnet high lane with M4 in hand; Opus reviews at landing |
| B10 | Walking the other tabs scrolls a long way at each step | ★★ | Yes, M4 | Same lane as B9 |
| B11 | Up at the bottom of the About tab does nothing | ★★ | The rig retries, D-pad only, on the Deck's own screen (M8) | If it reproduces, a Sonnet high lane with the reading |
| B12 | Walking the chips does not keep the chip's details in view | ★★ | Yes, M3 | Folded into F3 |
| B13 | The Update Ollama button may not update Ollama | ★★ | Cause in hand (§ 3) | Sonnet high lane, with B14 |
| B14 | Updating Ollama and the models should not open a popup | ★★ | No | Same lane as B13 (call 2) |
| B15 | The base.en speech model does not work at all | ★★★ | Yes, M7 | Voice lane, Sonnet high |
| B16 | The mic stops after about 3 or 4 seconds of speech | ★★★ | Needs speech: the pretend microphone (§ 8) | Voice lane; if no pretend mic, a code and log reading only |
| K1 | "No close match in my notes" shown while the log says notes were attached | ★ | The rig reproduces with a game running | Sonnet high lane |

Calls the maintainer left open (call 7): the reload that puts Steam's Home screen in front of the game; the reload
under a heavy game that leaves Steam's interface gone; the sentence readable for a second before its cover.
Theirs by hand: the tab-bar ghost after a touch (a finger), Up from the answer bubble scrolling the whole answer
(their hand check), and the Steam freeze after an answer (seen once, nothing new to try).

### 4b. Features

| | Feature | Stars | Measured first? | Who |
|---|---|---|---|---|
| F1 | The Main tab's name in the tab bar reads "bonsAI" in small caps | ★ | No (the rig confirms after) | Haiku high |
| F2 | Ten chats, and at ten you pick which chat to drop | ★★ | No | Sonnet high |
| F3 | The Show details chips in a denser grid, walked in four directions (with B2, B3, B12) | ★★★ | Yes, M3 | Opus 5.5 high lane, the one Opus helper of the night (focus and layout, the riskiest lane) |
| F4 | The tab bar in a fixed order: Main far left, About far right | ★★★ | Yes, M2 | Sonnet high with M2 in hand; Opus reviews at landing; steps up after one Deck failure |
| F5 | The + and delete icons at the ends of the chat's name row (with B7) | ★★★ | Yes, M1 | Sonnet high |
| F6 | Text size in Settings: small, normal, large, for the words in the chat (with B8) | ★★★ | No | Sonnet high |

### 4c. Verify: who can close each entry tonight

| Entry | Who | How |
|---|---|---|
| Down onto the slot's Show details line: "same stops both ways" | Rig, after B1 lands | Block 4 |
| The doubled hidden-block marks at a join | Rig, the stand-in AI with a scripted hidden block across a join | Block 2 |
| Moving a place keeps the other machine's names | Rig, after a small model is pulled on this PC (call 14) | Block 2 |
| A saved PC that does not answer drops nothing | Rig, a saved PC pointed at an unused address on the network | Block 2 |
| A typed follow-up's topic is the person's own words | Rig, with verbose logging on, reading the prompt in the log | Block 2 |
| The help chip after the quick start | The stand-in: Clear all plugin data there, then the fresh-install walk | Stand-in block S1 |
| Long chips: a short chip's centring, and the other chip changing | Rig, a pinned batch with one short chip that has no tip dot | Block 2 |
| The panel's frame rate in a real fight | Rig: Deep Rock Galactic: Survivor in a mission (the character fires on its own; the rig holds a direction), one streamed answer, 60 seconds measured | Block 5, last, memory allowing |
| The chip look, row 06 for the two-chip setting | Rig, measured | Block 2 |
| Re-record the eight saved Deck walks | Rig, on the final build | Block 6 |
| The sliver on a tall section; the clean-up with no Ollama on the Deck | Tests only (stay) | |
| The parental lock half, the PIN, the real microphone twice, the right stick, the maintainer's own looks (chips, scramble, rating, frame rate), the trap in daily use, the cut-menu hand check, the kids lock | Maintainer | Their checks page |

## 5. Who does what: models, effort, how many at once, the budget

| Work | Model and effort | At once |
|---|---|---|
| Running the session: briefs, reviews, landing, reading Deck failures, writing the Deck checks | Opus 5.5 extra-high | 1 |
| Fixes and features with a choice in them (F2, F4, F5, F6, B1, B5, B6, B9+B10, B13+B14, the voice lane, K1) | Sonnet 5.5 high (`feature-lane`, `bugfix-lane`) | up to 10 editing helpers in all |
| The chips grid (F3) | Opus 5.5 high (`bugfix-lane-opus-high`, or `feature-lane` with model opus, effort high) | 1 |
| Mechanical fixes (F1, B4, the UI scale heading if split off) | Haiku 5.5 high (`bugfix-lane-haiku-high`), logged in plan 33 § 4d | counted in the ten |
| Reading and reporting facts: the owed-checks list from the testing documents, a code map per lane brief, a first look at each finished lane, summaries of evidence files and the Deck log | Haiku 5.5 high, each job under about 100,000 tokens, as a workflow so they resume on their own at a limit | 20 to 30 |
| Bookkeeping | the bookkeeper, Sonnet 5.5 medium | 1 |
| Deck checks | the `deck-driver`, Sonnet 5.5 medium, a fresh one per block | 1 per machine (one on the Deck, one on the stand-in), `machine` named in every call |

**The ladder, when a helper's work is not good enough:** Haiku medium → Haiku high → Sonnet medium → Sonnet high →
Opus medium, one step at a time, after a failed landing review or a Deck failure with a measurement in hand. Each
step is logged in this plan's log, and every Haiku run in plan 33 § 4d (the fix, the result, the cost, whether
Sonnet had to step in).

**Rules that go with it:**

- **Helpers run only the tests for what they touched while they work.** The full suites run at landing. Twenty
  helpers running full suites slowed this PC until tests timed out (plans 79 and 83).
- **Haiku reads; Haiku never edits a document or bookkeeping.** It lost sentences while moving text in plan 83.
- **Before every new batch of helpers, read the app's own usage figure** (the session tool that reports the
  five-hour and weekly percentages). Start nothing new past 60 percent of the week or 75 percent of the five-hour
  window; resume stopped helpers by message after a reset. The spawn guard hook stays as it is (it never blocks
  while uncalibrated); a follow-up for a later session is to make it read the app's figure and weigh by model.
- **Notifications** (call 13): one after every landing batch, one when truly blocked, one for the morning report.
  Nothing else.
- **No push, no merge to main, no branch switch in the shared folder, nothing staged with `-A`, no PIN or password
  typed, no press on the Deck outside a written check.** The maintainer publishes.

## 6. The lanes

Every brief carries what the runbook asks for: the tip hash and the base check, "run the baseline checks now,
without an install", the owned files (§ 12), one fix per commit with the failing test first, the Deck-pass sentence
and a test at that same level, the five checks and the quick check before every commit, a scratch folder of its
own, no stash, and the report shape. Every lane keeps to its own tests while working.

### Batch 1 — starts at once, no measurement needed

- **F1, "bonsAI" in small caps** (Haiku high). The tab bar's label for the Main tab reads "bonsAI" drawn in small
  capitals; the hidden tab's spoken name follows. *Pass on the Deck:* the label's text is "bonsAI" and its computed
  style is small caps, on the Main tab and when another tab is current (the small icon's hover name too if any).
- **B4, the publish script** (Haiku high). The knowledge library's release is created as never the latest, so it
  cannot take the plugin release's spot again. *Proof:* a test on the command the script builds. No Deck check.
- **F2, ten chats and pick which to drop** (Sonnet high). The limit is ten. At ten, New chat (from the chats menu
  and from the new + icon once F5 lands) opens a picker listing the chats; picking one opens the usual Delete
  chat? box (opening on Cancel); Delete removes it and makes the new chat; Cancel or B keeps everything. Nothing is
  ever deleted without that box. *Pass on the Deck:* with ten chats, New chat shows the picker, B cancels and ten
  remain, a pick then Delete leaves ten with a fresh chat on top, the dropped chat's file is gone and no other
  file changed. This lane owns the chats menu and the back end's slot limit; F5 lands after it.
- **B13 + B14, Ollama update** (Sonnet high). After a successful update the running server is restarted and the
  version shown is the new one; Update and Install run in place with a progress line and a done or failed line
  under the button, no popup. *Pass on the Deck:* Update AI & models pressed once with the rig: no popup opens,
  the line under the button moves, and at the end the version shown and the server's own version both read
  0.40.2 with a fresh process start time. (This pull re-reads every installed model; it is quick when they are
  current.)
- **B5, the repeated paragraphs** (Sonnet high). When an answer is cut and continued, text that repeats across
  the join is trimmed once, the way doubled stretches of a spoken question are merged; nothing is trimmed when
  the join is clean. *Pass on the Deck:* with the stand-in AI scripted to repeat a paragraph at a join, the saved
  answer holds it once; with a clean join nothing is lost. The rig's block 2 baseline (the repeat as the Deck's
  model writes it) is handed to this lane.
- **B6, the settings card jump** (Sonnet high, short). Find out whether Steam's settings page can be opened at,
  or scrolled to, one setting. If yes, do it; if not, say so plainly in the report and the roadmap entry.
- **K1, "No close match" while notes were attached** (Sonnet high). Read what was attached (rules and cards only, or
  real notes), and make the line and the notes block agree with the attach count. *Pass on the Deck:* a question
  with a game running that attaches notes shows the notes block and never the "No close match" line.
- **F6, Text size** (Sonnet high). A Settings row, small / normal / large, default normal, saved like every other
  setting; it scales the words in the chat only (questions, answers, the Show details text). Its own CSS variable,
  not the UI scale machinery. The doubled "UI scale" heading is fixed in passing. *Pass on the Deck:* the answer's
  measured font size changes by the chosen step, the tab bar's and the chat name's do not, the setting survives a
  close and reopen, and the D-pad walk of the Settings tab has no dead press.
- **The voice lane: B15 + B16** (Sonnet high). Recording is refused with a plain line while a model is still
  downloading. Then the pretend microphone (§ 8): if it works, reproduce the 3 to 4 second cut-off with a ten-second
  recorded sentence and fix what the loudness gate or the silence rule gets wrong; if it does not within 90
  minutes, read the code and the Deck log and report the most likely cause, with a test where one can be written.
  *Pass on the Deck:* base.en loads and decodes the pretend sentence; a ten-second sentence comes through whole.

### Batch 2 — after block 1's measurements

- **F5 + B7, the name row** (Sonnet high, after M1 and after F2 lands). A + at the left end and a delete icon at
  the right end of the chat's name row; both are ring stops reached by Left and Right from the name; + makes a new
  chat (through F2's rule at the limit); the delete icon opens the Delete chat? box; the back arrow keeps one size
  whatever the name's length, and a long name spills into the empty space on the right (symmetry is not required).
  *Pass on the Deck:* both icons visible with the ring on them, Left and Right from the name reach them, A on each
  does its job, B from each returns the ring to the name, and the back arrow's box measures the same width with a
  three-letter name and a thirty-letter name.
- **F4, the tab bar in a fixed order** (Sonnet high with M2 in hand). *Pass on the Deck:* on every tab the icons
  left of the current one are the tabs before it and the icons right of it are the tabs after it, Main is the
  leftmost thing after LB on every tab, About the rightmost before RB; LB on Main goes to About and RB on About to
  Main; Down from the bar enters the tab; the bar never scrolls or wraps its icons.
- **B9 + B10, the other tabs' scroll** (Sonnet high with M4 in hand). A D-pad step scrolls a couple of lines, not
  a page, and the first control of a tab leaves its heading fully visible under the tab bar. *Pass on the Deck:* on
  Settings, Ollama, Permissions, Developer and About, the largest move per step is under a third of the panel's
  height, the heading is whole at the first control, and the walk has no dead press and no stop twice.
- **B1, the slot swap** (Sonnet high with M5 in hand). The slot shows the same thing at the same place on the way
  up and on the way down. *Pass on the Deck:* two Up walks and two Down walks from the question box visit the same
  stops in reverse order, twice.
- **F3, the chips grid** (Opus high with M3 in hand). *Pass on the Deck:* every chip is reachable by Left, Right,
  Up and Down with no dead press and no stop twice; the open chip's details are readable at every stop (the box's
  end is on screen, scrolled smoothly when needed); the row does not jump; a box taller than the screen scrolls
  its end into view on the first Down; going back up after Developer details, the row does not slip.

### Landing

One at a time with `scripts/land_lane.sh`, back end before screen changes, `LAND_COAUTHOR` set to Opus. Order:
F1, B4, F2, B13+B14, B5, B6, K1, F6, the voice lane; then F5, F4, B9+B10, B1, F3; then second rounds. **One owner
per shared file per round:** the chats menu belongs to F2 until it lands, then to F5; the settings tables to F6; the
Ollama tab to B13; the tab bar files to F4; the chip ladder files to F3. A lane that needs a file outside its list
stops and says so; a follow-up lane is cut from the new tip only after the first lane's commits have landed. A
later lane that touches an area an earlier lane changed is re-read against it before landing. After every landing
batch: the bookkeeper's sweep, the plan's log, and the notification.

## 7. The Deck, in blocks

Standing rules as in the runbook: one driver at a time per machine, a fresh driver per block, every Deck command
exactly `ssh deck@192.168.86.52 '<command>'`, evidence files `plan87-<ROW>.json` (stand-in files
`plan87-S-<ROW>.json`, every one stamped with the machine). If a deploy is refused, tell the maintainer "run
setup-dev" and carry on with what does not need it.

- **Block 0, setup (first thing):** confirm nothing else drives either machine; keep both awake; read which Deck
  screen is live (its own, or the plugged-in monitor); back up the Deck's settings and chats to `~/p87-backup`;
  note the build on the Deck and deploy the tip if it differs; record how Ollama runs (the 0.34.1 server, the
  0.40.2 file, the autostart unit); find or make the test chat and write its name in the handover note; parental
  lock off; test chips clear; which game is on Recent Games. Baseline quick check green at the tip before any copy
  is cut.
- **Block 1, the measurements (about 40 minutes), in this order:**
  - **M1, the back button:** the width and position of Decky's back arrow and of the chat's name with a three-letter
    name and with a thirty-letter name (rename the test chat and rename it back).
  - **M2, the tab bar:** on each tab, the position and size of every icon and of the name, LB and RB included.
  - **M3, the chips:** the width of each of the seven chips open and closed, the row's height, each panel's height,
    which boxes end behind the question box and by how much, and the sizing read at the step from the third chip
    to the second going up after Developer details (the blank space and the box heights at that step).
  - **M4, the other tabs:** on Settings, Ollama, Permissions, Developer and About, the scroll position after every
    D-pad step from the tab bar to the last control and back, and whether the heading is hidden under the tab bar
    at the first control.
  - **M5, the slot:** an Up walk from the question box and a Down walk back, twice, logging at every step what the
    slot shows and whether the answer's own Show details line is on screen.
  - **M7, base.en:** switch the voice model to base.en in the settings file, press the mic for four seconds of
    silence, read the log for load and decode lines, switch back.
  - **M8, the About tab:** D-pad only, Down to "Support my Steam Sale habit", then Up, three times, on the Deck's
    own screen.
- **Block 2, owed checks that do not depend on tonight's fixes, while the lanes build:** the hidden-block marks and
  the repeated-paragraph baseline with the stand-in AI (§ 8); a place moved with a PC-only model (pull a small model
  on this PC first; remove it at the end); the silent saved PC; the follow-up's topic in the verbose log; the short
  chip's centring; the chip look row 06 for the two-chip setting; a game-running knowledge-base question for K1's
  baseline. Any new bug found goes to the roadmap, the report, and gets one helper round of about an hour.
- **Block 3, after the first landing batch:** one deploy, then one check per landed fix (the pass sentences in § 6).
- **Block 4, after the second batch:** one deploy, then the tab bar, the name row, the other tabs' scroll, the slot
  swap and the chips grid, each as written in § 6.
- **Block 5, second rounds and the sweeps:** fixes from failures; the free-play sweep with and without a game (the
  standing row: every focused stop also visible); the frame rate in a real fight, memory allowing; the smoke test.
- **Block 6, the end:** re-record the eight saved Deck walks on the final build; put back every setting from the
  backup, the chats, the voice model, the normal build; clear the pinned test chips; remove the model pulled on this
  PC; unload the pretend microphone; close the game; release the keep-awake on both machines. The handover note
  says where everything stands.

## 8. Prepared setups

- **The stand-in AI** (plan 81's way, rebuilt in the scratch folder, never committed): a small program on this PC
  that answers like Ollama with fixed, scripted answers (port 11500). The Deck's Ollama tab is pointed at this PC's
  address with "Run AI on this Deck" off for the check, and put back after. Scenarios tonight: a hidden block opened
  again across a join; a paragraph repeated across a join; a clean join. Every such result says "prepared answer".
- **The pretend microphone** (the voice lane, 90 minutes at most): on the Deck, a null audio sink is loaded over SSH,
  a recorded ten-second sentence is played into it, and the plugin is pointed at the sink's monitor as its capture
  target (a developer-only override if none exists). Unloaded at the end. If the Deck's sound setup refuses it, the
  lane says so and stops.
- **The small model on this PC:** pulled with this PC's Ollama for one check, removed in block 6.

## 9. The stand-in, in blocks

This PC's Steam Big Picture with Decky Loader for Windows, driven through its virtual controller, `machine:
"this-pc"` on every call. Steam here is offline and in front; nobody touches the keyboard or mouse during a run.
Windows is not SteamOS: it is good for "does it open, does the D-pad walk, is every stop visible", not for pixel
numbers. **A stand-in pass is never a Deck pass**; it saves Deck time by catching the obvious first, and it is
written up as "stand-in" in every evidence file.

- **S0, setup:** check it is ready and the plugin opens (the first-run box that takes the ring is dismissed once
  and noted); deploy the tip there; a short free-play sweep as the baseline.
- **S1, the fresh install:** Clear all plugin data there, then the help chip after the quick start (open the quick
  start, close it, the help chip is gone and the suggestion chips take the row).
- **S2, after each landing batch, before the Deck's block:** deploy there first and walk the new tab bar, the name
  row's icons, the pick-a-chat flow, the Text size row and the chips grid in four directions. A failure here goes
  straight back to its lane without waiting for the Deck.
- **S3:** the free-play sweep on the final build.
- **If a stand-in press ever lands in the wrong window, stop the stand-in and carry on with the Deck alone.**

## 10. Paperwork, the report, and running unattended

- **The roadmap is current at every step.** After every landing, a fixed bug moves from Bugs to Verify naming the
  check it owes, and a feature to Verify or Partial. After every Deck pass, the entry moves to Done with its evidence
  file; a failure goes back to Bugs with what was seen; the testing documents change in the same commit. The
  bookkeeper does every one of these from result lists the session writes, never from memory, and the session
  spot-checks each bookkeeper commit against the evidence. The bookkeeper does not commit while a landing runs.
- **The plan's log** gets a few lines after every landing batch and every block, committed, so a look from a phone
  shows where things stand.
- **The 20-minute scheduled check** restarts the session after a usage stop; each helper keeps its copy and resumes
  with one short message. Keep-awake held on this PC and on the Deck.
- **A question for the maintainer** goes in § 11 with the safest choice taken meanwhile. A phone notification only
  as call 13 says.
- **In the morning:** a published report leading with what only the maintainer can do, then what was built and
  proven, what failed and why, what was found, and what is left; the maintainer's checks page
  (https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4) brought up to date; the roadmap audited
  (Bugs and Verify against Done); the quick check green; nothing pushed.

## 11. Questions for the maintainer (the safest choice taken meanwhile)

1. **The Install flow's popup** was read as "goes too" (call 2). *Meanwhile:* both Update and Install run in place.
2. **Pick-a-chat at ten** opens the Delete chat? box after the pick (two presses). *Meanwhile:* the two-press shape.
3. **Text size** scales the chat's words only. *Meanwhile:* that scope.
4. Anything a block or a lane raises during the night is added here.

## 12. For the builders: where the code is (checked 2026-10-09 at `2a28bf5d`)

| Lane | Files it owns |
|---|---|
| F1 | `src/features/plugin-shell/tabTitles.tsx` (the `main: "Main"` label), `src/styles/sections/tabIndicatorBar.ts` |
| B4 | `scripts/publish_corpus.py` (the `gh release create` call), its test |
| F2 | `py_modules/backend/services/chat_slot_service.py` (`MAX_CHAT_SLOTS = 8`, `_prune_oldest_slot`, `create_slot`), `src/features/chat-title/ChatsMenu.tsx`, `chatsMenuModel.ts`, `useChatSwitchActions.ts`, `src/features/chat-slots/useChatSlotDeleteConfirm.tsx`, `ChatSlotDeleteModal.tsx`, the chat-slot tests |
| B13 + B14 | `py_modules/backend/services/local_ollama_setup_service.py` (`run_local_setup`, `try_restart_ollama_user_service`, `ensure_ollama_server_listening_before_pull`), `src/hooks/useLocalOllamaSetupFlow.tsx` (the download box), `src/components/OllamaTab.tsx`, `src/features/downloads/` |
| B5 | `py_modules/backend/services/soft_continue_spoiler_join.py`, `ollama_chat_stream.py`, `ollama_reply_limits.py`; the overlap merge to copy is `merge_sliding_window_transcript` in `voice_transcription_service.py` |
| B6 | `src/hooks/useSteamSettingsSearch.ts`, `useAskBarSettingsCardRows.ts` |
| K1 | `py_modules/backend/services/kb_not_in_notes_notice.py`, `src/utils/kbNoteUsedByAnswer.ts`, the notes block in `src/components/MainTabChatTranscript.tsx` |
| F6 | the settings tables: `py_modules/backend/services/settings_service.py`, `src/data/bonsaiSettingsSchema.ts`, `src/utils/settingsPayload.ts`, `src/hooks/usePluginSettings.ts`, `src/index.tsx` (as `terse_mode` was threaded in plan 83); the row in `src/components/SettingsTab.tsx`; the heading in `SettingsTabUiScaleSection.tsx`; the chat's bubble styles under `src/styles/sections/` and `src/utils/buildAnswerBubbleElement.tsx` |
| Voice | `py_modules/backend/services/voice_transcription_service.py` (`SILENCE_HOLD_SECONDS`, the loudness gate, `_flush_final`), `voice_audio_capture_service.py` (the capture command and mic target), `voice_model_download_service.py`, `voice_rpc.py` |
| F5 + B7 | `src/features/chat-title/ChatTitleView.tsx`, `chatNameNav.ts`, `nameRowBalance.ts`, `chatTitleStyles.ts`, `deckyTitleParts.ts`, `deckyHeaderShape.ts`, `chatsMenuIcons.tsx`; the focus rules in `docs/focus-graph.md` |
| F4 | `src/features/plugin-shell/TabIndicatorBar.tsx`, `tabBarNav.ts`, `src/features/chat-title/TitleTabStrip.tsx`, `src/features/unified-input/constants.ts` (`TAB_BAR_*`), `src/styles/sections/tabIndicatorBar.ts` |
| B9 + B10 | `src/features/plugin-shell/TabBodyFocusRoot.tsx`, `src/hooks/useTabStripBodyOffset.ts`, `src/utils/tabBodyViewport.ts`, the tab components' own scroll handling |
| B1 | `src/features/details-slot/DetailsSlot.tsx`, `detailsSlotStore.ts`, `DetailsSlot.deck.test.tsx` |
| F3 | `src/components/ContextChipLadder.tsx` and its tests, `src/hooks/useChipLadderReveal.ts`, its styles section, `src/test-harness/deckAnswerWalk.ts` for the walk tests |

Other facts for the briefs: the Deck is `deck@192.168.86.52`; this PC was `192.168.86.27` on 2026-10-03 (check);
the stand-in's plugin folder is `C:\Users\still\homebrew\plugins\bonsai`; the voice models live in
`~/homebrew/settings/bonsAI/voice_models/` on the Deck; the plugin log is under `~/homebrew/logs/bonsAI/`; the
quick check takes about a minute, the screen tests about two and a half minutes, the back-end tests about twenty
seconds; the copy helper is `python scripts/worktree.py create <name> --base experimental` (the copy's packages
folder is a link, so no install; never remove a copy with git's own command).

## 13. For the lessons file, at the end

The maintainer asked for this session's shape to be captured. At the end, add to
[lessons-learned.md § 4](../lessons-learned.md) a short block on large sessions: how many helpers ran at once and
what the PC bore; whether Haiku readers paid for themselves (what they got wrong, how often Sonnet stepped in);
whether the stand-in saved Deck time or cost it; what the budget reads were at each batch; and anything that would
change the runbook.

## 14. Progress log

Empty until "go".
