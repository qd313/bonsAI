# 70 — Knowledge-base wave four, with an automated Deck test wave alongside

> Links in this file into the roadmap may be stale: the roadmap was split and trimmed on 2026-10-03 (plan 80). Current files: [roadmap.md](../roadmap.md), [roadmap-kb.md](../roadmap-kb.md), [roadmap-shelved.md](../roadmap-shelved.md).

Written 2026-09-25 by the planning session (bonsai-50), at the maintainer's request: get ready for the next
knowledge-base build and an automated test wave on the Deck, split across as many helpers as can run at once.
It replaces [58 phase 2](../archive/58-phase-2-kb-session-wave-four.md), which was written on 16 September and
had gone stale — most of its first section was no longer true.

**Status: finished 2026-09-27 at about 07:00 ("go" was 00:18 on the 26th). Answers locked as D112, with the
maintainer's later calls in its addendum. The library 2026.09.26 is published and checked on the Deck. Report in § 11,
developer guide in § 12, session summary in § 13.**

**What this session does, in one paragraph.** Seven helpers build at once, each in its own copy of the repo.
They make answers hide spoilers they were told to hide, make the notes under an answer honest about which
note was used, write notes for three new games plus "how do I get started" notes, and ship all of that in one
new library release that this session may publish once it passes on the Deck. They also fix a handful of small
bugs outside the knowledge base. Meanwhile a separate helper drives the Deck through the test rig, running
every owed check it can run without a person, chasing the bugs where a press did nothing, and getting the
saved-walk replay working again as the first slice of an overnight test run. The roadmap is updated after
every landing and after every block of Deck checks.

Read first: [CLAUDE.md](../../CLAUDE.md); the model table in [AGENTS.md](../../AGENTS.md) under "Which model
does which work"; [lessons-learned.md](../lessons-learned.md), sections 1 to 4; the roadmap's
[Knowledge base and RAG](../roadmap.md#knowledge-base-and-rag) section; [the status report](../planning/37-rag-status-report.md).

**The maintainer's own list of checks only a person can do:**
[Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
Anything this session finds that needs their eyes, ears or finger goes there.

---

## 1. What is true right now (checked 2026-09-25 against the code, nothing pressed on the Deck)

- **The one-second wait before a game answer is already fixed.** Both ways the plugin starts the Deck's AI now
  keep two models in memory — the one that answers and the one that searches the notes — so the search no
  longer pays to reload every question. Only one thing is left: reading free memory with a game running, to
  see whether a safety check is needed for devices with less room.
- **Installing the library still does not get you the meaning search.** It never offers to download the
  meaning-search model. A person gets a hint once and a separate button, and the button only works when
  the Deck runs its own AI.
- **The spoiler cover is still trusted to the model.** Nothing reads the reply back to check a cover happened.
  Nothing in the plugin can tell a "spoilery" sentence from any other today, so the safety net has to be told
  what counts: a name from the attached notes that the person did not type themselves.
- **The wrong "no close match" line has a cause now.** When a question names the game but describes a boss
  without naming it ("the boss past the crystal spike area"), a check compares the question's words with the
  attached notes' titles only, finds no shared word, and throws the real match away. The fix on 21 September
  mended a different path.
- **Nothing ranks a general "Starting out in…" note below a specific one.** That is why the Black Mesa
  electrified-water answer lists two general notes ahead of the right one.
- **The "No tip for this" line still has nothing that can make it appear.** The troubleshooting tips do have a
  cut-off, but the step that sorts a problem into a topic pulls tips in with no cut-off at all, so a hard
  problem sentence always gets something. And the cut-off itself sits exactly on the worst junk phrase's
  score instead of just above it, so "what time is it" can still get a tip.
- **The shared-tip source page bug is already fixed in the code**, since 23 September. The roadmap had not
  caught up; it now owes one Deck check.
- **The follow-up that names the wrong boss is unblocked tonight.** The other session (plan 68, the chat sums
  itself up) landed each chat's own remembered subject and a follow-up finding its own game even with nothing
  running. It will not touch the question-building code again.
- **The library:** 372 notes over 35 games plus 159 shared tips. Release 2026.09.18 is published on both
  download sites since 23 September. **22 of the 35 games have no blind test questions**, and seven have no
  test questions at all, so nobody can measure whether search finds their notes.
- **Wiki sources.** Cleared and usable for the three new games: the Brotato wiki and the Palworld wiki
  (share-alike 4.0), the Elder Scrolls wiki for Skyrim (share-alike 2.5). Red Dead 2's wiki is not usable,
  so its starting-out note will be bonsAI's own words with no source page, like the 99 notes already
  written that way.
- **The test rig.** Almost everything left on it lives in the separate Deck tools project, not in bonsAI.
  The fix for saved-walk replay is already written there but not pushed, and the night the bug was seen the
  tools were still running the old code. This session's tools started after that fix was built, so they
  should be running it — block 0 proves it with one replay. The overnight run has nothing built yet, and the
  tools can only be driven from inside a Claude session today, so the first slice needs a small script that
  starts the tools itself.
- **Owed Deck checks,** counted from the roadmap and both testing documents: 6 knowledge-base checks and 44
  others the rig can run with nobody present, 16 that need a game running, 25 that need the maintainer, 25
  blocked on something else, and 8 bugs that need a recorded walk before anyone can fix them. The full list
  is in the session's scratch folder as `owed-deck-rows.md` and gets compiled into runbooks at block 0.
- **The documents disagree with each other in 18 places** — a check closed in one and open in another, a
  status word that no longer matches the note beside it. The bookkeeper fixes these in block 0.
- **Another session is live.** Plan 68 (bonsai-03) is still landing its screen work tonight and needs one
  Deck block of about 90 minutes soon. The two sessions share the Deck through a lock file, and this PC's AI
  model through a second one (Appendix C).

## 2. What gets built, and what a person will notice

Stars and tags are the roadmap's. "Helper" is the lane letter used in the briefs (Appendix A).

| # | What a person will notice | Stars | Helper | Wave |
|---|---|---|---|---|
| 1 | **A boss or story moment you did not name comes back hidden**, even when the model forgets to hide it. Just the sentences that name it go inside a spoiler box, and they are covered while the answer is still arriving, so the name never flashes up first. | ★★★ `[KB]` `[reply]` | A | 1 |
| 2 | **The note named under an answer is the one it used, first**, and the "no close match" line stops appearing under an answer that clearly used a note. | ★★ `[KB]` ×2 | B | 1, finished in 2 |
| 3 | **"No tip for this" either finally shows when no tip fits, or is retired** — you get the numbers before anything is retired. "What time is it" stops getting a tip. | ★★ + ★ `[KB]` | C | 1 |
| 4 | **Notes for three new games**: Brotato, Palworld and Skyrim, each with a "how do I get started" note. | ★★★★ `[KB]` | F, G | 1 |
| 5 | **"How do I get started" notes** for Cyberpunk 2077, Fallout 4 and Red Dead Redemption 2, with a matching suggestion chip. | ★★★ `[KB]` | E (the kind), G (the words) | 1 |
| 6 | **Deck tips for one game at a time**: troubleshooting a covered game gets that game's own quirks first — your two (Fallout 4's mod launcher option, San Andreas's DirectX 12 option) and a few researched ones for Deep Rock Galactic: Survivor and Ocarina of Time, marked as researched. | ★★★★ `[KB]` | E | 1 |
| 7 | **One new library release** carrying 4, 5 and 6. Every installed library has to download it once. | ★★★ `[KB]` | the session | after 4–6 land |
| 8 | **Search numbers for 25 more games**: blind test questions for the three new games and the 22 that have none. Nothing a person sees; it is what tells us whether search finds their notes. | ★★ `[KB]` | H writes, L labels | 1, 2 |
| 9 | **Installing the library offers the meaning-search model**, with your OK, never silently, and says clearly if the download fails. | ★★ `[KB]` | D | 2 |
| 10 | **A follow-up stops naming the wrong boss** — three ways to finish it measured on this PC, you pick from the numbers, then it is built. | ★★★ `[KB]` | K | 2 |
| 11 | **Five small AI-models screen bugs**: Remove stays greyed out after a model answers; the screen opens with Filters showing and the ring on a filter; the remove box says "< 0.1 GB" for a 17 GB model; a false error in the log at start-up; the ban report shows raw text instead of a table. Also the read-aloud test that fails when the PC is busy. | ★–★★ | I | 2 |
| 12 | **A big screenshot no longer crashes the Deck's AI**: it is shrunk with ffmpeg first, and refused with a message if the shrink fails. | ★★ `[ollama]` | J | 2 |
| 13 | **A first slice of the overnight test run**: one command keeps the Deck awake, deploys the newest build, replays every saved walk, runs the quick checks and writes one report. Run by hand this time; scheduling comes next time. | ★★★ `[QA]` | N | 2 |
| 14 | **The thumbs-down that stops a wrong note coming back — drawn and planned, not built.** You get a drawing at the Deck's true size to pick from. | ★★★★ `[KB]` | the session, T drafts | 2 |

**Not in this wave, on purpose:** deepening the thinnest games; God of War; the spoiler-coverage setting with
tiers; the dots under the chat name; the bigger model window experiment; community tip contribution; the
live-view recording, highlight-from-video and Bluetooth pieces of the rig (all large, all in the Deck tools
project).

## 3. The automated Deck test wave

**Who drives:** one Deck helper at a time, running runbooks this session writes. It presses through the test
rig, reads what has focus and what is visible, reads logs over SSH, writes one evidence file per check, and
reports in plain words. It passes a check only when the result matches what the runbook expects. It never
edits a document or fixes anything; this session reads its failures and hands the results to the bookkeeper.

**The flows, in the order they run** (the full runbooks are compiled at block 0; Appendix B lists what each
holds):

| Flow | What | Needs | About |
|---|---|---|---|
| 0 | Setup: lock, backup of settings, the eight chats and the library flags; hold awake; deploy the tip and prove it; one replay to prove the replay fix is live; free memory with a game running and both models loaded | Deep Rock Galactic: Survivor | 45 min |
| 1 | Knowledge-base checks with nothing running, plus the shared-tip source page and the no-tip reading | – | 45 min |
| 2a–2d | The 44 other checks with nothing running, split four ways: answers and chats; D-pad walks; the Ollama tab and AI models screen; the rest | – | 3–4 h |
| 3 | Checks with a game running: Deep Rock Galactic: Survivor, Hades, Black Mesa, Half-Life 2 | the games on Recent Games | 90 min |
| 4 | **The "press did nothing" bugs**, each walked under a recording with focus read after every press: thumbs up then the next press; Show details right after switching chats; the stuck panel (open and close the on-screen keyboard on the question box); the busy dot, with the switch made well after the first words and a log captured throughout | – | 60 min |
| 5 | Reduced motion on, three checks, reduced motion back off | – | 20 min |
| 6 | Re-save the saved walks on the current build; first run of the overnight slice | – | 45 min |
| L1–L4 | After each landing is deployed: that landing's own new checks, then the free-play sweep | varies | 30–60 min each |
| R | The release: remove and reinstall the library from the plugin's own button, one question per new game, the starting-out chips, the per-game tips, then publish | Brotato, Palworld on Recent Games | 60 min |

**What flow 4 leads to.** Each bug that reproduces gets its measurement handed to this session, which fixes
it with the measurement in hand — never a helper without one, per the house rule for D-pad bugs. A bug that
does not reproduce in three honest tries is written up as such and left open. The Clear-button bug is
skipped: plan 68 is replacing that button tonight.

**What the rig cannot do, and goes on your page instead:** anything needing a finger on the touchscreen (the
tab-bar ghost, the tap halves of the "press did nothing" bugs, the tap outside the AI models screen), your
eyes (the chip colours and underline, the tab strip, the scramble's look), your ears (read aloud), and a
microphone.

**The overnight slice, in words.** A small script in the repo starts the Deck tools the same way Claude Code
does, and calls them in order: keep the Deck awake, deploy, replay every saved walk, then run the quick
checks on this PC and write one report file — which walks matched, which showed differences, which could not
run. A replay across two different builds will always show "differences" rather than a clean pass, by the
tools' own design; the report lists what differed so a person can tell a real change from noise. Run once by
hand this wave.

## 4. Who does what

- **The one running the session: Opus at extra-high effort.** Writes the briefs and runbooks, lands every
  commit one at a time with the checks after each, runs the measuring tests on this PC between landings,
  fixes the D-pad bugs flow 4 measures, draws the thumbs-down, builds and publishes the release, writes the
  report. It writes no knowledge-base code itself.
- **Seven helpers at once: Sonnet 5 at high effort** (the maintainer's call: seven, past the usual five). Each
  in its own copy of the repo, cut from the tip, with its base printed and checked first; a named list of
  files it owns; one change per commit; every check green. They hand back code, notes, tests and one short
  report — never the roadmap, the testing documents or the changelog, never the Deck, never a push. A helper
  that needs a file outside its list stops and says so. A finished helper's slot goes to the next one.
- **One Deck helper** (Sonnet at high effort, running rows this session wrote). Only ever one.
- **One bookkeeper** (Sonnet at high effort). Every roadmap, testing, changelog and status-report edit, from
  a list this session hands it after each landing and each Deck flow. It never invents a device result and
  never commits while a landing is running.
- **A lookup helper** (Sonnet at low effort) turns the owed-checks list into runbooks at block 0.
- **Whoever writes a note may not write the question that tests it.** F and G write notes; H writes
  questions without reading them; L labels the questions against the notes afterwards and is neither.

**Two things only one can use at a time, shared with the other session:**

1. **The Deck.** Lock file `C:\Users\still\.deck-lock` — one line with the session's name, start and expected
   end; checked before every Deck action, deleted when done. Plan 68 goes first tonight; it messages before
   and after its block.
2. **This PC's AI model.** The answer test, the search test and the library build all use it, and two users
   at once give wrong timings. Lock file `C:\Users\still\.pc-ollama-lock`, same rule. Plan 68 does not use it
   tonight and has agreed to the rule. Helpers write their code while they wait for it.

## 5. Order of work

### Block 0 — the session alone, about an hour after "go"

1. Tree clean at the tip; the checks green; record the tip.
2. Read the planning folder and the end of the decisions file again for numbers another session took.
3. Hand the bookkeeper the 18 disagreements between the documents (the list is in the scratch folder).
4. Message plan 68 for the Deck order; take the Deck lock when it is free.
5. Flow 0 on the Deck (backup, deploy, the replay proof, the memory reading with a game).
6. The lookup helper compiles the runbooks for flows 1 to 6.
7. Write the wave 1 briefs, make the seven copies, start the seven helpers.

### Wave 1 — seven helpers on "go"

| Helper | Work | Waits for the PC's model? |
|---|---|---|
| A | The spoiler safety net, with the live half | yes — the answer test |
| B | The honest "no close match" line, and measuring whether general notes should rank lower | yes — the search and answer tests |
| C | The "No tip for this" line: make the cut-off bite, or bring the numbers | yes — scoring the tips |
| E | The new library format: the "starting out" kind, per-game Deck tips, the tips themselves | yes — one library build |
| F | Notes: Brotato and Palworld | no |
| G | Notes: Skyrim, and the starting-out notes for Cyberpunk, Fallout 4 and Red Dead | no |
| H | Blind questions: the three new games, the 22 untested games, and "where do I start" questions | no |

While they build, the Deck helper runs flows 1 to 5, one at a time, around plan 68's block.

### Wave 2 — as slots free, in this order

| Helper | Work | Cut after |
|---|---|---|
| I | The five AI-models screen bugs and the read-aloud test (the ring-on-a-filter bug only after flow 2c measures it) | a slot frees |
| J | Shrink a big screenshot with ffmpeg | a slot frees |
| K | Follow-ups: measure three finishes, then build the one you pick | a slot frees; the build waits for your pick |
| D | Installing the library offers the meaning-search model | a slot frees |
| N | The overnight slice | a slot frees |
| L | Label the blind questions against the notes | F, G and H have landed |
| B2 | Rank "starting out" notes below specific ones when the question is specific | E has landed |
| T | A first draft of the thumbs-down drawing from the real screen code | a slot frees |

### Landing — the session, between Deck flows

Each helper's commits are read as a diff, then taken onto the branch one at a time, oldest first, with the
checks after every one, from a small script in the scratch folder, in the background. Both note helpers and
the format helper edit the same notes file, so they land in the order E, F, G, and each later one is rebuilt
and re-checked. One bookkeeper sweep per landing. Deploy after each group lands, not after every commit.

### The release — once E, F and G have landed and flow R passes

Build the library, run its publish check, and first check how an **older** copy of the plugin treats the new
format. If an older plugin would break on it, publish the new library beside the old one instead of in its
place. Install on the Deck from the plugin's own button, ask one question per new game and one "how do I get
started" question, check the per-game tips, then publish to both download sites (the maintainer allowed the
session to do this, D112). If Claude Code's own permission check refuses the publish, the maintainer runs one
command, written in the report.

### Wrap-up

The measuring tests re-taken on everything that landed, the report at the end of this plan, the roadmap and
status report brought up to date, the maintainer's page updated, settings and chats put back on the Deck and
read off disk to prove it, the locks released. **Remove this session's repo copies only with
`python scripts/worktree.py prune`, never plain `git worktree remove --force`:** each copy's packages folder is a
link into the shared checkout, and on 2026-09-26 a plain forced remove followed the link and deleted part of the
shared packages (plan 68, repaired the same night).

## 6. Rules for this session

1. Nothing starts until the maintainer says "go".
2. One change per commit, behaviour kept, every check green between commits.
3. Helpers never touch the roadmap, the testing documents, the changelog, the Deck, or a push.
4. Every helper prints and checks its base first, and skips the package install — its copy's packages folder
   is a link into the shared checkout. Helpers commit with `git -c core.hooksPath=.githooks commit` so their
   own copy's hook runs, not the shared checkout's.
5. Only one thing drives the Deck at a time, and only one thing runs this PC's AI model at a time — both by
   lock file, shared with plan 68.
6. Save the evidence file before writing any result. A failure is written down with its file, not argued
   with. If the device contradicts the code, check the installed build's fingerprint first.
7. Settings and the eight chats go back exactly as they were, read off disk to prove it, at the end of every
   Deck block.
8. A question repeated word for word on the Deck measures nothing — the answer cache serves it back. Vary the
   wording or clear the cache.
9. A focused control hidden behind the dock is a failure, whatever the walk reports.
10. New bugs found along the way go into the roadmap straight away and into § 11's report; the easy ones get
    a fix this session; a hard one gets a good try, a written note of what was learned, and is left open.
11. Never stage everything in the shared checkout; stage by path and commit promptly.
12. Never remove a copy of the repo this session did not make.
13. Do not start helpers just before the usage window resets. A 20-minute scheduled check restarts the session
    after a usage stop; each stopped helper resumes by message.
14. Everything written to the maintainer is in plain language.

## 7. Your answers — locked as D112 (2026-09-25)

| # | Question | Answer |
|---|---|---|
| 1 | How this fits around plan 68 | **Start now and share.** Leave its files alone until it lands; take turns on the Deck. |
| 2 | What the testing part covers | **All four:** run the owed checks; chase the "press did nothing" bugs; get saved-walk replay working; start the overnight run. |
| 3 | Which notes | **New games from cleared wikis, and starting-out notes.** Not deepening the thinnest games this time. |
| 4 | Helpers at once | **Seven**, past the usual five. |
| 5 | Which new games | **Brotato, Palworld, Skyrim.** |
| 6 | The release | **Starting-out notes, the new games and the per-game Deck tips in one release; the session may publish it** once its Deck check passes. |
| 7 | The spoiler safety net | **Hide the sentences that name it.** |
| 8 | The thumbs-down that stops a wrong note | **Draw and plan it only**; build it next time. |
| 9 | Small bugs outside the knowledge base | **The AI-models screen bugs, and shrinking screenshots with ffmpeg.** Not the dots under the chat name. |
| 10 | The overnight run's first slice | **Replay and report, run by hand.** |
| 11 | What the Deck helper may do | **All four:** new chats with a backup and exact restore; remove the meaning-search model once; remove and reinstall the library; reduced motion on, then off. |
| 12 | How long | **As long as it needs.** |

Calls the session makes itself unless the maintainer says otherwise, since each has an obvious default:
follow-ups are measured before anything is built, and the pick is the maintainer's; the "No tip for this"
line is retired only after the maintainer sees the numbers; the memory safety check for two models is built
only if the reading with a game running says memory is tight.

## 8. Things to bring to your attention

- **The old wave-four plan was mostly out of date**, so this plan replaces it rather than running it. Its
  one-second-wait fix had already shipped; its search-number re-take had already run; two of its bugs were
  already fixed in the code.
- **The new library format makes every installed library stale until it downloads the new one**, and an
  older copy of the plugin may not read it at all. The release step checks that first and publishes beside
  the old library if it has to.
- **Hiding sentences after the answer is written is not enough on its own** — the answer appears word by word,
  so the name would flash up before it was hidden. The plan covers both halves. Once in a while a harmless
  sentence will be hidden too; that is the trade you chose.
- **Red Dead 2's starting-out note will have no source page.** Its wiki is not usable, so it will be bonsAI's
  own words, labelled that way, like the 99 notes already written like that.
- **Skyrim is not installed on the Deck,** so its notes get a search check on this PC but no Deck check unless
  you install it and open it once. **Brotato and Palworld need opening once by hand** so they appear on the
  Recent Games row the rig launches from. **Done by the maintainer 2026-09-25**; flow 0 confirms the row.
- **The Deck tools project has two commits you have not pushed,** including the saved-walk replay fix. The
  session cannot push; please push them when convenient. The old saved walks get re-saved either way.
  **Done by the maintainer 2026-09-25.**
- **Even with the fix, a replay after a new build never reads as a clean pass,** by the tools' design; the
  overnight report lists what differed instead.
- **The 18 places the documents disagree** are fixed in block 0, before any new result is written.
- **Seven helpers plus the other session's helpers share one usage allowance.** A usage stop is likely at
  some point. The session sets a 20-minute check so it restarts after the reset; this PC needs to stay awake.
- **A bug in plan 68's area may now pass without anyone fixing it:** the follow-up that lost its game with
  nothing running. Plan 68 added the chat's own game as a fallback. The Deck helper re-checks it after plan
  68's deploy.
- **The commit-hook bug is being handled by a separate cloud session.** Helpers use the workaround meanwhile.
- **Claude Code's own automatic permission check refused the test rig's button presses** during plan 68's
  Deck block on 2026-09-25 (at 22:33, then every time from 23:17), calling them "changing shared resources".
  If that happens to this session, the automated Deck wave cannot press anything. The session will not work
  around it or change permission settings on its own; the maintainer decides before "go" whether to allow
  the rig's press tools. **Decided 2026-09-25: allowed**, in the maintainer's own settings.
- **The pinned test chips are still pinned** from plan 68's block. The maintainer said they will clear them;
  two owed chip checks wait on that.
- **CC BY-SA 2.5 was added to the allowed licences** (the release check and the wiki reader), a session
  call after `27fd9aee`, so Skyrim's 15 notes (from the Unofficial Elder Scrolls Pages, share-alike 2.5)
  can ship. Fits D20: share-alike 2.5 lets an adaptation use a later version, which is what rewording the
  page in bonsAI's own words under the newer share-alike 4.0 the rest of the library uses already does.
- **Row VAC-03-07 (the ban-report wording fix) needs your own Steam Web API key to run** — none is saved
  on the Deck, and the runbook does not set one by hand. The one try 2026-09-26 got the plain "no key
  saved" message rather than a report to read. Whenever you have your key in, one `bonsai:vac-check` with
  a real account number closes this row.

## 9. Found while planning, and logged in the roadmap (2026-09-25)

1. **New:** "what time is it" can still get a troubleshooting tip — the cut-off sits on the worst junk
   phrase's score, not above it. ★ `[KB]`, helper C.
2. **Cause found:** the wrong "no close match" line — the check reads note titles only. Helper B.
3. **Already fixed, roadmap stale:** a shared tip's source page. Moved to Deck check owed.
4. **Already fixed, not running when it failed:** saved-walk replay (in the Deck tools project).
5. **Stale count corrected:** only four of the original thirteen games still have no enemy or item notes, not
   eleven.
6. **One bug entered twice:** the AI models screen opening with the ring on a filter; merged.
7. **Owed upstream:** the walk check judges a control hidden by its box, not its words; logged in the tools
   findings log.
8. **Cause found:** the commit hook points every copy of the repo at the main checkout's hooks.
9. **Unblocked:** the follow-up that names the wrong boss, by plan 68's landing tonight.

## 10. Progress log

- **2026-09-25 evening** — Planning. Four read-only helpers re-read the code, the owed Deck checks, the test
  tools and the game library; § 1 rewritten from them. Twelve questions answered (D112). The planning
  findings logged in the roadmap. Plan 68 contacted; lock files agreed. Waiting for "go".
- **2026-09-25, later** — The maintainer answered the "things that need you" list: the Deck tools project is
  pushed (its main branch matches the online copy, so the saved-walk replay fix is published); Brotato and
  Palworld were opened once on the Deck — flow 0 reads the Recent Games row to confirm, and whether Skyrim is
  now installed too. Items 3 to 6 accepted, including the follow-up bug (helper K: measure three finishes,
  the maintainer picks). Said "don't go yet".
- **2026-09-25, 23:28** — Plan 68 finished its Deck block and released the lock: chats restored, no game
  running, the latest build deployed. It reported two things: answers are sometimes saved with doubled spoiler
  markers (now in helper A's brief), and Claude Code's permission check refused its rig presses as "changing
  shared resources" — a blocker for this plan's Deck wave until the maintainer decides (§ 8).
- **2026-09-25, late** — The maintainer allowed every Deck tool and every command to the Deck in their own
  Claude Code settings (the session's own attempt to add the rules was refused by Claude Code, as it should
  be). Checked by reading the file: both rules are right.
- **2026-09-26, 00:18 — "go".** Block 0: tree clean at `637492e7`, quick checks pass, no new decision
  numbers taken by another session. Plan 68 handed over the Deck and queued a 40-minute turn after flow 0
  for its own three owed checks and clearing the pinned test chips. Started between 00:22 and 00:30: the Deck helper
  on flow 0; the bookkeeper on the 18 disagreements; a lookup helper gathering the check steps for flows 1
  to 5; and the seven wave 1 helpers A, B, C, E, F, G and H, each in its own copy cut from `637492e7`. To
  keep the three note-writing helpers from colliding in the one notes file, each got its own number range
  (Brotato and Palworld games 36 and 37, notes 402 to 449; Skyrim game 38, notes 450 to 499). New
  starting-out notes are written with today's note type and re-typed when the new kind lands. The 20-minute
  restart check is set.
- **2026-09-26, 00:21 to 00:36 — flow 0 (setup) on the Deck: all passed.** Nothing was refused: the new
  permission rules work. Backup of the plugin's settings folder (the settings, the eight chats, the checklist
  state), 76 MB, on the Deck and in the session's scratch folder, fingerprints identical. The library itself
  lives on the SD card, outside that folder; installed version 2026.09.18. Build `637492e7` deployed, both files'
  fingerprints match, no errors in the log. **Saved-walk replay works again:** the saved Settings walk replayed all
  31 presses with nothing different, so the tools project's fix is live. **Recent Games:** Palworld 2nd and
  Brotato 3rd; Palworld is a shortcut added by hand, not the Steam copy, so the plugin has to recognise it by name.
  **Skyrim is not installed** (owned, not installed), so its notes get no Deck check unless the maintainer
  installs it. **Memory with Deep Rock Galactic: Survivor running and both AI models loaded: at least 1.8 GB
  still available** (lowest 1,821 MB of 14,804), so the memory safety check stays unbuilt, per D112. Caveat: the
  game sat at its title screen, not in a mission. **Seen during the answer: the game fell to 4 frames a second**
  (250 ms a frame), from 60 — added to the roadmap's "what bonsAI costs a running game" entry. The test question
  went into a new chat, which pushed out the oldest one ("Hades", in the backup). Other sightings: D-pad Left on
  the chat row jumps out to Steam's side rail; the ring sat in the question box after the answer with nobody
  putting it there; the exit-game tool stopped on Steam's Home screen again (already in the tools findings log).
  Evidence `docs/test-evidence/plan70-FLOW0-*.json`. The Deck went to plan 68 at 00:37 for its own checks.
- **00:25 to 00:40 — the check steps for flows 1 to 5 gathered and turned into runbooks.** Nine checks dropped
  as already closed or not runnable yet, several rewritten because the control they describe has changed. One
  finding: **no troubleshooting tip in the library has a source page**, so the owed check that a tip's source page
  shows in its credit line cannot run; helper E was asked to give its researched tips a real source page where one
  can be cited.
- **00:37 to 01:06 — plan 68 had the Deck** for its own three checks and cleared the pinned test chips, which
  unblocks two chip checks (now in flow 3). It restored the chats from its own backup, taken after flow 0, so the
  "Hades" chat is still out until the end-of-session restore from this session's earlier backup.
- **00:41 to 01:40 — wave 1 landed, plus three of wave 2.** One at a time onto the branch, the checks after each:
  - **H** (blind questions): 107 new, every game in the library now has some; 35 wait for labels (helper L).
  - **C** (tip cut-off): "what time is it" can no longer get a tip; the "lan" rule no longer fires on "land".
    **The "No tip for this" line still cannot appear:** four cut-offs measured, none made it appear, the strongest
    lost 6 right tips, because the hard sentences get their tips from the plain word search. The maintainer's call.
  - **A** (spoiler net): a boss name the question did not type is covered, in the finished answer and while it
    arrives. Hollow Knight described boss covered 5 of 5, Hades 4 of 5; no false cover on 97.3% of the answer test.
  - **E** (new library format): the "starting out" kind and chip, per-game Deck tips (the maintainer's two, two
    researched ones), a too-new library refused with "update the plugin". An older plugin reading the new library
    degrades to the old behaviour without crashing (read at the last release's commit).
  - **F, G** (notes): Brotato 12, Palworld 12, Skyrim 15, and starting-out notes for Cyberpunk, Fallout 4, Red Dead
    2. A line-by-line check against the source pages found invented details in most notes (F 8 fixes, G 14 of 18
    notes); all fixed before landing. The two note lists collided on landing and were merged by content.
  - **I** (small bugs): Remove no longer stays greyed after an answer; a big hand-typed model shows its real size;
    no false connection failure at start-up; the ban report is a plain list; the read-aloud test passed 20 of 20
    under load.
  - **J** (screenshots): a big screenshot is shrunk with ffmpeg, or refused with a message.
  - **B** (notes line): the "no close match" line reads the notes' own text (wiring into the answer in progress).
    Ranking general notes lower was measured and **stays off**: better on the search test, worse on the answer
    test (46 to 41 of 57 right note first). B2 is dropped this wave.
  - **Session calls made:** the Skyrim wiki's older share-alike licence let through the release check (it allows
    rewording under the newer version the library uses); spoiler settings: Brotato little story, Palworld and
    Skyrim protect progress; the Hollow Knight described-boss answer-test row no longer forbids a cover.
  - **Quality check held twice:** copied test setup and two files past 400 lines, from the helpers' work; shared
    or moved rather than re-recorded (one file done, one with helper A, the tests with the bookkeeper).
  All Python tests (1,839) and all screen tests (1,778) passed after the landings. Not yet deployed to the Deck:
  the Deck is running flows 1 and 2a on the setup build; the next deploy comes after that block.
- **01:07 to 01:48 — flows 1 and 2a on the Deck: 12 checks, 7 pass, 2 fail, 2 unclear.** Failed: the note-search
  model is kept loaded only 5 minutes (the answer model 4 hours); one of eight plain problem sentences still gets
  an off-subject tip. New from the run: every answer read "Spoiler risk: med"; a Hollow Knight question recorded a
  note title as the thing asked about; Stop unloads the answer model on purpose, so the next question starts
  cold. Fixed the same night by helper M (the first three).
- **01:50 to 02:15 — more of wave 2 landed:** L (labels: new questions find the right note first 90% of the time
  on the held-back set), D (installing the library offers the meaning-search model, with a yes/no box), N (the
  overnight command), I's follow-up (quality check clean again), K (**the maintainer picked sending the
  previous question and a short answer with a follow-up: right boss 21 of 24 against 4 of 24**; switching it on
  exposed and fixed a spoiler risk), M (three small fixes). T's drawing of the thumbs-down published for the
  maintainer: https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43 (three options; the helper recommends C).
  The release library 2026.09.26 was built and passes the release check (38 games, 414 notes, 164 tips); its
  attributions page linked Skyrim's 2.5 licence to 4.0, fixed, so it gets rebuilt before publishing.
- **02:15 to 09:05 — stopped by the usage limit** (reset 05:40). The 20-minute scheduled check did not restart
  anything after the reset; the maintainer's "continue" at 09:05 did. Resumed: the Deck helper mid-way through the
  landed checks (deployed 83a6ae2e at 02:07, the tip cut-off check passed), the bookkeeper mid-way through recording
  the first Deck results, and helper B's wiring.
- **13:40 — `py_modules/backend/services/game_ai_request.py` grew to 809 lines against its 800-line limit**,
  from this wave's same-day landings (helper A's spoiler-cover, thinking-cover and suggestion-menu fixes all
  touch it). `verify --quick` has read red since about 13:40. Helper M is moving the new blocks out into
  their own file; fix pending, not yet landed.
- **13:55 — helper M's three follow-ups landed, resolving the file-size item above.** The spoiler-cover
  block, the follow-up "remember this turn" block, and the notes-text wiring feeding the "no close match"
  check each moved into a single function in the module it actually belongs to; behaviour identical, every
  existing test still passes unchanged. `game_ai_request.py` is back to 782 lines, under its 800-line
  limit — `verify --quick` reads green again (`89558ef5`). Alongside that: the named-entity fix now cuts
  the resolved game's own name out of the question before either matching pass runs, so a game's name can
  never by itself be read as naming one of its notes (`679452e5`); and the spoiler-risk band now also
  reads this turn's own knowledge-base routing as a troubleshooting signal, not only the fixed word list,
  so a hardware-wear question with none of those words still reads "low" (`7b2bc753`). Both close the
  gaps the first Deck pass found; Deck re-check owed on both.
- **14:00 to 20:00 — the afternoon Deck blocks (L2 to L6) and the second usage stop** (reset 14:00; resumed by
  message). Results are in the roadmap and `docs/test-evidence/plan70-*.json`; the headline is the spoiler fix passing
  on the Deck (229 reads). At 17:52 a plugin reload with Black Mesa running made Decky restart Steam's interface and
  the screens never came back; the maintainer restarted Steam by hand. Rule since: never reload with a game running.
- **20:04 — the overnight command's first real run** finished end to end in 76 s, but all 30 saved walks read
  "different": the panel is closed after a deploy and each walk needs its own start screen. Next step recorded.
- **20:30 to 21:00 — the release library on the Deck (flow R):** new games, notes and the starting-out chip pass;
  **the per-game Deck tips never reached an answer.** Not published; the maintainer: "Fix the tips first, then publish".
  Two new ring bugs over a running game; F2 fixed the hidden "Save chat to Desktop" one (`12ee3dfb`) and wrote the
  measurements the chip-then-Ask trap needs.
- **21:40 — E2's tip fix landed** (`e1bc0c16`): a running game's own tip is checked against every question by keyword
  before anything else sorts it. Landing it broke three follow-up tests on an older library: the check read a column a
  library from before 26 September doesn't have, the plugin never adds it to an installed library, and the failure
  emptied every answer's notes. **Fixed by the session** (`c1ca8b7d`, test proven by breaking it). That covers anyone
  still on the library now on the download sites.
- **21:55 — the last Deck block started** (tips re-check, the hidden ring, the chip-trap reading; then publish, the
  fresh download, restoring the chats). Helper O started on E2's other find: contractions leave a stray letter in
  every keyword search.
- **22:00 to 00:30 — the last Deck block and four more fixes.** The tips re-check passed for Deep Rock Galactic:
  Survivor (running: Strategy, Speed, and a clean boss question); Fallout 4 couldn't be tried running (its question
  box went dead — a new ring bug) and passed with the game named instead. The hidden ring passed over a game; the
  chip-then-Ask trap didn't reproduce (0 of 6, the reading recorded). Checking Fallout 4 on the PC showed one game's
  tip landing on another game's question; helper P fixed that and the "No close match" line under a tip answer
  (`aeed48be`, `fb805301`), and the session fixed the follow-up memory storing a tip's header as the chat's subject
  (`9063bbfb`) — all three proven on the Deck. Helper O's contraction fix landed on its second try (`55719a6e`).
  The bookkeeper brought the roadmap back under its size limit (`107f83d2`; another chat's commit had pushed it
  over). **The publish was refused by Claude Code's permission check** and waits on the maintainer. The chats were
  restored (15 files match), characters back on, keep-awake and both locks released.
- **2026-09-27, 00:03 — the maintainer published the library**; the session verified both sites byte for byte.
- **00:10 — the maintainer's calls:** retire "No tip for this" (helper Q, `db4b3b4a`); thumbs-down design C (recorded,
  not built); Show details' credit line hidden until the notes block opens when a spoiler was hidden (helper R,
  `6d31bc1d`, `8bba1f00`, passed on the Deck); at least 30 frames a second with a game running (helper S); the Steam
  key saved on the Deck from the private settings file (the ban-lookup check then passed).
- **00:15 to 01:05 — flow L8** measured the frame rate before any change: ~12 while an answer arrives with a game
  running, CPU 96–98%. Helper S's first round (`75c32ace` to `49622e21`: 4 updates a second, no scramble, still
  animations while a game runs) lifted it to ~30.
- **01:05 to 04:50 — the PC slept** and the Deck check froze; `scripts/keep_awake.py` and a line in both guides followed
  (`5bf7a146`).
- **05:00 to 06:45 — flows L9 and L10:** the fresh-download check passed; helper U fixed the model hint and made Update
  say what it did (`6885d5d7`, `03c8e25d`, `2644d5df`, `7c924310`, all passed); helper S's second round (`7ead9b06`,
  `453635d9`: redraw only the newest paragraph) showed no clear gain on the Deck; the maintainer chose to keep the
  decode effect with a game running (`4c7edeb6`, costs 5–9 frames). Long answers with a game: 36 (decode off) and
  30–33 (decode on) middle values, dipping into the 20s late on — open in the roadmap. Chats restored each time.

## 11. Report

**Final, written 2026-09-27 at about 00:30 and closed at about 07:00.** Every item is in the roadmap with its
evidence; this is the short version. The maintainer's five calls after midnight (retire "No tip for this", the
thumbs-down design C, the credit line, 30 frames a second with a game, the Steam key; then keeping the decode
effect) were built and checked on the Deck the same night — see § 10's last entries and § 12.

### Owed — both done

1. **Published** by the maintainer (about 00:03, 2026-09-27) after Claude Code's permission check refused the
   session's push. The session checked both sites: the same version, the library file and the credits page match
   the build byte for byte.
2. **The fresh-download check passed on the Deck** (flow L9): the library came down from the published site, the
   offer to download the meaning-search model appeared, and the next question used it.

What continues outside this plan is in the roadmap: the frame rate on long answers with a game running and with
the decode effect on; the new ring bugs found on the last night.

### What a person will notice, proven on the Deck

- **A game's own Deck tip reaches the answer.** Deep Rock Galactic: Survivor's Render Scale tip and Fallout 4's F4SE
  launch option come first in Show details, in Strategy and Speed, with the game running or named in the question;
  a boss question about the same game stays clean. Found broken in the release check (the tips never reached an
  answer), fixed by E2, re-checked the same night.
- **One game's tip never lands on another game's question; a tip answer no longer ends with "No close match in my
  notes"; and a tip answer no longer sets what the chat is "about"** for the next follow-up. All three found during
  the re-check and proven on the Deck before midnight.
- **A boss you only described stays hidden, even while the answer is arriving.** Four rounds to get there: the
  safety net for finished answers; two fixes for the live answer and the thinking lines; then the real cause, found
  from the Deck's own 250 ms screen readings. The screen's letter-by-letter reveal assumed text only grows, so when
  the safety net wrapped a sentence it had already sent, the screen spliced the name back into view. Final check:
  229 reads, the name never showed outside a cover, not in the answer, the thinking, the notes block or the
  suggestion menu; Copy and Read aloud leave it out too.
- **Up from a chip no longer parks the ring on a hidden "Save chat to Desktop"** over a running game (three tries
  over a game, one without).
- **The new library on the Deck:** Brotato, Palworld and Skyrim notes, and "Starting out in…" notes and chips.
- **"What time is it" gets no troubleshooting tip** in any mode.
- **A big screenshot no longer crashes the Deck's AI:** the picture that crashed it twice on 23 September now sends
  108 KB instead of 3.7 MB and is answered in 39 seconds.
- **The note-search model stays loaded as long as the answer model** (it used to drop after 5 minutes).
- **A follow-up stays on the right boss** (4 of 4 on the Deck; 21 of 24 on the PC against 4 of 24 before — the
  maintainer's pick). Its waiting line quotes the person's own words (0 of 407 reads showed the internal reminder).
- **The AI models screen:** "Manage AI models…" no longer opens with the ring on a licence filter; Down reaches Done
  with the filters open; Remove works right after an answer; the model sizes add up.
- **D-pad fixes proven:** the ring stays put when an answer finishes (6 of 6); fade and static chips keep the ring;
  the troubleshooting hint can be dismissed by D-pad; the Ollama tab's walks.
- **Saved-walk replay works again,** and there's a one-command overnight check (replay every saved walk, report).
  Its first run finished in 76 s but every walk read "different": the panel is closed after a deploy and each walk
  needs its own start screen — the next step for it.
- **The maintainer's eight chats are back** (all 15 files match the backup; settings byte-identical, characters on).

### Fixed in code, proven on the PC only

- **An older library keeps its notes** (`c1ca8b7d`). The plugin never upgrades an installed library, and tonight's
  tip check read a column older libraries lack — without this, every answer on a library from before 26 September
  (including the one on the download sites today) would have lost all its notes.
- **Contractions no longer leave a stray letter in the search** ("there's" → "there"; `55719a6e`). Held-back set:
  one question better, none worse. A first try that deleted apostrophes entirely made one question worse and was
  dropped.

What is still owed on the Deck from earlier landings is in the roadmap's Verify list.

### Still open, and why

- **The question box goes dead over Fallout 4** with no chip pressed: the ring stays in the box while the page's own
  focus moves on; reopening the panel doesn't clear it while the game runs. Same family as the ★★★ chip-then-Ask
  trap, which did **not** reproduce in 6 measured tries with nothing running (the reading is recorded for the fix).
- **A chat opened with RB while a game runs:** Down stops on its question line until the panel is reopened.
- **A game's own tip is found by shared words only:** "the words look blurry" misses the Render Scale tip that "the
  text looks blurry" finds. A meaning-search rescue was measured and left for a later lane (it would add a second
  search call to every Strategy question for such a game).
- **A game's own tip is labelled "Shared troubleshooting"** in Show details; the fix has to carry the tip's game
  through several card builders.
- **"Enable local knowledge base" chip** appeared once while the knowledge base was on.
- **The "No tip for this" line can't appear:** four cut-offs measured, none makes it appear without losing right
  tips; the maintainer decides whether to retire it or plan a word-search cut-off.
- **The "no close match" line on the Black Mesa horse question:** a borderline score (0.6508 against 0.65), not a
  regression; left alone rather than retune a measured cut-off for one question.
- **The stuck panel and the busy dot** didn't reproduce in 3 honest tries each; they stay open.
- **Frame rate with a game running:** 10 to 20 a second while an answer arrives, scramble on or off — the game
  competing, for the maintainer to judge against the 45 floor.
- **Show details still names a protected note** in its credit line (behind a deliberate press) — the maintainer's call.

### Calls made by the session (in D112's addendum, open to change)

The follow-up pick recorded; Skyrim's share-alike 2.5 licence let through the release check; spoiler settings for
the new games (Brotato little story, Palworld and Skyrim protect progress); ranking "starting out" notes lower left
off (it made the answer test worse); the Hollow Knight described-boss answer-test row no longer forbids a cover.
Late in the night: the chats were restored before the fresh-download check rather than leave the Deck on test chats
overnight while the publish waited — that check brings its own backup and restore.

### Lessons (also in docs/lessons-learned.md)

- AI-reworded notes pick up small invented details; checking every sentence against its page caught them in most notes.
- Cut a helper's copy only when the tests pass at that exact commit.
- A screen that animates streamed text must not assume the text only grows.
- A timing-sensitive test that fails under load can be pointing at a real race; this one was.
- The 20-minute scheduled check did not restart the session after either usage stop; the maintainer's message did.
- Remove repo copies only with the prune script.
- The plugin never upgrades an installed library: any read of a column from a newer library format must survive its
  absence, or an older library loses every note. A test on a copy with the column dropped guards it.
- When a later step changes what kind of question a turn is, every reader after it must see the change — three places
  read the stale label here (the notice, the follow-up memory, the notes list).
- Reword a Deck question by adding words, not swapping them: swapping "text" for "words" dropped the one word the
  tip's keyword match needed and cost a Deck round.
- Publishing to public sites is refused from a session by Claude Code's permission check; plan it as the
  maintainer's step.

---

## 12. How plan 70 was built — a developer guide

Plain terms, for someone picking this code up later. Each part says what it does for a person, then where it
lives. File paths are relative to the repo root.

### The library itself: notes, tips, and its format

- **What's in it.** Strategy notes per game live in `data/kb/strategy_seed.json`; this wave added Brotato,
  Palworld and Skyrim, plus "Starting out in…" notes for Cyberpunk 2077, Fallout 4 and Red Dead Redemption 2.
  Deck troubleshooting tips live in `data/kb/compat_patterns.json`; a tip can now belong to one game (its `app_id`),
  e.g. Fallout 4's F4SE launch option or Deep Rock Galactic: Survivor's Render Scale tip. Tips without a game are
  shared by every game.
- **Building it.** `scripts/build_rag_db.py` turns those two files into one database (`corpus.db`) with a keyword
  index and a meaning index. The format is now **4**: a new note kind, `starting_out`, and the tip's game column.
  The table layout and the step that adds new columns are in
  `py_modules/backend/services/knowledge_base_schema.py`. **Only the build adds columns** — the plugin never
  upgrades a library already installed on a Deck, so any code reading a newer column must cope with its absence
  (see the guard in `_compat_tips_for_app_keys` in `knowledge_base_service.py`).
- **Checking and publishing it.** `scripts/publish_corpus.py` checks licences (Skyrim's wiki is share-alike 2.5,
  now allowed) and that the files match their own manifest, then pushes to Hugging Face and GitHub. The push is
  the maintainer's step: Claude Code's permission check refuses it from a session.
- **Downloading it on the Deck.** `py_modules/backend/services/rag_corpus_download_service.py` fetches the
  manifest, refuses a format newer than this plugin reads, and installs. After an install the plugin offers the
  meaning-search model (`src/components/KnowledgeBaseSection.tsx`). "Update knowledge base" now says what it did,
  waits long enough for a slow network, and logs one line (`py_modules/backend/services/rag_corpus_rpc.py`).

### How a question finds its notes and tips

The request path is `py_modules/backend/services/game_ai_request.py`. In order:

1. **Which game?** The running game, else a game named in the question, else the chat's own game.
2. **What kind of question?** `should_retrieve_knowledge` sorts it into strategy or troubleshooting ("compat").
   Strategy mode locks a question about the running game to strategy before reading it.
3. **The search** — `retrieve_knowledge_context` in `py_modules/backend/services/knowledge_base_service.py`, with
   keyword search in `knowledge_base_search.py` and the meaning search via `ollama_embed_service.py`.
   - **New this wave: the game's own tip gets a chance on every question.** `_reroute_to_game_tip_if_it_fits`
     checks the running game's own tips by keyword against a measured cut-off (4.0: no strategy question in the
     test set scores above 3.4; the weakest real Deck question scores 4.9). A hit sends the turn to the tips, with
     that tip first — even in Speed, even when Strategy mode had locked it.
   - **Tips stay with their own game.** The general tip searches keep shared tips and only the resolved game's own
     tips, never another game's.
   - **Contractions** ("there's", "can't") drop their ending before the words are searched, so no stray "s" or "t".
4. **After the search the request re-labels the turn** if the tips answered it, so everything after — the honesty
   lines, the follow-up memory, the notes list — treats it as a troubleshooting turn.
5. **Honesty lines** under an answer are decided in `kb_not_in_notes_notice.py`: "Not in my notes" and "No close
   match in my notes". "No tip for this" was retired (it could never appear).
6. **Follow-ups** remember what the chat is about (`kb_followup_memory.py`) and, by default, send the previous
   question and a trimmed answer with a bare follow-up — the maintainer's pick (right boss 21 of 24, was 4 of 24).
7. **The meaning-search model** stays loaded as long as the answer model, and is seen as soon as its download
   finishes.

### The spoiler safety net

Goal: a boss the person only described never shows by name unless they tap to reveal it.

- **Deciding what to protect** — `py_modules/backend/services/strategy_spoiler_policy.py` works out, once per turn,
  whether a cover is owed and which names are protected (boss notes the person didn't name). Per-game settings are
  in `spoiler_title_profiles.py` (back end) and `src/data/spoilerTitleProfiles.ts` (screen).
- **Covering the finished answer** — `response_verify.py` wraps any sentence naming a protected thing in a spoiler
  fence the model forgot, and repairs fences glued to a word.
- **Covering the live answer and the thinking lines** — `ollama_ask_service.py` applies the same cover to the text
  while it streams, and hides protected names in the thinking lines.
- **The notes block** under an answer titles a protected note "Boss note (spoiler)" (`kb_attached_notes.py`,
  `src/utils/buildKbNotesBlockElement.tsx`).
- **The screen side** — the real cause of the last leak was here: `src/hooks/useSmoothStreamReveal.ts` assumed the
  text only grows, so when the back end wrapped an already-sent sentence the reveal spliced the name back in; it now
  resyncs when earlier text changes. The screen never opens a cover by word overlap
  (`src/utils/unwrapAskedEntitySpoilerFences.ts`); Copy and Read aloud leave covered text out.
- **Show details** hides its credit line until the notes block is opened when the answer hid a spoiler, or shows the
  protected note under its neutral title when there's no block to open (`src/utils/contextChipsFromSnapshot.ts`,
  `src/components/ContextChipLadder.tsx`, `src/components/SessionContextStrip.tsx`,
  `src/utils/buildDetailsPanelElement.tsx`).

### Keeping the panel smooth while a game runs

The maintainer's target: at least 30 frames a second in the panel while an answer arrives with a game running.

- **Knowing a game runs** — `src/utils/lighterWhileGameRuns.ts` reads the same state as the Context line, and holds
  a measuring switch (`window.__bonsaiGameLoad`) for A/B tests on the Deck.
- **Fewer updates** — while a game runs, the answer updates 4 times a second in word groups instead of ~16 redraws
  (`src/hooks/useBackgroundGameAi.ts`, `src/hooks/useBonsaiAskOrchestration.ts`); the scramble is skipped
  (`src/components/MainTab.tsx`); small animations hold still (`src/styles/sections/gameRunningLighter.ts`).
- **Cheaper updates at any length** — an arriving answer is split into finished pieces and the growing last piece;
  only the last piece is re-read and redrawn (`src/utils/streamMarkdownPieces.ts`,
  `src/components/StreamMarkdownPieces.tsx`, wired in `src/features/stream-scramble/ScrambledAnswerText.tsx`).
- **Measured** — on the Deck with Deep Rock Galactic: Survivor running, while an answer arrives: about 12 frames a second
  before; 36 after with the decode effect skipped; 30–33 with the decode kept (the maintainer's choice, now the
  default; it costs 5–9 frames). Long answers still dip into the 20s late on, and redrawing only the newest
  paragraph helped on the PC but showed no clear gain on the Deck, where the game and the AI take most of the
  processor. The game itself now holds 23–31 frames a second during an answer (was 14–17). With nothing running
  the decode-off panel is unchanged (~58); with the decode on, a long answer falls to ~37 — open. Evidence:
  `docs/test-evidence/plan70-FPS-baseline.json`, `plan70-FPS-after.json`, `plan70-FPS-pieces.json`.

### D-pad ring fixes on the Main tab

Each is its own small change, most in the chat transcript's navigation:

- The ring stays on the question's Retry when an answer finishes (`src/hooks/useLiveTurnHeaderRingRestore.ts`).
- Fade and static chips keep the ring when the chip changes (`src/features/preset-carousel/presetRowFocusNav.tsx`,
  `src/components/MainTabPresetAnimatedChips.tsx`).
- Helpful keeps the ring on the row (`src/utils/buildReplyActionsElement.tsx`); Show details scrolls into view above
  the dock (`src/utils/chatPanelScroll.ts`); the troubleshooting hint's Dismiss is reachable and hands the ring on
  (`src/utils/handRingOnWhenGone.ts`, `src/hooks/usePermHintNavTargets.ts`).
- "Save chat to Desktop" is reachable from the chips, but only when it's fully visible
  (`src/components/SaveChatToDesktopRow.tsx`, `src/utils/saveChatRowNav.ts`).
- The Session tab's last row reaches the chips (`src/components/SessionContextStrip.tsx`).

### The AI models screen and the Ollama tab

- The Filters panel always takes the ring when it opens, Down reaches Done, and "Manage AI models…" opens like
  Browse (`src/components/PullModelsModal.tsx`, `src/components/OllamaModelsHubModal.tsx`).
- Remove stops greying out once an answer finishes (`src/utils/activeOllamaRoutingTag.ts`); installed models' sizes
  come from the Deck (`py_modules/backend/services/local_ollama_setup_service.py`,
  `src/hooks/usePullModelCatalogRefresh.ts`).
- No false connection failure at startup (`src/features/plugin-shell/settingsLoadedSignal.ts`,
  `src/hooks/useSettingsLoadedFlag.ts`).

### Smaller fixes

- A big screenshot is shrunk with ffmpeg when the imaging library is missing, instead of crashing the Deck's AI
  (`py_modules/backend/services/screenshot_media.py`).
- The Steam ban report reads as a list (`py_modules/backend/services/steam_vac_service.py`).
- Internal follow-up text never shows in waiting lines or Show details (`main.py`, `game_ai_request.py`).

### Tools added for testing

- `scripts/deck_overnight_run.mjs` (with `scripts/lib/`): replays every saved Deck walk and writes a report.
- `scripts/eval_kb_answers.py`: switches to measure the follow-up fixes.
- `scripts/keep_awake.py`: keeps this PC awake during long sessions.

## 13. Session technical summary (the maintainer's trial format)

**Code changed:** 97 code commits from plan 70 across the files named in § 12, plus tests for each; the busiest files
were `py_modules/backend/services/game_ai_request.py` (14 commits), `knowledge_base_service.py` (9),
`src/components/MainTabChatTranscript.tsx` (7) and `strategy_spoiler_policy.py` (5). Library data changed in
`data/kb/strategy_seed.json` and `data/kb/compat_patterns.json`.

**What came up that wasn't planned, and how it was handled**

1. **The live spoiler leak took four rounds.** The back end's covers were right; the screen's letter-by-letter
   reveal assumed text only grows and spliced the name back in. Found from the Deck's own 250 ms screen readings;
   fixed in `useSmoothStreamReveal.ts`.
2. **The new per-game tips never reached an answer.** The code only looked at a game's tips after deciding a
   question was troubleshooting, and real questions ("the text looks blurry") weren't sorted that way. Fixed with a
   per-game keyword check and a measured cut-off.
3. **That fix nearly emptied every answer on older libraries.** The plugin never upgrades an installed library;
   the new check read a column older libraries lack. Caught by three tests on an old library; guarded and tested.
4. **One game's tip could attach to another game's question**, and a turn switched to tips still carried its
   "strategy" label into the honesty lines and the follow-up memory (which remembered "display" as the subject).
   Both fixed and proven on the Deck.
5. **A contraction fix made one question worse on its first try** ("what's" became the search word "whats");
   a narrower version helped one and hurt none.
6. **Publishing was refused** by Claude Code's permission check; the maintainer ran it; the session verified both
   sites byte for byte.
7. **A plugin reload with a game running froze Steam's screens** (17:52); the maintainer restarted Steam. Rule since:
   never reload while a game runs — and the helpers' own notes that said otherwise were corrected in each runbook.
8. **The PC slept** mid-check overnight; a four-hour "hang" was the PC, not the tool. Now `scripts/keep_awake.py`.
9. **Frame rate with a game** was CPU-bound: ~16 full redraws a second, each growing with the answer. Fewer
   updates first (12 → 30), then piece-by-piece drawing for long answers — which helped on the PC but not clearly
   on the Deck; the last gap needs a Deck processor profile. The maintainer then chose to keep the decode effect
   with a game running (costs 5–9 frames). The measuring switch was first set in
   the wrong page (the plugin runs in Steam's hidden main page); fixed so it works from either.
10. **Two usage-limit stops**; the 20-minute scheduled check didn't restart the session either time — the
    maintainer's message did.
11. **Size limits tripped by other chats' commits** (the roadmap, then the project guide); fixed by moving detail
    into linked pages, never by raising a limit.
12. **Removing a repo copy the plain way damaged shared packages**; since then copies are removed only with the
    prune script — which can't tell cherry-picked copies are done, so 23 plan 70 copies await the word.

**What would have made this easier on the maintainer's side**

- **Run long sessions in the Claude Code desktop app** — it keeps the PC awake (now noted in the guides).
- **Decide the publish step at plan time** — either run it yourself when told, or add a narrow allow rule for the
  publish command before "go"; the session lost an hour waiting on it.
- **Say where a secret lives when a check needs it** — the ban-lookup check waited a day for the Steam key that was
  already in the private settings file.
- **Answer open calls early** — the "No tip for this" question had been blocked since mid-September; the four
  calls answered tonight each unblocked work immediately.
- **Tell the session before switching the Deck's screen or Steam mode** — you did this tonight (offline mode), and
  it saved a round.

---

## Appendix A — the helpers' files (for the briefs, not for reading)

Read at tip `386aad5e` on 2026-09-25; each brief re-checks against the tip it is cut from.

| Helper | Owns | Reads only | Notes for the brief |
|---|---|---|---|
| A | `py_modules/backend/services/strategy_spoiler_policy.py` (an explicit per-turn "cover required" value, from the branch choice at 144-260 plus consent), `response_verify.py` (a new checker beside `drop_branch_menu_copying_the_worked_example`, 171-220), `game_ai_request.py` (carry the value; apply the checker after the branch-menu check, near 930), the live-stream path the screen reads while an answer arrives (find it; plan 68 landed the summary and wait-line changes there tonight — keep its `request_chat` and `chat_summary` untouched), tests, new rows in `tests/fixtures/kb_answer_eval.json` for name-withheld boss questions (Hollow Knight, Hades) | `src/.../unwrapAskedEntitySpoilerFences.ts`, `MainTabBonsaiAiMarkdownChunk.tsx` 291-337 (the fence is a code block labelled `bonsai-spoiler`) | Protected = a name from an attached boss or story note, or from the spoiler table, that the question did not contain. Wrap the sentence(s) that contain it; keep the branch menu last; do not fight the screen's own un-hide of what the person asked about. Break the guard on purpose once and say so in the commit. Plan 68's `6843f8e1` found answers saved with their `bonsai-spoiler` markers written twice (cause unknown, filed as a roadmap bug): the checker must treat a doubled block as covered, and must never produce one itself. |
| B | `kb_not_in_notes_notice.py` (the guard at 257-276 and 332-344: read note text, not only titles), `knowledge_base_service.py` (the ranking function, 644-745, only), `knowledge_base_search.py`, tests | `game_ai_request.py` 849-855 | Measure on the search test and the answer test (PC lock). Wave 2 part (B2): once E's "starting out" kind lands, rank it below specific notes unless the question asks how to start. Report numbers, not only pass/fail. |
| C | `compat_topic_router.py` (a cut-off on the topic sorter's own pull, near 340), `knowledge_base_service.py` (`COMPAT_MEANING_FLOOR` at 370 and the compat pool only), tests | `kb_not_in_notes_notice.py` 111-136, `knowledge_base_search.py` 61, 180, 366-370 | Tuning sentences only; never tune on held-back rows. Outcome is either a shipped cut-off that loses no right tip, or a numbers table for the maintainer. |
| D | `src/components/KnowledgeBaseSection.tsx` (the install at 428, the hint at 343-350, the pull button at 458-474), `rag_corpus_download_service.py` if needed, tests | `ollama_embed_service.py` | Reuse the existing pull call; `main.py` may not grow. A new control needs its D-pad wiring and a testing row; the Deck check needs the model removed first (allowed, D112). |
| E | The library builder `scripts/build_rag_db.py`, the format number and its check in the download service, the validator, both lists of note kinds (back end and screen), the starting-out chip wording and "where do I start" phrases, `data/kb/compat_patterns.json` (a per-game field and the new tips), the per-game pull in the compat pool of `knowledge_base_service.py` (after C lands), `data/kb/strategy_seed.json` (re-typing the 22 "Starting out in…" notes only), tests | `docs/planning/18-phase4-track3-per-game-compat-tips.md` (the per-game design and the two quirks, recorded verbatim), D29, D65 | Researched tips carry their own provenance line and the weaker trust tier. Two real tips beat five padded ones. Check how the current published plugin reads a newer format before the release. |
| F | `data/kb/strategy_seed.json` (new games Brotato and Palworld: `games`, `aliases`, `sections`) | `scripts/fetch_wiki_live_pages.py`, `scripts/extract_wiki_notes.py`, an existing wiki-sourced game as the model | Own words, with page, licence and date on every note (D111). 10 to 15 notes each, including bosses, enemies, items and one starting-out note. Steam app ids to confirm: Brotato 1942280, Palworld 1623730. |
| G | `data/kb/strategy_seed.json` (Skyrim; starting-out notes for Cyberpunk 2077, Fallout 4 and Red Dead 2) | as F | Skyrim Special Edition app id to confirm: 489830. Red Dead's note has no source page, labelled as bonsAI's own. |
| H | `tests/fixtures/kb_eval_v2.json` (new rows, unlabelled) | nothing in `data/kb/` — must not read any note | The three new games, the 22 games with no blind rows, and "where do I start" rows for Cyberpunk, Fallout 4 and Red Dead. Plain player wording, some without the game's name. |
| I | The AI models screen files for its four non-D-pad bugs, the ban report's rendering, `tests/test_voice_read_aloud_service.py` (240-257; wait on a signal, not a clock), tests | – | The ring-on-a-filter bug only with flow 2c's measurement in hand. |
| J | The screenshot-attach path in the back end, tests | – | Shrink with ffmpeg (already on the Deck) to a size the model handles; refuse with a clear message if the shrink fails. Measured target from 2026-09-23: 86 KB in 0.2 seconds. |
| K | `kb_followup_memory.py` (per-chat since tonight), the follow-up block in `game_ai_request.py`, `scripts/eval_kb_answers.py`, tests | plan 68's landing commits `16594281`, `e9135f7e`, `cfa5537c` | Measure three finishes (carry the subject into the model's instructions; drop the runner-up note when the subject names one; send the previous question and a trimmed answer) on the same questions, three runs each. Hand back a table; build only after the maintainer picks. |
| N | A new script under `scripts/` that starts the Deck tools as a client and calls hold-awake, deploy and replay, then runs `scripts/verify.py --quick`, and writes one report under `docs/test-evidence/`; its tests | the Deck tools project's tool list | Uses the tools, never copies their code (AGENTS.md). |
| L | `tests/fixtures/kb_eval_v2.json` (labels on H's rows only) | the notes | Must be neither F, G nor H. |
| T | A drawing (HTML) of the thumbs-down flow at the Deck's true size, from the real reply-actions code | the reply actions and feedback code | The session reviews and publishes it. |

Files belonging to the session and to no helper: the roadmap, the status report, the testing documents, the
changelog, this plan, the decisions file, `scripts/publish_corpus.py`.

## Appendix B — the Deck flows, in outline

Compiled into runbooks at block 0 from `owed-deck-rows.md` in the session's scratch folder. Every flow starts by
checking both lock files and ends by putting settings back and releasing the Deck lock.

- **Flow 1:** KB-FOCUS-01, KB-SPEED-02 (models in memory before, during, after), W2-R4 (sent with the
  send-a-question script, not thumb-typed), KB-ROUTER-01's leftover, the notes block's chip ladder, the
  shared-tip source page, and the no-tip reading.
- **Flow 2a (answers and chats):** REPLY-VERB-01, CHAT-HEADER-CAPTION-01, CMD-REPLY-TITLE-01, SCR-05,
  STOP-PARTIAL-01, THINKING-OPENER-01, THINKING-SPOILER-01, CONST-SPOIL-CONSENT-01, SPOILER-RISK-CHIP-01,
  SPY-REVEAL-01, the character rows, EXPERT-CAP-01, SMOKE-H, and CHAT-MEMORY-01 again after plan 68's deploy.
- **Flow 2b (D-pad walks):** STREAM-WALK-REC-01, the streaming free-play try, SETTINGS-CARD-06 and 07,
  ASK-CARET-01 and its character twin, STRATEGY-PLACEHOLDER-01, DOC-SWEEP-01, ONBUTTONDOWN-AUDIT-01, the
  reply-actions row (MICRO), REPLY-DOWN-01, D-PAD-SCROLL-01/02, the chip rows, CHAR-PICKER-RING-01,
  QAM-BODY-RO-01, UI-SCALE handheld.
- **Flow 2c (Ollama tab and AI models screen):** OLLAMA-FOCUS-01 to 03, the keep-alive ring, ROUTING-01/02,
  HUB-EDGE-01, and a measured walk of the ring-on-a-filter bug for helper I.
- **Flow 2d (the rest):** VAC-06, SMOKE-C, PERMS-CLEAN-02/05/06, LANG-01, RPC-TIMEOUT-01, QA-FROZEN-CHIPS-01,
  READ-ALOUD-06 and the machine half of READ-ALOUD-02.
- **Flow 3:** with Deep Rock Galactic: Survivor — BRANCH-TEMPLATE-02, STREAM-11 with FIX-01 to 03, the frame
  rate with the scramble off and on, DRG-01f, the Deep Rock half of CONST-SPOIL-01; with Hades —
  CONST-SPOIL-SPEED-01; with Black Mesa — THINKING-SLOW-01; with Half-Life 2 — PHASE4-CHIPS-01 and
  PRESET-ONE-LINE-04.
- **Flow 4:** the recorded walks listed in § 3.
- **Flow 5:** reduced motion on; CHIP-BUTTON-07, SCR-07, the reduced-motion boxes; reduced motion off.
- **Flow 6:** re-save every walk in `checks/`; the overnight slice's first run.
- **Flows L1–L4 and R:** written from each landing's own testing rows.

## Appendix C — the two lock files

Each is one line: `<session name> <start time> <expected end> <what>`. Check before acting; if present and not
yours, wait and do something else; delete it when done. A lock older than its expected end by more than an
hour is asked about by message, never deleted silently.

- `C:\Users\still\.deck-lock` — any press, deploy, game launch, or timing on the Deck's own AI.
- `C:\Users\still\.pc-ollama-lock` — the answer test, the search test, any library build, anything else using
  this PC's AI model.
