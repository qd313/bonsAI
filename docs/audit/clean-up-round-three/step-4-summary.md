# Plan 86 step 4: a folder per feature

Done 2026-10-17, one evening, on `experimental` from `bdbb7d3d` to `a1b00906` (26 commits). Run by one Fable 5.1 chat
with the maintainer's go, with Sonnet 5.5 helpers for the preparation and the move checker, and the `cleanup-mover`
helper on Haiku 5.5 high for the moves. Nothing pushed. The plan's log is
[plan 86 § 12](../../planning/86-clean-up-round-three.md#12-progress-log).

## In plain words

Nothing changed for a player. The plugin does exactly what it did; only the files moved.

- **Where things are now.** The back end's one big `services/` folder is split into one package per feature under
  `py_modules/backend/` (core, characters, power, strategy, prompts, spoilers, answer, ollama, voice, media, settings,
  commands, chats, ask, knowledge, notes, search). The screen's files sit in one folder per feature under
  `src/features/`. The eight knowledge scripts are in `scripts/kb/`, and the Deck restart script is in `scripts/deck/`.
  In all, 920 files moved.
- **How to find a file now.** Search by its name, not by a folder you remember. The guides (`AGENTS.md` and
  `docs/development.md`) describe the new layout.
- **Two name-finding helpers** keep the tests from breaking when a file moves again. `src/test-harness/repoPaths.ts`
  finds a screen source file by its name for the screen tests, and `tests/src_paths.py` does the same for the Python
  tests. A third, `tests/script_loader.py`, loads a script by its name. The five knowledge scripts also find the repo
  root by looking for `main.py`, and each other by name.
- **Old paths in history stay as they were.** Older changelog entries, the README and the history folders still name the
  old places on purpose.

## What the maintainer needs to do

1. **Push `experimental`** when you are happy. Nothing else is needed from you.
2. **Old helper copies** under `.claude/worktrees/` can be pruned with the worktree helper's own steps. Never use
   `git worktree remove` on them.

The Deck check passed; its result is in the technical summary below.

## Technical summary

### The commits, by group

| Group | Commits | What |
|---|---|---|
| Screen tests find files by name | `f81655af`, `49ed21cf` | `src/test-harness/repoPaths.ts`; 18 screen tests no longer depend on folder depth |
| Python tests and scripts find files by name | `b42fd60e`, `273d5104`, `bc9e7e14`, `bdbb7d3d` | `tests/src_paths.py`; the five knowledge scripts find the repo root by `main.py` and each other by name; `tests/script_loader.py`; the zip check and the tool server's size ranking stop naming `services/` as a whole |
| Move checker fixes | `6257ee70`, `bbfefdea`, `441cf2c7`, `daa48326` | see below |
| Back end (16 moves, `scripts/move_backend_file.py`) | core `bff8567e`, characters `858b0216`, power `afd14960`, strategy `d9363b1e`, prompts `83f0d39f`, spoilers `b1c5c548`, answer `e4dbba42`, ollama `d22a145d`, voice `5b8a6f63`, media `74ec4e9c`, settings `144d1c9f`, commands `2a77d977`, chats `752bd717`, ask `a20eaaea`, knowledge (one file) `ad7390fb`, the knowledge area (knowledge, notes, search) `2a372c4c` | 127 files moved; the 2,582 back-end tests named from the moved files passed at the end |
| Screen and scripts (5 moves, `scripts/move_screen_file.mjs`) | the eight knowledge scripts into `scripts/kb/` `9c2b43ce`; knowledge, search and notes (49 files) `c7d8ff2c`; tabs, settings and models (305) `69cf0a03`; ask, answer and chats (430) `8f7be517`; the Deck restart script into `scripts/deck/` (1) `74c96511` | The type check was clean after each screen commit; the moved tests passed: 146, 980 and 2,857 |
| Guides | `a1b00906` | AGENTS.md's table and import sentence, docs/development.md's screen and back-end sections, the back-end package notes, the tool server's platform contract; AGENTS.md trimmed to stay under its 26 KB ceiling |

The groups above are listed by kind; the exact landing order is in `git log bdbb7d3d..a1b00906`.

### The move checker needed four fixes

`scripts/check_move_commit.py` was fixed four times on the way, each a separate commit with tests (Sonnet 5.5 medium,
the last on Sonnet high):

- `6257ee70`: an added `__init__.py` with no code is part of a move.
- `bbfefdea`: the short path forms the back-end tool rewrites are blanked too.
- `441cf2c7`: the `py_modules.` prefix is mapped.
- `daa48326`: a from-import split over two lines pairs up.

With the finished checker, 20 of the 21 move commits print ok. The one it still flags, `8f7be517`, reports only the five
folder links in `docs/development.md` (`../src/components/` and the like). A link to a folder cannot be rewritten by any
tool, so `a1b00906` replaced them by hand.

### The whole range

920 files renamed, 17 added, 349 edited for paths. A search of every tracked file for every old path finds none
(history folders, CHANGELOG.md and README.md are left as written on purpose).

### The checks that ran

The full gate (`verify.py --full`) at `a1b00906`: PASS, 224.6 seconds, exit code 0: the type check, every screen test,
every back-end test, the headers, ratchet, growth and closed-rows checks, the production build and the tool-server map
check. The Deck check, at `a1b00906` on the live screen (the monitor, 855 x 766; evidence `workshop:test-evidence/plan86-S4-*.json`): PASS. The back-end log has no error after the move. All seven tabs open and draw every section and row (Ollama 5 sections, Settings 8, Permissions 4 switches, Developer 5, About its version and links; the Developer tab switched on and off). One question was answered in 26 s, with Show details naming gemma4:e2b-it-qat and the note "Charms and notches". The free-play sweeps on all seven tabs had no dead press, no loop and nothing behind the dock; the partly hidden stops are the known ones (section lines at 92 %, the chat name row at 83 %, the About link text). UNCLEAR, and not caused by the move: the saved plan 94 walks could not be replayed like for like (different chat and switch states); on Main one chip read 67 % visible and one answer stop had no label.
