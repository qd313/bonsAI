# The shape of a worker brief

Copy this when handing a job to a worker. The order matters: the goal first, so the worker
knows what it is aiming at before it reads any constraint. Fill every heading; a heading left
empty is how a worker wanders.

Why it is fixed: a worker with a vague brief follows every pointer it finds. Measured on
2026-09-11, a "check every claim" review of a twenty-seven line rule cost sixty-two tool calls
and about a hundred and thirty thousand tokens, entirely because the brief did not say where
to stop.

---

## Template

**Which copy of the project.** The full path. Say that a change of folder in one command does
not carry over to the next, so every command needs the full path.

**Goal.** One sentence.

**Files you own.** The exact list, and the exact line ranges where the change is inside a big
file. Never "the settings code".

**Frozen contracts.** Anything another worker is building against right now, written out in
full, with the words "do not change this".

**What you must not touch.** Files other workers own; the roadmap; the testing document; the
changelog; the tests, unless tests are the job; the Steam Deck; pushing.

**Checks before saving.** The verify command in quick mode before every save. Say which extra
checks this job needs.

**Caps.** A number of tool calls and a number of tokens. The worker stops at the cap and says
what it did not get to.

**Known traps.** When the Deck is involved, the list of device facts. Otherwise anything the
worker would otherwise have to discover by trial.

**Model and effort.**

**The report shape**, pasted in whole:

```
RESULT: done | partial | blocked
COMMIT: <hash or none>
FILES: <paths>
CHECKS: quick pass|fail ; full pass|fail|not run
LEFT UNDONE: <one line each>
COST: <tool calls> calls, <tokens> tokens
```

---

## Rules behind the template

- Ask one question per worker, with the exact lines to look at.
- Let a script answer whatever a script can answer, and hand the worker only what is left.
- Give a worker eight to twelve files at a time, never one file at a time.
- To ask a worker for more, send it a message rather than starting a new one.
- Never open a whole file when a range will do.
