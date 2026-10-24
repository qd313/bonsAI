# Plan 98, Deck block K2: the screenshot set for the picture-reading measurement

For a fresh deck-driver helper, after block K0, on the build already on the Deck (no deploy, no plugin use at all).
Read first: the K0 handover (the session gives its path), then this page. The rules of your helper file apply in
full. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. About an hour of Deck time.

**What this is for.** Lane I built a script that asks the Deck's own AI model "what game is this and where am I?"
about a picture and scores the reply. It needs real game pictures, labelled. You take them. Nothing in the plugin is
tested here, and the plugin is not opened.

**Where pictures go.** `deck_captureScreenshot` with `mode: "game"` and `allowNonPluginUi: true` saves a picture into
the shared checkout's `screenshots/` folder and returns its path. Copy each one (never move) to
`C:\Users\still\Documents\bonsAI-workshop\screenshots\plan98\` under the name `<game-slug>-<scene>.png`, for example
`hollow-knight-title.png`, `hollow-knight-pause.png` (add `-2` if you take a second of the same scene). Create the
folder if it is missing. Look at every picture you keep (read the image) and say in one line what it shows.

## K2.0: setup (row P98-K2-SETUP)

1. `deck_status`: lease free, stop switch off. If not, stop and report.
2. Renew the keep-awake: `deck_holdAwake` with `ttlMinutes: 480`; record `expiresAt`.
3. Which screen is live (the Deck's own, or a monitor): record it.
4. The Deck's AI must be unloaded before any game: read `curl -s 127.0.0.1:11434/api/ps`; if a model is loaded,
   unload it with `curl -s 127.0.0.1:11434/api/generate -d "{\"model\": \"<name>\", \"keep_alive\": 0}"`; confirm
   `/api/ps` reads empty. Record `free -m`.
5. `deck_installCaptureHelper` only if the first capture fails saying the helper is missing.
6. Take one capture of Steam Home (allowNonPluginUi true) to prove the capture path works; you need not keep it.

## K2.1 to K2.7: one game each (rows P98-K2-<GAME>, one evidence file per game)

Games, in this order (all on the Recent Games row on 2026-10-24; the first six have notes in the library, the last
has none, which is the point of it): Deep Rock Galactic: Survivor, Brotato, Hades, Hollow Knight, Half-Life 2,
Black Mesa, God of War. If one will not launch, or takes over three minutes to reach its title screen, record that
and go to the next. If time runs short, stop after five games.

For each game:
1. Go to the start of the Recent Games row first, then `deck_launchGame` by name. Wait until its window has been in
   front for 30 seconds.
2. **Title:** capture the title or splash screen (press nothing, or one press of A only if the screen literally says
   "Press any button" or "Press A"). Scene label `title`.
3. **Menu:** capture the main menu once it shows. Scene label `menu`.
4. **Play:** get into play ONLY through a button whose label is one of: Continue, Resume, Load last save, Load game
   (then the newest save), Play, Start, Start run, Embark, Go. Never press New Game when any save exists, never
   Delete, Overwrite, Erase, Reset, Buy, Store, Sign in, Settings changes, or Yes on any dialog about losing progress;
   read the screen (capture it) before every A in a game. If no allowed button exists, skip Play and Pause for this
   game and say why. Once in play, press nothing for 60 to 90 seconds (the character just stands), then capture.
   Scene label `play`. If a boss or a named enemy is visibly on screen, note its name only if the game shows it.
5. **Pause:** press START once (the menu button), wait 2 seconds, capture. Scene label `pause`. If START opened
   something that is not a pause menu, capture it anyway, label it truthfully, and press B once to close it.
6. Exit with `deck_exitGame`. Confirm over SSH that the game's process is gone, with a bracketed pattern so the check
   does not match itself (for example `ps aux | grep -i "[S]urvivor"`). Record `free -m`.

Evidence file per game, `plan98-P98-K2-<GAME>.json`, with the usual fields plus `pictures`: a list of
`{file, scene, shows, boss, taken_at}`, where `shows` is your one line of what is in the picture and `boss` is empty
unless the game itself names one on screen. Verdict: PASS when at least the title and menu pictures were kept,
MEASURED is not needed here.

## K2.8: the labels list and the handover

1. Write `C:\Users\still\Documents\bonsAI-workshop\screenshots\plan98\labels.json`: one entry per kept picture,
   `{ "file": "<name>.png", "game": "<the game's full title as Steam shows it>", "scene": "title|menu|play|pause",
   "boss": "", "running_game_known": true, "shows": "<your one line>" }`.
2. Handover `98-handover-K2.md` in the scratch folder: keep-awake expiry, games captured and skipped (and why), the
   Deck's state as you leave it (screen, no game running, Quick Access closed, AI unloaded), anything odd.

**Never** open the plugin, change a setting, touch the test chat, deploy, reload the plugin, or press anything on a
store, account or save-management screen.
