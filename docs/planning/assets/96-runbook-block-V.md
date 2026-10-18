# Plan 96, Deck block V: Ask while listening, and the ring stall's trigger

For a fresh deck-driver helper, after block M (read its handover, `docs/planning/assets/96-handover-M.md`, first). Run
on the build already on the Deck unless the handover says a new build was deployed. Same rules as block M: evidence to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan96-<ROW>.json`, every Deck command exactly
`ssh deck@192.168.86.52 '<command>'`, the session's scratch folder for scratch files, stop at once if the lease is held by
another chat or focus moves without your press. Renew the keep-awake if the handover says it is about to run out.

## V1: Ask pressed while the mic is still listening (rows P96-F7-ASK-WHILE-1, -2, -3)

Why: on 2026-10-17 Ask pressed about 2 s into a recording sent only the first half of the sentence (42 of 82
characters), once. Plan 86 had the same check passing. Three tries settle whether it is real.

Setup (the same pretend microphone the plan 94 driver used; its evidence `plan94-P94-VOICE-ASK.json` has the exact
shape):
1. Mic permission on (Permissions tab; read the switch; if you turn it on, note it for the handover).
2. The voice engine installed and the model base.en (Settings → Voice input: it must read ready; if not installed,
   stop and report, do not install).
3. The pretend microphone: `ssh deck@192.168.86.52 'pactl load-module module-null-sink sink_name=p96mic sink_properties=device.description=p96mic'`
   (record the module number it prints), then the capture override the plugin reads: look in the plan 94 evidence's
   `setup` field for the override file's path and key (`voice_capture_target = p96mic.monitor`); read the file first, write
   the key, and reload the plugin once (no game running). If the override file's location is not in that evidence,
   `ssh deck@192.168.86.52 'grep -rn voice_capture_target ~/homebrew/settings/bonsAI ~/homebrew/plugins/bonsAI/py_modules 2>/dev/null | head'`
   finds it. If writing it is refused by the permission check, stop and report.
4. The WAV: make it on the PC with the Windows speech voice (PowerShell, `System.Speech.Synthesis.SpeechSynthesizer`,
   16 kHz mono) saying "How do I beat the final boss in this game and which weapon should I upgrade first?" (about 5 s),
   copy it to `/tmp/p96.wav` on the Deck with `scp`, read its size back.

Each try (three in all, Ask at a different moment each time):
1. Main, the test chat, box empty. Ring on Voice input (read focus), A. Read the back-end log line "recording started".
2. Start `ssh deck@192.168.86.52 'paplay --device=p96mic /tmp/p96.wav'` in the background; note the clock.
3. Press Ask (Right x2, read focus = Ask, A) at: try 1 about 2 s into the play; try 2 about 5 s (the play has just
   ended, words still arriving); try 3 about 8 s (everything landed). Read the button's label each second (it should
   go amber "Finishing voice input" then send).
4. Read the chat file over SSH: the question sent. Record it word for word with its character count, the log lines
   "recording stopped, transcript N characters", and the seconds between play start and the Ask press.

Pass sentence: all three tries send the whole sentence (82 characters). A try that sends a shorter sentence is a FAIL
with the exact text and timing.

Put back: `ssh deck@192.168.86.52 'pactl unload-module <number>'`, restore the override file to what you read, reload
the plugin, remove `/tmp/p96.wav`.

## V2: the ring stall's trigger (rows P96-R1-TRIGGER-1..3 and P96-R1-CONTROL-1..3)

Why: after a Steam box or the menu closing, Down sometimes stops moving the ring until the plugin is reloaded; Up keeps
working. Plan 95's readings (its § 13) say the panel page had no focus (`document.hasFocus()` false) in every stuck
reading and true in every working one. This block counts how often each trigger leaves the page without focus.

The reading: `document.hasFocus()` on the panel's page, through the debugging port (the same script shape as
`scripts/probe_deck_ui_look.py`: connect to the Quick Access page, evaluate `JSON.stringify({f: document.hasFocus(), v: document.visibilityState, a: (document.activeElement||{}).className})`).
Take it BEFORE each trigger and 2 s AFTER the menu is back, and record both.

Trigger A (plan 94's): the plugin open on About → the Reply language list (A on it, a Steam pop-up) → B with nothing
picked → Settings tab → open the Data section (A on its line) → Down from the Data line. Record: hasFocus before and
after; whether the ring moved on Down (read focus and the ring's box after the press; also read the page's own
activeElement: a split is the ring staying while activeElement moves); Up afterwards. Three times, a plain menu
close-and-reopen between tries (chord twice, 2.5 s apart), and if a try sticks, record how many close-and-reopens
clear it (up to three), then reload the plugin only if still stuck (no game running).

Trigger B (plan 95's cheapest): on Main, the paperclip menu → "Close menu & take screenshot" (A), wait 3 s, reopen
Quick Access by chord, open the plugin if needed, then: hasFocus; Down from the question box; read. Three times.

Control: three times the same Settings walk (Settings → Data line → Down) straight after a fresh menu open with no
Steam box first; hasFocus and whether Down moved.

Record per try: trigger, hasFocus before, hasFocus after, Down moved (yes/no), split (yes/no), what cleared it.
Verdict "MEASURED" with the counts (stuck tries out of three per trigger). The screenshot taken by trigger B lands in
Steam's screenshot folder; say so in the handover.

## Handover (write `docs/planning/assets/96-handover-V.md`)

As block M's: build, screen, keep-awake, settings changed and put back (the mic permission, the capture override, the
pretend sink), the test chat, every evidence file, anything odd.
