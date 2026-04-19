---
name: decky-screenshot-ingest
description: >-
  Ingests fresh Steam Deck UI captures from the repo `screenshots/` directory for
  visual debugging of Decky plugins and game-mode UI. Use when debugging layout,
  focus, QAM, or on-device behavior; when the user runs `scripts/screenshot-deck.ps1`
  or mentions new screenshots; or when verifying UI against what the Deck actually
  shows.
---

# Decky screenshot ingest

## When this applies

Use during **debugging** of Decky / Steam Deck UI (this repo’s plugin, overlays, modals, spacing, controller focus). Do **not** wait for the user to paste images if new files likely exist under `screenshots/`.

## Workflow

1. **Resolve the folder**  
   Repo root `screenshots/` (same level as `src/` and `scripts/`). Ignore if the folder is missing or empty.

2. **Detect new or relevant captures**  
   - List image files: `screenshots/**/*.png` (and `.jpg`/`.jpeg` if present).  
   - Sort by **last modified time**, newest first.  
   - Prefer files matching `DeckCapture_*.png` from `scripts/screenshot-deck.ps1`, but do not exclude other names.

3. **Ingest for the model**  
   - **Read** the newest screenshot(s) with the image read capability (same as opening an image file in the workspace).  
   - If several new files share a close timestamp, read the **most recent 1–3** that are plausibly tied to the issue (or all if the user asked to compare).  
   - If this thread already analyzed a file by path, skip re-reading unless the file’s modified time changed or the user asks again.

4. **Use what you see**  
   Tie observations to code (e.g. `MainTab.tsx`, styles, focus order). Call out clipping, misalignment, wrong labels, focus rings, and QAM vs in-game context when visible.

5. **If nothing to ingest**  
   Say that `screenshots/` is empty or unchanged, and suggest running `scripts/screenshot-deck.ps1` after reproducing on the Deck (with `.env` `DECK_IP` / `DECK_USER`).

## Notes

- Screenshots are **gitignored**; they are local artifacts only.  
- Do not assume filenames beyond the sort-by-mtime rule; users may drop manual captures into `screenshots/` too.
