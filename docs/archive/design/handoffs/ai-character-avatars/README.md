# Handoff: AI character avatars (prop emblems)

## Overview

Replaces the pixel-grid character placeholders in bonsAI with **prop emblems**: one
object per character (Scout's bat, Heavy's sandvich, Nick Valentine's fedora…) drawn as
inline SVG on a tinted, vignetted disc. Selecting a slot adds a tint ring and a monogram
badge. Covers all 33 character keys, plus `__random__` and `__custom__`.

Why: the 8×8/16×16 grids fall apart above ~32px and read as noise at 18px. Vector props
stay legible from 18px to 132px, need no per-character art pipeline, and are recognisable
without being likenesses of copyrighted characters.

## About the design files

The files in this bundle are **design references created in HTML** — a prototype showing
the intended look and behaviour, not production code to ship as-is. The task is to
recreate the design inside bonsAI's existing React + TypeScript environment, following its
established patterns (`src/components/CharacterRoleplayEmoticon.tsx`, the token modules in
`src/styles/sections/`).

One exception: `CharacterPropGlyph.tsx` in this bundle **is** a real, direct port of the
prototype's renderer — all 33 props, both ink helpers, and the avatar wrapper. Its SVG path
data is the design. Copy the file in, then adapt its shell (prop names, styling approach,
token imports) to codebase conventions. Do not redraw the paths by hand.

## Fidelity

**High fidelity.** Final geometry, colours, and sizing behaviour. Every path coordinate in
`CharacterPropGlyph.tsx` is intentional — several props went through multiple rounds of
review (bat barrel taper, fedora crown pinch, Navi's wing count and vertical centring,
mic silhouette). Match it exactly.

## Component

### `CharacterPropGlyph`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `characterKey` | `string` | — | Key from `characterPlaceholderEmoticonGrids.ts`, e.g. `tf2_scout` |
| `prop` | `PropName` | — | Overrides the key's prop |
| `tint` | `string` | — | Overrides the key's tint |
| `size` | `number` | `44` | Rendered px box; art is a 32×32 viewBox, scales linearly |
| `framed` | `boolean` | `true` | Tinted disc + vignette + hairline ring |

Framed structure, in order:

1. `radialGradient` at `cx 34% / cy 26% / r 84%` — tint at `opacity .5` → `#0f1620` at `opacity .95`
2. `circle r=15.4` filled with that gradient
3. the prop art, wrapped in `translate(16,16) scale(.68) translate(-16,-16)` — the art is
   drawn full-bleed on the 32-box, then inset so it never touches the ring
4. `circle r=15.4`, `fill none`, `stroke rgba(255,255,255,.2)`, `stroke-width .8`

Unframed (`framed={false}`) emits the art alone with no disc — for use on an already
coloured surface.

### `CharacterAvatar`

Wraps the glyph with selection affordances.

- **Ring (selected):** `box-shadow: 0 0 0 max(1, round(size*0.055))px <tint>`
- **Badge (selected, size ≥ 26):** circle of `round(size*0.42)`, offset `-round(bs*0.16)`
  right/bottom, filled with the tint, knocked out of the surface with a
  `max(1, round(size*0.05))px` shadow ring. Monogram is `ui-monospace` 700 at
  `round(bs*0.72)` (single letter) or `round(bs*0.5)` (two letters), tracking `-.03em`.
- **Chip (selected, size < 26):** the badge can't hold a legible letter, so it becomes a
  15px-tall pill beside the disc, `gap: 4`, monogram at 10px.

## Colour system

Two derived-ink rules, both in the bundle:

- `inkFor(tint)` — relative-luminance pick between `#0e141c` and `#f7fbff`. Used for the
  **badge monogram** against the raw tint.
- `inkForDisc(tint)` — the disc renders the tint at 50% alpha over `#0f1620`, so art ink is
  measured against that blend (`mix(tint, rgb(15,22,32), 0.5)`) rather than the raw tint.
  Used for the **prop art**.

Never hard-code a per-character ink. Adding a character means adding one row to
`CHARACTER_PROPS`; ink follows.

Fixed colours that are *not* derived (they are the object's real-world colour and must
survive any tint):

| Value | Used for |
|---|---|
| `#101720` | shading/shadow overlays inside props, taped grips |
| `#c8382f` | bat bands & collar, sandvich tomato, medic cross |
| `#f2c327` | bat barrel band |
| `#d7a15a` | sandvich bun |
| `#8fbf5a` | sandvich lettuce |
| `#e8c26a` | sandvich cheese |
| `#f4f1ea` / `#f4f1e8` | medic cross field, watch face |
| `#5fbf4f` | Lamar's Families green |
| `#2b2118` | watch hands |

## Character map

33 keys → letter, prop, tint. Full table lives in `CHARACTER_PROPS` in the bundle; letters
are single-character except where two characters in the same franchise collide
(`tf2_scout` SC / `tf2_soldier` SO / `tf2_sniper` SN / `tf2_spy` SP, `gta5_lester` LE,
`fo4_preston` PR, `alig_ali_g` AG). `__random__` uses `?` on a crate; `__custom__` uses `+`
on a pencil.

Tints are the existing 8-value emblem palette: `#4ecdc4 #7a9e6a #ff9f43 #3d6fb5 #c45c3e
#c9a227 #f0e6d8 #2d8f6f #6b7c8f #8b5cf0 #5c6470 #d4a574 #5c4033 #c94b7a #e8d5c4`. Note
these are *not* the values in `src/data/characterUiAccent.ts` — that map drives UI accents
elsewhere and is unchanged by this work.

## Sizes in use

| Context | Size | Frame | Badge |
|---|---|---|---|
| Chat slot bar | 18px | framed | chip beside disc when selected |
| Character picker grid | 44px | framed | in-disc badge when selected |
| Slot spotlight / detail | 96–132px | framed | in-disc badge |

Minimum supported size is 18px. Below that the disc gradient and hairline ring stop
resolving — fall back to a plain tint circle with the monogram.

## Implementation notes

- SVG only. No new raster assets, no sprite sheet, no font.
- `uid` in the bundle increments to make gradient IDs unique per instance. Under SSR or
  concurrent rendering, swap it for `React.useId()` — a duplicate gradient ID makes discs
  render with another character's tint.
- The 8×8/16×16 grid data and `expand8To16` in `characterPlaceholderEmoticonGrids.ts`
  become dead once every key has a prop entry, but keep them until the picker,
  the transcript avatars, and any cached user selections are all migrated.
- The art is deliberately not a likeness of any copyrighted character — props and
  silhouettes only. Keep it that way when adding characters.

## Files in this bundle

- `CharacterPropGlyph.tsx` — the real renderer: all 33 props, ink helpers, avatar wrapper.
- `AI character avatars.dc.html` — the HTML prototype. Open in a browser; turn 5a is the
  approved direction, earlier turns show the rejected pixel-grid and vector-bust routes.
- `support.js` — runtime the prototype needs to open standalone. Not for production.

## Related repo files

- `src/components/CharacterRoleplayEmoticon.tsx` — current renderer, the thing being replaced
- `src/data/characterPlaceholderEmoticonGrids.ts` — character keys and the grid data being retired
- `src/components/CharacterPickerModal.tsx` — 44px usage
- `src/data/characterUiAccent.ts` — separate accent map, unaffected
