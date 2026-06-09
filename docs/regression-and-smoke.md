# Regression matrix and device smoke (standing gate)

**Purpose:** Default checklist for **every PR** and **every Deck-facing change** before merge or release. Manual Deck work runs from **[device-qa-runbook.md](device-qa-runbook.md)** (Tier 0–1 first). Scenario detail and coverage index: **[prompt-testing.md](prompt-testing.md)**. Hotspots: **[change-risk-hotspots.md](change-risk-hotspots.md)**.

**Contract:** Run **§1** always. Add **§2** rows that match touched paths. Run **§3** when `src/`, `main.py`, `plugin.json`, or Deck RPC contracts change (per [.cursorrules](../.cursorrules)).

---

## 1. Automated gates (every change set)

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

## 2. PR-scoped matrix (add focused checks)

Use the **Touched area** column to extend §1; prefer the narrowest tests first.

| Touched area | Extra automated focus | Manual / runbook tier |
|--------------|----------------------|------------------------|
| `backend/services/settings_service.py`, `settingsAndResponse.ts`, Settings UI | `tests/test_settings_service.py`, `src/utils/settingsAndResponse.test.ts` | Tier 0 **SMOKE-A** + setting persist spot-check |
| `backend/services/ollama_service.py`, `refactor_helpers.py` | `tests/test_ollama_service.py`, `tests/test_refactor_helpers.py` | Tier 1 one Ask per changed mode ([prompt-testing.md](prompt-testing.md)) |
| `backend/services/desktop_note_service.py` | `tests/test_desktop_note_service.py` | Tier 2 desktop notes block |
| `backend/services/ai_character_service.py`, character UI | `tests/test_ai_character_service.py`, `tests/test_pyro_asshole_safety.py`, catalog/accent tests under `src/data/` | Tier 2 character / Pyro ([prompt-testing.md](prompt-testing.md) PYRO-EGG) |
| `backend/services/capabilities.py`, Permissions UI | `tests/test_capabilities.py` | Tier 0 **SMOKE-C** |
| `src/components/MainTab.tsx`, unified input | `pnpm test` (utils/data) | Tier 0 **SMOKE-A** |
| `src/index.tsx` tabs, CSS, RPC wiring | Full §1 + §3 | Tier 0 **SMOKE-A** |
| `ollama_mdns_discovery_service.py`, Connection **Find LAN** | `tests/test_ollama_mdns_discovery_service.py` | Tier 2 mDNS block; N/A without publish |

---

## 3. Device smoke (Deck-facing PRs)

Run after **`scripts/build.ps1`** or **`scripts/build.sh`** succeeds. Use **[device-qa-runbook.md](device-qa-runbook.md)** — do not duplicate the full matrix here.

### Required: Runbook Tier 0 (~15 min, BPM)

Complete **SMOKE-A → SMOKE-C → SMOKE-F** and check off runbook + linked [prompt-testing.md](prompt-testing.md) rows. State **Pass / Partial / Fail / N/A** in the PR.

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

## 4. Prompt-testing and coverage

Qualitative scenarios, **Shipped feature coverage** table, and Test Results log: **[prompt-testing.md](prompt-testing.md)**.  
Execution order: **[device-qa-runbook.md](device-qa-runbook.md)**.

After prompt/routing changes, add or update scenario rows and run the matching runbook tier.

---

## 5. Release / clean install proof (Runbook Tier 4)

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

## Revision log

| Date | Change |
|------|--------|
| 2026-05-24 | §3 slimmed to runbook Tier 0–1 smokes; §2 adds runbook tier column; §4 points to device-qa-runbook.md |
| 2026-04-30 | VAC Phase 1 QA deferred to prompt-testing.md |
| 2026-04-30 | Pyro inject chip manual QA note |
| 2026-04-30 | Proton log attachment smoke pointer |
| 2026-04-26 | §5 Release / clean install proof |
| 2026-04-21 | Initial standing matrix |
