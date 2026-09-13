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

## Running total

| Phase | Workers | Tool calls | Tokens |
|---|---|---|---|
| 0 Tools | 4 | 279 | 693,000 |
| 1 Docs diet | 5 | 420 | 1,047,000 |
