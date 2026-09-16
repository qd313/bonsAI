# 60 — Building the suggestion chips as real buttons (Board B)

Written 2026-09-16 by the planning session, before any code. This is the build plan for the roadmap's
**Make the preset chips look more like chips** entry (two stars, chips). It takes the boards that came
back from Claude Design on 2026-09-16 and turns them into the steps a build session runs. Nothing here
is built. Plan numbers 58 and 59 belong to other sessions running at the same time; this one is 60.

**Status: answers in, locked as D110 on 2026-09-16 (§ 7). Nothing built. The maintainer will run the
build later; waiting on the word "go".**

Read first: [CLAUDE.md](../../CLAUDE.md); the model table in [AGENTS.md](../../AGENTS.md) under "Which
model does which work"; [lessons-learned.md](../lessons-learned.md) § 3 (checking on the Deck) and
§ 5 (design work, especially "check that two effects survive each other"); the brief that went out,
[docs/design/handoffs/preset-chips/README.md](../design/handoffs/preset-chips/README.md); and the
boards that came back, in
[docs/design/handoffs/preset-chips/return-2026-09-16/](../design/handoffs/preset-chips/return-2026-09-16/)
(open `Board B - Real Button.dc.html` in a browser; its README is the designer's own spec).

**One sentence:** each suggestion chip gets a top-lit, bottom-dark surface with a hairline on its top
edge and a soft shadow beneath, the two chips move two pixels further apart and the row sits a touch
further from the question box, the Tip badge becomes a small dot in the character's colour, the
character colour on the tags is toned down, and the chip you are on shows a thin light bar along its
bottom edge under Steam's white ring instead of a blue outline.

---

## 1. What is true right now (checked 2026-09-16 against the code)

- **The chips are already two across, 148 by 30, with a 4 pixel gap.** That shipped on 2026-09-01.
  The designer's README has one stale line saying the repo "currently ships full-width stacked chips
  34 tall" and asks the builder to reconcile. Ignore that line: the boards themselves were drawn from
  the real stylesheet and their "Today" board matches the code exactly. There is nothing to
  reconcile.
- **A chip is nearly invisible.** Its fill is the dark blue-black at 22 percent, its outline white at
  7 percent, no shadow. That is the whole complaint.
- **Long labels already scroll.** A label that does not fit scrolls through Steam's own scrolling
  label: a pause, one slow crawl, then it stops. The hand-off's "marquee spec" (hold 1.6 seconds,
  scroll at about 24 pixels a second, play once) is the designer's own copy of that behaviour for
  their HTML files, not a change. Nothing to build there. The one owed check on the crawl's speed by
  eye (row 04 of the two-across work) stays owed and is separate from this plan.
- **The Tip badge is a word today, and becomes a dot.** On screen it reads "TIP" in 9 pixel
  capitals, in the character's colour, at the left of the label. The design boards drew it as a 7 by
  7 square dot, and the maintainer chose the dot (D110, item 1). The amber Test badge stays a word:
  it is a checking-only state and has to be obvious.
- **Two blues sit on a chip today, and Steam's white ring on top of them.** When the D-pad is on a
  chip, Steam's white ring is drawn around it (that ring is yours by rule: "white focus rings
  everywhere"). Under the ring, the chip's outline turns pale blue to say "this is the current
  chip"; that outline is what fooled you and the test rig once, so it is only drawn while the row
  truly holds the ring. And pressing past either end of the row makes the end chip's outline flash a
  stronger blue with a soft glow for a third of a second.
- **The white ring and the new look fight over the same property.** The ring, the top hairline, the
  soft shadow beneath, the light bar and the out-of-chips glow are all drawn with the same CSS
  property (box-shadow), and the ring's rule is marked to win. Built naively, a focused chip would
  lose its hairline, its shadow and its light bar the moment the ring lands on it. This is exactly
  the "two effects on the same edge" trap in the lessons file, and it is the one part of this work
  that needs care rather than typing. § 5 spells out the merged lists per state.
- **The row clips anything drawn outside a chip.** The row's container and the sideways carousel's
  window both cut off whatever spills past their box. The new soft shadow reaches 5 pixels below a
  chip and 3 pixels to each side. Without room, the bottom of it is cut clean off. The design says
  "the shadow lives inside the 12 pixel gap below the row", which only holds if the row is given
  that room. § 4 measures this first.
- **There is no "pressed" hook for the D-pad, and no pressed look is wanted.** An A press on the
  D-pad arrives as one instant click, with nothing to style. The maintainer does not want a pressed
  state at all (D110, item 4), so the board's pressed look is not built, for touch either.
- **Three other chips share the same base look** and inherit the new surface: the green "How to use
  bonsAI" help chip, the orange agent suggestion chip, and the one-chip full-width setting. The
  first two keep their own colours by their own rules; the hairline and shadow reach them, as the
  maintainer wants (D110, item 5).
- **The plugin's browser can mix colours.** The "70 percent accent, 30 percent label colour" tone
  the design asks for can be done either in the stylesheet (the mixing function is already used on
  the Ask mode menu) or once in the code that sets the character colours. The design's gold example
  works out to exactly the value the designer wrote down, so the rule is right.
- **Italics were tried and rejected** by the design session. Board A carried an italic toggle; off is
  final. The roadmap ask said "worth trying", so this closes that part of it with a no.

---

## 2. What gets built, and what does not

Everything below comes from Board B, the locked direction, with the accent toning from Board A.

| Piece | Today | After | Who notices |
|---|---|---|---|
| Chip surface | flat dark fill at 22 percent | a gradient, lighter at the top, darker at the bottom, over the same blur | the chip reads as a raised thing |
| Chip outline | white at 7 percent | white at 10 percent | slightly crisper edge |
| Top edge | nothing | a one pixel white hairline at 10 percent inside the top edge | the "light catches the top" cue |
| Beneath the chip | nothing | a soft dark shadow, 2 pixels down, 3 pixels of blur | the chip sits above the panel |
| Gap between the two chips | 4 pixels | 6 pixels | the two chips stop reading as one slab |
| Chip width | 148 | 147 | about a fifth of a character less label room |
| Gap from the row to the question box | 12 pixels | 13 pixels, and the shadow beneath is tuned so the gap still reads as open (see § 3 point 5) | the chips stop touching the box |
| Label | 12 pixels, upright, `#c4d3e2` | unchanged | nothing |
| Tip badge | the word "TIP", 9 pixel capitals, character's colour | a 7 by 7 dot, 2 pixel corners, character's colour at 80 percent, 6 pixels before the label | quieter, and about two characters of label room back |
| `[beta]` tag colour | the character's colour, full strength | 70 percent character colour, 30 percent label colour (gold becomes `#e4c94e`) | quieter |
| Decode-mode label | the whole label in the character's colour | the same 70/30 tone | quieter |
| The chip you are on | pale blue outline under Steam's white ring | a 2 pixel light-blue bar along the inside of the bottom edge, and the label brightens to `#dcebf8`; Steam's white ring stays on top | no more outline that could be mistaken for a ring |
| Out of chips | the outline flashes stronger blue with a glow | the bottom bar flashes brighter with a small glow beneath, same third of a second | same cue, moved to the bar |
| Help chip and agent chip | flat, their own green and orange | their own colours, plus the hairline and the shadow beneath | they sit level with the raised chips |
| Row height, corner radius, side padding | | unchanged | nothing |

**Not built:** the pressed look from the board (the maintainer does not want one), the label scroll
(already there), italics (rejected), anything on the question box or the Ask bar, any new row, any
change to how the D-pad walks the row.

---

## 3. Where the hand-off and the plugin disagree

Bring these to the build session so nobody builds the wrong thing.

1. **The stale "stacked chips, 34 tall" line** in the designer's README. Wrong; the boards are right.
2. **The marquee spec** describes today's behaviour, not a change. Do not replace Steam's scrolling
   label with a hand-rolled one.
3. **The Tip badge is a word on screen and a dot on the boards.** The dot wins (D110, item 1).
4. **"Current" on the boards means the pale blue outline, not Steam's ring.** The design's warning
   ("push back if that blue outline must stay") is about the outline. Steam's white ring is not on
   the boards at all and is kept regardless. The bar is drawn under the ring; both show at once.
   If the two cannot be made to show together on the device, the ring wins and the bar is dropped
   (D110, item 2). Either way the blue outline goes.
5. **The gap.** The brief let the designer pick which gap to widen, and they widened the one between
   the two chips. The maintainer has since said what they meant: about half a pixel more between
   the chips and the question box (D110, item 3). Half a pixel cannot be drawn; one pixel is the
   smallest step, so the 12 becomes 13. The designer's wider chip-to-chip gap stays as well. The
   shadow beneath a chip reaches into that gap and can make the row look closer to the box than the
   number says, so the shadow's depth is tuned by eye on the device, and may end up shallower than
   the board's 2 pixels down and 3 of blur.

---

## 4. Before any code: one measurement on the Deck

About twenty minutes, driven by the one running the session, on the built-in screen. The model
table says screen work waits for a device measurement, and two of the points in § 1 cannot be
settled from the code alone.

1. **How the focused chip looks today.** Put the D-pad on a chip in every animation mode (fade,
   carousel, static, decode) and record the chip's computed outline and box-shadow, and a
   screenshot. This is the before picture, and it shows whether Steam's ring is already being cut
   off at the row's bottom edge by the same clipping that would cut the new shadow.
2. **How much room there is under the row.** Record the rectangles of the chip, its row container,
   and the question box, in fade mode and in carousel mode. The number that matters: the distance
   from the chip's bottom edge to the container's bottom edge. If it is 0, the new shadow needs
   5 pixels of room added inside the container, taken out of the 12 pixel gap so the question box
   does not move.
3. **How the gap to the question box reads.** With the before picture in hand, note where the 12
   pixels sit in each animation mode, so step 3 of the build can add the one pixel in the right
   place for every mode rather than only the fade mode.

Evidence goes in `docs/test-evidence/plan60-measure-*.json`, and the numbers go in the progress log
(§ 10) before the build starts.

---

## 5. The build, step by step

One commit each, every gate green between commits (`npx tsc --noEmit`, `npm run build`, `npm test`).
A Sonnet 5 high helper in its own copy of the repo builds steps 1 to 4 from this plan. Step 5 touches
the focus ring, so Opus at extra-high does it with the § 4 measurement in hand, or reviews the
helper's commit for it before it lands. The bookkeeper does step 7. The helper never edits the
roadmap, the testing rows or the changelog.

1. **The gap.** The chip gap constant goes from 4 to 6. The sideways carousel's slide distance and
   the label-room estimate both read that constant, so nothing else changes. A test pins the new
   value.
2. **The surface at rest.** The chip's base rule gets the gradient, the 10 percent outline, and the
   combined top hairline plus soft shadow beneath, in place of "no shadow". The help chip and the
   agent chip keep their own fill and outline rules and inherit the hairline and shadow. A
   stylesheet text test pins the gradient and the shadow list.
3. **Room for the shadow, and the extra pixel to the box.** Per the § 4 measurement: the row
   container gets 5 pixels of inner room at the bottom so the shadow is not cut off, and the gap
   from the row to the question box ends up 13 pixels to the eye in every animation mode (was 12).
   A test pins the numbers. If on the device the shadow still makes the row look glued to the box,
   the shadow's depth comes down (the board's 2 pixels down and 3 of blur is the ceiling), and the
   final numbers go in the progress log.
4. **The accent toning and the dot.** The code that sets the character colours gains two values
   every screen can read: the accent at 80 percent, and the accent mixed 70/30 toward the label
   colour. Both are set even when no character is chosen, so the default green is toned the same
   way. The Tip badge becomes a 7 by 7 dot with 2 pixel corners filled with the first value, 6
   pixels before the label and pinned so it never scrolls with the text; the `[beta]` tag and the
   decode-mode label use the second. The Test badge stays the amber word. Tests check the gold mix
   comes out as `#e4c94e`, that the green default is set, and that the dot renders in place of the
   word.
5. **The states that share one property.** The chip's focused, current and out-of-chips rules are
   rewritten so each one lists every effect that should be visible at once, rather than replacing
   the list. The full lists are in Appendix A. The blue outline colour rules go away; the bar takes
   their place under the same gates (drawn only while the row truly holds Steam's ring, plus the
   no-ring fallback for desktop and touch). A test asserts the focused rule contains both the white
   ring values and the bar, which is the "two effects survive each other" guard in code. If the
   device shows the two cannot coexist, the fallback is the ring alone with no bar and no blue
   outline (D110, item 2).
6. **Docs and tests that pin today's look.** The design-tokens surfaces table, the two-across testing
   row's note about "4 pixel gap", the stylesheet test that pins the old out-of-chips glow, the
   chip tests that look for the word "Tip", and the changelog. Bookkeeper.

---

## 6. Proving it on the Deck

Rows for the testing documents, written once the build lands. Green and gold at least, per the brief;
one pass with a grey character to see nothing falls apart.

| Row | Do | Pass when |
|---|---|---|
| CHIP-BUTTON-01 | Open the main screen with chips showing, default character, then Ali G (gold). Screenshot the dock. | By your eye: the chips read as raised buttons, the two are visibly apart, the Tip dot and the `[beta]` tag are quieter than before. Nothing else in the dock moved. |
| CHIP-BUTTON-02 | Put the D-pad on a chip in each of the four animation modes. Read the chip's computed box-shadow. | Steam's white ring is there, the top hairline is there, the bottom bar is there, all at once. The label is the brighter shade. No blue outline anywhere. If the bar cannot be seen under the ring, record it and fall back to the ring alone. |
| CHIP-BUTTON-03 | Press Left at the first chip and Right at the last. | The bottom bar flashes brighter with a small glow for about a third of a second, then returns. Nothing moves. |
| CHIP-BUTTON-04 | Press A on a chip; then touch one. | The words land in the question box. Nothing sinks or flips; no pressed look was built. |
| CHIP-BUTTON-05 | Read the rectangles of the chip, its container and the question box; screenshot. | The shadow's bottom is not cut off; the distance from chip bottom to question box top is 13; by eye the row no longer touches the box. If the shadow still closes the gap, note the depth to try next. |
| CHIP-BUTTON-06 | Turn on the one-chip setting; show the help chip; get an agent suggestion chip. | The full-width chip has the same raised look. The help and agent chips keep their colours and carry the hairline and shadow. |
| CHIP-BUTTON-07 | Reduced motion on. Repeat 03. | The cue appears and clears with no ramp; nothing looks broken. |
| CHIP-BUTTON-08 | Decode animation mode, gold character. | The resolving label is the toned gold, not the loud one. |
| CHIP-BUTTON-09 | A game the notes cover (Half-Life 2), knowledge base on. | The Tip chip shows a small square dot in the character's colour before its label, not the word; the dot stays put while a long label scrolls. |

Rows 01 and 05 are judged by eye from a screenshot and a rectangle read; the rest are read from the
page by the bridge.

---

## 7. Decisions — answered 2026-09-16, locked as D110

The questions went to the maintainer the same day the plan was written. Their answers, in the
decisions file as D110:

1. **The Tip badge becomes the dot from the boards.** A 7 by 7 square with 2 pixel corners, filled
   with the character's colour at 80 percent, where the word "TIP" was. The plan had leaned toward
   keeping the word; the maintainer preferred the dot. The amber Test badge stays a word (not asked;
   it is a checking-only state that has to be obvious).
2. **Steam's white ring stays. The bar goes under it, and if the two cannot show together on the
   device, the ring wins and the bar is dropped.** The blue outline goes either way. The build
   merges the two lists (Appendix A) and a test guards the merge; row 02 is the device check.
3. **The gap they asked for is the one to the question box, about half a pixel.** Built as one
   pixel, 12 to 13, since half a pixel cannot be drawn. The designer's 4 to 6 between the chips
   stays too. The shadow beneath is tuned on the device so the row does not look glued to the box.
4. **No pressed look.** Not on touch, not on A. The board's pressed state is not built.
5. **The help chip and the agent suggestion chip get the raised look too**, keeping their own
   colours.
6. **The decode-mode label is toned** with the same 70/30 mix as the `[beta]` tag.

Settled without a question: italics are out; the scrolling label is untouched.

---

## 8. Risks, and what to know

- **The focused chip losing its new look** is the likeliest way this goes wrong, and the reason
  step 5 is not left to a helper without the measurement. The test in step 5 is the guard.
- **The shadow being cut off** would make the chips look worse than today: a hairline on top and a
  hard edge underneath. Step 3 exists for this; row 05 checks it.
- **The out-of-chips flash today lives on the outline, and a stylesheet test pins those exact
  values.** That test must be rewritten, not deleted, so the flash keeps its guard.
- **The one pixel of width lost** (148 to 147) is about a fifth of a character. The design counts
  it; the plan accepts it.
- **A dot says less than a word.** Someone who has never seen the Tip badge will not know what the
  dot means. The maintainer chose it with that in mind; if it turns out to puzzle people, the help
  screen can name it in one line.
- **Other sessions are in this checkout.** The roadmap and the testing file were carrying another
  session's uncommitted edits when this plan was written. This plan does not touch them; the
  pointer from the roadmap entry to this plan is a bookkeeper job for the build session, after a
  fresh look at the file.

---

## 9. Out of scope

The label scroll speed (row 04 of the two-across work, still owed); the question box and Ask bar;
the chip row's D-pad reachability bug under Show details (its own roadmap entry); the Test badge's
amber; any change to the prompts themselves.

---

## 10. Progress log

- 2026-09-16: plan written. Boards filed at `docs/design/handoffs/preset-chips/return-2026-09-16/`.
  Nothing built. Measurement (§ 4) not yet run.
- 2026-09-16, later: the maintainer answered all six questions (§ 7, D110). The pressed state left
  the plan; the Tip dot and the extra pixel to the question box joined it. Still nothing built; the
  maintainer will run the build in a later session.

---

## Appendix A — for the helpers, not for reading

Files: `src/features/preset-carousel/presetRowLayout.ts` (gap constant), `src/styles/sections/section-6.ts`
(base surface rule at `.bonsai-scope .bonsai-preset-glass`, plus the help-chip and pyro-inject-chip
overrides), `src/styles/sections/section-4.ts` (row host, carousel viewport, current-chip gates,
blocked-edge rule), `src/styles/sections/gamepadAndPullModels.ts` (the white ring and the blue
border rule that shares its selector list), `src/data/characterUiAccent.ts` (scope variables),
`src/components/MainTabPresetAnimatedChips.tsx` (badges, `[beta]`, decode label, inline chip style,
the blocked-edge marker as the pattern for a timed class, if one is ever needed). Tests that pin
today's values:
`src/styles/sections/section-4.test.ts`, `src/styles/presetChipFocusRing.test.ts`,
`src/data/characterUiAccent.test.ts`. Docs: `docs/design-tokens.md` surfaces table.

**New scope variables** (always set, default green when no character):
`--bonsai-ui-accent-badge` = accent at alpha 0.8; `--bonsai-ui-accent-toned` = 0.7 × accent +
0.3 × `#c4d3e2` per channel (gold `#f1c40f` → `#e4c94e`; green `#2e8753` → `#5b9e7e`).

**Box-shadow lists per state** (order matters: first entry paints on top). The white ring values
are the existing `ring` string in gamepadAndPullModels.ts and must stay byte-identical there.

| State | box-shadow | other |
|---|---|---|
| rest | `inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 3px rgba(0,0,0,0.4)` | `background: linear-gradient(180deg, rgba(56,70,84,0.5) 0%, rgba(16,22,30,0.55) 100%)`; `border: 1px solid rgba(255,255,255,0.10)` |
| current (gated) and `.gpfocus` | `0 0 0 2px rgba(255,255,255,0.92), 0 0 0 5px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(56,189,248,0.85), 0 2px 3px rgba(0,0,0,0.4)` | outline as today; `border-color` stays the rest value (the blue border rules are removed); label `color: #dcebf8 !important` |
| `.bonsai-preset-chip-blocked-edge` (always also focused) | `0 0 0 2px rgba(255,255,255,0.92), 0 0 0 5px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(150,225,255,1), 0 3px 8px -2px rgba(56,189,248,0.55), 0 2px 3px rgba(0,0,0,0.4)` | transition on box-shadow as today (45 percent of the 320 ms window); reduced motion: `transition: none` on this selector only |

No pressed rule (D110, item 4): no `:active` styling, no pressed class. Leave `transform` alone; the
inline style already carries the dimmed scale.

**Tip dot:** replace the "Tip" text span in `PresetChipLabel` with a `span.bonsai-preset-chip-tip-badge`
of `width: 7px; height: 7px; border-radius: 2px; background: var(--bonsai-ui-accent-badge);
margin-right: 6px; flex: 0 0 auto` and an `aria-label="Tip"` (or `title`) so tests and screen
readers still find it. Both label components (`PresetChipLabel` and the decode-mode label) carry the
badge; change both. The Test badge span is untouched.

The current-chip gates stay exactly as they are (`.bonsai-preset-carousel-focus-root.gpfocuswithin
.bonsai-preset-carousel-slot--focus .bonsai-preset-glass`, the `:has(.gpfocus)` arm, and the
`:root:not(:has(.gpfocus))` fallback); only their declarations change from `border-color` to the
list above. The `:root:not(:has(.gpfocus))` fallback has no white ring, so its list omits the two
ring entries.

Row-host room: `.bonsai-preset-row-host` gets `padding-bottom: 5px` and the outer gap under the row
is set so chip-bottom to question-box-top is 13 px (D110 item 3; was 12) in every mode: the
`--fade-anim` variant's `margin-bottom: 12px` becomes 8 px (8 + 5 = 13); the other modes get theirs
from the dock column, which the § 4 measurement locates. The carousel viewport's `overflow: hidden`
needs the same 5 px of bottom room or the shadow is clipped in carousel mode alone. If the shadow
is shallowed on the device, the padding shrinks with it and the margin grows by the same, so 13
holds.

Gates: `npx tsc --noEmit`, `npm run build`, `npm test`. Do not run `pnpm install` in the worktree
copy; the copy helper links `node_modules` to the shared checkout.
