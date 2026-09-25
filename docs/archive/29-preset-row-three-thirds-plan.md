# Plan 29 — The preset row: chips side by side

**Status:** built 2026-09-01 (uncommitted); rows 02 and 03 passed on device (03 re-run 2026-09-02); rows 01b/04 owed (§ 2). All four decisions answered (§ 3, § 3b): **two chips across**,
sideways carousel, help chip owns the row until dismissed, every chip scrolls slowly (**D43** locked).
**Fixes:** roadmap → Bugs → *The preset chips* — row **PRESET-ONE-LINE-02**, filed by the maintainer
2026-08-31 ([roadmap.md:26-38](../roadmap.md)).
**Also closes, if it lands as planned:** the *longest chip labels overflow the column* bug
([roadmap.md:108-117](../roadmap.md)) and the *chip labels autoscroll* backlog item
([roadmap.md:571-601](../roadmap.md)). Both are the same problem seen from two sides.

---

## 1. Executive summary

On 2026-08-31 the three stacked suggestion chips under the chat were squeezed into one row. That saved
the height it was meant to save, but the row shows **one chip at a time**. The drawing in
[major-redesign.md § 2.3](major-redesign.md) shows **three chips next to each other** in that one
row, each a third of the width, with long labels **scrolling sideways** inside their third instead of
being cut off.

This plan puts the chips back side by side, keeps the height saving, and adds the scrolling labels.
The maintainer has answered three questions (2026-09-01): the carousel becomes a **sideways**
carousel; the **help chip owns the whole row** until it is dismissed, and only then do suggestion
chips appear; and **every chip scrolls**, slowly and calmly.

The fourth decision, **two chips across or three**, was the one that mattered most. The drawing says
three. Measured against the real column, three chips leave room for about 10 to 12 characters each,
so no built-in suggestion is recognisable without watching it scroll. Two chips leave room for about
18 to 20 characters, which is enough to recognise most suggestions at a glance. The research is in
§ 3b; the maintainer chose **two** (decision **D43**, locked 2026-09-01). That departs from the
drawing on purpose and is recorded, not built quietly.

The most useful thing I found while reading: **Steam already ships a scrolling-label component, and
Decky's UI library exposes it** (`Marquee`). It is the same crawl the Steam library uses for long
game names. Using it means no new animation code and a look that matches SteamOS. This plugin does
not use it anywhere yet.

---

## 2. Checklist

Legend: ✅ done · ❌ blocked, or a bug found this session · `[ ]` not attempted yet.

### This session (planning)

- ✅ Read the bug, the drawing, the one-chip commit (`fc1b245`) and the chip code
- ✅ Chip-related unit tests pass on the current tree (5 files, 53 tests)
- ✅ Found Steam's own scrolling-label component in Decky UI
  (`node_modules/@decky/ui/dist/components/Marquee.d.ts`)
- ✅ Plan written; Q1, Q2, Q3 answered by the maintainer (§ 3)
- ✅ Two-or-three research done (§ 3b) and filed as **D43** in
  [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md)
- ✅ **D43 answered: two across** (locked 2026-09-01)

### Build (one commit each, tests green between commits)

- ✅ B1 Chips side by side for fade / static / decode: flex row, 30px tall, radius 4, one focus
      container (`PresetRowFocusRoot`, registers the Ask bar handover in every mode)
- ✅ B2 Seed rotation for two visible slots: `singleSlotRotation.ts` → `presetSlotRotation.ts`; the third
      seed queues; a pinned batch walks in order from the last entry the row introduced, skipping
      what the other chip shows; tests
- ✅ B3 Sideways carousel: two-wide window, focused chip at the right edge, slide is a CSS calc on
      `--bonsai-preset-window-start`
- ✅ B4 Scrolling labels: Steam `Marquee` per chip (speed 25 / delay 1.5 s, to calibrate on device), badges
      pinned, ellipsis fallback that actually fires, reduced motion, decode hands the label over once
      settled, hold floor `presetHoldMs`
- ✅ B5 Help chip owns the whole row until dismissed; suggestion chips mount only after that
- ✅ B6 Fade timings back to 2 s out / 1 s in, staggered 750 / 1300 ms
- ✅ B7 The corpus "Tip" guarantee converts the second seed (the last one on screen), not the hidden third
- ✅ B8 Unit tests updated and added (61 in the six chip-related files; full suite 106 files / 814 tests)

### Verify

- ✅ V1 `npx tsc --noEmit`, `npm test` (106 files, 814 tests), `npm run build`, `npm run test:py` (890) all green
- [ ] V2 In-IDE preview: SMOKE-A, plus a screenshot of the row in each of the four modes
- ✅ V3a On Deck, **PRESET-ONE-LINE-02** geometry read from the live page 2026-09-01: two chips 148 px wide
      with a 4 px gap on the 300 px column, 30 px tall, radius 4, 8 px side padding, 130.4 px of label room;
      Steam's Marquee active on the long visible label, idle on the short one; Test badge pinned at 23 px;
      dock 157 px (was 161), reading area 458 px (was 455). Numbers written into § 3b.
- ✅ V3b On Deck, **PRESET-ONE-LINE-03** carousel D-pad 2026-09-01, after the fix below: 11/11
      (`runs/PRESET-ONE-LINE-03-carousel-dpad-fixed-2.json`) and 13/14 on a fresh panel
      (`runs/PRESET-ONE-LINE-03-carousel-fresh-mount.json`) — Left/Right walk the whole history with the
      window sliding, Left at the oldest chip holds still, Down reaches the text field, Up returns to a chip,
      Up again hands off to the session strip, Down from the strip enters the row.
- ✅ V3c The two misses in the first fresh-panel run were fixed at the desk the same night — entering the row
      lands on the marked chip (the redirect is deferred one tick so it runs after Steam's own transfer), and
      Down from a chip hands the ring to the text field through Steam's transfer (`unified-input` nav node)
      instead of a plain `focus()` — and the **re-run on 2026-09-02 passed 14/14 on a fresh panel**
      (`runs/PRESET-ONE-LINE-03-carousel-fresh-mount-2.json`): Down from the strip lands on the marked chip,
      Down from a chip lands in the text field, Right at the newest chip holds, Up returns to the marked chip.
      One step in that run did not move (Left from the second-oldest to the oldest chip); the same transition
      passed in two follow-up probes at the rig's cadence (`…-oldest-chip-probe-a/b.json`), so it is logged as
      a one-off, most likely a press landing in the tail of the 550 ms slide.
- [ ] V3d On Deck, **04** and **01b** — not run in full: both need the animation-mode setting changed on the
      device, and the scroll speed is judged by eye. **Frame rate sampled 2026-09-02 in carousel mode with the
      labels scrolling:** 480 frames in 8017 ms (59.9 fps), 95th-percentile frame gap 16.8 ms, one gap of 50 ms, two labels scrolling at once — the same shape as the 2026-08-28 decode measurement (479 frames / 8002 ms, worst gap 50 ms).

### Docs

- ✅ D1 `docs/roadmap.md`: bug entry (PARTIAL, on-Deck owed), backlog entry, overflow bug and autoscroll item marked closed by this
- ✅ D2 `docs/testing-manual.md`: SMOKE-A line flipped; rows 01b / 02 / 03 / 04
- ✅ D3 `docs/testing.md`: one table row for the feature; decode row instructions say two chips
- ✅ D4 `CHANGELOG.md`: the "WRONG SHAPE" entry rewritten
- ✅ D5 Code comments that said "one chip" (component header, `carouselState.ts`, `section-4.ts`, `presets.ts`)
- ✅ D6 `docs/design-tokens.md`: the chip row's new numbers
- ✅ D7 `docs/archive/major-redesign.md § 7`: D43 recorded next to the § 2.3 spec; `CLAUDE.md` test counts refreshed

### Blockers or bugs found this session

- ❌ **On device, first D-pad run (carousel mode): Left from the right chip left the plugin for the Quick Access
  rail, and Down/Up walked between chips instead of leaving the row** (`runs/PRESET-ONE-LINE-03-carousel-dpad.json`,
  6/9 steps). Steam treats a `Focusable` as a column unless told otherwise, and the `flow-children="horizontal"`
  hint alone did not change that. Fixed at the desk the same hour with explicit Left/Right/Up/Down handlers on every
  chip (`presetRowNav.ts`, the Ask bar's own pattern); the re-run is recorded under V3 below.
- ❌ **Second finding, fresh-panel run:** Steam skipped the row when walking Down from the session strip because
  the carousel's first DOM child (the oldest history chip, clipped off to the left) was a focus stop; and Down
  from a chip put the caret in the text field while Steam bounced the ring to the next chip, because that hop
  was a plain `focus()` across containers. Fixed at the desk: only chips inside the window are focus stops
  (Left at the edge slides the window first, then focuses), and the text field registers a Steam nav node
  (`unified-input`) so `focusUnifiedTextField` uses Steam's transfer — which also hardens the help chip's and
  avatar's hops into the field. Deployed 2026-09-01 20:10; **re-run passed 2026-09-02** (V3c).

---

## 3. Decisions

### Q1 — Carousel mode with chips across — **ANSWERED 2026-09-01: sideways carousel**

The chip memory (up to five) runs left to right and the row is a window on it. A new chip slides in
from the right. Left/Right walks the row, and Left at the left edge pulls an earlier chip back into
view. Up leaves toward the chat, Down goes to the Ask box. This keeps the browse-history feature and
most of today's carousel code ([carouselState.ts](../../src/features/preset-carousel/carouselState.ts));
the slide changes from up/down to left/right.

### Q2 — The green first chip — **ANSWERED 2026-09-01: the help chip owns the whole row**

While "How to use bonsAI" is showing, it is the entire row. Once it is dismissed, the suggestion
chips take the row. No mixing of the two. A useful side effect: the chips' 60-second rotation window
starts when they mount, so it is not spent while the help chip is up.

The maintainer also asked for research on **two chips across instead of three**. That is § 3b.

### Q3 — Scrolling labels — **ANSWERED 2026-09-01: every chip scrolls, slowly and calmly**

Steam's `Marquee` is used. Its `speed` and `delay` are set for a slow crawl; the exact number is
measured on the device because the unit Steam uses is not documented
([Marquee.tsx](../../node_modules/decky-frontend-lib/src/deck-components/Marquee.tsx) has no prop
docs). Working target: about 20 to 25 px per second, a 1.5 s pause before the crawl starts and after
it ends. Under reduced motion, no crawl: the label is cut off with an ellipsis. If Decky's runtime
lookup of the component ever fails, the same cut-off label is the fallback.

---

## 3b. Two chips or three? (research, filed as D43)

### The numbers

Column width is 300 CSS px, measured on device docked at 1080p
([design-language.md](../design-language.md), "The space we are designing for"). The handheld
figure has not been measured; that doc says to re-measure before trusting it.

Chip width with a 4 px gap:

| Layout | Chip width |
|---|---|
| Three across | ~97 px |
| Two across | ~148 px |

Label room is the chip width minus the button's own side padding. The chips are Steam
`DialogButton`s and this plugin sets no padding on them (checked `section-4.ts`, `section-6.ts`), so
the padding is Steam's and has not been measured. Three assumptions bracket it:

| Side padding each | Three across: room / chars | Two across: room / chars |
|---|---|---|
| 0 px | 97 px / 15 | 148 px / 23 |
| 8 px | 81 px / 12 | 132 px / 20 |
| 16 px | 65 px / 10 | 116 px / 18 |

Characters use the device-measured 6.45 px per character at 12 px
([testing.md](../testing.md), PHASE4-CHIPS-01: 219.2 px for 34 characters, 379.8 px for 59).

What the labels are:

| Pool | Count | Shortest | Median | Longest |
|---|---|---|---|---|
| Built-in suggestions (`presets.ts`) | 43 | 16 chars | 35 chars | 52 chars |
| Corpus chips (card name + template) | 161 names | ~20 chars | ~30 chars | ~50 chars |

So:

- **Three across:** no built-in suggestion fits. You see about the first 10 to 12 characters:
  "How do I fix", "What TDP sho", "Why is my De". A chip is not recognisable until it scrolls.
- **Two across:** one suggestion fits. You see the first 18 to 20 characters: "How do I fix stutter",
  "Why is my game crash", "How can I optimize f". Most suggestions are recognisable at a glance.
- **Badged chips are worse.** The Tip and Test badges cost about 21 px (14.7 px measured, plus a 6 px
  margin). Three across leaves a Tip chip about 7 to 9 characters; two across leaves 15 to 17.
- **Larger UI scale is worse.** The Couch profile is 1.18× and Immersive 1.22× to 1.28×
  ([uiScaleProfile.ts:54-61](../../src/data/uiScaleProfile.ts)), which takes 15 to 22 % off every
  count above.

### What each choice costs in behaviour

| | Three across | Two across |
|---|---|---|
| Matches the drawing | Yes ([major-redesign.md:149](major-redesign.md), "three chips, not four") | No. Two was never drawn. Needs a recorded decision. |
| Suggestions on screen | 3 | 2 |
| Distinct suggestions seen per minute (fade, rough) | ~13 to 15 | ~9 to 10 |
| Seeds arrive in threes | All three show | One always waits. The one-chip queue is generalised to two slots instead of deleted. |
| Corpus "Tip" guarantee | Works as is | **Silently broken as is.** The guarantee converts the *last* of the three seeds ([sessionRagComposer.ts:113-120](../../src/features/preset-carousel/sessionRagComposer.ts)), which would be the hidden one. Must convert a visible slot instead. Small change; touches the Phase 4 logic and its tests. |
| Pinned test batches | Rule "first entry not on screen" works | Same rule works |
| D-pad stops on the row | 3 | 2 |
| Motion on screen | Three crawls at once | Two crawls at once |
| Reading a chip | Watch it scroll | Usually read at a glance |

### Recommendation: two across

The drawing says "marquee on overflow", which reads as overflow being the exception. Measured, it is
the rule: at three across, every single suggestion overflows and most show a third of their text. The
row would be three fragments that only make sense in motion. Two across is the smallest change that
makes a chip readable without waiting, and the maintainer's instinct on the device was the same.

The costs are real and named above: one fewer suggestion on screen, a fix to the Tip guarantee, a
two-slot seed queue, and a recorded departure from the drawing. If the maintainer prefers to stay
with the drawing, three across is what § 6 builds, with the one-chip queue deleted instead of
generalised.

Either way, the geometry is **measured on device after the first deploy**, not predicted: the padding
column in the table above is the unknown that decides whether "18 to 20 characters" is really 18 or
really 23.

**Measured on device 2026-09-01** (read with `getBoundingClientRect` from the live page, carousel
mode, a pinned test batch on screen):

| Piece | Measured |
|---|---|
| Column | 300 px at x=48 |
| Chip | 148 × 30 px, gap 4 px, radius 4 px, padding 0 8px (set by the plugin now, not left to Steam) |
| Label room (unbadged chip) | 130.4 px → ~20 characters at 6.45 px |
| Label room with a Test/Test badge | ~101 px → ~15 characters (badge 23 px + 6 px margin) |
| Steam Marquee | present; `--duration` = text width ÷ speed (25 px/s → 12.4 s for 56 characters), animates only the visible overflowing label, short labels stay still |
| Dock / reading area | 157 px / 458 px (one-chip row: 161 / 455) |

So the "8 px" row of the table is the real one, by construction.

---

## 4. Calls I am making myself (say so if you disagree)

- **Height 30px per chip**, per the drawing (today 34). **Gap 4px** between chips. The spec gives no
  gap and the design file for this mockup is not in the repo, so the gap is my number. Both get
  measured on device after deploy.
- **The one-chip helpers go or generalise, per D43.** `singleSlotRotation.ts` and
  `nextFrozenPresetAfter` ([presets.ts:87-92](../../src/data/presets.ts)) exist only because one chip
  was on screen. With three chips, both are deleted and the old rule "first pinned chip not on
  screen" ([presets.ts:293-306](../../src/data/presets.ts)) walks a pinned batch again. With two
  chips, the queue becomes a two-slot queue and `nextFrozenPresetAfter` is still deleted.
- **Fade timings go back** to what they were before the one-chip change: 2 s out, 1 s in, staggered
  750 / 1300 / 1700 ms (two chips: the first two stagger values). The 500 / 500 re-timing existed
  only because one chip left the row blank.
- **The "Tip" and "Test" badges stay pinned** at the left of the chip and only the text scrolls. The
  Tip badge exists to be seen at a glance (Phase 4 track 1). A badge that scrolls away defeats that.
- **Decode mode does not scroll until the scramble has finished locking.** The roadmap item asks for
  this and it avoids scrolling text that is still changing.
- **A chip never rotates out before its label has scrolled through at least once.** The hold time
  (300 ms per character, 8 to 32 s, [presets.ts:281-288](../../src/data/presets.ts)) gets a floor
  of "delay plus one full scroll plus a pause".
- **The agent-suggestion chip** (`presetCarouselInject`,
  [MainTabPresetRow.tsx:101-124](../../src/components/MainTabPresetRow.tsx)) keeps its own row under
  the chips. It is rare and the drawing does not show it.
- **One `Focusable` with `flow-children="horizontal"` wraps the row in every mode.** Precedent:
  the four mode buttons on the Developer tab
  ([DeveloperTab.tsx:411](../../src/components/DeveloperTab.tsx)). Left/Right between chips, Up to
  the chat, Down to the Ask box. Up from the Ask box lands on the row the way it does today
  ([useMainTabAskBarFocus.ts:78-97](../../src/hooks/useMainTabAskBarFocus.ts)).

---

## 5. What the drawing says, and what is built

| | Drawing ([major-redesign.md § 2.3](major-redesign.md)) | Built (`fc1b245`, 2026-08-31) |
|---|---|---|
| Chips on screen | 3, side by side | 1 |
| Width each | a third (`flex: 1 1 0`) | full width |
| Height | 30px | 34px |
| Long labels | scroll sideways inside the third | cut off, and the cut-off does not even fire ([roadmap.md:114-116](../roadmap.md)) |
| First chip | green (help) fill | plain glass; the help chip is its own row above |
| Row height gain | kept | kept (dock 245 → 161px) |

---

## 6. How it will be built

Each step is one commit. Tests stay green between them, so a device regression can be bisected.
"N" is 2 or 3 per D43.

**B1 — Chips side by side for fade / static / decode.**
`MainTabPresetAnimatedChips.tsx` gets back the multi-slot state the one-chip commit removed
(`git show fc1b245^:src/components/MainTabPresetAnimatedChips.tsx` has it: `slots`, `slotFade[i]`,
`runSlot(i)`, and per-slot decode animations driven by one shared frame loop), sized to N and
rendered in a flex row instead of a stack. In `section-4.ts`, the chips get a
`.bonsai-preset-across` flex row: each slot `flex: 1 1 0; min-width: 0`, 30px tall, radius 4. No
pixel widths (design rule 4).

**B2 — Seed rotation for N slots.** Three chips: delete `singleSlotRotation.ts` and its test, delete
`nextFrozenPresetAfter`, fix the comments in `presets.ts` (lines 55-60 and 95-99). Two chips: rename
the queue to a slot queue that hands the third seed to whichever slot rotates first; delete
`nextFrozenPresetAfter` either way. New test: a pinned batch of four across N slots reaches entry
four, then wraps.

**B3 — Sideways carousel.** In `carouselState.ts`, the track offset becomes a window start index,
`visibleWindowTexts` returns the N chips in the window, `mergeContextualSeeds` targets the visible
window, and the initial state is focus 0 with the window at 0. In CSS, the viewport becomes a
horizontal `overflow: hidden` box and the track a flex row. The slide distance is a CSS calc on the
window start index, not a measured pixel value, so design rule 4 holds.

**B4 — Scrolling labels.** `PresetChipLabel` wraps the text in `Marquee` from `@decky/ui`, with the
badges outside the scrolling span. `play` is false under reduced motion and while decode is still
churning. When `Marquee` is undefined, today's span renders instead, and its ellipsis is made to
actually work (`display: block` on the label, the cheap fix from
[roadmap.md:114-116](../roadmap.md)). Speed and delay per Q3. The hold time gets the floor from § 4.

**B5 — Help chip owns the row.** `MainTabPresetRow.tsx` renders either the help chip or the chips
component, never both. `focusFirstPresetChip` already prefers the help chip when it exists.

**B6 — Fade timings back.** Constants only.

**B7 — Tip guarantee (two chips only).** `composeSessionPresets` converts a slot that will be
visible (the second), not the third. Update the 12 composer tests that pin the slot.

**B8 — Tests.** See § 7.

---

## 7. How it will be tested

**Unit (vitest).** `MainTabPresetAnimatedChips.test.tsx`: "exactly one chip" becomes "exactly N";
the memo-comparator guard and the decode tests keep working; the `Marquee` stub already exists
([fakeDeckyUi.tsx:112](../../src/test-harness/fakeDeckyUi.tsx)). `carouselState.test.ts`: window
math for N visible. `singleSlotRotation.test.ts` is replaced by the N-slot pinned-batch test.
`presetChipFocusRing.test.ts` must still pass (no ungated ring rule). `sessionRagComposer.test.ts`
covers the guarantee slot if B7 lands.

**Preview.** `npm run test:preview -- --filter=SMOKE-A`, plus a preview screenshot of the row in
each of the four modes. The SMOKE-A line that says one chip is the target
([testing-manual.md:111](../testing-manual.md)) flips back first, or the row is wrong by definition.
The preview's Decky mocks are approximate, so it proves structure, not pixels.

**On Deck.** Rows in `docs/testing-manual.md`:

| Row | What it proves |
|---|---|
| **PRESET-ONE-LINE-02** (exists, reworded per D43) | N chips across, ~30px, labels scroll. Geometry read from the live page with `getBoundingClientRect` or the probe, not a screenshot. Record the button's side padding: it is the unknown in § 3b. |
| **PRESET-ONE-LINE-03** (new) | D-pad: Left/Right across the chips, Up to the chat, Down to Ask, Up from Ask lands on a chip. Carousel: Left at the edge pulls history in. Blue marker and white ring on the same chip. |
| **PRESET-ONE-LINE-04** (new) | Frame rate with every label scrolling and decode churning, sampled the way PRESET-STREAM-ANIM-01 was. Reduced motion: no scroll, ellipsis instead. Scroll speed feels slow and calm. |
| **PRESET-ONE-LINE-01b** (exists) | Every mode still moves, re-run. |

Per the standing rule in CLAUDE.md, if the device rows need typed questions, they are offered as
pinned test chips first, and the list is confirmed before pinning.

---

## 8. Docs to update

- `docs/roadmap.md`: the bug entry moves to `archive/roadmap-bugs-fixed.md` after the device pass,
  not before. The backlog entry *Preset chips on a single line* becomes done. The overflow bug
  (lines 108-117) and the autoscroll backlog item (lines 571-601) are closed by this work and say so.
  The one-star *rotation is biased to the top of the list* note is untouched.
- `docs/testing-manual.md`: SMOKE-A line 111; rows 02, 03, 04.
- `docs/testing.md`: one table row. The decode row (line 177) describes three chips; reword to N.
- `CHANGELOG.md:24`: rewritten.
- `docs/design-tokens.md`: the chip row's numbers.
- `docs/archive/major-redesign.md § 7`: D43's outcome, so the next reader of § 2.3 sees the departure.
- `docs/audit/maintainer-decisions-locked.md`: D43 locked with the choice.
- Code comments that still say "one chip": the component header, `carouselState.ts`,
  `section-4.ts:118-133`, `presets.ts`.

---

## 9. Things to bring to your attention

1. **Every label scrolls, whatever N is.** At three across a chip shows about a third of its text;
   at two, about half to two thirds. § 3b.
2. **Two across quietly breaks the corpus Tip guarantee unless B7 lands.** The guarantee converts the
   third seed, which would be off screen.
3. **Steam's `Marquee` is a runtime lookup.** If Steam changes its bundle, the fallback is the
   cut-off label. The plugin will not break, but the scrolling would silently stop.
4. **The design file for this mockup is not in the repo.** Only the avatars one is
   (`docs/design/handoffs/ai-character-avatars/`). Gap and padding are my numbers, not the designer's.
5. **The button's side padding is unmeasured** and it decides the real character counts. First
   deploy measures it.
6. **On-Deck verification needs the Deck.** I have not checked whether the bridge is reachable from
   this session. The device rows stay open until they are run.
7. **Rotation still stops 60 seconds after the chips mount** (`PRESET_CAROUSEL_ACTIVE_MS`). The
   scrolling keeps going after that. Unchanged, but worth knowing when watching the row.
8. **Motion budget is measured, not assumed.** Every label scrolling plus decode churn is the
   heaviest state this row has ever had. Row 04 exists for that.
9. **Pinned test chips get harder to read at a glance.** The "Test" badge plus a long question in a
   narrow chip means QA screenshots show partial text. The scroll covers it; the freeze-and-pin
   workflow itself does not change.

---

## 10. Sources

- Bug: [roadmap.md:26-38](../roadmap.md). Backlog record of what `fc1b245` did:
  [roadmap.md:437-449](../roadmap.md).
- Drawing: [major-redesign.md:133-153](major-redesign.md) (§ 2.3), [line 244](major-redesign.md)
  (§ 4.4, "four chips to three"), [line 287](major-redesign.md) (§ 5, marquee is new work).
- Component: [MainTabPresetAnimatedChips.tsx](../../src/components/MainTabPresetAnimatedChips.tsx)
  (786 lines). Pre-change multi-slot version: `git show fc1b245^:src/components/MainTabPresetAnimatedChips.tsx`.
- Row host: [MainTabPresetRow.tsx:63-125](../../src/components/MainTabPresetRow.tsx).
- Carousel math: [carouselState.ts](../../src/features/preset-carousel/carouselState.ts). One-chip
  queue: [singleSlotRotation.ts](../../src/features/preset-carousel/singleSlotRotation.ts).
- Tip guarantee slot: [sessionRagComposer.ts:104-125](../../src/features/preset-carousel/sessionRagComposer.ts).
- Pinned batch rules: [presets.ts:55-105](../../src/data/presets.ts), [presets.ts:293-306](../../src/data/presets.ts).
- Label lengths: `presets.ts` `PRESET_PROMPTS` (43 entries); `data/kb/strategy_seed.json` card
  names (161). Character width: [testing.md](../testing.md) PHASE4-CHIPS-01 measurements.
- UI scale: [uiScaleProfile.ts:54-61](../../src/data/uiScaleProfile.ts).
- Styles: [section-4.ts:76-133](../../src/styles/sections/section-4.ts) (host grid, label ellipsis,
  34px viewport), [section-6.ts:45-59](../../src/styles/sections/section-6.ts) (glass and help
  fills), [gamepadAndPullModels.ts:56-90](../../src/styles/sections/gamepadAndPullModels.ts) (rings).
- Focus handover from Ask: [useMainTabAskBarFocus.ts:78-97](../../src/hooks/useMainTabAskBarFocus.ts).
- Steam's scrolling label: `node_modules/@decky/ui/dist/components/Marquee.d.ts` and `Marquee.js`
  (`@decky/ui` 4.11.3); `node_modules/decky-frontend-lib/src/deck-components/Marquee.tsx`.
- QA rows: [testing-manual.md:111](../testing-manual.md), [testing-manual.md:403-416](../testing-manual.md).
- Design rules: [design-language.md](../design-language.md) rules 1, 4, 6, 8.
