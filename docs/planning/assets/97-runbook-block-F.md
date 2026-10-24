# Plan 97, Deck block F: second tries after block E

For a fresh deck-driver helper after block E (read `97-handover-E.md` first). Same rules, evidence folder and naming
as the earlier blocks (`plan97-<ROW>-try2.json`). No game. One press per call, about a second apart.

## F0: deploy

`deck_status`; renew the keep-awake if under 3 hours remain. Record the old bundle hash, `deck_deploy` the shared
checkout's tip (record the tip), read the new hash, open the plugin (read the page before any A). Row **P97-F-DEPLOY**.

## F1: a screenshot question, second try (row P97-L1-PICTURE-ANSWER-try2)

The first try failed because the shrink tool could not start inside the plugin (fixed in `ba0d66bd`). The same three
pictures as block E (the 410 KB, 251 KB and 39 KB 1920x1080 ones; the newest 24 are what the picker lists). For each:
attach, ask "What is on this screen", Ask. **Pass:** an answer that names what is on screen within 60 s; the plugin
log shows the picture went out (`attachments=1`, `payload_bytes` under about 70 KB, no "could not shrink"); no "device
lost" or "Not enough memory" in the Ollama journal in the minute after. If a 1280x800 picture can be made selectable
(take a new screenshot first only if that does not touch the settings), try it too; else say so.

## F2: the answer's height while it writes, second try (row P97-L4-ANSWER-DIPS-try2)

Block E's sampler, the same question ("Explain in several paragraphs with a short list how to get better at Deep Rock
Galactic Survivor"), scramble ON (default style), then a second, differently worded long question with the scramble ON.
Also sample the panel's frame rate during the last 3 s of each answer (plan 69's script shape). **Pass:** no fall over
2 px while writing and no rise above the final height (a step of about 3 px right after a heading line is known); the
frame rate during the finish recorded (the fix redraws a few more times there). Scramble back as found.

## F3: the stream pace with the AI on a PC (row P97-L11-PC-PACE-try2)

The PC answers at 192.168.86.38 (block E). Ollama tab → Where AI runs: record "Run AI on this Deck" and the PC address
box. Switch the AI off the Deck, type `192.168.86.38` in the address box (the keyboard or the question script's typing
route), Test connection must say it connects. Then E5 as written in block D's runbook (two long answers, the pace switch
alternated every 2.5 s, the frame rate sampled, `deck_record` running). Put everything back exactly: the address box as
recorded (empty if it was), "Run AI on this Deck" ON, and read both. **Pass:** the PC pace's frame rate within 5 of the
Deck pace's; the recording saved for the maintainer's eye.

## F4: the handover

`97-handover-F.md`: verdicts, every setting put back, the Deck's state.
