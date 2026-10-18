# bonsAI testing — automated (agents / CI)

Commands and suites that can run **without** a human on the Steam Deck.

Hub: [testing.md](testing.md). On-Deck: [testing-manual.md](testing-manual.md).

---

## Gates (every change set)

Run from repo root. Skip with **N/A** in the PR when a step does not apply (e.g. docs-only).

| Step | Command | When |
|------|---------|------|
| Typecheck | `pnpm exec tsc --noEmit` | Any TS change or dependency bump |
| Frontend unit tests | `pnpm test` | Any `src/` change (includes Vitest Decky harness under `src/test-harness/`) |
| Backend unit tests | `pnpm run test:py` | Any `main.py`, `py_modules/backend/`, or `tests/` change |
| Bundle | `pnpm run build` | Any `src/` or build config change |
| Deck deploy build | `.\scripts\build.ps1` or `./scripts/build.sh` | Any `src/`, `main.py`, `plugin.json`, or Deck-facing asset change |
| Plugin zip CI | **Build plugin zip** in Actions (or `bash scripts/verify-decky-plugin-zip.sh` on `out/*.zip`) | Workflow / zip script changes |

---

## PR-scoped matrix

Extend gates when these paths change; prefer the narrowest tests first.

| Touched area | Extra automated focus | Then on Deck (manual) |
|--------------|----------------------|------------------------|
| `settings_service.py`, `settingsAndResponse.ts`, Settings UI | `tests/test_settings_service.py`, `src/utils/settingsAndResponse.test.ts` | Tier 0 SMOKE-A + persist spot-check |
| `main.py` background Ask / abort / settings save locks | `test_background_abort_busy`, `test_settings_save_lock`, store lock tests | Tier 1 SMOKE-H |
| `intent_pack_service.py` | `tests/test_intent_pack_service.py` | Settings → intent packs (until obsolete) |
| `voice_transcription_service.py` | `tests/test_voice_transcription_service.py` | Tier 2 voice |
| `ollama_service.py`, `backend/ollama/ollama_routing.py` | `test_ollama_service`, `test_backend_helpers` | Tier 1 one Ask per changed mode |
| `desktop_note_service.py` | `tests/test_desktop_note_service.py` | Tier 2 desktop notes |
| `ai_character_service.py`, character UI | character + pyro tests under `tests/` / `src/data/` | Tier 2 character |
| `capabilities.py`, Permissions UI | `tests/test_capabilities.py` | Tier 0 SMOKE-C |
| `MainTab.tsx`, unified input | `pnpm test` | Tier 0 SMOKE-A |
| `src/index.tsx` tabs, CSS, RPC | Full gates above | Tier 0 SMOKE-A |
| `ollama_mdns_discovery_service.py` | `tests/test_ollama_mdns_discovery_service.py` | Tier 2 mDNS |
| Knowledge base / transparency KB | `test_knowledge_base_*`, `test_transparency_kb_retrieval` | KB-SMOKE on Deck |
| Model routing | `tests/test_model_routing_order.py` | ROUTING-01…04 |
| Reply follow-up / micro-actions | `tests/test_reply_followup.py` | MICRO-01…05 |
| Stream / thinking tags | `test_bonsai_stream_tags`, stream Vitest | STREAM / THINKING rows |

Hotspots: [development.md](development.md#change-risk-hotspots) or MCP `bonsai.arch.hotspots`.

---

## Agent checklist (docs / feature ship)

When marking Deck-facing work done:

1. Automated gates green for touched paths
2. Coverage row updated in [testing.md](testing.md) (Open → Partial/Verified as appropriate)
3. New focus control → FOCUS-GRAPH checklist in [testing-manual.md](testing-manual.md)
4. [roadmap.md](roadmap.md) updated in the same change set
