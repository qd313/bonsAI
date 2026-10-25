# Plan 100, Deck block L1: one check per landed wave 1 fix, on the new build with the test library

For a fresh deck-driver helper, after the wave 1 landings and one deploy by the session (`scripts/build.ps1`, which also
puts the night's library into the Deck's seed folder). Read [the L0 handover](100-handover-L0.md) first: the Deck's
state, the test chat, the settings backup, the library's state before the night. The rules of your helper file apply in
full. Evidence files go to `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan100-<ROW>.json` (never
overwrite; `-try2` if the name exists), screenshots beside them with the same stem. **Save a screenshot of every look
this runbook names**; the maintainer judges them from the checks page. Every Deck command is exactly
`ssh deck@192.168.86.52 '<command>'`. Stop at once if the rig's lease is held by another chat, if focus moves without
your press, or if anything asks for a password. About twelve checks; if your memory runs low, write the handover and
stop, naming the rows left.

**Questions** go in with the send-question script, never by pressing A on the question box:
`ssh deck@192.168.86.52 'python3 - --text "the exact question"' < scripts/deck_send_ask.py`, check it printed VERIFIED
with the whole sentence, then walk to Ask and press A there as its own step. A question with an apostrophe cannot
survive the quotes: reword it. Every question is worded once and never repeated word for word (the answer cache would
serve it back). Wait for the answer to finish (the reply row appears) before any read. **Before every question, read the
chat's name.** The test chat is the long one that starts with the Mantis Lords question (L0 used it as "test"); it is
over 40 questions long, so an answer in it may take up to 3 minutes and may show "Couldn't sum up the chat this time":
record that as a sighting and carry on.

**The log's attach line** for a question: `deck_readPluginLog` returned nothing in L0, so read the plugin log over SSH
(`tail -n 60 ~/homebrew/logs/bonsAI/*.log` or the path L0's handover names) right after the answer finishes; copy the
one line saying which notes reached the model and which footer line was added. **The saved chat** lives in
`~/homebrew/settings/bonsAI/chats/`. Key names only from any settings file, except `rag_corpus_version`,
`rag_corpus_path`, `spoiler_tier` and `ask_mode`.

**Facts for the 2026-10-25 run (written by the session at 23:45 UTC, for whichever chat drives the Deck):** the wave 1
build was deployed at 23:34 UTC with `scripts/build.ps1` (155 files verified); the build hash on the Deck must read
`7f58de4a2853`. The seed library on the Deck is the night's test library (465 notes, 166 tips, the four games' new notes,
the Yoshi fix, the reworded tips) and carries the SAME version string as the published one, 2026.10.25, so the install
is confirmed by size and date, not version: the installed `corpus.db` was 3,145,728 bytes (Oct 25 15:29) before; the
seed's is 3,424,256 bytes (Oct 25 19:34); after the install `ls -l /home/deck/.bonsai/rag/` shows the larger file with a
fresh date. The Deck as L0 left it: the plugin open on Main in the test chat (the long one that starts with the Mantis
Lords question; no chat is literally named "test"), the mode chip on Speed, no game running, keep-awake until 05:55 UTC
(renew it anyway), the settings backup at `/home/deck/p100-settings-backup.tgz`, three saved chats (the test chat, the
Deep Rock chat with four questions, a third), "Show Developer tab" off. Doom 64: Retribution is not on Recent Games and
is not needed here. The deploy restarted the plugin, so the first open may fail once. The session's own chat lost the
rig's tools at about 22:00 UTC, so this block runs from another chat; that chat commits nothing and writes its handover
to `C:\Users\still\Documents\bonsAI-workshop\planning\assets\100-handover-L1.md`.

## L1.0: setup (row P100-L1-SETUP)

1. `deck_status`: the stop switch off, no other chat's lease. `deck_holdAwake` 480 min; `expiresAt` into the evidence.
2. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` must equal the hash in your task.
   Open the plugin (the first open after a deploy may fail once; a second failure is worth reporting).
3. The seed folder's version: `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`
   (expect the date in your task). The installed library: `rag_corpus_version` and `rag_corpus_path` (expect 2026.10.25
   at /home/deck/.bonsai/rag, as L0 left it). Write both into the evidence.
4. **Install the test library:** Settings → Data → "Show Developer tab" on (note it; put it back off at the end), then
   the Developer tab → walk to "Install seed knowledge base" (read focus) → A. Wait up to 60 s. Read `rag_corpus_version`
   again: it must now read the seed's version. Read the library's files (`ls -l <path>/`). The published library stays
   2026.10.25 and block LR puts it back; you do not.
5. The mode chip: set it to Strategy for this block (L0 left it on Speed; put Speed back at the end). `spoiler_tier` must
   read default; the parental lock off. No game running (`ps` count 0); `free -m`.

## L1.1: the plain problem sentences reach a tip (row P100-TIPS-01, lane T)

Nothing running, Strategy mode, the test chat. Three sentences, one at a time, each worded exactly so:
1. "my game keeps closing on its own"
2. "it says there is no space left"
3. "the screen goes black when I open it"
For each: the answer carries a tip chip or a Deck tip in its notes block (read the block's title and the chip's words),
and the log's attach line names a tip. Record the tip each one reached (lane T expects the crash tip for 1, the storage
tip for 2, the blank-screen tip for 3; a tip on the right subject but a different id is "right subject", not a fail).
Then a boss question, "how do I beat the Hornet in Hollow Knight" with no game running: no tip attached (notes may be).
Screenshot each answer's block (`-1.png` to `-4.png`). **Pass when** all three sentences reach a tip on the right
subject and the boss question attaches no tip.

## L1.2: a route step says what it needs (row P100-NEEDS-01, lane P)

**The step list is drawn only after a branch button is pressed** (a question typed fresh gets a branch menu, by
design; L0's two plain-paragraph route answers were that). Strategy mode, nothing running: "In Hollow Knight how do I
reach the False Knight from the start of the game". When the answer finishes, read the branch buttons under it; walk to
the one about the route or the first boss (read focus) → A. The follow-up answer draws the route's step list. **Pass
when** at least one step carries a "Needs" line (the panel draws "Needs: …" under a step). Screenshot the list
(`-route.png`). If no step has one, a second try: "Hollow Knight, how do I get to the Soul Master" → a branch → read
again. Two tries, then UNCLEAR with the steps' words copied from the saved chat. Record the step count and every
"Needs" line's text.

## L1.3: a thank-you is not a follow-up (row P100-THANKS-01, lane F)

1. Unload the Deck's AI first (read the loaded model from `curl -s 127.0.0.1:11434/api/ps`, then
   `curl -s 127.0.0.1:11434/api/generate -d "{\"model\": \"<name>\", \"keep_alive\": 0}"`; `/api/ps` empty).
2. Launch Deep Rock Galactic: Survivor with `deck_launchGame` (from the start of the Recent Games row). Wait 30 s with
   its window in front. Close and reopen Quick Access; the Context line names the game. Never reload the plugin with the
   game running.
3. Open the Deep Rock chat L0 made (the one with the praetorian question; 4 questions), or a new empty chat if the Deck
   asks to delete a chat (then COULD NOT RUN rather than deleting). Strategy mode.
4. "how do I handle the acid spitters" → let it finish. Then "thanks a lot for that": **pass when** the reply is short
   (under 40 words), draws no notes block, repeats no acid spitter advice, and the attach line is empty. Screenshot.
   Then "what is the date today": the same four facts. Screenshot. Then "how do I kill them": **pass when** the answer is
   about the acid spitters (the remembered subject held). Record the saved chat's last 600 characters for each.
5. Exit the game with `deck_exitGame`; confirm the process is gone; `free -m`. Back to the test chat.

## L1.4: the route's opened steps travel with the ticks (row P100-ROUTE-SAVE-01, lane R)

Nothing running, Strategy, the test chat. A route: "Hollow Knight: what is the way to the Mantis Lords for a new
player" → a branch button → the step list. Read the saved file first:
`cat ~/homebrew/settings/bonsAI/strategy_checklist_session.json | python3 -m json.tool | head -40` (key names and the
`checked_ids` and `revealed` lists; no other values). Then: A on step 1 (it ticks); walk to the first covered step
(read focus) → A (it opens; nothing ticks). Read the file again: `checked_ids` holds step 1, `revealed` holds the
opened step. Close Quick Access (B out) and reopen it; walk to the route: **pass when** step 1 is still ticked and the
opened step still open (screenshot `-reopened.png`). Then Settings → Clear cache → the confirm → close Quick Access and
reopen it, back to the route: **pass when** step 1 is unticked and the opened step covered again (screenshot
`-cleared.png`), and the file no longer holds the game's entry (or holds empty lists). Record the key names before and
after.

## L1.5: Hide more keeps a cover shut on a game with no story (row P100-HIDE-MORE-SCREEN-01, lane V)

A spoiler change is not believed until the Deck shows a cover. Nothing running, Strategy. Settings → Story spoilers →
"How much to hide" → Hide more (read the row after). Two questions, differently worded, in the test chat:
"in Mario Kart 64 what is the best shortcut on the last track" and "Mario Kart 64: how do I win on Rainbow Road".
Read the answer every 250 ms from the Ask press: if the AI draws a cover (a spoiler box), **pass when** it stays shut
(a tap-to-show block) at every read and after the answer finishes. Screenshot (`-hidemore.png`). Then "How much to
hide" → Default; two more wordings ("what is a good shortcut in Mario Kart 64 on the final course" and "how do I beat
the last cup in Mario Kart 64"): **pass when** a drawn cover opens by itself (plain text). Screenshot. If the AI draws
no cover in two tries under a setting, UNCLEAR for that half with the answers' last lines. **Put the row back to
Default and read it.**

## L1.6: the Search tab lands on the row (row P100-SEARCH-TIER-01, lane W)

Search tab → type "spoilers" with the on-screen keyboard or the send script's keyboard path (as the saved search walks
do) → the result row → A. **Pass when** the ring lands on the Default button of the "How much to hide" row (read
focus: its name) with the Story spoilers section open. Screenshot (`-ring.png`). Then B, search "how much": the result
list shows "How much to hide"; A: the same landing. B out.

## L1.7: Yoshi's Story's worlds (row P100-YOSHI-01, lane Y)

The test library must be installed (L1.0 step 4). Nothing running, Strategy, the test chat: "how do the worlds and
pages work in Yoshi's Story" (no apostrophe: write "Yoshis Story"). **Pass when** the answer says six worlds (or six
pages) of four levels, not four worlds; the attach line names the Yoshi's Story "Picking story pages" note. Copy the
answer's last 600 characters. Screenshot.

## L1.8: the look on each touched screen (row QA-LOOK-01-p100)

`ssh deck@192.168.86.52 'python3 -' < C:\Users\still\Documents\BonsAI\scripts\probe_deck_ui_look.py` the way its header
says, on: the Settings tab with the Story spoilers section open (the tier row); the Search tab with the "spoilers"
result list; Main with a route answer and its step list showing. One screenshot of each. Record anything pressed
against the right edge, cut off, or overlapping. **MEASURED**; the maintainer judges.

## L1.9: the free-play sweep (row P100-L1-SWEEP)

`deck_sweep` on the Main tab with nothing running, then once more with Deep Rock Galactic: Survivor running (unload the
AI first; launch; 30 s; reopen Quick Access; sweep; exit the game; confirm gone). Record every stop that did not hear A
or B, any stop visited twice, any ring lost. **Pass when** none.

## L1.10: handover (`100-handover-L1.md` in the scratch folder, then the session copies it)

The build; when the keep-awake runs out; the test chat's name; the library installed now (the seed's version and
place; the published 2026.10.25 is NOT back yet, block LR does that); every setting you changed and whether it is back
(the mode chip to Speed; the spoiler row to Default; the Developer tab switch off); the games on Recent Games; which
rows passed, failed, were unclear or could not run, with the screenshot names; the Deck's screen and tab as you leave
it; anything that surprised you.
