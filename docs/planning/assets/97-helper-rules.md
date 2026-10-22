# Plan 97: the rules every helper reads

One page, read before your brief. Your brief (a section of `97-lane-briefs.md`) and your task give the rest: the tip
hash, the absolute path of your own copy of the repo, the files you own, and the Deck check your fix must pass. Where
this page and your helper definition file disagree, the stricter one wins.

## Your copy of the repo

1. **First act:** `git -C <your copy> merge-base --is-ancestor <tip> HEAD`. If it fails, stop and report. Never reset,
   merge or improvise. Then `git -C <your copy> log --oneline -1` and put the hash in your report.
2. **Install nothing.** Your copy's `node_modules` is a link to the shared checkout's. Never run `pnpm install`.
3. **No full test run at the start.** The session ran one baseline on the tip that covers every copy. Run only the
   checks listed under "Before every commit".
4. **Only absolute paths inside your copy.** Never write into the shared checkout. Use `git -C <your copy>` instead of
   `cd`. Keep scratch files in a `.scratch/` folder inside your copy, never in the system temp folder (two helpers once
   picked the same file name there).
5. **Never `git stash`.** The stash is one list shared by every copy. To see a test fail without your fix: save it with
   `git -C <copy> diff -- <files> > .scratch/fix.patch`, reverse with `git apply -R`, run the test, apply it back.
6. **Commit in your copy with** `git -C <copy> -c core.hooksPath=.githooks commit`, so your copy's own commit hook
   runs, not the shared checkout's. Stage files by name; never `git add -A`.
7. Files here can carry Windows line endings. Normalise before an exact-match edit, and after any scripted edit check
   the file has no stray bytes (`git ls-files --eol` still reads `i/lf`).

## The fix

8. **One fix per commit, the failing test first.** Stay inside the files your brief lists. A fix that truly needs
   another file: stop, commit nothing half-done, and say so in your report.
9. **Test at the level the Deck check looks at.** Your brief has a sentence saying what a pass looks like on the Deck.
   At least one new test must fail without the fix at that same level ("the drawn text has no stray stars", not "the
   helper returns the right string"). If you cannot, say so and say what the nearest test proves.
10. **A wording fix searches first.** `git grep` every place the words appear; fix them all or say which you left.
11. **A D-pad fix** follows the focus law in your helper file: handlers on Steam's Focusable, moves between containers
    only through the registry's transfer, never a page search, never a `tabindex` of -1, never a plain `focus()` across
    containers. A walk is tested with Steam's own scroll modelled (`src/test-harness/deckAnswerWalk.ts`) and with a
    bounded walk in which no stop is visited twice. A move between two stops inside one container is Steam's own, so
    a handler on the container never runs for it: give each stop its own Focusable with all four moves.
12. **Never touch** `docs/roadmap.md`, `docs/roadmap-kb.md`, `docs/roadmap-shelved.md`, their details files,
    `docs/testing.md`, `docs/testing-manual.md` or `CHANGELOG.md`. Put what each commit fixes, the row it owes and
    one plain sentence of what a person would notice in your report; the session writes the rows.
13. **Never hand-edit** anything under `packages/bonsai-mcp/knowledge/architecture/` or `src/types/rpcMethods.ts`
    (generated).
14. **Do not sink time into a bug that resists.** A clear write-up of what you learned and where you got stuck is worth
    more than a guess.

## Before every commit

Run, in your copy, in this order; every one green:

- `npx tsc --noEmit`
- your own test files, by name, at two workers: `npx vitest run <file> <file> --maxWorkers=2`
  (Python: `python scripts/run_python_tests.py <tests/test_x.py>` only if you changed a `.py` file)
- `npm run build`
- `node scripts/check-focus-patterns.mjs`
- `python scripts/check_headers.py --level full`
- `python scripts/ratchet.py check`  (unused exports and copy-pasted lines; never raise a limit, share the code instead)
- `python scripts/growth_limit.py`  (a file past its limit: move a self-contained piece out in its own commit)

**Never** `python scripts/verify.py --quick`, `npm test` or `npm run test:py` whole: with twelve helpers those took the
PC to 23 GB and froze landings. The full sets run once, at landing, in the shared checkout. If a check runs in the
background, wait for it in the foreground before you commit; a commit made while a check still runs is a commit made
blind.

## Never

The Deck (no `deck_*` tools, no SSH, no deploy). `git push`. `git rebase -i`. Switching branches. Printing the
settings file's values (it holds a key; key names only). Writing to any file outside your copy.

## Your commit messages and your report

Plain language: what changed and why, what a person using the plugin notices first. End every commit message with a
`Co-Authored-By:` line naming the model you are actually running on.

The report, at the end: the commit hashes; the test names you added; for each fix, the roadmap entry it fixes, the
row it owes, one sentence of what a person would notice, and the exact Deck check you expect to pass; anything you
found and did not fix (file and line); anything in your brief that turned out wrong.
