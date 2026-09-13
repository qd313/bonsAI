# RAG remediation PR2 — maintainer sign-off

**Status: CLOSED 2026-08-09.** Queries approved, 13-title / 119-section seed carded, labels
filled for covered intents, corpus rebuilt at schema v3, three-way bake-off run, fusion
constants locked, superseding report written.

Live bake-off: [kb-retrieval-pr2-bakeoff-2026-08-09.md](../archive/research/kb-retrieval-pr2-bakeoff-2026-08-09.md).

This was the R1 gate from
[rag-retrieval-quality-remediation-implementation-plan.md](../rag-retrieval-quality-remediation-implementation-plan.md).

---

## 1. Fixture

[tests/fixtures/kb_eval_v2.json](../../tests/fixtures/kb_eval_v2.json) — **221** queries,
tune 157 / holdout 64, strategy 181 / compat 40, **140 labeled**. Status:
`approved_for_rebuild_and_bakeoff`. Blank `expect_*` rows are deliberate content gaps
(power-user / needs_clarification / no covering card) and are expected misses.

Authoring rules: [rag-eval-query-style.md](rag-eval-query-style.md).

---

## 2. D16 (compat gate) — closed 2026-08-06

Reachability **3/40 → 39/40**, **13/13** blind holdout, **0/107** strategy false positives.
Decision record: [maintainer-decisions-locked.md](maintainer-decisions-locked.md) § D16.

---

## 3. Bake-off result (2026-08-09)

| Slice | keyword top-3 | RRF top-3 | Verdict |
|---|---|---|---|
| labeled tune (n=104) | 88.5% | 86.5% | locking evidence only |
| labeled holdout (n=36) | 83.3% [69.4, 94.4] | 80.6% [66.7, 91.7] | **no separation** |
| compat gate-reachable (n=39) | 66.7% | 59.0% | keyword leans ahead |

Locked constants: `RRF_K=60`, `RRF_W_FTS=1.0`, `RRF_W_VEC=1.0`, `BM25_RELEVANCE_FLOOR=1.0`.
Hybrid stays on by default; kill-switch unchanged.

---

## 4. Checklist

- [x] Eval query intents drafted **before** card text — not card → query echo
- [x] No query reuses distinctive noun phrases from its target card verbatim *(enforced by test)*
- [x] Query intents approved by the maintainer, 2026-08-09
- [x] Portal 2 and Half-Life 2 in scope for cards — 13 titles
- [x] Strategy cards reviewed — 119 sections across 13 titles
- [x] Eval fixtures + labels reviewed — 140 labeled; blanks are deliberate gaps
- [x] Compat `gate_reachable` reporting; Q8 closed as D16
- [x] Tune/holdout split recorded — 157 / 64 (140 labeled: 104 / 36)
- [x] `source_url` rule decided and enforced, 2026-08-09
- [x] Explicit sign-off: **approved for rebuild and bake-off** (2026-08-09)
- [x] Corpus rebuilt, three-way bake-off run, constants locked, superseding report written

---

## 5. What shipped after sign-off

1. Cards covering strategy intents across 13 titles (wiki-sourced where licences allow).
2. Labels filled for covered intents; fixture flipped out of `awaiting_maintainer_signoff`.
3. Schema-v3 rebuild with `nomic-embed-text` prefixes.
4. Arms bake-off on the deepened corpus; holdout gate under the non-overlapping-CI rule.
5. Fusion weights / floor locked equal (no separation).
6. Superseding research report under `docs/archive/research/`.
