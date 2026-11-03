# Plan 102: the rules every helper reads

One page, read before your brief. Your brief (a section of `102-lane-briefs.md`) and your task give the rest: the tip
hash, the absolute path of your own copy of the repo, the files you own, and the Deck check your work must pass. Where
this page and your helper definition file disagree, the stricter one wins. Plan 100's rules are kept word for word
where they still apply; the lines marked "new" are this plan's.

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
   the file has no stray bytes (`git ls-files --eol` still reads `i/lf`; count NUL bytes). The seed file holds real em
   dashes (UTF-8); a console that prints them as "?" is the console's fault, not the file's (new).

## The knowledge base

8. **This PC's AI model at `127.0.0.1:11434` may be used. The Deck may not.** No `deck_*` tools, no SSH, no deploy,
   ever. A Deck driver may be pressing buttons right now and a stray press would corrupt its readings.
9. **A built library is copied into your copy at `build/knowledge-base`.** Use it. Only if it is missing, build your own
   with `python scripts/kb/build_rag_db.py --seed --out build/knowledge-base` (Ollama must be running, or every
   meaning-search number is wrong). The folder is git-ignored; never commit it. **The model is one process shared by
   every lane on this PC** (new): a measurement lane runs one eval at a time and says in its report how long each took.
10. **Never commit an evaluation report.** The eval scripts write into the workshop's `archive/research/` folder
    (`C:\Users\still\Documents\bonsAI-workshop\archive\research\`). Those files are the session's to make on the landed
    branch. **The search-test script writes its JSON there even with `--no-write-report` until lane A lands** (new): a
    lane that runs it names the file it left in its report, and never deletes a file it did not write.
11. **A content lane writes no sentence it cannot point at.** Every note sentence comes from a page the fetcher read
    (`scripts/kb/fetch_wiki_live_pages.py --api <the wiki's api.php> --titles "A|B"`, which prints the page's licence
    and revision), or from a note or tip already in the library. The sidecar names the page and revision of every
    section. No facts from memory: the Brotato, Palworld and Skyrim notes gained nine small invented claims that way. A
    page whose licence is GFDL or NonCommercial cannot be used at all. **Confirm the api path first** (new): plan 100's
    Portal lane lost an hour because the wiki's api sits under `/w/`; `--search` with one word proves the path before
    any page is read. Read every sentence you wrote against its page, line by line, before you report, and say in the
    report that you did.
12. **One file per content lane.** Notes go in your own new file under `data/kb/notes/` (an object with `games`,
    `aliases` and `sections` lists; `games` and `aliases` stay empty, the game already exists). Never edit
    `data/kb/strategy_seed.json` (lane B alone edits one section of it) or any glossary file. Your section id range is
    in your brief; a repeat stops the build for everyone.
13. **A new plugin method's name carries `rag_corpus`** (the knowledge base's machine-facing name), or the generated
    method map files it under "other" with no warning. No lane in this plan adds one.
14. **A tips lane changes words, never scores.** Lane H adds one tip and word pairs to the router; it never moves a
    floor or a cut-off.
15. **A measurement lane commits nothing and lands nothing** (new): E, G and X2 hand back numbers, a report file in the
    workshop and, where the brief says, a patch file beside it. Lane D commits only if a shape wins by its brief's rule.

## The work

16. **One change per commit, the failing test first.** Stay inside the files your brief lists. A change that truly needs
    another file: stop, commit nothing half-done, and say so in your report.
17. **Test at the level the Deck check looks at.** Your brief has a sentence saying what a pass looks like on the Deck.
    At least one new test must fail without the change at that same level. If you cannot, say so and say what the
    nearest test proves.
18. **A wording change searches first.** `git grep` every place the words appear; change them all or say which you left.
19. **A D-pad change** follows the focus law in your helper file: handlers on Steam's Focusable, moves between containers
    only through the registry's transfer, never a page search, never a `tabindex` of -1, never a plain `focus()` across
    containers. A walk is tested with Steam's own scroll modelled (`src/test-harness/deckAnswerWalk.ts`) and with a
    bounded walk in which no stop is visited twice. Every stop must hear A and B, not only take the ring. A move handler
    on Steam's own switch cannot claim the press (a switch's edge moves go on a Focusable wrapper; `DenseSwitchRow`'s
    `navOnWrapper` is the shape). **The lost-focus heal is `refocusPanelWindowIfLost` in
    `src/shared/dpad/navFocusRegistry.ts`** (new): ask it once, where the evidence says the ring was lost, the way
    `strategyChecklistNav.ts` does before its own transfer; never sprinkle it.
20. **A prompt change counts its characters.** Lane D reports the system prompt's length before and after for a turn
    with a picture; a clause is one sentence, not a paragraph. The Default spoiler paragraph is pinned byte for byte by
    `tests/fixtures/spoiler_default_tier_golden.json` and must not change; the whole-prompt fingerprints in the golden
    fixture may be updated on purpose for a deliberate prompt change, and the commit message says so.
21. **Never touch** `docs/roadmap.md`, `docs/roadmap-kb.md`, `docs/roadmap-shelved.md`, their details files,
    `docs/testing.md`, `docs/testing-manual.md`, `CHANGELOG.md`, `docs/planning/37-rag-status-report.md`, or plan 102
    and its asset files. Put what each commit does, the row it owes and one plain sentence of what a person would notice
    in your report; the session writes the rows.
22. **Never hand-edit** anything under `packages/bonsai-mcp/knowledge/architecture/` or `src/types/rpcMethods.ts`
    (generated).
23. **Do not sink time into a problem that resists.** A clear write-up of what you learned and where you got stuck is
    worth more than a guess.

## Before every commit

Run, in your copy, in this order; every one green:

- `npx tsc --noEmit`
- your own test files, by name, at two workers: `npx vitest run <file> <file> --maxWorkers=2`
  (Python, only if you changed a `.py` file: run your own test files with `python -m unittest` and `PYTHONPATH` set to
  your copy, its `py_modules` and its `tests` folders. Never `scripts/run_python_tests.py`: it ignores the file you
  name and runs the whole Python suite.)
- `npm run build`
- `node scripts/check-focus-patterns.mjs`
- `python scripts/check_headers.py --level full`
- `python scripts/ratchet.py check`  (unused exports and copy-pasted lines; never raise a limit, share the code instead;
  your copy cannot see the copy-paste count, so a landing may still fail on it and the session hands back line ranges)
- `python scripts/growth_limit.py`  (a file past its limit: move a self-contained piece out in its own commit)

**Never** `python scripts/verify.py --quick`, `npm test` or `npm run test:py` whole: with twelve helpers those took the
PC to 23 GB and froze landings. The full sets run once, at landing, in the shared checkout. If a check runs in the
background, wait for it in the foreground before you commit; a commit made while a check still runs is a commit made
blind. A content-only lane (notes) runs only the headers check and its own schema check script, plus one library build
in its copy to prove the file is accepted. A measurement lane commits nothing.

## Never

The Deck (no `deck_*` tools, no SSH, no deploy). `git push`. `git rebase -i`. Switching branches. Printing the
settings file's values (it holds a key; key names only). Writing to any file outside your copy. Publishing the library.
Deleting a file in the workshop you did not write (new).

## Your commit messages and your report

Plain language: what changed and why, what a person using the plugin notices first. End every commit message with a
`Co-Authored-By:` line naming the model you are actually running on.

The report, at the end: the commit hashes; the test names you added; for each change, the roadmap entry it serves, the
row it owes, one sentence of what a person would notice, and the exact Deck check you expect to pass; any table your
brief asks for; anything you found and did not fix (file and line); anything in your brief that turned out wrong; the
effort level you actually ran at; how long each eval run took (a measurement lane).
