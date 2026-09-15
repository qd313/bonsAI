# Paste this into Claude Design

Attach `today-rest-bar-2x.png`, `today-open-bar-2x.png` and `today-open-column.png` with it.

---

I am redesigning the tab bar of a Steam Deck plugin. It lives in the Deck's Quick Access Menu, a
dark side panel 300 pixels wide. I want mockups of the **open** tab bar, drawn at the real 300 pixel
width, in several different directions.

**What exists now.** The bar has two states. At rest it is a thin 20 pixel row: "LB" at the left,
six short dashes with the current tab's dash lit in an accent colour, the current tab's name in the
same colour, "RB" at the right. I like this and it stays exactly as it is. (See the photo
`today-rest-bar-2x.png`.)

When the D-pad lands on it, or a finger taps it, it opens into a 54 pixel strip that floats over the
top of the panel: six cells in a row, each an icon with a tiny name under it, the current one with a
light fill and a 2 pixel box in the accent colour. (See `today-open-bar-2x.png` and
`today-open-column.png`.) This is the part I do not like.

**What is wrong with it.**
- The six icons are drawn in four different styles: thin outline gear and lock, a detailed solid
  llama, a filled italic "i", and a heavier outline tree.
- The names are 8 pixel capitals, too small, and they crowd each other. OLLAMA touches MAIN's box.
- The lit cell is a hard rectangle in the accent colour. It reads as a warning, not a selection.
- LB and RB are plain 9 pixel text, while two rows lower the plugin draws the same hints as rounded
  pills.
- The strip is slightly see-through, so the thin bar's name and the chips below leak through it.
- It is 54 pixels tall over a chat row that is 55, so the row's dots peek out underneath.

**Rules that cannot change.**
- 300 pixels wide. Design at that width, never wider.
- The strip floats over the panel. Nothing below it moves when it opens or closes. It may be taller
  than 54 pixels and may cover the whole chat row (about 55 pixels), but not the first answer bubble.
- Six tabs, in this order: Main, Ollama, Settings, Permissions, Developer, About. Developer is off
  by default, so most people see five. Today the two long names shorten to PERMS and DEV when six
  are shown. Names are English only.
- The accent colour changes with the chosen AI character. Default is forest green (#2e8753). There
  are about thirty others: gold (#f1c40f), reds, purple, teal, sky blue, orange, grey, pink. The
  design must look right in green and gold at least, and must not fall apart in grey or pink.
- Ground colour behind the panel is #0e141b. Text #e8eef5, muted #8fa8c4, dim #6b7c90. Font is
  Steam's Motiva Sans (system sans in the mockup is fine).
- The whole bar is one D-pad stop. The six cells are not separate stops. Left and Right switch the
  tab at once and wrap at the ends. There is no "highlighted but not chosen" cell. So the lit cell is
  always the current tab.
- The LB and RB hints on the bar must be able to hide without the layout shifting (they hide while
  the chat row has focus, because the bumpers do something else there).
- Opening and closing may fade. Nothing animates height. No timer, no setting to hold it open, no
  new permanent rows anywhere.
- Everything scales with a UI scale of 1 or 1.18, so text cannot depend on exact pixel fitting.

**Today's values, for reference.** Strip 300 × 54, 6px inner padding, 2px between cells. Cells at
least 38 wide and 48 tall, 6px radius. Icon box 32, icons 24 (tree and bug 30). Inactive icon
rgba(168,182,198,0.62), name 8px bold caps rgba(168,182,198,0.5). Lit cell fill
rgba(255,255,255,0.10) plus a 2px accent ring, icon and name in the accent. Background gradient
rgba(20,28,36,0.98) to rgba(12,18,24,0.96) with a 1px bottom line rgba(156,231,255,0.18).

**Directions I want to see, one board each.**
1. Same layout, better craft: one icon family at one stroke weight, names at 9 or 10px with room,
   a softer lit cell (fill plus underline or glow, not a box).
2. Icons only, bigger, with the current tab's name shown once, large.
3. Names only, no icons, like a segmented control with the lit segment filled in the accent.
4. A taller solid card, 60 to 64 pixels, that covers the chat row cleanly, with icons at 28 and
   names at 10.
5. The six dashes of the thin bar grow into the six cells in place, so rest and open look like one
   thing.
6. One wild option of your own that fits the Steam Deck's own UI.

**For each board, show:** the strip open on Main in green and in gold; the five-tab and six-tab
cases; the strip sitting over the chat row so the overlap is visible; the thin bar at rest,
unchanged, for comparison; and the LB and RB hints.

**Bring back:** each board at 300 wide, every size and colour written down beside it, any new icons
as plain 24 × 24 SVG in one style, and a one-line note on any rule above the board bends.
