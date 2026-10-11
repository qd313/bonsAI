# Plan 89: the bug list and the Verify list as close to empty as they can get

**Status:** PLANNED 2026-10-11, waiting on the maintainer's answers to § 2 before anything starts. The standing
way of running a night like this is [the bug-wave runbook](../agents/bug-wave-runbook.md); this page says only what
is different tonight.

## 1. The short version

- The roadmap has **16 bugs** and **23 entries waiting for a check**. Nothing has changed on the repo since plan 88
  finished earlier today (tip `8471db4c`, the copy here matches GitHub).
- **7 bugs can be fixed by helpers tonight**, four of them starting at once and three after a Deck measurement.
  **3 are bugs in the test rig itself** (a separate project), **1 is already fixed on GitHub** (the install link
  works again as of this evening), and **5 wait on a decision or on the maintainer's own hands**.
- **Of the 23 Verify entries, the rig can settle 9 tonight**, 5 more close on their tests alone if the maintainer
  says so, and **10 need the maintainer** (a real voice, a finger on the screen, their own eyes, a PIN, the right
  stick, a first install). So the floor for Verify is about 10, and the floor for Bugs is about 5 to 8, depending on
  the answers below.
- The Deck runs the whole time: measurements first, then owed checks while the helpers build, then one check per
  fix after each landing, then the game checks and the sweeps, then the Deck is put back.
- **Rough time: 7 to 9 hours** if the usage limit holds (see § 11).

## 2. What is needed from the maintainer (the safe choice is taken until answered)

1. **The model running this chat.** This chat is Fable 5.1, not Opus. The routing rule says Opus extra-high runs a
   bug night. A chat cannot switch its own model; pick Opus in the model menu before saying go, or say Fable is fine.
   *Meanwhile:* planning on Fable; nothing built.
2. **The two reload-the-plugin bugs** (Home screen in front of the game; Steam's interface gone until a restart). Both
   are developer-only: a player has no reload button. Mark them accepted and move them to the shelved list as watched
   sightings? *Meanwhile:* they stay in Bugs, untouched.
3. **The sentence that shows for a second before its spoiler cover.** Accept it (the words shown held no name; the
   name came later), or build a fix that holds streamed words back until the cover decision is made (slower answers)?
   *Meanwhile:* accepted on paper only; nothing built.
4. **Up from the answer bubble scrolls the answer first, then leaves it.** Is that fine, or should Up leave at once?
   *Meanwhile:* left as it is.
5. **Five Verify entries the Deck can never show** (the sliver, a place moved with a model only one machine has, the
   clean-up with no AI installed, a saved PC that is off, the typed follow-up's topic). May they move to Done on their
   tests alone? *Meanwhile:* they stay in Verify.
6. **The cut choice menu.** You chose a hand check on 2026-10-03. A prepared answer passed on the Deck since, and the
   real AI never reaches a menu before the wall. May the prepared pass plus its tests close it? *Meanwhile:* stays.
7. **The search-list trap** (Down could not get past the answer after picking a setting). Ten routes have not
   reproduced it since the nearby fixes. Close it as "not seen again; reopen if it comes back"? *Meanwhile:* stays.
8. **The frozen Steam after an answer with a game and the Deck's own AI** (seen once). A reproduction try means
   driving the Deck to under 1 GB free with a game and the Deck's AI; if it freezes, the Deck needs a restart and the
   night's Deck work ends there. Try it tonight, or leave it? One lever the plugin owns: let the Deck's AI leave memory
   sooner while a game runs (about a minute after an answer instead of five). Build that? *Meanwhile:* no try, no lever.
9. **The three test-rig bugs** (the Steam button no longer opens Steam's menu, so the rig cannot start or close a
   game; opening the plugin fails once or twice after a reload; the settings snapshot failed once). These live in the
   rig's own project, not in bonsAI. May a helper work in that project's folder tonight (code and server side only,
   never reflashing the board)? *Meanwhile:* the Deck block measures what the Deck receives when the rig presses the
   Steam button, and the findings log gets the result; games are started with A on the Home screen's tile and closed
   over SSH, as on the last two nights.
10. **tiny.en.** Your note on the checks page: "tiny.en is still bad, base.en is much better. We may need to deprecate
    tiny.en." base.en is the default since plan 88 and the whole-recording read passed with a game. Take tiny.en out of
    the list? *Meanwhile:* it stays; a helper fixes the one guessed cause of the 3-to-4-second stop (see § 3), and the
    real-voice check stays yours.
11. **Two one-star features you asked for on 2026-10-10** (the delete box's title and buttons; Update with downloads
    off showing both the failed line and the box). They are not bugs, but each is under an hour. Include them tonight?
    *Meanwhile:* not included.
12. **The saved chats on the Deck.** One Verify entry (a remembered chat that no longer exists) can only be shown by
    moving the Deck's saved chats aside for a minute and putting them back, with a backup taken first. OK?
    *Meanwhile:* not done; that entry stays.
13. **An idle chat still holds a link to the Deck** ("Features, bugs, and test machines", the plan 87 chat). It is not
    running, so it will not press anything, but the rig's readiness check flags it. Closing that chat clears it.
    *Meanwhile:* the check is run without that one condition.
14. **The old helper copies of the repo.** 37 are still on disk (p65 to p84). Delete the ones whose work has landed?
    *Meanwhile:* left alone; the copies cut tonight are deleted at the end only if you say so.
15. **The usage limit.** The week is at 48 percent with 2 days 15 hours left and extra usage is off. A night like plan
    87 used a good part of a week's share. If the weekly cap hits, every helper stops and the session resumes when it
    resets (Wednesday morning). Fine, or turn on extra usage first?

## 3. The bugs, and what happens to each

| Bug | Stars | Tonight | Who |
|---|---|---|---|
| The wake-word study names a constant that no longer exists | ★ | Fixed: a wording change, with a search for every mention | Haiku high |
| A failed status check leaves the recording running | ★ | Fixed: on that error the screen also tells the back end to stop (the same call the clear path already makes); a test that fails first | Haiku high |
| "Enable Wi-Fi" opens Steam's System page, not Internet | ★ | Measured first (Deck block 1 opens all 24 pages two ways and reads what opens), then fixed with the page names Steam really answers to | Sonnet high, after the measurement |
| New users cannot install bonsAI (the README link) | ★ | **Already fixed on GitHub**: v0.4.9 is marked Latest as of this evening (`gh release list`, 2026-10-11 17:15). The script half landed in plan 87. Moves to Done | bookkeeper |
| A plugin reload can put the Home screen in front of the game | ★ | Your call (§ 2, 2) | — |
| The start of a sentence shows for a second before its cover | ★ | Your call (§ 2, 3) | — |
| Opening the plugin with the rig fails after a reload | ★ | Rig bug; your call (§ 2, 9) | — |
| The rig's settings snapshot failed once | ★ | Rig bug; your call (§ 2, 9) | — |
| Left or Right on Text size scrolls the page | ★★ | Cause found in the code: the Settings tab moves the pane a little on **every** landing of the ring, even a sideways one inside a row. Measured in block 1, then fixed with the next entry | Opus high, after the measurement |
| Walking Settings and Developer moves the page at every press, then jumps at the end | ★★ | Same cause: the plan moves the pane ahead of time at each press and sends the last control to the very bottom. New rule: move only when the control would leave the comfortable band, by a moderate step, never a page-sized jump at the end; a glide is tried and measured, and reported as not possible if Steam scrolls on top of it | Opus high, after the measurement |
| Up from the answer bubble scrolls the answer instead of moving | ★★ | Your call (§ 2, 4) | — |
| Reloading under a heavy game can leave Steam's interface gone | ★★ | Your call (§ 2, 2) | — |
| The rig's Steam-button press no longer opens Steam's menu | ★★ | Measured in block 1 (what the Deck's input device sees when the rig presses it); a fix only with your OK (§ 2, 9) | — |
| A faded ghost of the tab bar after a touch | ★★ | Needs a finger with a game running; yours. The strip that could ghost is gone from the code | you |
| Text size changes only the chat's words; wanted: all the text | ★★ | Built as you picked (option B): every word on every tab scales, rows keep their heights. 197 inline sizes in 55 files plus 81 in the stylesheets go through one scale number | Sonnet high |
| Steam's screen froze after an answer with a game and the Deck's AI | ★★★ | Your call (§ 2, 8) | — |
| The mic stops after 3 or 4 seconds of speech (tiny.en, real voice) | ★★★ | The one guessed cause is fixed: the "box was emptied, so dictation is over" rule can fire on a transient when the live words and the box are written in two steps; it now ignores an emptiness that the mic's own write explains. A test that fails first. **Stays in Verify for your real voice**; and your call on tiny.en (§ 2, 10) | Sonnet high |

## 4. Verify: who can close each entry tonight

| Entry | Who | How |
|---|---|---|
| Parental-lock half of the stale return note | you | needs your PIN |
| Down onto the slot's line, "same stops both ways"; and the slot swap fix | rig | row P87-B1-SLOT-SAME-STOPS with a prepared long answer whose own Show details line sits behind the dock |
| Up can land on a tall section with a sliver showing | you (§ 2, 5) | tests only |
| A place move wiped the other machine's saved names | you (§ 2, 5) | tests only, two unclear tries |
| The clean-up with no Ollama on the Deck | you (§ 2, 5) | tests only |
| Removing a model with a silent saved PC | you (§ 2, 5) | tests only |
| A remembered chat that no longer exists | rig, with your OK (§ 2, 12) | move the saved chats aside, reload, ask; a new chat must be made; put the chats back |
| A typed follow-up shows the AI the reminder's words | you (§ 2, 5) | tests only |
| "UI scale" said twice | rig | read the Settings page's words: one heading |
| "Screenshot quality" said twice | rig | same read |
| The help chip after the quick start (Deck half) | you | your first-install check; the Deck's data is never wiped by a session |
| The cut choice menu | you (§ 2, 6) | prepared pass exists |
| Doubled words | you | real microphone |
| Stop, then the mic again | you | real voice |
| Voice replies "when I asked by voice" | you | real voice |
| The AI's own suggestion chip by D-pad | rig | row P87-INJECT-CHIP with a prepared Pyro answer that carries the chip |
| The search-list trap | you (§ 2, 7) | not reproduced in ten routes |
| Re-record the tall-section walk | rig | a prepared answer with a section taller than the screen, Voice replies off |
| Every Steam settings page the card can open | rig | block 1, all 24 |
| Long chips: a short chip's centring, "the other chip changes" | rig | 200 s watch, with a game if one can be started |
| Chips look (rows 01 and 05, the help and agent chips, the chip pace pick) | you | your eyes |
| Scramble look and the game's frame-rate verdict | you | your eyes |
| Frame rate: your eye, and a run in a real fight | you + rig | the rig tries a real fight (row SCR-10) if a game can be started; the look is yours |
| Calmer rating choices: the look | you | your eyes |
| The Show details slot, steps 3 and 4 | you | the right stick, which the rig does not have |
| Kids master lock | you | a locked account |

Every Main-tab change tonight (the text size) also owes the free-play sweep, with and without a game.

## 5. Who does what

| Work | Model and effort | At once |
|---|---|---|
| Running the session: briefs, reviews, landing, Deck runbooks, reading failures | this chat (Opus extra-high is the rule; see § 2, 1) | 1 |
| Mechanical one-star fixes (the docs constant, the status-check stop) | Haiku 5.5 high (`bugfix-lane-haiku-high`), logged in plan 33 § 4d | 2 |
| Fixes with a choice (the settings page names, text size everywhere, the mic rule) | Sonnet 5.5 high (`bugfix-lane`) | 3 |
| The Settings walk and the sideways scroll (focus work, measurement in hand) | Opus 5.5 high (`bugfix-lane-opus-high`) | 1 |
| The rig's Steam button, if allowed | Opus 5.5 medium, in the rig's own folder | 1 |
| Bookkeeping | the bookkeeper, Sonnet 5.5 medium; every status names its evidence | 1 |
| Deck checks | the `deck-driver`, Sonnet 5.5 medium, a fresh one per block | 1 on the Deck, 1 on the stand-in |

Rules as in plan 87 § 5: helpers run only the tests for what they touched; the full suites run at landing. Before
every new batch, read the app's usage figure; start nothing new past 60 percent of the week or 75 percent of the
five-hour window. Notifications: one after each landing batch, one when truly blocked, one for the report.

## 6. The lanes

Every brief carries what the runbook asks for: the tip hash and the base check, "run the baseline checks now, without
an install", the owned files, one fix per commit with the failing test first, the sentence that says what a pass
looks like on the Deck, the five gates and the quick check before every commit, a scratch folder of its own,
`git -C <copy>` instead of `cd`, never `git stash`.

**Batch 1, starts at once (no measurement needed):**

- **H1, the docs constant** (Haiku high). Owns `docs/planning/10-wake-word-listening-feasibility.md`. Search the whole
  repo for the old name first; reword every mention. No Deck check.
- **H2, the status-check stop** (Haiku high). Owns `src/hooks/useVoiceTranscription.ts` and its test. On the error
  path of the status poll, also fire the stop call, best effort, the way the clear path does. Test: a poll that
  throws leads to one stop call. Deck: a log line only; no row.
- **S1, text size everywhere** (Sonnet high). Owns `src/data/chatTextSize.ts`, the stylesheet files under
  `src/styles/`, and the inline font sizes in the tab and chip components (a code map is in the brief). One scale
  number on the plugin's root; every word on every tab reads it; rows and buttons keep their heights; Normal is
  exactly today's size. Deck pass: on Large, the tab bar name, the chat's name, a chip, the question box and a
  Settings label all measure bigger than on Normal, and no row is taller; on Small, smaller. A test per surface.
- **S2, the mic rule** (Sonnet high). Owns `src/features/voice/useVoiceAskInput.ts` and its tests. The "emptied box
  ends dictation" rule must not fire when the box's emptiness is the mic's own in-between state. Test: the live
  words and the box written in two steps never end dictation; the X still does. Deck: a recorded sentence on tiny.en
  must grow to the end (as it already does); the real voice is the maintainer's.

**Batch 2, after Deck block 1's measurements:**

- **S3, the settings page names** (Sonnet high). Owns `src/data/steamSettingsNavigation.ts` and its test. The brief
  carries block 1's table: for each of the 24 pages, what opened with the `steam://` link and what opened with
  Decky's own navigation call, by title. Use whichever way opens every page by name; a page Steam cannot open by name
  falls back to Settings' first page and the row says so. Deck pass: A on "Enable Wi-Fi" opens Internet; the 24-page
  row passes for every page the measurement showed Steam can open.
- **O1, the Settings walk** (Opus high). Owns `src/features/plugin-shell/useTabBodyFocusScroll.ts`,
  `src/utils/tabBodyScrollPlan.ts` and their tests. The brief carries block 1's per-press scroll table. Rules: a
  landing inside the comfortable band moves nothing (so Left and Right inside a row never scroll); a landing outside
  it moves by a moderate step that puts the control just inside the band, not to the middle and not to the page's
  end; the first and last controls are reached without a jump; a glide is tried only if the measurement shows Steam
  leaves a glided pane alone, otherwise the brief's instant step stands and the report says why. Tests model Steam's
  own scroll on focus, and a bounded walk with no stop twice. Deck pass: on the Deck's own screen, a Down walk of
  Settings and Developer moves the page at no more than one press in three, never more than half a screen, and Left
  and Right on Text size move the page 0 px.
- **R1, the rig's Steam button** (Opus medium, only with § 2, 9 answered yes). In the rig's folder. The brief carries
  block 1's reading of what the Deck's input device saw. Server or firmware-source changes only; no reflash tonight.

**Landing:** one at a time with `scripts/land_lane.sh`, back end before screen changes, every log read; then the
bookkeeper moves each fixed bug to Verify naming its row.

## 7. The Deck, in blocks

One driver at a time; a fresh driver per block; every Deck command exactly `ssh deck@192.168.86.52 '<command>'`;
evidence files `plan89-<ROW>.json`, every one stamped with the build and the machine. Evidence stays in
`docs/test-evidence/`. If a deploy is refused: "run setup-dev".

- **Block 0, setup (about 30 minutes):** confirm no other session is driving (the idle chat's link is noted, § 2, 13);
  keep the Deck awake; read which screen is live (the Deck's own, or the monitor), because the Settings walk bug was
  seen on the Deck's own screen; back up the settings file and the saved chats to `~/p89-backup`; note the build on
  the Deck (plugin.json says 0.5.0; deploy the tip and note its hash); record how Ollama runs and that no model is
  loaded (none is, as of 17:05); find or make the test chat; parental lock off; test chips clear; which game is on
  Recent Games; the baseline quick check green at the tip before any copy is cut.
- **Block 1, measurements and quick reads (about 60 minutes), in this order:**
  - **M1, the Settings and Developer walk:** D-pad Down from the tab bar to the last control and back Up, logging the
    pane's scroll position and the focused control after every press; then Down to Text size and Left, Right, Right,
    Left, logging the same. Both tabs. On the Deck's own screen if that is what is live; otherwise note the monitor.
  - **M2, the 24 settings pages:** for each page name in the card's table, open it two ways (the `steam://` link the
    plugin uses; Decky's own navigation call to `/settings/<name>` through a page script) and read the title of the
    page that opened; also A on the card's "Enable Wi-Fi" row. Row STEAM-SETTINGS-PAGES-01, one table.
  - **M3, the rig's Steam button:** with an event reader on the Deck's input device for the rig's board, press the Steam
    button through the rig three times (held 80, 150 and 400 ms) and record which events arrive and when; then the
    Steam-plus-A chord once, the same way. Findings only.
  - **M4, two headings:** read the Settings page's text and count "UI scale" and "Screenshot quality" headings.
- **Block 2, owed checks while the helpers build (about 90 minutes), with the stand-in AI (§ 9):**
  P87-B1-SLOT-SAME-STOPS (a prepared long answer); plan64-TALL-SECTION-01 re-recorded (a prepared answer with one
  section taller than the screen, Voice replies off); P87-INJECT-CHIP (a prepared Pyro answer carrying the chip);
  the remembered-chat check if allowed (§ 2, 12).
- **Block 3, after batch 1 lands:** one deploy, then: text size on every tab (S1's pass sentence); the mic rule on
  tiny.en with the recorded sentence; the status-check log line; the free-play sweep without a game.
- **Block 4, after batch 2 lands:** one deploy, then: the Settings walk and Text size Left/Right (O1's pass sentence);
  "Enable Wi-Fi" and the 24-page row (S3's); a second round on anything that failed in block 3.
- **Block 5, the game checks:** start a game with A on the Home screen's tile (the rig's launcher is broken); unload
  the Deck's AI first; P79-LONG-CHIPS' two open halves (200 s); SCR-10 in a real fight if the game can be put in one;
  the free-play sweep with a game; close the game over SSH.
- **Block 6, the end:** a smoke test on the final build; put back the settings, the chats, the voice model, the
  normal build; clear the pinned test chips; point the Ollama tab back at the Deck; release the keep-awake. The
  handover note says where everything stands.

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
the session writes, each naming its evidence); the plan's log gets a few lines after every landing batch and every
block, committed; a 20-minute scheduled check restarts the session after a usage stop; keep-awake held on this PC and
the Deck; a question goes in § 2 with the safe choice taken; in the morning a published report leading with what only
the maintainer can do, the checks page brought up to date, the roadmap audited (Bugs and Verify against Done), the
quick check green, nothing pushed, nothing merged.

## 11. The time

| Part | About |
|---|---|
| Block 0 and block 1 | 1.5 hours |
| Batch 1 helpers, in parallel with block 1 and 2 | 1 to 1.5 hours, then 30 minutes to land |
| Block 2 | 1.5 hours, overlapping |
| Batch 2 helpers (the Settings walk may need a second Deck round) | 1.5 to 2 hours, then 30 minutes to land |
| Blocks 3 to 6 | 2.5 to 3 hours |
| Paperwork, audit, report | 45 minutes |
| **Whole night** | **7 to 9 hours** |

What can stretch it: the five-hour usage window (44 percent used at 17:10, resets at 19:00), the weekly share (48
percent used; § 2, 15), a Deck that needs a hand (a frozen Steam, a refused deploy), and the Settings walk needing a
third round.

## 12. Progress log

- **2026-10-11 17:15:** planned; the questions in § 2 sent to the maintainer. Nothing built, nothing pressed.
