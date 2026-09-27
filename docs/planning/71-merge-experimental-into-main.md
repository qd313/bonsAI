# 71 — Merging the experimental branch into main: the 0.6.0 re-launch

Written 2026-09-26 at the maintainer's request: "we are pretty close to merging the experimental branch with
the main branch … create a plan to start scoping out what's needed." Updated the same day with the
maintainer's first answers. Nothing in it is built or run yet, and it waits for the other sessions to finish.

**Status: scoping. Version, merge style, test evidence, the bug rule, reviews and release-day steps are
agreed. The bug session has its own plan, [72](72-release-bug-session.md). Still open: the questions in
section 6, and the last-call date.**

**This plan may sit for a while before it runs.** The numbers in section 1 were true on 2026-09-26. Whoever
picks it up first re-checks them against git, the roadmap and the code, and updates anything stale before
starting.

**What this release is.** Version 0.6.0 re-introduces bonsAI. It is not pitched as an upgrade from 0.4.9: the
README and the release notes introduce the plugin as if to someone meeting it for the first time. That is
why they are the highest-priority writing before the merge, and why there is no upgrade test.

**The one thing to know first.** Putting this work on main is the same as publishing a release. The build
robot publishes a public download page, with a zip, the moment a new version number reaches main. So
everything a player will see — the version, the "what's new" notes, the README, the zip — has to be ready
*before* the push, not after.

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md), "Which model does which work";
[lessons-learned.md](../lessons-learned.md); the release section of [development.md](../development.md#release-plugin-zip).

---

## 0. Doing it fast: what runs side by side (added 2026-09-26, the maintainer: "we're under a time crunch")

The stages in section 3 are **not** a queue. Most of them can start today, while plan 70 finishes. Only
one thing truly has to wait its turn: **the Deck, because only one helper can drive it at a time.** So
the plan is built around keeping the Deck busy every hour, and keeping everything that doesn't need the
Deck moving next to it.

**The one line that has to go in order (the critical path):**
plan 70 finishes → the bug session's Deck measurements → fixes land in batches, each re-checked on the
Deck → freeze → fresh install from the release zip, then filming → release day.
Anything that shortens this line is worth doing first. Anything not on it runs next to it.

**Tracks that start now, before plan 70 finishes, with no Deck:**

| Track | What | Who | Waits for |
|---|---|---|---|
| Docs | README draft, release-notes draft, bug-report form, how-to-help page, the what-reaches-the-internet list | Bookkeeper (Sonnet) drafts, Opus reviews | Nothing. Screenshots and clips drop in at the end. |
| Reviews | Security review and licence check on today's code | The two read-only review helpers, at the same time | Nothing. At the freeze, a short second pass over only what changed since. |
| Research | Decky store rules on AI-written code; the list of every setting's starting value | One read-only helper each | Nothing. |
| Drawings | Save icon and new "+"; the reason chips with and without shorter labels | Opus, true-size drawings like the bubble one | Nothing. The maintainer picks while the bug session runs. |
| Clean-up | Merged branches, finished repo copies, stray files, the evidence-folder rule | Bookkeeper | Nothing — but never a repo copy plan 70 is still using. Ask its session first. |
| Early fix lanes | The bug-session lanes that touch no file plan 70 is working in (plan 72 section 3) | Sonnet lanes, each in its own copy of the repo | A quick check with plan 70's session which files it still has in flight. |

**Tracks that start when plan 70 frees the Deck:** the bug session proper (plan 72), with up to five
fix lanes at once plus the Deck driver.

**Tracks at the end, and even these overlap:** once the freeze lands, the fresh install and the filming
share the Deck one after the other, while the video scripts, the release notes' "Known issues" and the
README's final pictures are written from what was just recorded.

**Rules that keep side-by-side work from costing time** (from [lessons-learned.md](../lessons-learned.md)
§ 1 and § 4, all learned the hard way):

- Each helper works in its own copy of the repo, cut from the newest tip, and checks its base is current
  before starting. Copies have been made hundreds of commits out of date before.
- Each helper owns a list of files. If its fix needs a file outside the list, it stops and says so.
  Two helpers never own the same file at once.
- Landings go one at a time, with every check after each. After every landing, re-check the
  copy-paste check, because side-by-side helpers each pass it alone and then fail together.
- The bookkeeper never commits while a landing is running. It reports its file list instead.
- In a repo copy, commit with the repo's own hooks path, or the hook stages files from the shared copy.
- A usage-limit stop kills every helper at once. Their copies keep their work, and each resumes with
  one short message. A scheduled check every 20 minutes restarts an unattended session after the limit.

---

## 1. What is true right now (checked 2026-09-26 against git and the code, nothing pressed on the Deck)

- **Main has not moved since 8 July** (the 0.4.9 release). Experimental is 1,681 commits ahead and main has
  nothing experimental lacks, so the merge cannot conflict. The hard part is deciding what goes out.
- **Experimental is already public.** The repo is public and experimental is pushed. Main is what a player
  lands on and what the download page is built from.
- **The version number was a loose end:** the version file says 0.5.0 and the changelog has a 0.5.0 section
  dated 15 July, but 0.5.0 was never published. Settled: the release is 0.6.0.
- **Pushing to main publishes automatically**, with no manual step between.
- **The download would grow a lot.** Main's files add up to about 3 MB today, experimental's to about 79 MB.
  Across the whole history, a little over half of everything stored is Deck test evidence, and most of that
  is screenshots and screen recordings (about 40 MB). None of it goes into the plugin zip. It only affects
  people who download the project's source.
- **The automatic tests are green** on experimental's latest pushed copy. The local copy is 37 commits
  ahead, and other sessions have unsaved edits in the shared copy right now.
- **The roadmap holds 38 open bugs:** 4 three-star, 15 two-star, 19 one-star. Plus 18 built items waiting
  for a Deck check, and open knowledge-base items. Some one-star bugs look fixed by commits from the last
  two days (the ban lookup report, the false connection failure at start-up, the big-model size); the
  roadmap has not caught up.
- **Sessions still running or owing checks:** plan 70 (running now, seven helpers); plans 68 and 69 owe
  Deck rows; plan 66 owes its Deck test.
- **Junk has piled up:** 49 helper copies of the repo, 151 local branches (about half already merged), stray
  check files, one-off scripts, and 8.5 MB of old research results.
- **Private details in the files:** the Deck's home-network address in 44 files, the Windows user folder
  name in 28. Both already public on experimental; low risk.

---

## 2. Decisions

| # | Question | Answer |
|---|---|---|
| 1 | Version | **0.6.0** — agreed 2026-09-26 |
| 2 | How main gets the history | **One merge commit**, every commit kept — agreed 2026-09-26 |
| 3 | The Deck test evidence | **(b): keep the written reports, stop adding new screenshots and recordings to the repo** — agreed 2026-09-26 |
| 4 | Which bugs block the release | **The line in section 5**, one big bug session, new bugs checked against the line — agreed 2026-09-26; the session is [plan 72](72-release-bug-session.md) |
| 5 | Must every owed Deck check pass first? | Folded into question 4's rule |
| 6 | Home-network address and user folder | Use a placeholder in new files from now on; leave old files and history alone (recommended, not yet answered) |
| — | Upgrade test from 0.4.9 | **Dropped** — this is a re-launch — 2026-09-26 |
| — | Security review and licence check | **Yes** — agreed 2026-09-26 |
| — | Clean-up | **Before and after the release, as much as possible** — 2026-09-26 |

### Question 3 — the Deck test evidence, the options (the maintainer chose (b))

- **(a) Keep everything as it is.** No work, and the 820 links from 50 documents keep working. But the
  source download stays heavy, and it keeps growing with every Deck session.
- **(b) Keep the written reports, stop putting new screenshots and recordings in the repo.** Recommended.
  The small written reports (most of the 839 files) keep going in, so plans can still link to them. New
  pictures and videos go to a folder the repo ignores. It stops the growth, nothing breaks, and it is a small
  change to the Deck tools. The downside: the old 40 MB stays in the history, and new pictures are no
  longer backed up by git.
- **(c) Take the evidence off main's file list but keep it in the history.** The file list looks tidier for
  the re-launch, but the download barely shrinks, and 820 links break or have to be rewritten.
- **(d) Rewrite the history to remove the pictures and videos.** The only option that roughly halves the
  download. But every commit gets a new ID: all helper copies and branches have to be redone, commit IDs
  written in plans stop matching, and the public copy has to be overwritten by force. Possible only at a
  moment when every session has stopped — right before the release is the one time that would be true.
  Players never download the source, only the zip, so the gain is mainly for people who want to read or
  contribute to the code.

---

## 3. The work, in stages

*Each stage says when it can start. See section 0 for how they run side by side.*

### Stage A — clean-up, first pass (starts now, alongside the running sessions)

Only clean-up that cannot change how the plugin behaves goes here, so it cannot add bugs:

- Bring the roadmap in line with the code: move bugs that recent commits already fixed, and check each
  one-star entry is still real.
- Delete branches already merged into experimental, and helper copies whose work has landed (after checking
  nothing unsaved is in them).
- Sweep stray files: duplicate check files, one-off probe scripts, dead helper scripts. Move old research
  results out of the way if question 3 lands on moving things.
- Code that is truly unused can go, carefully, before the freeze only — never after.

### Stage B — settle the bugs (the main block of work): [plan 72](72-release-bug-session.md)

- The first sort is in plan 72, section 2. It is re-sorted on the session's first morning, because plan 70
  is still fixing things.
- The maintainer confirms the "must fix" list and sets the last-call date.
- New bugs found along the way go through the same line, not straight into the fix list.
- This is also where the visible rough edges get fixed — the "jank" — within the room the rule allows.
- **Say where every download goes, and let the player switch the internet off (the maintainer,
  2026-09-26).** Built as one lane inside the bug session. Two parts:
  - **A clear notice before any download starts** — installing or updating Ollama, downloading a model,
    the voice models, the knowledge library. In plain words: "bonsAI will connect to https://ollama.com
    to download Ollama (about … GB)." Recommended: shown the first time for each site, as the
    maintainer suggested; after that, only the size shows, on the button itself. The real address and
    size are read from the code for each button, never typed from memory.
  - **A download permission** in the permissions list, beside the Steam and microphone ones. Off on a
    fresh install. While it is off, nothing reaches the internet — including the recommended-models
    list, which today refreshes itself from GitHub without asking. The first download notice doubles
    as the question "turn on internet downloads?", so a new player is not sent hunting for a switch.
    The kids lock forces it off, like the planned web-search permission.
  - **Downloads only — the maintainer's call 2026-09-26.** This switch covers downloads and nothing
    else, and is named for that. The planned web-search permission (live answers from the web) stays a
    separate switch and a separate roadmap entry, after 0.6.0.
- **Stop adding new screenshots and recordings to the repo** (question 3): the Deck tools write pictures and
  videos to a folder the repo ignores; written reports keep going in. Done before the session starts, so
  its own evidence follows the new rule.

### Stage C — freeze

- After plan 70 has landed and the "fix before the release" list is done: experimental only takes release
  fixes. No new features, no reshaping of code.
- Push experimental so the pushed copy matches the local one, and confirm the tests go green.

### Stage D — README and release notes (high priority; drafts start now, next to everything else; pictures and final wording after the freeze)

- **README:** written for someone meeting bonsAI for the first time. What it is and why, what it does,
  what you need, how to install, the knowledge library, how to get help.
- **The spirit it was built in comes first (the maintainer, 2026-09-26):** free and open source,
  self-hosted, privacy first. Near the top, in plain words: your questions go only to your own AI, on
  your Deck or your own PC (or wherever you point it); no account, no cloud service, nothing collected;
  every line of code is open to read. Then a plain list of everything that does reach the internet —
  so the claim can be checked, not just trusted. Checked against the code 2026-09-26, that list is:
  installing Ollama and downloading models (Ollama, GitHub); the knowledge library and voice models
  (Hugging Face, GitHub); the recommended-models list, which refreshes itself from GitHub; and the
  Steam lookup, only if you give it your own key. No tracking or usage reporting was found. The security review and licence check in
  Stage E confirm every sentence of this before it ships.
- **Pictures and video (the maintainer, 2026-09-26):** short looping clips (GIFs) of the best features,
  one per feature, for the README; new screenshots of today's screens to replace the old ones; and the
  videos below. Everything is captured on the Deck after the bug session, so it shows the fixed
  screens, at the Deck's own size and not stretched.
- **The videos, with the maintainer's voice-over.** The session writes, for each video, what it covers
  and a script with timestamps for the maintainer to read over it. Scripts are written *after* the
  footage is recorded, timed to the real footage, so every line matches what is on screen. Draft lineup:
  - **One long video, about 7 to 8 minutes, at real speed.** A normal session, not sped up, so people see
    how fast it really is on a Deck. Chapters, so it can be cut into pieces: what bonsAI is, and that it
    is free, open and runs on your own hardware · installing it and the first run · asking about the game
    you are playing, with notes from the game's wiki · spoilers hidden until you ask · finding a setting
    and performance help · chats you can name, keep and sum up · talking to it and hearing answers read
    aloud · choosing where the AI runs, the Deck or your PC · what leaves the Deck, and what never does ·
    where to get it and how to help.
  - **The same chapters as short pieces, landscape**, one to two minutes each, for people who want one
    feature.
  - **Five or six vertical shorts, 15 to 45 seconds**, showing only the plugin's panel — it is already tall
    and narrow, so it fills a phone screen well. Candidates: ask while you play · no spoilers unless you ask
    · talk to it · it runs on your Deck, not a cloud · fix a stutter or find a setting · your chats, saved
    and summed up.
  - The final list is picked with the maintainer once the footage exists; a feature that is not solid on
    the Deck by then is left out rather than shown.
- **Every setting's starting value, for the maintainer to go through (2026-09-26).** Part of the
  first-impression check: a plain list of every setting, what a fresh install sets it to, and what that
  means for a new player, with the session's suggestion beside any that look wrong for a re-launch. The
  maintainer goes down the list once; the changes land before the README is written.
- **The first-impression check (item 3 in section 6) comes before the README is written**, so the README
  describes what a new player will actually see.
- **A bug-report form and a short "how to help" page** on GitHub (item 8 in section 6). The form asks for
  the bonsAI version, the Deck model, SteamOS version, where the AI runs, and the plugin's log.
- **Release notes for 0.6.0:** a short re-introduction a player can read in a minute, then the highlights,
  then "Known issues" from Stage B. The long changelog list goes below it, not at the top.
- **One line for past 0.4.9 users:** what to expect if they install over the old version.
- Check every link the plugin itself opens points to something that exists on main after the merge.

### Stage E — two read-only reviews (start now), then a fresh install (after the freeze)

- **A security review** of everything changed since 0.4.9 — a lot of new network and download code came
  with the knowledge library and voice.
- **A licence check** — the knowledge notes use text from community wikis under share-alike licences;
  confirm the credits are where the licences need them, in the repo and in the zip.
- **A fresh install on the Deck from the release zip** — built with the release build, not the development
  deploy — because this is the path every new player takes: it loads, the first question answers, the
  library downloads, the Developer tab is hidden, no test chips are pinned, the log is clean. Also check
  what is inside the zip and its size.

### Stage F — release day

1. Last check that the pushed experimental is green and nothing landed since Stage E's zip.
2. Set the version to 0.6.0 and commit the release notes, on experimental.
3. Merge into main with one merge commit.
4. **The maintainer pushes main.** The robot builds, checks and publishes the release.
5. Download the published zip and install it once more, as a player would.
6. Announce on Reddit, with the drafted posts (section 6, item 4).

### Stage G — clean-up, second pass (right after the release)

- Delete every branch and helper copy the release work left behind; look through the unmerged branches
  one by one and keep only the ones with a plan.
- Archive plans that are finished, this one included.
- Move the released items to the roadmap's Done list and start a fresh "Done for" heading.
- Experimental stays the working branch; main moves only on releases.

---

## 4. Who does what

| Work | Who |
|---|---|
| This plan, sorting the bugs, the Deck rows, the merge itself | Opus, high effort |
| Fixing bugs | The usual lanes, by their stars |
| Roadmap sync, changelog folding, README and release-notes drafts | The bookkeeping helper, Opus reviews |
| The fresh install on the Deck | The Deck helper, from rows Opus writes; one at a time |
| Security review, licence check | The two read-only review helpers |
| Confirming the blocker list, pushing main, the final install as a player | The maintainer |

---

## 5. Which bugs block the release — agreed 2026-09-26

The problem: fixing and cleaning up will turn up new bugs. A fixed list gets overtaken, and "fix
everything" never ships. So the proposal is **a line, a list, and a last call**:

**The line.** A bug blocks the release if a new player, using bonsAI normally, would hit it and it:

1. traps them — the controller gets stuck, a screen freezes, the plugin crashes;
2. loses their chats or settings;
3. shows a spoiler they asked to hide, or leaks something private;
4. breaks the first ten minutes — install, setup, the first answer, the library download;
5. looks plainly broken on the main screen every time — the jank a player notices straight away.

Anything else ships, and is listed under "Known issues" if a player might notice it.

**The list.** Every open bug is sorted against the line once, in Stage B, into three groups: fix before the
release, fix if there is room, known issue. The maintainer confirms the first group.

**Room for surprises.** A new bug found along the way is checked against the same line. If it crosses the
line, it joins the first group. If not, it goes to "fix if there is room" or "known issue". No debate each
time; the line decides.

**The last call.** A date the maintainer picks. Before it, "fix if there is room" items can still go in.
After it, only bugs that cross the line — anything else waits for 0.6.1. Reshaping code stops at the
freeze, because a reshape is exactly what turns up new bugs late.

**A first sort of the four three-star bugs, against the line:**

| Bug | Against the line |
|---|---|
| Down stops half way and the Ask button is out of reach | Crosses it — traps the player (1) |
| The chat summary card sits behind the dock until Down is pressed | Crosses it — plainly broken on the main screen in any long chat (5) |
| A boss question with the name held back comes back with no spoiler box | Crosses it — the spoiler promise (3) |
| Saved answers sometimes have a hidden block's markers written twice | Probably not — the leak it caused is fixed; what is left is finding why it happens. Watch it. |

The full first sort, every open bug, is in [plan 72](72-release-bug-session.md), section 2.

---

## 6. Also needed — found 2026-09-26

**Answered 2026-09-26:** 2 (yes, the library passes on the Deck first), 3 (yes), 4 (yes: GIFs, a long
real-time video with the maintainer's voice-over, short pieces, vertical shorts, better screenshots),
6 (keep "qwert" for now), 7 (yes, a fix goes out as 0.6.1 when needed), 8 (yes), 9 (yes, and lead with
the free-and-open, self-hosted, privacy-first spirit). Later the same day: 1 (yes — hide anything
half-built) and 4 (announce on Reddit). **Still open:** 5 (the Decky store — see below) and the
last-call date.

**On the Decky store (5):** the maintainer is not sure the store would take a plugin written largely
with AI help. Before deciding, someone reads the store's own submission rules and recent review threads
for anything on AI-written code, and reports back in plain words. No application is made until then.

1. **What is in 0.6.0? — agreed 2026-09-26: hide anything half-built.** Everything landed and working by
   the freeze ships; plan 70's work ships if it lands and passes on the Deck by then. Anything half-built
   that a player could stumble on is hidden, not shipped half-working. **How:** during the first-impression
   check, the session lists every feature a player can reach, marked working, half-built or broken,
   using the roadmap's PARTIAL and Verify entries as the starting point. The maintainer confirms the
   list, and a lane hides the half-built ones behind a setting that stays off (or behind the Developer
   tab), so they can come back in a later release without being rebuilt. The README and videos only show
   what is on the "working" list.
2. **The knowledge library a new player downloads.** Plan 70 is about to publish a new one. The release must
   point at a library that has passed on the Deck, and the fresh install must download that one.
3. **What a brand-new player sees first.** Review every setting's starting value, the first-run notice, the
   first model suggested for a Deck, and that the Developer tab and test chips stay hidden. This is the
   re-launch's first impression, so it gets its own check before the README is written.
4. **Where the re-launch is announced — agreed 2026-09-26: Reddit.** What goes with it: GIFs of the
   best features, the real-time video, better screenshots. **Before posting:** pick the communities
   (the Steam Deck ones first; the self-hosting, open-source and local-AI ones fit the privacy-first
   pitch), and read each one's rules on self-promotion, how often a project may post, and anything
   about AI-written code, then report back in plain words. The session drafts one post per community,
   each leading with what that community cares about; the maintainer posts them. Posting waits until
   the release page, README and video are live, so every link works on the first click.
5. **The Decky plugin store.** bonsAI is not in it; players download a zip from the GitHub page. A re-launch
   is the natural moment to decide whether to apply. Recommended: decide now, apply after 0.6.0 has been
   out a week without a serious bug.
6. **The name on it.** The plugin's author field says "qwert", while the GitHub page is qd313. Pick the one
   players should see.
7. **If 0.6.0 turns out broken.** Recommended: a fix goes on main directly as 0.6.1, then is copied back
   into experimental — so an urgent fix never waits for experimental to be ready.
8. **The front of the repo for newcomers.** No bug-report form exists, so reports will arrive without the
   version, the Deck model or the log. Recommended: a short bug-report form, and a short "how to help"
   page. The long internal working docs stay, but the README should not send a newcomer into them.
9. **What leaves the Deck.** The README should say plainly what bonsAI sends where: questions go only to
   the player's own AI (on the Deck or their PC); downloads come from Ollama, Hugging Face and GitHub; the
   Steam key stays on the Deck.
