# Web permission — discovery (Ask live search)

Discovery for the **Web permission** Planned item. Roadmap stub: [roadmap.md](../roadmap.md#features).

---

- ★★★★ **Web permission** (Ask live search + online deps — discovery in progress)
  - **Goal:** Opt-in capability so Ask can fetch live answers about current games/patches/news (web search spine). Offline Ask + local KB remain usable when permission is off or network is down. HF AppID card streaming and Ollama catalog freshness are dependents / related follow-ons, not the primary job.
  - **Status:** Discovery in progress (2026-07-30); **docs only** — not implementing yet. Resume discovery or say “ready to plan” to lock a full plan into this bullet.
  - **Discovery locked (2026-07-30):**
    - Spine = **web search for Ask**; HF stream + Ollama catalog updates are dependents/follow-ons (**bundle model C**).
    - Primary user job = live patches/news/current-game answers (not smaller KB first).
    - Offline contract = always usable when Web off or network down; only live/extra bits skipped.
    - Wanted product pieces: **citations in Show details**, **domain allowlist**, **freshness chip**, **HF card stream by AppID**.
    - Auto-search when question looks “current” (**consent A**).
    - Kids Master Lock → Web **forced off** (cannot enable).
    - Enabling Web → **ConfirmModal** explaining in simple terms that Ask text (and maybe game AppID/title) may leave the Deck to a search provider.
    - Search implementation tech = undecided; choose for Deck latency + privacy at implement time.
    - Domain allowlist starter set OK for now (Steam news/changelog, ProtonDB, relevant wikis; HF host for cards).
    - HF stream intended to **replace the big zip download over time**.
    - Ollama “constantly updates models it can pull” = **related follow-on Planned item**, not in this bullet’s ship scope.
  - **Useful ideas deferred / not locked:** per-Ask opt-in, cache+TTL, bandwidth caps, Steam context in query, KB vs web conflict policy (see open decisions).
  - **Depends on:** Capability Permission Center; Kids Master Lock; existing Show details / Source patterns; Strategy spoiler fencing (interaction TBD).
  - **Related (separate):** Ollama Pull Models living catalog refresh / Update AI & models (already partly shipped) — do not merge into this item; track as follow-on if needed. RAG Phases 4–8 (zip/corpus) may need reconcile when HF stream replaces zip.
  - **Not in scope (this item):** shipping search/HF stream code yet; merging catalog refresh into v1; requiring agentic multi-hop search.
  - **Open decision points** (hold for implement / next discovery — do not block this stub):
    1. **“Current” heuristic triggers** — Which intents auto-search? (patch/changelog, news/release, live MP/outage, prices/sales, SteamOS/Proton version, date words, other)
    2. **False-positive preference** — Extra search OK vs prefer miss vs cancelable “Searching web…” affordance
    3. **Latency budget** — +2–5s / +5–15s / progress UI only
    4. **KB vs web conflict** — Web-by-freshness / KB for strategy·web for patches / always both+Show details / defer
    5. **Citations v1** — title+domain+link vs title+domain only; snippet quote optional?
    6. **Freshness chip placement** — Show details only / bubble chip / both; clock = fetched-at vs page published/updated
    7. **Local-only transparency** — Silence when heuristic skips vs quiet “Local only” under Show details
    8. **Roadmap shape vs HF stream** — Search-first then HF phase of same epic / one Planned with phases / two Planned items
    9. **Reconcile with RAG Phases 4–8** — Evolve Phase 6+ to card API / parallel track superseding zip / note conflict and resolve later
    10. **End-state without zip** — Web ON → on-demand AppID cards; Web OFF → local corpus or model-only — confirm
    11. **Metered / weak Wi‑Fi** — Hard skip / soft toast / nothing in v1
    12. **Spoilers + web** — Fence like KB / exclude from Strategy / allow with citation only
  - **Follow-up discovery prompts** (when resuming):
    - Non-goals: upload of screenshots/logs with web search? telemetry?
    - Provider choice constraints (no API key vs user-supplied vs bonsAI-proxied)?
    - Cache retention of search snippets / HF cards on disk (privacy wipe on Clear all data)?
    - Star weight / hard deps on Phase 4–6 (revisit if scope grows)
    - D-pad: Permissions row + ConfirmModal focus graph; any Main-tab “Searching…” control
    - Testing rows: Web on/off, Kids Lock, offline failover, allowlist miss, Show details cites
