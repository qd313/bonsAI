# bonsAI Development Guide

This guide is for contributors building and deploying bonsAI from source.

## Stack and layout

- Frontend: `src/` (React + TypeScript, Decky UI components)
- **Unified input refactor (phased, complete):** Archived in [refactor-specialist-sweep.md § Unified input refactor (completed)](refactor-specialist-sweep.md#unified-input-refactor-completed). Deck measurement, refs, and surface height live in [`src/features/unified-input/useUnifiedInputSurface.ts`](../src/features/unified-input/useUnifiedInputSurface.ts); layout constants in [`src/features/unified-input/constants.ts`](../src/features/unified-input/constants.ts); the main tab JSX in [`src/components/MainTab.tsx`](../src/components/MainTab.tsx).
- Main tab glass styling (unified search shell, ask bar, AI response chunks) lives in the `<style>` block under `.bonsai-scope` in `src/index.tsx` (classes such as `bonsai-glass-panel`, `bonsai-ai-response-chunk`); Decky `TextField` remains the input primitive.
- **AI character roleplay:** UI catalog and grouping in [`src/data/characterCatalog.ts`](../src/data/characterCatalog.ts); accent intensity labels/options in [`src/data/aiCharacterAccentIntensity.ts`](../src/data/aiCharacterAccentIntensity.ts); per-preset UI accent colors (when used) in [`src/data/characterUiAccent.ts`](../src/data/characterUiAccent.ts); placeholder pixel emoticon grids in [`src/components/characterPlaceholderEmoticonGrids.ts`](../src/components/characterPlaceholderEmoticonGrids.ts); picker in [`src/components/CharacterPickerModal.tsx`](../src/components/CharacterPickerModal.tsx) (including running-game suggestion strip from [`src/utils/runningGameCharacterSuggestions.ts`](../src/utils/runningGameCharacterSuggestions.ts)); system-prompt suffix in [`backend/services/ai_character_service.py`](../backend/services/ai_character_service.py); persisted fields `ai_character_*` in `settings.json` (including `ai_character_accent_intensity`: `subtle` \| `balanced` \| `heavy` \| `unleashed`, default `balanced`).
- **Input sanitizer:** Phrase constants in [`src/data/inputSanitizerCommands.ts`](../src/data/inputSanitizerCommands.ts) (must match Python); lane + commands in [`backend/services/input_sanitizer_service.py`](../backend/services/input_sanitizer_service.py); persisted `input_sanitizer_user_disabled` (JSON boolean, default effective **false** / sanitizer on) in `settings.json` via `settings_service.py` and `normalizeSettings` in `settingsAndResponse.ts`.
- **Input transparency:** Last-ask snapshot is stored server-side (`Plugin._last_input_transparency`) and exposed via RPC `get_input_transparency`. Optional verbose Desktop append uses `desktop_ask_verbose_logging` (JSON boolean, only literal `true` enables) plus filesystem capability; writes `bonsai-ask-trace-YYYY-MM-DD.md` via [`backend/services/desktop_note_service.py`](../backend/services/desktop_note_service.py) (`append_desktop_ask_transparency_sync`). Frontend types in [`src/utils/inputTransparency.ts`](../src/utils/inputTransparency.ts`).
- **Ask modes (main screen):** Persisted `ask_mode` (`speed` \| `strategy` \| `deep`); UI in [`src/components/AskModeMenuPopover.tsx`](../src/components/AskModeMenuPopover.tsx) and [`src/components/MainTab.tsx`](../src/components/MainTab.tsx); normalization in [`src/data/askMode.ts`](../src/data/askMode.ts) and [`src/utils/settingsAndResponse.ts`](../src/utils/settingsAndResponse.ts); backend FOSS-first, ~16GB-default chains in [`refactor_helpers.py`](../refactor_helpers.py) (`select_ollama_models(..., high_vram_fallbacks)`), optional large-model tail when `model_allow_high_vram_fallbacks` is true in `settings.json`.
- Backend: `main.py` (Decky Python backend)
- Plugin metadata: `plugin.json`
- Frontend package/build config: `package.json`
- Build output: `dist/index.js`

## Toolchain

- Node.js (modern LTS; Decky template baseline is Node 16.14+)
- `pnpm` (v9 recommended for compatibility with template workflow)
- SSH/SCP client (for remote deploy to Deck)

Core commands:

```bash
pnpm install
pnpm run build
pnpm run watch
```

Regression and on-device smoke before merge or release: [regression-and-smoke.md](regression-and-smoke.md) (automated gates + PR-scoped matrix + Deck checklist).

If Decky UI packages drift:

```bash
pnpm update @decky/ui --latest
```

## Environment setup

Use local env files for host/device config.

1. Copy `.env.example` to `.env`.
2. Fill required values (`DECK_IP`, `DECK_USER`, `PC_IP`, and related fields).
3. Keep secrets/local values out of git.

## Windows workflow

### First-time setup

Run from repo root:

```powershell
.\scripts\setup-dev.ps1
```

What it does at a high level:
- Loads `.env` values
- Sets up SSH key auth to Deck
- Installs dev-mode sudoers override on Deck
- Prepares plugin ownership/path for deploy

### Build and deploy

```powershell
.\scripts\build.ps1
```

High-level behavior:
- `pnpm install`
- `pnpm run build`
- Upload `package.json`, `plugin.json`, `main.py`, `dist/index.js`
- Restart Decky plugin loader service

## Bazzite / Linux workflow

### First-time setup

Run from repo root:

```bash
./scripts/setup-dev.sh
```

What it does at a high level:
- Validates/loads `.env`
- Ensures `pnpm` is available
- Installs Decky CLI binary to `cli/decky` when needed
- Sets up SSH key auth
- Runs `pnpm install`

### Build and deploy modes

```bash
./scripts/build.sh
```

Available modes:
- `./scripts/build.sh` (default `dev`): build + deploy to remote Deck
- `./scripts/build.sh local`: build + deploy locally on this Linux/Bazzite machine
- `./scripts/build.sh release`: build distributable zip via Decky CLI
- `./scripts/build.sh deploy`: deploy last build without rebuilding

## Ollama for development testing

If you need a local/LAN Ollama test host:

- Windows helper: `scripts/setup_ollama.ps1`
- Linux helper: `scripts/setup-ollama.sh`

Then point bonsAI settings to the matching Ollama host/base URL.

## Documentation maintenance (releases)

When you mark a feature **complete**, update the same change set so release notes stay coherent (see [`.cursorrules`](../.cursorrules)):

- [docs/roadmap.md](roadmap.md) — status / Implemented Baseline as applicable
- [docs/prompt-testing.md](prompt-testing.md) — verification notes or matrices when behavior is user-visible
- [docs/troubleshooting.md](troubleshooting.md) — when end users need new setup steps or FAQs
- [CHANGELOG.md](../CHANGELOG.md) — concise shipped note (what, where, user-visible behavior)

## Docs and references

- Prompt tests and quality tracking: [prompt-testing.md](prompt-testing.md)
- Planned RAG / knowledge-base sources (research only, not implemented yet): [rag-sources-research.md](rag-sources-research.md)
- Power-user troubleshooting: [troubleshooting.md](troubleshooting.md)
- Decky frontend library: [https://github.com/SteamDeckHomebrew/decky-frontend-lib](https://github.com/SteamDeckHomebrew/decky-frontend-lib)
- Decky docs/wiki: [https://wiki.deckbrew.xyz/](https://wiki.deckbrew.xyz/)

## Refactor architecture notes

Milestone 2 splits heavy orchestration paths while preserving runtime behavior:

- Backend services: `backend/services/`
  - `input_sanitizer_service.py` for Ask sanitization lane and magic-phrase handling (shared with `main.py`)
  - `settings_service.py` for settings load/save/sanitization helpers
  - `tdp_service.py` for TDP/sysfs write helpers
  - `ollama_service.py` for prompt assembly and Ollama transport formatting
- Frontend components/data:
  - `src/components/DebugTab.tsx`
  - `src/components/AboutTab.tsx`
  - `src/data/presets.ts` (preset text, category heuristics, carousel helpers `holdMsForPresetText` / `getRandomPresetExcluding`)
  - `src/components/PresetAnimatedChips.tsx` (main tab preset chip fade/hold carousel)
  - `src/components/ConnectionTimeoutSlider.tsx` (single Steam `SliderField` for hard timeout + prominent soft-warning readout; ordering via `reconcileLatencyWarningAndTimeout` in `settingsAndResponse.ts`)
  - `src/data/steam-input-lexicon.ts` (versioned Steam Input jump targets; see `docs/steam-input-research.md`)
  - `src/utils/settingsAndResponse.ts`
  - `src/utils/steamInputJump.ts` (Decky `Navigation` / `SteamClient.URL` jump helper)

`main.py` and `src/index.tsx` remain the integration shells for Decky RPC/UI wiring and should continue to be treated as composition entrypoints.
