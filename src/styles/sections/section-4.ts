/**
 * Title: The Ask box and the row of suggestion chips under it
 *
 * Purpose: Styles two things that both need to span edge to edge, with no
 * side gutter: the Ask bar (the typing box and its Ask button), and the
 * sideways-scrolling row of suggested-prompt chips above it. It also
 * draws each chip itself — its size, its text, and the small sliding
 * animation that reveals the next batch of suggestions.
 *
 *     ┌────────────────────────────────────────┐
 *     │  [chip]  [chip]        <- suggestions   │
 *     ├────────────────────────────────────────┤
 *     │  Ask something...            [ Ask ]    │  <- the Ask bar
 *     └────────────────────────────────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Style the text actually typed into the box — see section-5.ts
 * for the typing field itself, or the icon row underneath it — see
 * section-8.ts.
 *
 * What changed on 2026-09-17 (plan 60), and why, since three rules below
 * only make sense together:
 *
 * A measurement on the Deck (docs/test-evidence/plan60-measure-before.json)
 * found two things nobody had realised.
 *
 * 1. The chips had no room under them at all — the bottom of a chip and
 *    the top of the question box were the same line — in every animation
 *    mode but fade. The design boards had assumed a gap everywhere. So
 *    the chips looked crammed, and the soft shadow the chip gained in the
 *    same plan could not be seen, because the row hides anything drawn
 *    outside itself. The row now keeps 8px under the chips (5 for the
 *    shadow, 3 clear); fade mode's own gap drops from 12 to 4 so its
 *    total is unchanged; the sideways carousel takes 5px and gives the
 *    same 5px back off its height, so the shadow shows and nothing moves.
 *
 * 2. Steam's white focus ring had never once been visible on a chip. It
 *    is drawn 2 to 5px outside the button, the chip fills the row
 *    exactly, and the row hides everything outside itself — so since
 *    2026-09-01 a focused chip had shown only a thin blue line, which was
 *    meant as a position marker, not a focus cue. The chips therefore
 *    stopped taking that ring (gamepadAndPullModels.ts) and show a lit
 *    bar along their own bottom edge instead, drawn inside the chip where
 *    nothing can cut it off. The "ran out of chips" flash moved onto the
 *    same bar, so the two cues are no longer the same shape.
 *
 * Both bar rules repeat the chip's resting hairline and drop shadow in
 * their own list on purpose: box-shadow replaces the whole list rather
 * than adding to it, so an effect left out is erased while that state
 * lasts — the "two effects on the same edge can cancel each other"
 * lesson in docs/lessons-learned.md.
 *
 * 3. Moving the flash onto the bar put the two rules in competition for
 *    the first time, and the flash lost. The chip that flashes is always
 *    the chip the D-pad is on, so the focus rule is styling it at the
 *    same moment; both now set the same thing and insist on it, and a
 *    longer selector wins. While the flash was a border colour and the
 *    focus cue was a shadow, they never met. The flash rule therefore
 *    names the whole path down to the chip — every chip sits in a slot
 *    inside the focus root, so that reaches all of them — and keeps the
 *    short form as a safety net. It must also stay below the focus rules
 *    in this file: one of their arms is the same length, and in a tie the
 *    later rule wins.
 */
import { BONSAI_CHAT_RESPONSE_STACK_MARGIN_TOP_PX } from "../../features/unified-input/constants";
import {
  PRESET_CHIP_BLOCKED_EDGE_FLASH_MS,
  PRESET_CHIP_GAP_PX,
  PRESET_CHIP_HEIGHT_PX,
  PRESET_CHIP_SIDE_PADDING_PX,
  PRESET_VISIBLE_SLOTS,
} from "../../features/preset-carousel/presetRowLayout";
import {
  SETTINGS_CARD_PAD_BOTTOM_PX,
  SETTINGS_CARD_PAD_TOP_PX,
  SETTINGS_CARD_ROW_GAP_PX,
} from "../../hooks/useSteamSettingsSearch";
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string, but
 * see the comment above the PanelSection rule inside it for a case where
 * a selector here can look correct and still match nothing on a real Deck.
 */
export function buildSection4Section(): string {
  return `
/* ==========================================================================
           4. FULL-BLEED & ASKBAR WRAPPERS
           Forces specific containers to break out of standard bounds for edge-to-edge UI.
           ========================================================================== */
        /*
          Row width tracks the tab scroll area; side inset lives on TabContentsScroll (BONSAI_PLUGIN_SIDE_PAD_PX).
          Do not use negative margins here — they cancel the scroll inset and hug the QAM edge.
        */
        .bonsai-scope .bonsai-full-bleed-row,
        .bonsai-scope .bonsai-ask-bleed-wrap.bonsai-full-bleed-row {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-sizing: border-box !important;
        }

        /* Main unified search + Ask row: stay within tab scroll width (no calc bleed spill). */
        .bonsai-scope .bonsai-unified-input-host.bonsai-full-bleed-row,
        .bonsai-scope .bonsai-preset-row-host.bonsai-full-bleed-row {
          width: 100% !important;
          max-width: 100% !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .bonsai-scope .bonsai-unified-input-host.bonsai-full-bleed-row {
          margin-bottom: 2px !important;
        }

        /*
          Reach the PanelSection by structure, because its name cannot be matched on this build.

          Measured on device 2026-08-16 (scripts/probe_deck_ask_row_width.py): inside the QAM,
          \`[class*="PanelSection"]\` matches **0 elements** and \`.decky-qam-scope\` does not exist —
          Steam ships hashed class names here (the PanelSection wrapping our rows is
          \`_3gY0aBuNR8_NPTpXIYfkby\`), so every section-3 rule keyed on those names is inert. Only
          \`_TabContentsScroll\` survives as a literal, which is why that one reset does work.

          That PanelSection carries \`padding: 0 16px\`, and it was the entire remaining gutter —
          probe V1 reported 15.99px on each side, against a 300px QAM column. Rows opting into
          full bleed must not inherit it.

          Matches the row wrapper holding a full-bleed row, and the section holding that
          wrapper. :has() is verified supported on the Deck's CEF in the same run. Keyed on
          .bonsai-full-bleed-row so only rows that asked for edge-to-edge are affected — other
          tabs do not use that class.

          The .bonsai-main-tab-column line: the Main tab wraps its rows in a fill column + bottom
          dock (useMainTabColumnFill), which puts the PanelSection two divs further from its
          full-bleed rows — out of range of both :has() patterns below. Without this line the
          section's 16px side padding comes back on Main only, which is exactly the original bug.
        */
        .bonsai-scope div:has(> .bonsai-full-bleed-row),
        .bonsai-scope div:has(> div > .bonsai-full-bleed-row),
        .bonsai-scope div:has(> .bonsai-main-tab-column) {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        /* padding-bottom: 5px for the chip's soft shadow to land in, 3 more so the chip is not
           touching the question box. Measured 2026-09-17: there was no room at all. See the file
           header, point 1. */
        .bonsai-scope .bonsai-preset-row-host {
          min-width: 0 !important;
          overflow: hidden !important;
          display: grid !important;
          gap: 8px !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 8px !important;
        }

        /* 12 - the 8 above = 4, so fade mode's total under the row is unchanged. */
        .bonsai-scope .bonsai-preset-row-host--fade-anim {
          gap: 3px !important;
          margin-bottom: 4px !important;
          margin-top: 0 !important;
        }

        /*
          One chip. Height and side padding are set here on purpose, not left to Steam's DialogButton
          default: with two chips across a 300px column (D43, 2026-09-01) the label room is what
          decides whether a prompt reads at a glance, and a width that comes from CSS can be reasoned
          about (design-language rule 4) where Steam's padding could only be measured after the fact.
          The drawing (major-redesign.md § 2.3) says 30px tall, radius 4.
        */
        .bonsai-scope button.bonsai-preset-glass {
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          min-height: ${PRESET_CHIP_HEIGHT_PX}px !important;
          height: ${PRESET_CHIP_HEIGHT_PX}px !important;
          padding: 0 ${PRESET_CHIP_SIDE_PADDING_PX}px !important;
          border-radius: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          line-height: 1.2 !important;
        }
        .bonsai-scope button.bonsai-preset-glass > div {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
        }
        /*
          The label is a row: badges pinned at the left, then the prompt text. The text either
          scrolls (Steam's Marquee, which brings its own overflow handling and edge fade) or, when
          the Marquee is unavailable or motion is reduced, is cut off with an ellipsis. The ellipsis
          fallback is display:block on purpose — on the old display:inline span \`overflow\` did not
          apply, the ellipsis could never fire, and a 59-character label simply ran 86px past the
          column edge (measured on device 2026-08-29).
        */
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-label {
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-align: left !important;
        }
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-test-badge,
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-tip-badge {
          flex: 0 0 auto !important;
        }
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-text {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-text:not(.bonsai-preset-chip-text--marquee) {
          display: block !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        /*
          Decode mode (Ghost in the Shell chip decode -- replaces the old \`stream\` typewriter).
          The reveal loop in MainTabPresetAnimatedChips.tsx writes scrambled/resolving glyphs and
          the blinking block caret straight into the label's textContent from a single shared
          requestAnimationFrame loop, so there is no CSS keyframe to gate here -- reduced motion is
          enforced entirely in JS (instant swap to the final prompt, no churn, no caret).
          Plan 60, board B (D110, item 6) used to tint the whole label with
          \`--bonsai-ui-accent-toned\` here, but the selector never said "still churning" -- it
          stayed on the label whether resolved or not, so a decode chip's words read in the same
          accent family as its Tip dot (maintainer bug report, 2026-09-19; only the dot should carry
          that colour). Removed: DecodePresetChipButton now sets the label colour inline instead,
          the same \`#c4d3e2\` every other mode already uses (PresetChipButton below).
        */

        .bonsai-scope .bonsai-chat-response-stack {
          margin-top: ${uiScalePx(BONSAI_CHAT_RESPONSE_STACK_MARGIN_TOP_PX)} !important;
        }

        .bonsai-scope .bonsai-preset-carousel-focus-root {
          width: 100% !important;
          min-width: 0 !important;
        }
        /*
          Chips side by side: PRESET_VISIBLE_SLOTS across one row, equal shares, a small gap. Two
          rather than the drawing's three by decision D43 (2026-09-01): on the 300px column three
          left ~12 characters per chip and two leave ~20. The row keeps the one-row height that the
          2026-08-31 change bought (the block used to be three stacked rows, 118px of a 245px dock).
          Width comes from flex, never from a measurement (design-language rule 4).
        */
        .bonsai-scope .bonsai-preset-across {
          display: flex !important;
          flex-direction: row !important;
          gap: ${PRESET_CHIP_GAP_PX}px !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        .bonsai-scope .bonsai-preset-across > .bonsai-preset-carousel-slot {
          flex: 1 1 0 !important;
          min-width: 0 !important;
        }
        /*
          Sideways carousel. The track holds the whole history (up to five chips) as a flex row and
          the viewport clips it to one row's width; the chips outside the window are simply clipped
          and still focusable, so a D-pad step onto one slides it into view. Each chip is an equal
          share of the viewport, and the slide is a calc on the window-start index the component
          writes to --bonsai-preset-window-start: one step is (100% + gap) / N, which is exactly one
          chip plus one gap for any N. No pixel is ever measured.
        */
        /* This viewport hides anything outside itself too, so it clips the shadow in carousel mode
           even after the row above gained room: 5px given, the same 5px taken back off its height,
           so the shadow shows and nothing on screen moves. */
        .bonsai-scope .bonsai-preset-carousel-viewport {
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          padding-bottom: 5px !important;
          margin-bottom: -5px !important;
        }
        .bonsai-scope .bonsai-preset-carousel-track {
          display: flex !important;
          flex-direction: row !important;
          gap: ${PRESET_CHIP_GAP_PX}px !important;
          width: 100% !important;
          min-width: 0 !important;
          will-change: transform !important;
          /*
            --bonsai-preset-visible-slots lets the "one suggestion chip" setting override the
            window width per render (MainTabPresetAnimatedChips writes it alongside
            --bonsai-preset-window-start); the fallback is PRESET_VISIBLE_SLOTS, the shipped
            default, for the rare case nothing wrote the variable.
          */
          transform: translateX(
            calc(-1 * var(--bonsai-preset-window-start, 0) * (100% + ${PRESET_CHIP_GAP_PX}px) / var(--bonsai-preset-visible-slots, ${PRESET_VISIBLE_SLOTS}))
          ) !important;
        }
        .bonsai-scope .bonsai-preset-carousel-track > .bonsai-preset-carousel-slot {
          flex: 0 0 calc((100% - ${PRESET_CHIP_GAP_PX}px * (var(--bonsai-preset-visible-slots, ${PRESET_VISIBLE_SLOTS}) - 1)) / var(--bonsai-preset-visible-slots, ${PRESET_VISIBLE_SLOTS})) !important;
          min-width: 0 !important;
        }
        /*
          The lit bar under the chip the D-pad is on. It marks which chip a press would act on, and
          it must never appear on a chip the D-pad has left: ungated, the old version of this sat on
          a chip permanently, so with the D-pad up on the tab strip the screen still showed a
          highlighted chip — the fake focus ring found on device 2026-08-28, which fooled the
          maintainer and the QA rig at once. The gates are unchanged and exist for that reason.

          Gate 1 and 2 say "the carousel owns Steam's ring": \`gpfocuswithin\` is what Steam stamps on
          the ancestor Focusable, and the \`:has(.gpfocus)\` arm covers it directly in case Steam
          stamps only the chip. Gate 3 keeps the marker on desktop, in the in-IDE preview and on
          touch, where nothing owns a ring — the fallback \`elementHasGamepadFocus\` uses in
          uiDocument.ts. The last two arms light the rows whose slots carry no --focus marker at
          all (fade, static and decode), which get the same bar.

          2026-09-17 (plan 60) changed what these gates draw, not when. See the file header,
          point 2: the blue line round the chip became a lit bar inside its bottom edge, and the
          hairline and drop shadow are repeated in the list because box-shadow replaces rather than
          adds. \`outline: none\` stops Steam's plain focus outline showing up clipped in its place.
        */
        .bonsai-scope .bonsai-preset-carousel-focus-root.gpfocuswithin .bonsai-preset-carousel-slot--focus .bonsai-preset-glass,
        .bonsai-scope .bonsai-preset-carousel-focus-root:has(.gpfocus) .bonsai-preset-carousel-slot--focus .bonsai-preset-glass,
        :root:not(:has(.gpfocus)) .bonsai-scope .bonsai-preset-carousel-slot--focus .bonsai-preset-glass,
        .bonsai-scope button.bonsai-preset-glass.gpfocus,
        :root:not(:has(.gpfocus)) .bonsai-scope button.bonsai-preset-glass:focus-visible {
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 -2px 0 rgba(56, 189, 248, 0.85), 0 2px 3px rgba(0, 0, 0, 0.4) !important;
        }
        /* The label brightens with the bar, so the whole chip reads as the live one. Decode used to
           be excluded here (its label owned its own colour); that rule is gone (bug fix
           2026-09-19), so a focused decode chip now brightens like every other mode. */
        .bonsai-scope .bonsai-preset-carousel-focus-root.gpfocuswithin .bonsai-preset-carousel-slot--focus .bonsai-preset-glass .bonsai-preset-chip-label,
        .bonsai-scope .bonsai-preset-carousel-focus-root:has(.gpfocus) .bonsai-preset-carousel-slot--focus .bonsai-preset-glass .bonsai-preset-chip-label,
        :root:not(:has(.gpfocus)) .bonsai-scope .bonsai-preset-carousel-slot--focus .bonsai-preset-glass .bonsai-preset-chip-label,
        .bonsai-scope button.bonsai-preset-glass.gpfocus .bonsai-preset-chip-label,
        :root:not(:has(.gpfocus)) .bonsai-scope button.bonsai-preset-glass:focus-visible .bonsai-preset-chip-label {
          color: #dcebf8 !important;
        }

        /*
          The "ran out of chips" edge cue (roadmap [chips], filed 2026-09-04). Left/Right already
          claims the move at both row edges without moving anything (presetRowNav.ts's
          onBlockedEdge, called only when the press was claimed-and-blocked, never when a pinned
          batch pulled a new entry in) so Steam's own idea of "past the end" -- the Quick Access
          rail -- never fires; the gap this closes is that the claimed-and-blocked press looked
          identical on screen to a stall. usePresetRowNav (MainTabPresetAnimatedChips.tsx) flags the
          one chip that claimed a blocked press with this class for
          PRESET_CHIP_BLOCKED_EDGE_FLASH_MS, then clears it. Same cyan family as the other
          focus-adjacent glows here and in gamepadAndPullModels.ts, so it is not a new colour.

          Since 2026-09-17 (plan 60) the cue lives on the same bottom bar the focused chip already
          shows: the bar flares brighter with a soft cyan glow under it, then settles back. Before,
          it recoloured the border, which was the old focus marker, so the flash and the focus cue
          looked alike. All four effects are repeated in one list because box-shadow replaces rather
          than adds. No transform and no width change, so the chip's own box never grows. The long
          first arm is not decoration, and this rule must stay below the bar rules: file header,
          points 2 and 3.

          A plain transition, not @keyframes: section-6.ts's base \`.bonsai-preset-glass\` rule sets
          its own \`box-shadow: ... !important\`, and an animation cannot out-rank a static !important
          declaration (only a transition can). It lives on this modifier rule alone, so removing the
          class removes the transition and cannot touch the carousel's own dimmed/undimmed fade.
        */
        .bonsai-scope .bonsai-preset-carousel-focus-root .bonsai-preset-carousel-slot button.bonsai-preset-glass.bonsai-preset-chip-blocked-edge,
        .bonsai-scope button.bonsai-preset-glass.bonsai-preset-chip-blocked-edge {
          transition: box-shadow ${Math.round(PRESET_CHIP_BLOCKED_EDGE_FLASH_MS * 0.45)}ms ease-out;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 -2px 0 rgba(150, 225, 255, 1), 0 3px 8px -2px rgba(56, 189, 248, 0.55), 0 2px 3px rgba(0, 0, 0, 0.4) !important;
        }
        /* Reduced motion: no ramp, just the same glow held for the same window and then removed
           by the JS timeout -- a state change, not movement. Same two arms as above, scoped to the
           flagged chip alone so it cannot silence any other control's transition. */
        @media (prefers-reduced-motion: reduce) {
          .bonsai-scope .bonsai-preset-carousel-focus-root .bonsai-preset-carousel-slot button.bonsai-preset-glass.bonsai-preset-chip-blocked-edge,
          .bonsai-scope button.bonsai-preset-glass.bonsai-preset-chip-blocked-edge {
            transition: none !important;
          }
        }

        /*
          The settings-results card (plan 45 / plan 56 lane E). Positioned by the component itself
          (position: absolute; bottom: 100% of the box's own wrapper) — this only draws it, on the
          same horizontal track as the box so it lines up with the textarea above which it floats.
          Sized by its own content: MainTabUnifiedAskBar.tsx decides how many rows to render (never
          more than fit the live-measured room above it), and the card simply stacks whatever it is
          given. The heading-to-row-1 gap comes from the heading's own padding-bottom below, not
          from this card's row gap, so the two never double up — see settingsCardHeightForRows in
          useSteamSettingsSearch.ts, which this file's numbers are read from directly.
        */
        .bonsai-scope .bonsai-settings-results-card {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          box-sizing: border-box !important;
          display: flex;
          flex-direction: column;
          border-radius: 8px;
          padding: ${SETTINGS_CARD_PAD_TOP_PX}px 6px ${SETTINGS_CARD_PAD_BOTTOM_PX}px;
          pointer-events: auto;
          z-index: 5;
        }
        /*
          A card floating over the chat needs its own solid surface — the transcript behind it is
          not opaque (the same reason the dock itself carries an explicit background, section-6.ts).
          Measured on the Deck 2026-09-16 (build ca12429, screenshots/DeckCapture_20260916_045914_game.png):
          a chat slot title and a reply's own text both still read straight through the card at the
          previous 0.92 alpha, over both the heading and rows four and five. Fully opaque now, not
          just "mostly" — an alpha channel of any size leaves room for a CEF compositing surprise
          like that one to show through again, and there is nothing behind this card worth blending
          with. ".bonsai-settings-results-card.bonsai-glass-panel" is three class selectors, one more
          than the shared ".bonsai-glass-panel" rule above (section-6.ts) that supplies the 0.25
          fallback every other glass panel uses, so this rule already outranks it on specificity
          alone (section-4.test.ts pins that count) — the blur is turned off here too, on its own
          !important rule, since the shared blur rule (section-6.ts) carries none at all and a blur
          has nothing left to do once the surface behind it can never show through regardless.
        */
        .bonsai-scope .bonsai-settings-results-card.bonsai-glass-panel {
          background: rgb(18, 26, 34) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-settings-results-card-heading {
          color: #8fa8c4;
          font-size: 11px;
          line-height: 16px;
          padding-bottom: 6px;
        }
        .bonsai-scope .bonsai-settings-results-card-heading-count {
          color: #6b7c90;
        }
        .bonsai-scope .bonsai-settings-results-card-row {
          flex-shrink: 0;
        }
        .bonsai-scope .bonsai-settings-results-card-row + .bonsai-settings-results-card-row {
          margin-top: ${SETTINGS_CARD_ROW_GAP_PX}px;
        }

        /*
          The Ask row is a sibling PanelSectionRow of the unified input host in the same column, so
          100% on both makes them the same width by construction.

          It used to be a measured pixel snapshot instead (--bonsai-askbar-outer-width, set from
          host width in useUnifiedInputSurface, plus a --bonsai-ask-margin-left correction). That
          made the Ask row the only row that could not follow the panel: a sample taken mid-carousel,
          at first paint, or before a padding change settled froze it narrower than its neighbours,
          which is the "Ask bar no longer spans QAM width" bug. Both vars are gone — do not
          reintroduce a px width here.
        */
        .bonsai-scope .bonsai-ask-bleed-wrap.bonsai-full-bleed-row {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        /* H1 fix: never set a px min-width here — it inflates tab min-content and spills the QAM
           horizontally. max-width stays none so a % parent cannot clip the glass. */
        .bonsai-scope .bonsai-askbar-row-host,
        .bonsai-scope .bonsai-ask-bleed-wrap .bonsai-askbar-merged {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton,
        .bonsai-scope .bonsai-ask-bleed-wrap .Panel.Focusable {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
        }

        .bonsai-scope .bonsai-ask-bleed-wrap,
        .bonsai-scope .bonsai-ask-bleed-wrap .bonsai-askbar-merged {
          flex: 1 1 auto !important;
          align-self: stretch !important;
        }

        `;
}
