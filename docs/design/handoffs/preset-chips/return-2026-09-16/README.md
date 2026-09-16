# Handoff: Suggestion-chip "Real Button" restyle (Board B)

## Overview
Restyle of the suggestion chips in bonsAI's Steam Deck QAM dock so they read as pressable buttons instead of flat slabs. Board B ("a real button") is the locked direction; Board A is included as the runner-up reference for the accent toning it contributed. Everything else in the dock (question box, Ask bar, row→box spacing) is unchanged.

Target codebase: `qd313/bonsAI` (branch `main`). Relevant source: `src/components/MainTabPresetRow.tsx`, `MainTabPresetAnimatedChips.tsx`, `src/styles/sections/section-4.ts` … `section-8.ts`, `src/data/characterUiAccent.ts`.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy. Recreate the chip styling inside the plugin's existing React/decky environment using its established style-section pattern. Note the repo's `main` currently ships full-width stacked chips (minHeight 34); this design targets the brief's two-up 148×30 layout — reconcile with whichever layout ships.

## Fidelity
**High-fidelity.** Colors, sizes, shadows, and timings below are final. Recreate pixel-perfectly.

## The locked design (Board B)

### Chip — rest state
- Size: 147×30 (two-up in a 300px row, gap 6 — was 148/gap 4); full-width variant 300×30
- Radius 4 · padding 0 8px · `backdrop-filter: blur(10px)` · `box-sizing: border-box`
- Background: `linear-gradient(180deg, rgba(56,70,84,0.5) 0%, rgba(16,22,30,0.55) 100%)` (was flat `rgba(18,26,34,0.22)`)
- Border: `1px solid rgba(255,255,255,0.10)`
- Shadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 3px rgba(0,0,0,0.4)` (top hairline + drop; the drop lives inside the 12px row→box gap)

### Label
- 12px, `#c4d3e2`, upright (italic was explored and rejected), `white-space: nowrap`
- Long labels marquee instead of ellipsizing: hold 1.6s → scroll left at ~24px/s → stop at tail (play once, no loop). Re-measure on content change; only labels that overflow animate.
  - Reference implementation: wrap label in an `overflow:hidden` outer span + `inline-block` inner span; set `--scroll-x = clientWidth - scrollWidth` (negative), animate `transform: translateX(0 → var(--scroll-x))`, duration `max(2s, |overflow|/24) + 0.5s`, delay 1.6s, linear, forwards.

### Accent (character colour) — toned down, ported from Board A
- Tip badge dot: 7×7, radius 2, fill = character accent at **0.8 alpha** (green `rgba(46,135,83,0.8)`, gold `rgba(241,196,15,0.8)`, etc. — accents come from `src/data/characterUiAccent.ts`)
- `[beta]` tag: 10px italic 600, colour `#e4c94e` (toned mix of gold `#f1c40f` toward label `#c4d3e2` — ~70/30); generally: tone accent-coloured text 70% accent / 30% `#c4d3e2`

### Pressed state
- Gradient flips: `linear-gradient(180deg, rgba(12,17,23,0.6) 0%, rgba(40,52,64,0.45) 100%)`
- Shadow: `inset 0 1px 2px rgba(0,0,0,0.4)` (drop shadow removed)
- `transform: translateY(1px)`

### Current (focused) chip — replaces today's pale-blue outline
- Bottom light bar: `inset 0 -2px 0 rgba(56,189,248,0.85)` added to rest shadow
- Label brightens to `#dcebf8`
- ⚠ This intentionally replaces an existing state (the blue focus outline). If the outline must stay for gamepad-focus a11y reasons, keep it and treat the bar as additive.

### "Out of chips" flash — replaces today's blue glow pulse
- Bar brightens to `rgba(150,225,255,1)` + `0 3px 8px -2px rgba(56,189,248,0.55)`, ~330ms

## Unchanged from today
Height 30 · radius 4 · padding 8 · row width 300 · row→box gap 12 · badge/label typography otherwise as shipped · question box and Ask bar untouched.

## State Management
No new state. Marquee needs a per-chip overflow measurement (on mount + label change). Pressed/current/flash map to existing gamepad focus + press events.

## Design Tokens
- Surface gradient: `rgba(56,70,84,0.5) → rgba(16,22,30,0.55)`, 180°
- Pressed gradient: `rgba(12,17,23,0.6) → rgba(40,52,64,0.45)`
- Border: `rgba(255,255,255,0.10)` · top hairline: `rgba(255,255,255,0.10)`
- Drop shadow: `0 2px 3px rgba(0,0,0,0.4)`
- Focus bar blue: `rgba(56,189,248,0.85)` · flash: `rgba(150,225,255,1)`
- Labels: `#c4d3e2` rest · `#dcebf8` focused · toned gold `#e4c94e`
- Accent alpha for badge dots: 0.8
- Marquee: 1.6s delay · ~24px/s · linear · once
- Gaps: chip↔chip 6 · row↔box 12

## Assets
None — all effects are CSS. Icons/badges already exist in the plugin (`src/components/icons.tsx`).

## Files
- `Board B - Real Button.dc.html` — **the locked design**: rest, gold/toned accent, pressed, current, flash, full-width; spec block at the bottom of the board
- `Board A - Four Changes.dc.html` — runner-up; source of the accent toning and marquee spec; has the italic-label tweak toggle (off = final)
- `Today.dc.html` — recreation of the shipped dock, for before/after comparison
- `Chip States.dc.html` — recreation of today's chip state matrix
- `support.js` — runtime for the .dc.html files (open them directly in a browser)
