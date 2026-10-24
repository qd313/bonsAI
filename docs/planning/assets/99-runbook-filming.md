# Plan 99 runbook: filming the README clips on the Deck's own screen

For the deck-driver helper. Written 2026-10-22 by the release session. One driver at a time: the other chats
have handed the Deck over; do not hand it to anyone else. The checkout is `C:\Users\still\Documents\BonsAI`
(branch `experimental`, build deployed at 21:40 from the frozen tip). Use that absolute path in every command.
You never edit a document, never commit, never deploy (the right build is already on the Deck).

**What this block makes:** eleven real-time recordings (masters) and seven still pictures of the plugin,
on the Deck's own screen, with Deep Rock Galactic: Survivor running. Nothing is sped up; the cuts trim only
the ends, so a few seconds of dead air at the start or end of a take are fine. The maintainer looks at
every file afterwards, so your job is honest takes and a clear log, not perfect ones.

**Your log:** `recordings/p99-filming-log.md` (an untracked folder; make the file). One block per clip:
master file name, length, what happened, suggested trim points in seconds, anything odd. Also every setting
you changed on the Deck, so it can be put back. Write the log as you go, not at the end.

---

## 0. Tools and how they fit together

- **The recorder** runs from a Git Bash shell on the PC and blocks until the take ends:
  `bash scripts/record-deck.sh --mode game --seconds N --full-quality`. It records to `/tmp/deck_record.mkv`
  on the Deck (memory; 7 GB free, full quality writes about 11 MB a second, so keep every take under 150
  seconds), then downloads to `recordings/DeckRecord_<stamp>_game.mkv`. **Run it in the background**
  (the Bash tool's run_in_background), then wait until the Deck's recorder process exists before pressing
  anything: `ssh deck@192.168.86.52 pgrep -x gst-launch-1.0` answers with a number. A fixed delay once
  started a take 30 seconds late. After the download, rename the file to `recordings/<clip>-deck.mkv`
  (overwrite last week's master of the same name; git does not track this folder).
- **The recorder needs motion.** It drops frames when nothing on screen moves; the Main tab's chips
  animate, so the Main tab is safe. On other tabs, keep something moving (a slow Up/Down walk).
- **Presses** go through the rig tools (`deck_pressButton`, `deck_walkTo`, `deck_readFocus`,
  `deck_readPage`, `deck_captureScreenshot`) while the recorder runs in the background; they do not block
  it. To close or open the Quick Access Menu from a tool, press the GUIDE+A chord (`deck_pressChord`) or
  run `python C:\Users\still\decky-plugin-studio\bridge\tools\chord.py GUIDE A`. Three B presses only get
  back to Decky's list.
- **Typing a question:** `ssh deck@192.168.86.52 'python3 - --text "the question"' < scripts/deck_send_ask.py`
  puts the exact text in the Ask box (Main tab open) and prints VERIFIED. It does not press Ask; you press
  A on the Ask button after. `--clear` empties the box. The question box is the ONLY field it writes.
- **A repeated question is answered from a cache**, so every retake uses new wording.
- **Waiting for an answer:** an answer is complete when the new question's text sits above a "Was this
  helpful?" line (read the page). Counting bubbles fails because older turns fold away.
- **Known Deck quirks:** the plugin's tab may be missing from the Quick Access rail for a while after a
  reload; never reload the plugin while a game runs (Steam froze once); the D-pad freeze that hit last
  week's filming is fixed in this build, but film the clips that open Steam's own boxes last anyway.
- **Screenshots** for stills: `deck_captureScreenshot` gives a full PNG of the Deck's screen. Copy each
  still to `recordings/stills/p99/<name>.png`. The plugin crop is done later on the PC.

---

## 1. Set-up (about 25 minutes)

1. `deck_checkReady` with awake true, no running game, no modal. If a Steam box is open (a rename box was
   left open earlier), press B until the plugin's Main tab shows, or close the menu and reopen it.
2. **Back up the plugin's settings by hand** (the snapshot tool fails): on the Deck
   `tar czf ~/p99-settings-backup.tgz -C ~/homebrew/settings bonsAI`. Note the file in the log.
3. `deck_holdAwake` for the block.
4. **Tabs:** open the plugin; count the tabs. Six is right: Search, Main, Ollama, Settings, Permissions,
   About. If a seventh, Developer, shows, find the "Developer tab" switch on the Settings tab and turn it
   off (note it in the log so it can be put back). No test chips may be pinned: the Main tab's chips must
   be the everyday ones (no amber badge). If a pinned batch shows, clear it from the Developer tab's
   button first, then hide the tab.
5. **Thinking on:** Ollama tab, the reply section: the Thinking switch on. The decode effect, spoiler covers
   and the knowledge library are already on (read 21:30 from the settings file); confirm by eye.
6. **Where the AI runs, two states you will switch between:**
   - *AI on the Deck* (clip 2 only): "Run AI on this Deck" on, the Deck's own Ollama answering. This is the
     state the Deck is in now.
   - *AI on the PC* (every other clip): Ollama tab → PC address `192.168.86.38` → Test connection shows
     connected. Then open "AI models…" and put `gemma4:e4b-it-qat` first (it can see pictures, needed for
     the screenshot clip). The PC also holds `nomic-embed-text` for the notes (pulled at 21:50).
   Read the Ollama tab after each switch and note what the status line says.
7. **The game:** launch Deep Rock Galactic: Survivor from the Recent Games row (`deck_launchGame`; the Steam
   id is most likely 2321470; confirm from the Deck with
   `ls ~/.local/share/Steam/steamapps/ | grep appmanifest` and `grep -l Survivor` over those files). Get past
   its title screen into a run or the hub so the screen is alive; a save-slot screen may open on A at the
   title (three saves): pick the first. Leave the game running for every clip.
8. **Steam's performance overlay:** read its current level in Steam's own Performance tab (screenshot) and
   set it to 0 for filming; note the old value. The slider needs A to grab, Left/Right, A to let go; it is
   per game when the game profile is on.
9. **Ten saved chats, with history.** The Deck holds one chat now. With the AI on the PC (fast), make chats
   until the chat row shows ten: each is New chat (the pencil in the chat row), one Speed question, wait for
   the answer. Vary the questions; make one of them "How do I change the screen brightness on the Deck?" so
   the Search clip has a chat match, and make one a four-or-five-question chat (ask follow-ups) so "Sum up
   this chat" has something to sum up. Note the final count.
10. **The pretend microphone** (for clip 7): on the Deck
    `pactl load-module module-null-sink sink_name=p99mic sink_properties=device.description=p99mic` (note the
    module number), then write the text `p99mic.monitor` into `~/homebrew/settings/bonsAI/voice_capture_target`
    (no newline is fine). Make a spoken sentence on the PC with Windows' own voice:
    PowerShell `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = -1; $s.SetOutputToWaveFile("$env:TEMP\p99-sentence.wav"); $s.Speak("I keep dying to the swarm around minute ten on hazard three. Which weapon upgrades should I take first as the Gunner?"); $s.Dispose()`
    then `scp` it to the Deck as `/tmp/p99-sentence.wav`. Test once off camera: Main tab, A on the mic
    button, then on the Deck `paplay --device=p99mic /tmp/p99-sentence.wav`, wait for it to end, A on Stop
    voice input; the words must appear in the question box. Clear the box after.

---

## 2. The clips, in filming order

In-panel clips first; the ones that open Steam's own boxes last. Each row: the state before, the recorder
length, the presses, what must be on screen. Start every take on the Main tab unless it says otherwise.
Start the recorder, wait for the process, count three seconds, then begin. Let the end breathe two
seconds before the recorder stops. Name the master as given.

| Order | Clip (master name) | AI | Length | State before | What happens on screen |
|---|---|---|---|---|---|
| 1 | Notes from the game's wiki (`wiki-notes-deck.mkv`) | Deck | 60 s | Speed mode; a fresh New chat; question box empty | Type a Speed question whose answer uses a wiki note: "What is Nitra for in Deep Rock Galactic Survivor and how much should I grab per stage?" A on Ask. The thinking dots (10 to 25 s on the Deck); the answer streams in with the decode effect; Down to the "From the notes" line under the answer and A opens it. Real time, no cut. |
| — | **Switch the AI to the PC** (set-up item 6), off camera. | | | | |
| 2 | Ask about the game you're playing (`ask-about-your-game-deck.mkv`) | PC | 150 s | On an existing chat with history (one of the ten); Speed mode | The pencil: New chat. A on the mode chip twice: Speed → Expert → Strategy (read the chip after each press). Type "I'm playing Scout on Hazard 3 in the Crystalline Caverns and the swarm overwhelms me around minute twelve. How should I build and position?" Ask. The thinking fold shows steps as they come; the answer streams with the decode effect; a Keep card for the note appears (A on Keep); Down to Show reasoning, A opens it; Down to the branch choices under the Strategy answer, A on one; its answer streams. If a "Where are you at?" checklist shows, tick one step (A on it). Aim for 1:30 to 2:00; if the branch answer is still writing at 140 s, let the recorder stop. |
| 3 | See how it answered (`show-details-deck.mkv`) | PC | 30 s | The chat from clip 2, scrolled to its newest answer | Down to Show details under the answer, A. Walk the details slowly: the model, the notes it used, the Session tab (Right/Left or Down as the control asks). Hide details at the end. |
| 4 | Spoilers stay hidden (`spoiler-deck.mkv`) | PC | 60 s | New chat; Strategy mode | Type "In Hollow Knight, what decides which ending I get, and what should I do before the final fight?" Ask. The answer arrives with one or more covered lines. Down onto a cover, A opens it. If no cover comes (the covers depend on the answer), retake once with "Who is behind the mask at the end of Hollow Knight and how do I reach that fight?"; if still none, log it and move on. |
| 5 | Talk instead of typing (`talk-deck.mkv`) | PC | 40 s | New chat; question box empty; the pretend microphone ready (set-up 10) | A on the mic button; on the Deck run `paplay --device=p99mic /tmp/p99-sentence.wav` at once (background shell); words appear while it plays; when it ends, A on Stop voice input; the tidied full sentence replaces the live words. Do not press Ask. |
| 6 | Search (`search-deck.mkv`) | PC | 45 s | The Search tab (left of Main) | Put "brightness" into the Search field. Find a typing route in this order and log which worked: a rig tool step that types text (read the deck_runSequence and deck_pressButton tool schemas), then a copy of `scripts/deck_send_ask.py` in your scratch folder pointed at the Search field (its input is found differently; read the script), then Steam's on-screen keyboard (A on the field, pick letters with the D-pad, A each; slow but it works). Matches appear above the field: a Steam setting (Display → brightness) and the chat that mentions brightness. Down to the chat match, A opens it (the Main tab shows that chat); B or LB back; then the Steam setting match, A opens Steam's Display settings. End there. |
| 7 | Close the menu, keep playing (`reply-ready-deck.mkv`) | PC | 50 s | Main; Expert mode; a chat with history | Type "Give me three tips for surviving the first ten minutes as the Gunner." Ask, then at once close the menu with the GUIDE+A chord. The game is on screen for 15 to 25 seconds, then the "Reply ready" popup appears. Reopen the menu with the chord so the finished answer shows for the last seconds. |
| 8 | Ask about a screenshot (`ask-about-a-screenshot-deck.mkv`) | PC | 90 s | Main; Speed or Expert mode; the game showing something worth asking about behind the menu | A on the paperclip; pick "Close menu & take screenshot": the menu closes, the picture is saved. Wait three seconds, reopen the menu with the chord. A on the paperclip; "Attach recent screenshot"; pick the newest; the thumbnail shows by the question box. Type "What's going on in this screenshot and what should I do next?" Ask. The answer streams. |
| 9 | Your own notes (`your-notes-deck.mkv`) | PC | 75 s | New chat; Speed mode | Type "I'm on Hazard 4 now with the Engineer, mostly running turrets." Ask. The answer and a Keep card appear; A on Keep. Then type "Which upgrades should I prioritise for my current run?" Ask. The answer says it read 1 of your notes (a line under it); Down to that line, A opens the notes sheet (Steam's box, over the whole screen). B closes it at the end. |
| 10 | Saved chats (`saved-chats-deck.mkv`) | PC | 75 s | Main on the long chat from clip 2; ten chats exist | Show the chat row; press RT, RT, LT (a second apart) so three chats flip past. Back on the long chat (or the four-question filler), Down to "Sum up this chat", A; the summary card appears. Then A on the pencil (New chat) with ten chats: the "which chat to delete" box opens; press Cancel (read focus first so Cancel, not Delete, is under the ring). |

After clip 10, with the AI still on the PC, take the stills (§ 3). Then clip order is done.

**Retakes:** at most two per clip in this block. New wording every time. Keep every take's file (rename
retakes `<clip>-take2-deck.mkv`) and say in the log which one you think is best and why.

**The "Where are you at?" clip** is cut from clip 2 later; nothing to film.

---

## 3. The stills (about 10 minutes)

Full-screen PNGs with `deck_captureScreenshot`, copied to `recordings/stills/p99/`:

| File | What shows |
|---|---|
| `top-answer.png` | Main tab, a finished answer with the chips below, the question box empty |
| `top-details.png` | The same answer with Show details open |
| `where-ai-runs.png` | The Ollama tab's "Where the AI runs" section (the switch, PC address, Install Ollama, Test connection), the ring on the switch |
| `attach-menu.png` | Main, the paperclip menu open |
| `knowledge-library.png` | The Ollama tab's Knowledge base section, showing the library's version line |
| `permissions.png` | The Permissions tab, all four switches visible (take a second one scrolled if they do not fit: `permissions-2.png`) |
| `ai-models.png` | The "AI models…" list open |

The first-run popup's still comes from the clean-install block, not this one.

---

## 4. Put back (about 10 minutes)

1. The AI back to the Deck: "Run AI on this Deck" on, the PC address cleared (or left as it was at the
   start; read the log), the model order back to gemma4:e2b-it-qat first if you changed it.
2. The pretend microphone: `pactl unload-module <number>`; delete `~/homebrew/settings/bonsAI/voice_capture_target`;
   remove `/tmp/p99-sentence.wav`.
3. Steam's performance overlay back to its old level. Close the game (`deck_exitGame`).
4. The Developer tab switch back if you changed it. Leave the ten chats and the Thinking switch as they are
   (the clean install wipes everything later).
5. `deck_holdAwake` released. Leave `~/p99-settings-backup.tgz` on the Deck; say so in the report.

---

## 5. Report

Plain language, under 500 words: the table of masters (name, length, best take, trim suggestion), the stills
made, every setting changed and whether it was put back, anything that failed and why, and the typing route
that worked for the Search field. Point at the log for the detail.
