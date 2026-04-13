# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-04-13

### Added
- Background prompt completion flow so requests can finish while QAM is closed and recover state on reopen.
- Local/dev workflow support and deployment-oriented setup scripting for Linux and Bazzite-focused environments.
- Expanded prompt test coverage and strategy-mode ideation notes for upcoming tuning work.

### Changed
- Refined frontend request state handling and response UX behavior in `src/index.tsx`.
- Updated backend request lifecycle and orchestration paths in `main.py` for more resilient local AI interactions.
- Updated roadmap and prioritization details in `TODO.md` and `FUTURE_FEATURES.md`.

### Fixed
- Synced `experimental` with latest remote updates before consolidation to avoid drift and preserve branch history.
- Resolved `TODO.md` integration conflict during sync so both upstream and local roadmap updates are retained.

### Docs
- Expanded troubleshooting guidance in `INSTALL_STEPS_TROUBLESHOOTING.md`.
- Updated prompt testing notes in `PROMPT_TESTING.md`.
- Refined project rules and planning notes in `.cursorrules`.

