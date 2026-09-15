# Make the suggestion chips look like chips — design brief

Written 2026-09-14 for the maintainer to take to Claude Design. Every number and colour below was
read out of the code on that date. If the code disagrees, the code is right and this file is a bug.

What is being redrawn: **the suggestion chips only**. The question box and the Ask button under
them stay exactly as they are.

The ask this comes from is the roadmap entry *Make the preset chips look more like chips*, filed by
the maintainer on 2026-09-13.

## Files in this folder

| File | What it is |
|---|---|
| `prompt-for-claude-design.md` | The text to paste into Claude Design, ready to go. |
| `Today.dc.html` | The bottom of the Main tab as built, at true size, drawn from the real stylesheet. |
| `States.dc.html` | Every state a chip can be in, each at its real width. |
| `canvas.json` | Lays the two boards out on one canvas with notes. |

**How to hand it off:** open a Claude Design chat, attach all four files, and paste the contents of
`prompt-for-claude-design.md`. Nothing else is needed. If you have a photo of your own Deck with the
chips on screen, attach that too — a real photo beats a drawing every time.

The rest of this file is the long form, for anyone who wants the reasons.

## 1. What a person sees today

At the bottom of the main screen there is a dock: a row of suggestion chips, the question box, then
the Ask button.

The chips are prompts you can tap instead of typing — *"What are the best FSR settings?"*, *"Why is
my Deck running hot?"*. Two sit side by side. They change on their own every few seconds. Tapping
one puts its words in the question box, and a few of them also switch the answer style.

A chip today is a rectangle 148 by 30 with a 4-pixel corner. Its fill is the panel's own dark
blue-black at 22 percent and its outline is white at 7 percent. Against the panel behind it, that is
very nearly nothing.

## 2. What is wrong

The maintainer's sentence: **a chip should read as a pressable thing rather than part of the input.**

Four changes were asked for, all small and none of them a redesign:

- A little space between a chip and the box beside it, so the two stop touching.
- The surface shaded more like a raised button.
- The accent colour toned down — today it is too loud.
- The label in italics, worth trying.

**One of those is not settled.** "The box beside it" could be the other chip, 4 pixels away, or the
question box, 12 pixels below. The brief asks the designer to pick one and say which.

## 3. What must stay true

These are rules the code and the device impose. A drawing that breaks one cannot be built.

**Space**

- The column is **300 pixels wide**. That is the whole horizontal budget; there is no room for a
  decorative margin. On a 1080p Deck output that is 384 real pixels. Design at 300, never wider.
- A chip is **148 wide** — half the column, minus the 4-pixel gap.
- **The row stays one row.** This block used to be three stacked rows and took 118 of the dock's
  245 pixels. It was cut to one row on 2026-09-01 and that height is not going back.
- Under the row: 12 pixels, then the question box.
- Everything scales with the interface-size setting, which is 1 on the Deck and 1.18 on a TV.
  Nothing can depend on a fixed pixel measurement of text.

**Words**

- There is room for about **20 characters** before a label starts scrolling. Two chips across
  rather than three was chosen for exactly this reason: three left about 12 characters each.
- A long label scrolls sideways through Steam's own scrolling label — slowly, after a pause, once.
  Where that is not available it is cut off with an ellipsis instead.
- Anything that steals width costs readable words. That is the expensive trade in this piece of
  work, and a board should say what it costs.

**Colour**

- The ground behind the panel is Steam's own dark blue-black, `#0e141b`.
- Label text is `#c4d3e2`. A fading chip goes to `#8fa3b8`.
- **The accent changes with the chosen AI character.** The default is forest green `#2e8753`. There
  are about thirty others. A board has to look right in green and in gold at least, and should not
  fall apart in grey or pink.
- The pale blue (`#38bdf8` family) is used twice on the chips: for the current-chip outline and the
  out-of-chips glow. It is the plugin's focus-adjacent colour and reads as "the ring is near here".

**Focus**

- Steam draws its own white ring on whatever the D-pad is on. **Nothing on a chip may look like a
  ring.** The current-chip outline was mistaken for one on the device on 2026-08-28 — it fooled the
  maintainer and the test rig at the same time — which is why it is now drawn only while the row
  actually holds the ring.
- The whole row is one stop. Left and Right walk between chips, Down goes to the question box, Up
  goes to the answer. Left at the first chip and Right at the last stay put and glow.

**Type**

- Steam's own font, Motiva Sans. The plugin loads no font of its own.
- The label is 12 pixels. The Tip and Test badges are 9, bold, capitals. The `[beta]` tag is 10,
  italic.

**Off limits**

- No second row. No taller dock. No icon that costs more than a few characters of label.

## 4. Today's exact values

| Piece | Value |
|---|---|
| Chip | 148 &#215; 30, radius 4, padding `0 8px`, `box-sizing: border-box` |
| Surface | `rgba(18,26,34,0.22)`, behind a 10-pixel backdrop blur |
| Outline | `1px solid rgba(255,255,255,0.07)` |
| Shadow | none |
| Label | 12px, `#c4d3e2`, line height 1.2, left aligned, one line |
| Gap between chips | 4px |
| Gap under the row | 12px |
| Fading out | colour `#8fa3b8`, see-through 55 percent, scaled to 96 percent, over 420ms |
| Current-chip outline | outline colour becomes `rgba(56,189,248,0.45)` |
| Out-of-chips glow | outline `rgba(56,189,248,0.85)`, glow `0 0 8px 1px rgba(56,189,248,0.45)`, held 320ms |
| Tip badge | 9px, bold, capitals, letter-spaced 0.06em, in the character's colour, 6px to its right |
| Test badge | the same, in amber `#f0b232` |
| `[beta]` tag | 10px, italic, 600 weight, in the character's colour, 6px to its left |
| Decode look | the whole label sits in the character's colour |
| One-chip setting | one chip, the full 300 |
| Help chip | full width, green gradient `rgba(46,135,83,0.28)` to `rgba(18,52,34,0.48)`, 1px outline in the accent, text `#dff5ea` |
| Agent suggestion chip | full width, 2px outline `rgba(255,107,53,0.92)`, fill `rgba(38,22,18,0.38)`, text `#f0ddd6` |
| A chip holds | about 20 characters before the label scrolls |

## 5. What to bring back

- One board per direction as a `.dc.html` artboard, 300 wide, in the style of the two here.
- Every size and colour written down, not left inside the picture.
- One line per board on what it costs: readable characters left in a chip, and whether the row got
  taller.
- One line on any rule in section 3 the board bends, so the build can push back early.

## 6. Where the pieces live in the code

For whoever builds the chosen board, not for the designer.

- The row: `src/components/MainTabPresetRow.tsx`
- The chips, all four animation styles, and the badges: `src/components/MainTabPresetAnimatedChips.tsx`
- Sizes as constants: `src/features/preset-carousel/presetRowLayout.ts`
- Layout and state stylesheet: `src/styles/sections/section-4.ts`
- Surface and outline: `src/styles/sections/section-6.ts`
- The prompts themselves: `src/data/presets.ts`
- D-pad wiring: `src/features/preset-carousel/presetRowNav.ts`
- Sideways motion: `src/features/preset-carousel/carouselState.ts`
- Accent colours per character: `src/data/characterUiAccent.ts`
- The rules behind the layout: [design-language.md](../../../design-language.md) and
  [design-tokens.md](../../../design-tokens.md)
