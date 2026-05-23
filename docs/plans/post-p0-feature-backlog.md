# Post-P0 feature backlog & model truth plan

**Status:** Implemented (2026-05-20) — see repo changelog / roadmap mirrors; SteamOS share path remains user-owned out of scope.

**Overall scope:** ★★★★ (multi-surface product work across settings, RPC, prompts, and Deck UX).

Star ratings use the GTA scale from [roadmap.md](../roadmap.md): `★` easiest … `★★★★★★` extreme scope.

---

## Model truth (recommended approaches)

Three complementary layers (user-approved). Implement in phases after P0 bugs are stable.

| Approach | Stars | Summary |
|----------|-------|---------|
| **A. Deprioritize / blocklist in picker** | ★★★ | UI + routing: hide or sort known-bad tags in Pull Models and downgrade them in `select_ollama_models` fallback order. |
| **B. Post-check (second model or rules)** | ★★★★ | After primary reply: lightweight rules (regex/structure) or tiny verifier model for “invented AppID”, missing JSON when promised, etc. |
| **C. Citations / “I don’t know”** | ★★★ | Prompt + UI: require uncertainty when context is thin; optional `bonsai-cite` or footnote fences for log/screenshot-derived claims. |

### Recommended default deprioritize / blocklist

Based on `refactor_helpers.py` chains, `pullModelCatalog.ts`, and Deck ~16GB VRAM targets. **Deprioritize** = move after safer tags; **block** = omit from curated Pull list only (user can still manual-pull).

| Tag / family | Action | Rationale |
|--------------|--------|-----------|
| `qwen2.5:1.5b` | Deprioritize (text speed chain) | Fast but weak instruction-following and hallucination-prone on multi-step Deck/Proton questions. |
| `tinyllama`, `orca-mini`, `vicuna` (if present locally) | Deprioritize | Legacy small chat models; poor tool-following vs current Qwen/Llama mids. |
| `llava:latest` / undifferentiated `llava` | Deprioritize below `llava:7b` | Ambiguous tag; often pulls heavier blob than `llava:7b` on Deck. |
| `gemma3:27b`, `gemma4:31b`, `qwen2.5:32b`, `qwen3.5:32b` | Deprioritize unless high-VRAM toggle | OOM/swap risk on 16GB; keep only in high-VRAM tail. |
| `qwen3-vl:30b-a3b`, `internvl3.5:38b`, `internvl2.5:38b` | Block in Pull catalog; deprioritize in chains | Specialist/heavy VL; poor default for handheld latency. |
| `mistral`, `mixtral` (non-FOSS tier) | Tier-gate only | Already policy-tier limited; do not promote in Tier-1 UI. |
| Unknown / unclassified tags | Tier 3 only | Matches existing `model_policy` contract. |

**Do not block** `qwen2.5:3b`, `qwen2.5:7b`, `qwen2.5:14b`, `llava:7b`, `qwen2.5vl:3b` — these are the shipped FOSS-safe backbone.

---

## Deferred features (from P0 scope cut)

### Named Ollama hosts (quick switch) — ★★★

- **Files:** `py_modules/backend/services/settings_service.py`, `src/utils/settingsAndResponse.ts`, `src/components/SettingsTab.tsx`, Connection persistence helpers.
- **Acceptance:** User saves 2–4 labeled `host:port` entries; one-tap switch updates Ask/Test target; LAN vs local-on-Deck rules documented.
- **Roadmap mirror:** [roadmap.md](../roadmap.md) → Named Ollama hosts.

### Per-turn feedback (thumbs / quality) — ★★★

- **Files:** `src/components/MainTab.tsx`, `main.py` (optional RPC), `Desktop/bonsAI_logs` or local JSONL.
- **Acceptance:** Optional thumbs on last exchange; stored locally only; no network without new permission.
- **Not in scope:** Model fine-tuning pipeline.

### Thinking blurb during reply — ★★★

- **Files:** `ollama_service.py`, `main.py` (background status), `useBackgroundGameAi.ts`, `MainTab.tsx`, `src/types/backgroundAsk.ts`.
- **Acceptance:** Model-emitted `<bonsai-status>` extracted from the live stream; shown in pending UI; stripped from final reply; deterministic phase fallback when absent.
- **Roadmap mirror:** [roadmap.md](../roadmap.md) → Thinking blurb during reply.

### Diagnostics block (structured Ask transparency) — ★★★★

- **Files:** `main.py` (`ask_ollama` extras), `src/components/MainTab.tsx`, Developer verbose logging.
- **Acceptance:** Collapsible panel: model tried, tier filter result, attachment prep, timing; respects `desktop_ask_verbose_logging`.

### Text stash inject (clipboard → Ask) — ★★

- **Files:** `src/components/MainTab.tsx`, unified input hooks.
- **Acceptance:** One action appends clipboard to Ask field with sanitizer; permission-free for text-only.

### SteamOS share path — **out of scope (user-owned)**

- **Decision (2026-05-19):** User will handle export/share separately; not part of BonsAI backlog.
- No design or implementation in this plan.

### llama.cpp provider spike (POC) — ★★★★ — **approved**

- **Decision (2026-05-19):** **Yes — proof-of-concept only** alongside Ollama; not a shippable provider in this phase.
- **Files:** `py_modules/backend/services/llama_cpp_provider.py` (spike), `main.py` dev-gated hook, [llama-cpp-provider.md](../spikes/llama-cpp-provider.md).
- **Acceptance:** API parity matrix, Deck constraints, go/no-go; optional maintainer-only ask path — no Connection UI or default routing switch.

### Cursor visibility automation — ★★★★

- **Files:** `docs/spikes/cursor-deck-visibility.md`, CI or maintainer scripts (not Deck runtime).
- **Acceptance:** Documented workflow for agent log capture; no hardcoded dev IPs in repo.

---

## Implementation phases (recommended order)

### Phase 1 — Model truth A (deprioritize) — ★★★

1. Add `DEPRIORITIZED_OLLAMA_TAGS` in `refactor_helpers.py`; sort after primary chain merge.
2. Pull Models catalog: mark deprioritized rows with warning badge.
3. Tests: `tests/test_model_selection.py` (or extend `test_model_policy.py`).

### Phase 2 — Model truth C (honesty prompts) — ★★★

1. Extend `ollama_prompts.py` thin-context clause when no game + no attachments.
2. Optional UI chip: “Limited context — answer may be general.”

### Phase 3 — Model truth B (post-check) — ★★★★

1. Rule-based verifier in `py_modules/backend/services/response_verify.py`.
2. Optional second-pass with smallest text model (Settings toggle, default off).

### Phase 4 — Deferred UX features — ★★ to ★★★

1. Named Ollama hosts  
2. Text stash inject  
3. Per-turn feedback  

### Phase 5 — Heavy / research — ★★★★+

1. Diagnostics block  
2. Cursor visibility automation (maintainer)  
3. **llama.cpp POC spike** (approved; see [llama-cpp-provider.md](../spikes/llama-cpp-provider.md)) — go/no-go for a *future* shippable provider only

---

## Subagent reports and follow-ups

| Agent | Invoked | Summary |
|-------|---------|---------|
| red-team | N/A | Bugfix-only pass; no scope expansion beyond plan doc. |
| blue-team | N/A | Character voice fix aligns with product voice promise. |
| security-auditor | Triaged | Post-check logs warnings only; no raw user text in verifier paths. Second-pass toggle reserved, no extra model call yet. |
| master-debugger | Deferred | Tier picker fix uses established `onOKButton` + draft-on-Done pattern from character picker. |

---

## Changelog (plan)

- **2026-05-19:** Initial backlog split from P0 bugfix pass (tier picker, character voice, carousel default verified).
