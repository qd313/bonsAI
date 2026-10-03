> **Archived** — see [archive README](README.md). Active runtime doc: [knowledge-base.md](../../knowledge-base.md).

# RAG knowledge sources (research)

> Links in this file into the roadmap may be stale: the roadmap was split and trimmed on 2026-10-03 (plan 80). Current files: [roadmap.md](../../roadmap.md), [roadmap-kb.md](../../roadmap-kb.md), [roadmap-shelved.md](../../roadmap-shelved.md).

> **Superseded for runtime architecture** by [knowledge-base.md](../../knowledge-base.md) (on-Deck offline v1, shipped 2026-07-12). This note retains source research and licensing context for the maintainer corpus pipeline.

v1 uses **on-Deck SQLite + FTS5** (not PC-hosted Chroma). Ingest runs on the **maintainer PC** via `scripts/build_rag_db.py`.

## Design constraints (v1 shipped)

- **Corpus runs on the user's Deck** after one-time download (Hugging Face primary, GitHub Releases mirror).
- **Embeddings:** `nomic-embed-text` baked into DB; **unused at runtime until Phase 2** hybrid retrieval.
- **Vector store:** SQLite FTS5 over distilled strategy cards; no Chroma in v1.
- **Permission:** Model A — download button + ConfirmModal; no new capability (local read only). No user Ask text uploaded.

## Permissible compat sources (v1)

Redistribute **only** from clearly permissible surfaces:

- **GamingOnLinux** — public articles; attribute and link.
- **Valve / Steam KB** — official FAQ and support pages.
- **Maintainer-authored compat patterns** — distilled notes, not bulk ProtonDB/Reddit redistribution.

**Not in v1 corpus:** ProtonDB bulk scrape, Reddit bulk redistribution, undocumented APIs.

## Tier 1 candidates (high value for Steam Deck / Proton)

- **ProtonDB** — Reference only for maintainer research; **do not bulk-redistribute** in the downloadable corpus. **Risk:** medium (layout/API drift).
- **Reddit** — User-owned API on maintainer PC for research only; **not** bulk-redistributed. **Risk:** medium (auth, quotas).
- **Steam / Valve public KB** — Official FAQ and support pages; **permitted** when distilled with attribution. **Risk:** low–medium.

## Tier 2 candidates

- **GamingOnLinux** — RSS or public article URLs; attribute and link (**permitted** for compat patterns).
- **Lutris / WineHQ wiki** — Public wiki export or selective fetch; rate limit; attribution.
- **Are We Anti-Cheat Yet?** — Public site or API if available; game-level compatibility signal.
- **GitHub** (issue titles for Proton-adjacent repos) — GitHub REST API; mind quotas; store minimal text.

## Tier 3 / deferred

- **Broad Steam Store HTML scraping** — High ToS/legal risk; avoid unless explicitly cleared.
- **Discord / private forums** — Impractical for default product without explicit user export.

## Maintenance

- Add or re-rank sources as APIs change; use the same star effort/risk language as [roadmap.md](../../roadmap.md) when promoting items into formal Candidate Features.
- Runtime architecture and manifest layout: [knowledge-base.md](../../knowledge-base.md). Maintainer build: `scripts/build_rag_db.py`.
