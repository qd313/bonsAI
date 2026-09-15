# BonsAI Refactor Plan

> **Superseded on 2026-09-11 by [Plan 51: Refactor round two](51-refactor-round-two.md).**
> Round one's finished items (3.1, 3.2, 3.4, 3.5) stay recorded below for history. This file moves to the
> archive in plan 51's docs phase; do not start new work from it.

**Goal:** a new contributor can find things and change them safely.

This is a handoff-driven refactor, not an architecture-improvement project. Every
decision below is judged against one question: *does this make the repo more
legible to someone who has never seen it?* Work that doesn't serve that — clever
generalization, speculative abstraction, architectural purity — is out of scope.

**Repo:** `C:\Users\still\Documents\BonsAI` — Decky plugin, TypeScript frontend
(`src/`, 281 files) + Python backend (`main.py`, `py_modules/backend/`).

**Planning docs:** active backlog → [docs/roadmap.md](../roadmap.md); locked
maintainer decisions and execution order →
[docs/audit/maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).

---

## Rules for the agent (apply to every phase)

1. **One refactor per commit.** Behavior-preserving. Tests green between commits.
   Never mix a move with a rewrite — it makes the diff unreviewable and `git bisect`
   useless when something breaks on-device.
2. **No new abstraction without 3+ existing call sites** that would collapse into it.
3. **Cite `file:line`** for every factual claim. Write `UNKNOWN` rather than inferring.
4. **Recon output goes to files, not chat.** `docs/audit/*.md`. Anything discovered
   once gets written down so the next session reads a summary instead of re-deriving it.
5. **Use `grep` / `git log -S` to establish call sites.** Read a file in full only
   when modifying it or when its logic is non-obvious. Do not survey the repo broadly.
6. **Scope each session to one vertical slice.** Fresh session per unit of work.

---

## Recon already completed

Don't re-derive these. Findings as of this plan:

**Dependency graph is clean.** `madge --circular` across 281 TS/TSX files found no
circular dependencies. This is a size-and-organization problem, not a tangled-imports
problem — the easier kind.

**Dead weight identified:**

| Item | Status |
|---|---|
| `src/v0-drafts/` (~57 files) | v0.dev scaffolding, zero importers. Full shadcn set + `layout.tsx`, `page.tsx`, `global-error.tsx`. ~20% of `src/`. **Delete.** |
| `src/config.ts` | Top-level, zero importers. Likely dead — **verify then delete.** |
| `refactor_helpers.py` (root, 17 churn) | Junk-drawer residue from a prior refactor. **Redistribute, don't merge.** |

*Note: test files, `test-harness/*`, `types.d.ts`, and `index.tsx` also appear in
madge's orphan list. These are false positives — ignore them.*

**Churn ranking (18 months, top items):**

```
94  docs/roadmap.md              33  README.md
81  src/index.tsx                33  package.json
72  main.py                      28  py_modules/backend/services/settings_service.py
52  docs/troubleshooting.md      27  src/hooks/usePluginSettings.ts
43  docs/testing.md              25  src/components/SettingsTab.tsx
42  src/utils/settingsAndResponse.test.ts   23  src/hooks/useBonsaiAskOrchestration.ts
42  src/components/MainTab.tsx   23  .cursorrules
41  CHANGELOG.md                 22  docs/prompt-testing.md
37  docs/archive/roadmap-completed.md       21  py_modules/.../game_ai_request.py
34  src/utils/settingsAndResponse.ts        20  packages/bonsai-mcp/knowledge/architecture/module-map.json
34  docs/development.md          17  refactor_helpers.py
33  tests/test_settings_service.py
```

**Diagnosis 1 — the settings cluster is the primary problem.** Six files, two
languages, ~189 combined changes for one concept:

```
settingsAndResponse.test.ts  42
settingsAndResponse.ts       34
test_settings_service.py     33
settings_service.py          28
usePluginSettings.ts         27
SettingsTab.tsx              25
```

Textbook shotgun surgery: "add a setting" is a six-file, cross-RPC edit. Two
supporting tells — the filename contains *and* (two concerns), and the test file
churns more than its source (42 vs 34), meaning tests are pinned to implementation
shape rather than behavior.

**Diagnosis 2 — both entry points are god files.** `index.tsx` (81) and `main.py`
(72) lead all code files. `py_modules/backend/services/` suggests an extraction from
`main.py` was started; at 72 churn it may have stalled halfway. A half-extracted
facade is worse for a reader than either endpoint.

**Diagnosis 3 — `docs/` is two artifact classes jammed together.** `roadmap.md` (94)
out-churns `index.tsx`. Add TODO, CHANGELOG, archive, SUBAGENT_REPORTS,
prompt-testing, regression-and-smoke → 350+ changes. That's agent working memory,
not documentation. Agent state and reader docs have opposite lifecycles and must be
physically separated.

**Diagnosis 4 — no `CLAUDE.md`.** `.cursorrules` exists at 23 churn, so Cursor has
had persistent project context while Claude Code starts cold every session.

**Still to run** (churn is only half of churn × complexity):

```powershell
Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.py |
  Where-Object { $_.FullName -notmatch 'node_modules|\.test\.|v0-drafts|\\dist\\|\\.git\\' } |
  Select-Object @{n='Lines';e={(Get-Content $_.FullName | Measure-Object -Line).Lines}}, Name |
  Sort-Object Lines -Descending | Select-Object -First 25
```

Also worth a look: `npx madge --warning --extensions ts,tsx src/` — 56 warnings were
reported and unresolved imports can mean orphan detection is under-reporting.

---

## Sequencing

**Descriptive docs before code. Explanatory docs after code.** Structure changes;
rationale doesn't. Docs-first fails because the code moves out from under them.
Code-first fails because the agent re-derives structure every session.

`Phase 0 → 1 → 2 → 3 → 4 → 5`
delete → instrument → describe → refactor → explain → postmortem

---

## Phase 0 — Delete

Nothing should be described that shouldn't exist. Permanent reduction in every
future session's search space.

> Verify `src/v0-drafts/` is truly unreferenced: check for dynamic imports, build
> config globs, and any string-based path references. Confirm the build passes
> without it. Then delete the directory. Do the same for `src/config.ts`.
> Report anything that turns out to be load-bearing before deleting.

---

## Phase 1 — Instrument (do this before anything expensive)

> Read `.cursorrules` and the existing docs, then write `CLAUDE.md` at repo root:
> stack and layout, entry points, the TS↔Python RPC boundary, build/test/deploy-to-Deck
> commands, project conventions, and refactor rules (one behavior-preserving change
> per commit; tests green between commits; no new abstraction without 3+ existing
> call sites). Keep it under 150 lines and factual — no aspirations.

> Are `packages/bonsai-mcp/knowledge/architecture/module-map.json` and `rpc-map.json`
> hand-maintained or generated? Verify each against current code and report drift.
> If hand-maintained, write a script that generates them from source (madge for the
> module map; a script over the RPC decorators for the rpc-map) and add a pre-commit
> hook to keep them current.

A drifted map is worse than no map — the agent trusts it and refactors against a
stale picture.

---

## Phase 2 — Describe (thin, mechanical, disposable)

These exist to make Phase 3 cheap. They get consumed and thrown away; the refactor
will invalidate them and that's fine.

**2a. Structural map**

> Read-only recon — do not edit anything. Produce `docs/audit/01-map.md`: every entry
> point (CLI, server, build, scheduled jobs), the top-level module structure of the TS
> and Python sides, and every place the two sides talk to each other — enumerate that
> boundary exhaustively. Flag any file that appears to own more than one concern.
> Cite `file:line` for every claim. Where you are not sure, write UNKNOWN rather than
> inferring.

**2b. Hotspot detail**

> Using the churn data and size data in this plan, cross-reference with cyclomatic
> complexity. Produce `docs/audit/02-hotspots.md` ranking files by (churn × complexity).
> For each of the top 10, describe in two sentences why you think it keeps changing.

**2c. Friction test** — *highest-value item for a handoff. Run 2–3 times, fresh
session each time, different task each time. The overlap across runs is your real
work list.*

> You are a new contributor who has never seen this repo. Your task: [pick a realistic
> small feature or bugfix]. Attempt it. Log every moment where you had to guess, where
> a name misled you, or where answering one question required opening more than two
> files. Write `docs/audit/03-friction.md` ordered by how much time each cost you.
> Do not fix anything.

**2d. Safety net**

> For each hotspot file, list the tests that currently exercise it and what they
> actually assert. Classify coverage as: real behavioral coverage, smoke-only, or none.
> Write `docs/audit/04-coverage.md`.

Files classified "none" get characterization tests before they get refactored.

**2e. Doc triage**

> Review every file in `docs/` against the current code. Classify each as ACCURATE,
> STALE, or PARTIALLY-STALE with `file:line` evidence. Recommend keep / archive /
> delete. Make no edits — output `docs/audit/06-doc-triage.md`.

A stale doc is worse than a missing one: a newcomer trusts it.

**2f. Split docs by audience** *(mechanical, no content changes)*

> Split `docs/` by audience. Agent-session state (roadmap, TODO, subagent reports,
> prompt-testing notes) moves to `docs/agent/`. Reader-facing docs stay in `docs/`.
> Do not rewrite content in this pass — move files and fix links only.

**2g. The plan itself**

> Using 01–06, produce `docs/audit/05-plan.md`: a ranked list of refactors. For each —
> the problem, files touched, blast radius, whether it's strictly behavior-preserving,
> existing test coverage, risk H/M/L. Include a DO-NOT-TOUCH section for anything that
> works, is well-isolated, and is boring. Do not propose a new abstraction unless you
> can cite three or more existing call sites that would collapse into it.

---

## Phase 3 — Refactor

### Deciding combine vs. split

The axis is **change coupling**, not file size. Things that change together should
live together, even in a big file. Things that change independently should be
separated, even into small ones. Splitting what changes together produces shotgun
surgery; merging what changes independently produces god files.

Second test, specific to handoff: **can a newcomer predict where something lives from
its name?** Twelve honestly-named files beat four named `utils`, `helpers`, `common`,
`misc`.

**Split when:**
- The filename contains *and*
- The two halves have disjoint importer sets
- Different reasons to change (UI layout vs. persistence vs. RPC schema)
- Different volatility (stable schema wedged next to churning presentation code)
- The test file churns more than the source

**Combine when:**
- A change *always* touches the same N files — the boundary is fake
- Files exist only to satisfy a layering rule nobody asked for (one-line wrappers,
  pass-through re-export barrels)
- Micro-files with a single importer — merge into the caller
- A "helper" file is a junk drawer — **redistribute** it next to its consumers rather
  than merging it somewhere else

### Ordered work items

**3.1 — Settings single source of truth** *(highest value; do first)* — **done
2026-08-03** as execution-order steps 7a–7d. Both languages now declare their
simple settings as one-row tables and two shared fixtures fail the build on
drift. See
[docs/audit/maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md)
**D12** / **D13**. Codegen (one spec generating both sides) was considered and
deliberately not taken.

> Trace the full path of adding one new user-facing setting, end to end: TS UI → hook
> → RPC → Python service → persistence → read-back. List every file that must change
> and identify which of those changes are mechanical duplication of the same
> information. Propose a single-source-of-truth design.

The target isn't reorganization — it's making "add a setting" a one-or-two-file change.
If TS and Python each independently declare the setting shape, every addition is a
synchronized two-language edit. Generate or mirror from one schema.

**3.2 — Split `settingsAndResponse.ts`** — **done 2026-08-02** as execution-order
step 4. The barrel was deleted and its 22 importers repointed (`2156441`); the
reply-text formatting came out into `appliedTuningText.ts` (`ef65f8e`).

Settings-schema changes and response-handling changes are different reasons to change.
Split into `settings/` and `response/` with separate tests. Expect the 42-churn test
file to break — that's the refactor telling you those tests asserted shape, not
behavior. Rewrite them against behavior rather than contorting the code to keep them
passing.

**3.3 — Resolve the `main.py` extraction** — **investigated 2026-08-03**, not yet
executed. See [docs/audit/07-mainpy-inventory.md](07-mainpy-inventory.md).

> Is `main.py` a thin facade over `py_modules/backend/services/`, or does business
> logic live in both? Cite `file:line`. If both, list what remains in `main.py` and
> where each piece belongs.

"Some logic here, some there, no rule" is worse for a reader than either extreme.

**Answer: both.** 27 of 96 methods are ≤8 lines, but the six largest public RPCs are 706
lines — 24% of the file. `test_ollama_connection` ([main.py:1038](../../main.py)) owns raw
Ollama HTTP that `main.py:6` explicitly disclaims. The inventory names a destination and
a risk level for each piece, in a recommended order.

**3.4 — Split the entry points by feature, not by type** — **done** as
execution-order steps 8 (`index.tsx` 1955 → 1291, into `src/features/plugin-shell/`)
and 12 (`main.py` 2865 → 2743, into four backend service modules). Scope was
narrowed by **D9**: `useBonsaiAskOrchestration.ts` and `MainTab.tsx` are
follow-ups, not part of "done", and **D14** withdrew the unmeasured 700–800 line
target for `index.tsx`. What remains in `index.tsx` is prop threading that only a
rewrite would shrink.

Extract vertically from `index.tsx` and `main.py`. Everything about ask-orchestration
together; everything about settings together. **Resist** `components/`, `handlers/`,
`utils/` — type-buckets scatter each feature across three directories. The codebase
already has the vertical instinct (`useBonsaiAskOrchestration.ts`,
`features/preset-carousel/`); follow it.

**3.5 — Redistribute `refactor_helpers.py`** — **done 2026-08-02.** Reframed
first: the file had no functions, only 65 lines of re-export, so the work was
repointing its 9 importers at `backend.ollama_routing` / `ollama_urls` /
`tdp_intent` and deleting it. See [docs/audit/05-plan.md](05-plan.md)
§1.3.

> For every function in `refactor_helpers.py`, list its call sites. Propose relocating
> each next to its primary consumer; flag any with zero call sites for deletion.

**Per-session context discipline** — prepend to each refactor session:

> Context discipline for this session: use grep and git to establish call sites and
> usage. Read a file in full only when you need to modify it or when its logic is
> non-obvious. Do not survey the repo broadly. Before finishing, append what you
> learned to the relevant `docs/audit/` file so the next session doesn't rediscover it.

---

## Phase 4 — Explain (the actual handoff artifacts)

Written last, against the post-refactor system. Collapse to four files — a newcomer
can hold about that many:

| File | Contents |
|---|---|
| `README.md` | What BonsAI is, install, run, first successful thing you see |
| `ARCHITECTURE.md` | TS↔Python boundary, RPC surface, where settings live, entry points |
| `docs/development.md` | Build, test, deploy to Deck, debug |
| `CHANGELOG.md` | As-is |

Everything else archived or under `docs/agent/`.

**Then verify by execution:**

> Follow README.md exactly as a new contributor on a clean checkout. Log every step
> that fails, is ambiguous, or requires knowledge not in the doc. Do not fix anything yet.

Handoff docs that were never executed are wrong in exactly the places that block a
newcomer on day one.

---

## Phase 5 — Postmortem

Run **after** the refactor. Before, you'd be diagnosing code that no longer exists;
after, the agent has seen where every body was buried.

> Using git history, `docs/audit/`, and the refactor commits you just made, write
> `docs/audit/07-postmortem.md`.
>
> For each significant structural problem, in order of cost to fix:
> - What the problem was, with `file:line` evidence
> - Approximately when it entered the codebase — cite the commit range or period where
>   the pattern took hold
> - What decision or absence created it (a choice made, or a missing constraint that
>   let it drift)
> - What signal existed at the time that could have caught it earlier
>
> Then a section on workflow causes: this project was developed largely with AI coding
> agents. Identify patterns in the history consistent with agent-driven accretion — new
> files created where existing ones should have been modified, documentation added
> rather than updated, dead code left in place. Cite examples.
>
> Rules: no generic software-engineering advice. Every claim needs evidence from this
> repository. If you cannot support a claim, omit it.

Then, as a **separate pass** (folding these together makes the mechanisms go vague):

> From `07-postmortem.md`, produce `docs/audit/08-prevention.md`. For each root cause,
> propose an **automated** check that would have caught it: lint rule, pre-commit hook,
> CI gate, size or complexity threshold, dead-code detection, generated-artifact drift
> check.
>
> For each: what it checks, where it runs, the false-positive rate you'd expect, and
> the annoyance cost. Rank by (problems prevented ÷ friction added).
>
> Reject anything that depends on a human remembering to do something. Discipline is
> not a mechanism. If a cause has no good automated check, say so plainly rather than
> inventing a weak one.

The ranking requirement is load-bearing — an agent will hand you fifteen checks and
you'll adopt three. Better it tells you which three.

**Optional follow-up:** compare the codebase against `CLAUDE.md`. Where the code
contradicts the stated conventions is a precise list of either rules to enforce or
rules to drop.

---

## Note on token cost

Refactoring is genuinely read-heavy — you can't safely move something without knowing
every caller, and that part is irreducible. But most of what feels like refactoring
cost is **re-reading**: session 4 rediscovering what session 2 established.

More context is not better. Retrieval degrades as the window fills, and
instruction-following slips first — the "no speculative abstraction" constraint is
exactly what gets forgotten. What prevents a bad refactor isn't having read
`Button.tsx`; it's the complete importer set for the symbol being moved, which `grep`
gives you for near-zero tokens.

Aim for **precise** context, not maximal. Phase 1 (CLAUDE.md, generated maps) and
rule 4 (persist recon to disk) are what turn a 5x-cost refactor into a 1.2x one.

---

## Windows tooling notes

`uniq`, `pipx`, `tokei` are Unix tools and won't run in PowerShell. Use Git Bash:

```powershell
& "C:\Program Files\Git\bin\bash.exe" -c "git log --format=format: --name-only --since=18.months | sort | uniq -c | sort -rn | head -40"
```

Or native PowerShell for churn:

```powershell
git log --format=format: --name-only --since=18.months |
  Where-Object { $_ -ne "" } |
  Group-Object |
  Sort-Object Count -Descending |
  Select-Object -First 40 Count, Name
```

`tokei` is available via `winget install XAMPPRocky.tokei`. `pydeps` needs graphviz —
skip unless you want a Python dependency graph specifically.
