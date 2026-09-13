# 08 — Postmortem (Phase 5)

Written 2026-08-07, after the execution order closed. **Numbered 08, not 07 as
REFACTOR-PLAN says** — `07-mainpy-inventory.md` already holds that ordinal, and the
repo has hit this collision before (see the 09→10 rename noted in
[maintainer-decisions-locked.md](maintainer-decisions-locked.md) § Step labels).
Prevention is [09-prevention.md](09-prevention.md), a deliberately separate pass.

**Scope of evidence.** 338 commits, 2026-03-24 → 2026-08-07 (~4.5 months): 1 commit
in March, 78 in April, 16 in May, 30 in June, 61 in July, 152 in August. Every claim
below cites this repository. Where I could not support a claim I left it out.

---

## Structural problems, in order of cost to fix

### 1. One field list, restated by hand in ~15 places

**The problem.** Adding one boolean setting is ~18 files and ~30 edit points.
`usePluginSettings.ts` restates the settings field list **7** times (state, snapshot,
hydrate, load-failure reset, debounce deps, returned object, save snapshot);
`index.tsx` **5**; each tab payload hook **3**. Two further gates — the `React.memo`
comparator `presetChipsPropsEqual`
([MainTabPresetAnimatedChips.tsx:437](../../src/components/MainTabPresetAnimatedChips.tsx))
and a ~50-entry `useMemo` dep array in `useMainTabPayload.tsx:293` — silently void a
change when a prop is left out.

**When it entered.** `usePluginSettings.ts` was created 2026-04-26 and has 32 commits.
The duplication is not a decay product; it is the shape the file was born with, and
each of the ~42 settings added since has paid the multiplier.

**What created it.** No constraint tied the copies together. `BonsaiSettingsSnapshotInput`
*could* be the single source the other lists derive from — it already enumerates every
field — but nothing derives from it, so each list is maintained by eye.

**The signal that existed.** Churn. `usePluginSettings.ts` (27 at audit time, 32 now)
and `settings_service.py` (28, now 33) ranked in the top ten changed files while
implementing no feature of their own. A file that changes constantly and owns no
behavior is a plumbing file, and plumbing that churns is duplication.

**Cost to fix is highest and the failure is silent** — that combination is why it is
first. Confirmed independently by two of three cold readers in
[03-friction.md](03-friction.md) as the largest cost a newcomer pays.

### 2. Frontend shipped calling backend methods that were never written

**The problem.** Two RPCs existed only in TypeScript. Both call sites discarded the
error, so nothing surfaced — no crash, no log, no message.

**When it entered, precisely.**

| RPC | Frontend call added | Backend `async def` added | Broken for |
|---|---|---|---|
| `merge_pulled_tags_into_routing_orders` | `8b4be92` 2026-07-17 *"Model routing pickers + reply micro-actions"* | `510139d` 2026-08-02 | **16 days** |
| `get_session_rag_chip_candidates` | `ac2c738` 2026-07-18 *"Session RAG preset chips"* | `a6213b8` 2026-08-02 | **15 days** |

**What created it.** `ac2c738` touched `main.py` in the same commit — it added the
*import* for the service functions and stopped before the method. The work was
interrupted between the import and the method, and nothing noticed, because there is
no compile-time check that a called RPC name exists in Python and the call site
swallowed the failure. CHANGELOG had already announced the feature as shipped.

**The signal that existed.** The unused import in `main.py:163-164` — a symbol
imported and never referenced, for 15 days, in the file that defines the RPC surface.
Any linter would have flagged it.

### 3. Removing a feature left its backend behind

**The problem.** Features were deleted from the UI while their Python services stayed.

| Module | Added | Feature removed | Code deleted | Orphaned for |
|---|---|---|---|---|
| `thinking_tiny_model_service.py` | `9ab6cee` 2026-06-26 | 2026-07-30 | `c8ed045` 2026-08-02 | 3 days, zero importers repo-wide |
| `proton_experiment_journal_service.py` | `98434b0` 2026-07-17 | 2026-07-30 | `ebdc0f2` 2026-08-02 | 3 days |

Plus `log_navigation`, the legacy `capture_screenshot`, the TDP sysfs write path, a
six-function kmsgrab sub-tree (`4a26cfa`), and two screenshot helpers (D7). RPC
surface fell 57 → 50 once cleared.

**When the pattern took hold: 2026-07-30.** That day carries **12 commits**, most
titled *"Refactor … and cleanup …"* or *"Update … and …"*. `f7cce16` — *"Refactor
permissions and cleanup obsolete features"* — is the removal that left the backends.
A commit doing four things does not get reviewed as four things.

**What created it.** Nothing measures reachability. A Python module with zero
importers is invisible to `tsc`, to `npm test`, and to the Python suite, which passes
whether or not anything calls the module.

**The signal that existed.** Zero-importer count. The audit found it in one pass once
somebody looked.

### 4. A test runner that could not run half the tests

**The problem.** `vitest.config.ts` set `include: ["src/**/*.test.ts"]`. A `.tsx` test
file could never be collected, so 44 component files had no coverage and `npm test`
would have passed with the entire UI deleted.

**When it entered.** At creation — `da028a6`, 2026-05-23. It was wrong from the first
line and stayed wrong for **71 days**, until `e9748c9` on 2026-08-02.

**What created it.** The config was written in a commit whose subject is *"Many
holistic bugfixes to improve jarring redraws and plugin resets after fullscreen menu
selections. Also added prelim recording capture for debugging but also possible future
feature. Easter egg for pyro refinement"* — three unrelated concerns and a new test
harness, in one commit. The harness was incidental to all of them.

**The signal that existed.** The number itself: a repo with 44 component files and a
green suite that never mentions a component. **This was a tooling gap, not a
discipline gap** — the audit's original framing blamed missing tests, and that was
wrong ([04-coverage.md](04-coverage.md)).

### 5. Plugin code that silently does nothing on the device

**The problem.** Plugin JS runs in SharedJSContext while the UI renders into the QAM
popup document, so a global `document` lookup finds a 14-element shell. Every focus or
scroll helper written that way is a no-op **on device only** — it works in preview and
in jsdom. Documented in [decky-realms.md](decky-realms.md); eight sites were still
open at last count.

**What created it.** A platform assumption no test environment can falsify. jsdom has
one document; so does the preview. The bug is only reachable on hardware.

**The signal that existed.** None automatable, honestly — this one needed the device.
What *was* available and unused: `getUiDocument()` / `elementHasFocus()` existed in
`uiDocument.ts` before the sweep found the sites still bypassing them.

### 6. Two vocabularies for one feature

**The problem.** Everything user-facing says **knowledge base**; everything
machine-facing says **`rag_corpus`**. A cold reader grepped the human name, got 60
files, and missed all five RPCs that manage the corpus ([03-friction.md](03-friction.md) § 4).
Three of three friction runs lost time to a misleading name — a different one each
time, which is what makes it a class rather than three incidents.

**What created it.** The feature was built backend-first under its implementation name
and surfaced later under its product name; neither renamed the other, and no glossary
entry bridged them until 2026-08-05.

### 7. A deploy path that reported success without landing

**The problem.** `build.ps1` merged without pruning and printed *Deployment complete!*
without checking anything arrived — because PowerShell does not stop on a non-zero
`scp` and no exit code was checked. Deleted files survived on the device and could
satisfy an import that should have failed.

**When it was proven.** After the D8 fix, the *same* failure recurred naturally: a
deploy ran while the Deck slept, failed at the first `ssh` (exit 255), and was caught.
Pre-fix, that exact run would have printed success.

**What created it.** Unchecked native exit codes — the mechanism, not the missing
prune, was the actual false-pass.

---

## Workflow causes

This project was built largely with AI coding agents. Three patterns in the history
are consistent with agent-driven accretion; each is evidenced.

**Multi-concern commits are the through-line, and they are upstream of items 3 and 4.**
`da028a6` bundles jarring-redraw fixes, a screen-recording capture prototype, an easter
egg, *and* the vitest config that broke component testing for 71 days. `f7cce16`
bundles a permissions refactor with the feature removal that orphaned two services.
2026-07-30 alone carries 12 commits, most with *"and"* joins in the subject. An agent
asked to do a task does the task plus what it noticed on the way; nothing enforces one
concern per commit, so incidental changes ride in under a subject that does not mention
them and get reviewed as though they were the headline.
*(Honesty check: some of my own commits in this refactor also carry two-part subjects.
The difference I would claim is that they describe one change, not several — but that
is a judgment, and the pattern is worth watching in any hand.)*

**Documentation is added more readily than reconciled.** 81 `.md` files created against
569 modifications; **30 of 73 surviving docs are in `archive/`**. The reorg that split
`roadmap.md` left 30 broken relative links and 10 dead heading anchors in one file, plus
a dropped numbered list entry whose trailing sentence fused onto the paragraph above it
— all caught only by an explicit audit two days later. Related: `06-doc-triage.md`
concluded `docs/test-evidence/` was "96% unreferenced" by searching `testing.md` only;
the archived QA docs cite evidence heavily, and the real figure was **10 of 13 runs
referenced**. A partial search became a stated fact.

**Cleanup commits describe intent that the diff does not deliver.** `05f6f79`
(2026-08-05) removes `.cursorrules`, `AGENTS.md` and `CLAUDE.md` as *"deprecated…
replaced by more current documentation"*, and `8b57cbb` ignores them the same day. But
`REFACTOR-PLAN.md` Phase 1 commissioned `CLAUDE.md` as the durable orientation
artifact, `docs/DOCUMENTATION_INDEX.md:3` still advertises it as orienting agents, and
it is still injected into every agent session from an untracked working copy. **The
file was deprecated in the repo and kept in practice**, so it can now drift per machine
with nothing to reconcile it — two of three friction readers hit exactly that.

**What this does not show.** I looked for new files created where an existing one
should have been modified and found the case weaker than expected. `src/utils` has 61
files and only **11** have a single importer — the merge candidates REFACTOR-PLAN's
"Combine when" test predicts. The type-bucket directories are large but not littered
with one-caller micro-files, and the dependency graph has **zero cycles and zero
orphans**. The organizing problem in this repo was duplication inside big files, not
file-count sprawl.

---

## What the refactor demonstrably changed

Stated because a postmortem that only lists faults misrepresents the tree.

- RPC surface 57 → **50**; `main.py` 3021 → **2755**; `index.tsx` 1955 → **1291** at
  step 8 close.
- Frontend tests 217 → **372**, files 44 → 57; Python 399 → **497**. The `.tsx` gap is
  closed, so those numbers now mean something for the UI.
- Both missing RPCs implemented; all identified dead code removed.
- Settings drift is caught by two shared cross-language contracts rather than by eye.
- Six architecture snapshots regenerate and validate on every commit.
- Deploy verifies by hashing 52 shipped files, and its false-pass class is closed.

**Three of the items above were found only because something was measured** — zero
importers, snapshot drift, hash mismatch. That observation is the entire input to
[09-prevention.md](09-prevention.md).
