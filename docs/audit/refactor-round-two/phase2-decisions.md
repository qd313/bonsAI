# Phase 2: what the tools found, and what to decide

Written 2026-09-13. Part A is for the maintainer and is meant to be read straight through. Part B
holds the paths, names and contracts the later phases need.

Every number here came from `python scripts/phase2_map.py`, which writes its working out to
`docs/audit/refactor-round-two/phase2/`. Nothing has been deleted or changed. This document only
asks for decisions.

---

## Part A: for the maintainer

### The short version

Twelve decisions. Nine of them I have a clear recommendation for, and three need you.

| # | The question | My recommendation | Effort |
|---|---|---|---|
| A1 | 43 names in the front end that nothing anywhere mentions | Delete | ★ |
| A2 | 18 pieces of back-end code that nothing calls | Delete | ★★ |
| A3 | An older, separate way of asking the AI about a game | **Your call** | ★★★ |
| A3b | An answer-checking feature that was built and never switched on | **Your call** | ★★ |
| A4 | Two values passed into a function and never read | Delete | ★ |
| A5 | Four packages listed as needed that may not be | **Your call** — needs a build test first | ★★ |
| A6 | Two menus that share 74 lines of the same code | Merge | ★★ |
| A7 | One setting has to be written out in five separate places | Merge, but in phase 4, not now | ★★★★ |
| A8 | Big repeated blocks inside single test files | Merge | ★★ |
| A9 | Two back-end methods that look unused and are not | Leave, and stop the check flagging them | ★ |
| A10 | 103 places where a name is shared out but never used elsewhere | Tidy up, low priority | ★★ |
| A11 | 17 pieces of back-end code that only the tests use | Leave for now, revisit in phase 3 | ★ |

Two things also need saying that are not decisions, in "Three numbers were measuring the wrong
thing" below. They matter because two of the clean-up's targets were set against them.

---

### 1. Things to delete

#### A1 — 43 names nothing mentions (★, front end)

The checking tool reported 153 names that the app shares out but never uses. That headline number
is misleading, and taking it apart was the most useful thing this phase did. It is really four
different situations:

| What it actually is | How many | What has to be done |
|---|---|---|
| Used only inside its own file | 103 | Remove one word. Nothing else changes. |
| Nothing anywhere mentions it | 43 | Really delete it |
| Passed straight through from another file | 7 | Remove the pointless middle step |
| Only a test names it | 5 | Decide whether the test is worth keeping |
| Named somewhere else after all | 2 | Look by hand |

Only the 43 are dead code. They are spread thin — a leftover icon, some sizes for a tab strip that
was rebuilt, a few defaults that moved elsewhere. None of them is big. Deleting all 43 is a small,
safe job.

**A correction worth stating plainly: not one whole file can be deleted.** Going in, the plan
assumed a pile of dead files. There are none. Every file the tool pointed at is a live file that
happens to carry an extra unused name. That changes what the delete phase is: it is trimming, not
demolition.

#### A2 — 18 pieces of back-end code nothing calls (★★)

The tool first reported 96. Cross-checking each one against the rest of the project ruled out 59
of them: some are names a library reads for us, some are used by another back-end file, some are
the entry points the plugin loader calls. Of the 37 left, 18 are genuinely called by nothing.

The clearest one: a small file for saving and loading data holds two functions, 69 lines between
them, and nothing in the project imports it. The whole file can go.

The more interesting one is a feature that was built and never switched on. There is a 153-line
piece of back-end code whose job is to double-check an AI answer before it is shown — catching an
invented game name, that sort of thing. It works, and it has its own test. But nothing calls it.
It was meant to feed a field in the record of how an answer was produced, and that field is filled
in by a value nobody ever supplies, so it is always empty.

So: the plugin has an answer-checking feature that has never once run. That is not a tidiness
question, it is a "did we mean to finish this?" question. **Worth a look from you before it goes.**
It is also the only thing in this phase that could be described as a missing feature rather than
leftover mess.

#### A3 — an older, separate way of asking the AI (★★★, your call)

There are two ways in the back end to ask the AI about a game. The one the app uses starts the
question in the background so the screen stays responsive. The other answers straight away and
makes the caller wait. Nothing in the app calls the second one.

It is about 150 lines. Deleting it is the single biggest tidy-up available. But it is a whole
answer path, and if you ever wanted a quick synchronous ask — for a script, or a test rig —
that is what it is.

I lean towards deleting it, because two paths that do the same thing drift apart and then one of
them has a bug nobody notices. But it is a behaviour question, not a tidiness one, so it is yours.

#### A4 — two values passed in and never read (★)

Two functions take something the caller works out and hands over, and then never look at it. One
is in the code that builds the wording sent to the AI, one is in the screenshot handling. Removing
each means also removing what the callers pass. Small and safe.

#### A5 — four packages that may not be needed (★★, your call, and a build test first)

The tool listed six packages the project says it needs but never imports. Two of those it is wrong
about: our own measuring scripts run them as commands rather than importing them, which the tool
cannot see. The other four are:

- the old name of the Steam Deck interface library — the project moved to the new one
- some type definitions for a bundler this project does not use
- a helper library for older-style compiled output
- the Linux build helper for the machine that actually builds the plugin

The first two look safely removable. The last one especially I would not touch without a build
test on the Deck — it is the piece that makes building on Linux work, and nothing imports a thing
like that by name. **Recommendation: remove the first two, and only remove the other two after a
build has been run and the plugin has started on the Deck.**

---

### 2. Things to merge

#### A6 — two menus that share 74 lines (★★)

The menu for picking how the AI should think and the menu for attaching things are 74 lines of the
same code twice. A third menu, for accent strength, shares another 39 with the first. These three
are the clearest merge in the whole project: one popup menu, three uses.

#### A7 — one setting written out in five places (★★★★, phase 4)

This is the big one, and it is exactly what the plan predicted, now measured.

There are 48 settings. **Five files each name all 48 of them**, and a sixth names 22. So adding one
new setting means editing at least five files. A typical setting is written out on nine separate
lines; the most tangled one is named on 115 lines across the project.

That is the cost of every new setting, paid every time, for as long as it stays this way. It is
also five chances to add a setting to one side and forget the other — which is why there are
already two tests whose only job is to catch exactly that mistake.

The fix is to declare each setting once and have everything else read from that declaration. It is
real work and it touches behaviour, so it belongs in the reshape phase with the contract frozen
first, not now.

#### A8 — repeated blocks inside single test files (★★)

The copy-pasted code is overwhelmingly in tests, not in the app. Three back-end test files repeat
large blocks inside themselves: 387 lines in one, 385 in another, 164 in a third. One front-end
test file repeats 193 lines across 18 places.

These are all one file repeating itself, which is the easy kind — a shared setup helper at the top
of the file fixes each one, with no risk to anything outside that file. Good work for a cheap
worker.

---

### 3. Things to leave alone

#### A9 — two back-end methods that look unused and are not (★)

The list of numbers says three back-end methods have no caller. One of those three does have a
caller: the back end calls it itself, from the code that handles a game question. If it were
deleted, asking the AI anything would stop working. The check only looks for calls coming from the
screen, so it cannot see that.

The second is a logging hook used when testing on the Deck and the Deck cannot reach the PC. It is
meant to have no caller in normal running.

**So the real figure is one, not three** — and the one is the older ask path in A3 above. The
check itself should be told about these two, so it stops reporting a problem that is not one.

#### A10 — 103 names shared out for no reason (★★)

103 names are marked as shareable but are only used inside their own file. Removing that one word
from each changes nothing about how the plugin behaves; it just stops the code claiming to offer
something nobody wants. It is the single biggest number in this phase and also the least
important. Worth doing, worth doing last, and worth doing with a script rather than by hand.

#### A11 — 17 pieces of back-end code only the tests use (★)

Seventeen back-end functions and values are called only by tests. Each is the same question: is
this a helper worth keeping and testing, or a test keeping dead code alive? That needs judgement
per item and it is not worth your time one by one. I would leave them and look again during the
delete phase, when it is clearer which of them sit next to something else being removed.

---

### Three numbers were measuring the wrong thing

This is the part I would most want you to see, because two of the clean-up's targets were set
against these.

**One. Copy-pasted code in the app is 877 lines, not 1,847.** The measure points at the folder
holding the screen code — and the front-end tests live in that same folder. So more than half of
what was being reported as duplicated app code is duplicated test code. The plan's target of 350
was set against an estimate of 717, and the phase 0 notes concluded the target needed resetting
because the real figure was two and a half times the estimate. That conclusion was wrong: measured
properly, the real figure is 877, and the original target is roughly right after all.

**Two. Copy-pasted code in the back-end tests is 2,076 lines of Python, not 2,286.** The rest is
repeated blocks in some saved test-run files, which are data, not code, and which nobody would
hand-edit anyway.

**Three. Back-end methods with nothing calling them is one, not three**, for the reason in A9.

None of these three is anybody's mistake in the ordinary sense — each measure does exactly what it
was written to do. They were named after what they were meant to measure rather than what they
point at. My recommendation is to correct all three definitions before the delete phase starts, so
nobody spends a session chasing a target that was never real. That means the saved "best" numbers
change, which the rules rightly treat as suspicious — so it needs saying out loud rather than
quietly done, and that is what this paragraph is.

---

### What I need from you

Three real decisions:

- **A3**: delete the older, separate way of asking the AI, or keep it?
- **A3b**: the answer-checking feature that has never run — finish wiring it up, or delete it? If
  you want it, that is a roadmap entry, not clean-up work, and I would file it rather than do it
  inside the refactor.
- **A5**: I remove the two clearly-dead packages now, and we leave the two risky ones until there
  has been a build and a start-up on the Deck. Agree?

And one thing to nod at:

- **Correcting the three measures above** so the targets mean what they say.

Everything else I would just do, in the order the plan already sets out. Nothing here needs the
Deck. Nothing here changes what a person using the plugin sees — the only two that could are A3
and A3b, which is exactly why they are yours and not mine.

---

## Part B: for the agents

### B2-1. Where the lists live

`python scripts/phase2_map.py` regenerates all of it. Per-list detail:

| File | Holds |
|---|---|
| `phase2/unused-exports.json` | `by_fix` groups every finding by the fix it needs; `by_file` holds the raw per-file detail |
| `phase2/unused-backend.json` | `needs_a_decision` (37, each with a `kind` and a `fix`), `ruled_out` (59, each with why) |
| `phase2/duplicates.json` | `top_pairs` per scope, ranked by shared lines, with the biggest fragment's line range |
| `phase2/long-functions.json` | 56 front-end, 7 back-end, longest first |
| `phase2/missing-headers.json` | the 20, grouped by folder |
| `phase2/settings-spread.json` | `lines_per_setting` and the files that know about every setting |
| `phase2/seam-candidates.json` | the 42 files over 400 lines with their in/out dependency counts, plus the cycles |

Re-run it after every landing in phases 3 and 4; the counts are the check that a step did what it
said.

### B2-2. The seams, for the phase 4 freeze

Phase 4 step 2 freezes these. Each row is a contract that must not change while lanes work behind
it. Sizes are the measured cost of getting it wrong.

| Seam | The contract | Size today | Frozen by |
|---|---|---|---|
| The RPC surface | 63 method names and their argument lists on `Plugin` in `main.py` | `main.py` 3,308 lines, 43 imports, nothing imports it | `rpc-map.json`, generated; phase 4 step 6 turns it into a front-end type |
| The settings shape | 48 setting names, their types and their defaults | 5 files name all 48; a typical setting sits on 9 lines | `tests/contracts/settings-defaults.json`, already asserted from both languages |
| The ask hook | the object `useBonsaiAskOrchestration` returns | **52 keys**, from a 1,639-line file whose main function is 1,464 lines | nothing yet — needs an explicit exported type before the split |
| The knowledge base service | what `knowledge_base_service.py` exposes to its 3 importers | 2,092 lines | nothing yet |
| The plugin shell | what `Content` in `src/index.tsx` hands down to the tabs | 1,709 lines, 67 imports; `Content` alone is 1,549 lines | nothing yet |
| Prompt building | what `ollama_prompts.py` exposes to its 6 importers | 1,572 lines | nothing yet |
| Voice | the pair `voice_transcription_service.py` / `voice_whisper_daemon.py` | 1,528 lines; **this is cycle 2** | break the cycle first (phase 4 step 1) |
| Local commands | `ask_local_commands`, `input_sanitizer_service`, `shortcut_setup_commands`, `vac_check_commands` | **this is cycle 1**, a ring of four | break the cycle first (phase 4 step 1) |

Four of these eight have no contract written down at all. Writing those four is phase 4 step 2 and
must happen before any lane moves code behind them. The ask hook is the urgent one: 52 keys is the
widest unfrozen seam in the project, and it is also the file phase 4 step 4 splits.

### B2-3. Measure definitions to correct before phase 3

Three entries in `scripts/ratchet.json` are named after something other than what they measure.
Each needs the definition corrected and the `best` value re-recorded in the same commit, with the
reason in the commit message:

| Metric | Measures now | Should measure | Value now → corrected |
|---|---|---|---|
| `duplicate_lines_app` | `src/` + backend, which includes `src/**/*.test.ts(x)` | app code only | 1,847 → 877 |
| `duplicate_lines_be_tests` | all of `tests/`, including JSON fixtures | Python test files | 2,286 → 2,076 |
| `be_methods_with_no_caller` | RPC names minus front-end call sites | the same, minus methods the back end calls itself and the debug hooks | 3 → 1 |

For the third, add `ask_ollama` (called by `game_ai_request.py`) and `dbg_fe_log` (a deliberate
device-debug hook) to an allowlist in the metric, with a comment saying why each is there. Do not
allowlist `ask_game_ai` — that one is a real finding, and decision A3 settles it.

The `target` values stay as they are. `duplicate_lines_app`'s target of 350 turns out to be a
sensible goal against the corrected 877, not the impossible one it looked like against 1,847.

### B2-4. Work packages for phase 3

In the order they should land, one commit each, each independently revertible:

1. The 43 unreferenced front-end names (A1). Script-findable, no behaviour change.
2. The 18 uncalled back-end pieces (A2), starting with `py_modules/backend/json_store.py` — the
   whole file, 69 lines, nothing imports it. Hold `response_verify.py` out of this package: it is
   decision A3b.
3. The two unused arguments (A4), each with its callers in the same commit.
4. The two clearly-dead packages (A5), with a build in the same commit.
5. `ask_game_ai` — only if A3 says delete.
6. `response_verify.py` plus the `verify_result` argument threaded through
   `transparency_service.build_*` — only if A3b says delete.
7. The 103 export-word removals (A10) — last, by script, one commit, nothing else in it.

Packages 1–4 do not touch each other and can run as separate lanes. Package 7 must go last because
it will conflict with any file another package edits.

Not in phase 3: A6 and A8 (merges, they belong with the reshape work), A7 (phase 4 step 5), A11
(revisit once 1–5 have landed and the neighbours are clearer).
