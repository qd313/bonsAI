# Plan 106: the rules every helper reads

One page, read before your brief. Your task text is your brief: it gives the lane letter, the tip hash, the absolute
path of your own copy of the repo, the files you own, and the check your work must pass. Your brief also points you at
[plan 106](../106-plan-105-wrap-up.md) § 5 (your lane's paragraph) and, for a review fix, the entry it fixes in
[105-review-report.md](105-review-report.md). Where this page and your helper definition file disagree, the stricter
one wins.

**Plan 105's rules are kept.** Read [105-helper-rules.md](105-helper-rules.md) in full and follow it, reading "plan 106"
for "plan 105", and through it the sections of [103-helper-rules.md](103-helper-rules.md) it names ("Your copy of the
repo", "The work", "Before every commit", "Never", "Your commit messages and your report"). The lines below are this
plan's and win where they differ.

## New for plan 106

1. **Your brief's facts are from the tip your task names, written the same day.** Re-find every file, function and line
   anyway (`git -C <copy> grep`). If the thing your brief describes is no longer true, **stop and report**; do not build
   the brief's mistake.
2. **Never touch** plan 106, its asset files (this page included), the review report, plan 105 or its asset files, nor
   any file in plan 105's rule 9 list. The bookkeeper is the exception for the roadmap, testing, changelog and decisions
   files.
3. **At most eight helpers run at once.** The second opinion (Fable at medium) and the security reviewer are started by
   the session only. If you are stuck, say so in your report.
4. **A download or build change** (lanes R1, R3 and F3) is read by the security reviewer before it lands. Your report
   names exactly which hosts are contacted, what is run, and what is left on disk after a stop, a failure and a success.
5. **Tests prove both directions.** A guard you add gets a test that fails without it; name that failure in the commit
   message (break it on purpose, see it fail, put it back).
6. **The answer test on this PC's AI** (lane H1 only) uses the model at `127.0.0.1:11434`, one call at a time. Write
   nothing the answer test produces into the repo except a short results table in your report.
7. **Plain words** in every label, message, commit message and report. A new message on screen says what happened, then
   what to do next.
