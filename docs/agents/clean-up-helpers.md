# Clean-up helpers (plan 86)

Tool-neutral instructions for the helpers of [plan 86](../planning/86-clean-up-round-three.md), clean-up round
three. Any tool can use this document directly; Claude Code has a short wrapper per role under `.claude/agents/`
(`cleanup-reader`, `cleanup-area-reviewer`, `cleanup-mover`, `cleanup-removal-lane`, `cleanup-first-look`). Written
2026-10-16 in plan 86 step 0. When the plan is finished, this file and the wrappers retire with it (step 7).

The one running the session (Opus 5.5, extra-high) writes every brief, reads every change before it lands, lands,
and decides anything unclear. The helpers below do the rest. The plan's § 7 says why each model was picked.

## Who does what

| Role | Model and effort | Step | Does | Never |
|---|---|---|---|---|
| `cleanup-reader` | Haiku 5.5, high | 2 | Reads 10 to 20 named files and writes down facts about each | Edits code or documents; guesses |
| `cleanup-area-reviewer` | Sonnet 5.5, high | 2 | Turns one area's reader answers into the lists step 2 asks for | Edits code; deletes or moves anything |
| `cleanup-mover` | Haiku 5.5 high (on trial) or Sonnet 5.5 medium | 4, 5 | Applies a given move list with the move tools, one area per commit | Changes code beyond what the tools change |
| `cleanup-removal-lane` | Sonnet 5.5, high | 3 | Removes one feature from an exact list | Removes anything not on its list without saying so |
| `cleanup-first-look` | Haiku 5.5, high (on trial) | landings | Reports what a helper's branch changed and whether its checks passed | Decides whether it lands |

Bookkeeping stays with the `bookkeeper` (Sonnet 5.5 medium) and Deck checks with the `deck-driver`.

## Rules for every helper

1. **Your copy.** Your task names the absolute path of your copy of the repo and the commit it was cut from. First
   act: confirm the copy is based on that commit (`git merge-base --is-ancestor <commit> HEAD`). If not, stop.
2. **Absolute paths inside your copy, always.** Never write into the shared checkout. Scratch files go in your copy's
   `.scratch/` folder, never the system temp folder another helper may share.
3. **Install nothing.** The copy's packages folder is a link to the shared checkout; an install damages it.
4. **Light checks only.** The type check (`npx tsc --noEmit`), your own test files by name (screen:
   `npx vitest run <files> --maxWorkers=2`; back end: the modules you touched), and the cheap checks
   (`python scripts/check_headers.py --level full`, `python scripts/ratchet.py check`,
   `python scripts/growth_limit.py`, `node scripts/check-focus-patterns.mjs` when `src/` changed). Never
   `verify.py --quick` and never a full test set: the session runs those once, at landing. End every test process
   you start.
5. **One change per commit, and moving never shares a commit with changing.** Stage files by name. Never
   `git add -A`, `git stash`, `git push`, `git rebase -i`, or a reset.
6. **Your task lists your files exactly.** A change that needs a file outside the list: stop and say so.
7. **Something is allowed to stay.** A list of findings is not a target to drive to zero. Keeping a thing because it
   is genuinely the clearest choice is a fine answer; say what you kept and why.
8. **Check every claim against the code before you write it down.** Write "unknown" rather than guess.
9. **Never edit** a roadmap file, `docs/testing*.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`,
   `docs/lessons-learned.md` or the plan. Put what they need in your report. **Haiku helpers never edit any
   document at all.**
10. **Commit messages** in plain language, ending with a `Co-Authored-By:` line naming the model you run on.
11. **Report at the end:** commit hashes and titles, tests added or removed (by name), anything outside your list,
    anything that surprised you, anything left undone. Short and factual.

## `cleanup-reader` (step 2)

You get 10 to 20 named files, the script-made facts about each (size, how much is explanation, who imports it, what
it imports, its tests, the features it mentions, when it last changed), the plan's list of features, and the
proposed folder list. Read each file and write one record per file to the output path your task names, in the
format your task gives:

- what the file is for, in one sentence;
- which feature it belongs to, from the list (or "shared", or "unknown");
- who uses it: confirm the script's list of importers, and name any user the script missed (a test, a script, a
  string path) with the line;
- anything unused or written twice, each with the file and line that shows it;
- which new folder it belongs in, from the proposed list, and how sure you are.

Never edit any other file. Keep your whole job under about 100,000 tokens: read what you were given, not the
whole repo.

## `cleanup-area-reviewer` (step 2)

You get one area's reader records and the script facts. Check a sample of the records against the code, then write
your area's part of each list step 2 asks for, into the file your task names under
`docs/audit/clean-up-round-three/`:

- for each removal in your area: every file and line it deletes or changes;
- the glossary move, if your area holds it;
- the folder map, file by file;
- test files to merge, by topic, and tests that check the code's text instead of what it does;
- the untangling targets: every place a setting is written, every D-pad helper and who uses it, every hand-down
  from the main screen;
- which scripts stay, move to the workshop, or retire.

Say which reader records you found wrong, and how. Never move or delete anything yourself.

## `cleanup-mover` (steps 4 and 5)

You get a move list (a tab-separated file of from and to paths) for one area. Apply it with
`node scripts/move_screen_file.mjs --map <file> --with-tests` or `python scripts/move_backend_file.py --map <file>`,
commit, then run `python scripts/check_move_commit.py HEAD`; it must pass. Then the type check and the moved files'
own tests. If a tool cannot do a move, or the check finds a change the tool made by accident, stop and report: never
fix it by hand in the same commit. One area per commit.

## `cleanup-removal-lane` (step 3)

You get one feature to remove and its exact list from step 2. Remove what the list says, keep what it says stays,
and list every test you delete by name (step 5 compares test names against the starting point). A setting that
goes must still load from an older saved settings file without an error: the saved value is ignored. Shared files
(the settings lists, the main screen, the back end's front door, the Developer and Permissions tabs, the AI's
instructions) land one helper at a time; put your change on top of what already landed when the session tells you
to. Report the plain-language sentence of what a player notices, and the Deck check you expect to pass.

## `cleanup-first-look` (landings)

You get a helper's branch, the commit it was cut from, its brief's file list and the landing log. Report: the
files changed per commit; any file outside the brief's list; whether each move commit passes
`python scripts/check_move_commit.py`; which checks the log shows passing or failing, with the lines. Read only;
never land, never decide. The one running the session decides.
