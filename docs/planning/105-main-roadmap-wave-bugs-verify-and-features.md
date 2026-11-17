# 105 — The main roadmap wave: every small bug, the Verify list worked down on two test machines, the one- and two-star features, and four bigger ones you picked

Written 2026-11-14 by the planning chat on the maintainer's PC (Fable; you asked for high effort, the chat was at
extra-high, § 8). Sources: `docs/roadmap.md` and `docs/roadmap-kb.md` at tip `d58e3155`, plan 103 (the shape copied
here) and its report, the lessons file, the Deck tools project at version 0.3.12, a live read of both test machines,
and six read-only code lookups by Sonnet helpers (§ 8 lists what they corrected). Plain language on purpose: this file
is for the maintainer first.

**Status: READY. Both things it waited for are in (2026-11-16).**
1. **Plan 104 has run** (your call, 2026-11-14: "104 first, then 105"; it finished 2026-11-16 and its report is its
   § 13). This plan starts from what plan 104 left, with a fresh audit of the roadmap and a re-check of every brief
   (§ 4, first acts).
2. **Your picks on the drawing board are in, all five** (§ 12). The last one, first-time setup, was settled on
   2026-11-16: round 4's B, the checklist with the Internet downloads switch and working tick boxes.

**The split with plan 104 is settled, read from its own plan file** (its § 2, call 1). Plan 104 holds the whole
knowledge-base roadmap and six entries of the main roadmap: the low-memory warning (the freeze), the long chat that
is not summed up, the summed-up note's D-pad stop, the tall Session card, the first-start "Install Ollama" message,
and the "cut" chip finding in the look check. This plan holds the rest of the main roadmap.

**Who runs it:** one fresh **Opus 5.5 chat at extra-high**, told "Run plan 105". It writes no code and no roadmap rows
itself: it hands out the work, reads every change, lands it and reads the Deck's failures. **Sonnet 5.5 high** helpers
build what needs a judgment; **Sonnet 5.5 medium** helpers do the mechanical fixes, drive the two test machines and
keep the books; **Opus 5.5 extra-high** helpers take the six D-pad and layout jobs (§ 4), each with a Deck measurement or
your pick in hand first; **Fable at medium** is the second opinion, on trial and asked often, and **Fable at max** is
asked only when the medium answer did not settle the matter (§ 7). Up to **fifteen** helpers at once, refilled as
slots free. The security reviewer and the open-source reviewer read the whole session once, and their report waits
for you (§ 5r). The whole setup is one table in § 4.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1 to 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [docs/roadmap.md](../roadmap.md);
[plan 103](103-kb-wave-six-finish-the-half-done-phases.md) §§ 6, 12 and 13 (the last wave's Deck blocks and what went
wrong); plan 104's report, once it exists.

**Files for this plan:** the helper rules [assets/105-helper-rules.md](assets/105-helper-rules.md) and the briefs
[assets/105-lane-briefs.md](assets/105-lane-briefs.md) (one per helper, with the files and line numbers the lookups
found). The Deck runbooks are written by the session at go, one per block, because the build on the Deck and its
state will have changed by then (§ 6). Evidence files: `plan105-<ROW>.json` in the workshop's `test-evidence` folder.
Handovers: `workshop:planning/assets/105-handover-<block>.md`. The drawings: [board 5](../demos/mockup-board-5/) and
[the Headline-first page](../demos/mockup-headline-first/).

---

## 1. One sentence

Work the main roadmap's Bugs list and Verify list as close to zero as two test machines and no human hand can take
them, build every one- and two-star feature that is not waiting on something outside this session, build the four
three-star features you picked once you have chosen their look, and keep the roadmap correct before, during and after,
with the Deck and the PC stand-in checking the work from the first minute to the last.

## 2. The maintainer's calls

**Answered in the chat on 2026-11-14 (they become decision D142; D141 is plan 104's):**

1. **Scope: the main roadmap.** Every one- and two-star bug, the Verify list, the one- and two-star features, and
   some three-star items (calls 2 and 4). Bugs found on the way are filed, reported, and given one honest try.
2. **Harder fixes: the tab-sections D-pad bug is in. The memory check before the AI loads is plan 104's** (its
   low-memory warning lane), and your answer on what it does was passed on: "Should warn with ask anyway" (a plain
   warning that there is not enough free memory with the game open, and a button that loads the AI regardless).
3. **The two knowledge-base items are plan 104's** ("Those last two should be handled by the other session"): the
   borrowed advice after the honest "no notes" opening, and a game the library does not hold at all. Both are in its
   plan already. **No overlap is left** (you asked me to check every item): plan 104 has the whole knowledge-base
   roadmap and the six main-roadmap entries named at the top of this file; nothing in § 5 below touches them. Whatever
   plan 104 leaves open of those six comes to this plan as a lane, with its evidence (call 22).
4. **Bigger features, all four:** sections that open by themselves (a Developer switch); first-time setup with fewer
   steps; the AI models list made bigger with simpler filters; the Ollama tab's look with Cancel folded into its
   buttons. Each is drawn first and built from your pick.
5. **Headline first: build it, as plain text** (after the mock-up). It lands switched on only if the answer test shows
   more answers opening with their point and no loss of facts; otherwise switched off with the numbers.
6. **Decode becomes the default animation** for answers and chips, and the animation settings leave the Developer
   tab. Today's Decode values are the stock values; a short clip goes on the checks page for your eye. **Only the
   thumbs row** ("Was this helpful?" and its two buttons) animates in under an answer.
7. **Not picked, so they stay as they are on the list:** the reasoning line in a character's voice; retiring the three
   voice ideas (Voice follow-ups, Spoilers by voice, Headset mode).
8. **The README clips: the session refilms them at the end**, once the bug and Verify checks are through, with the
   recorder's full-quality setting and the AI on the PC. You judge the clips on the checks page before they replace
   today's.
9. **Order: plan 104 first, then this plan.**
10. **Both test machines, the whole session**, with your condition: "give me ample warning to stay off this PC while
    you're driving it. Provide ETAs before you start the lanes." So: a timetable at go, and every stand-in window is
    announced in the chat and to your phone at least 30 minutes ahead (§ 6).
11. **Pacing: all-out bursts.** Up to fifteen helpers at once (call 29; it was twenty), none held back. When a five-hour window fills, everything
    waits for the reset, the Deck checks included, and picks up by itself. It stops for good at 90 percent of the week.
12. **The drawings: made now, in the planning chat** (board 5), so your picks are in hand before go.
13. **Intent packs: leave the list quiet and close the entry.** Its unused import and export manager is deleted (your
    October call).
14. **The "cut" suggestion chip: soften it, drawn first.** Keep the sliding, make the cut ends fade clearly, stop the
    row a little short of the screen's edges. On board 5. **Changed 2026-11-15, after the drawings: "Two lines only
    when selected"** (one line that slides as today; two lines only while the ring is on the chip). **Settled
    2026-11-16, at your second look: the selected chip takes the row, on one line** (no second line; your note:
    "Saves the most vertical space, which is still precious"). The picks for all five tabs are in § 12.

**Open, each with its default in brackets ("go" takes every default):**

15. **Models and efforts** as in § 4. The bookkeeper is Sonnet medium, not Haiku: Haiku was tried on bookkeeping in
    plan 83 and fell short, and you want the roadmap right. *[As listed.]*
16. **Decode as the default removes two chip styles for good.** The repo does not allow code nothing uses, so with the
    setting gone the "fade" and "carousel" styles are deleted; "static" stays as the reduced-motion look. This also
    closes the entry about the four chip styles sharing no code. *[Delete the two. One commit to take back.]*
17. **A very small Text size.** *[A fourth choice, "Tiny", at 80 percent: an answer's letters go from 10.8 px to 9.6 px.
    A picture goes on the checks page.]*
18. **Terse answers.** *[About 40 words; the longer Terse reply you get after asking to dig deeper keeps its "up to
    about ten lines".]*
19. **Left reaches the Quick Access Menu.** *[Measured first on the Deck: which edges already let Left out. Then one
    rule: when Left has nowhere to go inside bonsAI, the third Left in a row hands the press to Steam. The tab bar keeps
    wrapping.]*
20. **The starter set also builds the voice engine.** That build needs a container tool on the Deck and pulls from
    GitHub's container site. *[It runs even with the microphone permission off, since it only builds a program; the
    download box names the extra site before anything starts; if the build fails the starter set still finishes and
    says the microphone step failed.]*
21. **The ten notes you left on the checks page in October that nobody has answered** (plan 103's report lists them;
    plan 104 passes them to this plan): two "I don't understand" notes, three requests (a change to the delete-chat
    menu, a broken internet sub-menu, mock-ups for smaller option boxes), the jerky scrolling, the focus ring on the
    "How to use bonsAI" chip, the decode-and-scroll idea, the thicker icons you saw on the stand-in but not on the
    Deck, and "You can close it, but if needed we will reopen it". *[The session reads them first. Each gets an answer
    on the page. A small request becomes a helper round this session; a bigger one becomes a roadmap entry, drawn
    first if it changes a look; the two unclear items are rewritten in plain words.]*
22. **Plan 104's leftovers.** *[Whatever plan 104 leaves open from its six main-roadmap entries comes here as a lane,
    with plan 104's evidence in the brief.]*
23. **The second screen.** *[The look checks run on the Deck's own screen. The docked run happens only if you dock the
    Deck when the session asks; otherwise that half stays owed.]*
24. **Two documents that do not match the code.** *[The sentence is fixed, not the code: 21 screen files call Steam's
    focus transfer directly, not six. The Decky-button question gets one decisive Deck reading (§ 6, block D0), and the
    wrong document is corrected.]*
25. **Hand checks.** Seven Verify entries need your hands (§ 3). *[They go on the checks page in a "plan 105" round
    with their pictures; nothing else waits for them.]*
26. **Push and publish.** *[Nothing pushed, nothing published. At the end: "push" from you.]*
27. **Standing rules while you are away** (plan 103's call 18). *[Kept: a fix that fails on the Deck twice moves up one
    model tier without asking; a new one- or two-star bug with a known cause gets one helper round of about an hour;
    anything blocked gets the safest choice at once and is raised in the chat and in § 12; never push, publish, merge
    to main, switch branches in the shared folder, type a PIN or password, or reload the plugin with a game running.]*
28. **The second opinion.** *Answered 2026-11-16, see call 30.* (It was: up to ten consults of Fable at max.)

**Added by you on 2026-11-16, after the picks:**

29. **At most fifteen helpers at once** for this plan (it was twenty). The two drivers and a second-opinion consult
    count toward the fifteen.
30. **Fable at medium is the second opinion, on trial.** It is asked much more often than Fable at max was going to
    be. **Fable at max is asked only for what the medium consult could not solve.** Every consult of either kind is
    logged, and the report says whether the trial should become the rule (§ 7).
31. **One pass by the security reviewer and the open-source reviewer over the whole session, with a report you
    review.** Nothing in that report is fixed, waved away or filed before you have read it (§ 5r).

## 3. What a player notices after this session

Once the build reaches their Deck; every line reads "should" until its Deck row passes:

- **Answers open with the thing to do** (Headline first), and the popup over a game is useful without opening the
  panel. Terse answers are really short: about 40 words.
- **The whole plugin moves the same way.** Answers and chips decode in; the thumbs row decodes in after an answer;
  long chips fade softly at their cut ends instead of ending hard at the screen's edge.
- **Tabs are easier to read and walk.** Each tab opens with its first section expanded; sections stand apart from the
  settings inside them; a Developer switch lets sections open and close as you walk; pressing Left enough times
  lets you out to Steam's menu; the D-pad no longer loses a control after sections are opened (if the measurement
  finds the cause).
- **The chat is easier to get around.** The "N earlier" list can show one game at a time or flip to group by game; a
  cut question fades at its edge so you know it opens; at ten chats, Ask shows the "pick a chat to delete" list
  instead of quietly using the newest chat; the Show details chips take two rows instead of five; a long answer stays
  in view while it writes.
- **First-time setup is shorter.** Fewer presses from first open to first answer, and the starter set also makes the
  microphone work.
- **The Ollama tab and the AI models box look current.** The button that starts a download is the button that cancels
  it; the models list is longer and its filters are a few plain choices.
- **A smaller text size** for people who want more on screen.
- **Behind the scenes:** two pieces of unused code are gone (about 1,500 lines); the landing step keeps its whole log;
  the README clips are smooth; one document lists whose voice each bundled character copies.

**How much better shape the plugin is in afterwards.** Counted at tip `d58e3155`:

| | Today | After, if everything lands and passes |
|---|---|---|
| Open bugs on the main roadmap | 10 (six are plan 104's, four are this plan's) | 0 to 2 after both plans (whatever resists) |
| One-star features open | 8 | 1 (the build tidy-ups, which need a GitHub run) |
| Two-star features open | 19 | 7 (three are plan 101's, three wait on your word, one is parked by decision) |
| Three-star features open | 13 | 9 |
| Half-done (PARTIAL) entries on the main roadmap | 6 | 3 (the tab-sections bug, the docs mismatch and the long-answer entry close; the test rig, the transcript height and the notes entry stay) |
| Verify entries | 14 (plan 104 runs three of them) | about 7 from today's list, all waiting only on your hands; plus any of this session's own features whose Deck row did not pass |
| Deck checks you must do by hand | spread through the roadmap | one list on the checks page, about an hour |
| Lines of code nothing uses | about 1,500 | 0 of those |

**The honest limit on "Verify at zero".** Seven of today's fourteen Verify entries cannot be closed by any rig: the
touch check for the ghost of the tab bar; the Kids lock (a child account); the stale-note half that needs a parental
PIN; Rename chat with your own controller; a frame-rate run in a real fight (the rig cannot play); your eye on the
chips' look; the note offer after a screen-only reload (proven by tests; the rig cannot do that reload). Plan 104
runs three of the other seven (the back-end crash fix, the summing-up, the Show details strip); this session closes
the last four (the hidden line inside a bold heading, the look sweep, the starter box on a fresh install as a
stand-in pass, the agent chip's focus fill) and puts the seven hand checks, with pictures and exact steps, in one
round on the checks page.

What stays for later, on purpose: the three mod-launcher entries (plan 101's); the first-run "New chat" ghost label
(parked by decision); the reasoning line in a character's voice and the three voice ideas (not picked); smoother
D-pad scrolling, the model speed readout, the menu icon and the other three-star items (not picked).

## 4. Before go, and the exact setup

**The maintainer, about fifteen minutes:**

1. **Wait for plan 104 to finish, then pick on board 5** (§ 5d). A lane whose look is not picked does not start.
2. **Start a fresh Opus chat at extra-high and say "Run plan 105".** A chat cannot change its own model or effort, so
   this must be a new chat with Opus chosen in the model picker.
3. **The Deck:** on, on its charger, nothing running. Say **"keep it awake all session"** is fine (you agreed both
   machines for the whole session): the rig's hold is then never released, so the Deck cannot fall asleep on the work
   as it did for nine hours last time.
4. **This PC as the stand-in:** Steam running in Big Picture, offline. The session brings Big Picture to the front by
   itself and tells you 30 minutes before each window in which it will drive the PC. During a window: hands off the
   mouse and keyboard (a mouse crossing the window moves the ring).
5. **Close any other window that has the Deck tools loaded.** One is holding the tools' debug port right now (the
   knowledge-base chat). Only one chat may drive each machine.
6. **Phone alerts on** in the app's settings. Last time the session tried twice to tell you the Deck was frozen and
   both were refused.
7. If you can spare it: **dock the Deck to the monitor once** when the session asks, for the look checks on the second
   screen (about 20 minutes of Deck time).

**The exact setup:**

| Seat | Runs as | Model and effort | Notes |
|---|---|---|---|
| Runs the session: hands out work, reads every change, lands it, reads the Deck's failures, reviews anything that touches the D-pad or the settings | a fresh chat | Opus 5.5, extra-high | writes no code and no roadmap rows itself |
| Features and fixes that need a judgment | `feature-lane`, `bugfix-lane` | Sonnet 5.5, high | each in its own copy of the repo; one change per commit |
| Mechanical fixes (known cause, one obvious way) | `bugfix-lane-sonnet-medium` | Sonnet 5.5, medium | |
| The six D-pad and layout lanes (A2, A6, C2, C5, D3, D4) | `bugfix-lane-opus-xhigh` | Opus 5.5, extra-high | only after a Deck measurement or your pick; the second opinion reads the change before it lands |
| The bookkeeper | a general helper given `.claude/agents/bookkeeper.md` as its instructions | Sonnet 5.5, medium | works in its own copy, landed like a lane; every status it changes names its evidence file; the session spot-checks each sweep |
| The Deck driver | `deck-driver` | Sonnet 5.5, medium | one at a time on the Deck, a fresh one per block with the last handover |
| The stand-in driver | `deck-driver`, told `machine: "this-pc"` | Sonnet 5.5, medium | one at a time on the PC; runs beside the Deck driver (the tools lock each machine separately) |
| The security reviewer, the open-source (licence) reviewer | `security-auditor`, `foss-advocate` | Sonnet 5.5, high | their files say "inherit", so the model is passed by hand. Two jobs: reads that gate a landing (the voice-engine step in the starter set, the scripts that reach the Deck, the bigger models list), and one pass over the whole session whose report goes to you (§ 5r) |
| Read-only lookups, the briefs' re-check at go | a general helper | Sonnet 5.5, medium | whoever asked confirms with a search |
| The second opinion, asked first and often (on trial) | `advisor` | Fable, medium | read-only; asked at every point in § 7 and whenever the session is unsure; each consult logged. The helper's own file names an older model and effort, so both are passed by hand every time |
| The second opinion, when medium did not settle it | `advisor` | Fable, max | read-only; only on the four grounds in § 7; given the medium question, its answer and what happened since; at most ten; each logged |

Every helper is started with its model and effort passed by hand. At most fifteen at once (call 29), the two drivers
and the second opinion counted in; a helper runs only its own tests at two workers; the full checks run once per landing, in
the shared checkout. **A ready helper starts at once** (your call 11); the usage counters are read before every batch
and said in the chat.

**The session's first acts, in this order:**

0. `git fetch`, `git status` (other chats' files are theirs), the tip hash, the tail of the decisions file (D142
   free), both machines' status, the three usage counters said in the chat. Read plan 104's report and its hand-over
   of the six main-roadmap entries; read the ten October notes off the checks page (call 21).
1. **The timetable, posted in the chat before any helper starts** (your condition): each wave's start and expected
   end, each Deck block, and each stand-in window with its clock times. Then the phone alert for the first window.
2. Confirm this plan and its two asset files are in git (the planning chat committed them on 2026-11-16, at your
   word; not pushed): every helper reads them from its own copy. Any later edit to them is committed, staged by name.
3. **The re-check of the briefs against the tip** (four Sonnet lookups, one per area). The briefs were written against
   tip `d58e3155`; plan 104 will have moved files and may have fixed some entries. A brief whose facts moved is
   corrected before its helper starts; an entry plan 104 closed is dropped.
4. The bookkeeper's audit, K0 (§ 5k). It lands first and every landing waits for it.
5. The baseline: `python scripts/verify.py --full` on the tip, once, in the background.
6. Cut wave 1's copies (`python scripts/worktree.py create p105-<lane> --base experimental`), confirm each sits at the
   tip, and start the helpers two to three minutes apart, each with the rules file, its brief, the tip hash and its
   copy's path.
7. Deck block D0 and stand-in block S0 at the same time (§ 6). The test machines never wait for the helpers.
8. Second-opinion consult 1 (§ 7) while wave 1 builds.

## 5. The work: what can run in parallel, and what cannot

**The rule for parallel lanes is files, not features.** Two lanes never own the same file at the same time. Everything
not named as a wait runs at once. The full briefs, with files and line numbers, are in
[assets/105-lane-briefs.md](assets/105-lane-briefs.md); this section is the map.

### The lanes

**Groundwork (wave 1, first to land):**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| K0 | The bookkeeper's audit before anything lands (§ 5k) | ★ docs | Sonnet medium | the roadmap files, the testing rows, the decisions file | nothing; lands first |
| T1 | The landing step keeps its whole log, so a failing test can be named | ★ `[platform]` | Sonnet medium | the landing script | nothing; lands second, the session needs it |
| T2 | Faster and surer Deck checks (§ 6): a script that puts a hand-written chat on the Deck and takes it away again; a wait that reads the log line for "answer finished"; the read-back script working on the stand-in | ★★ `[QA]` | Sonnet high | new scripts only | nothing; block D0 tries them |

**The answer screen and the chat:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| A2 | The Show details chips in two rows (short names, Session as the dashed last chip) | ★★ `[layout]` | Opus extra-high; the second opinion reads it | the details panel, the chip grid, the Session parts, the chip names the back end sends | nothing to start (it builds on plan 104's fixes to the same screen) |
| A4 | The thumbs row decodes in after an answer | ★★ `[reply]` (half) | Sonnet high | the reply row | B2 landed (it uses the decode code) |
| A5 | A cut question fades at its edge while the ring is on it | ★★ `[chat]` | Sonnet high | the question bubble | block D0's look at what focus shows there |
| A6 | "N earlier": one game at a time inside a day, and the whole list flipped to group by game | ★★ `[chat]` | Opus extra-high; the second opinion reads the design before it is built | the earlier list and its D-pad helpers | nothing to start |
| A7 | At ten chats with none open, Ask shows the "pick a chat to delete" list first | ★★ `[chat]` | Sonnet high; the session reviews | the chat slots, the new-chat box, the ask flow | nothing |
| A8 | A long answer stays in view while it writes | ★★ `[reply]` | Sonnet high | the stream's scroll pin | block D0's reading (does the page stop following when the ring is on the answer) |

**Chips and animation:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| B1 | The agent chip shows the blue focus fill (the help chip already does) | ★★ `[chips]` (Verify) | Sonnet medium | two style files, one test | nothing |
| B2 | Decode as the default for answers and chips; the five animation rows leave the Developer tab; the fade and carousel styles are deleted | ★★ `[reply]`, ★★ `[chips]` | Sonnet high; the session reviews (settings) | the settings in both languages, the Developer tab's animation rows, the chip row's parts, the answer stream | C3 landed (same settings files) |
| B3 | A chip's decode moves in step with its slide; the selected long chip widens across the row on one line, as picked | ★★ `[chips]`, ★ `[ui]` | Sonnet high | the chip row's parts | B2 landed; your pick on board 5 |

**Tabs, sections and settings:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| C1 | Each tab opens with its first section expanded; sections shaded as picked | ★, ★ `[tabs]` | Sonnet high | the sections' open-state store and styles | your pick on board 5 |
| C2 | The tab-sections D-pad bug, then the Developer switch that opens and closes sections as you walk | ★★★ `[focus]` `[tabs]` (both) | Opus extra-high; the second opinion reads it | the section line, the open-state store, one new setting | C1 and B2 landed; block D0's walk on the Ollama tab |
| C3 | A very small Text size | ★ `[ui]` | Sonnet high | the text-size list in both languages, the choice row | nothing; lands before B2 is cut |
| C5 | Left reaches the Quick Access Menu | ★★ `[focus]` | Opus extra-high; the second opinion reads the rule | the tab bar's moves, the slider, the section line, the ask bar | C2 and A6 landed; block D0's measurement of every left edge |

**Prompts:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| P1 | Terse at about 40 words, then Headline first, each measured on the answer test before and after | ★ `[reply]`, ★★ `[reply]` | Sonnet high; the second opinion reads the numbers | the reply-style wording, the prompt file, the Terse help text | nothing; the only lane that touches a prompt |

**Ollama, first start and voice:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| D2 | "Install the starter set" also builds the voice engine | ★★ `[voice]` | Sonnet high; the security reviewer reads it | the starter set in the back end, the voice engine's build, the site list | nothing (plan 104's first-start fix is already in) |
| D3 | First-time setup with fewer steps, as picked: one first screen with a checklist of every download (size, site, a tick box), the Internet downloads switch, then OK; the download totals put right; a download left unticked is offered again where its feature is first used | ★★★ `[ollama]` | Opus extra-high | the first-run popup, the beta notice gate, the setup flow | D2 landed; your pick on board 5 |
| D4 | The Ollama tab's look, Cancel folded in, as picked: a job card, a live connection line, and one bar that shows only when the card cannot be seen | ★★★ `[ollama]` `[ui]` | Opus extra-high; the second opinion reads the D-pad chain | the "Where AI runs" section, the setup flow, the shared job card and bar | D3 landed |
| D4b | The same job card and bar on the knowledge library's download and on the voice install; the voice install gets its first Cancel | ★★★ `[ollama]` `[ui]` | Sonnet high; the session reads the D-pad chain | the library section's download area, the voice install's area on the Settings tab | D4 landed (it builds the shared card and bar) |
| D5 | The AI models box: a longer list and simpler filters, as picked | ★★★ `[ollama]` `[ui]` | Sonnet high; the licence reviewer reads the new rows | the models list, the filter column, the table | your pick on board 5; nothing else |

**The repo and the documents:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| E2 | Delete the characters' pixel-art avatars and the unused pack manager | ★ `[repo]` | Sonnet medium | the avatar art, the pack manager's four calls, their tests | nothing |
| E3 | One line per bundled character: who owns it, whose voice it is, could a voice be a type and not a copy | ★★ `[reply]` (a document) | Sonnet high | one new document | nothing |
| E4 | The two documents that do not match the code | ★, ★ `[docs]` `[focus]` | the bookkeeper | two sentences in AGENTS.md, one comment in the focus checker | block D0's Decky-button reading |
| E5 | The ten October notes on the checks page, each answered; small requests built | ★ to ★★ | the session reads them; Sonnet high per request | named when the notes are read | first acts, step 0 |
| F | The README clips refilmed | ★★ `[docs]` | the Deck driver, a filming runbook | the README's clips | the last Deck block |
| L | A lane for anything plan 104 left open of its six main-roadmap entries (call 22) | as filed | as the routing table says | named at go | plan 104's hand-over |
| R | One read of everything this session changed, by the security reviewer and the open-source reviewer; one report for you (§ 5r) | a review, no stars | Sonnet high, twice; the session writes the report | read-only; one new report file | every code lane landed (stopping point 3) |

### Waves, the clean stopping points, and rough times

Times are from "go" and assume plan 103's pace: about 25 helper runs fit one five-hour usage window, and with all-out
bursts a window fills in under an hour and then everything waits for the reset. The session posts real clock times
before it starts (first acts, step 1).

- **Wave 1, at go (up to fifteen at once; the list is longer than fifteen, so the last few start as slots free):** K0, T1, T2, A2, A5, A6, A7, A8, B1, C3, P1, D2, E2, E3, E5's requests,
  lane L if plan 104 left anything; C1 and D5 if picked; the Deck driver (block D0), the stand-in driver (block S0),
  the second opinion's consult 1. **Stopping point 1, about hour 5:** the groundwork and the small fixes are landed;
  the Verify rows the rig can close have run; the measurements the later lanes wait for are in.
- **Wave 2, as slots free:** B2, A4, C2, D3, E4; deploy 1; blocks D1 and S1. **Stopping point 2, about hour 10:**
  Decode is the default, the Show details chips and the chat changes are on the Deck, the starter set builds the
  voice engine.
- **Wave 3:** B3, D4 and then D4b, C5; deploy 2; blocks D2 and S2. **Stopping point 3, about hour 15.** Lane R
  (the review pass) starts here, and its report reaches you while the finish runs.
- **The finish:** deploy 3, block D3 (every row of this session once more on the final build, the look check on every
  tab, the free-play sweep), the refilm (block DF), the put-back (block DR), the bookkeeper's end audit (K9), the
  report. **Done at about hour 18 to 20**, in four usage windows.

Each stopping point gets five lines in the chat and in § 12: what landed, what the two machines showed, the three
usage counters, what is next, anything waiting on you.

### Where lanes would collide, and how the order avoids it

- **The settings files** (the same handful in both languages): C3 first, then B2, then C2. Each is cut after the one
  before has landed.
- **The answer's reply row and D-pad map:** A2 first, then A4. A6 touches the big transcript file only where it
  calls the earlier list. Plan 104 changed this screen just before (its D-pad lane and its Session card lane), so A2
  and A4 start from its landed code and its Deck rows are run again after they land.
- **The chip row's parts:** B1 (styles only) any time; B2, then B3. Plan 104's chip-order lane changed how the next
  chip is picked; B2 keeps that rule when it deletes the two styles.
- **The section line and the open-state store:** C1, then C2, then C5.
- **The first-start files:** D2, then D3, then D4. D5 shares nothing with them.
- **The prompt file:** P1 alone. **The roadmap, testing and changelog files:** the bookkeeper alone.
- **The plugin's main entry file** is touched by A7 and B2: A7 lands first.
- **This PC's AI model is one process:** P1's measurements run one at a time.
- **Plan 104's leftovers:** anything it changed in the answer screen, the chips or the settings is re-read at go
  (first acts, step 3) before a lane in that area is cut.

### 5d. The drawings, and what waits for a pick

Board 5 (made in the planning chat; the link is in § 12 once published) has five tabs: the tab sections (shading, first
section open); the Ollama tab; the AI models box; first-time setup; the suggestion chips' cut ends. Lanes C1, D3, D4,
D5 and B3's second half build exactly what you pick, and each helper opens the board's drawing before it writes a line
(a brief's words have paraphrased a drawing wrongly before). The Show details chips were picked on the density board
in October (tab 1, option A of round 2); A2 builds from that drawing. Headline first is picked (plain text).
**All five are picked (§ 12).** Three lanes build a later round, not round 1: D4 and D4b build round 2's
"Elsewhere" on tab 2, B3 builds round 2's C on tab 5, D3 builds round 4's B on tab 4.

### Work bumped above Sonnet, and why

A2, A6, C2, C5, D3 and D4 are D-pad and layout work. The routing table gives those to Opus at extra-high once a Deck
measurement or a drawing is in hand, and the record says they fail at every tier without one. The session itself
(Opus) reviews every Sonnet change that touches the D-pad or the settings (A4, A7, B2, C3) before it lands.

### 5r. The review pass, and the report you read (call 31)

**When.** At stopping point 3, once every code lane has landed and before the last deploy. Late enough that the
reviewers see everything; early enough that a fix you ask for can still be built and tested in this session.

**Who.** The security reviewer and the open-source reviewer, one run each, Sonnet high, model and effort passed by
hand (their files say "inherit" and would otherwise run on the session's model). These are apart from the three
reads that gate a landing (lane D2's voice-engine step, lane T2's scripts, lane D5's new rows), which stay.

**What they read.** They can read files and search, and cannot run commands. So the session first writes two files
into the workshop folder: the list of every file this session changed, and the whole change from the starting tip
to the tip at stopping point 3. Each reviewer is pointed at both, and told where to look hardest:
- the first-time setup screen: the list of downloads and sites, and anything that turns a permission on (lane D3);
- the voice engine's build in a container and its download site (lane D2); the voice install's new Cancel and what a
  stop leaves on disk (lane D4b);
- the bigger models list: each row's licence and where its facts came from (lane D5);
- the scripts that reach the Deck over the network (lane T2);
- what was deleted: the avatars and the unused pack manager (lane E2); and the document on who owns each bundled
  character (lane E3);
- Decode as the default and the removed settings: nothing a person saved is lost or read wrongly (lane B2).

**The report.** One file, `docs/planning/assets/105-review-report.md`, written by the session in plain language from
the two reviewers' answers. One entry per finding: who raised it; the stars, on the reviewers' own scale; what a
person using the plugin could notice or lose; where it is; the fix the reviewer suggests; and the session's own
check of it against the code ("confirmed", "not confirmed, and why", or "could not tell"). A finding the session
could not confirm stays in the report, marked. What each reviewer said was fine is listed too, in a few lines, so
you can see what was looked at.

**It waits for you.** The session posts the report in the chat with a phone alert and carries on with the finish.
Until you have read it and answered: no finding is fixed, none is waved away, none is filed in the roadmap, and the
final report does not call the session ready to push. After your answer: a fix you ask for is an ordinary lane (if
the session is still running) or an entry the bookkeeper files; anything you set aside is written down with your
words. If you have not answered when the session ends, the first line of the final report says so.

### 5k. The bookkeeper: before, during and after

**Before (K0, the first thing to land).** The roadmap file is at 95 of its 100 KB and the testing file is near its
own limit, so the first job is room: older dated text moves, word for word, to the long-notes file and the testing
archive. Then: D142 written into the decisions file from § 2; every entry this plan names checked against the tip and
against plan 104's report (closed by 104: gone from this plan; still open: kept); the corrections planning found
(§ 8); the intent-packs entry closed as decided; the tab-sections entry reworded to the control that exists today;
one open testing row per check in § 6, named `P105-…`. From this moment the main roadmap has one writer, this plan's
bookkeeper.

**During.** After every landing chain and every block on either machine the bookkeeper gets the session's result list
and moves the entries, one commit, in its own copy, landed like a lane. A landed fix moves to Verify naming its row; a
Deck pass moves to Done naming its evidence file; a stand-in pass is written as a stand-in pass, never as a Deck pass;
a fail goes back with what was seen. The session spot-checks every sweep against the evidence files. **Both roadmap
files are current at every stopping point** (if this session moves a knowledge-base entry, its file is updated in the
same sweep).

**After (K9).** The same audit once the last landing and the last block are in: every entry moved this session names
its row and its evidence; every count in § 3's table is counted from the files, not carried over; Verify and Done
agree (the check script fails a row closed in one place and open in another); every roadmap file is under its limit;
the checks page has its "plan 105" round.

## 6. The two test machines: rolling blocks, and the state of the Deck tools

**The Deck tools project** (Decky Plugin Studio, the controller rig's software, its own repo): version 0.3.12 of
2026-11-04, on its main branch, nothing uncommitted and nothing unpushed; 49 tools, 850 tests. The one test that fails
now and then has a name now (a timing test of a press deadline; it races a real clock under load and does not touch
the device). Read from the planning chat on 2026-11-14: the Deck answers, the PC's AI answers, the controller board is
on COM7 with the newest program, the stop switch is armed, nobody holds either machine. One of its nine self-checks
fails: another copy of the tools holds the debug port (§ 4, step 5).

**The stand-in (this PC).** Steam's Big Picture with Decky Loader and a virtual controller. Since the 25 October fix a
read takes milliseconds, not ten seconds. Good for: does the plugin open, D-pad walks, is every stop visible, and
anything that needs a fresh install (a wipe is only ever done here). Not good for: pixels, games, the Deck's own AI,
timing. **A stand-in pass is never written as a Deck pass.**

**What this plan does about speed and quality** (each from a time sink in plan 103's logs):

- **Hand-written chats (new, lane T2).** Several rows stayed "unclear" because the AI never wrote the needed shape (a
  hidden line inside a bold heading; a step list; two covered answers). The plugin draws a saved chat from its file on
  every switch, so a driver can now place a chat with exactly that shape, look at it, and take it away. This alone
  should close three stuck rows.
- **The "panel out of focus" recipe.** Rows have waited for the page to lose focus by chance. An October evidence
  file holds a route that produced it on the first try (a game up for eleven minutes, the paperclip's "close menu and
  take screenshot", then the chord that reopens the menu). Plan 104 tries it first; if it works there, this plan's
  runbooks use it as a numbered step for every D-pad row.
- **Wait for the answer by the log line**, not by the page's text (the text test returned 15 seconds early once).
  Plan 104 builds a script that runs a whole list of questions on the Deck in one call and waits this way, and brings
  the driver's rules up to date with the tools; this plan's runbooks use both, and lane T2 adds only what they lack.
- **Small reads.** Three drivers stopped last time because their own tool output filled them up. Runbooks ask for a
  press and a small read of the ring; big results go to a file.
- **One cheap look before each block:** the driver reads each named control off the screen before the block starts.
  Two runbooks named controls that do not exist last time (one of them was this plan's tab-sections walk: Terse mode is
  no longer a switch on Settings, it is the first stop of a slider on the Ollama tab).
- **Memory is a hard gate:** free memory read before every question and every game launch; no picture question over a
  game; nothing heavier than Deep Rock Galactic: Survivor.
- **The Deck is kept awake for the whole session** and its wake state is read at the start of every block.
- **Two machines at once.** Fresh-install and first-start rows go to the stand-in while the Deck does the rest.

**Asks for the Deck tools project** (a change there cannot load into a running chat, so the bookkeeper writes these
into the findings log and drafts them as issues for you to send): a wait that knows when an answer has finished;
noticing and clearing the stuck suspend overlay; a screenshot tool that saves where the plugin looks; time limits on
the deploy's copy steps; the library walk that stops at the fifth row; bringing Big Picture forward when Steam thinks
it already has focus; a press that wakes a sleeping Deck; evidence folders that do not default into the repo. None of
these blocks this plan; each has a way around it in the runbooks.

**The blocks.** One driver per machine per block, a fresh one each time, with the last handover. Every block starts
with the machine's status, the keep-awake hold, which screen is live, a settings backup, the build's fingerprint, and
one test chat. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. One evidence file per check, never
overwritten, a screenshot beside every look you will judge.

| Block | Machine | When | What |
|---|---|---|---|
| D0 | Deck | Minute zero, the build plan 104 left on it | **Owed Verify rows the rig can close:** the hidden line inside a bold heading, with a hand-written chat (P97-L3-SPOILER-BOLD); whatever plan 104's blocks did not reach of its rows. **Measurements the lanes wait for:** the Ollama tab with three sections open, a walk to the Reply style slider's Terse stop and back (the tab-sections bug); Left from the mode button while an answer writes (the Decky-button question: does the ring stay or move to the paperclip); the ring on a cut question (what focus shows); does the page follow a writing answer with the ring on it; every left edge on every tab (for lane C5) |
| S0 | Stand-in | Minute zero, after its 30-minute warning | A wipe; the starter-models box on a fresh install (P103-STARTER-BOX-01, as a stand-in pass); the press count from first open to first answer, for lane D3's "before"; a walk of every tab's sections as the build has them |
| D1 | Deck | After wave 1's landings and deploy 1 | One check per landed item (the Show details chips in two rows, and plan 104's rows for the same screen again; the cut question's fade; ten chats; the long answer in view; the agent chip's fill (CHIP-BUTTON-06); Tiny text; Terse and Headline first, three questions each; the first section open on every tab; "N earlier" by game); the look check on each tab touched; the free-play sweep with and without a game |
| S1 | Stand-in | After deploy 1 | The starter set with the voice engine, from a wipe (does the microphone work straight after; what the download box names) |
| D2 | Deck | After wave 2 and deploy 2 | Decode everywhere, with a recording for your eye; the thumbs row; an old settings file still loads; the sections that open by themselves, both directions, and the tab-sections walk again; the look check; the sweep |
| S2 | Stand-in | After deploy 2 | The shorter first-time setup from a wipe, pressed through, with its press count |
| D3 | Deck | The final build, deploy 3 | Every `P105-` row once more; the Ollama tab's new buttons (start, cancel, finish, fail); the models box; Left out to Steam's menu from every tab; the look check on every tab; the second screen, if you docked the Deck |
| DF | Deck | After D3 | The README clips, refilmed at full quality with the AI on the PC |
| DR | Deck and stand-in | The end | The smoke pass; **everything put back:** every setting key by key, the test chats and hand-written chats removed, pinned test chips cleared, no game running, the AI unloaded, the hold released; the stand-in's plugin folder as it was |

**A check only the maintainer can do** goes on the checks page in a "plan 105" round, with its pictures beside it,
never left in the chat: the seven hand checks of § 3; the Decode clip; Tiny text; the softened chips; Headline first
on three real answers; the refilmed clips; the new first-time setup by your own hands once.

## 7. The second opinion: Fable at medium on trial, Fable at max when that does not settle it

Your call 30 (2026-11-16). Both are the `advisor` helper, read-only: one bounded question with the exact files and
evidence, one recommendation back. The helper's model and effort are passed by hand on every start.

**Fable at medium is asked first, and often.** At each of the ten points in the table below, and besides them
whenever the session is unsure. In particular: before any change to the D-pad or a layout lands; at the first Deck
failure of a row (not only the second); when a brief and the code disagree; when a helper's report surprises; when
two helpers clash; for any decision this plan does not cover. Expect 25 to 40 consults. There is no fixed limit, with
one brake: these consults draw on Fable's own weekly counter (31 percent used on 15 November). **If that counter
passes 80 percent, medium is asked only at the ten points in the table.**

**Fable at max is asked only when the medium consult did not solve it.** That means one of four things:
1. the medium answer says its confidence is low, or names something it could not settle;
2. the session acted on the medium answer and the thing failed again (a Deck row, a landing check);
3. the session has read the evidence, disagrees with the answer, and can say why in a sentence;
4. two medium answers on the same matter contradict each other.

The max consult is given the medium question, the medium answer and what has happened since. At most ten. "The
second opinion reads it" in the lane tables means the medium read; a max read follows only on those four grounds.
The six D-pad and layout lanes keep their other gate unchanged: a Deck measurement or your pick before they start,
and their Deck rows before they count as done.

**The trial's verdict goes in the report (§ 13):** how many medium consults; how many settled the matter; how many
went up to max, and on which ground; whether max then said something different; what each kind cost; and one
recommendation, medium as the standing second opinion or not.

| # | When | The question |
|---|---|---|
| 1 | As wave 1 starts | The briefs against the code at the new tip: does any brief name a cause the code does not have, a file another lane owns, or a Deck pass its tests cannot stand for? |
| 2 | Before A6 is built | The D-pad design for "N earlier" by game: any hop across containers, any walk that can loop, anything that breaks the jump from the Search tab? |
| 3 | After block D0's walk | The tab-sections bug: what the walk shows, where the cause is, and whether the switch for self-opening sections should be built on the same change or after it |
| 4 | Before A2 lands | The Show details rewrite against the focus rules, the Deck rows, and plan 104's fixes to the same screen (is any of them undone) |
| 5 | Before B2 lands | Removing five settings in both languages: does any saved settings file on a real Deck break, and is anything still reading the old keys? |
| 6 | Before P1 lands switched on | The Headline numbers: more answers open with their point, no fact lost, nothing given away |
| 7 | Before C5 is built | The rule for Left: which edges, how many presses, and what it does to the shipped fix for Left holding still |
| 8 | Before D4 lands | The Ollama tab's hand-made D-pad chain after the buttons change roles: can the ring jump or vanish |
| 9 | When anything has failed on the Deck twice | What the two failures say, and what to try third |
| 10 | Before the report | What to tell the maintainer first, what to leave open, which items must not be called done |

Log, one row per consult: time, medium or max, the question in one line, the answer in one line, what it changed,
whether it settled the matter ("yes", "no", or "went up to max, ground N"), the cost.

| Time | Level | Question | Answer | What changed | Settled? | Cost |
|---|---|---|---|---|---|---|
| 11-17 00:20 | medium | 1: the briefs against the code at the new tip | D2's Cancel cannot stop the build; the mode-button reading cannot tell the answers apart; B3 needs a measurement; land C3 before P1; D4b needs a machine without the engine | D2 made the build's stop real; the driver read the paperclip; B3 got a Deck measurement | yes | ~62k tokens |
| 00:27 | medium | 2: the "N earlier" by-game D-pad design | build, with three changes (one place decides the grouping; Down lands on the question's text; a test reset) | A6 built with them | yes | ~64k |
| 00:33 | medium | 5: removing the animation settings (B2's plan) | build; delete decode's own reduced-motion branch; the scramble's unused looks as a third commit; carousel focus code to a later small lane | B2 built with them | yes | ~51k |
| 00:46 | medium | 3: the tab-sections walk and the switch design | the old bug is gone; build the switch now with four changes | C2 built with them | yes | ~60k |
| 02:17 | medium | A6's built change, before landing | land as is; one real Left and one real Right on the Deck | none | yes | ~82k |
| 02:18 | medium | 4: the Show details rewrite against the focus rules and plan 104 | land after the Session chip lifts clear of the dock and a lost-focus Right is held; three rows is right | A2 made both | yes | ~106k |
| 02:55 | medium | D3's built first-time setup, before landing | two fixes first: OK while a switch save is in flight; the beta line could wrap | D3 fixed both | yes | ~90k |
| 02:58 | medium | C2's built switch, before landing | land as is; the Deck reads the glide at four landings | added to block D3a | yes | ~51k |
| 03:10 | medium | 7: the rule for Left (C5's plan) | build as planned; a pause ends a run of Lefts; a held Left never counts; leave out the places where code and Deck disagree | C5 told | yes | ~36k |

## 8. Things to bring to the maintainer's attention

- **The planning chat was at extra-high effort; you asked for high.** A chat cannot change its own setting.
- **Two plans were written on the same day for the same repo.** I found the other chat's plan 104 only because its
  placeholder file appeared while I worked; mine is 105 with D142 and rows starting `P105-`. Messages between the two
  chats did not get through in either direction while both were busy (my three were still queued; the one it says it
  sent never reached me). The split was settled from the plan files in the repo, and it took most of what I had
  planned as bug lanes: six of the ten open bugs are plan 104's. **This plan is therefore mostly features and Verify
  rows: its own bugs are four** (the tab-sections bug, the README clips, the two documents).
- **Ten notes you left on the checks page in October are still unanswered** (call 21). Plan 104 passes them to this
  plan. I have not read them yet: the page's saved notes could not be read from this chat's tools, so the session's
  first act is to read them.
- **Verify cannot reach zero without about an hour of your own hands** (§ 3). The plan closes what a rig can.
- **All-out bursts stop the testing too.** Fifteen helpers fill a five-hour window in under an hour (plan 103 saw
  28 minutes); then nothing
  runs until the reset, the two drivers included. You chose this; if you would like the test machines to keep working
  through each window, say "keep testing alive" at go and the session holds back the last 40 percent for them.
- **The roadmap file is nearly full** (95 of 100 KB). The bookkeeper's first job is to move older text out, word for
  word. Every landing waits for that.
- **The tab-sections bug points at a control that no longer exists.** Terse mode stopped being a switch in October;
  it is the first stop of the "Reply style" slider on the Ollama tab. The last Deck walk looked on the Settings tab,
  which is why it came back "unclear". The lookup found no cause in the code, so the walk in block D0 decides whether
  there is still a bug at all.
- **Two findings passed to plan 104, because the entries are its:** my lookup read the "long chat not summed up" as
  no fault (no summary was due; that path writes nothing), and found that a settings save which fails is silent,
  which would explain the first-start message.
- **The "cut" chip is the designed look, which you have now asked to soften** (call 14). Plan 104 fixes the check
  that raised it; this plan builds the softer look.
- **Smaller corrections:** the document says six files call Steam's focus transfer directly and the roadmap says 17;
  the code has 21. The "..." button on the Ollama tab is "Browse models…". The entry on the answer's end "not
  following" is half wrong: it follows, but in jumps, and probably stops when the ring is on the answer. The models
  box shows 3 of its 25 models by default because one filter is on from the start. A cut question already has a fade
  today, at the bottom and always on; the entry describes a different one.
- **Decode as the default deletes two chip styles** (call 16). Easy to take back for a while; say so if you want them
  kept.
- **The voice engine step is the heaviest thing in the starter set** (call 20): a container tool, a download from one
  more site, and a build that can take half an hour. It is why the security reviewer reads lane D2.
- **A bigger models list needs facts from somewhere.** Today the list is written by hand in the code; nothing feeds
  it. The helper takes each new row's size and licence from the model's own public page and the licence reviewer reads
  the result; no row is added from memory.
- **About 190 copies of the repo will be on disk by the end** (152 old ones now; the disk has 115 GB free). Clearing
  the old ones is a job for the copy script's own prune, never git's. Worth doing before go; not this session's job.
- **A mistake of mine while planning:** I started the new drawing board in a folder that already held the mods board
  and wrote over two of its files. Both were restored from git at once and the eleven files I had added were removed;
  nothing was lost. The new board is in its own folder (board 5).
- **Time and usage.** About 60 helper runs: three to four usage windows, 16 to 20 hours on the clock. Read at
  planning's end: see § 12. The week resets Wednesday 18 November at 08:00 EST. Plan 104 runs first, expects a day to
  a day and a half, and expects to leave the week's counter above half; so this plan most likely starts on the 16th
  and may have to stop at the 90 percent line before the reset and finish after it. Starting it after Wednesday
  morning avoids that.
- **The Fable medium trial changes who reads the riskiest work (call 30).** The six D-pad and layout lanes were
  going to get a Fable-at-max read before landing. They now get the medium read first, and max only on the four
  grounds in § 7. The Deck rows still decide whether each one is done.
- **Medium consults use Fable's own weekly counter**, which resets with the week (Wednesday 18 November, 08:00 EST).
  § 7 has the brake at 80 percent.
- **The review report will sit unanswered if you are away** (call 31). The session does not act on it without you;
  it finishes everything else and says so at the top of its final report.
- **The planning chat made one commit, at your word on 2026-11-16, and pushed nothing:** this plan, its two asset
  files, board 5 and the Headline-first page (both under `docs/demos/`).

## 9. Standing rules while nobody is watching

Plan 103 § 9 where it applies: one test chat per machine; every roadmap move names the row it owes, and nothing moves
to Done without its evidence file; nothing personal leaves the Deck. And for this plan: **a wipe ("Clear all data")
is only ever done on the stand-in, never on the Deck**; a hand-written chat is on the put-back list from the moment it
is placed; the stand-in is never driven outside an announced window; no question over a game heavier than Deep Rock
Galactic: Survivor, and no picture question over any game; the plugin is never reloaded with a game running; a driver
never presses A on the question box; the Internet downloads permission on the Deck is never switched by a driver
unless the row is about it, and is put back.

## 10. Keeping the PC and the Deck awake, and usage pauses

The desktop app keeps this PC awake. The rig's hold on the Deck is taken at go and renewed by every block; it is not
released until block DR (call 10). Before a pause for a usage reset the session leaves a background timer running
that ends at the reset, so its finishing wakes the chat. § 12 keeps a pick-up list current: the tip, what has landed,
the helpers in flight with their branch names, and the next three acts, so this chat after a pause, or a new chat,
can carry on with nothing re-planned.

## 11. Paperwork and the reports

- **After every landing chain and every block:** the bookkeeper's sweep (§ 5k), one commit; a few lines in § 12.
- **New bugs and new checks found on the way:** into the roadmap at the next sweep, into the report, and (one- and
  two-star, cause known) into a helper round the same session, about an hour each. A bug that resists is written up
  and left open.
- **At every stopping point:** the five lines of § 5, "Waves".
- **The report, at the end,** in § 13: what you must do next; what a player notices; the code work by area (file
  paths, a technical explanation, what popped up and how it was handled, what you could have done differently, as
  AGENTS.md asks); a plain developer guide to what was built; what failed and why; what is left and why; the numbers.
  The checks page gets its round; plan 33 gets its rows; the Deck tools findings go into `docs/mcp-setup.md`.
- **The review report** (§ 5r), posted at stopping point 3 with a phone alert, and linked from the final report.
- **The second-opinion trial's verdict** (§ 7), in the final report's numbers.
- `python scripts/verify.py --full` passes on the final tip before you are asked to push.

## 12. Progress log and questions

**2026-11-14, planning.** Read at the start: 18 percent of the five-hour window, 8 percent of the week, 11 percent on
Fable's own counter. Both machines answered; nobody held either. Six lookups ran (Sonnet medium). Your answers: § 2,
calls 1 to 14. The Headline-first page: https://claude.ai/artifact/8zJhJ3STmpmT5WJqfpXq3y (open it in a web browser).
Board 5: https://claude.ai/artifact/1LTEzAHYtXZHTJtPAzv7i5 (open it in a web browser signed in to claude.ai; picks
made in the app's own panel are lost on reload). Its source is `docs/demos/mockup-board-5/`.

**What the drawing helpers found on the way (for the bookkeeper's audit and the briefs' re-check):**
- *The AI models box.* It opens with 2 rows, not 3: the default licence setting ("open source only") hides one of
  the three "Deck essentials" models. The licence check also runs before the rule that keeps installed models on
  screen, so **an installed model can vanish from the list while the count at the top still counts it** (read in the
  code, not tried on a Deck; this may be the "hidden Gemma" you reported in October). The "Suggested" chip names a
  picture model the default list hides. Nothing in the list is marked "needs a PC". A bigger list has no source
  today: every fact about a model is typed by hand.
- *The Ollama tab.* A running install takes about 400 px of the tab today and about 170 px in every drawn option.
  Today's in-place install shows no line naming the download sites (only the first-time box does); every option adds
  it. The voice engine install has no Cancel button though a stop exists inside the back end. Six more places that
  look dated in the same way are listed in the helper's report: a lone "…" while Find on LAN searches; the custom
  Pull button's "…"; raw program words as the voice install's progress; the "Cancelled" line drawn red like an error;
  the note-search model's button that sends you elsewhere to watch; two separate Use and Save buttons on a found PC.
- *First-time setup.* Pressed through on the drawing, today's shortest route is **6 presses** from first open to the
  first question (my earlier lookup said three and a wait; it had not counted the ring starting on "Not now", nor the
  Close at the end). The drawn options take 2, 3, 5 and 1. The popup says "about 4.6 GB" and the box "about 4.5 GiB
  in all" (you chose to leave both, 2026-10-22). Not known, and for block S0 to read: where the ring lands on Main
  after the boxes close, and what a Stop leaves behind of half-finished downloads.
- *The tab sections.* Shading only the line, or a bar down the side, costs no height; shading each section as a block
  adds 22 points with all sections shut.

**2026-11-15, the maintainer's picks on board 5** (read from the page's saved picks, and two answers in the chat):

| Tab | Pick | What it means for the lane |
|---|---|---|
| 1, tab sections | **B:** the whole open section is one shaded block | Lane C1 builds B. It costs 22 points of height with every section shut |
| 2, Ollama tab | **B, C and the bar that follows you, "all three together"**; also "B, elsewhere" for the library download and the voice install | Lane D4 builds the job card, the live connection line and the following bar as one look. **A second drawing of the three together is owed first** |
| 3, AI models | **C:** word buttons and two switches | Lane D5 builds C |
| 4, first-time setup | **A**, with the note "Too many words on this popup"; **not C** | Lane D3 builds A. **A second drawing with fewer words is owed first** |
| 5, suggestion chips | Liked "Today" and "Two lines, no sliding"; answered in the chat: **"Two lines only when selected"** | Lane B3: a chip stays one line and slides as today, and opens to two lines only while the ring is on it. **A drawing of that is owed first.** This replaces "soften the cut ends" (call 14) |

The three owed drawings were made the same evening, after the usage window reset, and are on the board as "Round
2" above each tab's first round (the options and what was measured: the board's README). **C1 and D5 are free to
build; D4, D3 and B3's second half wait for your second look.** Read at 21:04 EST before the helpers started: 8
percent of the five-hour window, 31 percent of the week, 31 percent on Fable's own counter.

**2026-11-16, late evening: the maintainer's second look** (read from the page's saved picks and notes):

| Tab | Pick | What it means for the lane |
|---|---|---|
| 2, Ollama tab | **"Elsewhere"** (`t2-2K`), with the note "Let's go with this one" | Lanes D4 and D4b. The job card, the live connection line and one bar. **The bar shows only when the card cannot be seen** (the section is folded shut, the card has scrolled away, or you are on another tab); the card never shrinks, so nothing below it jumps. The library download and the voice install get the same card, and the voice install gets its first Cancel. There is only ever one bar: with two jobs running it shows the newest and a "2 jobs" chip, and A on the chip switches to the other. That last part is the drawing's starting setting: the page does not save which of its three switches you looked at, so say so if you meant "both stacked" or "newest only" |
| 4, first-time setup | **C** (`t4-2C`), with two notes. On A: "I want a checklist of all the things it's installing and from what site". On C: "Why don't we know the size of Ollama? Just look at their releases and avg the MB size" | Lane D3 builds **round 3's C** (`t4-3C`, drawn 2026-11-16 from those two notes): five rows, one per download, each with its size and its site, and the total at the top right. It has 111 words (round 1's A had 211) and is 442 of the 454 points the Deck's screen leaves, measured in a stand-in font. That is only **12 points to spare, so the lane measures it on the Deck in Steam's own font and in both languages before it lands** |
| 5, suggestion chips | **C** (`t5-2C`), with the note "Saves the most vertical space, which is still precious" | Lane B3: while the ring is on a long chip, the chip widens across the row on one line and its neighbours shrink to their first word and "…". No second line and no change of height. Chips without the ring slide as today. This replaces "two lines only when selected" |

**The download sizes, looked up 2026-11-16 (your note asked for Ollama's):**
- *Ollama itself.* The file the Deck fetches (`ollama-linux-amd64.tar.zst`) was 1,371 to 1,474 MiB over its last 11
  releases (0.40.6 to 0.40.16), 1,442 on average: **about 1.5 GB**. Unpacked on your Deck it takes 2.4 GB.
- *The two starter models.* The answer model `gemma4:e2b-it-qat` is 4,336 MB, **about 4.3 GB**; the note-search model
  `nomic-embed-text` is **274 MB**. Both read from Ollama's own model site.
- *The speech models:* about 230 MB (the plugin's own figure; not measured again). *The voice engine's image:*
  503 MB, **about 500 MB**, read from its publisher's site for the exact version the code pins.
- **All five together: about 6.9 GB.**

**Found on the way, for the bookkeeper's first audit (K0) to file as a bug.** Today's first popup says "Install
Ollama downloads it and the starter models, about 4.6 GB". The 4.6 GB is the two models alone. With Ollama itself
the download is about 6.1 GB, and about 6.9 GB with the speech models and the voice engine. The Ollama tab's "about
4.5 GiB" does not count Ollama either (by the arithmetic it is the two models and the speech models). So a person is
told a number about 1.5 GB short, and needs more free space still, because Ollama unpacks to 2.4 GB. Lane D3
replaces both texts; until it lands the released build shows the short number. This is a different point from the
GB and GiB pair you chose to leave on 2026-10-22.

**Lane D4 is now two lanes** (§ 5). Your pick puts the same card on three downloads, in three files. D4 (Opus
extra-high) builds the card, the live line and the shared bar on the Ollama tab; D4b (Sonnet high) then puts the
library download and the voice install on them. One writer per file, and the hard D-pad part stays with D4.

**Small questions the drawings raised. "Go" takes each default; say so to change one:**
1. Coming back to a tab, is the first section open again, or as you left it? *[Open again, every time.]*
2. May the box of raw installer lines leave the Ollama tab? *[Yes. The lines still go to the plugin's log.]*
3. While a job runs, "Browse models…" turns grey and loses its dots. *[As drawn.]*
4. A half-second guard so a double press on Update cannot start and cancel at once. *[Yes.]*
5. The AI models box opens on 17 rows. *[As drawn.]*
6. A model outside your licence setting: dimmed or hidden? *[Dimmed, and an installed model is always shown.]*
7. The checklist: a plain list, or boxes you can untick to leave a download out? *[A plain list. All five install.]*
8. Two jobs at once on the bar. *[The newest, with a "2 jobs" chip.]*

Answered by the picks themselves, so no longer asked: one press turns on Internet downloads (the sites and sizes
are on that screen); the beta line is small print with no "Got it"; no microphone switch on the first screen; the
56 px bar stays as drawn; every site is named on the first screen; no floating chip bubble.

**2026-11-16, later the same evening: two more notes on the checklist, and three changes to the setup.**

You liked round 3's checklist (`t4-3C`) and wrote on it: "I think it'll be good to copy the permission that is
auto-enabled to this screen. User toggles it and hits a confirm OK", and "Also show me a version with functional
tickboxes". Both are drawn as **round 4** on the board's first-time setup tab:

| Drawing | What it shows | Measured |
|---|---|---|
| Round 4, A (`t4-4A`) | The five downloads with sizes and sites; under them the Internet downloads switch in the Permissions tab's own words, starting off; then OK. OK is grey until the switch is on, and pressing it early moves the ring to the switch. "Use the AI on my PC" and "Not now" sit beside OK | 102 words; 392 of 454 points, 62 to spare; **4 presses** from first open to the first question (3 if the ring starts on the switch). Round 3 took 2 |
| Round 4, B (`t4-4B`) | The same, and every row has a tick box. The AI engine and the answer model are locked on. The note-search model, the speech models and the voice engine can be unticked; the last two tick together. The total follows the ticks (6.9 GB with all, 5.8 GB with the least) | 125 words; 392 points; 4 presses |

To make room for the switch, the two big choice tiles became three buttons on one row; that is why round 4 is
shorter than round 3 (442 points) though it holds more. Heights are from a stand-in font, as before.

**Your pick, the same evening, in the chat: "B: with tick boxes"** (`t4-4B`). Lane D3 builds it. What follows from
the pick, and is in the brief:
- Nothing turns a permission on by itself any more. The person turns Internet downloads on with the switch, then
  presses OK. (The earlier "one press turns on Internet downloads" no longer holds.) It takes 4 presses from first
  open to the first question, 3 if the ring starts on the switch.
- The AI engine and the answer model cannot be unticked. The note-search model can; the speech models and the voice
  engine can, together.
- **A download left unticked must be offered again where its feature is first used:** the knowledge base without
  its note-search model, Voice input without its two parts. The lane finds what each of those places does today
  when its download is missing, and says so in its report before it changes them. This is the part that makes B
  more work than a plain list.
- Small question 7 above is answered: boxes you can untick. Still open on the drawing, with its default: the ring
  starts on "Not now" *[your rule of 18 October]*, not on the switch.

**Your three changes to the setup** are calls 29 to 31 in § 2: at most fifteen helpers at once; Fable at medium as
the second opinion on trial, with Fable at max only for what medium could not solve (§ 7); one pass by the security
reviewer and the open-source reviewer with a report that waits for you (§ 5r, lane R).

**Read at planning's end (2026-11-14, about 15:32 EST):** 74 percent of the five-hour window (it reset at 15:40),
16 percent of the week, 21 percent on Fable's own counter. Both planning chats drew on these at once; this one used
six lookups and four drawing helpers (all Sonnet).

**Open questions for you (none blocks the plan being run):**
1. All five of board 5's looks are picked. Left: the small questions above, each with a default.
2. Calls 15 to 28: "go" takes every default.
3. Whether to dock the Deck once for the second-screen look checks (§ 4, step 7).

**2026-11-17, the run (an Opus chat, told "Implement plan 105" at 23:45 on the 16th).**

- **Go:** usage 12 percent of the five-hour window, 52 of the week, 41 on Fable's own counter. The PC is kept awake by
  the app; the Deck is held awake all session. The full checks passed on the starting tip in 15 minutes.
- **The briefs' re-check** (four lookups): no brief out of date; many moved lines; written at the end of the briefs
  file. **Your call at 00:20:** five more helpers over the fifteen, held until your "go" (00:22). The five-hour window
  filled at about 01:05; everything paused and picked up after 02:10.
- **Landed by 03:26, every batch through the full checks** (some batches of several lanes at once to save time; the
  batches were green): the agent chip's blue fill; the landing script's full log; the old avatars and the unused pack
  manager gone; the characters' voices document; Tiny text; the starter set builds the voice engine (Cancel stops the
  build); the ten-chat delete list on Ask; the first section open and the shaded sections; the cut question's fade;
  a long answer followed while it writes; the driver scripts; a long question no longer refused; Terse at about 40
  words; Headline first (built, switched off on its numbers); "N earlier" by game; the AI models box; Decode as the
  default; the Show details chips; the thumbs row; the new first-time setup; sections that open as you walk; the
  widening chip; the answer's foot after a long answer. Three bookkeeper sweeps keep the roadmap current.
- **Deck blocks:** D0 (measurements: the old tab-sections bug is gone; Decky buttons do run their Left handler; the
  page did not follow a writing answer; the left edges), D1 and D2 (passes listed in the roadmap and testing rows; the
  bold-heading spoiler row passed at last). One failure found a real bug (the page stopping short after a long
  answer), fixed the same hour.
- **Stand-in (this PC):** three tries could not run: Big Picture would not come forward (you fixed it), then the
  Deck tool cannot install from a copy of the repo, then Decky's own panel errors on this PC with both builds. **It
  waits for you to restart Steam** (or update Decky to 3.3.1, your call). Its backup is outside every repo (the
  settings file holds your Steam Web API key).
- **Your October notes on the checks page** live only in your browser; no session can read them. Paste them in the
  chat if you want each answered.

## 13. Report

(Written at the end of the session.)

## 14. Subagent reports and follow-ups

The second opinion (§ 7): every consult logged, medium and max, with what it changed and whether it settled the
matter. The review pass (§ 5r): both reviewers' full answers kept here, the report for the maintainer beside the plan. The security reviewer: reads lane D2 (a
container build and one more download site) and lane T2's scripts (they reach the Deck over SSH). The licence reviewer: reads lane D5's new rows. Focus and layout: A2, A6, C2, C5, D3 and D4 carry
the second opinion's read before landing and their Deck rows as the gate.
