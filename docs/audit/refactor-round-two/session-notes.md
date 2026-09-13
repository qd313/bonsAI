# Refactor round two: handover notes

The newest note is at the top. Every session that stops writes one, so the next session can
pick up without rereading anything but this file.

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
