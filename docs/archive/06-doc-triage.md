# 06 — Doc triage (Phase 2e, 2026-08-02)

Every file in `docs/` checked against current code. **No edits made** — this is a
recommendation list.

A stale doc is worse than a missing one, because a newcomer trusts it.

**Verdicts:** ACCURATE / PARTIALLY-STALE / STALE. Where a claim could not be
checked without a Deck, it is marked `UNKNOWN` rather than guessed.

---

## Summary

| Doc | Lines | Last commit | Verdict | Action |
|---|---|---|---|---|
| `DOCUMENTATION_INDEX.md` | 22 | 07-30 | PARTIALLY-STALE | keep + update |
| `code-clarity.md` | 84 | 08-02 | ACCURATE | keep |
| `development.md` | 371 | 07-30 | PARTIALLY-STALE | keep + fix 1 line |
| `glossary.md` | 21 | 07-30 | PARTIALLY-STALE | keep + fix 1 row |
| `knowledge-base.md` | 278 | 08-01 | ACCURATE | keep |
| `mcp-setup.md` | 145 | 07-30 | PARTIALLY-STALE | keep + add 1 tool |
| `rag-…-remediation-plan.md` | 215 | 08-02 | ACCURATE (self-declared archived) | **archive** |
| `rag-…-remediation-implementation-plan.md` | 216 | 08-02 | ACCURATE | keep |
| `roadmap.md` | 329 | 08-02 | ACCURATE | keep |
| `testing.md` | 99 | 08-02 | ACCURATE | keep |
| `testing-automated.md` | 81 | 07-30 | ACCURATE | keep |
| `testing-manual.md` | 200 | 07-30 | UNKNOWN (device-dependent) | keep |
| `troubleshooting.md` | 692 | 07-30 | ACCURATE on paths; UNKNOWN on device claims | keep |
| `archive/` | 29 files | — | historical by definition | keep |
| `test-evidence/` | 263 files | — | 6 of 9 trees unreferenced | **prune candidate** |
| `demos/` | 2 files | — | UNKNOWN | keep |
| `audit/` | 6 files | 08-02 | current (this refactor) | keep |

**Nothing warrants deletion.** One doc should move to `archive/`, one directory
is a pruning candidate, and four need a one-line correction each.

---

## Findings with evidence

### STALE claims (4 total, all narrow)

**1. `development.md:100` — build no longer writes `src/config.ts`.**

> ``- `pnpm install` (when needed) → `pnpm run build` → writes dev `src/config.ts` from `.env` ``

`src/config.ts` and the `do_generate_config` function that wrote it were removed
in Phase 0 (commit `00adaf4`). This line now describes a step that cannot happen.
It is inside the "What this does" block for `./scripts/build.sh local`, so a new
contributor following the deploy section will look for a file that does not exist.

**2. `glossary.md` — TDP entry describes a removed capability.**

> **TDP** … Deck wattage cap; **optional AI-assisted adjustment**.

The apply path was removed in the 2026-07-30 permissions cleanup — TDP/GPU output
is suggestion-only. `apply_tdp` still exists at
`py_modules/backend/services/tdp_service.py:163`, but its **only** caller
repo-wide is its own test (`tests/test_tdp_sandbox_sysfs.py:41`). Nothing in
`main.py`, `py_modules/`, or `src/` reaches it. Suggested wording: "read-only
wattage suggestions."

> **Secondary finding for the dead-code list:** `apply_tdp` is production-dead but
> test-covered. A test is the only thing keeping it alive — worth noting alongside
> the orphaned RPCs in [01-map.md](01-map.md) §4.

**3. `mcp-setup.md` — missing one registered MCP tool.**

It documents 9 tools; `packages/bonsai-mcp/src/server.ts` registers 10. Absent:
**`bonsai.arch.previewTiers`** (documented in [AGENTS.md](../../AGENTS.md) but
not here). All 9 it does list match the server.

**4. `DOCUMENTATION_INDEX.md` — index omits 5 of the docs it indexes.**

Missing rows for `code-clarity.md`, `glossary.md`, both
`rag-retrieval-quality-remediation*` docs, and `docs/audit/`. It also predates
`CLAUDE.md`, which now sits at repo root alongside the `README.md` and
`CHANGELOG.md` it does mention. Since this file exists specifically to be the map
of `docs/`, an incomplete map is the one failure mode that matters here.

### Verified ACCURATE (a sample of what was checked, not assumed)

- **`development.md:301` CI claim** — states the zip workflow triggers on `main`
  pushes changing `plugin.json`, `v*` tags, and `workflow_dispatch`. Confirmed
  against `.github/workflows/build-plugin-zip.yml:9-28`. *(An earlier draft of
  [01-map.md](01-map.md) called this workflow dispatch-only; that was my error,
  corrected in the same commit as this file.)*
- **`testing-automated.md`** — every command (`pnpm run test:py`, `build`,
  `test:preview:tier`, `test:preview --filter`) exists in `package.json:7-25`.
- **`troubleshooting.md`** — all `scripts/`, `src/`, `py_modules/` paths it
  references resolve. At 692 lines it is the largest doc; its *behavioral* claims
  (GPU, network, QAM edge cases) are device-dependent and marked `UNKNOWN`.
- **`code-clarity.md`** — every file it names exists. The one stale entry
  (`src/v0-drafts/`) was removed this session in `c5c782a`.
- **`knowledge-base.md`** — phase ship-dates are internally consistent and match
  `roadmap.md`. Note it lists session-chip visibility under **Phase 4, "not
  implementing yet"**, which is consistent with the finding that
  `get_session_rag_chip_candidates` has no backend — the frontend shipped ahead
  of its phase.

---

## Link audit (added 2026-08-02, when the fixes below were applied)

The triage above checked *claims*. It did not check *links*. A sweep of every
relative markdown link under `docs/` found **276 broken targets**:

| Where | Count | Disposition |
|---|---|---|
| `docs/archive/**` | 272 | **Pre-existing and left alone.** These files were written when they lived at `docs/` root; archiving them broke their relative paths wholesale. They are historical documents whose links point at a layout that no longer exists |
| Live docs | 4 | **Fixed.** `development.md` ×2 (`spikes/cursor-deck-visibility.md`, `security-audit-report.md` — both now under `archive/`), `troubleshooting.md` ×1 (`plans/post-p0-feature-backlog.md`), `roadmap.md` ×1 (a forward reference to a spike deliverable that does not exist yet — unlinked rather than repointed) |

Live docs are now link-clean. The archive is not, and fixing it would be ~272
edits across historical files nobody navigates by link. Recorded rather than
done; it is a candidate for the **D4** evidence-hygiene pass, not for this one.

---

## Recommended moves

### Archive one doc

`docs/rag-retrieval-quality-remediation-plan.md` opens with its own banner:

> *"**Archived analysis** - active ship plan: …implementation-plan.md. Do not
> implement from this doc"*

A doc that declares itself archived should live in `archive/`. Leaving it beside
the active implementation plan, with near-identical names (215 vs 216 lines), is
a trap: the two filenames differ by one word. Move to
`docs/archive/rag-retrieval-quality-remediation-plan.md` and fix the inbound
link in the implementation plan.

### Prune stale evidence

> **Corrected 2026-08-05 by the step 10 link audit. The claim below was wrong, and
> the reason is worth keeping: it searched `testing.md` only.** The archived QA
> docs — `archive/testing-results-2026.md` and `archive/testing-full-pre-2026-07-30.md`
> — cite evidence heavily, at the individual case-manifest level. Counting whole
> **runs** (`tier/date-sha`) rather than tier folders, the real numbers were
> **10 of 13 runs referenced, 0 broken links**, not "96% unreferenced". Only three
> runs were genuinely orphaned, and all three carried no signal: two `hookSmoke`
> runs that both failed with `IPC timeout for callTestHook` (the preview harness
> being unavailable, not a product defect) and one `deckOnly` run whose three cases
> all skipped. Those were pruned; everything else stayed. **The lesson for the next
> audit: grep the archive too, and count the unit that is actually cited.**

`docs/test-evidence/` holds **263 files across 9 trees**. Only 3 are linked from
any doc (`testing.md`): `tier0/2026-05-26-9e20a82`,
`tier1Core/2026-05-26-9e20a82`, `tier2Deep/2026-06-09-a9237e4`. The other six
trees — `deckOnly`, `hookSmoke`, `preGate`, `tier1Boundaries`, `tier2`,
`tier3UI` — are referenced by nothing.

`testing.md` already anticipates this: *"Orphan evidence folders may be pruned
later when nothing links them."* This is the largest single directory in `docs/`
and it is 96% unreferenced.

**Not a Phase 2 action** — deleting evidence is a maintainer call about what QA
history is worth keeping, and it is unrelated to code legibility. Flagged for a
decision, not queued.

---

## Phase 2f — resolved as already done (2026-08-02)

**2f requires no move. The split it asks for has already happened.**

The plan's 2f says to move "roadmap, TODO, subagent reports, prompt-testing
notes" into `docs/agent/`. Three of the four are no longer in `docs/`:

| Target | State |
|---|---|
| `docs/TODO.md` | gone |
| `docs/prompt-testing.md` | gone |
| `docs/regression-and-smoke.md` | gone |
| `SUBAGENT_REPORTS.md` | already outside `docs/`, at `.cursor/agents/SUBAGENT_REPORTS.md` |
| `docs/roadmap.md` | **still in `docs/`** |

So 2f reduces to moving one file — and `roadmap.md` has **53 inbound references
across 20+ files**, including `README.md`, `CLAUDE.md`, `CHANGELOG.md`,
`.cursorrules:11`, `.cursor/rules/docs-on-ship.mdc`, three MCP knowledge files
(`policies/documentation.md`, `policies/plan-accountability.md`,
`workflows/tier-qa.md`), and eight docs.

Moving it would be the highest link-churn action in Phase 2, to separate a file
that is *also* reader-facing (it is the public bug list, linked from `README.md`).
The plan's Diagnosis 3 — "docs/ is two artifact classes jammed together … 350+
changes" — was true when written; earlier cleanup has since resolved it.

**Decision: leave `docs/` as-is.** The one real trap the triage found is the
near-duplicate RAG plan filenames, handled by the archive move below rather than
by an audience split.

For reference, had a split been performed, the audience division would have been:

| Destination | Files |
|---|---|
| **`docs/agent/`** (agent/maintainer working state) | `roadmap.md`, `code-clarity.md`, `mcp-setup.md`, both `rag-…remediation*` docs, `audit/` |
| **`docs/`** (reader-facing) | `development.md`, `troubleshooting.md`, `glossary.md`, `knowledge-base.md`, `testing*.md`, `DOCUMENTATION_INDEX.md` |
| **`docs/archive/`** | the self-declared archived RAG analysis |

If this is ever revisited, the link sweep must land in the same commit as the
move — `roadmap.md` alone accounts for 53 references — or navigation breaks
across the repo at once.
