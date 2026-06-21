---
id: screenshot-ingest
description: Screenshot ingest
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
   - Prefer files matching `DeckCapture_*.png` from `scripts/screenshot-deck.sh` / `.ps1` (e.g. `DeckCapture_20260520_153045_auto.png` — timestamp + mode suffix), but do not exclude other names.

3. **Ingest for the model**  
   - **Read** the newest screenshot(s) with the image read capability (same as opening an image file in the workspace).  
   - If several new files share a close timestamp, read the **most recent 1–3** that are plausibly tied to the issue (or all if the user asked to compare).  
   - If this thread already analyzed a file by path, skip re-reading unless the file’s modified time changed or the user asks again.

4. **Use what you see**  
   Tie observations to code (e.g. `MainTab.tsx`, styles, focus order). Call out clipping, misalignment, wrong labels, focus rings, and QAM vs in-game context when visible.

5. **Dev loop** — For build/deploy/watch workflow, use `bonsai://workflow/deck-dev-loop` or `bonsai.workflow.get` with `id=deck-dev-loop`.

6. **If nothing to ingest**  
   Say that `screenshots/` is empty or unchanged, and suggest running `./scripts/screenshot-deck.sh` on the Deck (or `.ps1` from Windows) after reproducing in BPM/QAM (`.env` `DECK_IP` / `DECK_USER`). For QAM/bonsAI in game mode, keep QAM open before capturing; use `-Mode auto` / `--mode auto` or `-Mode game` / `--mode game`.

## Notes

- Screenshots are **gitignored**; they are local artifacts only.  
- Do not assume filenames beyond the sort-by-mtime rule; users may drop manual captures into `screenshots/` too.
