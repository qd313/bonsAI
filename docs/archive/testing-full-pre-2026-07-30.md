# bonsAI testing

**Purpose:** PR regression gates, Deck QA run order, shipped-feature coverage, Test Results, and failure retries.

Related: [roadmap.md](roadmap.md) (planning), [development.md](development.md) (build/deploy), [troubleshooting.md](troubleshooting.md) (setup). Evidence artifacts: [test-evidence/](test-evidence/).

---

## Regression gates

# Regression matrix and device smoke (standing gate)

> Links in this file into the roadmap may be stale: the roadmap was split and trimmed on 2026-10-03 (plan 80). Current files: [roadmap.md](../roadmap.md), [roadmap-kb.md](../roadmap-kb.md), [roadmap-shelved.md](../roadmap-shelved.md).

**Purpose:** Default checklist for **every PR** and **every Deck-facing change** before merge or release. Manual Deck work runs from **[testing.md](testing.md#device-qa-runbook)** (Tier 0ΓÇô1 first). Scenario detail and coverage index: **[testing.md](testing.md#shipped-feature-coverage)**. Hotspots: **[development.md](development.md#change-risk-hotspots)**.

**Contract:** Run **┬º1** always. Add **┬º2** rows that match touched paths. Run **┬º3** when `src/`, `main.py`, `plugin.json`, or Deck RPC contracts change (per [.cursor/rules/docs-on-ship.mdc](../.cursor/rules/docs-on-ship.mdc)).

---

### 1. Automated gates (every change set)

Run from repo root (Windows or Linux shell as appropriate):

| Step | Command | When |
|------|---------|------|
| Typecheck | `pnpm exec tsc --noEmit` | Any TS change or dependency bump |
| Frontend unit tests | `pnpm test` | Any `src/` change (includes Vitest headless Decky harness under `src/test-harness/`) |
| Backend unit tests | `pnpm run test:py` | Any `main.py`, `py_modules/backend/`, `refactor_helpers.py`, or `tests/` change |
| Bundle | `pnpm run build` | Any `src/` or build config change |
| Preview suite | `pnpm run test:preview:tier -- --tier=<batch> --write` | Tier QA batches; requires **Decky: Open Preview** for C/D buckets; evidence ΓåÆ `docs/test-evidence/` |
| Deck deploy build | `.\scripts\build.ps1` or `./scripts/build.sh` | Any `src/`, `main.py`, `plugin.json`, or Deck-facing asset change |
| Plugin zip CI | Run **Build plugin zip** in Actions (or `bash scripts/verify-decky-plugin-zip.sh` on a local `out/*.zip`) | Changes to [`.github/workflows/build-plugin-zip.yml`](../.github/workflows/build-plugin-zip.yml) or [`scripts/verify-decky-plugin-zip.sh`](../scripts/verify-decky-plugin-zip.sh) |

If a step does not apply (e.g. docs-only), state **N/A** in the PR description and still run the steps that do apply.

---

### 2. PR-scoped matrix (add focused checks)

Use the **Touched area** column to extend ┬º1; prefer the narrowest tests first.

| Touched area | Extra automated focus | Manual / runbook tier |
|--------------|----------------------|------------------------|
| `backend/services/settings_service.py`, `settingsAndResponse.ts`, Settings UI | `tests/test_settings_service.py`, `src/utils/settingsAndResponse.test.ts` | Tier 0 **SMOKE-A** + setting persist spot-check |
| `main.py` background Ask / abort / settings save locks | `tests/test_background_abort_busy.py`, `tests/test_settings_save_lock.py`, `tests/test_intent_pack_store_lock.py`, `tests/test_strategy_checklist_store_lock.py` | Tier 1 **SMOKE-H** Stop then new Ask |
| `backend/services/intent_pack_service.py` | `tests/test_intent_pack_service.py` (corrupt/oversized preserve) | Tier 0 Settings ΓåÆ intent packs |
| `backend/services/voice_transcription_service.py` | `tests/test_voice_transcription_service.py` (`test_pcm_buffer_survives_concurrent_append_and_window`) | Tier 2 voice STT |
| `backend/services/ollama_service.py`, `refactor_helpers.py` | `tests/test_ollama_service.py`, `tests/test_refactor_helpers.py` | Tier 1 one Ask per changed mode ([testing.md](testing.md#shipped-feature-coverage)) |
| `backend/services/desktop_note_service.py` | `tests/test_desktop_note_service.py` | Tier 2 desktop notes block |
| `backend/services/ai_character_service.py`, character UI | `tests/test_ai_character_service.py`, `tests/test_pyro_asshole_safety.py`, catalog/accent tests under `src/data/` | Tier 2 character / Pyro ([testing.md](testing.md#shipped-feature-coverage) PYRO-EGG) |
| `backend/services/capabilities.py`, Permissions UI | `tests/test_capabilities.py` | Tier 0 **SMOKE-C** |
| `src/components/MainTab.tsx`, unified input | `pnpm test` (utils/data) | Tier 0 **SMOKE-A** |
| `src/index.tsx` tabs, CSS, RPC wiring | Full ┬º1 + ┬º3 | Tier 0 **SMOKE-A** |
| `ollama_mdns_discovery_service.py`, Connection **Find LAN** | `tests/test_ollama_mdns_discovery_service.py` | Tier 2 mDNS block; N/A without publish |

---

### 3. Device smoke (Deck-facing PRs)

Run after **`scripts/build.ps1`** or **`scripts/build.sh`** succeeds. Use **[testing.md](testing.md#device-qa-runbook)** ΓÇö do not duplicate the full matrix here.

### Required: Runbook Tier 0 (~15 min, BPM)

Complete **SMOKE-A ΓåÆ SMOKE-C ΓåÆ SMOKE-F** and check off runbook + linked [testing.md](testing.md#shipped-feature-coverage) rows. State **Pass / Partial / Fail / N/A** in the PR.

| Smoke | When N/A |
|-------|----------|
| **SMOKE-A** Golden path | Never for Deck-facing UI/RPC changes |
| **SMOKE-C** Permission gate | Never when Permissions or gated actions touched |
| **SMOKE-F** Deterministic commands | Docs-only with no sanitizer/shortcut/VAC path changes |

### Add Tier 1 when touching Ask / TDP / strategy / game context

| Smoke | Trigger |
|-------|---------|
| **SMOKE-B** TDP apply 8W | TDP, hardware permission, QAMP banner, `apply_tdp` |
| **SMOKE-E** Strategy one-shot | Strategy mode, spoilers, `ask_mode: strategy` |
| **SMOKE-H** Background reopen | Background Ask / pending restore |
| **SMOKE-D / G** | Preset or vision changes ΓÇö spot-check if already Verified |

Full Tier 2ΓÇô4 blocks (VAC matrix, Proton logs, QAMP reboot, clean install): see runbook; required before **release tag**, not every PR.

---

### 4. Prompt-testing and coverage

Qualitative scenarios, **Shipped feature coverage** table, and Test Results log: **[testing.md](testing.md#shipped-feature-coverage)**.  
Execution order: **[testing.md](testing.md#device-qa-runbook)**.

After prompt/routing changes, add or update scenario rows and run the matching runbook tier.

---

### 5. Release / clean install proof (Runbook Tier 4)

**Purpose:** Prove a **new user** can succeed using only **[README.md](../README.md)** plus **[development.md](development.md) ΓåÆ Release (plugin zip)** for where the `.zip` comes fromΓÇöno unstated maintainer shortcuts.

**Prep:** Start from a target where **Ollama is not installed yet** on the path you are testing (**PC on LAN** or **Deck**). Decky Loader is installed.

**Steps (checklist):**

1. Install Ollama per README **Detailed setup** / **Quick start** (official installer or install script on the Ollama host).
2. Obtain the plugin `.zip`: **GitHub Release** asset and/or **Actions** artifact from workflow **Build plugin zip** (see [development.md](development.md)).
3. Install the zip in Decky (developer / local ZIP path; wording varies by Loader version).
4. In bonsAI **Settings**, set the Ollama base URL; pull at least one text model (README **Quick start**, step 4).
5. Send one **text** Ask and confirm a normal reply (no import/traceback errors).

**Log (append a row after each full pass):**

| Date | Git SHA or tag | Workflow run ID (if CI zip) | Result | SteamOS / Decky | Ollama host (PC LAN / Deck) | Notes |
|------|----------------|-------------------------------|--------|-----------------|-----------------------------|-------|
| *(example)* | | | Pass / Partial / Fail | | | |

---

---

## Device QA runbook

# bonsAI device QA runbook

**Purpose:** What to run on Steam Deck **next**, in priority order. Quick wins first; heavy setup last.


Record **build id / git SHA** and **SteamOS** in [testing.md](testing.md#shipped-feature-coverage) when marking Pass / Partial / Fail.

---

## Tags

| Tag | Meaning |
|-----|---------|
| **P0ΓÇôP3** | Importance ΓÇö P0 = core product; P3 = polish / easter eggs |
| **S0ΓÇôS3** | Setup cost ΓÇö S0 = BPM + Ollama up; S3 = reboot / clean install / multi-game |
| **Tier 0ΓÇô4** | Run order ΓÇö complete lower tiers before higher unless PR-scoped |

---

## New focusable controls (mandatory before ship)

Any new Settings/QAM toggle, button, slider, chip row, or modal footer control **must** pass this on-Deck checklist and add a coverage row below. Policy: MCP `bonsai://policy/decky-ui-focus` ┬º **New controls & settings rows**. Patterns: `bonsai://architecture/focus-graph-patterns`.

- [ ] **FOCUS-GRAPH-01** Listed every focus stop in the section parent (order documented in PR or `focus-graph-patterns.md`)
- [ ] **FOCUS-GRAPH-02** D-pad **Up/Down** reaches each stop; no skips (e.g. toggle must not jump over slider to Reset)
- [ ] **FOCUS-GRAPH-03** Sliders / horizontal groups: **Left/Right** (or A + edit mode) changes value on the **focus owner** (bridge `Focusable` if using `DeckFocusSlider`)
- [ ] **FOCUS-GRAPH-04** Cross-section links wired (parent refs + `onMoveDown`/`onMoveUp` to adjacent `PanelSection` rows)
- [ ] **FOCUS-GRAPH-05** Row added to **Shipped feature coverage** + scenario checkbox (template: **UI-SCALE-05**)

Reference implementations: `SettingsTabUiScaleSection.tsx`, `OllamaTab.tsx`, `SettingsTab.tsx`, `PullModelsModal.tsx`.

---

## Cross-cutting smokes

One smoke run can check off many coverage rows. After each smoke, update [testing.md](testing.md#shipped-feature-coverage) **Shipped feature coverage** and linked scenario checkboxes.

| ID | Name | Tier | Setup | Importance | Covers (feature IDs) |
|----|------|------|-------|------------|----------------------|
| **SMOKE-A** | Golden path | 0 | S0, BPM | P0 | Plugin shell, tabs, Connection Ask, D-pad chunks, transparency opens, presets visible |
| **SMOKE-C** | Permission gate | 0 | S0 | P0 | Capability center ΓÇö blocked-action toast pattern |
| **SMOKE-F** | Deterministic commands | 0 | S0, no model | P2 | Input sanitizer commands, shortcut-setup-deck, vac-check capability-off |
| **SMOKE-B** | TDP apply 8W | 1 | S1, game + Hardware on | P0 | TDP JSON, sysfs, game context, QAMP banner, permissions hardware |
| **SMOKE-E** | Strategy one-shot | 1 | S1 | P1 | Mode selector, strategy placeholder, spoiler tap-to-reveal, Spoilers OK |
| **SMOKE-D** | Frozen carousel triple | 1 | S1, optional flag | P0 | Presets, game-name append, troubleshooting prompts ΓÇö **verified** (see coverage) |
| **SMOKE-G** | Vision attach once | 1 | S1, Media on | P1 | Attach browser, multimodal Ask ΓÇö **verified** (vision sweep 2026-04) |
| **SMOKE-H** | Background Ask reopen | 1 | S1 | P1 | Close QAM while pending ΓåÆ reopen restores ThinkingΓÇª or final reply |

**Tier 0 order (~15 min):** SMOKE-A ΓåÆ SMOKE-C ΓåÆ SMOKE-F  
**Tier 1 order (~20 min):** SMOKE-B ΓåÆ SMOKE-E ΓåÆ confirm SMOKE-D / SMOKE-G if not already marked ΓåÆ SMOKE-H

---

## Tier 0 ΓÇö Quick wins (S0)

Run in BPM (Desktop ΓåÆ Big Picture ΓåÆ QAM ΓåÆ bonsAI). Ollama reachable; default permissions OK unless smoke says otherwise.

### SMOKE-A ΓÇö Golden path (P0)

- [ ] Open plugin from QAM; no crash on first paint.
- [ ] LB/RB cycles **Main ΓåÆ Ollama ΓåÆ Settings ΓåÆ Permissions ΓåÆ (Developer if enabled) ΓåÆ About**.
- [ ] **Ollama ΓåÆ Where AI runs ΓåÆ Test** ΓÇö success or stable unreachable message (no traceback).
- [ ] Main tab: type a short question; **Ask**; reply appears in focusable chunks.
- [ ] D-pad down through chunks; last chunk readable.
- [ ] Expand **Input handling (last Ask)** ΓÇö raw input, model name, system/user snapshot present.
- [ ] Three preset chips visible on Main.

**Links:** [testing.md](testing.md#shipped-feature-coverage) ΓåÆ Tier 0 scenarios; coverage rows `CORE-ASK`, `CORE-UI`, `CONN-TEST`, `TRANSPARENCY`.

### SMOKE-C ΓÇö Permission gate (P0)

- [ ] **Permissions:** turn **Hardware control** (or another) **off**.
- [ ] Trigger blocked action (e.g. Ask that would apply TDP, or attach screenshot if Media off).
- [ ] Toast directs to Permissions; no crash.
- [ ] Turn capability back **on** before Tier 1.

**Links:** coverage `PERMS-GATE`.

### SMOKE-F ΓÇö Deterministic commands (P2)

No Ollama call for these paths.

- [ ] Ask exactly `bonsai:disable-sanitize` ΓåÆ confirmation; **Input handling** shows no Ollama text.
- [ ] Ask exactly `bonsai:enable-sanitize` ΓåÆ confirmation.
- [ ] Ask exactly `bonsai:shortcut-setup-deck` ΓåÆ Guide/QAM/Decky copy; no model call.
- [ ] Ask `bonsai:vac-check 76561198000000000` with **Steam Web API** off ΓåÆ capability message only; no network.

**Links:** [testing.md](testing.md#shipped-feature-coverage) ΓåÆ Tier 0 deterministic; coverage `SANITIZER`, `SHORTCUT-KW`, `VAC-01`.

---

## Tier 1 ΓÇö Core shipped (S1)

Requires a **game running** for some steps (Track B ΓÇö Gaming Mode or BPM with game focused). Enable **Permissions ΓåÆ Hardware control** for TDP apply.

### SMOKE-B ΓÇö TDP apply 8W (P0)

- [ ] With game running: Ask `Set my TDP to 8 watts`.
- [ ] Response includes `[Applied: TDP: 8W]` (or equivalent banner).
- [ ] QAM re-open guidance in transcript (**Note** about Performance tab).
- [ ] **Input handling** shows TDP route / JSON parse path.

**Links:** Test Results #3ΓÇô4; coverage `TDP-APPLY`, `QAMP-BANNER`; [testing.md](testing.md#shipped-feature-coverage) ΓåÆ QAMP on-Deck (first two rows).

### SMOKE-E ΓÇö Strategy one-shot (P1)

- [ ] Main tab mode ΓåÆ **Strategy**; placeholder changes to strategy copy.
- [ ] Ask `How do I beat this level` (no spoilers permission).
- [ ] Reply uses tap-to-reveal spoiler blocks where applicable.
- [ ] Enable **Spoilers OK for this Ask**; follow-up allows fuller guidance.

**Links:** coverage `STRATEGY-CORE`, `STRATEGY-SPOILER`; [testing.md](testing.md#shipped-feature-coverage) ΓåÆ Tier 2 Strategy depth (partial ΓÇö expand in Tier 2).

### SMOKE-D ΓÇö Frozen carousel triple (P0) ΓÇö verified

Optional: set `TEMP_PRESET_CAROUSEL_FROZEN` in [`src/data/presets.ts`](../src/data/presets.ts). Three chips: crashing / stuttering / Proton. **Already verified** ΓÇö spot-check only if presets change.

**Links:** coverage `PRESETS-CAROUSEL`, `TROUBLESHOOT-3`.

### SMOKE-G ΓÇö Vision attach once (P1) ΓÇö verified

Attach one screenshot + one Ask. **Already verified** (vision sweep 2026-04) ΓÇö spot-check if attach/RPC changes.

**Links:** coverage `VISION-V1`.

### SMOKE-H ΓÇö Background Ask reopen (P1)

- [ ] Start a slow Ask; close QAM before completion; reopen ΓåÆ **ThinkingΓÇª** or restored pending state.
- [ ] Repeat: close QAM; reopen after completion ΓåÆ full reply restored.

**Links:** coverage `BG-ASK-V1`; [testing.md](testing.md#shipped-feature-coverage) ΓåÆ Appendix Tier 4 background matrix for full lifecycle.

### Tier 1 extras (single Ask each)

- [ ] **Session restore:** close and reopen plugin ΓÇö last Q&A still visible (`PERSIST-QA`, P0).
- [ ] **Mode Speed vs Expert:** one Ask each; model disclosure or routing differs (`MODE-SELECTOR`, P1).
- [ ] **What game am I playing?** with game focused ΓÇö names title (`GAME-CTX`, P0).

---

## Tier 2 ΓÇö Opt-in features (S2)

Run when touching related code or before a release candidate.

| Block | Setup | Importance | Detail in testing.md |
|-------|-------|------------|----------------------------|
| **VAC full matrix** | Steam Web API key + permission | P2 | VAC-01 ΓÇª VAC-06 |
| **Proton log attach** | `PROTON_LOG=1`, game, log read permission | P2 | PROTON-LOG-01 ΓÇª 03 |
| **Token streaming** | Developer tab + flag | P2 | STREAM-01 ΓÇª 10 |
| **Strategy depth** | Strategy mode + screenshots optional | P1 | Strategy spoiler, checklist, cheat gating, regression subset |
| **Character voice** | AI character on, one preset Ask | P2 | CHAR-VOICE |
| **Pyro easter egg** | Pyro or Random ΓåÆ Pyro; Balanced + Nightmare spot | P3 | PYRO-EGG |
| **Beta presets** | Main tab chips with `[beta]` tag | P3 | BETA-PRESET |
| **mDNS Find LAN** | Avahi/Bonjour on Ollama host | P2 | MDNS-FIND |
| **Desktop notes** | Filesystem permission on | P2 | DESKTOP-NOTES |
| **Model policy** | Change tier; confirm disclosure on reply | P1 | MODEL-POLICY |

---

## Tier 3 ΓÇö Heavy manual (S3)

Defer until Tier 0ΓÇô2 pass or release window.

| Block | Why heavy | Detail |
|-------|-----------|--------|
| **QAMP on-Deck matrix** | Per-game profile, QAM reopen, Steam restart, reboot | [testing.md](testing.md#shipped-feature-coverage) ΓåÆ QAMP on-Deck |
| **TDP boundary clamps** | Multiple watt asks with verification | TDP-15W, TDP-3W, TDP-1W, TDP-20W, GPU-800 |
| **Background Ask full lifecycle** | Timeout, error, busy guard, session boundary | Appendix Tier 4 |
| **Multi-game matrix** | Title-specific behavior | Games to test with |
| **Guide-chord macro** | User-specific QAM rail depth | [troubleshooting.md](troubleshooting.md) ┬º5 |
| **Preset carousel timing (ms)** | Cosmetic animation | Appendix Tier 3 cosmetic |

---

## Tier 4 ΓÇö Release gate (S3)

| Block | When |
|-------|------|
| **Clean install proof** | Before tagging a release ΓÇö [testing.md](testing.md#regression-gates) ┬º5 |
| **Environment matrix** | Record Decky / SteamOS / Ollama in [testing.md](testing.md#shipped-feature-coverage) before Tier 1+ runs |

---

## Progress tracker

Update after each maintainer pass:

| Tier | Status | Last run (date / SHA) | Notes |
|------|--------|------------------------|-------|
| 0 | Pass | 2026-05-26 / 9e20a82 | preview 5/5 PASS; [evidence](test-evidence/tier0/2026-05-26-9e20a82) |
| 1 | Pass | 2026-05-26 / 9e20a82 | preview 3/3 PASS; [evidence](test-evidence/tier1Core/2026-05-26-9e20a82) |
| 2 | Partial | 2026-06-09 / 9e20a82 | preview 7/11 PASS; [evidence](test-evidence/tier2Deep/2026-06-09-9e20a82) |
| 3 | Open | 2026-06-09 / a9237e4 | preview 0/0 PASS; [evidence](test-evidence/deckOnly/2026-06-09-a9237e4) |
| 4 | Deferred | | Clean install |

**Roadmap target:** Tier **0ΓÇô1** complete for routine PRs; Tier **2+** ongoing before release.

---

---

# bonsAI prompt testing tracker


This file holds the **shipped-feature coverage index**, **Test Results log**, and **detailed scenario checkboxes** linked from the runbook.

Related planning (not yet implemented): [roadmap.md](roadmap.md) **Planned** section. Research notes: [archive/research/steam-input-research.md](archive/research/steam-input-research.md), [archive/research/voice-character-catalog.md](archive/research/voice-character-catalog.md).

---

## Evidence rules (check-offs)

Mark `- [x]` when:

1. **On-device PASS** recorded in Test Results (with build / date when known), or  
2. **Documented verified sweep** ΓÇö e.g. vision V1 manual run (2026-04), QAMP banner unit tests (2026-04-26), frozen-carousel troubleshooting pass.

Historical **FAIL** rows live in [testing.md](testing.md#failures-and-retries). Standardize on `- [x]` / `- [ ]` only.

Preview-suite runs with `--write` upsert Test Results (PASS only) and the failures doc (FAIL), deduped by scenario ID. Artifacts: [test-evidence/](test-evidence/). Consolidate duplicate rows manually if needed after debug iterations; RPC/log dumps are redacted before commit.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **PASS** | Correct answer and action (if any) applied |
| **FAIL** | Wrong answer, hallucination, or action not applied |
| **PARTIAL** | Correct idea; formatting/parsing blocked full success |
| **PENDING** | Reserved for next on-device run |

Coverage table: **Verified** / **Partial** / **Open** / **N/A (unit-only)**.

---

## Shipped feature coverage

Maps [roadmap.md](roadmap.md) **Completed** summary and [archive/roadmap-completed.md](archive/roadmap-completed.md) detail to test IDs. Update **Status** when runbook smokes or scenario rows pass.

### Release and first-run

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| BETA-MODAL | Beta disclaimer modal | SMOKE-A | Open | First paint |
| PRESETS-CAROUSEL | Suggested AI prompts + carousel | SMOKE-A, SMOKE-D | Partial | `PRESET_PROMPTS` baseline shipped; troubleshooting triple verified; string expansion incremental |
| SESSION-RAG-CHIPS | AppID-aware KB preset mix (~30% RAG) | SESSION-RAG-CHIPS-01 | Open | Unit: `sessionRagComposer.test.ts`, `test_knowledge_base_service.py`; on-Deck with KB + known AppID |
| PROMPT-TEST-MVP | Prompt-testing MVP (this doc) | ΓÇö | Partial | Matrices shipped; Tier 0ΓÇô1 open |
| SANITIZER | Input sanitizer lane | SMOKE-F | Partial | [SMOKE-F-disable-sanitize](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json) |
| TRANSPARENCY | Input handling transparency panel | SMOKE-A | Partial | Superseded by context chip ladder (**CONTEXT-LADDER-01**); legacy panel removed 2026-07-17 |
| PROTON-JOURNAL | Proton experiment journal (Settings CRUD + inject) | PROTON-JOURNAL-01ΓÇª04 | Open | Settings ΓåÆ Proton troubleshooting; `~/.bonsai/proton_experiment_journal.json`; clear-all wipes file |
| CONTEXT-LADDER | Context chip ladder + session strip (F11 Option C) | CONTEXT-LADDER-01ΓÇª03 | Open | Live turn: **Show details** gates ladder; session strip for archived; D-pad **CONTEXT-LADDER-03** |
| GAME-CONTEXT | Pre-Ask running-game footer / banner | GAME-CONTEXT-01 | Open | Sync `ollamaContext` from `MainRunningApp` when not mid-Ask |

### Connection, routing, diagnostics

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CONN-TEST | Deck/PC connection + Test Ollama | SMOKE-A | Open | |
| CONN-TIMEOUT | Latency/timeout warnings + sliders | SMOKE-A | Open | Slow Ask optional |
| KEEP-ALIVE | Ollama keep_alive presets | ΓÇö | Open | Settings persist |
| LOCAL-RUNTIME | Local Ollama on Deck default-off + onboarding | ΓÇö | Open | Tier 2 |
| MDNS-FIND | LAN mDNS Find LAN | ΓÇö | Open | Tier 2; needs Avahi; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/MDNS-FIND-rpc/manifest.json) |
| NAMED-HOSTS | Named Ollama hosts (quick switch) | ΓÇö | Open | Ollama tab; up to 4 labeled LAN URLs |
| MAINT-HARNESS | Vitest Deck harness, watch-deploy | N/A (unit-only) | N/A | CI; [preGate](test-evidence/preGate/2026-05-26-9e20a82/batch-summary.json); [preview 2026-05-26](test-evidence/preGate/2026-05-26-9e20a82/UNIT-A-vitest-gates/manifest.json) |
| OLLAMA-UPDATE | Update Ollama & Models on Deck | ΓÇö | Open | Tier 2 |
| KB-DOWNLOAD | Knowledge base download + verify | KB-SMOKE-01 | Partial | Unit: `test_knowledge_base_service.py`; 2026-07-27 Deck: Developer tab **Install seed knowledge base** + **Use local knowledge base** on (DRG Survivor seed). **Not Pass:** Hugging Face / GitHub Releases manifest download not live yet |
| KB-RETRIEVE | Strategy/troubleshooting retrieval + splice | KB-SMOKE-02, KB-SMOKE-04 | Verified | **KB-SMOKE-02** Verified 2026-07-27 (keyword FTS); **KB-SMOKE-04** Verified 2026-07-28 (hybrid **Keyword + meaning**); unit: `test_knowledge_base_service.py`, `test_transparency_kb_retrieval.py` |
| KB-UNAVAIL | KB unavailable graceful path | KB-SMOKE-03 | Open | Toggle on, corpus missing ΓåÆ once/session toast |
| KB-FOCUS-01 | Ollama tab KB section D-pad chain + scroll-up | ΓÇö | Open | Connection row Γåö KB toggle Γåö buttons Γåö Reply style slider Γåö Response verify; D-pad up from top scrolls to tab strip |
| REPLY-VERB | Reply style (global verbosity) | REPLY-VERB-01 | Open | Ollama tab slider; prompt inject; Input transparency `reply_verbosity` |
| KB-DOWNLOAD-SD | KB download storage picker (SD card) | KB-SMOKE-01 | Open | Modal shows internal + SD when microSD mounted |
| KB-EVAL | Labeled KB eval set (Phase 3) | KB-EVAL-01 | Open | Fixture `tests/fixtures/kb_eval_v0.json` (~25 queries); maintainer-run before Phase 5 publish |

### Tabs, icons, unified ask

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CORE-UI | Iconography, tabs, unified input | SMOKE-A | Partial | [SMOKE-A](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| QAM-BAZZITE-LAYOUT | Bazzite gamescope QAM tab strip / mount layout | QAM-BAZZITE-01 | Verified | On-Deck Bazzite 2026-07-08; `useQamPanelHeightGuard`, `useTabStripBodyOffset` |
| REFACTOR-4DEF | Phase 4dΓÇô4f MainTab/index/styles split | SMOKE-A | Open | Unit/build gates pass; on-Deck regression via golden path |
| REFACTOR-PHASE3 | Phase 3 backend extraction (`ollama_ask_service`, locks) | test_ollama_ask_service, test_background_abort_busy | Open | `pnpm run test:py`; on-Deck golden path |
| CRITICAL-REG | Critical regression fixes (settings RMW, abort gate, PCM, stores) | test_background_abort_busy, test_settings_save_lock, test_intent_pack_store_lock, test_strategy_checklist_store_lock | Open | Tier 1 **SMOKE-H** Stop then new Ask |
| PERSIST-QA | Persist last Q&A on reopen | Tier 1 extra | Open | |
| UNIFIED-INPUT | Unified search + ask | SMOKE-A | Open | |
| PRESET-FADE-OPT | Preset chip fade opt-out | ΓÇö | Open | Tier 3 cosmetic |
| CAROUSEL-SLIDE | Carousel slide + history (2026-05-20) | ΓÇö | Open | Tier 3 cosmetic |
| GEMMA-PULL | Gemma pull models + routing | GEMMA-PULL-01 | Open | Tier 2 pull confirm when policy is Tier 1 |
| MODE-SELECTOR | Speed / Strategy / Expert | SMOKE-E, Tier 1 | Open | Persisted id `expert` |
| VOICE-STT | Whisper voice Ask (local STT) | VOICE-01ΓÇª07 | Open | Permissions + Settings model download; on-Deck mic required |
| REPLY-READY | Reply ready toast (QAM-closed Asks) | REPLY-READY-01ΓÇª05 | Open | Unit: `bonsaiPhaseToast.test.ts`, `bonsaiReplyReadyToast.test.ts`, `bonsaiAskCompletionWatch.test.ts`; on-Deck toast tap |
| STRATEGY-CORE | Strategy Guide prompt path | SMOKE-E | Open | |
| STRATEGY-SPOILER | Strategy spoiler policy + consent | SMOKE-E, STRAT-01ΓÇª05 | Partial | Unit green 2026-04-30; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-E-strategy-mode/manifest.json) |
| STRATEGY-CHECKLIST | Strategy checklist (follow-up, persisted per game) | Tier 2 ┬º Strategy depth | Open | Unit + preview; on-Deck: check/uncheck, QAM reopen |
| DEBUG-TAB | Developer tab opt-in | SMOKE-A | Open | Tab strip when enabled |
| INTENT-PACKS | Offline intent packs (import/export) | SMOKE-A | Open | Settings ΓåÆ Search intent packs |
| SETTINGS-TRIM | Settings tab trim | SMOKE-A | Open | |
| UI-SCALE | UI scale profiles (auto + manual snap) | UI-SCALE-01ΓÇª05 | Open | Settings ΓåÆ Apply; on-Deck display matrix |
| RESET-SESSION | Reset session cache | SMOKE-A | Open | Clear cache clears in-memory Main state only |
| DATA-CLEAR | Clear all plugin data (settings + permissions wipe) | DATA-CLEAR-01 | Open | Regression: modal survival must not restore old settings |
| RETRY-PROMPT | Retry same prompt (regenerate) | FEEDBACK-01 | Open | `buildReplyActionsElement.tsx`; on-Deck |
| ASK-FEEDBACK | Per-turn local feedback (thumbs) | FEEDBACK-01 | Open | `save_ask_feedback` RPC; on-Deck |
| MODEL-ROUTING | User-owned text/vision try-order pickers | ROUTING-01ΓÇª04 | Open | `ModelRoutingOrderModal.tsx`, `tests/test_model_routing_order.py`; on-Deck D-pad |
| REPLY-MICRO | Reply micro-action chips + follow-up send | MICRO-01ΓÇª05 | Open | `replyMicroActions.ts`, `tests/test_reply_followup.py`; on-Deck; **MICRO-05** column D-pad |

### AI-assisted power and UX

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| TDP-APPLY | TDP automation via AI JSON | SMOKE-B, Test #3ΓÇô4, 6 | Verified | On-Deck PASS rows; [UNIT-B](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json); [preview 2026-05-26](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json) |
| QAMP-BANNER | QAMP Phase 1 banner (safe default) | SMOKE-B, QAMP-CODE | Verified | Vitest 2026-04-26; on-Deck ΓåÆ Tier 3; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| QAMP-ONDECK | QAMP manual (profile/reboot) | QAMP-DECK-01ΓÇª05 | Open | Tier 3 |
| D-PAD-CHUNKS | D-pad response scrolling | SMOKE-A, D-PAD-SCROLL-01 | Partial | Viewport fix 2026-07-17 (`tabBodyViewport.ts`); on-Deck pass pending formal row; [SMOKE-A focus path](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| BG-ASK-V1 | Background prompt completion V1 | SMOKE-H, BG-* | Partial | SMOKE-H Tier 1; full matrix Tier 4; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/BG-ASK-reopen-status/manifest.json) |
| THINKING-PHASE | Thinking phase copy polish (mid-Ask woven status) | THINKING-01, THINKING-02 | Open | `tests/test_bonsai_stream_tags.py`; on-Deck proton/TDP/screenshot paths |
| THINKING-SARCASM | Always-sarcastic thinking blurb + visible during stream | THINKING-01, THINKING-03 | Open | `tests/test_bonsai_stream_tags.py`, `src/utils/composeThinkingBlurb.test.ts`; on-Deck streaming QA |
| THINKING-COPY | Thinking blurb copy refresh (phase pools, no prefix farm) | THINKING-01ΓÇª03, THINKING-COPY-01 | Open | `composeThinkingBlurb.test.ts`, `tests/test_bonsai_stream_tags.py`; on-Deck phase-change QA |
| TOKEN-STREAM-MD | Token stream live markdown (experimental) | STREAM-01ΓÇª10 | Open | `src/utils/streamMarkdownPrepare.test.ts`, `src/hooks/useSmoothStreamReveal.test.ts`; on-Deck Tier 2 |
| SYS-PROMPT-LAYERS | System prompt layer order | SMOKE-A transparency | Partial | `tests/test_ollama_service.py` only |

### Steam Input

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| STEAM-JUMP | Debug Steam Input jump Phase 1 | ΓÇö | Open | Tier 2 optional; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/STEAM-JUMP-shim/manifest.json) |
| QUICK-LAUNCH-DOC | Guide-chord macro documentation | ΓÇö | Open | Tier 3; [troubleshooting.md](troubleshooting.md) ┬º5 |
| SHORTCUT-KW | Shortcut setup keywords | SMOKE-F | Partial | [SMOKE-F-shortcut-deck](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json) |
| VAC-01ΓÇª06 | VAC / ban lookup Phase 1 | SMOKE-F, VAC-* | Partial | [VAC-01](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-vac-capability-off/manifest.json); full matrix ΓåÆ Tier 2 |

### About and polish

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| REPLY-LANG | Multi-language Ask replies + About override | LANG-01ΓÇª03 | Open | Steam `config.vdf` detect + `reply_language` setting |
| ABOUT-OLLAMA | Built on Ollama link | ΓÇö | Open | Tier 3 |
| GLASS-UI | Search surface glass pass | SMOKE-A | Open | |

### Desktop notes

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| APP-LOG | App activity logging to Desktop | ΓÇö | Open | Tier 2 |
| DESKTOP-NOTES | Save to Desktop note V1 | ΓÇö | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/DESKTOP-NOTES-rpc/manifest.json) |
| DESKTOP-AUTOSAVE | Daily chat auto-save V2 | ΓÇö | Open | Tier 2 |

### Permissions and capabilities

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| PERMS-GATE | Capability Permission Center | SMOKE-C | Partial | [SMOKE-C](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json); on-Deck toast ΓåÆ runbook; [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json) |
| PROTON-LOG | Proton log attachment | PROTON-LOG-01ΓÇª03 | Open | Tier 2; needs PROTON_LOG |
| MODEL-POLICY | Model policy tiers + disclosure | ΓÇö | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/MODEL-POLICY-load/manifest.json) |

### Character voice

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CHAR-VOICE | Character roleplay mode | ΓÇö | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/CHAR-VOICE-load-settings/manifest.json) |
| CHAR-ACCENT | Accent intensity levels | ΓÇö | Open | Tier 2ΓÇô3 |
| CHAR-SUGGEST | Running-game character suggestions | ΓÇö | Open | Tier 2 |
| CHAR-RANDOM | Random ΓÇ£?ΓÇ¥ avatar | ΓÇö | Open | Tier 3 |
| CHAR-ACCENT-UI | Character-derived UI accent theme | ΓÇö | Open | Tier 3 |
| PYRO-EGG | Pyro talent-manager easter egg | ΓÇö | Open | Tier 2ΓÇô3 |

### Vision (baseline index)

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| VISION-V1 | Global screenshots and vision V1 | SMOKE-G | Verified | Vision sweep 2026-04; rows below; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/VISION-V1-spot-dom/manifest.json) |

### Other shipped baseline

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CORE-ASK | Ask pipeline / Ollama routing | SMOKE-A | Open | |
| GAME-CTX | Running game context | SMOKE-B, game-name Ask | Partial | Test #6; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| TROUBLESHOOT-3 | Frozen carousel troubleshooting triple | SMOKE-D | Verified | [x] prompts below |
| LINUX-OLLAMA | Linux Ollama compatibility | CONN-TEST | Open | |
| ZIP-CI | Plugin release zip CI | N/A | N/A | CI + Tier 4 clean install |

---

## Test Results

On-Deck and preview-suite **PASS** rows only. FAIL / retry queue: [testing.md](testing.md#failures-and-retries).

| # | Build / date | Game | Prompt | Expected | Model | Status | Notes |
|---|--------------|------|--------|----------|-------|--------|-------|
| 1 | ΓÇö | None | "What is the capital of Michigan?" | Lansing (concise) | gemma3:latest | PASS | |
| 3 | ΓÇö | L4D2 | "Set my TDP to 8 watts" | JSON 8W, sysfs write | llama3:latest | PASS | ΓåÆ SMOKE-B |
| 4 | ΓÇö | L4D2 | "Set my TDP to 6 watts" | JSON 6W, sysfs write | llama3:latest | PASS | journalctl confirmed |
| 6 | ΓÇö | *(session title)* | "Recommended TDP for this game?" | JSON 3ΓÇô15W clamp | *record* | PASS | ΓåÆ TDP-REC |
| 7 | 2026-05-26 / 9e20a82 | preview | UNIT-A-vitest-gates | MAINT-HARNESS | preview-suite | PASS | [manifest](test-evidence/preGate/2026-05-26-9e20a82/UNIT-A-vitest-gates/manifest.json) |
| 8 | 2026-05-26 / 9e20a82 | preview | UNIT-B-pytest-sandbox-tdp | TDP-APPLY | preview-suite | PASS | [manifest](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json) |
| 9 | 2026-05-26 / 9e20a82 | preview | SMOKE-A-golden-path | SMOKE-A, CORE-UI, CORE-ASK, CONN-TEST, TRANSPΓÇª | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| 10 | 2026-05-26 / 9e20a82 | preview | SMOKE-C-perms-gate | SMOKE-C, PERMS-GATE | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json) |
| 11 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-disable-sanitize | SMOKE-F, SANITIZER | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json) |
| 12 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-shortcut-deck | SMOKE-F, SHORTCUT-KW | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json) |
| 13 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-vac-capability-off | SMOKE-F, VAC-01 | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-vac-capability-off/manifest.json) |
| 14 | 2026-05-26 / 9e20a82 | preview | SMOKE-B-tdp-8w-sandbox | SMOKE-B, TDP-APPLY, QAMP-BANNER, GAME-CTX | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| 15 | 2026-05-26 / 9e20a82 | preview | SMOKE-E-strategy-mode | SMOKE-E, STRATEGY-CORE, STRATEGY-SPOILER, MODΓÇª | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-E-strategy-mode/manifest.json) |
| 16 | 2026-05-26 / 9e20a82 | preview | BG-ASK-reopen-status | SMOKE-H, BG-ASK-V1 | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/BG-ASK-reopen-status/manifest.json) |
| 17 | 2026-05-26 / 9e20a82 | preview | TDP-15W-clamp | TDP-15W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-15W-clamp/manifest.json) |
| 18 | 2026-05-26 / 9e20a82 | preview | TDP-3W-clamp | TDP-3W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-3W-clamp/manifest.json) |
| 19 | 2026-05-26 / 9e20a82 | preview | TDP-1W-clamp-to-3 | TDP-1W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-1W-clamp-to-3/manifest.json) |
| 20 | 2026-05-26 / 9e20a82 | preview | TDP-20W-clamp-to-15 | TDP-20W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-20W-clamp-to-15/manifest.json) |
| 21 | 2026-05-26 / 9e20a82 | preview | GPU-800-advisory | GPU-800 | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/GPU-800-advisory/manifest.json) |
| 22 | 2026-05-26 / 9e20a82 | preview | STREAM-01-flag-off | STREAM-01 | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/STREAM-01-flag-off/manifest.json) |
| 23 | 2026-05-26 / 9e20a82 | preview | MDNS-FIND-rpc | MDNS-FIND | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/MDNS-FIND-rpc/manifest.json) |
| 24 | 2026-05-26 / 9e20a82 | preview | MODEL-POLICY-load | MODEL-POLICY | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/MODEL-POLICY-load/manifest.json) |
| 25 | 2026-05-26 / 9e20a82 | preview | CHAR-VOICE-load-settings | CHAR-VOICE | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/CHAR-VOICE-load-settings/manifest.json) |
| 26 | 2026-05-26 / 9e20a82 | preview | VAC-02-empty-key | VAC-02 | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/VAC-02-empty-key/manifest.json) |
| 27 | 2026-05-26 / 9e20a82 | preview | DESKTOP-NOTES-rpc | DESKTOP-NOTES | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/DESKTOP-NOTES-rpc/manifest.json) |
| 28 | 2026-05-26 / 9e20a82 | preview | STEAM-JUMP-shim | STEAM-JUMP | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/STEAM-JUMP-shim/manifest.json) |
| 29 | 2026-05-26 / 9e20a82 | preview | VISION-V1-spot-dom | VISION-V1, SMOKE-G | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/VISION-V1-spot-dom/manifest.json) |
| 30 | 2026-06-09 / a9237e4 | preview | STREAM-02-flag-on-speed | STREAM-02 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-02-flag-on-speed/manifest.json) |
| 31 | 2026-06-09 / a9237e4 | preview | STREAM-03-strategy-spoiler | STREAM-03, STRATEGY-SPOILER | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-03-strategy-spoiler/manifest.json) |
| 32 | 2026-06-09 / a9237e4 | preview | STREAM-04-stop-mid-stream | STREAM-04 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-04-stop-mid-stream/manifest.json) |
| 33 | 2026-06-09 / a9237e4 | preview | STREAM-05-transparency-terminal | STREAM-05, TRANSPARENCY | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-05-transparency-terminal/manifest.json) |
| 34 | 2026-06-09 / a9237e4 | preview | VAC-03-valid-key-steamid | VAC-03 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-03-valid-key-steamid/manifest.json) |
| 35 | 2026-06-09 / a9237e4 | preview | VAC-04-profile-url | VAC-04 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-04-profile-url/manifest.json) |
| 36 | 2026-06-09 / a9237e4 | preview | VAC-05-vanity-url | VAC-05 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-05-vanity-url/manifest.json) |
| 37 | 2026-06-09 / a9237e4 | preview | VAC-06-perm-off-after-key | VAC-06 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-06-perm-off-after-key/manifest.json) |
| 38 | 2026-06-09 / a9237e4 | preview | TDP-boundary-clamps-assert | TDP-1W, TDP-20W | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/TDP-boundary-clamps-assert/manifest.json) |
| 39 | 2026-06-09 / a9237e4 | preview | SMOKE-B-apply-with-perms | SMOKE-B, TDP-APPLY | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/SMOKE-B-apply-with-perms/manifest.json) |
| 40 | 2026-06-09 / a9237e4 | preview | BG-ASK-lifecycle | BG-ASK-V1, SMOKE-H | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/BG-ASK-lifecycle/manifest.json) |
| 41 | 2026-07-27 / Deck | DRG Survivor (`2321470`) | Strategy Ask (Glyphid Dreadnought / seed KB) | KB-SMOKE-02, KB-RETRIEVE | gemma4:e2b-it-qat | PASS | Dev-tab seed KB; Show details Local KB `wiki_verified`; [screenshot](../screenshots/DeckCapture_20260727_170321_game.png) |
| 42 | 2026-07-28 / Deck | DRG Survivor (`2321470`) | Strategy Ask (Dreadnought / vectorized seed + nomic) | KB-SMOKE-04, KB-RETRIEVE | gemma4:e2b-it-qat | PASS | Hybrid **Keyword + meaning**; embed ~1124 ms; [screenshot](../screenshots/DeckCapture_20260728_183448_game.png) |

**Tier 0 preview batch (5/5):** [test-evidence/tier0/2026-05-26-9e20a82/](test-evidence/tier0/2026-05-26-9e20a82/) ┬╖ **preGate (2/2):** [batch-summary](test-evidence/preGate/2026-05-26-9e20a82/batch-summary.json) ┬╖ **tier1Core (3/3):** [batch-summary](test-evidence/tier1Core/2026-05-26-9e20a82/batch-summary.json) ┬╖ **tier1Boundaries (5/5):** [batch-summary](test-evidence/tier1Boundaries/2026-05-26-9e20a82/batch-summary.json) ┬╖ **tier2 (8/8):** [batch-summary](test-evidence/tier2/2026-05-26-9e20a82/batch-summary.json) ┬╖ **deckOnly (3 skipped):** [batch-summary](test-evidence/deckOnly/2026-05-26-9e20a82/batch-summary.json)
---

## Tier 0 scenarios (S0)

Linked from [testing.md](testing.md#device-qa-runbook) **Tier 0**. Prefer smokes over individual rows.

### Deterministic commands (SMOKE-F)

- [x] `bonsai:disable-sanitize` / `bonsai:enable-sanitize` ΓÇö whole message; confirmation; no Ollama text in transparency
- [x] `bonsai:shortcut-setup-deck` ΓÇö Guide chord, QAM, Decky; points to [troubleshooting.md](troubleshooting.md) ┬º5
- [ ] `bonsai:shortcut-setup-stadia` ΓÇö spare button / Stadia layout (not R4-only)
- [ ] Shortcut: **Open Controller settings** with External/Steam on ΓåÆ `steam://open/settings/controller`
- [ ] Shortcut: permissions off ΓåÆ toast to enable navigation
- [x] `bonsai:vac-check` with **Steam Web API** off ΓåÆ capability message only (**VAC-01**)

### Token streaming (Tier 2 ΓÇö Developer tab)

Requires **Settings ΓåÆ Data ΓåÆ Show Developer tab** ΓåÆ **Token streaming (experimental)**.

- [x] **STREAM-01** Flag off: **ThinkingΓÇª** until full reply; normal chunks after
- [x] **STREAM-02** Flag on, Speed/Expert: single preview bubble with live markdown; terminal split + banners
- [ ] **STREAM-03** Flag on, Strategy + spoiler masking: open `bonsai-spoiler` shows mask only ΓÇö no body flash mid-stream
- [ ] **STREAM-04** Stop mid-stream: partial reply kept (including wait chip if fence still open); no stale overwrite
- [x] **STREAM-05** Transparency populates only after terminal
- [ ] **STREAM-06** Smooth reveal: pending stream polls without text regression (unit: `useSmoothStreamReveal.test.ts`)
- [ ] **STREAM-07** Open code fence: pulse + spinner (2s) until close; body appears after close
- [ ] **STREAM-08** T3 handoff: full markdown snap in stream bubble, then terminal chunk layout (may change later)
- [ ] **STREAM-09** D-pad: one Focusable stream bubble; after terminal, normal chunk chain
- [ ] **STREAM-10** Incomplete inline `**bold` renders as bold until closer arrives
- [ ] **THINKING-01** Pending: `thinking_summary` line visible (disgruntled/deadpan copy even without Character Voice); no lazy `Yeah,` / `Fine.` / `Oh joy` openers; no placeholder AI bubble before partial; opener woven via `compose_thinking_blurb`
- [ ] **THINKING-02** Mid-Ask prep phases (Proton logs, TDP read, screenshot prep, model retry): `thinking_summary` keeps question snippet + game with phase-specific witty/deadpan copy ΓÇö no generic downgrade to e.g. **Building contextΓÇª** alone
- [ ] **THINKING-03** During token streaming: italic thinking line stays visible above preview bubble; updates from `<bonsai-status>` or stable elapsed fallback (not hidden when `streaming=true`)
- [ ] **THINKING-COPY-01** Same Ask: italic line changes only when backend phase key changes or model emits `<bonsai-status>` ΓÇö not on elapsed-time rotation alone
- [ ] **FEEDBACK-01** Reply-action chrome: `.bonsai-chat-secondary-btn` on feedback/retry/details; neutral toasts on thumbs

### Model routing pickers (2026-07-17)

- [ ] **ROUTING-01** Ollama tab ΓåÆ **Set text model try orderΓÇª** opens fullscreen picker; installed tags listed (defaults on top)
- [ ] **ROUTING-02** Move up/down reorders; **Reset to defaults**; **Done** persists `text_model_routing_order`
- [ ] **ROUTING-03** High-VRAM toggle off: heavy tags grayed in list and skipped at Ask; on: new large pulls insert at top
- [ ] **ROUTING-04** D-pad: Ollama routing buttons ΓåÆ picker rows (move up/down) ΓåÆ footer Reset/Done

### Reply micro-actions (2026-07-17)

- [ ] **MICRO-01** After live reply: strategy branch/checklist (when present) above thumbs; refinement chips only after **Not really**; Retry/Show details below; all disabled while Ask in flight
- [ ] **MICRO-02** Chip tap autofills Ask field + toast; one chip per reply; chip-tap RPC error inline under chips only
- [ ] **MICRO-03** Send after chip arms follow-up (parent model pin, parent Q+A in backend); transparency route `reply_followup:*`
- [ ] **MICRO-04** D-pad: answer bubble Γåæ ΓåÆ branch options ΓåÆ checklist ΓåÆ thumbs ΓåÆ chip rows (after down only) ΓåÆ utility row ΓåÆ context strip
- [ ] **MICRO-05** D-pad column align (no chips): **Not really** Γåô ΓåÆ **Show details**; **Retry** Γåæ ΓåÆ **Helpful** (and **Helpful** Γåô ΓåÆ **Retry**; **Show details** Γåæ ΓåÆ **Not really**)

### Proton experiment journal (2026-07-17)

- [ ] **PROTON-JOURNAL-01** Settings ΓåÆ **Proton troubleshooting**: add entry (version, launch options, outcome); list shows newest first
- [ ] **PROTON-JOURNAL-02** Enable **Inject experiment journal** + troubleshooting Ask with numeric AppID ΓåÆ journal block in system prompt (developer chip)
- [ ] **PROTON-JOURNAL-03** **Suggest from log** prefills version when `steam_logs_read` on and `steam-<appid>.log` exists
- [ ] **PROTON-JOURNAL-04** **Clear all data** removes `~/.bonsai/proton_experiment_journal.json`

### Context chip ladder (F11 Option C)

- [ ] **CONTEXT-LADDER-01** Live turn: **Show details** reveals inline chip ladder; **Hide details** removes it (default closed after Ask)
- [ ] **CONTEXT-LADDER-02** Older turn hint jumps to **Session context** strip row; ladder shows frozen snapshot
- [ ] **CONTEXT-LADDER-03** D-pad: reply actions ΓåÆ (when details open) ladder chip Γåæ/Γåô ΓåÆ session strip; when details closed, utility row Γåô ΓåÆ session strip (on-Deck)

### Game context (Main tab)

- [ ] **GAME-CONTEXT-01** With a game running, type in Ask before sending ΓåÆ footer shows **Context: active game AppID ΓÇª**; no ΓÇ£No game detectedΓÇ¥ banner under Ask

---

## Tier 1 scenarios (S1)

### TDP / performance

- [x] **TDP-REC** "Recommended TDP for this game?" (game running, JSON) ΓÇö Test Results #6
- [x] "What's the efficiency sweet spot for this game?" ΓÇö verified prior pass
- [x] "What are the best settings for 60fps?" ΓÇö verified prior pass
- [x] **GPU-ADV** "What GPU clock should I use?" (advisory only; no sysfs GPU write) ΓÇö verified
- [x] **GPU-800** "Set GPU clock to 800 MHz" ΓÇö JSON `gpu_clock_mhz`; backend logs, no write
- [x] **TDP-15W** "Set TDP to 15 watts" ΓÇö clamp at 15W
- [x] **TDP-3W** "Set TDP to 3 watts" ΓÇö clamp at 3W
- [x] **TDP-1W** "Set TDP to 1 watt" ΓÇö clamp to 3W
- [x] **TDP-20W** "Set TDP to 20 watts" ΓÇö clamp to 15W
- [ ] "Lower my TDP by 2 watts" ΓÇö relative adjustment (may not parse)

### Battery / thermal / compatibility

- [x] "Optimize for battery life" (game running, low TDP JSON) ΓÇö verified (supersedes Test #5 fail)
- [x] "Balance FPS and battery" / `How do I balance FPS and battery?`
- [ ] "Set TDP to minimum for menu/idle" / `What TDP should I use for menus and idle?`
- [x] "Best settings for 30fps with max battery"
- [x] "Optimize for battery life" (no game ΓÇö general advice, no JSON)
- [x] "Reduce fan noise" / thermal long-session prompts ΓÇö verified
- [x] General compatibility prompts ("What settingsΓÇª", "known issues", "how well on Deck") ΓÇö verified

### Troubleshooting / Proton

- [x] **TROUBLESHOOT-3** Frozen carousel: crashing / stuttering / Proton ΓÇö verified (SMOKE-D)
- [ ] "Game won't launch, what should I check?"

#### Proton log attachment (Tier 2)

- [ ] **PROTON-LOG-01** Toggle + permission on, `steam-<appid>.log` present ΓåÆ transparency excerpt
- [ ] **PROTON-LOG-02** Toggle on, log read off ΓåÆ Ask completes; skip noted
- [ ] **PROTON-LOG-03** Heuristic ask, no log files ΓåÆ warning; answer still returns

### Controls and edge cases

- [ ] "Recommended controller layout?" (game running)
- [ ] "How to reduce input lag?"
- [ ] "What game am I playing?" (game running)
- [x] "What is my current TDP?" ΓÇö read path + sysfs grounding (unit + prior pass)
- [ ] Non-English input ΓåÆ English reply
- [ ] Very long prompt stress test
- [x] Empty-ish "hi" / "help"
- [ ] TDP optimization ask with **no** game ΓÇö generic advice only

**System prompt layers:** spot-check via SMOKE-A transparency; unit tests in `tests/test_ollama_service.py`.

### Reply ready toast (Tier 1)

- [ ] **REPLY-READY-01** Ask with QAM closed ΓåÆ **Reply ready** toast when answer completes ΓåÆ tap opens Decky/bonsAI Main with answer visible
- [ ] **REPLY-READY-02** Ask with QAM open on Main ΓåÆ no toast
- [ ] **REPLY-READY-03** Ask fails with QAM closed ΓåÆ error toast (no success toast)
- [ ] **REPLY-READY-04** Stop/cancel Ask ΓåÆ no toast
- [ ] **REPLY-READY-05** Second Ask while first toast visible ΓåÆ prior toast replaced (no stack)

---

## QAMP verification (Phase 1)

### Code / automated (verified 2026-04-26)

- [x] TDP write banner includes applied wattage
- [x] Transcript includes re-open QAM Performance guidance
- [x] **Note** about stale sliders on successful apply
- [x] GPU MHz recommendation labeled not sysfs-applied

### On-Deck manual (Tier 3 ΓÇö record build + SteamOS)

- [ ] **QAMP-DECK-01** Per-game profile ON: TDP apply + guidance
- [ ] **QAMP-DECK-02** Per-game profile OFF: same
- [ ] **QAMP-DECK-03** Close/reopen QAM Performance: cap reflects write
- [ ] **QAMP-DECK-04** After Steam restart: OS default (not plugin regression)
- [ ] **QAMP-DECK-05** After full reboot: same

---

## Tier 2 ΓÇö Bazzite gamescope QAM layout

Bazzite Game Mode only (gamescope session). Steam Deck regression: **SMOKE-A** tab strip still horizontal on open.

- [x] **QAM-BAZZITE-01** Open bonsAI from QAM on first paint ΓÇö full-width panel (not thin left strip); LB/RB icons horizontal; tab body below strip without overlap; pointer hover does not crush layout

### D-pad tab scroll viewport (2026-07-17)

- [x] **D-PAD-SCROLL-01** Main + Settings/Ollama: D-pad reaches bottom of long content and scrolls back up to LB/RB tab icons (regression for `TabContentsScroll` viewport fix)
- [ ] **D-PAD-SCROLL-02** Strategy long reply: D-pad Down advances ~one readable line/chunk per press (no multi-paragraph jumps); compare before/after `chatPanelScroll.ts` step sizing on Deck

### Multi-language replies (2026-07-18)

- [ ] **LANG-01** About ΓåÆ **Reply language** dropdown: **Follow system** shows detected Steam client language line; change to **Always English** or a fixed language persists across QAM reopen
- [ ] **LANG-02** D-pad: About beta disclaimer Γåô language dropdown Γåò GitHub link Γåò PayPal block (no skip)
- [ ] **LANG-03** With Steam client set to Japanese (or override **Japanese**): Speed Ask reply prose is Japanese; Strategy first-turn JSON `label` / `question` localized; fence names and `id` keys stay English

---

## Tier 2 ΓÇö UI scale profiles

Deck-only (multi-output: handheld, docked monitor, TV). Unit: `src/data/uiScaleProfile.test.ts`.

- [ ] **UI-SCALE-01** Handheld (internal): auto profile Handheld; no horizontal QAM spill on ask bar / chips
- [ ] **UI-SCALE-02** Docked desk monitor (24ΓÇ│ΓÇô27ΓÇ│): auto Desktop; layout matches handheld recipe
- [ ] **UI-SCALE-03** Docked TV (~65ΓÇ│ @ couch distance): auto Couch; larger type/spacing; no spill
- [ ] **UI-SCALE-04** Manual snap + **Apply UI scale** persists across QAM close; Pull Models modal matches scale
- [ ] **UI-SCALE-05** D-pad: auto toggle Γåò manual slider Γåò Reset Γåò Apply Γåò screenshot quality row; slider left/right snaps Handheld ┬╖ Desktop ┬╖ Couch
- [ ] **KB-FOCUS-01** D-pad (Ollama tab): connection row Γåô KB toggle Γåô download Γåô update Γåô remove Γåô Reply style slider Γåô Response verify toggle; D-pad up from Response verify reaches Reply style; D-pad up from KB toggle reaches connection row; D-pad up from **Run AI on this Deck** scrolls panel to tab strip
- [ ] **REPLY-VERB-01** Reply style: set **Short** ΓåÆ Ask ΓåÆ Input handling shows `Reply verbosity: Short` and system prompt contains `SHORT REPLY STYLE`; repeat **Detailed**; **Balanced** ΓåÆ no `REPLY VERBOSITY` block vs unit baseline; Strategy Ask with **Detailed** still ends with `bonsai-strategy-branches` fence on first turn
- [ ] **KB-DOWNLOAD-SD** Download modal: internal + SD card buttons match bonsAI button style; SD option when card inserted

### Knowledge base (RAG Deck query v1)

Coverage: **KB-DOWNLOAD** / **KB-RETRIEVE** / **KB-UNAVAIL**. Architecture: [knowledge-base.md](knowledge-base.md). Phase 2 hybrid shipped 2026-07-28; Phase 3 compat hybrid + corpus maturity shipped 2026-07-29 ΓÇö on-Deck QA **KB-SMOKE-07**ΓÇô**10** and maintainer eval **KB-EVAL-01** (`tests/fixtures/kb_eval_v0.json`).

- [x] **KB-SMOKE-01** Ollama tab: download (or verify installed) corpus + **Use local knowledge base** on; status shows ready ΓÇö *Partial 2026-07-27:* Developer tab seed install (HF/GitHub corpus not published yet); coverage **KB-DOWNLOAD** Partial
- [x] **KB-SMOKE-02** Strategy or troubleshooting Ask with KB on + seeded AppID ΓåÆ **Show details** / context chips show local KB (or equivalent splice evidence); reply grounded in corpus ΓÇö *Verified 2026-07-27:* DRG Survivor `2321470`; Show details ΓåÆ Local Knowledge Base `wiki_verified` + AppID; [DeckCapture_20260727_170321_game.png](../screenshots/DeckCapture_20260727_170321_game.png); coverage **KB-RETRIEVE** Verified
- [ ] **KB-SMOKE-03** KB toggle on, corpus missing/unavailable ΓåÆ once/session toast; Ask still completes without crash

**Phase 2 hybrid (shipped 2026-07-28):**

- [x] **KB-SMOKE-04** Vectorized seed + `nomic-embed-text` on Ask host ΓåÆ Strategy Ask ΓåÆ Show details chip **Keyword + meaning** ΓÇö *Verified 2026-07-28:* DRG Survivor `2321470`; chip **Keyword + meaning**; embed ~1124 ms; [DeckCapture_20260728_183448_game.png](../screenshots/DeckCapture_20260728_183448_game.png)
- [ ] **KB-SMOKE-05** KB on, vectors in corpus, `nomic-embed-text` missing ΓåÆ chip **Keyword search** + Ollama tab soft hint; Ask succeeds
- [ ] **KB-SMOKE-06** Force embed failure (wrong host / timeout) ΓåÆ chip **Keyword search**; Show details bullet **Keyword search (embed unavailable)**; Ask succeeds
- [ ] **KB-SMOKE-07** Troubleshooting Ask with vectorized Phase 3 seed + `nomic-embed-text` on Ask host ΓåÆ **Keyword + meaning** + Show details **Source: shared troubleshooting tips** ΓÇö *Open:* unit tests pass; on-Deck after Dev-tab reseed with schema v2 corpus

**Spoiler confidence chip** (decisions locked 2026-07-29 in [roadmap.md](roadmap.md)): add smoke when implementing ΓÇö chip under Show details on any mode (`Spoiler risk: low|med|high`); heuristic without model tag; blend when `<bonsai-spoiler-risk>` closes; incomplete risk tag does not blank the answer; consent/masking do not change the band.

**Phase 3 compat hybrid + corpus (shipped 2026-07-29):**

- [ ] **KB-SMOKE-08** Vectorized seed with expanded `compat_patterns` + `nomic-embed-text` on Ask host ΓåÆ troubleshooting Ask (e.g. Proton / Deck sleep) ΓåÆ chip **Keyword + meaning**; Show details **Source: shared troubleshooting tips**
- [ ] **KB-SMOKE-09** Troubleshooting Ask with vectors but no nomic ΓåÆ **Keyword search** + Ollama tab soft hint; Ask succeeds
- [ ] **KB-SMOKE-10** Strategy Ask regression on interim game mix (e.g. L4D2 `550`, BG3 `1086940`, Cyberpunk `1091500`) ΓåÆ hybrid **Keyword + meaning** when game resolved; no regression vs Phase 2 DRG Survivor path
- [ ] **KB-EVAL-01** Maintainer labeled eval set (~20ΓÇô30 queries) ΓÇö compat tips + strategy cards; document pass/fail before Phase 5 public publish

---

## Tier 2 ΓÇö Voice input (local STT)

Deck-only (mic + PipeWire capture). Preview harness stubs RPCs but cannot validate real audio.

- [ ] **VOICE-01** Permissions off ΓåÆ mic redirects to Permissions tab; no `start_voice_transcription` capture
- [ ] **VOICE-02** Permissions on + model downloaded ΓåÆ interim text streams into Ask field while speaking
- [ ] **VOICE-03** Stop mic (red stop) finalizes transcript; Ask can be submitted normally
- [ ] **VOICE-04** Revoke microphone permission mid-recording ΓåÆ capture stops immediately
- [ ] **VOICE-05** Install voice engine on SteamOS (podman) succeeds ΓÇö compiles CPU-safe `whisper-cli` + `whisper-server` (pinned digest, no SIGILL on Deck); engine + model show ready; existing CPU-safe installs upgrade with server-only build
- [ ] **VOICE-06** Session daemon latency ΓÇö interim text appears faster than Tier 1 cold `whisper-cli` spawn (~0.5ΓÇô1.5 s win per pass after first decode); no extra CPU stutter vs prior build in Gaming Mode QAM
- [ ] **VOICE-07** Stop mic, revoke microphone permission, plugin unload, or **Clear all data** while recording ΓÇö no orphan `whisper-server` on `127.0.0.1:18765` (`pgrep whisper-server` / PID file cleared)

Maintainer: digest bump + Tier 2 options ΓÇö [voice-input-follow-up.md](voice-input-follow-up.md).

## Tier 2 ΓÇö Open-weight pull (Tier 1 policy)

- [ ] **GEMMA-PULL-01** Model policy **Tier 1** ΓåÆ Ollama ΓåÆ **Open AI modelsΓÇª** ΓåÆ **Browse & pull** ΓåÆ queue an open-weight tag (e.g. `gemma4:e2b-it-qat`) ΓåÆ confirm **Enable Tier 2** modal ΓåÆ pull proceeds ΓåÆ bottom **Open AI modelsΓÇª** row shows **Also try open-weight models** (Tier 2), not Tier 1

---

## Tier 2 ΓÇö Clear all plugin data

Regression for settings/permissions surviving in-app clear (fixed 2026-07-06: modal survival + stale `save_settings` after reset).

- [ ] **DATA-CLEAR-01** Enable 3+ permissions, set Ollama LAN host, dismiss disclaimer ΓåÆ **Settings ΓåÆ Advanced ΓåÆ Clear all dataΓÇª** ΓåÆ success toast ΓåÆ close/reopen QAM ΓåÆ all permissions off, disclaimer returns, Ollama host default; `~/homebrew/settings/bonsAI/settings.json` has `capabilities` all `false`
- [ ] **DATA-CLEAR-02** After local Ollama + models installed ΓåÆ **Clear all data** ΓåÆ `~/.ollama` removed; Ollama tab shows **Install Ollama** until reinstalled; first install may take up to ~5 minutes (hint text under button)

## Tier 2 ΓÇö Tiny-model thinking blurbs

- [ ] **THINK-TINY-01** Developer ΓåÆ enable **Tiny-model thinking blurbs** without `qwen2.5:1.5b` ΓåÆ confirm pull modal ΓåÆ no spurious **Developer tab hidden** toast ΓåÆ lands on **Ollama** tab (not Main) with pull toast

## Tier 2 ΓÇö Strategy depth

Run after **SMOKE-E**. Unit coverage green 2026-04-30.

### Core mode UX

- [x] **STRAT-01** "How do I beat this level" beta preset visible
- [ ] Strategy preset switches mode to Strategy Guide
- [ ] Strategy placeholder copy
- [ ] Follow-ups stay strategy-relevant

### Spoiler policy

- [ ] **STRAT-SPOIL-01** First answer: no-spoilers-by-default disclosure
- [ ] **STRAT-SPOIL-02** Without permission: no direct puzzle/boss spoilers
- [ ] **STRAT-SPOIL-03** With permission: unrestricted guidance OK
- [ ] **STRAT-SPOIL-04** Tap-to-reveal blocks default
- [ ] **STRAT-SPOIL-05** Settings spoiler masking toggle behavior
- [ ] **STRAT-SPOIL-06** D-pad: from turn header Γåô lands on **Spoiler ΓÇö tap to show** `Button` (Decky `focusable`); A reveals; Γåæ returns to answer bubble

| ID | Game | Question | Consent | Masking | Pass |
|----|------|----------|---------|---------|------|
| STRAT-SPOIL-DRG-01 | 2321470 | How do I beat Glyphid Dreadnought? | no | on | No spoiler fence for boss tactics |
| STRAT-SPOIL-OOT-01 | 413150 | How do I beat King Dodongo? | no | on | Spoiler fence or minimized prose |
| STRAT-SPOIL-CONSENT-01 | OoT | Spoilers are okay ΓÇö how do I beat King Dodongo? | phrase | on | Plain-text OK |
| STRAT-SPOIL-MASK-OFF-01 | 2321470 | Same as DRG-01 | no | off (Settings) | No tap-to-reveal UI |

Phrase-only spoiler consent (`user_consents_strategy_spoilers` / RPC `spoiler_consent`); no per-Ask UI toggle in current build.

### Vision + strategy

- [ ] Strategy without screenshot: notes limited context
- [ ] Strategy with screenshot: scene-aware guidance
- [ ] Inline visual aid renders or degrades gracefully

### Steam Input coaching / checklist / cheat

- [ ] Headshots / control-specific Deck advice
- [ ] Checklist check/uncheck + follow-up progress (Strategy follow-up turn; `bonsai-strategy-checklist` fence)
- [ ] Checklist persists after QAM close / plugin reload (same game AppID)
- [ ] Reset session cache clears checklist
- [ ] Cheat / Fast Pass gating only when user asks to rush

### Strategy regression subset

- [ ] Beat level (no screenshot, no spoiler OK)
- [ ] Beat level + screenshot
- [ ] "Spoilers are okay, give me exact steps"
- [ ] "I can't hit headshots in this game"
- [ ] Checklist iteration prompt
- [ ] "Fastest cheese" cheat gating

---

## VAC / Steam ban lookup (`bonsai:vac-check`) ΓÇö Tier 2

- [x] **VAC-01** Capability off ΓÇö SMOKE-F; no outbound request
- [x] **VAC-02** Capability on, empty key
- [x] **VAC-03** Valid key + known SteamID; route `vac_check`
- [x] **VAC-04** Profile URL token
- [x] **VAC-05** Vanity `/id/ΓÇª` unsupported note
- [x] **VAC-06** Permission off after key saved ΓÇö no network

---

## Vision V1 (verified 2026-04)

Spot-check only if attach/RPC changes. **SMOKE-G**.

- [x] Fullscreen screenshot browser + thumbnails
- [x] App-priority ordering + global fallback
- [x] Select attaches; Back/Escape; controller navigation
- [x] Attach / Ask / Mic|Stop control row
- [x] Remove attachment ΓåÆ text-only next Ask
- [x] Quality Low / Mid / Max settings persist
- [x] Quality sweep on device (Low ΓåÆ Mid ΓåÆ Max)
- [x] Manual Deck staged run completed

---

## Appendix ΓÇö Tier 3 cosmetic (P3)

### Preset and follow-up UX

- [ ] Three random presets on load
- [ ] Fade mode: stagger, offsets (~750/1300/1700 ms), fade in/out timing, length hold
- [ ] Carousel mode: slide, D-pad history, post-Ask re-seed
- [ ] Preset tap appends " for [game]" when game running
- [ ] Follow-up category detection (battery / performance / troubleshooting / controls)
- [ ] **SESSION-RAG-CHIPS-01:** KB on + corpus installed + game with seed AppID (e.g. DRG Survivor `2321470`) ΓÇö occasional game-specific chip in trio; KB off or corpus missing ΓåÆ static-only; setup tip may appear from pool when sampled

### Beta preset behavior

- [ ] `[beta]` tag visual only (not in submitted text)
- [ ] Beta preset prompts give reasonable generic advice
- [ ] Beta category detection + follow-ups

---

## Appendix ΓÇö Tier 4 heavy (S3)

### Background prompt completion (V1)

**Tier 1 smoke:** SMOKE-H (reopen pending / complete). Full matrix below.

#### Lifecycle

- [ ] Close QAM while pending ΓåÆ reopen ΓåÆ ThinkingΓÇª
- [ ] Close QAM after complete ΓåÆ reopen ΓåÆ final reply
- [ ] Foreground flow unchanged
- [ ] Multiple reopens ΓåÆ single result

#### Busy / timeout / cancel

- [ ] Second Ask blocked while pending
- [ ] Timeout + error restore on reopen
- [ ] Stop/Clear semantics

#### Apply parity

- [ ] TDP JSON applies after background complete
- [ ] Session crash/reboot does **not** restore (expected V1)

#### Regression subset

- [ ] Slow / elapsed warnings; follow-up presets; input persistence; PC IP unchanged

### Games to test with

- [ ] Left 4 Dead 2
- [ ] Elden Ring
- [ ] Lightweight indie
- [ ] Demanding AAA
- [ ] Native Linux title
- [ ] Non-Steam / emulator shortcut

---

## Environment matrix

Validate on **Stable** Decky + **Stable** SteamOS when possible. Re-test PASS after channel changes.

| Component | Channel | Notes |
|-----------|---------|-------|
| Decky Loader | Stable (Release) | |
| SteamOS | Stable | Beta/Preview may change sysfs / QAM |

### Current test environment

Record before Tier 1+ runs:

- [ ] Decky Loader version: ___
- [ ] Decky channel: Stable / Pre-release
- [ ] SteamOS version: ___
- [ ] SteamOS channel: Stable / Beta / Preview
- [ ] Ollama version: ___
- [ ] Model(s) installed: ___

---

## Optional deep dives (release notes)

Historical **suggested checks** from shipped features ΓÇö run when touching that area; not required for Tier 0ΓÇô1.

### Input sanitizer (2026-04-16)

Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize`; re-enable before comparative model runs.

### Character accent intensity (2026-04-16)

Same preset at subtle vs unleashed; JSON/TDP unchanged.

### Strategy + TDP layout (2026-04-18)

Pure puzzle Strategy ask ΓåÆ no hardware JSON in system prompt; mixed performance ask ΓåÆ contract returns.

### Character voice + Pyro (2026-04-15)

Picker, Random, custom line; Pyro Balanced vs Nightmare ΓÇö no TDP apply on Nightmare asshole tier.

### Global screenshots (2026-04-13)

See **Vision V1** verified section.

### Frozen preset carousel (maintainers)

Set `TEMP_PRESET_CAROUSEL_FROZEN` in [`src/data/presets.ts`](../src/data/presets.ts) for repeatable chips:

1. `Why is my game crashing?`
2. `How do I fix stuttering?`
3. `Help me troubleshoot a Proton issue`

Turn **off** before release builds. `vitest` asserts frozen triple when flag on.

---

---

## Failures and retries

# bonsAI prompt testing ΓÇö failures & retries

Open FAIL rows, superseded preview attempts, and optional on-Deck retests. **PASS** results live in [testing.md](testing.md#shipped-feature-coverage).

**Retry:** `pnpm run test:preview:tier -- --tier=<batch> --filter=<id> --evidence --write`

---

## On-Deck FAIL (historical)

| # | Build / date | Game | Prompt | Expected | Model | Status | Notes |
|---|--------------|------|--------|----------|-------|--------|-------|
| 2 | ΓÇö | Elden Ring | "What TDP should I use?" | 8ΓÇô12W + JSON | llama3:latest | FAIL | PreΓÇôsystem-prompt fix; **optional retest** |
| 5 | ΓÇö | L4D2 | "Optimize for battery life" | Low TDP JSON | llama3:latest | FAIL | PreΓÇôgame context; superseded by Tier 1 with-game pass ΓÇö retest optional |

---

## Preview FAIL log

Runner `--write` upserts here on FAIL (deduped by scenario ID). Superseded rows from 2026-05-26 debug iterations are summarized below; per-attempt artifacts remain under [test-evidence/](test-evidence/).

### Superseded tier0 attempts (2026-05-26 / 9e20a82)

Sidecar / assertion tuning before final **5/5 PASS**. Evidence folders may contain both fail and pass manifests from the same date folder.

| Scenario | Attempts | Root cause (final) | Resolution |
|----------|----------|-------------------|------------|
| SMOKE-A-golden-path | 6+ | `domContains "bonsAI"`; IPC `callTestHook` timeout | Dismiss modal via focus; assert shell selectors |
| SMOKE-C-perms-gate | 5+ | Sidecar `fetch failed`; DOM `"Permissions"`; `callTestHook` timeout | RPC `load_settings` + `hardware_control` assert |
| SMOKE-F-disable-sanitize | 4+ | Sidecar down; RPC `"sanitizer"` vs `"sanitiz"` | Sidecar path fix; substring assert |
| SMOKE-F-shortcut-deck | 3+ | Sidecar `fetch failed` | Sidecar auto-start / manual start |
| SMOKE-F-vac-capability-off | 4+ | Sidecar down; assert `"capability"` vs message text | Assert `"Steam Web API is off"` |
| VISION-V1-spot-dom | 1 | `domContains "Ask"` ΓÇö label not in preview DOM | Assert `bonsai-decky-tabs-root` / askbar classes |

**Final PASS batch:** [test-evidence/tier0/2026-05-26-9e20a82/](test-evidence/tier0/2026-05-26-9e20a82/) ┬╖ **tier2 (8/8):** [test-evidence/tier2/2026-05-26-9e20a82/](test-evidence/tier2/2026-05-26-9e20a82/)

---

## Preview FAIL table (auto-updated)

<!-- preview-fail-results:start -->
| 2026-06-09 / a9237e4 | tier3UI | UI-A-beta-modal | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-beta-modal/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-tab-tour | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-tab-tour/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-settings-conn | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-settings-conn/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-permissions-ui | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-permissions-ui/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-mode-menu | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-mode-menu/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-transparency-expand | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-transparency-expand/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-debug-tab | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-debug-tab/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-presets-visible | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-presets-visible/manifest.json) ΓÇö Error: IPC timeout for callTestHook |
<!-- preview-fail-results:end -->

---

---

## Revision log

| Date | Change |
|------|--------|
| 2026-06-21 | Consolidated regression-and-smoke, device-qa-runbook, prompt-testing, prompt-testing-failures into testing.md |
| 2026-05-26 | FAIL rows split; preview --write dedupe |
| 2026-05-24 | Refactor: coverage matrix, tier-linked scenarios, runbook split |
