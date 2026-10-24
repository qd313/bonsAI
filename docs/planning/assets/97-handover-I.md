# Plan 97, Deck block I (the freeze, try 5): handover

Written by the block I driver, 2026-10-22 about 12:24 Deck time. Evidence is in
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\`: `plan97-P97-I-DEPLOY.json`,
`plan97-P97-L14-FREEZE-try5.json` (with `-walk-raw.txt` and `-hops-raw.txt`), `plan97-P97-L14-FREEZE-try5-control.json`.

## Result

- P97-I-DEPLOY: PASS. Tip 334dcb91 on the Deck, bundle md5 29672cce17cac18d5f571a4bdd11ac58 (equal to the PC build).
- P97-L14-FREEZE-try5: PASS for the walk. With the game up 11 minutes and `document.hasFocus()` false, every
  Up and Down press moved the ring (27 of 27). Down from the last answer section onto the first choice button
  moved 2 of 2 (it was dead 10 of 10 in try 4). The log shows the new `strategy-choice` hop 6 times.
  The first Up from the question box moved at once. UNCLEAR only for how often the state appears: this time
  try 1 of 8 (the paperclip route, then the GUIDE+A chord), try 4 needed 7.
- Control (no game, focus present): PASS, 18 of 18 presses moved, same stops.
- Not tested: a chip row (Left/Right on chips), the Settings/Ollama/Developer tabs (out of this block's scope).

## Landings (lost-focus walk)

Up from the box: Show details, notes block "Weapon choice (+1 more)", Show details (divider), Helpful, B, A,
section 2, section 1, Show reasoning. Down: section 1, section 2, A, B, Helpful, Show details, notes block.
The choice menu had only A and B (no C) for this question.

## State the Deck is in

- Build tip 334dcb91 on the Deck. Monitor live (page 855 x 766).
- Keep-awake taken about 12:02 EDT, 480 min, expiresAt 2026-10-23T00:02:01Z.
- Quick Access open on Main, test chat "test", mode chip Strategy, ring on the question box. No game; no Survivor process (checked over SSH).
- Settings file md5 4786b12b8f6f7a215f0e9f8c316d3da8, unchanged. Text size Small, Run AI on this Deck ON, scramble ON (nothing touched).
- The Deck's AI is NOT loaded (unloaded before the launch, left unloaded). Asking the next question loads it.
- The test chat gained one question: "In Hades which weapon should I start with and why".

## Side effects

One more picture in the Steam screenshot folder (paperclip route). One test question in the test chat.

## Odd things for the next driver

- Reaching the state: after "Close menu & take screenshot" the menu closed, hasFocus read false; the GUIDE+A chord reopened it
  with no ring drawn and hasFocus false. Down then drew the ring on Ask; Up put it on the question box.
- Right from the question box went mic, Clear, then Ask: three Rights, and A on Clear would wipe the box. Read focus before A.
- The plugin-log tool returned nothing for the filter; `ssh deck@192.168.86.52 'journalctl -u plugin_loader --since "HH:MM" --no-pager | grep -a lostFocusHop'` works.
- `followed:false` on every hop line is still the early read; judge by the screen.
