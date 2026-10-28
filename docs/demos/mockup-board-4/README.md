# bonsAI jobs board

Clickable mock-ups for one feature idea the maintainer raised on 2026-10-28, not yet on the roadmap: **bonsAI working
on its own**, in three situations. A game that dies at launch (bonsAI notices, offers to look, answers). A longer job
while you play ("make my Cyberpunk mod loadout run better", run on the PC's AI now or on the Deck once the game stops).
Help outside Game Mode (a guided checklist for setting up Heroic; Desktop Mode through a Big Picture window today; a
bonsAI page in the desktop browser later). Drawn at the Deck's real size in Steam's own font and colours, on the
density board's kit and the mods board's pieces. Started 2026-10-28, the maintainer's ask in the planning chat ("Draw
mockups now for how they would look").

**Live page (private to the maintainer):** https://claude.ai/artifact/KJEB5JoCVEuKGv2AgSr5Ws

Picks (**Like** / **Not this**) and comments are saved inside that page, not in this folder. Open it in a web browser
signed in to claude.ai, not in the Claude app's own panel: the panel cannot reach the saved picks and loses them on
reload.

`bonsai-jobs.html` is made by `sh build.sh` from the parts in `src/`, and is not stored in git (see `.gitignore`).

## Where things stand

| Tab | Situation | Stars (a guess) | Status |
|---|---|---|---|
| 1 | A game dies at launch: a notice (A) or a quiet offer (B); a one-press fix as the maintainer's call (C); the switches (D) | ★★★★ with the shared job engine | **Round 1 drawn 2026-10-28; no picks yet** |
| 2 | A longer job while you play: typed, on the PC's AI (A); from a chip, the result a sheet, reports on the Search tab (B); on the Deck, waiting for the game to stop (C) | ★★★ on top of plan 101 | **Round 1 drawn 2026-10-28; no picks yet** |
| 3 | Help outside Game Mode: a guided checklist in the plugin (A); Desktop Mode today through a Big Picture window (B, zero build); a bonsAI page in the desktop browser (C, four to five stars) | ★★★★ | **Round 1 drawn 2026-10-28; no picks yet** |

**Next step:** the maintainer's picks and the six scope questions from the planning chat (where the AI runs; the
notice on for everyone or behind a switch, and whether a one-press fix is allowed; a report plus checklist enough
for a first version; the Big Picture route or the desktop page; plan 101 first or fold the launch-failure job in;
which real cases prove it). Then the roadmap entry (the bookkeeper writes it) and a plan.

## What the drawings are filled with

The maintainer's own Cyberpunk 2077 setup from the mods board (plan 101 § 4): Vortex with 133 mods, the five
frameworks, the load order of four, the crowd and reactivity mods. The launch-failure answer quotes a RED4ext log
line that is **made up to look real** ("Codeware 1.18.1 needs game 2.31; this game is 2.3"); the board says so. The
frame-rate cost in tab 2 is the measured one from the roadmap (about a third while the Deck's model writes). The
adult-content mod names are left out on purpose, since this folder is in the public repo.

## How the review works

Same as the other boards: the maintainer plays with each panel, picks and comments; Claude reads them with
`ArtifactData` `list` on the page URL (collections `picks`, ids like `t1-A`, and `comments`, keyed `t1-A` or
`t1-overall`), redraws, and republishes the same file. Board tab ids: `t1` the launch failure, `t2` the longer job,
`t3` outside Game Mode. Write everything to the maintainer in plain language, one step at a time.

## For the session doing the work

- The kit is the density board's (`docs/demos/mockup-board-2/src`: the page head, the panel styles, the dense rows,
  the D-pad engine and the boot) and the Search tab and Mods sheet pieces are the mods board's
  (`docs/demos/mockup-board-3/src/40-mods.css`, `41-mods.js`), both read at build time by `build.sh` rather than
  copied, with the page title, the browser storage keys and the four font ids changed on the way. The mods board's
  own tab is removed again at the top of `41-jobs.js`; only its functions are used. A change to either kit changes
  this board too.
- `40-jobs.css` and `41-jobs.js` are this board: the half-size Deck screen with a plugin notice, the offer and job
  cards in the chat, the job runner with its sheet (steps tick, Stop, B hides) and the working line above the chips,
  the tick-off checklists (in an answer and as a sheet), the guided checklist sheet, the switches, and the two
  half-size Desktop Mode drawings (the Big Picture window holds the real panel at half zoom).
- Publish `bonsai-jobs.html` with the `Artifact` tool and the page URL as `url`; leave `capabilities` and `icon`
  out on a republish so the saved picks and the font files stay connected.
- Check before publishing: `node --check` on the script part, then one load in a browser driving each option
  (the planning chat's script ran every Play it through, the confirm box in tab 1 C, the switches in D, the report
  sheet, the Search tab's Reports row and the Mods sheet from inside it in tab 2 B, and the guide's tick and Check
  again in tab 3 A). A hash-only change of the address does not reload the page; add a query string.
- The four Motiva Sans files were copied from the mods board's own storage into this page's (the Artifact tool's
  asset copy); `build.sh` names them by id. **Valve owns the font: never add the files to the repo or to a public page.**

## Picking up in a new conversation

Start a new session on the `experimental` branch and paste this:

> Continue the bonsAI jobs board review. Read docs/demos/mockup-board-4/README.md, then read my picks and comments
> on the mock-up page and tell me what you make of them. Plain language, one step at a time, and wait for me to say
> "proceed" before the next step.
