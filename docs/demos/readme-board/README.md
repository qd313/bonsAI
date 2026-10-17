# bonsAI README board

Clickable mock-ups of the new README, drawn the way GitHub shows a page (its type, sizes, colours,
light and dark). Started 2026-10-17 for the README refresh (plan 95). A board of its own, not a tab
on the earlier two boards, because it draws GitHub pages, not the Deck panel.

**Live page (private to the maintainer):** https://claude.ai/artifact/ET68KNvGugiz6ELumhsFtV

Picks (**Like** / **Not this**) and comments are saved inside that page, not in this folder. Open it
in a web browser signed in to claude.ai, not in the Claude app's own panel: the panel cannot reach the
saved picks and loses them on reload.

`readme-board.html` is made by `sh build.sh` from the parts in `src/`, and is not stored in git (see
`.gitignore`). The build pulls one frame from each of today's GIFs in `assets/readme/` with ffmpeg as
the stand-in pictures; those stills are not stored in git either.

## The tabs

Every tab is decided as of 2026-10-17 evening. The plan ([docs/planning/95-readme-refresh.md](../../planning/95-readme-refresh.md)) § 11 lists what the README becomes. Next is the "go" and then the build.

| Tab | What it decides | Status |
|---|---|---|
| 1 | The shape of the whole page: today's run of headings and GIFs, a fold per feature with the clip beside the text, a jump list with every feature open, a feature table, or the long video on top | Round 1 (2026-10-17): B and C liked, lean B; asked for an "expand all" toggle (GitHub can't) and for the sides to alternate. Round 2 (2026-10-17): **F decided**, folds with the first open and the sides alternating, without the "Pick a feature" line; US spelling everywhere |
| 2 | One feature section at full size: clip under, right of or left of the words; plugin-only or whole-screen clip; a fold; a video file with a play button instead of a GIF | Decided 2026-10-17: B and C both liked, so the sides alternate down the page; E not liked ("why shown twice?": it was closed then open) |
| 3 | The top of the page: still picture, the two-minute video, badges and a boxed promise, or words beside the picture | Round 1: C liked, with a plugin-only picture and no game branding at the top. Round 2 (2026-10-17): **F decided**, two plugin-only pictures side by side under the badges, the promise in a box |
| 4 | Before you start, What you need, Install: step titles, headings, a table, or folds | Decided 2026-10-17: B, the warning box and a heading per step |
| 5 | Wording: eight passages, each as it stands now (with the maintainer's strike-throughs and notes) and a cleaned version | Round 1: W3, W4, W5, W7, W8 liked; their words for W1, W2, W6 (drop the tips), W7 ("and even Steam's own settings"); no comma before "and". Round 2 (2026-10-17): **W1b decided** with their exact words, **W2b** with the places in bold, **W6b**, **W7b** |

## What GitHub can and cannot draw

GitHub's pages run no scripts and keep no styles, so a real dropdown is impossible. What the board uses
instead, all of which GitHub renders: `<details>` folds, link lists, tables for side-by-side, `<img
width>`, alert boxes (`> [!NOTE]`, `> [!WARNING]`), and video files uploaded by hand on github.com
(they render as a player with a play button; up to 10 MB each on a free account).

## How the review works

Same as the earlier boards: the maintainer plays with each card, picks and comments; Claude reads them
with `ArtifactData` `list` on the page URL (collections `picks`, ids like `t1-B` or `t5-W2`, and
`comments`, keyed the same way or `t1-overall`), redraws, and republishes the same file. Write everything
to the maintainer in plain language.

## For the session doing the work

- `10-head.html` holds the page's styles: the board's own, and a `.gh` block that copies GitHub's
  page rules (fonts, 16 px, 980 px wide, heading rules, tables, folds, alerts) in both themes.
- `20-content.js` is the README's content as one list of features plus the fixed parts. Every drawing
  reads from it, so a wording change lands everywhere at once.
- `30-store.js` is the save code, copied from the density board with a new storage key.
- `40-github.js` draws the page: the title block, the contents list, each part in each shape, and
  the video stand-ins (`video()` draws a GIF tag or a play bar).
- `50-tabs.js` is the five tabs and their options; `90-boot.js` builds the page.
- Publish `readme-board.html` with the `Artifact` tool and the page URL as `url`; leave `capabilities`
  and `icon` out on a republish so the saved picks stay connected.
