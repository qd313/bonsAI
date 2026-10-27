# bonsAI mods board

Clickable mock-ups for one roadmap item, **Deep mod AI hints** ([plan 101](../../planning/101-deep-mod-ai-hints.md)):
the Mods screen, where it opens from, what it shows and what it controls. Drawn at the Deck's real size in Steam's
own font and colours, on the second board's kit. Started 2026-10-27, the maintainer's call in plan 101 round 3
("We'll need mock-ups done").

**Live page (private to the maintainer):** https://claude.ai/artifact/7XcZLtdYhEdvDpXS8bsYfG

Picks (**Like** / **Not this**) and comments are saved inside that page, not in this folder. Open it in a web browser
signed in to claude.ai, not in the Claude app's own panel: the panel cannot reach the saved picks and loses them on
reload.

`bonsai-mods.html` is made by `sh build.sh` from the parts in `src/`, and is not stored in git (see `.gitignore`).

## Where things stand

| Tab | Roadmap item | Stars | Status |
|---|---|---|---|
| 1 | Deep mod AI hints: the Mods screen | ★★★★★★ | **Round 1 drawn 2026-10-27, waiting for the maintainer's picks.** A: a door in the paperclip menu, a full-screen popup. B: a Mods row on the Search tab (the maintainer's idea), a sheet inside the tab. C: both doors, one sheet. D: the permission switch and its confirm box, drawn to be read, not picked against the others |

**Next step:** the maintainer picks on the page; the planning chat reads the picks, writes the pick into plan 101
(round 3, question 2) and decision D138, and redraws if a second round is asked for.

## What the drawings are filled with

The maintainer's own Cyberpunk 2077 setup, read from the CyberFixed folder on 2026-10-27 (plan 101 § 4): Vortex with
133 mods, the five frameworks and their versions, the load order of four, the script mods, the archives. The
adult-content mod names are left out on purpose, since this folder is in the public repo.

## How the review works

Same as the other two boards: the maintainer plays with each panel, picks and comments; Claude reads them with
`ArtifactData` `list` on the page URL (collections `picks`, ids like `t1-A`, and `comments`, keyed `t1-A` or
`t1-overall`), redraws, and republishes the same file. Write everything to the maintainer in plain language, one
step at a time.

## For the session doing the work

- The kit is the density board's (`docs/demos/mockup-board-2/src`: the page head, the panel styles, the dense rows,
  the D-pad engine and the boot), read at build time by `build.sh` rather than copied, with the page title, the
  browser storage keys and the four font ids changed on the way. A change to that kit changes this board too.
- `40-mods.css` and `41-mods.js` are this board: the paperclip menu (the inline popover idiom from
  design-tokens.md), the Mods sheet and the full-screen popup, the Search tab pieces (from the first board's
  tab 8), the Permissions row and its confirm box, and the board tab with its four options.
- Publish `bonsai-mods.html` with the `Artifact` tool and the page URL as `url`; leave `capabilities` and `icon`
  out on a republish so the saved picks and the font files stay connected.
- Check before publishing: `node --check` on the script part, then one load in a headless browser driving each
  option with key presses (the planning chat's script did: the menu, the popup, the sheet, the confirm box).
- The four Motiva Sans files were copied from the density board's own storage into this page's (the Artifact
  tool's asset copy); `10-head.html` names them by id. **Valve owns the font: never add the files to the repo or
  to a public page.**

## Picking up in a new conversation

Start a new session on the `experimental` branch and paste this:

> Continue the bonsAI mods board review. Read docs/demos/mockup-board-3/README.md and plan 101 § 7, then read my
> picks and comments on the mock-up page and write the pick into plan 101. Plain language, one step at a time, and
> wait for me to say "proceed" before the next step.
