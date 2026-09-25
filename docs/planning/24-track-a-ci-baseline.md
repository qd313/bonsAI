# 24 — Track A: the ratchet, and what the baseline actually said

Track A of [21-ai-owned-testing-program.md](21-ai-owned-testing-program.md) § 3 — put the
gates that already exist into CI. Implemented 2026-08-25 as
[`.github/workflows/tests.yml`](../../.github/workflows/tests.yml).

**Status, corrected 2026-09-24: blocking since 2026-08-26.** The one-line flip happened in commit
`8ff2b00e` ("flip the ratchet to blocking"), and the workflow file now sets `ADVISORY: "false"`, so a
red gate fails the run. Milestone **M1** ("CI rejects a pull request because a test failed") is
reached. That was item 2 of § 5. The other four items there, deferred on purpose, are still as
written on 2026-09-24: `package.json` has no `packageManager` field, `packages/bonsai-mcp` still uses npm
(`package-lock.json`, `npm ci` in `validate-mcp.yml`), the old `pnpm.peerDependencyRules` block is
still in `package.json`, and the `pretest` hook still runs the version sync. They are now one roadmap
entry. Until 2026-09-24 this line said "Status: advisory", which was the agreed first-session
behaviour: a red gate annotated the run but did not block a merge.

---

## 1. The prediction was wrong, and that is worth recording

Plan 21 said: *"**Expect it to fail first** on a clean runner (Python deps, Node version, an
environment-dependent test). Budget the session for fixing what it exposes; that discovery
is the point."*

It did not fail. Measured before writing the workflow:

| Gate | Working tree | Clean clone + frozen lockfile |
|---|---|---|
| `npx tsc --noEmit` | 0 errors | 0 errors |
| `pnpm test` (vitest) | 593 pass / 83 files, 27s | 593 pass |
| `pnpm test:py` (unittest) | 834 pass, 3 skipped, 18s | 834 pass, 3 skipped |

**1,427 tests, all green, from a bare `git clone`.** The clean clone is the load-bearing
half of that table: it proves nothing depends on a file that was never committed.

Why the pessimism was misplaced, item by item:

- **"Python deps"** — there are none. `scripts/run_python_tests.py` is pure standard
  library. The only third-party import anywhere in `py_modules/` is `PIL`, and all four of
  its import sites are function-local inside `try: / except Exception:`. Pillow is optional
  at runtime and irrelevant to the tests. No `requirements.txt` is needed.
- **"No lockfile"** — a false alarm of my own making. I looked for `package-lock.json`,
  which is absent. The repo is **pnpm**-managed: `pnpm-lock.yaml` (v9.0) and
  `pnpm-workspace.yaml`. `pnpm install --frozen-lockfile` succeeds in a clean clone, which
  means the lockfile is genuinely in sync with `package.json` — the thing `--frozen-lockfile`
  exists to check.
- **"Node version"** — this one *was* real, and I got it wrong in the other direction.
  vitest 3.2.4 declares `^18.0.0 || ^20.0.0 || >=22.0.0` and rollup, typescript and jsdom
  all accept ≥18, so I pinned Node 20 to match `validate-mcp.yml`. The first real run
  failed at setup. See § 7 — the package manager is a dependency too, and nobody checked it.
- **"An environment-dependent test"** — the only real instance is § 2 below, and it is
  Windows-dependent, not runner-dependent.

The honest reading: the suite was in better shape than the plan assumed, so Track A's
session cost is the workflow file rather than the cleanup behind it. That should raise
confidence in Track B, which extends the same job.

---

## 2. The one concrete prediction: three tests will run for the first time

Three Python tests skip **because the maintainer's machine is Windows**:

| Test (`tests/test_voice_transcription_service.py`) | Skip reason |
|---|---|
| `test_copy_whisper_libs_from_container_uses_build_bin` | symlinks require elevated privileges on Windows |
| `test_link_versioned_sonames_creates_major_symlinks` | symlinks require elevated privileges on Windows |
| `test_runtime_dir_usable_false_for_missing` | linux session paths only |

On `ubuntu-latest` all three **execute for the first time anywhere**. They are, by a wide
margin, the most likely first red. That is not a defect in the workflow — it is Track A
buying three tests of real coverage that no local run has ever provided, on the exact code
path (whisper runtime linking) that only ever runs on the Deck.

If one of them fails on the first CI run, the test is the suspect before the code is:
an assertion written to a Windows-shaped assumption and never once executed.

---

## 3. What is still unverified

The clean-room rehearsal was a fresh clone on **Windows, Node 24, Python 3.12**. CI is
**Linux, Node 20, Python 3.12**. So these remain genuinely open until the first real run:

- **Linux vs Windows** — `fcntl` is imported somewhere in `py_modules/` and is Unix-only;
  on Windows it must already be guarded, and on Linux the real module loads instead.
  Different code path, never exercised.
- **Case sensitivity** — partly closed, not fully. TypeScript 5.6 defaults
  `forceConsistentCasingInFileNames` to true, so `tsc` passing clean proves `src/` imports
  are case-correct. No two tracked files collide when lowercased. Runtime string paths in
  Python are not covered by either check.
- ~~**Node 20 vs 24** — declared-compatible, never run.~~ **Closed by § 7: Node 20 does not work.**

Claiming Track A is de-risked would overstate this. The rehearsal closed the *dependency and
untracked-file* classes of failure, which are the common ones. It could not close the
*platform* class.

---

## 4. Design notes on the workflow

- **All three gates run even after one goes red** (`continue-on-error` plus an
  `if:` guard on install). A first survey should return three answers, not the first
  failure. The `Gate summary` step is what decides whether the job passes.
- **Advisory is one line.** `ADVISORY: "true"` in the summary step's `env:`. Set it to
  `"false"` to block. Verified against all seven outcome combinations — all-green,
  each gate red, and install-died — under both settings.
- **`paths-ignore` on `docs/**`, `screenshots/**`, `**.md`.** No test reads either
  directory (checked), and this repo churns planning docs heavily. Docs-only commits
  should not burn runner minutes.
- **`concurrency` with `cancel-in-progress`.** A newer push makes the older run
  irrelevant; cancelling keeps the minutes bill flat regardless of push frequency.
- **pnpm pinned to 11.23.0 exactly.** `package.json` has no `packageManager` field, so
  nothing else in the repo states a version. A floating major would mean CI changing
  package managers underneath you.

---

## 5. Hardening, deferred on purpose

None of these block the first run. Listed so they are not rediscovered.

1. **Add `"packageManager": "pnpm@11.23.0"` to `package.json`.** Then
   `pnpm/action-setup` reads the version from there and the pin stops being duplicated
   in the workflow. This is the right long-term fix for § 4's last bullet.
2. **Flip `ADVISORY` to `false`** once a first run comes back green — that is M1.
3. **`packages/bonsai-mcp` is npm** (`package-lock.json`, and `validate-mcp.yml` runs
   `npm ci`) while the root is pnpm. Mixed package managers in one repo. Works today;
   worth consolidating.
4. **Stale pnpm config.** `pnpm.peerDependencyRules` in `package.json` is no longer read
   and warns on every install. Cosmetic, but it is noise on every CI log.
5. **`pnpm test` writes `src/pluginVersion.ts`** via the `pretest` hook (pnpm does honour
   pre/post for the `test` lifecycle script — verified, not assumed). Harmless in CI, but
   it means a test run leaves the tree dirty.

---

## 6. What Track A does not do

It protects against **regression**, not against **absence**. Every one of the 1,427 tests
runs off-device with fakes; plan 21 § 2.1 makes the point that the focus tests register
their elements by hand and so assert the half that already works. CI locking that suite
green does not mean focus works on the Deck — it means what was true yesterday is still
true today.

Closing the *absence* gap is Track B (static focus checks, wired into this same job) and
Track C (the rig). See [22-xinput-near-miss-and-button-map.md](../archive/22-xinput-near-miss-and-button-map.md)
for how confidently a wrong answer can present itself when the only oracle is inference.

---

## 7. The first real run — what actually broke

Pushed 2026-08-26. Run [32928132758](https://github.com/cantcurecancer/DeckySettingsSearch/actions/runs/32928132758)
**failed in 15 seconds**, at `Install Node`, before a single test executed:

```
warn: This version of pnpm requires at least Node.js v22.13
warn: The current version of Node.js is v20.20.2
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
```

**pnpm 11.23.0 imports `node:sqlite`, which does not exist before Node 22.13.** The workflow
pinned Node 20 and pnpm 11.23.0 together, which cannot work.

The reasoning error is worth naming, because it is the same shape as the XInput near-miss in
[22](../archive/22-xinput-near-miss-and-button-map.md): **a compatibility check that surveyed the wrong
set.** I verified Node 20 against vitest, rollup, typescript and jsdom — every *test* dependency —
and concluded 20 was safe. pnpm was never in the list, because it reads as infrastructure rather
than as a dependency. It is a dependency. It runs on Node like everything else.

The clean-room rehearsal could not have caught this: it ran on the maintainer's Node 24, where
the pairing is fine. The rehearsal validated the repo, not the workflow's own pins. That is a
real limit of the method — **a clean clone tests your code, not your CI configuration.**

Fixed by pinning **Node 24**, matching the maintainer's local version, so CI runs the suite on
the Node it is actually known green on. Also bumped the actions, which were copied from
`validate-mcp.yml` and are a year stale — `checkout@v4 → v7`, `setup-node@v4 → v7`,
`setup-python@v5 → v7`, `pnpm/action-setup@v4 → v6`. That clears the run's other annotation,
that all three v4 actions target a Node 20 runtime GitHub is removing.

### What the run did confirm

- `Install pnpm` and `checkout` succeeded, so the trigger, `paths-ignore` and `concurrency`
  wiring are correct — a push touching the workflow file did start a run.
- **`Gate summary` executed even though setup died**, which is what `if: always()` was for.

### One design point the failure exposed

Advisory mode covers **gates, not infrastructure**. `Install Node` and `Install dependencies`
carry no `continue-on-error`, so when setup breaks the job goes red regardless of `ADVISORY`.
That is deliberate and worth keeping: a workflow that cannot set itself up is broken, not
merely reporting bad news, and it should be loud. `ADVISORY` governs whether a *failing test*
blocks a merge.
