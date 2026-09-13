# Refactor round two: what each worker cost

One row per worker, filled in when the worker reports back. The postmortem in phase 6 adds
up these rows, so the cost of the clean-up is a measured number rather than a guess.

Columns: the day, which phase, which worker, which model, how many tool calls it made,
roughly how many tokens it used, and how it finished.

| Date | Phase | Worker | Model | Tool calls | Tokens | Result |
|---|---|---|---|---|---|---|
| 2026-09-13 | 0 Tools | Lane A, the list of numbers | Sonnet high | | | |
| 2026-09-13 | 0 Tools | Lane B, maps and headers | Sonnet high | | | |
| 2026-09-13 | 0 Tools | Lane C, the verify command | Sonnet high | | | |
| 2026-09-13 | 0 Tools | Lane D, hooks, copies and the Deck queue | Sonnet high | | | |

## Running total

| Phase | Workers | Tool calls | Tokens |
|---|---|---|---|
| 0 Tools | 4 | | |
