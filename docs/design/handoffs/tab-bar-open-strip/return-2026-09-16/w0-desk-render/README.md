# Desk render of board 2a, 17 September 2026 (plan 59, step W0)

A drawing only; nothing in the plugin changed. The strip from board 2a was drawn from the numbers
plan 59 §3 turns the board into, next to the strip the plugin draws today, and measured in a
browser. This computer lacks the Deck's own font, so every render used a stand-in: sizes and
spacing match, letters may look slightly different. The Deck evening (plan 59 §7) is the judge.

## What the numbers show

### a) Does the strip's bottom edge survive its own effects?

Yes. Checked pixel by pixel: the dark bar, then a thin lighter line, then a darker shadow
underneath, show up as three separate bands. None wipes out another. `edge-4x-tight.png` is the
close-up.

### b) How heavy does the tree logo look next to the gear and lock?

Heavier, not lighter.

| Icon | Ink, as a share of the gear's |
|---|---|
| Tree (Main) | 1.72 |
| Ollama | 0.89 |
| Gear (Settings) | 1.00 |
| Lock (Permissions) | 0.76 |
| Bug (Developer) | 0.83 |
| "i" (About) | 0.43 |

The tree is a solid filled shape, so it reads bolder than the thin-outline icons at the same size.
It already fills its own square edge to edge, so cropping it bigger (the design file's "150% crop"
note) would make an already-heavy icon heavier, not lighter. The build leaves it at 22px as drawn.

### c) Does the lit name spill past its cell at six tabs (cells about 39px wide)?

With small, shrunk capitals (as drawn), nothing spills over. With plain, full-size capitals (the
fallback in D109 item 4 if small capitals read too small on the Deck), two words touch or spill past
the edge.

| Word | Small caps | Plain caps |
|---|---|---|
| main | fits, 8px to spare | fits, 6px to spare |
| ollama | fits, 3px to spare | just touches the edge |
| settings | fits, barely | spills over by about 3px each side |
| perms | fits, 6px to spare | fits, 4px to spare |
| dev | fits, 12px to spare | fits, 10px to spare |
| about | fits, 6px to spare | fits, 3px to spare |

### d) How much of the row of dots shows below the strip?

All of it, at 54 and at 56. The plan's premise of "a sliver of the dots" was wrong: measured on the
Deck photo of 14 September (`../../today-open-column.png`, 385px wide for a 300 CSS px panel), the
dots row sits 6 to 10px below a 54px strip's bottom edge, and the chat row's bottom line about 15px
below it. So 56 (D109 item 3's fallback) covers nothing. Covering the dots needs about 66; covering
the whole chat row about 72.

`height-options.png` draws the new strip over that photo at 54, 66 and 72 beside the photo as it is,
and below them Astarion's lit tab in the rule's mid grey (#95a5a6) and the designer's hand-picked
lighter grey (#c3d0d1). Shown this on 17 September, the maintainer chose 66 (cover the dots, leave
the rest of the chat row) and the designer's grey. The build carries both; the exact height is
confirmed on the Deck (plan 59 row 2A-07).

### e) Where the design file and the plan disagree

- Its own "About" icon, in its drawn strip, is a plain circle with a dot, not the tilted "i" its
  own instructions call for. The build uses the code's tilted "i".
- It draws the gear and lock a little thicker than the real code does (a small, known gap).
- Its note that "settings" spills over its cell by about 2px only showed up here with plain
  capitals, not with small capitals as drawn. Worth checking again with the Deck's own font.
- It mentions cropping the logo bigger to match a zoom used elsewhere; nothing in the code does
  that today, and (see b) there is no spare room to crop into anyway.

## Files

- `render.html`: the drawing, self-contained (icon symbols inline); open it in any browser.
- `render-2x.png`: the drawing at twice the size. `render-for-maintainer.png`: the cut sent to the
  maintainer on 17 September.
- `height-options.html` / `height-options.png`: the three heights and the two greys over the Deck
  photo (the page reads the photo from two folders up).
- `measurements.json`: the boxes pulled from the drawing (strip, cells, icons, names) per variant.
- `icons-ink.json` / `icons-ink.png`: the icon-weight counts and the picture they were counted on.
- `edge-4x-tight.png`: the strip's bottom edge, close up, at four times the size.
