# 97 — The bug list and the Verify list toward zero: the second sweep

Written 2026-10-22 by the planning chat (Fable 5.1 at max, the maintainer's choice), in the cloud, from the roadmap as
filed at tip `30f6166`, the lessons file, the bug-wave runbook, plan 96 and its report, and the three scoping notes.
**The implementation session runs on the maintainer's PC in the Claude Code desktop app.** The Deck, the test rig and
the workshop folder can only be reached from there; a cloud session cannot drive the Deck.

**Status:** PLANNED 2026-10-22. Nothing started. The maintainer's calls are in § 2. The briefs, the helper rules and
the first three Deck runbooks are written (§ 5 and § 6 name the files), so the session can start helpers and the Deck
in its first half hour.

**Who runs it:** an Opus 5.5 **high** chat orchestrates and lands (the maintainer's call for this one, § 2 item 10).
Sonnet 5.5 high lanes build the fixes that need a judgment, Sonnet 5.5 medium the mechanical ones, Haiku 5.5 high two
one-star documentation lanes (on trial, logged). Focus and layout fixes go to **Opus 5.5 medium** lanes, each after the
Deck measurement named in its row. The two three-star root-cause fixes go to Opus 5.5 high. A **Fable 5.1 max** second
opinion (the `advisor` helper, started at max effort for this plan, the maintainer's trial) is asked at most five times
(§ 8). The deck-driver helper runs the blocks; the bookkeeper files the paperwork. Never alongside another Deck chat.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1, 3 and 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [plan 96](96-ship-ready-bug-session.md) §§ 8 and 9
(how the last night went, what slipped); the three scoping notes
([the picture answer](../audit/plan96-scope-screenshot-answer.md), [the language pick](../audit/plan96-scope-reply-language.md),
[the ghost strip](../audit/plan96-scope-ghost-tab-bar.md)); the roadmap's Bugs and Verify sections as of the start.

**Files for this plan:** the helper rules [assets/97-helper-rules.md](assets/97-helper-rules.md); the briefs
[assets/97-lane-briefs.md](assets/97-lane-briefs.md); the Deck runbooks [assets/97-runbook-block-A.md](assets/97-runbook-block-A.md),
[assets/97-runbook-block-B.md](assets/97-runbook-block-B.md), [assets/97-runbook-block-C.md](assets/97-runbook-block-C.md).
Evidence files: `plan97-<ROW>.json` in the workshop's `test-evidence` folder. Handovers: `assets/97-handover-<block>.md`.

---

## 1. One sentence

Fix every bug on the roadmap that a helper can fix tonight, measure the eight that need the Deck first and fix those
too, nail down the root cause of the D-pad freeze and the ghost tab bar with a second opinion, run every owed Deck check
the rig can run while the helpers build, and leave the Bugs list and the Verify list holding only what truly needs the
maintainer's own hands, with the roadmap current at every step.

## 2. The maintainer's calls (2026-10-22, the planning chat)

1. **Scope.** Everything in Bugs is in, except the README refilm (a filming job for the maintainer's PC and camera
   settings, not a helper's). The tab glide stays in: mock-ups are drawn first, the maintainer picks one, then it is
   built. The "39 frames a second" entry closes with a known-problems line in the guide. The two test-rig bugs are
   fixed in the rig's own repo during the session, committed to a branch there and merged into that repo's main.
2. **The driver may move the Deck's Ollama and voice engine aside**, run the three checks that need a Deck without
   them, and put them back (with a model count before and after).
3. **Three small calls.** Down from Clear cache landing on Open all is by design, if Right reaches Clear all data
   (one Deck read, then it closes). Steam's own language dropdown on About is exempted from the look check. A section
   summary with no room is hidden whole, never shown as a sliver.
4. **The chips near the end of an answer** stay OPEN until the maintainer's exact presses arrive. A known-problems
   line goes in meanwhile. It is never called resolved without them.
5. **The maintainer's own checks:** about ten minutes of eye checks before leaving (§ 4), the touch and the
   game-start checks when back, the child account another day.
6. **Budget:** 0 percent on the week and on the five-hour window at go. The five-hour window resets about three and a
   half hours after go; the week resets next Wednesday at 9 in the morning.
7. **The second opinion:** at most five Fable consults, each logged in § 8.
8. **The knowledge-base file:** the library update's version compare is in; the wrong-subject notes bug stays out.
9. **Standing rules while away:** a fix that fails on the Deck twice moves up one model tier without asking; a new
   one- or two-star bug gets one helper round of about an hour; anything blocked gets the safest choice at once
   **and is raised in the chat and the plan at that moment** (the maintainer checks in remotely and is not relying on
   phone notifications), so they can approve the best fix rather than the cautious one.
10. **The one running the session is Opus 5.5 at high** (the table says extra-high for whoever lands; the maintainer
    chose high for this session).

## 3. What a player notices after this session

- Asking about an attached screenshot gets an answer instead of an error.
- The reply-language pick on About sticks, on screen and in the file, and the next answer follows it.
- A hidden block inside a bold heading no longer leaves two stars showing; an answer no longer flickers a line
  shorter while it writes; glossary words are underlined when the game is named but not running.
- With the AI on a PC, answers write in a little quicker; on the Deck itself nothing changes.
- The About tab shows which build is on the Deck.
- After "Explain further" the ring is on the question box, not on nothing; Up from Find LAN lands on the address box
  every time; a section summary with no room disappears whole at Large text.
- Renaming a chat with an external controller brings up Steam's keyboard (if the research finds the route).
- Pressing "Update knowledge base" with a newer library than the published one says "up to date" and downloads nothing.
- The D-pad freeze and the ghost tab bar each have a measured cause, a fix on the Deck, and a log line that shows when
  they would have happened.
- Switching tabs with LB and RB glides (once the maintainer has picked a mock-up).
- The roadmap's Bugs and Verify lists hold only what needs the maintainer's own hands.

## 4. Before go

**The maintainer, about fifteen minutes, in this order:**

1. **The rig repo: done 2026-10-22, before go.** The maintainer merged the 2026-10-14 branch (plan 93 lane R's two
   fixes: opening the plugin after a reload; the settings snapshot) into the rig's `main` and rebuilt the server, so
   block A's check A1 runs tonight. (The desktop app loads the rig's tools once, when a chat starts.)
2. **Phone notifications:** the maintainer is not relying on them (2026-10-22). A blocked question is raised in the
   chat and the plan's questions list; they check in remotely.
3. **The Deck free and online: done 2026-10-22.** Still to confirm at go: the rig's stop switch re-armed; the Deck on
   its own screen; Deep Rock Galactic: Survivor on the Recent Games row; the Deck's own AI installed; the PC's Ollama
   running (one check needs it).
4. **Ten minutes of eye checks, answered on the checks page.** The "Wednesday 22 October" group is on
   [Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4) (added by the planning
   chat 2026-10-22; the session reads the answers at go): the tab bar's thicker icons (P92-ICONS-AFTER); the chips' look,
   the help and agent chips, a short chip's centring and the chip pace (CHIP-BUTTON-01, -05, -06); the rating row's look
   (P79-M7-RATING-ROW); the scramble's look and the frame-rate verdict (SCR-01, SCR-03, SCR-09); the chips-near-the-end
   presses (call 4). If the Deck can sit docked for the first fifteen minutes and be undocked before leaving, the monitor
   half of the look check (QA-LOOK-01) runs first; otherwise it waits until the maintainer is back.
5. **The usage screen:** 0 percent on both counters at go (the maintainer, 2026-10-22); the five-hour window resets
   about three and a half hours in, the week next Wednesday at 9 in the morning.
6. **Open the Opus 5.5 high chat in the desktop app, in the repo folder, on `experimental`,** and say: "Run plan 97."

**The session's first acts (the first thirty minutes), in this order:**

1. `git status`, the tip hash, the tail of the decisions file (this plan's entry, D134, is written by the bookkeeper in
   the first sweep from § 2; if another session has taken 134, take the next number and say so here). Start
   `python scripts/keep_awake.py --hours 10` in the background (the desktop app keeps the PC awake too; two holds are
   cheaper than one freeze). Set the 20-minute wake check and, before any pause, a background job that ends when the
   pause should.
2. Read the maintainer's answers on the checks page (§ 4 item 4: the group is already there) and carry them into the
   first sweep.
3. The baseline: `python scripts/verify.py --full` on the tip, once, in the shared checkout. Every copy is cut from
   that tip.
4. Cut the wave 1 copies (`python scripts/worktree.py create p97-<lane> --base experimental`), confirm each sits at the
   tip, and start the wave 1 helpers two to three minutes apart (§ 5a), each with the rules file plus its brief plus the
   tip hash and its copy's path. Read the usage figure first; the spawn line stops new helpers at 75 percent.
5. Start Deck block A with a fresh driver at the same time (§ 6). The Deck never waits for the helpers.
6. Hand the bookkeeper the first sweep: the D134 entry appended to the decisions file (its text is § 2), the ten calls
   into the roadmap entries they touch, the 39-frames line's entry marked "closes when the guide line lands", and the
   two Verify items that close on the calls alone (§ 5c).

## 5. The work

Lane letters: **L** a bug fix in this repo, **G** the tab glide, **X** the rig's repo. Each row names the roadmap
entry by what a player sees, who builds it, when it may start, and the Deck row that proves it. The brief for each is
in [assets/97-lane-briefs.md](assets/97-lane-briefs.md) under the same letter. Lanes never edit the roadmap, the
testing documents or the changelog.

### 5a. Wave 1: from minute zero (the cause is known or scoped)

| # | Stars, tag | What a player sees today | Who | Done when (the Deck row) |
|---|---|---|---|---|
| L1 | ★★ ask | A question with a screenshot attached answers "incomplete stream" and nothing else | Sonnet high | The failed 408 KB and 250 KB screenshots each get an answer; the log shows the picture went out small; no "device lost" in the Ollama log. **P97-L1-PICTURE-ANSWER** |
| L2 | ★★ ui | The About reply-language pick flips back to Follow system | Sonnet high | Pick Czech: the button says Czech, the file says Czech, still Czech after close and reopen; a short answer follows it; back to Follow system. **P97-L2-LANGUAGE-PICK** |
| L3 | ★ reply | A hidden block on one line inside a bold heading leaves two stars showing | Sonnet high | An answer with that shape shows the heading bold and the cover whole, no stray stars (two differently worded tries; else proven by its tests). **P97-L3-SPOILER-BOLD** |
| L4 | ★ reply | While an answer writes it briefly shrinks by a line (6 to 27 px) | Sonnet high | The height sampler over two answers reads no dip over 2 px. **P97-L4-ANSWER-DIPS** |
| L5 | ★ reply | Naming a game with nothing running gets no underlined glossary words | Sonnet high | No game running, a question naming Deep Rock Galactic: Survivor: its words are underlined; the running game still wins when one runs. **P97-L5-GLOSSARY-NAMED** |
| L6 | ★ ui | About shows "Version 0.5.0" and no build | Sonnet medium | The About title line shows a build id equal to the deployed bundle's short hash. **P97-L6-ABOUT-BUILD** |
| L7 | ★ docs, ollama | Two wording finds (the starter set's size written two ways; the AGENTS.md focus-transfer sentence) and the 39-frames known-problems line | Haiku high (on trial; Sonnet medium if it stalls) | The size reads one way everywhere; the sentence matches the code; the guide's known-problems list has the frame-rate line. No Deck row |
| L8 | ★ ui | Steam's own language dropdown on About reads as a light button to the look check | Haiku high (on trial) | The look check on About reports nothing. **QA-LOOK-01 (About)** |
| L9 | ★★ KB | "Update knowledge base" offers any different version as newer, even an older one | Sonnet medium | With the newer 2026.10.17 library on the Deck and 2026.09.26 published, Update says up to date and downloads nothing; the log names both versions. **P97-L9-KB-UPDATE** |
| L10 | ★★ platform | With an external controller, Rename chat never brings up Steam's keyboard | Sonnet high, **research only** (45 minutes, one proposal), then L10-fix in wave 2 | — |
| L11 | ★ reply | With the AI on a PC the answer should stream in a little quicker | Sonnet high | Against the PC: a shorter scrambled tail, faster settle, faster growth; the Deck's own pace unchanged; frame rate within 5 of today's; a recording for the maintainer's eye. **P97-L11-PC-PACE** |
| L12 | ★ focus | After A sends "Explain further" the ring is on nothing | Opus medium (measurement: `plan96-P96-F6-EXPLAIN-try2.json`) | After A on the open word the ring is on the question box; Up and Down move. **P97-L12-EXPLAIN-RING** |
| L13 | ★ ui | At Large text a section summary shows a sliver or nothing, and the arrow touches the edge | Opus medium (measurement: `plan94-P94-TEXT-SIZE.json`; block A re-measures on tonight's build) | At Normal and Large every summary is whole or absent, the arrow keeps its gap, nothing past the right edge. **P97-L13-LARGE-TEXT** |
| G1 | ★ tabs | Switching tabs with LB and RB jumps | Sonnet high, **mock-ups only**: three options drawn from the real bar on one page with pick buttons | The maintainer's pick on the page. Then G1-build in wave 2. **P97-G1-TAB-GLIDE** |
| X2 | ★ QA (rig) | The rig reads every folded section line as 92 percent visible, and after a reload the Decky tab is gone from the rail for over 100 s | Sonnet high, in a copy of the rig's repo, branch `bonsai-p97` | The sampler reads the lines as the eye does on the saved evidence shape; the open-plugin step waits out the rail; tests in the rig repo. Merged into the rig's main at the end; proven in the next chat. |

Fifteen helpers at once at most (the maintainer's cap). Wave 1 is fifteen if every lane starts together; start the
Opus medium lanes and the rig lane ten minutes after the Sonnet ones so the PC is never asked for fifteen test runs in
one minute.

### 5b. Wave 2: after a Deck reading or the maintainer's pick

| # | Stars, tag | What a player sees today | Waits for | Who | Done when (the Deck row) |
|---|---|---|---|---|---|
| L14 | ★★★ focus | After a Steam box, the menu closing or a game launch, Down stops moving the ring until the plugin is reloaded (ten sightings) | Block B's freeze readings and **consult 1** | Opus high | The trigger that reproduced in block B, three tries after the fix: Down moves every time; the plugin log shows the recovery line each time the page had lost focus. **P97-L14-FREEZE**. Then plan 94's Settings trigger three times for the tab-sections entry (b), (c): **P97-L14-SECTIONS** |
| L15 | ★★★ tabs | A second tab strip is drawn over the chat after a touch or a pop-up with a game running | Block B's ghost page read and **consult 2** | Opus medium | The pop-up route three times with a game: Steam's row reads hidden at every read, no second strip in any screenshot, the watcher's log says how often it had to act. **P97-L15-GHOST**. The maintainer's touch check (TAB-BAR-GHOST-01, P84-TABS-02) stays theirs |
| L16 | ★ focus | Up from Find LAN can skip the address box and the Save row | Block A's five readings | Opus medium | Up from Find LAN lands on the address box five times out of five. **P97-L16-FINDLAN-UP** |
| L17 | ★ focus | Two documents disagree about whether a Decky button passes D-pad moves on | Block A's reading (and the library's own source) | Sonnet medium | The documents and the checker say the same thing as the Deck; the dead handlers go or the sentence changes. No Deck row beyond block A's |
| L18 | ★★ focus | From Copy, Down with a game running landed on the Tip chip at a third visible | Block B's prepared setup | Opus medium if it reproduces; else closed as not reproduced on two builds | Down from Copy lands on a chip that is whole on screen. **P97-L18-TIP-CHIP** |
| L19 | ★ ui | Section lines on Settings and Developer read 92 percent visible; the chat name row 83 percent | Block A's screenshots, read by eye | If whole by eye: closed as the rig's own (X2 fixes the sampler). If clipped: Opus medium with the numbers | **P97-L19-CLIPPED-LINES** |
| L20 | ★ ui | After "Download knowledge base" the library switch reads off while the file says on | Block C's re-run | If seen: Sonnet high (the download box closing rebuilds the tab; the section re-reads the setting when it closes). If not: closed as not reproduced on two builds | **P97-L20-KB-SWITCH** |
| L10-fix | ★★ platform | (L10 above) | L10's proposal; **consult 3** only if no clean route | Opus medium | With the rig (an external controller): Sum up → Rename → A on the field: Steam's keyboard shows; one letter typed; Save; the name changed. **P97-L10-RENAME-KEYBOARD** |
| G1-build | ★ tabs | (G1 above) | The maintainer's pick | Sonnet high, Opus review (it touches the tab bar) | Ten fast LB/RB presses: every press lands on the next tab, none lost; reduced motion shows no motion; frame rate while switching at least 45; the free-play sweep clean. **P97-G1-TAB-GLIDE** |

### 5c. Closed by one read, or by the calls alone

| Entry | What settles it | Who |
|---|---|---|
| Settings → Data: Down from Clear cache goes to Open all | Block A reads Right from Clear cache (expected: Clear all data) and Down (expected: Open all). Both as expected: by design, closed with the call. | the bookkeeper |
| 39 frames a second with the game and the AI both on the Deck | The guide's known-problems line (L7). Closes as accepted, the line named. | the bookkeeper |
| qwen2.5vl should not be the model downloaded first (Verify) | The installer half is "by design" since plan 96's call 2 (the Update button re-downloads while downloads are on). Closes to Done with the button half's evidence. | the bookkeeper |
| The Show details line takes the chip's place (Verify) | Every step has passed or was closed as cannot be done on 2026-10-18. Moves to Done. | the bookkeeper |
| Preset chips cannot always be reached near the end | Stays OPEN; a known-problems line; the presses asked for once more on the checks page. | the bookkeeper |

### 5d. The rig's repo

| # | What | When | Who |
|---|---|---|---|
| X1 | Merge the 2026-10-14 branch (plan 93 lane R: opening after a reload, the settings snapshot) into the rig's main and rebuild | **Done 2026-10-22, before go** (§ 4) | the maintainer |
| X1-check | Prove both on the Deck: open the plugin after a reload, first try, three rounds (**P89-RIG-OPEN-AFTER-RELOAD**); three settings snapshots that restore byte for byte (**P89-RIG-SNAPSHOT**) | Block A | the driver |
| X2 | The 92-percent sampler and the rail wait (§ 5a) | Wave 1 | Sonnet high |
| X2-merge | The session merges `bonsai-p97` into the rig's main after its tests pass, writes the findings-log lines in docs/mcp-setup.md (the bookkeeper), and notes that the next chat proves them | The end | the session |

## 6. The Deck, in blocks

One driver at a time, a fresh one per block, about fifteen checks each, a handover note after every block. The Deck
starts at minute zero and is never idle while helpers build. Each runbook says what must be true before a check, the
exact presses, and what counts as a pass in numbers. A walk row says: a landing is a stop, a scroll-only press inside
a section being read is expected, a section taller than the screen is judged by the edge it is entered from.

| Block | When | What | Runbook |
|---|---|---|---|
| **A** (no game) | Minute zero | Setup (lease, keep-awake 480 minutes, screen, settings backup, build, Ollama state, the test chat, parental lock off). X1-check. The readings the wave-2 fixes wait for: Up from Find LAN five times; the Decky-button handler read; the rename field with the rig and the list of Steam's keyboard functions; Clear cache Right and Down; screenshots by eye of the "92 and 83 percent" lines; Settings and Developer at Large text with the look check; the ghost page read on the pop-up route **with no game** (the control). The monitor look check if the Deck is docked. | [block A](assets/97-runbook-block-A.md) |
| **B** (game) | After A | Deep Rock Galactic: Survivor launched (never a reload with it up). The freeze: three tries of the trigger that showed it last (a game up about five minutes, the help chip showing, Down from the question box), with the page-focus logger, plus plan 96's two triggers as controls. The ghost page read on the pop-up route with the game, three times, with the passive watcher. The Tip chip from Copy. The knowledge-base line half (NOTES-BLOCK-04, Strategy) and the ladder (NOTES-BLOCK-LADDER). The real-fight frame rate (SCR-10) if the run allows. | [block B](assets/97-runbook-block-B.md) |
| **C** (verify) | After B, or in parallel with wave-1 landings if B ends early | The owed checks that do not depend on tonight's fixes: Expert's second try (P96-F8-EXPERT); the two Ollama walks re-saved (P93-B10-CANCEL's owed half); the warm-up after the starter set (P96-F2-COLD-START, warm-up half); the screen-only reload for the note offer (P93-B6-NOTE-OFFER, one try); the library switch after a download (L20's re-run); then, with the maintainer's call 2: Ollama aside for the install box's words and Cancel (P96-F13-INSTALL-WORDS, P96-F10-CANCEL) and the voice engine aside for the refresh (P96-F9-VOICE-REFRESH), everything put back and counted. | [block C](assets/97-runbook-block-C.md) |
| **D, E, …** | After each batch of landings | One deploy, then one check per landed fix, in the order the lane table gives (the pass sentences are the rows). Written by the session from § 5 when the landings are known. | the session writes `97-runbook-block-D.md` and on |
| **Second rounds** | As failures come | A fix that failed once gets its second try in the next block; a fix that failed twice moves up one tier with the measurement in hand (§ 2 item 9) and, if it is one of the two root-cause bugs, a consult. | — |
| **Sweeps** | Before the end | The free-play sweep on Main with and without a game (every Main-tab change owes it); the look check on every tab a landed change touched, on the Deck's own screen, and on the monitor when the maintainer is back. | — |
| **The end** | Last | A smoke test on the final build; every setting put back; the normal build; any model pulled for a test removed; pinned test chips cleared; the game closed; the final handover. | — |

**What only the maintainer can do** (on the checks page, answered when they are back): the touch for the ghost strip
after L15 lands; starting one of the four games once by hand so STRAT-SPOIL-NAME-01 can run; the monitor look check if
it did not run before go; the chips-near-the-end presses; the child account for KIDS-LOCK-01, KIDS-FOCUS-01,
KIDS-LOCK-02 and P77-OLLAMA-NOBOX-NOTE's parental-lock half (another day); their eye on the tab icons, the chips, the
rating row and the scramble (§ 4) if not done before go.

## 7. The Verify list, item by item

| Entry (what a player would notice) | Row | Route |
|---|---|---|
| The note offer does not come back after a screen-only reload | P93-B6-NOTE-OFFER | Block C: reload only the Quick Access page through the debugger, once. If the rig cannot: "proven by its tests only", to the maintainer's list |
| A press that opens no box leaves no stale "come back here" note (parental-lock half) | P77-OLLAMA-NOBOX-NOTE | The maintainer, another day (needs Family View and a child account) |
| Hand-written D-pad moves on Ollama-tab buttons never run (the two saved walks re-recorded) | P93-B10-CANCEL | Block C: re-save both walks with `deck_saveCheck` into the workshop's `checks/` folder |
| qwen2.5vl is not the first download (the installer half) | P93-B3-STARTER-DECK | Closes on plan 96's call 2 (§ 5c) |
| The install box's words and the "isn't installed" line | P96-F13-INSTALL-WORDS | Block C, Ollama aside (call 2) |
| Cancel on "Turn on internet downloads?" leaves the line alone | P96-F10-CANCEL | Block C, Ollama aside (call 2) |
| Buttons lopsided or against an edge (the monitor half) | QA-LOOK-01 | Block A if docked, else when the maintainer is back |
| The first answer after an install loads the model in the background (the warm-up half) | P96-F2-COLD-START | Block C: unload the model, run "Install the starter set" (everything already there is skipped), the model is loaded within 90 s. If the warm-up does not run when everything was skipped, that is a finding for a small lane |
| Expert answers longer than Speed, both parts answered | P96-F8-EXPERT | Block C: five new questions per mode |
| The tab bar's icons are easier to see | P92-ICONS-AFTER | The maintainer's eye (§ 4) |
| The Voice input section reads ready when the engine install finishes | P96-F9-VOICE-REFRESH | Block C, the engine aside (call 2) |
| Chips look like chips (rows 01, 05, 06, a short chip's centring, the pace) | CHIP-BUTTON-01, -05, -06 | The maintainer's eye (§ 4) |
| Streamed answers scramble into place (the look; the frame-rate verdict) | SCR-01, SCR-03 | The maintainer's eye and verdict (§ 4) |
| The answer's redraws no longer cost the frame rate (the look; a real fight) | SCR-09, SCR-10 | The look: the maintainer. The fight: block B, if the run allows a real fight |
| Calmer rating choices (the look) | P79-M7-RATING-ROW | The maintainer's eye (§ 4) |
| The Show details line takes the chip's place | P79-SHOW-DETAILS-SLOT | Closes to Done (§ 5c) |
| Kids master lock | KIDS-LOCK-01, KIDS-FOCUS-01, KIDS-LOCK-02 | The maintainer, another day (a child account) |
| The hidden spoiler box on a game known only by name | STRAT-SPOIL-NAME-01 | The maintainer starts one of the four games once; then the next block runs it |
| The note's own words under the reply (the "Not in my notes" line; the ladder) | NOTES-BLOCK-04, NOTES-BLOCK-LADDER | Block B, Strategy mode with the game |

## 8. The second opinion (Fable 5.1 at max, on trial)

The `advisor` helper, started at **max** effort for this plan (the maintainer's call), read-only, one bounded question
with the exact files and evidence to read, one recommendation back. At most five consults. Each costs about three
Opus turns, so the question is written to be answerable from named files, not from a search.

| # | When | The question |
|---|---|---|
| 1 | After block B's freeze readings | Given plan 95 § 13, the plan 76 notes in the focus registry and the document helper, and tonight's readings: what is the root cause, and which of the three fix shapes in L14's brief (log, transfer instead of plain hop, re-take on return) is the one to build first? |
| 2 | After block B's ghost page read | Which of the scoping note's three candidates do the readings pick, and is the shorter hide rule plus the watcher the right fix, or a narrower one? |
| 3 | Only if L10's research finds no clean route | Which route to Steam's keyboard is worth building, and what would prove it cannot be done from a plugin? |
| 4 | When any fix or verify item has failed on the Deck twice | For that batch: what the two failures say, and what to try third. One consult for the batch. |
| 5 | Before the morning report | What to tell the maintainer first, what to leave open, and which open items should never be called done. |

Log, one row per consult (filled by the session): time, the question in one line, the answer in one line, what it
changed, the cost.

| Time | Question | Answer | What changed | Cost |
|---|---|---|---|---|
| | | | | |

## 9. Who does what

| Work | Model, effort, helper | How many at once |
|---|---|---|
| Orchestrate, land, read failures, write Deck rows, consult | Opus 5.5 high (the chat) | one |
| L1, L2, L3, L4, L5, L11; L10 research; G1 mock-ups and build; X2 | Sonnet 5.5 high (`bugfix-lane`; a general helper with the rig repo's own checks for X2) | up to ten |
| L6, L9, L17 | Sonnet 5.5 medium (`bugfix-lane-sonnet-medium`) | up to three |
| L7, L8 | Haiku 5.5 high (`bugfix-lane-haiku-high`), each run logged in plan 33 § 4d; Sonnet medium steps in if one stalls | two |
| L12, L13, L15, L16, L18, L19, L10-fix | Opus 5.5 medium (`bugfix-lane-opus-medium`), each after its measurement | up to three |
| L14 | Opus 5.5 high (`bugfix-lane-opus-high`), after consult 1 | one |
| The Deck | `deck-driver` (Sonnet 5.5 medium), one block per driver | one |
| The paperwork | `bookkeeper` (Sonnet 5.5 medium), never during a landing | one |
| The second opinion | `advisor` at max effort (Fable 5.1), § 8 | one at a time, five in all |

**Budget.** Both counters at 0 percent at go; the five-hour window resets about three and a half hours in, the week
next Wednesday at 9 in the morning. Rules: start no new helper past 75 percent of the five-hour window or 80 percent of
the week; read the figure before every wave; stagger starts; helpers run only their own tests at two workers (the rules
file); the full sets run once per landing; end leftover test runs when a helper finishes. Plan 92's lesson: more than
ten helpers can reach the weekly line in one night when the week starts above half; this week starts at zero, so wave 1
may run full. Wave 2 (the fixes that wait on the Deck's readings) falls naturally after the five-hour reset, so time it
there rather than squeezing it in before; the figure is read again before it starts.

## 10. Standing rules while nobody is watching

- **A fix that fails on the Deck twice moves up one tier** (Sonnet → Opus medium → Opus high → a Fable consult), with
  the measurement in hand, without asking.
- **A new one- or two-star bug found tonight** is filed in the roadmap at the next sweep, written into the report, and
  gets one helper round of about an hour if its cause is known; anything bigger is measured and listed, not guessed at.
- **A blocked question** gets the safest choice at once and is raised in the chat at that moment, in one line, with the
  choice taken (the maintainer checks in remotely); when they answer, the session switches to the best fix. The question
  and the answer go into the plan's questions list (§ 13), not only into chat.
- **A new maintainer-only check** goes onto the checks page, never left in chat.
- Never: push (the hook refuses it; the maintainer says "push"), merge to main in this repo, switch branches in the
  shared folder, stage everything, type a PIN or password, press anything on the Deck outside a written check, reload
  the plugin with a game running, print the settings file's values (key names only).
- **The usage limit** stops every helper at once; each keeps its work and resumes with one short message. Before a
  planned pause, leave a background job running that ends when the pause should.

## 11. Keeping the PC and the Deck awake

- **The PC:** the desktop app keeps it awake while the session runs; the session also starts
  `python scripts/keep_awake.py --hours 10` in the background at go, as the second hold (a Deck check froze for four
  hours on 2026-09-27 when the PC slept).
- **The Deck:** block A takes the rig's keep-awake lock with `ttlMinutes: 480` and writes the `expiresAt` into the
  handover; every later driver reads it and renews before it runs out. The dimmed screensaver can still come on and
  freezes panel animations: a left-stick click wakes the screen and moves nothing.
- **The chat:** the 20-minute wake check plus a background sleep job before any pause (the check alone did not wake the
  plan 92 chat).

## 12. Paperwork and the reports

- **After every landing:** the bookkeeper moves the fixed entry from Bugs to Verify naming its row, one commit; the
  plan's progress log gets two lines, committed.
- **After every Deck block:** a pass moves to Done with its evidence file; a fail goes back to Bugs with what was seen,
  the testing documents in the same commit; result lists are copied from the evidence file's own words; the bookkeeper
  confirms each evidence file exists before citing it; the session spot-checks each sweep.
- **The roadmap is current at every step.** A reader opening it from a phone at any hour sees where each entry stands.
- **New bugs and new checks** found tonight: into the roadmap at the next sweep, into the report, and (one- and two-star
  with a known cause) into a helper round the same night.
- **The report, at the end,** in this file's § 14: what the maintainer must do next; what a player notices; the code
  work by area (file paths, a technical explanation, what popped up and how it was handled, what the maintainer could
  have done differently, as asked in AGENTS.md); a plain developer guide of how the plan was built into the code; what
  failed and why; what is left and why each item is left; the numbers. The maintainer's checks page is brought up to
  date. Anything learned that would change the runbook changes the runbook.
- **`python scripts/verify.py --full`** passes on the tip before the maintainer is asked to push.

## 13. Progress log and questions

- **2026-10-22:** written in the cloud. The maintainer's ten calls taken (§ 2). Briefs, rules and three runbooks
  written. Nothing started; nothing on the Deck touched.
- **2026-10-22, later:** the maintainer's go answers: the rig branch merged and rebuilt; the Deck free and online; both
  usage counters at 0 percent, the five-hour reset about three and a half hours in, the week's next Wednesday at 9 in
  the morning; phone notifications not relied on; the eye-checks group put on the checks page by the planning chat.
- **2026-10-22 ~00:40 (go):** the session (Opus 5.5) started on tip `588664cd`, keep-awake and the 20-minute wake
  check on, the baseline full check running. Usage 1 percent of the five-hour window, 0 of the week. Block A started
  first (the Deck docked for its first fifteen minutes, so the monitor look check goes first). Wave 1 started: L1-L9,
  L11, L12, L13, G1 (mock-ups), X2; L10's research waits for block A's keyboard readings.
- **The maintainer's eye checks, read at go:** chips raised and the blue fill PASS; the rating row PASS; the scramble's
  look and the frame-rate verdict PASS. The help chip FAILS (the ring does not show properly on "How to use bonsAI"):
  a new bug, block A measures it (A12). The tab icons: thicker on the PC stand-in, not seen on the Deck: block A
  measures the Deck's icons (A11). The chip pace: no verdict; the note asks for the decode to run in step with the
  scroll, filed as a feature idea. The chips near the end of an answer: "you can close it, but if needed we will
  reopen it", so that entry closes (this replaces call 4). Smoothness with the scramble off (SCR-09): not marked, stays.
- **~01:00:** the baseline full check PASSED on `588664cd` (400 s). The bookkeeper's first sweep landed (D134, the
  calls, the eye checks; `abadb19c`, `e6f61cc7`). The tab-switch mock-up page published for the pick:
  <https://claude.ai/artifact/DdRGuwdixAkPxx3YWZkSr6>.
- **~01:25, block A done** (handover `97-handover-A.md`, the Deck on the monitor throughout). The monitor look check
  clean on all seven tabs. Clear cache: Right to Clear all data, Down to Open all: by design, closes. Find LAN: Up
  landed on the second switch 5 of 5, so L16 started (Opus medium). The Decky-button read could not decide (the
  handler's target and Steam's neighbour are the same control); L17 then found the library's source cannot decide it
  either (the button is Steam's own, found at run time), so nothing changed and a decisive read is in block E. The
  rename box with the rig: the keyboard shows after one A on the field, so L10's research reads it as the maintainer's
  controller. The 92 percent lines are the rig counting text past the edge; the lines are whole by eye (L19 closes as
  the rig's own, X2 fixes the sampler); 83 percent not seen. Large text: Story spoilers' arrow 2.6 px from the edge at
  Large (L13 covers it). The ghost strip with no game: never shown in 155 samples; the pop-up half could not run (the
  help chip shows only on a first run). The tab icons: the Deck already runs the thicker icons, about 1.1 px lines at
  their 10 px size. A normal chip with the ring shows only the blue fill, no ring.
- **The rig's two fixes merged before go both FAILED on the Deck:** open after a reload (waiting does not bring the
  tab back; closing and reopening the menu does) and the settings snapshot (a damaged ten-day-old earlier copy was put
  back first, every time). X2 rounds two and three fixed both and added a 6-hour age limit on putting an earlier copy
  back; 493 rig tests pass; merged into the rig's main (`43afc0b`) and rebuilt about 02:30. Proven in the next chat.
- **~01:30, blocked:** this chat lost the rig's tools (the rig's server dropped mid-call in block A); a block B driver
  could press nothing. Safest choice taken: landings go on, blocks B to E wait. Raised in the chat: a separate chat
  that drives the Deck needs the maintainer's word (the card could not show over Remote Control).
- **Landings, 00:59 to ~02:45:** L1, L9, L6, L5, L8, L7, L2, L3, L11, L12, L13, L4, L16, L10-fix, G1, each through the
  landing script's gates; tip `65ef9074`. Two stops: a Python test that failed once during L8's landing and passed on
  the re-run (3,023 tests, nothing changed); L16 made one screen function longer than the tidiness check allows without
  a comment, fixed by a comment (`04704581`). L4 fixed the paragraph, line-break and list dips; a dip of about 2.6 px
  after a heading line remains (and in the two non-default scramble styles), recorded for block E. L5 took a different
  route from its brief (the screen sends the question; the back end picks the game the notes would), checked: the stand-in
  key matches no spoiler profile. L7's starter-set wording stopped on purpose (two different sets), raised below. L10-fix
  built only the "hand the ring to the name field through Steam" step; the suggested-name button waits for the
  maintainer.
- **The maintainer, ~02:00:** asked to see the tab icons (shown: the Deck's real bar, and today's lines beside thicker
  and brighter ones); on the keyboard: "I'm just using a controller. Yes pressing A on a text input box should bring up
  the keyboard."

Questions for the maintainer raised during the run (the safest choice taken meanwhile, the question raised in the chat):

| Time | Question | Choice taken | Answer |
|---|---|---|---|
| 01:00 | The starter set's size reads "about 4.6 GB" on the notice and "about 4.5 GiB" in the box. They are two different sets (the notice: the answer model and note search; the box: those plus the two speech models, about 4.8 GB). Make the box say "about 4.8 GB" so both use the same unit, or leave both? | Leave both as they are (they are not wrong, only in two units) | |
| 01:35 | The tab icons: the Deck already has the thicker ones, but they draw about 1.1 px wide at their 10 px size. Thicker still, brighter, both, or as they are? (Drawn for the maintainer in the chat.) | As they are | |
| 01:35 | The rename keyboard with the maintainer's controller: which controller and how it connects, and does A on the name field bring the keyboard up? | Asked; then built only the safe step (Steam is handed the name field when the box opens) | "Just a controller; A on a text box should bring up the keyboard" (~02:00). The maintainer's own try after the deploy is the proof |
| 02:45 | A separate chat that only drives the Deck (this chat lost the rig's tools): start it? | Blocks B to E wait | |

## 14. Report

Written by the session that runs it, at the end (§ 12 names the headings).
