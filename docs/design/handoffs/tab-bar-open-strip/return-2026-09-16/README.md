# Handoff: QAM Tab Strip — Label on Selected Tab Only (direction 2a)

## Overview
Redesign of the open state of the bonsAI Decky plugin's tab strip in the Steam Deck Quick Access Menu (QAM, 300px wide panel). The rest state (thin 20px bar with six dashes) is unchanged. The open strip becomes a 54px bar of six equal-width icon cells; only the selected tab shows its name, in lowercase small caps under its icon. Repo: qd313/bonsAI (branch main).

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. Recreate this design in the bonsAI codebase's existing React/Decky environment (`src/components`, `src/styles/sections`, unified-input constants), using its established patterns: accent CSS vars (`--bonsai-ui-accent-*`), the `IconShell` wrapper in `src/components/icons.tsx`, and the existing tab-strip mount/offset hook (`src/hooks/useTabStripBodyOffset.ts`).

`Tab Bar Directions.dc.html` shows multiple explored directions; **board 2a (top of the page) is the one to implement.** Other boards are context only.

## Fidelity
**High-fidelity.** Colors, sizes, spacing, and type below are final. Recreate pixel-perfectly with the codebase's existing libraries.

## Screens / Views

### Open tab strip (board 2a)
- **Purpose**: Tab switching while the panel is open; overlays the top of the chat view.
- **Container**: 300 × 54px, opaque `#141c24`, padding `5px 6px`, `border-bottom: 1px solid rgba(255,255,255,.08)`, `box-shadow: 0 6px 16px rgba(0,0,0,.45)`. Positioned over the content (content does not reflow; strip covers the top 54px).
- **Row layout**: flex row, `gap: 2px`, items vertically centered.
  - LB slot: fixed 20px wide, centered. Pill: 9px / 700, padding `3px 4px`, `border-radius: 999px`, bg `rgba(255,255,255,.08)`, color `#8fa8c4`. Hidden LB/RB (e.g. no controller) leaves the 20px slot so cells never shift.
  - 6 tab cells: each `flex: 1 1 0; min-width: 0` (equal width, ≈39px at 6 tabs), height 44px, `flex-direction: column; align-items: center; padding-top: 6px; gap: 2px; box-sizing: border-box`.
  - RB slot: mirror of LB.
- **Icons**: 22 × 22 in EVERY state — selected and unselected are the same size and same y position (icon spans y6–28 of the cell in all cells).
  - Main: production `src/assets/icons/bonsai-logo.svg`, tinted via CSS mask (`mask: url(...) center/contain no-repeat` on a 22×22 span whose `background` is the ink color). Do not use the old stroke tree.
  - Ollama: today's production filled Ollama mark (`OllamaTabIcon` in icons.tsx), 22px.
  - Settings: FiSettings stroke gear; Permissions: FiLock; About: skewed "i" glyph (`AboutTabTitleIcon`) — all 22px.
  - Developer/debug: `BugIcon`, rendered at 26 × 26 with `margin: -2px 0` (its glyph has internal padding; 26px makes it optically match the 22px icons; the negative margin keeps the same 22px vertical footprint and optical center).
- **Selected cell**: bg `rgba(255,255,255,.08)`, `border-radius: 8px`, plus the name label. No ring, no underline.
- **Name label (selected only)**: lowercase text ("main", "settings"…), `font-variant: small-caps`, 9.5px / 700, `letter-spacing: 0`, same accent color as the icon. `white-space: nowrap`, no clipping — the longest label ("settings" at 6 tabs) may overhang its cell by ≈2px; that is intended.
- **Ink colors**:
  - Unselected icons: `rgba(168,182,198,.62)`.
  - Selected icon + label: lifted accent — green context `#52d88a`, gold context `#f1c40f`. Never the raw accent `#2e8753` (fails contrast on the dark bar). Follow the repo's existing accent-lift derivation in `characterUiAccent.ts` / ask-mode glow vars.

### Rest state
Unchanged from production (20px bar, six dashes, current-tab name).

## Interactions & Behavior
- LB/RB (and existing input paths) cycle tabs. On switch: the fill + label of the newly selected cell fade in over 120ms; outgoing fades out. **No cell width change and no icon movement** — only fill and label animate.
- Strip open/close behavior, timing, and the chat-row overlay model are unchanged from production (see `useTabStripBodyOffset.ts`).
- 5-tab case (developer tab hidden): same rules; cells are just wider (≈47px).

## State Management
No new state. Consumes existing selected-tab index and accent-context (green/gold) values.

## Design Tokens
- Bar bg `#141c24` · bar border `rgba(255,255,255,.08)` · shadow `0 6px 16px rgba(0,0,0,.45)`
- Cell fill (selected) `rgba(255,255,255,.08)` · radius 8px
- Inactive ink `rgba(168,182,198,.62)` · LB/RB ink `#8fa8c4`
- Accent (lifted): green `#52d88a`, gold `#f1c40f`
- Type: Motiva Sans (SteamOS default; design preview falls back to Noto Sans). Label 9.5px/700 lowercase small caps ls0; LB/RB 9px/700.
- Geometry: bar 300×54 · pad 5/6 · gap 2 · cells h44 equal flex · icon 22 (bug 26 w/ −2px margins) · LB/RB slots fixed 20px

## Assets
- `bonsai-logo.svg` — production logo from `src/assets/icons/bonsai-logo.svg` (included in this bundle). Tint via CSS mask, not `filter: invert`.
- All other icons already exist in `src/components/icons.tsx`.

## Files
- `Tab Bar Directions.dc.html` — design boards; implement board **2a** (top). Open in a browser with `support.js` alongside.
- `support.js` — runtime for the design file (reference only).
- `bonsai-logo.svg` — production Main-tab logo asset.
