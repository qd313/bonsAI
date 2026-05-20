# Llama.cpp provider spike (POC)

**Status:** **Approved for POC spike** (2026-05-19) — not started.  
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

- `main.py` — eval-only routing hook (gated)
- Provider spike notes (this doc)
- [troubleshooting.md](../troubleshooting.md) — maintainer setup for llama.cpp on Deck (if hook is exercised)

---

## Changelog

- **2026-05-19:** User approved POC spike alongside Ollama; aligned doc with non-shippable scope (replaces stub).
