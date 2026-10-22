# Plan 97, Deck blocks D and E: one check per landed fix

For a fresh deck-driver helper after blocks B and C (read the newest `97-handover-*.md` first). Same rules, evidence
folder and file names as block A (`plan97-<ROW>.json`, never overwrite, screenshots beside them). Every Deck command is
exactly `ssh deck@192.168.86.52 '<command>'`. No game unless a check says so. **Never reload the plugin with a game
running.** Block D is about fifteen checks; block E is a second driver with a fresh context.

The rig was rebuilt at about 02:30 with three fixes (open after a reload closes and reopens the menu when the plugin's
tab is missing; the settings snapshot sets aside a damaged or old earlier copy; folded section lines read whole). They
load only in a chat started after that time.

## D0: deploy

1. `deck_status`: no stop switch, no other lease. Renew the keep-awake (`ttlMinutes: 480`) if under 3 hours remain.
2. Record the old bundle hash (`sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`), then `deck_deploy`
   from the shared checkout's tip (record the tip hash). If the deploy is refused for a permissions reason, stop and
   say "the maintainer needs to run setup-dev".
3. Read the new bundle hash. Open the plugin (first try after a deploy often fails; close and reopen the Quick Access
   menu). Row **P97-D-DEPLOY**: old hash, new hash, tip.

## D1: the rig's own fixes (rows P89-RIG-OPEN-AFTER-RELOAD-try2, P89-RIG-SNAPSHOT-try2, P97-X2-SAMPLER)

- **Open after a reload, three rounds** (no game): `deck_reloadPlugin`, then `deck_openPlugin` at once. Record the
  stages it reports (`wait-decky-tab`, `reopen-qam`) and the seconds. **Pass:** the first call opens the plugin in 3 of
  3, by itself.
- **Snapshot, three times:** `deck_snapshotSettings` three times (the first should say an old snapshot from 12 October
  was set aside, not restored). For each, unpack the saved copy it names to a side folder on the PC and compare it with
  a fresh `tar` of `~/homebrew/settings/bonsAI` taken over SSH the same minute (`diff -r`). **Pass:** three saved
  copies, each identical. Never restore over the live folder for this check.
- **The sampler:** Settings, sections folded, the ring on Story spoilers, Diagnostics (Developer) and Logging & exports:
  the rig's own visibility read. **Pass:** 100 percent, "text", no "clipped by a container", at every stop.

## D2: About (rows P97-L6-ABOUT-BUILD, QA-LOOK-01-About)

About tab: read the title line. **Pass:** it reads "Version 0.5.0 · build <12 characters>" equal to the new bundle hash's
first 12 characters. Then the look check on About (`scripts/probe_deck_ui_look.py`, as in block A). **Pass:** the
language dropdown is not reported (anything else reported: record it).

## D3: the reply language (row P97-L2-LANGUAGE-PICK)

About → the reply-language button → A (Steam's list) → walk to **Czech** → A. Within 2 s: the button reads Czech and
`reply_language` in the settings file reads `czech` (print that one key only). Close and reopen the plugin: still Czech.
Main tab, the test chat: ask "What is a good first upgrade" with the question script; the answer is in Czech. Back to
About → pick **Follow system**; the file follows. Also copy the two plugin-log lines tagged `about.replyLanguage`.
**Pass:** every step as written.

## D4: the knowledge base Update (row P97-L9-KB-UPDATE)

Ollama tab → Knowledge base → read the status (version, games). Press **Update**. **Pass:** the line says the installed
library is newer than the published one ("You have 2026.10.17; the published library is 2026.09.26. Nothing to do."
or the same with tonight's versions), nothing downloads (the folder's file dates unchanged), the status is unchanged,
and the plugin log names both versions.

## D5: Large text (row P97-L13-LARGE-TEXT)

Settings → Text size: note it (Small on this Deck), pick **Large**. On Settings and Developer: the look check; for every
folded section line, the summary's text-range box and the chevron's distance from the panel's right edge; one
screenshot per tab. Then **Normal**, the same. Put Text size back to its noted value. **Pass:** every summary is absent
or at least about 50 px wide (ending in "..." is fine); every chevron at least 8 px from the edge (expected 12);
Story spoilers at Large shows its name on two lines with no summary.

## D6: Up from Find LAN (row P97-L16-FINDLAN-UP)

Ollama tab → Where AI runs; "Run AI on this Deck" OFF (as in block A; put it back after). From Find LAN press **Up**
five times, walking back to Find LAN between (record the route back). **Pass:** 5 of 5 land on the PC address box;
from the box, Up lands on the "Save current PC address" row; from that row, Down lands on the address box, then Test
connection. No stop visited twice in one walk. Then the free-play sweep on the Ollama tab.

## D7: after "Explain further" (row P97-L12-EXPLAIN-RING)

No game. The test chat: ask "What does kiting mean in Deep Rock Galactic Survivor" (no apostrophes). When the answer
shows an underlined word: walk onto it, A (the box opens), A again. Within 1 s read focus. **Pass:** the ring is on the
question box (focus not empty), and Down then Up both move. If no underlined word appears after two differently worded
questions: UNCLEAR.

## D8: the rename box (row P97-L10-RENAME-KEYBOARD)

The chat name row → A → **Rename chat** → when the box opens, read focus (the ring should be on the name field) → A on
the field → wait 2 s → screenshot and the Big Picture page read for the keyboard (as in block A). Press one letter on
the keyboard, close it, **Save**. **Pass:** the keyboard showed after the A; the chat's name changed. Then rename it back
to "test" the same way and read the name. Note: the rig already passed this before the fix; this check only shows
nothing broke. The maintainer's own controller is the real proof.

## D9: the handover

`97-handover-D.md`: every row's verdict, the settings put back, the Deck's state.

---

## E1: a screenshot question (row P97-L1-PICTURE-ANSWER)

Find the 408 KB and a 250 KB 1920x1080 screenshot from 2026-10-18 under `~/.local/share/Steam/userdata/*/760/remote/`
(newest first; `ls -la`); attach each in turn through the paperclip menu and ask "What is on this screen". **Pass:** an
answer naming what is on screen within 60 s each; the plugin log's `payload_bytes` for each under about 70 KB; the
Ollama journal shows no "device lost" or "Not enough memory" in the minute after. Then a smaller 1280x800 one still
answers.

## E2: bold heading with a hidden block (row P97-L3-SPOILER-BOLD)

Mode chip to **Strategy**. Two differently worded questions about a story game with nothing running, asking for a
numbered list with one hidden boss step, e.g. "Give me a numbered list of steps to finish Hollow Knight, with the final
boss name hidden". For each answer: any literal `**` in the drawn text (read the bubble's text), the heading bold, a
cover drawn. **Pass:** no stray stars, the cover whole. If neither answer has a hidden block inside a bold line: UNCLEAR.
Mode chip back to Speed.

## E3: the answer's height while it writes (row P97-L4-ANSWER-DIPS)

Plan 93's height sampler (its script is in `plan93-P93-M4-ANSWER-FINISH-after-try2.json` under `setup`). Two
differently worded long answers that use paragraphs and a list (e.g. "Explain in several paragraphs with a short list
how to get better at Deep Rock Galactic Survivor"), once with the Developer tab's Scramble animation on, once off (put
it back as found). **Pass:** no drop over 2 px while writing. A dip right after a heading line of about 3 px is known
and is recorded, not failed.

## E4: glossary words for a game named, not running (row P97-L5-GLOSSARY-NAMED)

No game. Ask "What does kiting mean in Deep Rock Galactic Survivor and when should I overclock". **Pass:** "kiting" and
"overclock" (or whichever glossary words appear) are underlined; A on one opens its box. Then a Hades question: no
Deep Rock words underlined.

## E5: the stream pace with the AI on a PC (row P97-L11-PC-PACE), only if the PC's Ollama answers

Check first: `curl -s http://<the PC address in the plugin's settings>:11434/api/tags` from the Deck. If it does not
answer: COULD NOT RUN. Otherwise switch "Run AI on this Deck" off (record, put back), and with `deck_record` running
ask two long questions; during each, alternate `window.__bonsaiStreamPace = { pc: true }` and `{ pc: false }` every
2.5 s on the Quick Access page and sample the frame rate with plan 69's script shape. **Pass:** the PC pace's frame
rate within 5 of the Deck pace's; the recording saved for the maintainer's eye. `delete window.__bonsaiStreamPace` and
put the switch back.

## E6: the Decky button's own move handler (row P97-E-DECKY-BUTTON)

The question is whether a Decky button runs its own Left handler. Block A could not tell, because the handler's target
and Steam's own neighbour were the same control. Ask a long question; while the answer streams (the Stop button
replaces the mic), walk to the Ask strip's **Clear** button and press **Left**; record where the ring lands, and the
boxes of the controls to its left. **Verdict MEASURED.** The session reads it.

## E7: the handover

`97-handover-E.md`; the test chat left as "test", the mode chip at Speed, every setting as found.

## E8: the tab glide (row P97-G1-TAB-GLIDE), no game, then with the game if block B left it running

`deck_record` five LB and five RB switches with one second between. Then ten fast presses (RB ten times, about 150 ms
apart) and read which tab is current after each (the bar's current tab): every press lands on the next tab, none lost.
Sample the panel's frame rate while switching (plan 69's script shape): at least 45. Watch the recording for a flash
of the content pane on a switch (an older rule turned that pane's motion off because of a flash). Turn on the system's
reduced motion only if the rig can (else skip that part and say so). With a game running: the line still glides, the
page does not slide. **Pass:** all of the above; the recording goes to the maintainer's eye.

## E9: the help chip's focused look (row P97-HR-HELP-CHIP-RING)

On the Quick Access page record then run `localStorage.removeItem("bonsai:plugin-help-dismissed")`, reload the plugin
(no game), open it on Main in the test chat: the "How to use bonsAI" chip shows. Press Up from the question box until
the chip holds focus (read focus). Screenshot, and the chip's computed background. **Pass:** the background includes
the blue `rgba(56, 189, 248, 0.2)` layer and the screenshot shows a blue-tinted chip with its green border; with focus
elsewhere it is the plain green bar. Then `localStorage.setItem("bonsai:plugin-help-dismissed","1")`.

## E10: the tab row watcher (row P97-L15-GHOST)

With the game running (never reload with it up), the pop-up route three times: the "Delete chat?" box → B (or the
help chip once, if it shows). Read Steam's row at 0.3, 1, 3 and 10 s (display none) and take a screenshot at 1 s. Then
over SSH grep the plugin log for `tabBar.steamRowShown` and copy every line. **Pass:** the row hidden at every read, no
second strip in any screenshot; the log count recorded (zero is expected; any line is evidence for the report). Then
LB and RB switch tabs both ways with the game (the watcher must not stop the shoulder buttons).
