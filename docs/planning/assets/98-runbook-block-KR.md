# Plan 98, Deck block KR: the last smoke pass, and the Deck put back

For a fresh deck-driver helper, at the end of the night, on the build already on the Deck (no deploy). Read first:
the K0 handover (the state to put back), then the latest handover (K1 or later; the session gives the paths), then
this page. The rules of your helper file apply in full. Every Deck command is exactly
`ssh deck@192.168.86.52 '<command>'`. Evidence `plan98-<ROW>.json` in the workshop's `test-evidence` folder, never
overwritten. Settings: key names only, except the keys this page names.

## KR.0: setup (row P98-KR-SETUP)

`deck_status` (lease free, stop switch off); renew the keep-awake (240 min); which screen is live; the build hash;
no game running (bracketed `ps` pattern); the AI loaded or not (`/api/ps`).

## KR.1: the knowledge-base smoke pass on the final build (row P98-KB-SMOKE-03)

The test chat only (the one K0 made; read its name first). Strategy. Nothing running.
"In Hollow Knight, what is the best way to beat the Soul Master" (named boss, so no cover expected). **Pass when** a
"From the Hollow Knight wiki" block names a Hollow Knight note, the log's attach line names the same note(s) and now
prints `keyword=` and `meaning=` scores, and no "No close match" line shows. Copy the attach line whole.

## KR.2: the saved knowledge-base walks (row P98-KR-REPLAYS)

`deck_replayChecks` with `checksDir` set to the workshop's `checks` folder, on every walk whose name contains
GLOSSARY, KB, NOTES or ROUTE (including tonight's `P98-ROUTE-01` if K1 saved it). Record each as passed, failed (where
it went instead), or stale (the screen it expects is gone).

## KR.3: put the library back (row P98-KR-LIBRARY)

K0 found the published library 2026.10.17 installed at `/home/deck/.bonsai/rag`. Tonight's test library (2026.10.24)
is installed now.
1. Ollama tab → the knowledge base rows → Remove (read focus before A; confirm in its box if it asks).
2. Download → when it asks where, pick the same place K0 recorded (the home folder's `.bonsai/rag`, the "on the Deck"
   choice, not the SD card) → wait for Installed.
3. **Pass when** `rag_corpus_version` reads 2026.10.17 and `rag_corpus_path` reads the K0 place, and the files'
   dates are new (just downloaded).

## KR.4: put the settings back (row P98-KR-SETTINGS)

Compare against the K0 handover, key by key, through the plugin's own screens:
- the Ask mode chip back to Speed (K0 found Speed; the plan 99 clean install had left it so);
- the Developer tab switch back off (K0 found the tab hidden), only after KR.3 (it is not needed there, but do it
  last so nothing else depends on it);
- Story spoilers → "How much to hide": Default (key `spoiler_tier` reads `default`);
- the thumbs-down store: `ls -l ~/homebrew/settings/bonsAI/rag_demote.json`. K0/K1 recorded that it did not exist
  before tonight. If it exists and holds an entry (`cat` it; it holds no secrets), remove it with
  `rm ~/homebrew/settings/bonsAI/rag_demote.json` and say so in `side_effect`; if the permission check refuses,
  stop and report.
- pinned test chips: none should be pinned (Developer tab, before switching it off); clear them if any are.
Record every key you checked by name, its value where this page allows, and whether it now matches K0.

## KR.5: the Deck as the night found it (row P98-KR-STATE)

No game running; Ollama's models the same two as K0 (`nomic-embed-text`, `gemma4:e2b-it-qat`; names only) and none
loaded (unload if one is); Quick Access closed; release the keep-awake (`deck_holdAwake` with a short ttl, or as the
tool allows). The test chat stays (say its name); tonight's build stays on the Deck (the session reports it).

## KR.6: handover

`98-handover-KR.md` in the scratch folder: everything put back, anything that could not be, and the Deck's state.
