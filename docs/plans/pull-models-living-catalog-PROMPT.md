# Copy-paste prompt: Pull Models living catalog plan

Use this in a **new Cursor chat** (Agent or Plan mode). Do not implement until the plan is agreed.

---

## Prompt

I want a **implementation plan** for making the bonsAI **Pull models** picker a **living catalog** — not only a static list shipped in `src/data/pullModelCatalog.ts`.

### Context (current behavior)

- **Curated catalog** is static in `PULL_MODEL_CATALOG` (`src/data/pullModelCatalog.ts`): tags, `releasedYm`, blurbs, modes, deck-fit rating, groups, offline `sizeGb`.
- **Live today on modal open/refresh:**
  - Installed tags via `test_ollama_connection` (local Ollama `/api/tags`).
  - Manifest **sizes** via `fetch_ollama_catalog_metadata` → `registry.ollama.ai` (`py_modules/backend/services/ollama_catalog_service.py`). Does **not** fetch release dates or discover new library models.
- **UI:** `PullModelsModal.tsx` + scoped CSS in `bonsaiScopeStylesheet.ts`.
- **“Other installed”** rows show pulls outside the curated list.
- **Deck daily** toggle hides `stretch` group; Expert filter targets stretch/high-rating strategy; FOSS / installed toggles exist.
- **Routing** uses separate chains in `model_policy.py` / `refactor_helpers.py` — catalog parity test in `tests/test_pull_model_catalog_parity.py`.

### What I want from the plan

1. **Product goals** — What should update automatically vs stay curated? (e.g. new Ollama library models, sizes, dates, deck-fit scores, suggested pulls, deprecation of bad tags.)
2. **Source of truth** — Options: Ollama library API, Hugging Face, remote JSON hosted by bonsAI, hybrid (auto-discover tags + local metadata overlay). Tradeoffs for Decky plugin (offline-first, no surprise network, FOSS).
3. **Data model** — Extend `PullModelEntry` or split “discovered” vs “curated overlay”; how `releasedYm`, modes, rating, group survive without a plugin release.
4. **Backend** — New RPCs or extend `fetch_ollama_catalog_metadata`; caching, timeouts, sandbox/preview behavior; security (allowlist hosts, tag regex already in `ollama_catalog_service.py`).
5. **Frontend** — Merge discovered + curated rows; empty states; refresh UX; keep D-pad focus graph and table layout constraints (QAM width, no horizontal spill).
6. **Compatibility** — Updating Ollama binary/models on Deck (`local_ollama_setup_service`, Settings “Update Ollama & Models”) vs catalog refresh; “other installed” behavior.
7. **Testing** — Preview suite scenarios, pytest for merge logic, parity with `model_policy`.
8. **Rollout** — Phases (MVP: discover tags only → overlay metadata → optional remote config). GTA ★ ratings per roadmap style.
9. **Subagent reports** — FOSS advocate, security-auditor, red/blue if ship scope is large.

### Constraints

- Steam Deck / Decky QAM UX is primary; preview MCP for fast iteration.
- Prefer self-hosted / transparent flows; document any required network calls.
- Do **not** implement yet — deliver a plan with file touch list, risks, and phased todos I can approve.

### My preferences (fill in before sending)

- [ ] Auto-add every new model in `ollama list` / library vs only models matching allowlist patterns
- [ ] Whether deck-fit ★ and modes must remain human-curated
- [ ] Whether plugin release is still needed for routing/policy changes
- [ ] Acceptable network calls on Deck (registry only vs full library crawl)

---

After the plan is approved, we'll implement in a follow-up chat.
