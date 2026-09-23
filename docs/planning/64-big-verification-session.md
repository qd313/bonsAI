# Plan 64 — The big verification session

**Status:** written 2026-09-23, before anything ran. All ten questions in § 10 answered the same day, and
everything in § 11 done. Waiting only on the word "go".
**Purpose:** one long run on the Deck, mostly without the maintainer, that works through the roadmap's
Verify list and the knowledge base's owed checks. The roadmap is updated after every block, so it is never
behind the device. Bugs found along the way are written down and, where the effort is reasonable, fixed.
**Builds on:** [plan 61](61-automated-verification-session.md), the last session shaped like this one, and
[plan 63](63-bugfix-session-four.md), whose fixes most of this list is waiting to see. Where this file and a
row in [testing.md](../testing.md) or [testing-manual.md](../testing-manual.md) disagree, the row wins.
**Does, unlike plan 61:** fix bugs. New ones found tonight, plus whichever known ones § 10 says to include.
Every fix has a time limit (§ 7).
**Does not:** push code, wipe plugin data, change Steam's own settings, or build new features. It does
publish the 2026.09.18 knowledge-base library, on the maintainer's yes (§ 10, question 4).

Read first: [CLAUDE.md](../../CLAUDE.md), the model table in [AGENTS.md](../../AGENTS.md), and
[lessons-learned.md](../lessons-learned.md) § 3 (the Deck) and § 4 (briefing helpers).

---

## 1. What is on the list today

Forty-four entries, read on 2026-09-23 against their test rows and the Done list.

| Where | Entries | The rig can settle alone | The rig can settle once you answer § 10 | The rig takes the picture, your eyes decide | Only you |
|---|---|---|---|---|---|
| Verify — bugs | 20 | 10, plus 2 it will try | 1 | 5 | 2 |
| Verify — features | 15 | 6 | 6 | 1 | 2 |
| Evidence never saved | 1 (5 of 12 checks left) | 4 checks | 1 check | — | — |
| Knowledge base, Deck check owed | 8 | 5, plus part of 1 | 2 | — | part of 1 |

**Out of date, found while reading. The clean-up in flow 0 fixes these before any device time is spent:**

- *Session context folds into Show details* still says it failed on the Deck. The bug behind that failure
  was fixed and proved on 2026-09-21 and sits in Done. Its test row also says no steps exist.
- *The VAC check* says to run 02 to 06 once the smoke check passes. Both already happened (the smoke check
  on 2026-09-17, 02 on 2026-09-16). Only 03 to 06 are left, and they need the maintainer's Steam key.
- *The twelve checks with no evidence* — seven are done. Five remain.
- *Reaching Stop while a reply is being written is hard* (a one-star bug) is probably closed by the
  Down-goes-to-Stop fix. One walk proves both.
- **Four checks the roadmap names have no steps written anywhere:** Down going to Stop, the AI models
  screen handing the ring back, the models list height, and the speaker on a stopped reply.
- The maintainer's checks page was last refreshed 2026-09-19. The by-eye items from plans 62 and 63 are
  not on it.
- CLAUDE.md says the helper agent files are not in the repo. They are, and they are tracked.

---

## 2. What to focus on first

Ranked by how much each hour of Deck time closes, with slow and risky blocks last.

1. **Clean-up (flow 0, no Deck, about 20 minutes).** Stale entries waste driver time.
2. **The fixes from the last two sessions that the Deck has never seen (flow A).** About twenty entries.
   No game, no download, mostly one short walk each. The code is fresh, so a failure is cheap to fix. The
   D-pad fixes are what a person using the plugin notices most.
3. **One reply being written, and everything that needs one (flow B).** One question settles about ten rows.
4. **Knowledge-base checks, asked by naming the game (flow C).** No launch needed.
5. **Games running, one at a time (flow D).** The slowest block.
6. **Publishing the library, then downloads (flow E).** Mostly waiting, so it runs while fixes are being
   built.
7. **The maintainer's page and the report (flow H).**

Fix re-checks (flow F) and the two intermittent bug hunts (flow G) run between blocks.

---

## 3. Who does what

| Who | Model | What it does | What it never does |
|---|---|---|---|
| **The session** | Opus 5.5, extra-high | Writes every brief. Reads every failure. Decides pass or fail when the result is not clear-cut. Does the D-pad and layout fixes itself, with the driver's measurement in hand. Lands every fix. Decides what moves on the roadmap. Writes to the maintainer | Types roadmap or testing-doc edits (the bookkeeper does) |
| **Deck driver**, one at a time | Opus 5.5, medium | Runs one flow from a step-by-step runbook that gives every press and the expected landing. Measures, takes screenshots, and reads logs and settings over SSH. Writes one evidence file per row. Reports each row in plain words. Passes a row only when the result matches what the runbook expects; anything else goes back to the session | Edits any document. Fixes anything. Turns a failure into a pass. Drives while another driver is on the Deck |
| **Prep helper** | Sonnet 5, high | Writes steps for rows that have none. Turns the next flow's rows into a runbook in the scratch folder. Drafts new test questions | Touches the Deck. Decides pass or fail |
| **Bookkeeper** | Sonnet 5, high | After every flow: roadmap, testing rows, changelog, archive lines, and the maintainer's pages. Commits by file name | Invents a device result. Commits while a fix is being landed |
| **Fix helpers**, up to three at once | Sonnet 5, high | Fix bugs whose cause is already known, each in its own copy of the repo. One fix per commit, all checks green | Touch the Deck or the docs. Push |

**The driver needs a definition file.** Every existing helper runs on Sonnet. Flow 0 adds a
`deck-driver` helper (Opus, medium) beside the bookkeeper's, with the Deck rules written into the file
itself rather than pasted into each brief. In plan 61, drivers broke two rules their briefs spelled out. The rules to build in:

- Never press A on the question box. Fill it with the send-question script and send it with the Ask button.
- The Deck command shape is exactly `ssh deck@192.168.86.52 '<command>'`. Nothing goes between `ssh` and the address.
- List the evidence folder first. Never overwrite a file; every file gets a new name.
- Scratch files go in the session's scratch folder, never the repo root.
- Read what is visible, not just what has focus. For the question row behind Retry and the last answer
  section behind Copy, compare the words, not the box.
- Before a measurement, read which screen is live.
- Edit the settings file and reload the plugin at once. Put back only the keys you changed, to the value
  read just before the change.
- Opening the plugin fails once after every deploy or reload. Check whether it is already open first.
- Walk the AI models screen one press at a time. Remove from Deck is one press away from a model row.
- Any count varies the question's wording or clears the answer cache first.
- Try once before writing "blocked".

---

## 4. What runs side by side

The Deck is one screen with one highlight, so only one driver presses buttons at any moment. Everything
else is arranged around that.

| While the driver runs a flow | Between flows |
|---|---|
| The prep helper writes the next flow's runbook | The session lands finished fixes one at a time, with the full checks after each |
| The bookkeeper writes up the flow before | One deploy per batch of fixes, never in the middle of a flow |
| Fix helpers build in their own copies | Saved checks replay against the new build, then the fixed bug's own row runs (flow F) |
| Reads over SSH (logs, settings, which model is loaded) may run too, except during a timing row | One try at each intermittent bug (flow G) |

**Saved checks.** The rig can save a walk that passed and replay it after any later deploy, naming exactly
which stop moved. Only one saved check exists in this repo today. Every walk that passes tonight is saved,
so a fix landed later cannot quietly break something proved earlier.

---

## 5. Keeping it running without the maintainer

- **Keep-awake:** the rig's lock always lasts 30 minutes, whatever is asked for, so it is renewed at the
  start of every flow and every half hour. A left-stick click is the fallback: it resets the sleep timer and
  moves nothing.
- **Backup before anything:** the plugin's settings folder, which also holds the saved chats, is copied over
  SSH and checked readable. At the end, the live settings are compared against it to prove nothing was left
  changed.
- **Deploy:** once at the start, then once per fix batch. Each time, check the file fingerprints match on
  both sides and the loader came back.
- **The run stops itself** when the Deck stops answering, the rig's kill switch is thrown, another chat
  connects to the Deck, or the usage limit hits. The progress log says where it stopped and what is left.
- **Usage limit:** it stops every helper at once, mid-work. Their copies keep what they did, and each is
  resumed later with one short message. The session itself may need one "continue" from the maintainer
  after the reset. A phone is fine.
- **Status:** a short plain note in chat after every flow, with the roadmap commit that goes with it, and a
  status page the maintainer can open on a phone.
- **Permission prompts:** auto mode is on, and Deck commands use the one allowed shape. Anything that
  does prompt waits for the maintainer, so the plan avoids new command shapes.

---

## 6. The flows

Row names are listed so the driver and bookkeeper can find them; the plain meaning is in the roadmap.

### Flow 0 — setup (about 45 minutes, the Deck only at the end)

- The bookkeeper does the clean-up in § 1 and commits it.
- The prep helper writes steps for the four rows with none, and for the Session tab.
- The session adds the driver's definition file.
- The driver: Deck awake? Which screen? Back up. Deploy the tip. Check fingerprints. Take the keep-awake lock.
  Read which games are on the Recent Games row. Check whether any existing chat has a game attached.

### Flow A — fixes the Deck has never seen, nothing running (about 75 minutes)

| Rows | How |
|---|---|
| UI size setting (two stops, never Desktop) | Walk the slider. Then write the old Desktop value into settings, reload, and confirm it loads as Handheld with nothing moving |
| UI-SIZE-01 | At the biggest size, send a long question with the script; measure the typed text against its box |
| Show details chip ladder, Left and Right | Walk across the chips with the panel open; the chosen chip must change |
| MODELS-HUB-RETURN-01 | Open the models screen from the Ollama tab's button, close it, read where the ring lands |
| MODELS-LIST-CAP-01 | Count visible model rows and measure the list; name the screen it was measured on |
| ROUTING-NOOP-SAVE-01 | Fingerprint the settings file, open the picker, press Done without moving anything, fingerprint again |
| MODELS-FILTERS-01 | Each of the six filters on and off; the model count must change each time |
| PULL-FIRST-TICK-01 | Open the picker fresh, tick the first model; it must queue and not start. If a download starts, stop it and remove the model |
| MODELS-TYPE-B-01, PULL-MISSING-NAME-01 | Try writing the name into the box with the same method the send-question script uses. If that works, three rows stop needing the maintainer's thumbs. If not, they stay on the maintainer's page |
| For the maintainer's eyes: the cursor, the chip colour, the chip underline, the dots under the chat name, the plugin icon | Measure what can be measured (font sizes, the gap between the dots and the letters), then take the screenshots |

### Flow B — one reply being written, nothing running (about 90 minutes)

| Rows | How |
|---|---|
| ASKBAR-DOWN-TO-STOP-01, and the "Stop is hard to find" bug | Run first. While the answer arrives, Down from the question box must land on Stop |
| READ-ALOUD-07, a stopped reply | Stop part-way, then walk to the speaker; record what it does |
| NOGAME-MENU-01 | Strategy mode, a question that names no game; the menu must never say THIS GAME |
| SOFT-PREDICT-04 | A long question with no spoilers in it, so the reply reaches the length limit |
| THINKING-SANITIZE-01, THINKING-EMOJI-CLUSTER-01 | Sample the status line several times a second through five asks, each worded differently |
| SESSION-TAB-01 | Both tabs, Left and Right between them, Down into the Session tab, Clear's confirm box opened and cancelled |
| NOTES-BLOCK rows | Name a covered game in the question, open the note block, walk its chips |
| CHAT-MEMORY-01 | A follow-up that only makes sense with the earlier question behind it (see § 10, question 1) |
| CHAT-SLOTS-V3-06c | Close the Quick Access Menu while the answer is still arriving; the "reply ready" message must appear |
| CHAT-GHOST-REPLY-01 | Four times: switch to a brand-new chat right after a reply finishes (see § 10, question 1) |
| CHAT-SLOTS-V3-15d | A short recording of a new chat taking its title, for the maintainer's eyes |
| QA-FREE-PLAY-01 | A full walk after the reply finishes, and one while it is still arriving. The second is expected to fail until the streaming-walk bug is fixed |

### Flow C — knowledge-base checks, asked by naming the game (about 60 minutes)

| Rows | How |
|---|---|
| The credit line naming a note with no source page | A question answered from one of bonsAI's own hand-written notes |
| The "no close match" line | A question shaped like the Hollow Knight sighting, where the note used was attached second or later |
| W2-R5, "Not in my notes" | A Half-Life 2 question the notes do not cover; check the wording, and that no note card appears |
| KB-TRANSPARENCY-01, the rest | All three attached names checked against the log; a case where a note is dropped for space |
| Black Mesa's water question | Clear the answer cache, then ask the exact original words |
| Two of the checks with no saved evidence: follow-up memory, and which model stays loaded | Three questions in a row, reading over SSH which model is loaded before, during and after. Also read which of the two "how many models stay loaded" settings is really live |

### Flow D — games running, one at a time (about 2.5 to 3 hours)

The plugin only learns which game is running when it starts, so it is reloaded after each launch. The exit
tool is checked against the running processes over SSH, because Steam's own list has read empty before
while a game was still running.

| Game | What it closes |
|---|---|
| Half-Life 2 | CHIP-BUTTON-09 (the Tip dot, with the scrambling chip animation); KB-TRANSPARENCY-01 with a game running; TOKEN-BUDGET-01 on screen (Strategy and Expert with thinking on) |
| Hollow Knight or God of War | The spoiler-reveal check from the evidence gap. A question about a boss by role, reworded each try. If no spoiler box comes back, that is evidence for the open three-star spoiler bug, and the row is blocked rather than failed |
| Black Mesa | The wave-three evening check from the evidence gap (the corrected water note) |
| Hades | The Hades half of the wave-three check; the follow-up names the right boss |
| Deep Rock Galactic: Survivor | DRG-01b, if the game is on the Recent Games row |
| Any running game | CHAT-SLOTS-V3-14c, the game name above a chat's title, using an existing chat with a game attached if one exists |

### Flow E — publishing, downloads and the model switch (about 90 minutes, mostly waiting)

| Row | Needs |
|---|---|
| Publish the 2026.09.18 library | The publish script's own check first, which sends nothing. Then publish to both hosts. Confirm each host serves the new version before anything on the Deck depends on it |
| W1-R1 (the Update knowledge base button), TEN-GAMES-01's publish half | After publishing: press Update, and confirm the Deck reports 2026.09.18 from the public hosts, not the local copy |
| The two-taps download bug, and where the library lives | Only if § 10 question 10 says yes: remove the local library, then use the first-time download button. Check whether the first tap opens the storage choice, and pick the storage question 10 names |
| PULL-MISSING-NAME-01 | Only if typing into the box worked in flow A. A real small model plus a made-up name; the real one is removed afterwards |
| ROUTING-MERGE-01, the large-model half | Runs as written (§ 10, question 3): the high-memory switch on, the 17 GB model downloaded, it must land first in the try order. Then it is removed and the switch turned off. Its download runs while fixes are being built |
| PRELOAD-01, the timing | § 10, question 5 |

### Flow F — re-checks after each batch of fixes (about 20 minutes each)

Deploy, check fingerprints, replay every saved check, then run the fixed bug's own row.

### Flow G — the intermittent bugs, one try between each flow

- **The stuck panel:** its last known trigger was the question box and Steam's on-screen keyboard. One
  careful try per gap; if it appears, measure it before anything clears it.
- **A chat that is still writing does not look busy from another chat:** turn the plugin's activity log on,
  start a long answer, switch chats, and capture the log while it is happening. The roadmap entry says that
  capture is the one thing that would explain it.

### Flow H — wrap-up

Settings compared against the backup and put back. The saved chats restored if § 10 question 1 allows new
ones. The maintainer's checks page refreshed with tonight's screenshots, and the finished items dropped. The
report written into § 14.

---

## 7. Fixing bugs during the session

- **A failing check is written up first**, as a roadmap bug with its evidence, and fixed after that.
- **Who fixes:** cause known and not about the D-pad or layout → a Sonnet fix helper. D-pad or layout → the
  session itself, with the driver's measurement. Never a helper without a measurement.
- **Time limit:** two tries on the Deck per fix. If it still fails, the measurement is written into the bug
  and the session moves on. Anything that needs a design choice, or looks like more than about an hour of
  work, is filed and not fixed.
- **Landing:** one fix at a time, the full checks after each. Deploys only between flows.
- **Every fix gets a test**, and a D-pad row if it touches the D-pad. A fix is not done until the Deck shows it.
- **Known bugs in scope** (§ 10, question 2), all already measured: Up from Retry, the Open Permissions
  jump, walking a reply while it is being written (this also blocks the tab strip's last walk), walking down
  from the chat row skipping the answer, the walk down and up visiting different stops, a shared tip's
  source page never shown (code only), and the two start-up paths disagreeing on how many models stay loaded
  (only after flow C reads which one is live).
- **Not this session:** the spoiler safety net (a planned feature that needs its own session), and anything
  rated five stars.

---

## 8. Test questions

- **Nobody types a test question with their thumbs.** Questions go in through the send-question script,
  which was proved on 2026-09-22, or through pinned chips. The script's two traps: its options go inside the
  quoted remote command, and an apostrophe needs the Python list form.
- **Any count varies the wording or clears the cache first.** The answer cache serves an identical question
  back word for word.
- Sentences used in earlier evidence need no new approval. Each new sentence is written in the progress log
  before it is sent.

---

## 9. Bookkeeping

1. **A pass** moves three things in one commit: a line into Done, the full entry into the archive, and the
   testing row ticked with its evidence file named.
2. **A fail** becomes a Bugs entry at its star position, in plain words, with the evidence named. Then § 7.
3. **A row that could not run** says why in one line, after one real try.
4. **A new bug** goes into Bugs and into the session report in § 14.
5. **At least one commit per flow**, so the roadmap is never more than one flow behind the Deck.
6. Stage by file name. Never add everything. Never settle a roadmap or testing conflict by taking one side
   whole.
7. The maintainer's checks page is refreshed at the end, and the status page after every flow.

---

## 10. Questions for the maintainer — answers lock as D116

Each has a recommended answer, so "defaults" is a fine reply.

**Answered 2026-09-23, before "go":**

| # | Question | Answer |
|---|---|---|
| 1 | **New chats.** Four checks need a brand-new chat, and each new chat pushes out the oldest of the eight saved ones without warning. May the rig start new chats, with a full backup first and the eight chats put back exactly at the end? | **Yes, back up and restore** |
| 2 | **Which known bugs to fix.** Only new ones and blockers; also the D-pad bugs already measured and the small tip bug; or none | **New bugs, plus the measured D-pad bugs and the tip bug** |
| 3 | **A large downloaded model and the try order.** The maintainer's 19 September answer said models should be "tried in the order the user set". The code puts a large model downloaded with the high-memory switch at the top by itself. Which is right? | **Top, as built now.** The 17 GB check runs as written |
| 4 | **Publish the 2026.09.18 library** to the public download hosts, which unblocks three checks? | **Yes, publish it** |

**Answered 2026-09-23, after the plan was written — every question now has an answer:**

| # | Question | Answer |
|---|---|---|
| 5 | **The preload timing check** needs the model Ask uses to be under three billion parameters. On this Deck it is over. May the rig switch Ask to a small model for the timing, then switch it back? | **Yes** |
| 6 | **Two thinking-line checks** hunt a fault that has never appeared on the Deck. Close them after five clean tries, each worded differently, since the unit tests cover the fix? | **Yes** |
| 7 | **The last August knowledge-base check** (the library format gate) can only run by replacing the library under test. Retire it as covered by its unit tests? | **Yes, retire it** |
| 8 | **One knowledge-base row** says a reply built only on hand-written notes gets no credit block. The 21 September fix now names those notes under "No source page", which is the fix working. Reword the row to match? | **Yes, reword it** |
| 9 | **The screen.** The Deck's own screen, not the monitor? The models-list check is about the Deck's own screen | **The Deck's own screen.** The maintainer confirmed it is on, with bonsAI showing on the built-in screen |
| 10 | **Where the library lives after publishing.** Today it sits on the Deck's internal storage, put there from this PC on 18 September; before the wipe it was on the SD card. May the rig remove it and download it fresh through the plugin's own first-time download button? That also tests the bug where the first tap seemed to do nothing, which needs a Deck with no library installed. Which storage should it land on? | **Yes, onto the SD card** |

All ten lock as D116 in flow 0, written by the bookkeeper into the decisions file.

---

## 11. Before the maintainer leaves the Deck

**All done, 2026-09-23:** the maintainer reports the Deck awake on its own screen with bonsAI showing, Deep
Rock Galactic: Survivor started and exited, and no other chat using the Deck.

- **Wake it and leave it on, plugged in.** On 2026-09-23 while this plan was written, the Deck was not
  answering, so it was probably asleep.
- Leave it on its own screen, unless question 9 says otherwise.
- **Start Deep Rock Galactic: Survivor once, reach its menu, and quit.** It keeps falling off the Recent
  Games row, and the rig can only launch games on that row. If Hades, Hollow Knight, Black Mesa or Half-Life
  2 have not been played lately, the same for each.
- **Keep other chats off the Deck.** Two other chats were open when this plan was written: another bonsAI
  chat and a Decky Plugin Studio chat.
- Leave the controller bridge plugged in at both ends.

---

## 12. What stays with the maintainer

These are on the maintainer's page, or go there in flow H, and are not scheduled for the rig:

| Check | Why |
|---|---|
| The tab bar's ghost after a touch | Needs a finger on the screen |
| Clearing the cache while a reply is still arriving | Moved to the maintainer on 2026-09-21 after five tries |
| The kids lock | Needs a Family View PIN |
| VAC 03 to 06 | Needs the maintainer's Steam Web API key |
| Reduced motion | Steam's own accessibility setting |
| Doom 64's spoiler check | The game is not installed |
| Whether a preloaded model survives the Deck sleeping | Waking the Deck needs a person |
| Everything by eye | Screenshots are taken tonight; the pixels are the maintainer's call |

---

## 13. Things to know

- Known quirks that look like failures but are not: opening the plugin fails once after every deploy; the
  rig's build-match check can never pass on this Deck; the screensaver freezes animations.
- Deploying works. It was proved four times on 2026-09-21. If a deploy is ever refused, the fix is for the
  maintainer to run setup-dev.
- **Rough timing:** flow 0 about 45 minutes, A about 75, B about 90, C about 60, D about 2.5 to 3 hours, E
  about 90 minutes, and about 20 minutes per fix batch. About nine to eleven hours of Deck time in all, plus
  any pauses for the usage limit.

---

## 14. Progress log

Written as flows close. Nothing has run yet.
