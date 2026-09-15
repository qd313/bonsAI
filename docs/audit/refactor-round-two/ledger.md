# Refactor round two: what each worker cost

One row per worker, filled in when the worker reports back. The postmortem in phase 6 adds
up these rows, so the cost of the clean-up is a measured number rather than a guess.

Columns: the day, which phase, which worker, which model, how many tool calls it made,
roughly how many tokens it used, and how it finished.

| Date | Phase | Worker | Model | Tool calls | Tokens | Result |
|---|---|---|---|---|---|---|
| 2026-09-13 | 0 Tools | Lane A, the list of numbers | Sonnet high | 98 | 247,000 | done |
| 2026-09-13 | 0 Tools | Lane B, maps and headers | Sonnet high | 70 | 167,000 | done |
| 2026-09-13 | 0 Tools | Lane C, the verify command | Sonnet high | 55 | 126,000 | done |
| 2026-09-13 | 0 Tools | Lane D, hooks, copies and the Deck queue | Sonnet high | 56 | 153,000 | done |
| 2026-09-13 | 1 Docs diet | Lane A, split the two big documents | Sonnet high | 111 | 235,000 | partial |
| 2026-09-13 | 1 Docs diet | Lane B, sort every document and script | Sonnet high | 90 | 257,000 | done |
| 2026-09-13 | 1 Docs diet | Lane C, drop the editor, one guide | Sonnet high | 125 | 274,000 | done |
| 2026-09-13 | 1 Docs diet | Check the loose edits in old copies | Sonnet high | 56 | 137,000 | done |
| 2026-09-13 | 1 Docs diet | Settle the six open sorting questions | Sonnet high | 38 | 144,000 | done |
| 2026-09-13 | 1 Docs diet | Archive the approved list | Sonnet high | 81 | 321,000 | done |
| 2026-09-13 | 1 Docs diet | Sort the saved Deck recordings | Sonnet high | 75 | 183,000 | done |
| 2026-09-13 | 2 Map and measure | The whole phase, no workers | Opus xhigh | 41 | 118,000 | done |
| 2026-09-13 | 3 Delete | The whole phase, no workers | Opus xhigh | 78 | 205,000 | done |
| 2026-09-14 | 4 Reshape | Session 1: untangle and freeze, no workers | Opus xhigh | 82 | 235,000 | done |
| 2026-09-14 | 4 Reshape | Session 2: last seam, three moves out of main.py | Opus xhigh | 74 | 215,000 | done |
| 2026-09-14 | 4 Reshape | Session 3: split the Ask hook, one more move, settings measured | Opus xhigh | 62 | 175,000 | done |
| 2026-09-14 | 4 Reshape | Session 4: the whole phase checked on the Deck | Opus xhigh | 44 | 120,000 | done |
| 2026-09-14 | 4 Reshape | Session 5: rating a reply splits out, leftovers closed, Deck-checked | Opus xhigh | 58 | 155,000 | done |
| 2026-09-14 | 5 Explain | Lane A, the AI side of the back end, 9 files | Sonnet high | 80 | 285,000 | done |
| 2026-09-14 | 5 Explain | Lane B, the Ask screen, 13 files incl. the 3 biggest functions | Sonnet high | 190 | 369,000 | done |
| 2026-09-14 | 5 Explain | Lane C, stylesheets, hooks and small files, 43 files | Sonnet high | 228 | 511,000 | done |
| 2026-09-14 | 5 Explain | Lane D, knowledge base, voice and media, 14 files | Sonnet high | 132 | 348,000 | done |
| 2026-09-14 | 5 Explain | Lane E, settings and the other tabs, 20 files | Sonnet high | 142 | 446,000 | done |
| 2026-09-14 | 5 Explain | Session 1: the worked example, main.py, five tool fixes, all merges | Opus xhigh | 95 | 300,000 | done |
| 2026-09-15 | 5 Explain | Lane A, back-end services first half, 18 files | Sonnet high | 107 | 219,000 | done |
| 2026-09-15 | 5 Explain | Lane B, back-end services second half and main.py, 23 files | Sonnet high | 110 | 216,000 | done |
| 2026-09-15 | 5 Explain | Lane C, screen-side helpers first half, 28 files | Sonnet high | 103 | 193,000 | done |
| 2026-09-15 | 5 Explain | Lane D, screen-side helpers second half, 27 files | Sonnet high | 102 | 203,000 | done |
| 2026-09-15 | 5 Explain | Lane E, the things on screen and the stylesheets, 25 files | Sonnet high | 79 | 228,000 | done |
| 2026-09-15 | 5 Explain | Lane F, the lists of choices and the types, 21 files | Sonnet high | 112 | 203,000 | done |
| 2026-09-15 | 5 Explain | Lane G, the hooks and the feature folders, 25 files | Sonnet high | 104 | 239,000 | done |
| 2026-09-15 | 5 Explain | Session 2: two worked examples, the word report, the map fix, all merges | Opus xhigh | 100 | 330,000 | done |

Phase 5's first session is the most worker-heavy of the refactor so far: five workers, about
1.96 million tokens between them, for 100 files explained and roughly 5,500 lines of explanation.
That is close to the whole of phases 0 through 4 put together, and it is the right shape of
spending -- the work is genuinely per-file, a script cannot do any of it, and the files were split
so no two workers could touch the same one.

Worth setting against that number: four of the five workers spent part of their budget fighting a
measuring tool that was wrong, and one worked out its own file list because the brief named
categories instead of files, doing eight files nobody asked for while missing eight that were
wanted. Both are briefing failures by the session, not worker failures, and both are now written
into the worker brief template. The tool fixes themselves were cheap; the wasted worker time was
not.

Session 2 is the cheaper half and was expected to be: seven workers, about 1.50 million tokens
between them, for 157 files. That is **9,600 tokens a file against session 1's 19,600** — a little
under half, on twice as many files in one sitting. The reason is worth remembering when sizing this
kind of work: session 1 had to read whole files to explain what was missing, while session 2 mostly
needed the header and enough of the file to check each claim in it.

Nothing was wasted this time. No worker fought a measuring tool, none invented its own file list,
and every one came back inside both caps. The difference between the two sessions is entirely in
the brief -- the same document, with three lessons added to it after session 1 and a fourth after
this one.

Both sessions together: twelve workers, about 3.46 million tokens, 257 files explained. That is
more than phases 0 through 4 put together, and it is the right shape of spending. The work is
genuinely per-file, no script can do any of it, and the files were split so no two workers could
ever touch the same one.

## Running total

| Phase | Workers | Tool calls | Tokens |
|---|---|---|---|
| 0 Tools | 4 | 279 | 693,000 |
| 1 Docs diet | 7 | 576 | 1,551,000 |
| 2 Map and measure | 0 | 41 | 118,000 |
| 3 Delete | 0 | 78 | 205,000 |
| 4 Reshape (5 sessions, DONE, Deck-checked) | 0 | 320 | 900,000 |
| 5 Explain (2 sessions, file work DONE) | 12 | 1,684 | 4,090,000 |

Phases 2 and 3 together cost 323,000 — about a fifth of the docs diet, and neither spawned a single
worker. A script did the measuring and the deleting; the one session read only the summaries and
made the calls. That is the "cheap before expensive" rule paying off, and it is worth remembering
when sizing the phases that are left.

Worth putting next to that number: phase 3 spent a good share of its cost fixing the measuring tool
rather than deleting code — three wrong answers in the classifier and two in the removers. That is
not waste. Every one of those was caught by a gate or a sweep rather than by a person, and each fix
makes the next phase's list trustworthy. Phase 4 leans on the same tool much harder.

Phase 4's first session cost about the same as phases 2 and 3 combined, again with no workers, and
it moved almost no code on purpose: it untangled the two knots, wrote down the shapes, and built
three guards that did not exist. That is the expensive-looking part of a refactor that makes the
cheap part safe. The sessions that follow do the actual moving and should be sized against phase 3,
not against this one.
