# Design tokens and visual conventions

The visual language of the QAM plugin, in one place. Every value below was read from
the source it cites — if this file disagrees with the code, the code is right and this
file is a bug.

Written 2026-08-09 while designing the chat-slots redesign, because the same values kept
getting re-derived by grep. Companion to [code-clarity.md](code-clarity.md) (file headers)
and `AGENTS.md (Decky focus graph)` (D-pad wiring).

**This file is the *what*. [design-language.md](design-language.md) is the *why*** — the layout
rules these values serve, starting with using every pixel of a 300px column. Read it before
adding a surface; read this one while building it.

---

<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->
**Contents**

- [How styling works here](#how-styling-works-here)
- [Palette](#palette)
  - [Named constants](#named-constants)
  - [Character accent scope variables (chips)](#character-accent-scope-variables-chips)
  - [Ask-mode accents](#ask-mode-accents)
  - [Text and neutrals](#text-and-neutrals)
- [Surfaces](#surfaces)
  - [AI reply bubble](#ai-reply-bubble)
  - [User bubble](#user-bubble)
- [The inline popover idiom](#the-inline-popover-idiom)
- [Focus rings](#focus-rings)
- [Type scale](#type-scale)
- [UI scale](#ui-scale)
- [Layout constants](#layout-constants)
  - [The tab bar](#the-tab-bar)
  - [The chat's name row](#the-chats-name-row)
  - [The chats menu](#the-chats-menu)
  - [The question box's strip](#the-question-boxs-strip)
  - [The answer's corner icons](#the-answers-corner-icons)
- [Known drift](#known-drift)
<!-- /toc -->

## How styling works here

**There are no `.css` files in `src/`.** The entire stylesheet is a JavaScript template
string, assembled at runtime and injected into one `<style>` tag.

- [bonsaiScopeStylesheet.ts](../src/styles/bonsaiScopeStylesheet.ts) — `buildScopeStylesheet()`
  concatenates `scopeBase` + `section-1` … `section-9` + the gamepad/pull-models sheet.
- Everything is scoped under `.bonsai-scope`. Rules are `!important`-heavy on purpose:
  they are overriding Steam's own CSS inside its UI, not authoring in a clean document.
- Content rendered through Decky `showModal()` escapes `.bonsai-scope`, so it must be
  wrapped in [BonsaiModalScope](../src/components/BonsaiModalScope.tsx), which re-injects
  a portal stylesheet and the UI-scale bridge.

Consequence for anyone adding UI: **a new class needs a rule added to a section file**,
and modal content needs `BonsaiModalScope` or it renders unstyled.

---

## Palette

Declared as TypeScript constants in
[unified-input/constants.ts](../src/features/unified-input/constants.ts) and
[data/askMode.ts](../src/data/askMode.ts); the rest live inline in the section files.

### Named constants

| Token | Value | Used for |
|---|---|---|
| `ASK_LABEL_COLOR` | `#a8b4c4` | Ask bar labels, menu row text |
| `ASK_LABEL_COLOR_50` | `rgba(168,180,196,0.5)` | Placeholder / dimmed label, same chroma |
| `ASK_LABEL_READY_COLOR` | `#d0dbe8` | The small Ask button's word once the prompt has text |
| `BONSAI_FOREST_GREEN` | `#2e8753` | `[beta]` tags, latency labels, About warning |
| `DECK_MENU_PANEL_BG` | `rgb(28,36,44)` | Inline popover surface |
| `DECK_MENU_ROW_SELECTED_BG` | `rgb(40,50,62)` | Selected popover row |
| `DECK_HIGHLIGHT_CYAN` | `#9ce7ff` | Sliders, links, active controls, section labels |
| `#f16a5a` | `#f16a5a` | Delete chat in the chats menu ([chatsMenuStyles.ts](../src/features/chat-title/chatsMenuStyles.ts) `__action--danger`), and the Copy icon's error state ([answerBubble.ts](../src/styles/sections/answerBubble.ts)) |
| `#f28b7d` | `#f28b7d` | **Reserved, no consumer** — mock 5c's hover shade for the delete control; 5c's custom modal footer was dropped by board 8d |

### Character accent scope variables (chips)

Set on the scope in [characterUiAccent.ts](../src/data/characterUiAccent.ts), always — the default
green applies even when no character is chosen, so nothing is ever unset. **Added 2026-09-17 (plan
60, D110):**

| Variable | Value | Used for |
|---|---|---|
| `--bonsai-ui-accent-badge` | The active accent at 80% alpha | The Tip dot on a suggestion chip |
| `--bonsai-ui-accent-toned` | 70% accent mixed with 30% `#c4d3e2` (the label colour) | The `[beta]` tag; gold `#f1c40f` becomes `#e4c94e`, green `#2e8753` becomes `#5b9e7e`. **No longer the decode-mode chip label, since 2026-09-21:** the maintainer reported on 2026-09-19 that a chip's words and its icon were coloured the same way, and only the icon should carry the accent. The rule was meant to apply only while scrambled text was still resolving -- its own comment said so -- but it never checked, so it stayed on for the chip's whole life. Decode-mode labels now use the plain `#c4d3e2` every other chip style already used. **The decode chip's typing mark does use it, since 2026-09-28 (`13ad6566`):** the mark is drawn in its own element as `var(--bonsai-ui-accent-toned, #5b9e7e)`, so it is RGB 91,158,126 with no character chosen and the chosen character's toned accent otherwise, while the letters stay `#c4d3e2`. |

### Ask-mode accents

Three modes, each driving six CSS variables on the input host
([askMode.ts:19-55](../src/data/askMode.ts), consumed at
[MainTabUnifiedAskBar.tsx:353-358](../src/components/MainTabUnifiedAskBar.tsx)):

| Mode | Accent | Fill | Breathe low → high | Glow low → high |
|---|---|---|---|---|
| speed | `#4ade80` | `rgba(74,222,128,0.06)` | `0.24` → `0.62` | `0.04` → `0.14` |
| strategy | `#facc15` | `rgba(250,204,21,0.05)` | `0.22` → `0.58` | `0.04` → `0.12` |
| expert | `#f87171` | `rgba(248,113,113,0.06)` | `0.24` → `0.62` | `0.04` → `0.14` |

> **`#f87171` is not a reserved danger colour.** It is the **Expert** ask-mode accent *and*
> the destructive-control colour (`.bonsai-pullmodels-delete-btn` uses
> `rgba(248,113,113,0.45)` border on `rgba(48,24,26,0.65)`). Red on this surface means
> "Expert mode" as often as it means "delete". Don't assume it reads as danger.
> Delete chat in the chats menu is a deliberate exception: it uses `#f16a5a`, a distinct red
> from the Expert accent, so a destructive action in the menu cannot be mistaken for an ask-mode cue.

### Text and neutrals

Recurring inline values across the section files: `#e8eef5` and `#d4dde6` for body text,
`#8fa8c4` for muted, `#6b7c90` for dim/empty states, `#f2cf84` for warning lines
(latency, applied-tuning banners).

---

## Surfaces

| Class | Background | Border | Notes |
|---|---|---|---|
| `.bonsai-glass-panel` | `rgba(18,26,34,0.25)` | `1px solid rgba(255,255,255,0.07)` | The default card ([section-6.ts:17](../src/styles/sections/section-6.ts)) |
| `.bonsai-preset-glass` | `linear-gradient(180deg, rgba(56,70,84,0.5) 0%, rgba(16,22,30,0.55) 100%)` | `1px solid rgba(255,255,255,0.10)` | Preset chips. Since 2026-09-01: **30px** tall, radius 4, `padding: 0 8px`, label scrolls through Steam's `Marquee` when it overflows ([section-4.ts](../src/styles/sections/section-4.ts)). **Since 2026-09-17 (plan 60, D110):** the flat fill and 7% border became the gradient and 10% border above, with `box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 3px rgba(0,0,0,0.4)` at rest (a top hairline plus a soft shadow beneath) in place of no shadow; the two chips are **147 wide** with a **6px gap** between them (was 148 and 4); the row host carries 8px of room below the chips (5 for the shadow, 3 clear) so the shadow is not cut off. **The chip the D-pad is on (since 2026-10-02, the maintainer's pick "highlight 1, the soft fill")** lays a pale blue tint over its own gradient, `background: linear-gradient(rgba(56,189,248,0.20), rgba(56,189,248,0.20)), <the gradient above>`, keeps the rest shadow as it is, and brightens its label to `#eef7fd`. Before that it carried a light bar along its bottom edge (`inset 0 -2px 0 rgba(56,189,248,0.55)`, once 0.85) and a `#dcebf8` label. Pressing past either end of the row still flashes, now as `inset 0 -2px 0 rgba(150,225,255,1), 0 3px 8px -2px rgba(56,189,248,0.55)` added to the rest shadow, for about a third of a second. **Steam's white focus ring no longer targets chips:** the row has clipped it, invisible, since 2026-09-01, so the rule was dropped and the bottom bar became the chip's only focus cue. |
| Menu surface | `rgb(28,36,44)` | `1px solid rgba(255,255,255,0.08)` | Radius 6, `box-shadow: 0 8px 22px rgba(0,0,0,0.55)` |

### AI reply bubble

[section-6.ts:439-448](../src/styles/sections/section-6.ts) — each value is a `var()` with
a literal fallback, so a character theme can retint it:

```
border-radius: 10px
border:        1px solid var(--bonsai-chat-ai-bubble-border, rgba(46,135,83,0.48))
background:    linear-gradient(0deg,
                 var(--bonsai-chat-ai-bubble-wash, rgba(130,183,152,0.11)),
                 var(--bonsai-chat-ai-bubble-wash, rgba(130,183,152,0.11))),
               linear-gradient(180deg,
                 var(--bonsai-chat-ai-bubble-bg-top,    rgba(46,135,83,0.12)) 0%,
                 var(--bonsai-chat-ai-bubble-bg-bottom, rgba(18,52,34,0.55)) 100%)
color:         var(--bonsai-chat-ai-bubble-text, #d4dde6)
```

`--bonsai-chat-ai-bubble-wash` is a constant flat layer over the gradient, not part of it:
the accent lifted 40% toward white at 11% alpha. The lift is `v + (255 - v) * 0.4` per
channel ([characterUiAccent.ts](../src/data/characterUiAccent.ts) `liftRgb`), applied at
**every** accent rather than only dark ones, so the card reads the same way across the
catalog. The fallback is forest green `#2e8753` lifted the same way, `rgb(130,183,152)`.

Truncated bubbles use `.bonsai-chat-ai-bubble-inner--faded`, a
`mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)`.

### User bubble

Right-aligned via `.bonsai-chat-turn-row-header`
([section-6.ts:190-199](../src/styles/sections/section-6.ts)): `width: fit-content`,
`max-width: min(88%, 280px)`, `margin-left: auto`, `align-self: flex-end`,
`text-align: right`.

---

## The inline popover idiom

Three popovers exist — ask-mode, attach, and any future one. They all follow
[MainTabAskModeMenuPopover.tsx](../src/components/MainTabAskModeMenuPopover.tsx), which is
the reference implementation. Four rules, each learned the hard way and commented in place:

1. **Absolute within the host, never portalled to `document.body`** — a body portal does
   not render inside the QAM overlay.
2. **Opens upward**, i.e. a *negative* host-relative `top`. There is deliberately no
   `Math.max(0, …)` clamp; that clamp once pinned a 108px menu inside a ~70px host.
3. **Stay hidden until measured.** The surface height is read in a `requestAnimationFrame`
   pass; painting before it is known lands the menu at the wrong top for one frame.
4. **The scope gets `bonsai-ask-menu-open-scope` while open**
   ([section-8.ts:45-60](../src/styles/sections/section-8.ts)), which forces
   `overflow: visible` on `TabContentsScroll` so the panel can escape the scroll container,
   and drops the Ask row to `z-index: 0` while the host goes to `60`.

Row typography (`DECK_MENU_*`): `13px`, `font-variant: small-caps`,
`text-transform: lowercase`, `letter-spacing: 0.03em`, `line-height: 1.5`, padding `8px 10px`,
weight `700` when selected and `500` otherwise, colour `ASK_LABEL_COLOR`.

---

## Focus rings

White, always — not the character accent. Two variants, both in
[gamepadAndPullModels.ts:16-26](../src/styles/sections/gamepadAndPullModels.ts):

**Chips are now the exception: since 2026-09-17 (plan 60) the outer ring rule no longer targets them, because the row was clipping it invisible anyway, and a pale blue fill on the chip is its focus cue instead (a light bar along the bottom edge until 2026-10-02).**

**Outer ring** (ask primary, `.bonsai-askbar-target`, and everything else this list still covers):
```
outline: 2px solid rgba(255,255,255,0.9); outline-offset: 2px;
box-shadow: 0 0 0 2px rgba(255,255,255,0.92), 0 0 0 5px rgba(255,255,255,0.2);
```

**Inset ring** (menu rows, where an outer ring would clip against the panel edge):
```
outline: 2px solid rgba(255,255,255,0.85); outline-offset: -2px;
box-shadow: inset 0 0 0 1px rgba(255,255,255,0.55);
```

Settings action buttons use a third, hybrid variant in
[scopeBase.ts:119-124](../src/styles/sections/scopeBase.ts) — an outer outline at
`rgba(255,255,255,0.88)` with `outline-offset: 2px`, plus an *inset* `box-shadow` at
`rgba(255,255,255,0.45)`. Its `Focusable` host has its own outline suppressed so the ring
hugs the button rather than the wrapper.

**The question box's ring** (since 2026-10-02, measured on the Deck the same day): `outline: 2px solid rgba(255,255,255,0.88); outline-offset: -2px;`, drawn **inside** the field's edge so the Ask row, the dock and the glass card cannot cut it off. It follows only Steam's `gpfocus` class on the input or textarea, never plain focus, so an open on-screen keyboard adds no second ring ([section-5.ts](../src/styles/sections/section-5.ts)).

**The Show details line in the chip's slot** uses the inset ring above: `outline: 2px solid rgba(255,255,255,0.85); outline-offset: -2px;` with `box-shadow: inset 0 0 0 1px rgba(255,255,255,0.55)`, because the chip row clips anything drawn outside its box. The line's label brightens to `#e8eef5` and its rule to `rgba(255,255,255,0.28)` while it has the ring; the swap with the chip is a 120 ms fade, instant with reduced motion ([detailsSlot.ts](../src/styles/sections/detailsSlot.ts)).

Two standing prohibitions, both recorded as reverts in the source:

- **Never source the ring from `--bonsai-ui-tab-focus-1/-2`.** Those are the *tab strip's*
  accent pair, set from the active AI character. The ring silently followed the character
  and turned gold/purple on device; measured 2026-08-04 as
  `outline: rgba(241,196,15,0.92) solid 2px` on a focused preset chip.
- **Never add a catch-all `button.gpfocus` rule.** Reverted 2026-08-04 — it painted the
  thick rounded ring onto controls SteamOS already outlines. The way to get consistency is
  to make a control a real Decky `Focusable`, not to widen this selector.

---

## Type scale

| Context | Size | Line height |
|---|---|---|
| Settings section stack | 14 | 1.4 |
| Small Ask button word | 12, weight 800, small-caps, `letter-spacing: 0.04em` | 1 |
| Chat's name in Decky's bar | 13, weight 800 (its small line under it: 8) | 16 (line: 10) |
| Tab bar: the current tab's name | 11, weight 800, `letter-spacing: 0.1em`, capitals | 1 |
| Menu rows (`DECK_MENU_FONT_PX`) | 13 | 1.5 |
| Ask input text (`UNIFIED_TEXT_FONT_PX`) | 12 | 1.2 |
| Transcript | 12 | 1.4 |
| Prose (`.bonsai-prose`) | 12 | 1.4 |
| Section labels | 10, weight 700, `letter-spacing: 0.03em`, `#9ce7ff` | — |
| Empty / meta text | 10–11, `#6b7c90` | — |

The section-label row is the `.bonsai-pullmodels-recommend-title` treatment
([gamepadAndPullModels.ts:123-127](../src/styles/sections/gamepadAndPullModels.ts)) — the
clearest instance of the pattern, not a shared class. New section labels should match it
by hand.

`UNIFIED_TEXT_FONT_PX` and `UNIFIED_TEXT_LINE_HEIGHT` must match the `TextField` **and**
the measure/overlay nodes, or the fake caret drifts from the painted text.

---

## UI scale

`uiScalePx(n)` ([uiScalePx.ts](../src/styles/sections/uiScalePx.ts)) emits
`calc(${n}px * var(--bonsai-ui-scale, 1))`. Use it for any px token in a section file that
should track the user's scale profile; raw px is correct only for things that must not
scale (hairlines, the icon strip).

| Profile | Multiplier | Classified when |
|---|---|---|
| Handheld | `1` | viewport < 600px (`HANDHELD_VIEWPORT_MAX_PX`) |
| Desktop | `1` | between the two thresholds |
| Couch | `1.18` | viewport ≥ 960px (`EXTERNAL_COUCH_VIEWPORT_MIN_PX`) |
| Immersive | `1.22` | dev-only — `SHOW_IMMERSIVE_UI_SCALE` is `false` |

Immersive is capped at `1.28` (`UI_SCALE_IMMERSIVE_MAX_MULTIPLIER`) and is not reachable in
shipped builds.

---

## Layout constants

All from [unified-input/constants.ts](../src/features/unified-input/constants.ts).

| Constant | Value | Meaning |
|---|---|---|
| `UNIFIED_INPUT_HEIGHT_MAX_PX` | 200 | Whole glass card cap |
| `UNIFIED_INPUT_ICON_STRIP_PX` | 29 | The box's bottom strip (24 + 5 of ring room underneath, `UNIFIED_INPUT_CORNER_RING_ROOM_PX`): paperclip, game tag, mode, mic or Stop, the X, the small Ask |
| `UNIFIED_TEXT_BODY_MIN_PX` | 42 | Empty text body floor |
| `BONSAI_PLUGIN_SIDE_PAD_PX` | 0 | Tab body horizontal inset (was 4 until 2026-08-15; rows read as short of the QAM edges on device) |
| `TAB_TITLE_ICON_PX` / `TAB_TITLE_MAIN_TAB_ICON_PX` | 26 / 36 | The size each tab's icon is made at ([tabTitles.tsx](../src/features/plugin-shell/tabTitles.tsx)); the tab bar draws them smaller (see "The tab bar" below) |
| `TAB_STRIP_BODY_GAP_PX` | 4 | Gap under the tab bar (and under Decky's name row on the chat tab) |
| `DOCK_ROW_GAP_PX` | 2 | The one gap in the ask area: chips to question box |
| `BONSAI_CHAT_INPUT_TO_TRANSCRIPT_GAP_PX` | 12 | Ask bar → transcript |
| `BONSAI_CHAT_AI_BUBBLE_MAX_FRAC` | 0.92 | AI bubble width as a fraction of the column |

The QAM column is roughly **400 × 800**. Design against that, not the Deck's 1280×800 screen —
only `showModal()` content escapes the column.

> **Disputed by measurement, 2026-08-16.** On a Deck output at 1080p (`devicePixelRatio` 1.28, UI
> scale profile `desktop`), [scripts/probe_deck_ask_row_width.py](../scripts/probe_deck_ask_row_width.py)
> reports `.bonsai-scope` at **300 × 752** and the `_TabContentsScroll` body at **300 × 667** — not
> 400 × 800. **Settled for the Deck's own screen, 2026-10-09 (plan 84): the column is 300 × 454 points** (1.5 screen pixels per point; see design-language.md), so 300 wide holds on handheld too; the 400 figure was never right. The
> difference is not cosmetic: designing against 400 when the column is 300 makes every layout 25%
> too optimistic. Re-measure before trusting either number, and see
> [design-language.md](design-language.md) § *The space we are designing for*.

### The tab bar

Plan 84 step 4 ("T3"); step 6 put it in the strip at the very top of the menu. One row, 20 points tall in every state, five columns: LB, the tabs before, the current tab (icon and name), the tabs after, RB. Nothing opens from it and nothing is drawn outside it. Constants in `unified-input/constants.ts`, drawn by [tabIndicatorBar.ts](../src/styles/sections/tabIndicatorBar.ts).

| Constant | Value | Meaning |
|---|---|---|
| `TAB_BAR_HEIGHT_PX` | 20 | The bar's height (Steam's 14-point strip plus 6 of Decky's own padding) |
| `TAB_BAR_EDGE_PAD_PX` | 16 | LB and RB sit this far in from each edge, lined up with Decky's back arrow below |
| `TAB_BAR_COLUMN_GAP_PX` | 6 | Between the five columns |
| `TAB_BAR_NAME_PX` | 11 | The current tab's name (weight 800, `letter-spacing: 0.1em`, capitals). Its words, not icon plus words, are centred |
| `TAB_BAR_CURRENT_ICON_PX` / `..._ICON_GAP_PX` / `..._PAD_X_PX` | 12 / 4 / 6 | The current tab's icon (it hangs off the left of the name), the gap to the name, the middle column's own side padding |
| `TAB_BAR_SIDE_ICON_PX` / `..._SIDE_ICON_GAP_PX` | 11 / 7 | The other tabs' small dimmed icons (`rgba(168,182,198,0.55)`); the gap gives way before an icon would touch LB or RB |
| `TAB_BAR_SHOULDER_MARK_PX` / `..._SHOULDER_W_PX` / `..._SHOULDER_REACH_PX` | 9 / 16 / 12 | LB and RB: the marks' text size, the same fixed box for both so the name stays on the centre, and how far a finger's target reaches past the mark into the edge padding |
| `TAB_BAR_SHOULDER_DIM_OPACITY` | 0.32 | LB and RB while the ring is elsewhere; full strength (`#eef3f8`) only while the ring is on the bar |
| `TAB_BAR_BUG_ICON_SCALE` | 26 / 22 | The Developer tab's bug artwork is drawn this much larger so it matches the others |
| `TAB_BAR_STRIP_BG_HEX` | `#141c24` | Only a contrast reference now: `--bonsai-ui-tab-lit` is checked against it. The solid strip it was the colour of is gone; whether the real background is darker has not been measured |
| `TAB_BAR_SWITCH_FADE_MS` | 120 | Used only by the Show details swap with the chip (`detailsSlot.ts`); the tab bar fades nothing |
| `--bonsai-ui-tab-lit` (CSS var, computed in `characterUiAccent.ts`, `liftForBar()`) | computed | The current tab's icon and name colour, and the lit left edge of the open chat in the chats menu. The character's main colour lifted toward white only as far as needed to read at **6:1** contrast against `TAB_BAR_STRIP_BG_HEX` (`TAB_BAR_LIT_MIN_CONTRAST`); a colour already at 6:1 is left alone. Astarion's grey is hand-picked (`#c3d0d1`), by the maintainer's choice from a side-by-side mockup on 2026-09-17 |

The ring on the bar: the whole bar wears an inset `2px rgba(255,255,255,0.85)` ring and a `rgba(255,255,255,0.06)` fill, keyed on Steam's `gpfocus` / `gpfocuswithin` only; plain browser focus draws nothing.

### The chat's name row

Plan 84 step 5. It sits in Decky's title bar beside the back arrow, outside bonsAI's box, so it has its own stylesheet under `.bonsai-chat-title` ([chatTitleStyles.ts](../src/features/chat-title/chatTitleStyles.ts)). Unlike the rest of this file, **it does not follow the UI-size setting** (bonsAI's scale variable is set on bonsAI's box, which this view is outside of; Decky's own bar does not scale either).

| What | Value | Notes |
|---|---|---|
| Decky's row | 28 tall, back arrow 40 wide (`DECKY_BACK_ARROW_W_PX`) | Measured on the Deck 2026-10-08. An empty space the arrow's width on the right keeps the words centred; it is measured from Decky's bar at run time, not fixed at 40 (Decky leaves a 10-point gap after its arrow) |
| The name | 13, weight 800, `#e8eef5`, one line, cut with "..." | The words are centred, not the group: an empty 10-point space before the name balances the 10-point menu arrow after it, 3 points apart. The words box measured 156.4 points wide on the Deck (the plan asked for 139), its centre 0.19 points off the panel's |
| A name that does not fit | Slides once to show the rest while the ring is on it | Stays still for anyone who asked for less motion |
| The small line | 8, `rgba(168,182,198,0.72)`: "LT chat 2 of 7 RT" | LT and RT are 7-point keycaps (1px border `rgba(168,182,198,0.4)`, radius 3) at `KEY_DIM_OPACITY` 0.32, full strength only while the ring is on the name |
| The menu arrow | 10 | Turns over while the menu is open |
| The ring on the name | `0 0 0 2px rgba(255,255,255,0.85)` and a `rgba(255,255,255,0.06)` fill | Radius 4 |
| Other tabs | The plain wordmark "bonsAI" | No version (it is on the About tab), no name row |

### The chats menu

Plan 84 step 5. It drops over the answer from the chat's name, its foot on the ask area's top edge ([chatsMenuStyles.ts](../src/features/chat-title/chatsMenuStyles.ts)). It sits inside bonsAI's box, so it does follow the UI-size setting. It replaced the saved-chats row.

| What | Value |
|---|---|
| Surface | Fully opaque `rgb(18,26,34)`, padding 6, at most 260 tall (then it scrolls), 1px `rgba(255,255,255,0.06)` bottom edge |
| Heading "Your chats" | 10, weight 800, `letter-spacing: 0.08em`, capitals, `#9ce7ff` |
| A chat's row | 27 tall, text 12, `rgba(255,255,255,0.04)` fill, radius 4. The open chat has a 3-point left edge in `--bonsai-ui-tab-lit`, a `0.08` fill and weight 800. Its time stamp is 10, `#8fa8c4`, at the right |
| Dots | 6-point circles: solid `#52d88a` = a reply is waiting; a 1.5-point `#9ce7ff` ring = still writing |
| The actions | A two-column grid with 4-point gaps, each 27 tall, text 11, 13-point line icons. Delete chat is `#f16a5a`. Greyed actions are 45% opacity and stay stops that do nothing |
| The ring | The inset ring (see "Focus rings") |

### The question box's strip

Plan 84 step 2. Left to right: paperclip, game tag, mode, mic (Stop while an answer is being written), the X (only while the box has words), the small Ask. The strip is `UNIFIED_INPUT_ICON_STRIP_PX` (29) tall. Styles in [section-8.ts](../src/styles/sections/section-8.ts); the two parts that are not icons are [AskStripGameTag.tsx](../src/components/AskStripGameTag.tsx) and [AskStripSendButtons.tsx](../src/components/AskStripSendButtons.tsx).

| What | Value |
|---|---|
| Game tag | A 13-point game-pad icon and the game's name ("No game" when none runs): 10 italic, `#8fa8c4`, margin `0 6px 0 7px`; the name shrinks to "..." when the strip is full. Not a stop: pressing it does nothing |
| The X | A 20-point button with a 16-point icon, `#dbe6f3`, 50% opacity (92% with the ring). Just left of Ask, only with words in the box |
| The small Ask | 22 tall, `0 8px` padding, 1px `rgba(255,255,255,0.18)` edge, radius 4, fill `rgba(255,255,255,0.10)`, the word 12 weight 800 in small capitals in `ASK_LABEL_COLOR`, an 11-point send arrow. A finger's target reaches 4 points up and left and 5 right and down past the drawn pill |
| Small Ask, words in the box | Word `ASK_LABEL_READY_COLOR`, fill `rgba(255,255,255,0.14)` |
| Small Ask, resting (an answer is being written) | 38% opacity and disabled |

### The answer's corner icons

Plan 84 step 3. Read aloud in the lower-left, Copy in the lower-right, both in the bottom band of the answer's bubble ([answerBubbleCorners.ts](../src/styles/sections/answerBubbleCorners.ts) and [answerBubble.ts](../src/styles/sections/answerBubble.ts)).

| What | Value |
|---|---|
| Each icon | A 20 by 20 box with no border or fill, `#d4dde6` at 50% opacity, 95% with the ring. Read aloud turns `#f87171` while it speaks; Copy turns `#9ce7ff` when copied and `#f16a5a` on an error |
| The ring on a corner icon | `2px rgba(255,255,255,0.9)`, offset 0, hugging the box |
| The bottom band | **25 points** of padding under the last line when Read aloud is there (Copy alone keeps 8). Bottom up: the box sits 2 above the bubble's edge, 20 tall, the ring 2, 2 of clearance. Measured on the Deck 2026-10-08: the last line's bottom is 4 points clear of the box and 2 of the ring |
| Left inset | The speaker's strip is padded 7 from the bubble's left edge |

---

## Known drift

- The user bubble is capped by `max-width: min(88%, 280px)` in
  [section-6.ts:193](../src/styles/sections/section-6.ts), and that is now the only place it is
  set. A `BONSAI_CHAT_USER_BUBBLE_MAX_PX` constant of 260 used to sit beside it with nothing
  reading it; it was deleted on 2026-09-13, along with the deprecated `ASK_MODE_OUTLINE` alias,
  a muted forest-green variant, and a transcript font-size constant that nothing read.
- Neutrals are inline literals, not constants. `#e8eef5`, `#d4dde6`, `#8fa8c4`, `#6b7c90`
  each appear in several section files independently; there is no single source for them.
