# 36 — The feature-building session

Written 2026-09-05, before any code was written. The maintainer asked for a plan first: which features,
in what order, what runs side by side, how each one is proved on the Deck, and what needs their word.

This session runs **alongside** the second bug-fixing session, [35-bugfix-session.md](35-bugfix-session.md),
which another chat started the same day and which is holding the Deck. Section 1 is about staying out of
its way; that is the single biggest risk here.

Read first: [CLAUDE.md](../../CLAUDE.md); the model and effort table in [AGENTS.md](../../AGENTS.md) § 3;
the ground rules at the top of [26-thursday-bugfix-sesh.md](26-thursday-bugfix-sesh.md);
[35-bugfix-session.md](35-bugfix-session.md) § 2 and § 4 for what the other session owns.

---

## 1. What is true right now (checked 2026-09-05, nothing changed)

- **Another chat is running the bug-fixing session and is driving the Deck.** Its plan file is on disk
  but not yet committed. Its five helpers own: the chat transcript, the question bubble, the reply
  button row, the ask hook, the Main tab body, the prompt text, the knowledge base and embedding
  services, the scroll helper, and the spoiler block.
- **The maintainer's calls for this session, given 2026-09-05:** the other chat finishes on the Deck
  before this one touches it; scope is the small clean set, not the whole list; this session works on
  its own branch and merges once at the end; and while they are away it may deploy, restart the loader,
  change settings on the device and put them back, launch and exit games, and log and fix what it finds
  — but **must not wipe plugin data.**
- **The tree is clean** apart from the other chat's plan file.
- **The four gates pass on a clean tree** (types, frontend tests, Python tests, build), per the repo's
  own note. This session re-checks that before it starts.

## 2. The list, and what was cut

There are about **forty** roadmap features at four stars and below. Sorting them honestly:

- **About eighteen are not building work at all** — decisions, research spikes, or entries that say
  "decide something else first". Examples: the connection doctor (a rival entry has to be ruled out
  first), the web permission, the parser for controller layouts, the two SteamOS ideas.
- **Three are already built** and only owe a Deck check.
- **About seven of the rest live in files the other chat's helpers own** — the fade cue on a cut-off
  question, the chip-row glow, Show details becoming a divider, fewer stops on a finished reply, the
  session-context fold, the transcript height, and terse mode.

That leaves the set below.

### 2a. Two entries that looked good and are not buildable as written

Both are findings from this planning pass and go into the roadmap when this branch merges.

| Entry | What checking found | What happens to it |
|---|---|---|
| ★★★ **Search density** | **There is no search box anywhere in the plugin.** No component takes a query or renders a result list. The long note repeats the goal — tighter rows, highlighted matches — and names no target. Nothing exists to make denser. | **Dropped by the maintainer, 2026-09-05.** The entry comes out of the roadmap with a line saying why, in the merge commit at the end. |
| ★★ **Replace the bonsAI tab icon with the redesign's** | **The redesign has no icon in it.** The big redesign document sizes the tab cells and their icons but never draws a new tree. There is no other drawing in the design folder. Building it means a model inventing a shape, and the routing policy says shape work needs a drawing or a person's eyes, not a stronger model. | **Stays open, waiting on a drawing from the maintainer.** The entry gains a line saying that is what it is waiting for. |

### 2b. The six that are confirmed buildable

Checked in the code, not just read off the roadmap.

| # | What a person gets | Where it lives | New setting? | Clashes with the other chat? |
|---|---|---|---|---|
| 1 | **Type any Ollama model name into the pull picker** instead of only choosing from the built-in list, with a pin for "use this for Ask" and a *New* badge for thirty days. | the pull picker and its catalogue, the pull service | no | **no** |
| 2 | **Fresh preset prompts on the chip row**, refreshed for the features that shipped since wave one. | the preset strings file and its test | no | **no** |
| 3 | **A first quick question that does not wait for the model to load** — the default Ask model is warmed at boot. Behind a developer switch first. Small models only, skipped quietly when memory is tight. | the Ollama service, the Developer screen | yes, one developer switch | **no** |
| 4 | **One preset chip instead of two, if you want the label to have the whole column.** Two stays the default. | the preset row layout, the Settings screen | yes, one choice | **no** |
| 5 | **Separate slow-warning and give-up times for each Ask mode**, instead of one pair for all three. | the Settings screen, the Ollama screen, the reply's slow notice | yes, per mode | **yes** — the reply's slow notice is in the chat transcript, which the other chat's first helper owns, and the Main tab body, which its second helper owns |
| 6 | **Replies always arrive word by word.** See § 2e — the switch is a developer one, so what changes for an ordinary person is the behaviour, not the screen. | the settings shape in both languages, both agreement files, the Developer screen, the plugin root, the ask service | **removes** one | **yes** — the plugin root is the other chat's second helper's |

Because of that last column, **five and six go last**, after the other chat's work has landed.

### 2c. What the maintainer chose for the sixth slot

**Streaming becomes the default and the switch is deleted** — decided 2026-09-05, and confirmed
separately as a yes on its own merits. Three things that go with it, all from the roadmap entry:

- It is a change in **both languages**, and where they disagree, **Python wins**.
- Both agreement files that guard the settings shape lose the key, so the two-language edit has to be
  complete or a test fails.
- **An old settings file on a real Deck must not read as a reset.** Someone upgrading with the switch
  turned off must not have every other setting snap back to its default. That is the one that needs a
  test written before the code.

Because this is settings-shape work in the same files as the three new settings, **I do it myself**,
in its own commit right after them, rather than handing it to a helper. Its own commit so that if it
goes wrong on the device it can be undone without taking the three new settings with it.

The tab icon and the model-residency question were both left for another time.

### 2e. What the streaming change actually is (measured 2026-09-05, before any code)

Worth writing down, because the roadmap entry reads as though a person is losing a switch they use.

**They are not. The switch is on the Developer screen, labelled "Token streaming (experimental)",**
and it is **off by default today**. There is no streaming control anywhere on the Settings or Ollama
screens. So:

- **What changes for an ordinary person:** replies start arriving word by word instead of landing in
  one lump. That is the whole user-visible change, and it is a real one.
- **What changes for a developer:** one switch disappears from the Developer screen.
- **What changes for this project:** every test row that had to be run twice, once with the switch on
  and once off, becomes one row. That is the payoff the roadmap entry was after.

**The size of the job, counted rather than guessed:** the setting's two names appear **27 times across
14 files**. That is well under the eighteen-file, thirty-edit cost this repo records for *adding* a
setting, because this one was never threaded into the per-tab plumbing the way a Settings control is.
It reaches the Developer screen and the ask service and nothing else.

The edit points, so wave two is mechanical rather than a hunt:

| Where | How many | Note |
|---|---|---|
| the plugin root | 4 | **contested** — the other chat's second helper is in this file |
| the Developer screen | 6 | includes the switch itself |
| the Developer screen's payload | 5 | |
| the settings hook | 2 | |
| the settings payload builder, the shape, the normaliser | 1 each | |
| the Python settings service, the ask service | 1 each | Python is authoritative where the two disagree |
| the two agreement files and the tests that assert them | the rest | the shape files must lose the key or a test fails |
| the recorded preview results | 6 | historic result files — read, do not rewrite |

**The one real risk stays the upgrade**, and it is not in that table: a settings file already on a
Deck still carries the key. Loading it must drop the key quietly and leave every other setting alone.
That test is written before the removal, and it is the first thing checked on the device.

### 2d. Deliberately not this session

Everything needing a corpus rebuild or a schema bump (the extended-retrieval track three, the
"starting out" card, the versus content). Everything marked as a spike or a discovery. The tiered
spoiler setting, which needs prompt wording written per tier before any code. Anything about the
highlight ring, which the routing policy will not give to a helper without a device measurement first,
and the device is busy.

## 3. What the maintainer decided, 2026-09-05

All answered before any code was written. Nothing in this plan is now waiting on them.

| Question | Answer |
|---|---|
| How do the two sessions share the Deck? | The other chat finishes first, then this one gets it. |
| How much scope? | The small clean set, not the whole list. |
| Where does the work land? | Its own branch, merged once at the end. |
| What may run unattended on the device? | Deploy, restart the loader, change settings and put them back, launch and exit games, log and fix what turns up. **Not** wiping plugin data. |
| The sixth feature? | Streaming becomes the default. |
| Streaming as the default, on its own merits? | Yes. |
| The search-density entry? | Dropped. |
| The tab icon? | Left open, waiting on a drawing. |

Two small things are still theirs to look at, and neither blocks anything: the tab icon drawing, and
whether the model-residency question is worth answering later.

## 4. Order of work

### Wave 0 — me alone, before anything else

1. Cut a branch off the current tip so nothing interleaves with the other chat's commits.
2. Confirm the four gates are green on it.
3. Write the helper brief for this session. **The brief on disk is out of date** — it tells helpers to
   move roadmap, test and changelog lines themselves, and the newer policy says the person running the
   session does all of that. The other chat is also fixing that file, so this session does **not** edit
   it; the corrected rule goes into each helper's own task instead.
4. Work out the settings change as one diff, ready to apply but not applied yet — three settings added
   and the streaming switch removed. It touches the plugin's root file, which the other chat's second
   helper is also in, so it waits.
5. Write the upgrade test first: an existing settings file from a real Deck, with streaming switched
   off, must load with every other setting intact. That test is written before the removal, not after.

### Wave 1 — two helpers, starts immediately, nothing shared

| Helper | Feature | What it owns |
|---|---|---|
| P | 1, the custom model in the pull picker | the pull picker, its catalogue, the pull service and their tests |
| T | 2, fresh preset prompts | the preset strings file and its test |

Two only, on purpose. Every other candidate either needs a new setting — and all settings work funnels
through the same handful of files — or waits on the other chat.

While they work, I do the read-only preparation for wave two and watch for the other chat's landings.

### Wave 2 — starts when the other chat lands, three helpers

The trigger is automatic and needs nobody awake: when new commits appear on the shared branch and the
bug entries have moved into the waiting-for-a-Deck-check list, I rebase this branch onto them and start.

First I apply the settings work myself in **two** commits, in this order:

1. **The three new settings**, in both languages, with their Settings and Developer controls wired up
   but doing nothing yet, and their D-pad navigation entries.
2. **The streaming switch removed**, in both languages, with the upgrade test from wave 0 passing
   first. Separate commit so that if it goes wrong on the device it can be undone on its own.

That turns the one place everything would have collided into two commits, and lets the helpers work in
parallel afterwards.

| Helper | Feature | What it owns |
|---|---|---|
| R | 3, warm the model at boot | the Ollama service and its tests |
| S | 4, one chip or two | the preset row layout and the chip components |
| Q | 5, per-mode times | the reply's slow notice and the Ollama screen's warning |

Then, once the removal has landed and the gates are green, one more short pass by me: delete the code
paths that only existed to serve the off position, and collapse the test rows that ran twice.

### Wave 3 — landing, me alone

Each helper's commits are read as a diff, then taken onto the branch one at a time, oldest first. All
four gates plus the highlight checker run after every one. I move every roadmap, test and changelog line
myself, one commit per landing.

### Wave 4 — the Deck, me alone, one thing at a time

Only after the other chat says it is finished with the device.

1. Deploy once, reopen the panel — the first open after a deploy always fails, by design — and prove by
   hash that the Deck is running this exact build.
2. **The upgrade check goes first**, because it is the only one that could lose a person's settings:
   copy the Deck's real settings file aside, put a copy back with the streaming switch still in it, open
   the panel, and read every other setting back off disk. They must all still be what they were. If
   they are not, that commit comes out and the rest of the pass stops.
3. Then each feature in the order it landed, using the controller rig, asserting that each control is
   **visible** and not just highlighted. A control hidden behind the dock passes a highlight check and
   fails a person.
4. A pass moves three things in one commit: the roadmap line into the done list, the full entry into the
   archive, the test row ticked. A failure is written down with its evidence file named and the entry
   stays where it is.
5. Then a free walk of every screen with a game running.
6. Settings go back exactly as they were found and are read off disk to prove it.
7. **Plugin data is not wiped.** The maintainer withheld that.

### Wave 5 — the report and the merge

A short written summary. Everything found and not fixed goes into the bug list with its evidence.
Then the merge back to the shared branch, with the roadmap conflicts resolved **by hand, entry by
entry** — never by taking one side of the file wholesale, which has lost work here before.

## 5. Who does what

**Me: Opus at extra-high effort. Helpers: Sonnet 5 at high effort, at most five at once, and never
more than three in wave two.** That is what the routing table asks for a feature session at these star
levels. The one refinement that matters: no helper gets a highlight or layout job without a device
measurement in hand, which is why none of the highlight features are in scope.

## 6. Rules for this session

1. One feature per commit, all four gates plus the highlight checker green between commits.
2. Helpers hand back code, tests and one paragraph. They never touch the roadmap, the test docs or the
   changelog, never touch the Deck, never push, and never edit the generated architecture files.
3. Every helper checks it is building on the right base before it does anything. Helpers here have
   started up to four hundred commits behind before.
4. A failure on the device is written down with its evidence named, not argued with.
5. If a device result contradicts the code, check the installed build's hashes before believing it.
6. New Settings and Developer controls need an entry in the D-pad navigation rules **before** the
   control is written.
7. Do not sink time into something that turns out to be hard. Make a good effort, write down what was
   learned, move on.
8. Do not push. Do not wipe plugin data.

## 7. The device checks, written before the code

Drafted 2026-09-05, before any feature was built, so nothing here was written to fit what got made.
Each row moves into [testing.md](../testing.md) in the same commit as its feature lands, not before.

Two rules apply to every row below, both earned:

- **A control that is highlighted is not necessarily on screen.** Check the control's rectangle against
  the top of the dock every time. A row that only asks "did the ring land on it" passes while the
  control sits behind the question box.
- **Screenshots off this device are unreliable, so measure instead.** Read positions and text, not
  pictures.

| Feature | Row | What the device has to show |
|---|---|---|
| 1, custom model pull | `PULL-CUSTOM-01` | Open the pull picker, reach the new text field by thumbstick only, type a real library name that is **not** in the built-in list, pull it. It appears in the installed list and can be asked a question. The field's rectangle must sit clear of the dock. |
| 1 | `PULL-CUSTOM-02` | Type a name that does not exist. A message appears that names the problem and says what to do. No silent nothing, no raw error text, and the picker stays usable afterwards. |
| 1 | `PULL-PIN-01` | Pin a model as the one Ask uses. Close the panel, reopen it, and the pin is still there. Ask a question and Show details names that model. |
| 1 | `PULL-NEW-BADGE-01` | A model pulled today reads **New**. A model pulled more than thirty days ago does not. Check both in the same sitting, since one without the other proves nothing. |
| 2, fresh chips | `PRESET-EXPAND-W2-01` | With no pinned test batch, watch the chip row for a full minute and write down every chip that comes round. At least three of the new prompts appear. Pressing A on one fills the question box with that exact wording and does **not** send it. A prompt that switches the Ask mode does switch it. |
| 3, warm at boot | `PRELOAD-01` | Restart the loader, wait for the plugin to settle, then ask one quick question and time it. Compare against the same question with the switch off, from a cold start. The warmed one is faster; write both numbers down whatever they say. |
| 3 | `PRELOAD-02` | With a game running and memory under pressure, the warm-up is skipped and nothing on screen mentions it. No error, no stuck status line, no slower first question than without the feature. |
| 4, one chip or two | `PRESET-SLOTS-01` | Set it to one. The row shows one chip and its label has the whole column — measure the label's width against the 300-pixel column, do not judge by eye. Left and Right still move through the list. The dock does not change height. |
| 4 | `PRESET-SLOTS-02` | A settings file with nothing chosen still shows two chips. This is the row that proves the default did not move. |
| 5, per-mode times | `LATENCY-PERMODE-01` | Set a deliberately short give-up time for Speed only. A Speed question gives up at that time and says so in a way a person can act on. The same question in Strategy does **not** give up, proving the three modes are genuinely separate. |
| 6, streaming | `STREAM-UPGRADE-01` | **Runs first, before any other row.** Copy the Deck's real settings file aside. Put back a copy that still carries the old streaming switch. Open the panel. Read every other setting back off disk: all of them unchanged. If any setting moved, that commit comes out and the pass stops. |
| 6 | `STREAM-DEFAULT-01` | On a settings file that never had the switch, ask a long question. Words appear as they are written, not in one lump at the end. The Developer screen has no streaming switch on it. |

## 8. Progress log

**Wave 0, done.** Branched off the other session's latest work at `7d30656`. All five gates green on it:
types clean, 971 frontend tests across 121 files, the Python suite, the build, and the highlight
checker. Two helper copies of the repo made. A corrected helper brief written — it lives outside the
tracked tree, so it is not committed and will need writing again in a later session.

**Wave 1, done.** Both features landed with their roadmap, testing and changelog lines moved.

- **Fresh chip prompts.** Six new chips: thinking mode, the kids lock, the Caveman reply style, where
  game tips come from, named chats, and asking about a game that is not running. Two of the six named
  things that sounded made up — the Caveman reply style and the four thinking levels — and both are
  real, so they stand. Row **PRESET-EXPAND-W2-01**.
- **The custom model pull.** All three parts in one commit: type any library name and pull it, a star
  that makes a model the one Ask reaches for, and a **New** label for thirty days. **No new backend
  method was needed** — the pull job already took a name and already checked it against the real
  library, returning a reason a person can act on. Rows **PULL-CUSTOM-01**, **02**, **PULL-PIN-01**,
  **PULL-NEW-BADGE-01**.
- **One thing reviewed and changed on landing:** the key that remembers when a model was pulled was
  defined inside the picker; every other key the plugin keeps on the device lives in one file for
  exactly that reason. Moved, no behaviour change.
- **One thing reviewed and left alone:** the **New** label is kept on the device rather than on disk,
  because nothing anywhere recorded when a pull happened. The consequence is honest and is written into
  its check — a model installed before the picker was ever opened is never labelled New.

**Also done while waiting, and it belongs to wave two.** Before deleting the streaming switch, there
needed to be a check that a settings file still carrying it does not disturb everything else. There was
none: all thirty-one existing cases cover a bad *value* for a setting that still exists, not a *key* the
code no longer knows about. Added as a thirty-second case. Both languages already did the right thing,
so nothing changed except that it is now guarded.

**The other session landed, and it changed this plan in two ways.** It put nine fixes down, and one of
them is **the glow when the chip row runs out of chips** — which was on the shortlist here. It is
theirs, it is built, and it comes out of this plan. The rest of what it landed is now merged in, so the
files this session was avoiding are free.

**The merge needed resolving by hand in three places, and this is the part worth keeping.** Neither
side could be taken whole. They had moved four fixed bugs into the waiting list; a third session had
reorganised every knowledge base entry into a section of its own. Taking either side would have
silently deleted the other's work. Every entry was checked to still exist somewhere before anything
was dropped — all eight did. The last one needed a second look: it had been **renamed to plainer
wording**, not deleted, which is exactly how a careless resolution loses something.

### Correction: wave two is one helper, not three

The plan said three helpers. That was wrong, and the reason is the same one the plan itself wrote down
two sections earlier: **every setting in this plugin funnels through the same handful of files.** Adding
one is about seventeen edit points, six of them in a single file. Three helpers each adding a setting
would spend their time colliding rather than building.

So the three remaining features go through **one helper, in order**, each its own commit:

| Order | Feature | Who |
|---|---|---|
| 1 | A first quick question that does not wait for the model to load | helper W |
| 2 | One preset chip instead of two | helper W |
| 3 | Streaming becomes the default, switch deleted | **me** — the risky one, and the map for it is already written |
| 4 | Separate slow-warning and give-up times per Ask mode | **at risk** — see below |

**The per-mode times feature is the one to drop if the session runs short**, and it should be said
plainly now rather than discovered later. It is the largest of the six: the two existing values already
run through sixteen files each, and going per mode triples them. It is also the least of the six for an
ordinary person — it changes when a warning appears, not what the plugin can do. Everything else lands
first.

**Waiting on:** helper W's two commits.

### The final merge, worked out in advance

This is written now because working it out at the end, tired, is how work gets lost here.

**The problem.** Three other sessions committed onto this branch while it held the shared working copy,
and then went on developing the *same documents* on the shared branch. So this branch is now carrying
**older copies of four documents that other people are still writing.** A careless merge that prefers
this branch would quietly roll their afternoon back.

**Which way each file goes:**

| File | Take | Why |
|---|---|---|
| The reply-ready toast plan, the knowledge base status report, the knowledge base answer plan, the decisions list | **theirs, whole** | Nobody here touched them. This branch only holds a stale snapshot. Fifty-eight and a hundred and fifty-two lines behind respectively. |
| This plan | **mine, whole** | It exists nowhere else. |
| The roadmap, the testing document, the changelog | **hand-merged, entry by entry** | Both sides have real, different work in all three. This is the only place judgement is needed. |

**The safe order.** Merge the shared branch into this one *first*, taking their side for every file in
the first row, and resolve the three shared documents by hand. Then the branch is a superset and the
final step is a fast-forward with nothing to decide. Never resolve the roadmap by taking one whole
side — the merge earlier today would have deleted eight entries that way, and one of them had been
renamed rather than removed, which is invisible unless each is checked by name.

### Outcome: five of six built, the sixth dropped on purpose

**Built, landed and checked on the Deck:** the custom model pull, the fresh suggestion chips, the boot
warm-up, one chip instead of two, and streaming as the default.

**Dropped: separate slow-warning and give-up times per Ask mode.** This was named as the one at risk
twice before any of it was attempted, and the reasoning did not change. It is the largest of the six —
the two existing values already run through sixteen files each, and going per mode triples them — and
the least of them for a person, because it changes when a warning appears rather than what the plugin
can do. The session found seven real faults on the device instead, which was the better use of the time.
The roadmap entry says the same thing, so the next person does not re-derive it.

### The device block, 2026-09-05

**Four features checked, seven bugs found, all seven fixed.** Not one of the seven was visible at the
desk. Every one needed the device.

| Found on the Deck | What a person would have hit |
|---|---|
| Every already-installed model labelled **New** | All four models on the device wore a label they had not earned, for a month |
| The typing box 50 pixels wide in a 569-pixel row | A model name you had just typed was unreadable |
| The failure message led with the exit code | The one sentence you could act on came last, after spinner characters |
| The same message repeated itself four times | Ollama redraws inside one line, so splitting on lines never saw it |
| The boot warm-up loaded the wrong model | It warmed the first small model, not the one Ask uses — memory spent, first question no faster |
| The first fix for that read a setting that is usually empty | So it still guessed, and still picked the wrong model |
| The embedding model offered as one Ask could use | One press would have pointed Ask at something that cannot reply |

**Two of my own checks were wrong and are corrected in place, with the reason.** Asking for three new
chips in one minute is impossible by design — the suggestion row only offers new prompts for the first
minute after the panel opens, then freezes on what it is showing. And the pull picker closing when you
press Pull is correct: the pull runs in the background and you watch it on the Ollama tab.

**One finding retracted.** A model installed on the device looked missing from the picker. It is not —
the picker shows only the essentials by default and that model sits behind the filter. The answer was in
the feature's own test file.

**The device was left as it was found.** The settings file matches the copy taken at the start apart from
the new switches at their defaults, the try order changed by starring a model is back to empty, and the
model pulled to test the field was removed.

### A mistake worth writing down: three sessions, one working copy

**What happened.** Cutting this session's branch in the shared working copy moved every other session
off the branch it thought it was on. A third session — the one planning the answer preview in the
reply-ready toast — then made its commit, and the commit landed on **this** branch instead of the
shared one. Nothing was lost; it went to the wrong place.

**How it settled.** The bug-fixing session had already made itself a separate copy for landing, so it
was unaffected and kept going. The shared working copy is now effectively this session's, and the
stranded commit reaches the shared branch when this branch merges at the end, which was happening
anyway.

**What follows from it, and this one is a rule now:**

1. **This branch's history is never rewritten.** No rebase, no amend, no force. Somebody else's commit
   is sitting in it and rewriting would strand their work a second time.
2. **The merge at the end has to expect a commit that is not this session's** — a plan document, three
   decisions, and two roadmap edits about the reply-ready toast. Merge it, do not drop it as noise.
3. **A session that is not alone on a machine does not cut a branch in the shared working copy.** Make
   a separate copy first and cut the branch there. Three sessions were running here and only one of
   them could hold the shared one.
