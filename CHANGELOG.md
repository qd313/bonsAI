# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-04-13

### Added
- **Built on Ollama** About tab link to upstream `https://github.com/ollama/ollama` (`OLLAMA_UPSTREAM_REPO_URL`, `AboutTab`).
- Phase 1 experimental **Steam Input jump** (Debug tab): per-game `steam://controllerconfig/{appId}` via `SteamClient.URL.ExecuteSteamURL`, `Navigation.CloseSideMenus`, and a versioned lexicon in `src/data/steam-input-lexicon.ts` with CEF route-discovery and update-discipline notes in `docs/steam-input-research.md`.
- Background prompt completion flow so requests can finish while QAM is closed and recover state on reopen (marked complete in `docs/roadmap.md`; verification matrix in `docs/prompt-testing.md` under `Background Prompt Completion (V1)`).
- Local/dev workflow support and deployment-oriented setup scripting for Linux and Bazzite-focused environments.
- Expanded prompt test coverage and strategy-mode ideation notes for upcoming tuning work.
- Added backend service modules under `backend/services/` and extracted frontend tab/data modules for milestone refactor decomposition.
- Added baseline service/data tests: `tests/test_settings_service.py`, `tests/test_ollama_service.py`, `src/data/presets.test.ts`, and `src/data/steam-input-lexicon.test.ts`.

### Changed
- Reorganized documentation under `docs/` (`development.md`, `troubleshooting.md`, `prompt-testing.md`, `roadmap.md`, `refactor-specialist-sweep.md`) and moved dev automation scripts under `scripts/` with repository-root resolution for `.env`, builds, and Decky CLI paths.
- Refined frontend request state handling and response UX behavior in `src/index.tsx`.
- Updated backend request lifecycle and orchestration paths in `main.py` for more resilient local AI interactions.
- Updated roadmap and prioritization details in `docs/roadmap.md` (consolidates former root `TODO.md` and `FUTURE_FEATURES.md` planning), including moving completed items into `Implemented Baseline` where applicable.
- `main.py` now delegates settings/TDP/Ollama internals to service-layer helpers to keep plugin RPC methods focused on orchestration.
- `src/index.tsx` now delegates debug/about tab rendering and prompt preset logic to extracted modules.

### Fixed
- Synced `experimental` with latest remote updates before consolidation to avoid drift and preserve branch history.
- Resolved roadmap documentation integration conflict during sync so both upstream and local planning updates are retained in `docs/roadmap.md`.

### Docs
- Marked **Built on Ollama Link (About Tab)** complete in `docs/roadmap.md` (Completed + Implemented Baseline).
- Marked **Steam Input Jump Phase 1** complete in `docs/roadmap.md` and noted Phase 2+ (search + full catalog) as deferred; aligned `docs/steam-input-research.md` and `docs/prompt-testing.md` status language.
- Expanded `docs/steam-input-research.md` with CEF debugging steps, History API console snippet, verified-route log template, and Steam client update smoke-test discipline.
- Expanded troubleshooting guidance in `docs/troubleshooting.md`.
- Updated prompt testing notes in `docs/prompt-testing.md`.
- Refined project rules and planning notes in `.cursorrules`.

