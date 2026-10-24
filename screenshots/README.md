# screenshots/

Local Steam Deck UI captures from `scripts/screenshot-deck.ps1` / `.sh` (`DeckCapture_*.png`). **Gitignored** except this README.

## Agents

When the user mentions a screenshot / DeckCapture / “in screenshots/”:

1. **Do not use Glob** — this folder is gitignored and Glob returns empty.
2. **Shell-list by mtime**, then **Read** the newest 1–3 PNGs.
3. Follow Cursor skill **decky-screenshot-ingest** (or `bonsai.workflow.get` id=`screenshot-ingest`).

Do not ask the user to paste images into chat when files exist here.
