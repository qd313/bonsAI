# Backlog implementation plan

**Status:** Planning document for deferred features — do **not** implement from this doc during bugfix-only passes unless a row is explicitly promoted.

**Overall scope:** ★★★★ (multi-surface product work across settings, RPC, prompts, and Deck UX).

Star ratings use the GTA scale from [roadmap.md](roadmap.md): `★` easiest … `★★★★★★` extreme scope.

**Related:** [plans/post-p0-feature-backlog.md](plans/post-p0-feature-backlog.md) (model-truth detail mirror).

---

## Phase 0 — Bugfixes (2026-05-19 session)

| Item | Status | Notes |
|------|--------|-------|
| Fullscreen tier picker (Tier 1 → Tier 2) | **Fixed** | Draft tier + `onOKButton`; **await `save_settings` before modal close**; `hydrateFromSettings`. `PermissionsTabModelPolicyPanel.tsx`, `index.tsx`. |
| AI response in character (text, not STT/TTS) | **Fixed** | Append roleplay after bonsAI preamble + recency reminder. `apply_roleplay_to_system_content`, `main.py`. |
| Carousel default off | **Verified** | `DEFAULT_PRESET_CHIP_ANIMATION = "fade"`; carousel is opt-in via Developer → preset animation. |

---

## Model truth (user-approved approaches)

Three complementary layers. Implement after Phase 0 is stable on device.

| Approach | Stars | Summary |
|----------|-------|---------|
| **A. Deprioritize / blocklist in picker** | ★★★ | UI + routing: hide or sort known-bad tags in Pull Models and downgrade them in `select_ollama_models` fallback order. |
| **B. Post-check (second model or rules)** | ★★★★ | After primary reply: lightweight rules (regex/structure) or tiny verifier model for invented AppIDs, missing JSON when promised, etc. |
| **C. Citations / “I don’t know”** | ★★★ | Prompt + UI: require uncertainty when context is thin; optional `bonsai-cite` or footnote fences for log/screenshot-derived claims. |

### Recommended deprioritize / blocklist

Based on `refactor_helpers.py` chains, `pullModelCatalog.ts`, and Deck ~16GB VRAM targets. **Deprioritize** = move after safer tags in fallback order; **block** = omit from curated Pull list only (user can still manual-pull).

| Tag / family | Action | Rationale |
|--------------|--------|-----------|
| `qwen2.5:1.5b` | Deprioritize (Speed text chain) | Currently first in `_TEXT_FOSS_SPEED`; fast but weak instruction-following and hallucination-prone on multi-step Deck/Proton questions. Keep in chain as last-resort only. |
| `tinyllama`, `orca-mini`, `vicuna`, `phi` (legacy small) | Deprioritize if installed | Legacy chat models; poor tool-following vs current Qwen/Llama mids. |
| `llava:latest`, bare `llava` | Deprioritize below `llava:7b` | Ambiguous tag; often pulls heavier blob than pinned `llava:7b` on Deck. |
| `gemma3:27b`, `gemma4:31b`, `qwen2.5:32b`, `qwen3.5:32b` | Deprioritize unless high-VRAM toggle | OOM/swap risk on 16GB; keep only in `_TEXT_HIGH_VRAM_*` / `_VISION_HIGH_VRAM_*` tails when `model_allow_high_vram_fallbacks` is on. |
| `qwen3-vl:30b-a3b`, `internvl3.5:38b`, `internvl2.5:38b` | Block in Pull catalog; deprioritize in chains | Specialist/heavy VL; poor default for handheld latency and VRAM. |
| `mistral`, `mixtral` (non-FOSS tier) | Tier-gate only | Already policy-tier limited; do not promote in Tier-1 UI or starter pulls. |
| Unknown / unclassified tags | Tier 3 only | Matches existing `model_policy` contract. |

**Do not block** `qwen2.5:3b`, `qwen2.5:7b`, `qwen2.5:14b`, `llava:7b`, `qwen2.5vl:3b` — these are the shipped FOSS-safe backbone for Tier 1.

---

## Deferred features (not shipped)

Sorted by ascending star rating within phase groups.

### Phase 1 — Model truth A (deprioritize) — ★★★

1. Add `DEPRIORITIZED_OLLAMA_TAGS` in `refactor_helpers.py`; sort after primary chain merge.
2. Pull Models catalog: mark deprioritized rows with warning badge.
3. Tests: extend `tests/test_refactor_helpers.py` / `test_model_policy.py`.

### Phase 2 — Model truth C (honesty prompts) — ★★★

1. Extend `ollama_prompts.py` thin-context clause when no game + no attachments.
2. Optional UI chip: “Limited context — answer may be general.”

### Phase 3 — Model truth B (post-check) — ★★★★

1. Rule-based verifier in `py_modules/backend/services/response_verify.py`.
2. Optional second-pass with smallest text model (Settings toggle, default off).

### Phase 4 — Deferred UX — ★★ to ★★★

| Feature | Stars | Primary files |
|---------|-------|---------------|
| **Text stash inject** (clipboard → Ask) | ★★ | `MainTab.tsx`, unified input hooks |
| **Named Ollama hosts** (quick switch) | ★★★ | `settings_service.py`, `SettingsTab.tsx`, Connection persistence |
| **Per-turn feedback** (thumbs / quality) | ★★★ | `MainTab.tsx`, optional RPC, local JSONL |

### Phase 5 — Heavy / research — ★★★★+

| Feature | Stars | Primary files |
|---------|-------|---------------|
| **Diagnostics block** (structured Ask transparency) | ★★★★ | `main.py`, `MainTab.tsx`, Developer verbose logging |
| **Cursor visibility automation** (maintainer) | ★★★★ | [spikes/cursor-deck-visibility.md](spikes/cursor-deck-visibility.md) — dev machine **is the Deck**: local `./scripts/build.sh` reload + QAM screenshot ingest (no remote tunnel required) |
| **llama.cpp provider (POC spike)** | ★★★★ | [spikes/llama-cpp-provider.md](spikes/llama-cpp-provider.md) — evaluation + thin routing hook only; **not** a shippable Settings provider |

**Phase 5 — llama.cpp POC scope (approved):** Local llama.cpp inference backend **alongside** Ollama for compatibility evaluation. Deliver go/no-go matrix, streaming/load constraints on Deck, and optional dev-only ask path — **no** production provider UI, model management parity, or default routing switch in this phase.

### Out of scope — user-owned (not BonsAI backlog)

| Item | Decision | Notes |
|------|----------|-------|
| **SteamOS share path** (export / Share integration) | **Deferred** | User will handle separately. **Do not** design path conventions or implement export/share flows in this backlog plan. Former Phase 4 row removed from active phases. |

---

## User decisions (recorded 2026-05-19)

| # | Topic | Decision |
|---|--------|----------|
| 10 | **llama.cpp provider** | **Yes — POC spike.** Add local llama.cpp inference evaluation **alongside** Ollama. Goal is **proof-of-concept only** (compatibility / API matrix / optional dev hook), **not** a shippable provider in this phase. See [spikes/llama-cpp-provider.md](spikes/llama-cpp-provider.md). |
| 11 | **SteamOS share path** | **Deferred / out of scope** for BonsAI backlog. User-owned; handled outside this plan. No design or implementation here. |

---

## Subagent reports and follow-ups

| Agent | Invoked | Summary |
|-------|---------|---------|
| red-team | N/A | Bugfix-only session; no scope expansion beyond this plan. |
| blue-team | N/A | Character voice fix aligns with product voice promise. |
| security-auditor | Deferred | Post-check phase should avoid logging raw user PII from verifier. |
| master-debugger | Deferred | Tier picker fix uses established `onOKButton` + draft-on-Done + await-save-before-close pattern from character picker / hardware disclaimer. |
| foss-advocate | N/A | Model deprioritize list preserves FOSS backbone tags. |

---

## Changelog (plan)

- **2026-05-19:** Initial plan from P0 bugfix pass; model truth design, deprioritize list, phased ordering, user decision questions.
- **2026-05-19:** Recorded user decisions Q10 (llama.cpp POC spike approved) and Q11 (SteamOS share path deferred, user-owned); narrowed Phase 5 llama.cpp to spike scope; removed share path from active phases.
