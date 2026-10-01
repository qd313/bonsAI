# Running a bug wave: the setup that works

How to run a night of bug fixing with helpers and an unattended Deck pass. This is the shape that ran plans 76
and 77 (56 fixes and about 60 Deck passes over two nights), written down on 2026-09-30 because the maintainer
asked for it to be made the standing way, with the slips from those nights turned into rules. A plan for a new
wave says what is different that night; everything else is here.

The helpers' own rules live in their definition files under `.claude/agents/`. This page is for whoever runs the
session.

## Who does what

| Who | Does | Never |
|---|---|---|
| The one running the session (Opus) | Writes the briefs and the Deck checks, reads every change before it lands, lands, reads every Deck failure, decides anything unclear | Writes code; edits the roadmap or testing documents by hand |
| Fix helpers (`bugfix-lane`, up to ten at once) | One bug each in its own copy of the repo, one fix per commit, every check green | Touch the roadmap, the testing documents, the changelog, the Deck |
| A read-only lookup helper | Collects every owed Deck check the rig can run into one list of exact steps | Edits anything |
| The bookkeeper | Every roadmap, testing and changelog change, from result lists the session writes | Invents a Deck result; commits while a landing runs |
| The Deck driver (one at a time, a fresh one per block) | Runs written checks, one evidence file each | Fixes, edits, deploys unless told, decides what an unclear result means |

Models: [AGENTS.md, "Which model does which work"](../../AGENTS.md). A fix that has failed on the Deck twice
moves up one tier with the measurement in hand.

## Before the helpers start

1. Read the roadmap's Bugs list and sort it against the release line or the plan's own rule. Take the
   maintainer's calls first; write them into the plan.
2. `git status` and the tail of the decisions file, before picking a plan or decision number. Other sessions add
   both.
3. Note the tip hash. Make each helper a copy: `python scripts/worktree.py create <name> --base experimental`
   (`--base` takes a branch name, not a commit; the copy's branch is `refactor/<name>`). Confirm each copy
   starts at the tip you noted. The copy's packages folder is a link to the shared one, so no helper installs
   anything. Never remove a copy with
   `git worktree remove`; it follows the link and empties the shared folder.
4. Write one short rules file all helpers read, and one brief each. Every brief carries:
   - the tip hash and the check that the copy is based on it;
   - "run the baseline checks now, without an install";
   - the files the helper owns, and "a fix that needs another file: stop and report";
   - one fix per commit, failing test first;
   - **the sentence that says what a pass looks like on the Deck, and one test at that same level**;
   - for a wording or label fix, a search for every place the words appear;
   - for a D-pad walk, tests that model Steam's own scroll on focus, and a bounded walk with no stop twice;
   - the five checks and `python scripts/verify.py --quick` before every commit;
   - a scratch folder of its own, and `git -C <copy>` instead of `cd`;
   - the report: commits, tests, what a person would notice, the exact Deck check it expects to pass.
5. Check each brief against its own rules and against the data before sending it. A brief that names an example
   the data does not hold wastes a helper.
6. Start the timed check that wakes the session every 20 minutes. A message from the maintainer also wakes it.

## Landing

One at a time, in the shared checkout, back end before screen changes, and two helpers that touch the same area
never back to back without re-reading the second against the first.

1. Read the helper's whole change. Ask: does a test fail without the fix **at the level the Deck check looks
   at**? For a D-pad change: can the walk loop? For a label: search for the old words again.
2. `scripts/land_lane.sh <branch> <tip> <scratch folder>`, in the background. It picks the commits one by one,
   regenerates the generated files, and runs the five checks and the wider quick check. Read its log.
3. A real clash stops the script with the pick left open. Resolve it by hand, continue, run the script again.
4. Hand the bookkeeper the result list, then start the next helper in the freed slot.

## The checks list for the Deck

About a quarter of plan 77's Deck results proved nothing, because the check could not produce its case. So every
check on the list says:

- what must be true before it starts, and a quick way to see whether its case can be produced at all;
- the exact presses, and what counts as a pass, in numbers;
- for a walk: a landing is a stop; a press that only scrolls a section being read is expected; a section taller
  than the screen is judged by the edge it is entered from.

A check that depends on what the AI happens to write gets two differently worded tries. A check that has failed
to produce its case twice on earlier nights is not run again as it is: give it a prepared setup first, or put it
on the maintainer's list as "proven by its tests only".

## The Deck, in blocks

- **Block 0, setup:** confirm no other session is driving; keep the Deck awake; note which screen is live; back
  up the settings; confirm the build; record how Ollama runs and what is installed; **find or make the test chat
  and write its name in the handover note**; check the parental lock is off.
- **While the helpers build:** measurements a fix is waiting for, and owed checks that do not depend on tonight's
  fixes.
- **After the landings:** one deploy, then one check per fix.
- **Then:** second rounds, and the free-play sweep every Main-tab change owes, with and without a game.
- **The end:** a smoke test on the final build; put back every setting, the normal build, any model pulled for a
  test; clear pinned test chips; close the game.

Each block is about fifteen checks and gets a fresh driver with the last one's handover note. Every Deck command
is exactly `ssh deck@<address> '<command>'`. If a deploy is refused, tell the maintainer "run setup-dev"; it is a
five-second fix on their side.

## Paperwork

After every landing, a fixed bug moves from Bugs to Verify, naming the check it owes. After every Deck pass, a
pass moves to Done with its evidence file and a failure goes back to Bugs with what was seen, the testing
documents in the same commit. Result lists are copied from the evidence file's own words. The session
spot-checks each bookkeeper commit against the evidence. The plan's log gets a few lines after every landing
and every Deck block, and is committed, so a look from a phone shows where things stand.

## While nobody is watching

- A new bug that crosses the release line is fixed that night. Anything else goes on the roadmap and into the
  report and gets one helper round of about an hour.
- A question for the maintainer goes in the plan's questions list, with the safest choice taken meanwhile. A
  phone notification only when something is truly blocked.
- The usage limit stops every helper at once. Each keeps its work and resumes with one short message.
- Never: push, merge to main, switch branches in the shared folder, stage everything, type a PIN or password,
  press anything on the Deck outside a written check.

## At the end

`python scripts/verify.py --quick` passes. The report leads with what the maintainer must do next, then what was
fixed and proven, what failed and why, what was found, and what is left. The maintainer's checks page is brought
up to date. The plan gets its results, and anything learned that would change this page changes this page.
