> **Archived analysis** - active ship plan: [rag-retrieval-quality-remediation-implementation-plan.md](rag-retrieval-quality-remediation-implementation-plan.md). Do not implement from this doc; locked decisions and PR split live in the implementation plan.

# RAG retrieval quality remediation

## Context

A review of the shipped RAG path (Phase 2/3 hybrid) found that the retrieval quality
evidence base is unsound and that several fixable defects are likely suppressing hybrid
retrieval quality in production.

The root problem: `docs/archive/research/kb-embed-bakeoff-2026-07-31.md` concluded
"keyword baseline beat hybrid" and locked Phase 7 direction on that result. That
conclusion is an artifact of the harness, not a property of the architecture:

- `data/kb/strategy_seed.json` holds **22 sections across 11 games ? 2 per game**, while
  `HYBRID_FTS_SHORTLIST_K = 30`. The shortlist exceeds the entire strategy corpus, so on
  the 22 strategy eval queries the "FTS shortlist ? cosine re-rank" path is **vector-only
  search**, not hybrid. With a game filter applied the per-query pool is 2 cards, making
  top-3 unconditionally 100%.
- All six models tied at exactly 82.5% with bare == prompted for 5 of 6 ? a saturated,
  insensitive metric.
- The switch threshold (5.0 pts on n=40) equals 2 queries, well inside the ~�12 pt
  confidence interval at that sample size.

Separately, three defects degrade the shipped path regardless of the eval:

1. **Missing nomic task prefixes in production.** `scripts/eval_kb_embed_models.py:194,214`
   applies `search_query:` / `search_document:`; `build_rag_db.py:336` and
   `knowledge_base_service.py:507` apply neither. nomic-embed-text is trained asymmetric
   and requires them. The eval measures a configuration that is not shipped.
2. **The reranker discards BM25 entirely.** `_rerank_cards_by_vector`
   (`knowledge_base_service.py:282-299`) sorts purely by cosine and appends vectorless
   cards *after* every vector-scored card, so a #1 keyword hit sinks below a marginal
   cosine match. This is the most likely mechanical cause of the regression.
3. **No relevance floor.** `_fts_match_query` ORs every token including stopwords, so cards
   are injected on essentially every Strategy Ask, and the prompt instructs the model to
   ground in and cite them. Confidently-attributed irrelevant context is worse than none.

Intended outcome: a retrieval path whose hybrid mode is genuinely hybrid, an eval that can
detect the difference, and transparency that accurately reflects what the model received.

## Decisions locked with the user

| Decision | Choice |
|---|---|
| Eval corpus | **Deepen the real seed corpus now**; formally amend the strict Phase 5 gate in `docs/roadmap.md` |
| Hybrid posture | **Kill-switch in the Developer tab, default on** ? no Ollama-tab focus-graph changes |
| Scale fixes | **Include now** (full-table `COUNT(*)` per Ask; builder single-request embed) |

## Stage 1 ? Embedding prefixes and corpus compatibility

Prefixes change the vector format, so this is a breaking corpus change. Nothing is
published publicly yet (public publish is Phase 6), so blast radius is seed/dev corpora only.

- Add `format_embed_query()` / `format_embed_document()` to
  `py_modules/backend/services/ollama_embed_service.py` as the single owner of prefix
  logic. Port the model-family branching that already exists in
  `scripts/eval_kb_embed_models.py:_format_query` / `_format_document`, then have the eval
  **import** these instead of keeping its own copies ? that divergence is what let the eval
  and production drift apart.
- Apply `search_document:` in `build_rag_db.py:_populate_vectors_for_table`, and
  `search_query:` at the `embed_texts` call in `knowledge_base_service.py:507`.
- Bump `CORPUS_SCHEMA_VERSION` 2 ? 3 in `knowledge_base_schema.py`; add
  `embedding_variant: "nomic-prefixed-v1"` to the manifest in `build_rag_db.py:build_corpus`.
- Add a compatibility gate consumed by `retrieve_knowledge_context`: if the manifest lacks
  a matching `embedding_variant`, or `embedding_model` differs from the runtime model,
  hybrid is refused and retrieval falls back to keyword with
  `retrieval_method="keyword_embed_unavailable"`. Pre-existing corpora degrade safely
  rather than mixing prefixed queries against unprefixed documents.
- Replace the `zip()` in `_dot_similarity` (`:204`) with an explicit length check.
  Dimension mismatch currently truncates silently and returns plausible garbage; it must
  skip the card and disable hybrid for that request.

## Stage 2 ? RRF fusion, relevance floor, BM25 weighting

- Replace `_rerank_cards_by_vector` with reciprocal-rank fusion:
  `score = w_fts/(k + rank_fts) + w_vec/(k + rank_vec)`, `k = 60`. Cards without a vector
  retain their FTS rank contribution instead of being exiled to the tail. Keep `w_fts`,
  `w_vec`, `k` as module constants so the eval can sweep them.
- Capture the BM25 score in `_search_sections` and `_search_compat_patterns` (select
  `bm25(...) AS score` alongside the existing `ORDER BY rank`) and drop candidates below a
  floor constant. If every candidate is dropped, fall through to the existing
  `_genre_fallback` / `_compat_fallback`, then to `attached=False`.
- Add column weighting now that the score is explicit: `bm25(sections_fts, 10.0, 1.0)` to
  favour `name` over `card`, and `bm25(compat_patterns_fts, 5.0, 2.0, 1.0)`.
- Set the floor and fusion weights from the Stage 6 eval run ? do not guess them, and do
  not tune them before the corpus is deepened.

## Stage 3 ? Query construction fixes

- **Follow-up Asks retrieve on boilerplate.** `game_ai_request.py:185` prepends
  `build_reply_followup_context_block(...)` to `question_for_model`, which is then passed
  to `should_retrieve_knowledge` (`:270`) and `retrieve_knowledge_context` (`:293`). Since
  `_fts_match_query` keeps only the first 12 tokens, the query becomes
  `REPLY FOLLOW UP CONTEXT The user is refining their previous Ask ?`. Introduce a separate
  `question_for_retrieval = lane.text` and use it for both calls; `question_for_model`
  continues to carry the follow-up block to the LLM.
- **App-name expansion is silently dropped.** `_expand_query` appends `app_name` last;
  `_fts_match_query` keeps the first 12 tokens. Drop the app name entirely when `game_id`
  resolved (the search is already scoped by `game_id`, so it is pure BM25 noise that
  inflates cards repeating the title), and prepend it only on the unresolved-game path.
- Add stopword filtering to `_fts_match_query` and raise the token cap, so the OR query
  carries discriminative terms rather than `how`, `do`, `i`.

## Stage 4 ? Scale and robustness

- `corpus_has_usable_section_vectors` / `corpus_has_usable_compat_vectors`
  (`knowledge_base_schema.py:383-411`) run `SELECT COUNT(*) ? WHERE embedding IS NOT NULL`
  on every Ask ? a full scan over multi-KB BLOBs. Switch `_vector_table_count` to an
  `EXISTS`-style `SELECT 1 ? LIMIT 1`, and prefer the manifest's existing
  `embedding_section_count` / `embedding_compat_count` when present (the manifest is
  already loaded at `knowledge_base_service.py:485`).
- Cache `nomic_embed_available` per `(host, model)` with a short TTL ? it currently costs
  an uncached `/api/tags` round trip with a 3s timeout on every retrieval.
- `build_rag_db.py:_populate_vectors_for_table` embeds the whole corpus in one request with
  no batching or resume, and runs `DELETE FROM {table}` *before* the embed call, so a
  failure wipes existing vectors. Batch it (reuse the `batch_size=16` pattern already in
  `eval_kb_embed_models.py:_embed_batch`), write incrementally, delete only after the first
  successful batch, and print progress.
- `VACUUM` + `PRAGMA journal_mode=DELETE` before `compress_db`, and open the corpus
  `?mode=ro&immutable=1` in `_get_connection` ? the shipped DB is currently WAL-mode read
  by a read-only connection, which is fragile on exFAT SD cards.

## Stage 5 ? Transparency and attribution correctness

- Block trust tier is currently `cards[0].trust_tier` (`_format_block:395`), so a block
  containing one `wiki_verified` card and two `fallback_no_source` cards is labelled
  `wiki_verified`. Use the **lowest** tier present.
- `_format_block` byte-slices the joined text (`:421-423`), cutting cards mid-sentence and
  discarding the `--- End local knowledge base ---` sentinel while `sources` still lists
  the truncated cards. Drop whole cards to fit the budget, always emit the sentinel, and
  build `sources` only from surviving cards.
- `stack_context_blocks` can starve the KB block (Proton logs take budget first, 96 KiB cap
  against a 100 KiB ceiling) *after* `build_knowledge_base_transparency` has already
  recorded `attached=True` at `game_ai_request.py:303`. Have `stack_context_blocks` report
  which blocks survived, and construct KB transparency after stacking so `kb_attached` and
  `kb_sources` describe what the model actually received.

## Stage 6 ? Corpus depth, kill-switch, and re-validated eval

- Deepen `data/kb/strategy_seed.json` across the existing 11 titles to roughly 8?12
  sections per game (no net-new titles), so top-k selection is a real question. Keep
  `write_attributions` in `build_rag_db.py` in step with the new sources.
- Grow `tests/fixtures/kb_eval_v0.json` and `kb_eval_paraphrase_v0.json` toward ~150
  English queries.
- Extend `scripts/eval_kb_embed_models.py` to a three-way comparison ? keyword / vector-only
  / RRF ? and report confidence intervals. Replace the fixed 5.0-pt switch margin with a
  non-overlapping-CI rule so the decision threshold cannot sit inside the noise floor.
- Add the hybrid kill-switch following the existing `use_local_knowledge_base` plumbing:
  `sanitize_rag_hybrid_retrieval_enabled` in `settings_service.py` (default `True`, wired
  into the sanitized dict near `:440`), `ragHybridRetrievalEnabled` in
  `src/data/bonsaiSettingsSchema.ts`, `src/data/bonsaiSettingsNormalizers.ts` and
  `src/utils/settingsPayload.ts`, and a toggle in `src/components/DeveloperTab.tsx`
  alongside the existing seed-install control. `retrieve_knowledge_context` honours it
  before the `nomic_ready` check. No Ollama-tab focus-graph changes.
- Re-run the bake-off, write a superseding report under `docs/archive/research/`, and add a
  correction note to the 2026-07-31 report pointing at it.

## Tests

Extend `tests/test_knowledge_base_service.py` (existing seed-DB harness at `:28` rebuilds
the corpus via `build_rag_db.py --seed`, so deeper seed data flows through automatically):

- prefix application on both query and document paths; eval and runtime agree
- corpus/runtime embedding-variant and dimension mismatch ? keyword fallback, no silent truncation
- RRF keeps a strong keyword hit ranked when its vector is missing (direct regression on the old behaviour)
- relevance floor returns `attached=False` rather than injecting a weak card
- follow-up Asks retrieve on the user's question, not the follow-up header
- trust tier reports the lowest tier in a mixed block
- `_format_block` drops whole cards and preserves the end sentinel
- KB transparency reports `attached=False` when stacking starved the block
- kill-switch disables hybrid while leaving keyword retrieval intact

Add `tests/test_ollama_embed_service.py` cases for the new prefix helpers, and extend
`tests/test_settings_service.py` for the new setting's default and sanitization.
`src/utils/settingsAndResponse.test.ts` covers the frontend settings round-trip.

## Documentation (required in the same change set)

- `docs/roadmap.md` ? amend the strict Phase 5 gate to permit the seed deepening; pull RRF
  out of the Phase 7 umbrella row into this work.
- `docs/knowledge-base.md` ? correct the Phase 2/3 description (current text describes a
  cosine re-rank as hybrid), document prefixes, `embedding_variant`, schema v3, the
  relevance floor, and the kill-switch. Update the bake-off conclusion at `:122` and `:221`.
- `docs/testing.md` ? new KB rows for RRF, floor, follow-up retrieval, and variant
  mismatch; KB-EVAL-01 re-run row. Keep Deck-facing rows **Open** until on-device evidence exists.
- `docs/troubleshooting.md` ? corpus rebuild requirement after the schema bump; developer toggle.
- `docs/archive/roadmap-completed.md` and `CHANGELOG.md` ? record the corrected hybrid claim.

## Verification

1. `python scripts/run_python_tests.py` ? full backend suite.
2. `pnpm vitest run` ? frontend settings and preset-carousel suites.
3. `python scripts/build_rag_db.py --seed --out ./dist/knowledge-base` with local Ollama
   running; confirm the manifest reports `embedding_variant`, schema 3, and non-zero
   section/compat counts, and that batching progress prints.
4. `python scripts/eval_kb_embed_models.py --write-report` ? confirm RRF beats the keyword
   baseline on the deepened corpus with non-overlapping CIs. **This is the gate for the
   fusion weights and relevance floor constants.**
5. Sanity-check the compatibility gate by pointing `rag_corpus_path` at a pre-bump corpus
   and confirming retrieval falls back to keyword rather than mixing vector formats.
6. On-Deck QA via Decky Plugin Studio (`deck.deploy`, `deck.tailIngest`): Strategy Ask with
   the deepened seed corpus, a troubleshooting Ask, a follow-up Ask, hybrid toggled off,
   and the corpus removed. Capture evidence before flipping any `docs/testing.md` row to
   Verified.

Per `AGENTS.md`, run `bonsai.session.bootstrap` before starting and load the `deck-dev-loop`
workflow before the Deck UI and settings changes in Stage 6.

## Out of scope

sqlite-vss / ANN indexing, auto-pulling `nomic-embed-text`, cross-lingual retrieval,
vision?entity?retrieve, thumbs-demote, delta/packs, public HF publish (Phase 6), and
catalog-scale titles (Phase 8). Net-new titles are excluded ? Stage 6 deepens the existing
11 only.