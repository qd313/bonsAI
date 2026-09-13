# RAG retrieval quality remediation — implementation plan

**Status:** **CLOSED 2026-08-09.** PR1 (Stages 1–5) shipped 2026-08-05. PR2 (Stage 6) complete: kill-switch, D16 router, `kb_eval_v2` (221 / 140 labeled), 13-title / 119-section seed, schema-v3 rebuild, arms bake-off, equal RRF weights locked on holdout **no separation**. Report: [archive/research/kb-retrieval-pr2-bakeoff-2026-08-09.md](archive/research/kb-retrieval-pr2-bakeoff-2026-08-09.md). Sign-off packet: [audit/rag-pr2-signoff.md](audit/rag-pr2-signoff.md).  
**Analysis source (do not edit as ship plan):** [archive/rag-retrieval-quality-remediation-plan.md](archive/rag-retrieval-quality-remediation-plan.md)

> **PR2 build notes (running)** — what the work has turned up so far:
>
> 1. **The Q8 gap is bigger than "some natural-language asks".** Measured 2026-08-06 by the new
>    live gate check: **3 of 18** compat fixtures pass `should_retrieve_knowledge`. Strategy is
>    22/22. So 83% of the compat eval set — including *every* paraphrase case — scores traffic
>    production never routes to retrieval. This is not new breakage; it is the deferred Q8
>    decision, now with a number. It also means the 2026-07-31 bake-off's compat half measured
>    nothing about shipped behaviour, and that report now carries a correction banner.
> 2. **The holdout split is empty, and saying so is the honest output.** Every existing fixture
>    was written from the card it matches. Marking any of them `holdout` would launder a
>    self-referential set into a ship gate, so the eval reports "no verdict, the holdout is
>    empty" instead of a tie.
> 3. **First arm run gives fusion no advantage — and must not be acted on.** On the tune split
>    at the current shallow corpus: keyword 90.0% top-3, vector-only 90.0%, RRF 85.0%, every
>    interval overlapping. With 22 sections against a 30-card shortlist the shortlist swallows
>    the corpus, so this measures the harness. Deepen first (6d), then read it again.

> **PR1 build notes** — three things found while implementing that this plan did not say, all
> now in code comments and in [knowledge-base.md](knowledge-base.md) § Retrieval quality remediation:
>
> 1. **Naive RRF re-creates the exile it removes.** The formula in Stage 2 is undefined for a
>    card missing from the vector list, and textbook RRF omits such documents. Omission means
>    a card absent from the vector list scores 0 from it — on a 30-card shortlist the worst
>    possible vectored card then scores `1/90 + 1/90 = 0.0222` against `1/61 = 0.0164` for the
>    best keyword hit with no vector, so *having* a vector beats *being the best match*.
>    Missing entries are backfilled one rank past the end of the vector list, which is what
>    delivers this plan's stated intent. **The backfill rank is a PR2 knob** alongside the
>    weights.
> 2. **`ORDER BY rank` is the unweighted bm25.** Selecting a weighted score while ordering by
>    `rank` leaves the Stage 2 column weights affecting the floor and doing nothing to
>    ranking. Both queries now order by the same weighted expression.
> 3. **The floor cannot fix stopword queries, and should not try.** Measured on the seed
>    corpus: `"the a of and to it is"` returns eight cards scoring 1.9–5.2, above several
>    genuine compat hits, while a wholly off-topic Ask tops out at 0.75. The floor sits at
>    1.0 and catches the latter only; the former is Stage 3's stopword filter.
>
> PR1 also re-aimed `test_compat_hybrid_reranks_when_nomic_available`, which is **not** in the
> R5 list but is the same class of problem: it asserted `top_k=1` under a single mocked
> vector, which was really asserting the exile Stage 2 removes.

This is the **active ship plan**. It copies the technical stages from the analysis doc, then overlays maintainer-locked decisions and reconciliation items (R1–R5). Where this plan and the analysis disagree, **this plan wins**.

---

## Why (short)

The 2026-07-31 bake-off said “keyword beat hybrid” and steered Phase 7. That conclusion was mostly a **harness artifact**:

- Only 22 strategy cards (2/game) while hybrid shortlists 30 → not real hybrid ranking; with a game filter, top-3 was often trivial.
- 40 eval queries, models tied at 82.5% → metric too coarse.
- Eval used nomic `search_query:` / `search_document:` prefixes; **production did not**.
- Shipped rerank was cosine-only → strong keyword hits without vectors sank.
- No relevance floor → weak matches still injected and cited.

Intended outcome: genuinely hybrid retrieval, an eval that can detect the difference without self-referential inflation, and transparency that matches what the model received.

---

## Delivery: two PRs

| PR | Scope | Gate |
|---|---|---|
| **PR1** | Stages 1–5: prefixes + schema v3, RRF + BM25 floor (**provisional, deliberately loose**), query fixes, scale/robustness, transparency, tests, docs for that slice | Backend + frontend unit tests; no bake-off claim |
| **PR2** | Stage 6: deepen seed, grow eval fixtures, kill-switch UI, bake-off re-run, lock weights/floor from **tune** split, report **holdout** as ship gate, superseding research report, remaining docs | Maintainer sign-off on cards + eval fixtures; holdout RRF vs keyword with non-overlapping CIs on **same deepened corpus** |

PR1 ships placeholder fusion weights and a **loose** relevance floor (R3). Final constants come from PR2 tune-split eval. Do **not** compare new numbers to the old 92.5% keyword baseline (R4).

---

## Locked decisions (discovery)

| # | Decision | Choice |
|---|---|---|
| 1 | Ship shape | **Two PRs** as above |
| 2 | Strategy cards | Agent drafts best-effort; **maintainer signs off before rebuild/deploy**. Stub style OK (`bonsAI-maintainer`). Not Phase 6 wiki attributions. |
| 3 | Eval queries + labels | Agent drafts; **maintainer signs off before bake-off**. See R1 for draft **order** (queries before cards). |
| 4 | RRF + floor | **Both** strategy and compat paths |
| 5 | Kill-switch off label | Distinct Show details string (e.g. **Keyword search (hybrid disabled)**), not the same as embed-unavailable. Needs new `RetrievalMethod` literal + chip/detail label branches. |
| 6 | Schema v3 | Old v2 corpora → keyword fallback until rebuild; **no migration wizard** |
| 7 | QA / eval infra | Deck deployable; PC has Ollama + `nomic-embed-text` |
| 8 | Compat phrase gate | **OPEN / deferred** — see below. Do not silently fix or ignore. |
| 9 | Phase 5 / Phase 7 | **Partial content depth** ships in PR2; Phase 5 keeps chip vector ranking, heavier wiki ingest, full content bar. **RRF (FTS+vector)** moves out of Phase 7 into this work. Trust-tier-in-RRF, ANN, demote, etc. stay Phase 7. |
| 10 | Plain talk | Short `.cursorrules` note only — plain language + sign-off gates |

### ~~Open decision (Q8)~~ — compat phrase gate: **CLOSED 2026-08-06 as D16, gate widened**

Troubleshooting KB only ran when `question_matches_troubleshooting_log_context` matched a hardcoded phrase list. Natural-language asks skipped KB in production. Roadmap Bugs row: **KB compat retrieval phrase gate**.

The plan said **defer the product fix** and make the gap visible in eval (R2). R2 shipped in stage 6b, and the number it produced changed the decision: **3 of 40** drafted troubleshooting questions reached retrieval, **0 of 19** phrased naturally, leaving ~24 of 27 corpus topics unreachable. Deferring would have meant tuning fusion with no usable compat evidence at all.

Maintainer locked **D16: widen now.** New `compat_topic_router.py` routes on corpus topics; the phrase gate is untouched because its other four consumers (Proton logs, prompt framing, stream tags, permission hint) must not move. Reachability **3/40 → 39/40**, **13/13** blind holdout, **0/107** strategy false positives. The compat arm of the bake-off now measures cards production would actually fetch. See [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md) § D16.

---

## Reconciliation (R1–R5) — fold in before corpus / eval drafting

### R1. Prevent a self-referential eval (highest priority)

Do **not** write cards, then matching questions, then answer keys. That measures “can we find the card we wrote the query from” and inflates every arm.

**Required:**

- Draft **eval query intents** (and provisional labels) **before** writing strategy cards, or from how players phrase questions — not by reading a card and writing a matching question.
- Workflow: query intents → cards that cover those intents → maintainer sign-off on **both** → rebuild → bake-off.
- No query may reuse distinctive noun phrases from its target card **verbatim**. Explicit checklist item in maintainer sign-off.
- Split ~150 queries into **tune / holdout** (~100 / ~50). Tune RRF weights and relevance floor on **tune only**. **Holdout** is the PR2 eval gate. Record both in the superseding research report.

### R2. Make the deferred phrase gate visible in eval numbers

`scripts/eval_kb_embed_models.py` never calls `should_retrieve_knowledge` / `question_matches_troubleshooting_log_context`; it trusts fixture `domain`. Compat cases that miss the production gate must not silently drive weight tuning.

**Required:**

- Track `gate_reachable` for every compat case (prefer compute in eval runner or a check that asserts fixture flags match the live phrase function — avoid stale baked booleans).
- Report compat scores **twice**: overall, and gate-reachable-only.
- Superseding research report shows both; note the gap is deferred Q8, not retrieval quality.

### R3. PR1 relevance floor — loose and provisional

After PR1, existing corpora are schema v2 → hybrid refused → keyword fallback. RRF is dead until rebuild. The relevance floor is the main live ranking change in PR1.

**Required:**

- Floor deliberately **loose** (drop only near-certain junk). Too strict → KB stops attaching (clean degrade); too loose → no-op.
- Tag the constant in code as provisional; name PR2 / bake-off as source of the final value.
- PR2 tightens using **tune-split** data (R1).

### R4. Baseline comparability

Do **not** compare new hybrid/RRF numbers to the 2026-07-31 keyword 92.5%. Re-run keyword / vector-only / RRF on the **deepened** corpus; report only same-corpus comparisons.

### R5. Easy-to-miss touch points

- PR1 must **rewrite** (not leave as regressions):  
  `tests/test_knowledge_base_service.py::test_rerank_cards_by_vector_orders_by_similarity`  
  and `::test_hybrid_retrieval_reranks_when_nomic_available`. Call out in the PR body.
- Decision 5: new `RetrievalMethod` member in `knowledge_base_service.py` + matching branches in `kb_retrieval_chip_label` / `kb_retrieval_detail_label` in `transparency_service.py`.
- Active implementation plan stays at **`docs/` root**. Analysis doc gets an archived banner pointing here.
- `.cursorrules` stays bootstrap-only: Plain talk ~2 lines (or MCP policy + link). Do not dump full review policy there.

### Good news (no extra work)

`tests/test_knowledge_base_service.py` rebuilds seed via `build_rag_db.py --seed`, so schema v3 + deepened seed flow through automatically.

---

## Maintainer sign-off checklist (PR2)

**Live sign-off packet: [audit/rag-pr2-signoff.md](audit/rag-pr2-signoff.md)** — 147 drafted
intents, the measured Q8 numbers, and the open question that blocks stage 6d.

Before rebuild / bake-off — **all checked 2026-08-09** (see [audit/rag-pr2-signoff.md](audit/rag-pr2-signoff.md)):

- [x] Eval query intents drafted **before** (or independently of) card text — not card→query echo
- [x] No query reuses distinctive noun phrases from its target card verbatim
- [x] Strategy cards reviewed (best-effort correctness + distinctness)
- [x] Eval fixtures + labels reviewed
- [x] Compat `gate_reachable` reporting understood; Q8 closed as D16
- [x] Tune/holdout split recorded
- [x] Explicit sign-off: “approved for rebuild and bake-off”

---

## Stage 1 — Embedding prefixes and corpus compatibility

Prefixes change the vector format — breaking for existing corpora. Blast radius: seed/dev only (no public publish yet).

- Add `format_embed_query()` / `format_embed_document()` to `py_modules/backend/services/ollama_embed_service.py` as the single owner of prefix logic. Port model-family branching from `scripts/eval_kb_embed_models.py`; eval **imports** these — no divergent copies.
- Apply `search_document:` in `build_rag_db.py:_populate_vectors_for_table`, and `search_query:` at the `embed_texts` call in `knowledge_base_service.py`.
- Bump `CORPUS_SCHEMA_VERSION` 2 → 3; add `embedding_variant: "nomic-prefixed-v1"` to the manifest.
- Compatibility gate in `retrieve_knowledge_context`: missing/mismatched `embedding_variant` or `embedding_model` → keyword with `retrieval_method="keyword_embed_unavailable"`.
- Replace silent `zip()` truncation in `_dot_similarity` with an explicit length check; mismatch skips the card and disables hybrid for that request.

## Stage 2 — RRF fusion, relevance floor, BM25 weighting

Applies to **strategy and compat**.

- Replace `_rerank_cards_by_vector` with RRF:  
  `score = w_fts/(k + rank_fts) + w_vec/(k + rank_vec)`, `k = 60`. Vectorless cards keep FTS contribution. Keep `w_fts`, `w_vec`, `k` as module constants for eval sweeps.
- Capture BM25 score in `_search_sections` and `_search_compat_patterns`; drop below floor; if all dropped → genre/compat fallback → `attached=False`.
- Column weighting: `bm25(sections_fts, 10.0, 1.0)`; `bm25(compat_patterns_fts, 5.0, 2.0, 1.0)`.
- PR1: provisional weights + **loose** floor (R3). PR2: lock from **tune** split; gate on **holdout** (R1). Trust tier is **not** in fusion yet (Phase 7).

## Stage 3 — Query construction fixes

- Separate `question_for_retrieval = lane.text` for `should_retrieve_knowledge` / `retrieve_knowledge_context`; keep follow-up block on `question_for_model` only.
- Drop `app_name` from expansion when `game_id` resolved; prepend only on unresolved-game path.
- Stopword filtering in `_fts_match_query`; raise token cap.

## Stage 4 — Scale and robustness

- Prefer manifest `embedding_section_count` / `embedding_compat_count`; else `EXISTS … LIMIT 1` instead of full-table `COUNT(*)`.
- Cache `nomic_embed_available` per `(host, model)` with short TTL.
- Batch embed in `build_rag_db.py` (batch_size=16), write incrementally, delete only after first successful batch, print progress.
- `VACUUM` + `PRAGMA journal_mode=DELETE` before `compress_db`; open corpus `?mode=ro&immutable=1`.

## Stage 5 — Transparency and attribution correctness

- Block trust tier = **lowest** tier present.
- `_format_block`: drop whole cards to fit budget; always emit end sentinel; `sources` from surviving cards only.
- `stack_context_blocks` reports which blocks survived; build KB transparency **after** stacking.
- Kill-switch off → distinct `RetrievalMethod` + labels (Decision 5).

## Stage 6 — Corpus depth, kill-switch, re-validated eval (PR2)

- Deepen `data/kb/strategy_seed.json` to ~8–12 sections per existing 11 titles (no net-new titles). Keep `write_attributions` in step. **After** query intents (R1).
- Grow eval fixtures toward ~150 English queries with tune/holdout; `gate_reachable` reporting (R2).
- Extend eval to keyword / vector-only / RRF + confidence intervals; non-overlapping-CI rule; same-corpus only (R4).
- Hybrid kill-switch: `sanitize_rag_hybrid_retrieval_enabled` (default `True`), schema/normalizers/payload, Developer tab toggle next to seed install. Honour before `nomic_ready`. No Ollama-tab focus-graph changes.
- Superseding report under `docs/archive/research/`; correction note on 2026-07-31 bake-off.

---

## Tests

Extend `tests/test_knowledge_base_service.py` (seed rebuild via `--seed` is automatic):

- Prefix application; eval and runtime agree
- Variant / dimension mismatch → keyword fallback
- RRF keeps strong keyword hit when vector missing
- Relevance floor → `attached=False` on weak cards (loose in PR1)
- Follow-up Asks retrieve on user question, not follow-up header
- Lowest trust tier in mixed block; whole-card drop + sentinel; stacking starvation → `attached=False`
- Kill-switch disables hybrid; keyword intact
- Rewrite cosine-only tests (R5)

Also: `tests/test_ollama_embed_service.py` prefix helpers; `tests/test_settings_service.py` new setting; `src/utils/settingsAndResponse.test.ts` frontend round-trip.

---

## Documentation (with each PR’s change set)

- `docs/roadmap.md` — active index; remediation row under [Planned](roadmap.md#planned); fixed-bug detail in [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md)
- `docs/knowledge-base.md` — correct Phase 2/3 hybrid claim; prefixes, variant, schema v3, floor, kill-switch
- `docs/testing.md` — RRF, floor, follow-up, variant mismatch, KB-EVAL-01 re-run; Deck rows **Open** until on-device
- `docs/troubleshooting.md` — rebuild after schema bump; Dev toggle
- `docs/archive/roadmap-completed.md` + `CHANGELOG.md` when shipped

---

## Verification

1. `python scripts/run_python_tests.py`
2. `pnpm vitest run` (settings / related suites)
3. `python scripts/build_rag_db.py --seed --out ./build/knowledge-base` — manifest `embedding_variant`, schema 3, batch progress
4. After maintainer sign-off: `python scripts/eval_kb_embed_models.py --write-report` — three-way on deepened corpus; **holdout** gate; compat overall vs gate-reachable
5. Point `rag_corpus_path` at pre-bump corpus → keyword fallback
6. On-Deck QA (`deck.deploy`, ingest): Strategy, troubleshooting, follow-up, hybrid off, corpus removed

Load `deck-dev-loop` before Stage 6 Dev-tab / deploy work.

---

## Out of scope

sqlite-vss / ANN, auto-pull `nomic-embed-text`, cross-lingual retrieval, vision→entity→retrieve, thumbs-demote, delta/packs, public HF publish (Phase 6), catalog-scale titles (Phase 8), net-new titles, compat phrase-gate **product** fix (Q8 open), trust-tier-in-RRF (Phase 7).
