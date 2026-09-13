# 25 — AI character avatars (prop emblems): handoff intake (2026-08-26)

Intake notes for the design handoff that replaces the pixel-grid character
placeholders with **prop emblems** — one object per character on a tinted,
vignetted disc.

**Nothing is wired. This document does not implement anything.** It records
where the handoff files landed, what was checked against the repo, and the six
things that do not line up yet. Read it before writing any of the code.

Design source: [README.md](../design/handoffs/ai-character-avatars/README.md).

---

## 1. What landed, and where

| File | Landed at | Status |
|---|---|---|
| `CharacterPropGlyph.tsx` | [src/components/CharacterPropGlyph.tsx](../../src/components/CharacterPropGlyph.tsx) | **Staged, imported by nothing.** Real port — 33 props, both ink helpers, the avatar wrapper |
| `README.md` | [docs/design/handoffs/ai-character-avatars/](../design/handoffs/ai-character-avatars/README.md) | Design spec |
| `AI character avatars.dc.html` | same folder | HTML prototype. Turn **5a** is the approved direction; earlier turns are rejected routes |
| `support.js` | same folder | Prototype runtime only. Never ship it |

The staged component is byte-identical to the bundle except for an 11-line
module header in the repo's `Title/Purpose/Used for/Solves/Does not` format.
**No SVG path data was touched**, per the handoff's instruction — every
coordinate is the approved design and several props went through multiple
review rounds.

The zip arrived named *"Copy of Named Chat Slots Design.zip"*, which is a stale
export name — the contents are the avatars handoff, unrelated to the Aug 14
named-chat-slots bundle.

---

## 2. Checked against the repo — all green

- **Character keys match exactly, 33 for 33.** `CHARACTER_PROPS`
  ([CharacterPropGlyph.tsx:51](../../src/components/CharacterPropGlyph.tsx))
  against `CHARACTER_EMOTICON_PLACEHOLDER_GRIDS`
  ([characterPlaceholderEmoticonGrids.ts:70-401](../../src/data/characterPlaceholderEmoticonGrids.ts)).
  Nothing extra on either side, nothing missing. The 16px override block
  (`:407-1002`) carries the same 33.
- **Every prop draws.** All 33 members of the `PropName` union have a render
  branch. No character can resolve to an empty disc.
- **It typechecks clean as-is.** `npx tsc --noEmit` exits 0 with the file in
  `src/`, under `strict`, `noUnusedLocals` and `noUnusedParameters`.
- **`React.useId()` is available.** React 18.3.1 installed. Nothing in `src/`
  uses `useId` today, so this would be the first.
- **The README's palette claim is true.** The handoff's 15 tints and
  [characterUiAccent.ts](../../src/data/characterUiAccent.ts) share only
  `#c45c3e` and `#d4a574`. The accent map is a separate system and is unaffected.
- **The blast radius is two files.** Only
  [CharacterPickerModal.tsx](../../src/components/CharacterPickerModal.tsx) and
  [MainTabUnifiedAskBar.tsx](../../src/components/MainTabUnifiedAskBar.tsx) import
  the current renderer. Neither has a test.

`npm test` (83 files / 602 tests), `npm run test:py` (834), `npx tsc --noEmit`
and `npm run build` all pass with the file staged.

---

## 3. Six things that do not line up

### 3.1 The size table describes sizes the app does not use

The README's *Sizes in use* table lists 18px, 44px, and 96–132px. The actual
call sites are:

| Call site | Size |
|---|---|
| `MainTabUnifiedAskBar.tsx:413` | 18 |
| `CharacterPickerModal.tsx:113` (OK button preview) | 22 |
| `CharacterPickerModal.tsx:409` (grid row) | 24 |
| `CharacterPickerModal.tsx:616` (grid row) | 24 |
| `CharacterPickerModal.tsx:505` (`__random__`) | 26 |
| `CharacterPickerModal.tsx:676` (`__custom__`) | 26 |

**There is no 44px avatar anywhere, and nothing above 26px.** The picker grid
the art was tuned and reviewed at 44px renders at 24px in this codebase — a bit
over half. Either the picker grows, or the design is being judged at a size it
was not reviewed at. This is the decision that most changes what gets built.

### 3.2 The badge/chip breakpoint cuts straight through the picker

`CharacterAvatar` switches presentation at `size < 26`
(`CharacterPropGlyph.tsx:459`): below that the monogram moves out to a pill
beside the disc, at or above it sits in-disc. The picker's sizes are 22, 24, 24,
26, 26 — so **the same modal would show both treatments at once**, chips on the
grid rows and in-disc badges on the random/custom rows.

The chip is also wider than the disc it decorates: `gap: 4` plus a `minWidth: 15`
pill, so roughly **+19px per selected row** in layout that currently reserves
exactly `size`. Per [design-language.md](../design-language.md), that has to be
measured on device before it changes — a screenshot will not show which element
owns the overflow.

### 3.3 Two sources of truth for the monogram letter

Call sites derive the letter today via
`resolveAvatarBadgeLetterFromDisplayLabel`
([characterCatalog.ts:185](../../src/data/characterCatalog.ts)), which is
`firstUnicodeLetterUpper` — **strictly one character**. The handoff bakes a
`letter` into each `CHARACTER_PROPS` row and uses **two** where a franchise
collides: `SC`/`SO`/`SN`/`SP` for the TF2 four, plus `LE`, `PR`, `AG`.

The current derivation cannot produce those, so today Scout, Soldier, Sniper and
Spy all badge as `S`. The handoff's table is the better data. But custom text
still needs the derived path, so the two have to coexist rather than one simply
replacing the other.

### 3.4 Nothing passes a `selected` flag today

`CharacterAvatar` gates both the tint ring and the badge on `selected`. The
current component has no such concept — it draws the badge whenever
`badgeLetter` is non-null. Wiring means threading a real selection signal from
the picker, which is new plumbing, not a swap.

### 3.5 `React.useId()` returns a string with colons

The swap the handoff asks for is right — a shared incrementing `uid`
(`CharacterPropGlyph.tsx:118`) collides under concurrent rendering and makes one
character's disc pick up another's tint. But `useId()` yields `:r0:`, and that id
is interpolated into two functional IRIs: a mask at `:175`/`:183` and the disc
gradient at `:413`/`:416`. `url(#:r0:-d)` is fragile and the raw value cannot go
through `querySelector` unescaped. Strip the colons —
`React.useId().replace(/:/g, "")` — rather than using the raw value.

### 3.6 The picker already has an open D-pad bug

[roadmap.md](../roadmap.md) carries **★★★ Character picker: focus ring
invisible, D-pad does not move — OPEN**, described there as blocking
AI-character on Deck. This design adds a *selection ring* to that same modal.
Landing a new selection affordance on top of a broken focus ring will make both
harder to judge. Sequence the focus fix first, or expect to debug them together.

---

## 3.7 Measured from a true-size mock-up (2026-08-26)

A mock-up was built from the staged component's **real rendered output** — the SVG was produced
by `renderToStaticMarkup` against `CharacterPropGlyph.tsx` as it sits in the repo, not redrawn —
and reproduced the Ask bar at its true 300px column width. Findings:

- **The swap changes no geometry in the Ask bar.** Measured in the mock: both the current and the
  new version give a text row of **50.0 × 276.8px**, an avatar slot of **18 × 18** with
  `margin: 2px 4px 0 2px`, and a card height of 119.2px. The maintainer's constraint — *the
  textarea must not look any different except for better artwork in the corner* — is satisfiable
  exactly, with no layout give.
- **The Ask bar avatar is 18px, not 24.** 24 is the picker grid. Any discussion of "how it looks at
  24" is about `CharacterPickerModal`, not the main tab.
- **The selection chip cannot be used on the main tab.** `.bonsai-ai-character-avatar` carries
  `overflow: hidden` ([section-5.ts:114-120](../../src/styles/sections/section-5.ts)), so the chip
  would be **clipped**, not merely widen the row. The main tab should use `CharacterPropGlyph`
  directly and keep the existing corner badge overlay, not `CharacterAvatar`.
- **The art holds at 18px, and clearly beats what is there now.** Rendered at a true 18×18 and
  magnified with smoothing off: today's grids resolve to **the same hooded silhouette for seven of
  eight characters** — Scout, Heavy, Medic, Engineer, Spy, Sniper and Nick Valentine differ only by
  colour. The props separate on shape.
- **Two weak spots, both real.** Spy's `mask` softens to a pale smear at 18px and is the least
  legible of the 33. And three props share a diagonal-shaft silhouette at that size — Scout's `bat`,
  Zagreus' `spear` and `__custom__`'s `pencil` — told apart mainly by tint. This matters little in
  the Ask bar, which shows one avatar at a time, and more in the picker, which shows them together.
- **Caveat on the measurement.** Those are CSS pixels on a desktop monitor. The Deck is a 7-inch
  1280×800 panel, so its pixels are physically smaller. The mock narrows the question; it does not
  settle it. The last check is on the device.
- **One defect noticed while rendering.** The component's top-level `<g>` array triggers a React
  "missing key" warning ([CharacterPropGlyph.tsx:63](../../src/components/CharacterPropGlyph.tsx)).
  Console-only, no visual effect, but worth fixing in the wiring commit.
- The rendered SVG carries no `xmlns`. That is fine inline in the DOM and only matters if the markup
  is ever used standalone (as a data URI); not a defect for this use.

---

## 3.8 What shipped on the main tab (2026-08-26)

Steps 1, 3 (partly) and 5 of the plan below, scoped to the Ask bar only.

- [CharacterRoleplayEmoticon.tsx](../../src/components/CharacterRoleplayEmoticon.tsx) gained an
  `art?: "grid" | "prop"` prop that **defaults to `"grid"`**. The picker's five call sites pass
  nothing and are unchanged; [MainTabUnifiedAskBar.tsx:413](../../src/components/MainTabUnifiedAskBar.tsx)
  is the single caller passing `art="prop"`. This is what let the main tab move while the picker
  waits on D33.
- The badge wrapper was lifted into a shared `withBadge` helper so the two art styles cannot drift
  apart on the one thing that had to stay identical.
- `uid` became `React.useId()` with colons stripped (3.5).
- The art array's missing React keys were backfilled by position at the point of use, rather than
  editing twenty art branches — **no path data was touched**.
- `CharacterPropGlyph` gained `className` and `title` pass-through onto its `<svg>`, so the swapped
  element has the same DOM shape and the same `aria-hidden` behaviour as the grid it replaces.
  Shell only; no art change.
- First tests for the component: `CharacterRoleplayEmoticon.test.tsx`, 9 cases, including a
  regression guard on unique gradient ids.

**Still owed:** the on-Deck check, **AVATAR-PROP-01** in [testing.md](../testing.md). Geometry is
unchanged by construction and was measured in the mock, so that row is a confirmation rather than a
prerequisite — but the design-language rule still wants eyes on the device.

---

## 4. The plan when this is greenlit

1. Swap `uid` for `React.useId()` with colons stripped (3.5). One-line change,
   no visual effect until wired.
2. Settle the size and badge/chip questions (3.1, 3.2) — see **D33** in
   [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).
3. Decide the letter source (3.3): `CHARACTER_PROPS.letter` for presets,
   `resolveAvatarBadgeLetterFromDisplayLabel` retained for custom text.
4. Thread `selected` from the picker (3.4).
5. Re-point [CharacterRoleplayEmoticon.tsx](../../src/components/CharacterRoleplayEmoticon.tsx)
   at the glyph, keeping its current props as the public shape so the two call
   sites do not all change at once. **On the main tab, render `CharacterPropGlyph`
   and keep the existing corner badge overlay — not `CharacterAvatar`**, whose chip
   would be clipped by the slot's `overflow: hidden` (3.7).
6. Measure the picker rows on device before and after
   (`scripts/probe_deck_ask_row_width.py`), per the design-language rule.
7. Only once the picker, the ask bar and any cached selections are all migrated,
   retire the grid data and `expand8To16`
   (`characterPlaceholderEmoticonGrids.ts:53`). The handoff is explicit that they
   stay until then.
8. Add the first test for either call site — neither has one today — and update
   [testing.md](../testing.md) and [roadmap.md](../roadmap.md) in the same change set.

**Do not redraw the paths at any step.**

---

## 5. Deliberately not done

- **The character picker still draws the pixel grids.** All five of its call sites are unchanged,
  because its avatar size is the open half of D33. A picker full of hooded blobs next to an Ask bar
  showing a fedora is the intended interim state, not a bug.
- No `selected` signal was threaded (3.4) — that is picker work.
- The badge letter still comes from `resolveAvatarBadgeLetterFromDisplayLabel`, so Scout, Soldier,
  Sniper and Spy still all badge as `S`. Adopting `CHARACTER_PROPS.letter` (3.3) would change the
  picker and the Ask bar together, so it waits for the picker.
- No grid data retired, no `characterUiAccent.ts` change, no `CharacterAvatar` usage anywhere —
  its selection chip cannot be used on the main tab (3.7).
