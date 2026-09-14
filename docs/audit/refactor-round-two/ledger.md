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

## Running total

| Phase | Workers | Tool calls | Tokens |
|---|---|---|---|
| 0 Tools | 4 | 279 | 693,000 |
| 1 Docs diet | 7 | 576 | 1,551,000 |
| 2 Map and measure | 0 | 41 | 118,000 |
| 3 Delete | 0 | 78 | 205,000 |
| 4 Reshape (1 of 3-4) | 0 | 82 | 235,000 |

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
