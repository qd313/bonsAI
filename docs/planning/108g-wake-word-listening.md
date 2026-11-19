# 108g — Wake-word listening: the plan

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** The August study said "yes,
with conditions". Checked against today's code and the Deck, that is still the honest answer, but the conditions have
changed: the study's own engine pick now looks too costly, and a better kind of engine was never considered. So this
plan starts with tests, and the build follows only if the numbers pass.

**Where to pick up.** Read §§ 1, 4 and 5. Calls g1, g6, g7 and g8 can be answered in words now. Calls g2, g3 and g4
are drawn first (mock-up board 7). Calls g5 and g9 wait for the test numbers. Then say "Run plan 108g, step 0" in a
new chat on the PC. Step 0 is one session. The build is a second session, after the step 0 report and your picks.

**Files for this plan:** the briefs [assets/108g-lane-briefs.md](assets/108g-lane-briefs.md); the shared helper rules
[assets/108-helper-rules.md](assets/108-helper-rules.md). Evidence files: `plan108g-<ROW>.json` in the workshop's
test-evidence folder. Its sister plans are 108a to 108g. Its calls are filed under decision D145 as g1 to g9; its rows
start `P108G-`.

**The roadmap entry:** ★★★★★ `[voice]` **Wake-word listening** — "OPEN, beta; the study says conditional go, nothing
built. Opt-in, always listening on the Deck for the word "bonsAI", then it hears your question and asks quietly."

Written by a planning chat (Fable 5.2) on `experimental` at tip `28306e896`, from the August study
([workshop plan 10](../../../bonsAI-workshop/planning/10-wake-word-listening-feasibility.md), 2026-08-03), the plans
that changed the microphone since (workshop plans
[88](../../../bonsAI-workshop/planning/88-voice-whole-recording-at-stop.md),
[49](../../../bonsAI-workshop/planning/49-steam-frame-features.md) and
[52](../../../bonsAI-workshop/planning/52-frame-features-second-look.md); plan 86 step 3; plan 106), a read of the
code as it is today, and a read-only look at the Deck on 2026-11-19. The study stays where it is; this file replaces
its recommendations where they went stale.

---

## 1. What you would notice when this is done

- A new switch, off for everyone until you turn it on, with a plain warning beside it. It needs the microphone
  permission, and the Kids lock turns it off.
- With it on, you are in a game with your hands on the controls. You say the wake word, then your question, without
  opening anything.
- A short tone tells you it heard the word. It listens until you stop talking, then shows a small notice with the
  words it heard, so a wrong wake is never a secret.
- The question is asked quietly, into the chat you last had open. When the answer is ready, the usual notice shows
  its first lines, and tapping it opens the answer. If bonsAI is open when you speak, the question lands in the
  question box instead, and you press Ask.
- A mark shows that the microphone is open whenever bonsAI is on screen. Over the game itself nothing of ours can be
  drawn (§ 7). So in the first version, listening runs for a time you choose and then ends by itself.
- It will sometimes miss you, and sometimes wake when nobody called it. It costs a little processor and battery the
  whole time it is on. Headphones make it both cheaper and more accurate.

## 2. What was already written down, and what has gone stale (checked against the code on 2026-11-19)

**What the August study said.** Possible, with two conditions: prove ordinary voice typing on the Deck first, and do
not ship "always on" as the first version; ship a listening window with a time limit. Its engine pick was the speech
reader the plugin already has (whisper), woken only when a speech detector hears talk, because that adds nothing new
to install. It ruled out the purpose-built wake-word engines over their licences and over adding new native code. It
left four questions for you. None was ever answered: nothing in the decisions file settles anything about the wake
word.

**Still true**

- Nothing listens by itself today. The microphone opens only while a mic-button recording runs.
- The Deck's speakers sit beside its microphones, and the plugin does nothing to cancel its own sound. Game dialogue
  reaches a listener as speech. This is still the biggest risk.
- The back end still uses nothing but Python's own library, so a wake-word engine cannot simply be added as a Python
  package.
- The wake word is short, and "bonsai" and "banzai" are real words. "hey bonsAI" is still the safer phrase.
- Steam does tell a plugin when the Deck goes to sleep and wakes, but only on the screen side, and bonsAI does not
  use that yet.
- A paid engine that needs a key and calls home is still out.

**Stale**

- **"Voice typing has never been seen working on the Deck."** It has, many times since October, with recorded
  sentences played into a pretend microphone (plan 88's rows; row P86-VOICE-01 on 2026-10-16). What is still owed is
  your own voice: the early stop after 3 or 4 seconds was only ever seen with a real voice.
- **The engine pick's cost.** The study guessed a short listen with the small speech model would take a fifth to a
  half of one processor core. Measured on the Deck since (2026-10-10): one read with the small model takes about 2
  seconds with a game running, however short the clip, and reading back to back took a game from 60 frames a second
  to 35. As a wake-word detector under a talkative game it would be working nearly all the time.
- **"The shared speech engine is ready for a second user."** Half true now. It was changed so that whoever holds it
  first decides the speech model, a second user wanting another model is turned away, and it always runs at full
  strength. A listener cannot lean on it the way the study drew.
- **"A recording ends after two seconds of silence."** Gone since plan 88. A recording ends at Stop, at Ask, or at two
  minutes. A spoken question with no button needs its own "you stopped talking" rule, and none exists.
- **"The back end can ask by itself once a small seam is added."** Not enough. Which chat is open, and the address
  typed for a PC's AI, are kept on the screen side, not in the settings file. The quiet question has to be sent by
  screen-side code that stays alive while the panel is closed. One such piece already exists: the watcher that shows
  the "answer is ready" notice.
- **"A new permission costs six files."** The last one touched 45. A plain setting costs about 18.
- **"The Kids lock will cover it for free."** The lock shipped, but the back end only hears about it while bonsAI's
  panel is open, and forgets it at every restart. A listener that started by itself could run under a lock it has not
  heard of. § 5 closes this before any listening exists.
- **Read aloud** was built and then removed (plan 86 step 3), so nothing speaks. Headset mode, Voice follow-ups and
  Spoilers by voice have no voice to hang off (§ 8).
- Every file path in the study moved in October's clean-up.

**Never written down**

- **A wake-word engine can run as its own small program,** started and stopped by the plugin, the way the speech
  reader already runs. That keeps the plugin's own Python clean and reopens the purpose-built engines. One of them
  (the keyword spotter in the open project sherpa-onnx) listens for any phrase typed into a text file, with no
  training. Its code is open. Its English model was trained on recordings whose own terms say "research and teaching
  only"; whether that is acceptable is the open-source reviewer's question first, then yours (call g7).
- **The Deck already carries an echo canceller** as part of its sound system, and it lists the speakers and the
  headphones as two separate outputs. So a listener can know when sound is coming out of the speakers, and may be
  able to cancel it. Both were seen on the Deck as files and names only. Neither has been tried.
- **The speech reader built on the Deck already knows the speech-detector option** the study was unsure about (seen
  as words inside the program's file, not run).
- **The test Deck** has 8 processor threads and 16 GB of memory, runs SteamOS 3.9.5, and gives plugins Python 3.14.

**The verdict today.** "Conditional go" stands, with new conditions: (1) an engine that passes the lines in § 5 on
this Deck; (2) your own voice heard; (3) the open-source reviewer's yes on the engine's licence trail; (4) the safety
rules in call g8. The old condition "prove voice typing first" is met except for your own voice, which step 0 now
includes.

## 3. How it works today

You press the mic button. The back end starts a small recording program and keeps every sound until you press Stop
(two minutes at most). While you talk it shows rough words; at Stop it reads the whole recording once and puts the
clean text in the question box. You press Ask, and the screen sends the question together with the things only it
knows: the open chat, the running game, the mode. If you close the panel, a small watcher on the screen side keeps
checking, and shows a notice with the answer's first lines when it is ready. The microphone permission is off until
you turn it on, and the Kids lock turns every permission off for the session.

## 4. Calls for you before anything is built

Filed under D145 as g1 to g9. Nothing in the decisions file settles any of them today. The nearest locked lines are
about other voice ideas: Voice follow-ups need no wake word (D97), no headset is being bought for now (D97 call 3),
and the three voice ideas stay on the list as they are (D142 call 7). None of them clashes with this plan.

**g1. The wake word.** (a) "bonsAI"; (b) "hey bonsAI"; (c) test both in step 0 and take the one with fewer wrong
wakes, "hey bonsAI" on a tie. **Recommended: (c).** A two-beat word wakes by mistake more often than a three-beat
phrase, and the numbers cost nothing extra to collect. Left unanswered: (c).

**g2. Always on, or a listening time you start. Needs a drawing first (board 7, tab "g-sign").** (a) You start
listening and it ends by itself: after a time you pick, at sleep, or when you stop it; (b) once switched on, it
listens from the moment the Deck starts, always; (c) (a) now, and (b) later, once (a) has numbers from real play.
**Recommended: (c).** Over a game nothing can show that the microphone is open, so "always" can be forgotten on; a
timed listen cannot. It is also the smallest build: nothing starts by itself, so there is no gap for the Kids lock.
This narrows the roadmap's "always listening" for the first version; say so if you want (b) first. Left unanswered:
(c), and the always-on phase stays unbuilt.

**g3. Where the switch lives and what its warning says. Needs a drawing first (tab "g-switch").** Drawn: a row under
Voice input in Settings with its own warning box, or a sixth permission in Permissions. **Recommended: under Voice
input.** It gives the same protection (it needs the microphone permission, so the Kids lock covers it) at well
under half the cost. Left unanswered: under Voice input, with the study's warning words tidied.

**g4. What happens when it hears you, and how you stop it. Needs a drawing first (tab "g-wake").** Drawn: a tone
only, or a tone and a notice; whether the heard words are shown; the ways to cancel (tap the notice, say "never
mind", press the mic button). **Recommended: a tone, then one notice with the heard words; all three ways to
cancel.** Cancel stops at once and keeps nothing. Left unanswered: as recommended.

**g5. If the speakers fail the wrong-wake line but headphones pass (answer after step 0).** (a) Listening pauses
itself while sound is coming from the Deck's speakers, which in practice means: with a game on, it works on
headphones only; (b) it stays on with a warning; (c) no go until speakers pass. **Recommended: (a).** Left
unanswered: (a).

**g6. The go and no-go lines in § 5.** (a) Accept them as written; (b) change a number now, before anything is
measured. **Recommended: (a).** Left unanswered: (a). A line is never moved after its test has run.

**g7. The engine's licence trail.** The recommended engine's code is open. Its English model is published as open
too, but it was trained on a set of recordings whose terms say research and teaching only. (a) Accept it if the
open-source reviewer does; (b) refuse it and use only the speech reader the plugin already has, which will likely
fail the cost lines with a game running; (c) train our own small model later, a project of its own with the same
kind of licence questions. **Recommended: (a), with the reviewer's read before step 0 fetches anything.** Left
unanswered: the reviewer decides, and a "no" means (b).

**g8. The safety rules, as one block (yes or no).**
- Off for everyone, existing installs included. It needs the microphone permission. It is off under the Kids lock,
  and nothing listens until the screen has told the back end the lock's state in this session.
- Sound never leaves the Deck. Only the question's text goes to the AI. That AI may be a PC on your network, and the
  warning says so.
- Sound from before the wake lives in memory for a few seconds and is never written anywhere. A question's sound is
  dropped once it has been read. The log holds counts and times, never words.
- A question is cut off at 15 seconds. A wake never sets off another wake. The mic button always wins the
  microphone.
- Listening stops when the switch, the permission or the plugin goes off, at sleep, and under the Kids lock. No
  listening program outlives the plugin.

**Recommended: yes.** Left unanswered: yes. These are the lines both reviewers check the build against.

**g9. Where to stop (answer after step 0).** (a) Stop after step 0 with a report, whatever it says; (b) build through
phase 3 (anyone can turn it on, for a time); (c) build through phase 4 (sleep and speakers too). **Recommended: (a)
now, then choose with the numbers in hand.** Left unanswered: (a).

## 5. The build, in order

### Step 0: tests to find out (one session; nothing a player can reach)

The lines are set now, before anything is measured. "The listener" means the recording program plus the engine.

| Test | What is measured, and how | Go line |
|---|---|---|
| Z1 The engines on recorded sound | Each engine hears the same files, on this PC and then on the Deck: 40 recordings of the word, and two hours of recorded talk and game sound | Hears at least 36 of the 40. At most 2 wrong wakes in the two hours |
| Z2 What it costs a running game | A game in live play on the Deck. The frame rate read 12 times with the listener off and 12 times with it on; the listener's share of the processor and its memory | The average frame rate falls by no more than 3 out of 60. No more than 5 percent of one core in a quiet room and 25 percent with game sound, over ten minutes. No more than 150 MB of memory |
| Z3 Battery | Off the charger: the power drawn for ten minutes with the listener off, then ten with it on | No more than half a watt extra, about 1 point of battery an hour |
| Z4 Wrong wakes through the real speakers | One hour of game talk played from the Deck's own speakers at half volume into its real microphone; one hour of talk from across the room | At most 2 wrong wakes in the speaker hour and 1 in the room hour. No wrong question sent at all (the speech reader must also hear the word before anything is asked) |
| Z5 Your voice | You say the word 20 times in a quiet room and 20 times with game sound, at arm's length | Heard at least 18 of 20 quiet and 16 of 20 with game sound. The tone comes within one second |
| Z6 Sharing the microphone | A second recording runs while the listener holds the microphone; the mic button is pressed while it listens; Steam's own voice test, by hand | Both hear clean sound, and neither is cut off |
| Z7 Sleep and wake | Five sleeps and wakes with listening on | It hears the word again within 10 seconds each time, and nothing is left running |
| Z8 Cancelling the Deck's own sound | Only if Z4 fails on speakers: the Deck's echo canceller on the listener's own feed | Z4's line is met, and the game sounds the same to you |

**What each result leads to.** Z1 fails for the first engine and passes for the fallback: build on the fallback. Both
fail: stop, write the report, and the entry is parked. Z2 or Z3 fails: only a short listening time (10 minutes) is
offered, or the work stops; your call. Z4 fails on speakers only: call g5. Z5 fails: try the other word (g1), else
stop. Z6 fails: stop, because a listener that breaks voice chat does not ship. Z7 fails: no stop; listening simply
ends at sleep and you start it again.

Step 0 also builds the three drawings for g2, g3 and g4, since they do not depend on the numbers.

### After a go: four phases, each ending in a Deck check, so the work can stop after any one

| Phase | What there is when it is done | Lanes (stars; who builds) | Waits on | Proved by |
|---|---|---|---|---|
| 1 | The listener exists, reachable only from a test button on the Developer tab, ten minutes at a time. Say the word and a question: a tone, and the heard words show on that tab. Every stop in g8 works | A the engine's set-up · B the listener · C the question's end · D1 the calls and the stops (each ★★★) · D2 the Kids lock watch and the test button (★★); all Sonnet high | step 0 go; g1, g7, g8 | P108G-LISTEN-01 to -05 |
| 2 | It asks quietly: with the panel closed, the question is asked into the open chat, and notices show the heard words and then the answer | E the watcher that sends it (★★★, Sonnet high) | phase 1; g4 | P108G-QUIET-01 to -05 |
| 3 | Anyone can turn it on: the switch, the warning, the mark, the listening time | F (★★★, Opus extra-high, after a Deck measurement of the Voice input section) | phase 2; g2, g3 | P108G-SWITCH-01 to -04, QA-FREE-PLAY-01, QA-LOOK-01 |
| 4 | Sleep and wake are handled; the speakers rule from g5 is in; the README and the troubleshooting page say what it cannot promise | G sleep and speakers (★★, Sonnet high) · H the words (★, Sonnet medium) | phase 3; g5 | P108G-SLEEP-01, P108G-SPEAKERS-01 |
| 5, not planned here | Truly always on, from the moment the Deck starts | its own short plan, after real play with phase 3 | g2 | |

Lanes A, B and C own different files and run together. D1 follows B and C, D2 follows D1, and E follows D2. Only
lane F changes what is on screen, so it is the one Opus lane. The security reviewer reads lanes A, B, D1, D2 and E
before each lands. The open-source reviewer reads lane A.

## 6. The checks

**By the rig, with recorded sound played into a pretend microphone**, the way the mic checks were run in October.

| Row | What is done | What must be seen |
|---|---|---|
| P108G-LISTEN-01 | The test button is pressed; a recording of the word and a question is played | A tone. The Developer tab shows the heard question, without the wake word, within 8 seconds of the last word |
| P108G-LISTEN-02 | Ten minutes of recorded talk with no wake word in it | No wake is counted |
| P108G-LISTEN-03 | The word, then silence | A tone, then it gives up within 6 seconds, and nothing is kept |
| P108G-LISTEN-04 | While listening: the microphone permission is turned off; the Kids lock comes on; the plugin is reloaded (with no game running) | Listening ends within 2 seconds each time, and no listening program is left running |
| P108G-LISTEN-05 | The mic button is pressed while listening | The mic button's recording works as it does today, and listening comes back after Stop |
| P108G-QUIET-01 | Panel closed, a game running; the word and a question are played | A notice with the heard words, then the answer notice. The open chat holds the question and the answer |
| P108G-QUIET-02 | The word and a question; cancelled within 2 seconds, once for each way g4 allows | Nothing is asked and nothing is saved |
| P108G-QUIET-03 | A question longer than 15 seconds | It is cut at 15 seconds and asked as heard |
| P108G-QUIET-04 | The word and a question while an answer is still being written | A notice that bonsAI is still answering; no second question starts |
| P108G-QUIET-05 | bonsAI's panel is open; the word and a question are played | The question is in the question box, and nothing is sent until Ask is pressed |
| P108G-SWITCH-01 | The switch is found and turned on with the D-pad alone | The warning comes first; "No" leaves it off; every stop on the way is visible |
| P108G-SWITCH-02 | The listening time runs out | It ends by itself with a notice, and the mark goes |
| P108G-SWITCH-03 | The switch is tried with the microphone permission off | It says why it cannot turn on, and offers the way to Permissions |
| P108G-SWITCH-04 | An old settings file with no trace of this feature | It loads, and listening is off |
| P108G-SLEEP-01 | Sleep and wake during a listening time | What step 0's Z7 result decided |
| P108G-SPEAKERS-01 | Game sound from the speakers, then from headphones | What call g5 decided |

**Only you can do these** (for the "checks only you can do" page):

- **Z3**: unplug the Deck for twenty minutes while the session measures.
- **Z5**: your voice, forty times.
- **Z6, the hand part**: Steam's own voice test while the listener runs.
- **P108G-KIDS-LOCK-01**, if the rig cannot turn Steam's parental lock on: lock it by hand during a listening time.
- **P108G-VOICE-YOURS**, after phase 2: one evening of real play with listening on. You note each wrong wake and
  each miss.
- **P108G-EAR-01**: the tone is loud enough to notice and not annoying.

## 7. What could go wrong, and what stops the work

- **Nothing can show "the microphone is open" over a game.** A Decky plugin draws only inside Steam's own menus. The
  tone at every wake, the notice with the heard words, and a listening time that ends by itself are the answer; a
  constant mark over the game is not possible. Step 0 tries one more route and expects it not to show.
- **A private conversation gets asked as a question.** The 15-second limit, the second check by the speech reader,
  the heard-words notice and cancel bound this. They do not remove it. The warning says so in plain words.
- **The engine's ready-made program crashes on the Deck's processor.** That happened to the speech reader in the
  summer. So the engine runs as its own program, is tested once before it is trusted, and a crash only ends
  listening.
- **A system update changes the Deck's Python or its sound system.** A failed start says "set it up again" and never
  blocks the mic button.
- **Asking by voice costs a game the same as asking by hand.** While an answer is written, a game loses about a third
  of its frame rate (measured in September). The wake word makes that easier to trigger, not cheaper.
- **What stops the work:** a failed line in step 0, as written in § 5; a "no" from either reviewer; any way found for
  sound or words to be written to disk or sent off the Deck; a listening program found alive after the plugin
  stopped.

## 8. Not in this plan

- Truly always on from start-up (phase 5, its own plan).
- **Headset mode, Voice follow-ups, Spoilers by voice.** Each needs spoken answers, and Read aloud was removed. What
  they would take from this plan: the "listen for a few words, then stop by itself" piece built for the question's
  end is the short listen Voice follow-ups asks for; Headset mode would be this plan's switch plus a returned Read
  aloud; Spoilers by voice needs both. They stay as filed until you call on Read aloud.
- A wake word you choose yourself, other languages, and cancelling the game's own sound beyond test Z8.
- Speaking the answer. Opening the panel by voice. Any spoken command other than a question.
- The early stop with a real voice on the small speech model. It is an open voice entry of its own, and plan 107's
  sweep may take it. Z5 will show whether it touches this feature.

## 9. For the one running the session

- **Two sessions.** Session one is step 0 and the drawings: one helper for the test kit, three for the drawings, the
  Deck driver for about four blocks, and the maintainer for Z3, Z5 and part of Z6. Session two, after the report and
  the calls, is the build: nine lanes, about 14 to 18 helper runs with second rounds, the reviewers about six times,
  the bookkeeper three times, five Deck blocks. Session two will not fit one five-hour window; plan a clean stop
  after phase 2.
- **Model.** Five stars: this file is the Fable plan, Sonnet high helpers build, Opus extra-high runs the session
  and lands. Lane F is Opus, after a measurement. The Deck driver and lane H are Sonnet medium.
- **First acts at go.** Read the usage counters. Run `git status` and list the planning folder for other chats' work
  (plan 107 holds the bug sweep and board 6). Re-find every file and line in the briefs at the tip. Put g7's question
  to the open-source reviewer before anything is fetched. Check nobody else is driving the Deck.
- **The Deck.** One driver at a time. Unload the Deck's AI before any game block. Never reload the plugin under a
  running game. Put the Deck back at the end of every block (the pretend microphone, the capture override file,
  every scratch file) and say so in an evidence file. Never print the settings file's values.
- **Reviewers.** Security: lanes A, B, D1, D2 and E, then the whole feature once at the end, against g8.
  Open-source: g7 and lane A. Pass each a model and an effort by hand (Sonnet high).
- **The bookkeeper is handed:** D145's g-calls as answered; the rows of § 6 as open rows when their phase lands; the
  step 0 numbers with their evidence files; the entry's move to Verify when phase 3 lands; the items for the "checks
  only you can do" page; and one stale line to fix (the briefs name it).
- **The step 0 report** goes into this file as a new last section, in plain words, numbers after meaning.
- **At the end, the two write-ups** the maintainer asked for: the code-work summary (files changed, what surprised,
  what would have made it easier) and the plain "how it was built" guide.
- **Stars.** Five is right for the whole road to always-on. Step 0 by itself is three; phases 1 to 3 together are
  four.
