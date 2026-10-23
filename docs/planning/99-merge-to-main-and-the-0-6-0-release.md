# 99 — Merge experimental into main: the 0.6.0 release

Written 2026-10-22 (evening) by the release-planning chat, at the maintainer's request: "create a plan to merge
experimental with main, bump to v0.6.0, new README recordings first, say everything needed to be ship-ready."
It replaces the release-day steps of [plan 71](../../../bonsAI-workshop/planning/71-merge-experimental-into-main.md)
(the 2026-09-26 scoping) and plan 96 § 6, re-checked against git, the workflows and the roadmap tonight.

**Status: RUNNING since 2026-10-22 22:00 (the maintainer said go and took every lean in § 2, recorded as D136). Progress in § 10.**

**The other chats tonight:** the knowledge-base wave (plan 98, planning only) adds nothing that must land before 0.6.0 and
is recommended to run after the merge. The Deck chat committed its last two fixes at 21:00 and handed the Deck over.

**Who runs it:** this chat (Fable 5.1) plans and orchestrates, the maintainer's choice for this one. The guide puts
landing and merging on Opus extra-high; running it here costs about two and a half times more per turn. Helpers
follow the guide: the `bookkeeper` (Sonnet medium) for the changelog, roadmap and testing documents; one Sonnet high
documents helper; the `deck-driver` (Sonnet medium) for the Deck blocks; Haiku high only for checkable lookups.
Never alongside another Deck chat: the "Tab underlines and popup button styling" chat handed the Deck over at 21:00
on 2026-10-22 and is done for the day.

**Read first:** [AGENTS.md](../../AGENTS.md) (Commands; Which model does which work); [lessons-learned.md](../lessons-learned.md)
§ 1 and § 3; [plan 95](95-readme-refresh.md) §§ 5, 12 and 13 (how the clips were filmed); the Tier 4 release gate in
[testing-manual.md](../testing-manual.md); [plan 73](73-maintainer-checks-before-0.6.0.md).

---

## 1. What is true right now (checked 2026-10-22, about 21:30, nothing pressed on the Deck)

**The branches.** Main has not moved since the 0.4.9 release on 2026-07-08. Experimental is 3,010 commits ahead and
main has nothing experimental lacks, so the merge cannot conflict. Experimental's pushed copy is one commit behind the
local one (`b9200192`, the tab line and confirm-box fix, passed on the Deck tonight). The tests were green on the last
pushed commit. Main has no branch protection.

**The version.** `plugin.json` is the source of truth and says 0.5.0; `package.json` and the About tab's number are
copied from it at build time. 0.5.0 was never released: no tag, no release page. `pnpm run version:bump minor` moves all
three to 0.6.0 and adds a `## [0.6.0] - date` heading to the changelog; it commits nothing.

**What publishes a release.** The build robot (`.github/workflows/build-plugin-zip.yml`) runs on a push to main that
changes `plugin.json`. It builds the zip, checks what is in it, and publishes a GitHub release named after the version
in `plugin.json` if no tag of that name exists yet. The release text is copied straight out of the changelog: everything
between the `## [0.6.0]` heading and the next `## [` heading. The same robot can be run by hand on any branch with
publishing switched off, which is how we get the real zip before the merge.

**Two things that would go wrong today if we merged as-is:**

1. The changelog's Unreleased block is 1,226 lines, about 233,000 characters. GitHub refuses a release text over
   125,000 characters, so the publish step would fail. The 0.6.0 section has to be a short one, with the long list kept
   elsewhere.
2. If experimental reached main while `plugin.json` still said 0.5.0, the robot would publish a "v0.5.0" release. The
   bump must land on experimental first.

**The release gate.** The Tier 4 row (a clean install on the stable-channel Deck) passed on 2026-10-17 with two caveats,
but from a build deployed from the PC, not from the zip. The table says the re-run from the zip is owed before the tag.
Its item 3 (Tiers 0 to 2 passed or waived) has no waiver written. Item 4 (the first-run wording judged by eye) has no
verdict; the maintainer could not find the pictures on 2026-10-18.

**The maintainer's own checks (plan 73).** Clear mid-answer: passed. The real microphone: passed in full 2026-10-18.
Parental lock: skipped, needs a child account. First install from the zip: not done (that is the Tier 4 re-run above).

**Security and licences.** All eight findings of the 0.6.0 security review are fixed, the last three in plan 77 and
proved on the Deck. The licence check's four fixes landed in plan 74. The zip carries NOTICE, the data files and the
third-party licence list, and the robot's check script refuses a zip without them.

**The roadmap.** Six open bugs: four one-star (two about the rig and two wording finds, no player change), one two-star
(the README clips look choppy, the maintainer's ask), one three-star partial (the Settings tab's ring after several
sections are opened, parts b and c, root cause unknown). Eleven Verify rows, nearly all the maintainer's eye or
fingers; two are three-star: the ghost tab bar after a finger touch (a guard is built, the touch check is owed) and the
kids lock on a child account. The 55 open Features are not release work.

**The README.** The words were redone in plan 95 and are in the repo. Six places hold a comment where a video player
should be: the maintainer has to upload each file on github.com and paste the link it gives. Every clip on the page is
from the 2026-10-17 build and the maintainer finds them choppy and blotchy (the recorder's default setting, then GIFs cut
to 10 frames a second). The recording recipe, the cut script (`scripts/readme_media.py`) and the lessons are all written
down, so refilming is a known job, not a new one.

**The guide's known-problems list** is stale: it says a stuck D-pad clears when the menu is closed and reopened (the
freeze was fixed in plan 97 and passed 27 of 27), it gives a frame-rate number from September, and it does not mention
the ghost strip or the Settings sections.

**Loose ends from plan 71 never picked up:** a bug-report form (none exists under `.github`), a short how-to-help page,
the Reddit posts, and the author field in `plugin.json` ("qwert", while the GitHub account is qd313; "keep for now" on
2026-09-26).

---

## 2. Calls for the maintainer

The first four block the release. The rest shape it. My lean is in bold where I have one.

| # | Call | Lean |
|---|---|---|
| 1 | **The release notes.** The 0.6.0 section becomes a short page: a one-minute re-introduction, the highlights since 0.4.9, "Known problems", one line for anyone installing over 0.4.9, and a link to the full list. Where does the 1,226-line full list go? (a) a new file `docs/changelog-0.6.0-full.md`, linked; (b) stays in CHANGELOG.md under its own bracketed heading below the short section. | **(a)**, it keeps the changelog readable and the robot's cut-out short |
| 2 | **Tier 4 item 3.** Tiers 0 to 2 have no clean pass in the table. Waive them for 0.6.0 on the strength of plans 94 to 97's Deck passes (one line in the table saying so, dated), or hold the release until someone re-runs them? | **Waive**; the Deck has been walked seven times since 2026-10-17 |
| 3 | **The push.** Two pushes are needed: experimental (the release commit, so the robot can build the zip and the tests can run) and main (the merge). You push by hand, or you say "push" and this chat does it with the push lock lifted for that one command. Also: the one commit from tonight's fixes is unpushed now, and the zip for the clean install cannot be built until the tip is pushed. | **Say "push" early for the tip**, so the Deck work can start on the real zip |
| 4 | **Which clips, in what shape.** The maintainer asked for 60 to 90 frames a second. GIFs cannot do that at a README size. Options: (a) whole-screen clips as video files at 60 fps (a hand upload each, six today); panel-only clips as animated WebP at 30 fps, quality 90 (about 5 to 6 MB each, plays by itself on GitHub); (b) every clip as a video file (eleven uploads, sharpest, but a click to play each). Recorder on the full-quality setting either way. | **(a)** |
| 5 | **The monitor set.** Film the Deck's own screen only (your pick for the page on 2026-10-17), or both screens again? The monitor set adds about an hour of Deck time. | **Deck screen only**; the old monitor set stays as a spare |
| 6 | **The parental lock.** Make a child-account profile and run the kids-lock rows (about 20 minutes of your hands plus one Deck block), or ship with a known-problems line saying the lock has not been checked on a child account? | **Ship with the line**, unless the account is quick to make |
| 7 | **The Settings-tab ring (three stars, parts b and c).** Against plan 71's line it is a focus trap, but a rare one with no known cause after nine days. Ship it as a known problem ("after opening several sections, the ring can skip a control; close and reopen the menu"), or hold? | **Known problem** |
| 8 | **The guide's D-pad line.** The freeze is fixed and proved. Remove the line, or keep a softened one for this release ("if the D-pad ever stops moving, close and reopen the menu; if that fails, reload the plugin from Decky's settings")? | **Keep it softened** for one release |
| 9 | **Merge style.** One merge commit, as agreed on 2026-09-26, or a plain fast-forward (main becomes experimental's tip, no extra commit)? Both keep every commit. | **Merge commit**, as agreed |
| 10 | **Last call.** A time after which anything found goes to 0.6.1, not into this release. | **When the clean install passes on the zip**; after that only a bug that crosses the line |
| 11 | **Plan 71 leftovers.** The bug-report form and how-to-help page: before or after the release? Reddit posts: draft now, or after the page is live? The author field: keep "qwert"? | **After, after, keep**; none of them needs the Deck |
| 12 | **Small looks still waiting on your eye** (not blockers): the tab icons (thicker or as they are), the "4.6 GB" against "4.5 GiB" wording, the chip decode pace, the tab glide and reduced motion. Say "as they are" and they close. | **As they are** |
| 13 | **Where this runs.** This chat is Fable. Planning here fits the guide; running the release here is outside it (Opus extra-high lands). Run it here, or hand § 3 and § 4 to an Opus chat with this plan? | your call; **here is faster to start**, Opus is cheaper |

---

## 3. The work, in tracks that run side by side

The Deck is the only thing that has to go in order. Everything else runs next to it from "go".

### Track A — words and paperwork (no Deck; starts at "go"; about 1.5 hours; all helpers)

| Step | Who | What | Done when |
|---|---|---|---|
| A1 | bookkeeper (Sonnet medium) | The 0.6.0 changelog section per call 1: re-introduction, highlights grouped by what a player sees (not by plan), "Known problems", the 0.4.9 line, the link to the full list. Move the per-plan detail out per call 1. Run the contents-list script. Keep the section under 60,000 characters. | The section reads in a minute; `verify.py --quick` passes |
| A2 | Sonnet high documents helper | The known-problems list in `docs/guide.md`, rewritten from what is open tonight (calls 6, 7, 8): the softened D-pad line, the ghost strip, the Settings sections, the frame rate without a number, answers can be wrong, the once-seen Steam stall, the kids lock if call 6 says so. The same list goes into A1's "Known problems". | Both lists say the same things |
| A3 | the same helper | README check against tonight's build: step 3 of Install should mention that the first run now asks where the AI should run; every link the plugin itself opens points at something that exists on main after the merge (search the screen code for GitHub links into experimental-only paths); US spelling; no "sped up". No clip changes yet. | A short list of fixes, applied |
| A4 | bookkeeper | Roadmap and testing sync found tonight: Search-in-bonsAI (BUILT) moves to Verify; plan 96's status line (F8, F9, F10, F13 passed 2026-10-22, roadmap Done); plan 73's status line (checks 1 and 2 are done); the Tier 4 waiver line if call 2 says so; log the four planning lookups in plan 33 (two Haiku high, two Sonnet medium). | Rows match Done |
| A5 | this chat | The cut script gets the shapes call 4 picks: a 60 fps video shape and a 30 fps animated WebP shape beside today's GIF; a dry run on one 2026-10-17 master. One commit. | Four files from one master, sizes in a table |

### Track B — the Deck (one driver at a time; starts once the tip is pushed; about 4 to 5 hours)

| Step | Who | What | Done when |
|---|---|---|---|
| B0 | maintainer | Says "push" for the tip (call 3). This chat runs the build robot by hand on experimental with publishing off, downloads the zip, runs the zip check script on it. Fallback if the robot is slow: the same build on a Linux shell. | A zip that passes the check, named with the commit |
| B1 | deck-driver | **Clean install as a player**, the Tier 4 row's second run: uninstall bonsAI in Decky, Settings → Clear all data first; move the Deck's Ollama and voice engine aside (plan 97 block C's way, never a wipe: a wipe deletes them); install the zip through Decky's "Install Plugin from URL" from a tiny web server on the PC (the same path the README gives, with our address in place of GitHub's); the beta notice; the where-should-the-AI-run popup; Permissions → Internet downloads; Install Ollama with the starter set (about 4.6 GB, 15 to 30 minutes on Wi-Fi); the loading line; the first answer; the library download; the Developer tab hidden; no test chips; a clean log. Pictures of every first-run screen go to the checks page for the maintainer's eye (Tier 4 item 4). | The Tier 4 table's second row, PASS, from the zip |
| B2 | maintainer (20 minutes, during B1's download wait) | The first-run wording by eye from B1's pictures; the ghost-strip touch check with a game running (a finger on the screen, then look for a second row of tabs); the tab icons, glide and chips by eye if call 12 is not "as they are". | Rows ticked or waived on the checks page |
| B3 | deck-driver + this chat | **Filming**, § 5, on the same install. Set-up first (AI on the PC for all but one clip, library installed, Deep Rock Galactic: Survivor on Recent Games, Thinking and the decode effect on, spoiler hiding on, ten saved chats, the everyday chips), then the eleven clips and six stills on the Deck's own screen, in-panel clips first, the ones that open Steam boxes last. Retakes the same block, new wording every retake. | Eleven masters and six stills in `recordings/`, each watched once |
| B4 | this chat | Cuts with A5's script; the GIF or WebP files into `assets/readme/`; the video files into `recordings/upload-these/`; a size table; one look at every file; one commit (README picture paths only). | Every README picture resolves to a new file |
| B5 | maintainer (15 minutes) | Uploads the video files on github.com (drag each into any editor box, copy the link it gives, do not save that edit), pastes the six links into the README where the comments are, commits on experimental. Or sends the links and this chat pastes them. | No `VIDEO:` comment left in the README |
| B6 | deck-driver | Put the Deck back: nothing to restore (B1 was a true install) except: close the game, release keep-awake, delete the moved-aside Ollama copy if the maintainer says so. | Deck free |

### Track C — the release itself (after A and B; about 1.5 hours, half of it waiting on the robot)

See § 4.

---

## 4. Release day, step by step (the critical path)

1. **Freeze.** Nothing new lands after B1 passes except a fix that crosses plan 71's line (traps the player, loses chats,
   shows a hidden spoiler, breaks the first ten minutes, plainly broken on the main screen). The other chats are told.
2. **Fetch and compare.** `git fetch`; the pushed experimental must equal the local tip; the tests green on it. Any
   drift is read, not assumed (cloud chats have pushed to experimental before).
3. **The full gate** on the shared checkout once: `python scripts/verify.py --full` (the guide's rule for a merge).
   Gate on the exit code, never on the last lines printed.
4. **The release commit on experimental.** `pnpm run version:bump minor` (0.5.0 → 0.6.0; it writes `plugin.json`,
   `package.json`, the About tab's constant and the changelog heading), then the bookkeeper's A1 text sits under that
   heading, `python scripts/docs_toc.py`, `verify.py --quick`, one commit: "Release v0.6.0". The same commit carries
   nothing else.
5. **Push experimental** (the maintainer, or "push"). Wait for the tests (about 8 minutes) and the knowledge check to go
   green. A red here stops everything.
6. **The merge, in a separate copy, never in the shared checkout** (a branch switch there captures other chats' work):
   `git worktree add ../bonsAI-main main`, then in that copy `git merge --no-ff experimental -m "Release v0.6.0: merge
   experimental into main"`. Check: `git diff experimental main` is empty. The copy has no node_modules, so it can be
   removed with `git worktree remove` afterwards.
7. **Push main** (the maintainer, or "push"). The robot builds, checks the zip, runs the tests on main for the first time
   (the tests workflow arrives with the merge), creates the tag v0.6.0 and publishes the release with the changelog text
   and the zip. About 10 minutes.
8. **Check the release page:** the zip is there and its size is sane (0.4.9's was 0.8 MB; this one is bigger), the
   notes render, the README on main shows the clips and the badge reads 0.6.0.
9. **Install once more as a player** from the README's own address (`releases/latest/download/bonsAI.zip`) on the Deck:
   it loads, one answer. Ten minutes. This is the last check and it is the maintainer's by plan 73; the deck-driver can
   run it if the maintainer prefers.
10. **Afterwards** (§ 7).

**What could stop the robot at step 7, and the answer to each:** the release text too long (A1 keeps it short; the
cut-out is measured before the push), a tag v0.6.0 already present (none exists; nobody pushes a tag by hand), the zip
check failing (B0 ran the same script on the same build), the tests failing on main (they passed on the identical tip
at step 5).

**The fix route if 0.6.0 is broken for players:** the fix goes on main as 0.6.1, then is merged back into experimental
(plan 71's rule). An urgent fix never waits for experimental to be ready.

---

## 5. The recordings

The plan 95 recipe stands, with the recorder on full quality and the new shapes of call 4.

**The clips, in filming order** (in-panel first, Steam boxes last; from plan 95 § 5.1):

| # | Section | Clip | Length |
|---|---|---|---|
| 1 | Ask about the game you're playing | New chat, Speed → Expert → Strategy, a question naming where you are, live thinking, the answer with the decode effect, Keep, Show reasoning, a branch pick | about 1:30 with the AI on the PC |
| 2 | Notes from the game's wiki | A Speed question whose answer credits a note; the note line opens. **The one Deck-only clip**, AI on the Deck itself, real time | 40 s |
| 3 | Your own notes | "I'm on …", the Keep card, "Read 1 of your notes", the sheet opens | 60 s |
| 4 | Spoilers stay hidden | A Strategy answer with a cover; A opens it | 20 s after a wait |
| 5 | "Where are you at?" | Cut from clip 1 (the checklist and a tick) | — |
| 6 | See how it answered | Show details under an answer | 15 s |
| 7 | Talk instead of typing | The mic button, words appear, Stop, the tidied text (a computer voice into the pretend microphone) | 25 s |
| 8 | Search | The Search tab, "brightness", the Steam setting opens, a chat match | 30 s |
| 9 | Close the menu, keep playing | Ask, close the menu, play, the Reply ready popup | 45 s |
| 10 | Ask about a screenshot | Close menu & take screenshot, reopen, Attach recent screenshot, ask | 60 s |
| 11 | Saved chats | The chat row, LT/RT, New chat at ten asks which to delete, Sum up this chat | 45 s |

Plus six stills: the two plugin-only pictures at the top of the page, Where AI runs (and the new first-run popup, since
the install steps now show it), the paperclip menu, the knowledge library section, the Permissions tab, the AI models
list.

**How (from plan 95 and the lessons):** the recorder runs in the background on the Deck (`scripts/record-deck.sh`,
full quality, one master per clip, named `<clip>-deck.mkv`); presses start only once the recorder process answers;
presses go through the rig's background press script; the menu closes with the GUIDE+A chord; the question wording
changes on every retake because repeated questions are answered from a cache; the avatar is blacked out in the cut
(the top bar always, the game's title-screen card in the stretches named); the Deck's performance overlay is per game.
Full quality writes about 11 MB a second into the Deck's memory, so before the long clip the implementation checks where
the recorder writes and splits the long clip in two takes if memory is short. The D-pad freeze that cost four retakes on
2026-10-17 is fixed; the order above keeps the old caution anyway.

**Cuts (A5):** from each master: whole screen as a 60 fps video 1280 wide (for the six video sections), panel-only as a
30 fps animated WebP 360 wide at quality 90 (for the five picture sections), and the old GIF shape kept beside them so
either can be swapped. A size table goes in the plan's report; anything over 10 MB for a video file is re-cut shorter.

---

## 6. Done looks like

- The release page shows bonsAI v0.6.0 with the zip, a one-minute release text and "Known problems".
- Main equals experimental's tip plus one merge commit; the tag v0.6.0 is on it; the tests are green on main.
- The README on main has eleven new clips and six new stills from the shipped build, no comment placeholders, and its
  install steps match what a new player sees.
- The Tier 4 table has a PASS row from the real zip; the guide's known problems match the release text.
- A player installing from the README's address gets an answer, on the stable channel, with no developer leftovers.
- Everything this plan changed is pushed; nothing waits in a chat.

---

## 7. After the release (the bookkeeper, one commit each; no Deck)

- Archive plans 94 to 97 and this one to the workshop; move the released items under a "Done for 0.6.0" heading; the next heading
  starts fresh.
- Delete merged branches and finished helper copies (match leftover copies by commit title, never by ancestry alone;
  unlink `node_modules` junctions before removing a copy).
- Plan 86 step 5 onward (merging the tests, the untangling) may start.
- Plan 71 leftovers per call 11: the bug-report form under `.github/ISSUE_TEMPLATE`, the how-to-help page, the Reddit
  posts (one per community, after reading each one's self-promotion and AI rules).
- Experimental stays the working branch; main moves only on releases.
- A new knowledge-library publish may come with the knowledge-base wave (plan 98): a separate upload by the maintainer, not part of the zip, no format change, so nothing already installed goes stale.

---

## 8. Risks

- **Clock time is Deck-bound.** Track B is four to five hours if nothing is retaken; the 4.6 GB download and the
  two-minute first answer are inside that. Track A and the maintainer's checks run alongside, not after.
- **The zip waits on a push.** Nothing in Track B can start until the tip is pushed (call 3).
- **GitHub's release-text limit** is the one hard failure we know of; A1 measures the cut-out before the push.
- **Full-quality recording fills the Deck's memory** on long clips; the long clip may need two takes.
- **A video upload is a hand step** and swapping one later is another; six today, eleven if call 4 picks (b).
- **The merge brings the tests workflow to main**, where it has never run; it should pass on the identical tip, but a
  surprise there delays the publish, not the tag (the robot runs the publish from its own workflow).
- **Other chats share this checkout.** Nobody switches branches here; the merge happens in its own copy; no `git add -A`.

---

## 9. Where this plan came from

Four read-only helpers on 2026-10-22 (logged for plan 33 § 4a and § 4b): two Haiku 5.5 high lookups (the roadmap's open
rows; the lessons and the filming recipe), two Sonnet 5.5 medium reviews (how a release is cut and what the bump
touches; every owed item across plans 73, 94, 96, 97 and the security review). Their reports are in this chat; the facts
above were re-checked against the files and the workflow before writing. Plan 71 and plan 72 § 8 (the old known-issues
text, now stale in two lines) were read from the workshop.

---

## 10. Progress log

- **2026-10-22 22:00:** go. Four document helpers started (two bookkeepers, a guide-and-README helper, the cut-script helper). The frozen tip deployed to the Deck.
- **22:25:** the release text committed (`a024825b`): a 4,220-character 0.6.0 entry; the 1,225-line detail in `docs/changelog-0.6.0-full.md`.
- **22:30:** the Deck driver stopped before filming: the Deck was drawing on the monitor. Decision: film the monitor set as a spare while waiting; the maintainer pulled the lead mid-take at 22:41, so the own-screen set is being filmed instead and the one mixed take is unusable.
- **22:35:** experimental pushed (three commits); the robot built the zip from `a024825b` with publishing off; the zip passes the repo check (3.0 MB, version still 0.5.0 inside, as expected before the bump). Copy: `recordings/bonsAI-0.6.0-candidate-a024825.zip`.
- **22:50:** the quick check green on the whole tree; the guide, README, bookkeeping, cut-script and plan commits landed. Waiting on the own-screen filming; then the cuts, the README picture paths, the clean install from the zip.

