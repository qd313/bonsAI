# Redesign the open tab bar — design brief

Written 2026-09-14 for the maintainer to take to Claude Design. Every number and colour below was
read from the code or measured on the Deck on 2026-09-02. If the code disagrees, the code is right.

What is being redesigned: **the open strip only**. The thin bar at rest stays exactly as it is.
The plugin's own name for the whole thing is the collapsing tab bar, from
[../../../archive/30-collapsing-tab-bar.md](../../../archive/30-collapsing-tab-bar.md).

## Files in this folder

| File | What it is |
|---|---|
| `prompt-for-claude-design.md` | The text to paste into Claude Design, ready to go. |
| `today-rest-bar-2x.png` | Real Deck photo of the thin bar at rest, shown twice size. This is the part to keep. |
| `today-open-bar-2x.png` | Real Deck photo of the open strip, twice size. This is the part to replace. |
| `today-open-column.png` | The whole plugin column with the strip open, real size on a 1080p Deck output. |
| `today-rest-column.png` | The whole column at rest. |
| `bug-ghost-after-touch-bar-2x.png` | The ghost bug: after a tap the strip fades but a see-through copy stays. |
| `TodayOpen.dc.html` | The open strip drawn from the real stylesheet values, at the real 300px width. A starting board. |
| `icons.md` | The six tab icons as plain SVG, so a mockup can reuse or replace them. |

Attach the photos and paste the prompt. The rest of this file is the long form of the same brief,
for anyone who wants the reasons.

## 1. What a person sees today

The tab bar has two looks.

**At rest** it is one thin row, 20 pixels tall: LB at the left end, six short dashes with the current
tab's dash lit in the character's colour, the current tab's name in the same colour, and RB at the
right end. The maintainer likes this. **Do not change it.**

**Open** it becomes a strip 54 pixels tall that floats over the top of the panel. Six cells sit in a
row, each with an icon and a tiny name under it. The current tab's cell has a light fill and a
2-pixel box in the character's colour. It opens when the D-pad ring lands on the bar, or when a
finger taps the thin bar. It closes the moment the ring moves down into the panel, or on a tap.

## 2. What is wrong with the open strip

Taken from the real photo `today-open-bar-2x.png`:

- **The icons do not belong together.** The gear and lock are thin outlines. The llama is a solid
  silhouette with lots of detail. The About mark is a filled italic letter. The tree is an outline
  drawn heavier than the rest. Six icons, four different drawing styles.
- **The names are too small.** They are 8-pixel capitals. OLLAMA runs into the edge of MAIN's box.
  SETTINGS and PERMS crowd each other. There was never a by-eye sign-off on this size.
- **The lit cell is a hard box.** A sharp 2-pixel rectangle in the accent colour, with the name in the
  same colour, reads as a warning outline rather than a selection.
- **LB and RB are plain 9-pixel text.** Two rows lower, the chat row draws the same two hints as proper
  rounded pills. The two do not match.
- **The strip is see-through.** Its background is about 96 percent solid, so the thin bar's own name
  and the suggestion chips show through it. In the photo, a faint "MAIN" and "RB" sit above the strip.
- **It sits awkwardly on the chat row.** The strip is 54 pixels tall and the chat row under it is about
  55, so the row's little dots peek out under the strip's bottom edge.
- **Bonus bug:** after a tap the strip fades out but a see-through copy stays drawn on the chips
  (`bug-ghost-after-touch-bar-2x.png`). A design that does not fade, or that covers the row cleanly,
  may sidestep it.

The Main tab's tree icon is also on the roadmap for a redo on its own: flatter, more of a silhouette,
because it also renders at 14 pixels elsewhere. Whoever draws this strip may propose one. The
maintainer approves icon shapes by eye.

## 3. What must stay true

These are rules the code and the Deck impose. A mockup that breaks one cannot be built.

**Space**
- The column is **300 CSS pixels wide**. On a 1080p Deck output that is 384 real pixels. Design at
  300, never wider. The handheld screen has not been re-measured.
- The thin bar is 20 pixels tall with a 4-pixel gap under it. The panel body starts 24 pixels down and
  **never moves** when the strip opens. The open strip floats on top of whatever is below it.
- The open strip may be taller than 54 pixels. It may cover the whole chat row (about 55 pixels) if
  that looks cleaner. It should not cover the first answer bubble.
- Every size scales with the user's UI scale setting, which is 1 on the Deck and 1.18 on a TV. Nothing
  can rely on a fixed pixel measurement of text.

**Tabs**
- Six tabs in this order: **Main, Ollama, Settings, Permissions, Developer, About.** Developer is
  off by default, so most people see five.
- When Developer is on, the two long names are shortened to **PERMS** and **DEV** so six fit. That
  rule is fixed in the code; a design may drop it if six full names fit some other way.
- Names are not translated. English only.

**Colour**
- The ground behind the panel is Steam's own dark blue-black, `#0e141b`.
- Text is `#e8eef5`. Muted text is `#8fa8c4`. Dim text is `#6b7c90`.
- **The accent colour changes with the chosen AI character.** The default is forest green. There are
  about thirty others: gold, several reds, purple, teal, sky blue, orange, a grey, a pink. The lit tab
  uses that accent at 92 percent. **A mockup has to look right in green and in gold at least, and
  should not fall apart in grey or pink.**
- Focus rings everywhere else in the plugin are white. The tab bar is the one place that draws its own
  ring, in the accent, because the open strip itself is the sign that the ring is here.

**Type**
- The plugin uses Steam's own font (Motiva Sans). It loads no font of its own.
- Sizes used nearby: chat row title 12px, chat row LB/RB pills 11px, section labels 10px bold caps.

**Controller**
- The whole bar is **one stop** for the D-pad. The six cells are not separate stops. Left and Right
  switch the tab at once, and wrap at the ends. There is no "highlighted but not yet chosen" cell.
- LB and RB switch tabs from anywhere in the panel, except while the chat row holds the ring, where they
  cycle chats instead. **The LB and RB hints on the bar hide while the chat row has the ring**, without
  the layout shifting.
- Down closes the strip and drops the ring into the panel. Up leaves to the plugin's Back button.
  A does nothing. B inside the panel brings the ring back to the bar.
- Touch: a tap on the thin bar opens the strip, a tap on a cell switches and closes, a tap anywhere else
  closes.
- Opening and closing may fade. Nothing animates its height.

**Off limits**
- No setting to keep the strip open. No timer. No layout that pushes the panel down.
- No new permanent row anywhere. Vertical space is the scarcest thing in this plugin.

## 4. Today's exact values

Thin bar (keep):

| Piece | Value |
|---|---|
| Bar | 300 × 20, 8px inner padding each side, 10px between items |
| LB and RB marks | 9px bold caps, `rgba(168,182,198,0.62)` |
| Dashes | 14 × 3 each, 4px apart, `rgba(168,182,198,0.35)`; the lit one is 5 tall in the accent |
| Name | 11px bold caps, letter-spaced 0.08em, in the accent |

Open strip (replace):

| Piece | Value |
|---|---|
| Strip | 300 × 54, floats at the top, 6px inner padding, 2px between cells |
| Background | gradient `rgba(20,28,36,0.98)` to `rgba(12,18,24,0.96)`, 1px bottom line `rgba(156,231,255,0.18)` |
| Cell | at least 38 wide, 48 tall, 3px side padding, 6px corner radius |
| Measured cell widths | MAIN 38, OLLAMA 43, SETTINGS 48, PERMS 38, DEV 38, ABOUT 38; first cell starts 20px in, last ends at 273 |
| Icon box | 32 × 32; icons 24px, tree and bug 30px |
| Inactive icon | `rgba(168,182,198,0.62)` |
| Name | 8px bold caps, letter-spaced 0.06em, `rgba(168,182,198,0.5)` |
| Lit cell | fill `rgba(255,255,255,0.10)`, 2px ring in the accent, icon and name in the accent |
| Fade | 120ms |

## 5. Directions to try

Ask for one board per direction, all at 300 wide. These are starting points, not a menu to pick from
blindly. Two or three good ones and one wild one is better than six safe ones.

1. **Same layout, better craft.** Keep icon-over-name cells. One icon family, drawn to one stroke
   weight. Names at 9 or 10px with real breathing room, even if that means the six-tab case needs
   short names for more tabs. A softer lit cell: fill and an underline or a glow rather than a box.
2. **Icons only, one name.** Bigger icons, no name under each. The current tab's name shows once,
   large, either in the strip or where the thin bar's name already sits. Frees width for spacing.
3. **Names only.** No icons. Six names in a row like a segmented control, the lit one filled in the
   accent. Reads instantly, and it sidesteps the icon-family problem entirely.
4. **A taller card that owns the top.** Cover the whole chat row (about 60 to 64px). Solid background,
   no see-through. Room for icons at 28 and names at 10. Costs nothing, because the row under it is
   not in use while the strip is open.
5. **The dashes grow.** The six dashes of the thin bar stretch into the six cells in place, so the two
   states look like one thing. The lit dash becomes the lit cell.
6. **A wild one.** Anything the designer thinks fits Steam's Deck UI better than a row of cells.

For each board, show:

- The strip open on **Main**, in the default green and in Ali G's gold (`#f1c40f`).
- The strip open with **five tabs** (Developer off) and with **six**.
- The strip sitting over the chat row, so the overlap is visible.
- The thin bar at rest **unchanged** above a closed panel, for comparison.
- The LB and RB hints, and a note on how they hide without shifting the layout.

## 6. What to bring back

- One board per direction as an image at 300 wide, or as a `.dc.html` board in the style of the
  glance-view handoff in the folder beside this one.
- Every size and colour written down, not left inside the picture.
- Any new icon as plain SVG on a 24 × 24 box, stroke only or fill only, one style for all six.
- A one-line note on any rule in section 3 the board bends, so the build can push back early.

## 7. Where the pieces live in the code

For whoever builds the chosen board, not for the designer.

- The bar and strip: `src/features/plugin-shell/TabIndicatorBar.tsx`
- Its stylesheet: `src/styles/sections/tabIndicatorBar.ts`
- Names and short names: `src/features/plugin-shell/tabTitles.tsx`
- Sizes as constants: `src/features/unified-input/constants.ts` (the `TAB_BAR_` group)
- Icons: `src/components/icons.tsx`
- Accent colours per character: `src/data/characterUiAccent.ts`
- The rules behind the layout: [design-language.md](../../../design-language.md) and
  [design-tokens.md](../../../design-tokens.md)
