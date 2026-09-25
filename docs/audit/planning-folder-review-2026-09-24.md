# Planning folder review: what to archive, what to keep

**Approved and carried out 2026-09-24. What was done, and two corrections to this review, are in the last
section.** The rest is the proposal as the maintainer reviewed it.

This is a proposal only. Nothing has been moved, archived or edited. It is a list for the maintainer to
read once and approve, so a later pass can do the moving without asking "can this go?" plan by plan.

It covers every file in the planning folder: 55 plans, plus the six drawings and pictures in its assets
folder. It does not change the roadmap or the test lists. Where it finds those out of step with each
other, it says so, and leaves the fix for the moving pass.

**How it was made.** Seven helpers each read a batch of plans and checked every plan against the live
roadmap, the list of finished work, the test lists, the saved device evidence and the git history. The
rule was no guessing: a claim needed a file and line or a commit to back it, and a plan's own status line
counted as a claim, not as proof. The session running this then re-checked every claim that would change
where a plan goes. Five of the helpers' claims turned out wrong and are corrected below (see the end).

The same sorting words as the 2026-09-13 list: **Finished** (the work is done), **Replaced** (a newer
plan covers it), and two kinds of keep.

## The counts

| | Plans |
|---|---|
| Put away: finished | 25 |
| Put away: replaced by a newer plan | 3 |
| Keep: work still to do, and the roadmap points at it | 14 |
| Keep: a guide or record the live docs still lean on | 13 |
| **Total** | **55** |

Every plan kept for work still to do has a live roadmap entry pointing at it. None is forgotten.

## One rule to agree first

Most finished plans are **built, but still owe one or two checks on the Deck.** In every case below, each
owed check also appears on the live roadmap, in the test lists, or on the maintainer's "Checks Only You
Can Do" page. So archiving the plan loses nothing. The check stays visible where people look for it.

That is how the 2026-09-13 list treated the same situation: the big screen redesign plan went to the
archive with "a few on-device checks are tracked on the live roadmap instead."

The alternative is to keep a plan in the planning folder until every one of its checks has passed. That
would keep 17 of the 25 "finished" plans where they are, some of them for a long time: one check waits on
a game the maintainer does not own yet, and another needs a finger on the touchscreen.

**Recommended: archive when the build is done and every owed check lives somewhere else.** The tables
below say, for each plan, exactly where its owed checks live.

## Which finished plans are fully tested

Of the 25 finished plans, **five are fully proven** with nothing owed anywhere:

| Plan | What it did | Evidence |
|---|---|---|
| 65 — trim docs, split long files | Made the four biggest documents 57% smaller and split fourteen long code files | Combined Deck check passed on build `b56de863` after one regression was fixed the same night; Done lines in the roadmap's 2026-09-24 block |
| 35 — bug-fix session two | Eleven screen and D-pad bugs | Every fix passed on the Deck. The last one, the "Stopped" notice, has a screenshot: archive/roadmap-bugs-fixed.md, "Stopping a reply now says so". The greyed thumbs it filed were fixed and proven later (archive/roadmap-done-v0.5.0.md, "A greyed Helpful or Not really no longer steals the highlight") |
| 47 — knowledge base, wave two | More game notes, help tips reachable, three bugs, a library release | Its two failures on the night were fixed and proven later (archive/roadmap-bugs-fixed.md, the stray-text and stale-game-name entries, row GAME-LINE-LIVE-01) |
| 55 — bug-fix session three | Seven lanes of fixes | The three wipe checks it left passed the next day (archive/testing-closed-2026.md, rows CLEAR-ALL-PREFIX-01, PULL-NEW-BADGE-01, VOICE-CLEAR-01); the honesty-line fix passed (HONESTY-TEXT-GAME-01); the library it owed was published 2026-09-23 |
| 24 — the automatic test gate | Put the tests into a check that runs on every push | No Deck check needed. The gate is live and now blocks a failing change (the CI workflow sets ADVISORY to false) |

Three more are session plans that did no building of their own. They ran to the end, and everything they
left open is tracked elsewhere: **31 and 34** (the first two Deck verification rounds) and **61** (the
overnight automated round).

The other seventeen are built but owe at least one Deck check. They are listed in the next table, with
where each owed check lives.

## Put away: finished (25)

| Plan | Built? | Tested on the Deck? | What is still owed, and where it lives |
|---|---|---|---|
| 05 — streaming review | Yes: both halves landed 2026-08-07 (testing.md, streaming row). The plan's header says the second half "not started"; that is out of date | Mostly | STREAM-04 is still owed, carried on the testing.md streaming row. **One open design question lives only here**; see "Calls" below |
| 06 — thinking-line review | Yes: items 1–6 and 8 (commits in its § 10); item 7 declined | Mostly: two checks passed 2026-09-23 under newer names (THINKING-SANITIZE-01, THINKING-EMOJI-CLUSTER-01) | THINKING-COPY-01 is still open on testing.md |
| 16 — longer replies no longer cut off | Yes, 2026-08-10 | Mostly: rows 01, 02, 03 and 05 passed | SOFT-PREDICT-04 has twice failed to trigger (the answer ended too soon to test it). Carried on the roadmap and testing-manual.md |
| 24 — the automatic test gate | Yes | Fully (see above) | Two small package tidy-ups exist only here; see "Calls" |
| 28 — named chat slots, version three | Yes: all 19 commits (archive/roadmap-completed.md) | Mostly: most rows passed and are archived | One real bug it surfaced: a chat still writing does not look busy from another chat. Open on the roadmap's Bugs list |
| 29 — two chips across | Yes: B1–B8 | Mostly: 01b passed 2026-09-03 (the plan still says it is owed), 02 passed | Row 03's non-carousel modes, and row 04's decode and reduced-motion halves. Carried in testing-manual.md |
| 30 — collapsing tab bar | Yes: W0–W7, 2026-09-02 | Mostly: rows 01–07, 10 and 11 passed | TAB-BAR-08 (touch, needs a finger) and one row-09 opener. Row 07 was replaced by the newer TAB-STRIP-2A-03. Decision D55 is settled (locked 2026-09-03), not open. Plan 59 later redrew the open strip but kept this plan's mechanism |
| 31 — first Deck verification round | Not a build | Ran 2026-09-03/04; carried on by plan 34 | Its list of checks only a person can do was not compared line by line with the maintainer's checks page. Some items reappear there; whether all do was not checked |
| 34 — feature verification round | Not a build (one small fix landed during it) | Ran 2026-09-05/06; four Verify entries closed | Leftovers were taken up by plans 61 and 64 |
| 35 — bug-fix session two | Yes | Fully (see above) | The stuck-panel bug it chased is still open on the roadmap (three-star focus entry). It is a bug, not a check of this plan's fixes |
| 45 — Steam settings shortcut card | Yes, built 2026-09-16 during plan 56. The plan's header still says "nothing built" | Mostly | **The records disagree.** The Done line says all seven rows were confirmed and "nothing about the card is owed any more." testing.md still shows SETTINGS-CARD-05 partial and 06 and 07 open. One of the two is wrong |
| 47 — knowledge base, wave two | Yes | Fully (see above) | Nothing |
| 48 — knowledge base, wave three | Yes | Mostly: R1, R3, R5, R6 and R7 passed | The "No tip for this" line has never fired on the Deck; that is an open roadmap entry and testing.md row W3-R2. A follow-up still names the wrong boss about one time in three; that is an open roadmap entry and row CHAT-MEMORY-01 |
| 54 — spoiler rule gaps | Yes: four commits | Mostly: two of its three checks passed 2026-09-15 | STRAT-SPOIL-NAME-01 waits on Doom 64. It is on the roadmap and the checks page. The spoiler rulebook calls this plan "the live gap tracker"; that link needs updating in the move |
| 55 — bug-fix session three | Yes | Fully (see above) | The header still says "waiting for the maintainer's go". One deferred clean-up lives only here; see "Calls" |
| 56 — feature session four | Yes, except two features it deferred on purpose. Those were built later by plans 57 and 62. The header still says "waiting for go" | Mostly | The settings card's rows 06 and 07 (the same as plan 45). The "reclaimed height" idea is an open roadmap entry |
| 57 — thinking shown on screen | Yes (tip `d2096ee`) | 6 of 7 rows passed | The text half of REASONING-05 is blocked by a D-pad bug that is open on the roadmap |
| 58 phase 1 — notes shown word for word, wiki reader | Yes: the library grew to 35 games and 372 notes | Mostly: rows 01, 03, 05 and 06 ran | Row 07 needs ears. Rows 02 and 04 cannot run yet. All carried in testing-manual.md. The status line says the library publish is owed; **it was published 2026-09-23** |
| 59 — tab strip redesign | Yes | Mostly: rows 01, 02, 04, 05 and 06 passed | 2A-03: the maintainer's eye on five saved screenshots. 2A-07: the dots under the chat name failed again 2026-09-23 and wait on the maintainer's pick. Both are in testing-manual.md, the roadmap and the checks page |
| 60 — chip buttons | Yes (merge `b3c0d52`) | Mostly: rows 02, 03, 04 and 08 passed; 06 partly | Rows 01 and 05 (by eye), 07 (reduced motion), 09 (the Tip dot; blocked until the pinned test chips are cleared). Carried in testing-manual.md and testing.md |
| 61 — overnight automated round | Not a build | Ran 2026-09-18/19; eleven entries closed | The focus trap is still an open three-star roadmap bug. The ghost reply was fixed during plan 63 and passed 2026-09-23 |
| 62 — feature session five | Yes: four features, 2026-09-20 | Mostly, **though its last line says nothing was proved.** Plan 64 later passed the game-name label, the Session tab and the models Filters button | The Read aloud speaker rows (READ-ALOUD-02, 05, 06) have not been re-run since the button changed shape. Open on testing.md |
| 63 — bug-fix session four | Yes. The header still says "running", and its closing section was never filled in | Mostly: plan 64 proved most of it | The Open Permissions jump bug did not land and is open on the roadmap. The chat-name dots fix failed (see 59) |
| 64 — big verification session | 23 bugs fixed | 18 of 23 proven | Four of the five unproven fixes are on the roadmap. **The fifth, the ban lookup's reworded "turned off" message (commit `ec6f87ab`, landed after the last deploy), is written only in this plan.** Its six choices and one hand check are on the checks page |
| 65 — trim and split | Yes | Fully (see above) | Nothing |

## Put away: replaced (3)

| Plan | Replaced by | Anything left? |
|---|---|---|
| 04 — spoiler box on things the player already named | Plan 54 and the spoiler rulebook, which carried its fixes forward | The open spoiler problem is on the roadmap: "A name-withheld boss question on a story-protected game comes back with no spoiler box". One fallback idea, option 3 ("only if the Deck still fails"), is described only here, and the archive keeps it readable. testing.md's STRAT-SPOIL-DRG-01 row links here and needs updating in the move |
| 23 — what still needs a person | Plan 21's sections 6 and 7 say the same thing | Nothing links to it |
| 40 — thinking shown on screen (first plan) | Plan 57, the build plan. Plan 40's own log says so | Nothing |

## Keep: work still to do (14)

| Plan | Roadmap entry that points at it | Note |
|---|---|---|
| 10 — wake word | Features: "Wake-word listening" | Its own first step, proving voice typing works on the Deck (VOICE-01), has never run. "Headset mode" waits on this too |
| 12 — mod-aware hints | Features: "Deep mod AI hints" (six stars) | The study recommended splitting that entry into four smaller pieces. That split has not happened. Its safety guard was built; the guard's streaming-off half is still owed |
| 17 — online and versus game notes | Knowledge base: "KB online / versus strategy content" | Not started |
| 18 — per-game help tips | Knowledge base: folded into "RAG Phase 4" | Blocked on a database change, as its header says |
| 19 — controller button rig | Features: "Controller macro test rig and live view" | The board is ordered; the next step (first bring-up tests) has not started since discovery locked on 2026-08-23 |
| 38 — answer lines in the "Reply ready" popup | Features, planned 2026-09-05 | Nothing built |
| 39 — connection doctor | Features, planned 2026-09-05 | Nothing built |
| 43 — model speed readout | Features; decision D75 still open | Nothing built. It also carries the Deck half of plan 41's model survey |
| 58 phase 2 — knowledge base, wave four | Knowledge base "Next" list | Its "what is true right now" section is out of date. Two of its eleven items were already done by later sessions: the one-second wait, and the five old August rows |
| 66 — own menu icon via Quick Tab | Features: "bonsAI's own icon in the Quick Access Menu" | The Deck test is next |
| 67 — stand-in Decks | Features, planned 2026-09-23 | Nothing built |
| 68 — chat sums itself up | Features, "PARTIAL: a chat remembers itself now" | Waits for "go" |
| 69 — streamed answers scramble in | Features, with the bursts bug's cause | Waits for "go" |
| web-permission-discovery | Features: "Web permission" | Discovery was paused on 2026-07-30 |

## Keep: guides and records still in use (13)

| Plan | Why it stays |
|---|---|
| 02 — test tool bugs | The tracking table in mcp-setup.md points here for the detail, and one blocking item there is still open |
| 21 — the AI-owned testing programme | Still the guiding plan for testing. Its tracks D and E exist only here |
| 28 — deeper notes for the first 13 games | The roadmap points here for the reasons behind the work |
| 30 — knowledge base answer quality | The roadmap calls it "the agreed answer-quality work"; W6, W7 and W9–W11 are still open. Its checklist is behind: W5 and W8 were done by later sessions |
| 33 — which model does which work | The standing policy behind AGENTS.md and the prompt hook. Its Haiku trial table has never been filled in |
| 37 — knowledge base status report | The roadmap's opening links it as the zoomed-out view. The title date says 2026-09-07, but the body was updated through 2026-09-19, so only the date is stale |
| 41 — survey of models for the Deck | Code, tests and a script cite it. Its Deck half now sits under plan 43's roadmap entry |
| 42 — read aloud memo | Phase 1 shipped. The roadmap's voice entries and the parked legal check read this memo |
| 49 — Steam Frame features | Eight open roadmap entries point back to it |
| 50 — SteamVR set-up on the PC | The set-up guide. One sentence is wrong: it says the pretend headset takes the mouse, and plan 53 found that it does not |
| 52 — Frame features, second look | Holds the anti-cheat rule a live roadmap entry cites (D97) |
| 53 — SteamVR bench results | The only record of measurements a six-star roadmap entry cites. Its two pictures are in the assets folder |
| spoiler-constitution | The spoiler rulebook; a test file cites it. Its closing line says three checks are unticked, but two have since passed |

## Calls for the maintainer

1. **The rule above:** archive once the build is done and every owed check lives elsewhere (recommended),
   or wait until every check passes.
2. **Three small pieces of work live only inside plans that would be archived.** For each: add a
   roadmap line, or let it go.
   - Plan 55: "the settings list is written out seven times", so a new setting can quietly stop working
     in one place. It was deferred on purpose ("not this session"), and no roadmap entry was found for it.
   - Plan 05: should a streamed answer keep its streaming layout when it finishes, instead of switching
     to another one? The plan called it "the one design question worth deciding soon" on 2026-08-07. Its
     test row has since dropped off the lists.
   - Plan 64: a Deck re-check of the ban lookup's reworded "turned off" message. It landed after the
     last deploy of that night.
   - (Smaller) Plan 24: two package-file tidy-ups it deferred on purpose.
3. **Plan 23** (what still needs a person): archive as replaced (recommended), or link it from AGENTS.md.
4. **Plan 12** (mod hints): split the six-star roadmap entry the way the study recommended, or leave it
   as one entry.

## Records that disagree, found along the way

These are not about moving files, but the moving pass should fix them or file them:

- **Settings card.** The Done line says every check passed and nothing is owed. testing.md shows two
  rows open and one partial.
- **Ban lookup.** Its four checks passed on 2026-09-23 (plan 64, and the finished-work archive). The
  tick boxes for VAC-03 to VAC-06 in testing-manual.md are still empty.
- **Spoiler row.** testing.md's STRAT-SPOIL-DRG-01 row says "nothing has run on the Deck since plan 54."
  Two of its three checks passed that same day.
- **Status lines that would be frozen into the archive saying the wrong thing:** 05 (second half "not
  started"), 24 ("advisory"), 45 ("nothing built"), 55 and 56 ("waiting for go"), 58 phase 1 ("publish
  owed"), 62 ("nothing proved"), 63 ("running"). Suggest adding one dated line at the top of each when
  it moves, saying how it actually ended.

## What the move will involve

- About 47 live files link to at least one plan on the "put away" lists: the roadmap, roadmap-details,
  the test lists, the decisions files, the changelog, a few code comments and some plans that stay. Each
  link needs its path changed. No automatic link check exists, so this is a search-and-fix pass.
- One code comment points at a drawing that moves: src/hooks/useKbNotesFold.ts mentions
  planning/assets/58-phase-1-block-mockups.html.
- The drawings in the assets folder move with their plans: 58 phase 1's block drawings and plan 62's
  feature board. Plan 53's two files, and plans 68's and 69's drawings, stay, because those plans stay.
- A row per moved plan goes into archive/INDEX.md, in the same format as 2026-09-13.
- Some script comments already point at plans archived in an earlier round, at their old paths (plans
  03, 15 and 40-new-titles). Worth fixing in the same pass.

## Helper claims that were wrong, and corrected here

- "The knowledge base status report is two weeks stale." Only its title date is. The body was updated
  through 2026-09-19.
- "Plan 35 left three loose ends with no home." All three have one: two are closed and proven, and one
  is an open roadmap bug.
- "Plan 64 contradicts itself on the ban lookup." It does not. The four checks passed; a later wording
  fix is what is owed. The tick boxes in testing-manual.md are the only thing out of step.
- "Plan 58 phase 1's drawing file is linked from nowhere." A code comment links to it.
- "The session-history-in-Show-details idea from plan 56 has no owner." Plan 62 built it, and it passed
  on the Deck 2026-09-23 (SESSION-TAB-01).

## What happened next (2026-09-24, after the maintainer's review)

The maintainer approved both lists and the rule, and asked for four things. All four were done the
same day. This file above is left as it was reviewed; two things in it turned out wrong, and are
corrected here.

**Two corrections to this review.**

- *"The controller button rig has not moved since late August."* Wrong. Only the roadmap's one-line
  summary had not moved. The board has driven every Deck session since 2026-08-26, and the full
  unattended ask ran on 2026-08-28. What is left is a live view, the highlight checked from video,
  Bluetooth handheld runs and the nightly run. The maintainer made finishing it priority 1; plan 19,
  the roadmap and its detail entry now say so, and stand-in Decks (plan 67) come after it.
- *Plan 63: "the Open Permissions jump did not land and is open on the roadmap."* Wrong. It was fixed
  in plan 64 (`af53b7d`) and proven on the Deck 2026-09-23. So were the other two focus fixes plan 63
  left: the streaming highlight (`7b9447ed`), and Up from Retry, which no longer applies. testing.md
  still said SMOKE-C was blocked by it; that line is corrected too.

**The settings card: the test list was right, the Done line was wrong.** Rows 01 to 04 passed on
2026-09-16. Row 05's jump passed, and its return was settled by decision D107 that afternoon. Rows 06
and 07 were never run. The only measurement near them, `plan56-SETTINGS-CARD-01.json`, checked the
six-row cap, the "65 more" heading and the gap to the tab bar with a one-line box, not a growing one.
The Done line (commit `04bfb6d3`) turned D107's "nothing about the card is owed", which meant *no open
question*, into "every check passed". Row 05 is now closed, rows 06 and 07 have a Verify entry, and
the Done line and D107 each carry a dated correction.

**The ban lookup's empty tick boxes.** Nobody forgot to run them. The checks passed on 2026-09-23 with
evidence, and the bookkeeping that night (`7f0e0a16`) closed them on the roadmap and in testing.md. It
never ticked the boxes in testing-manual.md, because the "before marking work done" list in AGENTS.md
named the roadmap and testing.md but not testing-manual.md, and neither did the bookkeeper's
instructions. The same thing had happened twice before, to CONTEXT-LADDER-03 (passed 2026-09-05) and
MICRO-04 (passed 2026-08-28). All six boxes are now ticked and moved to the closed checklist.

**Prevention.** `scripts/closed_rows_check.py` now runs in `verify.py`. It fails a change that closes
a test row for the first time while leaving that row open elsewhere. Replayed over the 271 commits
since 2026-09-01 that touched the closed lists, it flags both misses above (`7f0e0a16`, `04bfb6d3`)
and 14 commits in all. About half are the same kind of real miss; the rest closed half a check without
saying the other half was owed, which the error tells the writer to fix. AGENTS.md, the bookkeeper's
instructions and lessons-learned.md name the checklist too.

**The eight status lines** now say how each plan ended, with commits and test rows: 05, 24, 45, 55,
56, 58 phase 1, 62 and 63.

**The four pieces of work that lived only in plans** each have a roadmap entry: the settings list
written out seven times (plan 55), plan 05's layout question, plan 64's re-check of the ban lookup's
reworded message, and plan 24's four build-setup tidy-ups.

**The move.** 28 plans and 2 drawings moved to the archive, one index row each. 62 files had their
references rewritten, including code comments and the older archive files; 75 links that were
already broken now point at the right place. Broken links across the docs fell from 363 to 331, and
none are new. The three that look new were broken before the move, under the plans' old path.
