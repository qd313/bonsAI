# bonsAI Development Guide

This guide is for contributors building and deploying bonsAI from source.

## Stack and layout

- Frontend: `src/` (React + TypeScript, Decky UI components)
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

## Docs and references

- Prompt tests and quality tracking: [prompt-testing.md](prompt-testing.md)
- Power-user troubleshooting: [troubleshooting.md](troubleshooting.md)
- Decky frontend library: [https://github.com/SteamDeckHomebrew/decky-frontend-lib](https://github.com/SteamDeckHomebrew/decky-frontend-lib)
- Decky docs/wiki: [https://wiki.deckbrew.xyz/](https://wiki.deckbrew.xyz/)

## Refactor architecture notes

Milestone 2 splits heavy orchestration paths while preserving runtime behavior:

- Backend services: `backend/services/`
  - `settings_service.py` for settings load/save/sanitization helpers
  - `tdp_service.py` for TDP/sysfs write helpers
  - `ollama_service.py` for prompt assembly and Ollama transport formatting
- Frontend components/data:
  - `src/components/DebugTab.tsx`
  - `src/components/AboutTab.tsx`
  - `src/data/presets.ts`
  - `src/utils/settingsAndResponse.ts`

`main.py` and `src/index.tsx` remain the integration shells for Decky RPC/UI wiring and should continue to be treated as composition entrypoints.
