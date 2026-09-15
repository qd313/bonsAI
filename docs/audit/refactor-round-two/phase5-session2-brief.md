# Phase 5 session 2: rewrite the headers that were written for insiders

Every worker in this session reads this file first. Your own message names your copy of the
project and your exact list of files; everything else is here.

---

## The goal, in one sentence

Every file you own already has a header with all the right labels — rewrite each one so that a
person who has never seen this code can read it and understand what the file is for.

## What is wrong with them today

Nothing is missing. The labels are all filled in. They are filled in with the words you would use
to a colleague who already knows the system, which makes them useless to everybody else. Two real
examples from this project:

> Purpose: Map frontend settings snapshot input into the backend BonsaiSettings RPC payload shape.

> Purpose: Sanitize and default user capability flags for high-impact plugin actions.

Both are accurate. Neither tells a newcomer anything. That is the entire job.

## The two worked examples — read both before you start

Both are committed on your branch's starting point, so they are already in your copy:

- `src/utils/settingsPayload.ts` — the first example above, rewritten.
- `py_modules/backend/services/capabilities.py` — the second, rewritten, with a small drawing of
  the order the checks happen in.

Read the whole header of each. Match that voice. Do not match their length — see below.

## How to write one

**Lead with what the thing does for a person using the plugin**, then how it does it. "The Settings
tab holds every setting under a screen-side name; the back end knows them under different names;
this file is the translation" — a reader who knows nothing can follow that.

**Say the everyday word.** Run `python scripts/plain_words_check.py --file <path>`. For every term
of art in the header it prints the wording to use instead. Those wordings are shared across all
seven workers on purpose, so we do not end up with seven different phrasings of the same idea.

**The scanner is a finding aid, not a target.** Do not reword a sentence just to clear a word off
its list. If the term of art really is the clearest word for the thing, keep it — and make the
sentence around it explain what it means, once. A header that reads well and still trips the
scanner is a pass. A header that trips nothing and says nothing is a failure. Say so in your report
if you keep one deliberately.

**Keep the labels.** Title, Purpose, Used for, Solves, Does not, then How it works and Gotchas
where they apply. Python files use the same labels in the module docstring.

**Length is whatever the file needs.** See "no number constrains you" below.

**Drawings are welcome** where a shape is easier seen than read: an order of checks, what wraps
what on screen, the two paths a request can take. Both worked examples have one. Do not add one
for its own sake.

**Names of files and functions are allowed** inside comments. Writing them is often the clearest
thing to do.

## Check every claim against the code

This is the rule that matters most, and it is new.

A header that confidently states something false is worse than one that says nothing, because the
next person believes it. While writing the two worked examples above I wrote two false claims and
caught both only by going and checking:

- I wrote that leaving a setting out of a list "fails silently, nothing catches it". The type check
  catches it immediately. I had assumed it from the area's reputation.
- I wrote that old settings files are granted four of five permissions. It is three.

Before you write a sentence about what happens, read the lines that make it happen. Never write a
Gotcha from memory or from the old header — the old header is what you are here to fix, and some of
what it says is wrong too. **If the old header says something you cannot find in the code, say so in
your report rather than copying it forward or quietly deleting it.**

## No number constrains you

Write the explanation the file deserves. In particular:

- **There is no line limit, and file length is not a measure you are judged on.** The count of large
  files in this project now counts lines of code only — comments and docstrings are excluded from it
  entirely. A long header costs nothing.
- If you ever find yourself shortening, compressing or moving an explanation to satisfy a number,
  **stop and report it**. In the previous session four separate workers did exactly that against a
  measure that turned out to be broken, and all four wrote worse for a day before anybody said
  anything. The maintainer's ruling: clear comments beat any count, and a long readable explanation
  beats a cramped one.
- If a check disagrees with these instructions, **report it rather than obeying it**. Four of four
  tools questioned by workers in the last session turned out to be the thing that was wrong.

## Comments only — not one character of code

This is a comments-only phase. No renaming, no tidying, no "while I was in there". If you spot a
bug, put it in your report; do not fix it.

Two hard rules that follow from that:

- **Do not add or delete any file.** The proof script treats an added file as changed code and your
  lane will fail.
- **Before you commit, prove it**, from inside your copy:

  ```
  python scripts/comment_only_check.py <your branch's starting commit> HEAD
  ```

  It must say every file changed comments only. If it names a file as code-changed, you changed
  code — find it and put it back.

## Checks before every commit

```
python scripts/verify.py --quick
```

Must pass. The header gate is real now and runs inside it: every file needs a `Purpose:` line,
every file over 400 lines of code needs a `How it works:` line, and any name you write in backticks
with brackets after it — `` `likeThis()` `` — must actually exist in that file or be imported into
it. A backticked word with no brackets is treated as ordinary quoting and is not checked.

## What you must not touch

Files not on your list. Any other worker's files. The roadmap, the testing documents, the
changelog. The tests. The Steam Deck. Never run `git push`. Never run `git add -A` — name the files
you are staging, every time.

## Commits

Work in batches of eight to twelve files, one commit per batch. Commit message says which files and
that it is comments only. Run the quick check before each commit, and the comments-only proof before
your first commit and before your last.

## Caps

Stop at 160 tool calls or 400,000 tokens, whichever comes first, and report what you did not reach.
Do not start a file you cannot finish.

## The report, pasted in whole

```
RESULT: done | partial | blocked
COMMIT: <hashes>
FILES: <count> rewritten, <count> left
CHECKS: quick pass|fail ; comments-only proof pass|fail
TERMS OF ART KEPT ON PURPOSE: <file: word, why> or none
OLD HEADERS THAT WERE WRONG: <file: what it claimed, what is true> or none
BUGS SPOTTED, NOT FIXED: <one line each> or none
ANY CHECK THAT DISAGREED WITH THIS BRIEF: <what> or none
LEFT UNDONE: <one line each>
COST: <tool calls> calls, <tokens> tokens
```
