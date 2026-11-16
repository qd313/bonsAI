# Plan 104, Deck block D1b: the D2 rows already in deploy 1, and two retries

Written 2026-11-15 by the chat running plan 104. Three rows the plan put in block D2 check lanes that are already in
deploy 1 (C2, B1, B2), so they run now, while the screen fixes for D2 are still being built. Two rows that could not
run in block D0c get a second try.

For one fresh `deck-driver` helper (Sonnet 5.5 medium). The helper file's rules apply in full, and so does
**everything above the line "# D0a" in `docs/planning/assets/104-runbook-block-D0.md`** (evidence names, the one way to
write a Deck command, what the maintainer allowed, the freeze rules, asking a question, keeping replies small,
unloading the AI): read that part first. Also read **D1.0 step 6 of `104-runbook-block-D1.md`** (bringing Steam back to
its Home screen before a launch; launch by appid). Evidence goes to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan104-<ROW>.json` (never overwrite; `-try2` if taken), a
picture beside every look. Handover: `C:\Users\still\Documents\bonsAI-workshop\planning\assets\104-handover-D1b.md`.
You commit nothing and you do not deploy. **Read the last handover first** (the session names it in your task).

**Freeze rules, again:** `free -m` before every question and every launch (under 3,000 MB available: skip and say so);
unload the AI before every launch; never a question with a heavy game running; never reload the plugin with a game
running; two timeouts in a row: stop and hand over. **Never press the Ollama tab's Update button.**

---

## D1b.0: setup (row P104-D1B-SETUP; one evidence file)

As D1.0 steps 1 to 3 and 5 of the D1 runbook, with a new queue line ("plan 104 block D1b, about 75 minutes"): the
build hash must read the one in your task; renew the hold for 480 minutes. Write which library is installed
(`rag_corpus_version`, that key only) and the mode chip.

## D1b.1: the long chat's log says why no summary was made (row P104-SUMUP-02)

Nothing running, Strategy, the **long test chat** (the handover names it; it carries a summary dated 11/10/2026). Note
the time, ask one Hollow Knight question of your own wording, wait for the answer, then read the plugin log from that
time: `ssh deck@192.168.86.52 'grep -h "chat_summary" ~/homebrew/logs/bonsAI/*.log | tail -5'` (if the logs live
elsewhere, find them with `ls ~/homebrew/logs/`). **Pass when** a `chat_summary:` line from that question's time is
there: either `chat_summary: none due before this answer — …` or a "written" or "failed" line. A silent log is a FAIL.
Copy the line into the evidence. This also answers the older row P103-SUMUP-01: write that in the evidence.

## D1b.2: the two chips after an answer are the closest notes (row P104-CHIPS-CLOSEST-01, with a recording)

Unload the AI; `free -m`; Steam to Home; `deck_launchGame` appid 2321470 (Deep Rock Galactic: Survivor); when its
window has been up 60 seconds, `free -m` (4,000 MB or more available, or skip); close and reopen Quick Access (the
Context line names the game). Strategy, a test chat (the test chat, or a new one whose first question goes in the
handover). Start a recording (`deck_record`; about 40 seconds). Ask one question about a named boss the library holds
for this game, in your own words: the **Glyphid Dreadnought** (or the **Dreadnought Twins**). From the moment the
answer finishes, read the two chips' labels every second for ten seconds (a small page read of the two chip labels
only). **Pass when** within five seconds of the answer ending both chips are about that boss or the notes next to it
(the other Dreadnought note, the Praetorian, the Exploder, the Acid Spitter, the Mactera: this game's enemy notes),
and say for each chip which note it is. Write the label times. This row also closes P103-CHIP-ORDER-01: write that.
Stop the recording; its file name goes into the evidence. **Keep the game running** for D1b.3.

## D1b.3: the page out of focus (row P104-M-LOSTFOCUS, then the two owed halves), second try

This is D0c.2 of the D0 runbook, which could not run on 2026-11-15 because the launcher refused the game. Follow
D0c.2 exactly, with one change: the game is already running from D1b.2. **Before the wait:** unload the AI; in the test
chat the newest answer must have a notes line (the D1b.2 answer should have one: check it), and open the thumbs-down
row's state the way row P102-UNDO-FOCUS-01 in `docs/testing.md` asks. Then wait until the game has been up **eleven
minutes in all** (counting from its launch in D1b.2), `free -m` at the start and the end of the wait, ask nothing. Then
the recipe (paperclip, "Close menu & take screenshot", the GUIDE+A chord; the second way through "Delete chat" with
**B** in Steam's box, never A), three attempts in all, `document.hasFocus()` read after every press. If the page reads
no focus: P103-DETAILS-STRIP-01's out-of-focus half and P102-UNDO-FOCUS-01, as D0c.2 step 5 says. If it never does:
both COULD NOT RUN with "three attempts, eleven minutes of game, both ways". Any picture the recipe took goes on the
put-back list. `deck_exitGame`; confirm with `pgrep`; Steam back to Home; `free -m`.

## D1b.4: a hidden boss name on a game known only by its name (row STRAT-SPOIL-NAME-01), second try

Read the row in `docs/testing.md` (search STRAT-SPOIL-NAME-01) and its manual entry in `docs/testing-manual.md`. On
2026-11-09 Doom 64: Retribution launched by its title from the Recent Games shelf. With Steam on Home, read the shelf
(`deck_listGames`, the `recentShelf` field only): **only if** Doom 64: Retribution (a non-Steam shortcut, appid
2781880966) is on it, unload the AI, launch it with `deck_launchGame` by `title` "Doom 64: Retribution", wait 60
seconds, `free -m` (4,000 MB or more, or skip), close and reopen Quick Access, and ask the row's two differently worded
boss questions. Verdict as the row says (the box must appear and open with A, or the row's own wording); an answer with
no box and no boss name is UNCLEAR, as last time. If it is not on the shelf: COULD NOT RUN, "not on the Recent Games
shelf; needs the maintainer to play it once". `deck_exitGame`; confirm with `pgrep`; Steam back to Home.

## D1b.5: a first start without wiping anything (row P104-FIRST-RUN-01; D141 call 23)

Last, with nothing running. Follow the recipe "A first start without wiping anything" in the D0 runbook's last section
**exactly**, and never "Clear all data". In order:
1. Write the put-back list in your handover **before** any move: the settings file's copy at
   `~/p104-settings.json.bak`; the Ollama program moved from `~/.local/bin/ollama` to `~/.local/bin/ollama.p104-aside`;
   the user unit `bonsai-ollama-autostart` stopped. Read and write down first: the header's "chat N of M", the mode
   chip, `curl -s 127.0.0.1:11434/api/tags` model names (names only), and `ls -l ~/.local/bin/ollama`.
2. Steam's performance overlay off (say if it was on). Unload the AI.
3. `cp ~/homebrew/settings/bonsAI/settings.json ~/p104-settings.json.bak && ls -l ~/p104-settings.json.bak`, then
   `rm ~/homebrew/settings/bonsAI/settings.json`. `systemctl --user stop bonsai-ollama-autostart.service`, then
   `mv ~/.local/bin/ollama ~/.local/bin/ollama.p104-aside`. Reload the plugin (`deck_reloadPlugin`; nothing running).
4. Open the plugin: the first-start box shows. Turn the permissions on the way the box offers (Internet downloads
   among them), and read the ring at each step. Walk to "Install Ollama" and read what the box says next to it
   **before** pressing anything, and take a picture. **Pass when** no "turn on Internet downloads" message shows while
   the switch reads on. **Do not press Install Ollama** (it would download and install a new Ollama). If the box shows
   the old message, FAIL, with the picture.
5. **Put everything back, in this order, checking each:** `mv ~/.local/bin/ollama.p104-aside ~/.local/bin/ollama`;
   `systemctl --user restart bonsai-ollama-autostart.service`; `cp ~/p104-settings.json.bak
   ~/homebrew/settings/bonsAI/settings.json`; reload the plugin; then check: the header reads the same "chat N of M"
   as step 1, the mode chip is as before, `api/tags` lists the same model names, `curl -s 127.0.0.1:11434/api/version`
   answers. Only when all four match: `rm ~/p104-settings.json.bak` and `ls` to confirm. If anything does not match,
   **stop and report at once**, keep the `.bak` file, and press nothing more.

## D1b.6: hand over

The plugin on Main in the test chat, the mode chip on Strategy, no game, the AI unloaded, the hold kept, Steam on
Home. `deck_releaseMachine`. `python scripts/deck_queue.py done <id> --result "<build; no game; hold until>"`. The
handover: each row's verdict and file; the put-back list with each item's state (all put back, or exactly what is
not); the first questions of any new chat; anything the next driver should know.
