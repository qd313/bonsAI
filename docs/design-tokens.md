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
| `ASK_LABEL_READY_COLOR` | `#d0dbe8` | Ask label once the prompt has text |
| `BONSAI_FOREST_GREEN` | `#2e8753` | `[beta]` tags, latency labels, About warning |
| `DECK_MENU_PANEL_BG` | `rgb(28,36,44)` | Inline popover surface |
| `DECK_MENU_ROW_SELECTED_BG` | `rgb(40,50,62)` | Selected popover row |
| `DECK_HIGHLIGHT_CYAN` | `#9ce7ff` | Sliders, links, active controls, section labels |
| `#f16a5a` | `#f16a5a` | Chat-slot delete stop, glyph colour when it is the active D-pad stop ([section-6.ts](../src/styles/sections/section-6.ts) `.bonsai-chat-slot-delete--active-stop`) |
| `#e04a3a` family | `rgba(224,74,58,0.8)` border, `rgba(224,74,58,0.25)` glow | Border and glow around that same stop |
| `#f28b7d` | `#f28b7d` | **Reserved, no consumer** — mock 5c's hover shade for the delete control; 5c's custom modal footer was dropped by board 8d |

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
> The chat-slot delete stop is a deliberate exception: it uses the `#f16a5a` /
> `rgba(224,74,58,…)` family, a distinct red from the Expert accent, so a destructive stop
> inside the slot row cannot be mistaken for an ask-mode cue.

### Text and neutrals

Recurring inline values across the section files: `#e8eef5` and `#d4dde6` for body text,
`#8fa8c4` for muted, `#6b7c90` for dim/empty states, `#f2cf84` for warning lines
(latency, applied-tuning banners).

---

## Surfaces

| Class | Background | Border | Notes |
|---|---|---|---|
| `.bonsai-glass-panel` | `rgba(18,26,34,0.25)` | `1px solid rgba(255,255,255,0.07)` | The default card ([section-6.ts:17](../src/styles/sections/section-6.ts)) |
| `.bonsai-preset-glass` | `rgba(18,26,34,0.22)` | `1px solid rgba(255,255,255,0.07)` | Preset chips; `box-shadow: none`. Since 2026-09-01: **30px** tall, radius 4, `padding: 0 8px`, **two across** with a 4px gap (`presetRowLayout.ts`, decision D43), label scrolls through Steam's `Marquee` when it overflows ([section-4.ts](../src/styles/sections/section-4.ts)) |
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

**Outer ring** (chips, ask primary, `.bonsai-askbar-target`):
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
| Ask primary label | 15, weight 600, small-caps, `letter-spacing: 0.55px` | 1 |
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
| `UNIFIED_INPUT_ICON_STRIP_PX` | 24 | Attach / mode / mic strip inside the host |
| `UNIFIED_TEXT_BODY_MIN_PX` | 42 | Empty text body floor |
| `ASK_BAR_PRIMARY_MIN_HEIGHT_PX` | 36 | Ask row and primary button touch target |
| `BONSAI_PLUGIN_SIDE_PAD_PX` | 0 | Tab body horizontal inset (was 4 until 2026-08-15; rows read as short of the QAM edges on device) |
| `TAB_TITLE_ICON_PX` / `..._TAB_CELL_PX` | 26 / 32 | LB/RB strip icon and its cell |
| `TAB_STRIP_BODY_GAP_PX` | 4 | Gap under the LB/RB strip |
| `TAB_BAR_REST_HEIGHT_PX` / `TAB_BAR_OPEN_HEIGHT_PX` | 20 / 66 | The collapsing tab bar (plan 30): thin at rest. The open strip was raised from 54 to 66 by the maintainer on 2026-09-17 (plan 59), the middle of three heights drawn over a Deck photo, to cover the chat row's dots without covering the whole chat row |
| `TAB_BAR_DASH_W_PX` / `TAB_BAR_DASH_H_PX` / `TAB_BAR_DASH_ACTIVE_EXTRA_H_PX` / `TAB_BAR_DASH_GAP_PX` | 14 / 3 / 2 / 4 | One dash per mounted tab; the active dash is taller |
| `TAB_BAR_NAME_PX` / `TAB_BAR_SHOULDER_MARK_PX` | 11 / 9 | Active name at rest; the LB/RB marks' own text, inside the pill (plan 59) |
| `TAB_BAR_CELL_HEIGHT_PX` / `TAB_BAR_CELL_ICON_PX` / `TAB_BAR_CELL_BUG_ICON_PX` | 44 / 22 / 26 | Plan 59: each open-strip cell's height, and the one icon size every cell draws at — the bug's own artwork needs 26 to read the same size as the rest at 22 |
| `TAB_BAR_CELL_NAME_PX` / `TAB_BAR_CELL_RADIUS_PX` | 9.5 / 8 | Plan 59: the lit cell's name under its icon (small capitals as drawn; plain capitals at the same size is the fallback if small capitals read too small on the Deck) and the lit cell's rounded corners |
| `TAB_BAR_STRIP_PAD_Y_PX` / `TAB_BAR_STRIP_PAD_X_PX` / `TAB_BAR_CELL_GAP_PX` | 5 / 6 / 2 | Plan 59: the open strip's own top/bottom and left/right padding, and the gap between cells |
| `TAB_BAR_SLOT_W_PX` | 20 | Plan 59: the fixed width of the LB/RB slots, so the cells never move when the marks hide |
| `TAB_BAR_PILL_PAD_Y_PX` / `TAB_BAR_PILL_PAD_X_PX` | 3 / 4 | Plan 59: the LB/RB pill's own padding, reusing the chat row's pill values |
| `TAB_BAR_SWITCH_FADE_MS` | 120 | Plan 59: the tab-switch fade, on the lit cell's fill and the name's opacity and colour |
| `TAB_BAR_STRIP_BG_HEX` | `#141c24` | Plan 59: the open strip's solid bar colour. The lit accent variable below is computed to read against this exact value |
| `--bonsai-ui-tab-lit` (CSS var, computed in `characterUiAccent.ts`, `liftForBar()`) | computed | Plan 59: the strip's lit icon and name colour, and the rest bar's lit dash and name too, so the two never drift apart. The character's main colour lifted toward white only as far as needed to read at **6:1** contrast against the bar (`TAB_BAR_LIT_MIN_CONTRAST`); a colour already at 6:1 is left alone. Astarion's grey is hand-picked (`#c3d0d1`) instead of the rule's own answer, by the maintainer's choice from a side-by-side mockup on 2026-09-17 — every other character still follows the rule |
| `BONSAI_CHAT_INPUT_TO_TRANSCRIPT_GAP_PX` | 12 | Ask bar → transcript |
| `BONSAI_CHAT_AI_BUBBLE_MAX_FRAC` | 0.92 | AI bubble width as a fraction of the column |

The QAM column is roughly **400 × 800**. Design against that, not the Deck's 1280×800 screen —
only `showModal()` content escapes the column.

> **Disputed by measurement, 2026-08-16.** On a Deck output at 1080p (`devicePixelRatio` 1.28, UI
> scale profile `desktop`), [scripts/probe_deck_ask_row_width.py](../scripts/probe_deck_ask_row_width.py)
> reports `.bonsai-scope` at **300 × 752** and the `_TabContentsScroll` body at **300 × 667** — not
> 400 × 800. Which figure holds on handheld is **UNKNOWN**; nobody has re-measured undocked. The
> difference is not cosmetic: designing against 400 when the column is 300 makes every layout 25%
> too optimistic. Re-measure before trusting either number, and see
> [design-language.md](design-language.md) § *The space we are designing for*.

---

## Known drift

- The user bubble is capped by `max-width: min(88%, 280px)` in
  [section-6.ts:193](../src/styles/sections/section-6.ts), and that is now the only place it is
  set. A `BONSAI_CHAT_USER_BUBBLE_MAX_PX` constant of 260 used to sit beside it with nothing
  reading it; it was deleted on 2026-09-13, along with the deprecated `ASK_MODE_OUTLINE` alias,
  a muted forest-green variant, and a transcript font-size constant that nothing read.
- Neutrals are inline literals, not constants. `#e8eef5`, `#d4dde6`, `#8fa8c4`, `#6b7c90`
  each appear in several section files independently; there is no single source for them.
