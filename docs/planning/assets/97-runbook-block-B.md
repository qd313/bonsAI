# Plan 97, Deck block B: the readings that need a game running

For a fresh deck-driver helper, after block A (read `97-handover-A.md` first: the keep-awake, the backup, the test
chat "test", the model list). Same rules and file names as block A. The game is Deep Rock Galactic: Survivor, on the
Recent Games row. **Never reload the plugin while the game is starting or running.** Go to the row's start first
(press Left until focus stops moving); the launch tool only walks right. Wait until the game's window is in front and
has been up for 30 s before opening Quick Access. After exiting, confirm over SSH that the game's process is gone.

## B0: before the launch

1. Renew the keep-awake if the handover says it ends within 3 hours.
2. **Unload the Deck's AI first** (a game plus the loaded model left 1,971 MB free on an earlier night):
   `curl -s 127.0.0.1:11434/api/generate -d '{"model":"gemma4:e2b-it-qat","keep_alive":0}'`, wait 10 s,
   `api/ps` must be empty, `free -m` over 4,000 MB available.
3. The plugin closed; the Quick Access menu closed. Launch the game. Note the clock when its window is in front.

## B1: the D-pad freeze, three tries (rows P97-B-FREEZE-1, -2, -3)

Why: the clearest sighting (plan 96 block E) was a game up about five minutes, the help chip showing, Down from the
question box dead, the page's active element the Ask button and `document.hasFocus()` false; only a reload cleared it.
Nine tries without a game never showed it.

The reading, on the Quick Access page, before and after every press below:
`JSON.stringify({f: document.hasFocus(), v: document.visibilityState, a: (document.activeElement||{}).className, ring: (document.querySelector('.gpfocus')||{}).className})`.

**Each try:**
1. Within five minutes of the game's window coming up: open Quick Access by chord, the Decky list, A on bonsAI (or
   `deck_openPlugin`; a first failure after a launch is expected once). Read the reading. Note whether the help chip
   shows under the question box.
2. Walk the ring onto the **question box** (read focus), box empty. Press **Down**. Read the reading and Steam's focus.
3. If the ring moved: record MOVED, press Up back to the box, and repeat Down twice more (three Downs in all), then do
   the two control triggers below once each and read again.
4. If the ring did not move (the stuck state): record everything: the reading; the ring's box; Steam's focus; then try,
   reading after each: **Left**, **Right**, **LB** then **RB** back, one menu close and reopen (chord twice, 2.5 s
   apart), a second, a third, reopening the plugin from the Decky list. Record which, if any, cleared it. **Do not
   reload the plugin with the game running.** If nothing cleared it, say so, close Quick Access, exit the game (confirm
   the process gone), then `deck_reloadPlugin` once with no game running and open the plugin; record that only the
   reload cleared it.
5. The two control triggers (only when the first Down moved), with the game still up: (a) About → the Reply language
   list (A) → B with nothing picked → Settings → open the Data section → Down from the Data line; (b) Main → the paperclip
   menu → "Close menu & take screenshot" (A) → wait 3 s → reopen Quick Access by chord → Down from the question box. The
   reading before and after each, and whether Down moved.
6. Exit the game (confirm the process is gone over SSH), wait 20 s, and launch it again for the next try. Three tries in
   all. If a try reproduced the stuck state, the next try starts from a fresh plugin reload (no game) before the launch,
   so each try begins clean.

**Verdict per try: MEASURED**, with "stuck" or "moved" per press and what cleared it. These three files are what
consult 1 and lane L14 read; completeness matters more than speed.

## B2: the ghost strip's page read with the game (rows P97-B-GHOST-1, -2, -3)

After B1's last try, with the game up and the plugin open on Main (ring working; if the last try left it stuck and
only a reload cleared it, relaunch the game first, since every sighting had a game running).

Inject the passive watcher from `docs/audit/plan96-scope-ghost-tab-bar.md` on the Quick Access page. One baseline read
(the exact page read from the same note) and a screenshot. Then the pop-up route three times: A on the "How to use
bonsAI" chip if it shows, otherwise the About tab's help link that opens the same box; wait for the box; **B**; read at
0.3, 1, 3 and 10 s after the screen is back, a screenshot at 1 s; then one D-pad press and read once more. Save the
watcher's list into each file. **Verdict MEASURED;** the first line of each read names the candidate. If the strip is
on screen in any screenshot, say exactly when it appeared and which press removed it.

## B3: the Tip chip from Copy (row P97-B-TIP-CHIP)

Mode chip at Speed, the test chat, the game up. Send with the question script (no apostrophes): "Which weapon should I
upgrade first in this run" → walk to Ask (read focus), A. Wait for the answer. Read the chip row under the question
box: is one chip the game's own tip (an amber tip dot or the word Tip)? If not, a second question: "What should I spend
my first gold on in this run". If still no Tip chip after two tries, record UNCLEAR with what the chips showed.
With a Tip chip showing: walk the ring onto the answer's **Copy** button (read focus; one press at a time). Press
**Down**. Read focus, the landed control's box, its visible percentage by text-range boxes against the panel and
sidebar edges, and a screenshot. **Pass:** the landing is whole on screen (100 percent by its words' boxes). Record the
number either way.

## B4: the "Not in my notes" line, Strategy mode (row NOTES-BLOCK-04, the line half)

Mode chip to **Strategy** (read the chip before and after). Two differently worded questions about things the notes
cannot hold, sent with the script: "Who is the final boss called Zorblax in this game" and "How do I defeat the boss
named Grimthak in this game". For each: wait for the answer; read the notes block under it (none expected) and whether
a "No close match" or "Not in my notes" line shows; read the back end's log line about the footer. **Pass:** the line
shows and no notes block is drawn, both times. Copy the last few hundred characters of each saved answer from the chat
file into the evidence.

## B5: the notes block's chip ladder (row NOTES-BLOCK-LADDER)

Still in Strategy mode with the game up. Send: "In Hollow Knight how do I beat the Soul Master" (a protected story game
named while a no-story game runs: the named game picks the notes for one turn). Wait. If a notes block ("From the
notes") shows: walk the ring onto it (read focus), A to open it, then **Left** and **Right** inside the open block,
reading focus each time. **Pass:** the ladder inside the block takes Left and Right the way the details panel's own
ladder does. If the block has no ladder, record UNCLEAR with what the block held. Copy the answer's last few hundred
characters into the evidence. Mode chip back to **Speed** (read it).

## B6: the frame rate in a real fight (row SCR-10), if the run allows

Only if the game can be brought into an actual run with the controller in under three minutes (the rig can press A
through the game's menus from the main screen; stop if anything asks for a save slot or a purchase). Once in a run:
open Quick Access, the plugin, send "Which upgrade helps most against swarms" with the script, A on Ask, and sample the
panel's frame rate for 30 s with plan 69's script shape (its evidence `plan89-SCR-10-FIGHT.json` shows the field
names). Record the median and the lowest slice. If the game pauses itself (a level-up screen), say so and record the
run as partial, as plan 89 did. **Pass:** the median at least 45 during a real fight. If the run cannot be reached,
COULD NOT RUN with what stopped it.

## B7: the end of the block

Close the plugin and Quick Access. Exit the game; confirm over SSH that its process is gone. If a freeze was left
stuck, now `deck_reloadPlugin` once (no game) and open the plugin. Load nothing back into Ollama. Handover to
`docs/planning/assets/97-handover-B.md`: everything block A's handover had, plus the three freeze tries in one line
each (stuck or moved, what cleared it), the ghost reads' first lines, the mode chip's state, and whether the game is
closed.
