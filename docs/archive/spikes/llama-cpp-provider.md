> **Archived** — see [archive README](README.md). Active doc: [development.md](../development.md)

# Llama.cpp provider spike (POC)

**Status:** **POC scaffold shipped** (2026-05-20) — maintainer env-gated only.  
**Decision:** Add local **llama.cpp** inference evaluation **alongside** Ollama. This phase is **proof-of-concept only**; a shippable Decky provider is explicitly **out of scope** until a later go/no-go.

**Related:** [backlog-implementation-plan.md](../backlog-implementation-plan.md) Phase 5 · [roadmap.md](../roadmap.md) → **Llama.cpp provider spike**.

---

## Goal

Determine whether bonsAI can route Ask traffic to a **local llama.cpp** server (loopback or user-started binary) with acceptable parity vs Ollama for chat, streaming, and model load — and whether a **future** first-class provider is worth the maintenance cost on Deck.

**Success = evaluation artifact**, not user-facing ship.

---

## In scope (POC)

| Deliverable | Notes |
|-------------|--------|
| **API parity matrix** | Chat completions, streaming, context length, tokenizer assumptions vs current Ollama path |
| **Deck constraints** | VRAM (~16GB class), cold start, binary packaging assumptions, no secrets in repo |
| **Go/no-go + phased path** | Recommendation for shippable provider vs stay Ollama-only |
| **Optional dev hook** | Minimal `main.py` branch or env-gated ask path to hit llama.cpp for maintainer tests only |

---

## Out of scope (this spike)

- Settings / Connection UI for llama.cpp hosts
- Default or production routing switch away from Ollama
- Model pull/catalog parity with Ollama
- Vision/multimodal paths
- Shipping in plugin zip or documenting end-user install as supported

---

## Expected files when active

- `py_modules/backend/services/llama_cpp_provider.py` — HTTP POC + parity matrix helper
- `main.py` — eval-only routing when `BONSAI_LLAMACPP_ASK=1` and `BONSAI_LLAMACPP_BASE` is set
- Provider spike notes (this doc)
- [troubleshooting.md](../troubleshooting.md) — maintainer setup for llama.cpp on Deck (if hook is exercised)

### Maintainer eval (env only)

| Variable | Purpose |
|----------|---------|
| `BONSAI_LLAMACPP_ASK` | Set to `1` to route Ask through llama.cpp instead of Ollama |
| `BONSAI_LLAMACPP_BASE` | Base URL, e.g. `http://127.0.0.1:8080` |
| `BONSAI_LLAMACPP_MODEL` | Optional model id (default `default`) |

**Go/no-go (2026-05-20):** Stay **Ollama-only** for shippable Deck UX until streaming parity, vision, and pull/catalog story exist. POC is sufficient to compare latency and reply quality on a maintainer-started server.

---

## Changelog

- **2026-05-20:** POC module + env-gated `ask_ollama` branch; parity matrix documented; go/no-go recorded.
- **2026-05-19:** User approved POC spike alongside Ollama; aligned doc with non-shippable scope (replaces stub).
