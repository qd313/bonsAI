# Plan 101: the rules every helper reads

One page, read before your brief. Your brief (a section of `101-lane-briefs.md`) and your task give the rest: the tip
hash, the absolute path of your own copy of the repo, the files you own, and the check your work must pass on the Deck
or on the PC. Where this page and your helper definition file disagree, the stricter one wins. Plan 100's rules are
kept where they still apply; the lines marked "new" are this plan's.

## Your copy of the repo

1. **First act:** `git -C <your copy> merge-base --is-ancestor <tip> HEAD`. If it fails, stop and report. Never reset,
   merge or improvise. Then `git -C <your copy> log --oneline -1` and put the hash in your report.
2. **Install nothing.** Your copy's `node_modules` is a link to the shared checkout's. Never run `pnpm install`.
3. **No full test run at the start.** The session ran one baseline on the tip that covers every copy. Run only the
   checks listed under "Before every commit".
4. **Only absolute paths inside your copy.** Never write into the shared checkout. Use `git -C <your copy>` instead of
   `cd`. Keep scratch files in a `.scratch/` folder inside your copy, never in the system temp folder.
5. **Never `git stash`.** The stash is one list shared by every copy. To see a test fail without your fix: save it with
   `git -C <copy> diff -- <files> > .scratch/fix.patch`, reverse with `git apply -R`, run the test, apply it back.
6. **Commit in your copy with** `git -C <copy> -c core.hooksPath=.githooks commit`, so your copy's own commit hook
   runs. Stage files by name; never `git add -A`. One change per commit, the failing test first.
7. Files here can carry Windows line endings. Normalise before an exact-match edit, and after any scripted edit check
   the file has no stray bytes (`git ls-files --eol` still reads `i/lf`; count NUL bytes).

## The contract and the reading rules (new)

8. **Plan 101 § 10 is the contract.** The look's result shape, the function names, the plugin method names and the
   screen store's name are fixed there. Build against them with a fake where the real piece has not landed. If you
   need the contract changed, stop and say so in your report; never change it in your copy.
9. **The allowlist before every open.** No file under a game folder, a prefix or a manager's home is opened before
   its real path (symbolic links followed) is checked to sit under a root the finder allowed. Never follow
   `pfx/dosdevices/` (its `z:` link is the whole disk). Binaries (`.dll`, `.exe`, `.so`) are listed, never opened.
10. **The budgets are in the reader, not in the recipe:** depth 3, 2,000 directory entries, 512 KB of text, 1.5 s of
    wall clock, then stop with a warning in `warnings`. Never a silent partial result.
11. **Two words, used exactly:** "seen" for what a checked recipe read; "suspected" for anything an unchecked recipe
    found. Never "installed", never "you have", never "you have no mods". When nothing is found, the words are "no mod
    files found in the places bonsAI checks".
12. **Fixtures are shaped like the maintainer's Cyberpunk setup (plan 101 § 4) but carry made-up or tame mod names.**
    Lane M alone replaces them from the maintainer's listing, and the listing itself never enters the repo (it stays in
    the private workshop). No adult mod names anywhere in the repo.
13. **Never read a file's contents to learn its layout when the plan already says it,** and never read a save file,
    a settings file outside the recipe's named one, or anything under the user's documents beyond the recipe's path.
14. **No network.** The look never fetches anything. A recipe that needs an online name lookup is wrong.

## The Deck and the PC

15. **This PC's AI model at `127.0.0.1:11434` may be used. The Deck may not.** No `deck_*` tools, no SSH, no deploy,
    ever. A Deck driver is pressing buttons right now and a stray press would corrupt its readings.
16. **The PC's own Steam library may be read only by the snapshot script (lane S) and only by the maintainer running
    it.** A code lane never points its tests at `E:\SteamLibrary` or the real Vortex home; tests use fake folders.

## Before every commit (the light gates; the quick check runs once at landing)

17. `npx tsc --noEmit`; `npm run build`; `pnpm test:focus`; your own test files by name with `--maxWorkers=2`;
    `python scripts/check_headers.py`, `python scripts/ratchet.py` (unused exports, copy-paste) and
    `python scripts/growth_limit.py`; the Python set (`npm run test:py`) only if a `.py` changed. **Never the full test
    sets and never `verify.py --quick`** (its related-tests step is a near-full run for a central file).
18. **Every new file opens with the house header** (title, purpose, used for, solves, does not; `docs/code-clarity.md`),
    in plain words. A new screen control has its focus-graph section written before it exists (AGENTS.md).
19. **A new plugin method's name carries `game_mods`,** or the generated map files it away from its siblings.

## What you hand back

20. **The report:** the commits (hash and one line each), the tests you added and ran, what a person would notice,
    the exact Deck or PC check row your work expects to pass, anything the brief got wrong, and anything you kept
    that a check flagged, with why. A fix that needs a file outside your list: stop and report; never edit it.
21. **Never** the roadmap, the testing documents, the changelog, the decisions file, the Deck, or a push.
