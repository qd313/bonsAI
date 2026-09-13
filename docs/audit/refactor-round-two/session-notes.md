# Refactor round two: handover notes

The newest note is at the top. Every session that stops writes one, so the next session can
pick up without rereading anything but this file.

---

## 2026-09-13, phase 3 done: the deleting, and two tools that had to be fixed mid-job

**Phase 3 landed in four commits. Nothing a person using the plugin can see has changed** — every
line removed was one that nothing anywhere called. All 1,244 back-end tests still pass and every
gate is green.

What went, and what the numbers say:

| | Before | After |
|---|---|---|
| Names the screen code offers that nobody wants | 126 | **21** |
| Back-end code nothing calls | 18 | **2** (both held on purpose) |
| Copy-pasted app code | 877 | **871** |

Roughly 1,800 lines of code are gone. The biggest single piece was not stray mess: whisper used to
be obtained by copying a ready-made file out of a container image, and that was replaced long ago by
building it inside the image. The old way was still sitting there with nothing calling it. Removing
it unrolled a chain of six things over four passes, each one only visible once the one above it went.

**The most useful thing to know from this phase: my own measuring tool was wrong twice, and both
times the fix mattered more than the deleting.**

- **It never checked whether other files use a name before calling it file-local.** A name can
  obviously be both used at home and imported elsewhere. Acting on that list stopped eight files
  from being able to import what they import. The type checker caught it and the whole pass was
  thrown away before anything was saved. The check now looks outward first, and it looks at the
  tests and the preview harness too, not just app code.
- **It counted a name written in a comment as a use.** One icon was kept alive by a note next to a
  different icon saying "distinct from this one". Comments are now ignored when counting.
- **It never searched the helper scripts.** A version marker was on the delete list and is imported
  by the script that builds the knowledge base, which writes it into every knowledge base it makes.
  Deleting it would have broken building. The whole-project sweep caught that, not the tool.

**Two more things I broke and fixed in the same sitting**, both worth knowing because they will
happen again to anyone using these tools:

- Removing a file's first import took the file's own description with it, because the tool that
  edits code counts a comment as belonging to whatever is below it. One file lost its description
  before the count of missing ones caught it.
- The same rule bit on the back-end side, and worse: deleting a constant took away a hard-won note
  saying **"do not float on the main tag — upstream churn caused a crash on the Deck"**. That note
  was about the line above it, not the line below. Restored. The tool now shouts about every comment
  line it is about to take, whether or not you asked for a preview.

**Held on purpose and not touched:** the older way of asking the AI, the answer checker, and all
four unused packages.

**Owed: a check on the Deck.** The plan asks for a short walk through the plugin and one real
question at the end of this phase. Nothing here should be visible, which is exactly why it is worth
five minutes on the device. Nothing else in phase 3 is outstanding.

---

## 2026-09-13, after phase 2: the red builds fixed, the three measures corrected

**Every push had been failing since 2026-09-07 and it was not the plugin.** The maintainer was
getting a notification on every change saying tests failed. Four tests were failing on the build
server and nowhere else.

Three of them build a real knowledge base, which needs an AI model on the machine. The build server
has none. On 2026-09-07 a rule was added stopping the knowledge base from being built with cards
that meaning-search cannot find — so the build correctly refused, and the tests read that refusal as
a failure. **The rule was right and the tests were never told about it.** One of them still carried
a note saying no AI model was needed, which had been true when it was written.

Those three now skip where there is no model, with a message saying so, and still run for real
before anything lands. They still fail loudly if the build breaks for any other reason — that was
checked both ways on purpose, because a skip that swallows real failures is worse than a red build.
The fourth was a timing check comparing two clocks across threads; it missed by fifty millionths of
a second and now allows a small slack.

**The general lesson: a new safety rule needs its tests updated in the same change.** This one held
for six days across every push, and the notification only ever said "tests failed", so nobody could
see it was one cause and not a growing pile.

**The three measures were corrected** with the maintainer's approval, and the phase 2 write-up now
records them as done. Copy-pasted app code reads 877 instead of 1,847, back-end test duplication
2,076 instead of 2,286, and back-end methods with no caller 1 instead of 3. Nothing about the code
changed — only what gets counted. The saved best numbers were re-recorded in the same change and
each one carries a note in the file pointing at the reason.

**Not pushed.** These fixes only stop the notifications once they reach the server, and pushing is
never done without being asked. Two commits are waiting.

**Phase 2 has nothing open.** Phase 3 starts on the word go.

---

## 2026-09-13, phase 2 done: everything measured, twelve decisions written

**Phase 2 is finished and needs three answers from the maintainer.** They are in
[phase2-decisions.md](phase2-decisions.md), which is the output of this phase. No code changed.

**One new script does all the measuring.** `python scripts/phase2_map.py` runs every inspection
tool and writes seven lists to `docs/audit/refactor-round-two/phase2/`, plus a short summary. Run
it again after every landing in phases 3 and 4 — the counts are how you check a step did what it
claimed. It reuses the file-walking and tool-finding code from the numbers script rather than
copying it.

**The single most useful thing this phase did was take the headline numbers apart.** Raw tool
counts turned out to bundle very different situations together, and the fixes are different in
each case. Three numbers were wrong in a way that mattered:

- Copy-pasted app code is **877 lines, not 1,847**. The measure points at the folder holding the
  screen code, and the front-end tests live in that same folder. So over half of what was reported
  as duplicated app code is duplicated test code. This also overturns a phase 0 conclusion: the
  plan's target of 350 was called unreachable because the real figure looked two and a half times
  the estimate. Measured properly, the target is fine.
- Copy-pasted back-end test code is **2,076 lines of Python, not 2,286**. The rest is repeated
  blocks in saved test-run data files.
- Back-end methods nothing calls is **one, not three**. One of the three is called by the back end
  itself — deleting it would stop the AI answering anything. The other is a device-debug hook that
  is meant to have no caller.

**And the count of unused front-end names is not what it looks like.** Of 153 reported, only 43 are
dead code. 103 are names used inside their own file that just do not need to be shared out, 7 are
pointless pass-throughs, 5 are used only by a test, 2 need a human. **Not one whole file can be
deleted** — every file the tool pointed at is live and merely carries an extra unused name. The
delete phase is trimming, not demolition.

**One finding is not clean-up at all.** There is a 153-line answer-checking feature in the back end
— it catches things like an invented game name before an answer is shown. It works, it has a test,
and it has never once run: the field it was meant to fill is fed by a value nobody supplies. That
is a "did we mean to finish this?" question, and it is one of the three waiting on the maintainer.

**The seams for phase 4 are named**, in Part B of the decisions write-up. Eight of them; four have
no written contract at all. The urgent one is the ask hook: it hands back **52 separate things**
from a 1,639-line file, and phase 4 is the phase that splits that file. That contract must be
written down before any lane touches it.

**Measured, so phase 4 does not have to guess:** 48 settings, and **five files each name all 48**,
so a new setting means editing at least five files and about nine lines.

**Three measure definitions want correcting before phase 3** (listed in Part B). That changes saved
"best" numbers, which the rules rightly treat as suspicious, so it is written down as a decision
rather than quietly done. It is waiting on a nod.

**Next session: phase 3, delete** — but not until the maintainer answers the three questions. The
work packages and their order are in Part B of the decisions write-up. No Deck needed except for
the package removals, which want a build and a start-up.

---

## 2026-09-13, after phase 1: a mistake found and undone, and twelve checks flagged

**Sixteen saved Deck recordings were deleted that write-ups do point at, and they are restored.**
My own instructions caused it: the worker sorting the recordings was told to look for citations in
four places, and that list was short. It missed the planning write-ups and the decisions record.
Worse, the other worker was moving write-ups into the archive at the same time, so some documents
were not where either of them expected. All sixteen came back out of the project's history and are
in the evidence folder.

The lesson is the one the retention rule already states in the testing write-up: a recording cited
by any write-up is never deleted, because deleting a cited recording turns a link into a lie. The
rule was right; the search that fed it was too narrow. Any future pass of this kind searches every
write-up in the project, and does not run while another worker is moving write-ups around.

**Twelve checks are flagged as having no evidence at all.** Separately from the mistake above,
twelve checks name a recording that never existed — checked against the whole history, they were
never written. Twelve results were recorded as passing on the strength of a file nobody can open.
Each row now carries a flag where it makes the claim, they are listed as one batch in the testing
write-up, and there is a roadmap entry saying to re-run all twelve in the next automated testing
session and to treat them as unknown until then.

**Neither of these says the plugin is broken.** They say twelve things we believed were checked may
not have been.

---

## 2026-09-13, phase 1 finished

**The maintainer approved both open calls, and everything is carried out.** The seven old copies of
the project are gone; 26 copies on this machine are now 19. The sorting list was approved as it
stood: 55 write-ups and 11 helper scripts are in the archive with an index saying what each is, and
the three that describe work never done carry a delete-after date of 2026-12-12. Nothing else has a
delete date; archived is not deleted.

**The saved Deck recordings are sorted.** 187 that a test row actually cites are kept as evidence;
281 are out of the project. The folder they lived in is no longer part of the project, so runs will
not pile up again. More were cited than first counted, because some rows name a whole family of
recordings in one line rather than listing each; one such line stood for 39 files on its own.

**A dozen test rows cite evidence that never existed.** Checked against the project's whole history:
those recordings were never saved. The rows read as proven and nothing backs them. Not caused by the
clear-out. Worth someone's attention.

**Three real faults in today's own tooling, all found by using it:**

- The copy helper installed libraries inside copies that sit under the main checkout. Because the
  project declares itself one workspace rooted at the repo, that install reached up and emptied the
  main checkout's tool launchers. The whole test suite failed with "vitest is not recognized" while
  the folder still looked present, and the installer then reported everything up to date, so it could
  not repair itself. Copies inside the checkout now share the main libraries by link.
- Worse, removing such a copy destroyed those libraries outright. Windows treats one of these links
  as an ordinary folder, so git walked through it while deleting the copy and emptied what it pointed
  at. Links are now taken out before git is asked to remove anything. Detecting them needed care: the
  obvious check reports false for this kind of link and only the underlying flag says yes, which is
  why the first fix did not work. Proved by making a copy and removing it with the launchers counted
  before and after.
- The check command died while printing its own output, because a Windows console cannot render an
  arrow and plenty of test names contain one. The crash looked like the failure.

**Where the numbers stand.** The roadmap 118 KB to 91, the testing rows 318 to 135, the orientation
file 13 to 3, the one guide 9 to 31 because everything factual moved into it. Live documents still
naming the dropped editor: 12 down to 2, and both of those are legitimate.

**Five documents are still big and now each carries a trim task at the top**, with its own star
rating, rough time and which model to use. Together about 815 KB. The biggest is the locked decisions
file at 89,000 tokens a read — bigger than the testing rows ever were, and hidden until the two
obvious giants shrank. One roadmap entry covers the set.

**Next: phase 2, map and measure.** No Deck needed. Scripts produce the lists — unused code, exact
duplicates, long functions with nothing explaining them — and one session reads only the summaries
and writes the delete-and-merge list for the maintainer to confirm.

---

## 2026-09-13, phase 1 mostly done, waiting on the maintainer

**What landed.** The two enormous documents are split: the roadmap drops from 118 KB to 90, the
testing document from 318 to 135. What was finished moves to an archive file beside each, word for
word, proved by a checker written before the split that shows every line is accounted for. The
Cursor editor setup is gone: eighteen files deleted, and everything worth keeping moved first. There
is now one guide for a person or any AI tool; the Claude-only file drops from 13 KB to 3 and keeps
only what is specific to that one tool. The D-pad focus rule moved across with its two known errors
corrected on the way.

**Neither big document hit the size the plan asked for** (40 KB and 60 KB; they reached 90 and 135).
Only the finished sections could move without rewriting content, and rewriting was off-limits by
design. Getting further means archiving closed checks and older knowledge-base entries too, which is
a decision, not a move.

**Two things had to be fixed by hand after the lanes finished.**

- Removing the editor left live things pointing at deleted files. Three mattered: the instructions
  every worker reads at the start of a session, the tool that saves review notes, and the three
  worker descriptions. All now point at the one guide.
- Document sizes were counted in raw bytes, so the same unchanged file measured differently in a
  fresh copy than in the main one, purely because of line endings. Two workers failed their check
  today for a reason that had nothing to do with their work. Sizes are now counted the same way
  everywhere.

**The two big documents now have a ceiling instead of a may-only-shrink rule.** Open work is added
to them every time something lands, so demanding they only ever get smaller would block the
bookkeeping every landing owes. The roadmap must stay under 100 KB and the testing document under
145. That is the rule that stops them ballooning back.

**The old copies of the project were investigated and none hold work worth saving.** Six were
chasing bugs since fixed, several confirmed by pressing real buttons on the Deck. Two contain a way
of moving the model order list with the D-pad that was tried, tested on the device, found to rewrite
the list while someone was only scrolling, and ruled out in writing. One small idea was genuinely
missing and is now filed on the roadmap so it survives the copies being cleared.

**WAITING ON THE MAINTAINER, and phase 1 is not finished until they answer:**

1. The sorting list at docs/audit/refactor-round-two/docs-triage-proposal.md. It proposes 125 to
   keep, 52 finished, 9 replaced, 3 abandoned, and 6 it would not guess at. Approving it removes
   about 943 KB of reading. Nothing has been moved.
2. Whether to clear the old copies of the project. The recommendation is yes, all seven.
3. Only 154 of the 464 saved device runs are actually cited by a test row. The rest came from a bug
   that saved one on every run. They leave the project once the list is approved.

**Still to do in phase 1 after those answers:** move the archived documents and write the archive
index with a delete-after date, sort the helper scripts the same way, and take the leftover device
runs out. Then phase 2, mapping and measuring.

---

## 2026-09-13, phase 0 finished

**Phase 0 is done and landed on experimental.** Everything the later phases lean on now exists:
one check command, the list of numbers that may only get better, a map of what the back-end
depends on, a checker that every file explains itself, three safety rails, a helper for copies of
the project, and a queue so two workers cannot drive the Steam Deck at once. Four workers built it
in parallel, in their own copies, and all four landed without a single clash.

**The check command.** Quick mode is 26 seconds, the full merge check 51. It prints only what
broke. Every later worker runs quick mode before it saves anything.

**Three things had to be fixed by hand at merge time**, all worth knowing:

- Two of the new tools were being started through their Unix launcher, which Windows cannot run.
- The duplicate finder is a rewrite in its latest version with a different command line.
- The whole agent folder was hidden from git, so a fresh copy of the project would have had a
  settings file pointing at rails that were not there. The rails are now kept; the working copies
  inside that folder stay hidden.

**The starting numbers are not the ones in the plan.** The plan's figures were measured four days
earlier and, for duplication, not with this tool. Today's real figures: 42 files over 400 lines,
56 long front-end functions with nothing explaining them, 7 on the back-end side, 1,847 copy-pasted
lines in the app code, 2,286 in the back-end tests, 126 unused exports, 2 loops in the back end,
20 files with no purpose line, 3 back-end entry points nothing calls, and 12 live documents still
mentioning the editor being dropped.

Three of those differ enough from the plan to matter. Duplication measures roughly two and a half
times the plan's estimate, so the goal of cutting it to 350 and 700 was set against a different
measuring stick and needs resetting. The number of back-end entry points nothing calls is 3, not 1.
Twelve documents mention the dropped editor, not 6.

**The header check is advisory, on purpose.** Twenty files have no purpose line; fixing them is
phase 5. Failing every run from today would only teach everyone to ignore the check. The numbers
list stops the count growing meanwhile. Phase 5 turns it into a real gate.

**Two things are waiting on the maintainer.**

1. The old copies of the project. There are 30 on this machine and the helper refuses to clear any
   of them, correctly: seven still hold edits never saved anywhere, and three pieces of work exist
   only there — where the floating ask bar sits, moving focus around a confirm box, and moving up
   and down a picker list. Someone has to decide whether that work is wanted before anything is
   deleted.
2. The guide meant for other AI tools is not in the project at all; it only exists on this machine.
   Phase 1 plans to make it the one guide everyone reads, so it has to be saved into the project
   first or a fresh copy gets nothing.

**Next session: phase 1, the docs diet.** No Deck needed. Read this file, the plan's phase 1
section, and nothing else until the triage list is being built.

---

## 2026-09-13, phase 0 started

**Where things stood before this session.** The knowledge base's third wave is finished and
all of it is saved on the experimental branch. Nothing was left half-saved. One old side
branch about searching by symptom is still unmerged, and that is correct: that idea was
dropped on purpose and the reasons were written down at the time.

**What this session set up.** Four separate copies of the project, one per worker, so nobody
trips over anybody else. The four jobs were split so that no two workers can touch the same
file:

- the list of numbers that may only improve, and the script that measures them
- the map of what the back-end code depends on, the file-header checker, and the generated
  map of the code
- the one verify command every worker runs before saving, plus the new code-quality tools
- the three safety hooks, the helper that makes and clears away copies of the project, and
  the queue that stops two workers driving the Steam Deck at once

**Still to do in phase 0 after the workers report back:** install the new tools, review each
piece, merge the four copies into experimental in one go, and write down the starting numbers
that were actually measured today rather than the ones measured four days ago.

**Nothing needed from the maintainer yet.** The first thing that will need them is the list
of old copies of the project to clear away, which comes with the phase 0 report.
