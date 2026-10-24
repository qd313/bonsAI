---
id: screenshot-ingest
description: Screenshot ingest from local screenshots/ (DeckCapture)
---

# Decky screenshot ingest

## When this applies

When the user mentions a **screenshot**, **capture**, **DeckCapture**, **see screenshot**, files **in screenshots/**, or a visual/focus/layout/QAM issue that likely has a local capture. Do **not** wait for them to paste images into chat.

Also used during Decky / Steam Deck UI debugging (overlays, modals, spacing, controller focus).

## Workflow

1. **Resolve the folder**  
   Repo root `screenshots/` (same level as `src/` and `scripts/`). Ignore if the folder is missing or empty.

2. **Detect new or relevant captures**  
   - **`screenshots/` is gitignored — do not use Glob** (it returns empty). List with **Shell**, sorted by **last modified time**, newest first.  
   - Prefer files matching `DeckCapture_*.png` from `scripts/screenshot-deck.sh` / `.ps1` (e.g. `DeckCapture_20260520_153045_auto.png`), but do not exclude other names.

   PowerShell:

   ```powershell
   Get-ChildItem screenshots -File -ErrorAction SilentlyContinue |
     Sort-Object LastWriteTime -Descending |
     Select-Object -First 8 Name, LastWriteTime, Length
   ```

3. **Ingest for the model**  
   - **Read** the newest screenshot(s) with the image read capability.  
   - If several new files share a close timestamp, read the **most recent 1–3** that are plausibly tied to the issue (or all if the user asked to compare).  
   - If this thread already analyzed a file by path, skip re-reading unless the file’s modified time changed or the user asks again.

4. **Use what you see**  
   Tie observations to code (e.g. `MainTab.tsx`, styles, focus order). Call out clipping, misalignment, wrong labels, focus rings, and QAM vs in-game context when visible.

5. **Dev loop** — For build/deploy/watch workflow, use `bonsai://workflow/deck-dev-loop` or `bonsai.workflow.get` with `id=deck-dev-loop`.

6. **If nothing to ingest**  
   Say that `screenshots/` is empty or unchanged, and suggest running `./scripts/screenshot-deck.sh` on the Deck (or `.ps1` from Windows) after reproducing in BPM/QAM (`.env` `DECK_IP` / `DECK_USER`). For QAM/bonsAI in game mode, keep QAM open before capturing; use `-Mode auto` / `--mode auto` or `-Mode game` / `--mode game`. Do **not** ask the user to paste images if files exist under `screenshots/`.

## Notes

- Screenshots are **gitignored**; they are local artifacts only.  
- Cursor skill: **decky-screenshot-ingest** (keyword-triggered).  
- Do not assume filenames beyond the sort-by-mtime rule; users may drop manual captures into `screenshots/` too.
