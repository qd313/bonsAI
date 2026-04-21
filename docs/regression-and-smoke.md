# Regression matrix and device smoke (standing gate)

**Purpose:** Default checklist for **every PR** and **every Deck-facing change** before merge or release. Complements qualitative rows in [prompt-testing.md](prompt-testing.md) and hotspots in [change-risk-hotspots.md](change-risk-hotspots.md).

**Contract:** Run **§1** always. Add **§2** rows that match touched paths. Run **§3** when `src/`, `main.py`, `plugin.json`, or Deck RPC contracts change (per [.cursorrules](../.cursorrules)).

---

## 1. Automated gates (every change set)

Run from repo root (Windows or Linux shell as appropriate):

| Step | Command | When |
|------|---------|------|
| Typecheck | `pnpm exec tsc --noEmit` | Any TS change or dependency bump |
| Frontend unit tests | `pnpm test` | Any `src/` change |
| Backend unit tests | `pnpm run test:py` | Any `main.py`, `backend/`, `refactor_helpers.py`, or `tests/` change |
| Bundle | `pnpm run build` | Any `src/` or build config change |
| Deck deploy build | `.\scripts\build.ps1` or `./scripts/build.sh` | Any `src/`, `main.py`, `plugin.json`, or Deck-facing asset change |

If a step does not apply (e.g. docs-only), state **N/A** in the PR description and still run the steps that do apply.

---

## 2. PR-scoped matrix (add focused checks)

Use the **Touched area** column to extend §1; prefer the narrowest tests first.

| Touched area | Extra automated focus | Manual / prompt-testing |
|--------------|----------------------|-------------------------|
| `backend/services/settings_service.py`, `settingsAndResponse.ts`, Settings UI | `tests/test_settings_service.py`, `src/utils/settingsAndResponse.test.ts` | Change a setting, reload plugin, confirm persistence ([prompt-testing.md](prompt-testing.md) release notes for recent Settings features). |
| `backend/services/ollama_service.py`, `refactor_helpers.py` | `tests/test_ollama_service.py`, `tests/test_refactor_helpers.py` | One Ask per changed mode; verify model routing / errors ([prompt-testing.md](prompt-testing.md)). |
| `backend/services/desktop_note_service.py` | `tests/test_desktop_note_service.py` | With filesystem capability on: save note / auto-save if touched; confirm no raw path in error toast. |
| `backend/services/ai_character_service.py`, character UI | `tests/test_ai_character_service.py`, catalog/accent tests under `src/data/` | Character picker open/close, accent chip, one Ask with character on. |
| `backend/services/capabilities.py`, Permissions UI | `tests/test_capabilities.py` | Toggle capability; confirm blocked action toast when off. |
| `src/components/MainTab.tsx`, unified input | `pnpm test` (utils/data) | **§3** items for unified input, overlay, D-pad scroll. |
| `src/index.tsx` tabs, CSS, RPC wiring | Full §1 + §3 | Tab order, Settings sections, focus after modal. |

---

## 3. Device smoke checklist (Steam Deck / Game Mode)

Run after **`scripts/build.ps1`** or **`scripts/build.sh`** succeeds. Check **Pass / Fail / N/A** mentally or in PR text.

### Plugin shell

- [ ] Plugin opens from QAM; no crash on first paint.
- [ ] LB/RB (or equivalent) cycles **Main → Settings → Permissions → (Debug if enabled) → About** without landing on a missing tab.
- [ ] Return to game and reopen plugin: no duplicate ghost tabs or blank panel.

### Main tab (unified input)

- [ ] **TextField**: type, wrap, caret visible; no horizontal drift vs native baseline after edits.
- [ ] **Ask** sends; stop/clear behavior still sensible if your change touches ask state.
- [ ] **D-pad**: each AI reply **chunk** is its own focus stop; move down through chunks and confirm the **last** chunk receives focus and is readable (regression target for long replies).
- [ ] **Question overlay** (if shown): alignment acceptable vs `TextField` (known minor drift).

### Settings (post–Phase 4 sections)

- [ ] **Connection**: Test Ollama reaches or shows stable unreachable message (no traceback in UI).
- [ ] **Ask timing / Model unload / Screenshots / Saved text**: change value, leave tab, return — persisted.
- [ ] **Character**: open picker, OK/Cancel, accent menu if AI character on.
- [ ] **Model policy**: tier change + README link still opens if touched.
- [ ] **Advanced**: Debug tab toggle; reset session cache confirm if touched.
- [ ] **Desktop notes**: toggles persist; errors are readable, not raw stack traces.

### Permissions

- [ ] Toggle at least one capability off and trigger a blocked action; toast matches expectation.

### About / Debug (if applicable)

- [ ] External link / Steam Input jump still respect capability gates.

---

## 4. Prompt-testing matrix (qualitative)

Model-quality, strategy/TDP rows, and sanitizer checks live in **[prompt-testing.md](prompt-testing.md)**. After behavior changes to prompts or routing, add or update rows there and run the relevant scenarios on device or staging.

---

## Revision log

| Date | Change |
|------|--------|
| 2026-04-21 | Phase 6: initial standing matrix + Deck smoke checklist ([ship-week cleanup](roadmap.md)). |
