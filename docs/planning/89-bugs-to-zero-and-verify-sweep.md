# Plan 89: the bug list and the Verify list as close to empty as they can get

**Status:** READY 2026-10-11, about 17:45. Planned on Fable 5.1; the maintainer's fifteen calls are in
([D128](../audit/maintainer-decisions-locked.md#d128--locked-2026-10-11-raised-2026-10-11--plan-89-the-bug-list-and-the-verify-list-as-close-to-empty-as-they-can-get-the-fifteen-calls)).
**A separate Opus 5.5 extra-high chat runs it.** Nothing is built and nothing has been pressed. The standing way of
running a night like this is [the bug-wave runbook](../agents/bug-wave-runbook.md); this page says only what is
different tonight.

## 1. The short version

- The roadmap has **16 bugs** and **23 entries waiting for a check**. The repo is at `4e962bd3` (this plan on top of
  plan 88's last commit; the copy here matches GitHub).
- **10 bugs get a helper tonight**: 7 in the plugin (4 start at once, 3 after a Deck measurement) and 3 in the test
  rig's own project. **1 is already fixed on GitHub** (the install link works again as of this evening). **5 wait**
  on the maintainer: two reload bugs and the spoiler sentence (left as they are), Up from the answer bubble (a call
  still open), and the tab-bar ghost (a finger).
- **Of the 23 Verify entries, 7 close now on the maintainer's calls** (five on their tests, the cut menu on its
  prepared pass, the trap as not seen again), **the rig can settle 9 tonight**, and **the rest need the maintainer**
  (a real voice, a finger, their own eyes, a PIN, the right stick, a first install).
- **Also tonight:** the two one-star features asked for on 2026-10-10; the lever against the frozen Steam, with a
  reproduction try last; the deletion of the old helper copies.
- **Expected in the morning:** about **6 bugs** left (the two reloads, the spoiler sentence, Up from the bubble, the
  ghost, the freeze if it does not reproduce), plus the rig's Steam button if its cause is in the board's program;
  about **12 Verify entries** left, every one the maintainer's, plus anything that fails tonight.
- **Rough time: 8 to 10 hours** from the Opus chat's go, if the usage limit holds (§ 11).

## 2. The maintainer's calls (2026-10-11, D128)

1. **Model:** this planning on Fable; a separate Opus 5.5 extra-high chat runs the plan.
2. **The two reload bugs:** untouched.
3. **The sentence readable for a second before its cover:** left for now.
4. **Up from the answer bubble.** In plain words: when the ring sits on a whole long answer (the big box, not a line
   inside it) and the answer is scrolled down, pressing Up first scrolls the answer back up, a screen at a time. Only
   when it cannot scroll any further does the next Up move the ring to the thing above the answer. The other way: Up
   leaves the answer at once, and scrolling is the right stick's job. Today's way is how Steam's own long pages behave.
   The call: keep it, or make Up leave at once? *Meanwhile:* kept.
5. **The five tests-only Verify entries:** close them.
6. **The cut choice menu:** close it.
7. **The search-list trap:** close it.
8. **The frozen Steam:** yes to both: a reproduction try, last in the night; and the lever (the Deck's AI leaves
   memory sooner while a game runs).
9. **The three rig bugs:** Sonnet or Opus helpers work in the rig's own folder, code only, no reflash.
10. **tiny.en:** stays.
11. **The two one-star features:** included.
12. **The Deck's saved chats** may be moved aside for the dead-chat check, with a backup.
13. **The idle plan 87 chat:** close it. (Could not be closed from here: its Remote Control link counts as live work.
    The maintainer closes it from the sidebar; the rig's readiness check is run without that one condition if it is
    still open.)
14. **The old helper copies:** delete the landed ones.
15. **The usage limit:** accept a possible stop.
16. **The helper cap is 15 at once, for this plan and for every session from now on** (2026-10-11, after reading the
    plan; was ten since 2026-09-29). Written into AGENTS.md and the runbook.
17. **Tonight only, the weekly usage line is ignored on starting new helpers** (2026-10-11 evening, during the run).
    The five-hour rule stays: nothing new past 75 percent of the five-hour window.
18. **For future sessions the weekly line is 80 percent** (was 60): start no new helpers past 80 percent of the weekly
    limit or 75 percent of the five-hour window. Written into AGENTS.md and the runbook.

## 3. The bugs, and what happens to each

| Bug | Stars | Tonight | Who |
|---|---|---|---|
| The wake-word study names a constant that no longer exists | ★ | Fixed: a wording change, with a search for every mention | Haiku high (H1) |
| A failed status check leaves the recording running | ★ | Fixed: on that error the screen also tells the back end to stop, the way the clear path already does; a test that fails first | Haiku high (H2) |
| "Enable Wi-Fi" opens Steam's System page, not Internet | ★ | Measured first (block 1 opens all 24 pages two ways and reads what opens), then fixed with the page names Steam really answers to | Sonnet high (S3), after the measurement |
| New users cannot install bonsAI (the README link) | ★ | **Already fixed on GitHub**: v0.4.9 is marked Latest (`gh release list`, 2026-10-11 17:15). The script half landed in plan 87. Moves to Done | bookkeeper |
| A plugin reload can put the Home screen in front of the game | ★ | Untouched (call 2) | — |
| The start of a sentence shows for a second before its cover | ★ | Untouched (call 3) | — |
| Opening the plugin with the rig fails after a reload | ★ | Fixed in the rig's folder: after a reload, the open tool waits for the Deck's debugger to come back before its first read, as it already does after a deploy | Sonnet high (R2), rig folder |
| The rig's settings snapshot failed once with a buffer error | ★ | Fixed in the rig's folder: find the call that raised it (the evidence file holds the text), and fall back to the streamed copy over SSH the driver did by hand, saying so in the result | Sonnet high (R3), rig folder |
| Left or Right on Text size scrolls the page | ★★ | Cause found in the code: the Settings tab moves the pane a little on **every** landing of the ring, even a sideways one inside a row. Measured in block 1, then fixed with the next entry | Opus high (O1), after the measurement |
| Walking Settings and Developer moves the page at every press, then jumps at the end | ★★ | Same cause: the plan moves the pane ahead of time at each press and sends the last control to the very bottom. New rule: move only when the control would leave the comfortable band, by a moderate step, never a page-sized jump at the end; a glide is tried and measured, and reported as not possible if Steam scrolls on top of it | Opus high (O1) |
| Up from the answer bubble scrolls the answer instead of moving | ★★ | The call is open (§ 2, 4); unchanged meanwhile | — |
| Reloading under a heavy game can leave Steam's interface gone | ★★ | Untouched (call 2) | — |
| The rig's Steam-button press no longer opens Steam's menu | ★★ | Measured in block 1 (what the Deck's input device sees when the rig presses it). If the cause is on the server side, fixed in the rig's folder; if it is in the board's program, reported for the maintainer to reflash later | Opus high (R1), rig folder, after the measurement |
| A faded ghost of the tab bar after a touch | ★★ | Needs a finger with a game running; the maintainer's. The strip that could ghost is gone from the code | maintainer |
| Text size changes only the chat's words; wanted: all the text | ★★ | Built as picked (option B): every word on every tab scales, rows keep their heights. 197 inline sizes in 55 files plus 81 in the stylesheets go through one scale number | Sonnet high (S1) |
| Steam's screen froze after an answer with a game and the Deck's AI | ★★★ | The lever is built: with a game running, the Deck's own AI leaves memory about a minute after an answer instead of five (S4). A reproduction try runs last in the Deck night (block 6). If it does not freeze, the entry stays open as "not reproduced, lever in place" | Sonnet high (S4); the Deck |
| The mic stops after 3 or 4 seconds of speech (tiny.en, real voice) | ★★★ | The one guessed cause is fixed: the "box was emptied, so dictation is over" rule can fire when the live words and the box are written in two steps; it now ignores an emptiness the mic's own write explains. A test that fails first. **Stays in Verify for the maintainer's real voice** | Sonnet high (S2) |

**The two features (call 11):**

| Feature | Tonight | Who |
|---|---|---|
| The delete box: title "Delete chat?", Cancel and Delete on one row like the other popups, Cancel still first | Built; Deck check: the box opens on Cancel, A on Cancel keeps the chat, Right then A deletes | Sonnet medium (F1) |
| Update with internet downloads off shows both the failed line ("Failed (check the Internet downloads permission?)") and the "Turn on internet downloads?" box | Built; Deck check with the permission off | Sonnet high (F2) |

## 4. Verify: who closes each entry

| Entry | Who | How |
|---|---|---|
| Parental-lock half of the stale return note | maintainer | needs the PIN |
| Down onto the slot's line, "same stops both ways"; and the slot swap fix | rig | row P87-B1-SLOT-SAME-STOPS with a prepared long answer whose own Show details line sits behind the dock |
| Up can land on a tall section with a sliver showing | bookkeeper now (call 5) | tests |
| A place move wiped the other machine's saved names | bookkeeper now (call 5) | tests, two unclear tries |
| The clean-up with no Ollama on the Deck | bookkeeper now (call 5) | tests |
| Removing a model with a silent saved PC | bookkeeper now (call 5) | tests |
| A remembered chat that no longer exists | rig (call 12) | back up and move the saved chats aside, reload the plugin, ask: a new chat must be made; put the chats back |
| A typed follow-up shows the AI the reminder's words | bookkeeper now (call 5) | tests |
| "UI scale" said twice | rig | read the Settings page's words: one heading |
| "Screenshot quality" said twice | rig | the same read |
| The help chip after the quick start (Deck half) | maintainer | the first-install check; the Deck's data is never wiped by a session |
| The cut choice menu | bookkeeper now (call 6) | the prepared pass of 2026-10-03 and the tests |
| Doubled words | maintainer | real microphone |
| Stop, then the mic again | maintainer | real voice |
| Voice replies "when I asked by voice" | maintainer | real voice |
| The AI's own suggestion chip by D-pad | rig | row P87-INJECT-CHIP with a prepared Pyro answer that carries the chip |
| The search-list trap | bookkeeper now (call 7) | not reproduced in ten routes; reopens if seen |
| Re-record the tall-section walk | rig | a prepared answer with a section taller than the screen, Voice replies off |
| Every Steam settings page the card can open | rig | block 1, all 24 |
| Long chips: a short chip's centring, "the other chip changes" | rig | 200 s watch, with a game if one can be started |
| Chips look (rows 01 and 05, the help and agent chips, the chip pace pick) | maintainer | eyes |
| Scramble look and the frame-rate verdict | maintainer | eyes |
| Frame rate: the look, and a run in a real fight | maintainer + rig | the rig tries a real fight (row SCR-10); the look stays the maintainer's, so the entry stays |
| Calmer rating choices: the look | maintainer | eyes |
| The Show details slot, steps 3 and 4 | maintainer | the right stick, which the rig does not have |
| Kids master lock | maintainer | a locked account |

Every Main-tab change tonight (the text size, the delete box) also owes the free-play sweep, with and without a game.

## 5. Who does what

| Work | Model and effort | At once |
|---|---|---|
| Running the session: briefs, reviews, landing, Deck runbooks, reading failures, deleting the old copies | Opus 5.5 extra-high, a new chat | 1 |
| Mechanical one-star fixes (H1, H2) | Haiku 5.5 high (`bugfix-lane-haiku-high`), each run logged in plan 33 § 4d | 2 |
| Fixes and features with a choice (S1, S2, S4, F2, S3; R2, R3 in the rig's folder) | Sonnet 5.5 high (`bugfix-lane`, `feature-lane`) | up to 7 |
| The delete box (F1) | Sonnet 5.5 medium (`bugfix-lane-sonnet-medium`) | 1 |
| The Settings walk (O1) and the rig's Steam button (R1), measurements in hand | Opus 5.5 high (`bugfix-lane-opus-high`) | 2 |
| Bookkeeping | the bookkeeper, Sonnet 5.5 medium; every status names its evidence | 1 |
| Deck checks | the `deck-driver`, Sonnet 5.5 medium, a fresh one per block | 1 on the Deck, 1 on the stand-in |

**The cap is 15 editing helpers at once** (the maintainer's call 16, D128: the standing cap from now on, was ten).
Batch 1 starts 9; batch 2's three start as soon as block 1's measurements are in, without waiting for a batch 1
slot; second rounds and the two features' fixes from Deck failures start the same way. **In all: 12 fix helpers
planned, 1 bookkeeper, about 8 Deck drivers and 1 or 2 stand-in drivers.** The usage-window guard on starting lanes
stays as it is; it has no count of its own.

Rules as in plan 87 § 5: helpers run only the tests for what they touched; the full suites run at landing. Before
every new batch, read the app's usage figure; tonight the line is the five-hour one only: start nothing new past 75
percent of the five-hour window (the weekly line is ignored for this run, call 17). Notifications: one after each landing batch, one when truly blocked, one for the report. A helper
in the rig's folder works on a branch of that repo, commits there, and never pushes; the one running the session
restarts the rig's tool server to pick up a change (the tool server reads its built code at start).

## 6. The lanes

Every brief carries what the runbook asks for: the tip hash and the base check, "run the baseline checks now, without
an install", the owned files (§ 13), one fix per commit with the failing test first, the sentence that says what a
pass looks like on the Deck, the five gates and the quick check before every commit, a scratch folder of its own,
`git -C <copy>` instead of `cd`, never `git stash`. Copies are cut with `python scripts/worktree.py create <name>
--base experimental`; the copy's branch is `refactor/<name>`.

**Batch 1, starts at once (no measurement needed), 9 helpers:**

- **H1, the docs constant** (Haiku high). Search the whole repo for the old name first; reword every mention. No Deck
  check.
- **H2, the status-check stop** (Haiku high). On the error path of the status poll, also fire the stop call, best
  effort, the way the clear path does. Test: a poll that throws leads to one stop call. Deck: a log line only.
- **S1, text size everywhere** (Sonnet high). One scale number on the plugin's root; every word on every tab reads it;
  rows and buttons keep their heights; Normal is exactly today's size; a long chat name is cut off sooner on Large.
  Deck pass: on Large, the tab bar name, the chat's name, a chip, the question box and a Settings label all measure
  bigger than on Normal, and no row is taller; on Small, smaller. A test per surface.
- **S2, the mic rule** (Sonnet high). The "emptied box ends dictation" rule must not fire when the box's emptiness is
  the mic's own in-between state. Test: the live words and the box written in two steps never end dictation; the X
  still does. Deck: a recorded sentence on tiny.en grows to the end; the real voice is the maintainer's.
- **S4, the Deck's AI leaves memory sooner with a game running** (Sonnet high). While a game runs, the keep-alive sent
  with each request is about a minute instead of the Unload delay setting; with no game the setting rules as today.
  The screen already tells the back end whether a game runs for the mic (plan 88); the ask path gets the same. A line
  in the log says which was used. Deck pass: with a game running, the Deck's AI is gone from memory within about 90
  seconds of an answer (read over SSH); with no game it stays for the Unload delay.
- **F1, the delete box** (Sonnet medium). Title "Delete chat?"; Cancel and Delete side by side as in the other
  popups; Cancel first in the order so the ring opens on it. Search for every place the old title appears.
- **F2, Update with downloads off** (Sonnet high). The failed line hints at the cause and the "Turn on internet
  downloads?" box opens as well, the way the Install buttons do it. Deck pass: with the permission off, A on Update
  shows the line and the box; A on the box's yes turns the permission on.
- **R2, opening the plugin after a reload** (Sonnet high, rig folder). After the reload tool, the open tool waits for
  the Deck's debugger to answer before its first read, as it does after a deploy; a test with a stand-in debugger
  that comes back late. Deck pass: reload with no game, then open, first try works, three times.
- **R3, the settings snapshot's buffer error** (Sonnet high, rig folder). Find the call that raised it (the evidence
  file holds the error text); fall back to the streamed copy over SSH; the result says which way was used. Deck pass:
  the snapshot tool returns the Deck's settings with no error, three times.

**Batch 2, after block 1's measurements, 3 helpers:**

- **S3, the settings page names** (Sonnet high). The brief carries block 1's table: for each of the 24 pages, what
  opened with the `steam://` link and what opened with Decky's own navigation call, by title. Use whichever way opens
  every page by name; a page Steam cannot open by name falls back to Settings' first page, and the row says so. Deck
  pass: A on "Enable Wi-Fi" opens Internet; the 24-page row passes for every page the measurement showed Steam can
  open.
- **O1, the Settings walk** (Opus high). The brief carries block 1's per-press scroll table. Rules: a landing inside
  the comfortable band moves nothing (so Left and Right inside a row never scroll); a landing outside it moves by a
  moderate step that puts the control just inside the band, not to the middle and not to the page's end; the first
  and last controls are reached without a jump; a glide is tried only if the measurement shows Steam leaves a glided
  pane alone, otherwise the instant step stands and the report says why. Tests model Steam's own scroll on focus, and
  a bounded walk with no stop twice. Deck pass: on the Deck's own screen, a Down walk of Settings and Developer moves
  the page at no more than one press in three, never more than half a screen, and Left and Right on Text size move
  the page 0 px.
- **R1, the rig's Steam button** (Opus high, rig folder). The brief carries block 1's reading of what the Deck's
  input device saw. If the press and release arrive as the Steam button and Steam still opens nothing, the cause is
  Steam's own setup for the board, and the report says what to change by hand. If the release is missing or the
  button arrives as something else, the cause is in the board's program: report it with the fix written but not
  flashed. Server-side changes only tonight.

**Landing:** one at a time with `scripts/land_lane.sh`, back end before screen changes, every log read; then the
bookkeeper moves each fixed bug to Verify naming its row. The rig-folder helpers land in that repo the same way, by
hand (its own checks), and the tool server is restarted before the next Deck block.

## 7. The Deck, in blocks

One driver at a time; a fresh driver per block; every Deck command exactly `ssh deck@192.168.86.52 '<command>'`;
evidence files `plan89-<ROW>.json` in `docs/test-evidence/`, every one stamped with the build and the machine. If a
deploy is refused: "run setup-dev". **The Deck's AI is unloaded before any game check.**

- **Block 0, setup (about 30 minutes):** confirm no other session is driving (the plan 87 chat's link is noted, call
  13); keep the Deck awake; read which screen is live (the Deck's own, or the monitor), because the Settings walk bug
  was seen on the Deck's own screen; back up the settings file and the saved chats to `~/p89-backup`; note the build
  on the Deck (its manifest says 0.5.0; plan 88's last deploy was `68317980`), deploy the tip and note its hash;
  record how Ollama runs and that no model is loaded (none was at 17:05); find or make the test chat; parental lock
  off; test chips clear; which game is on Recent Games; the baseline quick check green at the tip before any copy is
  cut. **Chore for the one running the session, in the same block:** delete the old helper copies whose work has
  landed (37 on disk, p65 to p84): the prune command misses squash landings, so match each copy's leftover commits by
  title against the branch, ignore the generated-file dirt, keep and name any copy with real unlanded work; never
  `git worktree remove` a copy (its packages folder is a link to the shared one).
- **Block 1, measurements and quick reads (about 60 minutes), in this order:**
  - **M1, the Settings and Developer walk:** D-pad Down from the tab bar to the last control and back Up, logging the
    pane's scroll position and the focused control after every press; then Down to Text size and Left, Right, Right,
    Left, logging the same. Both tabs. On the Deck's own screen if that is what is live; otherwise note the monitor.
  - **M2, the 24 settings pages:** for each page name in the card's table, open it two ways (the `steam://` link the
    plugin uses; Decky's own navigation call to `/settings/<name>` through a page script) and read the title of the
    page that opened; also A on the card's "Enable Wi-Fi" row. Row STEAM-SETTINGS-PAGES-01, one table.
  - **M3, the rig's Steam button:** with an event reader on the Deck's input device for the rig's board, press the
    Steam button through the rig three times (held 80, 150 and 400 ms) and record which events arrive and when; then
    the Steam-plus-A chord once, the same way. Findings only, into the evidence and the rig findings log.
  - **M4, two headings:** read the Settings page's text and count "UI scale" and "Screenshot quality" headings.
- **Block 2, owed checks while the helpers build (about 90 minutes), with the stand-in AI (§ 9):**
  P87-B1-SLOT-SAME-STOPS (a prepared long answer); plan64-TALL-SECTION-01 re-recorded (a prepared answer with one
  section taller than the screen, Voice replies off); P87-INJECT-CHIP (a prepared Pyro answer carrying the chip);
  the remembered-chat check (back up, move aside, reload, ask, put back).
- **Block 3, after batch 1 lands:** one deploy, then: text size on every tab (S1's pass sentence); the mic rule on
  tiny.en with the recorded sentence; the status-check log line; the delete box; Update with downloads off; the
  free-play sweep without a game. The rig's own fixes (R2, R3) are checked here too, after the tool server restarts.
- **Block 4, after batch 2 lands:** one deploy, then: the Settings walk and Text size Left/Right (O1's pass sentence);
  "Enable Wi-Fi" and the 24-page row (S3's); the Steam button again if R1 changed the server side; a second round on
  anything that failed in block 3.
- **Block 5, the game checks:** start a game with A on the Home screen's tile (the rig's launcher is broken until R1
  proves otherwise); P79-LONG-CHIPS' two open halves (200 s); SCR-10 in a real fight if the game can be put in one;
  the lever (S4's pass sentence); the free-play sweep with a game; close the game over SSH.
- **Block 6, the freeze try, last:** everything else already put back (settings, chats, voice model, chips) except
  the build; the Deck's own AI loaded, a game running, free memory driven to about 2 GB as on 2026-10-03, one
  55-second answer, then twelve minutes of reads. A freeze ends the Deck night: the maintainer restarts the Deck in
  the morning, and the report says so. No freeze: the entry stays open as "not reproduced, lever in place".
- **Block 7, the end:** a smoke test on the final build; the normal build back on; clear the pinned test chips; point
  the Ollama tab back at the Deck; release the keep-awake. The handover note says where everything stands.

## 8. The stand-in (this PC)

Steam Big Picture with Decky on this PC; Steam offline; no games; reads cost about 10 seconds each and it cannot take
screenshots, so it gets only what the Deck should not wait for: a first walk of Settings after O1 lands (gross
regressions before the Deck's turn), and the text-size walk of every tab after S1 lands. Big Picture must be the front
window for the whole run. Every file is stamped `machine: this-pc`; none of its numbers is filed as the Deck's.

## 9. Prepared setups

- **The stand-in AI** (plan 81's way, rebuilt in the scratch folder, never committed): a small program on this PC that
  answers like Ollama with fixed, scripted answers. The Deck's Ollama tab is pointed at this PC's address with "Run AI
  on this Deck" off for the check, and put back after. Answers tonight: a long answer whose Show details line sits
  behind the dock; an answer with one section taller than the screen; a Pyro answer carrying the suggestion chip.
  Every result from it says "prepared answer".
- **The pretend microphone** (plan 88's way): a null sink on the Deck, the recorded 15-second sentence played into it,
  tiny.en chosen for the mic-rule check, base.en put back after.

## 10. Paperwork, the report, and running unattended

As plan 87 § 10: the roadmap is current after every landing and every Deck pass (the bookkeeper, from result lists
the session writes, each naming its evidence); the seven entries that close on the calls move to Done in the first
bookkeeper commit, with the call named; the plan's log gets a few lines after every landing batch and every block,
committed; a 20-minute scheduled check restarts the session after a usage stop; keep-awake held on this PC and the
Deck; a question goes in § 2 with the safe choice taken; in the morning a published report leading with what only
the maintainer can do, the checks page brought up to date, the roadmap audited (Bugs and Verify against Done), the
quick check green, nothing pushed, nothing merged. Every Haiku run is logged in plan 33 § 4d.

## 11. The time

| Part | About |
|---|---|
| The Opus chat reads this plan, cuts the copies, writes the briefs | 45 minutes |
| Block 0 and block 1 | 1.5 hours |
| Batch 1 helpers, in parallel with blocks 1 and 2 | 1 to 1.5 hours, then 45 minutes to land nine |
| Block 2 | 1.5 hours, overlapping |
| Batch 2 helpers (the Settings walk may need a second Deck round) | 1.5 to 2 hours, then 30 minutes to land |
| Blocks 3 to 5 | 2.5 to 3 hours |
| Block 6, the freeze try | 45 minutes |
| Block 7, paperwork, audit, report | 1 hour |
| **Whole night** | **8 to 10 hours** |

What can stretch it: the five-hour usage window (44 percent used at 17:10, resets at 19:00), the weekly share (48
percent used, 2 days 15 hours left; a stop is accepted, call 15), a Deck that needs a hand (a frozen Steam, a refused
deploy), and the Settings walk needing a third round.

## 12. Progress log

- **2026-10-11 17:15:** planned; the questions sent to the maintainer. Nothing built, nothing pressed.
- **2026-10-11 17:45:** the fifteen calls in (D128); the plan rewritten for the Opus chat; a note added to plan 86
  about what changes under it. The plan 87 chat could not be closed from here (its Remote Control link counts as live
  work); the maintainer closes it. Nothing built, nothing pressed.
- **2026-10-11 18:00–18:30:** the Opus chat started. The tip f561c0e5 passed the quick check. Nine helpers started at
  once (the docs constant and the status-check stop on Haiku; text size, the mic rule, the AI leaving memory sooner,
  Update with downloads off, the rig's open-after-reload and its settings snapshot on Sonnet high; the delete box on
  Sonnet medium). The install link was confirmed fixed on GitHub (v0.4.9 is Latest). Usage at the start: five-hour
  window 59 percent (resets 19:00), week 50 percent. The maintainer's calls 17 and 18 (the weekly line) came in.
  Old helper copies: 23 fully landed copies deleted (the shared packages folder checked before and after, unchanged); 13 with unlanded work kept and filed as a roadmap entry at the maintainer's request.

## 13. For the builders: where the code is (checked 2026-10-11 at `4e962bd3`)

| Lane | Files |
|---|---|
| H1 | `docs/planning/10-wake-word-listening-feasibility.md` (around lines 376 and 491); search the repo for the old name |
| H2 | `src/hooks/useVoiceTranscription.ts`: the status poll's `catch` (about line 211); the fire-and-forget stop at about line 279 is the pattern; its tests beside it |
| S1 | `src/data/chatTextSize.ts` (the scale number and the root variable), `src/index.tsx` (writes it on the root), `src/components/SettingsTabChatTextSizeRow.tsx` (the row's own words say "the tabs and Settings stay the same": change them), the 81 sizes under `src/styles/`, the 197 inline `fontSize` values in 55 files under `src/components/` and `src/features/` (a grep gives the list); row heights (`minHeight`, `height`) stay |
| S2 | `src/features/voice/useVoiceAskInput.ts`: the effect at about line 232 (`if (!voiceRecording || lastVoiceText === "" || a.unifiedInput.trim() !== "") return; endDictation(true);`) and `applyTranscriptToInput` in `src/hooks/useVoiceTranscription.ts`; tests `useVoiceAskInput.test.ts` |
| S3 | `src/data/steamSettingsNavigation.ts` (the 24 `steam://open/settings/<page>` links) and its test; the settings card that calls `getSteamSettingsUrl` |
| S4 | back end: `py_modules/backend/services/ollama_service.py`, `ollama_chat_stream.py`, `ollama_ask_service.py` (keep-alive on each request), `settings_service.py` (the Unload delay setting); the game-running flag the mic already sends: `voice_rpc.py` (plan 88, `4c58623e`); screen: `src/components/SettingsTabOllamaKeepAliveSlider.tsx`, `src/components/OllamaTab.tsx` |
| O1 | `src/features/plugin-shell/useTabBodyFocusScroll.ts`, `src/utils/tabBodyScrollPlan.ts`, their tests; `src/features/plugin-shell/TabBodyFocusRoot.tsx` wires them; Steam's band is 116 px at the top and 80 at the bottom |
| F1 | `src/features/chat-slots/ChatSlotDeleteModal.tsx`, `useChatSlotDeleteConfirm.tsx`; the title appears in tests and docs too |
| F2 | `src/components/OllamaSetupStatusLine.tsx`, `OllamaWhereAiRunsSection.tsx`, `src/features/downloads/downloadNotice.tsx` (the "Turn on internet downloads?" box), `src/components/PermissionsTab.tsx` |
| R1 | rig folder `c:/Users/still/decky-plugin-studio`: `mcp-server/src/deck/pressButton.ts`, `gameSession.ts` (launch and exit), `bridge/firmware/deck_bridge/deck_bridge.ino` (GUIDE is bit 12; the trigger change of 2026-10-08 is `971556b`, the last commit there, the folder is clean) |
| R2 | rig folder: `mcp-server/src/deck/openPlugin.ts` (about line 330, the wait after a loader restart), the reload tool in `mcp-server/src/index.ts` |
| R3 | rig folder: `mcp-server/src/deck/settingsSnapshot.ts` (two 64 MB buffers at lines 175 and 235; the error came anyway), `snapshotLease.ts` |
| Evidence to read first | `docs/test-evidence/p88-DECK-RESTORED.json` (the two rig errors), `v1010-VOICE-BASE-GAME.json` and `p88-VOICE-WHOLE-GAME.json` (the Steam button), `plan87-P87-B10-TAB-SCROLL-try3.json` (the last Settings walk), `plan81-DRG-01c.json` and `audit/plan81-freeze-after-answer.md` (the freeze) |
| The Deck | reachable, Ollama answering with no model loaded, 4.8 GB free of 14.8, up 4 days; SteamOS; the rig's board is `js1` (two virtual X-Box pads beside it); the rig's board port is COM7 on this PC |
