# RAG knowledge sources (research)

This note supports the roadmap item **RAG knowledge base (PC-hosted ingest + Deck query)**. It is **planning only** until the ingest service and Deck integration are implemented.

## Design constraints

- **Ingest runs on the user’s PC** (alongside Ollama), not inside the Decky plugin bundle.
- **Embeddings:** Ollama **`nomic-embed-text`** via HTTP `/api/embed`; same model at index and query time.
- **Vector store:** ChromaDB persistence on disk (path documented in PC service README when shipped).
- **Permission:** Deck outbound calls require a future **`network_web_access`** capability plus explicit confirm for “Update knowledge on PC.”

## Tier 1 candidates (high value for Steam Deck / Proton)

- **ProtonDB** — Prefer bulk/export or documented API; avoid aggressive HTML scrape. Respect site terms and rate limits. **Risk:** medium (layout/API drift).
- **Reddit** (e.g. r/SteamDeck, r/linux_gaming) — **Reddit API** with user-owned app credentials on the PC only. **Risk:** medium (auth, quotas); follow Reddit API Terms.
- **Steam / Valve public KB** — Official FAQ and support pages only. **Risk:** low–medium; stay on clearly public surfaces.

## Tier 2 candidates

- **GamingOnLinux** — RSS or public article URLs; attribute and link.
- **Lutris / WineHQ wiki** — Public wiki export or selective fetch; rate limit; attribution.
- **Are We Anti-Cheat Yet?** — Public site or API if available; game-level compatibility signal.
- **GitHub** (issue titles for Proton-adjacent repos) — GitHub REST API; mind quotas; store minimal text.

## Tier 3 / deferred

- **Broad Steam Store HTML scraping** — High ToS/legal risk; avoid unless explicitly cleared.
- **Discord / private forums** — Impractical for default product without explicit user export.

## Maintenance

- Add or re-rank sources as APIs change; use the same star effort/risk language as [roadmap.md](roadmap.md) when promoting items into formal Candidate Features.
- When implementation lands, link the PC service README and `scripts/build_rag_db.py` (or successor) from [development.md](development.md).
