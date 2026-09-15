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
- Name every file. Never describe a set of files by category and expect the right list back. On
  2026-09-14 a brief said "the remaining 26 files" and named a few; the worker worked out a
  careful list of its own, which overlapped another worker by one file and missed eight. The work
  was good and none of it was wasted, but only by luck.
- Tell a worker which numbers do **not** constrain it. A brief that says "explain this properly"
  while a check quietly punishes long explanations puts the worker in a bind, and workers resolve
  it by damaging their own work rather than by complaining. Four separate workers cut good
  explanations short on 2026-09-14 to stay under a file-length limit that should never have been
  counting comments. Three said so in their report and one asked for a person to sign it off; all
  four had already done the damage by then. The maintainer's ruling: clear comments beat any line
  count, and a long readable explanation beats a cramped short one.
- When a worker reports that a check and its instructions disagree, check the tool before
  believing the worker got it wrong. Of the four measuring tools questioned by workers during
  phase 5, four were wrong.
- **Tell the worker what is allowed to stay.** A tool that finds work is not a target to be driven
  to zero, and a worker will treat it as one unless told otherwise. On 2026-09-15 seven workers were
  handed a report listing every term of art in the headers they owned. The brief said in as many
  words that keeping one because it is genuinely the clearest word is a fine answer, and that a
  header reading well while still tripping the report is a pass. All seven came back having kept
  words on purpose and said which and why — every reason good, including three that were not really
  jargon at all but a game's title and a command people type. Without that sentence the same list
  invites seven workers to reach for a thesaurus and make the writing worse to clear a number.
- **Check your own worked example against the code before handing it to anybody.** The two examples
  for that session were written by the session itself and both stated something confidently false on
  the first pass, each an assumption carried from the area's reputation rather than read. Both were
  caught, and the rule that caught them went into the brief — where it then found nine wrong claims
  in old headers that had been sitting there being believed. An example is copied by every worker,
  so an error in one is an error in twenty files.
