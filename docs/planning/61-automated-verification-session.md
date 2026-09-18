# Plan 61 — The long automated verification session

**Status:** written 2026-09-18, just after midnight, before anything ran. Trimmed at 00:50 after a
reconciliation pass moved what the device had already proved. Waiting on the answers in § 8.
**Purpose:** spend one long unattended run on the Deck closing as many of the roadmap's Verify entries and
knowledge-base owed checks as possible, and hunting the bugs that only show sometimes, with the roadmap
updated after every block so its status is never behind the device.
**Builds on:** [plan 31](31-deck-verification-round.md) and [plan 34](34-feature-verification-round.md),
the two earlier rounds. Their progress logs hold everything already measured; this plan starts from what is
left today. Where this file and a row in [testing.md](../testing.md) or
[testing-manual.md](../testing-manual.md) disagree, the row wins.
**Does not:** change product code. A check that fails is written up as a bug with its evidence and the run
moves on. No fixing during the run. **Does not re-check bugs already confirmed on the device.** Anything
seen in passing is noted in the entry; nothing confirmed is scheduled.

Read first: [CLAUDE.md](../../CLAUDE.md), the model table in [AGENTS.md](../../AGENTS.md), and
[lessons-learned.md](../lessons-learned.md) § 3 (the Deck) and § 4 (briefing helpers).

---

## 1. What the list looks like after the reconciliation

Before anything ran, every Verify entry was read against its test rows. Five entries and one knowledge-base
fix had nothing left for the rig and moved to Done (the reasoning display, token streaming, the collapsing
tab bar, the chip-row glow, the glossary terms, and the follow-up menu fix). Seven more were behind what the
device had proved and were rewritten to say only what is genuinely left. Those edits are the bookkeeper's
first commit of the session (`afd2301`).

| List | Entries after the pass | The rig can settle tonight | Needs you, a decision, or something the rig cannot do |
|---|---|---|---|
| Bugs | 21 | 3 hunts (the focus trap, the ghost reply, the shoulder-button sighting) | 2 are code-only, 1 needs a finger, 1 needs your decision, the rest are already confirmed and wait for fixes |
| Verify, bugs | 7 | 5 | 1 needs a finger, 1 needs the wipe |
| Verify, features | 14 | 9, in part or in full | the PIN, the key, touch, and your eyes |
| Verify, evidence never existed | 2 | the dozen re-runs, and steps written for the three rows that have none | — |
| Knowledge base, Deck check owed | 6 | 4 | 1 waits on your publish step, 1 belongs to the phase 1 session |

**The Deck is not free right now.** Another session, the one building the notes block (58 phase 1), has a
live connection to the Deck, a five-hour keep-awake lease, and a plan to take four "before" readings on the
**old** build before it deploys anything. If this session deploys first, those readings are gone. This is the
first question in § 8 and nothing here starts until it is settled.

---

## 2. What to focus on first

Ranked by how many entries one block closes per hour of device time, with the cheap and safe things early
and the things that need a game or a download late.

1. **One long streaming reply, nothing running** (§ 5, flow A). One question, asked a few different ways,
   touches about fifteen rows: the two remaining thinking-line rows, the mid-answer cache clear, the two
   soft-cap rows, the chat-slot mid-stream rows, the reply-stops mirror, the free-play sweep both while
   streaming and after, and the ladder checks the evidence-gap batch wants on a real model reply.
2. **The tab strip's seven measurements and the About tab** (flow B). Pure geometry, no model, fifteen
   minutes. The strip landed yesterday and was never measured.
3. **The dozen checks whose evidence never existed** (flow C). You asked for these to be run together in
   the next automated session. Three of them fall out of flow A for free.
4. **The games block** (flow D). Half-Life 2, Hades, Portal 2, Deep Rock Survivor, one story game, Black
   Mesa, and the emulated Doom 64. Slowest block, so it runs once everything that needs nothing running is
   done, but not so late that a game problem has no night left to work around.
5. **The Ollama tab** (flow E). Only the parts you say yes to in § 8: the model pulls and anything that
   depends on the wipe.
6. **The bug hunts** (flow F). The two bugs that only show sometimes, the focus trap and the ghost reply in a
   new chat, get tried again between every block, on the recipe that last made them appear.
7. **Your own page** (§ 7). Refreshed at the end with tonight's screenshots, so your twenty minutes at the
   Deck is ready when you are.

---

## 3. Who does what

You asked for Fable at high effort to run the session and Sonnet 5 at high effort for the helpers, several
at once. The model table in AGENTS.md puts device testing on Opus at extra-high; Fable high is above that
and costs more per turn, which is your call and is noted here once.

**The Deck is one queue.** One screen, one focus ring, one set of buttons. Two drivers move the ring under
each other. So exactly one helper presses buttons at any moment, and the others do work that never touches
the screen. Up to four run at once.

| Lane | Model | What it does | What it never does |
|---|---|---|---|
| **The session itself** | Fable 5.1 high | Writes each helper's brief, reads every failure itself, decides pass or fail, decides what moves on the roadmap, answers you | Does not type roadmap or testing-doc edits (the guard hook refuses them; the bookkeeper does that) |
| **Driver** | Sonnet 5 high, one at a time | Runs one flow from a brief that lists every press and the expected landing; writes one evidence file per row under `docs/test-evidence/plan61-<row>.json`; reports each row in plain words with the file named | Never edits any document. Never decides to fix. Never launches a second game. Stops and reports if a press refuses |
| **Probe** | Sonnet 5 high | Over SSH only: the plugin log, which model is in memory, the settings file before and after each flow, the library's version and manifest, the build hash | Never touches the screen. Pauses during any timing row, because it shares the model server |
| **Prep** | Sonnet 5 high | Compiles the next flow's exact steps and expected results from the two testing documents into one scratch brief; writes steps for the three rows that have none; drafts the pinned-question batches | Never decides a pass or a fail |
| **Bookkeeper** | Sonnet 5 high | After each flow: moves the roadmap entries, ticks the testing rows, writes the archive lines and the changelog, commits by named paths only | Never invents a device result. Never runs `git add -A`. Never commits while another session is landing |

The driver is Sonnet because the rows are already written and the routing rule allows Sonnet to run written
rows. Every failure comes back to the session to read; a Sonnet driver reports what it saw and never argues
a fail into a pass.

---

## 4. Keeping the run alive without you

- **Keep-awake:** the studio's wake lock, taken for the full eight hours it allows, renewed at the start of
  every flow, released at the end. It changes nothing on the Deck; if the session dies the Deck just sleeps
  again. The left-stick click is the fallback idle-timer reset — measured inert in plan 34.
- **Before anything:** back up the plugin's settings folder and data folder over SSH into this session's
  scratch folder. The studio's own snapshot tool failed twice yesterday with a buffer error on this PC, so
  the copy is made by hand, then checked readable.
- **Deploy the newest build** and confirm the hashes match. Yesterday's chip and tab-strip work is on the
  Deck already; the wiki-reader commits since are back-end only. A deploy restarts the plugin loader, so it
  happens once, first, never mid-flow.
- **Settings go back the way they were found after every flow**, read off disk to prove it: the Developer
  tab switch, UI scale, the character, the Ask mode, the thinking level, the knowledge-base switch, the
  pinned chips.
- **The run stops itself** when the Deck stops answering, the studio's kill switch is latched, another
  session opens a connection to the Deck, or the usage limit hits. In each case the log says where it
  stopped and what is left. After a usage limit, each helper is resumed with one message, not restarted.
- **Status while you are away:** one short plain-language note in chat at the end of every flow, and the
  roadmap commit that goes with it. Screenshots that need your eyes are sent to you as files.

---

## 5. The flows — one setup, many rows

### Flow A — one long streaming reply, nothing running

Setup: newest build, a fresh chat, Strategy mode, thinking at Balanced, the character on as you use it.
Three questions, pinned as chips (see § 6): one that runs long, one about a story game named in the
question so the reply carries a hidden spoiler box and a two-button follow-up menu, and one that continues
past the length wall mid-menu.

| Rows this settles | How |
|---|---|
| CLEAR-CACHE-01, the mid-answer half | Park the ring on Clear cache, start the long question, clear while it is still writing |
| THINKING-SANITIZE-01, THINKING-EMOJI-CLUSTER-01 | Sample the status line every few hundred milliseconds through two asks: no two emoji-only phases in a row, and a sloppy status tag from the model still reads as a sentence |
| SOFT-PREDICT-04, SOFT-PREDICT-05 | The continue-mid-menu question; one ask with thinking Off on the same model |
| REPLY-STOPS-MIRROR-01, SPOILER-REVEAL reachability | **Moved to flow D.** A bug filed tonight shows a story-game question asked with nothing running comes back with no spoiler box at all, so the fenced reply these rows need must come from a story game actually running |
| CONTEXT-LADDER-03 case A, and case B on a real model reply | Open Show details on a model reply; record what Down does; both are evidence-gap re-runs |
| QA-FREE-PLAY-01, owed for the tab strip | Full walk while streaming, then again once finished; every stop focused **and** visible |
| The question-row-behind-Retry entry | Read the row's visibility on every walk tonight, at no extra cost; § 8 asks what to do if it reads full every time |
| CHAT-SLOTS-V3-05a (busy half), 05b, 06a, 06b, 06c | Start a long ask, shoulder-button to another chat mid-stream and back; close the panel as it finishes and watch for the toast |
| CHAT-SLOTS-V3-15d | A ten-second recording of a new chat taking its title, for your eyes |
| The three Tier 1 extras | One ask in Speed and one in Expert; close and reopen the panel and check the last question and answer are still there |
| ATTACH-DEBUG-01 | One ask with a screenshot attached; the reply must end with no bracketed line |
| STRAT-CHECKLIST-JSON-01 | Watched for in every reply all night; never scheduled |
| The shoulder-button-on-the-chat-row sighting from yesterday | Measured once; filed if it repeats |

### Flow B — the tab strip and the shell, nothing running

| Rows | How |
|---|---|
| TAB-STRIP-2A-01, 02, 04, 05, 07 | Rectangles of the strip, the six cells, the icons, the pills and the chat row's dots; then with the Developer tab off |
| TAB-STRIP-2A-06 | UI scale to 1.18, Apply, re-measure, set back |
| TAB-STRIP-2A-03 (your eyes) | Screenshots of the lit cell in green, gold, purple, grey and pink; the character set back after |
| ABOUT-LINKS-01, the last piece of SHELL-PAYLOAD-01 | Down from the language dropdown through all four links and back up; A on one opens Steam's browser |
| BONSAI-ICON-GEOM-01 (your eyes) | The tree icon cropped and enlarged from a capture |

### Flow C — the dozen checks whose evidence never existed

Three come out of flow A (the two ladder cases and the spoiler reveal). Three were already re-run on
2026-09-16. The rest:

| Check | How |
|---|---|
| FOCUS-GRAPH-DEV-KB-01 and KB-KILLSWITCH-01 | Developer tab walk; the knowledge-base switch reached, flipped, flipped back, read off disk |
| Model eviction on the Deck | The probe lane reads which model is in memory before, during and after three asks |
| Start-with-the-Deck check | Re-run as its closed row describes; the prep lane compiles the steps |
| W1-R1 update, the follow-up memory re-run, the wave-three Deck evening | Knowledge-base rows; each needs a game and a pinned batch, so they run inside flow D |

The three rows named on the roadmap with no steps anywhere (TAB-BAR-GHOST-01, KB-FOLLOWUP-01,
KB-KILLSWITCH-01) get their steps written by the prep lane, reviewed by the session, and landed by the
bookkeeper. The ghost row needs a finger and goes to your page; the two knowledge-base rows run tonight.

### Flow D — games running, one at a time

Launched and exited by the rig. The exit tool presses Confirm only when the dialog's button is labelled
exactly that; if it refuses, the game stays running, the log says so, and no second game is launched.
Settings change once per game.

| Game | What it closes |
|---|---|
| Half-Life 2 (covered by the notes) | CHIP-BUTTON-09 (the Tip dot); PRESET-ONE-LINE-04's decode-mode churn half; W2-R5 (the "not in my notes" line) with an on-game question the notes cannot answer; KB-FLOOR-01's on-topic half; KB-TRANSPARENCY-01 read against the log; KB-VARIANT-01 from the manifest |
| Hades (covered) | HADES-UNNAMED-STREAM-01 and a fourth try at HADES-UNNAMED-01; MEGAERA-01 read once to confirm the line still shows on the installed library; the wave-three rows that name Hades |
| Portal 2 (story game, covered) | STRAT-SPOIL-FIRST-01 (name the boss first, masking on) |
| Deep Rock Galactic: Survivor (covered) | DRG-01b and 01c (the knowledge base off, then absent) |
| God of War or Hollow Knight (story-protected) | REPLY-STOPS-MIRROR-01 and SPOILER-REVEAL on a fenced reply (a boss asked about by role, no consent words). If the reply still comes back with no box, that is more evidence for tonight's new three-star spoiler bug and both rows are blocked, not failed; the wave-three rows that need a story game |
| Black Mesa (not in the notes) | The negative coverage readings; the "What game am I playing?" Tier 1 extra |
| Doom 64: Retribution (emulated, known by name only) | STRAT-SPOIL-NAME-01 |

### Flow E — the Ollama tab, only what § 8 allows

| Row | Needs |
|---|---|
| PULL-MISSING-NAME-01 | Two small real pulls plus a made-up name; the two deleted afterwards |
| ROUTING-MERGE-01, the large-model-goes-to-the-top half | A large pull and the high-memory switch on — recommended to leave owed |
| PRELOAD-01 | Only if the Ask model on the Deck is under the three-billion cap; the probe lane reads it first |
| CLEAR-ALL-PREFIX-01's three flags | The wipe — recommended not tonight |
| The two-taps download bug | A Deck with no knowledge base installed — recommended not tonight |

### Flow F — the bug hunts, between every block

Two bugs only show sometimes. Each gets one try after every flow, on the recipe that last made it appear:

- **The focus trap:** start a brand-new empty chat while the Session context row is showing turns from
  another chat; press Down, Left and Right from the question box. Eleven tries so far, two hits.
- **The ghost reply in a new chat:** with a reply on screen, move to the new-chat position and press A;
  read whether the new chat shows the earlier reply.

Five clean tries each over the night is not proof, but it is five more than we have.

---

## 6. Pinned questions

Standing rule: no one types a test sentence with thumbs. Each flow's questions are pinned as chips, three at
a time. Sentences already used in earlier evidence files need no new approval; § 8 asks whether the session
may pin **new** sentences tonight without waiting, writing each one in the log.

Reused from earlier rounds: *how do i beat theseus and asterius* (Hades running), *how does the excursion
funnel work in portal 2*, *how do i beat the gonarch in black mesa*, *wheatley fight* (Portal 2), *how do I
beat the mother demon* (Doom 64), the Deep Rock Survivor and Half-Life 2 antlion sentences from plans 34
and 55. New sentences the prep lane drafts are listed in the progress log before they are pinned.

---

## 7. Bookkeeping rules

1. **A pass moves three things in one commit:** the roadmap line into Done, the full entry into the archive,
   the testing row ticked with the evidence file named. Never a strike-through, never an entry left behind.
2. **A fail is filed, not fixed:** a Bugs entry with the evidence named, at its star position, in plain words.
3. **A row that could not be run says why**, in its entry, in one line.
4. **One commit per flow**, so the roadmap is never more than one flow behind the device. The bookkeeper checks
   `git status` first and stages by path; the other session commits to the same branch in the same checkout.
5. **Your page** ([Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4))
   is refreshed once at the end: done items dropped, new screenshots attached, the list re-timed.

---

## 8. Questions for you — answers lock as D113

Each has a recommended answer so you can reply "defaults" from your phone, or name the numbers you want
changed.

| # | Question | Recommended |
|---|---|---|
| 1 | **The Deck is held by the notes-block session (58 phase 1).** It has a live connection, a keep-awake lease, and four "before" readings to take on the old build before it deploys. If I deploy first, those readings are lost. Do I (a) wait until it says it is done with the Deck, (b) have you tell it to hand over now, or (c) message it to take its four readings first, then hand over? | **(c)** — I message it; it takes its readings; then this session owns the Deck for the night and tells it so |
| 2 | **Model pulls.** Two small real models plus a made-up name, deleted afterwards? Which two are fine to spend disk on? | **Yes**, two under about a gigabyte each, deleted after. **No** to the large pull; that half of the try-order entry stays owed |
| 3 | **The wipe** (Clear all plugin data). It removes the Deck's Ollama and every model again. Two rows depend on it. | **Not tonight.** Those rows stay owed and say so |
| 4 | **Remove the knowledge base** to hunt the two-taps download bug? The notes-block session is about to install a new library. | **No.** Stays owed |
| 5 | **B while Show details is open.** Should B close the panel, or is today's behaviour accepted? | **B should close it.** The entry becomes a small fix for a later lane, not a verification item |
| 6 | **The question row behind the Retry icon.** Three readings disagree. If it reads fully visible on every walk tonight, may it close? | **Yes** |
| 7 | **Reduced motion** is Steam's own accessibility setting. May the rig walk Steam's settings to turn it on and off for the two reduced-motion rows, or do those stay on your page? | **Your page.** Walking Steam's own settings is the one thing tonight that could leave the Deck changed |
| 8 | **New pinned sentences** without waiting for your yes, each written in the log first? | **Yes, tonight only** |
| 9 | **Games.** Launch and exit Half-Life 2, Hades, Portal 2, Deep Rock Survivor, God of War, Black Mesa and Doom 64, one at a time? If the exit tool refuses, one may be left running. Is the Deck on power? | **Yes**; please confirm it is plugged in |
| 10 | **The relevance-floor row's off-topic half** contradicts the accepted "unrelated questions still get game cards" entry. Reword the row to match what you accepted, or reopen the entry? | **Reword the row** |
| 11 | **Your page.** Refresh it at the end with tonight's screenshots and drop what is done? | **Yes** |
| 12 | **The screen.** The built-in screen, not a monitor? | **Built-in** |
| 13 | **Six entries that are one step from Done, your call each:** (a) *Pulled models join the try order* — if question 2 says no large pull, close it and note the large-model case as untested? (b) *Clear all plugin data left three things behind* — the wipe removed every key that existed; the three flags this fix targets were not on the Deck to remove. Close as proven by its tests? (c) *Global quick-launch macro* — never run on hardware; shelve it? (d) *The game a chat belongs to* — the code for "show only when the row has focus" was never written, so it is a feature, not a check; move it back to Features? (e) *KB download Cancel* — no window to press it in without a throttle; shelve? (f) *A checklist the model got wrong* — only closes if the model misbehaves; close as unit-tested with a watch note? | **(a) yes if 2 is no, (b) yes, (c) shelve, (d) move back, (e) shelve, (f) close** |

---

## 9. Things to know

- **The other session's commits land on the same branch in the same checkout.** Its log commits and this
  session's roadmap commits interleave. The bookkeeper stages by path and never sweeps the index; if a commit
  of theirs is in flight, it waits.
- **The Deck's build is behind the tip** (153 local files against 190 on the device; different hashes). The
  first act after question 1 is settled is a deploy.
- **Some rows cannot be settled by the rig at all** and are not scheduled: the Family View lock (a PIN),
  the four ban-lookup cases (your key), every touch row, the point-release Hades note (waits on your publish
  step), the download Cancel (no window to press it in), the notes-block rows (not built yet), the memory-
  pressure preload case, and the suspend-and-resume path of the tab-bar remount.
- **Thirty-one helper copies of the repo are still on disk** from earlier sessions. Not touched tonight; worth
  a clean-up when you are back.
- **The exit-game tool has refused before** (plan 34 left Deep Rock Survivor running for you to close). It has
  since learned to press Confirm when the label matches exactly. If it refuses tonight, the log names the
  game and the rest of the games block is skipped rather than launching a second game.
- **Two library reads disagree.** On 2026-09-15 the rig read Portal 2 as not in the library and Doom 64 as
  not installed; a read over SSH on 2026-09-18 shows both installed. The driver reads the library again from
  Steam's own list before flow D and says which read was right.
- **Rough timing:** flow A about ninety minutes of device time, flow B fifteen, flow C thirty, flow D three
  to four hours with launches, flow E thirty if pulls are allowed, flow F ten per try. About seven hours end
  to end, without the pauses a usage limit would add.

---

## 10. Progress log

Written as flows close. Nothing has run on the device yet.

- **2026-09-18, 00:30** — Plan written against the roadmap and the two testing documents as of commit
  `623cba3`. The Deck answers and the controller bridge is up; another session holds a live connection and
  the build on the device is behind the tip. Twelve questions in § 8, all with defaults.
- **2026-09-18, 00:50** — The maintainer asked for anything already tested to come off the plan and move to
  Done. Every Verify entry read against its rows: six move to Done (the reasoning display, token streaming,
  the collapsing tab bar, the chip-row glow, the glossary terms, the follow-up menu fix), seven are rewritten
  to what is genuinely left (named chat slots, the thinking line, the soft cap, deferred manual QA, the
  spoiler box, the preset row, the shell smoke). Handed to the bookkeeper as one commit. The confirmed bugs
  are no longer scheduled for re-checks. Six one-step-from-Done entries became question 13.
- **2026-09-18, 01:15** — The bookkeeper's reconciliation landed as `afd2301`: six entries to Done, seven
  rewritten, five files, nothing else touched. Verify now holds 7 bug entries and 14 feature entries; the
  knowledge-base owed list holds 6. The other session is mid-run on the Deck tonight (its own rows for the
  notes block) and has filed three new bugs in the working tree, not yet committed: a follow-up menu that
  copies its own placeholder text when no game is known (same family as the menu fix just closed, a
  different leak); a boss asked about by role on a story game, nothing running, answered with no spoiler
  box on both Hollow Knight and Hades; and the "no close match" line judging only the first attached note.
  The second one changes flow A: the fenced reply the mirror and reveal rows need now has to come from a
  story game running, so those two rows moved to flow D.
- **2026-09-18, 01:35** — The other session handed the Deck over at 01:20: it had deployed the tip's code
  (commit `6d5b83f`) an hour earlier and no code has changed since, so no redeploy is needed. Keep-awake
  taken for eight hours. Settings and saved chats backed up off the Deck (72 MB, listing checked). The
  probe found the chat model reports 4.6 billion parameters despite its "2b" name, so the warm-up timing
  row stays owed on this Deck. **Three new test sentences, written here before pinning** (question 8's
  standing yes): *give me a very long, detailed guide to getting the most battery life out of my Steam
  Deck, covering every setting that matters* (the long reply); *give me a moment-by-moment walkthrough of
  every boss fight in hades from the first room to the end* (the continue past the length wall); *how do i
  beat the final boss* (with God of War running, meant to draw a spoiler box). Flow A's driver started.
- **2026-09-18, 02:05** — From the other session: the build on the Deck (`6d5b83f`) already carries the
  new "From the notes" row under a reply, between Show details and the Session context strip, and on this
  build **Up from the Session context strip skips that row**; its fix is coming and will be deployed during
  the hour it has asked for after flow A. So: a free-play sweep tonight that shows Down visiting the notes
  row and Up skipping it is that known, already-being-fixed gap, not a new bug, and is written up as such.
  The reply-stops mirror row must run on the fixed build, after the hand-back, or it will fail on this
  known skip. The tab strip is untouched by the fix, so flow B can run on either build.
- **2026-09-18, 02:40 — flow A done (01:05–01:55 on the Deck, build `6d5b83f`, nothing running).** Passed:
  the strip-trap re-run (evidence-gap batch), returning to a chat still writing, a thinking-capable model
  with thinking off, one ask each in Speed and Expert, the last question surviving a panel close and
  reopen. Failed: on a real model reply the two follow-up menu buttons cannot be reached by Down or Up (Down
  lands on the new notes row instead — yesterday's build reached them going down, so the notes row changed
  the walk; passed to the other session, whose fix to that row is coming); the busy-chat signs never show
  (no ring on the busy chat's dot, no spark, no green when done, the other chat's Ask reads ready) — a new
  two-star chat bug, three rows of evidence; the ghost reply in a new chat reproduced by accident right
  after creating the night's one new chat — second confirmed hit, close-and-reopen clears it. Blocked: the
  mid-answer cache clear (the D-pad walk to Clear cache takes 48 seconds, the reply took 43 — next try
  switches tabs with the shoulder button and asks a slower Deep question), the two remaining thinking-line
  rows (the faults never arose), the continue-past-the-wall row (the model refused to run long), the
  screenshot-attach row (the walk stalled). The free-play sweep walked 33 stops both ways with no dead end;
  its six partly visible stops are the known tall answer sections and copy-icon corner, nothing new; the
  streaming half is still owed. The question row beside the Retry icon read fully visible every time it
  came up. Creating the night's one new chat evicted the oldest saved chat, "bonsai:disable-sanitize" from
  31 August; it is in this session's backup. **Deck handed to the other session at 02:15** for its hour;
  the bookkeeper is recording the above. Flow B starts at the hand-back.
- **2026-09-18, 07:52 — the Deck handed back.** The other session stalled for hours mid-run and came back
  to find a game (Sifu) on screen at 07:50 with the plugin panel gone, so a person was probably at the Deck.
  What it left on the device: the tip at commit `0589565` deployed at 05:48 (its three screen fixes to the
  notes row, the reply row and the transcript), and the 2026.09.18 library installed on internal storage,
  which changed two settings (the library path from the SD card to the internal folder, and the library
  version from 2026.09.08 to 2026.09.18); nothing else in settings changed; the maintainer's chat carries
  ten more turns from its rows. At 07:51 nothing is running. Before any press: a read-only look at the
  screen, and a pause, because the Deck may be in a person's hands now.
- **2026-09-18, 08:35 — flow B done (about 08:00–08:30, build `0589565`, nothing running).** The tab
  strip measures as drawn: 300 by 66, six cells of 39, icons 22 tall and 6 below the cell top, the resting
  bar 300 by 20, the body top where it was on 2 September; five cells of 47 with the Developer tab off; icon
  boxes pixel-still through three tab switches; the pills hide on the chat row with the cells unmoved; the
  larger screen-size profile scales the whole strip evenly. The About tab's four links walk both ways and
  open Steam's browser — the last piece of the shell smoke, so that entry closes. **One fail:** the row of
  dots under the chat name is not covered by the strip at all; the strip ends at 130 pixels and the dots
  sit from about 133 to 137, so a person sees them poking out under the open strip. A new one-star bug;
  about 8 to 10 more pixels of strip, or the dots moved up, would do it. Five colour screenshots and two
  icon crops are captured for the maintainer's eyes. Every setting changed was read back to its found
  value. Flow C and the flow A retries started at 08:35 with a slower thinking level for a longer reply.
- **2026-09-18, 09:45 — flow C and the retries done (08:35–09:40, build `0589565`, nothing running).**
  Passed: the Developer tab's knowledge-base switch walk (the evidence-gap re-run, now with a file); the
  start-with-the-Deck switch, found on with a real startup entry, turned off (entry gone) and back on (entry
  back); a screenshot ask ends with no debug line. **New fail:** walking a reply with the D-pad while it is
  still being written loses the highlighted control — the view keeps following the new text and six of
  eight stops were off screen under the ring. A new two-star bug. **The ghost reply hit a third time**, now
  on a recipe: switch to a brand-new chat right after a reply finishes elsewhere, and the new chat shows the
  old chat's finished answer with a placeholder for the question; close and reopen clears it. The focus trap
  stayed clean (try one). Still blocked: the mid-answer cache clear, even with the shoulder-button shortcut
  (63 seconds to the button, the reply finished at 50) — a longer reply or a running game is needed, or the
  maintainer closes the half as tested by code only. Two side notes: the pinned chip cut the long sentence
  at 160 characters; and the plugin log says the screenshot went to the model at full size because the
  image-shrinking tool is not on this Deck. Games block started at 09:45 with Half-Life 2, Hades, Portal 2.
- **2026-09-18, 11:00 — games block part one done (09:45–10:50, build `0589565`, library 2026.09.18).**
  Half-Life 2, Hades and Portal 2 all launched and exited by the rig. **The three-star focus trap hit
  twice, and its trigger is now known:** pressing A on the question box opens Steam's on-screen keyboard;
  after B closes it, Down and Right from the box move nothing a person can see (the browser's own focus
  moves, Steam's ring does not), and only Up escapes. It survived a panel reopen and a full menu close and
  reopen, hit again in a new chat with Hades running, and had cleared by the time Portal 2 ran. Three tries
  on the 15 September new-chat recipe came back clean the same night, so the keyboard is the recipe, not
  the new chat. Part two's driver has a step list to find out which action clears it. Passed: naming the
  boss first in Portal 2 keeps the answer plain; the chip crawl runs at a flat 60 frames a second in decode
  mode; the chat model leaving memory mid-answer was caught happening; "what game am I playing" answered
  right with Half-Life 2 running; the hybrid-search switch flips its setting. **Failed:** real Half-Life 2
  tips showed in the chip with no Tip dot before the label. Blocked by the trap and being retried now:
  the Megaera spelling check, the two unnamed-boss checks, the follow-up search, the wave-three Hades
  batch, the "not in my notes" line, the relevance floor, the transparency check. Not runnable tonight:
  the pre-bump corpus check (no such corpus on the Deck) and the knowledge-base update button (it would
  replace the library under test). Part two started at 11:00: God of War, Black Mesa, Deep Rock Survivor,
  Doom 64, then Hades and Half-Life 2 again.
- **2026-09-18, 12:40 — games block part two done (11:00–12:35, build `0589565`, library 2026.09.18).**
  Deep Rock Survivor, Hades, Half-Life 2 and Sifu launched and exited by the rig. **God of War, Hollow
  Knight, Black Mesa and Doom 64 could not be launched:** all four are installed, but none is on the Recent
  Games row, the only list the launch tool can search — so the fenced-reply mirror row, the spoiler reveal,
  the by-name-only spoiler row and Black Mesa's own rows are blocked until someone plays each game once
  (or the studio tool learns the library grid; raised as a finding). Sifu stood in for Black Mesa and the
  notes-coverage readings for an uncovered game passed. **The focus trap now hits on nearly every send with
  a game running,** and it was diagnosed on the fixed step list: after a chip fills the box and Ask is
  pressed, the press left no line in the plugin log, the box emptied to its placeholder, and the visible
  ring stuck on the box (Down and Right dead, Up works) while the browser's own focus sat on a button. Up
  and back did not clear it; switching tabs brought the two focus readings back into agreement but Down was
  still dead; reopening the plugin panel alone left the ring stalling partway through an old reply; **closing
  the whole Quick Access Menu and reopening cleared it.** So every knowledge-base row that needs a question
  sent with Hades or Half-Life 2 running is still blocked: the Megaera spelling check, the follow-up search,
  the two unnamed-boss checks, the wave-three batch, the "not in my notes" line, the relevance floor and the
  transparency check, plus Deep Rock's knowledge-base-off row. One driver mistake: three earlier blocked-note
  files were overwritten instead of getting a retry name; their content was only the blocked note. Next: one
  more driver tries those rows with the menu close-and-reopen as a per-question workaround, two hours at most.
- **2026-09-18, 13:05 — games block part three done, and the device work ends (11:40–12:55, build
  `0589565`, Hades running).** One question got through: a Hades boss asked about by role, with the game
  running and streaming on, came back fully open — no mask chip while streaming, no box after — so the
  other session's three-star spoiler bug is not limited to nothing-running; two rows fail onto it. Then a
  new fault: the pinned test sentences stopped appearing in the chip after that first send, and nothing
  brought them back (reopen, re-save, fresh chat, the force switch) — a new one-star bug that blocked the
  Megaera check, the follow-up search and the hybrid switch's wording half. Half-Life 2 had fallen off the
  Recent Games row, so its three rows could not run either. The trap did not fire on that one send.
  **Nothing left tonight can run without a fix:** every remaining row needs a question sent with a game
  running (the trap, the pinned chips) or a game the launcher cannot reach. Deck released at 13:05,
  nothing running, settings as found except the two library keys the other session changed on purpose.

## 11. Where it ended, and what is left

**Closed to Done tonight (eleven):** the reasoning display, token streaming, the collapsing tab bar, the
chip-row glow, the glossary terms, the follow-up-menu fix, the shell smoke, the screenshot debug line,
the preset row's scrolling labels, deferred manual QA, and the rows-with-no-steps entry.

**New bugs (six) and one big lead:** the busy-chat signs never show; walking a streaming reply loses the
control; the dots peek out under the open tab strip; real note tips carry no Tip dot; the pinned test
sentences stop showing; and the three-star focus trap now has a trigger (a chip fills the box, Ask is
pressed, nothing reaches the log, the box empties, Down and Right die) and a cure (close the whole Quick
Access Menu and reopen). The ghost reply in a new chat is reproducible on demand. Fix the trap first: it
blocks every knowledge-base row with a game running.

**Blocked, and by what:** the Megaera spelling check, the follow-up search, the hybrid switch's wording,
the "not in my notes" line, the relevance floor, the transparency check, Deep Rock's knowledge-base-off
row (the trap and the pinned-chip fault); the reply-stops mirror, the spoiler reveal, the by-name-only
spoiler row, Black Mesa's rows (games not on the Recent Games row — play each once); the mid-answer cache
clear (the reply finishes before the button is reached); the pre-bump corpus check and the knowledge-base
update button (would replace the library under test); everything that needs a finger, a PIN, a key or the
wipe (the maintainer's page).

**Owed to the maintainer:** the answers to § 8 question 13; a yes or no on the question row beside the
Retry icon (fully visible on every walk tonight); whether Sifu at 07:50 was them; the four games played
once; the model pulls (never confirmed, so never run).

