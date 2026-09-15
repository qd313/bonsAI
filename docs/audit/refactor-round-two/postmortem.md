# The clean-up, looked back on

Written 2026-09-15 at the end of phase 6, the last phase.

This is the honest account of the seven-phase clean-up: what it cost, what it changed, what it did
not manage, and what is worth doing differently next time. Every cost below comes from
[the ledger](ledger.md), which was filled in as each worker reported, not reconstructed afterwards.

---

## The short version

**Nothing a person using the plugin can see has changed, which was the point.** Three days of work,
about seven and a half million tokens, and the plugin behaves exactly as it did.

What changed is what it is like to work on it. Every file now says what it is for in language a
newcomer can read. Nothing is 400 lines long by accident any more. Two knots in the back end are
untied. The document you have to read before you can start has gone from 13 KB to under 3, and the
one that replaced it is 21. The reading a landing used to owe — roughly 100,000 tokens of roadmap
and testing notes before writing a word — is a little over half that now.

**The three biggest goals were met. Two were not, and one of those is a real gap.**

---

## What it cost

| Phase | Sessions | Workers | Tool calls | Tokens |
|---|---|---|---|---|
| 0 Tools | 1 | 4 | 279 | 693,000 |
| 1 Docs diet | 2 | 7 | 576 | 1,551,000 |
| 2 Map and measure | 1 | 0 | 41 | 118,000 |
| 3 Delete | 1 | 0 | 78 | 205,000 |
| 4 Reshape | 5 | 0 | 320 | 900,000 |
| 5 Explain | 2 | 12 | 1,684 | 4,090,000 |
| 6 Handoff | 1 | 0 | ~60 | ~250,000 |
| **The whole clean-up** | **13** | **23** | **~3,038** | **~7,807,000** |

Phase 6's row is an estimate, and that is worth saying plainly: a session cannot read its own
token use from the inside. Every other row came from a worker's own completion notice and is a
real measurement.

**Three things in that table are worth reading twice.**

**Explaining the code cost more than everything else put together.** Four million tokens, over half
the whole clean-up, for 257 files. It was also the only phase where that was unavoidable: no script
can write a good description of a file, and the work is genuinely one file at a time. The second
session did it at half the cost per file of the first, because by then the files already had
headers and only needed rewriting rather than reading whole.

**The two cheapest phases did the most deleting.** Mapping and deleting together cost 323,000
tokens — about a fifth of the document sort-out — and spawned no workers at all. A script measured,
a script deleted, and one session read the summaries and made the calls. That is the
cheap-before-expensive rule earning its place, and it is the number to remember when sizing this
kind of work again.

**Sorting the documents cost more than reshaping the code.** 1.55 million against 900,000. Sorting
178 documents by hand is expensive and nobody expected it to be the second-largest line in the
table.

---

## What actually changed

| What | Before | Now | Goal |
|---|---|---|---|
| Files nothing describes | 20 | **0** | 0 |
| Long screen functions with nothing explaining them | 53 | **0** | 0 |
| Long back-end functions with nothing explaining them | 6 | **0** | 0 |
| Knots in the back end, where two files each need the other | 2 | **0** | 0 |
| Files over 400 lines | 42 | **27** | 30 |
| Live documents still mentioning the dropped editor | 12 | **0** | 0 |
| Editor-specific files in the project | 18 | **0** | 0 |
| The roadmap | 109 KB | **88 KB** | 40 |
| The testing document | 315 KB | **141 KB** | 60 |
| The file every session reads at startup | 13 KB | **2.9 KB** | 8 |
| The one guide for people and tools | 9 KB | **21 KB** | 12 |
| Copy-pasted lines in the app code | see below | **891** | 350 |
| Screen-side exports nothing uses | 126 | **21** | 0 |
| Back-end methods nothing calls | 3 | **1** | 0 |
| Places the settings list is written out by hand | 7 | **7** | 1 |

**Two of those rows need a warning label, and the warning is the useful part.**

**"Files over 400 lines" is measured differently now.** It used to count every line, explanations
included. During the phase that explained every file, four separate workers cut good descriptions
short to stay under it — the measure was making the work worse. It now counts code only. The same
untouched code went from 42 to 27 the moment the definition changed, so read that row as "the
measure was fixed", not as fifteen files split. By the old way of counting it would have finished
at 49. Both numbers are reported side by side now, on purpose.

**The copy-paste number was measured three different ways and is not comparable across the
clean-up.** The plan said 717, the tool as configured in phase 0 said 1,847, and the tool in its
current version says 891. What is certain: it is 891 today, the goal of 350 was set against a
different measuring stick, and 891 is *twenty lines worse* than the figure recorded at the end of
phase 4 — the moving of code between files during the reshape most likely did it. It is not
progress and it is written down as not progress. Also worth knowing, because it is the obvious next
question: explanations do not count towards it. 257 files gained descriptions and the number did not
move by one line.

---

## The three gaps

**1. The settings list is still written out by hand in seven places.** This was on the plan for
phase 4 and did not get done. It is the one unfinished piece of the clean-up that a person can
actually be hurt by: adding a new setting still means about eighteen files and thirty edits, and
missing one of the seven places means the setting silently stops working in one situation. It has
already happened once, to four settings. It is on the roadmap as its own entry.

**2. The two big documents are still more than twice their targets.** 88 KB and 141 KB against 40
and 60. Only the finished sections could be moved to the archive without rewriting content, and
rewriting was deliberately out of scope. Getting further means archiving closed checks and older
knowledge-base entries, which is a judgement call, not a move. They now have ceilings — 100 KB and
145 KB — instead of a may-only-shrink rule, because open work is added to them on every landing and
a shrink-only rule would block the bookkeeping that every landing owes. The testing document is at
141 and its ceiling is 145, so this needs attention soon.

**3. Duplication went up, not down.** Covered above. The goal of 350 needs resetting against the
tool that is actually in use before anyone can say whether it is reachable.

---

## What went right, and is worth repeating

**Scripts did the mechanical work and models only judged.** This is the single biggest saving in the
table. Mapping and deleting cost a fifth of what sorting documents by hand cost.

**Every number that mattered was recorded and checked on every run.** It caught real regressions,
and it caught them without anyone having to remember to look.

**The proof that phase 5 changed no behaviour was mechanical, not promised.** Strip the comments out
of the before and after of every file and compare what is left; all 257 came back identical. That
check was built at the start of the phase precisely because the one way that phase could break the
plugin — a worker quietly tidying a line of code while writing about it — reads as harmless in a
diff. The same check found its own hole later, honestly: deleting a comment that *does* something
looks exactly like deleting an ordinary sentence. Counted rather than assumed, and nothing had
fallen through it.

**Workers were given files, not categories.** After one worker in phase 5 worked out its own file
list from a brief that named categories and did eight files nobody wanted while missing eight that
were, every later brief named exact files. No worker went wrong that way again.

---

## What went wrong, and is worth avoiding

**A measure that fights the work wins quietly, and it happened three times.** The file-size number
pushed four workers into writing worse explanations. The size number on this project's own guide was
set to "bigger is better" and would have failed the phase 6 rewrite for trimming the guide. A
worker handed a list of flagged words without being told that keeping a word is an acceptable answer
will reach for a thesaurus. In all three cases the number was wrong and the work was right. The
habit to keep: when a measure and the work disagree, check the measure first.

**Being told to check every claim paid for itself immediately.** Two worked examples written for the
phase 5 workers each contained a confident falsehood on the first pass, both written by the session
leading the phase, both caught only by going and reading the code. With "check it before you write
it" in the brief, the workers then found eight more descriptions that had been sitting in the code
being believed: a file said to download AI models that does nothing of the sort, a promise to stay
in step with a file that does not exist, a description of a row of four buttons removed long ago.
None of those would ever have been caught by a test.

**Phase 3 spent a good share of its budget fixing the measuring tool rather than deleting code** —
three wrong answers in the classifier, two in the removers. That was not waste; every one was caught
by a gate rather than by a person, and phase 4 leaned on the same tool much harder. But it should be
budgeted for: the first phase to use a new tool pays for its bugs.

**Line endings cost two workers a failed check for reasons that had nothing to do with their work.**
Sizes were being measured in raw bytes, so the same unchanged file measured differently in a fresh
copy. Fixed, and now measured the same way everywhere.

---

## What is still open

- The settings list, written out by hand in seven places. On the roadmap.
- Both big documents, still over target; the testing one close to its ceiling.
- The duplication goal, set against a measuring stick nobody uses any more.
- Twenty-one screen-side exports nothing uses, and one back-end method nothing calls.
- Thirty old copies of the project on the maintainer's machine. Every one was checked in phase 6:
  nothing in them is unique. The work in them either landed under a different commit, was
  reimplemented under a different name, or was deliberately held back with the reasons written down.
  They are still there because removing them is the maintainer's call.
- Five things phase 5 noticed and did not fix, all on the roadmap: a mistyped model name lost
  silently, the settings list above, two things wanting the voice server at once, a line of
  technical text appearing under answers with a screenshot attached, and a model too big for the
  Deck reading as a safe choice.

---

## If there is a round three

1. **Start with the measures, and break each one on purpose before trusting it.** Three of them were
   wrong in a way that shaped the work.
2. **Budget the explaining phase at over half the total** and do not try to make it cheaper with
   scripts. It is the part only a reader can do.
3. **Sort documents earlier and more ruthlessly**, or not at all. It was the second most expensive
   phase and the least satisfying: the two documents that cost the most reading are still over
   target.
4. **Keep the freeze step.** Writing down the shapes at every seam before moving anything is what
   let lanes work in parallel without talking to each other. Lanes clashing on a file is not what went
   wrong in any phase.
5. **Tell every worker what is allowed to stay.** A tool that finds work is not a target to drive to
   zero, and a worker will treat it as one unless told otherwise.
