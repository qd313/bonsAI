# Plan 103, Deck block D2: the answer screen's D-pad fixes, on the build that holds them

For one fresh `deck-driver` helper (Sonnet 5.5 medium). The rules of the helper file apply in full, and so does
**everything above the line "# D0a" in `docs/planning/assets/103-runbook-block-D0.md`** (evidence names, the one way to
write a Deck command, what the maintainer allowed, reading a result, presses, unloading the AI): read that part first.
Evidence goes to `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan103-<ROW>.json`, screenshots beside it.
Your handover goes to `C:\Users\still\Documents\bonsAI-workshop\planning\assets\103-handover-D2.md`. You commit nothing
and you do not deploy: the session deployed before starting you and gives you the build hash in your task.

**Safety rules (the Deck froze on 2026-11-09 when a picture question over a heavy game used all its memory):**
1. No picture question in this block. No game heavier than Deep Rock Galactic: Survivor. Never God of War.
2. Before every question and every game launch: `free -m`. If "available" is under 3,000 MB, skip the step and say so.
3. No question while a game is running. Ask first, unload the AI, then launch; exit the game before the next question.
4. Two timeouts in a row on any Deck read or press: stop at once, write the handover, report.
5. Never reload the plugin with a game running.

**How to ask:** as the D1 runbook says (ring on the question box, one `deck_typeText` with `clear: true, submit: true`,
one `deck_waitFor` on the reply row, then `python scripts/deck_kb_readback.py --json` from the shared checkout). After
an answer one Down puts the ring back on the question box. `deck_runSequence` for a few presses. Every question is
worded once, in your own words unless the row gives the words.

**What every try in this block records** (the second opinion asked for these; they are what makes the rows worth
running):
- **The page's focus at the start and at the end of the try:** `document.hasFocus()`. On this screen it has read true
  in every Deck read so far (15 of 15). **A try that reads false is the first device evidence of the state half this
  fix is for: keep it, finish the try, and copy the plugin log's lines from that minute** (every line that mentions a
  hop or a focus). Never close and reopen Quick Access to "fix" a false reading in the middle of a try.
- **Where Steam's ring is** (the rig's focus read), not only the page's own focused element; say both when they differ.
- **The landing's box** (top and bottom) **against where the dock starts**, for every landing the row judges: a landing
  that is focused but hidden behind the dock is a FAIL, said plainly.
- **More than one second between presses.**

**What the build before this one did** (block D0b, 2026-11-09, build `9bc29b3c0500`), so you know what "fixed" looks
like: Up from a checklist's step 1 landed on the Copy icon (3 of 3); Down from the Copy icon skipped every step and
landed on "Mark reply helpful" (3 of 3). With Show details open, Down from "Hide details" landed on the "This answer /
Session" strip when the answer had no notes line, and on the notes line first (the strip on the second Down) when it
had one. Left and Right on the strip flip the tab without moving the ring.

---

## D2.0: setup (row P103-D2-SETUP)

1. `deck_status` (the stop switch armed, no other chat's lease). `deck_holdAwake` for 150 minutes.
2. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` must read the hash in your task. If it
   does not, stop and report. Open the plugin (the first open after a deploy may fail once).
3. `free -m`; no game (`pgrep -fl SteamLaunch`); `/api/ps` empty. Which library is installed (`rag_corpus_version`):
   write it down, change nothing.
4. The mode chip reads Strategy (set it if not, and say what you found); `spoiler_tier` default; the test chat (first
   question "Hollow Knight: which areas should I explore first after Greenpath") is the one open.

## D2.1: the Copy icon and a checklist (row P103-CHECKLIST-COPY-01)

Nothing running, Strategy, the test chat. A Hollow Knight route question of your own (block D0b used one about getting
from Dirtmouth down to the City of Tears; word yours differently). When the answer finishes, read the choice buttons
under it; A on one. The follow-up answer draws the step list. Record whether choice buttons are on screen with the
list.

Three times each (walk back to the start stop between tries):
- **(a) Ring on the Copy icon** (the icon in the newest answer's corner), **Down.** Pass: the ring is on step 1 (on the
  first choice button, if choice buttons are drawn above the list). "Mark reply helpful" is the old bug.
- **(b) Ring on step 1, Up.** Pass: the ring is on the answer's **last** paragraph. The Copy icon is the old bug. One
  paragraph higher than the last means Steam also made its own move: a FAIL, said as that.
- **(c) The steps walk:** from step 1, Down through every step and one press past the last; then Up back to step 1.
  No stop twice in one direction, no lost ring; write the stops in order.

Once each:
- **(d)** Ring on the answer's last paragraph, **Right**: lands on the Copy icon (Copy is reached sideways now, never
  on the up-and-down walk).
- **(e)** Arrive on step 1 by Down from the Copy icon, then **A**: step 1 is ticked. A again unticks it (leave it as
  you found it).
- **(f) Only if it stages within two questions:** in the long chat (first question "In Hollow Knight, how do I beat
  the Mantis Lords"), a Strategy question whose answer shows a summed-up note above it and a step list under it. Then
  Down from the Copy icon (the note is expected first, then step 1 on the next Down) and Up from step 1 back. No Deck
  reading of the note exists yet. If it does not stage, write "not staged" in the row; that is not a fail.

**The row passes** when (a) and (b) pass 3 of 3 and (c), (d), (e) pass. Screenshots: `-a.png`, `-b.png`, `-steps.png`.

## D2.2: the "This answer / Session" strip and the chips under it (row P103-DETAILS-STRIP-01)

The strip is drawn only under a chat's newest answer. Two fresh chats: one of four questions, one of eight (short
Speed-mode questions about Hollow Knight, each worded differently; make the last question of the eight-question chat
one that attaches a note, and the last of the four-question chat one that does not, as block D0b's chats happened to
be; say what each really had; put Strategy back afterwards). In each chat, on the newest answer: walk to Show details,
A (it now reads "Hide details").

**Part 1, the entry (three tries per chat; walk back to "Hide details" between tries).** Before the first press of the
FIRST try only, read the strip's own element and the open chip's own element: each one's `tabindex` (empty is a
finding, not an error) and whether it is on screen. Then: the pane's scroll position; **Down**; where the ring is.
- Pass, an answer with no notes line: the first Down lands on the strip.
- Pass, an answer with a notes line: the first Down lands on the notes line, the second on the strip.
- The suggestion chips, with the strip still on screen above them, is the old bug: FAIL.
On the strip: **Right** (the tab reads "Session"; say whether the ring moved), **Left** (back to "This answer").

**Part 2, into the chips and out (once per chat, the "This answer" tab showing).** Read the pane's scroll; **Down**
from the strip; read the scroll at once and again one second later. Pass: the ring AND the filled (open) chip are the
same chip. Then:
- **Right**: the ring moves to the next chip and that chip becomes the open one. (A fill that moves while the ring
  stays is the dead press the second opinion named: FAIL.)
- If the chips wrap onto two rows: **Down** from the top row lands on the second row; Down again leaves to the
  suggestion chips. If they are on one row, Down leaves to the suggestion chips; say which you had.
- From the suggestion chips, **Up**: back onto the chip that was open (this is "re-entry"; say so in the row). Read the
  ring's chip, the page's own focused element, the fill, and the scroll before, after and one second later.
- **Re-entry onto a tall box:** make "Developer details" (or whichever chip has the tallest box) the open chip, leave
  downward to the suggestion chips, press Up to come back. The first **Down** after that must show the rest of the
  box, not leave the chips.
- **Entry with the second chip open:** from the strip, with the second chip left open, Down: the ring and the fill are
  both on the second chip; the next Right moves the ring.

**Part 3, once, in either chat.**
- **The Session tab:** Right on the strip, then Down into what the Session tab shows and Up back to the strip; then
  leave downward to the suggestion chips and press Up with Session still showing. Write the stops.
- **B on the strip, and B on a chip:** each closes the panel with the ring on "Show details".
- **An older answer's details** (any answer above the newest; it has no strip): open it, Down from its "Hide details",
  write where the ring lands; no lost ring.
- **A covered answer:** in the test chat, a question that draws a whole cover (block D0b's was about beating Doopliss
  in Paper Mario: The Thousand-Year Door; word yours differently). Leave the cover shut, open Show details, Down from
  "Hide details": the ring goes straight to the strip (the caption under a shut cover is text, not a stop).

**Part 4, with a game.** In the eight-question chat, Show details open on the newest answer. Unload the AI; `free -m`;
launch Deep Rock Galactic: Survivor; 30 seconds; close and reopen Quick Access. Part 1's three tries again, and Part
2's first Down into the chips and one Right. Ask nothing. Exit the game; confirm with `pgrep`.

**The row passes** when every entry in Parts 1 and 4 lands as its pass line says, the chips' ring and fill never part,
and no press is claimed while the ring stays put. Say in the row, in one line each: how many tries read the page out
of focus (so far always none); whether the scroll on entering the chips differs from a plain step (a jump of more than
a line or so is worth a screenshot before and after). Screenshots: `-strip.png`, `-chips.png`, `-session.png`,
`-game.png`. Delete the two chats you made when the row is done.

## D2.3: Undo, then Down, with the page out of focus (row P102-UNDO-FOCUS-01; evidence `plan103-P102-UNDO-FOCUS-01-try3.json`)

Two nights running the page kept the window's focus and this row could not be shown. One more try, and this time the
walk is run either way.
1. Nothing running, the test chat, Strategy. One question that attaches a Deep Rock Galactic: Survivor note (name the
   game; a boss or an enemy; your own words). **Open Show details and leave it open.**
2. Unload the AI; `free -m`; launch Deep Rock Galactic: Survivor; 30 seconds; close and reopen Quick Access. If Show
   details closed, open it again.
3. Walk to Not really, A; Wrong tip, A; the note (if "Which note was it?" shows), A. "Marked not helpful / Undo" shows
   with Undo holding the ring.
4. **Before any further press, read `document.hasFocus()`.** If it reads true, close and reopen Quick Access and read
   again, up to six times (the Undo line may be gone after a reopen: then put the ring on the reply row's first stop
   and say so).
5. **Down four times,** the ring and the page's focus read after each press, whatever step 4 read. Write where each
   press landed.
   - Page out of focus: **PASS** only if every press moves the ring to a new stop and the walk goes through the open
     details panel (the notes line if drawn, the strip, the chips) instead of jumping past it to the suggestion chips.
   - Page in focus all six times: **NOT REPRODUCIBLE, third night** for the out-of-focus half, with the four landings
     recorded as "in focus" evidence (they must still go through the strip).
6. Undo the mark if it is still set (the "Lowered notes" row in the Ollama tab clears it if not). Exit the game;
   confirm with `pgrep`.

## D2.4: not run in this block, and why (write these two lines into the handover)

- **P103-PICTURE-SEARCH-01:** runs only if your task says the picture search landed switched on. If the task says
  nothing about it, it is off: no row.
- **P103-STARTER-BOX-01 on the PC stand-in:** not run. The box opens only on a machine with no models, and its Cancel
  button installs the AI engine, so it cannot be opened safely on a machine in use. It stays a hand check for the
  maintainer on a fresh install; its fit is proven by its tests' arithmetic.

## D2.5: the look check and the sweep (rows QA-LOOK-01-p103-d2 and P103-D2-SWEEP)

Nothing running: the look check on Main with (1) a step list on screen and (2) Show details open with the strip and
the chips on screen (nothing pressed against the right edge, cut off, overlapping or hidden behind the dock;
screenshots `-steps.png`, `-details.png`). Then the free-play sweep on Main with nothing running, Show details open on
the newest answer. Then, only if `free -m` shows 3,000 MB or more available with the AI unloaded: launch Deep Rock
Galactic: Survivor, wait 40 seconds, the sweep again with no question asked, exit the game, confirm with `pgrep`. No
stop twice, no lost ring; record the stop counts.

## D2.6: handover (`103-handover-D2.md`)

The mode chip left on Strategy; the two chats you made deleted (never the maintainer's three, never the test chat or
the long chat); no game; the AI unloaded; the hold released. The handover: the build hash; each row's verdict in one
line with its evidence file; how many tries read the page out of focus; the scroll finding on entering the chips;
anything that surprised you; the Deck's state as you leave it.
