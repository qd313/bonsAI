# Plan 108: the rules every helper reads

One page, read before your brief. Plan 108 is seven feature plans, 108a to 108g. Your task text names your plan's
letter and your lane's letter, the tip hash, the absolute path of your own copy of the repo, the files you own, and the
check your work must pass. Your brief is your lane's section in that plan's briefs file
(`108<letter>-lane-briefs.md`, beside this page). Where this page and your helper definition file disagree, the
stricter one wins.

**Plan 106's rules are kept.** Read [106-helper-rules.md](106-helper-rules.md) in full and follow it, reading "plan 108"
for "plan 106", and through it [105-helper-rules.md](105-helper-rules.md) and the sections of
[103-helper-rules.md](103-helper-rules.md) it names ("Your copy of the repo", "The work", "Before every commit",
"Never", "Your commit messages and your report"). The lines below are this plan's and win where they differ.

## New for plan 108

1. **Your brief's facts were read on 2026-11-19 at tip `28306e896`, by one reader.** Other work has landed since.
   Re-find every file, function and line anyway (`git -C <copy> grep`). If one has moved, say so in your report and
   carry on from where it is now. If the thing your brief describes is no longer true, **stop and report**; do not
   build the brief's mistake.
2. **Search wider than your own tests before you commit** (three misses in the 2026-11-19 round came from skipping
   this):
   - for every function whose arguments you change and every name you rename, `git -C <copy> grep -n <name> -- tests src`
     and run each test file that mentions it;
   - if you change how a call is made, search the tests for anything that patches what you replaced, and run those
     files;
   - `tests/test_seam_contracts.py` pins the exact arguments of many back-end functions: if it names yours, update it
     on purpose in the same commit.
3. **Never write a file with a PowerShell redirect or `Out-File`.** It adds a byte-order mark that breaks another
   test. Use your Write or Edit tool.
4. **A test to find out changes nothing in the plugin.** A lane whose brief is a measurement (the "step 0" of a plan)
   commits only what its brief names (a script, a fixture copied from a real machine). Its numbers go in the evidence
   file the brief names. The go and no-go lines were written before the measurement: report the number against the
   line as written, never move a line after seeing the number, and never start the build that waits on it. The
   session and the maintainer decide.
5. **Only the Deck driver touches a test machine.** A lane that writes a script meant to run on the Deck or the
   stand-in never runs it there. A Deck driver's runbook block is written by the session from your report, so your
   report gives the exact presses, the expected landing of each, and what must be read back.
6. **One measurement at a time on this PC's AI.** Before you ask this PC's Ollama anything, take the lock: create
   the folder `.scratch/ollama-lock` in the **shared** checkout (`mkdir` fails if another lane holds it; wait two
   minutes and try again), write your plan and lane letters into a file in it, and remove the folder the moment your
   measurement ends, also when it fails.
7. **A cancel is a kill switch** (the maintainer's rule of 2026-11-19): it stops the work as fast as the plugin can,
   leaves nothing half-done behind, and the screen changes at the press. Anything you build that a person can stop (a
   listener, a look at the disk, an extra trip to the AI, an unload) is tested for all three.
8. **A new read of the disk, a new permission, a download, or a microphone that stays open** is read by the security
   reviewer before it lands; a new dependency or a model with its own licence is read by the open-source reviewer
   too. Your report names exactly which folders are read and which are never read, which hosts are contacted, what is
   run, and what is left on disk and in memory after a stop, a failure and a success.
9. **A D-pad, layout or screen change** carries a walk test that models Steam's own scroll on focus and visits no stop
   twice, and is read by the second opinion before it lands. It is built only after the device measurement its brief
   names; if your task text does not hand you that measurement, stop and ask for it.
10. **A drawing outranks a brief.** Where a call was answered on mock-up board 7, your task names the tab and the
    option picked. Open the built page and build what is drawn, at the sizes drawn; measure the drawing itself. A
    mock-up lane follows `docs/demos/mockup-board-5/README.md`: it starts from the kit in `docs/demos/mockup-board-2/src`
    and never copies or edits the kit, draws at true size (the plugin's column is 300 points wide), copies every word
    on a drawn panel from the plugin's code, makes each option a card with the kit's Like / Not this block, and makes
    a choice about behaviour pressable with the arrow keys.
11. **A Haiku helper keeps its reading small.** Read only the line ranges your brief names and your own test files;
    never read a file over 400 lines whole; send long command output to a file in your scratch folder and read its
    last 40 lines. If the job needs more than about ten files, stop and report what you found.
12. **Never touch** any plan 108 file or its asset files (this page included), plan 107's files, the roadmap files and
    their details files, the testing documents, the changelog, the decisions file, `AGENTS.md`, `CLAUDE.md`, or
    `docs/demos/` (a mock-up lane owns only the files its brief names inside board 7's folder). The bookkeeper is the
    exception for the roadmap, testing, changelog and decisions files.
13. **Plain words** in every label, message, commit message and report. A new message on screen says what happened,
    then what to do next. Your report ends with one line the maintainer could read: what a person will notice.
