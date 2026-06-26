
# bonsAI Development Guide

This guide is for contributors building and deploying bonsAI from source. **Primary target:** one Steam Deck runs everything — Cursor, the git repo, Ollama, Decky, and bonsAI on the same machine. A separate PC on the LAN still works; see [Other-machine LAN workflow](#other-machine-lan-workflow).

## What you'll have when done

- **bonsAI** loaded in the Quick Access Menu (QAM) via Decky Loader
- **Ollama** on `http://127.0.0.1:11434` on the same Deck
- A repeatable **build → deploy → test** loop without leaving Desktop Mode for most UI work

## Prerequisites (Steam Deck, Desktop Mode)

1. **Switch to Desktop Mode** — Steam button → **Power** → **Switch to Desktop**.
2. Open **Konsole** (or your terminal).
3. Set a sudo password if you have not already (required for Decky deploy restarts):

   ```bash
   sudo passwd
   ```

4. Install **[Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader)** if it is not already on the Deck (Stable channel is a good default).

## Install Cursor and clone the repo

Install Cursor on the Deck (Flatpak or AppImage from [cursor.com](https://cursor.com)). Then:

```bash
cd ~
git clone https://github.com/cantcurecancer/bonsAI.git
cd bonsAI
```

Open the `~/bonsAI` folder in Cursor.

## Agent / IDE MCP setup

IDE agents use the in-repo **bonsai-mcp** knowledge server plus **Decky Plugin Studio** for deploy/preview. See [mcp-setup.md](mcp-setup.md) and [AGENTS.md](../AGENTS.md).

```bash
pnpm run mcp:install
pnpm run mcp:build
```

At session start, agents should call MCP tool **`bonsai.session.bootstrap`**.

## One-time developer setup

From the repo root:

```bash
cp .env.example .env
```

For **same-machine** development on the Deck, edit `.env`:

```bash
DECK_IP=127.0.0.1
DECK_USER=deck
PC_IP=127.0.0.1
```

Then run the setup script (installs `pnpm`, Decky CLI to `cli/decky`, SSH key auth to self, and `pnpm install`):

```bash
./scripts/setup-dev.sh
```

On **Windows** (remote deploy to a Deck on the LAN), use `.\scripts\setup-dev.ps1` instead and set `DECK_IP` / `PC_IP` to real LAN addresses.

## Install Ollama on the Deck

```bash
./scripts/setup-ollama.sh
```

This installs Ollama and pulls the Tier 1 essentials model (`qwen2.5vl:3b`). For preset tags aligned with bonsAI routing, see `TIER1_ESSENTIALS_PULL_TAGS` in [`refactor_helpers.py`](../refactor_helpers.py).

Verify:

```bash
curl -s http://127.0.0.1:11434/api/tags
ollama run qwen2.5:1.5b "Hello from bonsAI"
```

**In-app model management:** With **Ollama on this Deck** enabled, open **Ollama → Browse models…** (or the AI models hub) to open the Pull Models picker — bundled catalog merged with a **living overlay** from `data/pull-model-catalog-overlay.json` (fetched on **Update AI & models** completion and when you tap **↻** in the picker). Live registry sizes when online (offline fallback), multi-select pull, and per-row delete. Progress appears in the Local Ollama setup log on the Ollama tab.

**Maintainers — add a recommended model without a plugin release:** Edit [`data/pull-model-catalog-overlay.json`](../data/pull-model-catalog-overlay.json) (`entries`, `removed_tags`, `overrides`). Ship to `main`; Decks pick it up on the next forced catalog refresh. Ask routing chains in `refactor_helpers.py` still require a plugin release until explicitly updated.

## Build and deploy (same Deck)

```bash
./scripts/build.sh local
```

What this does:

- `pnpm install` (when needed) → `pnpm run build` → writes dev `src/config.ts` from `.env`
- Copies `main.py`, `refactor_helpers.py`, `py_modules/`, and `dist/` into `~/homebrew/plugins/bonsAI/`
- Restarts `plugin_loader` via `sudo systemctl`

**Modes** (all from repo root):

| Command | Use when |
| -------- | -------- |
| `./scripts/build.sh local` | Build + deploy on **this** machine (Deck-native default) |
| `./scripts/build.sh` | Build + deploy to a **remote** Deck (`DECK_IP` in `.env`) |
| `./scripts/build.sh deploy --local` | Re-deploy last build without rebuilding |
| `./scripts/build.sh release` | Produce distributable zip under `out/` (no `.env` required) |
| `pnpm run watch` | Rebuild on file changes; pair with Decky **Reload** in QAM |
| `./scripts/watch-deploy.sh` | Rollup watch + debounced **deploy** to remote Deck (see `--local` below) |
| `./scripts/watch-deploy.sh --local` | Watch + deploy on **this** Deck (Deck-native fast loop) |

Windows equivalent: `.\scripts\build.ps1` (remote deploy only; loads `.env`). Watch deploy: `.\scripts\watch-deploy.ps1`.

### Maintainer dev loop (Cursor)

- Skill: [`.cursor/skills/bonsai-deck-dev-loop/SKILL.md`](../.cursor/skills/bonsai-deck-dev-loop/SKILL.md) — build/deploy, BPM vs Gaming Mode, screenshots, optional log tunnel.
- Screenshots: [`.cursor/skills/decky-screenshot-ingest/SKILL.md`](../.cursor/skills/decky-screenshot-ingest/SKILL.md).
- Visibility workflow: [spikes/cursor-deck-visibility.md](spikes/cursor-deck-visibility.md).

### Headless Decky harness (Vitest)

Frontend tests use a fake `@decky/api` registry under `src/test-harness/` (jsdom). Run `pnpm test` after `src/` or hook changes. Registry contract: `src/test-harness/fakeDeckyRpc.test.ts`.

## Test bonsAI after deploy (two tracks)

Decky injects into Steam's **gamepadui** layer — the same React/CEF surface as **Gaming Mode** and **Big Picture Mode (BPM)**. The classic Desktop Steam window does **not** load QAM or Decky. See [archive/research/steam-input-research.md](archive/research/steam-input-research.md) § "Game Mode / Big Picture".

### Track A — Fast loop (recommended; stay in Desktop Mode)

Use this for daily UI, Settings, Permissions, Ask flow, Ollama RPC, and QAM focus work.

1. After `./scripts/build.sh local`, if Steam was already running, **fully exit Steam and relaunch** (or use Decky **Reload** in QAM after the first open) so the new bundle loads.
2. Open Steam in Desktop Mode → **Steam menu → View → Big Picture Mode** (or the BPM icon, top-right).
3. Press **`...` (Quick Access)** on the controller (or click the QAM glyph) → **Decky plug icon** → **bonsAI**.
4. Exit BPM via **Exit Big Picture** or `Alt+Tab` back to Konsole/Cursor — no Gaming Mode switch required.

**Iterating:** run `pnpm run watch` in Konsole, then **Reload** the plugin in Decky QAM for a near-HMR loop.

**Screenshots for Cursor (BPM / QAM UI):** After reproducing UI in BPM (or with BPM still running in the background), Alt+Tab to Cursor and run:

```bash
./scripts/screenshot-deck.sh
```

With `DECK_IP=127.0.0.1` in `.env` (recommended for same-machine Deck), or `steamdeck.local` while running on the Deck, the script captures **locally** (no SSH). Saves `screenshots/DeckCapture_<timestamp>.png` for agents using the [decky-screenshot-ingest](../.cursor/skills/decky-screenshot-ingest/SKILL.md) skill. Keep Steam/BPM running for composited QAM captures; fully quitting Steam may fall back to KMS grab (game plane only). If a run hangs on `deck@steamdeck.local's password:`, press Ctrl+C and retry (auto-local should apply) or run `./scripts/screenshot-deck.sh --local`. Windows remote deploy: `.\scripts\screenshot-deck.ps1`.

**What BPM proves:** Main tab UI, Settings, Permissions, Ask flow, backend RPC, D-pad focus in QAM overlays.

**What BPM does not prove:** Guide-chord shortcuts (`bonsai:shortcut-setup-deck`), TDP apply under gamescope, in-game overlay behavior, gamescope screenshot capture during a running title — use Track B for those.

### Track B — Full validation (Gaming Mode)

Use before merge when changes touch Steam Input, TDP, screenshot attach, or in-session overlay behavior.

1. Double-click **Return to Gaming Mode** on the Desktop (or Steam → Power → Switch to Gaming Mode).
2. Press **`...` (QAM)** → **Decky plug icon** → **bonsAI**.

### Troubleshooting (both tracks)

If the plugin does not appear after deploy:

```bash
sudo systemctl restart plugin_loader
journalctl -u plugin_loader -f --no-pager
```

Some Decky installs run the loader as a user unit; if the above shows nothing, try `journalctl --user -u plugin_loader -f --no-pager`.

More deploy edge cases: [troubleshooting.md](troubleshooting.md) § Build & Deploy.

## First Ask

1. Open **bonsAI** → **Settings** → set **Ollama host / base URL** to `http://127.0.0.1:11434`.
2. Open **Main** → send `hello`.
3. If it fails, confirm Ollama is up (`curl http://127.0.0.1:11434/api/tags`) and check **Permissions** for gated features.

## Architecture at a glance

<a id="stack-and-layout"></a>

```mermaid
flowchart LR
  UI[src/ React UI in QAM] -->|deckyCall| RPC[main.py Decky RPC]
  RPC --> Sanitizer[input_sanitizer_service]
  RPC --> SettingsSvc[settings_service]
  RPC --> OllamaSvc[ollama_service + ollama_prompts]
  OllamaSvc -->|HTTP 11434| OllamaHost[Ollama on 127.0.0.1]
  RPC --> Character[ai_character_service]
  RPC --> Vision[screenshot_media]
  RPC --> Desktop[desktop_note_service]
  RPC --> TDP[tdp_service]
  Shared[refactor_helpers.py + model_policy] --- RPC
  Shared --- OllamaSvc
```

**Request path (Ask):** User types in `MainTab` → `useBonsaiAskOrchestration` → `deckyCall` → `main.py` RPC → `input_sanitizer_service` → `ollama_service` (model selection via `refactor_helpers.select_ollama_models`) → HTTP to Ollama → response chunks back to the UI.

### Frontend (`src/`)

| Path | Role |
| ---- | ---- |
| [`index.tsx`](../src/index.tsx) | Decky plugin shell, tab routing, `.bonsai-scope` glass styles |
| [`components/`](../src/components/) | Tabs: `MainTab`, `SettingsTab`, `PermissionsTab`, `AboutTab`, `DebugTab`, `DeveloperTab`, modals |
| [`hooks/`](../src/hooks/) | `usePluginSettings`, `useBonsaiAskOrchestration`, disclaimer/runtime gates |
| [`data/`](../src/data/) | Presets, character catalog, model policy, settings keys, ask modes |
| [`utils/`](../src/utils/) | `deckyCall`, `settingsAndResponse`, focus navigation, chunk splitting |
| [`features/unified-input/`](../src/features/unified-input/) | Ask bar measurement and layout constants |
| [`styles/bonsaiScopeStylesheet.ts`](../src/styles/bonsaiScopeStylesheet.ts) | Durable scoped CSS for Decky focus/layout |

Build output: [`dist/index.js`](../dist/index.js) (referenced by [`plugin.json`](../plugin.json)).

### Backend (`main.py` + `py_modules/backend/services/`)

| Module | Role |
| ------ | ---- |
| [`main.py`](../main.py) | Decky RPC entrypoint; wires UI calls to services |
| [`refactor_helpers.py`](../refactor_helpers.py) | Ollama URL normalization, model fallback chains, TDP parse helpers |
| `input_sanitizer_service.py` | Ask sanitization lane and magic-phrase commands |
| `settings_service.py` | Load/save/normalize `settings.json` |
| `ollama_service.py` + `ollama_prompts.py` | Prompt assembly and Ollama HTTP transport |
| `game_ai_request.py` | Orchestrates Ask pipeline (sanitizer → Ollama → response) |
| `model_policy.py` | Tier classification for model routing |
| `ai_character_service.py` | Roleplay system-prompt suffix |
| `screenshot_media.py` | Vision attachment capture and encoding |
| `local_ollama_setup_service.py` | In-plugin Ollama install/pull helpers |
| `ollama_catalog_service.py` | Pull Models tag validation + registry.ollama.ai metadata fetch |
| `pull_model_catalog_service.py` | Living Pull Models overlay fetch + `~/.bonsai/cache` |
| `tdp_service.py` | TDP/sysfs read/write |
| `desktop_note_service.py` | Desktop note and verbose Ask trace append |
| `capabilities.py` | Permission capability checks |
| `steam_vac_service.py` / `vac_check_commands.py` | Steam ban lookup |
| `shortcut_setup_commands.py` | Guide-chord setup guidance |
| `plugin_data_reset.py` | Reset plugin persisted data |
| `strategy_guide_parse.py` | Strategy-mode response parsing |
| `proton_troubleshooting_logs.py` | Proton log helpers |

Decky loads `py_modules` on `sys.path`; keep the `backend` package name for imports.

### Deep-dive pointers (preserved for agents and contributors)

- **Unified input refactor (complete):** [archive/refactor/refactor-specialist-sweep.md § Unified input refactor](archive/refactor/refactor-specialist-sweep.md#unified-input-refactor-completed) — [`useUnifiedInputSurface.ts`](../src/features/unified-input/useUnifiedInputSurface.ts), [`MainTab.tsx`](../src/components/MainTab.tsx).
- **AI character roleplay:** [`characterCatalog.ts`](../src/data/characterCatalog.ts), [`CharacterPickerModal.tsx`](../src/components/CharacterPickerModal.tsx), [`ai_character_service.py`](../py_modules/backend/services/ai_character_service.py).
- **Input sanitizer:** [`inputSanitizerCommands.ts`](../src/data/inputSanitizerCommands.ts) (must match Python); `input_sanitizer_user_disabled` in settings.
- **Input transparency:** RPC `get_input_transparency`; optional Desktop trace via `desktop_note_service.py`.
- **Ask modes:** `ask_mode` (`speed` \| `strategy` \| `expert`); legacy `"deep"` migrates on load; chains in `refactor_helpers.select_ollama_models`.
- **Model policy tiers:** [`modelPolicy.ts`](../src/data/modelPolicy.ts), [`model_policy.py`](../py_modules/backend/services/model_policy.py).

## Toolchain

- Node.js (modern LTS; Node 16.14+ minimum)
- `pnpm` (v9 recommended)
- SSH/SCP (for remote deploy only)

```bash
pnpm install
pnpm run build
pnpm run watch
pnpm test          # Vitest (frontend)
pnpm run test:py   # Python unit tests
```

Regression gates and Deck QA: [testing.md](testing.md) — **Regression gates** §1, **Device QA runbook** (Tier 0–1 first), **Shipped feature coverage**, and scenario checkboxes.

If Decky UI packages drift:

```bash
pnpm update @decky/ui --latest
```

## Other-machine LAN workflow

Still supported when Ollama runs on a PC and the Deck is the deploy target:

1. In `.env`: `DECK_IP=<deck-lan-ip>`, `PC_IP=<pc-lan-ip>`.
2. On the PC: install Ollama, set `OLLAMA_HOST=0.0.0.0`, open firewall **TCP 11434**. See [troubleshooting.md](troubleshooting.md#2-network--communication-the-bridge).
3. Run `./scripts/setup-dev.sh` (or `setup-dev.ps1` on Windows) once, then `./scripts/build.sh` (default `dev` — remote deploy).
4. In bonsAI Settings, point Ollama URL at `http://<PC-IP>:11434`.

Ollama helpers: [`scripts/setup-ollama.sh`](../scripts/setup-ollama.sh) (Linux), [`scripts/setup_ollama.ps1`](../scripts/setup_ollama.ps1) (Windows).

## Release (plugin zip)

**Version source:** bump **`version`** in [`plugin.json`](../plugin.json). [`pnpm run build`](../package.json) syncs [`PLUGIN_VERSION`](../src/pluginVersion.ts) and [`package.json`](../package.json) via [`scripts/sync-version-from-plugin.mjs`](../scripts/sync-version-from-plugin.mjs).

**Prepare-only bump** (updates manifest, package.json, pluginVersion.ts, CHANGELOG header; does **not** commit or tag):

```bash
pnpm run version:bump patch   # or minor | major | 0.4.0
```

Then edit CHANGELOG bullets and commit to **`main`**. CI builds the zip and publishes a [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) when **`plugin.json`** lands on **`main`** with a **new** `vX.Y.Z` tag (no manual `git tag` required). You can still tag manually (`git tag vX.Y.Z && git push origin vX.Y.Z`) or use **workflow_dispatch** with **publish_github_release**.

**CI:** [`.github/workflows/build-plugin-zip.yml`](../.github/workflows/build-plugin-zip.yml) — triggers on **`main`** pushes that change **`plugin.json`**, **`v*` tags**, and **workflow_dispatch**. Artifact: `bonsai-plugin-*`; verified by [`scripts/verify-decky-plugin-zip.sh`](../scripts/verify-decky-plugin-zip.sh).

**Local release:**

```bash
./scripts/build.sh release
```

Output under **`out/*.zip`**.

## Change-risk hotspots

Prioritize refactors and reviews by **change risk** — large surfaces, branching logic, and **how much automated test signal** exists before edits. Use alongside [roadmap.md](roadmap.md) (**[In Progress](roadmap.md#in-progress)**, **[Planned](roadmap.md#planned)**).

**How to use:** Before a non-trivial edit, find the row for the file you touch; run the listed tests plus `pnpm test`, `pnpm run test:py`, and `pnpm run build` (and `scripts/build.ps1` / `scripts/build.sh` when Deck UI or RPC changes). Full standing gate + Deck smoke: [testing.md](testing.md#regression-gates). After **Settings** is acceptably calm (see **Completed** in [roadmap.md](roadmap.md)), pull the **next extraction** items from the bottom queue — one slice per PR.

### Line counts (approximate, 2026-04-21)

| Lines | Path | Role |
|------:|------|------|
| ~3425 | [`src/index.tsx`](../src/index.tsx) | Plugin root: tabs, scoped CSS, Decky RPC wiring, much of **Settings** as inline `settingsTab`, globals |
| ~1660 | [`src/components/MainTab.tsx`](../src/components/MainTab.tsx) | Unified ask/search surface, chunks, suggestion UI |
| ~1508 | [`main.py`](../main.py) | Decky RPC entrypoints, orchestration, many `call` handlers |
| ~761 | [`src/components/CharacterPickerModal.tsx`](../src/components/CharacterPickerModal.tsx) | Character picker UX + async suggestions |
| ~449 | [`src/components/ConnectionTimeoutSlider.tsx`](../src/components/ConnectionTimeoutSlider.tsx) | Connection timeout / warning slider |
| ~300 | [`backend/services/ollama_service.py`](../py_modules/backend/services/ollama_service.py) | Prompt build, Ollama HTTP, streaming paths |
| ~249 | [`backend/services/desktop_note_service.py`](../py_modules/backend/services/desktop_note_service.py) | Desktop notes / chat append, paths |
| ~239 | [`backend/services/settings_service.py`](../py_modules/backend/services/settings_service.py) | Load/save/merge `settings.json` |
| ~228 | [`refactor_helpers.py`](../refactor_helpers.py) | Model selection, TDP parse helpers, URLs |
| ~207 | [`backend/services/ai_character_service.py`](../py_modules/backend/services/ai_character_service.py) | Roleplay suffix, accent intensity |
| ≤170 | Other `backend/services/*.py` | See repo; smaller blast radius per file |

### Prioritized hotspots (edit order vs risk)

| Priority | Hotspot | Why it hurts change | Automated test signal | Suggested next extraction / mitigation |
|----------|---------|---------------------|------------------------|----------------------------------------|
| 1 | `src/index.tsx` | Single file mixes layout, CSS, RPC, tab assembly, and **large Settings JSX**; any edit can ripple focus/CSS/RPC. | **Low** for the file as a whole — Vitest covers [`src/utils/*.test.ts`](../src/utils/settingsAndResponse.test.ts), [`src/data/*.test.ts`](../src/data/), not the root component tree. | **After Settings UX trim:** extract **Settings** subtree to e.g. `src/components/SettingsTabPanel.tsx` (props in, no new persistence keys); then consider smaller hooks for repeated RPC patterns. |
| 2 | `main.py` | Many RPC branches; easy to break one handler while fixing another; logging/error shapes affect UI. | **Partial** — services are unit-tested; `main.py` itself has **no** dedicated `test_main.py`; regressions surface in integration/manual. | Prefer **new logic in services** with tests; keep `main.py` thin wrappers; when touching errors, align with [security-audit-report.md](security-audit-report.md) (user-safe messages). |
| 3 | `src/components/MainTab.tsx` | Long controller-first UI; focus graph and measurement logic intertwined. | **Partial** — unified-input phases extracted helpers; Vitest on data/utils, not full MainTab mount. | Further extractions only when needed; follow [archive/refactor/refactor-specialist-sweep.md § Unified input](archive/refactor/refactor-specialist-sweep.md#unified-input-refactor-completed); always device-check D-pad + overlay after edits. |
| 4 | `backend/services/ollama_service.py` | Prompt and transport changes affect every Ask; HTTP error paths touch disclosure. | **Good** — [`tests/test_ollama_service.py`](../tests/test_ollama_service.py). | Keep behavioral changes paired with test updates; redact user-facing error bodies per security audit. |
| 5 | `backend/services/settings_service.py` | Schema merge bugs affect entire plugin. | **Good** — [`tests/test_settings_service.py`](../tests/test_settings_service.py). | Add tests for any new keys; avoid silent defaults that bypass capability gating. |
| 6 | `backend/services/desktop_note_service.py` | Filesystem paths and consent boundaries. | **Good** — [`tests/test_desktop_note_service.py`](../tests/test_desktop_note_service.py). | Keep path logic in service; gate in `main.py` + capabilities. |
| 7 | `refactor_helpers.py` | Model routing / TDP parse shared across Ask paths. | **Good** — [`tests/test_refactor_helpers.py`](../tests/test_refactor_helpers.py). | Extend tests when adding branches; avoid duplicating policy in `main.py`. |
| 8 | `src/components/CharacterPickerModal.tsx` | Async + catalog + focus; easy Deck regressions. | **Partial** — catalog parity / accent tests in Python; TS [`characterCatalog.test.ts`](../src/data/characterCatalog.test.ts), [`runningGameCharacterSuggestions.test.ts`](../src/utils/runningGameCharacterSuggestions.test.ts). | Extract pure suggestion sorting/filtering only with tests; UI changes need device smoke. |
| 9 | Other services (`ai_character`, `input_sanitizer`, `capabilities`, `model_policy`, `strategy_guide_parse`, `tdp_service`) | Smaller files but security/behavior sensitive. | **Good** per matching `tests/test_*.py`. | Edit with corresponding test file open. |

### Ordered refactor queue (after Settings is calm)

1. **Settings** — UX trim in place, then **`SettingsTabPanel` (or equivalent)** extracted from [`src/index.tsx`](../src/index.tsx); add Vitest only for new pure helpers.
2. **`main.py`** — Move new/changed RPC logic into `backend/services/` with tests; reduce duplicate error formatting.
3. **MainTab** — Only targeted extractions with device proof (focus, overlay, scroll).
4. **CharacterPickerModal** — Pure TS helpers first; UI second.

## Documentation maintenance (releases)

When you mark a feature **complete**, update the same change set (see [`.cursorrules`](../.cursorrules)):

- [roadmap.md](roadmap.md)
- [testing.md](testing.md) — when behavior is user-visible (coverage, runbook, scenarios)
- [troubleshooting.md](troubleshooting.md) — new setup steps or FAQs
- [CHANGELOG.md](../CHANGELOG.md)

## Docs and references

- [README.md](../README.md) — install and documentation map
- [troubleshooting.md](troubleshooting.md) — power-user setup and fixes
- [testing.md](testing.md) — PR gates, Deck QA, prompt testing
- [roadmap.md](roadmap.md) — planning and status
- [archive/](archive/) — historical research, plans, and completed-feature detail
- [Decky frontend library](https://github.com/SteamDeckHomebrew/decky-frontend-lib)
- [Decky wiki](https://wiki.deckbrew.xyz/)
