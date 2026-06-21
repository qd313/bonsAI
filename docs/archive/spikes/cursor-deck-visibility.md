> **Archived** — see [archive README](README.md). Active doc: [development.md](../development.md)

# Cursor ↔ Deck UI visibility (maintainer workflow)

**Status:** Documented workflow — automation is opt-in via repo scripts and `.env`, not Deck runtime.

**Goal:** Repeatable way for Cursor agents (and maintainers) to see QAM/bonsAI after deploy: screenshots, **screen recordings**, log ingest, and SSH tunnels without committing dev IPs.

---

## Workflow

1. **Deploy** — Run `scripts/build.ps1` or `scripts/build.sh` from repo root (loads `.env` for `DECK_IP` / `DECK_USER`). For fast UI iteration: `scripts/watch-deploy.sh` (or `--local` on the Deck) runs Rollup watch and debounced `build.sh deploy` — see `.cursor/skills/bonsai-deck-dev-loop/SKILL.md`.
2. **Screenshots** — Run `scripts/screenshot-deck.ps1` or `scripts/screenshot-deck.sh` (auto-detects game vs desktop on the Deck; `.sh` auto-local when `DECK_IP` is loopback or this machine). Saves `screenshots/DeckCapture_<timestamp>_<mode>.png`. Agents read newest files per `.cursor/skills/decky-screenshot-ingest/SKILL.md`.
   - **PC one-click:** `.\scripts\screenshot-deck.ps1` or `./scripts/screenshot-deck.sh` (default mode `auto`). Optional: `-Open` / `--open`; `-Mode game` / `--mode game` for composited capture (QAM + bonsAI).
   - **Deck hotkey (once):** `-InstallDeckHelper` / `--install-deck-helper` installs bundled `bonsai-capture` to `~/.local/bin/`. On the Deck, run `bonsai-capture` — output goes to `~/Pictures/bonsai-capture-<timestamp>.png` without alt-tabbing to the PC.
   - **Cursor-on-Deck:** `./scripts/screenshot-deck.sh --local` (or set `DECK_IP=127.0.0.1`) captures without SSH.
   - **Failure logs:** `screenshots/DeckCapture_<timestamp>.log` from `/tmp/bonsai-capture.diag`.
3. **Screen recordings** — Run `scripts/record-deck.ps1` or `scripts/record-deck.sh` (**QAM + bonsAI must be open** during capture). Saves `recordings/DeckRecord_<timestamp>_<mode>.mkv`. See [deck-screen-recording.md](deck-screen-recording.md).
   - **Example:** `.\scripts\record-deck.ps1 -Seconds 20 -Mode game` or `./scripts/record-deck.sh --seconds 20 --mode game`.
   - **Deck-local:** `-InstallDeckHelper` installs `bonsai-record` to `~/.local/bin/`; run `bonsai-record --seconds 20` with QAM open.
   - **v1 rule:** Only composited methods succeed (`pipewire-gamescope` / `wf-recorder`); game-only kmsgrab is rejected.
4. **Log ingest (optional)** — If the plugin posts debug `fetch` to `http://127.0.0.1:<port>` on the Deck, forward that port to your PC:
   - Copy `scripts/cursor-deck-log-capture.example.ps1` and set `DECK_HOST` / `INGEST_PORT` in `.env`.
   - Probe from an SSH session on the Deck: `curl -sS http://127.0.0.1:<port>/` (same URL the plugin uses).
5. **Verify** — `plugin_loader.service` clean after deploy; reproduce UI/focus issues on-device before CSS or prompt-only fixes.

**Never** commit private IPs, tunnel ports tied to one machine, or ingest secrets — use `.env` (gitignored) and `.env.example` templates only.

---

## Related

- [troubleshooting.md](../troubleshooting.md)
- [development.md](../development.md) (watch-deploy, version bump, Vitest harness)
- [.cursor/skills/bonsai-deck-dev-loop/SKILL.md](../../.cursor/skills/bonsai-deck-dev-loop/SKILL.md)
- [llama-cpp-provider.md](llama-cpp-provider.md) (maintainer POC, not end-user)
- [deck-screen-recording.md](deck-screen-recording.md)

## Changelog

- **2026-05-22:** `screenshot-deck.sh`, `record-deck.ps1`/`.sh`, composited recording (plugin UI required).
- **2026-05-20:** Expanded from stub; example tunnel script; no hardcoded dev IPs.
- **2026-05-20:** Screenshot script split into `scripts/deck/bonsai-capture.sh`; mode auto-detect; `-InstallDeckHelper` for on-Deck capture.
- **2026-05-20:** Watch-deploy scripts; bonsai-deck-dev-loop skill; Vitest headless harness documented in development.md.
