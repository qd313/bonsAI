# KB embed model bake-off

> Links in this file into the roadmap may be stale: the roadmap was split and trimmed on 2026-10-03 (plan 80). Current files: [roadmap.md](../../roadmap.md), [roadmap-kb.md](../../roadmap-kb.md), [roadmap-shelved.md](../../roadmap-shelved.md).

> **Superseded 2026-08-09 — do not cite the conclusions below.** Three defects were found in
> what this run measured. (1) **The hybrid arm was not the shipped code.** The eval applied
> `search_query:` / `search_document:` task prefixes; production embedded bare text. So "hybrid"
> here and "hybrid" on device were different systems, and the headline *keyword beat hybrid*
> compared keyword against something users never ran. (2) **Ranking was cosine-only re-rank,
> not fusion** — replaced in remediation PR1 by RRF. (3) **83% of the compat cases were
> unroutable** at the time (fixed as D16). The **latency** column and the *models are
> indistinguishable at this corpus size* observation still stand for the old seed.
> **Superseding report:** [kb-retrieval-pr2-bakeoff-2026-08-09.md](kb-retrieval-pr2-bakeoff-2026-08-09.md)
> (holdout: no separation between keyword and RRF on the deepened corpus).

Date: 2026-07-31
Ollama: `http://127.0.0.1:11434`
Corpus: `C:\Users\still\Documents\BonsAI\dist\knowledge-base-embed-bakeoff\corpus.db`

## Recommendation

Keep `nomic-embed-text`: best prompted top-3 is `nomic-embed-text` at 82.5% vs baseline 82.5% (margin +0.0 pts; need ≥5.0 to switch).

**Winner under locked rule:** `nomic-embed-text`

## Key findings

- All six FOSS embed models **tied at 82.5%** prompted top-3 on English eval + paraphrases (33/40 queries).
- **Keyword-only baseline beat hybrid:** 92.5% top-3 / 85.0% top-1 vs 82.5% for every hybrid model — FTS shortlist + cosine re-rank did not improve over keyword order on this seed corpus; investigate before shipping a heavier embed default.
- **Latency:** `nomic-embed-text` fastest mean query embed (~35 ms); v2-moe / arctic / bge-m3 ~190–230 ms.
- **Spanish probe (informational):** FTS-gated hybrid caps most models at 71.4% top-3; vector-only over all compat tips reaches 85.7% for v2-moe and arctic — cross-lingual gains need architecture beyond current FTS-first gate.

## English aggregate (kb_eval_v0 + paraphrases)

Scoring uses `max(ask_mode top_k, 3)` so top-3 is meaningful when fixtures use speed mode.

| Model | Bare top-1 | Bare top-3 | Prompted top-1 | Prompted top-3 | Mean embed ms | FTS empty % |
|-------|------------|------------|----------------|----------------|---------------|-------------|
| nomic-embed-text | 82.5% | 82.5% | 82.5% | 82.5% | 34.5 | 7.5% |
| nomic-embed-text-v2-moe | 82.5% | 82.5% | 82.5% | 82.5% | 189.6 | 7.5% |
| qwen3-embedding:0.6b | 82.5% | 82.5% | 82.5% | 82.5% | 141.1 | 7.5% |
| mxbai-embed-large | 82.5% | 82.5% | 82.5% | 82.5% | 43.7 | 7.5% |
| snowflake-arctic-embed2 | 82.5% | 82.5% | 82.5% | 82.5% | 229.7 | 7.5% |
| bge-m3 | 82.5% | 82.5% | 80.0% | 82.5% | 200.2 | 7.5% |

## Keyword-only baseline

- Top-1: **85.0%**
- Top-3: **92.5%**
- FTS empty: **7.5%**

## Spanish probe (informational — does not pick winner)

| Model | Hybrid bare top-3 | Hybrid prompted top-3 | Vector-only bare top-3 | Vector-only prompted top-3 |
|-------|-------------------|----------------------|------------------------|----------------------------|
| nomic-embed-text | 71.4% | 57.1% | 57.1% | 57.1% |
| nomic-embed-text-v2-moe | 71.4% | 71.4% | 85.7% | 71.4% |
| qwen3-embedding:0.6b | 71.4% | 71.4% | 71.4% | 71.4% |
| mxbai-embed-large | 71.4% | 57.1% | 42.9% | 57.1% |
| snowflake-arctic-embed2 | 71.4% | 71.4% | 71.4% | 85.7% |
| bge-m3 | 71.4% | 71.4% | 71.4% | 71.4% |

## Winner rule (locked)

1. Highest **prompted top-3** on English eval + paraphrases.
2. Ties → top-1, mean embed latency, download size.
3. Switch only if margin over `nomic-embed-text` prompted top-3 ≥ **5.0** points.

## Follow-on (locked into Phase 7, 2026-07-31)

Intent / paraphrase / cross-lingual work lives in **RAG Phase 7** — not an embed-model swap. See [knowledge-base.md](../../knowledge-base.md) § Phase 7 and [roadmap.md](../../roadmap.md) Phase 7:

- Keep **`nomic-embed-text`**; one vector table per corpus download.
- Ranking **C:** keyword-heavy when FTS is strong; meaning fallback when FTS is empty/weak.
- Cross-lingual v1: **gated translate → English → search** (rare LLM call; not nomic).
- Fuzzy glossary nice-to-have; multilingual second embed only later via second corpus or on-device re-embed.

## Raw JSON

Full payload: `docs/archive/research/kb-embed-bakeoff-2026-07-31.json`
