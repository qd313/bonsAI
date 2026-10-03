# Plan 81 — the final bug session: both lists as close to zero as they honestly get

**Status: RUNNING since 2026-10-03 about 16:15. Progress is in the Log at the end.**

Asked for by the maintainer: one last bug-fixing session before 0.6.0. Get the Bugs list and the Verify list as close
to zero as possible, with helpers working side by side and the Deck never sitting idle. A bug is not called fixed
unless it is fixed. A check is not called passed unless the Deck showed it.

How a bug session runs is already written down in [the runbook](../agents/bug-wave-runbook.md). This plan says only
what is particular to this session.

## The short version

- **27 bugs today** (20 in the roadmap, 7 in the knowledge base file). **25 entries in Verify** (11 fixed bugs, 12 built
  features, 2 knowledge base checks).
- **Ten helpers start at Go,** each on a bug that needs no new measurement. At the same minute the Deck starts
  measuring for the D-pad and layout bugs, because those have failed every time a fix was written before a
  measurement.
- **While the helpers build, the Deck works through the owed checks in Verify** that do not depend on tonight's fixes.
- **After the fixes land:** one new build, one Deck check per fix, second rounds, a walk of the Main tab with and
  without a game, and everything put back.
- **Last of all:** the look into what a plugin reload does under a running game. It is last because it can freeze
  Steam.

## Your calls for this session (2026-10-03)

To be written into the locked decisions file as the next free number at Go (D124 if nothing has taken it; check the
tail first).

1. **Scope: everything, each fix gated.** Every bug on the list is in, the risky ones included, although none of
   them crosses the release line. A fix stays in only if its Deck check passes. The release waits for this session's
   clean Deck pass.
2. **Checks whose case has never come up on the Deck:** one more try with a prepared setup, so the case must happen.
   What still cannot be shown stays in Verify, marked "tests only". Nothing is moved to Done on its tests alone.
3. **The Deck may be changed for a check, and put back afterwards,** in these four ways: download a second small AI
   model (about 2 GB, removed afterwards); point the Deck at this PC's AI; move bonsAI's saved data aside (never
   deleted); move the game notes library aside (never deleted).
4. **The summary card behind the dock gets one more try,** on an Opus helper, after a fresh Deck measurement. It
   lands only if the Deck shows the card in view. If it fails again it stays accepted and keeps its release-notes
   line.
5. **The walk check's false alarm is fixed in the Deck tools project itself.** One small change, committed there,
   not pushed.
6. **The two reload-under-a-game bugs are looked into on the Deck,** not just marked accepted.
7. **Three waiting calls are built:** the AI's hidden-block instructions are reworded (kept only if the count of
   spoiler covers does not drop); a long chip leaves about 1.5 seconds after its words stop; the try-order clean-up
   also covers a PC.
8. **Not built: holding a sentence back until its cover is known.** That bug stays open (see "For your attention",
   item 4).
9. **Models:** Opus high runs the session. Helpers are Sonnet medium for mechanical work and Sonnet high for anything
   that needs a judgment. Two jobs go to an Opus helper (below).
10. **New bugs found on the way** go on the roadmap and into the report, and each gets a real try at a fix in this
    session.

Already decided this morning (D123) and followed here: the cut choice menu waits for a check by hand; "Up from the
answer bubble" stays until the maintainer checks it by hand.

## The honest forecast

**Bugs, 27 today.**

| How it is likely to end | About how many |
|---|---|
| Fixed, and shown on the Deck | 9 to 11 |
| Fixed, but the proof is uncertain (the case is hard to make, or the measure may not move) | 5 to 7 |
| A Deck look decides: fixed, closed as "not a bug, checked", or moved to the watch list | 3 |
| Cannot reach "fixed" by its nature | 6 to 7 |

The last row: four knowledge base entries the maintainer accepted; "Up from the answer bubble", which waits for the
maintainer's hand check; the sentence start showing for a second, which was not picked; and the doubled marks, if the
hunt shows the AI itself writes them.

**Verify, 25 today.** The rig can close about 10 to 12. About 10 can only be closed by the maintainer (voice, PIN,
right stick, eye). Tonight's fixes add about 12 new entries, and most of those are checked the same night. So Verify
ends at roughly 12 to 15, nearly all waiting on the maintainer. **About an hour and a half of the maintainer's own
checks would close more entries than the rig can.**

## What to focus on first

1. **Deck measurements, from minute one.** Last session, four D-pad fixes passed every test and failed on the Deck,
   until each second round was built from what the Deck measured.
2. **The bugs a player would notice:** B on the "Clear all plugin data?" box throws the panel back to the Main tab;
   five controls with a weak or missing ring; walking Up onto a tall answer section and seeing only its top third; a
   long chip that outstays its words.
3. **The checks that have waited longest,** now that the Deck may be changed for them: the help chip on a first
   run, the try order with two models and with the AI on a PC, the cut choice menu, the checklist after a reopen.

## The sort: every bug, and what happens to it

**Start at Go, side by side (no new measurement needed)**

| | Bug, as a player would see it | Helper | A pass on the Deck |
|---|---|---|---|
| A | B on the "Clear all plugin data?" box also leaves the Settings tab | Sonnet high | Three times: the box closes, Settings is still showing, the ring is back on the button, nothing is cleared |
| B | Five controls show a thin grey frame or no ring (accent intensity, "Reinstall voice engine", two voice model rows, the Steam key field) | Sonnet high | The same white ring on every stop of the Settings and Developer tabs. The key field is read by its style, never by a screenshot |
| C | Removing a model on the Deck also drops it from a PC's saved try order; and the clean-up should cover a PC (call 7) | Sonnet high | With the Deck pointed at the PC: remove a model on the Deck, the PC's order is unchanged; remove one on the PC, it leaves the order |
| D | The old, unused live-line trimming code is still in the project | Sonnet medium | No Deck check of its own; the end-of-session smoke test covers it |
| E | A long chip stays 3 to 10 seconds after its words stop (call 7) | Sonnet high | Over 200 seconds a long chip leaves about 1.5 seconds after its words stop; a chip under the ring never changes; a short chip's words are centred |
| F | The AI's instructions show the hidden-block label in the odd shape a small model copies (call 7) | Sonnet high | The count of spoiler covers over the same story questions is not lower after than before, first on this PC with the Deck's model, then on the Deck; no label shows as text |
| G | Knowledge base: a game's own tip is found only by its own words ("the words look blurry" misses the tip "the text looks blurry" finds) | Sonnet high (knowledge base helper) | With the game running, the reworded question attaches the Render Scale tip; the boss question still attaches the boss note and not the tip. On this PC the troubleshooting test questions lose nothing |
| H | Knowledge base: questions with no real answer still get notes about the wrong subject; Black Mesa's water question names two unrelated notes first | Sonnet high (knowledge base helper) | Measured on this PC first: the answer test must not drop. Then the same questions on the Deck. One round of about an hour each; "measured, and it did not help" is an acceptable result and the entry stays open |
| I | Some saved answers have a hidden block's marks written twice, cause unknown | **Opus high helper** | A hunt, read-only at first: find a saved example and whether the AI's own raw words already held the doubled marks. No Deck check unless a cause in the plugin is found |
| J | The walk check calls a stop hidden when a corner icon only touches its box (the Deck tools project, call 5) | Sonnet high, working in the tools project | The question row and the last answer section read fully visible; a stop that really is hidden still reads hidden, proven by breaking it once |

**One after another: the same spot in the code**

| | Bug | Helper | A pass on the Deck |
|---|---|---|---|
| K1 | The test setup does not know that Steam's own scroll keeps a top margin (starts at Go) | Sonnet high | Not a Deck check: the test setup gives the same landing the Deck measured (a cover placed at 104 ends at 204) |
| K2 | Walking Up onto a tall section shows only a sliver, or only its top third (two entries) | the same helper, after block 1's measurement | Going Up onto a section taller than the screen, its last lines sit just above the dock, and at least as much shows as on the Down walk |
| K3 | The step that lifts a control clear of the dock moves it about 80 px too far | the same helper, after K2 lands | The choices and "Helpful" land just above the dock; every landing under an answer is measured again and none is hidden |
| L | The chat summary card sits behind the dock until Down is pressed (call 4) | **Opus high helper**, after K3 lands and after its own measurement | After "Sum up", the card is in view above the dock without a press |

K1 to K3 are one helper, so it keeps what it learned. Whoever runs the session reads every one of its changes before
landing. It is the first to move to an Opus helper if a round fails on the Deck twice.

**A Deck look first, then decide**

| Bug | The look | Then |
|---|---|---|
| The ring may not be claimed after a switch between Quick Access tabs | Switch away and back five times; read what holds the ring each time | Missing: a Sonnet high helper, with the measurement. There five of five: closed as "checked, not a bug", with the evidence named |
| An underlined word's tooltip can cover the word itself | With a game running, walk Down over underlined words in five answers | Seen: a helper, with the measurement. Not seen: moved to the watch list, not to Done |
| A ghost of the tab bar after touching the screen | One try with a pretend touch sent through the debug link | Seen: measure, then a helper. Not seen: it stays the maintainer's finger check |
| Reloading the plugin under a running game (two entries, call 6) | The very last Deck block, below | What is found decides: a real bug a player can reach, or a developer-only rule |

**Not touched by this session**

| Bug | Why |
|---|---|
| Up from the answer bubble scrolls the whole answer | Waits for the maintainer's hand check (D123) |
| The start of a sentence shows for a second before its cover | Not picked (call 8). The Deck check for F reads the live text anyway, so the session records whether it still happens |
| Four knowledge base entries marked accepted | The maintainer chose to live with each one |
| "Focus ring styling is inconsistent" | Not a fix of its own. After B lands, a ring walk of every tab decides: the same ring on every bonsAI control closes it; anything else and it stays |

## Helper levels

- **Sonnet medium:** the unused-code removal, the bookkeeper and the Deck helper. Earlier sessions already took the
  other easy ones.
- **Sonnet high:** everything else, because each one needs a judgment (timing, where a ring goes, what the AI is
  told, how the search ranks).
- **Opus high helper, two jobs:** the summary card (three failures on the Deck, which is the house rule for moving
  up) and the doubled-marks hunt (two sessions have not found the cause).
- **The rule for the rest:** a fix moves up one level only after it has failed on the Deck twice, with the
  measurement in hand.

## Who runs side by side

**At Go, ten:** A, B, C, E, F, G, H, I, J and K1. **D** (the mechanical one) takes the first free slot.

**As measurements arrive:** K2, then K3, then L. Helpers for the three "look first" bugs, if the Deck shows them.

**What cannot run side by side**

- K1, K2, K3 and L all touch where a landing is placed. One at a time, in that order.
- A and B both touch the Settings tab. A lands first; B is read against it.
- G and H both touch the knowledge base search. G owns the tip search, H the note search. If one needs the other's
  file, it stops and reports.
- The bookkeeper never commits while a landing runs.

## The Deck plan

**Standing rules for the Deck helper** (from earlier sessions): read what has the highlight before every A; never A
as the last press of a run; questions only in the named test chat; a new build goes on only with no game running;
never reload the plugin under a running game, except in the last block below; every command is exactly
`ssh deck@<address> '<command>'`; one evidence file per check, named `plan81-<ROW>.json`; never screenshot the
Developer tab's Steam key field.

**Block 0, setup.** Check no other session is driving. Keep the Deck awake. Note which screen is live. Save copies of
the settings, the chats and the game notes library. Confirm the build. Check the parental lock is off. Note the
installed AI models and which games are on Recent Games. Send one press and confirm the Deck saw it. Find or make the
test chat.

**Block 1, measurements for tonight's fixes.**

| For | What is measured |
|---|---|
| K2 | Up onto a tall section, with and without a game: how much of it shows, and where its edges are against the dock |
| K3 | Every landing under an answer (choices, "Helpful", the speaker): where it lands against the dock |
| L | After "Sum up": where the card is, what holds the ring, what one Down does |
| A | The route as filed: what B does on the box, where the ring goes |
| The three "look first" bugs | As in the table above |

**Block 2, owed checks that do not depend on tonight's fixes** (while the helpers build)

| Owed check | How the rig can now do it |
|---|---|
| Icons on the knowledge base buttons | As written |
| The ring when the settings list closes under it | As written |
| A power question's answer holds a number | Two differently worded questions |
| Doubled words in a spoken question | Recorded sound, the same sentence five times. The real microphone stays the maintainer's |
| A spoken question's answer reads itself aloud | Recorded sound: does reading start. The ear stays the maintainer's |
| The try order in the AI models box | A second small model is downloaded: move a place up and down. Then the Deck is pointed at this PC for the PC half. Then "Skipped: too big" |
| The help chip after the quick start | bonsAI's saved data moved aside, so the Deck is a first run: open the quick start, close it, the help chip is gone and stays gone. Data put back |
| Dismissing the troubleshooting hint | First find, from the code, what makes the hint show; then make it show |
| Summing up offers a fresher title: Rename, and the button route | A prepared long chat with a stale title |
| The summary's Game line, in a chat opened in a game | A prepared chat opened in a game |
| The cut choice menu; the checklist after a reopen; "Spoilers are okay" on a live answer | **The prepared setup (call 2):** a stand-in for the AI on this PC that replies with a fixed, prepared answer, so the case must happen. The evidence says plainly that the answer was prepared |
| The three chat rows that failed on 18 September | Run again once, as written |
| Boss tactics with no library (the row that needed the library aside) | Library moved aside, the check run, library put back |
| The spoiler box for a game known only by name | Only if one of its four games is on Recent Games (see "Before you leave") |
| A question that attaches no note | Try five questions far from any note |

**When the Deck would otherwise sit idle:** the older open rows in the test documents, oldest first. Lowest priority;
they stop the moment a fix is ready to check.

**Block 3, after the landings.** One build goes on, then one check per fix, as in the "A pass on the Deck" columns
above. Whoever runs the session sets the exact numbers from block 1's measurements before the check is run.

**Block 4, second rounds.** Anything that failed runs again after its second fix. Then the walk of the Main tab that
every Main-tab change owes, with a game and without, every stop visible.

**Block 5, the end.** A smoke test on the final build. Then everything is put back: settings, chats, the library, the
Deck's own AI address, the second model removed, test chips cleared, no game running.

**Block 6, the reload look (call 6), dead last.** By now the Deck is already back as it was, so a freeze costs nothing
else.

- What it asks: can a player reach this, or only a developer?
- The route a player has first (Decky's own way of reloading or updating a plugin), with a game running. Then the
  rig's developer reload, with plenty of free memory. Only if both came back clean, once more with a heavy game and
  little free memory.
- Measured each time: is the game's window back in front; does the Quick Access page come back within a minute; how
  much memory is free.
- **The stop rule:** the first freeze ends it. The session records what it sees, tries Steam's own restart, then a
  restart of the Deck. It never types a password. If a password is asked for, the maintainer gets a phone
  notification and the session waits.
- If a player can reach it, it is a release-line bug (it traps them) and the maintainer hears at once.

**What the rig cannot do, so these stay the maintainer's:** speak into the microphone; type a PIN; use the right
stick or the touch screen; judge a look or a sound; play a real fight.

## Verify: who can close each entry

| Entry | Who | How |
|---|---|---|
| Stale "return the ring" note with the parental lock on | Maintainer | Needs the PIN |
| Dismissing the hint puts the ring on the slot | Rig | Block 2 |
| The chat summary reads oddly (the in-a-game half) | Rig | Block 2, prepared chat |
| The cut choice menu | Rig, prepared answer; else the maintainer's hand check (D123) | Block 2 |
| A spoken question's answer reads itself | Rig for "does it start"; maintainer's voice and ear to close | Block 2 |
| The checklist after a reopen | Rig, prepared answer | Block 2 |
| The help chip after the quick start | Rig | Block 2, saved data aside |
| The ring when the settings list closes | Rig | Block 2 |
| A power answer holds a number | Rig | Block 2 |
| Doubled words | Rig with recorded sound; the maintainer's microphone to close | Block 2 |
| The trap after picking a setting | Maintainer | Daily use; it has never reproduced |
| Icons on the knowledge base buttons | Rig | Block 2 |
| Chips look like chips | Maintainer | A look |
| The scramble | Maintainer | A look, and a verdict on the measured frame rate |
| The answer's frame rate | Maintainer | A look, and a real fight |
| Kids master lock | Maintainer | Needs the PIN |
| The tab strip | Maintainer | A look |
| Named chat slots | Rig | Block 2, the three failed rows once more |
| A fresher title | Rig | Block 2, prepared chat |
| Calmer rating choices | Maintainer | A look (the rig measures the colours against the drawing) |
| The models fold | Rig | Block 2, second model and the PC half |
| The Show details line in the chip's place | Maintainer | Needs the right stick |
| Long chips | Rig | Block 3, after fix E |
| Spoiler box for a game known by name | Rig, if the game is on Recent Games | Block 2 |
| The note's own words under the reply | Rig for one row; maintainer's ear for one; one waits for a call | Block 2 |

## New bugs and new checks found on the way

- Every new bug goes on the roadmap and into the report the moment it is found.
- Each gets one helper round of about an hour in this session. One that traps a player, loses chats or settings, or
  shows a spoiler is worked on until it is fixed or the session ends.
- What is not fixed stays on the roadmap as open, with what was tried.
- A new thing to check goes into Verify with the name of its check, and onto the maintainer's checks page if only
  they can do it.

## Keeping the roadmap current

After every landing, the fixed bug moves from Bugs to Verify, naming the check it owes. After every Deck block, a
pass moves to Done with its evidence file, and a failure goes back to Bugs with what was seen. The test documents
change in the same commit. Knowledge base entries move the same way inside the knowledge base file.

The bookkeeper does the typing, from result lists copied from the evidence files' own words. Whoever runs the
session checks each of its commits against the evidence. This plan's log gets a few lines after every landing and
every Deck block, and is committed, so a look from a phone shows where things stand.

## Running while you are away

- **Questions** go in the list below, with the safest choice taken meanwhile. A phone notification only when
  something is truly blocked.
- **If the build cannot be put on the Deck,** the notification says "run setup-dev". It is a five-second fix.
- **The usage allowance.** A timed check wakes the session every 20 minutes and restarts it after a reset. Helpers
  are resumed by message. A message from you ("continue") also wakes it.
- **If the Deck freezes:** record, restart Steam, then restart the Deck. Never a password.
- **Never:** push, merge to main, switch branches in the shared folder, stage everything, type a PIN or password,
  press anything on the Deck outside a written check.

## For your attention

1. **The release now waits for this session.** Your first-install check should be done after it, on its final
   build, because this session changes the plugin again.
2. **The reload look can freeze Steam.** It is the last thing done, after the Deck is put back. A restart of the Deck
   may ask for a password; you would get a notification.
3. **Two of your picks change what a player sees or what the AI is told, days before a release:** the reworded
   instructions and the chip's pause. Both are gated: the rewording is kept only if covers do not drop.
4. **The sentence that shows for a second before its cover stays an open bug,** because holding it back was not
   picked. Say "accept it" and it is marked as accepted instead.
5. **Neither list will reach zero.** The forecast above says why. The report will list every entry left and what it
   waits on.
6. **Knowledge base fixes that change notes or tips reach players only when you publish the library.** The Deck gets
   its own copy for the check.
7. **The tools fix may need the tools server started again** before a Deck walk can use it, and that may only
   happen in a new chat. If so, its Deck proof is owed and it says so.
8. **A prepared answer proves how the plugin handles that answer,** not that the real AI will ever write it. Every
   such evidence file says the answer was prepared.
9. **Opus high is your pick.** The house table asks for extra-high for whoever lands D-pad work. The guard against
   that gap is the same as before: every D-pad change is read before landing and must pass on the Deck.
10. **Expect one stop for the usage allowance,** with ten Sonnet high helpers and two Opus helpers. The timed check
    restarts the session.
11. **About 117 old helper copies of the repo are on disk,** and about 14 more after this. They wait for your word.
12. **Pull before Go.** While this plan was written the local copy was seven commits behind the cloud. The chat that
    runs this plan checks that first.

## Before you leave: things only you can do

1. **Start one of these once, then close it,** so it is on Recent Games: Doom 64, Super Mario 64, Mario Kart 64 or
   Pikmin 2. The same for Deep Rock Galactic: Survivor, Hades and Black Mesa if they have dropped off the row.
2. **Leave the parental lock off.** With it on, the rig's checks are refused.
3. **Leave the Deck plugged in, on one screen,** and say which (its own or the monitor). Please do not use it while
   the session runs, or say so first.
4. **Pick the chat's model yourself: Opus, high.** A chat cannot change its own model.
5. **If you have an hour and a half at the Deck,** your own checks move the Verify number most: the PIN (two
   entries), the microphone (two), the right stick (one), five looks, and the finger check for the tab bar ghost.
   They are on your checks page.

## How to start

For the chat that runs this plan.

1. Confirm the chat is on Opus high. If it is not, say so in one line and carry on.
2. `git fetch`, and confirm the local copy is not behind the cloud. `git status`. The tail of the decisions file.
3. Read [AGENTS.md](../../AGENTS.md), [the runbook](../agents/bug-wave-runbook.md),
   [the lessons](../lessons-learned.md) and this plan. [Plan 79](79-release-wave-six.md) has the Deck helper's
   handover rules and the shape of an evidence file.
4. Write "Your calls" into the decisions file as the next free number.
5. Start the timed check that wakes the session every 20 minutes. Take the Deck's keep-awake hold, and take it
   again at every Deck block (it lasts eight hours at most). If this is not the desktop app, start
   `python scripts/keep_awake.py --hours 16` as well.
6. Start the Deck helper on block 0, then block 1. Nothing else may drive the Deck.
7. Note the tip. Make the helpers' copies (`python scripts/worktree.py create <name> --base experimental`), named
   `p81a`, `p81b` and so on. Write the shared rules file and the briefs; check each brief against the code and
   against its own rules. Start the ten.
8. Build the stand-in for the AI (call 2) while the helpers work: a small program on this PC that answers like the
   AI's server with a fixed, prepared reply. It lives in the scratch folder, not in the project.
9. From then on: the runbook.

## Questions that come up during the session

New ones go here, with the choice taken in the meantime. Three are open from the start:

1. **The sentence that shows for a second before its cover:** open, or accepted? *Meanwhile:* open.
2. **If the hunt shows the AI itself writes the doubled marks:** is the entry then closed as "cause found, the
   plugin copes", or kept as accepted? *Meanwhile:* kept on the list, with the finding.
3. **After the reload look:** if it is developer-only, are the two entries marked accepted with the rule written
   down? *Meanwhile:* they stay open, with what was found.

## At the end

- **The report,** sent to your phone, opening with what you must do next. Then: what was fixed and proven, what was
  fixed and not proven, what failed and why, what was found, and every entry still on either list with what it
  waits on.
- **The code summary:** the files changed, how each change works, what surprised us and how it was handled, and what
  you could have done differently to make the session easier.
- **A short developer guide** to how this plan went into the code, in simple terms.
- **The release notes' known issues:** any line whose bug is now fixed and proven comes off; anything new a player
  might notice goes on.
- **Your checks page** is brought up to date.
- **The wider quick check** passes before the session calls itself finished.

4. **The reworded hidden-block instructions cover more answers, including some harmless ones.** On this PC with
   the Deck's model, "which weapon is easiest to start with" in Hades came back covered in 8 of 10 answers (1 of 10
   before). Keep the rewording (more protection, an extra tap now and then), or prefer fewer covers? *Meanwhile:* kept,
   still gated by the Deck count.
5. **The Steam freeze after an answer with a game running.** A player could reach it. One lever the plugin controls:
   let the Deck's own AI leave memory sooner while a game runs (about a minute after an answer instead of five), at
   the price of a slower next question. *Meanwhile:* not built; it is measured at the very end of the session.
6. **A long troubleshooting sentence that also names the game still misses the game's tip** ("deep rock galactic
   survivor the words on screen look blurry on my deck"). A softer rule would catch it at the cost of more code.
   *Meanwhile:* not built.
7. **The chat-row check's "busy" reading.** An older note expects the other chat's Ask button to read ready while
   the first chat writes; today's check expected busy and passed. Which is right? *Meanwhile:* both recorded.

## Results

Not started.

## Log

- **2026-10-03, about 16:15 to 16:45, the start (tip `afd2f444`):** the local copy was not behind the cloud. The
  maintainer's ten calls went into the locked decisions file as D124. The chat runs on Opus 5.5 at extra-high effort
  (one step above call 9). A timed check wakes the session every 20 minutes. Every check passed at the tip (3,280
  screen tests, the Python tests, the quick check). The Deck helper started setup and the block 1 measurements. Ten
  helpers started, each in its own copy cut from the tip: A (B on the Clear-all box), B (five weak rings), C (the try
  order when a model is removed, and the PC), E (a long chip's pause), F (the hidden-block wording, with a
  before-and-after count), G (a game's tip found by meaning), H (wrong-subject notes), I (the doubled-marks hunt, on
  Opus), J (the walk check reads words, in the Deck tools project) and K (the test setup's top margin, then K2 and K3
  once the Deck has measured). D waits for the first free slot. Early lead for A: the "Clear cache" button runs a
  preparation step before its box opens, and the "Clear all data" button skips it.

- **2026-10-03, about 16:45 to 17:45 (tip `d0d11c28`):** **Landed, every check green:** the test setup's top margin
  (K1), B on the Clear-all box no longer leaves Settings (A: the button skipped the step that tells the plugin which tab
  to return to), the white ring on the five weak controls (B), the old live-line code removed (D), and a long chip
  leaving 1.5 s after its words stop (E). The walk check that reads words (J) is committed in the Deck tools project
  and rebuilt; it takes effect when the tool server restarts. Paperwork sweep 1 moved them to Verify. **Deck blocks 0
  and 1** (build `afd2f444`): setup passed (backups in `~/p81-backup`); the Clear-all bug reproduced 3 of 3; with a
  game, Up onto a 525 px section showed 19% of it (Down 38%); controls under an answer sit about 86 px above the dock;
  after a Quick Access tab switch the ring lands on Decky's back arrow, 6 of 6; a word's tooltip covered the word in 3
  of 14 stops; no tab-bar ghost from a pretend touch; the summary card could not be measured (every chat already summed
  up). **New bug found:** after a choice button, the plugin can tell the AI "first question", so no checklist comes
  (found while building the stand-in AI, which now works and is proven on this PC). Started: N1 (that bug), Q (the ring
  after a tab switch; sent back once: it must not take the ring from someone resting on the tab icons), T (the
  tooltip), K2 (the tall section, with the measurement), C's second round (the PC half). Deck block 2a (owed checks)
  is running. Found: plan 79 never fed real sound to the Deck's microphone; block 2a tries a sentence played through
  the Deck's own speaker.

- **2026-10-03, about 17:45 to 19:00 (tip `5eca4271`):** **Landed, every check green:** the choice-button checklist
  bug (N1), Up onto a very long paragraph shows its start (K2), the ring after a Quick Access tab switch (Q, second
  round: it never takes the ring from someone resting on the tab icons), the try order and a PC (C, three rounds, plus
  a mirror bug it found), the reworded hidden-block instructions (F), the tooltip that covered its word (T), controls
  under an answer 6 px above the dock instead of 86 (K3), a game's tip found by meaning (G), the doubled hidden-block
  marks: cause found and fixed, plus a half-cut mark that showed a hidden sentence uncovered (I), and the sliver (K2b).
  Paperwork sweep 2 committed. **The Deck froze at 17:46** in block 2a: Deep Rock running, the notes library moved
  aside, the Deck's own AI already loaded; the answer finished at 17:42:58, then Steam's page processes ate memory
  (665 MB left at 17:56) until the maintainer force-restarted. The library was put back the moment the Deck answered.
  Filed as a new bug; helper M's audit note rules out a model load and names two memory levers. **Deck blocks 2a and
  2c** passed: power answers hold numbers, the ring after the settings list closes, the hint's Dismiss, the knowledge
  base icons, the three chat-row checks that failed on 18 September, no notes for an unknown game, the tactics with no
  library, a cut choice menu keeps its rest (stand-in AI), the checklist after a reopen (stand-in), Rename on the fresher
  title, the summary's Game line, moving a model's place, PC models in their own rows. **Found:** consent ("spoilers are
  okay") still showed a cover for about 3.5 s while a live answer arrived (helper S); PC models of 17 GB and more are
  not marked "too big" (helper Z); the summary card shows only its top 10 px above the dock (helper L, Opus). Sound
  from the Deck's speaker reaches its own microphone as silence, so both voice checks stay the maintainer's; the help
  chip's flag came back by itself after a restart, so that check stays with the first-install check. Deck block 3a (the
  new build and one check per landed fix) started.

## For the chat that runs this: helper types and pointers

Kept out of the sections above, which are written for the maintainer.

| Job | Helper type |
|---|---|
| A, B, C, E, F, J, K1 to K3, and any "look first" fix | `bugfix-lane` (Sonnet 5.5 high) |
| D | `bugfix-lane-sonnet-medium` |
| G, H | `kb-lane` (Sonnet 5.5 high) |
| I, L | `bugfix-lane-opus-high` |
| Deck blocks | `deck-driver`, a fresh one per block, one at a time |
| Roadmap, test documents, changelog | `bookkeeper` |

Starting points, each to be confirmed against the code before it goes into a brief:

- The ring claim on reopen: `src/hooks/useAskBarInitialRingClaim.ts`.
- The instructions' label: `ollama_prompts.py` near line 483; `strategy_spoiler_policy.py` near lines 139, 150, 161
  and 165.
- The walk check: the tools project at `C:\Users\still\decky-plugin-studio`, `mcp-server/src/deck/readFocus.ts`;
  the finding is logged in `docs/mcp-setup.md`. Its helper works in a copy of that project, not of bonsAI.
- The rig's own tools: `C:\Users\still\decky-plugin-studio\bridge\tools\` (`pad.py`, `chord.py`).
- Evidence for the bugs already measured: `docs/test-evidence/plan79-P79-SETTINGS-CLEAR-BOXES.json` (A),
  `plan79-P79-RING-WALK-TABS.json` (B), `plan79-P79-LONG-CHIP-PAUSE.json` (E),
  `plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json` (K2, the tooltip), `plan78-P78-DOWN-SHORT-SECTION.json` (K3),
  `plan72-F7-SUMUP.json` and `plan72-F8-SUMUP.json` (L), `plan77-SUMUP-12.json` (I).
- Which files each helper owns is settled when the briefs are written, by reading the code, and is added here.
