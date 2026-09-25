# 59 — Building the open tab strip redesign (Claude Design board 2a)

Written 2026-09-16 by the planning session, before any code. This is the build plan for the design
Claude Design handed back on 16 September, answering the brief the maintainer took to it on
14 September ([docs/design/handoffs/tab-bar-open-strip/](../design/handoffs/tab-bar-open-strip)).
The returned files are stored beside that brief, in
[return-2026-09-16/](../design/handoffs/tab-bar-open-strip/return-2026-09-16). Nothing here is
built. The maintainer asked for the plan in one session and the build in another.

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md), the table under "Which model
does which work"; [docs/lessons-learned.md](../lessons-learned.md), sections 3 and 5 ("the drawing
is the design"); the returned design's own README; [plan 30](30-collapsing-tab-bar.md) for how the
bar came to be and § 8 for the measurements already in hand; [design-language.md](../design-language.md)
rules 4 and 6.

**One sentence:** when the tab bar opens, the six tabs become six equal cells with one matching icon
each, only the current tab shows its name under its icon, the lit cell is a soft fill with no box,
and the LB and RB hints become the same small pills the chat row already uses; the thin bar at rest
and everything about how the bar behaves stay exactly as they are.

**The maintainer's calls are in [D109](../audit/maintainer-decisions-locked.md#d109); § 4 summarises them.**

---

## 1. What a person sees today, and what changes

**Today, with the bar open** (the part the brief said it did not like): six cells of different
widths, each an icon with a tiny capital-letter name under it. The icons come in four styles. The
current tab's cell is a white-ish box with a hard 2px accent border. LB and RB are plain small
text. The strip is slightly see-through, so what is under it leaks through. It is 54px tall over a
chat row that is about 55, so a sliver of the row's dots shows underneath.

**After this build:** six cells of equal width. All six icons the same size, one family. The
current tab's icon and its name are in the accent colour; the other five are icon only, in the
usual muted grey. The current cell has a soft rounded fill and nothing else. LB and RB are small
rounded pills, like the ones two rows down on the chat row. The bar is solid, with a soft shadow
under it. When the tab changes, only the fill and the name fade across; no icon moves and no cell
changes width.

**Unchanged:** the thin 20px bar at rest (dashes, the current name, the LB/RB marks). How the bar
opens and closes, that it is one D-pad stop, that Left/Right and the bumpers switch tabs, that a
tap opens it and a tap outside closes it, the fade timing, and the timer that force-hides the strip
after a stalled fade (the ghost fix of 15 September).

---

## 2. What is true right now (checked 2026-09-16 against the code)

- **The open strip is one component and one style section.** The markup is in
  [TabIndicatorBar.tsx](../../src/features/plugin-shell/TabIndicatorBar.tsx), the styles in
  [tabIndicatorBar.ts](../../src/styles/sections/tabIndicatorBar.ts), the words and icons per tab in
  [tabTitles.tsx](../../src/features/plugin-shell/tabTitles.tsx). Nothing else styles the cells
  (checked with a search).
- **Every name is shown under every icon, in capitals**, from a fixed table. With the Developer tab
  mounted (six tabs) the two long names shorten to PERMS and DEV; with five they are written in
  full. That is a rule on the tab list, not a measurement, and it has tests.
- **The icons are the existing set** at 24px, with the outline tree (Main) and the bug (Developer)
  at 30px in a 32px box. Settings and Permissions are the Feather gear and lock. The Ollama mark is
  filled. About is the skewed "i".
- **The accent reaches the strip through one CSS variable** set on the plugin's root: the chosen
  AI character's main colour at 92% opacity. With no character it falls back to a hand-picked
  bright green (#52d88a), which is the green the design asks for. A character with a dark colour
  (Dutch's dark red, Shadowheart's purple, Nick Valentine's brown) gets that dark colour as-is on
  the lit cell today; nothing lifts it.
- **The lifting helper exists** in the accent code, used for the chat bubble wash, but the design's
  four example colours are not what that helper produces at one fixed factor. See § 5.
- **The production logo is a single black shape** in a 475 × 475 box, and the artwork fills the box
  (its outer edge runs from the left edge to the right). It is bundled as a separate file the
  plugin serves from its own folder, and today only the empty-chat picture uses it. The design's
  note about a "150% crop matching a zoom of 1.55" has no counterpart in the code; nothing in the
  plugin zooms or crops this logo. See § 5.
- **The LB/RB marks already hide by visibility, never by removal**, while the chat row has focus
  (section 6 of the styles), so the layout does not shift. The design's fixed 20px slots keep that
  working.
- **Every size goes through the UI-scale helper**, which writes `calc(Npx * scale)`, so a 9.5px value
  scales the same as a whole number.
- **The strip's placement rules must not change.** Two rules with `!important` and a carefully chosen
  specificity beat a reset elsewhere; without them the strip lays out in-flow and pushes the panel
  down 34px (measured twice on 2 September). Their tripwire tests stay.
- **Measurements in hand:** the strip's geometry on the Deck from 2 September (plan 30 § 8: bar
  300 × 20, strip 300 × 54 floating, cells 38 to 48 wide, body top at 87.95px) and the four real
  Deck photos of 14 September in the hand-off folder.
- **The design's "today" board is a reconstruction.** The designer's own note says the three photos
  never uploaded, so board 1a was rebuilt from the written values. That does not affect board 2a,
  which is drawn from the values and the real icon files, but it means the designer never saw the
  real bar.
- **The design names branch `main`;** the work happens on `experimental`, as everything does here.

**Correction, 2026-09-17 (W0 desk render).** § 1 above calls the sliver "a sliver of the row's
dots" and blames the 54px strip specifically. That premise was wrong: the W0 render and the
14 September Deck photo both put the *whole* dots row 6 to 10px below the strip's edge, not a
sliver of it, so going from 54 to 56 (§ 4 item 3's lean) would not have covered it — a bigger jump
was always needed. Separately, the W0 render found the production logo at 22px reads **heavier**
than the outline icons, not lighter (1.72× the gear's ink), so the design's own idea of cropping it
to 150% to make it read lighter is withdrawn — nothing in this build crops or zooms the logo.

---

## 3. What gets built, and what does not

**Built now (board 2a, as drawn):**

1. Six equal-width cells, each 44px tall, in a 54px solid bar (#141c24) with a 1px bottom line and
   a soft shadow. Inner padding 5px top and bottom, 6px sides, 2px between cells.
2. LB and RB as pills (9px bold, rounded, faint white fill, muted blue-grey ink) in fixed 20px slots
   at each end. When they hide, the slots stay, so the cells never move.
3. Every icon 22 × 22, top-aligned in its cell (6px down), the same size and place whether selected
   or not. The bug is drawn at 26 with 2px pulled off top and bottom, because its artwork has inner
   padding; that keeps its footprint at 22.
4. The Main icon is the production logo, tinted in the accent, replacing the outline tree on the
   strip.
5. Only the selected cell carries its name: lowercase in small capitals, 9.5px bold, under the icon,
   in the accent. It never clips; it may overhang its cell by a couple of pixels.
6. Selected cell: a soft white fill (8% white) with 8px rounded corners. No ring, no underline.
7. Unselected icons in the existing muted grey. Selected icon and name in the **lifted** accent:
   bright green with no character, the character's colour lifted only when it is too dark to read
   on the bar (§ 5).
8. On a tab switch, the fill and the name fade in over 120ms and the old ones fade out. Nothing
   else moves.
9. Five tabs (Developer off) follow the same rules with wider cells.

**Not built, on purpose:**

- The thin bar at rest. Unchanged to the pixel.
- Any behaviour: opening, closing, focus, Left/Right, bumpers, tap, the ghost timer, the height
  rules. All untouched.
- The plugin's icon in Decky's plugin list, and Steam's own hidden tab titles (they are never seen
  with our bar mounted; the builder may point them at the new Main icon for consistency, or leave
  them).
- The other boards in the design file (1b to 1h). Context only.
- Any new setting, timer or permanent row.

---

## 4. Calls for the maintainer (D109)

Full text with options in [D109](../audit/maintainer-decisions-locked.md#d109). In short:

1. **Approve board 2a as the design, yes or no.** A yes also settles the two-star roadmap entry
   "replace the bonsAI tab icon with the redesign's" for the strip: the shape is the production
   logo, and the maintainer approving the board is the by-eye approval that entry asks for.
2. **What the name says under Permissions and Developer.** The design only ever shows "main" and
   "settings" lit, and its own note calls "settings" the longest name, which is only true if the
   two long tabs use short words. Lean: **"perms" and "dev", always**, at five tabs and at six. The
   full words would overhang their cell by about 10px each side, five times the design's own
   tolerance.
3. **54px tall as drawn, or 56 to hide the chat row's sliver.** The brief allowed a taller strip.
   The design kept 54 and adds a shadow that darkens the sliver. Lean: **build 54 as drawn, look on
   the Deck; go to 56 in the same build if the dots still peek out.**
4. **If the small capitals look too small on the Deck, what is the fallback.** Steam's font most
   likely has no true small capitals, so the browser makes them by shrinking capitals, which can
   land the visible letters around today's 8px. Lean: **plain capitals at the same 9.5px bold**,
   one line to change, decided by eye on the device.

**Answered 2026-09-16, the same day, all four on the leans:** board 2a approved as drawn (and the
two-star tab-icon entry closes with it); "perms" and "dev" always; 54px checked on the Deck, 56 if
the dots peek out, because it must not look sloppy; plain capitals at 9.5px as the fallback, no
bigger than needed, just readable and neat. D109 is locked. The build runs on these; nothing is
open.

**Outcome, item 3 (2026-09-17):** built 66px tall, not 54 or 56 — see the correction under § 2 and
the dated note under § 5. The exact number is confirmed on the Deck at row **TAB-STRIP-2A-07**.
**Outcome, item 4:** small capitals were built as drawn (`font-variant: small-caps`); whether they
read clearly enough on the Deck is row **TAB-STRIP-2A-03**'s call, not decided here — the plain-
capitals fallback is one line to change if they do not.

---

## 5. Builder's calls (leans already taken; not for the maintainer)

- **How the logo is tinted.** The design says "CSS mask". The logo is one black shape, so an inline
  SVG component drawn in `currentColor` does the same tint with no fetch. Lean: **inline SVG
  component** in icons.tsx built from the production file's path (about 27 KB added to the bundle;
  the file is already shipped as an asset, so the plugin grows by that once). Reasons: the mask
  route loads the file from the plugin's own web address inside Steam's page, and whether a
  cross-origin mask image renders there is unproven; the roadmap's own entry for this icon asks for
  an inline path "so it takes the colour around it"; and the icon-geometry test can then cover it.
  Draw it to fit the 22px box (the artwork fills its own box, so no crop). If the desk render in W0
  shows the tree reading smaller than the other icons, try the design's "150% crop" then, not before.
- **The lifted accent.** One new variable on the plugin root, set in the accent code beside the
  existing ones: the character's colour lifted toward white just enough to read on the bar
  (#141c24) at a 4.5 to 1 contrast, and left alone when it already does. Default green stays the
  existing hand-picked #52d88a. Gold (#f1c40f) already passes and stays. The designer's grey and
  pink values (#c3d0d1, #f36cb6) are the check the unit test uses: the rule must land within a
  visible-tolerance of those. The strip's selected icon, its name and the rest bar's lit dash and
  name all read this one variable, so rest and open agree.
- **The name is in every cell's markup**, faded by opacity, not added and removed. Two reasons: the
  fade-out the design asks for needs the old name still there, and the icon then sits at the same
  height in every cell without any per-cell measuring. Each cell also carries its name as an
  accessible label, because five of the six no longer show text.
- **The switch fade** is a 120ms transition on the cell's background colour and the name's opacity
  and colour. Follow the reduced-motion rule the chip row and section 4 already use.
- **The LB/RB pills reuse the chat row's pill values** where they match (section 6), so the two hints
  read as one family; the design's 9px bold, 3px by 4px padding, 8% white fill and #8fa8c4 ink are
  the numbers.
- **Cells become `flex: 1 1 0; min-width: 0`.** The old minimum width, the per-cell side padding and
  the 32px icon box go. The strip's placement rules, the 20px bar height rule, the 4px reserve rule
  and the ghost timer are not touched; their tripwire tests stay as they are.
- **Small capitals** come from `font-variant: small-caps`, as drawn. The Deck decides (§ 4, item 4).

**Built 2026-09-17.** The lift rule above became **6:1**, not the 4.5:1 first planned: at 4.5:1
pink barely moved and grey did not move at all, while at 6:1 gold and green stay untouched, pink
lands within 4 per channel of the designer's own colour, and grey is the one colour the rule still
does not match. For Astarion, the lit colour is the designer's own hand-picked lighter grey
(`#c3d0d1`) rather than the rule's answer, by the maintainer's choice from a side-by-side mockup on
2026-09-17 — the rule (lift toward white until the colour reads at 6:1 on the bar, else leave it
alone) stays for every other character.

---

## 6. Work items, in commit order

Each one its own commit, gates green in between (`python scripts/verify.py --quick` before each,
`--full` before the landing). Helpers hand back code, tests and a short report; the bookkeeper does
the documents.

### W0 — Desk render. No plugin code. **Done, commit `6821f20`.**

Draw the new strip from the real stylesheet values at true 300px width, the way the brief's own
`TodayOpen.dc.html` did: five tabs and six, Main and Settings and Permissions lit, in green, gold,
grey (Astarion) and pink (Fuu). Put it beside board 2a. Check three things the tools can check
before a person looks: the fill, the shadow and the bottom line survive each other (lesson 5); the
logo at 22px reads the same weight as the gear and the lock; the lit name's overhang at six tabs.
Save the render under the hand-off's returned folder. If anything disagrees with the board, the
board wins unless the board is wrong on a fact from the code, in which case note it here.

### W1 — Words and tokens. Pure additions and renames. **Done, commit `18be399`.**

- New tokens in the unified-input constants, replacing the strip's old ones: cell height 44, icon 22,
  bug icon 26 with its 2px pull, name 9.5, pill 9, strip padding 5 and 6, slot width 20, cell radius
  8. Old strip tokens that nothing else reads go in the same commit.
- The strip name table becomes lowercase words; the short forms (D109 item 2) become the standing
  words for Permissions and Developer if the lean holds, and the "only at six tabs" rule and its
  argument go.
- Tests in `tabTitles.test.tsx` updated to the new rule.

### W2 — The Main icon. **Done, commit `0378024`.**

- A new icon component in icons.tsx from the production logo's path, drawn in `currentColor`.
- The strip icon function returns the six icons at their new sizes.
- The icon-geometry test covers the new component. Nothing on screen changes yet except the strip's
  icon sizes, which W4 lays out.

### W3 — The lifted accent variable. **Done, commit `ef4a851`.**

- One new variable computed beside the others in the accent code, per § 5, with a unit test on the
  designer's four colours and on three dark presets.
- The rest bar's lit dash and name switch to it in the same commit, so the thin bar's green does not
  drift from the strip's.

### W4 — The strip itself. The one visible change. **Done, commit `044acab`** (landing tidy `a957165`).

- Markup: the pill spans in their fixed slots; the name in every cell, lit only on the active one;
  accessible labels; no short-form logic.
- Styles: the new bar, cells, pills, name and fade rules per § 3; old cell rules deleted.
- Tests in `TabIndicatorBar.test.tsx`: one name visible at a time and it is the current tab's; every
  cell has an accessible name; the pill slots exist whether hidden or not; the placement, height and
  reserve tripwires unchanged and still passing.

### W5 — On the Deck.

Deploy, then the rows in § 7. Screenshots of the lit strip in green, gold, purple, grey and pink go
to the maintainer for the by-eye row. Any measurement that disagrees with the board is written into
§ 9 below before anything is changed.

### W6 — Bookkeeping (the bookkeeper, not the build lane).

Roadmap: the new Features entry moves to Verify with the rows named; the two-star tab-icon entry
closes for the strip if D109 item 1 is a yes. Testing docs: the coverage row and the new rows.
Design tokens: the tab bar rows replaced. Changelog. This plan's § 9 filled in.

---

## 7. Deck rows (owed until they run)

**Heights below: 54 in the original plan; 66 since the maintainer's answer of 2026-09-17, see § 2
note.**

| Row | What | Passes when |
|---|---|---|
| **TAB-STRIP-2A-01** | Geometry, six tabs | Strip 300 × 66 floating at the scope's top; six cell boxes within 1px of equal width (about 39); every icon box 22 tall with its top 6px below the cell top, same in all six; bar at rest still 300 × 20; body top unchanged from 2 September (87.95px) |
| **TAB-STRIP-2A-02** | Geometry, five tabs | Same with Developer off; cells about 47 wide |
| **TAB-STRIP-2A-03** | By eye, the maintainer | The lit name readable at arm's length; the lit cell reads as a selection, not a warning; nothing clipped; in green (no character), gold (Ali G), purple (Shadowheart), grey (Astarion), pink (Fuu) |
| **TAB-STRIP-2A-04** | Switch fade | Right ×3 from Main: the icon boxes' positions before and after each press are identical; only the fill and the name changed |
| **TAB-STRIP-2A-05** | Pills hide, cells stay | Ring on the chat row: the pills are hidden, the six cell boxes have not moved |
| **TAB-STRIP-2A-06** | UI scale 1.18 | Settings → UI scale → Apply: the strip comes back at the new scale, still floating, still six equal cells |
| **TAB-STRIP-2A-07** | The sliver (D109 item 3) | With the strip open on Main, no part of the chat row is visible under the bar |

Re-run or retire: **TAB-BAR-07** (by eye) is replaced by 2A-03 and closes with it. **TAB-BAR-08**
(touch) and **TAB-BAR-GHOST-01** stay owed and unchanged; they need a finger. The free-play sweep
**QA-FREE-PLAY-01** runs once, because a Main-tab surface changed.

---

## 8. Risks

- **The small capitals are synthetic.** If the letters come out around today's 8px, the by-eye row
  fails on size again. D109 item 4 has the fallback ready so the Deck evening does not stall.
- **Dark character colours.** The lift rule is new. A colour that lifts too far reads washed out; too
  little and the lit cell is dim. The five-colour by-eye row is the check; the rule's threshold is a
  one-number change.
- **The name's overhang.** Even at "perms" and "dev", "settings" overhangs about 2px at six tabs, by
  design. At UI scale 1.18 it overhangs proportionally, still inside the neighbouring cells' empty
  lower band, because the neighbours have no name.
- **The 1px sliver.** Kept at 54 by the design; the shadow is meant to hide it. Row 2A-07 decides.
- **Shared checkout.** Another session is active on the same branch. Stage by file name only, never
  everything; the roadmap and testing documents are edited by the bookkeeper in W6, not by the lane.
- **The strip's placement rules.** Easy to break by tidying. Their tripwire tests exist; a commit
  that loosens one is wrong.

---

## 9. Measurements

**Filled after the Deck run (W5).** Nothing here is predicted; the device is held by another
session as of 2026-09-17, so the table below is still the plan's placeholder, not a result.

| What | Before (2 September, plan 30 § 8) | After W4 on the Deck |
|---|---|---|
| Strip box | 300 × 53.99 floating, absolute | |
| Cells, six tabs | 38 / 43 / 48 / 38 / 38 / 38 wide | |
| Icon box | 32 × 32 | |
| Bar at rest | 300 × 20 | |
| Body top | 87.95px | |
| Lit name | 8px caps | |

---

## 10. Who does what

Three stars, tags `[tabs]` `[ui]`. By the routing table: the measurement is in hand (§ 2), so Opus
extra-high owns the plan's decisions and the landing, and reads any Deck failure. W1 to W4 are a
Sonnet 5 high lane, because every value is written down and the cause is known. W0 can be the same
lane or Opus. The by-eye row is the maintainer's eyes; no model tier substitutes for it. The
bookkeeper does W6. The planning session that wrote this ran on Fable, above the table's tier for
three-star screen work; that is noted, not repeated.

## 11. Files

| File | Change |
|---|---|
| `src/features/unified-input/constants.ts` | New strip tokens; old ones removed |
| `src/features/plugin-shell/tabTitles.tsx` | Lowercase words, standing short words, icon sizes, the logo on Main |
| `src/components/icons.tsx` | The logo as an inline icon |
| `src/data/characterUiAccent.ts` | The lifted accent variable |
| `src/features/plugin-shell/TabIndicatorBar.tsx` | Pills in slots, name in every cell, accessible labels |
| `src/styles/sections/tabIndicatorBar.ts` | The new strip look; placement and height rules untouched |
| `src/features/plugin-shell/*.test.tsx`, `src/data/characterUiAccent.test.ts` | Tests per W1 to W4 |
| `docs/design-tokens.md`, `docs/roadmap.md`, `docs/testing.md`, `docs/testing-manual.md`, changelog | W6, bookkeeper |
| `docs/design/handoffs/tab-bar-open-strip/return-2026-09-16/` | The design as delivered, plus the W0 render |
