# bonsAI testing

**Purpose:** PR regression gates, Deck QA run order, shipped-feature coverage, Test Results, and failure retries.

Related: [roadmap.md](roadmap.md) (planning), [development.md](development.md) (build/deploy), [troubleshooting.md](troubleshooting.md) (setup). Evidence artifacts: [test-evidence/](test-evidence/).

---

## Regression gates

# Regression matrix and device smoke (standing gate)

**Purpose:** Default checklist for **every PR** and **every Deck-facing change** before merge or release. Manual Deck work runs from **[testing.md](testing.md#device-qa-runbook)** (Tier 0–1 first). Scenario detail and coverage index: **[testing.md](testing.md#shipped-feature-coverage)**. Hotspots: **[development.md](development.md#change-risk-hotspots)**.

**Contract:** Run **§1** always. Add **§2** rows that match touched paths. Run **§3** when `src/`, `main.py`, `plugin.json`, or Deck RPC contracts change (per [.cursor/rules/docs-on-ship.mdc](../.cursor/rules/docs-on-ship.mdc)).

---

### 1. Automated gates (every change set)

Run from repo root (Windows or Linux shell as appropriate):

| Step | Command | When |
|------|---------|------|
| Typecheck | `pnpm exec tsc --noEmit` | Any TS change or dependency bump |
| Frontend unit tests | `pnpm test` | Any `src/` change (includes Vitest headless Decky harness under `src/test-harness/`) |
| Backend unit tests | `pnpm run test:py` | Any `main.py`, `py_modules/backend/`, `refactor_helpers.py`, or `tests/` change |
| Bundle | `pnpm run build` | Any `src/` or build config change |
| Preview suite | `pnpm run test:preview:tier -- --tier=<batch> --write` | Tier QA batches; requires **Decky: Open Preview** for C/D buckets; evidence → `docs/test-evidence/` |
| Deck deploy build | `.\scripts\build.ps1` or `./scripts/build.sh` | Any `src/`, `main.py`, `plugin.json`, or Deck-facing asset change |
| Plugin zip CI | Run **Build plugin zip** in Actions (or `bash scripts/verify-decky-plugin-zip.sh` on a local `out/*.zip`) | Changes to [`.github/workflows/build-plugin-zip.yml`](../.github/workflows/build-plugin-zip.yml) or [`scripts/verify-decky-plugin-zip.sh`](../scripts/verify-decky-plugin-zip.sh) |

If a step does not apply (e.g. docs-only), state **N/A** in the PR description and still run the steps that do apply.

---

### 2. PR-scoped matrix (add focused checks)

Use the **Touched area** column to extend §1; prefer the narrowest tests first.

| Touched area | Extra automated focus | Manual / runbook tier |
|--------------|----------------------|------------------------|
| `backend/services/settings_service.py`, `settingsAndResponse.ts`, Settings UI | `tests/test_settings_service.py`, `src/utils/settingsAndResponse.test.ts` | Tier 0 **SMOKE-A** + setting persist spot-check |
| `backend/services/ollama_service.py`, `refactor_helpers.py` | `tests/test_ollama_service.py`, `tests/test_refactor_helpers.py` | Tier 1 one Ask per changed mode ([testing.md](testing.md#shipped-feature-coverage)) |
| `backend/services/desktop_note_service.py` | `tests/test_desktop_note_service.py` | Tier 2 desktop notes block |
| `backend/services/ai_character_service.py`, character UI | `tests/test_ai_character_service.py`, `tests/test_pyro_asshole_safety.py`, catalog/accent tests under `src/data/` | Tier 2 character / Pyro ([testing.md](testing.md#shipped-feature-coverage) PYRO-EGG) |
| `backend/services/capabilities.py`, Permissions UI | `tests/test_capabilities.py` | Tier 0 **SMOKE-C** |
| `src/components/MainTab.tsx`, unified input | `pnpm test` (utils/data) | Tier 0 **SMOKE-A** |
| `src/index.tsx` tabs, CSS, RPC wiring | Full §1 + §3 | Tier 0 **SMOKE-A** |
| `ollama_mdns_discovery_service.py`, Connection **Find LAN** | `tests/test_ollama_mdns_discovery_service.py` | Tier 2 mDNS block; N/A without publish |

---

### 3. Device smoke (Deck-facing PRs)

Run after **`scripts/build.ps1`** or **`scripts/build.sh`** succeeds. Use **[testing.md](testing.md#device-qa-runbook)** — do not duplicate the full matrix here.

### Required: Runbook Tier 0 (~15 min, BPM)

Complete **SMOKE-A → SMOKE-C → SMOKE-F** and check off runbook + linked [testing.md](testing.md#shipped-feature-coverage) rows. State **Pass / Partial / Fail / N/A** in the PR.

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
| **SMOKE-D / G** | Preset or vision changes — spot-check if already Verified |

Full Tier 2–4 blocks (VAC matrix, Proton logs, QAMP reboot, clean install): see runbook; required before **release tag**, not every PR.

---

### 4. Prompt-testing and coverage

Qualitative scenarios, **Shipped feature coverage** table, and Test Results log: **[testing.md](testing.md#shipped-feature-coverage)**.  
Execution order: **[testing.md](testing.md#device-qa-runbook)**.

After prompt/routing changes, add or update scenario rows and run the matching runbook tier.

---

### 5. Release / clean install proof (Runbook Tier 4)

**Purpose:** Prove a **new user** can succeed using only **[README.md](../README.md)** plus **[development.md](development.md) → Release (plugin zip)** for where the `.zip` comes from—no unstated maintainer shortcuts.

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
| **P0–P3** | Importance — P0 = core product; P3 = polish / easter eggs |
| **S0–S3** | Setup cost — S0 = BPM + Ollama up; S3 = reboot / clean install / multi-game |
| **Tier 0–4** | Run order — complete lower tiers before higher unless PR-scoped |

---

## Cross-cutting smokes

One smoke run can check off many coverage rows. After each smoke, update [testing.md](testing.md#shipped-feature-coverage) **Shipped feature coverage** and linked scenario checkboxes.

| ID | Name | Tier | Setup | Importance | Covers (feature IDs) |
|----|------|------|-------|------------|----------------------|
| **SMOKE-A** | Golden path | 0 | S0, BPM | P0 | Plugin shell, tabs, Connection Ask, D-pad chunks, transparency opens, presets visible |
| **SMOKE-C** | Permission gate | 0 | S0 | P0 | Capability center — blocked-action toast pattern |
| **SMOKE-F** | Deterministic commands | 0 | S0, no model | P2 | Input sanitizer commands, shortcut-setup-deck, vac-check capability-off |
| **SMOKE-B** | TDP apply 8W | 1 | S1, game + Hardware on | P0 | TDP JSON, sysfs, game context, QAMP banner, permissions hardware |
| **SMOKE-E** | Strategy one-shot | 1 | S1 | P1 | Mode selector, strategy placeholder, spoiler tap-to-reveal, Spoilers OK |
| **SMOKE-D** | Frozen carousel triple | 1 | S1, optional flag | P0 | Presets, game-name append, troubleshooting prompts — **verified** (see coverage) |
| **SMOKE-G** | Vision attach once | 1 | S1, Media on | P1 | Attach browser, multimodal Ask — **verified** (vision sweep 2026-04) |
| **SMOKE-H** | Background Ask reopen | 1 | S1 | P1 | Close QAM while pending → reopen restores Thinking… or final reply |

**Tier 0 order (~15 min):** SMOKE-A → SMOKE-C → SMOKE-F  
**Tier 1 order (~20 min):** SMOKE-B → SMOKE-E → confirm SMOKE-D / SMOKE-G if not already marked → SMOKE-H

---

## Tier 0 — Quick wins (S0)

Run in BPM (Desktop → Big Picture → QAM → bonsAI). Ollama reachable; default permissions OK unless smoke says otherwise.

### SMOKE-A — Golden path (P0)

- [ ] Open plugin from QAM; no crash on first paint.
- [ ] LB/RB cycles **Main → Settings → Permissions → (Debug if enabled) → About**.
- [ ] **Settings → Connection → Test** — success or stable unreachable message (no traceback).
- [ ] Main tab: type a short question; **Ask**; reply appears in focusable chunks.
- [ ] D-pad down through chunks; last chunk readable.
- [ ] Expand **Input handling (last Ask)** — raw input, model name, system/user snapshot present.
- [ ] Three preset chips visible on Main.

**Links:** [testing.md](testing.md#shipped-feature-coverage) → Tier 0 scenarios; coverage rows `CORE-ASK`, `CORE-UI`, `CONN-TEST`, `TRANSPARENCY`.

### SMOKE-C — Permission gate (P0)

- [ ] **Permissions:** turn **Hardware control** (or another) **off**.
- [ ] Trigger blocked action (e.g. Ask that would apply TDP, or attach screenshot if Media off).
- [ ] Toast directs to Permissions; no crash.
- [ ] Turn capability back **on** before Tier 1.

**Links:** coverage `PERMS-GATE`.

### SMOKE-F — Deterministic commands (P2)

No Ollama call for these paths.

- [ ] Ask exactly `bonsai:disable-sanitize` → confirmation; **Input handling** shows no Ollama text.
- [ ] Ask exactly `bonsai:enable-sanitize` → confirmation.
- [ ] Ask exactly `bonsai:shortcut-setup-deck` → Guide/QAM/Decky copy; no model call.
- [ ] Ask `bonsai:vac-check 76561198000000000` with **Steam Web API** off → capability message only; no network.

**Links:** [testing.md](testing.md#shipped-feature-coverage) → Tier 0 deterministic; coverage `SANITIZER`, `SHORTCUT-KW`, `VAC-01`.

---

## Tier 1 — Core shipped (S1)

Requires a **game running** for some steps (Track B — Gaming Mode or BPM with game focused). Enable **Permissions → Hardware control** for TDP apply.

### SMOKE-B — TDP apply 8W (P0)

- [ ] With game running: Ask `Set my TDP to 8 watts`.
- [ ] Response includes `[Applied: TDP: 8W]` (or equivalent banner).
- [ ] QAM re-open guidance in transcript (**Note** about Performance tab).
- [ ] **Input handling** shows TDP route / JSON parse path.

**Links:** Test Results #3–4; coverage `TDP-APPLY`, `QAMP-BANNER`; [testing.md](testing.md#shipped-feature-coverage) → QAMP on-Deck (first two rows).

### SMOKE-E — Strategy one-shot (P1)

- [ ] Main tab mode → **Strategy**; placeholder changes to strategy copy.
- [ ] Ask `How do I beat this level` (no spoilers permission).
- [ ] Reply uses tap-to-reveal spoiler blocks where applicable.
- [ ] Enable **Spoilers OK for this Ask**; follow-up allows fuller guidance.

**Links:** coverage `STRATEGY-CORE`, `STRATEGY-SPOILER`; [testing.md](testing.md#shipped-feature-coverage) → Tier 2 Strategy depth (partial — expand in Tier 2).

### SMOKE-D — Frozen carousel triple (P0) — verified

Optional: set `TEMP_PRESET_CAROUSEL_FROZEN` in [`src/data/presets.ts`](../src/data/presets.ts). Three chips: crashing / stuttering / Proton. **Already verified** — spot-check only if presets change.

**Links:** coverage `PRESETS-CAROUSEL`, `TROUBLESHOOT-3`.

### SMOKE-G — Vision attach once (P1) — verified

Attach one screenshot + one Ask. **Already verified** (vision sweep 2026-04) — spot-check if attach/RPC changes.

**Links:** coverage `VISION-V1`.

### SMOKE-H — Background Ask reopen (P1)

- [ ] Start a slow Ask; close QAM before completion; reopen → **Thinking…** or restored pending state.
- [ ] Repeat: close QAM; reopen after completion → full reply restored.

**Links:** coverage `BG-ASK-V1`; [testing.md](testing.md#shipped-feature-coverage) → Appendix Tier 4 background matrix for full lifecycle.

### Tier 1 extras (single Ask each)

- [ ] **Session restore:** close and reopen plugin — last Q&A still visible (`PERSIST-QA`, P0).
- [ ] **Mode Speed vs Expert:** one Ask each; model disclosure or routing differs (`MODE-SELECTOR`, P1).
- [ ] **What game am I playing?** with game focused — names title (`GAME-CTX`, P0).

---

## Tier 2 — Opt-in features (S2)

Run when touching related code or before a release candidate.

| Block | Setup | Importance | Detail in testing.md |
|-------|-------|------------|----------------------------|
| **VAC full matrix** | Steam Web API key + permission | P2 | VAC-01 … VAC-06 |
| **Proton log attach** | `PROTON_LOG=1`, game, log read permission | P2 | PROTON-LOG-01 … 03 |
| **Token streaming** | Developer tab + flag | P2 | STREAM-01 … 05 |
| **Strategy depth** | Strategy mode + screenshots optional | P1 | Strategy spoiler, checklist, cheat gating, regression subset |
| **Character voice** | AI character on, one preset Ask | P2 | CHAR-VOICE |
| **Pyro easter egg** | Pyro or Random → Pyro; Balanced + Nightmare spot | P3 | PYRO-EGG |
| **Beta presets** | Main tab chips with `[beta]` tag | P3 | BETA-PRESET |
| **mDNS Find LAN** | Avahi/Bonjour on Ollama host | P2 | MDNS-FIND |
| **Desktop notes** | Filesystem permission on | P2 | DESKTOP-NOTES |
| **Model policy** | Change tier; confirm disclosure on reply | P1 | MODEL-POLICY |

---

## Tier 3 — Heavy manual (S3)

Defer until Tier 0–2 pass or release window.

| Block | Why heavy | Detail |
|-------|-----------|--------|
| **QAMP on-Deck matrix** | Per-game profile, QAM reopen, Steam restart, reboot | [testing.md](testing.md#shipped-feature-coverage) → QAMP on-Deck |
| **TDP boundary clamps** | Multiple watt asks with verification | TDP-15W, TDP-3W, TDP-1W, TDP-20W, GPU-800 |
| **Background Ask full lifecycle** | Timeout, error, busy guard, session boundary | Appendix Tier 4 |
| **Multi-game matrix** | Title-specific behavior | Games to test with |
| **Guide-chord macro** | User-specific QAM rail depth | [troubleshooting.md](troubleshooting.md) §5 |
| **Preset carousel timing (ms)** | Cosmetic animation | Appendix Tier 3 cosmetic |

---

## Tier 4 — Release gate (S3)

| Block | When |
|-------|------|
| **Clean install proof** | Before tagging a release — [testing.md](testing.md#regression-gates) §5 |
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

**Roadmap target:** Tier **0–1** complete for routine PRs; Tier **2+** ongoing before release.

---

---

# bonsAI prompt testing tracker


This file holds the **shipped-feature coverage index**, **Test Results log**, and **detailed scenario checkboxes** linked from the runbook.

Related planning (not yet implemented): [roadmap.md](roadmap.md) **Planned** section. Research notes: [archive/research/steam-input-research.md](archive/research/steam-input-research.md), [archive/research/voice-character-catalog.md](archive/research/voice-character-catalog.md).

---

## Evidence rules (check-offs)

Mark `- [x]` when:

1. **On-device PASS** recorded in Test Results (with build / date when known), or  
2. **Documented verified sweep** — e.g. vision V1 manual run (2026-04), QAMP banner unit tests (2026-04-26), frozen-carousel troubleshooting pass.

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
| PROMPT-TEST-MVP | Prompt-testing MVP (this doc) | — | Partial | Matrices shipped; Tier 0–1 open |
| SANITIZER | Input sanitizer lane | SMOKE-F | Partial | [SMOKE-F-disable-sanitize](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json) |
| TRANSPARENCY | Input handling transparency panel | SMOKE-A | Partial | Expand panel in golden path (on-Deck); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |

### Connection, routing, diagnostics

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CONN-TEST | Deck/PC connection + Test Ollama | SMOKE-A | Open | |
| CONN-TIMEOUT | Latency/timeout warnings + sliders | SMOKE-A | Open | Slow Ask optional |
| KEEP-ALIVE | Ollama keep_alive presets | — | Open | Settings persist |
| LOCAL-RUNTIME | Local Ollama on Deck default-off + onboarding | — | Open | Tier 2 |
| MDNS-FIND | LAN mDNS Find LAN | — | Open | Tier 2; needs Avahi; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/MDNS-FIND-rpc/manifest.json) |
| NAMED-HOSTS | Named Ollama hosts (quick switch) | — | Open | Ollama tab; up to 4 labeled LAN URLs |
| MAINT-HARNESS | Vitest Deck harness, watch-deploy | N/A (unit-only) | N/A | CI; [preGate](test-evidence/preGate/2026-05-26-9e20a82/batch-summary.json); [preview 2026-05-26](test-evidence/preGate/2026-05-26-9e20a82/UNIT-A-vitest-gates/manifest.json) |
| OLLAMA-UPDATE | Update Ollama & Models on Deck | — | Open | Tier 2 |

### Tabs, icons, unified ask

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CORE-UI | Iconography, tabs, unified input | SMOKE-A | Partial | [SMOKE-A](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| PERSIST-QA | Persist last Q&A on reopen | Tier 1 extra | Open | |
| UNIFIED-INPUT | Unified search + ask | SMOKE-A | Open | |
| PRESET-FADE-OPT | Preset chip fade opt-out | — | Open | Tier 3 cosmetic |
| CAROUSEL-SLIDE | Carousel slide + history (2026-05-20) | — | Open | Tier 3 cosmetic |
| GEMMA-PULL | Gemma pull models + routing | — | Partial | Unit tests |
| MODE-SELECTOR | Speed / Strategy / Expert | SMOKE-E, Tier 1 | Open | Persisted id `expert` |
| VOICE-STT | Whisper voice Ask (local STT) | VOICE-01…04 | Open | Permissions + Settings model download; on-Deck mic required |
| STRATEGY-CORE | Strategy Guide prompt path | SMOKE-E | Open | |
| STRATEGY-SPOILER | Strategy spoiler policy + consent | SMOKE-E, STRAT-01…05 | Partial | Unit green 2026-04-30; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-E-strategy-mode/manifest.json) |
| DEBUG-TAB | Debug tab opt-in | SMOKE-A | Open | Tab strip when enabled |
| SETTINGS-TRIM | Settings tab trim | SMOKE-A | Open | |
| RESET-SESSION | Reset session cache | — | Open | Tier 2 |
| RETRY-PROMPT | Retry same prompt (regenerate) | FEEDBACK-01 | Open | `BonsaiChatReplyActions.tsx`; on-Deck |
| ASK-FEEDBACK | Per-turn local feedback (thumbs) | FEEDBACK-01 | Open | `save_ask_feedback` RPC; on-Deck |

### AI-assisted power and UX

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| TDP-APPLY | TDP automation via AI JSON | SMOKE-B, Test #3–4, 6 | Verified | On-Deck PASS rows; [UNIT-B](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json); [preview 2026-05-26](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json) |
| QAMP-BANNER | QAMP Phase 1 banner (safe default) | SMOKE-B, QAMP-CODE | Verified | Vitest 2026-04-26; on-Deck → Tier 3; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| QAMP-ONDECK | QAMP manual (profile/reboot) | QAMP-DECK-01…05 | Open | Tier 3 |
| D-PAD-CHUNKS | D-pad response scrolling | SMOKE-A | Partial | [SMOKE-A focus path](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| BG-ASK-V1 | Background prompt completion V1 | SMOKE-H, BG-* | Partial | SMOKE-H Tier 1; full matrix Tier 4; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/BG-ASK-reopen-status/manifest.json) |
| THINKING-PHASE | Thinking phase copy polish (mid-Ask woven status) | THINKING-01, THINKING-02 | Open | `tests/test_bonsai_stream_tags.py`; on-Deck proton/TDP/screenshot paths |
| SYS-PROMPT-LAYERS | System prompt layer order | SMOKE-A transparency | Partial | `tests/test_ollama_service.py` only |

### Steam Input

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| STEAM-JUMP | Debug Steam Input jump Phase 1 | — | Open | Tier 2 optional; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/STEAM-JUMP-shim/manifest.json) |
| QUICK-LAUNCH-DOC | Guide-chord macro documentation | — | Open | Tier 3; [troubleshooting.md](troubleshooting.md) §5 |
| SHORTCUT-KW | Shortcut setup keywords | SMOKE-F | Partial | [SMOKE-F-shortcut-deck](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json) |
| VAC-01…06 | VAC / ban lookup Phase 1 | SMOKE-F, VAC-* | Partial | [VAC-01](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-vac-capability-off/manifest.json); full matrix → Tier 2 |

### About and polish

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| ABOUT-OLLAMA | Built on Ollama link | — | Open | Tier 3 |
| GLASS-UI | Search surface glass pass | SMOKE-A | Open | |

### Desktop notes

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| APP-LOG | App activity logging to Desktop | — | Open | Tier 2 |
| DESKTOP-NOTES | Save to Desktop note V1 | — | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/DESKTOP-NOTES-rpc/manifest.json) |
| DESKTOP-AUTOSAVE | Daily chat auto-save V2 | — | Open | Tier 2 |

### Permissions and capabilities

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| PERMS-GATE | Capability Permission Center | SMOKE-C | Partial | [SMOKE-C](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json); on-Deck toast → runbook; [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json) |
| PROTON-LOG | Proton log attachment | PROTON-LOG-01…03 | Open | Tier 2; needs PROTON_LOG |
| MODEL-POLICY | Model policy tiers + disclosure | — | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/MODEL-POLICY-load/manifest.json) |

### Character voice

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CHAR-VOICE | Character roleplay mode | — | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/CHAR-VOICE-load-settings/manifest.json) |
| CHAR-ACCENT | Accent intensity levels | — | Open | Tier 2–3 |
| CHAR-SUGGEST | Running-game character suggestions | — | Open | Tier 2 |
| CHAR-RANDOM | Random “?” avatar | — | Open | Tier 3 |
| CHAR-ACCENT-UI | Character-derived UI accent theme | — | Open | Tier 3 |
| PYRO-EGG | Pyro talent-manager easter egg | — | Open | Tier 2–3 |

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
| 1 | — | None | "What is the capital of Michigan?" | Lansing (concise) | gemma3:latest | PASS | |
| 3 | — | L4D2 | "Set my TDP to 8 watts" | JSON 8W, sysfs write | llama3:latest | PASS | → SMOKE-B |
| 4 | — | L4D2 | "Set my TDP to 6 watts" | JSON 6W, sysfs write | llama3:latest | PASS | journalctl confirmed |
| 6 | — | *(session title)* | "Recommended TDP for this game?" | JSON 3–15W clamp | *record* | PASS | → TDP-REC |
| 7 | 2026-05-26 / 9e20a82 | preview | UNIT-A-vitest-gates | MAINT-HARNESS | preview-suite | PASS | [manifest](test-evidence/preGate/2026-05-26-9e20a82/UNIT-A-vitest-gates/manifest.json) |
| 8 | 2026-05-26 / 9e20a82 | preview | UNIT-B-pytest-sandbox-tdp | TDP-APPLY | preview-suite | PASS | [manifest](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json) |
| 9 | 2026-05-26 / 9e20a82 | preview | SMOKE-A-golden-path | SMOKE-A, CORE-UI, CORE-ASK, CONN-TEST, TRANSP… | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| 10 | 2026-05-26 / 9e20a82 | preview | SMOKE-C-perms-gate | SMOKE-C, PERMS-GATE | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json) |
| 11 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-disable-sanitize | SMOKE-F, SANITIZER | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json) |
| 12 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-shortcut-deck | SMOKE-F, SHORTCUT-KW | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json) |
| 13 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-vac-capability-off | SMOKE-F, VAC-01 | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-vac-capability-off/manifest.json) |
| 14 | 2026-05-26 / 9e20a82 | preview | SMOKE-B-tdp-8w-sandbox | SMOKE-B, TDP-APPLY, QAMP-BANNER, GAME-CTX | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| 15 | 2026-05-26 / 9e20a82 | preview | SMOKE-E-strategy-mode | SMOKE-E, STRATEGY-CORE, STRATEGY-SPOILER, MOD… | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-E-strategy-mode/manifest.json) |
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

**Tier 0 preview batch (5/5):** [test-evidence/tier0/2026-05-26-9e20a82/](test-evidence/tier0/2026-05-26-9e20a82/) · **preGate (2/2):** [batch-summary](test-evidence/preGate/2026-05-26-9e20a82/batch-summary.json) · **tier1Core (3/3):** [batch-summary](test-evidence/tier1Core/2026-05-26-9e20a82/batch-summary.json) · **tier1Boundaries (5/5):** [batch-summary](test-evidence/tier1Boundaries/2026-05-26-9e20a82/batch-summary.json) · **tier2 (8/8):** [batch-summary](test-evidence/tier2/2026-05-26-9e20a82/batch-summary.json) · **deckOnly (3 skipped):** [batch-summary](test-evidence/deckOnly/2026-05-26-9e20a82/batch-summary.json)
---

## Tier 0 scenarios (S0)

Linked from [testing.md](testing.md#device-qa-runbook) **Tier 0**. Prefer smokes over individual rows.

### Deterministic commands (SMOKE-F)

- [x] `bonsai:disable-sanitize` / `bonsai:enable-sanitize` — whole message; confirmation; no Ollama text in transparency
- [x] `bonsai:shortcut-setup-deck` — Guide chord, QAM, Decky; points to [troubleshooting.md](troubleshooting.md) §5
- [ ] `bonsai:shortcut-setup-stadia` — spare button / Stadia layout (not R4-only)
- [ ] Shortcut: **Open Controller settings** with External/Steam on → `steam://open/settings/controller`
- [ ] Shortcut: permissions off → toast to enable navigation
- [x] `bonsai:vac-check` with **Steam Web API** off → capability message only (**VAC-01**)

### Token streaming (Tier 2 — Developer tab)

Requires **Settings → Data → Show Developer tab** → **Token streaming (experimental)**.

- [x] **STREAM-01** Flag off: **Thinking…** until full reply; normal chunks after
- [x] **STREAM-02** Flag on, Speed/Expert: single preview bubble; terminal split + banners
- [x] **STREAM-03** Flag on, Strategy + spoiler masking, no Spoilers OK: no unmasked mid-stream flash
- [x] **STREAM-04** Stop mid-stream: cancelled copy; no stale overwrite
- [x] **STREAM-05** Transparency populates only after terminal
- [ ] **STREAM-06** Smooth reveal: pending stream polls without text regression (preview RPC)
- [ ] **THINKING-01** Pending: `thinking_summary` line visible; no placeholder AI bubble before partial; opener woven via `compose_thinking_blurb`
- [ ] **THINKING-02** Mid-Ask prep phases (Proton logs, TDP read, screenshot prep, model retry): `thinking_summary` keeps question snippet + game — no generic downgrade to e.g. **Building context…** alone
- [ ] **FEEDBACK-01** Reply-action chrome: `.bonsai-chat-secondary-btn` on feedback/retry/details

---

## Tier 1 scenarios (S1)

### TDP / performance

- [x] **TDP-REC** "Recommended TDP for this game?" (game running, JSON) — Test Results #6
- [x] "What's the efficiency sweet spot for this game?" — verified prior pass
- [x] "What are the best settings for 60fps?" — verified prior pass
- [x] **GPU-ADV** "What GPU clock should I use?" (advisory only; no sysfs GPU write) — verified
- [x] **GPU-800** "Set GPU clock to 800 MHz" — JSON `gpu_clock_mhz`; backend logs, no write
- [x] **TDP-15W** "Set TDP to 15 watts" — clamp at 15W
- [x] **TDP-3W** "Set TDP to 3 watts" — clamp at 3W
- [x] **TDP-1W** "Set TDP to 1 watt" — clamp to 3W
- [x] **TDP-20W** "Set TDP to 20 watts" — clamp to 15W
- [ ] "Lower my TDP by 2 watts" — relative adjustment (may not parse)

### Battery / thermal / compatibility

- [x] "Optimize for battery life" (game running, low TDP JSON) — verified (supersedes Test #5 fail)
- [x] "Balance FPS and battery" / `How do I balance FPS and battery?`
- [ ] "Set TDP to minimum for menu/idle" / `What TDP should I use for menus and idle?`
- [x] "Best settings for 30fps with max battery"
- [x] "Optimize for battery life" (no game — general advice, no JSON)
- [x] "Reduce fan noise" / thermal long-session prompts — verified
- [x] General compatibility prompts ("What settings…", "known issues", "how well on Deck") — verified

### Troubleshooting / Proton

- [x] **TROUBLESHOOT-3** Frozen carousel: crashing / stuttering / Proton — verified (SMOKE-D)
- [ ] "Game won't launch, what should I check?"

#### Proton log attachment (Tier 2)

- [ ] **PROTON-LOG-01** Toggle + permission on, `steam-<appid>.log` present → transparency excerpt
- [ ] **PROTON-LOG-02** Toggle on, log read off → Ask completes; skip noted
- [ ] **PROTON-LOG-03** Heuristic ask, no log files → warning; answer still returns

### Controls and edge cases

- [ ] "Recommended controller layout?" (game running)
- [ ] "How to reduce input lag?"
- [ ] "What game am I playing?" (game running)
- [x] "What is my current TDP?" — read path + sysfs grounding (unit + prior pass)
- [ ] Non-English input → English reply
- [ ] Very long prompt stress test
- [x] Empty-ish "hi" / "help"
- [ ] TDP optimization ask with **no** game — generic advice only

**System prompt layers:** spot-check via SMOKE-A transparency; unit tests in `tests/test_ollama_service.py`.

---

## QAMP verification (Phase 1)

### Code / automated (verified 2026-04-26)

- [x] TDP write banner includes applied wattage
- [x] Transcript includes re-open QAM Performance guidance
- [x] **Note** about stale sliders on successful apply
- [x] GPU MHz recommendation labeled not sysfs-applied

### On-Deck manual (Tier 3 — record build + SteamOS)

- [ ] **QAMP-DECK-01** Per-game profile ON: TDP apply + guidance
- [ ] **QAMP-DECK-02** Per-game profile OFF: same
- [ ] **QAMP-DECK-03** Close/reopen QAM Performance: cap reflects write
- [ ] **QAMP-DECK-04** After Steam restart: OS default (not plugin regression)
- [ ] **QAMP-DECK-05** After full reboot: same

---

## Tier 2 — Voice input (local STT)

Deck-only (mic + PipeWire capture). Preview harness stubs RPCs but cannot validate real audio.

- [ ] **VOICE-01** Permissions off → mic redirects to Permissions tab; no `start_voice_transcription` capture
- [ ] **VOICE-02** Permissions on + model downloaded → interim text streams into Ask field while speaking
- [ ] **VOICE-03** Stop mic (red stop) finalizes transcript; Ask can be submitted normally
- [ ] **VOICE-04** Revoke microphone permission mid-recording → capture stops immediately

## Tier 2 — Strategy depth

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

### Vision + strategy

- [ ] Strategy without screenshot: notes limited context
- [ ] Strategy with screenshot: scene-aware guidance
- [ ] Inline visual aid renders or degrades gracefully

### Steam Input coaching / checklist / cheat

- [ ] Headshots / control-specific Deck advice
- [ ] Checklist check/uncheck + follow-up progress
- [ ] Cheat / Fast Pass gating only when user asks to rush

### Strategy regression subset

- [ ] Beat level (no screenshot, no spoiler OK)
- [ ] Beat level + screenshot
- [ ] "Spoilers are okay, give me exact steps"
- [ ] "I can't hit headshots in this game"
- [ ] Checklist iteration prompt
- [ ] "Fastest cheese" cheat gating

---

## VAC / Steam ban lookup (`bonsai:vac-check`) — Tier 2

- [x] **VAC-01** Capability off — SMOKE-F; no outbound request
- [x] **VAC-02** Capability on, empty key
- [x] **VAC-03** Valid key + known SteamID; route `vac_check`
- [x] **VAC-04** Profile URL token
- [x] **VAC-05** Vanity `/id/…` unsupported note
- [x] **VAC-06** Permission off after key saved — no network

---

## Vision V1 (verified 2026-04)

Spot-check only if attach/RPC changes. **SMOKE-G**.

- [x] Fullscreen screenshot browser + thumbnails
- [x] App-priority ordering + global fallback
- [x] Select attaches; Back/Escape; controller navigation
- [x] Attach / Ask / Mic|Stop control row
- [x] Remove attachment → text-only next Ask
- [x] Quality Low / Mid / Max settings persist
- [x] Quality sweep on device (Low → Mid → Max)
- [x] Manual Deck staged run completed

---

## Appendix — Tier 3 cosmetic (P3)

### Preset and follow-up UX

- [ ] Three random presets on load
- [ ] Fade mode: stagger, offsets (~750/1300/1700 ms), fade in/out timing, length hold
- [ ] Carousel mode: slide, D-pad history, post-Ask re-seed
- [ ] Preset tap appends " for [game]" when game running
- [ ] Follow-up category detection (battery / performance / troubleshooting / controls)

### Beta preset behavior

- [ ] `[beta]` tag visual only (not in submitted text)
- [ ] Beta preset prompts give reasonable generic advice
- [ ] Beta category detection + follow-ups

---

## Appendix — Tier 4 heavy (S3)

### Background prompt completion (V1)

**Tier 1 smoke:** SMOKE-H (reopen pending / complete). Full matrix below.

#### Lifecycle

- [ ] Close QAM while pending → reopen → Thinking…
- [ ] Close QAM after complete → reopen → final reply
- [ ] Foreground flow unchanged
- [ ] Multiple reopens → single result

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

Historical **suggested checks** from shipped features — run when touching that area; not required for Tier 0–1.

### Input sanitizer (2026-04-16)

Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize`; re-enable before comparative model runs.

### Character accent intensity (2026-04-16)

Same preset at subtle vs unleashed; JSON/TDP unchanged.

### Strategy + TDP layout (2026-04-18)

Pure puzzle Strategy ask → no hardware JSON in system prompt; mixed performance ask → contract returns.

### Character voice + Pyro (2026-04-15)

Picker, Random, custom line; Pyro Balanced vs Nightmare — no TDP apply on Nightmare asshole tier.

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

# bonsAI prompt testing — failures & retries

Open FAIL rows, superseded preview attempts, and optional on-Deck retests. **PASS** results live in [testing.md](testing.md#shipped-feature-coverage).

**Retry:** `pnpm run test:preview:tier -- --tier=<batch> --filter=<id> --evidence --write`

---

## On-Deck FAIL (historical)

| # | Build / date | Game | Prompt | Expected | Model | Status | Notes |
|---|--------------|------|--------|----------|-------|--------|-------|
| 2 | — | Elden Ring | "What TDP should I use?" | 8–12W + JSON | llama3:latest | FAIL | Pre–system-prompt fix; **optional retest** |
| 5 | — | L4D2 | "Optimize for battery life" | Low TDP JSON | llama3:latest | FAIL | Pre–game context; superseded by Tier 1 with-game pass — retest optional |

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
| VISION-V1-spot-dom | 1 | `domContains "Ask"` — label not in preview DOM | Assert `bonsai-decky-tabs-root` / askbar classes |

**Final PASS batch:** [test-evidence/tier0/2026-05-26-9e20a82/](test-evidence/tier0/2026-05-26-9e20a82/) · **tier2 (8/8):** [test-evidence/tier2/2026-05-26-9e20a82/](test-evidence/tier2/2026-05-26-9e20a82/)

---

## Preview FAIL table (auto-updated)

<!-- preview-fail-results:start -->
| 2026-06-09 / a9237e4 | tier3UI | UI-A-beta-modal | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-beta-modal/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-tab-tour | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-tab-tour/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-settings-conn | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-settings-conn/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-permissions-ui | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-permissions-ui/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-mode-menu | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-mode-menu/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-transparency-expand | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-transparency-expand/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-debug-tab | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-debug-tab/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-presets-visible | FAIL | [manifest](test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-presets-visible/manifest.json) — Error: IPC timeout for callTestHook |
<!-- preview-fail-results:end -->

---

---

## Revision log

| Date | Change |
|------|--------|
| 2026-06-21 | Consolidated regression-and-smoke, device-qa-runbook, prompt-testing, prompt-testing-failures into testing.md |
| 2026-05-26 | FAIL rows split; preview --write dedupe |
| 2026-05-24 | Refactor: coverage matrix, tier-linked scenarios, runbook split |
