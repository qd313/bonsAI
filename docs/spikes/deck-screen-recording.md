# Deck screen recording (composited QAM + bonsAI)

**Status:** v1 maintainer scripts shipped — on-device QA required before sign-off.

**Goal:** Record Steam Deck UI as video with **bonsAI / Decky plugin UI in frame** (same composited layer as `gamescope-atom` screenshots), for debugging and as foundation for a future in-plugin clip feature.

**Related:** [cursor-deck-visibility.md](cursor-deck-visibility.md), [deck-screen-recording plan](../../.cursor/plans/deck_screen_recording_844325f9.plan.md) (reference only).

---

## v1 acceptance (plugin UI mandatory)

| Requirement | Pass criteria |
|-------------|---------------|
| bonsAI visible | At least one frame in the clip shows readable bonsAI chrome (QAM panel, modal, or tab) |
| Capture method | `pipewire-gamescope` (game) or `wf-recorder` (desktop) — **not** `kmsgrab` |
| Parity | Contemporaneous `screenshot-deck` PNG also shows bonsAI when testing game mode |

**Failure:** Game-only video, `plugin_ui=no`, or `method=kmsgrab` — scripts exit non-zero; PC orchestrators do not treat as success.

---

## Commands

| Platform | Screenshot | Recording |
|----------|------------|-----------|
| Windows | `.\scripts\screenshot-deck.ps1` | `.\scripts\record-deck.ps1 -Seconds 20` |
| Linux / macOS | `./scripts/screenshot-deck.sh` | `./scripts/record-deck.sh --seconds 20` |

**Before recording:** Deploy bonsAI → Gaming Mode → **QAM open** → bonsAI panel visible → run record script (use `-Mode game` / `--mode game` in game mode).

**Deck-local (once):**

```powershell
.\scripts\record-deck.ps1 -InstallDeckHelper
```

```bash
./scripts/record-deck.sh --install-deck-helper
```

On Deck: `bonsai-record --seconds 20` (QAM + bonsAI open first).

**Artifacts:** `recordings/DeckRecord_<timestamp>_<mode>.mkv` (gitignored) + `.log` diag on failure.

---

## Architecture

| Layer | Files |
|-------|--------|
| PC orchestrator | `record-deck.ps1`, `record-deck.sh`, `deck/deck-remote-common.sh` |
| On-Deck capture | `deck/bonsai-record.sh`, `deck/bonsai-capture-common.sh` |

Game mode uses **Gamescope PipeWire** (`target-object=gamescope`). Desktop uses **wf-recorder** on discovered Plasma Wayland sockets. **No kmsgrab** for recording (cannot capture QAM/Decky/bonsAI).

SSH runs a **bundled** script (common + record) via base64 → `sudo bash -s`, same pattern as screenshots after the common extract.

---

## On-device spike / QA log

Maintainer must run on a real SteamOS Deck and fill in:

| Field | Value |
|-------|--------|
| Build / plugin version | |
| SteamOS version | |
| Mode tested | game / desktop |
| Method reported | pipewire-gamescope / wf-recorder |
| bonsAI visible in clip | Pass / Fail |
| Screenshot parity | Pass / Fail |
| Notes | gstreamer install needed? HDR? |

**Probe on Deck:**

```bash
pw-cli ls Node | grep -i gamescope
gst-inspect-1.0 pipewiresrc
gst-inspect-1.0 vah264enc
```

**Optional deps** (script may install via pacman when `BONSAI_ALLOW_STEAMOS_RW` is not `0`):

- `gstreamer` `gst-plugin-pipewire` `gst-plugins-good`
- `wf-recorder` (desktop path)

---

## Future product (not v1)

- RPC in `main.py` (`start_record_clip` / `stop_record_clip`) calling same `bonsai-record.sh` primitives
- Capability gate aligned with screenshot attach ([capabilities.py](../../py_modules/backend/services/capabilities.py))
- Short clip attach to Ask (file-based, not stream-to-model)
- Overlap with roadmap **Whisper voice Ask** (PipeWire audio path) — see [roadmap.md](../roadmap.md)

**Non-goals:** Always-on buffer, silent background capture, continuous video streaming to LLM.

---

## Changelog

- **2026-05-22:** v1 scripts: `bonsai-record.sh`, `record-deck.ps1`/`.sh`, `screenshot-deck.sh`, `bonsai-capture-common.sh`; plugin UI required; spike doc added.
