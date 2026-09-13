# Refactor round two: handover notes

The newest note is at the top. Every session that stops writes one, so the next session can
pick up without rereading anything but this file.

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
