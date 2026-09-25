# 35 — The second bug-fixing session

Written 2026-09-05, before any fix was started. The maintainer asked for a plan first: what to fix, in
what order, what runs side by side, how each fix is proven on the Deck, and what needs their decision.
The decisions are **D62** in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).
Nothing in § 4 starts until they are answered.

Read first: [CLAUDE.md](../../CLAUDE.md); the ground rules and the focus law at the top of
[26-thursday-bugfix-sesh.md](26-thursday-bugfix-sesh.md); [32-bugfix-session.md](32-bugfix-session.md),
which is the same shape and worked; [34-feature-verification-round.md](34-feature-verification-round.md)
§ 8 for what the device proved last night and how it was left.

**The maintainer's own checklist of things only a person can judge lives here:**
[Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
It is the standing list. Anything this session finds that needs their eyes gets added to it, and the
same link goes into [roadmap.md](../roadmap.md) and [testing-manual.md](../testing-manual.md) so it
cannot get lost.

---

## 1. What is true right now (checked 2026-09-05, nothing pressed)

- **The Deck answers, Ollama answers, the controller board is on COM7, and the rig is armed.** The
  debug tunnel is not running and gets started in block 0.
- **The tree is clean** on the working branch, nothing untracked.
- **Last night's round left the device as it found it** — every setting read back off disk, all five
  permissions on, no game running, nothing pinned. Backups for a data wipe are already in place beside
  the settings file and in the home directory.
- **One thing was deliberately not done last night:** wiping all plugin data. The maintainer was asleep
  and chose not to authorise a destructive step in advance. Three items still wait on it.
- **Seventeen entries sit in the bug list.** Two are already accepted, two are decisions rather than
  fixes, and one is a design call that was skipped once. That leaves twelve that can actually be fixed.

## 2. The bug list, sorted by what happens to each

### 2a. Fix this session — eleven entries

Ordered by how much a person would notice, not by star count.

| # | What a person sees | What is already known | The fix, in one line | Lane |
|---|---|---|---|---|
| 1 | **The panel gets stuck: pressing Down stops half way and the Ask button cannot be reached at all.** Only restarting the loader clears it. | Reproduced four times last night, on a chat with history and on an empty one, in both modes. At the moment it sticks, Steam's ring and the page's own idea of focus are on *different* elements every time. Reopening the panel does not clear it; a loader restart does. | Unknown until measured. The signature to chase is the two-owner disagreement. **Measured on the Deck before a line is written.** | me |
| 2 | **Nothing is highlighted when the panel opens.** The first press places the ring instead of moving it. | Re-measured yesterday on two builds and four fresh opens: the ring is simply unowned, not parked on a bad element. | Place the ring on mount instead of trying to move it off something. Probably the same machinery as #1. | me, with #1 |
| 3 | **An answer paragraph can take the highlight while it is hidden behind the question box.** | Seen twice, most recently in the free walk of all six screens: one paragraph only a third visible. The dock-clearance helper exists and did not cover it. | Make the scroll-into-view step account for the question box, not just the dock. | D, after the measurement |
| 4 | **On an unrevealed spoiler block, Down does nothing.** After it is revealed, Down escapes normally. | The press arrives and nothing moves. It is the hidden state that traps. | Give the hidden block a Down that hands the ring on. | E, after the measurement |
| 5 | **A branch picker from one chat shows up while you are looking at another chat.** | Seen twice with two different games. The block is held as one piece of state for the whole panel, not one per chat, so switching chats does not always clear it. | Scope the branch block to the chat that made it. | B |
| 6 | **The question you just asked is cut off after about 48 letters.** | Cut twice: once at 60 letters when the label is built, then again at 48 by the one-line rule. The second nearly always wins. The maintainer has already chosen what it should do. | An open turn shows the whole question, wrapped, up to five lines; a closed turn keeps one line. | A |
| 7 | **Stopping a reply leaves no sign it was stopped**, and the stopped turn loses its Helpful / Not really / Retry buttons. | The *Stopped* text is written but only rendered while the turn still counts as live, so it vanishes the moment the turn settles. | Show the notice on the settled turn too, and keep the three buttons. | A |
| 8 | **The line under the question box says no game is running, even when one is** — until you ask something. | It starts out saying that and only changes when an Ask's status check reports a game. On a fresh open, no check has run. | Check once on mount instead of waiting for the first question. | B |
| 9 | **A branch question says "Where are you at in … ?"** with the game's name replaced by three dots. | The example in the prompt literally contains those three dots, and the model copies them. | Change the example so there is nothing to copy, and drop a branch block that still has them. | C |
| 10 | **A quick question in Speed mode pays for the slow search it was meant to skip.** Two of three Speed questions spent about a second on it. | Confirmed in the code: the decision to run the meaning search never looks at which mode you picked. | Depends on the maintainer's answer (§ 3, question 2). | C |
| 11 | **Every game question waits about a fifth of a second longer than it used to.** | Three questions measured at roughly 1.09 seconds against the 0.79–0.90 band recorded when the feature shipped. Same corpus, same model, same device. Cause unmeasured. | **Time-boxed.** One bounded look for the cause. If it is not obvious, write the numbers down and stop. | C |

Two small features are in scope only if the maintainer says yes (§ 3, question 3): the fade cue for a cut
question, which pairs with #6 and costs almost nothing extra, and a glow at the end of the chip row when
it runs out.

### 2b. Not this session, and why

- **The highlight ring looks different from Steam's own** — a design call, skipped once already. Skip again.
- **The retrieval blend loses to one half of itself** — a measurement and a decision, not a fix. Its own conversation.
- **A troubleshooting question that only names the symptom finds nothing** — same: a decision about how far
  the router should reach.
- **Unrelated questions get game cards stapled on** — the maintainer accepted this.
- **Text arrives in bursts while a game runs** — the maintainer accepted this.

## 3. What the maintainer decided, 2026-09-05

Locked as **D62** in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).

| # | Question | Answer |
|---|---|---|
| 1 | How much of the list? | **All eleven.** The three that are decisions rather than fixes stay out and want their own conversation. |
| 2 | What should Speed mode do? | **The quick keyword lookup and nothing else**, which is what its test row always said. About a second comes off every Speed question; the trade is that a Speed answer loses the cards only the meaning search finds. |
| 3 | The two paired features? | **Both in.** The fade on a cut question, and the glow at the end of the chip row. The glow is motion, so no measurement closes it — it ends on the maintainer's checklist to judge. |
| 4 | Wiping all plugin data? | **Yes, with a message right before, and a wait.** If no reply comes before the run ends, the wipe does not happen and three entries stay open. |

## 4. Order of work, and what runs side by side

### Block 0 — hygiene, me alone, about twenty minutes

1. Put the maintainer's checklist link into the roadmap and the manual test docs so it cannot get lost.
2. Update the lane brief: the newer policy says lanes hand back code and tests only, and the person
   running the session moves every roadmap, test and changelog line. The brief on disk still tells lanes
   to move them, which is what caused the doc clashes last time.
3. Start the debug tunnel, confirm the Deck is running this exact checkout by hash, and confirm the four
   gates are green before anything changes.

### Block 1 — three lanes start, and I go to the Deck

The lanes need no device. While they work, I measure the highlight family, which is one setup for four bugs.

| Lane | Bugs | Files it owns |
|---|---|---|
| A | 6, then the fade cue that pairs with it, then 7 | the chat transcript, the one-line title helper, the reply button row |
| B | 5, then 8 | the ask orchestration hook, the Main tab body |
| C | 9, then 10, then 11 | the prompt text, the knowledge base service, the embedding service, their tests |

My measurements, in this order: how the stuck state is entered and what the two focus owners disagree
about (#1 and #2 together); what covers the hidden paragraph and by how much (#3); what happens on the
hidden spoiler block's Down (#4). Each is a short run with its evidence saved.

### Block 2 — two more lanes, once the measurements name a cause

| Lane | Bugs | Files it owns |
|---|---|---|
| D | 3 | the dock-clearance helper and its scroll step |
| E | 4 | the spoiler block component |
| F | the glow at the end of the chip row | the preset chip row and its edge handling |

Lane F needs no measurement and no device, but the policy caps this at five lanes at once, so it starts
when the first of A, B or C reports back rather than at the same time as D and E.

I take #1 and #2 myself. The policy is explicit: highlight and layout bugs go to a helper lane only when
a measurement has already named the cause, and for these two it has not.

One bug is left over on purpose — **Up from an archived chat header runs past the chat row to the tab
bar**. It touches the same file as lane A, so it goes after lane A lands rather than fighting it.

### Block 3 — landing, me alone

Each lane's commits are read as diffs, then taken onto the branch one at a time, oldest first. The four
gates plus the highlight linter run after every one. I move the roadmap, test and changelog lines myself,
in one commit per landing — never the lanes, which is what kept clashing last time.

The review question for every highlight fix is the one written down after the last four failures: does
this go through a real move handler or Steam's own hand-off, or is it a browser key event the device
never sends? If it is the second, it is dead on the device however green the tests are.

### Block 4 — the checking pass on the Deck, me alone, one thing at a time

1. Deploy once, reopen the panel (the first open after a deploy always fails, by design), prove the
   bundle by hash.
2. Check each fix in the order the fixes landed, with the stuck panel first.
3. A pass moves three things in one commit: the roadmap line into the done list, the full entry into the
   archive, the test row ticked. A failure is written down with its evidence and the entry stays put.
4. Then the wider walk: every screen, every stop reachable **and** visible, with a game running for the
   knowledge base checks.
5. Wiping all plugin data goes last and only with the maintainer's word.

### Block 5 — the report

Everything found and not fixed goes into the bug list with evidence. Anything that needs the maintainer's
eyes is added to their checklist. A short written summary at the end of the run.

## 5. Who does what

**Me: Opus at extra-high effort. Lanes: Sonnet 5 at high effort, five at most.** That is exactly what the
policy asks for a bug-fixing session, with one refinement that matters here: a highlight or layout bug
only goes to a lane once a device measurement has named its cause. Two of this session's bugs will not
have that, so I do them.

## 6. Rules for this session

1. One fix per commit, behaviour-preserving, all four gates plus the highlight linter green between commits.
2. Lanes hand back code, tests and one paragraph. They never touch the roadmap, the test docs or the
   changelog, never touch the Deck, and never push.
3. Every lane checks it is building on the right base before it does anything.
4. A failure on the device is written down with its evidence file named, not argued with.
5. If a device result contradicts the code, check the installed build's hashes before believing it.
6. Settings go back the way they were found, read off disk to prove it, at the end of every device block.
7. Do not sink time into a bug that turns out to be hard. Make a good effort, write down what was learned,
   move on.

## 7. Progress log

Written as work lands.

### Block 1 — the four navigation bugs measured, 2026-09-05

The device is running exactly this checkout: the bundle and the backend file both hash the same here
and there, so everything below is about the code we are changing. Five helpers were working at the
desk throughout.

**Nothing is highlighted when the panel opens. Reproduced first time, and it is worse than the entry
says.** Left the panel, opened it again from the Decky list, read the screen before pressing anything:
nothing owned the highlight at all. Pressed Down once — the highlight appeared on **Decky's own back
arrow at the very top of the panel**, outside bonsAI entirely. So opening the plugin and pressing Down
costs a person two presses before they are anywhere useful, and the first one puts them further from
the chat than where they started. The entry guessed the highlight lands on the tab bar; today it
landed a row above that, outside the plugin.

**An answer paragraph hidden behind the bottom bar. Reproduced twice, and the cause is now named.**
The bar's top edge is at 648 and the pane's visible bottom is 805, so the bar hides the bottom 157
pixels. The last paragraph of the reply sits at 588 to 689 — 41 pixels of it behind the bar, leaving
between a third and two thirds of it on screen depending on how tall the chip label is that day.

The fix for this already exists in the tree and **it runs, it computes the right number, and the pane
never moves.** With the highlight on that paragraph the element carried a 164-pixel scroll margin,
which is exactly the right answer for a 157-pixel bar plus its own 6-pixel pad. So the fix fired and
got as far as asking the pane to scroll. The pane's scroll position was 0, with 277 pixels of room
available. On the same walk the pane scrolled perfectly well for other controls — it reached 216 and
277 when the highlight was on the Helpful and Save-chat buttons. So the pane scrolls; this one lift
produces nothing. That is now a helper's question, with both leads written into its brief.

One correction to the entry: it says the question box covers the paragraph. Both cover it. Walking
down, the coverer is a preset chip; walking up, it is the question box. It is the bottom bar as a
whole, and a fix has to work from both directions.

**Pressing Ask with an empty question box drops the highlight.** Found by accident and worth filing.
A on the Ask button with nothing typed correctly sends nothing — and leaves nothing highlighted, with
the page's own focus falling back to the document body. One more press puts it back. Small, but it is
the same family as the opening bug and probably the same fix.

**The stuck panel: not reproduced, in three deliberate attempts.** Tried leaving with B and reopening
from the Decky list; tried the button-then-cancel path around the question box; tried switching
through all six tabs and back six times, then walking the whole panel top to bottom. Every walk
reached the Ask button. Two of the three attempts are the exact path the entry describes.

What came out of it instead is a **named mechanism that fits every symptom on record**, found by
reading rather than pressing. There is a registry that hands the highlight between the separate parts
of the panel, and it lives outside the panel — one table for the whole plugin, keyed by fixed names
like "the question box" or "the chip row", not by which copy of the panel is on screen. Two things
follow. When the panel closes and opens, a stale entry can survive, because the table is only emptied
when the plugin's code is loaded fresh. And when a handler asks that table to move the highlight, it
gets back an object that still looks alive and still has a working method on it, so the handler
reports the press as handled — **and nothing moves**, because the thing it moved the highlight to
belongs to a copy of the panel that is gone.

That is, line for line, what the entry describes: the press arrives, nothing moves, Steam's highlight
and the page's own focus sit on different things, reopening the panel does not clear it, and
restarting the loader does — because restarting the loader is the one thing that empties that table.

It is a hypothesis until it is proved. But it is a specific one with a small fix behind it, and it is
much more than the entry had this morning.

### Block 4 — the checking pass on the Deck, 2026-09-05

Deployed once; the bundle and both backend files hash the same here and on the device, so every
reading below is about the code that landed today.

**The answer paragraph hidden behind the bottom bar — PASS.** Walked a reply down and back up: every
stop fully visible, both directions. Before the fix the same walk had two stops a person could not
see, at a third and two thirds visible. Evidence `runs/round35-CHECK-dock-clearance-after-fix.json`.

**The question you asked — PASS.** A 57-letter question now shows in full, wrapped over two lines,
with no dots at the end. The room set aside is five lines' worth and the fade sits on the last line.
Read off the live screen.

**The line under the question box — PASS.** Started a game, opened the panel fresh, pressed nothing:
the line read *active game* and named it. Before, it said no game was running until you asked
something.

**The glow at the end of the chip row — PASS on the mechanical half.** Pressed Left twice at the first
chip and Right twice at the last: the glow fired on exactly those four presses and on none of the
four presses that moved. It lasts a third of a second, which is shorter than a round trip to the
device, so a plain read misses it — it took a recorder to catch. Whether it *looks* right is the
maintainer's call and is on their checklist.

**Speed mode — PASS, and the numbers are stark.** Asked the same question of the deployed backend in
all three modes with the game running:

| Mode | Search used | Time on the slow search |
|---|---|---|
| Speed | quick keyword lookup only | **0 ms** |
| Strategy | keyword and meaning | 1473 ms |
| Expert | keyword and meaning | 53 ms |

Speed does the cheap lookup and nothing else, and the other two are untouched.

**A finding for the open "search got slower" bug.** Those two hybrid numbers are the same search on
the same question moments apart: 1473 ms the first time, 53 ms the second. So the cost is dominated
by whether the embedding model is already warm, not by the search itself. Last night's 1.09-second
readings are very likely warm-up being counted as search time. Anyone re-measuring that bug should
ask a throwaway question first and time the second one.

**Two things the checks turned up on the way.**
- Show details and Copy are not reachable by walking down; they sit to the right of Retry. Not new
  and not a failure by any row, but it makes scripted checking slower and is worth knowing.
- One press onto a chip mid-slide read a third visible. It did not repeat in the sweeps either side,
  so it is recorded here rather than filed.

### Block 4b — the rating correction, and what the device said about greyed buttons

The maintainer read the stopped-reply fix and pushed back: a half-written answer is not something to
rate, and the rating is saved, so rating one quietly spoils the feedback they read later. They are
right. Helpful and Not really are now greyed out on a stopped turn; Retry stays live, because it is
the button a person actually wants after stopping something. A turn that finished normally is
untouched, with a test that fails if that changes.

**One measurement that matters for this, taken on the device today.** While a question is in flight
the Ask button is greyed out — and it **still takes the highlight**. So a greyed-out button in this
plugin is a stop that does nothing when pressed. That means the newly greyed thumbs will be dead
stops too. It is the same shape as the greyed *Clear frozen test chips* button fixed on 2026-09-04,
where the answer was to render nothing at all. Here the maintainer asked for greyed rather than gone,
so the fix has to be to skip them with the D-pad instead. **Filed, not fixed** — it needs its own
change and its own device check.

**The stopped-reply check itself is still owed.** Three attempts: the first two answers finished
before the rig could reach Stop, and on the third the highlight was dropped mid-answer, which is the
open "pressing Ask drops the highlight" bug getting in the way of checking something else. The Stop
control is an icon in the question box's corner rather than a stop on the way down, which is what
made it slow to reach.

### Where the device was left

Every setting read back off disk and identical to the backup taken at the start. Deep Rock Galactic:
Survivor is **still running** — the exit tool refused to guess its way through the confirm dialog,
which is the safe behaviour, so closing it is one thumb press whenever the maintainer is next at the
Deck. Nothing else was changed. **All plugin data was NOT wiped**: the maintainer asked to be messaged
right before, and no reply came, so under their own rule it did not happen.
