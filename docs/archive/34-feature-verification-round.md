# Plan 34 — The feature verification round

**Status:** written 2026-09-05. The device came free the same evening and the round starts from § 5 block 0.
**Purpose:** close as many of the roadmap's [Verify](../roadmap.md#verify) entries as one long overnight
run can, in an order that spends the least device time per entry closed.
**Builds on:** [plan 31](31-deck-verification-round.md), which is the same round and is part-run — its
progress log holds everything already measured. This plan does not repeat that; it starts from what is
left. Where this file and a row in [testing.md](../testing.md) or
[testing-manual.md](../testing-manual.md) disagree, the row wins.
**Does not:** change any product code. One entry needs code before it can be checked and is out of scope
(§ 2).

---

## 1. What the maintainer decided, 2026-09-05

Recorded as **D61** in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).

| # | Question | Answer |
|---|---|---|
| 1 | The Deck is busy — how does this session start? | Desk work now; the maintainer says when the device is free. Answered the same evening: it is free. |
| 2 | When does the in-person block run? | Last, as plan 31 § 7 has it. |
| 3 | Which gated items are in scope? | **A model pull**, yes. **Clear all plugin data** is in scope but **waits for the morning** — the maintainer will be asleep when the round reaches it and chose not to pre-authorise a destructive step. **Not** the Family View PIN, **not** the Steam Web API key. |
| 4 | What happens when a check fails? | File it as a bug with the evidence and carry on. No fixing during the round. |
| 5 | How long? | One long overnight run. |
| 6 | The chat-slot game name, which needs code first | Leave it in Verify. Do not spend device time on it. |
| 7 | The wider list of unticked checks | The Verify list, **plus a free walk of every screen** — every stop reachable and every stop actually visible. |
| 8 | Deploy first? | Yes. Get the latest build on the device before anything is measured. |

---

## 2. The Verify list is behind what the device already proved

The roadmap has **23 entries** waiting for a Deck check. Read against the test rows and plan 31's log,
several are further along than the roadmap says, and at least one is finished.

**The clear case: the thinking effort control.** Its entry says two checks are owed. Both are ticked and
both passed on the device — the four-way control was walked with the D-pad on 3 September, and a real
thinking model answered at every level on 4 September. **Nothing is owed. It belongs in Done and can move
there at the desk, with no device time at all.**

Others are part-done in ways the roadmap does not show: the panel-width entry has been measured and only
wants a look; the streaming entry has passed two and a half of its three checks; the thinking-line entry
has passed four of seven. **So the first job is a reconciliation pass** — walk all 23 entries against the
rows and the log, move anything finished, and rewrite the rest to say what is genuinely left. That is
desk work, it needs no device, and it stops the round spending device time on settled questions.

### Where each entry stands, and what it needs

**Closable by the rig, on the device (14).**

| Entry | What is actually left |
|---|---|
| Thinking effort control | **Nothing.** Move to Done at the desk. |
| Clear cache cleared the screen but not the session | The mid-generation half: clear while a reply is still being written. |
| Expert mode gets the same cards as Strategy | Its own row passed twice. The companion row wants one uncovered game on screen. |
| KB coverage chip | Two negative readings, both with an uncovered game running. |
| The vector half of retrieval | The on-screen half: the method label and the embed timing, with a covered game running. |
| Asked-entity extraction | Six sentences across four games, on screen. Three already pass by probe. |
| Deferred manual QA | Two developer commands, and the pending question after the panel is closed and reopened. |
| Thinking line fixes | Three of seven: an upright emoji, several prep phases in one turn, and one opener per Ask. |
| Soft reply-length cap | Two of five: a continue mid-fence, and a thinking model with thinking off. |
| Legacy-loader shim removal | One voice start and stop. |
| Three voice fixes | The reinstall label, one live recording, and the install state after the data clear. |
| Shell state and tab payload | The Ollama screen after the data clear. |
| Pulled models join the try order | The model pull. |
| Named chat slots | Six checks. One is already known to fail and is filed as a bug. |

**Needs the maintainer's eyes or fingers (4).** The rig has already measured all four; what is left is a
yes or no.

| Entry | What is left | What the rig measured |
|---|---|---|
| Rows span the panel width | Do the three rows look flush? | The panel is 300 px and all three rows span it exactly. |
| The tab bar collapses and names the tab | Are the names readable at arm's length, and does a finger work? | All six names render in full, the active one gold. |
| Preset row, two chips across | Is the crawl the right speed, and does reduced motion stop it? | Owed: frame sampling with a long label, which the rig does in the games block. |
| Token streaming | Drag a streaming reply with a finger. | The D-pad half passes; the view tracks the growing text. |

**Cannot close tonight (5), and why.**

| Entry | Why not |
|---|---|
| A checklist the model got wrong | It only closes if the model happens to misbehave. Watched for, never scheduled. |
| VAC check | Four of its checks need the Steam Web API key typed by the maintainer — out of scope tonight. |
| Kids master lock | Needs a Family View PIN set by hand — out of scope tonight. |
| The game a chat belongs to | The decision was that the name shows only while the row has focus. That code was never written. |
| Global quick-launch macro | A Steam Input checklist, never run on hardware. Needs a person. |

---

## 3. What to do first

Sorted so the earliest work closes whole entries and the device changes its settings as few times as
possible.

1. **The reconciliation pass** (desk, no device). It moves at least one entry to Done for free and stops
   the round chasing settled checks. Everything after is planned against the corrected list.
2. **Deploy the latest build.** Verifying yesterday's build risks passing something that has changed and
   failing something already fixed.
3. **The games block, not the quiet block.** This is the one order change from plan 31. Six of the
   fourteen rig-closable entries need a specific game running, and launching and exiting games is the
   slowest thing in the round. Doing them early means a game problem surfaces while there is still a
   night left to work around it, rather than at four in the morning.
4. **Then the quiet checks** — the ones that need nothing running. They are short, they are many, and
   they are the safest thing to be doing when the night gets long.
5. **The free walk of every screen**, once, near the end, on the final build.
6. **The model pull**, last of the overnight work. **Clear all plugin data waits for the morning.**

---

## 4. What can run at the same time, and what cannot

**The device is one queue and no amount of help changes that.** One screen, one focus ring, one set of
buttons, and Steam's own state — the running game, the ask mode, the thinking level, the pinned test
questions — is shared by everything. Two drivers move the ring under each other. Subagents cannot press
buttons in parallel; that is a hardware fact, not a tooling gap.

So: **one driver, three helpers.**

| Lane | What it does | When it must stop |
|---|---|---|
| **A — the device** | Every press, every screen read, every measurement. Strictly serial. The session itself drives it. | Never runs while another chat has the device. |
| **B — probes** | Retrieval probes, settings reads, log greps, build hash checks. All over SSH, never touching the screen. | During any timing check — the probes share the same model server. |
| **C — bookkeeping** | Moves entries as they pass: the roadmap line, the test row, the archive entry, all in one commit. | Never edits code. Never touches the device. |
| **D — preparation** | Reads the evidence lane A just wrote, and writes the exact wording and expected answers for the next block. | Never decides a pass or a fail. |

Three helpers alongside one driver is the honest ceiling. The written policy allows five lanes; the
device allows one driver, and the other four would be sitting waiting on it.

---

## 5. The run order

### Block 0 — desk

- The reconciliation pass (§ 2). Move what is finished, rewrite what is part-done.
- Deploy, and verify both file hashes match on the device.
- Back up the settings, the chats and the chat threads before anything else. The data clear at the end
  depends on those backups existing.
- Re-pin the test questions. Plan 31 found that **a pinned batch of eleven only ever shows its first
  three**, so batches are pinned three at a time, with the panel closed and reopened between them.

### Block 1 — games running

Launched and exited by the rig. One game at a time; settings changed once per game, not once per
question.

| Game | What it closes |
|---|---|
| Deep Rock Survivor | The vector recall entry's on-screen half, and the companion card-count row. |
| Black Mesa — not in the corpus | Both negative coverage readings, and the uncovered-title half of the card-count row. |
| Half-Life 2 | The frame sampling for the preset row's crawl, which is the half the rig can do. |
| Baldur's Gate 3, The Sims 4, Ship of Harkinian | The six entity sentences. The last one only if it is on the recent games shelf. |

### Block 2 — nothing running

- The mid-generation cache clear: park the ring on the clear button, start a long deep answer, walk back
  and clear while it is still writing.
- The three thinking-line checks, the two soft-cap checks, the two developer commands, and the pending
  question after the panel is closed and reopened.
- The six chat-slot checks. One is already a filed bug; run it anyway to confirm the fault is unchanged.
- Voice: the reinstall label, and one live recording, which also closes the shim entry's last half.

### Block 3 — the free walk of every screen

One sweep per screen on the final build. Every stop must be reachable **and** its rectangle must sit
above the dock, with a hit test at its centre landing on the control. That pairing is what catches the
fault this project keeps finding — a control the ring can reach that the person cannot see.

### Block 4 — the model pull

A custom setup profile that pulls a model, then confirm the new name appears at the bottom of the text
try order, and at the top instead when high-memory fallbacks are on. A vision-capable pull must also
appear in the vision list; a text-only one must not.

### Block 5 — Clear all plugin data, in the morning

**Not run overnight.** The maintainer chose not to authorise a destructive step in advance while asleep,
so the round stops before it and waits. The backups are taken in block 0 regardless, so it is one press
away whenever the word comes. It closes the voice install state, the Ollama screen after a clear, and the
reopen behaviour. Restore the backups immediately afterwards and read them back off disk to prove it.

Three entries stay open overnight because of this: the voice fixes, the shell and tab payload extraction,
and the reopen half of the cache-clear entry.

---

## 6. The maintainer's block, at the end

Plan 31 § 7 holds the list and the reason each one needs a person. Two changes for this round:

- **The Family View PIN and the Steam Web API key are out of scope**, so those items are not on this
  list. Their entries stay in Verify.
- **Screenshots work**, which was not true when § 7 was written. Every eyes item now comes with a picture
  the rig took, so the ask is *confirm what I measured*, not *go and look for yourself*.

What is left is short: read the tab names, tap the tab bar, drag a streaming reply, watch the chip labels
crawl and say whether the speed is right, look at the panel edges, look at the tree icon, read the five
spoiler replies, watch a new chat get its title, and press the knowledge base update button with a thumb.
About twenty minutes.

---

## 7. Rules for this round

1. **A failure is filed, not fixed.** Write it into the roadmap's bug list with the evidence file named,
   and move to the next check. No lane opens a fix tonight.
2. **A pass moves three things in one commit** — the roadmap line into Done, the full entry into the
   archive, and the test row ticked. Never a strike-through, never an entry left behind.
3. **Every walk is checked twice**: the ring landed, *and* the control is visible. A focused stop hidden
   behind the dock is a failure, not a pass.
4. **Evidence goes under `runs/`**, named for the row, with the first step's starting point recorded.
5. **If a device result contradicts the code**, check the installed build's hashes before believing it.
6. **Settings go back the way they were found**, read off disk to prove it, at the end of every block —
   not only at the end of the night.
7. **Model and effort:** the driving session runs Opus at extra-high effort, which is what the policy asks
   for device testing and for running lanes. The helper lanes run Sonnet 5 at high effort. Lanes never
   edit the roadmap, the test docs or the changelog; the driver does that.

---

## 8. Progress log

Written as rows close.

### Block 1a — Deep Rock Galactic: Survivor, 2026-09-05 05:0x

Build check first: the Deck was already running the newest build. Both bundles and **all 57 Python
files** matched this checkout byte for byte, so no deploy and no loader restart was needed.

**Keep-awake, measured.** A left-stick click through the bridge is a real controller press that moves
nothing — the ring stayed on the same control across two presses
(`runs/round34-keepawake-L3-inertness.json`). That is the idle-timer reset, at no cost. A redeploy every
45 minutes was rejected: it restarts the plugin and would break any check in flight.

**KB-RECALL-01, the on-screen half — the Strategy label PASSES, the timing and the whole Speed half
FAIL.** Six Asks, one fresh chat, game running, read off the Show details ladder:

| Question | Mode | Retrieval label | Embed |
|---|---|---|---|
| how do i kill the big armoured bug boss | Strategy | Keyword + meaning | **1078.87 ms** |
| which character is best for a beginner | Strategy | Keyword + meaning | **1094.34 ms** |
| tips for the thorny plant level | Strategy | Keyword + meaning | **1090.17 ms** |
| how do i kill the big armoured bug boss | **Speed** | **Keyword + meaning** | **1140.40 ms** |
| which character is best for a beginner | **Speed** | Knowledge base (skipped), `no_hit` | none |
| tips for the thorny plant level | **Speed** | **Keyword + meaning** | **943.70 ms** |

Evidence: `runs/round34-drg-*.json`. All six turns also read `Trust tier: fallback_no_source`,
`KB: 13 sections`, `Routed gemma4:e2b-it-qat`.

1. **Strategy prints the right label.** All three read *Keyword + meaning*, which is what the row asks
   for. That half passes.
2. **Strategy is slower than the row's band.** 1079, 1094 and 1090 ms against the 793–900 ms the row
   records from 2026-08-18 — about 200 ms per question more than when it was measured.
3. **Speed runs the meaning search too, and this is the failure the row was written to catch.** Two of
   the three Speed questions read *Keyword + meaning* and spent 1140 ms and 944 ms embedding. The row
   requires *Keyword search* with **no** embed time in Speed, and says in as many words that a non-zero
   embed there means the gate leaked. It has. The third question read *Knowledge base (skipped)* with
   `no_hit`, so the pattern is: **when the keyword search finds anything at all, the meaning search runs
   as well, whatever mode you are in.** That settles the open question lane B raised on 2026-09-03.

Filed as a Bugs entry. **KB-RECALL-01 stays in Verify**; the Strategy label half is recorded as passing.

**Smaller notes from the same block.** The preset chip in the ask row has no accessible name in Speed
mode — the walk reported it as an unnamed button three times, where in Strategy the same position reads
its label. And the footnote under the Ask bar read *Context: active game AppID 2321470* — the number,
not the game's name.

### Block 1b — the uncovered-title checks blocked, and a serious focus trap found

**Black Mesa could not be launched.** It is not on the Recent Games shelf, and the launcher refuses
rather than hunting the library — correct behaviour, but it blocks the three uncovered-title checks as
plan 31 wrote them. **Good news in the same read: Ship of Harkinian *is* on the shelf**, so the Ocarina
sentences plan 31 marked as contingent are runnable tonight.

The corpus covers eleven games (read from the manifest on the card: Baldur's Gate 3, Cyberpunk 2077,
Hades, Red Dead Redemption 2, The Sims 4, GTA San Andreas Definitive, Half-Life 2, Deep Rock Survivor,
Fallout 4, Left 4 Dead 2, Portal 2, plus one non-Steam title). **Sifu** was chosen as the uncovered
stand-in: installed, on the shelf, and absent from that list.

**Launcher note worth keeping:** it only ever walks right along the shelf, so if the ring is parked at
the far end a launch refuses with "not on the shelf" even when the game is there. Reset the ring
leftward first. Cost 70 s to learn.

**Then the coverage checks were blocked by a focus trap, which is the real find of the block.**

Reopening the panel on the Deep Rock chat and pressing Down from the top: title → tab bar → chat row →
the *5 earlier* pill → the question → the answer, and then nothing. **Ten Down presses, no movement.**
The answer's own Helpful, Retry, Show details and Copy buttons, the preset chips, the question box and
the **Ask button** are all on screen below and unreachable. Only Up escapes.

Ruled out: the ask mode (identical in Speed and Strategy, set with the panel closed between runs), and
the two commits since plan 32's clean sweeps (neither touches the transcript).

**First diagnosis, and the correction.** At the moment of the trap the answer's highlighted game words
(*kite*, *kiting*) were each a focus stop nested inside the answer bubble, which is also a stop, and
Steam's ring was on the bubble while the page's own focus was on a highlighted word. That looked like
the cause. **It is not.** A full Decky loader restart was run as a control, and afterwards the identical
walk on the identical chat went all the way down — through the answer, past *kite* and *kiting* as
ordinary stops, past the settings block, Show details, the session strip and a chip, to the question box
— and reached the **Ask button** on the very next press
(`runs/round34-BUG-down-walk-after-loader-restart.json`, `runs/round34-BUG-input-to-ask-final-check.json`).

So the real finding is narrower and, for a fix session, more useful: **the panel can get into a state
where Down stops half way and the Ask button cannot be reached, and reopening the panel does not clear
it — only restarting the loader does.** The signature to chase is that Steam's ring and the page's own
focus sat on different elements on every trapped press. How a person reaches that state is not pinned
down; here it followed a game launch and several panel reopens.

Both filed. The Sifu coverage checks are deferred to the quiet block, where the panel can be driven
without a restored answer in the way.

### Block 1c — the uncovered-game readings, two entries closed

With **Sifu** running (installed, on the shelf, and absent from the eleven app ids in the corpus
manifest), a fresh chat, Strategy mode, and the Deep Rock boss question asked deliberately so that a
cross-game leak would show, the Show details ladder read:

> Keyword search · **KB: none for this game** · Reply style: balanced · Spoiler risk: med ·
> Routed gemma4:e2b-it-qat · Retrieval: **Keyword search** · Trust tier: fallback_no_source · **unresolved**

Three owed checks pass at once:

1. **The uncovered-title coverage reading** — `KB: none for this game`, and it reads differently from
   `KB: no game running`, which was the whole point of the second half.
2. **No cards borrowed from another game.** The answer was generic; nothing from Deep Rock attached even
   though the question was word-for-word a Deep Rock question.
3. **No embed time.** With no covered game to search, the meaning search correctly does not run — which
   also confirms that *Keyword search* is a label the ladder really does print, so the Speed readings in
   block 1a were the gate leaking rather than a label that never appears.

**Two roadmap entries close:** *Expert mode gets as many cards as Strategy* and *Show details says what
the knowledge base had for your game*. Both moved to Done with their full text archived.

### Block 1d — the entity sentences, entry closed

**Ocarina of Time had to be launched by hand.** It runs as the Ship of Harkinian shortcut, and the
launcher matches a shelf tile by the app id inside its artwork — a non-Steam shortcut has none, so it
walked straight past a tile whose name it had just printed. Driven by hand instead, with a read before
each press confirming the ring was on a control labelled exactly *Play*. Worth fixing in the tool:
**match a non-Steam shortcut by name when the tile carries no app id.**

The plugin resolved the shortcut to the corpus game by alias (`alias:ship of harkinian`,
`KB: 16 sections`), which is a small win in itself.

**STRAT-ENTITY-01 — PASS, both halves.** The Show details ladder never prints the named entity, so the
naming half cannot be read off the screen; it was read by calling the extractor on the build installed on
the device. All seven sentences are right:

| Sentence | Names | Wanted |
|---|---|---|
| `king dodongo fight` | `king dodongo` | the boss |
| `how do I beat king dodongo` | `king dodongo` | the same as name-first |
| `raphael fight strategy` | `raphael` | the boss |
| `fire boss that flies out of holes` | nothing | nothing — it used to invent *fire* |
| `how to raise a skill fast` | nothing | nothing — it used to invent *fast* |
| `best build` | nothing | nothing |
| `im stuck` | nothing | nothing |

The wiring half was then proved on screen, in both directions, with the game running:
**`king dodongo fight` came back unfenced** (zero spoiler blocks, tactics in plain text) and
**`fire boss that flies out of holes` came back fenced** (*Spoiler — tap to show*). That contrast is the
row's real test, and it means the extractor's answer reaches the fencing decision.

**One number worth keeping.** Ocarina's embed took **784 ms** against Deep Rock's 1079–1094 ms earlier
tonight, on 16 sections versus 13. So the slowdown filed in block 1a is not a flat global regression; it
is something about that game's retrieval. The bug entry stands — the row's band was measured on Deep Rock
and Deep Rock is now a fifth over it — but a fix session should not assume every game is affected.

**Third sighting of the stale footnote.** With Sifu closed and Ship of Harkinian running, the line under
the Ask bar still read Sifu's number until an Ask ran, then corrected itself. It also showed Deep Rock's
number while Sifu ran. Same cause as the filed bug: the line only updates from an Ask's status poll.

### Block 2 — the developer commands, and a free walk of all six screens

**The three developer commands pass**, completing that part of the deferred-QA entry. Each answered
instantly with no model call:

| Typed | Answer |
|---|---|
| `bonsai:disable-sanitize` | *Input sanitization is disabled for future asks. Send bonsai:enable-sanitize (exact line, Ask field) to turn it back on.* |
| `bonsai:enable-sanitize` | *Input sanitization is enabled again for future asks.* |
| `bonsai:shortcut-setup-deck` | The fixed recipe — *bonsAI cannot create Steam Input macros automatically (no supported API; your controller stays under your control)* — pointing at troubleshooting §5, then the numbered steps. |

One thing worth knowing for anyone driving this: **the first Ask press right after a reply lands does
nothing.** The ring is briefly unowned, so that press places it instead of acting; the second submits.
Same family as the known "nothing is highlighted when the panel opens" entry. A left-stick click is a
free way to check where the ring is before pressing, since it moves nothing.

**The free walk of every screen — 64 stops, one failure, and it is one already on the list.**

| Screen | Stops | Every stop visible? |
|---|---|---|
| Main | 15 | **No — one answer section only 33% visible**, covered by the Ask box's input |
| Ollama | 15 | yes |
| Settings | 13 | yes |
| Permissions | 4 | yes |
| Developer | 12 | yes |
| About | 5 | yes |

No cycles anywhere. The single failure reproduces the ★ entry filed 2026-09-04 — an answer section takes
the ring while hidden behind the Ask box — so it is a confirmation, not a new bug.

Two things the sweeps closed or confirmed on the way:

- **VOICE-REINSTALL-01 passes.** The Settings sweep found the button labelled **Reinstall voice engine**,
  not *Install* — which is the ready state this row asks about — reachable by D-pad and fully visible. Not
  pressed, because the row says pressing it re-downloads.
- **The disabled *Clear frozen test chips* fix holds.** With no batch pinned, the Developer sweep walked
  12 stops and none of them was that button.

Three unnamed stops on Main (the answer chunks) and one on Developer (a text field) carry no accessible
name. Not a failure by any row, but worth knowing: a sweep cannot tell you what they are.

### Where the round stands, 2026-09-05 ~05:50

**Four entries closed**, taking the Verify list from 23 to 19:

| Closed | How |
|---|---|
| Thinking effort control | Nothing was owed — both checks had passed and nobody moved the entry. Desk work. |
| Expert mode gets as many cards as Strategy | Its own check passed 2026-09-04; the last companion check passed tonight with an uncovered game. |
| Show details says what the knowledge base had for your game | All four readings now confirmed, the uncovered-game one tonight. |
| Asking about a boss by name | All seven sentences right, and the fence behaves in both directions on screen. |

**Three bugs filed, all with evidence both ways.** The Speed-mode meaning search, the slower embed on one
game, and the navigation state where Down stops half way. The third began as a wrong diagnosis and was
corrected the same session after a loader restart disproved it.

**Not attempted, and why.** Half-Life 2's chip-crawl frame sampling: its entry also needs the maintainer's
eyes, so it cannot close tonight either way. Baldur's Gate 3 and The Sims 4: their two sentences are
already proven by the extractor probe and the entry is closed. The thinking-line emoji checks: they need a
turn that happens to print an emoji, which 32 sampled phases last round did not produce — luck, not a
scheduled check. The soft-cap and chat-slot entries each still carry a filed bug, so no amount of
checking closes them tonight.

**A note for whoever drives next.** The shoulder buttons switch tabs from anywhere except the chat slot
row, where they switch chats. Landing in a tab puts the ring back where it was in that tab's body, not on
the tab bar, so a shoulder press from deep in one tab lands deep in another. That is Steam's own
behaviour and the tab-switch row already passes on it — but it makes scripted navigation fragile. Walk up
to the tab bar first.

**The device was left exactly as it was found** — every setting re-read off disk and matching, all five
permissions on, no game running, no frozen chips pinned. Backups for the morning's data clear are in
place: `settings.json.bak-round34` beside the settings file, and `~/bonsai-round34-chats.tgz`.

---

### Continued 2026-09-06, 00:29–01:00 — three bugs closed, one new one found

Picked the round back up after the device came free. The tree had moved on a long way (725 commits past `main`, the
2026-09-05 desk fixes all present), so the first act was a fresh deploy; the loader came back in 321 ms and the panel
opened on the second attempt, which is the usual behaviour straight after a deploy.

**The device was in the state round 34 left it** — thinking off, no saved try order, no frozen chips, knowledge base on,
Strategy mode, nothing running.

**Three bugs from the 2026-09-05 desk session now pass on the device.** All three were checked inside one Strategy
conversation, with no game running.

| What was owed | Result |
|---|---|
| A branch question names its game | **PASS.** *"Where are you at in Half-Life 2?"* — the name is there, no dots. |
| A stopped reply says it stopped | **PASS.** *"Stopped — partial answer kept."*, half answer kept, Helpful and Not really greyed, Retry live. |
| A branch block stays in its own chat | **PASS.** Absent from both other chats, in both directions; comes home on the way back. |

Two screenshots stand as evidence: `screenshots/round35-branch-names-game-and-stays-in-slot.png` and
`screenshots/round35-stopped-notice-and-greyed-buttons.png`.

**One more entry closed, and it cost almost nothing.** The legacy-loader shim removal (**D11-SHIM-01**) had two checks
left that a probe cannot do — a real Ask typed into the Main tab, and a voice recording started and stopped for real. The
Asks above cover the first. For the second the voice button went *Voice input* → *Stop voice input* → *Voice input* with no
error and nothing in the log; the engine folder was written to at that moment, so the recording really happened. It
recorded silence, so no words came back — which is correct for silence, and does not say whether speech is transcribed
well. That question belongs to the voice rows and is still owed.

**A new bug, and it is a bad one: the model try order will not save.**

Setting out to run **ROUTING-MERGE-01** meant first saving a try order, so that a pulled model would have something to
join. Opening *Set text model try order…*, moving one model up and pressing *Done* left the settings file holding an empty
list. Pressing *Done* with no change also left it empty, which is reasonable. So the second attempt read the settings file
four times a second while the same steps were repeated, and caught both writes:

```
00:44:20.383  ['gemma4:e2b-it-qat', 'qwen3.5:4b', 'qwen2.5:1.5b', 'nomic-embed-text:latest']
00:44:20.986  []
```

The picker saves correctly and something puts the old value back six tenths of a second later. The picker's own save is
sound — it pauses the background save, writes, and re-reads. The second writer is the timed background save, which fires
400 ms after any settings change and sends a snapshot taken *before* the picker wrote. Changing the order is itself a
settings change, so it schedules the very save that undoes it. Filed under Bugs with both line references.

**So the model pull was not spent.** **ROUTING-MERGE-01** cannot pass while no order can be saved, and a download would
have proved nothing. The entry is marked blocked rather than open, which is the honest state.

**Two smaller findings.**

- Closing the try-order picker drops the highlight onto the Ollama tab's outer frame rather than back on the button you
  opened it from — about thirteen presses to get back. Seen both times. Filed.
- The greyed *Helpful* and *Not really* buttons on a stopped reply still take the highlight and do nothing. That is the
  existing greyed-button entry, not a new fault; this is a second sighting.

**One near-miss worth writing down so nobody re-files it.** During the first walk down the Main tab one stop inside the
reply body came back covered by the Ask box — focused but invisible, the exact shape this rig exists to catch. A second
walk of the same tab, 18 stops, found nothing invisible. It was a mid-scroll transient, not a defect. Evidence
`runs/round35-main-visibility-walk.json`.

**The device was left as it was found:** try order empty (the bug put it back itself), no frozen chips, all other settings
unchanged, nothing running, no model pulled. Two chats gained turns — the Ravenholm thread and the stopped weapons guide —
which is ordinary use, not a settings change.

### The try-order bug fixed, and the pulled-model check run — 2026-09-06, 00:50–01:10

**The first diagnosis was wrong in one important way, and reading the code properly changed the fix.** Last night's write-up
said the timed background save was sending a snapshot taken before the picker's write. It is not: that snapshot is rebuilt from
live state on every render. The timed save was the writer, but the stale value reached it by another route.

**The real cause.** Decky throws away and rebuilds the plugin's screen whenever a modal closes, so every opener first stores a
copy of the live session — settings included — and the rebuild puts it back. The copy is taken *before* the picker opens, so it
holds the old order. The picker saved correctly; the rebuild then put the old order back into the screen's state, and the timed
save wrote that to disk 400 ms later.

**This repo has fixed the same defect twice already.** `patchPendingSessionSettingsSnapshot` exists for exactly this, and both
the models hub and the character picker call it — the character picker for the identical symptom, *"picking a character
appeared to do nothing"*. The try-order picker was the third opener and did not call it. One line, plus three tests, proved red
before green by removing that one call.

**Confirmed on the device.** Rebuilt, deployed, and the same steps repeated with the settings file read four times a second:
the order was written at 01:02:00.409 and was still there when the watch stopped 45 seconds later, and on a fresh read after
that. One write, not two.

**With that fixed, ROUTING-MERGE-01 could finally run.**

| What the row asks | Result |
|---|---|
| A pulled model joins the bottom of the text try order | **PASS.** `qwen2.5vl:3b` pulled from the picker (3.0 GB, done 01:05:02) and landed last in the list. |
| A model that can read pictures also joins the vision list | **PASS.** The vision picker listed it first of three. |
| A text-only model does not | **PASS**, from the other direction: the text-only and embedding models were absent from that list. |
| With high-VRAM fallbacks on, a large model goes to the **top** instead | **Not run.** Needs a large model on the device and the switch on. |

**The device was put back.** The pulled model was removed, both lists reset to empty, and the plugin restarted so it read the
reset from disk — checked afterwards: both lists empty, no chips pinned, knowledge base on, thinking off.

**One thing to note for whoever picks this up.** Closing the try-order picker still drops the highlight onto the tab rather than
the button you opened it from — twice more tonight, and once on the vision picker too. Pulling a model does *not* have the
problem: that modal hands the highlight straight back to *Browse models…*. So it is the two try-order buttons specifically, and
it is filed.
