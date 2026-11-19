# Plan 107: the rules every helper reads

One page, read before your brief. Your task text is your brief: it gives the lane letter, the tip hash, the absolute
path of your own copy of the repo, the files you own, and the check your work must pass. Your brief also points you at
your lane's paragraph in [107-lane-briefs.md](107-lane-briefs.md). Where this page and your helper definition file
disagree, the stricter one wins.

**Plan 106's rules are kept.** Read [106-helper-rules.md](106-helper-rules.md) in full and follow it, reading "plan 107"
for "plan 106", and through it [105-helper-rules.md](105-helper-rules.md) and the sections of
[103-helper-rules.md](103-helper-rules.md) it names ("Your copy of the repo", "The work", "Before every commit",
"Never", "Your commit messages and your report"). A knowledge-base lane also follows
[104-helper-rules.md](104-helper-rules.md) (the measuring rules and its commit checks). The lines below are this plan's
and win where they differ.

## New for plan 107

1. **Your brief's facts were looked up on 2026-11-19 at tip `28306e896`.** Re-find every file, function and line
   anyway (`git -C <copy> grep`). If the thing your brief describes is no longer true, **stop and report**; do not
   build the brief's mistake.
2. **Search wider than your own tests before you commit** (three misses in the last round came from skipping this):
   - for every function whose arguments you change, and every name you rename: `git -C <copy> grep -n <name> -- tests src`
     and run each test file that mentions it;
   - if you change how a call is made (for example how a connection is opened), search the tests for anything that
     patches what you replaced, and run those files;
   - `tests/test_seam_contracts.py` pins the exact arguments of many back-end functions: if it names yours, update it
     on purpose in the same commit.
3. **Never write a file with a PowerShell redirect or `Out-File`.** It adds a byte-order mark that breaks another
   test. Use your Write or Edit tool.
4. **A Haiku helper keeps its reading small.** Every request you send carries everything you have read so far, and
   the price is five times higher once that passes 100,000 tokens. So: read only the line ranges your brief names and
   your own test files; never read a file over 400 lines whole; send long command output to a file in your scratch
   folder and read its last 40 lines; no searches wider than your brief's folders. If the job needs more than about
   ten files, or you have made more than about forty tool calls, **stop and report what you found**: the session
   passes the job to a larger helper with your notes. The session watches your size and will stop you at 80,000.
5. **One measurement at a time on this PC's AI.** Knowledge-base lanes (KA to KE) and anything else that asks this
   PC's Ollama a question first take the lock: create the folder `.scratch/ollama-lock` in the **shared** checkout
   (`mkdir` fails if another lane holds it; wait two minutes and try again), write your lane letter into a file in
   it, and remove the folder the moment your measurement ends, also when it fails.
6. **A cancel is a kill switch** (the maintainer's rule of 2026-11-19): it stops the work as fast as the plugin can,
   leaves nothing half-done behind, and the screen changes at the press. A fix on a download, a build or a long job
   is tested for all three.
7. **A download, build or install change** (lanes D1, O1, V1, V2, X1) is read by the security reviewer before it
   lands. Your report names exactly which hosts are contacted, what is run, and what is left on disk after a stop, a
   failure and a success.
8. **A D-pad or layout change** (lanes P1, FL, FT, FW, T1, M2, M3) carries a walk test that models Steam's own
   scroll on focus and visits no stop twice, and is read by the second opinion before it lands. Your report gives the
   exact presses and the expected landing of each, so the Deck check can be written from it.
9. **Never touch** plan 107, its asset files (this page included), the roadmap files, the testing documents, the
   changelog, the decisions file, or `docs/demos/`. The bookkeeper is the exception for the roadmap, testing,
   changelog and decisions files.
10. **Plain words** in every label, message, commit message and report. A new message on screen says what happened,
    then what to do next. Your report ends with one line the maintainer could read: what a person will notice.
