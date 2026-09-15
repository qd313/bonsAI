# Paste this into Claude Design

---

I want to redraw the suggestion chips in a Steam Deck plugin. Small, careful changes — not a
redesign. Please read the whole brief before drawing anything.

## What the thing is

bonsAI is a plugin that lives in the Steam Deck's Quick Access menu — a narrow strip down the right
side of the screen. It answers questions about the game you are playing.

At the bottom of its main screen there is a dock: a row of **suggestion chips**, then the question
box, then the Ask button. The chips are prompts you can tap instead of typing, and they change on
their own every few seconds. Tapping one drops its words into the question box.

**Only the chips are being redrawn.** The question box and the Ask button stay as they are.

## What it looks like today

Two boards come with this message. Both are drawn from the plugin's real stylesheet, at true size,
so trust their sizes and colours over anything you imagine.

- **Today** — the bottom of the screen as built, 300 pixels wide.
- **Every chip state** — each state a chip can be in, at its real width.

The exact numbers, if you want them in text:

| Piece | Value |
|---|---|
| The column | 300 pixels wide. Nothing may be wider. |
| A chip | 148 &#215; 30, corner radius 4, 8 pixels of padding each side |
| Two chips | side by side, 4 pixels apart, equal halves |
| Chip surface | dark blue-black at 22 percent, behind a 10-pixel blur |
| Chip outline | 1 pixel, white at 7 percent |
| Chip shadow | none |
| Label | 12 pixels, colour `#c4d3e2`, left aligned, one line |
| Long labels | scroll sideways, slowly, then stop |
| Under the row | 12 pixels, then the question box |
| Ground behind everything | Steam's own dark blue-black, `#0e141b` |

## What is wrong with it

The person who owns this plugin put it in one sentence: **a chip should look like something you can
press, not like part of the input box.** Today it is a nearly invisible rectangle — a 22 percent
fill and a 7 percent outline against a dark panel.

They asked for four changes, all small:

1. **A little space** between a chip and the box beside it, so the two stop touching.
2. **The surface shaded like a raised button**, not a flat pane.
3. **The accent colour toned down.** Today it is too loud.
4. **The label in italics** — worth trying, not settled.

Treat those four as the starting point, not the whole answer. If a fifth small change gets the
chips further, show it.

## Rules a drawing cannot break

- **300 pixels wide.** The column is the whole budget. There is no room for a decorative margin.
- **The row keeps its height.** This dock used to be three stacked rows and ate half the screen.
  It is one row now and it stays one row. A chip may grow a pixel or two if you say why; it may not
  become two rows.
- **The words must still be readable.** There is room for about 20 characters per chip before the
  label starts scrolling. Anything that steals width — a bigger inset, an icon, a corner flourish —
  costs readable words, and that is the expensive trade here. Say what your board costs.
- **The colour changes with the character.** The person picks an AI character and its colour runs
  through the plugin. The default is a forest green, `#2e8753`. There are about thirty more: gold,
  several reds, purple, teal, sky blue, orange, a grey, a pink. **Draw your chip in green and in
  gold at least, and check it does not fall apart in grey or pink.**
- **The focus ring is not yours.** Steam draws its own white ring on whatever the D-pad is on.
  Nothing on a chip may look like a ring. There is already one near-miss: a pale blue outline that
  marks which chip the carousel considers current. That one was mistaken for a focus ring on the
  device once, so keep anything new clearly different from an outline.
- **Steam's own font.** The plugin loads no font of its own. Assume Motiva Sans.
- **Everything scales.** A person can set the whole interface larger. Nothing may depend on a fixed
  pixel measurement of text.
- **No new row anywhere.** Vertical space is the scarcest thing in this plugin.

## The states a chip has

Your board has to survive all of these. They are all on the second board.

- **At rest**, and **fading out** — while the chip swaps to a new prompt it dims, goes
  see-through, and shrinks very slightly.
- **Current** — a pale blue outline marks which chip the carousel is on, drawn only while the
  D-pad is on the row.
- **Out of chips** — press past either end and the chip at that end glows blue for a third of a
  second.
- **Tip** — a small badge at the left, in the character's colour, meaning the plugin has its own
  notes on this game.
- **Test** — the same badge in amber, meaning a fixed set of chips was pinned for checking.
- **`[beta]`** — a small italic tag at the right for a feature that is still new.
- **Decode** — one of four animation styles; the whole label sits in the character's colour while
  the letters resolve.
- **One chip** — a setting turns the row into a single chip across the full width.
- **The help chip** — a green chip that owns the whole row until it is dismissed.
- **The agent suggestion chip** — an orange chip that appears under the row on its own.

## What to draw

One board per direction, all 300 pixels wide, all showing the chip row in the dock the way the
Today board does — chips, the gap, the question box below. Two or three good directions and one
wild one beats six safe ones.

Some starting points:

1. **The four changes, done well.** Nothing else. A raised surface, a touch more separation, a
   quieter accent, italic labels. This is the one to get right.
2. **A real button.** Lift it properly: a top-light, bottom-dark gradient, a hairline highlight on
   the top edge, a soft shadow beneath. Make it clearly a thing to press.
3. **A softer pill.** A rounder corner and a flatter, warmer fill — closer to a tag than a button.
4. **The row reads as a set.** Let the two chips share one enclosing shape, so the row is obviously
   a strip of choices rather than two floating boxes.
5. **Something wilder** — whatever you think fits the Deck's own look better than a row of boxes.

For each board, show:

- The chip row at rest, in the default green and in gold (`#f1c40f`).
- One chip carrying a **Tip** badge, and one long label cut off with an ellipsis.
- The **current** outline and the **out of chips** glow, or whatever replaces them.
- The row sitting over the question box, so the gap between them is visible.
- The single-chip look at full width.

## What to hand back

- One board per direction as a `.dc.html` artboard, 300 wide, in the style of the two attached.
- Every size and colour written down, not left inside the picture.
- One line per board saying what it costs: how many readable characters are left in a chip, and
  whether the row got taller.
- One line on any rule above that the board bends, so the build can push back early.

## One thing to decide

"A little space between the chip and the box beside it" could mean two things, and nobody has
settled it: the 4 pixels between the two chips, or the 12 between the row and the question box.
Draw whichever you think is the real problem and say which one you chose.
