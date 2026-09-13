# Refactor round two: handover notes

The newest note is at the top. Every session that stops writes one, so the next session can
pick up without rereading anything but this file.

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
