# 09 — Prevention (Phase 5, second pass)

From [08-postmortem.md](08-postmortem.md). One rule applied throughout: **discipline is
not a mechanism.** Anything that depends on a person remembering is rejected, however
sensible it sounds. Where a root cause has no good automated check I say so rather than
inventing a weak one — four of them do not, and that section is as important as the
adopted list.

**There is already a host for all of this.** `.githooks/pre-commit` runs on every commit
(installed via npm `prepare`) and regenerates + stages the six architecture snapshots;
`npm run mcp:validate` fails on drift and self-enables under `CI=true`. Every check below
is a new assertion in machinery that already exists, not new machinery.

**Ranked by problems prevented ÷ friction added.** Adopt from the top; the ranking is the
deliverable, not the list.

---

## Adopt

### 1. RPC name cross-check — TypeScript call sites vs `main.py`

- **Checks:** every RPC name string passed to `callDeckyWithTimeout(` or `call<…>(` in
  `src/` exists as a public `async def` at indent 4 in `main.py`. Reverse direction
  reported as a warning, not a failure (some RPCs are driven only by the preview suite).
- **Where:** pre-commit, and CI. The name list is already produced —
  `rpc-map.json` is generated from `main.py` on every commit, so this is a set
  comparison against a file that is guaranteed fresh.
- **False positives:** near zero. Every call site in the repo passes a string literal;
  a computed name would be the only FP and none exists today.
- **Annoyance:** negligible — a set comparison over ~50 names.
- **Would have caught:** postmortem item 2, at the commit that introduced it, instead of
  15 and 16 days later. The feature was announced in CHANGELOG as shipped while broken.

**Highest rank by a distance.** It is the only proposal here that would have prevented a
user-visible production defect, the input data already exists, and the false-positive
rate is as close to zero as this list gets.

### 2. Doc link and heading-anchor validation

- **Checks:** every relative markdown link under `docs/`, `*.md` at root and
  `packages/bonsai-mcp/knowledge/` resolves to a file; every `#fragment` resolves to a
  heading in the target file.
- **Where:** pre-commit. Runs in about a second over ~100 files.
- **False positives:** near zero *once three details are right*, and I got two of them
  wrong on the way to writing this, so they are requirements rather than notes.
  1. **Strip a trailing `:NNN` before resolving.** This repo links with line citations
     (`[dev](../development.md:130)`). A naive checker reports every one as broken — my
     first run produced **38 false positives** from a single file
     (`docs/audit/desktop-mode-discovery.md`) and zero real findings.
  2. **Read as UTF-8 explicitly.** Windows PowerShell defaults to CP1252, which mangles
     every em-dash and therefore every anchor containing one.
  3. **Match GitHub's slug rules exactly** — lowercase, strip punctuation, and **each**
     space becomes a hyphen, so `A — B` yields a *double* hyphen. Get this wrong and the
     anchor half is pure noise. The slugger needs its own unit test.

  A checker that fires 38 times on day one gets switched off on day one. Budget for
  tuning it against the current tree before turning it on.
- **Annoyance:** low, and it fails with an exact `file:line` and target.
- **Would have caught:** the reorg breakage — 30 dead links in one file, 10 dead
  anchors, including the "Next session" breadcrumb, the single most-used link in
  `roadmap.md`. All of it survived review and was found only by an explicit audit.

**Partial credit, stated honestly.** This checks *links*. It does **not** catch a prose
reference like "see `docs/roadmap.md` § Decisions needed" when that section moves — the
exact defect that survived my own audit and was found by a cold reader. Matching
`§ Name` against the target's headings is possible but would fire on every legitimate
paraphrase; I would ship the link half and leave the prose half alone.

### 3. Python module reachability

- **Checks:** every `py_modules/backend/**/*.py` is imported by at least one other
  module, `main.py`, or a test. Explicit allowlist for genuine entry points.
- **Where:** the existing generator, emitted into the snapshots and asserted by
  `mcp:validate`. The TS side already has this (`import-graph.json`: 0 cycles, 0
  orphans); Python has no equivalent.
- **False positives:** low, and they are one-line allowlist entries. Dynamic imports
  would be the risk; the backend uses static imports throughout.
- **Annoyance:** low. It fires exactly when a module stops being reachable — which is
  the moment you want to know.
- **Would have caught:** postmortem item 3 at deletion time — `thinking_tiny_model_service.py`
  had **zero importers repo-wide** for three days and neither test suite noticed, because
  a suite passes whether or not anything calls the module.

### 4. Test-collection completeness

- **Checks:** the number of `*.test.ts` and `*.test.tsx` files on disk under `src/`
  equals the number vitest actually collects.
- **Where:** a test in the suite itself, so it cannot be skipped.
- **False positives:** zero — it is a count against a glob.
- **Annoyance:** none until it fires.
- **Would have caught:** postmortem item 4 on day one instead of day 71. `include:
  ["src/**/*.test.ts"]` meant a `.tsx` test could never run, so 44 component files had
  no coverage and the suite would have passed with the UI deleted.

**Cheapest item on this list.** A dozen lines, zero ongoing cost.

### 5. Ban the global `document` in plugin source

- **Checks:** no bare `document.` / `window.document` in `src/`, except inside
  `utils/uiDocument.ts` and lines carrying an explicit opt-out comment.
- **Where:** lint / pre-commit grep gate.
- **False positives:** low-to-moderate. Some uses are legitimately fine within one
  container, so the opt-out comment will be used — and that is the point: it converts a
  silent mistake into a visible, reviewable claim.
- **Annoyance:** moderate. This is the only proposal that will argue with an author.
- **Would have caught:** postmortem item 5, whose failure mode is the worst kind — it
  works in jsdom, works in preview, and does nothing on the Deck. **No test environment
  in this repo can reproduce it**, which is exactly why a static gate earns its friction
  here and would not elsewhere.

### 6. Generate the numbers in handoff docs instead of typing them

- **Checks:** nothing directly — it removes the failure. File counts, test counts, line
  counts and symbol line numbers in `ARCHITECTURE.md` come from the same generator that
  writes the architecture snapshots, and drift fails `mcp:validate` like any other
  generated artifact.
- **Where:** existing generator + pre-commit.
- **False positives:** zero by construction.
- **Annoyance:** low, one-time authoring cost.
- **Would have caught:** the whole staleness class. `CLAUDE.md` carried `main.py` at
  2971 lines (actual 2755), `class Plugin` at `:198` (actual `:193`), 225 TS files
  (actual 256) — and when I corrected those by hand **I introduced three fresh wrong
  numbers** (19/26/19 for values that were 20/28/21), by copying a doc that was accurate
  four days earlier. A cold reader caught it hours later. Hand-maintained counts do not
  survive contact with a moving repo, and the person fixing them is not exempt.

### 7. Settings snapshot key coverage

- **Checks:** the object `usePluginSettings` returns for saving contains a key for every
  field in `BonsaiSettings`, asserted at runtime in a test.
- **Where:** frontend suite.
- **False positives:** zero.
- **Annoyance:** none.
- **Would have caught:** the most damaging single omission in postmortem item 1 — a
  setting that appears to save and does not.

**Deliberately partial.** This covers the one list that is introspectable at runtime. It
does **not** cover the `useMemo` dependency arrays, which are compile-time syntax and
invisible to a test. The memo comparator *is* now covered
(`MainTabPresetAnimatedChips.test.tsx` asserts the comparator reads every declared
prop, mutation-checked). The rest of item 1 has no check worth writing — see below.

---

## Reject, with reasons

**Enforcing one concern per commit.** The single strongest workflow signal in the
postmortem — `da028a6` bundled the broken vitest config with three unrelated changes —
and I have no honest mechanism for it. A subject-line linter banning "and"/"also" is
trivially gamed and punishes accurate summaries; a diff-scope heuristic ("config file +
`src/` feature change") would fire constantly on legitimate work. This is a review-culture
problem, and pretending a hook solves it would be exactly the fake mechanism this pass
is supposed to reject.

**Enforcing vocabulary.** Nothing can decide that "knowledge base" and `rag_corpus`
should be one word. A glossary entry helps a reader; it prevents nothing, and a linter
banning one term would be wrong as often as right.

**Checking `useMemo` / `useCallback` dependency arrays against the body.** The React
ESLint rule exists and would help, but the arrays in question are *deliberately* partial
in places, with comments saying why (`useSettingsTabPayload` omits setters on purpose).
Turning it on would produce a wave of suppressions that trains people to suppress it.
**The real fix is item 1 of the postmortem — derive the lists so there is nothing to
keep in sync.** A check here would make the duplication permanent by making it safe.

**A doc-freshness or staleness date check.** Docs do not go stale on a timer; they go
stale when the code moves. A "last reviewed" stamp is discipline wearing a mechanism's
clothes.

---

## What to do first

**Items 1 and 4 first, then 2.** 1 and 4 are near-zero-tuning; item 2 is worth as much
but needs the calibration pass described above, and shipping it untuned is how a useful
gate gets disabled permanently.

**Items 1, 2 and 4** are the whole recommendation if only three land. Together they cost
roughly a day, add well under a second to a commit, and between them close a 15-day
production bug, a 71-day testing blind spot, and the link rot that a documentation reorg
produces every time. Items 3 and 6 are next and are natural extensions of the generator
that already runs. Item 5 is worth its friction only because its failure mode is
invisible off-device. Item 7 is small and partial and should not be mistaken for fixing
postmortem item 1 — **only derivation fixes that**, and it remains unscheduled under
[D14](maintainer-decisions-locked.md) Option B/C.
