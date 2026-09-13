# Plan 51: Refactor round two

Written 2026-09-11 by the planning session (Fable, max effort, decisions only).
Status: **planned, not started.** Work begins only when the maintainer says the exact words
"start refactor implementation now". The maintainer's calls are D89 to D96 in
[the decisions file](../audit/maintainer-decisions-locked.md). This plan replaces the round-one
refactor plan at the repo root; that file carries a banner from today and moves to the archive in
phase 1.

Part A is for the maintainer and is written in plain words. Part B is for the agents that do the
work and names files, commands and numbers. Skip Part B unless you are running a session.

---

## Part A: for the maintainer

### 1. What this is

A clean-up of the whole project in seven phases: the code on both sides, the tests, the helper
scripts, the docs, and the way agents work here. A person using the plugin should notice nothing.
The maintainer's priorities, in order:

1. Spend as few tokens as possible.
2. Everything keeps working; fewer bugs.
3. Less code and fewer files, without losing features.
4. Every file and every long function explained in plain words.
5. A new maintainer, or a different AI tool, can pick the work up without relearning the traps.
6. Far fewer docs; the ones about finished work go to an archive and are deleted later.
7. Cheap workers running in parallel to save wall-clock time.

Two ideas carry most of the plan. First, scripts do everything mechanical and models only judge,
because a script costs nothing per run. Second, every number we care about goes into a list that
may only get better, checked on every run, so the project cannot drift back after the clean-up.

### 2. Where we start

Measured on 2026-09-09 on the experimental branch. These are the starting values for the list
of numbers that may only improve.

| What | Now |
|---|---|
| Front-end app code | 238 files, 43,301 lines |
| Front-end tests | 131 files, 17,821 lines, 1,123 tests, 27 seconds |
| Back-end app code | 60 files, 23,995 lines |
| Back-end tests | 96 files, 20,187 lines, 1,151 tests, 30 seconds |
| Helper scripts | 58 files, 14,885 lines |
| Files over 400 lines | 41 |
| The three giants | main backend file 3,256 lines; plugin root 1,642; ask hook 1,640 |
| Long front-end functions with no comment | 53 of 94 |
| Long back-end functions with no docstring | 6 of 51 |
| Copy-pasted lines in app code | 717, or 1.4% |
| Copy-pasted lines in back-end tests | 1,372, or 8.7% |
| Files with a purpose header | 278 of 298 |
| Import cycles | front end 0; back end 2 |
| Back-end methods the front end can call | 58, one with no caller anywhere |
| Front-end call names with no back-end method | 0 |
| Docs in the docs folder | 178, all touched within 90 days |
| The testing doc | 315 KB, about 80,000 tokens to read |
| The roadmap | 109 KB, about 27,000 tokens to read |
| The orientation file | 13 KB, loaded by every agent that starts |
| Committed device-run files | 464 |
| Copies of the repo lying around | about 36, of which 19 branches already merged |
| Cursor-only files | 18 tracked |

What the numbers mean for the plan: copy-paste is small, so "less is more" comes mostly from dead
code, the two giant docs, and the two files we split, not from merging functions. The test suites
are fast, so "run only the tests that changed" buys little. The docs are the biggest token sink:
the repo rule says update the roadmap and the testing doc before marking work done, so every
landing reads about 100,000 tokens of docs before it writes a word.

### 3. The phases

Each phase ends only when every check is green and the work is landed on the experimental branch.
That landing is the stopping point a session may end on. A session that runs out of budget finishes
the lane in flight, commits it in its own copy of the repo, writes the handoff note, and stops.

**Phase 0: Tools.** Build the things every later phase leans on: one verify command with a quick
and a full mode that prints only failures; the list of numbers that may only improve; a back-end
dependency map next to the front-end one; a helper that makes, lists and prunes copies of the repo;
the spawn line hook and the other two hooks; the Deck queue; the worker templates; the cost ledger.
Sonnet builds, Opus reviews. About one session. No Deck check.

**Phase 1: Docs diet.** Split the roadmap and the testing doc into a small current file and an
archive file each. Sort every doc into active, shipped, superseded or abandoned; a cheap model
proposes the list with a reason per doc, the maintainer confirms it once, the bookkeeper moves the
files and writes the archive index with a delete-after date. Shrink the orientation file and make
its counts generated. Make the neutral guide the one guide for humans and any AI tool. Remove
Cursor, keeping the two personas and the focus rule, corrected. Sort the helper scripts the same
way. Sort the committed device-run files. About two sessions. No Deck check.

**Phase 2: Map and measure.** Scripts produce the lists: unused exports, files and packages;
unused back-end code, with the callable methods and test hooks on an allowlist; exact duplicates;
long functions without comments; files without headers; the places a setting is repeated. One
Opus session reads the summaries only and writes the decision list for the maintainer: what to
delete, what to merge, what to leave. The seams between work packages are named here so phase 4
can freeze them. About one session. No Deck check.

**Phase 3: Delete.** Remove what the maintainer approved: dead exports and files, the one
back-end method nobody calls, exact duplicates, dead helper scripts. One commit per cluster, so a
break on the device can be bisected. Sonnet lanes, Opus lands. Deck check at the end: the smoke
walk and one real question. About one session.

**Phase 4: Reshape.** The only phase that changes the shape of the code. First break the two
back-end cycles. Then Opus writes the freeze commit: the types and function signatures at every
seam, unchanged from then on. Then the lanes work leaves first, roots last: split the main backend
file along the lines round one already mapped, split the ask hook, declare each setting once so a
new setting stops touching 18 files, and generate the list of back-end method names into the front
end so a typo fails the type check. Near-copies are merged only where the maintainer's list says
so. Sonnet lanes do the moves with scripts that rewrite imports; Opus does every step that touches
behavior, focus or settings. Deck check at the end: the full QA batch through the queue. Three to
four sessions.

**Phase 5: Explain.** After the code stops moving, so nothing goes stale. Rewrite every file
header in plain words at the length the file needs, add the twenty missing ones, and put a short
note at the top of every long function: inputs, output, what can go wrong. Cheap workers in
batches of eight to twelve files, up to six at once; Sonnet checks one batch in five. A script
gathers every header into one generated map of the code. Short Deck smoke at the end. About two
sessions.

**Phase 6: Handoff.** The README and the neutral guide rewritten in plain words; the lessons that
today live only in Claude's memory on this machine moved into a repo doc any tool can read; the
personas in their neutral form; a postmortem with the real cost per phase from the ledger; the
roadmap and testing doc updated; the old plan archived if it is not already. About one session.

### 4. Rules that hold in every phase

- **One refactor per commit, behavior preserved.** A worker that finds a bug writes a roadmap entry
  and does not fix it inside a refactor commit. This is what keeps bisecting possible.
- **Lanes never edit the roadmap, the testing doc or the changelog.** The bookkeeper does, after
  a landing. This is also what keeps merges conflict-free.
- **All refactor work happens in a separate copy of the repo.** Only the landing session touches
  the shared checkout. Copies are made by the helper from the current tip, and the merge step
  refuses a branch whose base is far behind.
- **Freeze before you move.** In phase 4, nothing moves until the seam contracts are committed.
- **Cheap before expensive.** A script answers what a script can answer. A worker gets exact lines
  to look at, one question, a tool-call cap and a token cap, and reports in the fixed shape.
  Never open a file whole when a range will do.
- **No new abstraction without three existing call sites** that collapse into it.
- **Living docs never carry hand-typed counts or line numbers.** Dated audit docs may.
- **Feature work continues alongside.** A feature branch starts from the tip right after the
  latest landing and rebases over the moves. The delete and reshape phases land in small commits,
  and every landing lists its moved files in the session notes, so a rebase stays small.
- **The list of numbers may only improve.** The verify command fails if any number gets worse.

### 5. Who does what

| Work | Model |
|---|---|
| This plan and the decisions; the review at the end of each phase | Fable at max, this session only |
| Running each phase, landing, the freeze commit, every behavior-touching step, anything touching focus or settings | Opus at extra-high effort |
| Lanes for mechanical work, tooling scripts, docs triage, tests, the merge step, the bookkeeper | Sonnet at high effort |
| Sorting docs by status, existence checks, header drafts for small files, one batch in five checked by Sonnet | Haiku, on trial, every use logged |
| Everything mechanical: maps, duplicate finding, dead-code finding, moves, log filtering, budget checks | Scripts |

Earlier sessions measured that running Fable at max was behind most of the usage-limit hits. Fable
does not run execution sessions.

### 6. Watching the budget

The **spawn line** is the share of the five-hour window past which no new agent may start. It is
75% to begin with, one number in the project settings, and the maintainer changes it by saying
"raise the spawn line to 85". The number is the same one the usage screen shows and it is
account-wide, so other chats and projects count against it, which is the right behavior.

A hook enforces it: past the line, a request to start an agent is refused with a plain message,
the lane in flight finishes and commits, the session lands what is green, writes the handoff note
and stops. A phase starts only when usage is below half the spawn line, because a phase started
at 70% is cut off mid-flight. Every worker's tool calls and tokens are written to a ledger from its
completion notice, so the postmortem has real numbers.

### 7. The Deck

On-device checks are the standard; nothing else counts as proof that focus or layout still work.
Because only one thing may drive the Deck at a time, checks go through a queue: lanes add rows, one
runner takes them in order, holds the wake lock for the batch, runs the ready check before each row,
and releases the lock after. The ready check earned its place on 2026-09-09 by catching a build
mismatch before a single press.

The in-IDE preview is shelved. It has never got past its loading screen on this machine, so it is
not a gate and nothing in this plan depends on it.

### 8. What is shelved or out of scope

- The preview and its test suite: shelved until it loads. Sorted with the other tooling in phase 1,
  not fixed here.
- ESLint: not added. Ruff for Python is added because it is fast and finds unused code as a bonus.
- Merging near-copies without a written decision: not done. Only exact copies and "same shape, one
  value differs" merge on their own.
- Splitting the plugin root and the six components over 950 lines: not this round. They get a
  thorough header and a "split later" roadmap entry each.
- Cursor: dropped entirely.

### 9. What the maintainer must do

1. Say "start refactor implementation now" when ready.
2. Say whether to commit the two tool fixes made on 2026-09-11, one in this repo and one in the
   plugin-studio checkout. They are uncommitted until you say so.
3. Reload VS Code, or reconnect the MCP servers, so the fixed Deck tools load before the next
   device session.
4. Run the copy-pruning script once, or allow it, so the stale copies of the repo go away.
5. Start each execution session on Opus at extra-high effort. The routing hook nags otherwise.
6. Keep other chats off this checkout and off the Deck while a phase is landing. Feature work
   continues: start each feature branch from the tip after the latest landing, and expect to
   rebase it over the moves.
7. Confirm two lists when they arrive: the docs archive list at the end of phase 1 and the delete
   and merge list at the end of phase 2.
8. If the spawn-line script cannot read the usage figure by itself, read the usage screen once
   when asked and say the number.
9. Have the Deck free for three phase-end checks of about half an hour each.

Nothing else is needed: no accounts, no pushes, no purchases.

### 10. Risks and the catch for each

| Risk | Catch |
|---|---|
| A behavior change slips into a refactor commit | One refactor per commit, the Deck gates, and bisect |
| A dead-code tool flags something that is called by name | The allowlist from the generated call map, and the maintainer confirms the deletion list |
| The docs split loses content | The split is a move; a script checks that every row and heading landed in one of the two files |
| A copy of the repo starts far behind | The helper makes copies from the tip; the merge step refuses old bases |
| The budget runs out mid-lane | The spawn line, the phase-start floor, and lanes that commit in their own copy |
| A worker wanders and burns tokens | One question, exact lines, tool-call and token caps, the fixed report shape, the ledger |
| A stale comment after phase 5 | Headers describe purpose and flow, never counts; the verify command checks that named functions still exist |
| Someone starts new work from the old plan | The banner on it today; archived in phase 1 |
| A feature branch collides with a move | Small landings, the session notes list every moved file, feature branches start from the latest tip |

---

## Part B: for the agents

Technical specifics. File paths and commands are deliberate here.

### B1. The verify command (phase 0)

`python scripts/verify.py --quick` and `--full`. Cross-platform, Python only, no new packages.

- Quick: `npx tsc --noEmit`; `npx vitest related <changed files> --run --reporter=dot` where the
  changed files come from `git diff --name-only HEAD` plus untracked; the full Python suite whenever
  any `.py` changed (it takes 30 s, so no impact analysis is built for it); the header check; the
  ratchet check. Target under 90 seconds.
- Full: quick plus `npm test`, `npm run test:py`, `npm run build`, `npm run mcp:validate`.
- Output: only failures, at most 40 lines, failing test names and the assertion text, tracebacks
  cut to the last 8 lines each. Non-zero exit on any failure. A `--json` flag prints one object
  for headless workers.
- Runs as the pre-commit quick gate in lanes; the merge step runs full.

### B2. The ratchet (phase 0, values from 2026-09-09)

`scripts/ratchet.json` holds the current best value per metric; `scripts/ratchet.py` measures and
compares; verify fails if any metric got worse; the file is updated only by the landing session
after a phase. Deterministic scripts only.

| Metric | Start | Target | Measured by |
|---|---|---|---|
| Files over 400 lines (app code, both sides) | 41 | 30 after phase 4, then hold | line count |
| Outermost front-end functions over 60 lines with no leading comment | 53 | 0 after phase 5 | TypeScript compiler API, script from this session |
| Back-end functions over 60 lines with no docstring | 6 | 0 | `ast` |
| Copy-pasted lines, app code | 717 | 350 | jscpd, min-tokens 50 |
| Copy-pasted lines, back-end tests | 1,372 | 700 | jscpd |
| Unused exports and files (front end) | measure in phase 2 | 0 | knip |
| Import cycles, back end | 2 | 0 | the back-end map |
| Import cycles, front end | 0 | 0 | import-graph.json |
| Raw `call()` sites outside the four allowed | 0 | 0 | grep |
| Files without a purpose header | 20 | 0 | header check |
| Front-end call names with no back-end method | 0 | 0 | the RPC map |
| Back-end methods with no caller | 1 | 0 after phase 3 | the RPC map plus grep |
| Places the settings field list is repeated in the settings hook | 7 | 1 after the registry | grep |
| Living doc size: roadmap / testing / orientation / neutral guide | 109 / 315 / 13 / 9 KB | 40 / 60 / 8 / 12 KB | byte count |
| Live docs mentioning Cursor | 6 | 0 | grep |

### B3. Tools to add and their allowlists

- `jscpd` and `knip` as dev dependencies (pnpm). `ruff` and `vulture` for Python (pip, pinned in
  a `requirements-dev.txt`; not shipped to the Deck).
- `ts-morph` as a dev dependency for moves with import rewriting. Every move is a script run,
  never a hand edit.
- Allowlist for the back end: every public `async def` at indent 4 on `class Plugin` (called by
  name from the front end) and every test hook the harness calls. Generated from `main.py` by the
  existing architecture generator, never hand-written.
- Allowlist for the front end: exports the preview harness or the test harness calls by name.
- Searches must exclude `.claude/worktrees/`, `node_modules/`, `dist/`, `docs/archive/`.

### B4. The back-end dependency map (phase 0)

`scripts/py_import_graph.py` writes `packages/bonsai-mcp/knowledge/architecture/py-import-graph.json`
with the same shape as the front-end map (modules, edges, cycles, leaves, fan-in). Wired into the
pre-commit hook next to the existing generator. The two cycles today: the voice daemon with the
voice transcription service; and a ring of four around the input sanitizer service (shortcut
setup, VAC check, ask local commands, input sanitizer).

### B5. The copy helper (phase 0)

`scripts/worktree.py create <name> [--base experimental]` makes a copy under `.claude/worktrees/`
from the current tip, records the base commit in a `.base` file, runs `pnpm install --offline
--frozen-lockfile`. `list` shows each copy with its base distance. `prune` removes copies that are
merged into experimental, clean, and untouched for 24 hours, and deletes their merged branches.
The session's prune script from 2026-09-11 is the starting point.

### B6. The hooks (phase 0)

All in `.claude/hooks/`, wired in `.claude/settings.json`.

- `spawn-line.py` on PreToolUse for `Agent` and `Workflow`. Reads `BONSAI_SPAWN_LINE` (default
  75). First choice for the usage figure: the same source the usage screen reads; test in phase 0
  whether a script on this machine can read it. Fallback: sum the usage fields of every message in
  the last five hours across `~/.claude/projects/*/*.jsonl` and divide by
  `BONSAI_FIVE_HOUR_TOKENS`, calibrated once by the maintainer reading the usage screen. Past the
  line: deny with a plain message naming the percentage. `--status` prints the figure for the
  session runner; a phase starts only below half the line.
- `no-push.py` on PreToolUse for `Bash`: deny any `git push` unless `BONSAI_ALLOW_PUSH=1`.
- `read-range.py` on PreToolUse for `Read`: when the file has more than 600 lines and no range
  was given, allow but add a reminder to read a range or grep first. A reminder, not a refusal.

### B7. The Deck queue (phase 0)

`scripts/deck_queue.py add|list|next|done`, state in `.decky/deck-queue.json` (git-ignored). One
runner agent per batch: `deck_holdAwake` once; before each row `deck_checkReady` with
`awake`, `buildMatches`, `noForeignCdpTunnel` and `pluginOpen: "bonsAI"` with
`rootSelector: ".bonsai-scope"`; run the row; copy any evidence a testing row cites into
`docs/test-evidence/`; `deck_restorePowerSettings` at the end.

Known facts, learned 2026-09-09 to 2026-09-11:

- Button names for `deck_runSequence` and `deck_pressButton`: `UP DOWN LEFT RIGHT A B X Y LB RB
  SELECT START GUIDE L3 R3`. Not `DPAD_DOWN`.
- `deck_openPlugin` returns about 4,000 tokens of focus dump when the panel is already open. Ask
  `deck_checkReady` with `pluginOpen` first; it answers in a few lines.
- `deck_runSequence` writes an evidence file only for a named run, after the plugin-studio server
  is restarted with the 2026-09-11 fix. The `runs/` folder is git-ignored from that date.
- The Deck recorder is fixed in `scripts/deck/bonsai-record.sh` and in both copies inside the
  plugin-studio checkout: it addresses the compositor's video node by numeric id; the by-name path
  connects but never delivers a frame. A recording only contains frames while the screen changes.
- The compositor capture, run by hand, is one `gst-launch-1.0` pipeline with
  `pipewiresrc target-object=<node id>`; the id comes from `pw-cli ls Node`.
- The Deck sleeps during pauses unless `deck_holdAwake` is held; release it after every batch.

### B8. Header format and checker (phase 5, checker in phase 0)

Keep the existing labels as the skeleton, rewritten in plain words, at the length the file needs:

```
Title:      one line
Purpose:    what this file is for and how it fits; three to six sentences for a small helper,
            a paragraph for a normal file
Used for:   who calls it, in words
Solves:     the problem it exists for
Does not:   what a reader might expect here that lives elsewhere
How it works:  big files only (over 400 lines, or more than one job): the main flow, numbered,
            naming the functions in order, as long as it needs
Gotchas:    only when there are any: known traps, why odd code is the way it is
```

Python files use the same labels in the module docstring. Long functions (60 lines and up) get
two or three sentences at the top: inputs, output, what can go wrong; a numbered step list above
120 lines. Names of files and functions are allowed inside code comments. Headers never carry
counts or line numbers.

`scripts/check_headers.py`: every app file has `Purpose:` in its first 60 lines; every file over
400 lines also has `How it works:`; every backticked function name in a header exists in that
file. `scripts/code_map.py` gathers Title and Purpose from every header into
`docs/code-map.md`, generated, never hand-edited.

### B9. Docs triage (phase 1)

Status classes: **active** (kept), **shipped** (describes finished work; archive), **superseded**
(a later doc replaced it; archive), **abandoned** (never done or wrong path; archive, delete
after 90 days). Age is not a signal: every doc was touched within 90 days.

`docs/archive/INDEX.md`: file, status, archived on, delete after, one-line reason.
`scripts/docs_archive.py list-overdue` prints entries past their date; deletion happens only when
the maintainer says yes to that list.

The giant docs: the roadmap keeps its house rules and the open Bugs, Features, Verify and
Knowledge-base sections; the Done section moves to `docs/archive/roadmap-done-v0.5.0.md`. The
testing doc keeps the rows for open Verify items and the current QA batches; closed rows move to
`docs/archive/testing-closed-2026.md`. A script counts rows and headings before and after so the
split is a move, not a loss. The rule to update both before marking work done stays.

The orientation file: under 8 KB, no hand-typed counts; a generated facts block (file counts,
test counts, RPC count, giant sizes) written by the architecture generator. The neutral guide
becomes the one "how to work here" for humans and any AI tool that reads `AGENTS.md`; the
Claude file keeps only hooks, agents and Claude-specific commands.

The 464 committed run files under `runs/`: keep the ones a testing row cites by moving them to
`docs/test-evidence/`; the rest leave git. The 58 helper scripts get the same four statuses.

### B10. Cursor removal (phase 1)

Tracked files to delete after the moves: `.cursor/BUGBOT.md`, `.cursor/agents/SUBAGENT_REPORTS.md`,
`.cursor/agents/master-debugger.md`, `.cursor/agents/refactor-specialist.md`, `.cursor/hooks.json`,
the three scripts under `.cursor/hooks/`, `.cursor/mcp.json`, the three rules under
`.cursor/rules/`, the four skills under `.cursor/skills/`, and
`scripts/cursor-deck-log-capture.example.ps1`.

Moves first: the focus-graph rule is rewritten into the neutral guide with the two corrections in
[the focus-rule review](../archive/focus-rule-review-2026-09-11.md); each skill's content is
compared against the guide and anything missing is folded in; the FOSS advocate and the security
auditor become neutral bodies at `docs/agents/foss-advocate.md` and
`docs/agents/security-auditor.md` (sections: Role, Stance, Checklist, Output shape, Never do),
with five-line wrappers in `.claude/agents/` that pin the model and tools and say "follow the
body". Cursor mentions come out of `docs/development.md`, `docs/mcp-setup.md`, `docs/testing.md`,
`docs/roadmap-details.md`, `docs/roadmap.md` and `tests/preview-suite/README.md`; the changelog
and the archive keep theirs. Decide in phase 1 what reads the root `mcp.json` before touching it.

### B11. Worker templates (phase 0)

Lane brief, in this order: goal in one sentence; the exact files and line ranges; what must not
be touched (docs, the Deck, other files, pushes); the checks to run (`verify.py --quick` before
each commit); the report shape below; caps (tool calls, tokens); the known facts from B7 when the
Deck is involved; the model and effort.

Report shape, nothing else:

```
RESULT: done | partial | blocked
COMMIT: <hash or none>
FILES: <paths>
CHECKS: quick pass|fail ; full pass|fail|not run
LEFT UNDONE: <one line each>
COST: <tool calls> calls, <tokens> tokens
```

The ledger `docs/audit/refactor-round-two/ledger.md` gets one row per worker: date, phase,
worker, model, tool calls, tokens, result. The session notes file
`docs/audit/refactor-round-two/session-notes.md` gets the handoff paragraph at every stopping
point.

### B12. Phase 4 order and the freeze

1. Break the two back-end cycles (Opus).
2. The freeze commit (Opus): the exported types, interfaces and function signatures at every seam
   named in phase 2, plus the settings contract JSON and the RPC method names, all unchanged from
   then on. Lanes fill in behind the seams without talking to each other.
3. The main backend file, along the destinations and risk order in
   [the round-one inventory](../archive/07-mainpy-inventory.md). RPC names do not change.
4. The ask hook, along its own seams from phase 2.
5. The settings registry: one declaration per setting that state, snapshot, hydrate, reset,
   debounce deps, the returned object and the save snapshot all derive from; the two contract
   JSON files keep asserting both languages.
6. The generated RPC name type: the architecture generator writes the method names into a
   front-end type, and the call wrapper accepts only those names.
7. Any remaining moves, leaves first, roots last, by `ts-morph` script; Python moves by script with
   grep-verified imports.

Lanes: at most three for behavior-adjacent moves; up to six for purely scripted passes. Each lane
commits in its own copy; the merge step runs `verify.py --full` and bisects on a failure.

### B13. Session bootstrap for every execution session

Read, in this order and nothing more: this plan's Part B, the phase's section, the session notes
file, the ledger's last ten rows, and the decision list for the phase. Then check the spawn line.
Do not read the roadmap or the testing doc unless the phase is the docs diet.

### B14. Cost rules for workers

Script the checkable part first and hand the model only the misses. One question per worker with
the exact lines. A tool-call cap and a token cap in every brief; the worker stops at the cap and
reports what it could not check. Haiku for existence and wording checks, Sonnet for judgment.
Fixed-shape answers. Continue an existing worker with a message instead of spawning a new one.
Batches of eight to twelve files per worker, never one file per worker. Reference point from this
session: a "check every claim" review of a 27-line rule cost 62 tool calls and about 130,000
tokens because the brief let the worker follow every pointer.
