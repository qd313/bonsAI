# Plan 97, Deck block A: setup and the readings the fixes wait for (no game)

For a fresh deck-driver helper, at minute zero of the session. Read `docs/planning/assets/96-handover-G.md` first (the
last known state of the Deck: build `73738058`, the test chat "test", the settings backup at
`/home/deck/p96-settings-backup.tgz`). The rules of your helper file apply in full. Evidence files go to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan97-<ROW>.json` (never overwrite; `-try2` if the name exists),
screenshots beside them with the same stem. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. Scratch
files go in the session's scratch folder named in your task. Stop at once if the rig's lease is held by another chat,
if focus moves without your press, or if anything asks for a password. About fifteen checks; if your memory runs low,
write the handover and stop, naming the rows left.

**Page reads** go through the debugging port the way `scripts/probe_deck_ui_look.py` does (connect to the Quick Access
page, evaluate an expression, save the JSON). The Steam Big Picture page is a different target; a Steam-drawn box or
the keyboard is read there.

## A0: setup (row P97-A-SETUP, one file)

1. `deck_status`: the stop switch must be off and no other chat's lease held. If either, stop and report.
2. `deck_holdAwake` with `ttlMinutes: 480`; write the `expiresAt` into the evidence and the handover.
3. Which screen is live: the page's window size (the Deck's own is about 854 x 766 for the panel page; the monitor is
   1920 x 1080). Record it in every evidence file as `screen`.
4. The build on the Deck: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`, and the plugin's version
   from the About tab later. The session's task names the tip; block A runs on the build already there unless the task
   says to deploy.
5. Back up the settings two ways: `tar -czf /home/deck/p97-settings-backup.tgz -C ~/homebrew/settings bonsAI` over SSH
   (print the size), and once with the rig's own snapshot tool (that is also check A1 below). Never print the settings
   file's values: key names only.
6. Ollama's state: `curl -s 127.0.0.1:11434/api/tags` (model names and sizes only), `curl -s 127.0.0.1:11434/api/ps`,
   `free -m`, `df -h /home`. Record the model list: the end of the night must match it.
7. The test chat: open the plugin, read the chat's name on the Main tab. It must be "test". If it is not there, stop
   and report; never ask a test question in another chat.
8. The parental lock must be off (Settings → Permissions shows no lock banner, all four switches reachable).
9. The maintainer's phone notifications: not yours to check; note in the handover that the session should.

## A1: the two rig fixes merged before go (rows P89-RIG-OPEN-AFTER-RELOAD, P89-RIG-SNAPSHOT)

Only if the session's task says the rig's main was merged and rebuilt before this chat started; otherwise record both
as COULD NOT RUN with "rig not rebuilt before the chat".

- **Open after a reload, three rounds:** no game running. `deck_reloadPlugin`; at once start a clock; `deck_openPlugin`
  as the first try and record whether it worked, how many seconds until the bonsAI tab was back in the Quick Access
  rail, and how many tries it took. Close the plugin between rounds. **Pass:** the first try succeeds in 3 of 3 rounds,
  or the tool reports that it waited for the rail and then succeeded first time. Record the wait in seconds each round.
- **The settings snapshot, three times:** `deck_snapshotSettings` three times in a row. For each, unpack the saved copy
  to a side folder on the PC and compare it with a fresh `tar` taken over SSH the same minute (`diff -r`, and the sizes).
  **Pass:** all three restore byte for byte with no error. Never restore over the Deck's live folder.

## A2: the monitor look check, only if the Deck is docked (row QA-LOOK-01, monitor)

If the live screen is the monitor: run `ssh deck@192.168.86.52 'python3 - --json' < C:\Users\still\Documents\BonsAI\scripts\probe_deck_ui_look.py`
on every tab (Main, Search, Ollama, Settings, Permissions, Developer, About; switch the Developer tab on in Settings →
Data if it is off and note it). One file per tab (`plan97-QA-LOOK-monitor-<tab>.json`) and one screenshot per tab.
**Pass:** nothing reported on any tab except the known About dropdown (until L8 lands). If the Deck is on its own
screen, skip this and say so.

## A3: Down and Right from Clear cache (row P97-A-CLEAR-CACHE)

Settings tab → open the Data section (A on its line). Walk to **Clear cache...** (read focus). Press **Right**: read
focus (expected: Clear all data...). Press **Left**: back on Clear cache. Press **Down**: read focus (expected: the Open
all button below the sections). Press nothing else on those buttons (A would open a box). **Pass:** both as expected.
Record exactly where each press landed.

## A4: Up from Find LAN, five times (row P97-A-FINDLAN-UP)

Ollama tab → open "Where AI runs". Read the "Run AI on this Deck" switch and note its value; it must be OFF for the
address box and Find LAN to show (turn it off through the screen if it is on; the handover says whether you put it
back). Walk to **Find LAN** (read focus). Press **Up**. Read: focus (Steam's ring), the page's own active element, and
the ring's box. Then walk back to Find LAN by the known route (Down from the address box lands on Test connection; Right
lands on Find LAN; read focus at each step). Repeat five times. Also record, once, the Save row's and the address box's
boxes. **Verdict MEASURED** with the five landings; the expected landing is the address box every time. Put the switch
back to ON if you changed it (read it).

## A5: does a Decky button run its own move handler? (row P97-A-DECKY-BUTTON)

Main tab, the question box with a few words in it (use the question script with any short sentence, do not send). The
Ask strip then shows a **Clear** button whose code carries a Left handler meant to put the ring on the mic or Stop
button (if the handler runs) rather than wherever Steam's own geometry would go. Walk to Clear (read focus; one press
at a time). Press **Left**. Read focus and the ring's box. Press Right to come back, then Left again; three times.
Record where Left landed each time and which control sits geometrically left of Clear (the boxes). **Verdict
MEASURED:** the session reads whether the landing was the handler's target or Steam's own. Clear the question
(`--clear` with the script) when done.

## A6: the rename field with the rig, and Steam's keyboard functions (rows P97-A-RENAME-RIG, P97-A-KEYBOARD-FUNCS)

1. On the Steam Big Picture page (the main Steam page, the same target the Find LAN box was read from), evaluate:
   `JSON.stringify({input: Object.keys(SteamClient.Input||{}).filter(k=>/keyboard/i.test(k)), ui: Object.keys(SteamClient.UI||{}).filter(k=>/keyboard/i.test(k)), system: Object.keys(SteamClient.System||{}).filter(k=>/keyboard/i.test(k)), all: Object.keys(SteamClient||{})})`
   and save it as `plan97-A-KEYBOARD-FUNCS.json`. A read only; call nothing.
2. The rename box: Main tab, the chat name row → A (the chats menu) → walk to **Sum up this chat** (read focus) → A.
   Wait for the summary. If it offers a title ("Rename this chat to ...?"), walk to **Rename** (read focus), A. If the
   summary offers no title, say so and try once more with "Sum up" after one more question in the test chat; if still
   none, record COULD NOT RUN with what the menu offered. When a rename box opens with a text field: read focus (the
   field should hold the ring, it takes focus when it opens), take a screenshot, wait 2 s, take another, and read the
   Big Picture page for a keyboard (`!!document.querySelector('[class*="VirtualKeyboard" i], [class*="keyboard" i]')`
   and the number of matches). Then press **A** on the field (read focus first), wait 2 s, screenshot and the same read.
   **Record:** whether Steam's on-screen keyboard appeared at any point, and after which press. Press **B** to leave the
   box without renaming (read that the chat's name is unchanged). The rig is an external controller, so this read tells
   the session whether the maintainer's bug reproduces with it.

## A7: the lines that read 92 and 83 percent, by eye (row P97-A-CLIPPED-LINES)

Settings tab, sections folded: walk the ring onto the **Story spoilers** section line (read focus); take a screenshot;
read the line's box, the box of the header strip under the chat name, and the text-range boxes of the line's words.
Then the Main tab: the ring on the chat name row (read focus); screenshot; the row's box and its words' text-range boxes
against the panel's edge. Then the Developer tab (switch it on in Settings → Data if off; note it): the ring on each of
**Diagnostics**, **Logging & exports** and **Animations** (read focus each time); one screenshot each and the same
boxes. Also record, for each stop, what the rig's own visibility read says (the percentage and its reason). **Verdict
MEASURED:** the session judges by eye from the screenshots.

## A8: Settings and Developer at Large text (row P97-A-LARGE-TEXT)

Settings → Text size: note the value, pick **Large**. On Settings and on Developer: run the look check (as in A2, the
Deck's own screen) and save per tab; take a screenshot at the top of each tab and one scrolled so the Story spoilers
line is on screen; for every folded section line read the title's box, the summary span's text-range box
(`.bonsai-fold-line__summary`) and the chevron's distance from the panel's right edge. Put Text size back to **Normal**
and take the same reads once more. **Verdict MEASURED** with the numbers per line per size; the expected after L13
lands is "whole or absent, chevron at least 8 px from the edge".

## A9: the ghost strip's page read with no game (row P97-A-GHOST-NOGAME)

The scoping note `docs/audit/plan96-scope-ghost-tab-bar.md` holds two scripts under "Measurement plan": **the passive
watcher** and **the exact page read**. Inject the watcher on the Quick Access page first (it only records). Take one
baseline read and a screenshot (expected: Steam's row display none, the rule matches). Then the pop-up route: open the
help pop-up (A on the "How to use bonsAI" chip if the Main tab shows it; otherwise the About tab's help link that opens
the same box), wait for it, press **B**. Read at 0.3, 1, 3 and 10 s after the screen is back, with a screenshot at 1 s.
Then one D-pad press and read again. Three times. Save the watcher's list (`window.__ghost`) into the file. **Verdict
MEASURED:** the first line of each read says which candidate is on; with no game the expectation is "never shown".

## A10: handover

Write `docs/planning/assets/97-handover-A.md`: the build, the screen, the keep-awake's `expiresAt`, the settings
backup path, the model list, the test chat, every setting you changed and whether it is back (the Developer tab switch,
Text size, the local-AI switch), every evidence file, anything odd (the rail after a reload, the lease, the
screensaver). Leave the plugin open on Main in the test chat, Text size at Normal, no game running.
