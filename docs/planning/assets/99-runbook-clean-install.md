# Plan 99 runbook: the clean install from the release zip (Tier 4, second row)

For the deck-driver helper. Written 2026-10-22 by the release session. One driver at a time. The checkout
is `C:\Users\still\Documents\BonsAI`; use that absolute path in every command. The Deck is
`deck@192.168.86.52`; every Deck command starts with exactly `ssh deck@192.168.86.52 `. You never edit a
document, never commit, never deploy with the dev tool (the whole point is that the plugin arrives the way a
player's does).

**What this block proves:** a new player on the stable channel, with nothing of bonsAI on the Deck and no
Ollama, installs the 0.6.0 zip the way the README says, opens the plugin for the first time, sets up the AI
on the Deck, gets one answer and downloads the knowledge library. The release gate's table
(`docs/testing-manual.md`, Tier 4) gets its second row from your report. The zip is the one the build robot
made from the frozen tip; its path is in your task text as `<ZIP>`.

**Evidence:** one file per row below, `workshop:test-evidence/plan99-<ROW>.json` (the workshop folder is
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\`), with the usual fields (build, screen, row, Deck
time, setup, pressed, seen, expected, verdict, side effects). Pictures beside them as `.png` with the same
stem. Pass only when what you saw matches "pass when".

---

## 0. Before (about 15 minutes)

| Row | Do | Pass when |
|---|---|---|
| P99-TIER4-HOST | `deck_checkReady` (awake, no game, no modal). Read and write down: SteamOS version (`cat /etc/os-release`), the Decky Loader version (`cat ~/homebrew/services/.loader.version`), whether Ollama exists (`ls ~/.local/bin/ollama ~/.ollama`), the plugin folder and settings folder listings. `deck_holdAwake`. | A written before-state. |
| P99-TIER4-WIPE | **Back up first:** `tar czf ~/p99-clean-backup.tgz -C ~/homebrew/settings bonsAI`. Then, in the plugin: Settings tab → **Clear all data** (read focus on the confirm box; the action is on the left; press it). This also clears the first-run flags that live in Steam's browser storage, which a plain uninstall keeps. Then remove the plugin as a player would: Decky's settings → Plugins → bonsAI → Uninstall (if the controller route is awkward, `sudo rm -rf ~/homebrew/plugins/bonsAI` and `sudo systemctl restart plugin_loader` is the same end state; say which you used). Remove the settings folder: `rm -rf ~/homebrew/settings/bonsAI`. Move Ollama aside, never delete: `mv ~/.local/bin/ollama ~/.local/bin/ollama.p99`, `mv ~/.ollama ~/.ollama.p99`; stop and note any Ollama service (`systemctl --user list-units | grep -i ollama`; stop and disable it, and write down its name). Confirm: no ollama process, no plugin folder, no settings folder. | Decky's list has no bonsAI; nothing of it remains except the `.p99` copies and the backup. |

## 1. Install the way the README says (about 15 minutes)

| Row | Do | Pass when |
|---|---|---|
| P99-TIER4-INSTALL-URL | Put the zip where Decky can fetch it: `scp <ZIP> deck@192.168.86.52:/tmp/bonsAI.zip`, then on the Deck `cd /tmp && nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &`. In Decky: `...` → Decky (the plug) → the gear → General → Developer mode on → Developer → **Install Plugin from URL** → the address `http://127.0.0.1:8765/bonsAI.zip` → Install. Getting the address into the field, in this order: a rig step that types text if one exists; a copy of `scripts/deck_send_ask.py` in your scratch folder pointed at Decky's URL field (find the field with `deck_readPage`; the script's React-safe write is the part to keep); Steam's on-screen keyboard (A on the field, pick letters with the D-pad). Log which worked. | Decky's list shows bonsAI; the install box closed without an error; the plugin folder exists again with `plugin.json` saying 0.6.0 (or the frozen tip's version if the zip predates the bump; say which). |

## 2. The first run (about 20 minutes, no AI yet)

| Row | Do | Pass when |
|---|---|---|
| P99-TIER4-FIRST-RUN | Open bonsAI. Screenshot every notice: the beta notice, then the popup "Where should the AI run?". Read focus on the popup: the ring must start on **Not now**. Press Not now. Save the two pictures as evidence AND copy the popup picture to `recordings/stills/p99/where-ai-runs-popup.png` for the README. | Two notices, each short, each with its buttons reachable; the ring on Not now; nothing downloaded by itself (no network use in the log). |
| P99-TIER4-NO-DEV | Count the tabs; look at the chip row. | Six tabs (Search, Main, Ollama, Settings, Permissions, About); no Developer tab; the chip row is the one wide help chip (first run), no amber test badges. A on the help chip opens the quick start; picture; B closes it. |
| P99-TIER4-PERMS-OFF | Permissions tab. | All four switches off and reachable with the D-pad; no parental-lock banner. Picture. |
| P99-TIER4-ASK-NO-AI | Main: type a question (`deck_send_ask.py --text "What is the best first weapon in Deep Rock Galactic Survivor?"`), A on Ask. | A plain message says the AI is not set up, with a button that jumps to the Ollama tab; no spinner that never ends; no crash. |

## 3. The AI on the Deck, the README path (20 to 50 minutes, mostly downloads)

| Row | Do | Pass when |
|---|---|---|
| P99-TIER4-DOWNLOADS-PERM | Permissions: switch on **Internet downloads** only. Close and reopen the menu. | The switch holds; the settings file agrees. |
| P99-TIER4-INSTALL-OLLAMA | Ollama tab → Where the AI runs: **Run AI on this Deck** is on already (it starts on). A on **Install Ollama**. Read the box: it names where the download comes from (ollama.com); Cancel is first. Confirm. Then the box "Also install the starter models?": read it (it names gemma4:e2b-it-qat, nomic-embed-text, the two speech models, about 4.6 GB); say yes. Note the Deck time. Poll the status line every 60 seconds (read the page) and write the times down; do not press anything else meanwhile. | The install runs without a password prompt; the status line shows progress; when done the models list shows the starter models and Ollama answers on the Deck (`curl -s 127.0.0.1:11434/api/tags`). Write the total minutes. |
| P99-TIER4-TEST-CONNECTION | A on **Test connection**. | A clear connected line with the version within a few seconds. Note the Ollama version for the gate's table. |
| P99-TIER4-FIRST-ANSWER | Main tab, Speed mode: type "How do I unlock the Engineer in Deep Rock Galactic Survivor?" and Ask. Note the Deck time at the press. Watch the panel: the loading line "Loading the AI. The first time takes a minute or two." must show while the model loads cold. Note when the first words arrive and when the answer finishes. | The loading line shows; the answer arrives (the first time can take about two minutes on a cold model); it is about the game; "Was this helpful?" appears under it. Write both times. |
| P99-TIER4-KB | Ollama tab → Knowledge base: A on **Download knowledge base**; the box names where it comes from; confirm. When it arrives, switch on **Use local knowledge base**; read the version line. Picture of the section for the README (`recordings/stills/p99/knowledge-library-fresh.png`). | The library downloads; the switch reads on and the settings file agrees; the version line shows a date and a game count. |
| P99-TIER4-NOTE-ANSWER | Main, Speed: "What does Nitra do in Deep Rock Galactic Survivor?" Ask. | The answer carries a "From the notes" line (the library is used). |
| P99-TIER4-LOG | `deck_readPluginLog` for the whole run; also `journalctl --user -u plugin_loader -n 200` if the plugin log is thin. | No traceback, no error line that a player caused by following the README. Note every warning. |

## 4. After (about 5 minutes)

Leave the Deck as a player's: the fresh Ollama and models stay, the library stays, the plugin stays installed.
Do not restore the `.p99` copies or the settings backup (the maintainer decides later; say in the report that
`~/.local/bin/ollama.p99`, `~/.ollama.p99` and `~/p99-clean-backup.tgz` are on the Deck). Stop the tiny web
server (`pkill -f "http.server 8765"`), remove `/tmp/bonsAI.zip`, release `deck_holdAwake`.

## 5. Report

Plain language, under 500 words: one line per row with PASS, FAIL or UNCLEAR and the evidence file; the
numbers the gate's table needs (SteamOS, Decky, Ollama versions; the install's minutes; the first answer's
wait); the typing route that worked for the URL; anything a new player would trip on; what is left on the Deck.
