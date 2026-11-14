# Plan 104: the rules every helper reads

One page, read before your brief. Your brief (a section of `104-lane-briefs.md`) and your task give the rest: the tip
hash, the absolute path of your own copy of the repo, the files you own, and the Deck check your work must pass. Where
this page and your helper definition file disagree, the stricter one wins. Plan 103's rules are kept word for word
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
   dashes (UTF-8); a console that prints them as "?" is the console's fault, not the file's. Write a script to a file
   in `.scratch/` and run it; never type one inline through a heredoc (it has turned an escape into a NUL byte).
8. **End what you started.** Before you report, end every test, build or watch process you started; a finished helper
   once left a test run alive for five hours.

## The knowledge base

9. **This PC's AI model at `127.0.0.1:11434` may be used. The Deck may not.** No `deck_*` tools, no SSH, no deploy,
   ever. A Deck driver may be pressing buttons right now and a stray press would corrupt its readings. (Lane T1 writes
   a script that will run against the Deck; it never runs it there. The driver does.)
10. **A built library is copied into your copy at `build/knowledge-base`** when your brief measures. Use it. Only if it
    is missing, build your own with `python scripts/kb/build_rag_db.py --seed --out build/knowledge-base` (Ollama must
    be running, or every meaning-search number is wrong). The folder is git-ignored; never commit it. **The model is
    one process shared by every lane on this PC:** run one measurement at a time, and say in your report how long each
    took. If a call times out, another lane is measuring: wait two minutes and try again, twice, then report.
11. **Never commit an evaluation report.** The eval scripts write into the workshop's `archive/research/` folder
    (`C:\Users\still\Documents\bonsAI-workshop\archive\research\`). Run the search test with `--no-write-report` unless
    your brief tells you to keep the report; a report you keep is renamed at once with `-p104-<your lane>` in its name,
    so a second run on the same date never overwrites it. Never delete a file you did not write.
12. **A note lane writes no sentence it cannot point at.** Every note sentence comes from a page the live reader
    fetched (`scripts/kb/fetch_wiki_live_pages.py --api <the wiki's api.php> --titles "A|B" --out
    build/wiki-live/<wiki>`, which prints the page's licence and revision), or from a note or tip already in the
    library. The sources list beside your file names the page and revision behind every line. No facts from memory. A
    page whose licence is GFDL or NonCommercial cannot be used at all. **Confirm the api path first:** `--search` with
    one word proves the path before any page is read (some wikis keep it under `/w/`). **A page that comes back with a
    handful of characters is a failed read, whatever the reader prints** (new: on 2026-11-14 a wiki whose database was
    read-only came back as "[ok] ... 1 chars"; lane T4 fixes the reader, and until it lands you check the size
    yourself).
13. **Three rules from last wave's main lesson, in force from your first line** (new):
    - **Write from a fact list, never from the wiki's sentence.** List the facts a page gives (a number, a name, a
      weakness, a place), close the page, and write the note's lines from the list in the plugin's own plain words.
    - **Sort every quote by where it sits on its page before you use it.** Only the wiki editors' own prose and bare
      facts from a table (a number, a name) may stand behind a line. A quote that sits in a description box, a quote
      block, an attribution line, a "quotes" section, a codex, journal, catalogue, scanner, trophy or booklet entry is
      the game's own text: the wiki's licence does not cover it. Do not use it; find the fact in the editors' prose or
      drop the fact. Judge by where the quote sits, never by how it reads.
    - **The final text is fact-checked by someone who did not write it.** Nothing of yours lands on your own reading.
      If you change a line after the checker has read it, say so, and it is read again.
14. **A note's name and its Summary line never give a story away.** No twist, no hidden identity, no ending, no late
    boss named where the game itself hides the name: write "the final boss". For Half-Life 2 and Black Mesa read this
    rule twice.
15. **A "Looks like" line.** A note about an enemy or a boss gets one extra labelled line, `Looks like:`, when its page
    describes how the thing looks (colour, shape, size, a landmark). One plain line, from the page's own prose. No such
    line when the page says nothing about looks.
16. **One owner per notes file.** The table in the briefs says which lane owns which file under `data/kb/notes/`. Never
    edit a notes file that is not yours. Never edit `data/kb/strategy_seed.json` (lanes M1 and then M2 alone edit it,
    one at a time) or any glossary file. A new file is an object with `games`, `aliases` and `sections` lists; `games`
    and `aliases` stay empty, the game already exists. Your number range is in your brief; a repeat stops the build
    for everyone.
17. **One file per question lane.** Test questions go in your own new file under `tests/fixtures/kb_eval/`
    (`p104-<name>.json`). Never edit `tests/fixtures/kb_eval_v2.json` (lane Q2 alone edits two rows of it). Whoever
    writes a note never writes its question, and whoever writes a question never reads the note.
18. **A new plugin method's name carries the word its area already uses** (`rag_corpus` for the knowledge base), or the
    generated method map files it under "other" with no warning.
19. **A measurement lane commits nothing and lands nothing:** X0, X1, X2 and the checkers hand back numbers, a report
    file in the workshop and, where the brief says, a patch file beside it.
20. **A switch that lands switched off changes nothing** (new). Your tests prove that with the switch off every saved
    fingerprint and every pinned answer is as it was, and your report says so.

## The work

21. **One change per commit, the failing test first.** Stay inside the files your brief lists. A change that truly needs
    another file: stop, commit nothing half-done, and say so in your report.
22. **Test at the level the Deck check looks at.** Your brief has a sentence saying what a pass looks like on the Deck.
    At least one new test must fail without the change at that same level. If you cannot, say so and say what the
    nearest test proves.
23. **A wording change searches first.** `git grep` every place the words appear; change them all or say which you left.
    A new line under an answer is added everywhere the two older lines are known (the footer step, the answer test's
    footer stripper, copied text, any screen rule that styles them).
24. **A D-pad change** follows the focus law in your helper file: handlers on Steam's Focusable, moves between containers
    only through the registry's transfer, never a page search, never a `tabindex` of -1, never a plain `focus()` across
    containers. A walk is tested with Steam's own scroll modelled (`src/test-harness/deckAnswerWalk.ts`) and with a
    bounded walk in which no stop is visited twice. Every stop must hear A and B, not only take the ring. A move handler
    on Steam's own switch cannot claim the press. The lost-focus heal is `refocusPanelWindowIfLost` in
    `src/shared/dpad/navFocusRegistry.ts`: ask it once, where the evidence says the ring was lost; never sprinkle it.
    A hop the plugin makes while the panel's page lacks the window's focus goes through `plainHop`
    (`src/shared/dpad/lostFocusHop.ts`) and gives the press up when Steam's ring did not follow.
25. **A prompt change counts its characters.** Lane H1 alone edits `py_modules/backend/prompts/ollama_prompts.py`. It
    reports the system prompt's length before and after; a clause is one sentence, not a paragraph. The Default spoiler
    paragraph is pinned byte for byte by `tests/fixtures/spoiler_default_tier_golden.json` and must not change; a
    sentence added only on some turns must leave every saved fingerprint as it is, and the report says it did.
26. **The request file is full** (new). `py_modules/backend/ask/game_ai_request.py` is one line under its size limit.
    Lane H1 alone edits it, and its first commit moves a self-contained piece out. If your work seems to need a line
    there, stop and report.
27. **Never touch** `docs/roadmap.md`, `docs/roadmap-kb.md`, `docs/roadmap-shelved.md`, their details files,
    `docs/testing.md`, `docs/testing-manual.md`, `CHANGELOG.md`, `docs/planning/37-rag-status-report.md`,
    `docs/mcp-setup.md`, or plan 104 and its asset files. Put what each commit does, the row it owes and one plain
    sentence of what a person would notice in your report; the session writes the rows. (The bookkeeper is the
    exception: those files are its job.)
28. **Never hand-edit** anything under `packages/bonsai-mcp/knowledge/architecture/` or `src/types/rpcMethods.ts`
    (generated).
29. **Do not sink time into a problem that resists.** A clear write-up of what you learned and where you got stuck is
    worth more than a guess. A brief that turns out wrong is a finding: say so and stop, rather than build its mistake.
30. **A rule nobody wrote down is not yours to apply everywhere** (new). Fix what your brief names. If you see the same
    fault in other files, list them in your report; last wave a helper told to "fix it everywhere" reformatted seventy
    older notes by accident.

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
  your copy cannot see the copy-paste count, so a landing may still fail on it and the session hands back line ranges.
  A test-writing helper reuses a neighbouring test's setup rather than copying it.)
- `python scripts/growth_limit.py`  (a file past its limit: move a self-contained piece out in its own commit)

**Never** `python scripts/verify.py --quick`, `npm test` or `npm run test:py` whole: with twelve helpers those took the
PC to 23 GB and froze landings. The full sets run once, at landing, in the shared checkout. If a check runs in the
background, wait for it in the foreground before you commit; a commit made while a check still runs is a commit made
blind. A note lane or a question lane runs only the headers check and its own schema check script, plus one library
build in its copy to prove the file is accepted (a question lane: the loader's own test). A measurement lane commits
nothing.

## Never

The Deck (no `deck_*` tools, no SSH, no deploy). `git push`. `git rebase -i`. Switching branches. Printing the
settings file's values (it holds a key; key names only). Writing to any file outside your copy, except a report your
brief sends to the workshop. Publishing the library. Deleting a file in the workshop you did not write. Reading or
copying anything from Nexus Mods, by hand or by script.

## Your commit messages and your report

Plain language: what changed and why, what a person using the plugin notices first. End every commit message with a
`Co-Authored-By:` line naming the model you are actually running on.

The report, at the end: the commit hashes; the test names you added; for each change, the roadmap entry it serves, the
row it owes, one sentence of what a person would notice, and the exact Deck check you expect to pass; any table your
brief asks for; anything you found and did not fix (file and line); anything in your brief that turned out wrong; the
model and the effort level you actually ran at; how long each measurement took.
