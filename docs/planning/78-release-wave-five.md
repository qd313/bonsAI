# Plan 78 — release wave five: a wider bug session, then an unattended Deck pass

**Status: started 2026-09-30 (Wednesday), about 21:50. The maintainer said "Go". The log at the end says where
things stand.**

Asked for by the maintainer: "Plan another bug fix wave … a massive bug fix session as a follow-up from last night …
once we have the bugs fixed, do an automated QA pass with the controller rig … I hope it doesn't require me to
babysit … I still haven't done the items that require checks from me, make sure you roll that into this session and
remind me."

Part of [plan 71](71-merge-experimental-into-main.md), Stage B. Last call is **Friday 2 October**. Everything lands on
the working branch and nothing is pushed, so every fix must be safe to ship this week.

## The short version

1. **This evening, before the rig is in:** up to ten helpers fix bugs, each in its own copy of the repo. The fixes
   land one at a time.
2. **Tonight, once the rig is plugged in:** the Deck checks every fix, then everything else in Verify that the rig can
   check. The session looks for the rig every 20 minutes and starts by itself.
3. **Thursday 1 October, you:** your hand checks, all of them, from the list in
   [Your list for Thursday](#your-list-for-thursday). The morning report opens with that list.
4. **Thursday night:** kept free for a short fix round on whatever your hand checks find.

## Your calls for this session (2026-09-30)

Written up as D121 in the locked decisions file ([D121](../audit/maintainer-decisions-locked.md)).

1. **Spoilers when asking about another game while one runs: option (a).** When a no-story game is running and the
   question names a game on the short protected list, the named game picks the notes for that one question. This is an
   exception to the rule that the running game always picks the notes.
2. **How wide: wide.** The small bugs with a known cause, plus answer quality: the chat summary's odd wording, answers
   borrowing each other's wording, and long answers slowing down while they decode. No library changes.
3. **Your hand checks: all on Thursday.**
4. **The Deck, while you are away:** the same as last night, and the oldest chat may be deleted if there is no spare
   chat slot. The session copies that chat's file aside first, so it can be put back.
5. **Start:** the fix helpers start on "Go", before the rig is in.
6. **Who runs it:** Opus high runs the session; Sonnet high and medium helpers do the work. One helper (the extra Down
   press) runs on Opus extra-high, because that fix has failed on the Deck twice.
7. **Your saved chats** may be copied to this PC to test the summary wording on. Nothing leaves the PC, nothing of
   yours is quoted in any document, and the copies are removed at the end.
8. **Reminder:** the morning report opens with your list, a phone notification goes out when the Deck is free, and a
   timed reminder is set for Thursday 1 October at 2:30 pm Eastern.
9. **The game's own chip:** with your "one chip" setting on, the game's own chip comes round every second turn.
10. **At Go, the chips get more than the bug fix** (your words: two chips a minute "is useless to show off the
    features"; "each of the preset fading animations" should "operate more similarly, more predictably"; no penalty
    for choosing one chip; game chips "a slightly higher chance" than a general tip). What that becomes is in
    [The chips](#the-chips-what-changes-tonight).
11. **Write last night's rules into the standing instructions, and harden the setup that proved itself.** Done at
    Go: the Deck driver's, the bookkeeper's and the fix helpers' instruction files, a written runbook
    ([docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md)) and the landing script
    (`scripts/land_lane.sh`), which now also runs the wider quick check.

## Where things stand

Last night (plan 77) fixed about 20 bugs and passed more than 30 Deck checks. The Bugs list is short: 16 entries, plus
7 in the knowledge-base section. Sorted:

- **One bug crosses the release line:** spoilers when asking about another game. It waited on your call, which is
  now in.
- **Five small bugs with a known or nearly known cause.** A player could notice each one.
- **Three answer-quality items** you pulled in today.
- **The rest** are yours to check by hand, already accepted, parked on purpose, or need a new library release.
- **Verify** holds about 25 checks the rig may be able to run, and about 20 only you can do.

## What to focus on first

1. **Spoilers across games.** It is the only open bug that breaks a promise the release makes: a hidden spoiler shown.
   Last night's first fix passed every test and still did nothing on the Deck, so this one is not believed until the
   Deck shows the covers.
2. **The highlight ring missing after reopening over a game.** It happened 6 times out of 6 the normal way a player
   gets there. The first press brings it back, but every player with a game running sees a panel with no ring.
3. **A setting lost when the panel closes right after a change.** Small, but it loses something the player set.
4. **Your hand checks.** Three of them (Clear while an answer arrives, the real microphone, the parental lock) have
   never been tried since the fixes, and they are the biggest unknown left before Friday. They are Thursday's first
   job.
5. **Then the rest of the wave**, in the order of the table below.

## The sort

### Fix this session

| Helper | The bug, as a player sees it | Why now | Needs the Deck first? |
|---|---|---|---|
| A. Spoilers across games | With Deep Rock running, a Hollow Knight boss question shows boss names with no cover | Crosses the release line; your call (a) | No |
| B. Ring after reopening | Reopen Quick Access over a game and the highlight ring is not drawn until the first press | Every player, every reopen | **Yes** — one measurement tonight, then the fix |
| C. A setting lost on a quick close | Change a setting, close the panel within half a second, and the change is gone | Loses a setting | No |
| D. The extra Down press | Walking down an answer, one press only scrolls before a short last section | Third round; two of three extra presses went last night | No (last night's measurements are in hand) |
| E. A removed model stays in the try order | A model removed outside bonsAI is still listed in the saved try order | Small, known cause | No |
| F. The game's own chip | With a game running, its own suggestion chip showed for 17 seconds in 420 and never came back | The promise "one of the game's own chips always shows" does not hold. Cause found while planning: in three of the four chip styles, the game's chips are only dealt once, when the panel opens | No |
| G. A read-through of the after-answer step | Nothing yet. This step has twice kept an old copy of something and broken a feature (the chips, the Strategy checklist) | Read-only. Finds the next one before a player does | No |
| H. The chat summary's wording | "Game: Parrying practice", "Player is stuck on: None apparent in this log" | Your call: wide | No (tested on this PC) |
| I. Answers borrowing wording | The Hades answer reused the Hollow Knight answer's wording; power answers near-identical with no number | Your call: wide | No (tested on this PC) |
| J. Long answers slow down | With nothing running, about 37 frames a second on a very long answer against about 50 on shorter ones | Your call: wide | **Yes** — a before number tonight |

**Three of these carry more risk than the others, so each has a gate:**

- **H and I change what the AI is told.** Each lands only if a before-and-after run on this PC's copy of the Deck's
  model shows it better and nothing else worse. If not, it is not landed, and the report says what was tried.
- **J changes how an answer is drawn.** It lands last, and only if the Deck's frame rate is clearly better and the
  full D-pad walk still passes. A small gain is not worth the risk two days before last call.
- **E must never empty the try order by mistake.** It only removes a model when the list of installed models was
  read successfully. A PC that is switched off must not wipe the order.

### The chips: what changes tonight

Helper F's job grew at Go. Three changes, built in this order, each its own commit:

1. **One rule for which chip comes next, in all four chip styles.** Today the sliding style has its own rule and the
   other three (fading, plain, decoding) share a different one that never deals the game's chips again after the
   panel opens. Tonight all four use one rule:
   - With one chip showing: after a general tip, the next chip is the game's own. After a game chip, the next is the
     game's again about one time in five. So at least every second chip is the game's, and a little over half of all
     chips are (about 55 in 100).
   - With two chips showing: one of the two is always the game's own, and the other is the game's about one time in
     five.
   - Nothing is dropped for having one chip. The chips dealt when the panel opens all get their turn, in order.
   - A game chip does not come back while others of the game's chips have not had a turn.
2. **One rule for how long a chip stays, and a faster pace.** Today a chip stays 8 to 32 seconds plus 3 seconds of
   fading, whatever the chip count: about 15 seconds a turn for a typical label.
   - One chip: about 7 seconds a turn for a typical label, so 8 or 9 chips a minute where there were 2 to 4. The
     fade-in stays at 1 second, since it is what draws the eye; the time standing still is cut the most.
   - Two chips: about 10 seconds a turn in each spot, about 11 chips a minute across the two, and the two spots never
     change at the same moment.
   - A label too long for its chip still gets one full scroll before it leaves. Today that wait is worked out for the
     narrow two-chip width even when one wide chip is showing, which holds a one-chip label longer than it needs.
   - The row still holds still while the highlight ring is on a chip.
   - The sliding style gives up its fixed 5.8-second step and uses the same rule.
   - The numbers sit in one place, so a change of pace after your look is a one-line change.
3. **A preview you can watch.** A page showing the chip row at its true size, running at tonight's pace beside the
   old one and one faster, with one chip and with two. It reaches your phone as a link. Say which pace you want and
   the number changes; tonight's build uses the middle one meanwhile.

**What "more similar" does not mean tonight:** the four styles keep their own drawing code. Folding them into one
shared engine is a reshaping of code, which the release plan does not allow this week. It goes on the roadmap for
after the release.

**The Deck check:** with a game running, the default style watched for seven minutes with one chip and seven with
two, and three minutes for each other style: chips a minute, the share that are the game's own, no two general tips
back to back with one chip, one of two always the game's with two, and no chip changing under the highlight ring.

**Your look, Thursday:** the pace with one chip and with two is added to your list.

### Not this session, and why

- **Yours to check by hand:** the ghost tab bar after touching the screen; the chip colour, underline and look. On
  your list for Thursday.
- **Yours to do:** the 6.6 GB of half-downloaded model files. Restarting Ollama on the Deck needs your password.
- **Already accepted for 0.6.0:** the summary card sitting 10 pixels behind the dock; the ring looking slightly
  different from Steam's own.
- **Cause unknown, guards proven:** saved answers with a hidden block's markers written twice. Watched.
- **Needs a new library release that only you can publish:** the library's ranking bugs (wrong-subject notes, Black
  Mesa's water note, a tip found only by its exact words).
- **Lives in the Deck tool, not in bonsAI:** the walk check calling a stop hidden behind a corner icon. It gets
  written up for that project.
- **Cannot be made to happen on purpose:** a plugin reload putting Steam's Home in front of a game. Noted if seen.
- **After the release:** removing the unused live-line trimming code. It reshapes code.

## Who does what, and what runs side by side

The one running the session (Opus high) writes no code. It writes the briefs, reads every change before landing it,
lands, writes the Deck checks, reads every failure, and decides anything unclear.

| Who | What | Model | Starts |
|---|---|---|---|
| Helper A | Spoilers across games | Sonnet 5.5 high | At Go |
| Helper C | A setting lost on a quick close | Sonnet 5.5 high | At Go |
| Helper D | The extra Down press | **Opus extra-high**, with last night's measurements in its brief. This fix failed on the Deck twice on Sonnet high, and the house rule moves it up one tier | At Go |
| Helper E | A removed model in the try order | Sonnet 5.5 high | At Go |
| Helper F | The chips: which comes next, how long each stays | Sonnet 5.5 high; Opus reads it closely before landing, since it is on the main screen | At Go |
| Helper K | The moving preview of the chip pace | Sonnet 5.5 high | At Go |
| Helper G | Read-through of the after-answer step | Sonnet 5.5 high, read-only | When the first slot frees (the preview took its place at the start) |
| Helper H | The chat summary's wording | Sonnet 5.5 high | At Go |
| Helper I | Answers borrowing wording | Sonnet 5.5 high | At Go |
| Helper J | Long answers slow down | Sonnet 5.5 high | At Go (reads the code and last week's numbers; the Deck number comes tonight) |
| Checks list | Collects every owed check the rig can run into one list of exact steps | A read-only lookup helper | At Go, finishes early |
| Bookkeeper | Roadmap, testing documents, changelog | Sonnet 5.5 medium | When the checks list finishes |
| Helper B | Ring after reopening | Sonnet 5.5 high, with tonight's measurement | After the Deck's first block |
| Deck driver | The Deck checks, one at a time, a fresh one for each block | Sonnet 5.5 medium | When the rig answers |

That is ten at once at the start. A finished helper's slot goes to the next job: helper B, a second round, or a fix
for something new. No fix in this wave is purely mechanical, so no fix helper runs on medium.

## What changes from last night

Read from last night's evidence files, log and paperwork on 2026-09-30.

**How the Deck driver did.** About 50 results in four and a half hours of Deck time, and no check was found passed
that should have failed. It turned up about ten real problems, and it wrote up its own mistake in plain words. Sonnet
medium stays. Three slips,
each with a rule for tonight:

- **A stray press marked a test answer "helpful".** It sent four presses and an A in one go, and the A landed one stop
  off. Tonight: A is never the last press of a sequence. The driver reads what has the highlight, then presses A.
- **About 14 test questions went into your own first chat,** because no spare chat existed. Tonight: the first block
  makes or finds the test chat, and the driver checks the chat's name before every question.
- **One question was asked twice** after the driver's memory was trimmed mid-block. Tonight: blocks are shorter (about
  15 checks), each with a fresh driver, and a driver re-reads its handover note before pressing anything after a trim.

**About a quarter of the Deck results proved nothing,** and that was the checks list's fault, not the driver's.
Thirteen came back unclear or could not run: the AI never wrote the case the check needed, a game was not on Recent
Games, or a setup step could not be done as written. Three of those checks have now failed to produce their case
three times or more. Tonight:

- Every check names what must be true before it starts, and a quick way to see whether its case can be produced.
- A check that depends on what the AI happens to write gets two differently worded tries, then stops.
- A check that has failed to produce its case twice before is not run again as it is. It gets a prepared setup written
  by the session first, or it goes on your list as "proven by its tests only: accept, or check by hand".

**The fix helpers.** Of the nine helpers whose work the Deck could check, five passed the first time and four needed
more rounds. In the misses, the helper's tests checked something one step away from what the Deck check looks at, or
the fix missed a second place where the same thing shows. Tonight every brief:

- carries the sentence that says what a pass looks like on the Deck, and asks for one test at that same level (the
  answer on screen has a cover, not "the spoiler setting says protect");
- for a wording or label fix, asks for a search of every place the words appear first, and the review searches again
  before landing;
- for a fix that has failed on the Deck twice, goes up one tier. That is helper D tonight.

**The bookkeeper.** Every status it changed named its evidence, and it kept up with 13 sweeps. Sonnet medium stays.
Four slips, each with a rule for tonight:

- A test row's status still says "no run yet" beside a note saying it failed on the Deck. Tonight: after each sweep,
  the status of every row it touched must agree with that row's newest dated note.
- Four roadmap entries still say "being fixed", "being built" or "being looked at". Tonight: no in-progress wording
  goes on the roadmap, and the first sweep removes those four.
- The testing document grew past its size limit and nobody saw until the end. Tonight: every sweep ends with the wider
  quick check.
- Dated notes pile up until an entry is twice its five-line limit. Tonight: an entry over the limit sends its older
  notes to the details file in the same sweep.

**The one running the session.** Landings were clean: 26 changes, every check green. Four things to do better:

- The wider quick check is now part of every landing.
- The review before landing asks one more question: does a test fail at the level the Deck check looks at?
- **A wrong fact went from the session's own result list into the roadmap and last night's report.** They say Ollama
  on the Deck "was started by hand". The driver's evidence says a system service runs it, and restarting that needs
  your password. Tonight: result lists are copied from the evidence file's own words, and the first sweep corrects
  those lines.
- The checks list is reviewed by the session before the first Deck block, against the three rules above.

**What can run side by side:** all nine fix helpers and the checks list, from the first minute. They own different
files (the list is at [the end](#for-the-helpers-who-owns-which-files)).

**What cannot:**

- Only one thing drives the Deck at a time.
- The before-and-after answer runs for H and I use this PC's one copy of the model, so they take turns.
- Landings go one at a time in the shared folder. The bookkeeper does not commit while a landing runs.
- A, H and I all touch what the AI is told. A lands first; H and I are checked against the code as A left it.
- D and J both touch the answer on screen. D lands before J; J lands last of all.
- B waits for its Deck measurement. A ring fix without a measurement has failed here every time.

**Landing order:** E and A (back end only), then C, F, then H and I after their answer runs, then D, then B, then J.
Each landing: read the change, bring it onto the tip, all five checks **and the wider quick check** green, the
bookkeeper's sweep, commit. (Last night the wider quick check was left out of landings and went red unnoticed.)

**If a fix fails on the Deck twice,** it moves up one tier, to an Opus extra-high helper, with the measurement in
hand. A third failure waits for you.

## The Deck plan

It starts when the rig answers. Until then the Deck is not touched.

**Block 0, setup (about 10 minutes).** Check no other session is driving the Deck. Keep it awake. Note which screen is
live. Save a copy of the settings. Check the parental lock is off, Ollama is running, and which games are on Recent
Games. Find the test chat from last night; if there is no spare chat slot, copy the oldest chat's file aside, write
its title in the log, and delete it. Deploy the newest build and confirm the Deck is running it.

**Block 1, measurements and owed checks that do not depend on tonight's fixes:**

1. **The ring after reopening, measured** for helper B: at each reopen over a game, what the page says has the
   focus, what Steam's own focus system says, and whether the ring is drawn, before and after the first press.
2. **The frame rate on short, long and very long answers, decode effect on and off,** for helper J. These are the
   "before" numbers.
3. **The Verify backlog,** from the checks list. Known candidates:
   - a choice menu cut exactly at the length limit (unclear last night; tried again with a lower limit);
   - "spoilers are okay" opening the covers in earlier answers;
   - Palworld and Skyrim answering from their notes;
   - Down leaving an empty Session tab;
   - the chip ladder inside the open notes block;
   - a scrolling chip label;
   - the slow-question progress lines;
   - the frame rate with a game past its title screen, if the rig can get a game there;
   - whatever else the checks list finds.

**Block 2, after the landings:** one deploy, then one check per fix.

| Fix | What a pass looks like on the Deck |
|---|---|
| A. Spoilers across games | With Deep Rock running, three Hollow Knight boss questions each come back with covers and Hollow Knight's notes; a Deep Rock question still gets Deep Rock's notes; "spoilers are okay" still opens everything |
| C. Setting on a quick close | A setting changed and the panel closed within a third of a second: the settings file holds the new value, five times out of five |
| D. Extra Down press | On answers with a short last section, every Down press moves the ring; Up visits the same stops |
| E. Try order | A model removed over the network is gone from the saved order after the next look at the models list; with Ollama switched off the order is untouched |
| F. The chips | With a game running, the default style watched for seven minutes with one chip and seven with two, three minutes for each other style. One chip: 8 or 9 chips a minute, never two general tips back to back, a little over half the game's own. Two chips: one of the two always the game's own. No chip changes under the highlight ring |
| H. Summary wording | "Sum up" on three test chats: no "Game:" line naming something that is not a game, no "None apparent" lines |
| I. Borrowed wording | The same pairs of questions as on 27 September: the second answer does not reuse the first one's sentences |
| J. Long answers | The frame rate on a very long answer, measured the same way as the "before" number |

**Block 3:** helper B's ring fix (twelve reopens over a game, ring drawn every time within the first second, and the
D-pad trap check from last night repeated so the fix has not brought the trap back). Second rounds for anything that
failed. The free-play sweep with and without a game, which every Main-tab change owes.

**Block 4, the end:** a smoke test on the final build. Then everything is put back: settings, the normal build, any
model pulled for a test removed, pinned test chips cleared, the game closed. The Deck is left ready for your hand
checks.

## Running without a babysitter

- **The rig.** The session looks for it every 20 minutes. If it has not answered by the time every fix has landed,
  you get one phone notification, and the session keeps doing what does not need the Deck.
- **The line decides new bugs.** A new bug that crosses the release line gets fixed this session. Anything else goes
  on the roadmap and into the report, and gets one helper round of about an hour. If that fails, it stays on the
  roadmap for later.
- **Anything new that needs checking** goes into Verify with the name of its check, and onto your checks page if only
  you can do it.
- **Questions that come up while you are away** are written into the questions list below. The safest choice is
  taken for now. You get a phone notification only when something is truly blocked.
- **If the build cannot be put on the Deck,** the usual cause is a file owned by the wrong user. That is a five-second
  fix on your side ("run setup-dev"), and you get a notification saying so.
- **Usage limit.** Every helper stops at once, and each is resumed by message after the reset, keeping its work. A
  20-minute timed check wakes the session; a message from you ("continue") also wakes it.
- **Never:** push, merge to main, switch branches in the shared folder, stage everything, type a PIN or password, or
  press anything on the Deck outside a written check.
- **Progress** is written to the log below after every landing and every Deck block, and committed, so a check-in from
  your phone shows where things stand.

## Keeping the roadmap current

After every landing, a fixed bug moves from Bugs to Verify, naming the check it owes. After every Deck pass, a pass
moves to Done with its evidence file, and a failure goes back to Bugs with what was seen. The testing documents change
in the same commit. The bookkeeper does the typing from result lists the session writes; the session spot-checks each
of its commits against the evidence.

## Your list for Thursday

All of this is yours, and none of it has been done yet. About two hours at the Deck in all. Do the first three first:
if one fails, tell any session "check N failed" and what you saw, and Thursday night fixes it.

**First, the three from the release checklist** ([plan 73](73-maintainer-checks-before-0.6.0.md) has the exact steps):

1. **Clear while an answer is arriving** (5 minutes).
2. **A question spoken into the real microphone** (10 minutes).
3. **The parental lock, seen locked** (15 minutes). While it is locked, also press the Ollama tab's three setup
   buttons: each should be refused with no box, and the ring should not jump back to them later. Turn the lock off
   again afterwards.

**Then the quick ones** (about 30 minutes; the checks page has a picture or the steps for each):

4. Session tab: press Clear, then Cancel.
5. With a finger: tap the tab bar; touch a chip with the tab strip open and a game running (the ghost tab bar); drag
   an answer while it arrives; tap a highlighted word in a Deep Rock answer.
6. With your eyes: the chips (colour, underline, raised look, and tonight's new pace with one chip and with two); the
   lit tab in five colours; the tree icon; the rated thumbs; the scramble's look; reduced motion.
7. With your ears: an answer read aloud, and whether a game stutters while it is read.
8. Put the Deck to sleep with the panel open, wake it, press Down.

**Last, the first install** (about 45 minutes, most of it downloads). Ask a session to build the release zip and move
bonsAI's folders aside first. This comes after the last fixes, so after Thursday night's round if there is one.

**Calls that need no Deck** (answer in any chat, whenever): the two Qwen defaults; whether a Strategy answer may pick
up an earlier game; how screenshots get shrunk; the dots under the chat name; a big model your licence setting
blocks; how the quick check handles front-end changes.

**Two chores:** restart Ollama on the Deck to clear the 6.6 GB (a system service runs it, so the restart needs your
password; the report will give the one command); start Doom 64 once if you have it (it unblocks one spoiler check).

## For your attention

1. **Two days are left.** With all your hand checks on Thursday, anything they find has one night to be fixed.
   Thursday night is kept free for that.
2. **Before bed tonight:** plug in the rig. Leave the Deck on, charging, in game mode, with the parental lock off and
   Ollama running. If Deep Rock Galactic: Survivor is not on Recent Games any more, start it once.
3. **Do not start your parental-lock check tonight** unless you also turn the lock off again. With it on, most of the
   robot's checks would be refused.
4. **This chat is on Fable.** It switches to Opus high at Go, as you asked.
5. **The wide scope adds risk** in three places (H, I, J). Each has a gate, and "not landed, here is what was tried"
   is an acceptable result for all three.
6. **The spoiler fix changes a rule you locked.** It is narrow: only a no-story game running, only a named game from
   the protected list, only for that one question.
7. **66 old helper copies of the repo are still on disk,** and tonight adds about a dozen. They wait for your word to
   delete; the release plan puts that right after the release.
8. **Nothing is pushed.** Pushing the working branch is yours, as usual.

## Questions that come up during the session

New ones go here, with the choice taken in the meantime.

1. **Spoilers across games: the follow-up question.** After "how do I beat the boss in Hollow Knight" with Deep Rock
   running, a bare follow-up ("and the next one?") names no game. **Meanwhile:** the exception covers only a question
   that names the game, as you chose. The follow-up goes back to the running game's notes.
2. **Five owed checks that the rig can never run.** Each has failed to produce its case two or more times, and
   nothing the rig can do will change that: Down leaving an empty Session tab (the plugin never saves a chat in that
   state); the chip ladder inside the open notes block (the block has no ladder, by design); the notes block and "no
   close match" never showing together (covered by a later check that passed); an unnamed Hades story question
   keeping its cover (14 tries: 4 covered, 3 plain, 4 where the AI dodged the question); and the same guard with
   Hades running. **Meanwhile:** they are not run tonight and stay owed. **Your call:** accept each on its unit tests
   and close it, or put it on your own list. The Hades one is the only one where the tries disagree with each other;
   it deserves a look rather than a wave-through.
3. **One check needs the knowledge library moved aside on the Deck** (boss tactics staying plain when the library is
   absent). That is outside what you allowed tonight. **Meanwhile:** skipped. Say yes and a later session runs it
   (aside, never deleted, and put back).
4. **The try-order fix does not cover a PC.** With the AI running on a PC, a model removed there stays in the saved
   order. Covering it means one small change in a file tonight's helper did not own. **Meanwhile:** not built.
   **Your call:** build it after the release, or leave it.

## At the end

- **The report,** sent to your phone, opening with your list for Thursday. Then: what was fixed and proven, what
  failed and why, what was found, and what is left.
- **The code summary:** the files changed, how each fix works, what surprised us and how it was handled.
- **The release notes' known issues** (plan 72, section 8): any line whose bug is now fixed and proven comes off. The
  spoiler line comes off only if the Deck shows the covers.
- **Your checks page** is brought up to date, with Thursday's list at the top.
- **The wider quick check** passes before the session calls itself finished.

## Results

To be filled in.

## Log

- **Start (2026-09-30, about 22:00, tip `c87ccb9a`):** the maintainer said Go. Before the helpers started, last
  night's rules went into the helpers' standing instructions, the setup was written down as a runbook, and the
  landing script was checked in (`ef6baaae`). Ten helpers then started, each in its own copy of the repo: A
  (spoilers across games), C (a setting lost on a quick close), D (the extra Down press, on Opus extra-high), E
  (a removed model in the try order), F (the chips: which comes next and how long each stays), H (the summary's
  wording), I (answers borrowing wording), J (long answers slowing down), K (the moving preview of the chip pace)
  and the checks list. Waiting for a free slot: G (the read-through) and the bookkeeper's first sweep. Waiting for
  the Deck: B (the ring after reopening) and every Deck block. A timed check wakes the session every 20 minutes.
- **The model:** a chat cannot change its own model, so this session runs on Fable until the maintainer picks Opus
  high in the model menu. The session keeps its own part small meanwhile.

- **First sweep (2026-09-30, late evening):** the try-order fix landed (`c1b4cdc8`, every check green, including the wider
  quick check). The long-answers fix is ready (`9913dfa3` on its helper's branch) and is held until the Deck's "before" frame
  rate has been measured on a build without it. The chip pace preview page was published for the maintainer
  (https://claude.ai/artifact/FtzUKajYgiLJJqPbFJPyk3) and their pick of a pace is awaited. Two helpers briefly swapped
  uncommitted work through a shared `git stash`; nothing was lost, and the rule "never git stash" is now in every helper's
  standing instructions (`f4159cf0`).

- **Second sweep (2026-09-30, night):** the fix for a setting lost on a quick close landed (`0b9454fa`, every check
  green). The summary-wording fix was sent back before landing: its guard against empty lines also threw away real
  ones, such as "Stuck on: not sure how to beat the Soul Master". Its Game-line half was fine: a non-game named on the
  Game line went from 27 of 45 test summaries to none. The list of owed Deck checks is done: 66 checks, 27 the rig can
  run, 5 it can never run, 3 blocked and 31 the maintainer's. The read-through of the step after an answer found four
  real problems, now on the roadmap, and two more helpers started on them (L and M).

## For the helpers: who owns which files

A starting point for the briefs. Each brief names the tip it starts from and its exact files, the base check, one fix
per commit, "run the baseline gates now, without an install", the five gates plus `python scripts/verify.py --quick`,
a scratch folder of its own, and `git -C` instead of `cd`. A helper that needs a file outside its list stops and
reports. Helpers never edit the roadmap, the testing documents or the changelog.

- **A (spoilers across games):** `py_modules/backend/services/game_ai_request.py`,
  `spoiler_title_profiles.py`, `knowledge_base_game_match.py`, the game choice in `knowledge_base_service.py`,
  `src/data/spoilerTitleProfiles.ts`, `tests/contracts/spoiler-title-profiles.json`, and their tests. Starts from
  helper J's commit `332be619` and its round-two report; evidence `plan77-P77-SPOILER-OTHER-GAME.json`. The named
  game's notes, covers and choices for that turn must match what the same question gets with no game running. The
  brief carries the lesson: tests passing proved nothing last night. Check **P78-SPOILER-OTHER-GAME**.
- **B (ring after reopening):** `src/hooks/useAskBarInitialRingClaim.ts`, `src/utils/navFocusRegistry.ts`,
  `src/utils/uiDocument.ts`, and their tests. Follows the trap fix `7a7d59fe`. Evidence
  `plan77-P77-TRAP-LONG.json`, `plan77-P77-RING-REOPEN-DIAG.json`, and tonight's measurement
  **P78-RING-REOPEN-MEASURE**. Must not undo the trap fix: the check repeats the 24-reopen test in a shorter form.
  Check **P78-RING-REOPEN**.
- **C (setting on a quick close):** `src/hooks/usePluginSettings.ts` (the 400 ms save and
  `persistChangedSettingsNow`) and its tests. Saves what is waiting when the panel closes; must not save a stale
  whole copy over newer values (the 2026-09-23 popup bug). Opus reviews: settings plumbing. Check
  **P78-SETTING-QUICK-CLOSE**.
- **D (extra Down press; agent `bugfix-lane-opus-xhigh`):** `src/utils/answerBubbleNavigation.ts`,
  `src/test-harness/deckAnswerWalk.ts`, and their tests. Evidence `plan77-P77-WALK-COVERS-MIRROR-R2.json`, `plan77-P77-FINAL-SMOKE.json` (a 60 px and a 90 px
  section). Tests model Steam's own scroll on focus and a bounded walk with no stop twice. Check
  **P78-DOWN-SHORT-SECTION**, then **QA-FREE-PLAY-01**.
- **E (try order):** `py_modules/backend/ollama_routing.py`, `services/settings_service.py`,
  `services/ollama_local_setup_rpc.py`, and tests beside `tests/test_delete_model_cleans_routing_orders.py`. Prune
  only on a successful, non-empty list read from the same address the order belongs to. Check **P78-ORDER-PRUNE**.
- **F (the game's own chip):** `src/features/preset-carousel/carouselState.ts`,
  `src/components/MainTabPresetAnimatedChips.tsx`, `src/hooks/useSuggestedPromptChips.ts`,
  `py_modules/backend/services/knowledge_base_chips.py`, and their tests. Evidence
  `plan70-L6-PHASE4-CHIPS-01.json`, `plan70-L6-CHIP-ROTATION-01.json`. Also `presetSlotRotation.ts`,
  `sessionRagComposer.ts`, `presetDecodeSlots.tsx`. Read while planning, to be confirmed by the helper:
  `nextSlotPreset` (fade, static and decode styles) refills from the static pool only, while only the carousel tick
  calls `pickCarouselChipWithSessionRag`; and `composeSessionPresets` forces its guaranteed chip into slot
  `PRESET_VISIBLE_SLOTS - 1`, which is off screen when the one-chip setting is on. The rules to build are in
  [The chips](#the-chips-what-changes-tonight): one next-chip rule for all four styles (after a general chip the
  next is the game's; after a game chip, the game's again with chance 0.2; two chips: the guarantee reads the chip
  that stays), one stay-time rule that takes the chip count (`presetHoldMs` and `holdMsForPresetText` in
  `src/data/presets.ts`, `PRESET_LABEL_ROOM_PX` worked out for the real count, the carousel's `CAROUSEL_STEP_MS`
  replaced by it), fade lengths in `presetChipShared.ts`. Starting numbers: one chip, 120 ms a letter, 4 to 9 s,
  fade 1 s in and 1 s out; two chips, 200 ms a letter, 6 to 14 s, fade 1 s in and 1.5 s out. All of them named
  constants in one file. Three commits, in the order of that section; no shared-engine rewrite; watch the 400-line
  limits (`MainTabPresetAnimatedChips.tsx` is at 599 with a recorded size, `presetDecodeSlots.tsx` at 392). Never
  the same chip twice running unless the game has only one. A pinned test batch still wins and still walks in
  order. The row holds while the ring is on a chip (`MainTabPresetAnimatedChips.keepsRing.test.tsx` must still
  pass). Reduced motion is unchanged. Tests use fake timers and count chips over a simulated seven minutes, at
  one chip and two, in each style: that is the level the Deck check looks at. The Ask hook-order record must be
  updated if a hook is added. Check **P78-TIP-CHIP** and **P78-CHIP-PACE**.
- **K (the chip pace preview; agent `feature-lane` brief, no repo commits):** one self-contained HTML file in its
  scratch folder, no build step: the chip row at true size (the 300 px column, the chip styles copied from
  `src/styles/` section 4 and `presetChipButton.tsx`, real labels from `src/data/presets.ts` and a few real game
  chips), three paces side by side (today's, tonight's, one faster), a switch for one chip or two and for the four
  styles' arrival (fade first; the others if time allows), and a counter of chips a minute. The session publishes
  it and sends the link.

**Every brief also carries** (from "What changes from last night"): the sentence that says what a pass looks like on
the Deck and one test at that level; for wording fixes, a search for every place the words appear. **The Deck
driver's handover note carries:** read the highlight before every A, never A at the end of a sequence; questions only
in the named test chat, its name checked before each; go to the start of the Recent Games row before launching a
game; evidence files named `plan78-<ROW>.json`, one per check, with the fields row, build_commit, deck_time_local,
screen, setup, pressed, seen, expected, verdict, and a verdict that starts with PASS, FAIL, UNCLEAR or COULD NOT
RUN. **The bookkeeper's brief carries:** status agrees with the newest dated note; no in-progress wording; entries
over five lines send older notes to the details file; `python scripts/verify.py --quick` after every sweep.
- **G (read-through, read-only):** the Ask code's after-answer step (`src/hooks/useSuggestedPromptChips.ts` and the
  Ask hooks that run when an answer completes; the cause of `06e9c83b`). One question: which values does this step
  read from a copy made before settings or the chat loaded? Output: a list with file and line and a proof for each.
  No edits.
- **H (summary wording):** `py_modules/backend/services/chat_summary_service.py`, `chat_sum_up_job.py`, and their
  tests. Test chats in its own scratch folder; the maintainer's chats copied there by the session, never quoted,
  removed at the end. Check **P78-SUMUP-WORDING**.
- **I (borrowed wording):** `py_modules/backend/services/chat_memory_service.py`, `chat_memory_step.py`, the
  earlier-turns part of the system prompt, and their tests; not `game_ai_request.py` (helper A's). Evidence
  `plan72-Z-FREEPLAY.json`. Includes the log pulling a power suggestion out of a boss answer. Measured with
  `scripts/eval_kb_answers.py --corpus <shared build/knowledge-base>` on this PC. Check **P78-BORROWED-WORDING**.
- **J (long answers):** `src/components/StreamMarkdownPieces.tsx`, `MainTabBonsaiAiMarkdownChunk.tsx`, and their
  tests; not `answerBubbleNavigation.ts` (helper D's). Starts from `roadmap-details.md` § Flow L10 findings and
  `plan69-answer-frame-rate-2026-09-25.json`. Tonight's before number is **P78-DECODE-LONG-BEFORE**; the check is
  **P78-DECODE-LONG**.
